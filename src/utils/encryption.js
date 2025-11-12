const crypto = require('crypto');

/**
 * Encryption utility for sensitive legal data
 * Uses AES-256-GCM (Galois/Counter Mode) for authenticated encryption
 * 
 * CRITICAL: Set ENCRYPTION_KEY in .env (32 bytes = 64 hex characters)
 * Generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const SALT_LENGTH = 32; // 32 bytes for key derivation

/**
 * Get encryption key from environment variable
 * Falls back to a default key for development (NEVER use in production)
 */
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    console.warn('⚠️  WARNING: ENCRYPTION_KEY not set in environment variables!');
    console.warn('⚠️  Using default key - DO NOT use in production!');
    // Default key for development only
    return Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex');
  }
  
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  
  return Buffer.from(key, 'hex');
};

/**
 * Encrypt sensitive data
 * @param {string} plaintext - Data to encrypt
 * @returns {object} - { encrypted, iv, authTag } all as hex strings
 */
const encryptData = (plaintext) => {
  try {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty data');
    }

    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Get encryption key
    const key = getEncryptionKey();
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    console.error('❌ Encryption failed:', error.message);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt sensitive data
 * @param {object} encryptedData - { encrypted, iv, authTag } all as hex strings
 * @returns {string} - Decrypted plaintext
 */
const decryptData = (encryptedData) => {
  try {
    if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
      throw new Error('Invalid encrypted data structure');
    }

    // Convert hex strings to buffers
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    // Get encryption key
    const key = getEncryptionKey();
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption failed:', error.message);
    throw new Error('Decryption failed - data may be corrupted or tampered with');
  }
};

/**
 * Hash data (one-way, for passwords, etc.)
 * Uses SHA-256
 * @param {string} data - Data to hash
 * @returns {string} - Hex hash
 */
const hashData = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Generate random token (for reset tokens, etc.)
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} - Hex token
 */
const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Compare timing-safe strings (prevents timing attacks)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {boolean} - True if equal
 */
const timingSafeEqual = (a, b) => {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    
    if (bufA.length !== bufB.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

/**
 * Encrypt file buffer (for document encryption)
 * @param {Buffer} fileBuffer - File buffer to encrypt
 * @returns {object} - { encrypted, iv, authTag } all as base64 strings
 */
const encryptFile = (fileBuffer) => {
  try {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Invalid file buffer');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  } catch (error) {
    console.error('❌ File encryption failed:', error.message);
    throw new Error('File encryption failed');
  }
};

/**
 * Decrypt file buffer
 * @param {object} encryptedData - { encrypted, iv, authTag } all as base64 strings
 * @returns {Buffer} - Decrypted file buffer
 */
const decryptFile = (encryptedData) => {
  try {
    if (!encryptedData || !encryptedData.encrypted || !encryptedData.iv || !encryptedData.authTag) {
      throw new Error('Invalid encrypted file data structure');
    }

    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    return decrypted;
  } catch (error) {
    console.error('❌ File decryption failed:', error.message);
    throw new Error('File decryption failed - file may be corrupted or tampered with');
  }
};

module.exports = {
  encryptData,
  decryptData,
  hashData,
  generateToken,
  timingSafeEqual,
  encryptFile,
  decryptFile,
};
