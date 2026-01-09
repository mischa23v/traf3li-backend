/**
 * Settings Sales Routes
 *
 * Sales-related settings management.
 * Follows gold standard security patterns from FIRM_ISOLATION.md.
 *
 * Endpoints:
 * - GET /                         - Get sales settings
 * - PUT /                         - Update sales settings
 * - GET /reset/:section           - Reset section to defaults
 * - GET /history                  - Get settings change history
 * - GET /export                   - Export sales settings
 * - POST /import                  - Import sales settings
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

// Allowed settings sections
const ALLOWED_SECTIONS = [
    'pipeline', 'stages', 'scoring', 'automation', 'notifications',
    'quotas', 'territories', 'commissions', 'forecasting'
];

// Default sales settings
const DEFAULT_SALES_SETTINGS = {
    pipeline: {
        defaultPipelineId: null,
        allowMultiplePipelines: true,
        requireProbability: true,
        requireExpectedCloseDate: true
    },
    stages: {
        requireStageNotes: false,
        autoUpdateProbability: true,
        stageDurationTracking: true
    },
    scoring: {
        enabled: true,
        autoScore: true,
        scoreThresholds: {
            hot: 80,
            warm: 50,
            cold: 20
        }
    },
    automation: {
        autoAssignLeads: false,
        roundRobinAssignment: false,
        autoFollowUp: true,
        followUpDays: 7
    },
    notifications: {
        dealWon: true,
        dealLost: true,
        stageChange: true,
        inactiveDeals: true,
        inactiveDays: 14
    },
    quotas: {
        trackQuotas: true,
        quotaPeriod: 'monthly',
        quotaType: 'revenue'
    },
    territories: {
        enabled: false,
        autoAssignByTerritory: false
    },
    commissions: {
        enabled: false,
        defaultRate: 5,
        calculationBasis: 'revenue'
    },
    forecasting: {
        enabled: true,
        method: 'weighted_pipeline',
        confidenceThreshold: 70
    }
};

/**
 * GET / - Get sales settings
 */
router.get('/', async (req, res, next) => {
    try {
        const { section } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('settings.sales').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const salesSettings = firm.settings?.sales || DEFAULT_SALES_SETTINGS;

        if (section) {
            if (!ALLOWED_SECTIONS.includes(section)) {
                throw CustomException(`Invalid section. Must be one of: ${ALLOWED_SECTIONS.join(', ')}`, 400);
            }
            return res.json({
                success: true,
                data: salesSettings[section] || DEFAULT_SALES_SETTINGS[section] || {}
            });
        }

        // Merge with defaults for any missing sections
        const mergedSettings = { ...DEFAULT_SALES_SETTINGS };
        Object.keys(salesSettings).forEach(key => {
            if (typeof salesSettings[key] === 'object' && !Array.isArray(salesSettings[key])) {
                mergedSettings[key] = { ...mergedSettings[key], ...salesSettings[key] };
            } else {
                mergedSettings[key] = salesSettings[key];
            }
        });

        res.json({
            success: true,
            data: mergedSettings
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT / - Update sales settings
 */
router.put('/', async (req, res, next) => {
    try {
        const { section } = req.query;
        const updates = req.body;

        const firm = await Firm.findOne(req.firmQuery).select('settings.sales settings.salesSettingsHistory');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.settings) firm.settings = {};
        if (!firm.settings.sales) firm.settings.sales = { ...DEFAULT_SALES_SETTINGS };
        if (!firm.settings.salesSettingsHistory) firm.settings.salesSettingsHistory = [];

        // Store previous settings for history
        const previousSettings = JSON.parse(JSON.stringify(firm.settings.sales));

        if (section) {
            if (!ALLOWED_SECTIONS.includes(section)) {
                throw CustomException(`Invalid section. Must be one of: ${ALLOWED_SECTIONS.join(', ')}`, 400);
            }

            // Update specific section
            firm.settings.sales[section] = {
                ...firm.settings.sales[section],
                ...updates
            };
        } else {
            // Update multiple sections
            Object.keys(updates).forEach(key => {
                if (ALLOWED_SECTIONS.includes(key)) {
                    firm.settings.sales[key] = {
                        ...firm.settings.sales[key],
                        ...updates[key]
                    };
                }
            });
        }

        // Add to history (keep last 50)
        firm.settings.salesSettingsHistory.push({
            _id: new mongoose.Types.ObjectId(),
            previousSettings,
            changedAt: new Date(),
            changedBy: req.userID,
            section: section || 'multiple',
            changes: updates
        });

        if (firm.settings.salesSettingsHistory.length > 50) {
            firm.settings.salesSettingsHistory = firm.settings.salesSettingsHistory.slice(-50);
        }

        await firm.save();

        res.json({
            success: true,
            message: 'Sales settings updated',
            data: firm.settings.sales
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /reset/:section - Reset section to defaults
 */
router.get('/reset/:section', async (req, res, next) => {
    try {
        const { section } = req.params;
        const { confirm } = req.query;

        if (!ALLOWED_SECTIONS.includes(section)) {
            throw CustomException(`Invalid section. Must be one of: ${ALLOWED_SECTIONS.join(', ')}`, 400);
        }

        if (confirm !== 'true') {
            return res.json({
                success: true,
                message: 'Add ?confirm=true to reset this section to defaults',
                currentSettings: DEFAULT_SALES_SETTINGS[section],
                warning: 'This will overwrite current settings for this section'
            });
        }

        const firm = await Firm.findOne(req.firmQuery).select('settings.sales settings.salesSettingsHistory');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.settings) firm.settings = {};
        if (!firm.settings.sales) firm.settings.sales = {};
        if (!firm.settings.salesSettingsHistory) firm.settings.salesSettingsHistory = [];

        // Store previous for history
        const previous = firm.settings.sales[section];

        // Reset to defaults
        firm.settings.sales[section] = { ...DEFAULT_SALES_SETTINGS[section] };

        // Add to history
        firm.settings.salesSettingsHistory.push({
            _id: new mongoose.Types.ObjectId(),
            previousSettings: { [section]: previous },
            changedAt: new Date(),
            changedBy: req.userID,
            section,
            changes: { action: 'reset_to_defaults' }
        });

        await firm.save();

        res.json({
            success: true,
            message: `${section} settings reset to defaults`,
            data: firm.settings.sales[section]
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /history - Get settings change history
 */
router.get('/history', async (req, res, next) => {
    try {
        const { page, limit } = sanitizePagination(req.query);
        const { section } = req.query;

        const firm = await Firm.findOne(req.firmQuery).select('settings.salesSettingsHistory').lean();
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        let history = firm.settings?.salesSettingsHistory || [];

        if (section) {
            history = history.filter(h => h.section === section || h.section === 'multiple');
        }

        // Sort by date descending
        history.sort((a, b) => new Date(b.changedAt) - new Date(a.changedAt));

        const total = history.length;
        const paginatedHistory = history.slice((page - 1) * limit, page * limit);

        res.json({
            success: true,
            data: paginatedHistory,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /export - Export sales settings
 */
router.get('/export', async (req, res, next) => {
    try {
        const { includeHistory } = req.query;

        const firm = await Firm.findOne(req.firmQuery)
            .select('settings.sales settings.salesSettingsHistory name')
            .lean();

        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        const exportData = {
            firmName: firm.name,
            exportedAt: new Date().toISOString(),
            version: '1.0',
            settings: firm.settings?.sales || DEFAULT_SALES_SETTINGS
        };

        if (includeHistory === 'true') {
            exportData.history = (firm.settings?.salesSettingsHistory || [])
                .slice(-20) // Last 20 changes
                .map(h => ({
                    changedAt: h.changedAt,
                    section: h.section,
                    changes: h.changes
                }));
        }

        res.json({
            success: true,
            data: exportData
        });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /import - Import sales settings
 */
router.post('/import', async (req, res, next) => {
    try {
        const { settings, overwrite } = req.body;

        if (!settings || typeof settings !== 'object') {
            throw CustomException('Settings object is required', 400);
        }

        const firm = await Firm.findOne(req.firmQuery).select('settings.sales settings.salesSettingsHistory');
        if (!firm) {
            throw CustomException('Firm not found', 404);
        }

        if (!firm.settings) firm.settings = {};
        if (!firm.settings.salesSettingsHistory) firm.settings.salesSettingsHistory = [];

        // Store previous for history
        const previousSettings = JSON.parse(JSON.stringify(firm.settings.sales || {}));

        // Validate and filter imported settings
        const validSettings = {};
        const skippedSections = [];

        Object.keys(settings).forEach(key => {
            if (ALLOWED_SECTIONS.includes(key)) {
                if (overwrite === 'true' || !firm.settings.sales?.[key]) {
                    validSettings[key] = settings[key];
                } else {
                    // Merge with existing
                    validSettings[key] = {
                        ...firm.settings.sales[key],
                        ...settings[key]
                    };
                }
            } else {
                skippedSections.push(key);
            }
        });

        // Apply settings
        if (!firm.settings.sales) firm.settings.sales = {};
        Object.assign(firm.settings.sales, validSettings);

        // Add to history
        firm.settings.salesSettingsHistory.push({
            _id: new mongoose.Types.ObjectId(),
            previousSettings,
            changedAt: new Date(),
            changedBy: req.userID,
            section: 'import',
            changes: { action: 'imported', sectionsImported: Object.keys(validSettings) }
        });

        await firm.save();

        res.json({
            success: true,
            message: 'Sales settings imported',
            data: {
                sectionsImported: Object.keys(validSettings),
                skippedSections,
                overwrite: overwrite === 'true'
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
