const { SENSITIVE_FIELDS } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Webhook Payload Resolver Service
 *
 * Provides GraphQL-style field selection for webhook payloads.
 * Allows subscribers to define which fields they want in webhook payloads
 * using a simple query syntax similar to GraphQL.
 *
 * Example query:
 * ```
 * {
 *   case {
 *     id
 *     caseNumber
 *     client { id name }
 *   }
 * }
 * ```
 */
class WebhookPayloadResolver {
    constructor() {
        // Define sensitive fields that should never be included in webhook payloads
        this.sensitiveFields = new Set([
            ...SENSITIVE_FIELDS.NEVER_ALLOW,
            'secret',
            'token',
            'apiKey',
            'refreshToken',
            'accessToken',
            'sessionId',
            'sessionToken',
            'bearerToken',
            'privateKey',
            'publicKey',
            'encryptionKey',
            'mfaSecret',
            'mfaBackupCodes',
            'passwordHash',
            'passwordSalt',
            'password',
            'salt',
            'oauthToken',
            'oauthSecret',
            'signature',
            'ssn',
            'socialSecurityNumber',
            'taxId',
            'ein',
            'creditCard',
            'cardNumber',
            'cvv',
            'securityCode'
        ]);
    }

    /**
     * Parse a GraphQL-style query string into a field selection tree
     *
     * @param {String} queryString - GraphQL-style query string
     * @returns {Object} - Parsed field selection tree
     *
     * @example
     * parseQuery('{ case { id caseNumber client { id name } } }')
     * // Returns: { case: { id: true, caseNumber: true, client: { id: true, name: true } } }
     */
    parseQuery(queryString) {
        if (!queryString || typeof queryString !== 'string') {
            return null;
        }

        try {
            // Remove leading/trailing whitespace and outer braces
            const trimmed = queryString.trim();
            const content = trimmed.replace(/^\{|\}$/g, '').trim();

            if (!content) {
                return null;
            }

            return this._parseFields(content);
        } catch (error) {
            logger.error('Error parsing webhook payload query:', error);
            return null;
        }
    }

    /**
     * Parse field list into a selection tree
     *
     * @param {String} content - Field list content
     * @returns {Object} - Field selection tree
     * @private
     */
    _parseFields(content) {
        const fields = {};
        let i = 0;
        let currentField = '';
        let depth = 0;

        while (i < content.length) {
            const char = content[i];

            if (char === '{') {
                // Start of nested object
                if (depth === 0 && currentField) {
                    const fieldName = currentField.trim();
                    // Find matching closing brace
                    let nestedContent = '';
                    let braceCount = 1;
                    i++; // Move past opening brace

                    while (i < content.length && braceCount > 0) {
                        if (content[i] === '{') braceCount++;
                        if (content[i] === '}') braceCount--;
                        if (braceCount > 0) {
                            nestedContent += content[i];
                        }
                        i++;
                    }

                    fields[fieldName] = this._parseFields(nestedContent);
                    currentField = '';
                    continue;
                }
                depth++;
            } else if (char === '}') {
                depth--;
            } else if (/\s/.test(char) || char === '\n') {
                // Whitespace - end of field name
                if (currentField && depth === 0) {
                    fields[currentField.trim()] = true;
                    currentField = '';
                }
            } else {
                // Regular character
                if (depth === 0) {
                    currentField += char;
                }
            }

            i++;
        }

        // Add last field if any
        if (currentField.trim()) {
            fields[currentField.trim()] = true;
        }

        return fields;
    }

    /**
     * Resolve payload based on field selection query
     *
     * @param {Object} payload - Full event payload
     * @param {String} queryString - Field selection query
     * @param {Object} options - Resolution options
     * @returns {Object} - Resolved payload with selected fields only
     */
    resolvePayload(payload, queryString, options = {}) {
        if (!payload || typeof payload !== 'object') {
            return payload;
        }

        // If no query provided, return full payload with sensitive fields removed
        if (!queryString) {
            return this._removeSensitiveFields(payload);
        }

        // Parse the query
        const fieldSelection = this.parseQuery(queryString);

        if (!fieldSelection) {
            // If parsing fails, return full payload with sensitive fields removed
            logger.warn('Failed to parse webhook payload query, returning full payload');
            return this._removeSensitiveFields(payload);
        }

        // Resolve fields based on selection
        const resolved = this._resolveFields(payload, fieldSelection, options);

        // Remove any sensitive fields that may have slipped through
        return this._removeSensitiveFields(resolved);
    }

    /**
     * Resolve fields from data based on selection tree
     *
     * @param {Object|Array} data - Data to resolve from
     * @param {Object} selection - Field selection tree
     * @param {Object} options - Resolution options
     * @returns {Object|Array} - Resolved data
     * @private
     */
    _resolveFields(data, selection, options = {}) {
        if (!data || typeof data !== 'object') {
            return data;
        }

        // Handle arrays
        if (Array.isArray(data)) {
            return data.map(item => this._resolveFields(item, selection, options));
        }

        // Handle objects
        const resolved = {};

        for (const [fieldName, fieldValue] of Object.entries(selection)) {
            // Skip sensitive fields
            if (this._isSensitiveField(fieldName)) {
                continue;
            }

            // Check if field exists in data
            if (!Object.prototype.hasOwnProperty.call(data, fieldName)) {
                continue;
            }

            const dataValue = data[fieldName];

            // If fieldValue is true, include the field as-is
            if (fieldValue === true) {
                resolved[fieldName] = this._sanitizeValue(dataValue);
            }
            // If fieldValue is an object, it's a nested selection
            else if (typeof fieldValue === 'object' && fieldValue !== null) {
                if (dataValue && typeof dataValue === 'object') {
                    resolved[fieldName] = this._resolveFields(dataValue, fieldValue, options);
                } else {
                    resolved[fieldName] = this._sanitizeValue(dataValue);
                }
            }
        }

        return resolved;
    }

    /**
     * Sanitize a value for safe inclusion in webhook payload
     *
     * @param {any} value - Value to sanitize
     * @returns {any} - Sanitized value
     * @private
     */
    _sanitizeValue(value) {
        if (value === null || value === undefined) {
            return value;
        }

        // Handle arrays
        if (Array.isArray(value)) {
            return value.map(item => {
                if (typeof item === 'object' && item !== null) {
                    return this._removeSensitiveFields(item);
                }
                return item;
            });
        }

        // Handle objects
        if (typeof value === 'object' && value !== null) {
            return this._removeSensitiveFields(value);
        }

        // Return primitive values as-is
        return value;
    }

    /**
     * Remove sensitive fields from an object recursively
     *
     * @param {Object|Array} obj - Object to clean
     * @returns {Object|Array} - Cleaned object
     * @private
     */
    _removeSensitiveFields(obj) {
        if (!obj || typeof obj !== 'object') {
            return obj;
        }

        // Handle arrays
        if (Array.isArray(obj)) {
            return obj.map(item => this._removeSensitiveFields(item));
        }

        // Handle objects
        const cleaned = {};

        for (const [key, value] of Object.entries(obj)) {
            // Skip sensitive fields
            if (this._isSensitiveField(key)) {
                continue;
            }

            // Recursively clean nested objects
            if (value && typeof value === 'object') {
                cleaned[key] = this._removeSensitiveFields(value);
            } else {
                cleaned[key] = value;
            }
        }

        return cleaned;
    }

    /**
     * Check if a field name is sensitive and should be excluded
     *
     * @param {String} fieldName - Field name to check
     * @returns {Boolean} - True if field is sensitive
     * @private
     */
    _isSensitiveField(fieldName) {
        if (!fieldName || typeof fieldName !== 'string') {
            return false;
        }

        const lowerFieldName = fieldName.toLowerCase();

        // Check exact matches
        if (this.sensitiveFields.has(fieldName) || this.sensitiveFields.has(lowerFieldName)) {
            return true;
        }

        // Check if field contains sensitive keywords
        const sensitiveKeywords = [
            'password',
            'secret',
            'token',
            'key',
            'auth',
            'credential',
            'private',
            'secure',
            'hash',
            'salt',
            'ssn',
            'tax',
            'credit',
            'card',
            'cvv',
            'pin'
        ];

        return sensitiveKeywords.some(keyword => lowerFieldName.includes(keyword));
    }

    /**
     * Validate a payload query for syntax errors
     *
     * @param {String} queryString - Query string to validate
     * @returns {Object} - Validation result { valid: Boolean, error: String }
     */
    validateQuery(queryString) {
        if (!queryString || typeof queryString !== 'string') {
            return {
                valid: false,
                error: 'Query must be a non-empty string'
            };
        }

        const trimmed = queryString.trim();

        // Check for balanced braces
        let braceCount = 0;
        for (const char of trimmed) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
            if (braceCount < 0) {
                return {
                    valid: false,
                    error: 'Unbalanced braces: closing brace without opening brace'
                };
            }
        }

        if (braceCount !== 0) {
            return {
                valid: false,
                error: 'Unbalanced braces: unclosed opening brace'
            };
        }

        // Try to parse
        const parsed = this.parseQuery(queryString);
        if (!parsed) {
            return {
                valid: false,
                error: 'Failed to parse query'
            };
        }

        // Check for empty query
        if (Object.keys(parsed).length === 0) {
            return {
                valid: false,
                error: 'Query is empty'
            };
        }

        return {
            valid: true,
            error: null
        };
    }

    /**
     * Get example queries for documentation
     *
     * @returns {Object} - Example queries by entity type
     */
    getExampleQueries() {
        return {
            case: `{
  case {
    id
    caseNumber
    status
    client {
      id
      name
      email
    }
  }
}`,
            client: `{
  client {
    id
    name
    email
    phone
    address {
      street
      city
      state
      zipCode
    }
  }
}`,
            invoice: `{
  invoice {
    id
    invoiceNumber
    totalAmount
    status
    dueDate
    items {
      description
      quantity
      price
    }
  }
}`,
            payment: `{
  payment {
    id
    amount
    status
    paymentMethod
    transactionId
    invoice {
      id
      invoiceNumber
    }
  }
}`,
            lead: `{
  lead {
    id
    name
    email
    phone
    source
    status
  }
}`
        };
    }
}

module.exports = new WebhookPayloadResolver();
