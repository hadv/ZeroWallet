import { NextRequest, NextResponse } from 'next/server'
import { proposalService } from '@/services/backend/proposalService'
import { signatureService } from '@/services/backend/signatureService'
import { authMiddleware } from '@/lib/auth-middleware'

export interface SignProposalRequest {
  validatorId: string
  signature: string
  signerType: 'social' | 'passkey'
  metadata?: {
    deviceInfo?: string
    userAgent?: string
    timestamp?: number
  }
}

// POST /api/multisig/proposals/[id]/sign - Sign a proposal
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const body: SignProposalRequest = await request.json()

    // Validate request
    if (!body.validatorId || !body.signature || !body.signerType) {
      return NextResponse.json(
        { error: 'Missing required fields: validatorId, signature, signerType' },
        { status: 400 }
      )
    }

    const proposal = await proposalService.getProposal(params.id)
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Check if proposal is still pending
    if (proposal.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot sign ${proposal.status} proposal` },
        { status: 400 }
      )
    }

    // Check if proposal has expired
    if (proposal.expiresAt && Date.now() > proposal.expiresAt) {
      await proposalService.expireProposal(params.id)
      return NextResponse.json(
        { error: 'Proposal has expired' },
        { status: 400 }
      )
    }

    // Check if validator is authorized for this proposal
    if (!proposal.validatorIds.includes(body.validatorId)) {
      return NextResponse.json(
        { error: 'Validator not authorized for this proposal' },
        { status: 403 }
      )
    }

    // Check if already signed by this validator
    const existingSignature = proposal.signatures.find(
      sig => sig.validatorId === body.validatorId
    )
    if (existingSignature) {
      return NextResponse.json(
        { error: 'Already signed by this validator' },
        { status: 400 }
      )
    }

    // Verify signature
    const isValidSignature = await signatureService.verifySignature({
      proposalId: params.id,
      validatorId: body.validatorId,
      signature: body.signature,
      signerType: body.signerType,
      proposalData: {
        to: proposal.to,
        value: proposal.value,
        data: proposal.data
      }
    })

    if (!isValidSignature) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // Add signature to proposal
    const updatedProposal = await proposalService.addSignature(params.id, {
      validatorId: body.validatorId,
      signature: body.signature,
      signedAt: Date.now(),
      signerType: body.signerType,
      signedBy: authResult.userId,
      metadata: body.metadata
    })

    // Check if we have enough signatures to execute
    if (updatedProposal.collectedSignatures >= updatedProposal.requiredSignatures) {
      try {
        // Execute the transaction
        const executionResult = await proposalService.executeProposal(params.id)
        
        return NextResponse.json({
          success: true,
          data: {
            proposal: updatedProposal,
            executed: true,
            transactionHash: executionResult.transactionHash
          }
        })
      } catch (executionError) {
        console.error('Error executing proposal:', executionError)
        
        // Mark proposal as failed but return the signature success
        await proposalService.markProposalFailed(params.id, executionError)
        
        return NextResponse.json({
          success: true,
          data: {
            proposal: updatedProposal,
            executed: false,
            error: 'Transaction execution failed'
          }
        })
      }
    }

    // Notify other signers about the new signature
    await proposalService.notifySignatureAdded(params.id, body.validatorId)

    return NextResponse.json({
      success: true,
      data: {
        proposal: updatedProposal,
        executed: false
      }
    })
  } catch (error) {
    console.error('Error signing proposal:', error)
    return NextResponse.json(
      { error: 'Failed to sign proposal' },
      { status: 500 }
    )
  }
}
