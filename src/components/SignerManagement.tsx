'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ValidatorInfo, AddSignerRequest } from '@/types'
import SignerCard from './SignerCard'
import AddSignerModal from './AddSignerModal'
import { 
  PlusIcon, 
  ShieldCheckIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline'

export function SignerManagement() {
  const { 
    validators, 
    isMultiSig, 
    addPasskeySigner, 
    removeValidator, 
    isLoading,
    error 
  } = useAuth()
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)

  const primarySigner = validators.find(v => v.type === 'social') || validators[0]
  const additionalSigners = validators.filter(v => v.id !== primarySigner?.id)

  const handleAddSigner = async (request: AddSignerRequest) => {
    try {
      await addPasskeySigner(request)
    } catch (error) {
      console.error('Failed to add signer:', error)
      throw error
    }
  }

  const handleRemoveSigner = async (signerId: string) => {
    if (validators.length <= 1) {
      alert('Cannot remove the last signer')
      return
    }

    if (confirm('Are you sure you want to remove this signer? This action cannot be undone.')) {
      setIsRemoving(signerId)
      try {
        await removeValidator(signerId)
      } catch (error) {
        console.error('Failed to remove signer:', error)
        alert('Failed to remove signer. Please try again.')
      } finally {
        setIsRemoving(null)
      }
    }
  }

  const handleSetPrimary = (signerId: string) => {
    // For now, we don't allow changing the primary signer
    // This could be implemented later with proper validation
    alert('Changing primary signer is not yet supported')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Wallet Signers</h2>
          <p className="text-sm text-gray-500">
            Manage authentication methods for your wallet
          </p>
        </div>
        
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Passkey
        </button>
      </div>

      {/* Multi-sig status */}
      <div className={`rounded-lg p-4 ${
        isMultiSig 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {isMultiSig ? (
              <ShieldCheckIcon className="h-5 w-5 text-green-400" />
            ) : (
              <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
            )}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${
              isMultiSig ? 'text-green-800' : 'text-yellow-800'
            }`}>
              {isMultiSig ? 'Multi-Signature Enabled' : 'Single Signature'}
            </h3>
            <p className={`text-sm mt-1 ${
              isMultiSig ? 'text-green-700' : 'text-yellow-700'
            }`}>
              {isMultiSig 
                ? `Your wallet requires ${validators.length > 1 ? '2' : '1'} signatures for transactions. Enhanced security is active.`
                : 'Your wallet uses a single signature. Consider adding a passkey for enhanced security.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Primary signer */}
      {primarySigner && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Primary Signer</h3>
          <SignerCard
            signer={primarySigner}
            isPrimary={true}
            onSetPrimary={handleSetPrimary}
          />
        </div>
      )}

      {/* Additional signers */}
      {additionalSigners.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Additional Signers ({additionalSigners.length})
          </h3>
          <div className="space-y-3">
            {additionalSigners.map((signer) => (
              <SignerCard
                key={signer.id}
                signer={signer}
                isPrimary={false}
                onRemove={handleRemoveSigner}
                onSetPrimary={handleSetPrimary}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {validators.length === 0 && (
        <div className="text-center py-12">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No signers configured</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding your first authentication method.
          </p>
        </div>
      )}

      {/* Loading overlay */}
      {(isLoading || isRemoving) && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <p className="ml-3 text-sm text-gray-900">
                {isRemoving ? 'Removing signer...' : 'Processing...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add signer modal */}
      <AddSignerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSigner={handleAddSigner}
        existingSigners={validators}
      />
    </div>
  )
}

export default SignerManagement
