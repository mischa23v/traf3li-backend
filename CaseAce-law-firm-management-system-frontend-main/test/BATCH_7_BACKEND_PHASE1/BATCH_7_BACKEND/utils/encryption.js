const crypto = require('crypto');

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.error('⚠️  ENCRYPTION_KEY must be 64 characters (32 bytes hex)');
  console.error('Generate one with: node -e "console.log(crypto.randomBytes(32).toString(\'hex\'))"');
}

// Convert hex string to buffer
const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');

/**
 * Encrypt data using AES-256-GCM
 * @param {string|Buffer} data - Data to encrypt
 * @returns {Object} - { encrypted: string, iv: string, authTag: string }
 */
function encrypt(data) {
  try {
    // Generate random IV (Initialization Vector)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

    // Encrypt data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encrypted - Encrypted data (hex string)
 * @param {string} ivHex - IV (hex string)
 * @param {string} authTagHex - Auth tag (hex string)
 * @returns {string} - Decrypted data
 */
function decrypt(encrypted, ivHex, authTagHex) {
  try {
    // Convert hex strings to buffers
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or key is wrong');
  }
}

/**
 * Encrypt a file buffer
 * @param {Buffer} fileBuffer - File content as buffer
 * @returns {Object} - { encrypted: Buffer, iv: string, authTag: string }
 */
function encryptFile(fileBuffer) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      encrypted: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    console.error('File encryption error:', error);
    throw new Error('Failed to encrypt file');
  }
}

/**
 * Decrypt a file buffer
 * @param {Buffer} encryptedBuffer - Encrypted file content
 * @param {string} ivHex - IV (hex string)
 * @param {string} authTagHex - Auth tag (hex string)
 * @returns {Buffer} - Decrypted file buffer
 */
function decryptFile(encryptedBuffer, ivHex, authTagHex) {
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);

    return decrypted;
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
}

/**
 * Hash data using SHA-256
 * @param {string} data - Data to hash
 * @returns {string} - Hash (hex string)
 */
function hash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate random token
 * @param {number} length - Token length in bytes (default 32)
 * @returns {string} - Random token (hex string)
 */
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate encryption key (for setup)
 * @returns {string} - 64-character hex string
 */
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compare hash with data
 * @param {string} data - Original data
 * @param {string} hashedData - Hashed data
 * @returns {boolean} - True if match
 */
function verifyHash(data, hashedData) {
  return hash(data) === hashedData;
}

module.exports = {
  encrypt,
  decrypt,
  encryptFile,
  decryptFile,
  hash,
  generateToken,
  generateEncryptionKey,
  verifyHash,
};
