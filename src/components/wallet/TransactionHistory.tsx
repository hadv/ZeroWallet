'use client'

import React from 'react'
import { formatEther } from 'viem'
import { useWallet } from '@/contexts/WalletContext'
import { Transaction } from '@/types'
import {
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'

const TransactionHistory: React.FC = () => {
  const { transactions } = useWallet()

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'confirmed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'confirmed':
        return 'Confirmed'
      case 'failed':
        return 'Failed'
      default:
        return 'Unknown'
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatValue = (value: string) => {
    try {
      const ethValue = formatEther(BigInt(value))
      return parseFloat(ethValue).toFixed(4)
    } catch (error) {
      return '0.0000'
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getExplorerUrl = (hash: string) => {
    // This would be dynamic based on the current network
    return `https://sepolia.etherscan.io/tx/${hash}`
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transaction History</h3>
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <ClockIcon />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Your transaction history will appear here once you start using your wallet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        <span className="text-sm text-gray-500">{transactions.length} transactions</span>
      </div>

      <div className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.hash}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {getStatusIcon(transaction.status)}
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900">
                    To: {formatAddress(transaction.to)}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    transaction.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800'
                      : transaction.status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {getStatusText(transaction.status)}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-sm text-gray-500">
                    {formatTimestamp(transaction.timestamp)}
                  </p>
                  <button
                    onClick={() => window.open(getExplorerUrl(transaction.hash), '_blank')}
                    className="text-blue-500 hover:text-blue-700"
                    title="View on explorer"
                  >
                    <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatValue(transaction.value)} ETH
                </p>
                {transaction.gasUsed && (
                  <p className="text-xs text-gray-500">
                    Gas: {transaction.gasUsed}
                  </p>
                )}
              </div>
              
              <div className="flex-shrink-0">
                <ArrowUpIcon className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {transactions.length > 5 && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            View all transactions
          </button>
        </div>
      )}
    </div>
  )
}

export default TransactionHistory
