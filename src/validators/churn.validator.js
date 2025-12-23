/**
 * Churn Management Route Validation Schemas
 *
 * Uses Joi for request validation on churn management endpoints.
 * Provides validation for health scores, events, analytics, and interventions.
 */

const Joi = require('joi');

// ============================================
// CUSTOM VALIDATORS
// ============================================

/**
 * Custom validator for MongoDB ObjectId
 */
const objectIdValidator = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'معرف غير صالح / Invalid ID format'
});

/**
 * Custom validator for date strings
 */
const dateValidator = Joi.alternatives().try(
    Joi.date(),
    Joi.string().isoDate()
).messages({
    'alternatives.match': 'تاريخ غير صالح / Invalid date format'
});

// ============================================
// HEALTH SCORE VALIDATORS
// ============================================

/**
 * Validate health score recalculation request
 */
const validateHealthScoreRecalculate = (req, res, next) => {
    const schema = Joi.object({
        force: Joi.boolean().default(false),
        recalculateFactors: Joi.array().items(
            Joi.string().valid('usage', 'engagement', 'support', 'payment', 'tenure')
        ).optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في التحقق من البيانات'
            }
        });
    }
    next();
};

/**
 * Validate at-risk firms query parameters
 */
const validateAtRiskQuery = (req, res, next) => {
    const schema = Joi.object({
        tier: Joi.string().valid('critical', 'high_risk', 'medium_risk', 'low_risk').optional(),
        minScore: Joi.number().min(0).max(100).optional(),
        maxScore: Joi.number().min(0).max(100).optional(),
        sortBy: Joi.string().valid('score', 'lastActivity', 'mrr', 'tenure', 'companyName').default('score'),
        sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20)
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

// ============================================
// CHURN EVENT VALIDATORS
// ============================================

/**
 * Validate record churn event request
 */
const validateRecordChurnEvent = (req, res, next) => {
    const schema = Joi.object({
        firmId: objectIdValidator.required(),
        eventType: Joi.string()
            .valid('churn', 'downgrade', 'pause', 'reactivation')
            .required()
            .messages({
                'any.required': 'نوع الحدث مطلوب / Event type is required',
                'any.only': 'نوع الحدث غير صالح / Invalid event type'
            }),
        reason: Joi.string().max(500).optional(),
        reasonCategory: Joi.string()
            .valid('price', 'features', 'support', 'usability', 'competitor', 'business_closure', 'other')
            .optional(),
        notes: Joi.string().max(2000).optional(),
        exitSurveyCompleted: Joi.boolean().default(false),
        lostMRR: Joi.number().min(0).optional(),
        downgradeToPlan: Joi.string().max(100).optional(),
        effectiveDate: dateValidator.optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في التحقق من البيانات'
            }
        });
    }
    next();
};

/**
 * Validate churn events query parameters
 */
const validateChurnEventsQuery = (req, res, next) => {
    const schema = Joi.object({
        eventType: Joi.string().valid('churn', 'downgrade', 'pause', 'reactivation').optional(),
        reasonCategory: Joi.string()
            .valid('price', 'features', 'support', 'usability', 'competitor', 'business_closure', 'other')
            .optional(),
        startDate: dateValidator.optional(),
        endDate: dateValidator.optional(),
        firmId: objectIdValidator.optional(),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().valid('recordedAt', 'lostMRR', 'eventType').default('recordedAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

/**
 * Validate update churn reason request
 */
const validateUpdateChurnReason = (req, res, next) => {
    const schema = Joi.object({
        reason: Joi.string().max(500).required().messages({
            'any.required': 'السبب مطلوب / Reason is required'
        }),
        reasonCategory: Joi.string()
            .valid('price', 'features', 'support', 'usability', 'competitor', 'business_closure', 'other')
            .optional(),
        notes: Joi.string().max(2000).optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في التحقق من البيانات'
            }
        });
    }
    next();
};

/**
 * Validate exit survey submission
 */
const validateExitSurvey = (req, res, next) => {
    const schema = Joi.object({
        responses: Joi.object().required().messages({
            'any.required': 'استجابات الاستبيان مطلوبة / Survey responses are required'
        }),
        completedBy: Joi.string().max(100).optional(),
        completionDate: dateValidator.optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في التحقق من البيانات'
            }
        });
    }
    next();
};

// ============================================
// ANALYTICS VALIDATORS
// ============================================

/**
 * Validate dashboard metrics query
 */
const validateDashboardQuery = (req, res, next) => {
    const schema = Joi.object({
        period: Joi.number().integer().min(7).max(365).default(30)
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

/**
 * Validate churn rate query parameters
 */
const validateChurnRateQuery = (req, res, next) => {
    const schema = Joi.object({
        groupBy: Joi.string().valid('day', 'week', 'month', 'quarter').default('month'),
        startDate: dateValidator.optional(),
        endDate: dateValidator.optional(),
        includeDowngrades: Joi.string().valid('true', 'false').default('true')
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

/**
 * Validate churn reasons query parameters
 */
const validateReasonsQuery = (req, res, next) => {
    const schema = Joi.object({
        startDate: dateValidator.optional(),
        endDate: dateValidator.optional(),
        eventType: Joi.string().valid('churn', 'downgrade', 'pause').default('churn')
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

/**
 * Validate cohort analysis query parameters
 */
const validateCohortQuery = (req, res, next) => {
    const schema = Joi.object({
        cohortBy: Joi.string().valid('month', 'quarter', 'year').default('month'),
        periods: Joi.number().integer().min(3).max(24).default(12)
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

/**
 * Validate revenue at risk query parameters
 */
const validateRevenueAtRiskQuery = (req, res, next) => {
    const schema = Joi.object({
        includeProjections: Joi.string().valid('true', 'false').default('true')
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

// ============================================
// INTERVENTION VALIDATORS
// ============================================

/**
 * Validate trigger intervention request
 */
const validateTriggerIntervention = (req, res, next) => {
    const schema = Joi.object({
        type: Joi.string()
            .valid(
                'outreach_call',
                'check_in_email',
                'feature_training',
                'account_review',
                'executive_engagement',
                'discount_offer',
                'custom'
            )
            .required()
            .messages({
                'any.required': 'نوع التدخل مطلوب / Intervention type is required',
                'any.only': 'نوع التدخل غير صالح / Invalid intervention type'
            }),
        assignedTo: Joi.string().max(100).optional(),
        priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
        notes: Joi.string().max(2000).optional(),
        scheduledFor: dateValidator.optional()
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في التحقق من البيانات'
            }
        });
    }
    next();
};

/**
 * Validate intervention stats query parameters
 */
const validateInterventionStatsQuery = (req, res, next) => {
    const schema = Joi.object({
        startDate: dateValidator.optional(),
        endDate: dateValidator.optional(),
        groupBy: Joi.string().valid('type', 'outcome', 'assignee').default('type')
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

// ============================================
// REPORT VALIDATORS
// ============================================

/**
 * Validate generate report query parameters
 */
const validateGenerateReport = (req, res, next) => {
    const schema = Joi.object({
        reportType: Joi.string()
            .valid('comprehensive', 'executive', 'detailed', 'trends')
            .default('comprehensive'),
        startDate: dateValidator.optional(),
        endDate: dateValidator.optional(),
        format: Joi.string().valid('json', 'pdf', 'csv', 'xlsx').default('json')
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

/**
 * Validate export query parameters
 */
const validateExportQuery = (req, res, next) => {
    const schema = Joi.object({
        tier: Joi.string().valid('critical', 'high_risk', 'medium_risk', 'low_risk').optional(),
        minScore: Joi.number().min(0).max(100).optional(),
        format: Joi.string().valid('csv', 'xlsx', 'json').default('csv')
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

/**
 * Validate executive summary query parameters
 */
const validateExecutiveSummaryQuery = (req, res, next) => {
    const schema = Joi.object({
        period: Joi.number().integer().min(7).max(365).default(30)
    });

    const { error } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: error.details[0].message,
                messageAr: 'خطأ في معاملات الاستعلام'
            }
        });
    }
    next();
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
    validateHealthScoreRecalculate,
    validateAtRiskQuery,
    validateRecordChurnEvent,
    validateChurnEventsQuery,
    validateUpdateChurnReason,
    validateExitSurvey,
    validateDashboardQuery,
    validateChurnRateQuery,
    validateReasonsQuery,
    validateCohortQuery,
    validateRevenueAtRiskQuery,
    validateTriggerIntervention,
    validateInterventionStatsQuery,
    validateGenerateReport,
    validateExportQuery,
    validateExecutiveSummaryQuery
};
