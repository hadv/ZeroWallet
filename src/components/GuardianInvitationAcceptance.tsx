'use client'

import React, { useState, useEffect } from 'react'
import { useSocialRecovery } from '@/contexts/SocialRecoveryContext'
import { Guardian, GuardianInvitation } from '@/types/socialRecovery'
import { isValidEmail } from '@/utils/crypto'
import {
  ShieldCheckIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

interface GuardianInvitationAcceptanceProps {
  invitationCode?: string
}

export function GuardianInvitationAcceptance({ invitationCode }: GuardianInvitationAcceptanceProps) {
  const { acceptGuardianInvitation } = useSocialRecovery()
  const [invitation, setInvitation] = useState<GuardianInvitation | null>(null)
  const [isAccepting, setIsAccepting] = useState(false)
  const [isAccepted, setIsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guardianForm, setGuardianForm] = useState({
    name: '',
    email: '',
    preferredContact: 'email' as 'email' | 'sms' | 'app_notification',
    notes: ''
  })

  // Mock function to fetch invitation details
  // In a real implementation, this would call an API
  const fetchInvitationDetails = async (code: string): Promise<GuardianInvitation | null> => {
    try {
      // Mock invitation data - in real implementation, fetch from API
      const mockInvitation: GuardianInvitation = {
        id: 'inv_' + code,
        walletAddress: '0x1234567890123456789012345678901234567890',
        guardianEmail: 'guardian@example.com',
        guardianName: 'Guardian Name',
        relationship: 'friend',
        invitedBy: 'wallet_owner',
        invitationCode: code,
        status: 'sent',
        sentAt: Date.now() - (24 * 60 * 60 * 1000), // 1 day ago
        expiresAt: Date.now() + (48 * 60 * 60 * 1000), // 2 days from now
        metadata: {
          inviterName: 'Alice Smith',
          walletName: 'Alice\'s Wallet',
          message: 'Hi! I\'d like you to be a guardian for my wallet. This means you can help me recover access if I ever lose my authentication methods.'
        }
      }
      return mockInvitation
    } catch (error) {
      console.error('Failed to fetch invitation:', error)
      return null
    }
  }

  useEffect(() => {
    if (invitationCode) {
      fetchInvitationDetails(invitationCode).then(setInvitation)
    }
  }, [invitationCode])

  const handleAcceptInvitation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitation || !invitationCode) return

    setError(null)
    setIsAccepting(true)

    try {
      // Validate form
      if (!guardianForm.name || !guardianForm.email) {
        throw new Error('Name and email are required')
      }

      if (!isValidEmail(guardianForm.email)) {
        throw new Error('Please enter a valid email address')
      }

      // Accept the invitation
      const guardianInfo: Partial<Guardian> = {
        name: guardianForm.name,
        email: guardianForm.email,
        metadata: {
          preferredContact: guardianForm.preferredContact,
          notes: guardianForm.notes
        }
      }

      await acceptGuardianInvitation(invitationCode, guardianInfo)
      setIsAccepted(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to accept invitation'
      setError(errorMessage)
    } finally {
      setIsAccepting(false)
    }
  }

  if (!invitationCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Invalid Invitation
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                No invitation code provided. Please check your invitation link.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Loading Invitation
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                Please wait while we fetch your invitation details...
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (invitation.status !== 'sent' || invitation.expiresAt < Date.now()) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400" />
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Invitation Expired
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                This invitation has expired or has already been processed. 
                Please contact the wallet owner for a new invitation.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Guardian Role Accepted!
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                You are now a guardian for {invitation.metadata.inviterName}'s wallet. 
                You may receive notifications if they need help recovering their wallet.
              </p>
              <div className="mt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        What happens next?
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <p>
                          • You'll be notified if a recovery is initiated
                        </p>
                        <p>
                          • You can approve or deny recovery requests
                        </p>
                        <p>
                          • Keep your contact information up to date
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Guardian Invitation
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            You've been invited to be a wallet guardian
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Invitation Details */}
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <UserGroupIcon className="h-5 w-5 text-blue-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Invitation from {invitation.metadata.inviterName}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p><strong>Wallet:</strong> {invitation.metadata.walletName || 'Personal Wallet'}</p>
                    <p><strong>Relationship:</strong> {invitation.relationship.replace('_', ' ')}</p>
                    <p><strong>Expires:</strong> {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                  </div>
                  {invitation.metadata.message && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <p className="text-sm text-gray-700">"{invitation.metadata.message}"</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Guardian Information Form */}
          <form onSubmit={handleAcceptInvitation} className="space-y-6">
            <div>
              <label htmlFor="guardian-name" className="block text-sm font-medium text-gray-700">
                Your Full Name *
              </label>
              <input
                type="text"
                id="guardian-name"
                value={guardianForm.name}
                onChange={(e) => setGuardianForm({ ...guardianForm, name: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label htmlFor="guardian-email" className="block text-sm font-medium text-gray-700">
                Your Email Address *
              </label>
              <input
                type="email"
                id="guardian-email"
                value={guardianForm.email}
                onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="your.email@example.com"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be used to contact you for recovery approvals
              </p>
            </div>

            <div>
              <label htmlFor="preferred-contact" className="block text-sm font-medium text-gray-700">
                Preferred Contact Method
              </label>
              <select
                id="preferred-contact"
                value={guardianForm.preferredContact}
                onChange={(e) => setGuardianForm({ ...guardianForm, preferredContact: e.target.value as any })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="app_notification">App Notification</option>
              </select>
            </div>

            <div>
              <label htmlFor="guardian-notes" className="block text-sm font-medium text-gray-700">
                Notes (Optional)
              </label>
              <textarea
                id="guardian-notes"
                rows={3}
                value={guardianForm.notes}
                onChange={(e) => setGuardianForm({ ...guardianForm, notes: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Any additional information or preferences..."
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </div>
            )}

            {/* Guardian Responsibilities */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Guardian Responsibilities
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>As a guardian, you agree to:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Help verify the wallet owner's identity during recovery</li>
                      <li>Respond promptly to recovery requests</li>
                      <li>Only approve legitimate recovery attempts</li>
                      <li>Keep your contact information current</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={isAccepting}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isAccepting ? 'Accepting...' : 'Accept Guardian Role'}
              </button>
              <button
                type="button"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Decline Invitation
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
