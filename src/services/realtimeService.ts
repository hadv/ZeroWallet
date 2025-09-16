import { NotificationMessage } from './backend/notificationService'

export interface DeviceInfo {
  deviceId: string
  deviceName: string
  userAgent: string
  capabilities: string[]
  platform: 'web' | 'mobile' | 'desktop'
}

export interface RealtimeEventHandler {
  onProposalCreated?: (proposal: any) => void
  onSignatureAdded?: (data: any) => void
  onProposalExecuted?: (data: any) => void
  onProposalExpired?: (data: any) => void
  onConnectionStatusChanged?: (connected: boolean) => void
  onSyncRequired?: () => void
}

class RealtimeService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private isConnecting = false
  private eventHandlers: RealtimeEventHandler = {}
  private deviceInfo: DeviceInfo | null = null
  private authToken: string | null = null

  /**
   * Initialize the realtime service
   */
  async initialize(authToken: string, deviceInfo: DeviceInfo): Promise<void> {
    this.authToken = authToken
    this.deviceInfo = deviceInfo
    
    // Register device for notifications
    await this.registerDevice()
    
    // Connect to WebSocket
    await this.connect()
  }

  /**
   * Connect to WebSocket server
   */
  private async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.isConnecting = true

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/websocket`
      
      this.ws = new WebSocket(wsUrl)
      
      // Set authorization header (if supported by WebSocket implementation)
      if (this.authToken) {
        // Note: WebSocket doesn't support custom headers in browser
        // In production, you'd pass auth via query params or use a different method
      }

      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.eventHandlers.onConnectionStatusChanged?.(true)
        
        // Send device info
        this.sendMessage({
          type: 'device_info',
          data: this.deviceInfo
        })

        // Request sync
        this.sendMessage({
          type: 'request_sync'
        })

        // Subscribe to proposals
        this.sendMessage({
          type: 'subscribe_proposals'
        })
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.isConnecting = false
        this.eventHandlers.onConnectionStatusChanged?.(false)
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
      }

    } catch (error) {
      console.error('Error connecting to WebSocket:', error)
      this.isConnecting = false
      this.scheduleReconnect()
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'notification':
        this.handleNotification(message.data)
        break

      case 'sync_data':
        this.handleSyncData(message.data)
        break

      case 'connection_established':
        console.log('WebSocket connection established:', message.data)
        break

      case 'pong':
        // Handle ping/pong for connection health
        break

      case 'error':
        console.error('WebSocket error message:', message.data)
        break

      default:
        console.log('Unknown WebSocket message type:', message.type)
    }
  }

  /**
   * Handle notification messages
   */
  private handleNotification(notification: NotificationMessage): void {
    switch (notification.type) {
      case 'new_proposal':
        this.eventHandlers.onProposalCreated?.(notification.data.proposal)
        this.showBrowserNotification(notification)
        break

      case 'signature_added':
        this.eventHandlers.onSignatureAdded?.(notification.data)
        this.showBrowserNotification(notification)
        break

      case 'proposal_executed':
        this.eventHandlers.onProposalExecuted?.(notification.data)
        this.showBrowserNotification(notification)
        break

      case 'proposal_expired':
        this.eventHandlers.onProposalExpired?.(notification.data)
        this.showBrowserNotification(notification)
        break
    }
  }

  /**
   * Handle sync data
   */
  private handleSyncData(data: any): void {
    console.log('Received sync data:', data)
    this.eventHandlers.onSyncRequired?.()
  }

  /**
   * Show browser notification
   */
  private async showBrowserNotification(notification: NotificationMessage): Promise<void> {
    if (!('Notification' in window)) {
      return
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      })
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id
        })
      }
    }
  }

  /**
   * Send message to WebSocket server
   */
  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, message not sent:', message)
    }
  }

  /**
   * Schedule reconnection
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
    this.reconnectAttempts++

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect()
    }, delay)
  }

  /**
   * Register device for notifications
   */
  private async registerDevice(): Promise<void> {
    if (!this.deviceInfo || !this.authToken) return

    try {
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          type: 'register_device',
          data: this.deviceInfo
        })
      })

      if (!response.ok) {
        throw new Error('Failed to register device')
      }

      console.log('Device registered successfully')
    } catch (error) {
      console.error('Error registering device:', error)
    }
  }

  /**
   * Set event handlers
   */
  setEventHandlers(handlers: RealtimeEventHandler): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers }
  }

  /**
   * Get pending proposals
   */
  async getPendingProposals(): Promise<any[]> {
    if (!this.authToken) return []

    try {
      const response = await fetch('/api/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          type: 'get_pending_proposals'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get pending proposals')
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error getting pending proposals:', error)
      return []
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    if (!this.authToken) return

    try {
      await fetch('/api/websocket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify({
          type: 'mark_notification_read',
          data: { notificationId }
        })
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  /**
   * Send ping to keep connection alive
   */
  ping(): void {
    this.sendMessage({ type: 'ping' })
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Get device capabilities
   */
  static getDeviceCapabilities(): string[] {
    const capabilities: string[] = []

    if ('serviceWorker' in navigator) {
      capabilities.push('push_notifications')
    }

    if ('Notification' in window) {
      capabilities.push('browser_notifications')
    }

    if (navigator.credentials && navigator.credentials.create) {
      capabilities.push('webauthn')
    }

    if ('share' in navigator) {
      capabilities.push('web_share')
    }

    return capabilities
  }

  /**
   * Generate device ID
   */
  static generateDeviceId(): string {
    // Create a persistent device ID
    let deviceId = localStorage.getItem('zerowallet_device_id')
    
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('zerowallet_device_id', deviceId)
    }

    return deviceId
  }
}

export const realtimeService = new RealtimeService()
export default realtimeService
