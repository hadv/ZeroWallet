import { PasskeyService } from '@/services/passkeyService'
import { toWebAuthnKey, toPasskeyValidator } from '@zerodev/passkey-validator'

// Mock the ZeroDev modules
jest.mock('@zerodev/passkey-validator', () => ({
  toWebAuthnKey: jest.fn(),
  toPasskeyValidator: jest.fn(),
  WebAuthnMode: {
    Register: 'register',
    Login: 'login'
  },
  PasskeyValidatorContractVersion: {
    V0_0_2: '0.0.2'
  }
}))

jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({})),
  http: jest.fn()
}))

jest.mock('@zerodev/sdk/constants', () => ({
  getEntryPoint: jest.fn(() => ({ address: '0x123', version: '0.7' })),
  KERNEL_V3_1: '0.3.1'
}))

jest.mock('@/config', () => ({
  config: {
    zerodev: {
      passkeyServerUrl: 'https://test-passkey-server.com'
    },
    network: {
      rpcUrl: 'https://test-rpc.com'
    }
  },
  getCurrentChain: jest.fn(() => ({ id: 1, name: 'mainnet' }))
}))

const mockWebAuthnKey = {
  pubX: BigInt('123'),
  pubY: BigInt('456'),
  authenticatorId: 'test-auth-id',
  authenticatorIdHash: '0xhash',
  rpID: 'test.com'
}

const mockValidator = {
  address: '0xvalidator',
  signMessage: jest.fn(),
  signUserOperation: jest.fn()
}

describe('PasskeyService', () => {
  let passkeyService: PasskeyService
  
  beforeEach(() => {
    passkeyService = new PasskeyService()
    jest.clearAllMocks()
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    })
  })

  describe('registerPasskey', () => {
    it('should register a new passkey successfully', async () => {
      const username = 'testuser'
      
      ;(toWebAuthnKey as jest.Mock).mockResolvedValue(mockWebAuthnKey)
      ;(toPasskeyValidator as jest.Mock).mockResolvedValue(mockValidator)

      const result = await passkeyService.registerPasskey(username)

      expect(toWebAuthnKey).toHaveBeenCalledWith({
        passkeyName: username,
        passkeyServerUrl: 'https://test-passkey-server.com',
        mode: 'register'
      })

      expect(toPasskeyValidator).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          webAuthnKey: mockWebAuthnKey,
          validatorContractVersion: '0.0.2'
        })
      )

      expect(result.validator).toBe(mockValidator)
      expect(result.credential).toMatchObject({
        id: mockWebAuthnKey.authenticatorId,
        publicKey: mockWebAuthnKey.pubY.toString(),
        username
      })
    })

    it('should throw error if registration fails', async () => {
      const username = 'testuser'
      
      ;(toWebAuthnKey as jest.Mock).mockRejectedValue(new Error('Registration failed'))

      await expect(passkeyService.registerPasskey(username)).rejects.toThrow(
        'Failed to register passkey. Please try again.'
      )
    })
  })

  describe('loginWithPasskey', () => {
    it('should login with existing passkey successfully', async () => {
      const username = 'testuser'
      
      // Mock stored credential
      jest.spyOn(passkeyService, 'getStoredCredential').mockReturnValue({
        id: 'test-id',
        publicKey: '456',
        username,
        createdAt: Date.now()
      })
      
      ;(toWebAuthnKey as jest.Mock).mockResolvedValue(mockWebAuthnKey)
      ;(toPasskeyValidator as jest.Mock).mockResolvedValue(mockValidator)

      const result = await passkeyService.loginWithPasskey(username)

      expect(toWebAuthnKey).toHaveBeenCalledWith({
        passkeyName: username,
        passkeyServerUrl: 'https://test-passkey-server.com',
        mode: 'login'
      })

      expect(result.validator).toBe(mockValidator)
      expect(result.credential).toBeTruthy()
    })

    it('should throw error if no passkey found', async () => {
      const username = 'testuser'
      
      jest.spyOn(passkeyService, 'getStoredCredential').mockReturnValue(null)

      await expect(passkeyService.loginWithPasskey(username)).rejects.toThrow(
        'No passkey found for this username. Please register first.'
      )
    })
  })

  describe('signMessage', () => {
    it('should sign message with passkey successfully', async () => {
      const credentialId = 'test-credential-id'
      const message = 'test message'
      const expectedSignature = '0xsignature'
      
      // Mock stored credential
      jest.spyOn(passkeyService, 'getStoredCredential').mockReturnValue({
        id: credentialId,
        publicKey: '456',
        username: 'testuser',
        createdAt: Date.now()
      })
      
      ;(toWebAuthnKey as jest.Mock).mockResolvedValue(mockWebAuthnKey)
      ;(toPasskeyValidator as jest.Mock).mockResolvedValue(mockValidator)
      mockValidator.signMessage.mockResolvedValue(expectedSignature)

      const result = await passkeyService.signMessage({ message, credentialId })

      expect(mockValidator.signMessage).toHaveBeenCalledWith({ message })
      expect(result).toBe(expectedSignature)
    })

    it('should throw error if credential not found', async () => {
      const credentialId = 'nonexistent-id'
      const message = 'test message'
      
      jest.spyOn(passkeyService, 'getStoredCredential').mockReturnValue(null)

      await expect(passkeyService.signMessage({ message, credentialId })).rejects.toThrow(
        'Credential not found'
      )
    })
  })

  describe('signUserOperation', () => {
    it('should sign user operation with passkey successfully', async () => {
      const credentialId = 'test-credential-id'
      const userOperation = { to: '0x123', value: '1000000000000000000' }
      const expectedSignature = '0xsignature'
      
      // Mock stored credential
      jest.spyOn(passkeyService, 'getStoredCredential').mockReturnValue({
        id: credentialId,
        publicKey: '456',
        username: 'testuser',
        createdAt: Date.now()
      })
      
      ;(toWebAuthnKey as jest.Mock).mockResolvedValue(mockWebAuthnKey)
      ;(toPasskeyValidator as jest.Mock).mockResolvedValue(mockValidator)
      mockValidator.signUserOperation.mockResolvedValue(expectedSignature)

      const result = await passkeyService.signUserOperation({ userOperation, credentialId })

      expect(mockValidator.signUserOperation).toHaveBeenCalledWith(userOperation)
      expect(result).toBe(expectedSignature)
    })
  })

  describe('getPasskeyValidator', () => {
    it('should return passkey validator for valid credential', async () => {
      const credentialId = 'test-credential-id'
      
      // Mock stored credential
      jest.spyOn(passkeyService, 'getStoredCredential').mockReturnValue({
        id: credentialId,
        publicKey: '456',
        username: 'testuser',
        createdAt: Date.now()
      })
      
      ;(toWebAuthnKey as jest.Mock).mockResolvedValue(mockWebAuthnKey)
      ;(toPasskeyValidator as jest.Mock).mockResolvedValue(mockValidator)

      const result = await passkeyService.getPasskeyValidator(credentialId)

      expect(result).toBe(mockValidator)
    })

    it('should throw error if credential not found', async () => {
      const credentialId = 'nonexistent-id'
      
      jest.spyOn(passkeyService, 'getStoredCredential').mockReturnValue(null)

      await expect(passkeyService.getPasskeyValidator(credentialId)).rejects.toThrow(
        'Credential not found'
      )
    })
  })
})
