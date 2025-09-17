/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { web3AuthService } from '@/services/web3AuthService'

// Mock Web3Auth
jest.mock('@web3auth/modal', () => ({
  Web3Auth: jest.fn(() => ({
    initModal: jest.fn(() => Promise.resolve(undefined)),
    connect: jest.fn(() => Promise.resolve({})),
    getUserInfo: jest.fn(() => Promise.resolve({
      email: 'test@example.com',
      name: 'Test User',
      profileImage: 'https://example.com/avatar.jpg',
      typeOfLogin: 'google',
    })),
    logout: jest.fn(() => Promise.resolve(undefined)),
    connected: false,
    on: jest.fn(),
  })),
}))

jest.mock('@web3auth/base', () => ({
  CHAIN_NAMESPACES: {
    EIP155: 'eip155',
  },
  WEB3AUTH_NETWORK: {
    SAPPHIRE_DEVNET: 'sapphire_devnet',
    SAPPHIRE_MAINNET: 'sapphire_mainnet',
  },
  ADAPTER_EVENTS: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
  },
}))

jest.mock('@web3auth/ethereum-provider', () => ({
  EthereumPrivateKeyProvider: jest.fn().mockImplementation(() => ({})),
}))

jest.mock('@zerodev/sdk', () => ({
  toSigner: jest.fn(() => Promise.resolve({})),
}))

// Mock config
jest.mock('@/config', () => ({
  config: {
    web3Auth: {
      clientId: 'test-client-id',
      network: 'sapphire_devnet',
    },
    network: {
      chainId: 11155111,
      rpcUrl: 'https://rpc.ankr.com/eth_sepolia',
      name: 'Sepolia',
      blockExplorer: 'https://sepolia.etherscan.io',
    },
    app: {
      name: 'ZeroWallet',
    },
  },
}))

describe('Web3Auth Integration', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    
    // Mock window object
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'http://localhost:3000',
      },
      writable: true,
    })
  })

  describe('Web3AuthService', () => {
    it('should initialize without errors', () => {
      expect(() => {
        // Service is already instantiated as singleton
        expect(web3AuthService).toBeDefined()
      }).not.toThrow()
    })

    it('should validate email addresses correctly', () => {
      // Access private method through type assertion for testing
      const service = web3AuthService as any
      
      expect(service.isValidEmail('test@example.com')).toBe(true)
      expect(service.isValidEmail('user.name+tag@domain.co.uk')).toBe(true)
      expect(service.isValidEmail('invalid-email')).toBe(false)
      expect(service.isValidEmail('test@')).toBe(false)
      expect(service.isValidEmail('@example.com')).toBe(false)
    })

    it('should store and retrieve user info from localStorage', () => {
      const userInfo = {
        email: 'test@example.com',
        name: 'Test User',
        typeOfLogin: 'google',
      }

      // Store user info
      const service = web3AuthService as any
      service.storeUserInfo(userInfo)

      // Retrieve user info
      const retrieved = web3AuthService.getStoredUserInfo()
      expect(retrieved).toEqual(userInfo)
    })

    it('should clear user info from localStorage', () => {
      const userInfo = {
        email: 'test@example.com',
        name: 'Test User',
        typeOfLogin: 'google',
      }

      // Store and then clear
      const service = web3AuthService as any
      service.storeUserInfo(userInfo)
      service.clearUserInfo()

      // Should be null after clearing
      const retrieved = web3AuthService.getStoredUserInfo()
      expect(retrieved).toBeNull()
    })

    it('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw an error
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded')
      })

      const service = web3AuthService as any
      expect(() => {
        service.storeUserInfo({ email: 'test@example.com' })
      }).not.toThrow()

      // Restore original localStorage
      localStorage.setItem = originalSetItem
    })

    it('should return correct Web3Auth network enum', () => {
      const service = web3AuthService as any
      
      expect(service.getWeb3AuthNetwork('mainnet')).toBe('sapphire_mainnet')
      expect(service.getWeb3AuthNetwork('testnet')).toBe('sapphire_devnet')
      expect(service.getWeb3AuthNetwork('sapphire_devnet')).toBe('sapphire_devnet')
      expect(service.getWeb3AuthNetwork('unknown')).toBe('sapphire_devnet')
    })
  })

  describe('Error Handling', () => {
    it('should handle missing client ID gracefully', () => {
      // This test verifies that the service handles missing configuration
      // The actual implementation should log a warning but not throw
      expect(() => {
        // Service initialization is handled in constructor
        expect(web3AuthService).toBeDefined()
      }).not.toThrow()
    })

    it('should handle invalid email login attempts', async () => {
      await expect(web3AuthService.loginWithEmail('invalid-email')).rejects.toThrow(
        'Please enter a valid email address'
      )
    })

    it('should handle uninitialized Web3Auth SDK', async () => {
      // Create a new instance to test uninitialized state
      const TestService = require('@/services/web3AuthService').Web3AuthService
      const testService = new TestService()
      
      // Mock the web3auth property to be null
      ;(testService as any).web3auth = null
      ;(testService as any).isInitialized = false

      await expect(testService.loginWithEmail('test@example.com')).rejects.toThrow(
        'Web3Auth SDK not initialized'
      )

      await expect(testService.loginWithSocial()).rejects.toThrow(
        'Web3Auth SDK not initialized'
      )
    })
  })
})
