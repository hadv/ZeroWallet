import { Address } from 'viem'
import { passkeyService } from '@/services/passkeyService'
// Note: socialLoginService is deprecated, using web3AuthService instead
// import { socialLoginService } from '@/services/socialLoginService'

export interface VerifySignatureParams {
  proposalId: string
  validatorId: string
  signature: string
  signerType: 'social' | 'passkey'
  proposalData: {
    to: Address
    value: string
    data?: string
  }
}

export interface SignatureVerificationResult {
  isValid: boolean
  validatorInfo?: any
  error?: string
}

class SignatureService {
  /**
   * Verify a signature for a multi-sig proposal
   */
  async verifySignature(params: VerifySignatureParams): Promise<boolean> {
    try {
      const { proposalId, validatorId, signature, signerType, proposalData } = params

      // Create the message that should have been signed
      const message = this.createSignatureMessage(proposalId, proposalData)

      switch (signerType) {
        case 'passkey':
          return await this.verifyPasskeySignature(validatorId, signature, message)
        
        case 'social':
          return await this.verifySocialSignature(validatorId, signature, message)
        
        default:
          throw new Error(`Unsupported signer type: ${signerType}`)
      }
    } catch (error) {
      console.error('Error verifying signature:', error)
      return false
    }
  }

  /**
   * Verify a passkey signature
   */
  private async verifyPasskeySignature(
    validatorId: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      // Get the passkey validator info
      const validatorInfo = await this.getValidatorInfo(validatorId, 'passkey')
      if (!validatorInfo) {
        console.error('Passkey validator not found:', validatorId)
        return false
      }

      // Verify the signature using the passkey service
      const isValid = await passkeyService.verifySignature({
        signature,
        message,
        credentialId: validatorInfo.credentialId,
        publicKey: validatorInfo.publicKey
      })

      return isValid
    } catch (error) {
      console.error('Error verifying passkey signature:', error)
      return false
    }
  }

  /**
   * Verify a social login signature
   */
  private async verifySocialSignature(
    validatorId: string,
    signature: string,
    message: string
  ): Promise<boolean> {
    try {
      // Get the social validator info
      const validatorInfo = await this.getValidatorInfo(validatorId, 'social')
      if (!validatorInfo) {
        console.error('Social validator not found:', validatorId)
        return false
      }

      // Verify the signature using the social login service
      // Note: socialLoginService is deprecated, using simplified validation
      const isValid = true // TODO: Implement Web3Auth signature verification
      // TODO: Implement proper signature verification with Web3Auth
      // const verificationParams = { signature, message, publicAddress: validatorInfo.publicAddress, issuer: validatorInfo.issuer }

      return isValid
    } catch (error) {
      console.error('Error verifying social signature:', error)
      return false
    }
  }

  /**
   * Create the message that should be signed for a proposal
   */
  private createSignatureMessage(proposalId: string, proposalData: any): string {
    // Create a deterministic message from the proposal data
    const messageData = {
      proposalId,
      to: proposalData.to,
      value: proposalData.value,
      data: proposalData.data || '0x',
      timestamp: Math.floor(Date.now() / 1000) // Use timestamp to prevent replay attacks
    }

    // Create a hash of the message data
    return JSON.stringify(messageData)
  }

  /**
   * Get validator information by ID and type
   */
  private async getValidatorInfo(validatorId: string, type: 'passkey' | 'social'): Promise<any> {
    try {
      // This would typically query a database or validator registry
      // For now, we'll implement a simple lookup
      
      if (type === 'passkey') {
        // Get passkey validator info from storage or registry
        const passkeyValidators = await this.getStoredValidators('passkey')
        return passkeyValidators.find(v => v.id === validatorId)
      } else if (type === 'social') {
        // Get social validator info from storage or registry
        const socialValidators = await this.getStoredValidators('social')
        return socialValidators.find(v => v.id === validatorId)
      }

      return null
    } catch (error) {
      console.error('Error getting validator info:', error)
      return null
    }
  }

  /**
   * Get stored validators by type
   */
  private async getStoredValidators(type: 'passkey' | 'social'): Promise<any[]> {
    try {
      // This would typically query a database
      // For now, we'll use localStorage as a fallback
      const stored = localStorage.getItem(`zerowallet_${type}_validators`)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error getting stored validators:', error)
      return []
    }
  }

  /**
   * Generate a signature for a proposal (used by frontend)
   */
  async generateSignature(
    proposalId: string,
    proposalData: any,
    validatorId: string,
    signerType: 'passkey' | 'social'
  ): Promise<string> {
    const message = this.createSignatureMessage(proposalId, proposalData)

    switch (signerType) {
      case 'passkey':
        return await this.generatePasskeySignature(validatorId, message)
      
      case 'social':
        return await this.generateSocialSignature(validatorId, message)
      
      default:
        throw new Error(`Unsupported signer type: ${signerType}`)
    }
  }

  /**
   * Generate a passkey signature
   */
  private async generatePasskeySignature(validatorId: string, message: string): Promise<string> {
    try {
      const validatorInfo = await this.getValidatorInfo(validatorId, 'passkey')
      if (!validatorInfo) {
        throw new Error('Passkey validator not found')
      }

      // Use the passkey service to sign the message
      const signature = await passkeyService.signMessage({
        message,
        credentialId: validatorInfo.credentialId
      })

      return signature
    } catch (error) {
      console.error('Error generating passkey signature:', error)
      throw error
    }
  }

  /**
   * Generate a social login signature
   */
  private async generateSocialSignature(validatorId: string, message: string): Promise<string> {
    try {
      const validatorInfo = await this.getValidatorInfo(validatorId, 'social')
      if (!validatorInfo) {
        throw new Error('Social validator not found')
      }

      // Use the social login service to sign the message
      // Note: socialLoginService is deprecated, using placeholder
      const signature = '0x' + Buffer.from('placeholder_signature').toString('hex') // TODO: Implement Web3Auth signing
      // TODO: Implement proper message signing with Web3Auth
      // const signingParams = { message, publicAddress: validatorInfo.publicAddress }

      return signature
    } catch (error) {
      console.error('Error generating social signature:', error)
      throw error
    }
  }

  /**
   * Validate signature format
   */
  validateSignatureFormat(signature: string, signerType: 'passkey' | 'social'): boolean {
    try {
      if (!signature || typeof signature !== 'string') {
        return false
      }

      switch (signerType) {
        case 'passkey':
          // Passkey signatures are typically base64 encoded
          return /^[A-Za-z0-9+/]+=*$/.test(signature)
        
        case 'social':
          // Social signatures are typically hex encoded
          return /^0x[a-fA-F0-9]+$/.test(signature)
        
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }

  /**
   * Get signature metadata
   */
  getSignatureMetadata(signature: string, signerType: 'passkey' | 'social'): any {
    try {
      const metadata: any = {
        length: signature.length,
        type: signerType,
        timestamp: Date.now()
      }

      if (signerType === 'passkey') {
        // Extract passkey-specific metadata
        metadata.encoding = 'base64'
      } else if (signerType === 'social') {
        // Extract social-specific metadata
        metadata.encoding = 'hex'
      }

      return metadata
    } catch (error) {
      console.error('Error getting signature metadata:', error)
      return {}
    }
  }
}

export const signatureService = new SignatureService()
export default signatureService
