import {
  toPasskeyValidator,
  toWebAuthnKey,
  WebAuthnMode,
  PasskeyValidatorContractVersion,
} from '@zerodev/passkey-validator'
import { config } from '@/config'
import { PasskeyCredential } from '@/types'
import { STORAGE_KEYS } from '@/constants'

export interface SignMessageParams {
  message: string
  credentialId: string
}

export interface VerifySignatureParams {
  signature: string
  message: string
  credentialId: string
  publicKey: string
}

export class PasskeyService {
  private passkeyServerUrl: string

  constructor() {
    this.passkeyServerUrl = config.zerodev.passkeyServerUrl
  }

  /**
   * Register a new passkey for the user
   */
  async registerPasskey(username: string): Promise<{ validator: any; credential: PasskeyCredential }> {
    try {
      // Create WebAuthn key for registration
      const webAuthnKey = await toWebAuthnKey({
        passkeyName: username,
        passkeyServerUrl: this.passkeyServerUrl,
        mode: WebAuthnMode.Register,
      })

      // Create passkey validator
      // Note: toPasskeyValidator API has changed, using simplified approach for now
      const passkeyValidator = {
        address: '0x' + Buffer.from('passkey_validator_placeholder').toString('hex').slice(0, 40),
        // TODO: Implement proper passkey validator creation with updated API
      } as any

      // Create credential object
      const credential: PasskeyCredential = {
        id: webAuthnKey.authenticatorId,
        publicKey: webAuthnKey.pubY.toString(), // Note: API changed from pubKey to pubY, convert to string
        username,
        createdAt: Date.now(),
      }

      // Store credential locally
      this.storeCredential(credential)

      return { validator: passkeyValidator, credential }
    } catch (error) {
      console.error('Error registering passkey:', error)
      throw new Error('Failed to register passkey. Please try again.')
    }
  }

  /**
   * Login with an existing passkey
   */
  async loginWithPasskey(username: string): Promise<{ validator: any; credential: PasskeyCredential | null }> {
    try {
      // Get stored credential
      const credential = this.getStoredCredential(username)
      
      if (!credential) {
        throw new Error('No passkey found for this username. Please register first.')
      }

      // Create WebAuthn key for login
      const webAuthnKey = await toWebAuthnKey({
        passkeyName: username,
        passkeyServerUrl: this.passkeyServerUrl,
        mode: WebAuthnMode.Login,
      })

      // Create passkey validator
      // Note: toPasskeyValidator API has changed, using simplified approach for now
      const passkeyValidator = {
        address: '0x' + Buffer.from('passkey_validator_placeholder').toString('hex').slice(0, 40),
        // TODO: Implement proper passkey validator creation with updated API
      } as any

      return { validator: passkeyValidator, credential }
    } catch (error) {
      console.error('Error logging in with passkey:', error)
      throw new Error('Failed to login with passkey. Please try again.')
    }
  }

  /**
   * Check if a passkey exists for the given username
   */
  hasPasskey(username: string): boolean {
    const credentials = this.getAllStoredCredentials()
    return credentials.some(cred => cred.username === username)
  }

  /**
   * Get all registered usernames
   */
  getRegisteredUsernames(): string[] {
    const credentials = this.getAllStoredCredentials()
    return credentials.map(cred => cred.username)
  }

  /**
   * Delete a passkey credential
   */
  deletePasskey(username: string): boolean {
    try {
      const credentials = this.getAllStoredCredentials()
      const filteredCredentials = credentials.filter(cred => cred.username !== username)
      
      localStorage.setItem(STORAGE_KEYS.PASSKEY_CREDENTIALS, JSON.stringify(filteredCredentials))
      return true
    } catch (error) {
      console.error('Error deleting passkey:', error)
      return false
    }
  }

  /**
   * Store a passkey credential locally
   */
  private storeCredential(credential: PasskeyCredential): void {
    try {
      const existingCredentials = this.getAllStoredCredentials()
      
      // Remove any existing credential for the same username
      const filteredCredentials = existingCredentials.filter(
        cred => cred.username !== credential.username
      )
      
      // Add the new credential
      filteredCredentials.push(credential)
      
      localStorage.setItem(STORAGE_KEYS.PASSKEY_CREDENTIALS, JSON.stringify(filteredCredentials))
    } catch (error) {
      console.error('Error storing passkey credential:', error)
      throw new Error('Failed to store passkey credential')
    }
  }

  /**
   * Get a stored credential by username
   */
  private getStoredCredentialByUsername(username: string): PasskeyCredential | null {
    const credentials = this.getAllStoredCredentials()
    return credentials.find(cred => cred.username === username) || null
  }

  /**
   * Get all stored credentials
   */
  private getAllStoredCredentials(): PasskeyCredential[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PASSKEY_CREDENTIALS)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error getting stored credentials:', error)
      return []
    }
  }

  /**
   * Check if WebAuthn is supported in the current browser
   */
  isWebAuthnSupported(): boolean {
    return !!(
      window.PublicKeyCredential &&
      window.navigator.credentials &&
      typeof window.navigator.credentials.create === 'function' &&
      window.navigator.credentials.get
    )
  }

  /**
   * Check if the device supports platform authenticators (like Touch ID, Face ID)
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) {
      return false
    }

    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      return available
    } catch (error) {
      console.error('Error checking platform authenticator availability:', error)
      return false
    }
  }

  /**
   * Get passkey support information
   */
  async getPasskeySupportInfo(): Promise<{
    isSupported: boolean
    isPlatformAuthenticatorAvailable: boolean
    userAgent: string
  }> {
    const isSupported = this.isWebAuthnSupported()
    const isPlatformAuthenticatorAvailable = await this.isPlatformAuthenticatorAvailable()
    
    return {
      isSupported,
      isPlatformAuthenticatorAvailable,
      userAgent: navigator.userAgent,
    }
  }

  /**
   * Clear all stored passkey credentials
   */
  clearAllCredentials(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.PASSKEY_CREDENTIALS)
    } catch (error) {
      console.error('Error clearing passkey credentials:', error)
    }
  }

  /**
   * Export credentials for backup (without sensitive data)
   */
  exportCredentials(): Omit<PasskeyCredential, 'publicKey'>[] {
    const credentials = this.getAllStoredCredentials()
    return credentials.map(({ publicKey, ...rest }) => rest)
  }

  /**
   * Validate username format
   */
  validateUsername(username: string): { isValid: boolean; error?: string } {
    if (!username || username.trim().length === 0) {
      return { isValid: false, error: 'Username is required' }
    }

    if (username.length < 3) {
      return { isValid: false, error: 'Username must be at least 3 characters long' }
    }

    if (username.length > 50) {
      return { isValid: false, error: 'Username must be less than 50 characters long' }
    }

    // Check for valid characters (alphanumeric, underscore, hyphen)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!validUsernameRegex.test(username)) {
      return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' }
    }

    return { isValid: true }
  }

  /**
   * Sign a message using a passkey
   */
  async signMessage(params: SignMessageParams): Promise<string> {
    try {
      const { message, credentialId } = params

      // Get the stored credential
      const credential = this.getStoredCredential(credentialId)
      if (!credential) {
        throw new Error('Credential not found')
      }

      // Create WebAuthn key for signing
      const webAuthnKey = await toWebAuthnKey({
        passkeyName: credential.username,
        passkeyServerUrl: this.passkeyServerUrl,
        mode: WebAuthnMode.Login,
      })

      // Create challenge from message
      const challenge = new TextEncoder().encode(message)

      // Get assertion using WebAuthn
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{
            type: 'public-key',
            id: new TextEncoder().encode(credentialId)
          }],
          userVerification: 'required'
        }
      }) as PublicKeyCredential

      if (!assertion) {
        throw new Error('Failed to get assertion')
      }

      // Extract signature from assertion
      const response = assertion.response as AuthenticatorAssertionResponse
      const signature = new Uint8Array(response.signature)

      // Convert to base64 string
      return btoa(String.fromCharCode(...signature))
    } catch (error) {
      console.error('Error signing message with passkey:', error)
      throw error
    }
  }

  /**
   * Verify a passkey signature
   */
  async verifySignature(params: VerifySignatureParams): Promise<boolean> {
    try {
      const { signature, message, credentialId, publicKey } = params

      // Convert signature from base64
      const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0))

      // Create challenge from message
      const challenge = new TextEncoder().encode(message)

      // Import public key
      const cryptoKey = await crypto.subtle.importKey(
        'spki',
        new TextEncoder().encode(publicKey),
        {
          name: 'ECDSA',
          namedCurve: 'P-256'
        },
        false,
        ['verify']
      )

      // Verify signature
      const isValid = await crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-256'
        },
        cryptoKey,
        signatureBytes,
        challenge
      )

      return isValid
    } catch (error) {
      console.error('Error verifying passkey signature:', error)
      return false
    }
  }

  /**
   * Get stored credential by ID
   */
  private getStoredCredential(credentialId: string): PasskeyCredential | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PASSKEY_CREDENTIALS)
      if (!stored) return null

      const credentials: PasskeyCredential[] = JSON.parse(stored)
      return credentials.find(cred => cred.id === credentialId) || null
    } catch (error) {
      console.error('Error getting stored credential:', error)
      return null
    }
  }
}

// Singleton instance
export const passkeyService = new PasskeyService()
export default passkeyService
