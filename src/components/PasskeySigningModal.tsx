'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { 
  FingerPrintIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'

interface PasskeySigningModalProps {
  isOpen: boolean
  onClose: () => void
  onSign: () => Promise<void>
  title?: string
  description?: string
  signerName?: string
}

type SigningState = 'idle' | 'prompting' | 'signing' | 'success' | 'error'

const PasskeySigningModal: React.FC<PasskeySigningModalProps> = ({
  isOpen,
  onClose,
  onSign,
  title = 'Sign with Passkey',
  description = 'Please use your passkey to sign this transaction',
  signerName
}) => {
  const [signingState, setSigningState] = useState<SigningState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setSigningState('idle')
      setError(null)
    }
  }, [isOpen])

  const handleSign = async () => {
    try {
      setSigningState('prompting')
      setError(null)
      
      // Small delay to show the prompting state
      await new Promise(resolve => setTimeout(resolve, 500))
      
      setSigningState('signing')
      await onSign()
      
      setSigningState('success')
      
      // Auto-close after success
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setSigningState('error')
      const errorMessage = err instanceof Error ? err.message : 'Failed to sign with passkey'
      setError(errorMessage)
    }
  }

  const handleClose = () => {
    if (signingState === 'signing' || signingState === 'prompting') {
      // Don't allow closing during signing
      return
    }
    onClose()
  }

  const getStateContent = () => {
    switch (signingState) {
      case 'idle':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <FingerPrintIcon className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 mb-6">{description}</p>
            {signerName && (
              <div className="bg-gray-50 rounded-lg p-3 mb-6">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Signing with:</span> {signerName}
                </p>
              </div>
            )}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSign}
                className="flex-1"
              >
                <FingerPrintIcon className="h-4 w-4 mr-2" />
                Sign with Passkey
              </Button>
            </div>
          </div>
        )

      case 'prompting':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <FingerPrintIcon className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Waiting for Passkey</h3>
            <p className="text-sm text-gray-500 mb-6">
              Please follow the prompts on your device to authenticate with your passkey.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                🔐 Touch your fingerprint sensor, look at your camera, or follow the prompts on your device.
              </p>
            </div>
          </div>
        )

      case 'signing':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <FingerPrintIcon className="h-8 w-8 text-blue-600 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Signing Transaction</h3>
            <p className="text-sm text-gray-500 mb-6">
              Processing your signature...
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Please wait while we process your signature.
              </p>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Successfully Signed</h3>
            <p className="text-sm text-gray-500 mb-6">
              Your transaction has been signed with your passkey.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800">
                ✅ Signature verified and transaction submitted.
              </p>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Signing Failed</h3>
            <p className="text-sm text-gray-500 mb-4">
              There was an error signing with your passkey.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSign}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="" 
      size="md"
      showCloseButton={signingState !== 'signing' && signingState !== 'prompting'}
    >
      {getStateContent()}
    </Modal>
  )
}

export default PasskeySigningModal
