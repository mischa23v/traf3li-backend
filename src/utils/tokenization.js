const crypto = require('crypto');
const { encryptData, decryptData } = require('./encryption');
const logger = require('./logger');

/**
 * Tokenization Utility for PCI Compliance
 *
 * Tokenization replaces sensitive data (e.g., credit card numbers, bank accounts)
 * with non-sensitive tokens. The actual sensitive data is stored securely in a
 * token vault (in-memory or database), and only the token is stored in the main database.
 *
 * This is particularly important for PCI-DSS compliance when handling payment card data.
 *
 * Features:
 * - Generate secure random tokens
 * - Store sensitive data encrypted in token vault
 * - Retrieve original data using token
 * - Automatic token expiration
 * - Format-preserving tokens (optional)
 *
 * Usage:
 *   const { tokenize, detokenize } = require('./utils/tokenization');
 *
 *   // Tokenize sensitive data
 *   const token = await tokenize('4111111111111111', { type: 'credit_card' });
 *   // Store token in database instead of actual card number
 *
 *   // Retrieve original data
 *   const cardNumber = await detokenize(token);
 */

// ═══════════════════════════════════════════════════════════════
// TOKEN VAULT (In-Memory Storage)
// ═══════════════════════════════════════════════════════════════
// For production, consider using Redis or a dedicated vault service like HashiCorp Vault

const tokenVault = new Map();

// Token expiration tracking
const tokenExpirations = new Map();

// Cleanup expired tokens every hour
setInterval(() => {
  cleanupExpiredTokens();
}, 60 * 60 * 1000);

/**
 * Token type configurations
 */
const TOKEN_TYPES = {
  credit_card: {
    prefix: 'tok_cc_',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    formatPreserving: true,
  },
  bank_account: {
    prefix: 'tok_ba_',
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    formatPreserving: false,
  },
  national_id: {
    prefix: 'tok_id_',
    ttl: 30 * 24 * 60 * 60 * 1000, // 30 days
    formatPreserving: false,
  },
  generic: {
    prefix: 'tok_',
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    formatPreserving: false,
  },
};

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Tokenize sensitive data
 * Replaces sensitive data with a secure token
 *
 * @param {string} sensitiveData - Sensitive data to tokenize
 * @param {Object} options - Tokenization options
 * @param {string} options.type - Token type (credit_card, bank_account, national_id, generic)
 * @param {number} options.ttl - Time to live in milliseconds (overrides default)
 * @param {boolean} options.formatPreserving - Keep last 4 digits visible (default: false)
 * @param {Object} options.metadata - Additional metadata to store with token
 * @returns {string} Token string
 *
 * @example
 * const token = tokenize('4111111111111111', { type: 'credit_card' });
 * // Returns: 'tok_cc_a1b2c3d4e5f6g7h8:1111'
 */
function tokenize(sensitiveData, options = {}) {
  if (!sensitiveData) {
    throw new Error('Sensitive data is required for tokenization');
  }

  const {
    type = 'generic',
    ttl,
    formatPreserving,
    metadata = {},
  } = options;

  const config = TOKEN_TYPES[type] || TOKEN_TYPES.generic;

  // Generate secure random token
  const tokenId = crypto.randomBytes(16).toString('hex');
  let token = `${config.prefix}${tokenId}`;

  // Format-preserving: append last 4 digits to token for display purposes
  if (formatPreserving !== false && config.formatPreserving) {
    const last4 = String(sensitiveData).slice(-4);
    token = `${token}:${last4}`;
  }

  // Encrypt the sensitive data before storing
  const encrypted = encryptData(String(sensitiveData));

  // Store in vault
  const vaultEntry = {
    data: encrypted,
    type,
    createdAt: new Date(),
    metadata,
  };

  tokenVault.set(token, vaultEntry);

  // Set expiration
  const expirationTime = ttl || config.ttl;
  const expiresAt = Date.now() + expirationTime;
  tokenExpirations.set(token, expiresAt);

  return token;
}

/**
 * Detokenize - retrieve original sensitive data
 *
 * @param {string} token - Token to detokenize
 * @returns {string|null} Original sensitive data or null if token not found/expired
 *
 * @example
 * const cardNumber = detokenize('tok_cc_a1b2c3d4e5f6g7h8:1111');
 * // Returns: '4111111111111111'
 */
function detokenize(token) {
  if (!token) {
    return null;
  }

  // Check if token exists
  if (!tokenVault.has(token)) {
    logger.warn(`Token not found: ${token}`);
    return null;
  }

  // Check if token is expired
  const expiresAt = tokenExpirations.get(token);
  if (expiresAt && Date.now() > expiresAt) {
    logger.warn(`Token expired: ${token}`);
    // Clean up expired token
    tokenVault.delete(token);
    tokenExpirations.delete(token);
    return null;
  }

  // Retrieve and decrypt data
  try {
    const vaultEntry = tokenVault.get(token);
    const decrypted = decryptData(vaultEntry.data);
    return decrypted;
  } catch (error) {
    logger.error('Detokenization error:', error.message);
    return null;
  }
}

/**
 * Check if token exists and is valid
 *
 * @param {string} token - Token to check
 * @returns {boolean} True if token exists and is not expired
 */
function isValidToken(token) {
  if (!token || !tokenVault.has(token)) {
    return false;
  }

  const expiresAt = tokenExpirations.get(token);
  if (expiresAt && Date.now() > expiresAt) {
    return false;
  }

  return true;
}

/**
 * Get token metadata without revealing sensitive data
 *
 * @param {string} token - Token to get info for
 * @returns {Object|null} Token info or null if not found
 */
function getTokenInfo(token) {
  if (!tokenVault.has(token)) {
    return null;
  }

  const vaultEntry = tokenVault.get(token);
  const expiresAt = tokenExpirations.get(token);

  return {
    type: vaultEntry.type,
    createdAt: vaultEntry.createdAt,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    metadata: vaultEntry.metadata,
  };
}

/**
 * Refresh token expiration
 *
 * @param {string} token - Token to refresh
 * @param {number} ttl - New TTL in milliseconds (optional)
 * @returns {boolean} True if token was refreshed
 */
function refreshToken(token, ttl) {
  if (!tokenVault.has(token)) {
    return false;
  }

  const vaultEntry = tokenVault.get(token);
  const config = TOKEN_TYPES[vaultEntry.type] || TOKEN_TYPES.generic;

  const expirationTime = ttl || config.ttl;
  const expiresAt = Date.now() + expirationTime;
  tokenExpirations.set(token, expiresAt);

  return true;
}

/**
 * Revoke token (delete from vault)
 *
 * @param {string} token - Token to revoke
 * @returns {boolean} True if token was revoked
 */
function revokeToken(token) {
  if (!tokenVault.has(token)) {
    return false;
  }

  tokenVault.delete(token);
  tokenExpirations.delete(token);

  return true;
}

/**
 * Get last 4 digits from format-preserving token
 * For display purposes only
 *
 * @param {string} token - Format-preserving token
 * @returns {string|null} Last 4 digits or null
 */
function getTokenLast4(token) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split(':');
  if (parts.length === 2) {
    return parts[1];
  }

  return null;
}

/**
 * Validate credit card number using Luhn algorithm (ISO/IEC 7812)
 * Required for PCI-DSS compliance
 * @param {string} cardNumber - Credit card number (digits only)
 * @returns {boolean} Whether the card number is valid
 */
function validateLuhn(cardNumber) {
  let sum = 0;
  let isEven = false;

  // Loop from right to left
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Tokenize credit card number (PCI compliance)
 * Stores only last 4 digits in token for display
 *
 * @param {string} cardNumber - Credit card number
 * @param {Object} metadata - Additional metadata (e.g., cardType, expiryMonth)
 * @returns {string} Token with last 4 digits
 */
function tokenizeCreditCard(cardNumber, metadata = {}) {
  // Remove spaces and dashes
  const cleanCardNumber = String(cardNumber).replace(/[\s-]/g, '');

  // Basic format validation
  if (!/^\d{13,19}$/.test(cleanCardNumber)) {
    throw new Error('Invalid credit card number format');
  }

  // SECURITY FIX: Validate using Luhn algorithm (PCI-DSS requirement)
  if (!validateLuhn(cleanCardNumber)) {
    throw new Error('Invalid credit card number (Luhn check failed)');
  }

  return tokenize(cleanCardNumber, {
    type: 'credit_card',
    formatPreserving: true,
    metadata: {
      ...metadata,
      last4: cleanCardNumber.slice(-4),
    },
  });
}

/**
 * Tokenize bank account number
 *
 * @param {string} bankAccount - Bank account number or IBAN
 * @param {Object} metadata - Additional metadata (e.g., bankName, accountType)
 * @returns {string} Token
 */
function tokenizeBankAccount(bankAccount, metadata = {}) {
  if (!bankAccount) {
    throw new Error('Bank account number is required');
  }

  return tokenize(bankAccount, {
    type: 'bank_account',
    formatPreserving: false,
    metadata,
  });
}

/**
 * Tokenize national ID
 *
 * @param {string} nationalId - National ID number
 * @param {Object} metadata - Additional metadata (e.g., country, idType)
 * @returns {string} Token
 */
function tokenizeNationalId(nationalId, metadata = {}) {
  if (!nationalId) {
    throw new Error('National ID is required');
  }

  return tokenize(nationalId, {
    type: 'national_id',
    formatPreserving: false,
    metadata,
  });
}

// ═══════════════════════════════════════════════════════════════
// VAULT MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Clean up expired tokens from vault
 * Called automatically every hour
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  let cleaned = 0;

  for (const [token, expiresAt] of tokenExpirations.entries()) {
    if (now > expiresAt) {
      tokenVault.delete(token);
      tokenExpirations.delete(token);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired tokens`);
  }

  return cleaned;
}

/**
 * Get vault statistics
 *
 * @returns {Object} Vault stats
 */
function getVaultStats() {
  const now = Date.now();
  let expired = 0;
  const typeCount = {};

  for (const [token, vaultEntry] of tokenVault.entries()) {
    const expiresAt = tokenExpirations.get(token);
    if (expiresAt && now > expiresAt) {
      expired++;
    }

    const type = vaultEntry.type;
    typeCount[type] = (typeCount[type] || 0) + 1;
  }

  return {
    totalTokens: tokenVault.size,
    expiredTokens: expired,
    activeTokens: tokenVault.size - expired,
    byType: typeCount,
  };
}

/**
 * Clear all tokens from vault
 * WARNING: This will invalidate all existing tokens
 */
function clearVault() {
  const count = tokenVault.size;
  tokenVault.clear();
  tokenExpirations.clear();
  logger.info(`Cleared ${count} tokens from vault`);
  return count;
}

// ═══════════════════════════════════════════════════════════════
// DATABASE-BACKED VAULT (For Production)
// ═══════════════════════════════════════════════════════════════

/**
 * Initialize database-backed token vault
 * For production use with MongoDB or Redis
 *
 * @param {Object} db - Database connection (Mongoose model or Redis client)
 * @returns {Object} Vault interface with same methods
 */
function createDatabaseVault(db) {
  // This is a placeholder for production implementation
  // You would implement actual database storage here
  logger.warn('Database vault not implemented - using in-memory vault');

  return {
    tokenize,
    detokenize,
    isValidToken,
    getTokenInfo,
    refreshToken,
    revokeToken,
    cleanupExpiredTokens,
    getVaultStats,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
  // Core functions
  tokenize,
  detokenize,
  isValidToken,

  // Token management
  getTokenInfo,
  refreshToken,
  revokeToken,
  getTokenLast4,

  // Specialized tokenization
  tokenizeCreditCard,
  tokenizeBankAccount,
  tokenizeNationalId,
  validateLuhn,

  // Vault management
  cleanupExpiredTokens,
  getVaultStats,
  clearVault,

  // Advanced
  createDatabaseVault,

  // Constants
  TOKEN_TYPES,
};
