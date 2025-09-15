import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  KernelAccountClient,
  KernelSmartAccount,
} from '@zerodev/sdk'
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants'
import { createPublicClient, http, Address, Hash, parseEther } from 'viem'
import { config, getCurrentChain } from '@/config'
import { WalletState, SmartAccount, Transaction } from '@/types'

export class WalletService {
  private kernelAccount: KernelSmartAccount | null = null
  private kernelClient: KernelAccountClient | null = null
  private publicClient: any = null
  private chain = getCurrentChain()
  private entryPoint = getEntryPoint('0.7')

  constructor() {
    this.initializePublicClient()
  }

  private initializePublicClient() {
    this.publicClient = createPublicClient({
      chain: this.chain,
      transport: http(config.network.rpcUrl),
    })
  }

  /**
   * Create a kernel account with the provided validator
   */
  async createAccount(validator: any): Promise<KernelSmartAccount> {
    try {
      this.kernelAccount = await createKernelAccount({
        plugins: {
          sudo: validator,
        },
        entryPoint: this.entryPoint,
        kernelVersion: KERNEL_V3_1,
      })

      return this.kernelAccount
    } catch (error) {
      console.error('Error creating kernel account:', error)
      throw new Error('Failed to create smart account')
    }
  }

  /**
   * Create a kernel account client for sending transactions
   */
  async createAccountClient(account: KernelSmartAccount): Promise<KernelAccountClient> {
    try {
      const paymasterClient = createZeroDevPaymasterClient({
        chain: this.chain,
        transport: http(config.zerodev.paymasterUrl),
        entryPoint: this.entryPoint,
      })

      this.kernelClient = createKernelAccountClient({
        account,
        chain: this.chain,
        bundlerTransport: http(config.zerodev.bundlerUrl),
        middleware: {
          sponsorUserOperation: paymasterClient.sponsorUserOperation,
        },
        entryPoint: this.entryPoint,
      })

      return this.kernelClient
    } catch (error) {
      console.error('Error creating kernel client:', error)
      throw new Error('Failed to create account client')
    }
  }

  /**
   * Get the smart account address
   */
  getAccountAddress(): Address | null {
    return this.kernelAccount?.address || null
  }

  /**
   * Get the current account balance
   */
  async getBalance(): Promise<string> {
    if (!this.kernelAccount || !this.publicClient) {
      throw new Error('Account not initialized')
    }

    try {
      const balance = await this.publicClient.getBalance({
        address: this.kernelAccount.address,
      })
      
      return balance.toString()
    } catch (error) {
      console.error('Error getting balance:', error)
      throw new Error('Failed to get balance')
    }
  }

  /**
   * Send a transaction
   */
  async sendTransaction(to: Address, value: string, data?: string): Promise<Hash> {
    if (!this.kernelClient) {
      throw new Error('Kernel client not initialized')
    }

    try {
      const hash = await this.kernelClient.sendTransaction({
        to,
        value: parseEther(value),
        data: data as `0x${string}`,
      })

      return hash
    } catch (error) {
      console.error('Error sending transaction:', error)
      throw new Error('Failed to send transaction')
    }
  }

  /**
   * Send a user operation (for contract interactions)
   */
  async sendUserOperation(calls: Array<{ to: Address; value?: bigint; data?: string }>): Promise<Hash> {
    if (!this.kernelClient) {
      throw new Error('Kernel client not initialized')
    }

    try {
      const userOpHash = await this.kernelClient.sendUserOperation({
        userOperation: {
          callData: await this.kernelAccount!.encodeCallData(calls),
        },
      })

      return userOpHash
    } catch (error) {
      console.error('Error sending user operation:', error)
      throw new Error('Failed to send user operation')
    }
  }

  /**
   * Wait for a transaction to be confirmed
   */
  async waitForTransaction(hash: Hash): Promise<any> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized')
    }

    try {
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60000, // 60 seconds timeout
      })

      return receipt
    } catch (error) {
      console.error('Error waiting for transaction:', error)
      throw new Error('Transaction confirmation failed')
    }
  }

  /**
   * Check if the smart account is deployed
   */
  async isAccountDeployed(): Promise<boolean> {
    if (!this.kernelAccount || !this.publicClient) {
      return false
    }

    try {
      const code = await this.publicClient.getBytecode({
        address: this.kernelAccount.address,
      })
      
      return code !== undefined && code !== '0x'
    } catch (error) {
      console.error('Error checking account deployment:', error)
      return false
    }
  }

  /**
   * Get the account nonce
   */
  async getAccountNonce(): Promise<number> {
    if (!this.kernelAccount || !this.publicClient) {
      throw new Error('Account not initialized')
    }

    try {
      const nonce = await this.publicClient.getTransactionCount({
        address: this.kernelAccount.address,
      })
      
      return nonce
    } catch (error) {
      console.error('Error getting account nonce:', error)
      throw new Error('Failed to get account nonce')
    }
  }

  /**
   * Get smart account info
   */
  async getSmartAccountInfo(): Promise<SmartAccount | null> {
    if (!this.kernelAccount) {
      return null
    }

    try {
      const [isDeployed, nonce] = await Promise.all([
        this.isAccountDeployed(),
        this.getAccountNonce(),
      ])

      return {
        address: this.kernelAccount.address,
        owner: this.kernelAccount.address, // This would be the actual owner address
        isDeployed,
        nonce,
      }
    } catch (error) {
      console.error('Error getting smart account info:', error)
      return null
    }
  }

  /**
   * Reset the wallet service
   */
  reset() {
    this.kernelAccount = null
    this.kernelClient = null
  }

  /**
   * Get the kernel client (for external use)
   */
  getKernelClient(): KernelAccountClient | null {
    return this.kernelClient
  }

  /**
   * Get the kernel account (for external use)
   */
  getKernelAccount(): KernelSmartAccount | null {
    return this.kernelAccount
  }
}

// Singleton instance
export const walletService = new WalletService()
export default walletService
