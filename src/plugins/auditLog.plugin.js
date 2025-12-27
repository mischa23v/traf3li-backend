/**
 * Automatic Audit Log Plugin
 *
 * Mongoose plugin that automatically creates audit log entries for
 * create, update, and delete operations on models.
 *
 * Features:
 * - Automatic logging on save/update/delete operations
 * - Before/after state tracking for updates
 * - Change diffing for minimal storage
 * - Async context integration for user/request metadata
 * - Configurable per-model exclusions and field filtering
 * - Sensitive field masking
 *
 * Usage:
 *   const { applyGlobalAuditLogging } = require('./plugins/auditLog.plugin');
 *   applyGlobalAuditLogging();  // Apply to all models
 *
 * Per-model:
 *   schema.plugin(auditLogPlugin, { exclude: ['password', 'token'] });
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Models that should skip audit logging
const SKIP_MODELS = new Set([
    'AuditLog',
    'AuditLogArchive',
    'ArchivedAuditLog',
    'Session',
    'RefreshToken',
    'VerificationToken',
    'PasswordResetToken',
    'RateLimitEntry',
    'ActivityLog', // Redundant with AuditLog
    'SystemMetric'
]);

// Sensitive fields that should be masked in audit logs
const SENSITIVE_FIELDS = new Set([
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'privateKey',
    'encryptedData',
    'mfaSecret',
    'backupCodes',
    'salt',
    'otp',
    'pin',
    'ssn',
    'nationalId',
    'taxId',
    'bankAccountNumber',
    'creditCard',
    'cvv'
]);

// Async context storage for request metadata
let asyncContext = null;

/**
 * Set async context provider for getting request metadata
 * @param {Object} context - Async local storage or similar
 */
function setAsyncContext(context) {
    asyncContext = context;
}

/**
 * Get current request context
 * @returns {Object|null} - Current request context
 */
function getRequestContext() {
    if (!asyncContext) {
        return null;
    }

    try {
        return asyncContext.getStore() || null;
    } catch {
        return null;
    }
}

/**
 * Mask sensitive field value
 * @param {*} value - Field value
 * @returns {string} - Masked value
 */
function maskValue(value) {
    if (value === undefined || value === null) {
        return value;
    }

    if (typeof value === 'string' && value.length > 0) {
        return '[REDACTED]';
    }

    if (Array.isArray(value)) {
        return '[REDACTED_ARRAY]';
    }

    return '[REDACTED]';
}

/**
 * Sanitize document for audit log storage
 * @param {Object} doc - Document to sanitize
 * @param {Set} excludeFields - Fields to exclude
 * @returns {Object} - Sanitized document
 */
function sanitizeDocument(doc, excludeFields = new Set()) {
    if (!doc) return null;

    const result = {};
    const obj = doc.toObject ? doc.toObject() : doc;

    for (const [key, value] of Object.entries(obj)) {
        // Skip internal mongoose fields
        if (key.startsWith('_') && key !== '_id') continue;
        if (key === '__v') continue;

        // Skip excluded fields
        if (excludeFields.has(key)) continue;

        // Mask sensitive fields
        if (SENSITIVE_FIELDS.has(key)) {
            result[key] = maskValue(value);
            continue;
        }

        // Handle nested objects
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof mongoose.Types.ObjectId) && !(value instanceof Date)) {
            result[key] = sanitizeDocument(value, excludeFields);
        } else {
            result[key] = value;
        }
    }

    return result;
}

/**
 * Calculate changes between two states
 * @param {Object} before - Before state
 * @param {Object} after - After state
 * @returns {Array} - Array of changes
 */
function calculateChanges(before, after) {
    if (!before || !after) return [];

    const changes = [];
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
        // Skip internal fields
        if (key === '_id' || key === '__v' || key === 'createdAt' || key === 'updatedAt') {
            continue;
        }

        const oldValue = before[key];
        const newValue = after[key];

        // Compare JSON representation for complex objects
        if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            changes.push({
                field: key,
                oldValue: SENSITIVE_FIELDS.has(key) ? maskValue(oldValue) : oldValue,
                newValue: SENSITIVE_FIELDS.has(key) ? maskValue(newValue) : newValue
            });
        }
    }

    return changes;
}

/**
 * Create audit log entry
 * @param {Object} options - Audit log options
 */
async function createAuditLog(options) {
    try {
        const AuditLog = mongoose.model('AuditLog');

        const {
            action,
            entityType,
            entityId,
            beforeState,
            afterState,
            changes,
            firmId,
            userId,
            userEmail,
            userRole,
            userName,
            ipAddress,
            userAgent,
            sessionId,
            method,
            endpoint
        } = options;

        // Get request context if not provided
        const context = getRequestContext();

        await AuditLog.log({
            firmId: firmId || context?.firmId,
            userId: userId || context?.userId,
            userEmail: userEmail || context?.userEmail || 'system',
            userRole: userRole || context?.userRole || 'admin',
            userName: userName || context?.userName,
            action,
            entityType,
            resourceType: entityType,
            entityId,
            resourceId: entityId,
            beforeState,
            afterState,
            changes,
            ipAddress: ipAddress || context?.ipAddress || '127.0.0.1',
            userAgent: userAgent || context?.userAgent,
            sessionId: sessionId || context?.sessionId,
            method: method || context?.method,
            endpoint: endpoint || context?.endpoint,
            status: 'success',
            timestamp: new Date()
        });
    } catch (error) {
        // Don't let audit log failure break operations
        logger.error('Failed to create audit log:', error);
    }
}

/**
 * Audit Log Mongoose Plugin
 * @param {mongoose.Schema} schema - Mongoose schema
 * @param {Object} options - Plugin options
 */
function auditLogPlugin(schema, options = {}) {
    const {
        exclude = [],      // Fields to exclude from logging
        modelName = null,  // Override model name
        skipActions = []   // Actions to skip: ['create', 'update', 'delete']
    } = options;

    const excludeFields = new Set([...exclude, ...SENSITIVE_FIELDS]);

    // Store original document for updates
    schema.pre('save', async function (next) {
        if (this.isNew) {
            this._auditAction = 'create';
        } else {
            this._auditAction = 'update';

            // Get original document for comparison
            try {
                const Model = this.constructor;
                const original = await Model.findById(this._id).lean();
                this._auditBeforeState = sanitizeDocument(original, excludeFields);
            } catch (error) {
                logger.debug('Could not fetch original document for audit:', error.message);
            }
        }

        next();
    });

    // Create audit log after save
    schema.post('save', async function (doc) {
        const effectiveModelName = modelName || this.constructor.modelName;

        if (SKIP_MODELS.has(effectiveModelName)) return;

        const action = this._auditAction || 'update';
        if (skipActions.includes(action)) return;

        const afterState = sanitizeDocument(doc, excludeFields);
        const beforeState = this._auditBeforeState;
        const changes = action === 'update' ? calculateChanges(beforeState, afterState) : [];

        await createAuditLog({
            action,
            entityType: effectiveModelName,
            entityId: doc._id,
            firmId: doc.firmId,
            beforeState: action === 'update' ? beforeState : null,
            afterState,
            changes
        });
    });

    // Handle findOneAndUpdate
    schema.pre('findOneAndUpdate', async function (next) {
        if (skipActions.includes('update')) return next();

        try {
            const docToUpdate = await this.model.findOne(this.getQuery()).lean();
            this._auditBeforeState = sanitizeDocument(docToUpdate, excludeFields);
            this._auditEntityId = docToUpdate?._id;
            this._auditFirmId = docToUpdate?.firmId;
        } catch (error) {
            logger.debug('Could not fetch document for audit:', error.message);
        }

        next();
    });

    schema.post('findOneAndUpdate', async function (doc) {
        if (skipActions.includes('update')) return;

        const effectiveModelName = modelName || this.model.modelName;
        if (SKIP_MODELS.has(effectiveModelName)) return;

        if (!doc) return;

        const afterState = sanitizeDocument(doc, excludeFields);
        const beforeState = this._auditBeforeState;
        const changes = calculateChanges(beforeState, afterState);

        await createAuditLog({
            action: 'update',
            entityType: effectiveModelName,
            entityId: this._auditEntityId || doc._id,
            firmId: this._auditFirmId || doc.firmId,
            beforeState,
            afterState,
            changes
        });
    });

    // Handle updateOne
    schema.pre('updateOne', async function (next) {
        if (skipActions.includes('update')) return next();

        try {
            const docToUpdate = await this.model.findOne(this.getQuery()).lean();
            this._auditBeforeState = sanitizeDocument(docToUpdate, excludeFields);
            this._auditEntityId = docToUpdate?._id;
            this._auditFirmId = docToUpdate?.firmId;
        } catch (error) {
            logger.debug('Could not fetch document for audit:', error.message);
        }

        next();
    });

    schema.post('updateOne', async function () {
        if (skipActions.includes('update')) return;

        const effectiveModelName = modelName || this.model.modelName;
        if (SKIP_MODELS.has(effectiveModelName)) return;

        try {
            const updatedDoc = await this.model.findOne(this.getQuery()).lean();
            const afterState = sanitizeDocument(updatedDoc, excludeFields);
            const beforeState = this._auditBeforeState;
            const changes = calculateChanges(beforeState, afterState);

            await createAuditLog({
                action: 'update',
                entityType: effectiveModelName,
                entityId: this._auditEntityId || updatedDoc?._id,
                firmId: this._auditFirmId || updatedDoc?.firmId,
                beforeState,
                afterState,
                changes
            });
        } catch (error) {
            logger.debug('Could not create audit log for updateOne:', error.message);
        }
    });

    // Handle findOneAndDelete
    schema.pre('findOneAndDelete', async function (next) {
        if (skipActions.includes('delete')) return next();

        try {
            const docToDelete = await this.model.findOne(this.getQuery()).lean();
            this._auditBeforeState = sanitizeDocument(docToDelete, excludeFields);
            this._auditEntityId = docToDelete?._id;
            this._auditFirmId = docToDelete?.firmId;
        } catch (error) {
            logger.debug('Could not fetch document for audit:', error.message);
        }

        next();
    });

    schema.post('findOneAndDelete', async function (doc) {
        if (skipActions.includes('delete')) return;

        const effectiveModelName = modelName || this.model.modelName;
        if (SKIP_MODELS.has(effectiveModelName)) return;

        await createAuditLog({
            action: 'delete',
            entityType: effectiveModelName,
            entityId: this._auditEntityId || doc?._id,
            firmId: this._auditFirmId || doc?.firmId,
            beforeState: this._auditBeforeState,
            afterState: null,
            changes: []
        });
    });

    // Handle deleteOne
    schema.pre('deleteOne', async function (next) {
        if (skipActions.includes('delete')) return next();

        try {
            const docToDelete = await this.model.findOne(this.getQuery()).lean();
            this._auditBeforeState = sanitizeDocument(docToDelete, excludeFields);
            this._auditEntityId = docToDelete?._id;
            this._auditFirmId = docToDelete?.firmId;
        } catch (error) {
            logger.debug('Could not fetch document for audit:', error.message);
        }

        next();
    });

    schema.post('deleteOne', async function () {
        if (skipActions.includes('delete')) return;

        const effectiveModelName = modelName || this.model.modelName;
        if (SKIP_MODELS.has(effectiveModelName)) return;

        await createAuditLog({
            action: 'delete',
            entityType: effectiveModelName,
            entityId: this._auditEntityId,
            firmId: this._auditFirmId,
            beforeState: this._auditBeforeState,
            afterState: null,
            changes: []
        });
    });
}

/**
 * Apply global audit logging to all mongoose models
 */
function applyGlobalAuditLogging() {
    mongoose.plugin(auditLogPlugin);
    logger.info('Global audit logging plugin applied to all models');
}

/**
 * Create request context middleware
 * Sets up async context for audit logging
 */
function createAuditContextMiddleware(als) {
    setAsyncContext(als);

    return (req, res, next) => {
        const store = {
            firmId: req.firmId || req.user?.firmId,
            userId: req.userID || req.user?._id,
            userEmail: req.user?.email,
            userRole: req.user?.role,
            userName: req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : req.user?.email,
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers?.['user-agent'],
            sessionId: req.sessionID || req.headers?.['x-session-id'],
            method: req.method,
            endpoint: req.originalUrl
        };

        als.run(store, () => {
            next();
        });
    };
}

module.exports = {
    auditLogPlugin,
    applyGlobalAuditLogging,
    createAuditContextMiddleware,
    setAsyncContext,
    getRequestContext,
    createAuditLog,
    SKIP_MODELS,
    SENSITIVE_FIELDS
};
