'use client'

import React, { useState } from 'react'
import { MultiSigTransactionModalProps, ValidatorInfo } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { 
  XMarkIcon, 
  ShieldCheckIcon, 
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserIcon,
  KeyIcon 
} from '@heroicons/react/24/outline'

export function MultiSigTransactionModal({ 
  isOpen, 
  onClose, 
  transaction, 
  onSign, 
  availableSigners 
}: MultiSigTransactionModalProps) {
  const { validators } = useAuth()
  const [isSigningWith, setIsSigningWith] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSign = async (validatorId: string) => {
    setError(null)
    setIsSigningWith(validatorId)

    try {
      await onSign(validatorId)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign transaction'
      setError(errorMessage)
    } finally {
      setIsSigningWith(null)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSignerIcon = (type: 'passkey' | 'social') => {
    return type === 'passkey' ? (
      <KeyIcon className="h-4 w-4" />
    ) : (
      <UserIcon className="h-4 w-4" />
    )
  }

  const getSignedValidators = () => {
    return transaction.collectedSignatures.map(sig => {
      const validator = validators.find(v => v.id === sig.validatorId)
      return { signature: sig, validator }
    })
  }

  const getUnsignedValidators = () => {
    const signedIds = transaction.collectedSignatures.map(sig => sig.validatorId)
    return availableSigners.filter(v => !signedIds.includes(v.id))
  }

  const isExpired = transaction.expiresAt && Date.now() > transaction.expiresAt
  const progressPercentage = (transaction.collectedSignatures.length / transaction.requiredSignatures) * 100

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Multi-Signature Transaction
              </h3>
              
              <div className="mt-4 space-y-4">
                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Transaction Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">To:</span>
                      <span className="font-mono text-gray-900">{transaction.to}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount:</span>
                      <span className="font-medium text-gray-900">{transaction.value} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="text-gray-900">{formatDate(transaction.timestamp)}</span>
                    </div>
                    {transaction.expiresAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Expires:</span>
                        <span className={`${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                          {formatDate(transaction.expiresAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-medium text-gray-900">Signature Progress</h4>
                    <span className="text-sm text-gray-500">
                      {transaction.collectedSignatures.length} of {transaction.requiredSignatures} required
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        transaction.isComplete ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Signed Validators */}
                {transaction.collectedSignatures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Signed By</h4>
                    <div className="space-y-2">
                      {getSignedValidators().map(({ signature, validator }, index) => (
                        <div key={index} className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg">
                          <div className="flex-shrink-0">
                            <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {validator?.name || 'Unknown Signer'}
                            </p>
                            <p className="text-xs text-gray-500">
                              Signed {formatDate(signature.signedAt)}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            {validator && getSignerIcon(validator.type)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Signers */}
                {!transaction.isComplete && !isExpired && getUnsignedValidators().length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Available Signers</h4>
                    <div className="space-y-2">
                      {getUnsignedValidators().map((validator) => (
                        <div key={validator.id} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className={`p-1 rounded ${
                              validator.type === 'passkey' 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'bg-green-100 text-green-600'
                            }`}>
                              {getSignerIcon(validator.type)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{validator.name}</p>
                              <p className="text-xs text-gray-500">
                                {validator.type === 'passkey' ? 'Passkey' : 'Social Login'}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSign(validator.id)}
                            disabled={isSigningWith === validator.id}
                            className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSigningWith === validator.id ? 'Signing...' : 'Sign'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Messages */}
                {transaction.isComplete && (
                  <div className="rounded-md bg-green-50 p-4">
                    <div className="flex">
                      <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      <div className="ml-3">
                        <p className="text-sm text-green-800">
                          Transaction completed! All required signatures have been collected.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isExpired && !transaction.isComplete && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-800">
                          This transaction has expired and can no longer be signed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 sm:w-auto"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MultiSigTransactionModal
