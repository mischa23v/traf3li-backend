const { encrypt, decrypt, maskValue } = require('../utils/encryption');

/**
 * Encryption Middleware
 * Provides encryption/decryption for request and response data
 *
 * Usage:
 *   router.post('/clients', encryptResponse(['nationalId', 'bankAccount']), createClient);
 *   router.post('/decrypt', decryptRequest(['sensitiveData']), processData);
 */

/**
 * Encrypt specific fields in response data
 * @param {Array<string>} fields - Array of field names/paths to encrypt
 * @param {Object} options - Options { mask: boolean, returnOriginal: boolean }
 * @returns {Function} Express middleware
 *
 * @example
 * // Encrypt and mask response
 * router.get('/clients/:id', encryptResponse(['nationalId', 'bankAccount'], { mask: true }));
 *
 * // Encrypt nested fields
 * router.get('/employees/:id', encryptResponse(['compensation.bankDetails.iban']));
 */
const encryptResponse = (fields = [], options = {}) => {
  const { mask = false, returnOriginal = false } = options;

  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to encrypt fields
    res.json = function (data) {
      try {
        if (!data || typeof data !== 'object') {
          return originalJson(data);
        }

        // Clone the data to avoid mutating original
        const encryptedData = JSON.parse(JSON.stringify(data));

        // Handle array of objects (e.g., list endpoints)
        if (Array.isArray(encryptedData)) {
          encryptedData.forEach((item) => {
            processFields(item, fields, mask, returnOriginal);
          });
        } else {
          processFields(encryptedData, fields, mask, returnOriginal);
        }

        return originalJson(encryptedData);
      } catch (error) {
        console.error('Response encryption error:', error);
        // Don't expose encryption errors to client
        return originalJson(data);
      }
    };

    next();
  };
};

/**
 * Decrypt specific fields in request data
 * @param {Array<string>} fields - Array of field names/paths to decrypt
 * @returns {Function} Express middleware
 *
 * @example
 * // Decrypt request body fields
 * router.post('/update-client', decryptRequest(['nationalId']), updateClient);
 */
const decryptRequest = (fields = []) => {
  return async (req, res, next) => {
    try {
      if (!req.body || typeof req.body !== 'object') {
        return next();
      }

      // Decrypt specified fields
      for (const fieldPath of fields) {
        const value = getNestedValue(req.body, fieldPath);

        if (value && typeof value === 'string') {
          try {
            const decrypted = decrypt(value);
            setNestedValue(req.body, fieldPath, decrypted);
          } catch (error) {
            console.error(`Failed to decrypt field ${fieldPath}:`, error.message);
            return res.status(400).json({
              error: 'Invalid encrypted data',
              field: fieldPath,
            });
          }
        }
      }

      next();
    } catch (error) {
      console.error('Request decryption error:', error);
      return res.status(500).json({ error: 'Decryption failed' });
    }
  };
};

/**
 * Mask sensitive fields in response (for display only)
 * @param {Array<string>} fields - Array of field names to mask
 * @param {number} visibleChars - Number of characters to show
 * @returns {Function} Express middleware
 *
 * @example
 * router.get('/clients/:id', maskResponse(['nationalId', 'phone'], 4));
 */
const maskResponse = (fields = [], visibleChars = 4) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      try {
        if (!data || typeof data !== 'object') {
          return originalJson(data);
        }

        const maskedData = JSON.parse(JSON.stringify(data));

        if (Array.isArray(maskedData)) {
          maskedData.forEach((item) => {
            maskFields(item, fields, visibleChars);
          });
        } else {
          maskFields(maskedData, fields, visibleChars);
        }

        return originalJson(maskedData);
      } catch (error) {
        console.error('Response masking error:', error);
        return originalJson(data);
      }
    };

    next();
  };
};

/**
 * Auto-encrypt request and auto-decrypt response for specific fields
 * Useful for encrypted storage where client needs to send/receive plain data
 * @param {Array<string>} fields - Fields to handle
 * @returns {Function} Express middleware
 */
const transparentEncryption = (fields = []) => {
  return async (req, res, next) => {
    // Encrypt incoming request fields
    if (req.body && typeof req.body === 'object') {
      for (const fieldPath of fields) {
        const value = getNestedValue(req.body, fieldPath);

        if (value && typeof value === 'string') {
          try {
            const encrypted = encrypt(value);
            setNestedValue(req.body, fieldPath, encrypted);
          } catch (error) {
            console.error(`Failed to encrypt request field ${fieldPath}:`, error.message);
          }
        }
      }
    }

    // Decrypt response fields
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      try {
        if (!data || typeof data !== 'object') {
          return originalJson(data);
        }

        const decryptedData = JSON.parse(JSON.stringify(data));

        if (Array.isArray(decryptedData)) {
          decryptedData.forEach((item) => {
            decryptFields(item, fields);
          });
        } else {
          decryptFields(decryptedData, fields);
        }

        return originalJson(decryptedData);
      } catch (error) {
        console.error('Transparent encryption error:', error);
        return originalJson(data);
      }
    };

    next();
  };
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Process fields for encryption/masking
 */
function processFields(obj, fields, mask, returnOriginal) {
  for (const fieldPath of fields) {
    const value = getNestedValue(obj, fieldPath);

    if (value) {
      try {
        // Skip if already encrypted (has encrypted object structure)
        if (
          typeof value === 'object' &&
          value.encrypted &&
          value.iv &&
          value.authTag
        ) {
          continue;
        }

        const encrypted = encrypt(String(value));

        if (mask) {
          // Store encrypted value but show masked version
          setNestedValue(obj, `${fieldPath}_encrypted`, encrypted);
          setNestedValue(obj, fieldPath, maskValue(value));
        } else if (returnOriginal) {
          // Return both encrypted and original
          setNestedValue(obj, `${fieldPath}_encrypted`, encrypted);
          // Keep original value
        } else {
          // Replace with encrypted value
          setNestedValue(obj, fieldPath, encrypted);
        }
      } catch (error) {
        console.error(`Failed to process field ${fieldPath}:`, error.message);
      }
    }
  }
}

/**
 * Mask fields in object
 */
function maskFields(obj, fields, visibleChars) {
  for (const fieldPath of fields) {
    const value = getNestedValue(obj, fieldPath);

    if (value) {
      setNestedValue(obj, fieldPath, maskValue(value, visibleChars));
    }
  }
}

/**
 * Decrypt fields in object
 */
function decryptFields(obj, fields) {
  for (const fieldPath of fields) {
    const value = getNestedValue(obj, fieldPath);

    if (value && typeof value === 'string') {
      try {
        const decrypted = decrypt(value);
        setNestedValue(obj, fieldPath, decrypted);
      } catch (error) {
        console.error(`Failed to decrypt field ${fieldPath}:`, error.message);
      }
    }
  }
}

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Dot-notation path (e.g., 'user.address.city')
 * @returns {*} Value at path or undefined
 */
function getNestedValue(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined;

  const keys = path.split('.');
  let value = obj;

  for (const key of keys) {
    if (value === null || value === undefined) return undefined;
    value = value[key];
  }

  return value;
}

/**
 * Set nested value in object using dot notation
 * @param {Object} obj - Object to set value in
 * @param {string} path - Dot-notation path
 * @param {*} value - Value to set
 */
function setNestedValue(obj, path, value) {
  if (!obj || typeof obj !== 'object') return;

  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;

  for (const key of keys) {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
}

module.exports = {
  encryptResponse,
  decryptRequest,
  maskResponse,
  transparentEncryption,
};
