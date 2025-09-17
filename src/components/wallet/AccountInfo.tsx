'use client'

import React, { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { useAuth } from '@/contexts/AuthContext'
import { 
  ClipboardIcon, 
  CheckIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  CogIcon 
} from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'

const AccountInfo: React.FC = () => {
  const { address, smartAccount } = useWallet()
  const { username, authMethod, userInfo } = useAuth()
  const [copiedAddress, setCopiedAddress] = useState(false)

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getAuthMethodDisplay = () => {
    switch (authMethod) {
      case 'passkey':
        return {
          icon: <ShieldCheckIcon className="h-5 w-5 text-blue-500" />,
          text: 'Passkey',
          description: 'Secured with biometric authentication'
        }
      case 'social':
        return {
          icon: <UserCircleIcon className="h-5 w-5 text-green-500" />,
          text: 'Social Login',
          description: userInfo?.typeOfLogin ? `Connected via ${userInfo.typeOfLogin}` : 'Social authentication'
        }
      default:
        return {
          icon: <UserCircleIcon className="h-5 w-5 text-gray-500" />,
          text: 'Unknown',
          description: 'Authentication method unknown'
        }
    }
  }

  const authDisplay = getAuthMethodDisplay()

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>
        <Button variant="ghost" size="sm">
          <CogIcon className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      <div className="space-y-4">
        {/* Username/Email */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <UserCircleIcon className="h-8 w-8 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {username || userInfo?.email || 'Anonymous User'}
            </p>
            <p className="text-sm text-gray-500">Account holder</p>
          </div>
        </div>

        {/* Authentication Method */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {authDisplay.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900">{authDisplay.text}</p>
            <p className="text-sm text-gray-500">{authDisplay.description}</p>
          </div>
        </div>

        {/* Wallet Address */}
        {address && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">Wallet Address</p>
                <p className="text-sm text-gray-600 font-mono break-all">
                  {address}
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(address)}
                className="ml-3 flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy address"
              >
                {copiedAddress ? (
                  <CheckIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <ClipboardIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Smart Account Info */}
        {smartAccount && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Smart Account Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Status:</span>
                <span className={`font-medium ${
                  smartAccount.isDeployed ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {smartAccount.isDeployed ? 'Deployed' : 'Not Deployed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Nonce:</span>
                <span className="text-blue-900 font-mono">{smartAccount.nonce}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" className="w-full">
              Export Keys
            </Button>
            <Button variant="outline" size="sm" className="w-full">
              View on Explorer
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountInfo
