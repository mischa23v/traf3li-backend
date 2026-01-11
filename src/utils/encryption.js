const crypto = require('crypto');
const bcrypt = require('bcrypt');
const logger = require('./logger');

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
const BCRYPT_ROUNDS = 12; // Bcrypt salt rounds

// ============================================
// PER-TENANT KEY DERIVATION (CVE-2025-0663 FIX)
// Each tenant gets a unique derived key via HKDF
// ============================================
const TENANT_KEY_SALT = Buffer.from('traf3li-tenant-key-v1', 'utf8');
const TENANT_KEY_CACHE = new Map(); // Cache derived keys for performance

/**
 * Get encryption key from environment variable
 * Throws error if key is not set or invalid (security requirement)
 */
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY is not set in environment variables. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). ' +
      'Current length: ' + key.length + '. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // Validate it's valid hex
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      'ENCRYPTION_KEY must contain only hexadecimal characters (0-9, a-f, A-F). ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  return Buffer.from(key, 'hex');
};

/**
 * Derive per-tenant encryption key using HKDF-SHA256
 * This ensures each tenant's data is encrypted with a unique key
 * SECURITY: Fixes CVE-2025-0663 pattern (single key across all tenants)
 *
 * @param {string|null} tenantId - firmId or lawyerId (24-char hex ObjectId), null for system-level
 * @returns {Buffer} - 32-byte derived key unique to this tenant
 */
const deriveTenantKey = (tenantId) => {
  // System-level encryption (no tenant context)
  if (!tenantId) {
    return getEncryptionKey();
  }

  // Check cache first (HKDF is CPU-intensive)
  const cacheKey = String(tenantId);
  if (TENANT_KEY_CACHE.has(cacheKey)) {
    return TENANT_KEY_CACHE.get(cacheKey);
  }

  const masterKey = getEncryptionKey();
  const info = Buffer.from(`tenant:${tenantId}`, 'utf8');

  // HKDF-SHA256: deterministic key derivation (RFC 5869)
  // Same tenantId always produces same derived key
  const derivedKey = crypto.hkdfSync('sha256', masterKey, TENANT_KEY_SALT, info, 32);

  // Cache for performance (keys are deterministic, safe to cache)
  TENANT_KEY_CACHE.set(cacheKey, derivedKey);

  // Limit cache size to prevent memory issues
  if (TENANT_KEY_CACHE.size > 1000) {
    const firstKey = TENANT_KEY_CACHE.keys().next().value;
    TENANT_KEY_CACHE.delete(firstKey);
  }

  return derivedKey;
};

/**
 * Clear tenant key cache (for testing or key rotation)
 */
const clearTenantKeyCache = () => {
  TENANT_KEY_CACHE.clear();
};

/**
 * Encrypt with per-tenant key (v2 format)
 * Format: v2:tenantId:iv:authTag:encrypted
 *
 * @param {string} plaintext - Data to encrypt
 * @param {string|null} tenantId - firmId or lawyerId for key derivation
 * @returns {string} - Encrypted string in v2 format
 */
const encryptWithTenant = (plaintext, tenantId = null) => {
  if (!plaintext) return null;

  try {
    const key = deriveTenantKey(tenantId);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(String(plaintext), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // v2 format includes tenantId for key derivation on decrypt
    const tenantMarker = tenantId || 'system';
    return `v2:${tenantMarker}:${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    logger.error('Tenant encryption failed:', error.message);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt with automatic format detection (v1 or v2)
 * - v2 format: v2:tenantId:iv:authTag:encrypted (uses per-tenant key)
 * - v1 format: iv:authTag:encrypted (uses global key for backwards compatibility)
 *
 * @param {string} ciphertext - Encrypted string
 * @param {string|null} tenantId - Optional tenantId for v1 format migration
 * @returns {string} - Decrypted plaintext
 */
const decryptWithTenant = (ciphertext, tenantId = null) => {
  if (!ciphertext) return null;

  try {
    const parts = ciphertext.split(':');

    // v2 format: v2:tenantId:iv:authTag:encrypted
    if (parts[0] === 'v2' && parts.length === 5) {
      const [, storedTenantId, ivHex, authTagHex, encrypted] = parts;
      const effectiveTenantId = storedTenantId === 'system' ? null : storedTenantId;
      const key = deriveTenantKey(effectiveTenantId);

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    }

    // v1 format (legacy): iv:authTag:encrypted - use global key
    if (parts.length === 3) {
      const [ivHex, authTagHex, encrypted] = parts;
      const key = getEncryptionKey(); // Global key for backwards compatibility

      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      // Log migration opportunity (non-blocking)
      if (tenantId) {
        logger.debug(`Legacy v1 encryption detected for tenant ${tenantId} - will upgrade on next save`);
      }

      return decrypted;
    }

    throw new Error('Invalid encrypted data format');
  } catch (error) {
    logger.error('Tenant decryption failed:', error.message);
    throw new Error('Decryption failed - data may be corrupted or tampered with');
  }
};

/**
 * Check if ciphertext is v2 format (per-tenant encrypted)
 * @param {string} ciphertext - Encrypted string
 * @returns {boolean} - True if v2 format
 */
const isV2Format = (ciphertext) => {
  if (!ciphertext || typeof ciphertext !== 'string') return false;
  return ciphertext.startsWith('v2:');
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
    logger.error('Encryption failed:', error.message);
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
    logger.error('Decryption failed:', error.message);
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
    logger.error('File encryption failed:', error.message);
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
    logger.error('File decryption failed:', error.message);
    throw new Error('File decryption failed - file may be corrupted or tampered with');
  }
};

/**
 * Encrypt plaintext with AES-256-GCM (convenience wrapper)
 * Returns a single encrypted string with format: iv:authTag:encrypted
 * @param {string} plaintext - Data to encrypt
 * @returns {string} - Encrypted string in format "iv:authTag:encrypted"
 */
const encrypt = (plaintext) => {
  if (!plaintext) return null;

  try {
    const { encrypted, iv, authTag } = encryptData(String(plaintext));
    return `${iv}:${authTag}:${encrypted}`;
  } catch (error) {
    logger.error('Encryption error:', error.message);
    throw error;
  }
};

/**
 * Decrypt ciphertext (convenience wrapper)
 * Accepts format: iv:authTag:encrypted
 * @param {string} ciphertext - Encrypted string
 * @returns {string} - Decrypted plaintext
 */
const decrypt = (ciphertext) => {
  if (!ciphertext) return null;

  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [iv, authTag, encrypted] = parts;
    return decryptData({ iv, authTag, encrypted });
  } catch (error) {
    logger.error('Decryption error:', error.message);
    throw error;
  }
};

/**
 * Hash data with SHA-256 (convenience wrapper)
 * @param {string} data - Data to hash
 * @returns {string} - Hex hash
 */
const hash = (data) => {
  if (!data) return null;
  return hashData(String(data));
};

/**
 * Hash password using bcrypt
 * @param {string} password - Password to hash
 * @returns {Promise<string>} - Bcrypt hash
 */
const hashPassword = async (password) => {
  if (!password) {
    throw new Error('Password is required');
  }

  try {
    return await bcrypt.hash(password, BCRYPT_ROUNDS);
  } catch (error) {
    logger.error('Password hashing error:', error.message);
    throw new Error('Password hashing failed');
  }
};

/**
 * Verify password against bcrypt hash
 * @param {string} password - Plain password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>} - True if password matches
 */
const verifyPassword = async (password, hash) => {
  if (!password || !hash) return false;

  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    logger.error('Password verification error:', error.message);
    return false;
  }
};

/**
 * Generate random encryption key
 * @param {number} length - Key length in bytes (default: 32)
 * @returns {string} - Hex-encoded key
 */
const generateKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Encrypt field value for Mongoose schema
 * Returns encrypted object suitable for storage
 * @param {*} value - Value to encrypt
 * @returns {object|null} - { encrypted, iv, authTag } or null if no value
 */
const encryptField = (value) => {
  if (!value) return null;

  try {
    const plaintext = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return encryptData(plaintext);
  } catch (error) {
    logger.error('Field encryption error:', error.message);
    throw error;
  }
};

/**
 * Decrypt field value from Mongoose schema
 * Returns decrypted value (parses JSON if applicable)
 * @param {object} encryptedValue - Encrypted object { encrypted, iv, authTag }
 * @returns {*} - Decrypted value (parsed if JSON)
 */
const decryptField = (encryptedValue) => {
  if (!encryptedValue || !encryptedValue.encrypted) return null;

  try {
    const decrypted = decryptData(encryptedValue);

    // Try to parse as JSON if it looks like JSON
    if (decrypted.startsWith('{') || decrypted.startsWith('[')) {
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    }

    return decrypted;
  } catch (error) {
    logger.error('Field decryption error:', error.message);
    return null;
  }
};

/**
 * Create searchable hash for encrypted field
 * Used to create indexed search values for encrypted fields
 * @param {string} value - Value to hash
 * @returns {string} - SHA-256 hash
 */
const createSearchableHash = (value) => {
  if (!value) return null;

  // Use HMAC for searchable hashing to add extra security
  const key = getEncryptionKey();
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(String(value));
  return hmac.digest('hex');
};

/**
 * Mask sensitive data for display (e.g., credit card, ID numbers)
 * @param {string} value - Value to mask
 * @param {number} visibleChars - Number of characters to show at end (default: 4)
 * @returns {string} - Masked value
 */
const maskValue = (value, visibleChars = 4) => {
  if (!value) return '';

  const str = String(value);
  if (str.length <= visibleChars) return '*'.repeat(str.length);

  const masked = '*'.repeat(str.length - visibleChars);
  return masked + str.slice(-visibleChars);
};

/**
 * Sanitize log data by masking sensitive fields
 * @param {object} data - Object to sanitize
 * @param {array} sensitiveFields - Field names to mask (default: common sensitive fields)
 * @returns {object} - Sanitized copy
 */
const sanitizeForLog = (data, sensitiveFields = []) => {
  if (!data || typeof data !== 'object') return data;

  const defaultSensitiveFields = [
    'password',
    'passwordHash',
    'secret',
    'token',
    'apiKey',
    'nationalId',
    'iban',
    'bankAccount',
    'cardNumber',
    'cvv',
    'ssn',
    'salary',
    'encryptionKey'
  ];

  const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];
  const sanitized = { ...data };

  for (const field of allSensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }

  return sanitized;
};

module.exports = {
  // Original functions
  encryptData,
  decryptData,
  hashData,
  generateToken,
  timingSafeEqual,
  encryptFile,
  decryptFile,

  // New convenience functions
  encrypt,
  decrypt,
  hash,
  hashPassword,
  verifyPassword,
  generateKey,

  // Per-tenant encryption (CVE-2025-0663 fix)
  deriveTenantKey,
  encryptWithTenant,
  decryptWithTenant,
  isV2Format,
  clearTenantKeyCache,

  // Mongoose field encryption
  encryptField,
  decryptField,

  // Searchable encryption
  createSearchableHash,

  // Utility functions
  maskValue,
  sanitizeForLog,

  // Constants
  ALGORITHM,
  IV_LENGTH,
  AUTH_TAG_LENGTH,
  BCRYPT_ROUNDS,
};
