'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { 
  UserPlusIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline'

interface RegisterFormProps {
  onSwitchToLogin: () => void
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const {
    registerWithPasskey,
    validateUsername,
    passkeySupport,
    isLoading,
    error,
    clearError,
  } = useAuth()

  const [username, setUsername] = useState('')
  const [usernameError, setUsernameError] = useState('')

  const handleUsernameChange = (value: string) => {
    setUsername(value)
    setUsernameError('')
    clearError()

    if (value.trim()) {
      const validation = validateUsername(value)
      if (!validation.isValid) {
        setUsernameError(validation.error || 'Invalid username')
      }
    }
  }

  const handleRegister = async () => {
    if (!username.trim()) {
      setUsernameError('Username is required')
      return
    }

    const validation = validateUsername(username)
    if (!validation.isValid) {
      setUsernameError(validation.error || 'Invalid username')
      return
    }

    try {
      clearError()
      await registerWithPasskey(username)
    } catch (error) {
      // Error is handled by the context
    }
  }

  const isFormValid = username.trim() && !usernameError && passkeySupport.isSupported

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <UserPlusIcon className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
          <p className="text-gray-600 mt-2">Set up your secure ZeroWallet</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Passkey Support Check */}
        <div className="mb-6">
          {passkeySupport.isSupported ? (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-green-800">Passkeys Supported</p>
                <p className="text-xs text-green-600">
                  Your device supports secure biometric authentication
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Passkeys Not Supported</p>
                <p className="text-xs text-yellow-600">
                  Please use a modern browser that supports WebAuthn
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Registration Form */}
        <div className="space-y-4">
          <Input
            label="Choose a Username"
            type="text"
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            placeholder="Enter a unique username"
            error={usernameError}
            helperText="This will be your wallet identifier. Choose something memorable."
            disabled={isLoading || !passkeySupport.isSupported}
          />

          {/* Passkey Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <ShieldCheckIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">About Passkeys</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Passkeys use your device&apos;s biometric authentication (Face ID, Touch ID, or Windows Hello)
                  to secure your wallet. No passwords needed!
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleRegister}
            disabled={!isFormValid || isLoading}
            loading={isLoading}
            className="w-full"
          >
            Create Wallet with Passkey
          </Button>
        </div>

        {/* Platform Authenticator Info */}
        {passkeySupport.isSupported && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              {passkeySupport.isPlatformAuthenticatorAvailable
                ? '✅ Platform authenticator available (Touch ID, Face ID, etc.)'
                : '⚠️ Platform authenticator not detected. You may need to use a security key.'}
            </p>
          </div>
        )}

        {/* Switch to Login */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterForm
