'use client'

import React, { useState, useEffect } from 'react'
import { GuardianDashboard } from '@/components/GuardianDashboard'
import { SocialRecoveryProvider } from '@/contexts/SocialRecoveryContext'

export default function GuardianDashboardPage() {
  const [guardianInfo, setGuardianInfo] = useState<{
    id: string
    email: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real implementation, this would get guardian info from authentication
    // For now, we'll use mock data or URL parameters
    const mockGuardianInfo = {
      id: 'guardian_123',
      email: 'guardian@example.com'
    }
    
    setGuardianInfo(mockGuardianInfo)
    setIsLoading(false)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!guardianInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Guardian Access Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please log in as a guardian to access this dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <SocialRecoveryProvider>
      <GuardianDashboard 
        guardianId={guardianInfo.id} 
        guardianEmail={guardianInfo.email} 
      />
    </SocialRecoveryProvider>
  )
}
