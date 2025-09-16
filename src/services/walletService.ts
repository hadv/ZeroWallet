import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
  KernelAccountClient,
  KernelSmartAccount,
} from '@zerodev/sdk'
import { getEntryPoint, KERNEL_V3_1 } from '@zerodev/sdk/constants'
import { toWeightedValidator } from '@zerodev/weighted-validator'
import { createPublicClient, http, Address, Hash, parseEther } from 'viem'
import { config, getCurrentChain } from '@/config'
import {
  WalletState,
  SmartAccount,
  Transaction,
  MultiSigSmartAccount,
  ValidatorInfo,
  MultiValidatorConfig
} from '@/types'
import { multiValidatorService } from './multiValidatorService'

export class WalletService {
  private kernelAccount: KernelSmartAccount | null = null
  private kernelClient: KernelAccountClient | null = null
  private publicClient: any = null
  private chain = getCurrentChain()
  private entryPoint = getEntryPoint('0.7')
  private currentValidator: any = null
  private isMultiSig: boolean = false

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
      this.currentValidator = validator
      this.isMultiSig = false

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
   * Create a multi-signature kernel account with multiple validators
   */
  async createMultiSigAccount(config: MultiValidatorConfig): Promise<KernelSmartAccount> {
    try {
      // Create weighted validator with multiple signers
      const weightedValidator = await toWeightedValidator({
        config: {
          threshold: config.threshold,
          signers: [
            { signer: config.primaryValidator, weight: 1 },
            ...config.additionalValidators.map(validator => ({ signer: validator, weight: 1 }))
          ]
        },
        entryPoint: this.entryPoint,
      })

      this.currentValidator = weightedValidator
      this.isMultiSig = true

      this.kernelAccount = await createKernelAccount({
        plugins: {
          sudo: weightedValidator,
        },
        entryPoint: this.entryPoint,
        kernelVersion: KERNEL_V3_1,
      })

      return this.kernelAccount
    } catch (error) {
      console.error('Error creating multi-sig kernel account:', error)
      throw new Error('Failed to create multi-signature smart account')
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
   * Get multi-signature smart account info
   */
  async getMultiSigAccountInfo(): Promise<MultiSigSmartAccount | null> {
    if (!this.kernelAccount) {
      return null
    }

    try {
      const [isDeployed, nonce] = await Promise.all([
        this.isAccountDeployed(),
        this.getAccountNonce(),
      ])

      const validators = multiValidatorService.getValidators()
      const primarySigner = multiValidatorService.getPrimaryValidator()
      const additionalSigners = validators.filter(v => v.id !== primarySigner?.id)
      const signingPolicy = multiValidatorService.getSigningPolicy()

      if (!primarySigner) {
        return null
      }

      return {
        address: this.kernelAccount.address,
        owner: this.kernelAccount.address,
        isDeployed,
        nonce,
        primarySigner,
        additionalSigners,
        signingPolicy,
        isMultiSig: this.isMultiSig,
      }
    } catch (error) {
      console.error('Error getting multi-sig smart account info:', error)
      return null
    }
  }

  /**
   * Upgrade existing account to multi-signature
   */
  async upgradeToMultiSig(additionalValidators: any[]): Promise<KernelSmartAccount> {
    if (!this.currentValidator) {
      throw new Error('No current validator found')
    }

    if (additionalValidators.length === 0) {
      throw new Error('At least one additional validator is required')
    }

    const config: MultiValidatorConfig = {
      primaryValidator: this.currentValidator,
      additionalValidators,
      threshold: Math.min(2, additionalValidators.length + 1), // Require at least 2 signatures
      policy: multiValidatorService.getSigningPolicy(),
    }

    return this.createMultiSigAccount(config)
  }

  /**
   * Check if the current account is multi-signature
   */
  isMultiSigAccount(): boolean {
    return this.isMultiSig
  }

  /**
   * Get current validator
   */
  getCurrentValidator(): any {
    return this.currentValidator
  }

  /**
   * Reset the wallet service
   */
  reset() {
    this.kernelAccount = null
    this.kernelClient = null
    this.currentValidator = null
    this.isMultiSig = false
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

  /**
   * Execute a multi-signature transaction with collected signatures
   */
  async executeMultiSigTransaction(params: {
    to: Address
    value: string
    data?: string
    signatures: Array<{
      validatorId: string
      signature: string
      signedAt: number
      signerType: 'social' | 'passkey'
    }>
  }): Promise<Hash> {
    try {
      if (!this.kernelClient) {
        throw new Error('Kernel client not initialized')
      }

      if (!this.isMultiSig) {
        throw new Error('Account is not configured for multi-signature')
      }

      const { to, value, data, signatures } = params

      // Prepare the transaction data
      const calls = [{
        to,
        value: parseEther(value),
        data: data || '0x'
      }]

      // For ZeroDev weighted validator, we need to aggregate signatures
      // This is a simplified implementation - in production, you'd need proper signature aggregation
      const aggregatedSignature = await this.aggregateSignatures(signatures)

      // Prepare the user operation
      const userOp = await this.kernelAccount!.buildUserOperation({
        calls,
        signature: aggregatedSignature
      })

      // Send the user operation
      const userOpHash = await this.kernelClient.sendUserOperation({
        userOperation: userOp
      })

      // Wait for the transaction to be mined
      const receipt = await this.kernelClient.waitForUserOperationReceipt({
        hash: userOpHash
      })

      // Verify the transaction was successful
      if (receipt.success !== true) {
        throw new Error('Multi-sig transaction execution failed')
      }

      return receipt.receipt.transactionHash
    } catch (error) {
      console.error('Error executing multi-sig transaction:', error)
      throw error
    }
  }

  /**
   * Aggregate signatures for multi-sig execution
   */
  private async aggregateSignatures(signatures: Array<{
    validatorId: string
    signature: string
    signedAt: number
    signerType: 'social' | 'passkey'
  }>): Promise<string> {
    try {
      // Get the current weighted validator configuration
      const validators = multiValidatorService.getValidators()
      const signingPolicy = multiValidatorService.getSigningPolicy()

      // Create the signature data structure expected by ZeroDev weighted validator
      const weightedSignatures = signatures.map(sig => {
        const validator = validators.find(v => v.id === sig.validatorId)
        if (!validator) {
          throw new Error(`Validator not found: ${sig.validatorId}`)
        }

        return {
          signature: sig.signature,
          weight: 1, // Each validator has weight 1 in our implementation
          validatorAddress: this.getValidatorAddress(validator),
          signerType: sig.signerType,
          metadata: {
            validatorId: sig.validatorId,
            signedAt: sig.signedAt
          }
        }
      })

      // Calculate total weight
      const totalWeight = weightedSignatures.reduce((sum, sig) => sum + sig.weight, 0)

      // Verify we meet the threshold
      if (totalWeight < signingPolicy.threshold) {
        throw new Error(`Insufficient signature weight: ${totalWeight} < ${signingPolicy.threshold}`)
      }

      // Create the aggregated signature in ZeroDev format
      // This follows the weighted validator signature structure
      const aggregatedSignature = {
        signatures: weightedSignatures,
        threshold: signingPolicy.threshold,
        totalWeight,
        validatorType: 'weighted',
        version: '1.0'
      }

      // Encode the signature for the weighted validator
      return this.encodeWeightedSignature(aggregatedSignature)
    } catch (error) {
      console.error('Error aggregating signatures:', error)
      throw error
    }
  }

  /**
   * Get validator address for a given validator info
   */
  private getValidatorAddress(validator: any): string {
    // In a real implementation, this would return the actual validator contract address
    // For now, we'll use a placeholder based on the validator type
    switch (validator.type) {
      case 'passkey':
        return `0x${validator.id.slice(-40)}` // Use last 40 chars as address
      case 'social':
        return validator.metadata?.publicAddress || `0x${validator.id.slice(-40)}`
      default:
        throw new Error(`Unknown validator type: ${validator.type}`)
    }
  }

  /**
   * Encode weighted signature for ZeroDev
   */
  private encodeWeightedSignature(aggregatedSignature: any): string {
    try {
      // This would use the actual ZeroDev encoding format
      // For now, we'll create a simplified encoding

      const encoded = {
        type: 'weighted_validator_signature',
        data: aggregatedSignature,
        encoding: 'json'
      }

      // In production, this would be properly encoded according to ZeroDev specs
      return JSON.stringify(encoded)
    } catch (error) {
      console.error('Error encoding weighted signature:', error)
      throw error
    }
  }

  /**
   * Prepare a transaction for multi-signature signing
   */
  async prepareMultiSigTransaction(params: {
    to: Address
    value: string
    data?: string
  }): Promise<{
    transactionHash: string
    callData: string
    userOpHash: string
  }> {
    try {
      if (!this.kernelAccount) {
        throw new Error('Kernel account not initialized')
      }

      const { to, value, data } = params

      // Prepare the transaction data
      const calls = [{
        to,
        value: parseEther(value),
        data: data || '0x'
      }]

      // Encode the call data
      const callData = await this.kernelAccount.encodeCallData(calls)

      // Create a deterministic transaction hash for signing
      const transactionHash = this.createTransactionHash({
        to,
        value,
        data,
        callData,
        nonce: await this.getAccountNonce()
      })

      // Create user operation hash (this would be used for actual signing)
      const userOpHash = this.createUserOpHash(callData)

      return {
        transactionHash,
        callData,
        userOpHash
      }
    } catch (error) {
      console.error('Error preparing multi-sig transaction:', error)
      throw error
    }
  }

  /**
   * Create a deterministic transaction hash
   */
  private createTransactionHash(params: {
    to: Address
    value: string
    data?: string
    callData: string
    nonce: number
  }): string {
    // Create a deterministic hash from transaction parameters
    const hashData = {
      to: params.to,
      value: params.value,
      data: params.data || '0x',
      callData: params.callData,
      nonce: params.nonce,
      chainId: this.chain.id,
      timestamp: Math.floor(Date.now() / 1000) // Round to seconds for consistency
    }

    // Create hash (in production, use proper hashing)
    const hashString = JSON.stringify(hashData)
    return `0x${Buffer.from(hashString).toString('hex').slice(0, 64)}`
  }

  /**
   * Create user operation hash
   */
  private createUserOpHash(callData: string): string {
    // Create a hash for the user operation
    // This would typically be done by the ZeroDev SDK
    return `0x${Buffer.from(callData).toString('hex').slice(0, 64)}`
  }

  /**
   * Validate multi-signature requirements
   */
  async validateMultiSigRequirements(
    requiredSignatures: number,
    collectedSignatures: number,
    signatures?: Array<{
      validatorId: string
      signature: string
      signedAt: number
      signerType: 'social' | 'passkey'
    }>
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = []

    try {
      // Check signature count
      if (collectedSignatures < requiredSignatures) {
        errors.push(`Insufficient signatures: ${collectedSignatures}/${requiredSignatures}`)
      }

      // Validate individual signatures if provided
      if (signatures) {
        for (const sig of signatures) {
          // Check signature format
          if (!sig.signature || typeof sig.signature !== 'string') {
            errors.push(`Invalid signature format for validator ${sig.validatorId}`)
            continue
          }

          // Check validator exists
          const validator = multiValidatorService.getValidatorById(sig.validatorId)
          if (!validator) {
            errors.push(`Unknown validator: ${sig.validatorId}`)
            continue
          }

          // Check validator is active
          if (!validator.isActive) {
            errors.push(`Inactive validator: ${sig.validatorId}`)
            continue
          }

          // Check signature age (prevent replay attacks)
          const maxAge = 24 * 60 * 60 * 1000 // 24 hours
          if (Date.now() - sig.signedAt > maxAge) {
            errors.push(`Signature too old for validator ${sig.validatorId}`)
            continue
          }
        }

        // Check for duplicate signers
        const signerIds = signatures.map(s => s.validatorId)
        const uniqueSignerIds = new Set(signerIds)
        if (signerIds.length !== uniqueSignerIds.size) {
          errors.push('Duplicate signatures detected')
        }
      }

      // Check if account is properly configured for multi-sig
      if (!this.isMultiSig) {
        errors.push('Account is not configured for multi-signature')
      }

      // Check if weighted validator is properly initialized
      if (!this.currentValidator) {
        errors.push('No validator configured')
      }

      return {
        isValid: errors.length === 0,
        errors
      }
    } catch (error) {
      console.error('Error validating multi-sig requirements:', error)
      return {
        isValid: false,
        errors: ['Validation failed due to internal error']
      }
    }
  }

  /**
   * Estimate gas for multi-sig transaction
   */
  async estimateMultiSigGas(params: {
    to: Address
    value: string
    data?: string
    signatures: Array<{
      validatorId: string
      signature: string
      signedAt: number
      signerType: 'social' | 'passkey'
    }>
  }): Promise<{ gasLimit: bigint; gasPrice: bigint; totalCost: bigint }> {
    try {
      if (!this.kernelAccount || !this.kernelClient) {
        throw new Error('Kernel account or client not initialized')
      }

      const { to, value, data, signatures } = params

      // Prepare the transaction data
      const calls = [{
        to,
        value: parseEther(value),
        data: data || '0x'
      }]

      // Aggregate signatures
      const aggregatedSignature = await this.aggregateSignatures(signatures)

      // Build user operation for gas estimation
      const userOp = await this.kernelAccount.buildUserOperation({
        calls,
        signature: aggregatedSignature
      })

      // Estimate gas
      const gasEstimate = await this.kernelClient.estimateUserOperationGas({
        userOperation: userOp
      })

      // Get current gas price
      const gasPrice = await this.publicClient.getGasPrice()

      // Calculate total cost
      const totalGasLimit = BigInt(gasEstimate.callGasLimit) +
                           BigInt(gasEstimate.verificationGasLimit) +
                           BigInt(gasEstimate.preVerificationGas)

      const totalCost = totalGasLimit * gasPrice

      return {
        gasLimit: totalGasLimit,
        gasPrice,
        totalCost
      }
    } catch (error) {
      console.error('Error estimating multi-sig gas:', error)
      throw error
    }
  }

  /**
   * Check if transaction can be executed with current signatures
   */
  async canExecuteMultiSig(
    requiredSignatures: number,
    signatures: Array<{
      validatorId: string
      signature: string
      signedAt: number
      signerType: 'social' | 'passkey'
    }>
  ): Promise<{ canExecute: boolean; reason?: string }> {
    try {
      // Validate requirements
      const validation = await this.validateMultiSigRequirements(
        requiredSignatures,
        signatures.length,
        signatures
      )

      if (!validation.isValid) {
        return {
          canExecute: false,
          reason: validation.errors.join('; ')
        }
      }

      // Check if we have enough valid signatures
      const validSignatures = signatures.filter(sig => {
        const validator = multiValidatorService.getValidatorById(sig.validatorId)
        return validator && validator.isActive
      })

      if (validSignatures.length < requiredSignatures) {
        return {
          canExecute: false,
          reason: `Insufficient valid signatures: ${validSignatures.length}/${requiredSignatures}`
        }
      }

      return { canExecute: true }
    } catch (error) {
      console.error('Error checking multi-sig execution capability:', error)
      return {
        canExecute: false,
        reason: 'Error checking execution capability'
      }
    }
  }
}

// Singleton instance
export const walletService = new WalletService()
export default walletService
