import { NextRequest } from 'next/server'
import { verify } from 'jsonwebtoken'

export interface AuthResult {
  success: boolean
  userId?: string
  error?: string
  metadata?: any
}

/**
 * Authentication middleware for API routes
 */
export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return {
        success: false,
        error: 'No authorization header provided'
      }
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return {
        success: false,
        error: 'No token provided'
      }
    }

    // For development, we'll use a simple approach
    // In production, you'd verify JWT tokens properly
    const decoded = await verifyToken(token)
    if (!decoded) {
      return {
        success: false,
        error: 'Invalid token'
      }
    }

    return {
      success: true,
      userId: decoded.userId,
      metadata: decoded
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
}

/**
 * Verify JWT token
 */
async function verifyToken(token: string): Promise<any> {
  try {
    // For development, we'll use a simple verification
    // In production, use proper JWT verification with your secret
    const secret = process.env.JWT_SECRET || 'dev-secret-key'
    
    const decoded = verify(token, secret)
    return decoded
  } catch (error) {
    console.error('Token verification error:', error)
    return null
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(userId: string, metadata?: any): string {
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-key'
    const payload = {
      userId,
      ...metadata,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    }

    // In a real app, use a proper JWT library
    const jwt = require('jsonwebtoken')
    return jwt.sign(payload, secret)
  } catch (error) {
    console.error('Token generation error:', error)
    throw error
  }
}

/**
 * Extract user ID from request (for authenticated routes)
 */
export async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authResult = await authMiddleware(request)
  return authResult.success ? authResult.userId || null : null
}

/**
 * Check if user has permission for a resource
 */
export async function checkPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  // Implement permission checking logic here
  // For now, return true for all authenticated users
  return true
}

/**
 * Rate limiting middleware
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  limit: number = 100,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number }> {
  // Simple in-memory rate limiting
  // In production, use Redis or similar
  const ip = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown'
  const key = `rate_limit_${ip}`
  
  // This is a simplified implementation
  // In production, implement proper rate limiting
  return {
    allowed: true,
    remaining: limit
  }
}

/**
 * CORS middleware
 */
export function corsMiddleware(request: NextRequest): Headers {
  const headers = new Headers()
  
  // Set CORS headers
  headers.set('Access-Control-Allow-Origin', '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  headers.set('Access-Control-Max-Age', '86400')
  
  return headers
}

/**
 * Validate API key (alternative auth method)
 */
export async function validateApiKey(apiKey: string): Promise<AuthResult> {
  try {
    // In production, validate against your API key store
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || []
    
    if (validApiKeys.includes(apiKey)) {
      return {
        success: true,
        userId: `api_user_${apiKey.slice(-8)}`,
        metadata: { authMethod: 'api_key' }
      }
    }

    return {
      success: false,
      error: 'Invalid API key'
    }
  } catch (error) {
    return {
      success: false,
      error: 'API key validation failed'
    }
  }
}

/**
 * Session-based authentication
 */
export async function validateSession(sessionId: string): Promise<AuthResult> {
  try {
    // In production, validate against your session store
    // For now, implement a simple check
    if (sessionId && sessionId.length > 10) {
      return {
        success: true,
        userId: `session_user_${sessionId.slice(-8)}`,
        metadata: { authMethod: 'session' }
      }
    }

    return {
      success: false,
      error: 'Invalid session'
    }
  } catch (error) {
    return {
      success: false,
      error: 'Session validation failed'
    }
  }
}

/**
 * Multi-factor authentication check
 */
export async function validateMFA(
  userId: string,
  mfaToken: string
): Promise<boolean> {
  try {
    // In production, validate MFA token
    // For now, return true for development
    return true
  } catch (error) {
    console.error('MFA validation error:', error)
    return false
  }
}

/**
 * Device fingerprinting for security
 */
export function getDeviceFingerprint(request: NextRequest): string {
  const userAgent = request.headers.get('user-agent') || ''
  const acceptLanguage = request.headers.get('accept-language') || ''
  const acceptEncoding = request.headers.get('accept-encoding') || ''
  
  // Create a simple fingerprint
  const fingerprint = Buffer.from(
    `${userAgent}|${acceptLanguage}|${acceptEncoding}`
  ).toString('base64')
  
  return fingerprint
}

/**
 * Log authentication events
 */
export async function logAuthEvent(
  event: 'login' | 'logout' | 'token_refresh' | 'auth_failure',
  userId?: string,
  metadata?: any
): Promise<void> {
  try {
    const logEntry = {
      event,
      userId,
      timestamp: new Date().toISOString(),
      metadata
    }
    
    // In production, send to your logging service
    console.log('Auth event:', logEntry)
  } catch (error) {
    console.error('Error logging auth event:', error)
  }
}
