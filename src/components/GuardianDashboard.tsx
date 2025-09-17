'use client'

import React, { useState, useEffect } from 'react'
import { RecoveryRequest, RecoveryApproval } from '@/types/socialRecovery'
import { socialRecoveryService } from '@/services/socialRecoveryService'
import {
  ShieldExclamationIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  EyeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface GuardianDashboardProps {
  guardianId: string
  guardianEmail: string
}

export function GuardianDashboard({ guardianId, guardianEmail }: GuardianDashboardProps) {
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isApproving, setIsApproving] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<RecoveryRequest | null>(null)

  useEffect(() => {
    loadRecoveryRequests()
  }, [guardianId])

  const loadRecoveryRequests = async () => {
    try {
      setIsLoading(true)
      // In a real implementation, this would fetch requests where this guardian is involved
      // For now, we'll use mock data
      const mockRequests: RecoveryRequest[] = [
        {
          id: 'req_1',
          initiatorId: 'user_1',
          walletAddress: '0x1234567890123456789012345678901234567890',
          reason: 'lost_access',
          status: 'collecting_approvals',
          createdAt: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
          expiresAt: Date.now() + (5 * 24 * 60 * 60 * 1000), // 5 days from now
          approvals: [],
          requiredApprovals: 2,
          metadata: {
            urgencyLevel: 'medium',
            description: 'I lost access to my phone and can\'t use my authenticator app. I need to recover my wallet to access my funds.',
            contactInfo: 'alice@example.com'
          }
        }
      ]
      setRecoveryRequests(mockRequests)
    } catch (error) {
      console.error('Failed to load recovery requests:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApproveRecovery = async (requestId: string) => {
    setIsApproving(requestId)
    try {
      // In a real implementation, this would involve cryptographic signing
      const signature = `guardian_${guardianId}_${Date.now()}`
      await socialRecoveryService.approveRecovery(requestId, guardianId, signature)
      
      // Update local state
      setRecoveryRequests(prev => 
        prev.map(req => {
          if (req.id === requestId) {
            const newApproval: RecoveryApproval = {
              guardianId,
              signature,
              approvedAt: Date.now(),
              verificationMethod: 'email'
            }
            return {
              ...req,
              approvals: [...req.approvals, newApproval],
              status: req.approvals.length + 1 >= req.requiredApprovals ? 'ready_to_execute' : req.status
            }
          }
          return req
        })
      )
      
      alert('Recovery request approved successfully!')
    } catch (error) {
      console.error('Failed to approve recovery:', error)
      alert('Failed to approve recovery. Please try again.')
    } finally {
      setIsApproving(null)
    }
  }

  const handleDenyRecovery = async (requestId: string) => {
    if (window.confirm('Are you sure you want to deny this recovery request?')) {
      try {
        // In a real implementation, this would record the denial
        alert('Recovery request denied. The wallet owner will be notified.')
      } catch (error) {
        console.error('Failed to deny recovery:', error)
        alert('Failed to deny recovery. Please try again.')
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
        return 'Awaiting Approvals'
      case 'ready_to_execute':
        return 'Ready to Execute'
      case 'executed':
        return 'Executed'
      case 'cancelled':
        return 'Cancelled'
      case 'vetoed':
        return 'Vetoed'
      case 'expired':
        return 'Expired'
      default:
        return 'Unknown'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const hasApproved = (request: RecoveryRequest) => {
    return request.approvals.some(approval => approval.guardianId === guardianId)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
          <h2 className="mt-4 text-lg font-medium text-gray-900">Loading Guardian Dashboard</h2>
          <p className="mt-2 text-sm text-gray-500">Please wait...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Guardian Dashboard</h1>
              <p className="text-sm text-gray-500">Logged in as: {guardianEmail}</p>
            </div>
          </div>
        </div>

        {/* Recovery Requests */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                Recovery Requests ({recoveryRequests.length})
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Wallet recovery requests that require your approval
              </p>
            </div>

            {recoveryRequests.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <ShieldExclamationIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No recovery requests</h3>
                <p className="mt-1 text-sm text-gray-500">
                  There are currently no wallet recovery requests that need your attention.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {recoveryRequests.map((request) => (
                  <div key={request.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          {getStatusIcon(request.status)}
                          <h3 className="ml-2 text-lg font-medium text-gray-900">
                            Wallet Recovery Request
                          </h3>
                          <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(request.metadata.urgencyLevel)}`}>
                            {request.metadata.urgencyLevel} priority
                          </span>
                        </div>
                        
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>Wallet:</strong> {request.walletAddress.slice(0, 10)}...{request.walletAddress.slice(-8)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Reason:</strong> {request.reason.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Contact:</strong> {request.metadata.contactInfo}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">
                              <strong>Requested:</strong> {new Date(request.createdAt).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Expires:</strong> {new Date(request.expiresAt).toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Status:</strong> {getStatusText(request.status)}
                            </p>
                          </div>
                        </div>

                        {request.metadata.description && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-700">
                              <strong>Description:</strong> {request.metadata.description}
                            </p>
                          </div>
                        )}

                        {/* Approval Progress */}
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Approval Progress</span>
                            <span>{request.approvals.length} / {request.requiredApprovals}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${(request.approvals.length / request.requiredApprovals) * 100}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6 flex flex-col space-y-2">
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          View Details
                        </button>

                        {request.status === 'collecting_approvals' && !hasApproved(request) && (
                          <>
                            <button
                              onClick={() => handleApproveRecovery(request.id)}
                              disabled={isApproving === request.id}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              {isApproving === request.id ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleDenyRecovery(request.id)}
                              className="inline-flex items-center px-3 py-2 border border-red-300 text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              Deny
                            </button>
                          </>
                        )}

                        {hasApproved(request) && (
                          <div className="inline-flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Approved
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guardian Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
            <div className="flex">
              <InformationCircleIcon className="h-6 w-6 text-blue-400" />
              <div className="ml-3">
                <h3 className="text-lg font-medium text-blue-800">
                  Guardian Responsibilities
                </h3>
                <div className="mt-2 text-sm text-blue-700 space-y-1">
                  <p>• <strong>Verify Identity:</strong> Only approve requests from people you know and trust</p>
                  <p>• <strong>Act Promptly:</strong> Respond to recovery requests in a timely manner</p>
                  <p>• <strong>Ask Questions:</strong> Contact the wallet owner through alternative means to verify</p>
                  <p>• <strong>Be Cautious:</strong> When in doubt, deny the request and ask for more information</p>
                  <p>• <strong>Stay Updated:</strong> Keep your contact information current</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Request Details Modal */}
        {selectedRequest && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Recovery Request Details</h3>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircleIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Request ID:</strong> {selectedRequest.id}
                    </div>
                    <div>
                      <strong>Status:</strong> {getStatusText(selectedRequest.status)}
                    </div>
                    <div>
                      <strong>Wallet Address:</strong> {selectedRequest.walletAddress}
                    </div>
                    <div>
                      <strong>Urgency:</strong> {selectedRequest.metadata.urgencyLevel}
                    </div>
                    <div>
                      <strong>Created:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <strong>Expires:</strong> {new Date(selectedRequest.expiresAt).toLocaleString()}
                    </div>
                  </div>
                  
                  {selectedRequest.metadata.description && (
                    <div>
                      <strong>Description:</strong>
                      <p className="mt-1 p-3 bg-gray-50 rounded text-sm">{selectedRequest.metadata.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <strong>Approvals ({selectedRequest.approvals.length}/{selectedRequest.requiredApprovals}):</strong>
                    {selectedRequest.approvals.length > 0 ? (
                      <ul className="mt-1 space-y-1">
                        {selectedRequest.approvals.map((approval, index) => (
                          <li key={index} className="text-sm bg-green-50 p-2 rounded">
                            Guardian {approval.guardianId} - {new Date(approval.approvedAt).toLocaleString()}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">No approvals yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
