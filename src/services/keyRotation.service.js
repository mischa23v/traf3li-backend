/**
 * JWT Key Rotation Service
 *
 * Provides secure key rotation mechanism for JWT tokens with support for:
 * - Multiple active signing keys (current + previous)
 * - Key versioning using 'kid' (Key ID) header
 * - Automatic key generation and rotation
 * - Graceful key expiration and removal
 * - Backward compatibility with single-key setup
 *
 * Security Features:
 * - Keys are versioned with unique identifiers
 * - Old keys are kept for validation during rotation period
 * - Automatic cleanup of expired keys
 * - Cryptographically secure key generation
 *
 * Environment Variables:
 * - ENABLE_JWT_KEY_ROTATION: Enable/disable key rotation (true/false)
 * - JWT_KEY_ROTATION_INTERVAL: Days between key rotations (default: 30)
 * - JWT_KEY_ROTATION_GRACE_PERIOD: Days to keep old keys (default: 7)
 * - JWT_KEYS_STORAGE: Storage method (env|redis|mongodb, default: env)
 *
 * Key Storage Formats:
 * - ENV: JWT_SIGNING_KEYS (JSON array of key objects)
 * - Redis: Stored in cache with auto-expiry
 * - MongoDB: Stored in dedicated collection (future enhancement)
 */

const crypto = require('crypto');
const logger = require('../utils/logger');
const cacheService = require('./cache.service');

// Redis key for storing signing keys
const REDIS_KEYS_PREFIX = 'jwt_signing_keys';
const REDIS_CURRENT_KEY_PREFIX = 'jwt_current_key';

class KeyRotationService {
  constructor() {
    this.keys = [];
    this.currentKeyId = null;
    this.initialized = false;
    this.rotationEnabled = false;
  }

  /**
   * Initialize the key rotation service
   * Loads keys from storage and validates configuration
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Check if key rotation is enabled
      this.rotationEnabled = process.env.ENABLE_JWT_KEY_ROTATION === 'true';

      if (!this.rotationEnabled) {
        logger.info('JWT key rotation is disabled. Using legacy single-key mode.');
        this.initialized = true;
        return;
      }

      logger.info('Initializing JWT key rotation service...');

      // Load existing keys or generate initial key
      await this.loadKeys();

      // If no keys exist, generate initial key
      if (this.keys.length === 0) {
        logger.info('No existing keys found. Generating initial signing key...');
        await this.generateNewKey();
      }

      // Set current key if not set
      if (!this.currentKeyId && this.keys.length > 0) {
        this.currentKeyId = this.keys[0].kid;
      }

      // Clean up expired keys
      await this.cleanupExpiredKeys();

      this.initialized = true;
      logger.info(`Key rotation service initialized. Active keys: ${this.keys.length}, Current key: ${this.currentKeyId}`);
    } catch (error) {
      logger.error('Failed to initialize key rotation service:', error.message);
      // Don't throw - allow service to start in degraded mode
      this.initialized = true;
    }
  }

  /**
   * Check if key rotation is enabled
   * @returns {Boolean}
   */
  isEnabled() {
    return this.rotationEnabled;
  }

  /**
   * Generate a new cryptographically secure signing key
   * @returns {Object} Key object with kid, secret, and metadata
   */
  generateNewKey() {
    try {
      // Generate unique key ID (kid)
      const kid = this.generateKeyId();

      // Generate cryptographically secure random secret (64 bytes = 512 bits)
      const secret = crypto.randomBytes(64).toString('hex');

      // Create key object
      const key = {
        kid,
        secret,
        algorithm: 'HS256',
        createdAt: new Date().toISOString(),
        status: 'active',
        version: this.keys.length + 1
      };

      // Add to keys array
      this.keys.unshift(key); // Add at beginning (most recent first)

      // Set as current key
      this.currentKeyId = kid;

      // Persist keys
      this.saveKeys();

      logger.info(`New signing key generated: ${kid} (version ${key.version})`);

      return key;
    } catch (error) {
      logger.error('Failed to generate new key:', error.message);
      throw error;
    }
  }

  /**
   * Rotate keys: Generate new key and mark old key for retirement
   * @returns {Object} Rotation result with new and old key info
   */
  async rotateKeys() {
    try {
      if (!this.rotationEnabled) {
        throw new Error('Key rotation is not enabled');
      }

      const oldKeyId = this.currentKeyId;
      const oldKey = this.getKeyById(oldKeyId);

      logger.info(`Starting key rotation. Current key: ${oldKeyId}`);

      // Generate new key (automatically becomes current)
      const newKey = this.generateNewKey();

      // Mark old key as deprecated (but keep for validation)
      if (oldKey) {
        oldKey.status = 'deprecated';
        oldKey.deprecatedAt = new Date().toISOString();

        // Calculate expiry based on grace period
        const gracePeriodDays = parseInt(process.env.JWT_KEY_ROTATION_GRACE_PERIOD) || 7;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + gracePeriodDays);
        oldKey.expiresAt = expiresAt.toISOString();
      }

      // Save updated keys
      await this.saveKeys();

      logger.info(`Key rotation completed. New key: ${newKey.kid}, Old key: ${oldKeyId} (expires in ${process.env.JWT_KEY_ROTATION_GRACE_PERIOD || 7} days)`);

      return {
        success: true,
        newKey: {
          kid: newKey.kid,
          version: newKey.version,
          createdAt: newKey.createdAt
        },
        oldKey: oldKey ? {
          kid: oldKey.kid,
          version: oldKey.version,
          expiresAt: oldKey.expiresAt
        } : null
      };
    } catch (error) {
      logger.error('Key rotation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get current active signing key
   * @returns {Object} Current key object
   */
  getCurrentKey() {
    if (!this.rotationEnabled) {
      // Return legacy key format for backward compatibility
      return {
        kid: 'legacy',
        secret: process.env.JWT_SECRET,
        algorithm: 'HS256',
        status: 'active'
      };
    }

    const key = this.getKeyById(this.currentKeyId);

    if (!key) {
      logger.error('Current key not found. Generating new key...');
      return this.generateNewKey();
    }

    return key;
  }

  /**
   * Get key by key ID (kid)
   * @param {String} kid - Key ID
   * @returns {Object|null} Key object or null
   */
  getKeyById(kid) {
    return this.keys.find(k => k.kid === kid) || null;
  }

  /**
   * Get all active keys (for verification)
   * Returns current key + any deprecated keys still in grace period
   * @returns {Array} Array of key objects
   */
  getAllActiveKeys() {
    if (!this.rotationEnabled) {
      // Return legacy key for backward compatibility
      return [{
        kid: 'legacy',
        secret: process.env.JWT_SECRET,
        algorithm: 'HS256',
        status: 'active'
      }];
    }

    const now = new Date();

    // Return all keys that are either active or deprecated but not expired
    return this.keys.filter(key => {
      if (key.status === 'active') return true;
      if (key.status === 'deprecated' && key.expiresAt) {
        return new Date(key.expiresAt) > now;
      }
      return false;
    });
  }

  /**
   * Remove expired keys
   * @returns {Number} Number of keys removed
   */
  async cleanupExpiredKeys() {
    try {
      const now = new Date();
      const initialCount = this.keys.length;

      // Remove expired keys
      this.keys = this.keys.filter(key => {
        if (key.status === 'active') return true;
        if (key.status === 'expired') return false;
        if (key.expiresAt && new Date(key.expiresAt) <= now) {
          logger.info(`Removing expired key: ${key.kid} (expired at ${key.expiresAt})`);
          return false;
        }
        return true;
      });

      const removedCount = initialCount - this.keys.length;

      if (removedCount > 0) {
        await this.saveKeys();
        logger.info(`Cleanup completed. Removed ${removedCount} expired key(s)`);
      }

      return removedCount;
    } catch (error) {
      logger.error('Key cleanup failed:', error.message);
      return 0;
    }
  }

  /**
   * Load keys from storage
   * Supports multiple storage backends: env, redis, mongodb
   */
  async loadKeys() {
    try {
      const storageMethod = process.env.JWT_KEYS_STORAGE || 'env';

      switch (storageMethod) {
        case 'redis':
          await this.loadKeysFromRedis();
          break;

        case 'mongodb':
          // Future enhancement: load from MongoDB
          logger.warn('MongoDB storage not yet implemented. Falling back to env.');
          this.loadKeysFromEnv();
          break;

        case 'env':
        default:
          this.loadKeysFromEnv();
          break;
      }

      logger.info(`Loaded ${this.keys.length} signing key(s) from ${storageMethod}`);
    } catch (error) {
      logger.error('Failed to load keys:', error.message);
      this.keys = [];
    }
  }

  /**
   * Load keys from environment variable
   */
  loadKeysFromEnv() {
    try {
      const keysJson = process.env.JWT_SIGNING_KEYS;

      if (!keysJson) {
        logger.info('No JWT_SIGNING_KEYS found in environment');
        return;
      }

      const parsedKeys = JSON.parse(keysJson);

      if (!Array.isArray(parsedKeys)) {
        throw new Error('JWT_SIGNING_KEYS must be a JSON array');
      }

      this.keys = parsedKeys;

      // Find current key
      const activeKey = this.keys.find(k => k.status === 'active');
      if (activeKey) {
        this.currentKeyId = activeKey.kid;
      }
    } catch (error) {
      logger.error('Failed to parse JWT_SIGNING_KEYS from environment:', error.message);
      this.keys = [];
    }
  }

  /**
   * Load keys from Redis
   */
  async loadKeysFromRedis() {
    try {
      const keysData = await cacheService.get(REDIS_KEYS_PREFIX);

      if (!keysData) {
        logger.info('No keys found in Redis');
        return;
      }

      this.keys = keysData.keys || [];
      this.currentKeyId = keysData.currentKeyId || null;
    } catch (error) {
      logger.error('Failed to load keys from Redis:', error.message);
      this.keys = [];
    }
  }

  /**
   * Save keys to storage
   */
  async saveKeys() {
    try {
      const storageMethod = process.env.JWT_KEYS_STORAGE || 'env';

      switch (storageMethod) {
        case 'redis':
          await this.saveKeysToRedis();
          break;

        case 'mongodb':
          // Future enhancement
          logger.warn('MongoDB storage not yet implemented. Keys not persisted.');
          break;

        case 'env':
        default:
          this.saveKeysToEnv();
          break;
      }

      logger.info(`Saved ${this.keys.length} key(s) to ${storageMethod}`);
    } catch (error) {
      logger.error('Failed to save keys:', error.message);
    }
  }

  /**
   * Save keys to environment variable (for display/backup only)
   * Note: Modifying process.env at runtime is not recommended for production
   */
  saveKeysToEnv() {
    try {
      // For env storage, we just log the keys for manual update
      // In production, keys should be updated through proper deployment process
      const keysJson = JSON.stringify(this.keys, null, 2);

      logger.info('⚠️ Keys updated. Update JWT_SIGNING_KEYS in your .env file with:');
      logger.info(keysJson);

      // Don't modify process.env at runtime - just warn
      logger.warn('Note: Environment variable storage requires manual .env update. Consider using Redis storage for automatic persistence.');
    } catch (error) {
      logger.error('Failed to save keys to env format:', error.message);
    }
  }

  /**
   * Save keys to Redis
   */
  async saveKeysToRedis() {
    try {
      const data = {
        keys: this.keys,
        currentKeyId: this.currentKeyId,
        updatedAt: new Date().toISOString()
      };

      // Store with long TTL (keys should persist)
      // Set to 1 year (in seconds)
      await cacheService.set(REDIS_KEYS_PREFIX, data, 365 * 24 * 60 * 60);

      // Also store current key separately for quick access
      await cacheService.set(REDIS_CURRENT_KEY_PREFIX, this.getCurrentKey(), 365 * 24 * 60 * 60);
    } catch (error) {
      logger.error('Failed to save keys to Redis:', error.message);
    }
  }

  /**
   * Generate unique key ID (kid)
   * Format: krot_{timestamp}_{random}
   * @returns {String} Key ID
   */
  generateKeyId() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `krot_${timestamp}_${random}`;
  }

  /**
   * Get key rotation status and statistics
   * @returns {Object} Status information
   */
  getStatus() {
    const activeKeys = this.getAllActiveKeys();
    const currentKey = this.getCurrentKey();

    return {
      enabled: this.rotationEnabled,
      initialized: this.initialized,
      totalKeys: this.keys.length,
      activeKeys: activeKeys.length,
      currentKey: currentKey ? {
        kid: currentKey.kid,
        version: currentKey.version,
        createdAt: currentKey.createdAt,
        status: currentKey.status
      } : null,
      storage: process.env.JWT_KEYS_STORAGE || 'env',
      rotationInterval: process.env.JWT_KEY_ROTATION_INTERVAL || '30 days',
      gracePeriod: process.env.JWT_KEY_ROTATION_GRACE_PERIOD || '7 days',
      keys: this.keys.map(k => ({
        kid: k.kid,
        version: k.version,
        status: k.status,
        createdAt: k.createdAt,
        deprecatedAt: k.deprecatedAt,
        expiresAt: k.expiresAt
      }))
    };
  }

  /**
   * Check if automatic rotation is needed
   * @returns {Boolean} True if rotation is needed
   */
  needsRotation() {
    if (!this.rotationEnabled) return false;

    const currentKey = this.getCurrentKey();
    if (!currentKey || !currentKey.createdAt) return true;

    const rotationIntervalDays = parseInt(process.env.JWT_KEY_ROTATION_INTERVAL) || 30;
    const keyAge = Date.now() - new Date(currentKey.createdAt).getTime();
    const keyAgeDays = keyAge / (1000 * 60 * 60 * 24);

    return keyAgeDays >= rotationIntervalDays;
  }

  /**
   * Perform automatic rotation if needed
   * This should be called periodically (e.g., via cron job)
   */
  async autoRotate() {
    try {
      if (!this.needsRotation()) {
        logger.info('Automatic rotation check: No rotation needed');
        return { rotated: false, reason: 'rotation_not_needed' };
      }

      logger.info('Automatic rotation triggered');
      const result = await this.rotateKeys();

      return {
        rotated: true,
        ...result
      };
    } catch (error) {
      logger.error('Automatic rotation failed:', error.message);
      return { rotated: false, error: error.message };
    }
  }
}

// Export singleton instance
const keyRotationService = new KeyRotationService();

module.exports = keyRotationService;
