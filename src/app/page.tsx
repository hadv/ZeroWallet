'use client'

import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useWallet } from '@/contexts/WalletContext'
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'
import WalletDashboard from '@/components/wallet/WalletDashboard'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const { isConnected } = useWallet()
  const [showRegister, setShowRegister] = useState(false)

  // Show wallet dashboard if authenticated and connected
  if (isAuthenticated && isConnected) {
    return <WalletDashboard />
  }

  // Show authentication forms
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showRegister ? (
          <RegisterForm onSwitchToLogin={() => setShowRegister(false)} />
        ) : (
          <LoginForm onSwitchToRegister={() => setShowRegister(true)} />
        )}
      </div>
    </div>
  )
}
