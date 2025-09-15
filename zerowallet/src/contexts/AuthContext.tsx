'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { AuthState, PasskeyCredential, SocialProvider } from '@/types'
import { passkeyService } from '@/services/passkeyService'
import { socialLoginService } from '@/services/socialLoginService'
import { useWallet } from './WalletContext'
import { STORAGE_KEYS } from '@/constants'

// Auth context state
interface AuthContextState extends AuthState {
  availableUsernames: string[]
  passkeySupport: {
    isSupported: boolean
    isPlatformAuthenticatorAvailable: boolean
  }
  socialProviders: SocialProvider[]
  userInfo: any
}

// Auth actions
type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_AUTHENTICATED'; payload: { username: string; authMethod: 'passkey' | 'social'; userInfo?: any } }
  | { type: 'SET_UNAUTHENTICATED' }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'SET_AVAILABLE_USERNAMES'; payload: string[] }
  | { type: 'SET_PASSKEY_SUPPORT'; payload: { isSupported: boolean; isPlatformAuthenticatorAvailable: boolean } }
  | { type: 'SET_SOCIAL_PROVIDERS'; payload: SocialProvider[] }
  | { type: 'SET_USER_INFO'; payload: any }
  | { type: 'CLEAR_ERROR' }

// Initial state
const initialState: AuthContextState = {
  isAuthenticated: false,
  username: null,
  authMethod: null,
  isLoading: false,
  error: null,
  availableUsernames: [],
  passkeySupport: {
    isSupported: false,
    isPlatformAuthenticatorAvailable: false,
  },
  socialProviders: [],
  userInfo: null,
}

// Auth reducer
function authReducer(state: AuthContextState, action: AuthAction): AuthContextState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload, error: null }
    
    case 'SET_AUTHENTICATED':
      return {
        ...state,
        isAuthenticated: true,
        username: action.payload.username,
        authMethod: action.payload.authMethod,
        userInfo: action.payload.userInfo || null,
        isLoading: false,
        error: null,
      }
    
    case 'SET_UNAUTHENTICATED':
      return {
        ...state,
        isAuthenticated: false,
        username: null,
        authMethod: null,
        isLoading: false,
        error: null,
      }
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
    
    case 'SET_AVAILABLE_USERNAMES':
      return { ...state, availableUsernames: action.payload }
    
    case 'SET_PASSKEY_SUPPORT':
      return { ...state, passkeySupport: action.payload }

    case 'SET_SOCIAL_PROVIDERS':
      return { ...state, socialProviders: action.payload }

    case 'SET_USER_INFO':
      return { ...state, userInfo: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }
    
    default:
      return state
  }
}

// Auth context value
interface AuthContextValue extends AuthContextState {
  registerWithPasskey: (username: string) => Promise<void>
  loginWithPasskey: (username: string) => Promise<void>
  loginWithEmail: (email: string) => Promise<void>
  loginWithSocial: (provider: 'google' | 'github' | 'twitter' | 'discord') => Promise<void>
  logout: () => void
  clearError: () => void
  deletePasskey: (username: string) => boolean
  validateUsername: (username: string) => { isValid: boolean; error?: string }
  refreshAvailableUsernames: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Auth provider component
interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const { connectWallet, disconnectWallet } = useWallet()

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // Check passkey support
      const supportInfo = await passkeyService.getPasskeySupportInfo()
      dispatch({
        type: 'SET_PASSKEY_SUPPORT',
        payload: {
          isSupported: supportInfo.isSupported,
          isPlatformAuthenticatorAvailable: supportInfo.isPlatformAuthenticatorAvailable,
        },
      })

      // Load available usernames
      const usernames = passkeyService.getRegisteredUsernames()
      dispatch({ type: 'SET_AVAILABLE_USERNAMES', payload: usernames })

      // Load social providers
      const providers = socialLoginService.getAvailableProviders()
      dispatch({ type: 'SET_SOCIAL_PROVIDERS', payload: providers })

      // Check for persisted auth state
      try {
        const savedAuthState = localStorage.getItem(STORAGE_KEYS.AUTH_STATE)
        if (savedAuthState) {
          const { username, authMethod, userInfo } = JSON.parse(savedAuthState)
          if (username && authMethod) {
            dispatch({
              type: 'SET_AUTHENTICATED',
              payload: { username, authMethod, userInfo },
            })
          }
        }
      } catch (error) {
        console.error('Error loading persisted auth state:', error)
      }
    }

    initializeAuth()
  }, [])

  // Persist auth state changes
  useEffect(() => {
    try {
      if (state.isAuthenticated && state.username && state.authMethod) {
        localStorage.setItem(
          STORAGE_KEYS.AUTH_STATE,
          JSON.stringify({
            username: state.username,
            authMethod: state.authMethod,
          })
        )
      } else {
        localStorage.removeItem(STORAGE_KEYS.AUTH_STATE)
      }
    } catch (error) {
      console.error('Error persisting auth state:', error)
    }
  }, [state.isAuthenticated, state.username, state.authMethod])

  // Register with passkey function
  const registerWithPasskey = async (username: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Validate username
      const validation = passkeyService.validateUsername(username)
      if (!validation.isValid) {
        throw new Error(validation.error)
      }

      // Check if username already exists
      if (passkeyService.hasPasskey(username)) {
        throw new Error('Username already exists. Please choose a different username or login instead.')
      }

      // Register passkey
      const { validator, credential } = await passkeyService.registerPasskey(username)

      // Connect wallet with the passkey validator
      await connectWallet(validator)

      // Update auth state
      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: { username, authMethod: 'passkey' },
      })

      // Refresh available usernames
      const usernames = passkeyService.getRegisteredUsernames()
      dispatch({ type: 'SET_AVAILABLE_USERNAMES', payload: usernames })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register with passkey'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }

  // Login with passkey function
  const loginWithPasskey = async (username: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Check if passkey exists for username
      if (!passkeyService.hasPasskey(username)) {
        throw new Error('No passkey found for this username. Please register first.')
      }

      // Login with passkey
      const { validator, credential } = await passkeyService.loginWithPasskey(username)

      // Connect wallet with the passkey validator
      await connectWallet(validator)

      // Update auth state
      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: { username, authMethod: 'passkey' },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login with passkey'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }

  // Login with email function
  const loginWithEmail = async (email: string) => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Login with email using Magic
      const { validator, userInfo } = await socialLoginService.loginWithEmail(email)

      // Connect wallet with the social validator
      await connectWallet(validator)

      // Update auth state
      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: { username: userInfo.email, authMethod: 'social', userInfo },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to login with email'
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }

  // Login with social provider function
  const loginWithSocial = async (provider: 'google' | 'github' | 'twitter' | 'discord') => {
    dispatch({ type: 'SET_LOADING', payload: true })

    try {
      // Login with social provider using Magic
      const { validator, userInfo } = await socialLoginService.loginWithSocial(provider)

      // Connect wallet with the social validator
      await connectWallet(validator)

      // Update auth state
      dispatch({
        type: 'SET_AUTHENTICATED',
        payload: { username: userInfo.email || `${provider}_user`, authMethod: 'social', userInfo },
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to login with ${provider}`
      dispatch({ type: 'SET_ERROR', payload: errorMessage })
      throw error
    }
  }

  // Logout function
  const logout = async () => {
    try {
      // If logged in with social, logout from Magic
      if (state.authMethod === 'social') {
        await socialLoginService.logout()
      }
    } catch (error) {
      console.error('Error during social logout:', error)
    }

    // Disconnect wallet
    disconnectWallet()

    // Update auth state
    dispatch({ type: 'SET_UNAUTHENTICATED' })
  }

  // Clear error function
  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  // Delete passkey function
  const deletePasskey = (username: string): boolean => {
    const success = passkeyService.deletePasskey(username)
    
    if (success) {
      // Refresh available usernames
      const usernames = passkeyService.getRegisteredUsernames()
      dispatch({ type: 'SET_AVAILABLE_USERNAMES', payload: usernames })

      // If the deleted passkey was for the current user, logout
      if (state.username === username) {
        logout()
      }
    }

    return success
  }

  // Validate username function
  const validateUsername = (username: string) => {
    return passkeyService.validateUsername(username)
  }

  // Refresh available usernames function
  const refreshAvailableUsernames = () => {
    const usernames = passkeyService.getRegisteredUsernames()
    dispatch({ type: 'SET_AVAILABLE_USERNAMES', payload: usernames })
  }

  const value: AuthContextValue = {
    ...state,
    registerWithPasskey,
    loginWithPasskey,
    loginWithEmail,
    loginWithSocial,
    logout,
    clearError,
    deletePasskey,
    validateUsername,
    refreshAvailableUsernames,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
