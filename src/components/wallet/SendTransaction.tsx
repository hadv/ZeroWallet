'use client'

import React, { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { isAddress, parseEther } from 'viem'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'

interface SendTransactionProps {
  isOpen: boolean
  onClose: () => void
}

const SendTransaction: React.FC<SendTransactionProps> = ({ isOpen, onClose }) => {
  const { sendTransaction, isLoading } = useWallet()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [recipientError, setRecipientError] = useState('')
  const [amountError, setAmountError] = useState('')

  const validateRecipient = (address: string) => {
    if (!address.trim()) {
      setRecipientError('Recipient address is required')
      return false
    }
    
    if (!isAddress(address)) {
      setRecipientError('Invalid Ethereum address')
      return false
    }
    
    setRecipientError('')
    return true
  }

  const validateAmount = (value: string) => {
    if (!value.trim()) {
      setAmountError('Amount is required')
      return false
    }
    
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue <= 0) {
      setAmountError('Amount must be a positive number')
      return false
    }
    
    setAmountError('')
    return true
  }

  const handleSend = async () => {
    const isRecipientValid = validateRecipient(recipient)
    const isAmountValid = validateAmount(amount)
    
    if (!isRecipientValid || !isAmountValid) {
      return
    }

    try {
      const hash = await sendTransaction(recipient as `0x${string}`, amount)
      console.log('Transaction sent:', hash)
      
      // Reset form and close modal
      setRecipient('')
      setAmount('')
      onClose()
    } catch (error) {
      console.error('Error sending transaction:', error)
    }
  }

  const handleClose = () => {
    setRecipient('')
    setAmount('')
    setRecipientError('')
    setAmountError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Send Transaction" size="md">
      <div className="space-y-6">
        <div>
          <Input
            label="Recipient Address"
            type="text"
            value={recipient}
            onChange={(e) => {
              setRecipient(e.target.value)
              if (recipientError) validateRecipient(e.target.value)
            }}
            onBlur={() => validateRecipient(recipient)}
            placeholder="0x..."
            error={recipientError}
            helperText="Enter the Ethereum address of the recipient"
          />
        </div>

        <div>
          <Input
            label="Amount (ETH)"
            type="number"
            step="0.0001"
            min="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              if (amountError) validateAmount(e.target.value)
            }}
            onBlur={() => validateAmount(amount)}
            placeholder="0.0"
            error={amountError}
            helperText="Amount of ETH to send"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Transaction Details</h4>
          <div className="space-y-1 text-sm text-blue-700">
            <div className="flex justify-between">
              <span>Network:</span>
              <span>Sepolia Testnet</span>
            </div>
            <div className="flex justify-between">
              <span>Gas Fee:</span>
              <span className="text-green-600">Sponsored ✨</span>
            </div>
            <div className="flex justify-between">
              <span>Total Cost:</span>
              <span>{amount || '0'} ETH</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            loading={isLoading}
            disabled={!recipient || !amount || !!recipientError || !!amountError}
            className="flex-1"
          >
            <PaperAirplaneIcon className="h-4 w-4 mr-2" />
            Send Transaction
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default SendTransaction
