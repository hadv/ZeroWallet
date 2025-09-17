'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { SOCIAL_PROVIDERS } from '@/constants'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { 
  KeyIcon, 
  EnvelopeIcon,
  ShieldCheckIcon,
  UserCircleIcon 
} from '@heroicons/react/24/outline'

interface LoginFormProps {
  onSwitchToRegister: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const {
    loginWithPasskey,
    loginWithEmail,
    loginWithSocial,
    availableUsernames,
    socialProviders,
    passkeySupport,
    isLoading,
    error,
    clearError,
  } = useAuth()

  const [loginMethod, setLoginMethod] = useState<'passkey' | 'email' | 'social'>('passkey')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')

  const handlePasskeyLogin = async () => {
    if (!username.trim()) {
      return
    }

    try {
      clearError()
      await loginWithPasskey(username)
    } catch (error) {
      // Error is handled by the context
    }
  }

  const handleEmailLogin = async () => {
    if (!email.trim()) {
      return
    }

    try {
      clearError()
      await loginWithEmail(email)
    } catch (error) {
      // Error is handled by the context
    }
  }

  const handleSocialLogin = async (provider?: 'google' | 'github' | 'twitter' | 'discord') => {
    try {
      clearError()
      await loginWithSocial()
    } catch (error) {
      // Error is handled by the context
    }
  }

  const getSocialProviderIcon = (providerId: string) => {
    const icons: Record<string, string> = {
      google: '🔍',
      github: '🐙',
      twitter: '🐦',
      discord: '🎮',
    }
    return icons[providerId] || '🔗'
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <KeyIcon className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to your ZeroWallet</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Login Method Tabs */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setLoginMethod('passkey')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              loginMethod === 'passkey'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShieldCheckIcon className="h-4 w-4 inline mr-1" />
            Passkey
          </button>
          <button
            onClick={() => setLoginMethod('email')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              loginMethod === 'email'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <EnvelopeIcon className="h-4 w-4 inline mr-1" />
            Email
          </button>
          <button
            onClick={() => setLoginMethod('social')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              loginMethod === 'social'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserCircleIcon className="h-4 w-4 inline mr-1" />
            Social
          </button>
        </div>

        {/* Passkey Login */}
        {loginMethod === 'passkey' && (
          <div className="space-y-4">
            {!passkeySupport.isSupported && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-600">
                  Passkeys are not supported in your current browser. Please use a modern browser or try email login.
                </p>
              </div>
            )}

            <div>
              <Input
                label="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading || !passkeySupport.isSupported}
              />
              
              {availableUsernames.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Available usernames:</p>
                  <div className="flex flex-wrap gap-1">
                    {availableUsernames.slice(0, 3).map((name) => (
                      <button
                        key={name}
                        onClick={() => setUsername(name)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handlePasskeyLogin}
              disabled={!username.trim() || isLoading || !passkeySupport.isSupported}
              loading={isLoading}
              className="w-full"
            >
              Sign in with Passkey
            </Button>
          </div>
        )}

        {/* Email Login */}
        {loginMethod === 'email' && (
          <div className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={isLoading}
            />

            <Button
              onClick={handleEmailLogin}
              disabled={!email.trim() || isLoading}
              loading={isLoading}
              className="w-full"
            >
              Sign in with Email
            </Button>
          </div>
        )}

        {/* Social Login */}
        {loginMethod === 'social' && (
          <div className="space-y-3">
            <Button
              onClick={() => handleSocialLogin()}
              disabled={isLoading}
              variant="outline"
              className="w-full justify-center"
            >
              <span className="mr-2">🔐</span>
              Continue with Web3Auth
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Web3Auth supports Google, GitHub, Twitter, Discord, and more social providers
            </p>
          </div>
        )}

        {/* Switch to Register */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
