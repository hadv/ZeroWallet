'use client'

import React, { useState } from 'react'
import { useSocialRecovery } from '@/contexts/SocialRecoveryContext'
import { RecoveryReason } from '@/types/socialRecovery'
import {
  ShieldExclamationIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline'

export function RecoveryProcess() {
  const { 
    state, 
    initiateRecovery, 
    cancelRecovery, 
    executeRecovery, 
    vetoRecovery 
  } = useSocialRecovery()
  
  const [showInitiateForm, setShowInitiateForm] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [recoveryForm, setRecoveryForm] = useState({
    reason: 'lost_access' as RecoveryReason,
    description: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'emergency',
    contactInfo: ''
  })

  const { activeRecoveryRequest } = state

  const handleInitiateRecovery = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)

    try {
      await initiateRecovery(
        recoveryForm.description || recoveryForm.reason,
        [], // newValidators - would be populated based on recovery type
        recoveryForm.urgency
      )
      setShowInitiateForm(false)
      setRecoveryForm({
        reason: 'lost_access',
        description: '',
        urgency: 'medium',
        contactInfo: ''
      })
    } catch (error) {
      console.error('Failed to initiate recovery:', error)
      alert('Failed to initiate recovery. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelRecovery = async () => {
    if (!activeRecoveryRequest) return
    
    if (window.confirm('Are you sure you want to cancel this recovery request?')) {
      setIsProcessing(true)
      try {
        await cancelRecovery(activeRecoveryRequest.id, 'Cancelled by user')
      } catch (error) {
        console.error('Failed to cancel recovery:', error)
        alert('Failed to cancel recovery. Please try again.')
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const handleExecuteRecovery = async () => {
    if (!activeRecoveryRequest) return
    
    if (window.confirm('Are you sure you want to execute this recovery? This action cannot be undone.')) {
      setIsProcessing(true)
      try {
        await executeRecovery(activeRecoveryRequest.id)
        alert('Recovery executed successfully!')
      } catch (error) {
        console.error('Failed to execute recovery:', error)
        alert('Failed to execute recovery. Please try again.')
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const handleVetoRecovery = async () => {
    if (!activeRecoveryRequest) return
    
    if (window.confirm('Are you sure you want to veto this recovery request?')) {
      setIsProcessing(true)
      try {
        await vetoRecovery(activeRecoveryRequest.id)
      } catch (error) {
        console.error('Failed to veto recovery:', error)
        alert('Failed to veto recovery. Please try again.')
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'collecting_approvals':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'ready_to_execute':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'executed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'cancelled':
      case 'vetoed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'expired':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'collecting_approvals':
        return 'Collecting Guardian Approvals'
      case 'ready_to_execute':
        return 'Ready to Execute'
      case 'executed':
        return 'Executed'
      case 'cancelled':
        return 'Cancelled'
      case 'vetoed':
        return 'Vetoed by Owner'
      case 'expired':
        return 'Expired'
      default:
        return 'Unknown'
    }
  }

  const reasonOptions = [
    { value: 'lost_access', label: 'Lost Access to Authentication' },
    { value: 'compromised_account', label: 'Account Compromised' },
    { value: 'device_lost', label: 'Device Lost or Stolen' },
    { value: 'forgot_credentials', label: 'Forgot Credentials' },
    { value: 'emergency', label: 'Emergency Situation' },
    { value: 'planned_transfer', label: 'Planned Transfer' }
  ]

  const urgencyOptions = [
    { value: 'low', label: 'Low - No immediate threat' },
    { value: 'medium', label: 'Medium - Standard recovery' },
    { value: 'high', label: 'High - Urgent but not emergency' },
    { value: 'emergency', label: 'Emergency - Immediate action needed' }
  ]

  if (!state.config.isEnabled) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6">
        <div className="flex">
          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-400" />
          <div className="ml-3">
            <h3 className="text-lg font-medium text-yellow-800">
              Social Recovery Not Enabled
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                You need to set up guardians and enable social recovery before you can use this feature.
                Go to Guardian Management to get started.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <ShieldExclamationIcon className="h-6 w-6 text-orange-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Wallet Recovery</h2>
        </div>
        {!activeRecoveryRequest && (
          <button
            onClick={() => setShowInitiateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <ShieldExclamationIcon className="h-4 w-4 mr-2" />
            Initiate Recovery
          </button>
        )}
      </div>

      {/* Active Recovery Request */}
      {activeRecoveryRequest && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Active Recovery Request</h3>
              <div className="flex items-center">
                {getStatusIcon(activeRecoveryRequest.status)}
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {getStatusText(activeRecoveryRequest.status)}
                </span>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Recovery Details</h4>
                <dl className="mt-2 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <dt>Reason:</dt>
                    <dd className="font-medium">{activeRecoveryRequest.reason.replace('_', ' ')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Initiated:</dt>
                    <dd>{new Date(activeRecoveryRequest.createdAt).toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Expires:</dt>
                    <dd>{new Date(activeRecoveryRequest.expiresAt).toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Urgency:</dt>
                    <dd className="font-medium">{activeRecoveryRequest.metadata.urgencyLevel}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Approval Progress</h4>
                <div className="mt-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Approvals</span>
                    <span>{activeRecoveryRequest.approvals.length} / {activeRecoveryRequest.requiredApprovals}</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${(activeRecoveryRequest.approvals.length / activeRecoveryRequest.requiredApprovals) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                {activeRecoveryRequest.metadata.description && (
                  <div className="mt-3">
                    <h5 className="text-xs font-medium text-gray-900">Description</h5>
                    <p className="text-xs text-gray-600 mt-1">{activeRecoveryRequest.metadata.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Guardian Approvals */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Guardian Approvals</h4>
              <div className="space-y-2">
                {state.guardians.map((guardian) => {
                  const approval = activeRecoveryRequest.approvals.find(a => a.guardianId === guardian.id)
                  return (
                    <div key={guardian.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{guardian.name}</span>
                        <span className="ml-2 text-xs text-gray-500">({guardian.email})</span>
                      </div>
                      <div className="flex items-center">
                        {approval ? (
                          <>
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-xs text-green-600">
                              Approved {new Date(approval.approvedAt).toLocaleDateString()}
                            </span>
                          </>
                        ) : (
                          <>
                            <ClockIcon className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className="text-xs text-yellow-600">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              {activeRecoveryRequest.status === 'collecting_approvals' && (
                <>
                  <button
                    onClick={handleCancelRecovery}
                    disabled={isProcessing}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <StopIcon className="h-4 w-4 mr-1 inline" />
                    Cancel Recovery
                  </button>
                  {state.config.requireOwnerApproval && (
                    <button
                      onClick={handleVetoRecovery}
                      disabled={isProcessing}
                      className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                    >
                      <XCircleIcon className="h-4 w-4 mr-1 inline" />
                      Veto Recovery
                    </button>
                  )}
                </>
              )}
              {activeRecoveryRequest.status === 'ready_to_execute' && (
                <button
                  onClick={handleExecuteRecovery}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  <PlayIcon className="h-4 w-4 mr-1 inline" />
                  Execute Recovery
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Initiate Recovery Form */}
      {showInitiateForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Initiate Wallet Recovery</h3>
          <form onSubmit={handleInitiateRecovery} className="space-y-4">
            <div>
              <label htmlFor="recovery-reason" className="block text-sm font-medium text-gray-700">
                Reason for Recovery
              </label>
              <select
                id="recovery-reason"
                value={recoveryForm.reason}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, reason: e.target.value as RecoveryReason })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              >
                {reasonOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="recovery-urgency" className="block text-sm font-medium text-gray-700">
                Urgency Level
              </label>
              <select
                id="recovery-urgency"
                value={recoveryForm.urgency}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, urgency: e.target.value as any })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
              >
                {urgencyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="recovery-description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="recovery-description"
                rows={3}
                value={recoveryForm.description}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, description: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="Provide details about why you need to recover your wallet..."
              />
            </div>

            <div>
              <label htmlFor="recovery-contact" className="block text-sm font-medium text-gray-700">
                Contact Information
              </label>
              <input
                type="text"
                id="recovery-contact"
                value={recoveryForm.contactInfo}
                onChange={(e) => setRecoveryForm({ ...recoveryForm, contactInfo: e.target.value })}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder="How guardians can reach you for verification"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Important Notice
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      This will notify your guardians to approve wallet recovery. 
                      You need {state.config.guardianThreshold} out of {state.config.totalGuardians} guardian approvals.
                      Recovery will have a {state.config.recoveryDelay} hour delay before execution.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowInitiateForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
              >
                {isProcessing ? 'Initiating...' : 'Initiate Recovery'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recovery Information */}
      {!activeRecoveryRequest && !showInitiateForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
          <div className="flex">
            <InformationCircleIcon className="h-6 w-6 text-blue-400" />
            <div className="ml-3">
              <h3 className="text-lg font-medium text-blue-800">
                How Wallet Recovery Works
              </h3>
              <div className="mt-2 text-sm text-blue-700 space-y-2">
                <p>
                  <strong>1. Initiate:</strong> Start a recovery request explaining why you need access.
                </p>
                <p>
                  <strong>2. Guardian Approval:</strong> Your guardians will be notified and need to approve the recovery.
                </p>
                <p>
                  <strong>3. Delay Period:</strong> There's a {state.config.recoveryDelay} hour waiting period for security.
                </p>
                <p>
                  <strong>4. Execute:</strong> Once approved and the delay passes, you can execute the recovery.
                </p>
                <p className="mt-3 font-medium">
                  Current Configuration: {state.config.guardianThreshold} of {state.config.totalGuardians} guardians required
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
