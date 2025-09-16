import { Address, Hash } from 'viem'
import { walletService } from '@/services/walletService'
import { notificationService } from './notificationService'
import { storageService } from './storageService'

export interface Proposal {
  id: string
  createdBy: string
  to: Address
  value: string
  data?: string
  requiredSignatures: number
  collectedSignatures: number
  status: 'pending' | 'executed' | 'expired' | 'cancelled' | 'failed'
  validatorIds: string[]
  signatures: ProposalSignature[]
  createdAt: number
  expiresAt?: number
  executedAt?: number
  transactionHash?: Hash
  metadata?: any
}

export interface ProposalSignature {
  validatorId: string
  signature: string
  signedAt: number
  signerType: 'social' | 'passkey'
  signedBy: string
  metadata?: any
}

export interface CreateProposalParams {
  createdBy: string
  to: Address
  value: string
  data?: string
  requiredSignatures: number
  validatorIds: string[]
  expiresIn: number
  metadata?: any
}

export interface GetProposalsOptions {
  status?: 'pending' | 'executed' | 'expired' | 'cancelled' | 'failed'
  limit?: number
  offset?: number
}

class ProposalService {
  private proposals: Map<string, Proposal> = new Map()

  constructor() {
    this.loadProposals()
    this.startExpirationChecker()
  }

  /**
   * Create a new multi-sig proposal
   */
  async createProposal(params: CreateProposalParams): Promise<Proposal> {
    const proposalId = this.generateProposalId()
    const now = Date.now()

    const proposal: Proposal = {
      id: proposalId,
      createdBy: params.createdBy,
      to: params.to,
      value: params.value,
      data: params.data,
      requiredSignatures: params.requiredSignatures,
      collectedSignatures: 0,
      status: 'pending',
      validatorIds: params.validatorIds,
      signatures: [],
      createdAt: now,
      expiresAt: now + (params.expiresIn * 1000),
      metadata: params.metadata
    }

    this.proposals.set(proposalId, proposal)
    await this.saveProposals()

    return proposal
  }

  /**
   * Get a specific proposal
   */
  async getProposal(proposalId: string): Promise<Proposal | null> {
    return this.proposals.get(proposalId) || null
  }

  /**
   * Get proposals for a user
   */
  async getProposalsForUser(userId: string, options: GetProposalsOptions = {}): Promise<Proposal[]> {
    const userProposals = Array.from(this.proposals.values()).filter(proposal => {
      // User can see proposals they created or are authorized to sign
      const isCreator = proposal.createdBy === userId
      const isAuthorizedSigner = proposal.validatorIds.some(validatorId => 
        this.isUserAuthorizedForValidator(userId, validatorId)
      )
      
      return isCreator || isAuthorizedSigner
    })

    let filteredProposals = userProposals

    // Filter by status
    if (options.status) {
      filteredProposals = filteredProposals.filter(p => p.status === options.status)
    }

    // Sort by creation date (newest first)
    filteredProposals.sort((a, b) => b.createdAt - a.createdAt)

    // Apply pagination
    const offset = options.offset || 0
    const limit = options.limit || 50
    
    return filteredProposals.slice(offset, offset + limit)
  }

  /**
   * Add a signature to a proposal
   */
  async addSignature(proposalId: string, signature: ProposalSignature): Promise<Proposal> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    if (proposal.status !== 'pending') {
      throw new Error('Cannot sign non-pending proposal')
    }

    // Check if already signed by this validator
    const existingSignature = proposal.signatures.find(
      sig => sig.validatorId === signature.validatorId
    )
    if (existingSignature) {
      throw new Error('Already signed by this validator')
    }

    proposal.signatures.push(signature)
    proposal.collectedSignatures = proposal.signatures.length

    await this.saveProposals()
    return proposal
  }

  /**
   * Execute a proposal when enough signatures are collected
   */
  async executeProposal(proposalId: string): Promise<{ transactionHash: Hash }> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    if (proposal.status !== 'pending') {
      throw new Error('Proposal is not pending')
    }

    if (proposal.collectedSignatures < proposal.requiredSignatures) {
      throw new Error('Insufficient signatures')
    }

    try {
      // Execute the transaction using the wallet service
      const transactionHash = await walletService.executeMultiSigTransaction({
        to: proposal.to,
        value: proposal.value,
        data: proposal.data,
        signatures: proposal.signatures
      })

      // Update proposal status
      proposal.status = 'executed'
      proposal.executedAt = Date.now()
      proposal.transactionHash = transactionHash

      await this.saveProposals()

      // Notify all participants
      await this.notifyProposalExecuted(proposalId)

      return { transactionHash }
    } catch (error) {
      console.error('Error executing multi-sig transaction:', error)
      throw error
    }
  }

  /**
   * Cancel a proposal
   */
  async cancelProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    if (proposal.status !== 'pending') {
      throw new Error('Can only cancel pending proposals')
    }

    proposal.status = 'cancelled'
    await this.saveProposals()

    // Notify participants
    await this.notifyProposalCancelled(proposalId)
  }

  /**
   * Mark proposal as failed
   */
  async markProposalFailed(proposalId: string, error: any): Promise<void> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      throw new Error('Proposal not found')
    }

    proposal.status = 'failed'
    proposal.metadata = {
      ...proposal.metadata,
      failureReason: error.message || 'Unknown error',
      failedAt: Date.now()
    }

    await this.saveProposals()
  }

  /**
   * Expire a proposal
   */
  async expireProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      return
    }

    if (proposal.status === 'pending') {
      proposal.status = 'expired'
      await this.saveProposals()
      await this.notifyProposalExpired(proposalId)
    }
  }

  /**
   * Check if user has access to a proposal
   */
  async userHasAccess(userId: string, proposalId: string): Promise<boolean> {
    const proposal = this.proposals.get(proposalId)
    if (!proposal) {
      return false
    }

    // User has access if they created it or are authorized to sign
    const isCreator = proposal.createdBy === userId
    const isAuthorizedSigner = proposal.validatorIds.some(validatorId => 
      this.isUserAuthorizedForValidator(userId, validatorId)
    )

    return isCreator || isAuthorizedSigner
  }

  /**
   * Notify signers about new proposal
   */
  async notifySigners(proposalId: string, validatorIds: string[]): Promise<void> {
    await notificationService.notifyNewProposal(proposalId, validatorIds)
  }

  /**
   * Notify about new signature
   */
  async notifySignatureAdded(proposalId: string, validatorId: string): Promise<void> {
    await notificationService.notifySignatureAdded(proposalId, validatorId)
  }

  /**
   * Notify about proposal execution
   */
  private async notifyProposalExecuted(proposalId: string): Promise<void> {
    await notificationService.notifyProposalExecuted(proposalId)
  }

  /**
   * Notify about proposal cancellation
   */
  private async notifyProposalCancelled(proposalId: string): Promise<void> {
    await notificationService.notifyProposalCancelled(proposalId)
  }

  /**
   * Notify about proposal expiration
   */
  private async notifyProposalExpired(proposalId: string): Promise<void> {
    await notificationService.notifyProposalExpired(proposalId)
  }

  /**
   * Check if user is authorized for a validator
   */
  private isUserAuthorizedForValidator(userId: string, validatorId: string): boolean {
    // This would typically check against a user-validator mapping
    // For now, we'll implement a simple check
    return true // TODO: Implement proper authorization check
  }

  /**
   * Generate unique proposal ID
   */
  private generateProposalId(): string {
    return `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Load proposals from storage
   */
  private async loadProposals(): Promise<void> {
    try {
      const stored = await storageService.getProposals()
      this.proposals = new Map(stored.map(p => [p.id, p]))
    } catch (error) {
      console.error('Error loading proposals:', error)
    }
  }

  /**
   * Save proposals to storage
   */
  private async saveProposals(): Promise<void> {
    try {
      const proposalsArray = Array.from(this.proposals.values())
      await storageService.saveProposals(proposalsArray)
    } catch (error) {
      console.error('Error saving proposals:', error)
    }
  }

  /**
   * Start background task to check for expired proposals
   */
  private startExpirationChecker(): void {
    setInterval(async () => {
      const now = Date.now()
      for (const proposal of this.proposals.values()) {
        if (
          proposal.status === 'pending' &&
          proposal.expiresAt &&
          now > proposal.expiresAt
        ) {
          await this.expireProposal(proposal.id)
        }
      }
    }, 60000) // Check every minute
  }
}

export const proposalService = new ProposalService()
export default proposalService
