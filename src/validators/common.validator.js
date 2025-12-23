/**
 * Common Validation Utilities
 *
 * Shared validation functions used across multiple route validators.
 */

const Joi = require('joi');

/**
 * Custom validator for MongoDB ObjectId
 */
const objectIdValidator = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'معرف غير صالح / Invalid ID format'
});

/**
 * Middleware to validate ObjectId parameter
 * @param {string} paramName - Name of the parameter to validate
 */
const validateObjectIdParam = (paramName) => {
    return (req, res, next) => {
        const schema = Joi.object({
            [paramName]: objectIdValidator.required()
        });

        const { error } = schema.validate({ [paramName]: req.params[paramName] });
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message,
                    messageAr: 'معرف غير صالح'
                }
            });
        }
        next();
    };
};

/**
 * Middleware to validate query pagination parameters
 */
const validateQueryPagination = (req, res, next) => {
    const schema = Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    }).unknown(true); // Allow other query parameters

    const { error, value } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الصفحة'
            }
        });
    }

    // Update query with validated values
    req.query.page = value.page;
    req.query.limit = value.limit;
    next();
};

/**
 * Middleware to validate sort parameters
 */
const validateSortParams = (allowedFields = []) => {
    return (req, res, next) => {
        const schema = Joi.object({
            sortBy: Joi.string().valid(...allowedFields).optional(),
            sortOrder: Joi.string().valid('asc', 'desc').default('desc')
        }).unknown(true);

        const { error, value } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: error.details[0].message,
                    messageAr: 'خطأ في معاملات الترتيب'
                }
            });
        }

        req.query.sortBy = value.sortBy;
        req.query.sortOrder = value.sortOrder;
        next();
    };
};

/**
 * Middleware to validate date range parameters
 */
const validateDateRange = (req, res, next) => {
    const schema = Joi.object({
        startDate: Joi.alternatives().try(
            Joi.date(),
            Joi.string().isoDate()
        ).optional(),
        endDate: Joi.alternatives().try(
            Joi.date(),
            Joi.string().isoDate()
        ).optional()
    }).unknown(true);

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في نطاق التاريخ'
            }
        });
    }

    // Validate that endDate is after startDate if both are provided
    if (req.query.startDate && req.query.endDate) {
        const start = new Date(req.query.startDate);
        const end = new Date(req.query.endDate);
        if (start > end) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Start date must be before end date',
                    messageAr: 'يجب أن يكون تاريخ البداية قبل تاريخ النهاية'
                }
            });
        }
    }

    next();
};

module.exports = {
    objectIdValidator,
    validateObjectIdParam,
    validateQueryPagination,
    validateSortParams,
    validateDateRange
};
