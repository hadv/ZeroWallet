'use client'

import { Web3Auth } from '@web3auth/modal'
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK, ADAPTER_EVENTS } from '@web3auth/base'
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider'
import { toSigner } from '@zerodev/sdk'
import { config } from '@/config'

export interface Web3AuthUserInfo {
  email?: string
  name?: string
  profileImage?: string
  aggregateVerifier?: string
  verifier?: string
  verifierId?: string
  typeOfLogin?: string
}

export interface Web3AuthLoginResult {
  validator: any
  userInfo: Web3AuthUserInfo
}

export class Web3AuthService {
  private web3auth: Web3Auth | null = null
  private isInitialized = false

  constructor() {
    this.initializeWeb3Auth()
  }

  /**
   * Initialize Web3Auth SDK
   */
  private async initializeWeb3Auth() {
    if (typeof window === 'undefined') return // Server-side check

    try {
      const clientId = config.web3Auth.clientId
      if (!clientId) {
        console.warn('Web3Auth Client ID not found. Please set NEXT_PUBLIC_WEB3AUTH_CLIENT_ID in your environment variables.')
        return
      }

      // Configure the private key provider
      const chainConfig = {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId: `0x${config.network.chainId.toString(16)}`,
        rpcTarget: config.network.rpcUrl,
        displayName: config.network.chainName,
        blockExplorerUrl: 'https://sepolia.etherscan.io',
        ticker: 'ETH',
        tickerName: 'Ethereum',
      }

      const privateKeyProvider = new EthereumPrivateKeyProvider({
        config: { chainConfig },
      })

      // Set current chain for the provider
      await privateKeyProvider.setupProvider(chainConfig.chainId)

      // Add currentChain property to satisfy interface
      Object.defineProperty(privateKeyProvider, 'currentChain', {
        value: chainConfig,
        writable: true,
        enumerable: true,
        configurable: true
      })

      // Initialize Web3Auth
      this.web3auth = new Web3Auth({
        clientId,
        web3AuthNetwork: this.getWeb3AuthNetwork(config.web3Auth.network),
        privateKeyProvider: privateKeyProvider as any, // Type assertion to bypass interface mismatch
        uiConfig: {
          appName: config.app.name,
          mode: 'light',
          logoLight: 'https://web3auth.io/images/web3authlog.png',
          logoDark: 'https://web3auth.io/images/web3authlogodark.png',
          defaultLanguage: 'en',
          loginGridCol: 3,
          primaryButton: 'externalLogin',
        },
      })

      await this.web3auth.init()
      this.isInitialized = true

      // Set up event listeners
      this.web3auth.on(ADAPTER_EVENTS.CONNECTED, (data) => {
        console.log('Web3Auth connected:', data)
      })

      this.web3auth.on(ADAPTER_EVENTS.DISCONNECTED, () => {
        console.log('Web3Auth disconnected')
      })

    } catch (error) {
      console.error('Error initializing Web3Auth SDK:', error)
    }
  }

  /**
   * Get Web3Auth network enum from string
   */
  private getWeb3AuthNetwork(network: string): typeof WEB3AUTH_NETWORK[keyof typeof WEB3AUTH_NETWORK] {
    switch (network.toLowerCase()) {
      case 'mainnet':
        return WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
      case 'testnet':
      case 'sapphire_devnet':
      default:
        return WEB3AUTH_NETWORK.SAPPHIRE_DEVNET
    }
  }

  /**
   * Login with email (passwordless)
   */
  async loginWithEmail(email: string): Promise<Web3AuthLoginResult> {
    if (!this.web3auth || !this.isInitialized) {
      throw new Error('Web3Auth SDK not initialized')
    }

    try {
      // Validate email format
      if (!this.isValidEmail(email)) {
        throw new Error('Please enter a valid email address')
      }

      // Connect with email
      const web3authProvider = await this.web3auth.connect()
      
      if (!web3authProvider) {
        throw new Error('Failed to connect with Web3Auth')
      }

      // Get user info
      const userInfo = await this.web3auth.getUserInfo()
      
      if (!userInfo) {
        throw new Error('Failed to get user information')
      }

      // Create signer from Web3Auth provider
      // Note: Web3Auth provider needs to be converted to a compatible signer
      const signer = await toSigner({ signer: web3authProvider as any })

      // Store user info
      const web3AuthUserInfo: Web3AuthUserInfo = {
        email: userInfo.email,
        name: userInfo.name,
        profileImage: userInfo.profileImage,
        aggregateVerifier: (userInfo as any).aggregateVerifier,
        verifier: (userInfo as any).verifier,
        verifierId: (userInfo as any).verifierId,
        typeOfLogin: (userInfo as any).typeOfLogin,
      }

      this.storeUserInfo(web3AuthUserInfo)

      return { validator: signer, userInfo: web3AuthUserInfo }
    } catch (error) {
      console.error('Error logging in with email:', error)
      throw new Error('Failed to login with email. Please try again.')
    }
  }

  /**
   * Login with social provider
   */
  async loginWithSocial(provider?: string): Promise<Web3AuthLoginResult> {
    if (!this.web3auth || !this.isInitialized) {
      throw new Error('Web3Auth SDK not initialized')
    }

    try {
      // Connect with Web3Auth modal (will show social login options)
      const web3authProvider = await this.web3auth.connect()
      
      if (!web3authProvider) {
        throw new Error('Failed to connect with Web3Auth')
      }

      // Get user info
      const userInfo = await this.web3auth.getUserInfo()
      
      if (!userInfo) {
        throw new Error('Failed to get user information')
      }

      // Create signer from Web3Auth provider
      // Note: Web3Auth provider needs to be converted to a compatible signer
      const signer = await toSigner({ signer: web3authProvider as any })

      // Store user info
      const web3AuthUserInfo: Web3AuthUserInfo = {
        email: userInfo.email,
        name: userInfo.name,
        profileImage: userInfo.profileImage,
        aggregateVerifier: (userInfo as any).aggregateVerifier,
        verifier: (userInfo as any).verifier,
        verifierId: (userInfo as any).verifierId,
        typeOfLogin: (userInfo as any).typeOfLogin,
      }

      this.storeUserInfo(web3AuthUserInfo)

      return { validator: signer, userInfo: web3AuthUserInfo }
    } catch (error) {
      console.error('Error logging in with social provider:', error)
      throw new Error('Failed to login with social provider. Please try again.')
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    if (!this.web3auth) {
      return
    }

    try {
      await this.web3auth.logout()
      this.clearUserInfo()
    } catch (error) {
      console.error('Error logging out:', error)
      throw new Error('Failed to logout. Please try again.')
    }
  }

  /**
   * Check if user is connected
   */
  isConnected(): boolean {
    return this.web3auth?.connected || false
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<Web3AuthUserInfo | null> {
    if (!this.web3auth || !this.isConnected()) {
      return null
    }

    try {
      const userInfo = await this.web3auth.getUserInfo()
      return userInfo ? {
        email: userInfo.email,
        name: userInfo.name,
        profileImage: userInfo.profileImage,
        aggregateVerifier: (userInfo as any).aggregateVerifier,
        verifier: (userInfo as any).verifier,
        verifierId: (userInfo as any).verifierId,
        typeOfLogin: (userInfo as any).typeOfLogin,
      } : null
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Store user info in localStorage
   */
  private storeUserInfo(userInfo: Web3AuthUserInfo): void {
    try {
      localStorage.setItem('web3auth_user_info', JSON.stringify(userInfo))
    } catch (error) {
      console.error('Error storing user info:', error)
    }
  }

  /**
   * Clear user info from localStorage
   */
  private clearUserInfo(): void {
    try {
      localStorage.removeItem('web3auth_user_info')
    } catch (error) {
      console.error('Error clearing user info:', error)
    }
  }

  /**
   * Get stored user info from localStorage
   */
  getStoredUserInfo(): Web3AuthUserInfo | null {
    try {
      const stored = localStorage.getItem('web3auth_user_info')
      return stored ? JSON.parse(stored) : null
    } catch (error) {
      console.error('Error getting stored user info:', error)
      return null
    }
  }
}

// Export singleton instance
export const web3AuthService = new Web3AuthService()
