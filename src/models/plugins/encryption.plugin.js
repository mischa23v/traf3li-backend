const { encryptField, decryptField, createSearchableHash } = require('../../utils/encryption');
const logger = require('../../utils/logger');

/**
 * Mongoose Encryption Plugin
 * Automatically encrypts/decrypts specified fields on save/find
 *
 * Usage in model:
 *   const encryptionPlugin = require('./plugins/encryption.plugin');
 *
 *   schema.plugin(encryptionPlugin, {
 *     fields: ['nationalId', 'compensation.bankDetails.iban'],
 *     searchableFields: ['nationalId']  // Creates hashed index for searching
 *   });
 *
 * Features:
 * - Auto-encrypt on save
 * - Auto-decrypt on find/findOne
 * - Searchable encrypted fields (via hash index)
 * - Nested field support (e.g., 'user.address.street')
 * - Skip encryption flag for bulk operations
 */

/**
 * Encryption plugin for Mongoose schemas
 * @param {Object} schema - Mongoose schema
 * @param {Object} options - Plugin options
 * @param {Array<string>} options.fields - Fields to encrypt
 * @param {Array<string>} options.searchableFields - Fields that need to be searchable (creates hash index)
 * @param {boolean} options.autoDecrypt - Auto-decrypt on read (default: true)
 * @param {boolean} options.autoEncrypt - Auto-encrypt on save (default: true)
 */
function encryptionPlugin(schema, options = {}) {
  const {
    fields = [],
    searchableFields = [],
    autoDecrypt = true,
    autoEncrypt = true,
  } = options;

  if (!fields || fields.length === 0) {
    logger.warn('Encryption plugin: No fields specified for encryption');
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  // Add encrypted field definitions to schema
  // ═══════════════════════════════════════════════════════════════

  fields.forEach((fieldPath) => {
    // Add encrypted storage fields (nested objects with encrypted, iv, authTag)
    const encryptedFieldPath = `${fieldPath}_encrypted`;

    try {
      schema.add({
        [encryptedFieldPath]: {
          encrypted: String,
          iv: String,
          authTag: String,
        },
      });
    } catch (error) {
      // Field might already exist, that's okay
    }
  });

  // Add searchable hash fields for encrypted fields
  searchableFields.forEach((fieldPath) => {
    const hashFieldPath = `${fieldPath}_hash`;

    try {
      schema.add({
        [hashFieldPath]: {
          type: String,
          index: true,
          select: false, // Don't include in queries by default
        },
      });
    } catch (error) {
      // Field might already exist
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // PRE-SAVE HOOK - Encrypt fields before saving
  // ═══════════════════════════════════════════════════════════════

  if (autoEncrypt) {
    schema.pre('save', async function (next) {
      // Skip encryption if flag is set (for migrations, bulk operations)
      if (this._skipEncryption) {
        return next();
      }

      try {
        for (const fieldPath of fields) {
          const value = getNestedValue(this, fieldPath);

          // Only encrypt if value exists and has been modified
          if (value && this.isModified(fieldPath)) {
            // Check if already encrypted
            const encryptedFieldPath = `${fieldPath}_encrypted`;
            const existingEncrypted = getNestedValue(this, encryptedFieldPath);

            if (!existingEncrypted || !existingEncrypted.encrypted) {
              // Encrypt the value
              const encrypted = encryptField(value);

              // Store encrypted version
              setNestedValue(this, encryptedFieldPath, encrypted);

              // Create searchable hash if field is searchable
              if (searchableFields.includes(fieldPath)) {
                const hashFieldPath = `${fieldPath}_hash`;
                const hash = createSearchableHash(value);
                setNestedValue(this, hashFieldPath, hash);
              }

              // Clear plaintext value (optional - for security)
              // Uncomment if you want to remove plaintext after encryption
              // setNestedValue(this, fieldPath, undefined);
            }
          }
        }

        next();
      } catch (error) {
        logger.error('Encryption plugin save error:', error);
        next(error);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // POST-FIND HOOKS - Decrypt fields after retrieval
  // ═══════════════════════════════════════════════════════════════

  if (autoDecrypt) {
    // Decrypt after finding single document
    schema.post('findOne', function (doc) {
      if (doc) {
        decryptDocument(doc, fields);
      }
    });

    // Decrypt after finding multiple documents
    schema.post('find', function (docs) {
      if (Array.isArray(docs)) {
        docs.forEach((doc) => decryptDocument(doc, fields));
      }
    });

    // Decrypt after findOneAndUpdate
    schema.post('findOneAndUpdate', function (doc) {
      if (doc) {
        decryptDocument(doc, fields);
      }
    });

    // Decrypt after save
    schema.post('save', function (doc) {
      if (doc) {
        decryptDocument(doc, fields);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // INSTANCE METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Manually decrypt encrypted fields
   */
  schema.methods.decryptFields = function () {
    decryptDocument(this, fields);
    return this;
  };

  /**
   * Manually encrypt specific field
   * @param {string} fieldPath - Field path to encrypt
   */
  schema.methods.encryptField = function (fieldPath) {
    if (!fields.includes(fieldPath)) {
      throw new Error(`Field ${fieldPath} is not configured for encryption`);
    }

    const value = getNestedValue(this, fieldPath);
    if (!value) return this;

    const encrypted = encryptField(value);
    const encryptedFieldPath = `${fieldPath}_encrypted`;
    setNestedValue(this, encryptedFieldPath, encrypted);

    // Create searchable hash if needed
    if (searchableFields.includes(fieldPath)) {
      const hashFieldPath = `${fieldPath}_hash`;
      const hash = createSearchableHash(value);
      setNestedValue(this, hashFieldPath, hash);
    }

    return this;
  };

  /**
   * Get encrypted value (without decrypting)
   * @param {string} fieldPath - Field path
   * @returns {Object} Encrypted object { encrypted, iv, authTag }
   */
  schema.methods.getEncryptedValue = function (fieldPath) {
    const encryptedFieldPath = `${fieldPath}_encrypted`;
    return getNestedValue(this, encryptedFieldPath);
  };

  // ═══════════════════════════════════════════════════════════════
  // STATIC METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Search by encrypted field using hash
   * @param {string} fieldPath - Field path to search
   * @param {string} value - Value to search for
   * @param {Object} additionalQuery - Additional query conditions
   * @returns {Query} Mongoose query
   */
  schema.statics.findByEncryptedField = function (fieldPath, value, additionalQuery = {}) {
    if (!searchableFields.includes(fieldPath)) {
      throw new Error(`Field ${fieldPath} is not configured as searchable`);
    }

    const hash = createSearchableHash(value);
    const hashFieldPath = `${fieldPath}_hash`;

    return this.find({
      [hashFieldPath]: hash,
      ...additionalQuery,
    });
  };

  /**
   * Find one by encrypted field using hash
   * @param {string} fieldPath - Field path to search
   * @param {string} value - Value to search for
   * @param {Object} additionalQuery - Additional query conditions
   * @returns {Query} Mongoose query
   */
  schema.statics.findOneByEncryptedField = function (
    fieldPath,
    value,
    additionalQuery = {}
  ) {
    if (!searchableFields.includes(fieldPath)) {
      throw new Error(`Field ${fieldPath} is not configured as searchable`);
    }

    const hash = createSearchableHash(value);
    const hashFieldPath = `${fieldPath}_hash`;

    return this.findOne({
      [hashFieldPath]: hash,
      ...additionalQuery,
    });
  };

  /**
   * Check if value exists in encrypted field
   * @param {string} fieldPath - Field path to check
   * @param {string} value - Value to check
   * @param {Object} additionalQuery - Additional query conditions
   * @returns {Promise<boolean>} True if exists
   */
  schema.statics.existsByEncryptedField = async function (
    fieldPath,
    value,
    additionalQuery = {}
  ) {
    if (!searchableFields.includes(fieldPath)) {
      throw new Error(`Field ${fieldPath} is not configured as searchable`);
    }

    const hash = createSearchableHash(value);
    const hashFieldPath = `${fieldPath}_hash`;

    const count = await this.countDocuments({
      [hashFieldPath]: hash,
      ...additionalQuery,
    });

    return count > 0;
  };

  /**
   * Bulk encrypt existing data (migration helper)
   * WARNING: This encrypts ALL documents in the collection
   * @param {Object} filter - Query filter (default: all documents)
   * @returns {Promise<Object>} Migration result
   */
  schema.statics.migrateEncryption = async function (filter = {}) {
    logger.info('Starting encryption migration...');

    const docs = await this.find(filter);
    let encrypted = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of docs) {
      try {
        let needsSave = false;

        for (const fieldPath of fields) {
          const value = getNestedValue(doc, fieldPath);
          const encryptedFieldPath = `${fieldPath}_encrypted`;
          const existingEncrypted = getNestedValue(doc, encryptedFieldPath);

          // Only encrypt if value exists and not already encrypted
          if (value && (!existingEncrypted || !existingEncrypted.encrypted)) {
            const encrypted = encryptField(value);
            setNestedValue(doc, encryptedFieldPath, encrypted);

            // Create searchable hash
            if (searchableFields.includes(fieldPath)) {
              const hashFieldPath = `${fieldPath}_hash`;
              const hash = createSearchableHash(value);
              setNestedValue(doc, hashFieldPath, hash);
            }

            needsSave = true;
          }
        }

        if (needsSave) {
          doc._skipEncryption = true; // Prevent double encryption
          await doc.save();
          encrypted++;
        } else {
          skipped++;
        }
      } catch (error) {
        logger.error(`Failed to encrypt document ${doc._id}:`, error.message);
        errors++;
      }
    }

    const result = {
      total: docs.length,
      encrypted,
      skipped,
      errors,
    };

    logger.info('Encryption migration completed:', result);
    return result;
  };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Decrypt all encrypted fields in a document
 */
function decryptDocument(doc, fields) {
  if (!doc) return;

  for (const fieldPath of fields) {
    try {
      const encryptedFieldPath = `${fieldPath}_encrypted`;
      const encryptedValue = getNestedValue(doc, encryptedFieldPath);

      if (encryptedValue && encryptedValue.encrypted) {
        const decrypted = decryptField(encryptedValue);
        setNestedValue(doc, fieldPath, decrypted);
      }
    } catch (error) {
      logger.error(`Failed to decrypt field ${fieldPath}:`, error.message);
      // Continue with other fields
    }
  }
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;

  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    if (typeof value.get === 'function') {
      // Handle Mongoose documents
      value = value.get(key);
    } else {
      value = value[key];
    }
  }

  return value;
}

/**
 * Set nested value in object using dot notation
 */
function setNestedValue(obj, path, value) {
  if (!obj || typeof obj !== 'object') return;

  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;

  for (const key of keys) {
    if (!current[key] || typeof current[key] !== 'object') {
      if (typeof current.set === 'function') {
        // Handle Mongoose documents
        current.set(key, {});
      } else {
        current[key] = {};
      }
    }

    if (typeof current.get === 'function') {
      current = current.get(key);
    } else {
      current = current[key];
    }
  }

  if (typeof current.set === 'function') {
    // Handle Mongoose documents
    current.set(lastKey, value);
  } else {
    current[lastKey] = value;
  }
}

module.exports = encryptionPlugin;
