/**
 * CRM Settings Controller
 *
 * GOLD STANDARD: Follows FIRM_ISOLATION.md patterns
 * - Uses req.firmQuery (not req.firmId) for tenant isolation
 * - Supports both firm members and solo lawyers
 * - Uses req.addFirmId() for creates
 * - Implements caching for performance optimization (Issue #5 fix)
 *
 * DEBUG MODE: Extensive logging for troubleshooting 40s load times
 */

const CRMSettings = require('../models/crmSettings.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const cache = require('../services/cache.service');
const QueueService = require('../services/queue.service');

// Cache settings
const CRM_SETTINGS_CACHE_TTL = 300; // 5 minutes cache TTL

// ═══════════════════════════════════════════════════════════════
// DEBUG LOGGING HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Detailed debug logging for CRM Settings operations
 * Helps diagnose 40-second load time issues
 */
const debugLog = (endpoint, req, extra = {}) => {
    const debugInfo = {
        endpoint: `[CRM-SETTINGS] ${endpoint}`,
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        userId: req.userID,
        firmId: req.firmId,
        firmQuery: req.firmQuery,
        isSoloLawyer: req.isSoloLawyer,
        isDeparted: req.isDeparted,
        ...extra
    };
    logger.info(`🔍 [CRM-SETTINGS-DEBUG] ${endpoint}: ${JSON.stringify(debugInfo)}`);
};

const debugError = (endpoint, error, context = {}) => {
    const errorInfo = {
        endpoint: `[CRM-SETTINGS] ${endpoint}`,
        timestamp: new Date().toISOString(),
        errorMessage: error.message,
        errorStack: error.stack?.split('\n').slice(0, 5).join(' | '),
        errorName: error.name,
        ...context
    };
    logger.error(`❌ [CRM-SETTINGS-ERROR] ${endpoint}: ${JSON.stringify(errorInfo)}`);
};

const measureTime = (label, startTime) => {
    const duration = Date.now() - startTime;
    logger.info(`⏱️ [CRM-SETTINGS-TIMING] ${label}: ${duration}ms`);
    return duration;
};

/**
 * Generate cache key for CRM settings
 * @param {Object} firmQuery - Tenant query { firmId } or { lawyerId }
 * @returns {string} Cache key
 */
const getCrmSettingsCacheKey = (firmQuery) => {
    if (firmQuery?.firmId) {
        return `crm-settings:firm:${firmQuery.firmId}`;
    }
    if (firmQuery?.lawyerId) {
        return `crm-settings:lawyer:${firmQuery.lawyerId}`;
    }
    return null;
};

// ═══════════════════════════════════════════════════════════════
// GET CRM SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get CRM settings for the current firm/lawyer
 * GOLD STANDARD: Uses req.firmQuery for tenant isolation
 * OPTIMIZED: Implements caching with 5-minute TTL
 * DEBUG: Extensive timing logs for 40s load investigation
 */
exports.getSettings = async (req, res) => {
    const totalStart = Date.now();
    debugLog('getSettings', req, { step: 'START' });

    try {
        if (req.isDeparted) {
            debugLog('getSettings', req, { step: 'BLOCKED', reason: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Try cache first
        const cacheStart = Date.now();
        const cacheKey = getCrmSettingsCacheKey(req.firmQuery);
        debugLog('getSettings', req, { step: 'CACHE_CHECK', cacheKey });

        if (cacheKey) {
            const cachedSettings = await cache.get(cacheKey);
            measureTime('cache.get', cacheStart);

            if (cachedSettings) {
                measureTime('TOTAL (CACHED)', totalStart);
                debugLog('getSettings', req, {
                    step: 'CACHE_HIT',
                    hasAppointmentSettings: !!cachedSettings.appointmentSettings,
                    hasWorkingHours: !!cachedSettings.appointmentSettings?.workingHours
                });
                return res.json({
                    success: true,
                    data: cachedSettings,
                    cached: true,
                    timing: { total: Date.now() - totalStart, source: 'cache' }
                });
            }
            debugLog('getSettings', req, { step: 'CACHE_MISS' });
        }

        // GOLD STANDARD: Use req.firmQuery (supports both firms and solo lawyers)
        const dbStart = Date.now();
        debugLog('getSettings', req, { step: 'DB_QUERY_START', firmQuery: req.firmQuery });

        let settings = await CRMSettings.findOne(req.firmQuery).lean();
        measureTime('CRMSettings.findOne', dbStart);

        debugLog('getSettings', req, {
            step: 'DB_QUERY_DONE',
            found: !!settings,
            settingsId: settings?._id?.toString()
        });

        // If not found, create with defaults
        if (!settings) {
            const createStart = Date.now();
            debugLog('getSettings', req, { step: 'CREATE_NEW_SETTINGS' });
            const newSettings = await CRMSettings.create(req.firmQuery);
            settings = newSettings.toObject();
            measureTime('CRMSettings.create', createStart);
        }

        // Cache the result
        if (cacheKey) {
            const cacheSetStart = Date.now();
            await cache.set(cacheKey, settings, CRM_SETTINGS_CACHE_TTL);
            measureTime('cache.set', cacheSetStart);
        }

        const totalTime = measureTime('TOTAL (DB)', totalStart);
        debugLog('getSettings', req, {
            step: 'SUCCESS',
            totalTime,
            hasAppointmentSettings: !!settings.appointmentSettings,
            hasWorkingHours: !!settings.appointmentSettings?.workingHours,
            workingHoursDays: settings.appointmentSettings?.workingHours ? Object.keys(settings.appointmentSettings.workingHours) : []
        });

        res.json({
            success: true,
            data: settings,
            timing: { total: totalTime, source: 'database' }
        });
    } catch (error) {
        debugError('getSettings', error, { firmQuery: req.firmQuery });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الإعدادات / Error fetching settings',
            error: error.message,
            errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE CRM SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Update CRM settings (partial update supported)
 * GOLD STANDARD: Uses req.firmQuery for tenant isolation
 * DEBUG: Extensive logging for Working Hours (إدارة أوقات العمل) troubleshooting
 */
exports.updateSettings = async (req, res) => {
    const totalStart = Date.now();
    debugLog('updateSettings', req, {
        step: 'START',
        bodyKeys: Object.keys(req.body || {}),
        bodySize: JSON.stringify(req.body || {}).length
    });

    // Log the full request body for debugging
    logger.info(`📝 [CRM-SETTINGS-DEBUG] updateSettings FULL BODY: ${JSON.stringify(req.body, null, 2)}`);

    try {
        if (req.isDeparted) {
            debugLog('updateSettings', req, { step: 'BLOCKED', reason: 'isDeparted' });
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const userId = sanitizeObjectId(req.userID);
        if (!userId) {
            debugLog('updateSettings', req, { step: 'ERROR', reason: 'Invalid user ID' });
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // Mass assignment protection - only allow specific sections
        const allowedSections = [
            'leadSettings',
            'caseSettings',
            'quoteSettings',
            'communicationSettings',
            'appointmentSettings',
            'namingSettings',
            'territorySettings',
            'salesPersonSettings',
            'conversionSettings'
        ];

        const updates = pickAllowedFields(req.body, allowedSections);
        debugLog('updateSettings', req, {
            step: 'AFTER_PICK_ALLOWED',
            updatesKeys: Object.keys(updates || {}),
            hasAppointmentSettings: !!updates.appointmentSettings,
            appointmentSettingsKeys: updates.appointmentSettings ? Object.keys(updates.appointmentSettings) : []
        });

        // Input validation - ensure updates is an object
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            debugLog('updateSettings', req, { step: 'VALIDATION_ERROR', reason: 'Invalid data format' });
            return res.status(400).json({
                success: false,
                message: 'Invalid settings data format'
            });
        }

        // Validate that at least one valid section is being updated
        if (Object.keys(updates).length === 0) {
            debugLog('updateSettings', req, {
                step: 'VALIDATION_ERROR',
                reason: 'No valid sections',
                receivedKeys: Object.keys(req.body || {}),
                allowedSections
            });
            return res.status(400).json({
                success: false,
                message: 'No valid settings sections provided for update',
                debug: {
                    receivedKeys: Object.keys(req.body || {}),
                    allowedSections,
                    hint: 'Request body must contain one of the allowed sections'
                }
            });
        }

        // Build update object with dot notation for nested updates
        const updateObj = {};

        for (const section of allowedSections) {
            if (updates[section] && typeof updates[section] === 'object' && !Array.isArray(updates[section])) {
                // Validate section data
                for (const [key, value] of Object.entries(updates[section])) {
                    // Prevent prototype pollution
                    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                        continue;
                    }

                    // Sanitize the value if it's a string to prevent injection
                    if (typeof value === 'string' && value.length > 10000) {
                        debugLog('updateSettings', req, { step: 'VALIDATION_ERROR', reason: `Value too long for ${section}.${key}` });
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value length for ${section}.${key}`
                        });
                    }

                    updateObj[`${section}.${key}`] = value;
                }
            }
        }

        debugLog('updateSettings', req, {
            step: 'UPDATE_OBJ_BUILT',
            updateObjKeys: Object.keys(updateObj),
            hasWorkingHours: Object.keys(updateObj).some(k => k.includes('workingHours'))
        });

        // Log the actual MongoDB update object
        logger.info(`📝 [CRM-SETTINGS-DEBUG] updateSettings UPDATE_OBJ: ${JSON.stringify(updateObj, null, 2)}`);

        // GOLD STANDARD: Use req.firmQuery for tenant-isolated update
        const dbStart = Date.now();
        debugLog('updateSettings', req, { step: 'DB_UPDATE_START', firmQuery: req.firmQuery });

        const settings = await CRMSettings.findOneAndUpdate(
            { ...req.firmQuery },
            {
                $set: {
                    ...updateObj,
                    updatedAt: new Date()
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        measureTime('CRMSettings.findOneAndUpdate', dbStart);

        debugLog('updateSettings', req, {
            step: 'DB_UPDATE_DONE',
            settingsId: settings?._id?.toString(),
            hasAppointmentSettings: !!settings?.appointmentSettings,
            hasWorkingHours: !!settings?.appointmentSettings?.workingHours
        });

        // If upsert created a new doc, ensure it has the tenant context
        if (!settings.firmId && !settings.lawyerId) {
            debugLog('updateSettings', req, { step: 'ADD_TENANT_CONTEXT' });
            if (req.firmQuery.firmId) {
                settings.firmId = req.firmQuery.firmId;
            } else if (req.firmQuery.lawyerId) {
                settings.lawyerId = req.firmQuery.lawyerId;
            }
            await settings.save();
        }

        // Invalidate cache after update
        const cacheKey = getCrmSettingsCacheKey(req.firmQuery);
        if (cacheKey) {
            await cache.del(cacheKey);
            debugLog('updateSettings', req, { step: 'CACHE_INVALIDATED', cacheKey });
        }

        // Log activity
        const activityStart = Date.now();
        QueueService.logActivity({
            lawyerId: userId,
            firmId: req.firmQuery?.firmId || null,
            type: 'settings_updated',
            entityType: 'crm_settings',
            entityId: settings._id,
            title: 'CRM settings updated',
            description: `Updated sections: ${Object.keys(updates).join(', ')}`,
            performedBy: userId
        });
        measureTime('CrmActivity.logActivity', activityStart);

        const totalTime = measureTime('TOTAL updateSettings', totalStart);
        debugLog('updateSettings', req, {
            step: 'SUCCESS',
            totalTime,
            updatedSections: Object.keys(updates),
            appointmentSettingsAfterUpdate: settings?.appointmentSettings ? Object.keys(settings.appointmentSettings) : []
        });

        res.json({
            success: true,
            message: 'تم تحديث الإعدادات بنجاح / Settings updated successfully',
            data: settings,
            timing: { total: totalTime }
        });
    } catch (error) {
        debugError('updateSettings', error, { body: req.body, firmQuery: req.firmQuery });
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث الإعدادات / Error updating settings',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// RESET CRM SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Reset CRM settings to defaults
 * GOLD STANDARD: Uses req.firmQuery for tenant isolation
 * OPTIMIZED: Invalidates cache on reset
 */
exports.resetSettings = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const userId = sanitizeObjectId(req.userID);
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }

        // GOLD STANDARD: Use req.firmQuery for tenant-isolated delete
        await CRMSettings.findOneAndDelete({ ...req.firmQuery });

        // Invalidate cache after reset
        const cacheKey = getCrmSettingsCacheKey(req.firmQuery);
        if (cacheKey) {
            await cache.del(cacheKey);
        }

        // Create fresh settings with tenant context
        const settings = await CRMSettings.create(req.firmQuery);

        // Log activity
        QueueService.logActivity({
            lawyerId: userId,
            firmId: req.firmQuery?.firmId || null,
            type: 'settings_reset',
            entityType: 'crm_settings',
            entityId: settings._id,
            title: 'CRM settings reset to defaults',
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم إعادة تعيين الإعدادات / Settings reset to defaults',
            data: settings
        });
    } catch (error) {
        logger.error('Error resetting CRM settings', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطأ في إعادة تعيين الإعدادات / Error resetting settings',
            error: error.message
        });
    }
};
