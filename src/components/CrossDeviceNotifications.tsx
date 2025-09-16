'use client'

import React, { useState, useEffect } from 'react'
import { realtimeService, DeviceInfo } from '@/services/realtimeService'
import { useAuth } from '@/contexts/AuthContext'
import { 
  BellIcon, 
  DevicePhoneMobileIcon, 
  ComputerDesktopIcon,
  WifiIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface Notification {
  id: string
  type: 'new_proposal' | 'signature_added' | 'proposal_executed' | 'proposal_expired'
  title: string
  message: string
  timestamp: number
  read: boolean
  data?: any
}

export function CrossDeviceNotifications() {
  const { isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      initializeRealtimeService()
    }

    return () => {
      realtimeService.disconnect()
    }
  }, [isAuthenticated])

  const initializeRealtimeService = async () => {
    try {
      // Get auth token (in production, get from your auth system)
      const authToken = localStorage.getItem('auth_token') || 'demo_token'
      
      // Create device info
      const deviceInfo: DeviceInfo = {
        deviceId: realtimeService.generateDeviceId(),
        deviceName: getDeviceName(),
        userAgent: navigator.userAgent,
        capabilities: realtimeService.getDeviceCapabilities(),
        platform: getPlatform()
      }

      setDeviceInfo(deviceInfo)

      // Initialize realtime service
      await realtimeService.initialize(authToken, deviceInfo)

      // Set event handlers
      realtimeService.setEventHandlers({
        onProposalCreated: handleProposalCreated,
        onSignatureAdded: handleSignatureAdded,
        onProposalExecuted: handleProposalExecuted,
        onProposalExpired: handleProposalExpired,
        onConnectionStatusChanged: setIsConnected,
        onSyncRequired: handleSyncRequired
      })

      // Load pending proposals
      await loadPendingProposals()

      // Start ping interval to keep connection alive
      const pingInterval = setInterval(() => {
        if (realtimeService.isConnected()) {
          realtimeService.ping()
        }
      }, 30000) // Ping every 30 seconds

      return () => clearInterval(pingInterval)
    } catch (error) {
      console.error('Error initializing realtime service:', error)
    }
  }

  const handleProposalCreated = (proposal: any) => {
    const notification: Notification = {
      id: `proposal_${proposal.id}`,
      type: 'new_proposal',
      title: 'New Multi-Sig Proposal',
      message: `New proposal requires your signature: ${proposal.value} ETH`,
      timestamp: Date.now(),
      read: false,
      data: proposal
    }
    
    addNotification(notification)
  }

  const handleSignatureAdded = (data: any) => {
    const notification: Notification = {
      id: `signature_${data.proposalId}_${Date.now()}`,
      type: 'signature_added',
      title: 'Proposal Signed',
      message: `Proposal signed. ${data.remainingSignatures} more signature(s) needed.`,
      timestamp: Date.now(),
      read: false,
      data
    }
    
    addNotification(notification)
  }

  const handleProposalExecuted = (data: any) => {
    const notification: Notification = {
      id: `executed_${data.proposalId}`,
      type: 'proposal_executed',
      title: 'Proposal Executed',
      message: 'Multi-sig proposal has been executed successfully!',
      timestamp: Date.now(),
      read: false,
      data
    }
    
    addNotification(notification)
  }

  const handleProposalExpired = (data: any) => {
    const notification: Notification = {
      id: `expired_${data.proposalId}`,
      type: 'proposal_expired',
      title: 'Proposal Expired',
      message: 'Multi-sig proposal has expired without enough signatures.',
      timestamp: Date.now(),
      read: false,
      data
    }
    
    addNotification(notification)
  }

  const handleSyncRequired = async () => {
    await loadPendingProposals()
  }

  const loadPendingProposals = async () => {
    try {
      const proposals = await realtimeService.getPendingProposals()
      
      // Convert proposals to notifications
      const proposalNotifications: Notification[] = proposals.map(proposal => ({
        id: `pending_${proposal.id}`,
        type: 'new_proposal',
        title: 'Pending Proposal',
        message: `Proposal awaiting signature: ${proposal.value} ETH`,
        timestamp: proposal.createdAt,
        read: false,
        data: proposal
      }))

      setNotifications(prev => {
        // Merge with existing notifications, avoiding duplicates
        const existingIds = prev.map(n => n.id)
        const newNotifications = proposalNotifications.filter(n => !existingIds.includes(n.id))
        return [...prev, ...newNotifications].sort((a, b) => b.timestamp - a.timestamp)
      })
    } catch (error) {
      console.error('Error loading pending proposals:', error)
    }
  }

  const addNotification = (notification: Notification) => {
    setNotifications(prev => {
      // Check if notification already exists
      if (prev.some(n => n.id === notification.id)) {
        return prev
      }
      
      // Add new notification and sort by timestamp
      return [notification, ...prev].sort((a, b) => b.timestamp - a.timestamp)
    })
  }

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
    
    await realtimeService.markNotificationAsRead(notificationId)
  }

  const clearNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const getDeviceName = (): string => {
    const userAgent = navigator.userAgent
    
    if (/iPhone|iPad|iPod/.test(userAgent)) {
      return 'iOS Device'
    } else if (/Android/.test(userAgent)) {
      return 'Android Device'
    } else if (/Mac/.test(userAgent)) {
      return 'Mac'
    } else if (/Windows/.test(userAgent)) {
      return 'Windows PC'
    } else {
      return 'Web Browser'
    }
  }

  const getPlatform = (): 'web' | 'mobile' | 'desktop' => {
    const userAgent = navigator.userAgent
    
    if (/iPhone|iPad|iPod|Android/.test(userAgent)) {
      return 'mobile'
    } else {
      return 'web'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_proposal':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'signature_added':
        return <ClockIcon className="h-5 w-5 text-blue-500" />
      case 'proposal_executed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'proposal_expired':
        return <XMarkIcon className="h-5 w-5 text-red-500" />
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now'
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)}m ago`
    } else if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)}h ago`
    } else {
      return new Date(timestamp).toLocaleDateString()
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="relative">
      {/* Connection Status */}
      <div className="flex items-center space-x-2 mb-4">
        <WifiIcon className={`h-4 w-4 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
        <span className={`text-xs ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
        {deviceInfo && (
          <>
            {deviceInfo.platform === 'mobile' ? (
              <DevicePhoneMobileIcon className="h-4 w-4 text-gray-500" />
            ) : (
              <ComputerDesktopIcon className="h-4 w-4 text-gray-500" />
            )}
            <span className="text-xs text-gray-500">{deviceInfo.deviceName}</span>
          </>
        )}
      </div>

      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-500">{unreadCount} unread</p>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        clearNotification(notification.id)
                      }}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CrossDeviceNotifications
