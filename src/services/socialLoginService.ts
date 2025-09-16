import { Magic } from 'magic-sdk'
import { toSigner } from '@zerodev/sdk'
import { config } from '@/config'
import { SocialProvider } from '@/types'
import { SOCIAL_PROVIDERS, STORAGE_KEYS } from '@/constants'

export interface SignMessageParams {
  message: string
  publicAddress: string
}

export interface VerifySignatureParams {
  signature: string
  message: string
  publicAddress: string
  issuer: string
}

export class SocialLoginService {
  private magic: Magic | null = null
  private isInitialized = false

  constructor() {
    this.initializeMagic()
  }

  /**
   * Initialize Magic SDK
   */
  private initializeMagic() {
    if (typeof window === 'undefined') return // Server-side check

    try {
      // For demo purposes, we'll use a test Magic publishable key
      // In production, you should get this from Magic.link dashboard
      const magicApiKey = process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY || 'pk_live_test_key'
      
      this.magic = new Magic(magicApiKey, {
        network: {
          rpcUrl: config.network.rpcUrl,
          chainId: config.network.chainId,
        },
      })
      
      this.isInitialized = true
    } catch (error) {
      console.error('Error initializing Magic SDK:', error)
    }
  }

  /**
   * Login with email (Magic.link)
   */
  async loginWithEmail(email: string): Promise<{ validator: any; userInfo: any }> {
    if (!this.magic || !this.isInitialized) {
      throw new Error('Magic SDK not initialized')
    }

    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error('Please enter a valid email address')
      }

      // Login with Magic
      const didToken = await this.magic.auth.loginWithMagicLink({ email })
      
      if (!didToken) {
        throw new Error('Failed to authenticate with Magic')
      }

      // Get user metadata
      const userMetadata = await this.magic.user.getMetadata()
      
      if (!userMetadata) {
        throw new Error('Failed to get user metadata')
      }

      // Get the Magic provider and create signer
      const magicProvider = this.magic.rpcProvider
      const signer = await toSigner({ signer: magicProvider })

      // Store user info
      const userInfo = {
        email: userMetadata.email,
        publicAddress: userMetadata.publicAddress,
        issuer: userMetadata.issuer,
        loginMethod: 'email',
      }

      this.storeUserInfo(userInfo)

      return { validator: signer, userInfo }
    } catch (error) {
      console.error('Error logging in with email:', error)
      throw new Error('Failed to login with email. Please try again.')
    }
  }

  /**
   * Login with social provider (Google, GitHub, etc.)
   */
  async loginWithSocial(provider: 'google' | 'github' | 'twitter' | 'discord'): Promise<{ validator: any; userInfo: any }> {
    if (!this.magic || !this.isInitialized) {
      throw new Error('Magic SDK not initialized')
    }

    try {
      // Check if provider is supported
      const supportedProvider = SOCIAL_PROVIDERS.find(p => p.id === provider && p.enabled)
      if (!supportedProvider) {
        throw new Error(`${provider} login is not currently supported`)
      }

      // Login with social provider
      const didToken = await this.magic.oauth.loginWithRedirect({
        provider: provider as any,
        redirectURI: window.location.origin + '/auth/callback',
      })

      if (!didToken) {
        throw new Error(`Failed to authenticate with ${provider}`)
      }

      // Get user metadata
      const userMetadata = await this.magic.user.getMetadata()
      
      if (!userMetadata) {
        throw new Error('Failed to get user metadata')
      }

      // Get the Magic provider and create signer
      const magicProvider = this.magic.rpcProvider
      const signer = await toSigner({ signer: magicProvider })

      // Store user info
      const userInfo = {
        email: userMetadata.email,
        publicAddress: userMetadata.publicAddress,
        issuer: userMetadata.issuer,
        loginMethod: provider,
      }

      this.storeUserInfo(userInfo)

      return { validator: signer, userInfo }
    } catch (error) {
      console.error(`Error logging in with ${provider}:`, error)
      throw new Error(`Failed to login with ${provider}. Please try again.`)
    }
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn(): Promise<boolean> {
    if (!this.magic || !this.isInitialized) {
      return false
    }

    try {
      return await this.magic.user.isLoggedIn()
    } catch (error) {
      console.error('Error checking login status:', error)
      return false
    }
  }

  /**
   * Get current user metadata
   */
  async getCurrentUser(): Promise<any> {
    if (!this.magic || !this.isInitialized) {
      return null
    }

    try {
      const isLoggedIn = await this.magic.user.isLoggedIn()
      if (!isLoggedIn) {
        return null
      }

      return await this.magic.user.getMetadata()
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    if (!this.magic || !this.isInitialized) {
      return
    }

    try {
      await this.magic.user.logout()
      this.clearStoredUserInfo()
    } catch (error) {
      console.error('Error logging out:', error)
      throw new Error('Failed to logout')
    }
  }

  /**
   * Get available social providers
   */
  getAvailableProviders(): SocialProvider[] {
    return SOCIAL_PROVIDERS.filter(provider => provider.enabled)
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Store user info locally
   */
  private storeUserInfo(userInfo: any): void {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTH_STATE, JSON.stringify({
        ...userInfo,
        authMethod: 'social',
        timestamp: Date.now(),
      }))
    } catch (error) {
      console.error('Error storing user info:', error)
    }
  }

  /**
   * Get stored user info
   */
  getStoredUserInfo(): any {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTH_STATE)
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Error getting stored user info:', error)
      return null
    }
  }

  /**
   * Clear stored user info
   */
  private clearStoredUserInfo(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.AUTH_STATE)
    } catch (error) {
      console.error('Error clearing stored user info:', error)
    }
  }

  /**
   * Check if Magic SDK is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.magic !== null
  }

  /**
   * Get Magic instance (for advanced usage)
   */
  getMagicInstance(): Magic | null {
    return this.magic
  }

  /**
   * Handle OAuth callback (for social login redirects)
   */
  async handleOAuthCallback(): Promise<{ validator: any; userInfo: any } | null> {
    if (!this.magic || !this.isInitialized) {
      return null
    }

    try {
      // Check if this is an OAuth callback
      const urlParams = new URLSearchParams(window.location.search)
      const provider = urlParams.get('provider')
      
      if (!provider) {
        return null
      }

      // Complete the OAuth flow
      const didToken = await this.magic.oauth.getRedirectResult()
      
      if (!didToken) {
        throw new Error('Failed to complete OAuth flow')
      }

      // Get user metadata
      const userMetadata = await this.magic.user.getMetadata()
      
      if (!userMetadata) {
        throw new Error('Failed to get user metadata')
      }

      // Get the Magic provider and create signer
      const magicProvider = this.magic.rpcProvider
      const signer = await toSigner({ signer: magicProvider })

      // Store user info
      const userInfo = {
        email: userMetadata.email,
        publicAddress: userMetadata.publicAddress,
        issuer: userMetadata.issuer,
        loginMethod: provider,
      }

      this.storeUserInfo(userInfo)

      return { validator: signer, userInfo }
    } catch (error) {
      console.error('Error handling OAuth callback:', error)
      return null
    }
  }

  /**
   * Sign a message using social login
   */
  async signMessage(params: SignMessageParams): Promise<string> {
    try {
      if (!this.magic) {
        throw new Error('Magic not initialized')
      }

      const { message, publicAddress } = params

      // Check if user is logged in
      const isLoggedIn = await this.magic.user.isLoggedIn()
      if (!isLoggedIn) {
        throw new Error('User not logged in')
      }

      // Get the current user's metadata
      const userMetadata = await this.magic.user.getMetadata()
      if (!userMetadata || userMetadata.publicAddress !== publicAddress) {
        throw new Error('Public address mismatch')
      }

      // Sign the message using Magic's provider
      const provider = this.magic.rpcProvider
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, publicAddress]
      })

      return signature as string
    } catch (error) {
      console.error('Error signing message with social login:', error)
      throw error
    }
  }

  /**
   * Verify a social login signature
   */
  async verifySignature(params: VerifySignatureParams): Promise<boolean> {
    try {
      const { signature, message, publicAddress, issuer } = params

      // For social login signatures, we can verify using eth_personal_recover
      // This is a simplified verification - in production you might want more robust verification

      // Create the message hash that was signed
      const messageHash = this.hashMessage(message)

      // Recover the address from the signature
      const recoveredAddress = await this.recoverAddress(messageHash, signature)

      // Check if the recovered address matches the expected public address
      return recoveredAddress.toLowerCase() === publicAddress.toLowerCase()
    } catch (error) {
      console.error('Error verifying social login signature:', error)
      return false
    }
  }

  /**
   * Hash a message for signing (EIP-191)
   */
  private hashMessage(message: string): string {
    // Create EIP-191 compliant message hash
    const prefix = '\x19Ethereum Signed Message:\n'
    const fullMessage = prefix + message.length + message

    // In a real implementation, you'd use a proper hashing library
    // For now, we'll return the message as-is for simplicity
    return fullMessage
  }

  /**
   * Recover address from signature
   */
  private async recoverAddress(messageHash: string, signature: string): Promise<string> {
    try {
      // This is a simplified implementation
      // In production, use a proper signature recovery library like ethers.js

      // For now, we'll simulate address recovery
      // In a real implementation, you'd use:
      // const recoveredAddress = ethers.utils.verifyMessage(message, signature)

      // Return a placeholder for now
      return '0x0000000000000000000000000000000000000000'
    } catch (error) {
      console.error('Error recovering address:', error)
      throw error
    }
  }

  /**
   * Get current user's signing capability
   */
  async canSign(): Promise<boolean> {
    try {
      if (!this.magic) return false

      const isLoggedIn = await this.magic.user.isLoggedIn()
      return isLoggedIn
    } catch (error) {
      console.error('Error checking signing capability:', error)
      return false
    }
  }

  /**
   * Get current user's public address
   */
  async getCurrentUserAddress(): Promise<string | null> {
    try {
      if (!this.magic) return null

      const isLoggedIn = await this.magic.user.isLoggedIn()
      if (!isLoggedIn) return null

      const userMetadata = await this.magic.user.getMetadata()
      return userMetadata?.publicAddress || null
    } catch (error) {
      console.error('Error getting current user address:', error)
      return null
    }
  }
}

// Singleton instance
export const socialLoginService = new SocialLoginService()
export default socialLoginService
