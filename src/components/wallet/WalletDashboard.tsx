'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWallet } from '@/contexts/WalletContext'
import WalletBalance from './WalletBalance'
import TransactionHistory from './TransactionHistory'
import AccountInfo from './AccountInfo'
import SendTransaction from './SendTransaction'
import MintNFT from './MintNFT'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import {
  ArrowRightOnRectangleIcon,
  EyeIcon,
  EyeSlashIcon,
  Cog6ToothIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

const WalletDashboard: React.FC = () => {
  const { logout, username, authMethod, validators, isMultiSig } = useAuth()
  const { address, isConnected } = useWallet()
  const [showBalance, setShowBalance] = useState(true)
  const [showSendModal, setShowSendModal] = useState(false)
  const [showMintModal, setShowMintModal] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  const toggleBalanceVisibility = () => {
    setShowBalance(!showBalance)
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Wallet Not Connected</h2>
          <p className="text-gray-600">Please authenticate to access your wallet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">ZeroWallet</h1>
              <div className="ml-4 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                {authMethod === 'passkey' ? '🔐 Passkey' :
                 authMethod === 'multi-sig' ? '🛡️ Multi-Sig' : '👤 Social'}
              </div>
              {isMultiSig && (
                <div className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {validators.length} signers
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {username}
              </span>
              
              <button
                onClick={toggleBalanceVisibility}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-md"
                title={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
              
              <Link href="/security">
                <Button variant="ghost" size="sm">
                  <ShieldCheckIcon className="h-4 w-4 mr-2" />
                  Security
                </Button>
              </Link>

              <Button variant="ghost" size="sm">
                <Cog6ToothIcon className="h-4 w-4 mr-2" />
                Settings
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Balance and Quick Actions */}
          <div className="lg:col-span-2 space-y-6">
            <WalletBalance
              showBalance={showBalance}
              onToggleBalance={toggleBalanceVisibility}
              onSendClick={() => setShowSendModal(true)}
            />
            
            <TransactionHistory />
          </div>

          {/* Right Column - Account Info */}
          <div className="space-y-6">
            <AccountInfo />
            
            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowSendModal(true)}
                >
                  💸 Send Tokens
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  📥 Receive Tokens
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  🔄 Swap Tokens
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setShowMintModal(true)}
                >
                  🎨 Mint NFT (Demo)
                </Button>
              </div>
            </div>

            {/* Network Info */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Network</h3>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Sepolia Testnet</p>
                  <p className="text-xs text-gray-500">Connected</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <SendTransaction
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
      />
      <MintNFT
        isOpen={showMintModal}
        onClose={() => setShowMintModal(false)}
      />
    </div>
  )
}

export default WalletDashboard
