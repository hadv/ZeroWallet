'use client'

import React from 'react'
import { formatEther } from 'viem'
import { useWallet } from '@/contexts/WalletContext'
import { ArrowPathIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'

interface WalletBalanceProps {
  showBalance?: boolean
  onToggleBalance?: () => void
  onSendClick?: () => void
}

const WalletBalance: React.FC<WalletBalanceProps> = ({
  showBalance = true,
  onToggleBalance,
  onSendClick,
}) => {
  const { balance, isLoading, refreshBalance } = useWallet()

  const formatBalance = (balance: string) => {
    try {
      const ethBalance = formatEther(BigInt(balance))
      return parseFloat(ethBalance).toFixed(4)
    } catch (error) {
      return '0.0000'
    }
  }

  const handleRefresh = async () => {
    try {
      await refreshBalance()
    } catch (error) {
      console.error('Error refreshing balance:', error)
    }
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Wallet Balance</h2>
        <div className="flex items-center space-x-2">
          {onToggleBalance && (
            <button
              onClick={onToggleBalance}
              className="p-1 rounded-md hover:bg-white/20 transition-colors"
              title={showBalance ? 'Hide balance' : 'Show balance'}
            >
              {showBalance ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 rounded-md hover:bg-white/20 transition-colors disabled:opacity-50"
            title="Refresh balance"
          >
            <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold">
            {showBalance ? formatBalance(balance) : '••••'}
          </span>
          <span className="text-lg opacity-80">ETH</span>
        </div>
        
        {showBalance && (
          <div className="text-sm opacity-80">
            ≈ ${(parseFloat(formatBalance(balance)) * 2000).toFixed(2)} USD
          </div>
        )}
      </div>

      <div className="mt-6 flex space-x-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
          onClick={onSendClick}
        >
          Send
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
        >
          Receive
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 bg-white/20 border-white/30 text-white hover:bg-white/30"
        >
          Swap
        </Button>
      </div>
    </div>
  )
}

export default WalletBalance
