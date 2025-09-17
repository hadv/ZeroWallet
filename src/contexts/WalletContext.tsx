'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { Address, Hash } from 'viem'
import { WalletState, Transaction, SmartAccount, MultiSigTransaction, ValidatorInfo } from '@/types'
import { walletService } from '@/services/walletService'
import { multiValidatorService } from '@/services/multiValidatorService'
import { WALLET_STATES, STORAGE_KEYS } from '@/constants'

// Wallet context state
interface WalletContextState extends WalletState {
  smartAccount: SmartAccount | null
  transactions: Transaction[]
  multiSigTransactions: MultiSigTransaction[]
  pendingMultiSigTxs: MultiSigTransaction[]
}

// Wallet actions
type WalletAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: { address: Address; balance: string } }
  | { type: 'SET_DISCONNECTED' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_BALANCE'; payload: string }
  | { type: 'SET_SMART_ACCOUNT'; payload: SmartAccount }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'UPDATE_TRANSACTION'; payload: { hash: Hash; updates: Partial<Transaction> } }
  | { type: 'ADD_MULTISIG_TRANSACTION'; payload: MultiSigTransaction }
  | { type: 'UPDATE_MULTISIG_TRANSACTION'; payload: { hash: Hash; updates: Partial<MultiSigTransaction> } }
  | { type: 'CLEAR_ERROR' }

// Initial state
const initialState: WalletContextState = {
  isConnected: false,
  address: null,
  balance: '0',
  isLoading: false,
  error: null,
  smartAccount: null,
  transactions: [],
  multiSigTransactions: [],
  pendingMultiSigTxs: [],
}

// Wallet reducer
function walletReducer(state: WalletContextState, action: WalletAction): WalletContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }
    
    case 'SET_CONNECTED':
      return {
        ...state,
        isConnected: true,
        address: action.payload.address,
        balance: action.payload.balance,
        isLoading: false,
        error: null,
      }
    
    case 'SET_DISCONNECTED':
      return {
        ...initialState,
        transactions: state.transactions, // Keep transaction history
      }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    
    case 'SET_BALANCE':
      return { ...state, balance: action.payload }
    
    case 'SET_SMART_ACCOUNT':
      return { ...state, smartAccount: action.payload }
    
    case 'ADD_TRANSACTION':
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      }
    
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map(tx =>
          tx.hash === action.payload.hash
            ? { ...tx, ...action.payload.updates }
            : tx
        ),
      }

    case 'ADD_MULTISIG_TRANSACTION':
      return {
        ...state,
        multiSigTransactions: [...state.multiSigTransactions, action.payload],
        pendingMultiSigTxs: action.payload.isComplete
          ? state.pendingMultiSigTxs
          : [...state.pendingMultiSigTxs, action.payload],
      }

    case 'UPDATE_MULTISIG_TRANSACTION':
      const updatedMultiSigTxs = state.multiSigTransactions.map(tx =>
        tx.hash === action.payload.hash
          ? { ...tx, ...action.payload.updates }
          : tx
      )
      const updatedPendingTxs = state.pendingMultiSigTxs.map(tx =>
        tx.hash === action.payload.hash
          ? { ...tx, ...action.payload.updates }
          : tx
      ).filter(tx => !tx.isComplete)

      return {
        ...state,
        multiSigTransactions: updatedMultiSigTxs,
        pendingMultiSigTxs: updatedPendingTxs,
      }

    case 'CLEAR_ERROR':
      return { ...state, error: null }
    
    default:
      return state
  }
}

// Wallet context
interface WalletContextValue extends WalletContextState {
  connectWallet: (validator: any) => Promise<void>
  disconnectWallet: () => void
  sendTransaction: (to: Address, value: string, data?: string) => Promise<Hash>
  sendUserOperation: (calls: Array<{ to: Address; value?: bigint; data?: string }>) => Promise<Hash>
  sendMultiSigTransaction: (to: Address, value: string, data?: string) => Promise<MultiSigTransaction>
  signMultiSigTransaction: (txHash: Hash, validatorId: string) => Promise<void>
  refreshBalance: () => Promise<void>
  refreshSmartAccount: () => Promise<void>
  clearError: () => void
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined)

// Wallet provider component
interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, dispatch] = useReducer(walletReducer, initialState)

  // Load persisted state on mount
  useEffect(() => {
    const loadPersistedState = () => {
      try {
        const savedState = localStorage.getItem(STORAGE_KEYS.WALLET_STATE)
        const savedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
        
        if (savedTransactions) {
          const transactions = JSON.parse(savedTransactions)
          transactions.forEach((tx: Transaction) => {
            dispatch({ type: 'ADD_TRANSACTION', payload: tx })
          })
        }
      } catch (error) {
        console.error('Error loading persisted wallet state:', error)
      }
    }

    loadPersistedState()
  }, [])

  // Persist state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.WALLET_STATE, JSON.stringify({
        isConnected: state.isConnected,
        address: state.address,
        balance: state.balance,
      }))
      
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions))
    } catch (error) {
      console.error('Error persisting wallet state:', error)
    }
  }, [state.isConnected, state.address, state.balance, state.transactions])

  // Connect wallet function
  const connectWallet = async (validator: any) => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      // Create kernel account
      const account = await walletService.createAccount(validator)
      
      // Create kernel client
      await walletService.createAccountClient(account)
      
      // Get balance
      const balance = await walletService.getBalance()
      
      // Get smart account info
      const smartAccount = await walletService.getSmartAccountInfo()
      
      dispatch({
        type: 'SET_CONNECTED',
        payload: { address: account.address, balance },
      })
      
      if (smartAccount) {
        dispatch({ type: 'SET_SMART_ACCOUNT', payload: smartAccount })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }

  // Disconnect wallet function
  const disconnectWallet = () => {
    walletService.reset()
    dispatch({ type: 'SET_DISCONNECTED' })
    
    // Clear persisted state
    try {
      localStorage.removeItem(STORAGE_KEYS.WALLET_STATE)
    } catch (error) {
      console.error('Error clearing persisted state:', error)
    }
  }

  // Send transaction function
  const sendTransaction = async (to: Address, value: string, data?: string): Promise<Hash> => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const hash = await walletService.sendTransaction(to, value, data)
      
      // Add transaction to state
      const transaction: Transaction = {
        hash,
        to,
        value,
        status: 'pending',
        timestamp: Date.now(),
      }
      
      dispatch({ type: 'ADD_TRANSACTION', payload: transaction })
      dispatch({ type: 'SET_LOADING', payload: false })
      
      // Wait for confirmation in background
      walletService.waitForTransaction(hash)
        .then(() => {
          dispatch({
            type: 'UPDATE_TRANSACTION',
            payload: { hash, updates: { status: 'confirmed' } },
          })
          refreshBalance()
        })
        .catch(() => {
          dispatch({
            type: 'UPDATE_TRANSACTION',
            payload: { hash, updates: { status: 'failed' } },
          })
        })
      
      return hash
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send transaction'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }

  // Send user operation function
  const sendUserOperation = async (calls: Array<{ to: Address; value?: bigint; data?: string }>): Promise<Hash> => {
    dispatch({ type: 'SET_LOADING', payload: true })
    
    try {
      const hash = await walletService.sendUserOperation(calls)
      
      // Add transaction to state (simplified for user operations)
      const transaction: Transaction = {
        hash,
        to: calls[0]?.to || '0x0',
        value: calls[0]?.value?.toString() || '0',
        status: 'pending',
        timestamp: Date.now(),
      }
      
      dispatch({ type: 'ADD_TRANSACTION', payload: transaction })
      dispatch({ type: 'SET_LOADING', payload: false })
      
      // Wait for confirmation in background
      walletService.waitForTransaction(hash)
        .then(() => {
          dispatch({
            type: 'UPDATE_TRANSACTION',
            payload: { hash, updates: { status: 'confirmed' } },
          })
          refreshBalance()
        })
        .catch(() => {
          dispatch({
            type: 'UPDATE_TRANSACTION',
            payload: { hash, updates: { status: 'failed' } },
          })
        })
      
      return hash
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send user operation'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }

  // Refresh balance function
  const refreshBalance = async () => {
    if (!state.isConnected) return
    
    try {
      const balance = await walletService.getBalance()
      dispatch({ type: 'SET_BALANCE', payload: balance })
    } catch (error) {
      console.error('Error refreshing balance:', error)
    }
  }

  // Refresh smart account info
  const refreshSmartAccount = async () => {
    if (!state.isConnected) return
    
    try {
      const smartAccount = await walletService.getSmartAccountInfo()
      if (smartAccount) {
        dispatch({ type: 'SET_SMART_ACCOUNT', payload: smartAccount })
      }
    } catch (error) {
      console.error('Error refreshing smart account:', error)
    }
  }

  // Send multi-signature transaction function
  const sendMultiSigTransaction = async (to: Address, value: string, data?: string): Promise<MultiSigTransaction> => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Check if multi-sig is required
      const requiresMultiSig = multiValidatorService.requiresMultiSig(value)
      const threshold = multiValidatorService.getThreshold()

      if (!requiresMultiSig) {
        // If multi-sig is not required, send as regular transaction
        const hash = await walletService.sendTransaction(to, value, data)

        // Convert to MultiSigTransaction format for consistency
        const multiSigTx: MultiSigTransaction = {
          hash,
          to,
          value,
          status: 'pending',
          timestamp: Date.now(),
          requiredSignatures: 1,
          collectedSignatures: [],
          isComplete: true,
        }

        dispatch({ type: 'ADD_MULTISIG_TRANSACTION', payload: multiSigTx })
        dispatch({ type: 'SET_LOADING', payload: false })

        return multiSigTx
      }

      // For multi-sig transactions, create a proposal via the backend API
      const validators = multiValidatorService.getValidators()
      const authToken = localStorage.getItem('auth_token') || 'demo_token'

      const response = await fetch('/api/multisig/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          to,
          value,
          data,
          requiredSignatures: threshold,
          validatorIds: validators.map(v => v.id),
          expiresIn: 24 * 60 * 60, // 24 hours
          metadata: {
            title: `Transfer ${value} ETH`,
            description: `Transfer ${value} ETH to ${to}`,
            type: 'transfer'
          }
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create multi-sig proposal')
      }

      const result = await response.json()
      const proposal = result.data

      // Convert proposal to MultiSigTransaction format
      const multiSigTx: MultiSigTransaction = {
        hash: proposal.id as Hash,
        to: proposal.to,
        value: proposal.value,
        status: 'pending',
        timestamp: proposal.createdAt,
        requiredSignatures: proposal.requiredSignatures,
        collectedSignatures: proposal.signatures || [],
        isComplete: false,
        expiresAt: proposal.expiresAt,
      }

      dispatch({ type: 'ADD_MULTISIG_TRANSACTION', payload: multiSigTx })
      dispatch({ type: 'SET_LOADING', payload: false })

      return multiSigTx
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send multi-sig transaction'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }

  // Sign multi-signature transaction function
  const signMultiSigTransaction = async (txHash: Hash, validatorId: string): Promise<void> => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Find the transaction
      const tx = state.multiSigTransactions.find(t => t.hash === txHash)
      if (!tx) {
        throw new Error('Transaction not found')
      }

      // Check if already signed by this validator
      if (tx.collectedSignatures.some(sig => sig.validatorId === validatorId)) {
        throw new Error('Already signed by this validator')
      }

      // Get validator info
      const validator = multiValidatorService.getValidatorById(validatorId)
      if (!validator) {
        throw new Error('Validator not found')
      }

      // Generate real signature using the signature service
      const { signatureService } = await import('@/services/backend/signatureService')
      const signature = await signatureService.generateSignature(
        txHash,
        {
          to: tx.to,
          value: tx.value,
          data: (tx as any).data || '0x'
        },
        validatorId,
        validator.type
      )

      // Sign the proposal via the backend API
      const authToken = localStorage.getItem('auth_token') || 'demo_token'

      const response = await fetch(`/api/multisig/proposals/${txHash}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          validatorId,
          signature,
          signerType: validator.type,
          metadata: {
            deviceInfo: navigator.userAgent,
            timestamp: Date.now()
          }
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sign proposal')
      }

      const result = await response.json()
      const updatedProposal = result.data.proposal

      // Update local state
      dispatch({
        type: 'UPDATE_MULTISIG_TRANSACTION',
        payload: {
          hash: txHash,
          updates: {
            collectedSignatures: updatedProposal.signatures || [],
            isComplete: updatedProposal.status === 'executed',
            status: updatedProposal.status === 'executed' ? 'confirmed' : 'pending',
          },
        },
      })

      // Update validator last used
      multiValidatorService.updateValidatorLastUsed(validatorId)

      // If transaction was executed, refresh balance
      if (result.data.executed) {
        refreshBalance()
      }

      dispatch({ type: 'SET_LOADING', payload: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign transaction'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const value: WalletContextValue = {
    ...state,
    connectWallet,
    disconnectWallet,
    sendTransaction,
    sendUserOperation,
    sendMultiSigTransaction,
    signMultiSigTransaction,
    refreshBalance,
    refreshSmartAccount,
    clearError,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

// Custom hook to use wallet context
export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

export default WalletContext
