/**
 * CRM Settings Controller
 *
 * Handles CRM configuration operations.
 */

const CRMSettings = require('../models/crmSettings.model');
const CrmActivity = require('../models/crmActivity.model');

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

        const firmId = req.firmId;

        // Get or create settings
        const settings = await CRMSettings.getOrCreate(firmId);

        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error getting CRM settings:', error);
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

        const firmId = req.firmId;
        const userId = req.userID;
        const updates = req.body;

        // Build update object with dot notation for nested updates
        const updateObj = {};

        const sections = [
            'leadSettings', 'caseSettings', 'quoteSettings',
            'communicationSettings', 'appointmentSettings', 'namingSettings',
            'territorySettings', 'salesPersonSettings', 'conversionSettings'
        ];

        for (const section of sections) {
            if (updates[section]) {
                for (const [key, value] of Object.entries(updates[section])) {
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
        console.error('Error updating CRM settings:', error);
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

        const firmId = req.firmId;
        const userId = req.userID;

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
        console.error('Error resetting CRM settings:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إعادة تعيين الإعدادات / Error resetting settings',
            error: error.message
        });
    }
};
