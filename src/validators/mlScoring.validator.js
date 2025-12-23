/**
 * ML Scoring Validation Schemas
 *
 * Uses Joi for request validation on ML scoring endpoints.
 * Provides both validation schemas and middleware functions.
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

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Get scores query validation schema
 */
const getScoresQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1).messages({
        'number.base': 'الصفحة يجب أن تكون رقماً / Page must be a number',
        'number.min': 'الصفحة يجب أن تكون 1 أو أكثر / Page must be 1 or more'
    }),
    limit: Joi.number().integer().min(1).max(100).default(50).messages({
        'number.base': 'الحد يجب أن يكون رقماً / Limit must be a number',
        'number.min': 'الحد يجب أن يكون 1 أو أكثر / Limit must be 1 or more',
        'number.max': 'الحد يجب أن يكون 100 أو أقل / Limit must be 100 or less'
    }),
    minScore: Joi.number().min(0).max(100).messages({
        'number.base': 'الحد الأدنى للنقاط يجب أن يكون رقماً / Minimum score must be a number',
        'number.min': 'الحد الأدنى للنقاط يجب أن يكون 0 أو أكثر / Minimum score must be 0 or more',
        'number.max': 'الحد الأدنى للنقاط يجب أن يكون 100 أو أقل / Minimum score must be 100 or less'
    }),
    maxScore: Joi.number().min(0).max(100).messages({
        'number.base': 'الحد الأقصى للنقاط يجب أن يكون رقماً / Maximum score must be a number',
        'number.min': 'الحد الأقصى للنقاط يجب أن يكون 0 أو أكثر / Maximum score must be 0 or more',
        'number.max': 'الحد الأقصى للنقاط يجب أن يكون 100 أو أقل / Maximum score must be 100 or less'
    })
});

/**
 * Lead ID parameter validation schema
 */
const leadIdParamSchema = Joi.object({
    leadId: objectIdValidator.required().messages({
        'any.required': 'معرف العميل المحتمل مطلوب / Lead ID is required'
    })
});

/**
 * Batch calculate validation schema
 */
const batchCalculateSchema = Joi.object({
    leadIds: Joi.array()
        .items(objectIdValidator)
        .min(1)
        .max(100)
        .required()
        .messages({
            'array.base': 'معرفات العملاء المحتملين يجب أن تكون مصفوفة / Lead IDs must be an array',
            'array.min': 'يجب تقديم معرف واحد على الأقل / At least one lead ID is required',
            'array.max': 'لا يمكن معالجة أكثر من 100 عميل محتمل في وقت واحد / Cannot process more than 100 leads at once',
            'any.required': 'معرفات العملاء المحتملين مطلوبة / Lead IDs are required'
        })
});

/**
 * Record contact validation schema
 */
const recordContactSchema = Joi.object({
    contactType: Joi.string()
        .valid('call', 'email', 'meeting', 'message', 'whatsapp', 'other')
        .required()
        .messages({
            'any.only': 'نوع الاتصال غير صالح / Invalid contact type',
            'any.required': 'نوع الاتصال مطلوب / Contact type is required'
        }),
    notes: Joi.string().max(1000).allow('', null).messages({
        'string.max': 'الملاحظات طويلة جداً / Notes are too long (max 1000 characters)'
    }),
    duration: Joi.number().min(0).max(1440).messages({
        'number.min': 'المدة يجب أن تكون 0 أو أكثر / Duration must be 0 or more',
        'number.max': 'المدة طويلة جداً / Duration is too long (max 1440 minutes)'
    })
});

/**
 * Assign lead validation schema
 */
const assignLeadSchema = Joi.object({
    assignedTo: objectIdValidator.required().messages({
        'any.required': 'معرف المستخدم المعين مطلوب / Assignee ID is required'
    }),
    notes: Joi.string().max(500).allow('', null).messages({
        'string.max': 'الملاحظات طويلة جداً / Notes are too long (max 500 characters)'
    })
});

/**
 * Priority queue query validation schema
 */
const priorityQueueQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20).messages({
        'number.base': 'الحد يجب أن يكون رقماً / Limit must be a number',
        'number.min': 'الحد يجب أن يكون 1 أو أكثر / Limit must be 1 or more',
        'number.max': 'الحد يجب أن يكون 100 أو أقل / Limit must be 100 or less'
    }),
    filterBy: Joi.string()
        .valid('all', 'overdue', 'today', 'upcoming')
        .default('all')
        .messages({
            'any.only': 'مرشح غير صالح / Invalid filter'
        })
});

/**
 * Dashboard query validation schema
 */
const dashboardQuerySchema = Joi.object({
    period: Joi.number().integer().min(1).max(365).default(30).messages({
        'number.base': 'الفترة يجب أن تكون رقماً / Period must be a number',
        'number.min': 'الفترة يجب أن تكون 1 أو أكثر / Period must be 1 or more days',
        'number.max': 'الفترة يجب أن تكون 365 أو أقل / Period must be 365 or less days'
    }),
    groupBy: Joi.string()
        .valid('day', 'week', 'month')
        .default('week')
        .messages({
            'any.only': 'التجميع يجب أن يكون يوم أو أسبوع أو شهر / Group by must be day, week, or month'
        })
});

/**
 * Train model validation schema
 */
const trainModelSchema = Joi.object({
    algorithm: Joi.string()
        .valid('random_forest', 'gradient_boosting', 'neural_network', 'auto')
        .default('auto')
        .messages({
            'any.only': 'خوارزمية غير صالحة / Invalid algorithm'
        }),
    testSize: Joi.number().min(0.1).max(0.5).default(0.2).messages({
        'number.base': 'حجم الاختبار يجب أن يكون رقماً / Test size must be a number',
        'number.min': 'حجم الاختبار يجب أن يكون 0.1 أو أكثر / Test size must be 0.1 or more',
        'number.max': 'حجم الاختبار يجب أن يكون 0.5 أو أقل / Test size must be 0.5 or less'
    }),
    features: Joi.array().items(Joi.string()).messages({
        'array.base': 'الميزات يجب أن تكون مصفوفة / Features must be an array'
    }),
    hyperparameters: Joi.object().unknown(true)
});

/**
 * Export training data validation schema
 */
const exportTrainingDataSchema = Joi.object({
    format: Joi.string()
        .valid('csv', 'json', 'excel')
        .default('csv')
        .messages({
            'any.only': 'تنسيق غير صالح / Invalid format'
        }),
    includeFeatures: Joi.boolean().default(true),
    includeLabels: Joi.boolean().default(true),
    dateFrom: Joi.date().messages({
        'date.base': 'تاريخ البداية غير صالح / Invalid start date'
    }),
    dateTo: Joi.date().messages({
        'date.base': 'تاريخ النهاية غير صالح / Invalid end date'
    })
});

// ============================================
// VALIDATION MIDDLEWARE FACTORY
// ============================================

/**
 * Creates validation middleware for a given schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false, // Return all errors, not just the first
            stripUnknown: true // Remove unknown fields
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق / Validation error',
                errors
            });
        }

        // Replace request data with validated/sanitized data
        req[source] = value;
        next();
    };
};

// ============================================
// EXPORT MIDDLEWARE
// ============================================

module.exports = {
    // Schemas (for direct use)
    schemas: {
        getScoresQuery: getScoresQuerySchema,
        leadIdParam: leadIdParamSchema,
        batchCalculate: batchCalculateSchema,
        recordContact: recordContactSchema,
        assignLead: assignLeadSchema,
        priorityQueueQuery: priorityQueueQuerySchema,
        dashboardQuery: dashboardQuerySchema,
        trainModel: trainModelSchema,
        exportTrainingData: exportTrainingDataSchema
    },

    // Middleware (for route use)
    validateGetScoresQuery: validate(getScoresQuerySchema, 'query'),
    validateLeadIdParam: validate(leadIdParamSchema, 'params'),
    validateBatchCalculate: validate(batchCalculateSchema, 'body'),
    validateRecordContact: validate(recordContactSchema, 'body'),
    validateAssignLead: validate(assignLeadSchema, 'body'),
    validatePriorityQueueQuery: validate(priorityQueueQuerySchema, 'query'),
    validateDashboardQuery: validate(dashboardQuerySchema, 'query'),
    validateTrainModel: validate(trainModelSchema, 'body'),
    validateExportTrainingData: validate(exportTrainingDataSchema, 'body'),

    // Generic validate function
    validate
};
