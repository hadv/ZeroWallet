'use client'

import React from 'react'
import { SignerCardProps } from '@/types'
import { 
  KeyIcon, 
  UserIcon, 
  TrashIcon, 
  StarIcon,
  ClockIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'

export function SignerCard({ signer, isPrimary = false, onRemove, onSetPrimary }: SignerCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSignerIcon = () => {
    switch (signer.type) {
      case 'passkey':
        return <KeyIcon className="h-5 w-5" />
      case 'social':
        return <UserIcon className="h-5 w-5" />
      default:
        return <UserIcon className="h-5 w-5" />
    }
  }

  const getSignerTypeLabel = () => {
    switch (signer.type) {
      case 'passkey':
        return 'Passkey'
      case 'social':
        return `Social (${signer.metadata.provider || 'Unknown'})`
      default:
        return 'Unknown'
    }
  }

  const getSignerDescription = () => {
    if (signer.type === 'social') {
      return signer.metadata.email || 'Social login'
    } else if (signer.type === 'passkey') {
      return signer.metadata.passkeyName || 'Biometric authentication'
    }
    return 'Authentication method'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${
            signer.type === 'passkey' 
              ? 'bg-blue-100 text-blue-600' 
              : 'bg-green-100 text-green-600'
          }`}>
            {getSignerIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {signer.name}
              </h3>
              {isPrimary && (
                <div className="flex items-center space-x-1">
                  <StarSolidIcon className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-yellow-600 font-medium">Primary</span>
                </div>
              )}
              {signer.isActive && (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              )}
            </div>
            
            <p className="text-sm text-gray-500 mt-1">
              {getSignerTypeLabel()}
            </p>
            
            <p className="text-xs text-gray-400 mt-1 truncate">
              {getSignerDescription()}
            </p>
            
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
              <div className="flex items-center space-x-1">
                <ClockIcon className="h-3 w-3" />
                <span>Added {formatDate(signer.createdAt)}</span>
              </div>
              {signer.lastUsed && (
                <div className="flex items-center space-x-1">
                  <span>Last used {formatDate(signer.lastUsed)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          {!isPrimary && onSetPrimary && (
            <button
              onClick={() => onSetPrimary(signer.id)}
              className="p-1 text-gray-400 hover:text-yellow-500 transition-colors"
              title="Set as primary signer"
            >
              <StarIcon className="h-4 w-4" />
            </button>
          )}
          
          {!isPrimary && onRemove && (
            <button
              onClick={() => onRemove(signer.id)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="Remove signer"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Additional metadata for debugging/admin */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <details className="text-xs text-gray-400">
            <summary className="cursor-pointer hover:text-gray-600">
              Debug Info
            </summary>
            <div className="mt-2 space-y-1">
              <div>ID: {signer.id}</div>
              {signer.publicKey && (
                <div>Public Key: {signer.publicKey.slice(0, 20)}...</div>
              )}
              <div>Type: {signer.type}</div>
              <div>Active: {signer.isActive ? 'Yes' : 'No'}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

export default SignerCard
