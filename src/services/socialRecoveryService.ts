import { Address } from 'viem'
import {
  Guardian,
  GuardianInvitation,
  SocialRecoveryConfig,
  RecoveryRequest,
  RecoveryApproval,
  RecoverySecurityEvent,
  SocialRecoveryService,
  RecoveryNotification,
  RecoveryStatus,
  GuardianStatus
} from '@/types/socialRecovery'
import { STORAGE_KEYS } from '@/constants'
import { generateId, encryptData, decryptData, hashData } from '@/utils/crypto'

export class SocialRecoveryServiceImpl implements SocialRecoveryService {
  private readonly INVITATION_EXPIRY_HOURS = 72 // 3 days
  private readonly RECOVERY_EXPIRY_HOURS = 168 // 7 days
  private readonly DEFAULT_RECOVERY_DELAY_HOURS = 24 // 1 day

  constructor() {
    this.initializeStorage()
  }

  private initializeStorage(): void {
    // Initialize storage keys if they don't exist
    const storageKeys = [
      STORAGE_KEYS.SOCIAL_RECOVERY_CONFIG,
      STORAGE_KEYS.GUARDIANS,
      STORAGE_KEYS.RECOVERY_REQUESTS,
      STORAGE_KEYS.GUARDIAN_INVITATIONS,
      STORAGE_KEYS.RECOVERY_SECURITY_EVENTS
    ]

    storageKeys.forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}))
      }
    })
  }

  // Guardian Management
  async inviteGuardian(invitation: Omit<GuardianInvitation, 'id' | 'sentAt'>): Promise<GuardianInvitation> {
    const invitationCode = this.generateInvitationCode()
    const newInvitation: GuardianInvitation = {
      ...invitation,
      id: generateId(),
      invitationCode,
      sentAt: Date.now(),
      expiresAt: Date.now() + (this.INVITATION_EXPIRY_HOURS * 60 * 60 * 1000),
      status: 'sent'
    }

    // Store invitation
    const invitations = this.getStoredInvitations()
    invitations[newInvitation.id] = newInvitation
    localStorage.setItem(STORAGE_KEYS.GUARDIAN_INVITATIONS, JSON.stringify(invitations))

    // Send invitation email/notification (would integrate with email service)
    await this.sendInvitationNotification(newInvitation)

    return newInvitation
  }

  async acceptGuardianInvitation(invitationCode: string, guardianInfo: Partial<Guardian>): Promise<Guardian> {
    const invitations = this.getStoredInvitations()
    const invitation = Object.values(invitations).find(inv => inv.invitationCode === invitationCode)

    if (!invitation) {
      throw new Error('Invalid invitation code')
    }

    if (invitation.status !== 'sent') {
      throw new Error('Invitation has already been processed')
    }

    if (invitation.expiresAt < Date.now()) {
      throw new Error('Invitation has expired')
    }

    // Create guardian
    const guardian: Guardian = {
      id: generateId(),
      email: invitation.guardianEmail,
      name: invitation.guardianName,
      relationship: invitation.relationship,
      status: 'accepted',
      invitedAt: invitation.sentAt,
      acceptedAt: Date.now(),
      lastActiveAt: Date.now(),
      metadata: {
        preferredContact: 'email',
        ...guardianInfo.metadata
      }
    }

    // Store guardian
    const guardians = this.getStoredGuardians()
    if (!guardians[invitation.walletAddress]) {
      guardians[invitation.walletAddress] = []
    }
    guardians[invitation.walletAddress].push(guardian)
    localStorage.setItem(STORAGE_KEYS.GUARDIANS, JSON.stringify(guardians))

    // Update invitation status
    invitation.status = 'accepted'
    invitation.acceptedAt = Date.now()
    localStorage.setItem(STORAGE_KEYS.GUARDIAN_INVITATIONS, JSON.stringify(invitations))

    // Update recovery config if needed
    await this.updateGuardianCount(invitation.walletAddress)

    return guardian
  }

  async removeGuardian(guardianId: string): Promise<void> {
    const guardians = this.getStoredGuardians()
    
    for (const walletAddress in guardians) {
      const walletGuardians = guardians[walletAddress]
      const guardianIndex = walletGuardians.findIndex(g => g.id === guardianId)
      
      if (guardianIndex !== -1) {
        walletGuardians.splice(guardianIndex, 1)
        localStorage.setItem(STORAGE_KEYS.GUARDIANS, JSON.stringify(guardians))
        
        // Update recovery config
        await this.updateGuardianCount(walletAddress as Address)
        return
      }
    }
    
    throw new Error('Guardian not found')
  }

  async getGuardians(walletAddress: Address): Promise<Guardian[]> {
    const guardians = this.getStoredGuardians()
    return guardians[walletAddress] || []
  }

  // Recovery Configuration
  async updateRecoveryConfig(walletAddress: Address, config: SocialRecoveryConfig): Promise<void> {
    const configs = this.getStoredConfigs()
    configs[walletAddress] = config
    localStorage.setItem(STORAGE_KEYS.SOCIAL_RECOVERY_CONFIG, JSON.stringify(configs))
  }

  async getRecoveryConfig(walletAddress: Address): Promise<SocialRecoveryConfig> {
    const configs = this.getStoredConfigs()
    return configs[walletAddress] || this.getDefaultConfig()
  }

  // Recovery Process
  async initiateRecovery(request: Omit<RecoveryRequest, 'id' | 'createdAt' | 'status'>): Promise<RecoveryRequest> {
    const config = await this.getRecoveryConfig(request.walletAddress)
    
    if (!config.isEnabled) {
      throw new Error('Social recovery is not enabled for this wallet')
    }

    const guardians = await this.getGuardians(request.walletAddress)
    if (guardians.length < config.guardianThreshold) {
      throw new Error('Insufficient guardians for recovery')
    }

    const recoveryRequest: RecoveryRequest = {
      ...request,
      id: generateId(),
      createdAt: Date.now(),
      expiresAt: Date.now() + (this.RECOVERY_EXPIRY_HOURS * 60 * 60 * 1000),
      status: 'collecting_approvals',
      approvals: [],
      requiredApprovals: config.guardianThreshold
    }

    // Store recovery request
    const requests = this.getStoredRecoveryRequests()
    requests[recoveryRequest.id] = recoveryRequest
    localStorage.setItem(STORAGE_KEYS.RECOVERY_REQUESTS, JSON.stringify(requests))

    // Notify guardians
    await this.notifyGuardiansOfRecovery(recoveryRequest, guardians)

    return recoveryRequest
  }

  async approveRecovery(requestId: string, guardianId: string, signature: string): Promise<RecoveryApproval> {
    const requests = this.getStoredRecoveryRequests()
    const request = requests[requestId]

    if (!request) {
      throw new Error('Recovery request not found')
    }

    if (request.status !== 'collecting_approvals') {
      throw new Error('Recovery request is not accepting approvals')
    }

    if (request.expiresAt < Date.now()) {
      throw new Error('Recovery request has expired')
    }

    // Check if guardian already approved
    if (request.approvals.some(approval => approval.guardianId === guardianId)) {
      throw new Error('Guardian has already approved this recovery')
    }

    const approval: RecoveryApproval = {
      guardianId,
      signature,
      approvedAt: Date.now(),
      verificationMethod: 'email' // Would be determined by actual verification method
    }

    request.approvals.push(approval)

    // Check if we have enough approvals
    if (request.approvals.length >= request.requiredApprovals) {
      request.status = 'ready_to_execute'
    }

    // Update stored request
    requests[requestId] = request
    localStorage.setItem(STORAGE_KEYS.RECOVERY_REQUESTS, JSON.stringify(requests))

    return approval
  }

  async executeRecovery(requestId: string): Promise<void> {
    const requests = this.getStoredRecoveryRequests()
    const request = requests[requestId]

    if (!request) {
      throw new Error('Recovery request not found')
    }

    if (request.status !== 'ready_to_execute') {
      throw new Error('Recovery request is not ready for execution')
    }

    const config = await this.getRecoveryConfig(request.walletAddress)
    const delayPassed = Date.now() >= (request.createdAt + (config.recoveryDelay * 60 * 60 * 1000))

    if (!delayPassed && !config.allowEmergencyRecovery) {
      throw new Error('Recovery delay period has not passed')
    }

    // Execute recovery (would integrate with smart contract)
    // This is where you'd call the smart contract recovery function
    
    request.status = 'executed'
    request.executedAt = Date.now()
    
    requests[requestId] = request
    localStorage.setItem(STORAGE_KEYS.RECOVERY_REQUESTS, JSON.stringify(requests))
  }

  async cancelRecovery(requestId: string, reason: string): Promise<void> {
    const requests = this.getStoredRecoveryRequests()
    const request = requests[requestId]

    if (!request) {
      throw new Error('Recovery request not found')
    }

    if (request.status === 'executed') {
      throw new Error('Cannot cancel executed recovery')
    }

    request.status = 'cancelled'
    requests[requestId] = request
    localStorage.setItem(STORAGE_KEYS.RECOVERY_REQUESTS, JSON.stringify(requests))
  }

  async vetoRecovery(requestId: string, ownerSignature: string): Promise<void> {
    const requests = this.getStoredRecoveryRequests()
    const request = requests[requestId]

    if (!request) {
      throw new Error('Recovery request not found')
    }

    const config = await this.getRecoveryConfig(request.walletAddress)
    if (!config.requireOwnerApproval) {
      throw new Error('Owner veto is not enabled for this wallet')
    }

    // Verify owner signature (would implement proper signature verification)
    
    request.status = 'vetoed'
    requests[requestId] = request
    localStorage.setItem(STORAGE_KEYS.RECOVERY_REQUESTS, JSON.stringify(requests))
  }

  // Monitoring and Security
  async getRecoveryRequests(walletAddress: Address): Promise<RecoveryRequest[]> {
    const requests = this.getStoredRecoveryRequests()
    return Object.values(requests).filter(req => req.walletAddress === walletAddress)
  }

  async getSecurityEvents(walletAddress: Address): Promise<RecoverySecurityEvent[]> {
    const events = this.getStoredSecurityEvents()
    return Object.values(events).filter(event => event.walletAddress === walletAddress)
  }

  async reportSuspiciousActivity(event: Omit<RecoverySecurityEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: RecoverySecurityEvent = {
      ...event,
      id: generateId(),
      timestamp: Date.now(),
      resolved: false
    }

    const events = this.getStoredSecurityEvents()
    events[securityEvent.id] = securityEvent
    localStorage.setItem(STORAGE_KEYS.RECOVERY_SECURITY_EVENTS, JSON.stringify(events))
  }

  // Private helper methods
  private generateInvitationCode(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private getDefaultConfig(): SocialRecoveryConfig {
    return {
      isEnabled: false,
      guardianThreshold: 2,
      totalGuardians: 0,
      recoveryDelay: this.DEFAULT_RECOVERY_DELAY_HOURS,
      maxRecoveryAttempts: 3,
      cooldownPeriod: 24,
      requireOwnerApproval: true,
      allowEmergencyRecovery: false
    }
  }

  private getStoredConfigs(): Record<string, SocialRecoveryConfig> {
    const stored = localStorage.getItem(STORAGE_KEYS.SOCIAL_RECOVERY_CONFIG)
    return stored ? JSON.parse(stored) : {}
  }

  private getStoredGuardians(): Record<string, Guardian[]> {
    const stored = localStorage.getItem(STORAGE_KEYS.GUARDIANS)
    return stored ? JSON.parse(stored) : {}
  }

  private getStoredRecoveryRequests(): Record<string, RecoveryRequest> {
    const stored = localStorage.getItem(STORAGE_KEYS.RECOVERY_REQUESTS)
    return stored ? JSON.parse(stored) : {}
  }

  private getStoredInvitations(): Record<string, GuardianInvitation> {
    const stored = localStorage.getItem(STORAGE_KEYS.GUARDIAN_INVITATIONS)
    return stored ? JSON.parse(stored) : {}
  }

  private getStoredSecurityEvents(): Record<string, RecoverySecurityEvent> {
    const stored = localStorage.getItem(STORAGE_KEYS.RECOVERY_SECURITY_EVENTS)
    return stored ? JSON.parse(stored) : {}
  }

  private async updateGuardianCount(walletAddress: Address): Promise<void> {
    const guardians = await this.getGuardians(walletAddress)
    const config = await this.getRecoveryConfig(walletAddress)
    
    config.totalGuardians = guardians.length
    
    // Adjust threshold if needed
    if (config.guardianThreshold > guardians.length) {
      config.guardianThreshold = Math.max(1, guardians.length)
    }
    
    await this.updateRecoveryConfig(walletAddress, config)
  }

  private async sendInvitationNotification(invitation: GuardianInvitation): Promise<void> {
    // Would integrate with email/notification service
    console.log('Sending invitation to:', invitation.guardianEmail)
  }

  private async notifyGuardiansOfRecovery(request: RecoveryRequest, guardians: Guardian[]): Promise<void> {
    // Would send notifications to all guardians
    console.log('Notifying guardians of recovery request:', request.id)
  }
}

// Export singleton instance
export const socialRecoveryService = new SocialRecoveryServiceImpl()
