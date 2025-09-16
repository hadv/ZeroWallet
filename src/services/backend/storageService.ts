import { Proposal } from './proposalService'

export interface StorageConfig {
  type: 'localStorage' | 'indexedDB' | 'database'
  connectionString?: string
}

class StorageService {
  private config: StorageConfig
  private dbName = 'ZeroWalletMultiSig'
  private dbVersion = 1

  constructor(config: StorageConfig = { type: 'localStorage' }) {
    this.config = config
  }

  /**
   * Save proposals to storage
   */
  async saveProposals(proposals: Proposal[]): Promise<void> {
    switch (this.config.type) {
      case 'localStorage':
        await this.saveToLocalStorage('proposals', proposals)
        break
      case 'indexedDB':
        await this.saveToIndexedDB('proposals', proposals)
        break
      case 'database':
        await this.saveToDatabase('proposals', proposals)
        break
      default:
        throw new Error(`Unsupported storage type: ${this.config.type}`)
    }
  }

  /**
   * Get proposals from storage
   */
  async getProposals(): Promise<Proposal[]> {
    switch (this.config.type) {
      case 'localStorage':
        return await this.getFromLocalStorage('proposals', [])
      case 'indexedDB':
        return await this.getFromIndexedDB('proposals', [])
      case 'database':
        return await this.getFromDatabase('proposals', [])
      default:
        throw new Error(`Unsupported storage type: ${this.config.type}`)
    }
  }

  /**
   * Save validator mappings
   */
  async saveValidatorMappings(mappings: any[]): Promise<void> {
    switch (this.config.type) {
      case 'localStorage':
        await this.saveToLocalStorage('validator_mappings', mappings)
        break
      case 'indexedDB':
        await this.saveToIndexedDB('validator_mappings', mappings)
        break
      case 'database':
        await this.saveToDatabase('validator_mappings', mappings)
        break
    }
  }

  /**
   * Get validator mappings
   */
  async getValidatorMappings(): Promise<any[]> {
    switch (this.config.type) {
      case 'localStorage':
        return await this.getFromLocalStorage('validator_mappings', [])
      case 'indexedDB':
        return await this.getFromIndexedDB('validator_mappings', [])
      case 'database':
        return await this.getFromDatabase('validator_mappings', [])
      default:
        return []
    }
  }

  /**
   * Save to localStorage
   */
  private async saveToLocalStorage(key: string, data: any): Promise<void> {
    try {
      const serialized = JSON.stringify(data)
      localStorage.setItem(`${this.dbName}_${key}`, serialized)
    } catch (error) {
      console.error('Error saving to localStorage:', error)
      throw error
    }
  }

  /**
   * Get from localStorage
   */
  private async getFromLocalStorage(key: string, defaultValue: any): Promise<any> {
    try {
      const stored = localStorage.getItem(`${this.dbName}_${key}`)
      return stored ? JSON.parse(stored) : defaultValue
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return defaultValue
    }
  }

  /**
   * Save to IndexedDB
   */
  private async saveToIndexedDB(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('proposals')) {
          db.createObjectStore('proposals', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('validator_mappings')) {
          db.createObjectStore('validator_mappings', { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        const transaction = db.transaction([storeName], 'readwrite')
        const store = transaction.objectStore(storeName)

        // Clear existing data and add new data
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => {
          if (Array.isArray(data)) {
            data.forEach(item => store.add(item))
          } else {
            store.add(data)
          }
        }

        transaction.oncomplete = () => {
          db.close()
          resolve()
        }

        transaction.onerror = () => {
          db.close()
          reject(transaction.error)
        }
      }
    })
  }

  /**
   * Get from IndexedDB
   */
  private async getFromIndexedDB(storeName: string, defaultValue: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => {
        console.error('IndexedDB error:', request.error)
        resolve(defaultValue)
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('proposals')) {
          db.createObjectStore('proposals', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('validator_mappings')) {
          db.createObjectStore('validator_mappings', { keyPath: 'id' })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        
        if (!db.objectStoreNames.contains(storeName)) {
          db.close()
          resolve(defaultValue)
          return
        }

        const transaction = db.transaction([storeName], 'readonly')
        const store = transaction.objectStore(storeName)
        const getAllRequest = store.getAll()

        getAllRequest.onsuccess = () => {
          db.close()
          resolve(getAllRequest.result || defaultValue)
        }

        getAllRequest.onerror = () => {
          db.close()
          resolve(defaultValue)
        }
      }
    })
  }

  /**
   * Save to database (placeholder for future database integration)
   */
  private async saveToDatabase(table: string, data: any): Promise<void> {
    // This would implement actual database operations
    // For now, fall back to localStorage
    console.log(`Database save not implemented, falling back to localStorage for ${table}`)
    await this.saveToLocalStorage(table, data)
  }

  /**
   * Get from database (placeholder for future database integration)
   */
  private async getFromDatabase(table: string, defaultValue: any): Promise<any> {
    // This would implement actual database operations
    // For now, fall back to localStorage
    console.log(`Database read not implemented, falling back to localStorage for ${table}`)
    return await this.getFromLocalStorage(table, defaultValue)
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    switch (this.config.type) {
      case 'localStorage':
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(this.dbName)) {
            localStorage.removeItem(key)
          }
        })
        break
      case 'indexedDB':
        await this.clearIndexedDB()
        break
      case 'database':
        await this.clearDatabase()
        break
    }
  }

  /**
   * Clear IndexedDB
   */
  private async clearIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName)
      deleteRequest.onsuccess = () => resolve()
      deleteRequest.onerror = () => reject(deleteRequest.error)
    })
  }

  /**
   * Clear database (placeholder)
   */
  private async clearDatabase(): Promise<void> {
    console.log('Database clear not implemented')
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<any> {
    switch (this.config.type) {
      case 'localStorage':
        return this.getLocalStorageStats()
      case 'indexedDB':
        return this.getIndexedDBStats()
      case 'database':
        return this.getDatabaseStats()
      default:
        return {}
    }
  }

  /**
   * Get localStorage statistics
   */
  private getLocalStorageStats(): any {
    let totalSize = 0
    let itemCount = 0

    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.dbName)) {
        totalSize += localStorage.getItem(key)?.length || 0
        itemCount++
      }
    })

    return {
      type: 'localStorage',
      totalSize,
      itemCount,
      maxSize: 5 * 1024 * 1024 // 5MB typical limit
    }
  }

  /**
   * Get IndexedDB statistics
   */
  private async getIndexedDBStats(): Promise<any> {
    // This would require more complex implementation
    return {
      type: 'indexedDB',
      available: 'indexedDB' in window
    }
  }

  /**
   * Get database statistics
   */
  private async getDatabaseStats(): Promise<any> {
    return {
      type: 'database',
      connected: false // Placeholder
    }
  }
}

// Create singleton instance
export const storageService = new StorageService()
export default storageService
