'use client'

import React, { useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import { encodeFunctionData } from 'viem'
import { TEST_NFT_ABI, contractAddresses } from '@/constants'
import { config, getCurrentChain } from '@/config'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface MintNFTProps {
  isOpen: boolean
  onClose: () => void
}

const MintNFT: React.FC<MintNFTProps> = ({ isOpen, onClose }) => {
  const { sendUserOperation, address, isLoading } = useWallet()
  const [isMinting, setIsMinting] = useState(false)

  const handleMint = async () => {
    if (!address) {
      console.error('No wallet address available')
      return
    }

    setIsMinting(true)

    try {
      const chain = getCurrentChain()
      const contractAddress = contractAddresses[chain.id]?.testNFT

      if (!contractAddress) {
        throw new Error('Test NFT contract not available on this network')
      }

      // Encode the mint function call
      const callData = encodeFunctionData({
        abi: TEST_NFT_ABI,
        functionName: 'mint',
        args: [address],
      })

      // Send user operation
      const hash = await sendUserOperation([
        {
          to: contractAddress as `0x${string}`,
          data: callData,
        },
      ])

      console.log('NFT mint transaction sent:', hash)
      onClose()
    } catch (error) {
      console.error('Error minting NFT:', error)
    } finally {
      setIsMinting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mint Demo NFT" size="md">
      <div className="space-y-6">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <SparklesIcon className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Mint a Demo NFT
          </h3>
          <p className="text-sm text-gray-600">
            This will mint a test NFT to your wallet address using a smart contract interaction.
            The gas fees will be sponsored by ZeroDev!
          </p>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-purple-900 mb-2">NFT Details</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-purple-700">Collection:</span>
              <span className="text-purple-900 font-medium">ZeroWallet Demo NFTs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700">Recipient:</span>
              <span className="text-purple-900 font-mono text-xs">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700">Network:</span>
              <span className="text-purple-900">Sepolia Testnet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-purple-700">Gas Fee:</span>
              <span className="text-green-600 font-medium">Sponsored ✨</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">About Smart Accounts</h4>
          <p className="text-xs text-blue-700">
            This transaction demonstrates the power of smart accounts with ZeroDev:
          </p>
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• Gas fees are sponsored (no ETH needed)</li>
            <li>• Secure transaction signing with your passkey/social login</li>
            <li>• Direct contract interaction without complex setup</li>
          </ul>
        </div>

        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isMinting || isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMint}
            loading={isMinting || isLoading}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Mint NFT
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default MintNFT
