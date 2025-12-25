const QualityInspection = require('../models/qualityInspection.model');
const QualityTemplate = require('../models/qualityTemplate.model');
const QualityAction = require('../models/qualityAction.model');
const QualitySettings = require('../models/qualitySettings.model');
const logger = require('../utils/logger');
const { CustomException } = require('../utils');

/**
 * Get inspections with filters
 * @param {Object} query - Query filters
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} Inspections with pagination
 */
const getInspections = async (query, firmId) => {
    try {
        const {
            inspectionType,
            status,
            itemId,
            referenceType,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20,
            sortBy = 'inspectionDate',
            sortOrder = 'desc'
        } = query;

        const filter = { firmId };

        // Apply filters
        if (inspectionType) {
            filter.inspectionType = inspectionType;
        }
        if (status) {
            filter.status = status;
        }
        if (itemId) {
            filter.itemId = itemId;
        }
        if (referenceType) {
            filter.referenceType = referenceType;
        }

        // Date range filter
        if (dateFrom || dateTo) {
            filter.inspectionDate = {};
            if (dateFrom) {
                filter.inspectionDate.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                filter.inspectionDate.$lte = new Date(dateTo);
            }
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const [inspections, total] = await Promise.all([
            QualityInspection.find(filter)
                .populate('itemId', 'itemCode itemName')
                .populate('inspectedBy', 'firstName lastName email')
                .populate('templateId', 'name')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            QualityInspection.countDocuments(filter)
        ]);

        return {
            inspections,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error('Error fetching inspections:', error);
        throw error;
    }
};

/**
 * Get inspection by ID
 * @param {String} id - Inspection ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} Inspection document
 */
const getInspectionById = async (id, firmId) => {
    try {
        const inspection = await QualityInspection.findOne({ _id: id, firmId })
            .populate('itemId', 'itemCode itemName itemGroup')
            .populate('inspectedBy', 'firstName lastName email username')
            .populate('templateId', 'name parameters')
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .lean();

        if (!inspection) {
            throw CustomException('Inspection not found', 404);
        }

        return inspection;
    } catch (error) {
        logger.error('Error fetching inspection:', error);
        throw error;
    }
};

/**
 * Create new inspection
 * @param {Object} data - Inspection data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Created inspection
 */
const createInspection = async (data, firmId, userId) => {
    try {
        // If templateId is provided, populate parameters from template
        if (data.templateId) {
            const template = await QualityTemplate.findOne({
                _id: data.templateId,
                firmId,
                isActive: true
            });

            if (!template) {
                throw CustomException('Template not found or inactive', 404);
            }

            // Initialize readings from template parameters if not provided
            if (!data.readings || data.readings.length === 0) {
                data.readings = template.parameters.map(param => ({
                    parameterName: param.parameterName,
                    parameterNameAr: param.parameterNameAr,
                    specification: param.specification,
                    acceptanceCriteria: param.acceptanceCriteria,
                    minValue: param.minValue,
                    maxValue: param.maxValue,
                    value: null,
                    status: 'accepted',
                    remarks: ''
                }));
            }

            data.templateName = template.name;
        }

        const inspection = new QualityInspection({
            ...data,
            firmId,
            createdBy: userId,
            inspectedBy: userId,
            inspectedByName: data.inspectedByName || ''
        });

        await inspection.save();

        logger.info(`Inspection created: ${inspection._id} by user ${userId}`);

        return inspection;
    } catch (error) {
        logger.error('Error creating inspection:', error);
        throw error;
    }
};

/**
 * Update inspection
 * @param {String} id - Inspection ID
 * @param {Object} data - Update data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated inspection
 */
const updateInspection = async (id, data, firmId, userId) => {
    try {
        const inspection = await QualityInspection.findOne({ _id: id, firmId });

        if (!inspection) {
            throw CustomException('Inspection not found', 404);
        }

        // Prevent updating submitted/finalized inspections
        if (inspection.status !== 'pending' && data.status === 'pending') {
            throw CustomException('Cannot revert a finalized inspection to pending', 400);
        }

        // Update allowed fields
        Object.assign(inspection, {
            ...data,
            updatedBy: userId
        });

        await inspection.save();

        logger.info(`Inspection updated: ${id} by user ${userId}`);

        return inspection;
    } catch (error) {
        logger.error('Error updating inspection:', error);
        throw error;
    }
};

/**
 * Submit inspection - Finalize and update status based on readings
 * @param {String} id - Inspection ID
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Submitted inspection
 */
const submitInspection = async (id, firmId, userId) => {
    try {
        const inspection = await QualityInspection.findOne({ _id: id, firmId });

        if (!inspection) {
            throw CustomException('Inspection not found', 404);
        }

        if (inspection.status !== 'pending') {
            throw CustomException('Inspection has already been submitted', 400);
        }

        // Validate that all readings have been completed
        if (!inspection.readings || inspection.readings.length === 0) {
            throw CustomException('Cannot submit inspection without readings', 400);
        }

        // Evaluate inspection result based on readings
        const result = evaluateInspectionResult(inspection.readings);

        // Update inspection status and quantities
        inspection.status = result.status;
        inspection.acceptedQty = result.acceptedQty || 0;
        inspection.rejectedQty = result.rejectedQty || 0;
        inspection.updatedBy = userId;

        await inspection.save();

        // Auto-create quality action if inspection failed and settings allow
        const settings = await QualitySettings.getSettings(firmId);
        if (settings.integration?.autoCreateAction &&
            (result.status === 'rejected' || result.status === 'partially_accepted')) {

            const problemDescription = `Quality inspection ${inspection.inspectionNumber} failed for item ${inspection.itemName}. ${result.failedCount} out of ${result.totalReadings} parameters rejected.`;

            await createActionFromInspection(
                inspection._id,
                problemDescription,
                firmId,
                userId
            );
        }

        logger.info(`Inspection submitted: ${id} with status ${result.status} by user ${userId}`);

        return inspection;
    } catch (error) {
        logger.error('Error submitting inspection:', error);
        throw error;
    }
};

/**
 * Delete inspection
 * @param {String} id - Inspection ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<void>}
 */
const deleteInspection = async (id, firmId) => {
    try {
        const inspection = await QualityInspection.findOne({ _id: id, firmId });

        if (!inspection) {
            throw CustomException('Inspection not found', 404);
        }

        // Only allow deletion of pending inspections
        if (inspection.status !== 'pending') {
            throw CustomException('Cannot delete a finalized inspection', 400);
        }

        await inspection.deleteOne();

        logger.info(`Inspection deleted: ${id}`);
    } catch (error) {
        logger.error('Error deleting inspection:', error);
        throw error;
    }
};

/**
 * Get templates
 * @param {String} firmId - Firm ID
 * @returns {Promise<Array>} Templates
 */
const getTemplates = async (firmId) => {
    try {
        const templates = await QualityTemplate.find({ firmId, isActive: true })
            .populate('itemId', 'itemCode itemName')
            .populate('createdBy', 'firstName lastName')
            .sort({ name: 1 })
            .lean();

        return templates;
    } catch (error) {
        logger.error('Error fetching templates:', error);
        throw error;
    }
};

/**
 * Get template by ID
 * @param {String} id - Template ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} Template document
 */
const getTemplateById = async (id, firmId) => {
    try {
        const template = await QualityTemplate.findOne({ _id: id, firmId })
            .populate('itemId', 'itemCode itemName itemGroup')
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .lean();

        if (!template) {
            throw CustomException('Template not found', 404);
        }

        return template;
    } catch (error) {
        logger.error('Error fetching template:', error);
        throw error;
    }
};

/**
 * Create template
 * @param {Object} data - Template data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Created template
 */
const createTemplate = async (data, firmId, userId) => {
    try {
        const template = new QualityTemplate({
            ...data,
            firmId,
            createdBy: userId
        });

        await template.save();

        logger.info(`Template created: ${template._id} by user ${userId}`);

        return template;
    } catch (error) {
        logger.error('Error creating template:', error);
        throw error;
    }
};

/**
 * Update template
 * @param {String} id - Template ID
 * @param {Object} data - Update data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated template
 */
const updateTemplate = async (id, data, firmId, userId) => {
    try {
        const template = await QualityTemplate.findOne({ _id: id, firmId });

        if (!template) {
            throw CustomException('Template not found', 404);
        }

        // Update template
        Object.assign(template, {
            ...data,
            updatedBy: userId
        });

        await template.save();

        logger.info(`Template updated: ${id} by user ${userId}`);

        return template;
    } catch (error) {
        logger.error('Error updating template:', error);
        throw error;
    }
};

/**
 * Delete template
 * @param {String} id - Template ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<void>}
 */
const deleteTemplate = async (id, firmId) => {
    try {
        const template = await QualityTemplate.findOne({ _id: id, firmId });

        if (!template) {
            throw CustomException('Template not found', 404);
        }

        // Check if template is being used
        const usageCount = await QualityInspection.countDocuments({
            templateId: id,
            firmId
        });

        if (usageCount > 0) {
            throw CustomException(
                `Cannot delete template. It is being used by ${usageCount} inspection(s). Consider deactivating instead.`,
                400
            );
        }

        await template.deleteOne();

        logger.info(`Template deleted: ${id}`);
    } catch (error) {
        logger.error('Error deleting template:', error);
        throw error;
    }
};

/**
 * Get actions with filters
 * @param {Object} query - Query filters
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} Actions with pagination
 */
const getActions = async (query, firmId) => {
    try {
        const {
            status,
            actionType,
            responsiblePerson,
            dateFrom,
            dateTo,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = query;

        const filter = { firmId };

        // Apply filters
        if (status) {
            filter.status = status;
        }
        if (actionType) {
            filter.actionType = actionType;
        }
        if (responsiblePerson) {
            filter.responsiblePerson = responsiblePerson;
        }

        // Date range filter
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom) {
                filter.createdAt.$gte = new Date(dateFrom);
            }
            if (dateTo) {
                filter.createdAt.$lte = new Date(dateTo);
            }
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const [actions, total] = await Promise.all([
            QualityAction.find(filter)
                .populate('inspectionId', 'inspectionNumber itemName')
                .populate('itemId', 'itemCode itemName')
                .populate('responsiblePerson', 'firstName lastName email')
                .populate('verifiedBy', 'firstName lastName')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            QualityAction.countDocuments(filter)
        ]);

        return {
            actions,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error('Error fetching actions:', error);
        throw error;
    }
};

/**
 * Get action by ID
 * @param {String} id - Action ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} Action document
 */
const getActionById = async (id, firmId) => {
    try {
        const action = await QualityAction.findOne({ _id: id, firmId })
            .populate('inspectionId', 'inspectionNumber itemName status')
            .populate('itemId', 'itemCode itemName')
            .populate('responsiblePerson', 'firstName lastName email username')
            .populate('verifiedBy', 'firstName lastName email')
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email')
            .lean();

        if (!action) {
            throw CustomException('Action not found', 404);
        }

        return action;
    } catch (error) {
        logger.error('Error fetching action:', error);
        throw error;
    }
};

/**
 * Create action
 * @param {Object} data - Action data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Created action
 */
const createAction = async (data, firmId, userId) => {
    try {
        const action = new QualityAction({
            ...data,
            firmId,
            createdBy: userId
        });

        await action.save();

        logger.info(`Quality action created: ${action._id} by user ${userId}`);

        return action;
    } catch (error) {
        logger.error('Error creating action:', error);
        throw error;
    }
};

/**
 * Update action
 * @param {String} id - Action ID
 * @param {Object} data - Update data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated action
 */
const updateAction = async (id, data, firmId, userId) => {
    try {
        const action = await QualityAction.findOne({ _id: id, firmId });

        if (!action) {
            throw CustomException('Action not found', 404);
        }

        // Prevent modification of completed actions
        if (action.status === 'completed' && data.status !== 'completed') {
            throw CustomException('Cannot reopen a completed action', 400);
        }

        // Update action
        Object.assign(action, {
            ...data,
            updatedBy: userId
        });

        await action.save();

        logger.info(`Quality action updated: ${id} by user ${userId}`);

        return action;
    } catch (error) {
        logger.error('Error updating action:', error);
        throw error;
    }
};

/**
 * Delete action
 * @param {String} id - Action ID
 * @param {String} firmId - Firm ID
 * @returns {Promise<void>}
 */
const deleteAction = async (id, firmId) => {
    try {
        const action = await QualityAction.findOne({ _id: id, firmId });

        if (!action) {
            throw CustomException('Action not found', 404);
        }

        // Only allow deletion of open or cancelled actions
        if (action.status === 'completed') {
            throw CustomException('Cannot delete a completed action', 400);
        }

        await action.deleteOne();

        logger.info(`Quality action deleted: ${id}`);
    } catch (error) {
        logger.error('Error deleting action:', error);
        throw error;
    }
};

/**
 * Get quality statistics
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} Statistics
 */
const getStats = async (firmId) => {
    try {
        const [inspectionStats, actionStats] = await Promise.all([
            QualityInspection.getInspectionStats(firmId),
            QualityAction.getActionStats(firmId)
        ]);

        // Calculate pass/fail rates
        const totalCompleted = inspectionStats.accepted +
                              inspectionStats.rejected +
                              inspectionStats.partiallyAccepted;

        const passRate = totalCompleted > 0
            ? ((inspectionStats.accepted / totalCompleted) * 100).toFixed(2)
            : 0;

        const failRate = totalCompleted > 0
            ? ((inspectionStats.rejected / totalCompleted) * 100).toFixed(2)
            : 0;

        return {
            inspections: {
                ...inspectionStats,
                passRate: parseFloat(passRate),
                failRate: parseFloat(failRate),
                totalCompleted
            },
            actions: actionStats
        };
    } catch (error) {
        logger.error('Error fetching quality stats:', error);
        throw error;
    }
};

/**
 * Get quality settings
 * @param {String} firmId - Firm ID
 * @returns {Promise<Object>} Settings
 */
const getSettings = async (firmId) => {
    try {
        const settings = await QualitySettings.getSettings(firmId);
        return settings;
    } catch (error) {
        logger.error('Error fetching quality settings:', error);
        throw error;
    }
};

/**
 * Update quality settings
 * @param {Object} data - Settings data
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated settings
 */
const updateSettings = async (data, firmId, userId) => {
    try {
        const settings = await QualitySettings.updateSettings(firmId, data, userId);

        logger.info(`Quality settings updated for firm ${firmId} by user ${userId}`);

        return settings;
    } catch (error) {
        logger.error('Error updating quality settings:', error);
        throw error;
    }
};

/**
 * Evaluate inspection result based on readings
 * @param {Array} readings - Inspection readings
 * @returns {Object} Evaluation result
 */
const evaluateInspectionResult = (readings) => {
    if (!readings || readings.length === 0) {
        return {
            status: 'pending',
            passedCount: 0,
            failedCount: 0,
            totalReadings: 0
        };
    }

    const passedCount = readings.filter(r => r.status === 'accepted').length;
    const failedCount = readings.filter(r => r.status === 'rejected').length;
    const totalReadings = readings.length;

    let status;
    if (failedCount === 0 && passedCount > 0) {
        status = 'accepted';
    } else if (passedCount === 0 && failedCount > 0) {
        status = 'rejected';
    } else if (passedCount > 0 && failedCount > 0) {
        status = 'partially_accepted';
    } else {
        status = 'pending';
    }

    return {
        status,
        passedCount,
        failedCount,
        totalReadings,
        acceptedQty: passedCount,
        rejectedQty: failedCount
    };
};

/**
 * Create action from failed inspection
 * @param {String} inspectionId - Inspection ID
 * @param {String} problemDescription - Problem description
 * @param {String} firmId - Firm ID
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Created action
 */
const createActionFromInspection = async (inspectionId, problemDescription, firmId, userId) => {
    try {
        const inspection = await QualityInspection.findOne({ _id: inspectionId, firmId });

        if (!inspection) {
            throw CustomException('Inspection not found', 404);
        }

        // Create corrective action
        const action = new QualityAction({
            firmId,
            actionType: 'corrective',
            inspectionId: inspection._id,
            itemId: inspection.itemId,
            problem: problemDescription,
            action: 'Review and address quality issues identified in inspection',
            responsiblePerson: inspection.inspectedBy,
            targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            status: 'open',
            createdBy: userId
        });

        await action.save();

        logger.info(`Corrective action created from inspection ${inspectionId}`);

        return action;
    } catch (error) {
        logger.error('Error creating action from inspection:', error);
        throw error;
    }
};

module.exports = {
    // Inspections
    getInspections,
    getInspectionById,
    createInspection,
    updateInspection,
    submitInspection,
    deleteInspection,

    // Templates
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,

    // Actions
    getActions,
    getActionById,
    createAction,
    updateAction,
    deleteAction,

    // Stats & Settings
    getStats,
    getSettings,
    updateSettings,

    // Helper methods
    evaluateInspectionResult,
    createActionFromInspection
};
