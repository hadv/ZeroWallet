// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Polyfills for Node.js environment
global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

// Mock WebSocket for tests
global.WebSocket = class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1 // OPEN
    this.onopen = null
    this.onmessage = null
    this.onclose = null
    this.onerror = null
  }

  send(data) {
    console.log('Mock WebSocket send:', data)
  }

  close() {
    console.log('Mock WebSocket close')
    if (this.onclose) {
      this.onclose()
    }
  }
}

// Mock navigator.credentials for passkey tests
global.navigator = {
  ...global.navigator,
  credentials: {
    create: jest.fn(),
    get: jest.fn(),
  },
  userAgent: 'Jest Test Environment'
}

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock fetch
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}
