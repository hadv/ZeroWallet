import { sepolia, mainnet, polygon, arbitrum, optimism } from 'viem/chains'
import { Chain } from 'viem'

// Environment variables with fallbacks
export const config = {
  // ZeroDev Configuration
  zerodev: {
    projectId: process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID || '',
    bundlerUrl: process.env.NEXT_PUBLIC_BUNDLER_URL || '',
    paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_URL || '',
    passkeyServerUrl: process.env.NEXT_PUBLIC_PASSKEY_SERVER_URL || 'https://passkeys.zerodev.app/api/v3',
  },

  // Network Configuration
  network: {
    chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111'),
    chainName: process.env.NEXT_PUBLIC_CHAIN_NAME || 'sepolia',
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.ankr.com/eth_sepolia',
  },

  // Social Login Configuration
  social: {
    googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    githubClientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '',
  },

  // App Configuration
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'ZeroWallet',
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'A user-friendly Web3 wallet with social login and passkey support',
  },
}

// Supported chains configuration
export const supportedChains: Record<number, Chain> = {
  1: mainnet,
  11155111: sepolia,
  137: polygon,
  42161: arbitrum,
  10: optimism,
}

// Get current chain based on configuration
export const getCurrentChain = (): Chain => {
  return supportedChains[config.network.chainId] || sepolia
}

// Validation function to check if all required environment variables are set
export const validateConfig = () => {
  const requiredVars = [
    'NEXT_PUBLIC_ZERODEV_PROJECT_ID',
    'NEXT_PUBLIC_BUNDLER_URL',
    'NEXT_PUBLIC_PAYMASTER_URL',
  ]

  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.warn('Missing required environment variables:', missingVars)
    return false
  }
  
  return true
}

export default config
