'use client'

import React, { useState } from 'react'
import { useSocialRecovery } from '@/contexts/SocialRecoveryContext'
import { Guardian, GuardianRelationship } from '@/types/socialRecovery'
import { isValidEmail } from '@/utils/crypto'
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export function GuardianManagement() {
  const { state, inviteGuardian, removeGuardian, enableSocialRecovery, updateRecoveryConfig } = useSocialRecovery()
  const [isInviting, setIsInviting] = useState(false)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    relationship: 'friend' as GuardianRelationship,
    message: ''
  })
  const [inviteError, setInviteError] = useState<string | null>(null)

  const handleInviteGuardian = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError(null)
    setIsInviting(true)

    try {
      // Validate form
      if (!inviteForm.email || !inviteForm.name) {
        throw new Error('Email and name are required')
      }

      if (!isValidEmail(inviteForm.email)) {
        throw new Error('Please enter a valid email address')
      }

      // Check if guardian already exists
      const existingGuardian = state.guardians.find(g => g.email === inviteForm.email)
      if (existingGuardian) {
        throw new Error('This email is already added as a guardian')
      }

      await inviteGuardian(
        inviteForm.email,
        inviteForm.name,
        inviteForm.relationship,
        inviteForm.message
      )

      // Reset form
      setInviteForm({
        email: '',
        name: '',
        relationship: 'friend',
        message: ''
      })
      setShowInviteForm(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite guardian'
      setInviteError(errorMessage)
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveGuardian = async (guardianId: string) => {
    if (window.confirm('Are you sure you want to remove this guardian? This will affect your recovery security.')) {
      try {
        await removeGuardian(guardianId)
      } catch (error) {
        console.error('Failed to remove guardian:', error)
      }
    }
  }

  const handleEnableSocialRecovery = async () => {
    if (state.guardians.length < 2) {
      alert('You need at least 2 guardians to enable social recovery')
      return
    }

    try {
      await enableSocialRecovery()
    } catch (error) {
      console.error('Failed to enable social recovery:', error)
    }
  }

  const getStatusIcon = (guardian: Guardian) => {
    switch (guardian.status) {
      case 'accepted':
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'invited':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'inactive':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (guardian: Guardian) => {
    switch (guardian.status) {
      case 'accepted':
      case 'active':
        return 'Active'
      case 'invited':
        return 'Pending'
      case 'inactive':
        return 'Inactive'
      default:
        return 'Unknown'
    }
  }

  const relationshipOptions: { value: GuardianRelationship; label: string }[] = [
    { value: 'family', label: 'Family Member' },
    { value: 'friend', label: 'Friend' },
    { value: 'colleague', label: 'Colleague' },
    { value: 'trusted_contact', label: 'Trusted Contact' },
    { value: 'professional', label: 'Professional (Lawyer, Accountant)' },
    { value: 'other', label: 'Other' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <UserGroupIcon className="h-6 w-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Guardian Management</h2>
        </div>
        <div className="flex items-center space-x-3">
          {!state.config.isEnabled && state.guardians.length >= 2 && (
            <button
              onClick={handleEnableSocialRecovery}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <ShieldCheckIcon className="h-4 w-4 mr-1" />
              Enable Recovery
            </button>
          )}
          <button
            onClick={() => setShowInviteForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Invite Guardian
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {!state.config.isEnabled && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Social Recovery Not Enabled
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  Add at least 2 guardians and enable social recovery to protect your wallet.
                  Guardians can help you recover access if you lose your authentication methods.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Configuration Summary */}
      {state.config.isEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <ShieldCheckIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Social Recovery Enabled
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  Recovery requires {state.config.guardianThreshold} out of {state.config.totalGuardians} guardians.
                  Recovery delay: {state.config.recoveryDelay} hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Guardian Form */}
      {showInviteForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Guardian</h3>
          <form onSubmit={handleInviteGuardian} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="guardian-email" className="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="guardian-email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="guardian@example.com"
                  required
                />
              </div>
              <div>
                <label htmlFor="guardian-name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="guardian-name"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="John Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="guardian-relationship" className="block text-sm font-medium text-gray-700">
                Relationship
              </label>
              <select
                id="guardian-relationship"
                value={inviteForm.relationship}
                onChange={(e) => setInviteForm({ ...inviteForm, relationship: e.target.value as GuardianRelationship })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {relationshipOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="guardian-message" className="block text-sm font-medium text-gray-700">
                Personal Message (Optional)
              </label>
              <textarea
                id="guardian-message"
                rows={3}
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Hi! I'd like you to be a guardian for my wallet recovery..."
              />
            </div>

            {inviteError && (
              <div className="text-red-600 text-sm">{inviteError}</div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isInviting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Guardians List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Current Guardians ({state.guardians.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {state.guardians.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No guardians yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by inviting trusted contacts to be your guardians.
              </p>
            </div>
          ) : (
            state.guardians.map((guardian) => (
              <div key={guardian.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {getStatusIcon(guardian)}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{guardian.name}</p>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {guardian.relationship.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{guardian.email}</p>
                      <p className="text-xs text-gray-400">
                        Status: {getStatusText(guardian)} • 
                        Added {new Date(guardian.invitedAt).toLocaleDateString()}
                        {guardian.lastActiveAt && (
                          <> • Last active {new Date(guardian.lastActiveAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRemoveGuardian(guardian.id)}
                      className="p-2 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-md"
                      title="Remove guardian"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pending Invitations */}
      {state.pendingInvitations.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Pending Invitations ({state.pendingInvitations.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {state.pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invitation.guardianName}</p>
                    <p className="text-sm text-gray-500">{invitation.guardianEmail}</p>
                    <p className="text-xs text-gray-400">
                      Sent {new Date(invitation.sentAt).toLocaleDateString()} • 
                      Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 text-yellow-500 mr-1" />
                    <span className="text-sm text-yellow-600">Pending</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
