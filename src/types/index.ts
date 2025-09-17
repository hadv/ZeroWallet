import { Address, Hash } from 'viem'

// Wallet related types
export interface WalletState {
  isConnected: boolean
  address: Address | null
  balance: string
  isLoading: boolean
  error: string | null
  isMultiSig?: boolean
  signers?: ValidatorInfo[]
  signingPolicy?: SigningPolicy
}

// Authentication types
export interface AuthState {
  isAuthenticated: boolean
  username: string | null
  authMethod: 'passkey' | 'social' | 'multi-sig' | null
  isLoading: boolean
  error: string | null
  activeSigners?: ValidatorInfo[]
  primarySigner?: ValidatorInfo
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

// Web3Auth types
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

// Smart account types
export interface SmartAccount {
  address: Address
  owner: Address
  isDeployed: boolean
  nonce: number
}

// Multi-signature smart account types
export interface MultiSigSmartAccount extends SmartAccount {
  primarySigner: ValidatorInfo
  additionalSigners: ValidatorInfo[]
  signingPolicy: SigningPolicy
  isMultiSig: boolean
}

export interface ValidatorInfo {
  id: string
  type: 'social' | 'passkey'
  name: string
  publicKey?: string
  metadata: ValidatorMetadata
  createdAt: number
  lastUsed?: number
  isActive: boolean
}

export interface ValidatorMetadata {
  // For social signers
  email?: string
  provider?: 'google' | 'github' | 'twitter' | 'discord' | 'email'
  publicAddress?: string
  issuer?: string

  // For passkey signers
  authenticatorId?: string
  credentialId?: string
  passkeyName?: string

  // Common metadata
  deviceInfo?: string
  userAgent?: string
}

export interface SigningPolicy {
  requireMultiSig: boolean
  threshold: number
  highValueThreshold?: string // ETH amount requiring multi-sig
  timeDelay?: number // Delay in seconds for high-value transactions
  allowedOperations?: OperationType[]
}

export type OperationType = 'transfer' | 'contract_interaction' | 'nft_transfer' | 'token_approval' | 'all'

// Multi-signature transaction types
export interface MultiSigTransaction extends Transaction {
  requiredSignatures: number
  collectedSignatures: ValidatorSignature[]
  isComplete: boolean
  expiresAt?: number
}

export interface ValidatorSignature {
  validatorId: string
  signature: string
  signedAt: number
  signerType: 'social' | 'passkey'
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
  multiSigTransactions: MultiSigTransaction[]
  tokens: Token[]
  nfts: NFT[]
  notifications: Notification[]
  validators: ValidatorInfo[]
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

// Multi-validator service types
export interface MultiValidatorConfig {
  primaryValidator: any
  additionalValidators: any[]
  threshold: number
  policy: SigningPolicy
}

export interface AddSignerRequest {
  type: 'passkey'
  name: string
  username?: string
}

export interface RemoveSignerRequest {
  validatorId: string
  confirmationMethod: 'passkey' | 'social'
}

export interface SignerManagementState {
  isLoading: boolean
  error: string | null
  pendingOperations: PendingSignerOperation[]
}

export interface PendingSignerOperation {
  id: string
  type: 'add' | 'remove' | 'update_policy'
  data: any
  createdAt: number
  expiresAt: number
  requiredSignatures: number
  collectedSignatures: ValidatorSignature[]
}

// UI Component types for multi-sig
export interface SignerCardProps {
  signer: ValidatorInfo
  isPrimary?: boolean
  onRemove?: (signerId: string) => void
  onSetPrimary?: (signerId: string) => void
}

export interface AddSignerModalProps {
  isOpen: boolean
  onClose: () => void
  onAddSigner: (request: AddSignerRequest) => Promise<void>
  existingSigners: ValidatorInfo[]
}

export interface MultiSigTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  transaction: MultiSigTransaction
  onSign: (validatorId: string) => Promise<void>
  availableSigners: ValidatorInfo[]
}

export interface SecuritySettingsProps {
  signers: ValidatorInfo[]
  policy: SigningPolicy
  onUpdatePolicy: (policy: SigningPolicy) => Promise<void>
  onAddSigner: (request: AddSignerRequest) => Promise<void>
  onRemoveSigner: (request: RemoveSignerRequest) => Promise<void>
}

// Re-export social recovery types for convenience
export type {
  Guardian,
  GuardianInvitation,
  SocialRecoveryConfig,
  RecoveryRequest,
  RecoveryApproval,
  RecoverySecurityEvent,
  RecoveryNotification,
  RecoveryState,
  RecoveryAction,
  SocialRecoveryService,
  GuardianRelationship,
  GuardianStatus,
  RecoveryReason,
  RecoveryStatus
} from './socialRecovery'

export default {}
