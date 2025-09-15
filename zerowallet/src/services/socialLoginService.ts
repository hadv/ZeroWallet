import { Magic } from 'magic-sdk'
import { toSigner } from '@zerodev/sdk'
import { config } from '@/config'
import { SocialProvider } from '@/types'
import { SOCIAL_PROVIDERS, STORAGE_KEYS } from '@/constants'

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
}

// Singleton instance
export const socialLoginService = new SocialLoginService()
export default socialLoginService
