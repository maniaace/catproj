/**
 * Frontend cryptographic utilities for secure data handling
 * Note: This provides client-side encryption for sensitive data storage
 */

interface EncryptedData {
  data: string;
  iv: string;
  salt: string;
}

class FrontendCrypto {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;

  /**
   * Generate a cryptographic key from a password
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt sensitive data
   */
  static async encrypt(data: string, password: string): Promise<EncryptedData> {
    try {
      const encoder = new TextEncoder();
      const dataBytes = encoder.encode(data);

      // Generate random salt and IV
      const salt = window.crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Derive key from password and salt
      const key = await this.deriveKey(password, salt);

      // Encrypt the data
      const encryptedBytes = await window.crypto.subtle.encrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        dataBytes
      );

      // Convert to base64 for storage
      const encryptedArray = Array.from(new Uint8Array(encryptedBytes));
      const encryptedData = btoa(String.fromCharCode.apply(null, encryptedArray as any));
      const ivArray = Array.from(iv);
      const ivBase64 = btoa(String.fromCharCode.apply(null, ivArray as any));
      const saltArray = Array.from(salt);
      const saltBase64 = btoa(String.fromCharCode.apply(null, saltArray as any));

      return {
        data: encryptedData,
        iv: ivBase64,
        salt: saltBase64,
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      // Convert from base64
      const dataBytes = new Uint8Array(
        atob(encryptedData.data)
          .split('')
          .map(char => char.charCodeAt(0))
      );
      const iv = new Uint8Array(
        atob(encryptedData.iv)
          .split('')
          .map(char => char.charCodeAt(0))
      );
      const salt = new Uint8Array(
        atob(encryptedData.salt)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Derive key from password and salt
      const key = await this.deriveKey(password, salt);

      // Decrypt the data
      const decryptedBytes = await window.crypto.subtle.decrypt(
        { name: this.ALGORITHM, iv: iv },
        key,
        dataBytes
      );

      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBytes);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
  }

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const randomValues = window.crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomValues, byte => charset[byte % charset.length]).join('');
  }

  /**
   * Hash data for integrity checking
   */
  static async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);
    const hashBytes = await window.crypto.subtle.digest('SHA-256', dataBytes);
    const hashArray = Array.from(new Uint8Array(hashBytes));
    return btoa(String.fromCharCode.apply(null, hashArray as any));
  }
}

/**
 * Secure storage manager for frontend
 */
class SecureStorage {
  private static readonly STORAGE_PREFIX = 'catproj_secure_';
  private static readonly KEY_STORAGE_KEY = 'catproj_master_key';

  /**
   * Store encrypted data in localStorage
   */
  static async store(key: string, data: string, password?: string): Promise<void> {
    try {
      const masterPassword = password || await this.getMasterPassword();
      const encryptedData = await FrontendCrypto.encrypt(data, masterPassword);
      
      const storageKey = this.STORAGE_PREFIX + key;
      localStorage.setItem(storageKey, JSON.stringify(encryptedData));
    } catch (error) {
      console.error('Failed to store encrypted data:', error);
      throw new Error('Failed to store data securely');
    }
  }

  /**
   * Retrieve and decrypt data from localStorage
   */
  static async retrieve(key: string, password?: string): Promise<string | null> {
    try {
      const storageKey = this.STORAGE_PREFIX + key;
      const encryptedDataJson = localStorage.getItem(storageKey);
      
      if (!encryptedDataJson) {
        return null;
      }

      const encryptedData: EncryptedData = JSON.parse(encryptedDataJson);
      const masterPassword = password || await this.getMasterPassword();
      
      return await FrontendCrypto.decrypt(encryptedData, masterPassword);
    } catch (error) {
      console.error('Failed to retrieve encrypted data:', error);
      return null;
    }
  }

  /**
   * Remove encrypted data from storage
   */
  static remove(key: string): void {
    const storageKey = this.STORAGE_PREFIX + key;
    localStorage.removeItem(storageKey);
  }

  /**
   * Clear all encrypted data
   */
  static clearAll(): void {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith(this.STORAGE_PREFIX)
    );
    keys.forEach(key => localStorage.removeItem(key));
  }

  /**
   * Get or prompt for master password
   */
  private static async getMasterPassword(): Promise<string> {
    // In a real application, you might want to:
    // 1. Derive this from user authentication
    // 2. Store securely in session storage
    // 3. Prompt user for password
    
    // For now, use a application-specific key
    return 'catproj_frontend_encryption_key_2024';
  }

  /**
   * Check if secure storage is available
   */
  static isAvailable(): boolean {
    return (
      typeof window !== 'undefined' &&
      'crypto' in window &&
      'subtle' in window.crypto &&
      typeof localStorage !== 'undefined'
    );
  }
}

/**
 * Configuration manager with encryption support
 */
class SecureConfig {
  private static readonly CONFIG_KEY = 'app_config';

  /**
   * Store configuration securely
   */
  static async storeConfig(config: Record<string, any>): Promise<void> {
    if (!SecureStorage.isAvailable()) {
      console.warn('Secure storage not available, storing in plain text');
      localStorage.setItem('app_config_plain', JSON.stringify(config));
      return;
    }

    await SecureStorage.store(this.CONFIG_KEY, JSON.stringify(config));
  }

  /**
   * Retrieve configuration
   */
  static async getConfig(): Promise<Record<string, any> | null> {
    if (!SecureStorage.isAvailable()) {
      const plainConfig = localStorage.getItem('app_config_plain');
      return plainConfig ? JSON.parse(plainConfig) : null;
    }

    const configJson = await SecureStorage.retrieve(this.CONFIG_KEY);
    return configJson ? JSON.parse(configJson) : null;
  }

  /**
   * Update specific configuration value
   */
  static async updateConfig(key: string, value: any): Promise<void> {
    const config = await this.getConfig() || {};
    config[key] = value;
    await this.storeConfig(config);
  }

  /**
   * Get specific configuration value
   */
  static async getConfigValue(key: string): Promise<any> {
    const config = await this.getConfig();
    return config ? config[key] : null;
  }
}

export { FrontendCrypto, SecureStorage, SecureConfig };
export type { EncryptedData };