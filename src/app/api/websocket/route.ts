import { NextRequest } from 'next/server'
import { notificationService } from '@/services/backend/notificationService'
import { authMiddleware } from '@/lib/auth-middleware'

// WebSocket upgrade handler for Next.js
export async function GET(request: NextRequest) {
  try {
    // Check if this is a WebSocket upgrade request
    const upgrade = request.headers.get('upgrade')
    if (upgrade !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 })
    }

    // Authenticate the user
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Get WebSocket server (this is a simplified approach for Next.js)
    // In production, you'd use a dedicated WebSocket server
    const { socket, response } = upgradeWebSocket(request)

    // Register the WebSocket connection
    notificationService.registerWebSocket(authResult.userId!, socket)

    // Send initial connection confirmation
    socket.send(JSON.stringify({
      type: 'connection_established',
      data: {
        userId: authResult.userId,
        timestamp: Date.now()
      }
    }))

    // Handle incoming messages
    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data)
        await handleWebSocketMessage(authResult.userId!, message, socket)
      } catch (error) {
        console.error('Error handling WebSocket message:', error)
        socket.send(JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }))
      }
    }

    // Handle connection close
    socket.onclose = () => {
      console.log(`WebSocket connection closed for user ${authResult.userId}`)
    }

    return response
  } catch (error) {
    console.error('WebSocket connection error:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}

/**
 * Handle incoming WebSocket messages
 */
async function handleWebSocketMessage(
  userId: string,
  message: any,
  socket: WebSocket
): Promise<void> {
  switch (message.type) {
    case 'ping':
      socket.send(JSON.stringify({
        type: 'pong',
        data: { timestamp: Date.now() }
      }))
      break

    case 'subscribe_proposals':
      // Subscribe to proposal notifications
      socket.send(JSON.stringify({
        type: 'subscribed',
        data: { channel: 'proposals' }
      }))
      break

    case 'request_sync':
      // Send current state to newly connected device
      await sendSyncData(userId, socket)
      break

    case 'device_info':
      // Store device information for cross-device coordination
      await handleDeviceInfo(userId, message.data, socket)
      break

    default:
      socket.send(JSON.stringify({
        type: 'error',
        data: { message: `Unknown message type: ${message.type}` }
      }))
  }
}

/**
 * Send synchronization data to a device
 */
async function sendSyncData(userId: string, socket: WebSocket): Promise<void> {
  try {
    // Get pending proposals for the user
    const { proposalService } = await import('@/services/backend/proposalService')
    const pendingProposals = await proposalService.getProposalsForUser(userId, {
      status: 'pending',
      limit: 50
    })

    // Get notification history
    const notifications = await notificationService.getNotificationHistory(userId, 20)

    socket.send(JSON.stringify({
      type: 'sync_data',
      data: {
        pendingProposals,
        notifications,
        timestamp: Date.now()
      }
    }))
  } catch (error) {
    console.error('Error sending sync data:', error)
    socket.send(JSON.stringify({
      type: 'error',
      data: { message: 'Failed to sync data' }
    }))
  }
}

/**
 * Handle device information
 */
async function handleDeviceInfo(
  userId: string,
  deviceInfo: any,
  socket: WebSocket
): Promise<void> {
  try {
    // Store device info for cross-device coordination
    const deviceData = {
      userId,
      deviceId: deviceInfo.deviceId,
      deviceName: deviceInfo.deviceName,
      userAgent: deviceInfo.userAgent,
      capabilities: deviceInfo.capabilities || [],
      lastSeen: Date.now()
    }

    // In production, store this in a database
    console.log('Device registered:', deviceData)

    socket.send(JSON.stringify({
      type: 'device_registered',
      data: { deviceId: deviceInfo.deviceId }
    }))
  } catch (error) {
    console.error('Error handling device info:', error)
  }
}

/**
 * Simplified WebSocket upgrade for Next.js
 * In production, use a proper WebSocket library
 */
function upgradeWebSocket(request: NextRequest): { socket: WebSocket, response: Response } {
  // This is a simplified implementation
  // In production, you'd use a proper WebSocket server like ws or socket.io
  
  // For now, we'll create a mock WebSocket for demonstration
  const mockSocket = {
    send: (data: string) => console.log('WebSocket send:', data),
    onmessage: null as ((event: { data: string }) => void) | null,
    onclose: null as (() => void) | null,
    close: () => console.log('WebSocket closed'),
    readyState: 1 // OPEN
  } as unknown as WebSocket

  const response = new Response(null, {
    status: 101,
    statusText: 'Switching Protocols',
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Accept': 'mock-accept-key'
    }
  })

  return { socket: mockSocket, response }
}

// Handle POST requests for WebSocket-like functionality via HTTP
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return Response.json({ error: authResult.error }, { status: 401 })
    }

    const body = await request.json()
    
    switch (body.type) {
      case 'register_device':
        await handleDeviceRegistration(authResult.userId!, body.data)
        return Response.json({ success: true })

      case 'get_pending_proposals':
        const { proposalService } = await import('@/services/backend/proposalService')
        const proposals = await proposalService.getProposalsForUser(authResult.userId!, {
          status: 'pending'
        })
        return Response.json({ data: proposals })

      case 'mark_notification_read':
        await notificationService.markAsRead(authResult.userId!, body.data.notificationId)
        return Response.json({ success: true })

      default:
        return Response.json({ error: 'Unknown request type' }, { status: 400 })
    }
  } catch (error) {
    console.error('WebSocket HTTP handler error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Handle device registration via HTTP
 */
async function handleDeviceRegistration(userId: string, deviceData: any): Promise<void> {
  // Register device for push notifications
  if (deviceData.pushToken) {
    await notificationService.registerChannel(userId, {
      type: 'push',
      endpoint: deviceData.pushToken,
      metadata: {
        deviceId: deviceData.deviceId,
        platform: deviceData.platform
      }
    })
  }

  // Register email notifications
  if (deviceData.email) {
    await notificationService.registerChannel(userId, {
      type: 'email',
      endpoint: deviceData.email,
      metadata: {
        deviceId: deviceData.deviceId
      }
    })
  }
}
