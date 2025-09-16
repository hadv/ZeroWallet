import { NextRequest, NextResponse } from 'next/server'
import { proposalService } from '@/services/backend/proposalService'
import { authMiddleware } from '@/lib/auth-middleware'

// GET /api/multisig/proposals/[id] - Get specific proposal
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const proposal = await proposalService.getProposal(params.id)
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Check if user has access to this proposal
    const hasAccess = await proposalService.userHasAccess(authResult.userId, params.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: proposal
    })
  } catch (error) {
    console.error('Error fetching proposal:', error)
    return NextResponse.json(
      { error: 'Failed to fetch proposal' },
      { status: 500 }
    )
  }
}

// DELETE /api/multisig/proposals/[id] - Cancel proposal
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await authMiddleware(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 })
    }

    const proposal = await proposalService.getProposal(params.id)
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    // Only creator can cancel
    if (proposal.createdBy !== authResult.userId) {
      return NextResponse.json({ error: 'Only creator can cancel proposal' }, { status: 403 })
    }

    if (proposal.status !== 'pending') {
      return NextResponse.json({ error: 'Can only cancel pending proposals' }, { status: 400 })
    }

    await proposalService.cancelProposal(params.id)

    return NextResponse.json({
      success: true,
      message: 'Proposal cancelled'
    })
  } catch (error) {
    console.error('Error cancelling proposal:', error)
    return NextResponse.json(
      { error: 'Failed to cancel proposal' },
      { status: 500 }
    )
  }
}
