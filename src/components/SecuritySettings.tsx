'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { multiValidatorService } from '@/services/multiValidatorService'
import { SigningPolicy } from '@/types'
import SignerManagement from './SignerManagement'
import { 
  ShieldCheckIcon, 
  CogIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'

export function SecuritySettings() {
  const { validators, isMultiSig } = useAuth()
  const [isUpdatingPolicy, setIsUpdatingPolicy] = useState(false)
  const [policyError, setPolicyError] = useState<string | null>(null)
  const [policySuccess, setPolicySuccess] = useState<string | null>(null)
  
  const currentPolicy = multiValidatorService.getSigningPolicy()
  const [localPolicy, setLocalPolicy] = useState<SigningPolicy>(currentPolicy)

  const handlePolicyUpdate = async () => {
    setPolicyError(null)
    setPolicySuccess(null)
    setIsUpdatingPolicy(true)

    try {
      // Validate policy
      if (localPolicy.threshold > validators.length) {
        throw new Error('Threshold cannot be greater than number of signers')
      }

      if (localPolicy.threshold < 1) {
        throw new Error('Threshold must be at least 1')
      }

      if (localPolicy.highValueThreshold && parseFloat(localPolicy.highValueThreshold) < 0) {
        throw new Error('High value threshold must be positive')
      }

      await multiValidatorService.updateSigningPolicy(localPolicy)
      setPolicySuccess('Security policy updated successfully')
      
      // Clear success message after 3 seconds
      setTimeout(() => setPolicySuccess(null), 3000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update policy'
      setPolicyError(errorMessage)
    } finally {
      setIsUpdatingPolicy(false)
    }
  }

  const resetPolicy = () => {
    setLocalPolicy(currentPolicy)
    setPolicyError(null)
    setPolicySuccess(null)
  }

  const hasChanges = JSON.stringify(localPolicy) !== JSON.stringify(currentPolicy)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600 mr-3" />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Security Settings</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your wallet's authentication methods and security policies
              </p>
            </div>
          </div>
        </div>

        {/* Security Overview */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{validators.length}</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Active Signers</p>
                  <p className="text-xs text-gray-500">Authentication methods</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isMultiSig ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    <span className={`font-semibold text-sm ${
                      isMultiSig ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {isMultiSig ? '✓' : '!'}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {isMultiSig ? 'Multi-Sig' : 'Single-Sig'}
                  </p>
                  <p className="text-xs text-gray-500">Security level</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">
                      {currentPolicy.threshold}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Threshold</p>
                  <p className="text-xs text-gray-500">Required signatures</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signer Management */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Authentication Methods</h2>
          <p className="text-sm text-gray-500 mt-1">
            Add or remove authentication methods for your wallet
          </p>
        </div>
        <div className="px-6 py-6">
          <SignerManagement />
        </div>
      </div>

      {/* Security Policy */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <CogIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Security Policy</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure when multi-signature is required
          </p>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Multi-sig requirement */}
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={localPolicy.requireMultiSig}
                onChange={(e) => setLocalPolicy(prev => ({ 
                  ...prev, 
                  requireMultiSig: e.target.checked 
                }))}
                disabled={validators.length <= 1}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-900">
                Require multi-signature for transactions
              </span>
            </label>
            {validators.length <= 1 && (
              <p className="text-xs text-gray-500 mt-1">
                Add additional signers to enable multi-signature
              </p>
            )}
          </div>

          {/* Signature threshold */}
          {localPolicy.requireMultiSig && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Signature Threshold
              </label>
              <select
                value={localPolicy.threshold}
                onChange={(e) => setLocalPolicy(prev => ({ 
                  ...prev, 
                  threshold: parseInt(e.target.value) 
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {Array.from({ length: validators.length }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    {num} of {validators.length} signatures required
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Number of signatures required to approve transactions
              </p>
            </div>
          )}

          {/* High value threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              High Value Threshold (ETH)
            </label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={localPolicy.highValueThreshold || ''}
              onChange={(e) => setLocalPolicy(prev => ({ 
                ...prev, 
                highValueThreshold: e.target.value || undefined 
              }))}
              placeholder="e.g., 0.1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Transactions above this amount will always require multi-signature (optional)
            </p>
          </div>

          {/* Status messages */}
          {policyError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{policyError}</p>
                </div>
              </div>
            </div>
          )}

          {policySuccess && (
            <div className="rounded-md bg-green-50 p-4">
              <div className="flex">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">{policySuccess}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          {hasChanges && (
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={resetPolicy}
                disabled={isUpdatingPolicy}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handlePolicyUpdate}
                disabled={isUpdatingPolicy}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isUpdatingPolicy ? 'Updating...' : 'Update Policy'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Security Best Practices</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Use multiple authentication methods for enhanced security</li>
                <li>Set a reasonable signature threshold (typically 2 of 3 or 3 of 5)</li>
                <li>Configure high-value thresholds for large transactions</li>
                <li>Regularly review and update your security settings</li>
                <li>Keep backup access methods in secure locations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SecuritySettings
