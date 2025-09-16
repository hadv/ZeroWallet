'use client'

import React, { useState } from 'react'
import { AddSignerModalProps, AddSignerRequest } from '@/types'
import { 
  XMarkIcon, 
  KeyIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline'

export function AddSignerModal({ 
  isOpen, 
  onClose, 
  onAddSigner, 
  existingSigners 
}: AddSignerModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    username: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Validate form
      if (!formData.name.trim()) {
        throw new Error('Signer name is required')
      }
      
      if (!formData.username.trim()) {
        throw new Error('Username is required for passkey')
      }

      // Check if username already exists
      const existingPasskeys = existingSigners.filter(s => s.type === 'passkey')
      if (existingPasskeys.some(s => s.metadata.passkeyName === formData.username)) {
        throw new Error('A passkey with this username already exists')
      }

      const request: AddSignerRequest = {
        type: 'passkey',
        name: formData.name.trim(),
        username: formData.username.trim(),
      }

      await onAddSigner(request)
      
      // Reset form and close modal
      setFormData({ name: '', username: '' })
      onClose()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add signer'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ name: '', username: '' })
      setError(null)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={handleClose}
              disabled={isLoading}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <KeyIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-base font-semibold leading-6 text-gray-900">
                Add Passkey Signer
              </h3>
              
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Add a passkey as an additional signer to enable multi-signature security for your wallet.
                </p>
              </div>

              {/* Info box */}
              <div className="mt-4 rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm text-blue-700">
                      After adding this passkey, transactions will require signatures from multiple signers for enhanced security.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="signer-name" className="block text-sm font-medium text-gray-700">
                    Signer Name
                  </label>
                  <input
                    type="text"
                    id="signer-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., My Phone, Backup Key"
                    disabled={isLoading}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    A friendly name to identify this signer
                  </p>
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., backup-key-2024"
                    disabled={isLoading}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Unique identifier for this passkey (3-50 characters, alphanumeric, underscore, hyphen)
                  </p>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Adding...' : 'Add Passkey'}
                  </button>
                  
                  <button
                    type="button"
                    className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddSignerModal
