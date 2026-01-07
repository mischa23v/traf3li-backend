/**
 * Lead/CRM Route Validation Schemas
 *
 * Uses Joi for request validation on lead and CRM endpoints.
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

/**
 * Custom validator for future dates
 */
const futureDateValidator = Joi.date().greater('now').messages({
    'date.greater': 'التاريخ يجب أن يكون في المستقبل / Date must be in the future'
});

/**
 * Saudi phone number pattern - STRICT E.164 FORMAT ONLY
 * Gold Standard: AWS, Google, Microsoft, Twilio all require E.164
 * Format: +966 followed by 9 digits (mobile starts with 5)
 * Example: +966501234567
 *
 * FRONTEND MUST format phone numbers to E.164 before sending.
 * Backend does NOT normalize - it validates and rejects invalid formats.
 */
const saudiPhonePattern = /^\+966[5][0-9]{8}$/;

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Lead source validation schema
 */
const leadSourceSchema = Joi.object({
    type: Joi.string()
        .valid('website', 'referral', 'social_media', 'advertising', 'cold_call', 'walk_in', 'event', 'other')
        .messages({
            'any.only': 'نوع المصدر غير صالح / Invalid source type'
        }),
    referralId: objectIdValidator,
    referralName: Joi.string().max(100),
    campaign: Joi.string().max(100),
    medium: Joi.string().max(50),
    notes: Joi.string().max(500)
});

/**
 * Address validation schema
 */
const addressSchema = Joi.object({
    street: Joi.string().max(200),
    city: Joi.string().max(100),
    postalCode: Joi.string().max(20),
    country: Joi.string().max(100).default('Saudi Arabia')
});

/**
 * Intake information validation schema
 */
const intakeInfoSchema = Joi.object({
    caseType: Joi.string()
        .valid('civil', 'criminal', 'family', 'commercial', 'labor', 'real_estate', 'administrative', 'execution', 'other')
        .messages({
            'any.only': 'نوع القضية غير صالح / Invalid case type'
        }),
    caseDescription: Joi.string().max(2000),
    urgency: Joi.string()
        .valid('low', 'normal', 'high', 'urgent')
        .default('normal'),
    estimatedValue: Joi.number().min(0),
    opposingParty: Joi.string().max(200),
    courtName: Joi.string().max(200),
    currentStatus: Joi.string().max(1000),
    desiredOutcome: Joi.string().max(1000),
    deadline: Joi.date(),
    hasDocuments: Joi.boolean(),
    conflictCheckCompleted: Joi.boolean(),
    conflictCheckResult: Joi.string().valid('clear', 'potential_conflict', 'conflict'),
    conflictCheckNotes: Joi.string().max(500)
});

/**
 * Create lead validation schema
 */
const createLeadSchema = Joi.object({
    // Type
    type: Joi.string()
        .valid('individual', 'company')
        .default('individual')
        .messages({
            'any.only': 'النوع يجب أن يكون فرد أو شركة / Type must be individual or company'
        }),

    // Individual fields
    firstName: Joi.string()
        .max(50)
        .messages({
            'string.max': 'الاسم الأول طويل جداً / First name is too long'
        }),
    lastName: Joi.string()
        .max(50)
        .messages({
            'string.max': 'اسم العائلة طويل جداً / Last name is too long'
        }),

    // Company fields
    companyName: Joi.string()
        .max(200)
        .messages({
            'string.max': 'اسم الشركة طويل جداً / Company name is too long'
        }),
    companyNameAr: Joi.string().max(200),
    contactPerson: Joi.string().max(100),

    // Contact information
    email: Joi.string()
        .email()
        .max(100)
        .allow('', null)
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format',
            'string.max': 'البريد الإلكتروني طويل جداً / Email is too long'
        }),
    phone: Joi.string()
        .pattern(saudiPhonePattern)
        .allow('', null)
        .messages({
            'string.pattern.base': 'رقم الهاتف غير صالح - يجب أن يكون بصيغة E.164 (مثال: +966501234567) / Invalid phone number - must be E.164 format (example: +966501234567)'
        }),
    alternatePhone: Joi.string()
        .pattern(saudiPhonePattern)
        .allow('', null)
        .messages({
            'string.pattern.base': 'رقم الهاتف البديل غير صالح - يجب أن يكون بصيغة E.164 (مثال: +966501234567) / Invalid alternate phone - must be E.164 format (example: +966501234567)'
        }),
    whatsapp: Joi.string()
        .pattern(saudiPhonePattern)
        .allow('', null)
        .messages({
            'string.pattern.base': 'رقم الواتساب غير صالح - يجب أن يكون بصيغة E.164 (مثال: +966501234567) / Invalid WhatsApp - must be E.164 format (example: +966501234567)'
        }),

    // Address
    address: addressSchema,

    // Identification
    nationalId: Joi.string().max(50),
    commercialRegistration: Joi.string().max(50),

    // Relations
    organizationId: objectIdValidator,
    contactId: objectIdValidator,
    assignedTo: objectIdValidator,
    teamMembers: Joi.array().items(objectIdValidator),

    // Pipeline & Status
    status: Joi.string()
        .valid('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant')
        .default('new')
        .messages({
            'any.only': 'الحالة غير صالحة / Invalid status'
        }),
    pipelineId: objectIdValidator,
    pipelineStageId: objectIdValidator,
    probability: Joi.number().min(0).max(100).default(10),
    expectedCloseDate: Joi.date(),

    // Source
    source: leadSourceSchema,

    // Intake
    intake: intakeInfoSchema,

    // Value & Budget
    estimatedValue: Joi.number().min(0).messages({
        'number.min': 'القيمة المقدرة يجب أن تكون صفر أو أكثر / Estimated value must be zero or more'
    }),
    proposedFeeType: Joi.string().valid('hourly', 'fixed', 'contingency', 'retainer'),
    proposedAmount: Joi.number().min(0),

    // Notes
    notes: Joi.string().max(2000).allow('', null).messages({
        'string.max': 'الملاحظات طويلة جداً / Notes are too long'
    }),
    internalNotes: Joi.string().max(2000).allow('', null),

    // Follow-up
    nextFollowUpDate: Joi.date(),
    nextFollowUpNote: Joi.string().max(500),

    // Tags
    tags: Joi.array().items(Joi.string().max(50)).max(20),

    // Priority
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
});

/**
 * Update lead validation schema (all fields optional)
 */
const updateLeadSchema = Joi.object({
    type: Joi.string().valid('individual', 'company'),

    // Individual fields
    firstName: Joi.string().max(50).messages({
        'string.max': 'الاسم الأول طويل جداً / First name is too long'
    }),
    lastName: Joi.string().max(50).messages({
        'string.max': 'اسم العائلة طويل جداً / Last name is too long'
    }),

    // Company fields
    companyName: Joi.string().max(200).messages({
        'string.max': 'اسم الشركة طويل جداً / Company name is too long'
    }),
    companyNameAr: Joi.string().max(200),
    contactPerson: Joi.string().max(100),

    // Contact information
    email: Joi.string().email().max(100).allow('', null).messages({
        'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
    }),
    phone: Joi.string()
        .pattern(saudiPhonePattern)
        .messages({
            'string.pattern.base': 'رقم الهاتف غير صالح - يجب أن يكون بصيغة E.164 (مثال: +966501234567) / Invalid phone number - must be E.164 format (example: +966501234567)'
        }),
    alternatePhone: Joi.string()
        .pattern(saudiPhonePattern)
        .allow('', null)
        .messages({
            'string.pattern.base': 'رقم الهاتف البديل غير صالح - يجب أن يكون بصيغة E.164 (مثال: +966501234567) / Invalid alternate phone - must be E.164 format (example: +966501234567)'
        }),
    whatsapp: Joi.string()
        .pattern(saudiPhonePattern)
        .allow('', null)
        .messages({
            'string.pattern.base': 'رقم الواتساب غير صالح - يجب أن يكون بصيغة E.164 (مثال: +966501234567) / Invalid WhatsApp - must be E.164 format (example: +966501234567)'
        }),

    // Address
    address: addressSchema,

    // Identification
    nationalId: Joi.string().max(50),
    commercialRegistration: Joi.string().max(50),

    // Relations
    organizationId: objectIdValidator.allow(null),
    contactId: objectIdValidator.allow(null),
    assignedTo: objectIdValidator,
    teamMembers: Joi.array().items(objectIdValidator),

    // Status
    status: Joi.string()
        .valid('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant')
        .messages({
            'any.only': 'الحالة غير صالحة / Invalid status'
        }),
    probability: Joi.number().min(0).max(100),
    expectedCloseDate: Joi.date().allow(null),
    statusChangeNote: Joi.string().max(500),

    // Source
    source: leadSourceSchema,

    // Intake
    intake: intakeInfoSchema,

    // Value
    estimatedValue: Joi.number().min(0),
    proposedFeeType: Joi.string().valid('hourly', 'fixed', 'contingency', 'retainer'),
    proposedAmount: Joi.number().min(0),

    // Notes
    notes: Joi.string().max(2000).allow('', null),
    internalNotes: Joi.string().max(2000).allow('', null),

    // Follow-up
    nextFollowUpDate: Joi.date().allow(null),
    nextFollowUpNote: Joi.string().max(500).allow('', null),

    // Tags
    tags: Joi.array().items(Joi.string().max(50)).max(20),

    // Priority
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent')
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Update lead status validation schema
 */
const updateStatusSchema = Joi.object({
    status: Joi.string()
        .valid('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant')
        .messages({
            'any.only': 'الحالة غير صالحة / Invalid status'
        }),
    notes: Joi.string().max(1000).allow('', null).messages({
        'string.max': 'الملاحظات طويلة جداً / Notes are too long'
    }),
    lostReason: Joi.string()
        .valid('price', 'competitor', 'no_response', 'not_qualified', 'timing', 'other')
        .messages({
            'any.only': 'سبب الخسارة غير صالح / Invalid lost reason'
        })
});

/**
 * Move to stage validation schema
 */
const moveToStageSchema = Joi.object({
    stageId: objectIdValidator,
    notes: Joi.string().max(1000).allow('', null).messages({
        'string.max': 'الملاحظات طويلة جداً / Notes are too long'
    })
});

/**
 * Convert to client validation schema
 */
const convertToClientSchema = Joi.object({
    createCase: Joi.boolean().default(false).messages({
        'boolean.base': 'createCase يجب أن يكون قيمة منطقية / createCase must be a boolean'
    }),
    caseTitle: Joi.string()
        .max(200)
        .messages({
            'string.max': 'عنوان القضية طويل جداً / Case title is too long'
        })
});

/**
 * Log activity validation schema
 */
const logActivitySchema = Joi.object({
    type: Joi.string()
        .valid('call', 'email', 'meeting', 'note', 'task', 'whatsapp', 'sms', 'other')
        .messages({
            'any.only': 'نوع النشاط غير صالح / Invalid activity type'
        }),
    title: Joi.string()
        .max(200)
        .messages({
            'string.max': 'العنوان طويل جداً / Title is too long'
        }),
    description: Joi.string().max(2000).allow('', null).messages({
        'string.max': 'الوصف طويل جداً / Description is too long'
    }),
    outcome: Joi.string()
        .valid('successful', 'unsuccessful', 'follow_up_needed', 'no_answer', 'other')
        .messages({
            'any.only': 'النتيجة غير صالحة / Invalid outcome'
        }),
    duration: Joi.number().min(0).max(1440).messages({
        'number.min': 'المدة يجب أن تكون صفر أو أكثر / Duration must be zero or more',
        'number.max': 'المدة طويلة جداً / Duration is too long'
    }),
    scheduledAt: Joi.date(),
    completedAt: Joi.date(),
    assignedTo: objectIdValidator,
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
    tags: Joi.array().items(Joi.string().max(50)),
    attachments: Joi.array().items(Joi.string()),

    // Task-specific fields
    taskData: Joi.object({
        dueDate: Joi.date(),
        priority: Joi.string().valid('low', 'normal', 'high', 'urgent'),
        status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled')
    })
});

/**
 * Schedule follow-up validation schema
 */
const scheduleFollowUpSchema = Joi.object({
    date: Joi.date().allow(null),
    note: Joi.string().max(500).allow('', null).messages({
        'string.max': 'الملاحظة طويلة جداً / Note is too long'
    }),
    type: Joi.string()
        .valid('call', 'email', 'meeting', 'task', 'whatsapp')
        .default('call')
        .messages({
            'any.only': 'نوع المتابعة غير صالح / Invalid follow-up type'
        }),
    priority: Joi.string()
        .valid('low', 'normal', 'high', 'urgent')
        .default('normal')
});

/**
 * Get leads query validation schema
 */
const getLeadsQuerySchema = Joi.object({
    status: Joi.string().valid('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'dormant'),
    source: Joi.string().valid('website', 'referral', 'social_media', 'advertising', 'cold_call', 'walk_in', 'event', 'other'),
    assignedTo: objectIdValidator,
    pipelineId: objectIdValidator,
    search: Joi.string().max(200),
    convertedToClient: Joi.boolean(),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'displayName', 'estimatedValue', 'probability', 'nextFollowUpDate'),
    sortOrder: Joi.string().valid('asc', 'desc', 'ascending', 'descending').default('desc'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50)
});

/**
 * Get activities query validation schema
 */
const getActivitiesQuerySchema = Joi.object({
    type: Joi.string().valid('call', 'email', 'meeting', 'note', 'task', 'whatsapp', 'sms', 'other'),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
});

/**
 * Lead ID param validation schema
 */
const leadIdParamSchema = Joi.object({
    id: Joi.alternatives()
        .try(
            objectIdValidator,
            Joi.string().pattern(/^LEAD-[0-9]+$/)
        )
        .required()
        .messages({
            'any.required': 'معرف العميل المحتمل مطلوب / Lead ID is required',
            'alternatives.match': 'معرف العميل المحتمل غير صالح / Invalid lead ID format'
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
        createLead: createLeadSchema,
        updateLead: updateLeadSchema,
        updateStatus: updateStatusSchema,
        moveToStage: moveToStageSchema,
        convertToClient: convertToClientSchema,
        logActivity: logActivitySchema,
        scheduleFollowUp: scheduleFollowUpSchema,
        getLeadsQuery: getLeadsQuerySchema,
        getActivitiesQuery: getActivitiesQuerySchema,
        leadIdParam: leadIdParamSchema
    },

    // Middleware (for route use)
    validateCreateLead: validate(createLeadSchema),
    validateUpdateLead: validate(updateLeadSchema),
    validateUpdateStatus: validate(updateStatusSchema),
    validateMoveToStage: validate(moveToStageSchema),
    validateConvertToClient: validate(convertToClientSchema),
    validateLogActivity: validate(logActivitySchema),
    validateScheduleFollowUp: validate(scheduleFollowUpSchema),
    validateGetLeadsQuery: validate(getLeadsQuerySchema, 'query'),
    validateGetActivitiesQuery: validate(getActivitiesQuerySchema, 'query'),
    validateLeadIdParam: validate(leadIdParamSchema, 'params'),

    // Generic validate function
    validate
};
