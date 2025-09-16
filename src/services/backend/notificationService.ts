import { proposalService } from './proposalService'

export interface NotificationChannel {
  type: 'websocket' | 'push' | 'email' | 'sms'
  endpoint: string
  metadata?: any
}

export interface NotificationMessage {
  id: string
  type: 'new_proposal' | 'signature_added' | 'proposal_executed' | 'proposal_cancelled' | 'proposal_expired'
  title: string
  message: string
  data: any
  timestamp: number
  recipients: string[]
}

class NotificationService {
  private channels: Map<string, NotificationChannel[]> = new Map()
  private activeConnections: Map<string, WebSocket[]> = new Map()

  /**
   * Register a notification channel for a user
   */
  async registerChannel(userId: string, channel: NotificationChannel): Promise<void> {
    const userChannels = this.channels.get(userId) || []
    
    // Remove existing channel of the same type
    const filteredChannels = userChannels.filter(c => c.type !== channel.type)
    filteredChannels.push(channel)
    
    this.channels.set(userId, filteredChannels)
    
    console.log(`Registered ${channel.type} channel for user ${userId}`)
  }

  /**
   * Register WebSocket connection for real-time notifications
   */
  registerWebSocket(userId: string, ws: WebSocket): void {
    const userConnections = this.activeConnections.get(userId) || []
    userConnections.push(ws)
    this.activeConnections.set(userId, userConnections)

    // Clean up on close
    ws.onclose = () => {
      this.removeWebSocket(userId, ws)
    }

    console.log(`WebSocket registered for user ${userId}`)
  }

  /**
   * Remove WebSocket connection
   */
  private removeWebSocket(userId: string, ws: WebSocket): void {
    const userConnections = this.activeConnections.get(userId) || []
    const filteredConnections = userConnections.filter(conn => conn !== ws)
    
    if (filteredConnections.length === 0) {
      this.activeConnections.delete(userId)
    } else {
      this.activeConnections.set(userId, filteredConnections)
    }
  }

  /**
   * Notify about new proposal
   */
  async notifyNewProposal(proposalId: string, validatorIds: string[]): Promise<void> {
    const proposal = await proposalService.getProposal(proposalId)
    if (!proposal) return

    const notification: NotificationMessage = {
      id: `new_proposal_${proposalId}`,
      type: 'new_proposal',
      title: 'New Multi-Sig Proposal',
      message: `New proposal requires your signature: ${proposal.value} ETH to ${proposal.to}`,
      data: {
        proposalId,
        proposal: {
          id: proposal.id,
          to: proposal.to,
          value: proposal.value,
          requiredSignatures: proposal.requiredSignatures,
          expiresAt: proposal.expiresAt
        }
      },
      timestamp: Date.now(),
      recipients: await this.getRecipientsForValidators(validatorIds)
    }

    await this.sendNotification(notification)
  }

  /**
   * Notify about signature added
   */
  async notifySignatureAdded(proposalId: string, validatorId: string): Promise<void> {
    const proposal = await proposalService.getProposal(proposalId)
    if (!proposal) return

    const remainingSignatures = proposal.requiredSignatures - proposal.collectedSignatures
    
    const notification: NotificationMessage = {
      id: `signature_added_${proposalId}_${validatorId}`,
      type: 'signature_added',
      title: 'Proposal Signed',
      message: `Proposal signed. ${remainingSignatures} more signature(s) needed.`,
      data: {
        proposalId,
        validatorId,
        collectedSignatures: proposal.collectedSignatures,
        requiredSignatures: proposal.requiredSignatures,
        remainingSignatures
      },
      timestamp: Date.now(),
      recipients: await this.getRecipientsForValidators(proposal.validatorIds)
    }

    await this.sendNotification(notification)
  }

  /**
   * Notify about proposal execution
   */
  async notifyProposalExecuted(proposalId: string): Promise<void> {
    const proposal = await proposalService.getProposal(proposalId)
    if (!proposal) return

    const notification: NotificationMessage = {
      id: `proposal_executed_${proposalId}`,
      type: 'proposal_executed',
      title: 'Proposal Executed',
      message: `Multi-sig proposal has been executed successfully!`,
      data: {
        proposalId,
        transactionHash: proposal.transactionHash,
        executedAt: proposal.executedAt
      },
      timestamp: Date.now(),
      recipients: await this.getRecipientsForValidators(proposal.validatorIds)
    }

    await this.sendNotification(notification)
  }

  /**
   * Notify about proposal cancellation
   */
  async notifyProposalCancelled(proposalId: string): Promise<void> {
    const proposal = await proposalService.getProposal(proposalId)
    if (!proposal) return

    const notification: NotificationMessage = {
      id: `proposal_cancelled_${proposalId}`,
      type: 'proposal_cancelled',
      title: 'Proposal Cancelled',
      message: `Multi-sig proposal has been cancelled.`,
      data: {
        proposalId,
        cancelledAt: Date.now()
      },
      timestamp: Date.now(),
      recipients: await this.getRecipientsForValidators(proposal.validatorIds)
    }

    await this.sendNotification(notification)
  }

  /**
   * Notify about proposal expiration
   */
  async notifyProposalExpired(proposalId: string): Promise<void> {
    const proposal = await proposalService.getProposal(proposalId)
    if (!proposal) return

    const notification: NotificationMessage = {
      id: `proposal_expired_${proposalId}`,
      type: 'proposal_expired',
      title: 'Proposal Expired',
      message: `Multi-sig proposal has expired without enough signatures.`,
      data: {
        proposalId,
        expiredAt: Date.now(),
        collectedSignatures: proposal.collectedSignatures,
        requiredSignatures: proposal.requiredSignatures
      },
      timestamp: Date.now(),
      recipients: await this.getRecipientsForValidators(proposal.validatorIds)
    }

    await this.sendNotification(notification)
  }

  /**
   * Send notification through all available channels
   */
  private async sendNotification(notification: NotificationMessage): Promise<void> {
    for (const recipient of notification.recipients) {
      await this.sendToUser(recipient, notification)
    }
  }

  /**
   * Send notification to a specific user
   */
  private async sendToUser(userId: string, notification: NotificationMessage): Promise<void> {
    const userChannels = this.channels.get(userId) || []

    // Send via WebSocket (real-time)
    await this.sendViaWebSocket(userId, notification)

    // Send via other channels
    for (const channel of userChannels) {
      try {
        switch (channel.type) {
          case 'push':
            await this.sendPushNotification(channel, notification)
            break
          case 'email':
            await this.sendEmailNotification(channel, notification)
            break
          case 'sms':
            await this.sendSMSNotification(channel, notification)
            break
        }
      } catch (error) {
        console.error(`Error sending ${channel.type} notification:`, error)
      }
    }
  }

  /**
   * Send notification via WebSocket
   */
  private async sendViaWebSocket(userId: string, notification: NotificationMessage): Promise<void> {
    const userConnections = this.activeConnections.get(userId) || []
    
    for (const ws of userConnections) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'notification',
            data: notification
          }))
        }
      } catch (error) {
        console.error('Error sending WebSocket notification:', error)
        this.removeWebSocket(userId, ws)
      }
    }
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(channel: NotificationChannel, notification: NotificationMessage): Promise<void> {
    // Implement push notification logic here
    // This would typically use a service like Firebase Cloud Messaging
    console.log('Push notification sent:', notification.title)
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(channel: NotificationChannel, notification: NotificationMessage): Promise<void> {
    // Implement email notification logic here
    // This would typically use a service like SendGrid or AWS SES
    console.log('Email notification sent:', notification.title)
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(channel: NotificationChannel, notification: NotificationMessage): Promise<void> {
    // Implement SMS notification logic here
    // This would typically use a service like Twilio
    console.log('SMS notification sent:', notification.title)
  }

  /**
   * Get user IDs for validator IDs
   */
  private async getRecipientsForValidators(validatorIds: string[]): Promise<string[]> {
    // This would typically query a database to map validator IDs to user IDs
    // For now, we'll implement a simple mapping
    const recipients: string[] = []
    
    for (const validatorId of validatorIds) {
      // Extract user ID from validator ID (this is a simplified approach)
      const userId = this.extractUserIdFromValidator(validatorId)
      if (userId && !recipients.includes(userId)) {
        recipients.push(userId)
      }
    }
    
    return recipients
  }

  /**
   * Extract user ID from validator ID
   */
  private extractUserIdFromValidator(validatorId: string): string | null {
    // This is a simplified approach - in reality, you'd have a proper mapping
    if (validatorId.startsWith('social_')) {
      return validatorId.replace('social_', 'user_')
    } else if (validatorId.startsWith('passkey_')) {
      return validatorId.replace('passkey_', 'user_')
    }
    return null
  }

  /**
   * Get notification history for a user
   */
  async getNotificationHistory(userId: string, limit: number = 50): Promise<NotificationMessage[]> {
    // This would typically query a database
    // For now, return empty array
    return []
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    // This would typically update a database
    console.log(`Notification ${notificationId} marked as read for user ${userId}`)
  }
}

export const notificationService = new NotificationService()
export default notificationService
