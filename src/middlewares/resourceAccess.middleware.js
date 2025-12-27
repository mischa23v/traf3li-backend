/**
 * Resource Access Middleware - Centralized IDOR Protection
 *
 * Validates that requested resources belong to the user's firm.
 * Uses 404 responses to avoid revealing resource existence.
 */

const mongoose = require('mongoose');

// Model mapping for common route parameters
const PARAM_MODEL_MAP = {
    caseId: 'Case',
    clientId: 'Client',
    invoiceId: 'Invoice',
    documentId: 'Document',
    paymentId: 'Payment',
    expenseId: 'Expense',
    taskId: 'Task',
    eventId: 'Event',
    timeEntryId: 'TimeEntry',
    employeeId: 'Employee',
    contractId: 'Contract',
    proposalId: 'Proposal',
    leadId: 'Lead',
    matterId: 'Matter',
    trustAccountId: 'TrustAccount',
    trustTransactionId: 'TrustTransaction'
};

/**
 * Validate resource ownership
 */
const validateOwnership = async (resourceId, modelName, firmQuery) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(resourceId)) {
            return false;
        }

        const Model = mongoose.model(modelName);
        const query = { _id: resourceId, ...firmQuery };
        const exists = await Model.findOne(query).select('_id').lean();
        return !!exists;
    } catch (error) {
        // Model might not exist or other error - fail closed
        console.error(`[ResourceAccess] Error validating ${modelName}:`, error.message);
        return false;
    }
};

/**
 * Resource Access Middleware Factory
 *
 * @param {Object} options - Configuration options
 * @param {string} options.model - Specific model to check (for :id params)
 * @param {string} options.param - Specific param to check
 * @param {boolean} options.optional - If true, skip check when param is missing
 */
const resourceAccessMiddleware = (options = {}) => {
    return async (req, res, next) => {
        try {
            // Skip if no firm context (handled by firmFilter)
            if (!req.firmQuery) {
                return next();
            }

            const checksToPerform = [];

            // If specific model/param provided, check that
            if (options.model && options.param) {
                const resourceId = req.params[options.param];
                if (resourceId) {
                    checksToPerform.push({
                        param: options.param,
                        model: options.model,
                        resourceId
                    });
                } else if (!options.optional) {
                    return res.status(400).json({
                        success: false,
                        message: 'Missing required parameter'
                    });
                }
            }

            // Auto-detect common params
            for (const [param, model] of Object.entries(PARAM_MODEL_MAP)) {
                if (req.params[param] && !checksToPerform.find(c => c.param === param)) {
                    checksToPerform.push({
                        param,
                        model,
                        resourceId: req.params[param]
                    });
                }
            }

            // Handle generic :id param
            if (req.params.id && options.model && !checksToPerform.find(c => c.param === 'id')) {
                checksToPerform.push({
                    param: 'id',
                    model: options.model,
                    resourceId: req.params.id
                });
            }

            // Perform all checks
            for (const check of checksToPerform) {
                const isValid = await validateOwnership(
                    check.resourceId,
                    check.model,
                    req.firmQuery
                );

                if (!isValid) {
                    // Return 404 to avoid revealing resource existence
                    return res.status(404).json({
                        success: false,
                        message: 'Resource not found'
                    });
                }

                // Attach validated resource ID to request
                req.validatedResources = req.validatedResources || {};
                req.validatedResources[check.param] = check.resourceId;
            }

            next();
        } catch (error) {
            console.error('[ResourceAccess] Middleware error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
            });
        }
    };
};

/**
 * Quick helper for routes with :id param
 */
const checkResourceAccess = (modelName) => resourceAccessMiddleware({ model: modelName, param: 'id' });

/**
 * Check multiple resources in one call
 */
const checkMultipleResources = (mappings) => {
    return async (req, res, next) => {
        for (const [param, model] of Object.entries(mappings)) {
            const resourceId = req.params[param];
            if (resourceId) {
                const isValid = await validateOwnership(resourceId, model, req.firmQuery);
                if (!isValid) {
                    return res.status(404).json({
                        success: false,
                        message: 'Resource not found'
                    });
                }
            }
        }
        next();
    };
};

module.exports = {
    resourceAccessMiddleware,
    checkResourceAccess,
    checkMultipleResources,
    validateOwnership,
    PARAM_MODEL_MAP
};
