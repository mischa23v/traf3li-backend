/**
 * CRM Settings Controller
 *
 * Handles CRM configuration operations.
 */

const CRMSettings = require('../models/crmSettings.model');
const CrmActivity = require('../models/crmActivity.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// GET CRM SETTINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Get CRM settings for the current firm
 */
exports.getSettings = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = sanitizeObjectId(req.firmId);
        if (!firmId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid firm ID'
            });
        }

        // Get or create settings
        const settings = await CRMSettings.getOrCreate(firmId);

        // IDOR Protection: Verify the settings belong to the user's firm
        if (settings && settings.firmId.toString() !== firmId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
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
 */
exports.updateSettings = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = sanitizeObjectId(req.firmId);
        const userId = sanitizeObjectId(req.userID);

        if (!firmId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid firm ID or user ID'
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

        // IDOR Protection: Verify existing settings belong to the user's firm
        const existingSettings = await CRMSettings.findOne({ firmId });
        if (existingSettings && existingSettings.firmId.toString() !== firmId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
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

        // Perform update
        const settings = await CRMSettings.findOneAndUpdate(
            { firmId },
            {
                $set: {
                    ...updateObj,
                    updatedAt: new Date()
                }
            },
            { new: true, upsert: true }
        );

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
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
 */
exports.resetSettings = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const firmId = sanitizeObjectId(req.firmId);
        const userId = sanitizeObjectId(req.userID);

        if (!firmId || !userId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid firm ID or user ID'
            });
        }

        // IDOR Protection: Verify existing settings belong to the user's firm before deleting
        const existingSettings = await CRMSettings.findOne({ firmId });
        if (existingSettings && existingSettings.firmId.toString() !== firmId.toString()) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        // Delete existing and create fresh
        await CRMSettings.findOneAndDelete({ firmId });
        const settings = await CRMSettings.create({ firmId });

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
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
