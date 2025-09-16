import { 
  ValidatorInfo, 
  MultiValidatorConfig, 
  SigningPolicy, 
  AddSignerRequest, 
  RemoveSignerRequest,
  PendingSignerOperation,
  ValidatorSignature,
  MultiSigTransaction
} from '@/types'
import { passkeyService } from './passkeyService'
import { socialLoginService } from './socialLoginService'
import { STORAGE_KEYS } from '@/constants'

export class MultiValidatorService {
  private validators: ValidatorInfo[] = []
  private signingPolicy: SigningPolicy = {
    requireMultiSig: false,
    threshold: 1,
  }
  private pendingOperations: PendingSignerOperation[] = []

  constructor() {
    this.loadStoredData()
  }

  /**
   * Initialize with a primary social login validator
   */
  async initializeWithSocialLogin(validator: any, userInfo: any): Promise<ValidatorInfo> {
    const primarySigner: ValidatorInfo = {
      id: `social_${userInfo.issuer || Date.now()}`,
      type: 'social',
      name: userInfo.email || 'Social Login',
      metadata: {
        email: userInfo.email,
        provider: userInfo.loginMethod,
        publicAddress: userInfo.publicAddress,
        issuer: userInfo.issuer,
      },
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isActive: true,
    }

    this.validators = [primarySigner]
    this.signingPolicy = {
      requireMultiSig: false,
      threshold: 1,
      allowedOperations: ['all'],
    }

    this.saveToStorage()
    return primarySigner
  }

  /**
   * Add a passkey as an additional signer
   */
  async addPasskeySigner(request: AddSignerRequest): Promise<ValidatorInfo> {
    if (request.type !== 'passkey') {
      throw new Error('Only passkey signers can be added as additional signers')
    }

    if (!request.username) {
      throw new Error('Username is required for passkey signers')
    }

    try {
      // Register the passkey
      const { validator, credential } = await passkeyService.registerPasskey(request.username)

      // Create validator info
      const newSigner: ValidatorInfo = {
        id: `passkey_${credential.id}`,
        type: 'passkey',
        name: request.name || request.username,
        publicKey: credential.publicKey,
        metadata: {
          authenticatorId: credential.id,
          credentialId: credential.id,
          passkeyName: request.username,
        },
        createdAt: Date.now(),
        isActive: true,
      }

      // Add to validators list
      this.validators.push(newSigner)

      // Update signing policy to require multi-sig if we have more than 1 signer
      if (this.validators.length > 1 && !this.signingPolicy.requireMultiSig) {
        this.signingPolicy = {
          ...this.signingPolicy,
          requireMultiSig: true,
          threshold: Math.min(2, this.validators.length), // Require at least 2 signatures
        }
      }

      this.saveToStorage()
      return newSigner
    } catch (error) {
      console.error('Error adding passkey signer:', error)
      throw new Error('Failed to add passkey signer')
    }
  }

  /**
   * Remove a signer (requires confirmation from remaining signers if multi-sig)
   */
  async removeSigner(request: RemoveSignerRequest): Promise<boolean> {
    const signerIndex = this.validators.findIndex(v => v.id === request.validatorId)
    if (signerIndex === -1) {
      throw new Error('Signer not found')
    }

    const signer = this.validators[signerIndex]

    // Don't allow removing the last signer
    if (this.validators.length === 1) {
      throw new Error('Cannot remove the last signer')
    }

    // If it's a passkey, delete from passkey service
    if (signer.type === 'passkey' && signer.metadata.passkeyName) {
      passkeyService.deletePasskey(signer.metadata.passkeyName)
    }

    // Remove from validators list
    this.validators.splice(signerIndex, 1)

    // Update signing policy if needed
    if (this.validators.length === 1) {
      this.signingPolicy = {
        ...this.signingPolicy,
        requireMultiSig: false,
        threshold: 1,
      }
    } else if (this.signingPolicy.threshold > this.validators.length) {
      this.signingPolicy = {
        ...this.signingPolicy,
        threshold: this.validators.length,
      }
    }

    this.saveToStorage()
    return true
  }

  /**
   * Get all active validators
   */
  getValidators(): ValidatorInfo[] {
    return this.validators.filter(v => v.isActive)
  }

  /**
   * Get primary validator (first social login validator)
   */
  getPrimaryValidator(): ValidatorInfo | null {
    return this.validators.find(v => v.type === 'social') || this.validators[0] || null
  }

  /**
   * Get current signing policy
   */
  getSigningPolicy(): SigningPolicy {
    return this.signingPolicy
  }

  /**
   * Update signing policy
   */
  async updateSigningPolicy(newPolicy: SigningPolicy): Promise<void> {
    // Validate policy
    if (newPolicy.threshold > this.validators.length) {
      throw new Error('Threshold cannot be greater than number of validators')
    }

    if (newPolicy.threshold < 1) {
      throw new Error('Threshold must be at least 1')
    }

    this.signingPolicy = newPolicy
    this.saveToStorage()
  }

  /**
   * Check if multi-signature is required for a transaction
   */
  requiresMultiSig(transactionValue?: string): boolean {
    if (!this.signingPolicy.requireMultiSig) {
      return false
    }

    // Check high value threshold
    if (this.signingPolicy.highValueThreshold && transactionValue) {
      const valueNum = parseFloat(transactionValue)
      const thresholdNum = parseFloat(this.signingPolicy.highValueThreshold)
      return valueNum >= thresholdNum
    }

    return this.signingPolicy.requireMultiSig
  }

  /**
   * Get validator by ID
   */
  getValidatorById(id: string): ValidatorInfo | null {
    return this.validators.find(v => v.id === id) || null
  }

  /**
   * Update validator last used timestamp
   */
  updateValidatorLastUsed(id: string): void {
    const validator = this.validators.find(v => v.id === id)
    if (validator) {
      validator.lastUsed = Date.now()
      this.saveToStorage()
    }
  }

  /**
   * Check if account is multi-signature enabled
   */
  isMultiSig(): boolean {
    return this.validators.length > 1 && this.signingPolicy.requireMultiSig
  }

  /**
   * Get signing threshold
   */
  getThreshold(): number {
    return this.signingPolicy.threshold
  }

  /**
   * Load stored data from localStorage
   */
  private loadStoredData(): void {
    try {
      const storedValidators = localStorage.getItem(STORAGE_KEYS.MULTI_SIG_VALIDATORS)
      const storedPolicy = localStorage.getItem(STORAGE_KEYS.SIGNING_POLICY)

      if (storedValidators) {
        this.validators = JSON.parse(storedValidators)
      }

      if (storedPolicy) {
        this.signingPolicy = JSON.parse(storedPolicy)
      }
    } catch (error) {
      console.error('Error loading multi-validator data:', error)
    }
  }

  /**
   * Save data to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MULTI_SIG_VALIDATORS, JSON.stringify(this.validators))
      localStorage.setItem(STORAGE_KEYS.SIGNING_POLICY, JSON.stringify(this.signingPolicy))
    } catch (error) {
      console.error('Error saving multi-validator data:', error)
    }
  }

  /**
   * Reset all data
   */
  reset(): void {
    this.validators = []
    this.signingPolicy = {
      requireMultiSig: false,
      threshold: 1,
    }
    this.pendingOperations = []
    
    try {
      localStorage.removeItem(STORAGE_KEYS.MULTI_SIG_VALIDATORS)
      localStorage.removeItem(STORAGE_KEYS.SIGNING_POLICY)
    } catch (error) {
      console.error('Error clearing multi-validator data:', error)
    }
  }
}

// Singleton instance
export const multiValidatorService = new MultiValidatorService()
export default multiValidatorService
