import { Address } from 'viem'

// Guardian types
export interface Guardian {
  id: string
  address?: Address // On-chain guardian address (if they have a wallet)
  email?: string // Off-chain guardian email
  name: string
  relationship: GuardianRelationship
  status: GuardianStatus
  invitedAt: number
  acceptedAt?: number
  lastActiveAt?: number
  publicKey?: string // For encrypted communication
  metadata: GuardianMetadata
}

export type GuardianRelationship = 
  | 'family' 
  | 'friend' 
  | 'colleague' 
  | 'trusted_contact' 
  | 'professional' // lawyer, accountant, etc.
  | 'other'

export type GuardianStatus = 
  | 'invited' 
  | 'accepted' 
  | 'active' 
  | 'inactive' 
  | 'removed'

export interface GuardianMetadata {
  deviceInfo?: string
  location?: string
  timezone?: string
  preferredContact: 'email' | 'sms' | 'app_notification'
  emergencyContact?: boolean
  notes?: string
}

// Recovery configuration
export interface SocialRecoveryConfig {
  isEnabled: boolean
  guardianThreshold: number // Minimum guardians needed for recovery
  totalGuardians: number
  recoveryDelay: number // Delay in hours before recovery can be executed
  maxRecoveryAttempts: number
  cooldownPeriod: number // Hours between recovery attempts
  requireOwnerApproval: boolean // Whether owner can veto recovery
  allowEmergencyRecovery: boolean // Bypass delays in emergency
}

// Recovery process types
export interface RecoveryRequest {
  id: string
  initiatorId: string // Guardian who initiated
  walletAddress: Address
  newOwnerAddress?: Address // New owner address (if changing ownership)
  newValidators?: RecoveryValidator[] // New authentication methods
  reason: RecoveryReason
  status: RecoveryStatus
  createdAt: number
  expiresAt: number
  executedAt?: number
  approvals: RecoveryApproval[]
  requiredApprovals: number
  metadata: RecoveryMetadata
}

export type RecoveryReason = 
  | 'lost_access' 
  | 'compromised_account' 
  | 'device_lost' 
  | 'forgot_credentials' 
  | 'emergency' 
  | 'planned_transfer'

export type RecoveryStatus = 
  | 'pending' 
  | 'collecting_approvals' 
  | 'ready_to_execute' 
  | 'executed' 
  | 'cancelled' 
  | 'expired' 
  | 'vetoed'

export interface RecoveryApproval {
  guardianId: string
  signature: string
  approvedAt: number
  ipAddress?: string
  deviceFingerprint?: string
  verificationMethod: 'email' | 'sms' | 'app' | 'hardware_key'
}

export interface RecoveryValidator {
  type: 'social' | 'passkey' | 'hardware'
  identifier: string // email, username, or hardware key ID
  publicKey?: string
  metadata?: Record<string, any>
}

export interface RecoveryMetadata {
  initiatorDevice?: string
  initiatorLocation?: string
  urgencyLevel: 'low' | 'medium' | 'high' | 'emergency'
  description?: string
  evidenceUrls?: string[] // Links to supporting evidence
  contactInfo?: string // How to reach the person requesting recovery
}

// Guardian invitation system
export interface GuardianInvitation {
  id: string
  walletAddress: Address
  guardianEmail: string
  guardianName: string
  relationship: GuardianRelationship
  invitedBy: string // Wallet owner's identifier
  invitationCode: string
  status: 'sent' | 'accepted' | 'declined' | 'expired'
  sentAt: number
  expiresAt: number
  acceptedAt?: number
  metadata: {
    inviterName: string
    walletName?: string
    message?: string
  }
}

// Recovery notification types
export interface RecoveryNotification {
  id: string
  type: RecoveryNotificationType
  recipientId: string // Guardian or owner ID
  walletAddress: Address
  recoveryRequestId?: string
  title: string
  message: string
  actionRequired: boolean
  actionUrl?: string
  sentAt: number
  readAt?: number
  respondedAt?: number
}

export type RecoveryNotificationType = 
  | 'guardian_invitation'
  | 'recovery_initiated'
  | 'approval_requested'
  | 'recovery_approved'
  | 'recovery_executed'
  | 'recovery_cancelled'
  | 'recovery_vetoed'
  | 'guardian_removed'
  | 'config_changed'

// Recovery analytics and security
export interface RecoverySecurityEvent {
  id: string
  walletAddress: Address
  eventType: SecurityEventType
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
  details: Record<string, any>
  resolved: boolean
  resolvedAt?: number
}

export type SecurityEventType = 
  | 'suspicious_recovery_attempt'
  | 'multiple_failed_approvals'
  | 'guardian_compromise_suspected'
  | 'unusual_access_pattern'
  | 'emergency_recovery_triggered'
  | 'owner_veto_used'

// Service interfaces
export interface SocialRecoveryService {
  // Guardian management
  inviteGuardian(invitation: Omit<GuardianInvitation, 'id' | 'sentAt'>): Promise<GuardianInvitation>
  acceptGuardianInvitation(invitationCode: string, guardianInfo: Partial<Guardian>): Promise<Guardian>
  removeGuardian(guardianId: string): Promise<void>
  getGuardians(walletAddress: Address): Promise<Guardian[]>
  
  // Recovery configuration
  updateRecoveryConfig(walletAddress: Address, config: SocialRecoveryConfig): Promise<void>
  getRecoveryConfig(walletAddress: Address): Promise<SocialRecoveryConfig>
  
  // Recovery process
  initiateRecovery(request: Omit<RecoveryRequest, 'id' | 'createdAt' | 'status'>): Promise<RecoveryRequest>
  approveRecovery(requestId: string, guardianId: string, signature: string): Promise<RecoveryApproval>
  executeRecovery(requestId: string): Promise<void>
  cancelRecovery(requestId: string, reason: string): Promise<void>
  vetoRecovery(requestId: string, ownerSignature: string): Promise<void>
  
  // Monitoring and security
  getRecoveryRequests(walletAddress: Address): Promise<RecoveryRequest[]>
  getSecurityEvents(walletAddress: Address): Promise<RecoverySecurityEvent[]>
  reportSuspiciousActivity(event: Omit<RecoverySecurityEvent, 'id' | 'timestamp'>): Promise<void>
}

// Recovery state management
export interface RecoveryState {
  config: SocialRecoveryConfig
  guardians: Guardian[]
  activeRecoveryRequest?: RecoveryRequest
  pendingInvitations: GuardianInvitation[]
  recentSecurityEvents: RecoverySecurityEvent[]
  notifications: RecoveryNotification[]
}

// Recovery context actions
export type RecoveryAction = 
  | { type: 'SET_CONFIG'; payload: SocialRecoveryConfig }
  | { type: 'SET_GUARDIANS'; payload: Guardian[] }
  | { type: 'ADD_GUARDIAN'; payload: Guardian }
  | { type: 'REMOVE_GUARDIAN'; payload: string }
  | { type: 'UPDATE_GUARDIAN'; payload: { id: string; updates: Partial<Guardian> } }
  | { type: 'SET_RECOVERY_REQUEST'; payload: RecoveryRequest | undefined }
  | { type: 'ADD_INVITATION'; payload: GuardianInvitation }
  | { type: 'UPDATE_INVITATION'; payload: { id: string; updates: Partial<GuardianInvitation> } }
  | { type: 'ADD_SECURITY_EVENT'; payload: RecoverySecurityEvent }
  | { type: 'ADD_NOTIFICATION'; payload: RecoveryNotification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }

// Integration with existing types
export interface ValidatorInfoWithRecovery extends ValidatorInfo {
  isRecoveryValidator?: boolean
  recoveryWeight?: number // Weight in recovery process
  canInitiateRecovery?: boolean
}

export interface SigningPolicyWithRecovery extends SigningPolicy {
  socialRecovery?: SocialRecoveryConfig
  guardianOverride?: boolean // Allow guardians to override normal signing policy
}
