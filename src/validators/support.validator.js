/**
 * Support Module Validation Schemas
 *
 * Uses Joi for request validation on support endpoints.
 * Provides both validation schemas and middleware functions.
 * Supports bilingual error messages (Arabic/English).
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
 * Create ticket validation schema
 */
const createTicketSchema = Joi.object({
    subject: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.empty': 'الموضوع مطلوب / Subject is required',
            'string.min': 'الموضوع يجب أن يكون 3 أحرف على الأقل / Subject must be at least 3 characters',
            'string.max': 'الموضوع يجب ألا يتجاوز 200 حرف / Subject must not exceed 200 characters',
            'any.required': 'الموضوع مطلوب / Subject is required'
        }),
    description: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .messages({
            'string.empty': 'الوصف مطلوب / Description is required',
            'string.min': 'الوصف يجب أن يكون 10 أحرف على الأقل / Description must be at least 10 characters',
            'string.max': 'الوصف يجب ألا يتجاوز 5000 حرف / Description must not exceed 5000 characters',
            'any.required': 'الوصف مطلوب / Description is required'
        }),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .default('medium')
        .messages({
            'any.only': 'الأولوية غير صالحة / Invalid priority (must be: low, medium, high, urgent)'
        }),
    ticketType: Joi.string()
        .valid('technical', 'billing', 'feature_request', 'bug', 'general', 'other')
        .default('general')
        .messages({
            'any.only': 'نوع التذكرة غير صالح / Invalid ticket type (must be: technical, billing, feature_request, bug, general, other)'
        }),
    clientId: objectIdValidator.allow(null, ''),
    caseId: objectIdValidator.allow(null, ''),
    assignedTo: objectIdValidator.allow(null, ''),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    attachments: Joi.array().items(Joi.string())
});

/**
 * Update ticket validation schema
 * All fields are optional for partial updates
 */
const updateTicketSchema = Joi.object({
    subject: Joi.string()
        .min(3)
        .max(200)
        .messages({
            'string.min': 'الموضوع يجب أن يكون 3 أحرف على الأقل / Subject must be at least 3 characters',
            'string.max': 'الموضوع يجب ألا يتجاوز 200 حرف / Subject must not exceed 200 characters'
        }),
    description: Joi.string()
        .min(10)
        .max(5000)
        .messages({
            'string.min': 'الوصف يجب أن يكون 10 أحرف على الأقل / Description must be at least 10 characters',
            'string.max': 'الوصف يجب ألا يتجاوز 5000 حرف / Description must not exceed 5000 characters'
        }),
    status: Joi.string()
        .valid('open', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled')
        .messages({
            'any.only': 'الحالة غير صالحة / Invalid status (must be: open, in_progress, pending, resolved, closed, cancelled)'
        }),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .messages({
            'any.only': 'الأولوية غير صالحة / Invalid priority (must be: low, medium, high, urgent)'
        }),
    ticketType: Joi.string()
        .valid('technical', 'billing', 'feature_request', 'bug', 'general', 'other')
        .messages({
            'any.only': 'نوع التذكرة غير صالح / Invalid ticket type (must be: technical, billing, feature_request, bug, general, other)'
        }),
    assignedTo: objectIdValidator.allow(null, ''),
    tags: Joi.array().items(Joi.string().max(50)).max(20),
    internalNotes: Joi.string().max(2000).allow('', null)
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Reply to ticket validation schema
 */
const replyToTicketSchema = Joi.object({
    content: Joi.string()
        .min(1)
        .max(5000)
        .required()
        .messages({
            'string.empty': 'المحتوى مطلوب / Content is required',
            'string.min': 'المحتوى مطلوب / Content is required',
            'string.max': 'المحتوى يجب ألا يتجاوز 5000 حرف / Content must not exceed 5000 characters',
            'any.required': 'المحتوى مطلوب / Content is required'
        }),
    isInternal: Joi.boolean().default(false),
    attachments: Joi.array().items(Joi.string())
});

/**
 * Create SLA validation schema
 */
const createSLASchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.empty': 'الاسم مطلوب / Name is required',
            'string.min': 'الاسم يجب أن يكون 3 أحرف على الأقل / Name must be at least 3 characters',
            'string.max': 'الاسم يجب ألا يتجاوز 100 حرف / Name must not exceed 100 characters',
            'any.required': 'الاسم مطلوب / Name is required'
        }),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .required()
        .messages({
            'any.only': 'الأولوية غير صالحة / Invalid priority (must be: low, medium, high, urgent)',
            'any.required': 'الأولوية مطلوبة / Priority is required'
        }),
    firstResponseMinutes: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            'number.base': 'وقت الاستجابة الأولى يجب أن يكون رقماً / First response time must be a number',
            'number.min': 'وقت الاستجابة الأولى يجب أن يكون دقيقة واحدة على الأقل / First response time must be at least 1 minute',
            'any.required': 'وقت الاستجابة الأولى مطلوب / First response time is required'
        }),
    resolutionMinutes: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            'number.base': 'وقت الحل يجب أن يكون رقماً / Resolution time must be a number',
            'number.min': 'وقت الحل يجب أن يكون دقيقة واحدة على الأقل / Resolution time must be at least 1 minute',
            'any.required': 'وقت الحل مطلوب / Resolution time is required'
        }),
    description: Joi.string().max(500).allow('', null).messages({
        'string.max': 'الوصف يجب ألا يتجاوز 500 حرف / Description must not exceed 500 characters'
    }),
    isActive: Joi.boolean().default(true)
});

/**
 * Update SLA validation schema
 * All fields are optional for partial updates
 */
const updateSLASchema = Joi.object({
    name: Joi.string()
        .min(3)
        .max(100)
        .messages({
            'string.min': 'الاسم يجب أن يكون 3 أحرف على الأقل / Name must be at least 3 characters',
            'string.max': 'الاسم يجب ألا يتجاوز 100 حرف / Name must not exceed 100 characters'
        }),
    priority: Joi.string()
        .valid('low', 'medium', 'high', 'urgent')
        .messages({
            'any.only': 'الأولوية غير صالحة / Invalid priority (must be: low, medium, high, urgent)'
        }),
    firstResponseMinutes: Joi.number()
        .integer()
        .min(1)
        .messages({
            'number.base': 'وقت الاستجابة الأولى يجب أن يكون رقماً / First response time must be a number',
            'number.min': 'وقت الاستجابة الأولى يجب أن يكون دقيقة واحدة على الأقل / First response time must be at least 1 minute'
        }),
    resolutionMinutes: Joi.number()
        .integer()
        .min(1)
        .messages({
            'number.base': 'وقت الحل يجب أن يكون رقماً / Resolution time must be a number',
            'number.min': 'وقت الحل يجب أن يكون دقيقة واحدة على الأقل / Resolution time must be at least 1 minute'
        }),
    description: Joi.string().max(500).allow('', null).messages({
        'string.max': 'الوصف يجب ألا يتجاوز 500 حرف / Description must not exceed 500 characters'
    }),
    isActive: Joi.boolean()
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Update settings validation schema
 */
const updateSettingsSchema = Joi.object({
    emailNotifications: Joi.object({
        onNewTicket: Joi.boolean(),
        onTicketReply: Joi.boolean(),
        onTicketAssignment: Joi.boolean(),
        onTicketStatusChange: Joi.boolean(),
        onSLABreach: Joi.boolean()
    }),
    slackNotifications: Joi.object({
        enabled: Joi.boolean(),
        webhookUrl: Joi.string().uri().allow('', null),
        onNewTicket: Joi.boolean(),
        onSLABreach: Joi.boolean()
    }),
    autoAssignment: Joi.object({
        enabled: Joi.boolean(),
        strategy: Joi.string().valid('round_robin', 'least_active', 'random'),
        assignToTeam: objectIdValidator.allow(null, '')
    }),
    businessHours: Joi.object({
        enabled: Joi.boolean(),
        timezone: Joi.string(),
        schedule: Joi.object({
            monday: Joi.object({ start: Joi.string(), end: Joi.string() }),
            tuesday: Joi.object({ start: Joi.string(), end: Joi.string() }),
            wednesday: Joi.object({ start: Joi.string(), end: Joi.string() }),
            thursday: Joi.object({ start: Joi.string(), end: Joi.string() }),
            friday: Joi.object({ start: Joi.string(), end: Joi.string() }),
            saturday: Joi.object({ start: Joi.string(), end: Joi.string() }),
            sunday: Joi.object({ start: Joi.string(), end: Joi.string() })
        })
    }),
    defaultPriority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
    autoCloseResolved: Joi.object({
        enabled: Joi.boolean(),
        afterDays: Joi.number().integer().min(1).max(365)
    })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
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
        createTicket: createTicketSchema,
        updateTicket: updateTicketSchema,
        replyToTicket: replyToTicketSchema,
        createSLA: createSLASchema,
        updateSLA: updateSLASchema,
        updateSettings: updateSettingsSchema
    },

    // Middleware (for route use)
    validateCreateTicket: validate(createTicketSchema),
    validateUpdateTicket: validate(updateTicketSchema),
    validateReplyToTicket: validate(replyToTicketSchema),
    validateCreateSLA: validate(createSLASchema),
    validateUpdateSLA: validate(updateSLASchema),
    validateUpdateSettings: validate(updateSettingsSchema),

    // Generic validate function
    validate
};
