'use client'

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import { Address } from 'viem'
import {
  Guardian,
  GuardianInvitation,
  SocialRecoveryConfig,
  RecoveryRequest,
  RecoverySecurityEvent,
  RecoveryNotification,
  RecoveryState,
  RecoveryAction
} from '@/types/socialRecovery'
import { socialRecoveryService } from '@/services/socialRecoveryService'
import { useWallet } from './WalletContext'

// Initial state
const initialState: RecoveryState = {
  config: {
    isEnabled: false,
    guardianThreshold: 2,
    totalGuardians: 0,
    recoveryDelay: 24,
    maxRecoveryAttempts: 3,
    cooldownPeriod: 24,
    requireOwnerApproval: true,
    allowEmergencyRecovery: false
  },
  guardians: [],
  activeRecoveryRequest: undefined,
  pendingInvitations: [],
  recentSecurityEvents: [],
  notifications: []
}

// Reducer function
function recoveryReducer(state: RecoveryState, action: RecoveryAction): RecoveryState {
  switch (action.type) {
    case 'SET_CONFIG':
      return { ...state, config: action.payload }
    
    case 'SET_GUARDIANS':
      return { ...state, guardians: action.payload }
    
    case 'ADD_GUARDIAN':
      return { 
        ...state, 
        guardians: [...state.guardians, action.payload],
        config: { 
          ...state.config, 
          totalGuardians: state.guardians.length + 1 
        }
      }
    
    case 'REMOVE_GUARDIAN':
      const filteredGuardians = state.guardians.filter(g => g.id !== action.payload)
      return { 
        ...state, 
        guardians: filteredGuardians,
        config: { 
          ...state.config, 
          totalGuardians: filteredGuardians.length 
        }
      }
    
    case 'UPDATE_GUARDIAN':
      return {
        ...state,
        guardians: state.guardians.map(g => 
          g.id === action.payload.id 
            ? { ...g, ...action.payload.updates }
            : g
        )
      }
    
    case 'SET_RECOVERY_REQUEST':
      return { ...state, activeRecoveryRequest: action.payload }
    
    case 'ADD_INVITATION':
      return { 
        ...state, 
        pendingInvitations: [...state.pendingInvitations, action.payload] 
      }
    
    case 'UPDATE_INVITATION':
      return {
        ...state,
        pendingInvitations: state.pendingInvitations.map(inv => 
          inv.id === action.payload.id 
            ? { ...inv, ...action.payload.updates }
            : inv
        )
      }
    
    case 'ADD_SECURITY_EVENT':
      return { 
        ...state, 
        recentSecurityEvents: [action.payload, ...state.recentSecurityEvents].slice(0, 10) 
      }
    
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [action.payload, ...state.notifications] 
      }
    
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif => 
          notif.id === action.payload 
            ? { ...notif, readAt: Date.now() }
            : notif
        )
      }
    
    default:
      return state
  }
}

// Context type
interface SocialRecoveryContextType {
  state: RecoveryState
  
  // Guardian management
  inviteGuardian: (guardianEmail: string, guardianName: string, relationship: string, message?: string) => Promise<GuardianInvitation>
  acceptGuardianInvitation: (invitationCode: string, guardianInfo?: Partial<Guardian>) => Promise<Guardian>
  removeGuardian: (guardianId: string) => Promise<void>
  updateGuardian: (guardianId: string, updates: Partial<Guardian>) => Promise<void>
  
  // Recovery configuration
  updateRecoveryConfig: (config: Partial<SocialRecoveryConfig>) => Promise<void>
  enableSocialRecovery: () => Promise<void>
  disableSocialRecovery: () => Promise<void>
  
  // Recovery process
  initiateRecovery: (reason: string, newValidators?: any[], urgency?: 'low' | 'medium' | 'high' | 'emergency') => Promise<RecoveryRequest>
  approveRecovery: (requestId: string, guardianId: string) => Promise<void>
  executeRecovery: (requestId: string) => Promise<void>
  cancelRecovery: (requestId: string, reason: string) => Promise<void>
  vetoRecovery: (requestId: string) => Promise<void>
  
  // Utilities
  refreshData: () => Promise<void>
  markNotificationRead: (notificationId: string) => void
  reportSuspiciousActivity: (eventType: string, details: Record<string, any>) => Promise<void>
}

// Create context
const SocialRecoveryContext = createContext<SocialRecoveryContextType | undefined>(undefined)

// Provider component
interface SocialRecoveryProviderProps {
  children: ReactNode
}

export function SocialRecoveryProvider({ children }: SocialRecoveryProviderProps) {
  const [state, dispatch] = useReducer(recoveryReducer, initialState)
  const { address } = useWallet()

  // Load data when wallet address changes
  useEffect(() => {
    if (address) {
      refreshData()
    }
  }, [address])

  const refreshData = async () => {
    if (!address) return

    try {
      const [config, guardians, recoveryRequests, securityEvents] = await Promise.all([
        socialRecoveryService.getRecoveryConfig(address),
        socialRecoveryService.getGuardians(address),
        socialRecoveryService.getRecoveryRequests(address),
        socialRecoveryService.getSecurityEvents(address)
      ])

      dispatch({ type: 'SET_CONFIG', payload: config })
      dispatch({ type: 'SET_GUARDIANS', payload: guardians })
      
      // Set active recovery request (most recent pending one)
      const activeRequest = recoveryRequests.find(req => 
        req.status === 'collecting_approvals' || req.status === 'ready_to_execute'
      )
      dispatch({ type: 'SET_RECOVERY_REQUEST', payload: activeRequest })

      // Add recent security events
      securityEvents.slice(0, 10).forEach(event => {
        dispatch({ type: 'ADD_SECURITY_EVENT', payload: event })
      })
    } catch (error) {
      console.error('Failed to refresh social recovery data:', error)
    }
  }

  const inviteGuardian = async (
    guardianEmail: string, 
    guardianName: string, 
    relationship: string, 
    message?: string
  ): Promise<GuardianInvitation> => {
    if (!address) throw new Error('Wallet not connected')

    const invitation = await socialRecoveryService.inviteGuardian({
      walletAddress: address,
      guardianEmail,
      guardianName,
      relationship: relationship as any,
      invitedBy: address,
      invitationCode: '',
      status: 'sent',
      expiresAt: Date.now() + (72 * 60 * 60 * 1000), // 3 days
      metadata: {
        inviterName: 'Wallet Owner', // Would get from user profile
        message
      }
    })

    dispatch({ type: 'ADD_INVITATION', payload: invitation })
    return invitation
  }

  const acceptGuardianInvitation = async (
    invitationCode: string, 
    guardianInfo?: Partial<Guardian>
  ): Promise<Guardian> => {
    const guardian = await socialRecoveryService.acceptGuardianInvitation(invitationCode, guardianInfo || {})
    dispatch({ type: 'ADD_GUARDIAN', payload: guardian })
    return guardian
  }

  const removeGuardian = async (guardianId: string): Promise<void> => {
    await socialRecoveryService.removeGuardian(guardianId)
    dispatch({ type: 'REMOVE_GUARDIAN', payload: guardianId })
  }

  const updateGuardian = async (guardianId: string, updates: Partial<Guardian>): Promise<void> => {
    dispatch({ type: 'UPDATE_GUARDIAN', payload: { id: guardianId, updates } })
    // Would also update in service/storage
  }

  const updateRecoveryConfig = async (configUpdates: Partial<SocialRecoveryConfig>): Promise<void> => {
    if (!address) throw new Error('Wallet not connected')

    const newConfig = { ...state.config, ...configUpdates }
    await socialRecoveryService.updateRecoveryConfig(address, newConfig)
    dispatch({ type: 'SET_CONFIG', payload: newConfig })
  }

  const enableSocialRecovery = async (): Promise<void> => {
    await updateRecoveryConfig({ isEnabled: true })
  }

  const disableSocialRecovery = async (): Promise<void> => {
    await updateRecoveryConfig({ isEnabled: false })
  }

  const initiateRecovery = async (
    reason: string, 
    newValidators?: any[], 
    urgency: 'low' | 'medium' | 'high' | 'emergency' = 'medium'
  ): Promise<RecoveryRequest> => {
    if (!address) throw new Error('Wallet not connected')

    const request = await socialRecoveryService.initiateRecovery({
      initiatorId: 'user', // Would be determined by context
      walletAddress: address,
      newValidators: newValidators || [],
      reason: reason as any,
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      approvals: [],
      requiredApprovals: state.config.guardianThreshold,
      metadata: {
        urgencyLevel: urgency,
        description: reason,
        contactInfo: 'user@example.com' // Would get from user profile
      }
    })

    dispatch({ type: 'SET_RECOVERY_REQUEST', payload: request })
    return request
  }

  const approveRecovery = async (requestId: string, guardianId: string): Promise<void> => {
    // In a real implementation, this would involve cryptographic signing
    const signature = 'mock_signature_' + Date.now()
    await socialRecoveryService.approveRecovery(requestId, guardianId, signature)
    await refreshData() // Refresh to get updated request
  }

  const executeRecovery = async (requestId: string): Promise<void> => {
    await socialRecoveryService.executeRecovery(requestId)
    await refreshData()
  }

  const cancelRecovery = async (requestId: string, reason: string): Promise<void> => {
    await socialRecoveryService.cancelRecovery(requestId, reason)
    dispatch({ type: 'SET_RECOVERY_REQUEST', payload: undefined })
  }

  const vetoRecovery = async (requestId: string): Promise<void> => {
    // In a real implementation, this would require owner signature
    const ownerSignature = 'mock_owner_signature_' + Date.now()
    await socialRecoveryService.vetoRecovery(requestId, ownerSignature)
    dispatch({ type: 'SET_RECOVERY_REQUEST', payload: undefined })
  }

  const markNotificationRead = (notificationId: string): void => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId })
  }

  const reportSuspiciousActivity = async (
    eventType: string, 
    details: Record<string, any>
  ): Promise<void> => {
    if (!address) return

    await socialRecoveryService.reportSuspiciousActivity({
      walletAddress: address,
      eventType: eventType as any,
      severity: 'medium',
      details,
      resolved: false
    })
    await refreshData()
  }

  const value: SocialRecoveryContextType = {
    state,
    inviteGuardian,
    acceptGuardianInvitation,
    removeGuardian,
    updateGuardian,
    updateRecoveryConfig,
    enableSocialRecovery,
    disableSocialRecovery,
    initiateRecovery,
    approveRecovery,
    executeRecovery,
    cancelRecovery,
    vetoRecovery,
    refreshData,
    markNotificationRead,
    reportSuspiciousActivity
  }

  return (
    <SocialRecoveryContext.Provider value={value}>
      {children}
    </SocialRecoveryContext.Provider>
  )
}

// Hook to use the context
export function useSocialRecovery() {
  const context = useContext(SocialRecoveryContext)
  if (context === undefined) {
    throw new Error('useSocialRecovery must be used within a SocialRecoveryProvider')
  }
  return context
}

export default SocialRecoveryContext
