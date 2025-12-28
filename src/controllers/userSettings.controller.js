/**
 * User Settings Controller
 *
 * Simple API for user dashboard preferences (view mode, etc.)
 * Frontend controls what to show based on these preferences.
 */

const DashboardSettings = require('../models/dashboardSettings.model');
const { CustomException } = require('../utils');
const logger = require('../utils/logger');

/**
 * GET /api/user-settings
 * Get all user settings
 */
const getSettings = async (req, res) => {
    try {
        const userId = req.userID;
        const firmId = req.firmQuery?.firmId;
        const lawyerId = req.firmQuery?.lawyerId;

        const settings = await DashboardSettings.getOrCreate(userId, firmId, lawyerId);

        return res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        logger.error('getSettings ERROR:', error);
        return res.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch settings'
        });
    }
};

/**
 * GET /api/user-settings/view-mode/:module
 * Get view mode for a specific module
 */
const getModuleViewMode = async (req, res) => {
    try {
        const userId = req.userID;
        const { module } = req.params;

        const validModules = ['crm', 'sales', 'finance', 'hr', 'cases'];
        if (!validModules.includes(module)) {
            throw new CustomException(`Invalid module: ${module}`, 400);
        }

        const viewMode = await DashboardSettings.getModuleViewMode(userId, module);

        return res.json({
            success: true,
            data: { module, viewMode }
        });
    } catch (error) {
        logger.error('getModuleViewMode ERROR:', error);
        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to fetch view mode'
        });
    }
};

/**
 * PUT /api/user-settings/view-mode/:module
 * Update view mode for a specific module
 */
const updateModuleViewMode = async (req, res) => {
    try {
        const userId = req.userID;
        const { module } = req.params;
        const { viewMode } = req.body;

        if (!viewMode || !['basic', 'advanced'].includes(viewMode)) {
            throw new CustomException('viewMode must be "basic" or "advanced"', 400);
        }

        const settings = await DashboardSettings.updateModuleViewMode(userId, module, viewMode);

        return res.json({
            success: true,
            message: `${module} view mode updated to ${viewMode}`,
            data: {
                module,
                viewMode: settings[module]?.viewMode || viewMode
            }
        });
    } catch (error) {
        logger.error('updateModuleViewMode ERROR:', error);
        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to update view mode'
        });
    }
};

/**
 * PUT /api/user-settings/global-view-mode
 * Update global view mode (applies to all modules)
 */
const updateGlobalViewMode = async (req, res) => {
    try {
        const userId = req.userID;
        const { viewMode } = req.body;

        if (!viewMode || !['basic', 'advanced'].includes(viewMode)) {
            throw new CustomException('viewMode must be "basic" or "advanced"', 400);
        }

        const settings = await DashboardSettings.updateGlobalViewMode(userId, viewMode);

        return res.json({
            success: true,
            message: `Global view mode updated to ${viewMode}`,
            data: {
                globalViewMode: settings.globalViewMode,
                crm: settings.crm?.viewMode,
                sales: settings.sales?.viewMode,
                finance: settings.finance?.viewMode,
                hr: settings.hr?.viewMode,
                cases: settings.cases?.viewMode
            }
        });
    } catch (error) {
        logger.error('updateGlobalViewMode ERROR:', error);
        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to update global view mode'
        });
    }
};

/**
 * PUT /api/user-settings/module/:module
 * Update module-specific settings (period, chart type, page size, etc.)
 */
const updateModuleSettings = async (req, res) => {
    try {
        const userId = req.userID;
        const { module } = req.params;
        const { defaultPeriod, preferredChartType, pageSize, defaultSort } = req.body;

        const validModules = ['crm', 'sales', 'finance', 'hr', 'cases'];
        if (!validModules.includes(module)) {
            throw new CustomException(`Invalid module: ${module}`, 400);
        }

        const updates = {};
        if (defaultPeriod && ['week', 'month', 'quarter', 'year'].includes(defaultPeriod)) {
            updates[`${module}.defaultPeriod`] = defaultPeriod;
        }
        if (preferredChartType && ['bar', 'line', 'pie', 'doughnut', 'area'].includes(preferredChartType)) {
            updates[`${module}.preferredChartType`] = preferredChartType;
        }
        if (pageSize && pageSize >= 10 && pageSize <= 100) {
            updates[`${module}.pageSize`] = pageSize;
        }
        if (defaultSort && defaultSort.field) {
            updates[`${module}.defaultSort`] = defaultSort;
        }

        if (Object.keys(updates).length === 0) {
            throw new CustomException('No valid settings to update', 400);
        }

        updates.lastModifiedAt = new Date();

        const settings = await DashboardSettings.findOneAndUpdate(
            { userId },
            { $set: updates, $inc: { version: 1 } },
            { new: true, upsert: true }
        );

        return res.json({
            success: true,
            message: `${module} settings updated`,
            data: settings[module]
        });
    } catch (error) {
        logger.error('updateModuleSettings ERROR:', error);
        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to update module settings'
        });
    }
};

/**
 * POST /api/user-settings/toggle-section
 * Toggle collapsed/expanded state for a section
 */
const toggleSection = async (req, res) => {
    try {
        const userId = req.userID;
        const { module, sectionId } = req.body;

        if (!module || !sectionId) {
            throw new CustomException('module and sectionId are required', 400);
        }

        const settings = await DashboardSettings.toggleSection(userId, module, sectionId);

        return res.json({
            success: true,
            data: {
                collapsedSections: settings[module]?.collapsedSections || []
            }
        });
    } catch (error) {
        logger.error('toggleSection ERROR:', error);
        return res.status(error.status || 500).json({
            error: true,
            message: error.message || 'Failed to toggle section'
        });
    }
};

module.exports = {
    getSettings,
    getModuleViewMode,
    updateModuleViewMode,
    updateGlobalViewMode,
    updateModuleSettings,
    toggleSection
};
