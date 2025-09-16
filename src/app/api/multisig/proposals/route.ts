import { NextRequest, NextResponse } from 'next/server'
import { Address, Hash } from 'viem'
import { proposalService } from '@/services/backend/proposalService'
import { authMiddleware } from '@/lib/auth-middleware'

export interface CreateProposalRequest {
  to: Address
  value: string
  data?: string
  requiredSignatures: number
  validatorIds: string[]
  expiresIn?: number // seconds
  metadata?: {
    title?: string
    description?: string
    type?: 'transfer' | 'contract_interaction' | 'nft_transfer' | 'token_approval'
  }
}

export interface ProposalResponse {
  id: string
  to: Address
  value: string
  data?: string
  requiredSignatures: number
  collectedSignatures: number
  status: 'pending' | 'executed' | 'expired' | 'cancelled'
  validatorIds: string[]
  signatures: Array<{
    validatorId: string
    signature: string
    signedAt: number
    signerType: 'social' | 'passkey'
  }>
  createdAt: number
  expiresAt?: number
  executedAt?: number
  transactionHash?: Hash
  metadata?: any
}

// GET /api/multisig/proposals - List proposals for user
export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as 'pending' | 'executed' | 'expired' | 'cancelled' | null
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const proposals = await proposalService.getProposalsForUser(
      authResult.userId,
      { status, limit, offset }
    )

    return NextResponse.json({
      success: true,
      data: proposals
    })
  } catch (error) {
    console.error('Error fetching proposals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proposals' },
      { status: 500 }
    )
  }
}

// POST /api/multisig/proposals - Create new proposal
export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const body: CreateProposalRequest = await request.json()

    // Validate request
    if (!body.to || !body.value || !body.requiredSignatures || !body.validatorIds) {
      return NextResponse.json(
        { error: 'Missing required fields: to, value, requiredSignatures, validatorIds' },
        { status: 400 }
      )
    }

    if (body.requiredSignatures > body.validatorIds.length) {
      return NextResponse.json(
        { error: 'Required signatures cannot exceed number of validators' },
        { status: 400 }
      )
    }

    // Create proposal
    const proposal = await proposalService.createProposal({
      createdBy: authResult.userId,
      to: body.to,
      value: body.value,
      data: body.data,
      requiredSignatures: body.requiredSignatures,
      validatorIds: body.validatorIds,
      expiresIn: body.expiresIn || 24 * 60 * 60, // Default 24 hours
      metadata: body.metadata
    })

    // Notify other signers
    await proposalService.notifySigners(proposal.id, body.validatorIds)

    return NextResponse.json({
      success: true,
      data: proposal
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating proposal:', error)
    return NextResponse.json(
      { error: 'Failed to create proposal' },
      { status: 500 }
    )
  }
}
