'use client'

import React from 'react'
import { GuardianInvitationAcceptance } from '@/components/GuardianInvitationAcceptance'
import { SocialRecoveryProvider } from '@/contexts/SocialRecoveryContext'

interface GuardianInvitePageProps {
  params: {
    code: string
  }
}

export default function GuardianInvitePage({ params }: GuardianInvitePageProps) {
  return (
    <SocialRecoveryProvider>
      <GuardianInvitationAcceptance invitationCode={params.code} />
    </SocialRecoveryProvider>
  )
}
