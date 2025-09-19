import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PasskeySigningModal from '@/components/PasskeySigningModal'

// Mock the UI components
jest.mock('@/components/ui/Modal', () => {
  return function MockModal({ isOpen, children, onClose, showCloseButton }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="modal">
        {showCloseButton && (
          <button onClick={onClose} data-testid="close-button">Close</button>
        )}
        {children}
      </div>
    )
  }
})

jest.mock('@/components/ui/Button', () => {
  return function MockButton({ children, onClick, disabled, loading, ...props }: any) {
    return (
      <button 
        onClick={onClick} 
        disabled={disabled || loading}
        data-testid={props['data-testid'] || 'button'}
        {...props}
      >
        {loading ? 'Loading...' : children}
      </button>
    )
  }
})

describe('PasskeySigningModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSign: jest.fn(),
    title: 'Test Sign',
    description: 'Test description',
    signerName: 'Test Signer'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render in idle state initially', () => {
    render(<PasskeySigningModal {...defaultProps} />)

    expect(screen.getByText('Test Sign')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.getByText('Signing with: Test Signer')).toBeInTheDocument()
    expect(screen.getByText('Sign with Passkey')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should not render when isOpen is false', () => {
    render(<PasskeySigningModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
  })

  it('should call onClose when cancel button is clicked', () => {
    const onClose = jest.fn()
    render(<PasskeySigningModal {...defaultProps} onClose={onClose} />)

    fireEvent.click(screen.getByText('Cancel'))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('should show prompting state when signing starts', async () => {
    const onSign = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    render(<PasskeySigningModal {...defaultProps} onSign={onSign} />)

    fireEvent.click(screen.getByText('Sign with Passkey'))

    await waitFor(() => {
      expect(screen.getByText('Waiting for Passkey')).toBeInTheDocument()
    })

    expect(screen.getByText('Please follow the prompts on your device to authenticate with your passkey.')).toBeInTheDocument()
    expect(screen.getByText('🔐 Touch your fingerprint sensor, look at your camera, or follow the prompts on your device.')).toBeInTheDocument()
  })

  it('should show signing state after prompting', async () => {
    const onSign = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    render(<PasskeySigningModal {...defaultProps} onSign={onSign} />)

    fireEvent.click(screen.getByText('Sign with Passkey'))

    // Wait for prompting state
    await waitFor(() => {
      expect(screen.getByText('Waiting for Passkey')).toBeInTheDocument()
    })

    // Wait for signing state
    await waitFor(() => {
      expect(screen.getByText('Signing Transaction')).toBeInTheDocument()
    }, { timeout: 1000 })

    expect(screen.getByText('Processing your signature...')).toBeInTheDocument()
    expect(screen.getByText('Please wait while we process your signature.')).toBeInTheDocument()
  })

  it('should show success state and auto-close after successful signing', async () => {
    const onSign = jest.fn().mockResolvedValue(undefined)
    const onClose = jest.fn()
    render(<PasskeySigningModal {...defaultProps} onSign={onSign} onClose={onClose} />)

    fireEvent.click(screen.getByText('Sign with Passkey'))

    await waitFor(() => {
      expect(screen.getByText('Successfully Signed')).toBeInTheDocument()
    })

    expect(screen.getByText('Your transaction has been signed with your passkey.')).toBeInTheDocument()
    expect(screen.getByText('✅ Signature verified and transaction submitted.')).toBeInTheDocument()

    // Should auto-close after 1.5 seconds
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
    }, { timeout: 2000 })
  })

  it('should show error state when signing fails', async () => {
    const onSign = jest.fn().mockRejectedValue(new Error('Signing failed'))
    render(<PasskeySigningModal {...defaultProps} onSign={onSign} />)

    fireEvent.click(screen.getByText('Sign with Passkey'))

    await waitFor(() => {
      expect(screen.getByText('Signing Failed')).toBeInTheDocument()
    })

    expect(screen.getByText('There was an error signing with your passkey.')).toBeInTheDocument()
    expect(screen.getByText('Signing failed')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('should allow retry after error', async () => {
    const onSign = jest.fn()
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce(undefined)

    render(<PasskeySigningModal {...defaultProps} onSign={onSign} />)

    // First attempt
    fireEvent.click(screen.getByText('Sign with Passkey'))

    await waitFor(() => {
      expect(screen.getByText('Signing Failed')).toBeInTheDocument()
    })

    // Retry
    fireEvent.click(screen.getByText('Try Again'))

    await waitFor(() => {
      expect(screen.getByText('Successfully Signed')).toBeInTheDocument()
    })

    expect(onSign).toHaveBeenCalledTimes(2)
  })

  it('should not allow closing during signing or prompting', async () => {
    const onSign = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)))
    const onClose = jest.fn()
    render(<PasskeySigningModal {...defaultProps} onSign={onSign} onClose={onClose} />)

    fireEvent.click(screen.getByText('Sign with Passkey'))

    // During prompting state
    await waitFor(() => {
      expect(screen.getByText('Waiting for Passkey')).toBeInTheDocument()
    })

    // Close button should not be visible
    expect(screen.queryByTestId('close-button')).not.toBeInTheDocument()

    // During signing state
    await waitFor(() => {
      expect(screen.getByText('Signing Transaction')).toBeInTheDocument()
    }, { timeout: 1000 })

    // Close button should still not be visible
    expect(screen.queryByTestId('close-button')).not.toBeInTheDocument()
  })

  it('should reset state when modal is reopened', async () => {
    const { rerender } = render(<PasskeySigningModal {...defaultProps} isOpen={false} />)

    // Open modal and trigger error state
    rerender(<PasskeySigningModal {...defaultProps} isOpen={true} onSign={jest.fn().mockRejectedValue(new Error('Error'))} />)
    
    fireEvent.click(screen.getByText('Sign with Passkey'))

    await waitFor(() => {
      expect(screen.getByText('Signing Failed')).toBeInTheDocument()
    })

    // Close and reopen modal
    rerender(<PasskeySigningModal {...defaultProps} isOpen={false} />)
    rerender(<PasskeySigningModal {...defaultProps} isOpen={true} />)

    // Should be back to idle state
    expect(screen.getByText('Test Sign')).toBeInTheDocument()
    expect(screen.getByText('Sign with Passkey')).toBeInTheDocument()
    expect(screen.queryByText('Signing Failed')).not.toBeInTheDocument()
  })

  it('should render without signer name when not provided', () => {
    render(<PasskeySigningModal {...defaultProps} signerName={undefined} />)

    expect(screen.getByText('Test Sign')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
    expect(screen.queryByText('Signing with:')).not.toBeInTheDocument()
  })
})
