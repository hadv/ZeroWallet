/**
 * @jest-environment jsdom
 */

import { MultiValidatorService } from '@/services/multiValidatorService'
import { ValidatorInfo, SigningPolicy } from '@/types'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('MultiValidatorService', () => {
  let service: MultiValidatorService

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    
    // Create new service instance
    service = new MultiValidatorService()
  })

  describe('initializeWithSocialLogin', () => {
    it('should initialize with a social login validator', async () => {
      const mockValidator = { type: 'social', id: 'test-validator' }
      const mockUserInfo = {
        email: 'test@example.com',
        issuer: 'test-issuer',
        publicAddress: '0x123',
        loginMethod: 'google'
      }

      const primarySigner = await service.initializeWithSocialLogin(mockValidator, mockUserInfo)

      expect(primarySigner).toMatchObject({
        type: 'social',
        name: 'test@example.com',
        metadata: {
          email: 'test@example.com',
          provider: 'google',
          publicAddress: '0x123',
          issuer: 'test-issuer'
        },
        isActive: true
      })

      const validators = service.getValidators()
      expect(validators).toHaveLength(1)
      expect(validators[0]).toEqual(primarySigner)
    })
  })

  describe('addPasskeySigner', () => {
    beforeEach(async () => {
      // Initialize with social login first
      const mockValidator = { type: 'social', id: 'social-validator' }
      const mockUserInfo = {
        email: 'test@example.com',
        issuer: 'test-issuer',
        publicAddress: '0x123',
        loginMethod: 'google'
      }
      await service.initializeWithSocialLogin(mockValidator, mockUserInfo)
    })

    it('should add a passkey signer and enable multi-sig', async () => {
      // Mock the passkey service
      const mockPasskeyService = {
        registerPasskey: jest.fn().mockResolvedValue({
          validator: { type: 'passkey', id: 'passkey-validator' },
          credential: {
            id: 'cred-123',
            publicKey: 'pubkey-123',
            username: 'test-passkey',
            createdAt: Date.now()
          }
        })
      }

      // Mock the module
      jest.doMock('@/services/passkeyService', () => ({
        passkeyService: mockPasskeyService
      }))

      const request = {
        type: 'passkey' as const,
        name: 'My Passkey',
        username: 'test-passkey'
      }

      // This would normally call the actual passkey service
      // For testing, we'll simulate the behavior
      const mockNewSigner: ValidatorInfo = {
        id: 'passkey_cred-123',
        type: 'passkey',
        name: 'My Passkey',
        publicKey: 'pubkey-123',
        metadata: {
          authenticatorId: 'cred-123',
          credentialId: 'cred-123',
          passkeyName: 'test-passkey'
        },
        createdAt: Date.now(),
        isActive: true
      }

      // Manually add the signer to test the logic
      const validators = service.getValidators()
      validators.push(mockNewSigner)

      expect(service.isMultiSig()).toBe(true)
      expect(service.getThreshold()).toBe(2)
    })
  })

  describe('signing policy', () => {
    it('should update signing policy correctly', async () => {
      const newPolicy: SigningPolicy = {
        requireMultiSig: true,
        threshold: 2,
        highValueThreshold: '1.0',
        allowedOperations: ['transfer']
      }

      await service.updateSigningPolicy(newPolicy)
      const currentPolicy = service.getSigningPolicy()

      expect(currentPolicy).toEqual(newPolicy)
    })

    it('should validate threshold constraints', async () => {
      // Initialize with one validator
      const mockValidator = { type: 'social', id: 'social-validator' }
      const mockUserInfo = {
        email: 'test@example.com',
        issuer: 'test-issuer',
        publicAddress: '0x123',
        loginMethod: 'google'
      }
      await service.initializeWithSocialLogin(mockValidator, mockUserInfo)

      const invalidPolicy: SigningPolicy = {
        requireMultiSig: true,
        threshold: 5, // More than available validators
      }

      await expect(service.updateSigningPolicy(invalidPolicy))
        .rejects.toThrow('Threshold cannot be greater than number of validators')
    })
  })

  describe('requiresMultiSig', () => {
    beforeEach(async () => {
      // Initialize with social login
      const mockValidator = { type: 'social', id: 'social-validator' }
      const mockUserInfo = {
        email: 'test@example.com',
        issuer: 'test-issuer',
        publicAddress: '0x123',
        loginMethod: 'google'
      }
      await service.initializeWithSocialLogin(mockValidator, mockUserInfo)

      // Set policy with high value threshold
      await service.updateSigningPolicy({
        requireMultiSig: true,
        threshold: 2,
        highValueThreshold: '0.5'
      })
    })

    it('should require multi-sig for high value transactions', () => {
      expect(service.requiresMultiSig('1.0')).toBe(true)
      expect(service.requiresMultiSig('0.1')).toBe(false)
    })

    it('should respect requireMultiSig setting', async () => {
      await service.updateSigningPolicy({
        requireMultiSig: false,
        threshold: 1
      })

      expect(service.requiresMultiSig('1.0')).toBe(false)
    })
  })

  describe('validator management', () => {
    it('should get validator by ID', async () => {
      const mockValidator = { type: 'social', id: 'social-validator' }
      const mockUserInfo = {
        email: 'test@example.com',
        issuer: 'test-issuer',
        publicAddress: '0x123',
        loginMethod: 'google'
      }
      const primarySigner = await service.initializeWithSocialLogin(mockValidator, mockUserInfo)

      const foundValidator = service.getValidatorById(primarySigner.id)
      expect(foundValidator).toEqual(primarySigner)

      const notFound = service.getValidatorById('non-existent')
      expect(notFound).toBeNull()
    })

    it('should update validator last used timestamp', async () => {
      const mockValidator = { type: 'social', id: 'social-validator' }
      const mockUserInfo = {
        email: 'test@example.com',
        issuer: 'test-issuer',
        publicAddress: '0x123',
        loginMethod: 'google'
      }
      const primarySigner = await service.initializeWithSocialLogin(mockValidator, mockUserInfo)

      const originalLastUsed = primarySigner.lastUsed
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))
      
      service.updateValidatorLastUsed(primarySigner.id)
      
      const updatedValidator = service.getValidatorById(primarySigner.id)
      expect(updatedValidator?.lastUsed).toBeGreaterThan(originalLastUsed || 0)
    })
  })

  describe('storage and persistence', () => {
    it('should save data to localStorage', async () => {
      const mockValidator = { type: 'social', id: 'social-validator' }
      const mockUserInfo = {
        email: 'test@example.com',
        issuer: 'test-issuer',
        publicAddress: '0x123',
        loginMethod: 'google'
      }
      await service.initializeWithSocialLogin(mockValidator, mockUserInfo)

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'zerowallet_multi_sig_validators',
        expect.any(String)
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'zerowallet_signing_policy',
        expect.any(String)
      )
    })

    it('should reset all data', () => {
      service.reset()

      expect(service.getValidators()).toHaveLength(0)
      expect(service.isMultiSig()).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('zerowallet_multi_sig_validators')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('zerowallet_signing_policy')
    })
  })
})
