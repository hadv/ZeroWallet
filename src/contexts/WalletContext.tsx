'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { Address, Hash } from 'viem'
import { WalletState, Transaction, SmartAccount } from '@/types'
import { walletService } from '@/services/walletService'
import { WALLET_STATES, STORAGE_KEYS } from '@/constants'

// Wallet context state
interface WalletContextState extends WalletState {
  smartAccount: SmartAccount | null
  transactions: Transaction[]
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
