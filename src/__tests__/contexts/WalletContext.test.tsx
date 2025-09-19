import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WalletProvider, useWallet } from '@/contexts/WalletContext'
import { multiValidatorService } from '@/services/multiValidatorService'

// Mock the services
jest.mock('@/services/walletService', () => ({
  WalletService: jest.fn().mockImplementation(() => ({
    sendTransaction: jest.fn(),
    sendUserOperation: jest.fn(),
    waitForTransaction: jest.fn(),
    getBalance: jest.fn().mockResolvedValue('1.0'),
    getSmartAccount: jest.fn().mockResolvedValue({ address: '0x123' })
  }))
}))

jest.mock('@/services/multiValidatorService', () => ({
  multiValidatorService: {
    requiresMultiSig: jest.fn(),
    getThreshold: jest.fn(),
    getValidators: jest.fn(),
    getValidatorById: jest.fn()
  }
}))

jest.mock('@/services/backend/signatureService', () => ({
  signatureService: {
    generateSignature: jest.fn()
  }
}))

// Mock fetch
global.fetch = jest.fn()

const TestComponent = () => {
  const { 
    sendTransaction, 
    sendMultiSigTransaction, 
    signMultiSigTransaction,
    isLoading,
    error 
  } = useWallet()

  return (
    <div>
      <button 
        onClick={() => sendTransaction('0x123', '1.0')}
        data-testid="send-transaction"
      >
        Send Transaction
      </button>
      <button 
        onClick={() => sendMultiSigTransaction('0x123', '1.0')}
        data-testid="send-multisig-transaction"
      >
        Send MultiSig Transaction
      </button>
      <button 
        onClick={() => signMultiSigTransaction('0xhash', 'validator-id')}
        data-testid="sign-multisig-transaction"
      >
        Sign MultiSig Transaction
      </button>
      {isLoading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}
    </div>
  )
}

describe('WalletContext - Passkey Transaction Signing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockReturnValue('demo_token'),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    })
  })

  describe('Single Signature Transactions', () => {
    it('should send transaction directly when multi-sig is not required', async () => {
      const mockWalletService = require('@/services/walletService').WalletService
      const sendTransactionMock = jest.fn().mockResolvedValue('0xtxhash')
      mockWalletService.mockImplementation(() => ({
        sendTransaction: sendTransactionMock,
        waitForTransaction: jest.fn().mockResolvedValue({}),
        getBalance: jest.fn().mockResolvedValue('1.0'),
        getSmartAccount: jest.fn().mockResolvedValue({ address: '0x123' })
      }))

      ;(multiValidatorService.requiresMultiSig as jest.Mock).mockReturnValue(false)

      render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      )

      fireEvent.click(screen.getByTestId('send-transaction'))

      await waitFor(() => {
        expect(sendTransactionMock).toHaveBeenCalledWith('0x123', '1.0', undefined)
      })
    })
  })

  describe('Multi-Signature Transactions', () => {
    it('should create multi-sig proposal when multi-sig is required', async () => {
      ;(multiValidatorService.requiresMultiSig as jest.Mock).mockReturnValue(true)
      ;(multiValidatorService.getThreshold as jest.Mock).mockReturnValue(2)
      ;(multiValidatorService.getValidators as jest.Mock).mockReturnValue([
        { id: 'validator1', type: 'social' },
        { id: 'validator2', type: 'passkey' }
      ])

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            proposal: {
              id: 'proposal-id',
              hash: '0xproposalhash',
              status: 'pending',
              signatures: []
            }
          }
        })
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      )

      fireEvent.click(screen.getByTestId('send-multisig-transaction'))

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/multisig/proposals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer demo_token'
          },
          body: JSON.stringify({
            to: '0x123',
            value: '1.0',
            data: undefined,
            requiredSignatures: 2,
            validatorIds: ['validator1', 'validator2'],
            expiresIn: 24 * 60 * 60,
            metadata: {
              title: 'Transfer 1.0 ETH',
              description: 'Transfer 1.0 ETH to 0x123',
              type: 'transfer'
            }
          })
        })
      })
    })

    it('should sign multi-sig transaction with passkey', async () => {
      const mockValidator = {
        id: 'passkey-validator',
        type: 'passkey',
        name: 'Test Passkey'
      }

      ;(multiValidatorService.getValidatorById as jest.Mock).mockReturnValue(mockValidator)

      const { signatureService } = require('@/services/backend/signatureService')
      signatureService.generateSignature.mockResolvedValue('0xsignature')

      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            proposal: {
              signatures: [
                {
                  validatorId: 'passkey-validator',
                  signature: '0xsignature',
                  signedAt: Date.now(),
                  signerType: 'passkey'
                }
              ],
              status: 'pending'
            }
          }
        })
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      )

      fireEvent.click(screen.getByTestId('sign-multisig-transaction'))

      await waitFor(() => {
        expect(signatureService.generateSignature).toHaveBeenCalledWith(
          '0xhash',
          expect.any(Object),
          'validator-id',
          'passkey'
        )
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/multisig/proposals/0xhash/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer demo_token'
          },
          body: JSON.stringify({
            validatorId: 'validator-id',
            signature: '0xsignature',
            signerType: 'passkey',
            metadata: {
              deviceInfo: navigator.userAgent,
              timestamp: expect.any(Number)
            }
          })
        })
      })
    })

    it('should handle signing errors gracefully', async () => {
      const mockValidator = {
        id: 'passkey-validator',
        type: 'passkey',
        name: 'Test Passkey'
      }

      ;(multiValidatorService.getValidatorById as jest.Mock).mockReturnValue(mockValidator)

      const { signatureService } = require('@/services/backend/signatureService')
      signatureService.generateSignature.mockRejectedValue(new Error('Signing failed'))

      render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      )

      fireEvent.click(screen.getByTestId('sign-multisig-transaction'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Signing failed')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors during transaction sending', async () => {
      const mockWalletService = require('@/services/walletService').WalletService
      const sendTransactionMock = jest.fn().mockRejectedValue(new Error('Network error'))
      mockWalletService.mockImplementation(() => ({
        sendTransaction: sendTransactionMock,
        getBalance: jest.fn().mockResolvedValue('1.0'),
        getSmartAccount: jest.fn().mockResolvedValue({ address: '0x123' })
      }))

      ;(multiValidatorService.requiresMultiSig as jest.Mock).mockReturnValue(false)

      render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      )

      fireEvent.click(screen.getByTestId('send-transaction'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error')
      })
    })

    it('should handle API errors during multi-sig proposal creation', async () => {
      ;(multiValidatorService.requiresMultiSig as jest.Mock).mockReturnValue(true)
      ;(multiValidatorService.getThreshold as jest.Mock).mockReturnValue(2)
      ;(multiValidatorService.getValidators as jest.Mock).mockReturnValue([])

      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'API Error' })
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      render(
        <WalletProvider>
          <TestComponent />
        </WalletProvider>
      )

      fireEvent.click(screen.getByTestId('send-multisig-transaction'))

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to create multi-sig proposal')
      })
    })
  })
})
