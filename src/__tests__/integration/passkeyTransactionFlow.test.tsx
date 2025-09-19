import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/contexts/AuthContext'
import { WalletProvider } from '@/contexts/WalletContext'
import SendTransaction from '@/components/wallet/SendTransaction'
import { MultiSigTransactionModal } from '@/components/MultiSigTransactionModal'

// Mock all the services
jest.mock('@/services/passkeyService', () => ({
  passkeyService: {
    registerPasskey: jest.fn(),
    loginWithPasskey: jest.fn(),
    signMessage: jest.fn(),
    signUserOperation: jest.fn(),
    getPasskeyValidator: jest.fn()
  }
}))

jest.mock('@/services/walletService', () => ({
  WalletService: jest.fn().mockImplementation(() => ({
    sendTransaction: jest.fn().mockResolvedValue('0xtxhash'),
    sendUserOperation: jest.fn(),
    waitForTransaction: jest.fn().mockResolvedValue({}),
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

jest.mock('@/services/web3AuthService', () => ({
  Web3AuthService: jest.fn()
}))

// Mock fetch
global.fetch = jest.fn()

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <WalletProvider>
      {children}
    </WalletProvider>
  </AuthProvider>
)

describe('Passkey Transaction Flow Integration', () => {
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

  describe('Single Signature Transaction with Passkey', () => {
    it('should complete transaction flow with passkey signing', async () => {
      const { multiValidatorService } = require('@/services/multiValidatorService')
      multiValidatorService.requiresMultiSig.mockReturnValue(false)

      // Mock auth context to simulate passkey user
      const mockAuthContext = {
        validators: [
          { id: 'passkey-1', type: 'passkey', name: 'My Passkey' }
        ],
        authMethod: 'passkey'
      }

      // Mock useAuth hook
      jest.doMock('@/contexts/AuthContext', () => ({
        useAuth: () => mockAuthContext,
        AuthProvider: ({ children }: any) => children
      }))

      const SendTransactionWithMocks = () => {
        const [isOpen, setIsOpen] = React.useState(true)
        return (
          <SendTransaction 
            isOpen={isOpen} 
            onClose={() => setIsOpen(false)} 
          />
        )
      }

      render(
        <TestWrapper>
          <SendTransactionWithMocks />
        </TestWrapper>
      )

      // Fill in transaction details
      const recipientInput = screen.getByLabelText('Recipient Address')
      const amountInput = screen.getByLabelText('Amount (ETH)')

      fireEvent.change(recipientInput, { target: { value: '0x742d35Cc6634C0532925a3b8D4C9db96' } })
      fireEvent.change(amountInput, { target: { value: '0.1' } })

      // Click send transaction
      const sendButton = screen.getByText('Send Transaction')
      fireEvent.click(sendButton)

      // Should show passkey signing modal
      await waitFor(() => {
        expect(screen.getByText('Sign Transaction')).toBeInTheDocument()
      })

      // Click sign with passkey
      const signButton = screen.getByText('Sign with Passkey')
      fireEvent.click(signButton)

      // Should show signing states
      await waitFor(() => {
        expect(screen.getByText('Waiting for Passkey')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('Signing Transaction')).toBeInTheDocument()
      })

      // Should eventually show success
      await waitFor(() => {
        expect(screen.getByText('Successfully Signed')).toBeInTheDocument()
      })
    })
  })

  describe('Multi-Signature Transaction with Passkey', () => {
    it('should complete multi-sig transaction flow with passkey signing', async () => {
      const { multiValidatorService } = require('@/services/multiValidatorService')
      multiValidatorService.requiresMultiSig.mockReturnValue(true)
      multiValidatorService.getThreshold.mockReturnValue(2)
      multiValidatorService.getValidators.mockReturnValue([
        { id: 'social-1', type: 'social', name: 'Social Login' },
        { id: 'passkey-1', type: 'passkey', name: 'My Passkey' }
      ])
      multiValidatorService.getValidatorById.mockReturnValue({
        id: 'passkey-1',
        type: 'passkey',
        name: 'My Passkey'
      })

      // Mock successful proposal creation
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

      const mockTransaction = {
        hash: '0xproposalhash',
        to: '0x742d35Cc6634C0532925a3b8D4C9db96',
        value: '0.1',
        status: 'pending',
        timestamp: Date.now(),
        requiredSignatures: 2,
        collectedSignatures: [],
        isComplete: false
      }

      const mockOnSign = jest.fn().mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <MultiSigTransactionModal
            isOpen={true}
            onClose={() => {}}
            transaction={mockTransaction}
            onSign={mockOnSign}
            availableSigners={[
              { id: 'passkey-1', type: 'passkey', name: 'My Passkey' }
            ]}
          />
        </TestWrapper>
      )

      // Should show transaction details
      expect(screen.getByText('Multi-Signature Transaction')).toBeInTheDocument()
      expect(screen.getByText('0.1 ETH')).toBeInTheDocument()

      // Find and click the sign button for passkey
      const signButton = screen.getByText('Sign')
      fireEvent.click(signButton)

      // Should show passkey signing modal
      await waitFor(() => {
        expect(screen.getByText('Sign Multi-Sig Transaction')).toBeInTheDocument()
      })

      // Click sign with passkey
      const passkeySignButton = screen.getByText('Sign with Passkey')
      fireEvent.click(passkeySignButton)

      // Should go through signing flow
      await waitFor(() => {
        expect(screen.getByText('Waiting for Passkey')).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText('Successfully Signed')).toBeInTheDocument()
      })

      // Should call the onSign function
      expect(mockOnSign).toHaveBeenCalledWith('passkey-1')
    })

    it('should handle passkey signing errors in multi-sig flow', async () => {
      const { multiValidatorService } = require('@/services/multiValidatorService')
      multiValidatorService.getValidatorById.mockReturnValue({
        id: 'passkey-1',
        type: 'passkey',
        name: 'My Passkey'
      })

      const mockTransaction = {
        hash: '0xproposalhash',
        to: '0x742d35Cc6634C0532925a3b8D4C9db96',
        value: '0.1',
        status: 'pending',
        timestamp: Date.now(),
        requiredSignatures: 2,
        collectedSignatures: [],
        isComplete: false
      }

      const mockOnSign = jest.fn().mockRejectedValue(new Error('Passkey signing failed'))

      render(
        <TestWrapper>
          <MultiSigTransactionModal
            isOpen={true}
            onClose={() => {}}
            transaction={mockTransaction}
            onSign={mockOnSign}
            availableSigners={[
              { id: 'passkey-1', type: 'passkey', name: 'My Passkey' }
            ]}
          />
        </TestWrapper>
      )

      // Click the sign button for passkey
      const signButton = screen.getByText('Sign')
      fireEvent.click(signButton)

      // Should show passkey signing modal
      await waitFor(() => {
        expect(screen.getByText('Sign Multi-Sig Transaction')).toBeInTheDocument()
      })

      // Click sign with passkey
      const passkeySignButton = screen.getByText('Sign with Passkey')
      fireEvent.click(passkeySignButton)

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Signing Failed')).toBeInTheDocument()
      })

      expect(screen.getByText('Passkey signing failed')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })
  })

  describe('Error Scenarios', () => {
    it('should handle network errors gracefully', async () => {
      const { multiValidatorService } = require('@/services/multiValidatorService')
      multiValidatorService.requiresMultiSig.mockReturnValue(true)
      multiValidatorService.getThreshold.mockReturnValue(2)
      multiValidatorService.getValidators.mockReturnValue([])

      // Mock network error
      const mockResponse = {
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Network error' })
      }
      ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

      const SendTransactionWithMocks = () => {
        const [isOpen, setIsOpen] = React.useState(true)
        return (
          <SendTransaction 
            isOpen={isOpen} 
            onClose={() => setIsOpen(false)} 
          />
        )
      }

      render(
        <TestWrapper>
          <SendTransactionWithMocks />
        </TestWrapper>
      )

      // Fill in transaction details
      const recipientInput = screen.getByLabelText('Recipient Address')
      const amountInput = screen.getByLabelText('Amount (ETH)')

      fireEvent.change(recipientInput, { target: { value: '0x742d35Cc6634C0532925a3b8D4C9db96' } })
      fireEvent.change(amountInput, { target: { value: '0.1' } })

      // Click send transaction
      const sendButton = screen.getByText('Send Transaction')
      fireEvent.click(sendButton)

      // Should show error
      await waitFor(() => {
        expect(screen.getByText('Failed to create multi-sig proposal')).toBeInTheDocument()
      })
    })
  })
})
