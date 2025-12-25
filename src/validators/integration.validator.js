/**
 * Integration Validation Schemas
 *
 * Validates requests for third-party integrations (QuickBooks, Xero, etc.)
 * Uses Joi for schema validation with bilingual error messages.
 */

const Joi = require('joi');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Sync parameters validation schema
 * Used for data synchronization requests
 */
const syncParamsSchema = Joi.object({
    // Sync direction
    direction: Joi.string()
        .valid('import', 'export', 'bidirectional')
        .default('import')
        .messages({
            'any.only': 'اتجاه المزامنة يجب أن يكون import أو export أو bidirectional / Sync direction must be import, export, or bidirectional',
        }),

    // Date range for sync
    startDate: Joi.date()
        .iso()
        .optional()
        .messages({
            'date.base': 'تاريخ البداية غير صالح / Invalid start date',
            'date.format': 'تاريخ البداية يجب أن يكون بتنسيق ISO / Start date must be in ISO format'
        }),

    endDate: Joi.date()
        .iso()
        .min(Joi.ref('startDate'))
        .optional()
        .messages({
            'date.base': 'تاريخ النهاية غير صالح / Invalid end date',
            'date.format': 'تاريخ النهاية يجب أن يكون بتنسيق ISO / End date must be in ISO format',
            'date.min': 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية / End date must be after start date'
        }),

    // Sync options
    fullSync: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'fullSync يجب أن يكون قيمة منطقية / fullSync must be a boolean'
        }),

    overwriteExisting: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'overwriteExisting يجب أن يكون قيمة منطقية / overwriteExisting must be a boolean'
        }),

    // Filter by status
    status: Joi.array()
        .items(Joi.string())
        .optional()
        .messages({
            'array.base': 'الحالة يجب أن تكون مصفوفة / Status must be an array'
        }),

    // Batch size for processing
    batchSize: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(50)
        .messages({
            'number.base': 'حجم الدفعة يجب أن يكون رقماً / Batch size must be a number',
            'number.integer': 'حجم الدفعة يجب أن يكون عدداً صحيحاً / Batch size must be an integer',
            'number.min': 'حجم الدفعة يجب أن يكون 1 على الأقل / Batch size must be at least 1',
            'number.max': 'حجم الدفعة يجب ألا يتجاوز 100 / Batch size must not exceed 100'
        })
});

/**
 * Field mapping validation schema
 */
const fieldMappingSchema = Joi.object({
    // Entity type (invoice, customer, etc.)
    entityType: Joi.string()
        .valid('invoice', 'customer', 'vendor', 'contact', 'account', 'payment', 'expense')
        .required()
        .messages({
            'any.required': 'نوع الكيان مطلوب / Entity type is required',
            'any.only': 'نوع كيان غير صالح / Invalid entity type'
        }),

    // Field mappings object
    mappings: Joi.object()
        .pattern(
            Joi.string(),
            Joi.object({
                sourceField: Joi.string().required(),
                targetField: Joi.string().required(),
                transform: Joi.string().valid('none', 'uppercase', 'lowercase', 'date', 'currency').optional(),
                defaultValue: Joi.any().optional()
            })
        )
        .required()
        .messages({
            'any.required': 'تعيينات الحقول مطلوبة / Field mappings are required',
            'object.base': 'تعيينات الحقول يجب أن تكون كائناً / Field mappings must be an object'
        })
});

/**
 * Account mapping validation schema
 */
const accountMappingSchema = Joi.object({
    // Local account ID
    localAccountId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'any.required': 'معرف الحساب المحلي مطلوب / Local account ID is required',
            'string.hex': 'معرف الحساب المحلي غير صالح / Invalid local account ID format',
            'string.length': 'معرف الحساب المحلي غير صالح / Invalid local account ID format'
        }),

    // External account ID (from QuickBooks/Xero)
    externalAccountId: Joi.string()
        .required()
        .messages({
            'any.required': 'معرف الحساب الخارجي مطلوب / External account ID is required',
            'string.empty': 'معرف الحساب الخارجي مطلوب / External account ID is required'
        }),

    // Account type
    accountType: Joi.string()
        .valid('asset', 'liability', 'equity', 'revenue', 'expense')
        .required()
        .messages({
            'any.required': 'نوع الحساب مطلوب / Account type is required',
            'any.only': 'نوع حساب غير صالح / Invalid account type'
        }),

    // Mapping notes
    notes: Joi.string()
        .max(500)
        .optional()
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 500 حرف / Notes must not exceed 500 characters'
        })
});

/**
 * Conflict resolution validation schema
 */
const conflictResolutionSchema = Joi.object({
    // Resolution strategy
    strategy: Joi.string()
        .valid('keep_local', 'keep_remote', 'merge', 'manual')
        .required()
        .messages({
            'any.required': 'استراتيجية الحل مطلوبة / Resolution strategy is required',
            'any.only': 'استراتيجية حل غير صالحة / Invalid resolution strategy'
        }),

    // Merged data (if strategy is 'merge' or 'manual')
    mergedData: Joi.object()
        .when('strategy', {
            is: Joi.string().valid('merge', 'manual'),
            then: Joi.required(),
            otherwise: Joi.forbidden()
        })
        .messages({
            'any.required': 'البيانات المدمجة مطلوبة لاستراتيجية الدمج / Merged data is required for merge strategy',
            'any.unknown': 'البيانات المدمجة غير مسموح بها لهذه الاستراتيجية / Merged data not allowed for this strategy'
        }),

    // Apply to all similar conflicts
    applyToAll: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'applyToAll يجب أن يكون قيمة منطقية / applyToAll must be a boolean'
        }),

    // Notes about resolution
    notes: Joi.string()
        .max(1000)
        .optional()
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 1000 حرف / Notes must not exceed 1000 characters'
        })
});

// ============================================================================
// VALIDATION MIDDLEWARE FUNCTIONS
// ============================================================================

/**
 * Validate sync parameters
 */
const validateSyncParams = (req, res, next) => {
    const { error, value } = syncParamsSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => detail.message);
        return res.status(400).json({
            success: false,
            error: 'خطأ في التحقق من معاملات المزامنة',
            error_en: 'Sync parameters validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate field mapping
 */
const validateFieldMapping = (req, res, next) => {
    const { error, value } = fieldMappingSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => detail.message);
        return res.status(400).json({
            success: false,
            error: 'خطأ في التحقق من تعيين الحقول',
            error_en: 'Field mapping validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate account mapping
 */
const validateAccountMapping = (req, res, next) => {
    const { error, value } = accountMappingSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => detail.message);
        return res.status(400).json({
            success: false,
            error: 'خطأ في التحقق من تعيين الحساب',
            error_en: 'Account mapping validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate conflict resolution
 */
const validateConflictResolution = (req, res, next) => {
    const { error, value } = conflictResolutionSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => detail.message);
        return res.status(400).json({
            success: false,
            error: 'خطأ في التحقق من حل التعارض',
            error_en: 'Conflict resolution validation error',
            errors
        });
    }

    req.body = value;
    next();
};

module.exports = {
    // Schemas
    syncParamsSchema,
    fieldMappingSchema,
    accountMappingSchema,
    conflictResolutionSchema,

    // Middleware
    validateSyncParams,
    validateFieldMapping,
    validateAccountMapping,
    validateConflictResolution
};
