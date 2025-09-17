import { parseAbi } from 'viem'

// Contract ABIs
export const ERC20_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
])

export const ERC721_ABI = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function approve(address to, uint256 tokenId)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
])

// Test contract ABI (for minting NFTs)
export const TEST_NFT_ABI = parseAbi([
  'function mint(address _to) public',
  'function balanceOf(address owner) external view returns (uint256 balance)',
  'function tokenURI(uint256 tokenId) external view returns (string memory)',
  'function ownerOf(uint256 tokenId) external view returns (address owner)',
])

// Social login providers
export const SOCIAL_PROVIDERS = [
  {
    id: 'google' as const,
    name: 'Google',
    icon: '🔍',
    enabled: true,
  },
  {
    id: 'github' as const,
    name: 'GitHub',
    icon: '🐙',
    enabled: true,
  },
  {
    id: 'twitter' as const,
    name: 'Twitter',
    icon: '🐦',
    enabled: false,
  },
  {
    id: 'discord' as const,
    name: 'Discord',
    icon: '🎮',
    enabled: false,
  },
]

// Wallet connection states
export const WALLET_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
} as const

// Transaction statuses
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
} as const

// Authentication methods
export const AUTH_METHODS = {
  PASSKEY: 'passkey',
  SOCIAL: 'social',
  MULTI_SIG: 'multi-sig',
} as const

// Error codes
export const ERROR_CODES = {
  USER_REJECTED: 'USER_REJECTED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  PASSKEY_ERROR: 'PASSKEY_ERROR',
  SOCIAL_LOGIN_ERROR: 'SOCIAL_LOGIN_ERROR',
} as const

// Gas limits
export const GAS_LIMITS = {
  SIMPLE_TRANSFER: BigInt(21000),
  ERC20_TRANSFER: BigInt(65000),
  ERC721_TRANSFER: BigInt(85000),
  CONTRACT_INTERACTION: BigInt(150000),
} as const

// Time constants
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const

// Local storage keys
export const STORAGE_KEYS = {
  WALLET_STATE: 'zerowallet_state',
  AUTH_STATE: 'zerowallet_auth',
  TRANSACTIONS: 'zerowallet_transactions',
  SETTINGS: 'zerowallet_settings',
  PASSKEY_CREDENTIALS: 'zerowallet_passkeys',
  MULTI_SIG_VALIDATORS: 'zerowallet_multi_sig_validators',
  SIGNING_POLICY: 'zerowallet_signing_policy',
  PENDING_OPERATIONS: 'zerowallet_pending_operations',
  SOCIAL_USER_INFO: 'zerowallet_social_user_info',
  WEB3AUTH_USER_INFO: 'web3auth_user_info',
} as const

// API endpoints
export const API_ENDPOINTS = {
  BALANCE: '/api/balance',
  TRANSACTIONS: '/api/transactions',
  TOKENS: '/api/tokens',
  NFTS: '/api/nfts',
  GAS_PRICE: '/api/gas-price',
} as const

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
} as const

// Default values
export const DEFAULTS = {
  GAS_PRICE: '20000000000', // 20 gwei
  GAS_LIMIT: '21000',
  SLIPPAGE_TOLERANCE: 0.5, // 0.5%
  TRANSACTION_DEADLINE: 20, // 20 minutes
} as const

// Contract addresses for different chains (example NFT contract for testing)
export const contractAddresses = {
  11155111: { // Sepolia
    testNFT: '0x34bE7f35132E97915633BC1fc020364EA5134863',
  },
  1: { // Mainnet
    // Add mainnet contract addresses here
  },
  137: { // Polygon
    // Add polygon contract addresses here
  },
}

export default {
  ERC20_ABI,
  ERC721_ABI,
  TEST_NFT_ABI,
  SOCIAL_PROVIDERS,
  WALLET_STATES,
  TRANSACTION_STATUS,
  AUTH_METHODS,
  ERROR_CODES,
  GAS_LIMITS,
  TIME_CONSTANTS,
  STORAGE_KEYS,
  API_ENDPOINTS,
  NOTIFICATION_TYPES,
  DEFAULTS,
  contractAddresses,
}
