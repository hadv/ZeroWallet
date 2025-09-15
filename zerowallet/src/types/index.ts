import { Address, Hash } from 'viem'

// Wallet related types
export interface WalletState {
  isConnected: boolean
  address: Address | null
  balance: string
  isLoading: boolean
  error: string | null
}

// Authentication types
export interface AuthState {
  isAuthenticated: boolean
  username: string | null
  authMethod: 'passkey' | 'social' | null
  isLoading: boolean
  error: string | null
}

// Transaction types
export interface Transaction {
  hash: Hash
  to: Address
  value: string
  status: 'pending' | 'confirmed' | 'failed'
  timestamp: number
  gasUsed?: string
  gasPrice?: string
}

// Passkey types
export interface PasskeyCredential {
  id: string
  publicKey: string
  username: string
  createdAt: number
}

// Social login types
export interface SocialProvider {
  id: 'google' | 'github' | 'twitter' | 'discord'
  name: string
  icon: string
  enabled: boolean
}

// Smart account types
export interface SmartAccount {
  address: Address
  owner: Address
  isDeployed: boolean
  nonce: number
}

// User operation types
export interface UserOperation {
  sender: Address
  nonce: string
  initCode: string
  callData: string
  callGasLimit: string
  verificationGasLimit: string
  preVerificationGas: string
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  paymasterAndData: string
  signature: string
}

// Token types
export interface Token {
  address: Address
  symbol: string
  name: string
  decimals: number
  balance: string
  price?: number
  logo?: string
}

// NFT types
export interface NFT {
  tokenId: string
  contractAddress: Address
  name: string
  description?: string
  image?: string
  metadata?: Record<string, any>
}

// Notification types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: number
  read: boolean
}

// App state types
export interface AppState {
  wallet: WalletState
  auth: AuthState
  transactions: Transaction[]
  tokens: Token[]
  nfts: NFT[]
  notifications: Notification[]
}

// Component prop types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  children: React.ReactNode
  onClick?: () => void
  className?: string
}

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Error types
export interface WalletError {
  code: string
  message: string
  details?: any
}

export default {}
