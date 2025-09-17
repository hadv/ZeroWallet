import { createHash, randomBytes } from 'crypto'

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return randomBytes(16).toString('hex')
}

/**
 * Hash data using SHA-256
 */
export function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex')
}

/**
 * Simple encryption using Web Crypto API (browser environment)
 * Note: This is a basic implementation. In production, use proper encryption libraries
 */
export async function encryptData(data: string, password: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Node.js environment - return base64 encoded for now
    return Buffer.from(data).toString('base64')
  }

  try {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const passwordBuffer = encoder.encode(password)

    // Generate a key from the password
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    // Generate a random salt
    const salt = window.crypto.getRandomValues(new Uint8Array(16))

    // Derive the key
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    )

    // Generate a random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12))

    // Encrypt the data
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataBuffer
    )

    // Combine salt, iv, and encrypted data
    const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength)
    result.set(salt, 0)
    result.set(iv, salt.length)
    result.set(new Uint8Array(encryptedData), salt.length + iv.length)

    // Return as base64
    return btoa(String.fromCharCode(...result))
  } catch (error) {
    console.error('Encryption failed:', error)
    // Fallback to base64 encoding
    return Buffer.from(data).toString('base64')
  }
}

/**
 * Simple decryption using Web Crypto API (browser environment)
 */
export async function decryptData(encryptedData: string, password: string): Promise<string> {
  if (typeof window === 'undefined') {
    // Node.js environment - return base64 decoded for now
    return Buffer.from(encryptedData, 'base64').toString()
  }

  try {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const passwordBuffer = encoder.encode(password)

    // Decode from base64
    const encryptedBuffer = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))

    // Extract salt, iv, and encrypted data
    const salt = encryptedBuffer.slice(0, 16)
    const iv = encryptedBuffer.slice(16, 28)
    const data = encryptedBuffer.slice(28)

    // Generate key material from password
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )

    // Derive the key
    const key = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    )

    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    )

    return decoder.decode(decryptedData)
  } catch (error) {
    console.error('Decryption failed:', error)
    // Fallback to base64 decoding
    return Buffer.from(encryptedData, 'base64').toString()
  }
}

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureRandom(length: number = 32): string {
  if (typeof window !== 'undefined' && window.crypto) {
    const array = new Uint8Array(length)
    window.crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  } else {
    // Node.js fallback
    return randomBytes(length).toString('hex')
  }
}

/**
 * Create a deterministic hash from multiple inputs
 */
export function createDeterministicHash(...inputs: string[]): string {
  const combined = inputs.join('|')
  return hashData(combined)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

/**
 * Generate a recovery code (human-readable)
 */
export function generateRecoveryCode(): string {
  const words = [
    'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest', 'garden', 'house',
    'island', 'jungle', 'kitten', 'lemon', 'mountain', 'ocean', 'planet', 'queen',
    'river', 'sunset', 'tiger', 'umbrella', 'valley', 'winter', 'yellow', 'zebra'
  ]
  
  const selectedWords = []
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * words.length)
    selectedWords.push(words[randomIndex])
  }
  
  const randomNumber = Math.floor(Math.random() * 9000) + 1000 // 4-digit number
  return `${selectedWords.join('-')}-${randomNumber}`
}

/**
 * Time-based one-time password (TOTP) generation
 * Simple implementation for demonstration
 */
export function generateTOTP(secret: string, timeStep: number = 30): string {
  const time = Math.floor(Date.now() / 1000 / timeStep)
  const hash = hashData(secret + time.toString())
  const code = parseInt(hash.slice(-6), 16) % 1000000
  return code.toString().padStart(6, '0')
}

/**
 * Verify TOTP code
 */
export function verifyTOTP(code: string, secret: string, timeStep: number = 30, window: number = 1): boolean {
  const currentTime = Math.floor(Date.now() / 1000 / timeStep)
  
  for (let i = -window; i <= window; i++) {
    const time = currentTime + i
    const hash = hashData(secret + time.toString())
    const expectedCode = parseInt(hash.slice(-6), 16) % 1000000
    
    if (expectedCode.toString().padStart(6, '0') === code) {
      return true
    }
  }
  
  return false
}

/**
 * Create a signature for recovery approval
 * This is a simplified version - in production, use proper cryptographic signatures
 */
export function createRecoverySignature(
  guardianId: string,
  recoveryRequestId: string,
  timestamp: number,
  secret: string
): string {
  const message = `${guardianId}|${recoveryRequestId}|${timestamp}`
  const signature = hashData(message + secret)
  return signature
}

/**
 * Verify recovery signature
 */
export function verifyRecoverySignature(
  signature: string,
  guardianId: string,
  recoveryRequestId: string,
  timestamp: number,
  secret: string
): boolean {
  const expectedSignature = createRecoverySignature(guardianId, recoveryRequestId, timestamp, secret)
  return signature === expectedSignature
}

/**
 * Generate a secure invitation token
 */
export function generateInvitationToken(): string {
  const timestamp = Date.now().toString(36)
  const random = generateSecureRandom(16)
  return `${timestamp}-${random}`
}

/**
 * Parse invitation token to extract timestamp
 */
export function parseInvitationToken(token: string): { timestamp: number; random: string } | null {
  try {
    const [timestampStr, random] = token.split('-')
    const timestamp = parseInt(timestampStr, 36)
    return { timestamp, random }
  } catch {
    return null
  }
}

/**
 * Check if invitation token is expired
 */
export function isInvitationTokenExpired(token: string, expiryHours: number = 72): boolean {
  const parsed = parseInvitationToken(token)
  if (!parsed) return true
  
  const expiryTime = parsed.timestamp + (expiryHours * 60 * 60 * 1000)
  return Date.now() > expiryTime
}
