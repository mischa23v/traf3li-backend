/**
 * CRM Settings Controller
 *
 * GOLD STANDARD: Follows FIRM_ISOLATION.md patterns
 * - Uses req.firmQuery (not req.firmId) for tenant isolation
 * - Supports both firm members and solo lawyers
 * - Uses req.addFirmId() for creates
 * - Implements caching for performance optimization (Issue #5 fix)
 */

const CRMSettings = require('../models/crmSettings.model');
const CrmActivity = require('../models/crmActivity.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const cache = require('../services/cache.service');

// Cache settings
const CRM_SETTINGS_CACHE_TTL = 300; // 5 minutes cache TTL

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
 */
exports.getSettings = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Try cache first
        const cacheKey = getCrmSettingsCacheKey(req.firmQuery);
        if (cacheKey) {
            const cachedSettings = await cache.get(cacheKey);
            if (cachedSettings) {
                return res.json({
                    success: true,
                    data: cachedSettings,
                    cached: true
                });
            }
        }

        // GOLD STANDARD: Use req.firmQuery (supports both firms and solo lawyers)
        // Get or create settings with lazy initialization
        // OPTIMIZED: Use .lean() for better performance
        let settings = await CRMSettings.findOne(req.firmQuery).lean();

        // If not found, create with defaults
        if (!settings) {
            const newSettings = await CRMSettings.create(req.firmQuery);
            settings = newSettings.toObject();
        }

        // Cache the result
        if (cacheKey) {
            await cache.set(cacheKey, settings, CRM_SETTINGS_CACHE_TTL);
        }

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error('Error getting CRM settings', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب الإعدادات / Error fetching settings',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE CRM SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Update CRM settings (partial update supported)
 * GOLD STANDARD: Uses req.firmQuery for tenant isolation
 */
exports.updateSettings = async (req, res) => {
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

        // Input validation - ensure updates is an object
        if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid settings data format'
            });
        }

        // Validate that at least one valid section is being updated
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid settings sections provided for update'
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
                        return res.status(400).json({
                            success: false,
                            message: `Invalid value length for ${section}.${key}`
                        });
                    }

                    updateObj[`${section}.${key}`] = value;
                }
            }
        }

        // GOLD STANDARD: Use req.firmQuery for tenant-isolated update
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

        // If upsert created a new doc, ensure it has the tenant context
        if (!settings.firmId && !settings.lawyerId) {
            // Add tenant context from req.firmQuery
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
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            firmId: req.firmQuery?.firmId || null,
            type: 'settings_updated',
            entityType: 'crm_settings',
            entityId: settings._id,
            title: 'CRM settings updated',
            description: `Updated sections: ${Object.keys(updates).join(', ')}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تحديث الإعدادات بنجاح / Settings updated successfully',
            data: settings
        });
    } catch (error) {
        logger.error('Error updating CRM settings', { error: error.message });
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
        await CrmActivity.logActivity({
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
