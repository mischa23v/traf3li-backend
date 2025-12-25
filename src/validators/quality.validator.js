/**
 * Quality Module Validation Schemas
 *
 * Uses Joi for request validation on quality management endpoints.
 * Provides both validation schemas and middleware functions.
 * Supports bilingual error messages (Arabic/English).
 */

const Joi = require('joi');

// ============================================
// SUB-SCHEMAS
// ============================================

/**
 * Inspection parameter/reading schema
 * Used for quality check readings
 */
const inspectionReadingSchema = Joi.object({
    parameter: Joi.string()
        .min(1)
        .max(200)
        .messages({
            'string.empty': 'اسم المعيار مطلوب / Parameter name is required',
            'string.max': 'اسم المعيار يجب ألا يتجاوز 200 حرف / Parameter name must not exceed 200 characters'
        }),
    value: Joi.alternatives()
        .try(Joi.string(), Joi.number(), Joi.boolean())
        .messages({
            'alternatives.types': 'قيمة المعيار غير صالحة / Invalid parameter value'
        }),
    unit: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'الوحدة يجب ألا تتجاوز 50 حرف / Unit must not exceed 50 characters'
        }),
    result: Joi.string()
        .valid('pass', 'fail', 'acceptable')
        .allow('', null)
        .messages({
            'any.only': 'نتيجة المعيار غير صالحة / Invalid parameter result'
        })
});

/**
 * Template parameter schema
 * Used for quality inspection templates
 */
const templateParameterSchema = Joi.object({
    parameterName: Joi.string()
        .min(1)
        .max(200)
        .required()
        .messages({
            'string.empty': 'اسم المعيار مطلوب / Parameter name is required',
            'string.max': 'اسم المعيار يجب ألا يتجاوز 200 حرف / Parameter name must not exceed 200 characters',
            'any.required': 'اسم المعيار مطلوب / Parameter name is required'
        }),
    parameterNameAr: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'الاسم العربي يجب ألا يتجاوز 200 حرف / Arabic name must not exceed 200 characters'
        }),
    dataType: Joi.string()
        .valid('text', 'number', 'boolean', 'date')
        .default('text')
        .messages({
            'any.only': 'نوع البيانات غير صالح / Invalid data type'
        }),
    unit: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'الوحدة يجب ألا تتجاوز 50 حرف / Unit must not exceed 50 characters'
        }),
    minValue: Joi.number()
        .allow(null)
        .messages({
            'number.base': 'الحد الأدنى يجب أن يكون رقماً / Min value must be a number'
        }),
    maxValue: Joi.number()
        .allow(null)
        .messages({
            'number.base': 'الحد الأقصى يجب أن يكون رقماً / Max value must be a number'
        }),
    acceptableCriteria: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'معايير القبول يجب ألا تتجاوز 500 حرف / Acceptable criteria must not exceed 500 characters'
        }),
    mandatory: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'حقل الإلزامي يجب أن يكون قيمة منطقية / Mandatory must be a boolean'
        })
});

// ============================================
// INSPECTION VALIDATION SCHEMAS
// ============================================

/**
 * Create inspection validation schema
 */
const createInspectionSchema = Joi.object({
    referenceType: Joi.string()
        .valid('purchase_receipt', 'delivery_note', 'stock_entry', 'production')
        .required()
        .messages({
            'string.empty': 'نوع المرجع مطلوب / Reference type is required',
            'any.only': 'نوع المرجع غير صالح / Invalid reference type',
            'any.required': 'نوع المرجع مطلوب / Reference type is required'
        }),
    referenceId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.empty': 'معرف المرجع مطلوب / Reference ID is required',
            'string.pattern.base': 'معرف المرجع غير صالح / Invalid reference ID format',
            'any.required': 'معرف المرجع مطلوب / Reference ID is required'
        }),
    referenceNumber: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'رقم المرجع يجب ألا يتجاوز 100 حرف / Reference number must not exceed 100 characters'
        }),
    itemId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.empty': 'معرف الصنف مطلوب / Item ID is required',
            'string.pattern.base': 'معرف الصنف غير صالح / Invalid item ID format',
            'any.required': 'معرف الصنف مطلوب / Item ID is required'
        }),
    itemCode: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'رمز الصنف يجب ألا يتجاوز 100 حرف / Item code must not exceed 100 characters'
        }),
    itemName: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'اسم الصنف يجب ألا يتجاوز 200 حرف / Item name must not exceed 200 characters'
        }),
    batchNo: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'رقم الدفعة يجب ألا يتجاوز 100 حرف / Batch number must not exceed 100 characters'
        }),
    inspectionType: Joi.string()
        .valid('incoming', 'outgoing', 'in_process')
        .required()
        .messages({
            'string.empty': 'نوع الفحص مطلوب / Inspection type is required',
            'any.only': 'نوع الفحص غير صالح / Invalid inspection type',
            'any.required': 'نوع الفحص مطلوب / Inspection type is required'
        }),
    sampleSize: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'حجم العينة يجب أن يكون رقماً / Sample size must be a number',
            'number.min': 'حجم العينة يجب أن يكون صفراً أو أكثر / Sample size must be 0 or more',
            'any.required': 'حجم العينة مطلوب / Sample size is required'
        }),
    inspectionDate: Joi.date()
        .iso()
        .required()
        .messages({
            'date.base': 'تاريخ الفحص غير صالح / Invalid inspection date',
            'any.required': 'تاريخ الفحص مطلوب / Inspection date is required'
        }),
    templateId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null, '')
        .messages({
            'string.pattern.base': 'معرف النموذج غير صالح / Invalid template ID format'
        }),
    readings: Joi.array()
        .items(inspectionReadingSchema)
        .default([])
        .messages({
            'array.base': 'القراءات يجب أن تكون مصفوفة / Readings must be an array'
        }),
    acceptedQty: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'الكمية المقبولة يجب أن تكون رقماً / Accepted quantity must be a number',
            'number.min': 'الكمية المقبولة يجب أن تكون صفراً أو أكثر / Accepted quantity must be 0 or more'
        }),
    rejectedQty: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'الكمية المرفوضة يجب أن تكون رقماً / Rejected quantity must be a number',
            'number.min': 'الكمية المرفوضة يجب أن تكون صفراً أو أكثر / Rejected quantity must be 0 or more'
        }),
    remarks: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Remarks must not exceed 2000 characters'
        })
});

/**
 * Update inspection validation schema
 * All fields are optional for partial updates
 */
const updateInspectionSchema = Joi.object({
    sampleSize: Joi.number()
        .min(0)
        .messages({
            'number.base': 'حجم العينة يجب أن يكون رقماً / Sample size must be a number',
            'number.min': 'حجم العينة يجب أن يكون صفراً أو أكثر / Sample size must be 0 or more'
        }),
    inspectionDate: Joi.date()
        .iso()
        .messages({
            'date.base': 'تاريخ الفحص غير صالح / Invalid inspection date'
        }),
    readings: Joi.array()
        .items(inspectionReadingSchema)
        .messages({
            'array.base': 'القراءات يجب أن تكون مصفوفة / Readings must be an array'
        }),
    acceptedQty: Joi.number()
        .min(0)
        .messages({
            'number.base': 'الكمية المقبولة يجب أن تكون رقماً / Accepted quantity must be a number',
            'number.min': 'الكمية المقبولة يجب أن تكون صفراً أو أكثر / Accepted quantity must be 0 or more'
        }),
    rejectedQty: Joi.number()
        .min(0)
        .messages({
            'number.base': 'الكمية المرفوضة يجب أن تكون رقماً / Rejected quantity must be a number',
            'number.min': 'الكمية المرفوضة يجب أن تكون صفراً أو أكثر / Rejected quantity must be 0 or more'
        }),
    remarks: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Remarks must not exceed 2000 characters'
        }),
    status: Joi.string()
        .valid('pending', 'accepted', 'rejected', 'partially_accepted')
        .messages({
            'any.only': 'حالة الفحص غير صالحة / Invalid inspection status'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ============================================
// TEMPLATE VALIDATION SCHEMAS
// ============================================

/**
 * Create template validation schema
 */
const createTemplateSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(200)
        .required()
        .messages({
            'string.empty': 'اسم النموذج مطلوب / Template name is required',
            'string.min': 'اسم النموذج يجب أن يكون حرفين على الأقل / Template name must be at least 2 characters',
            'string.max': 'اسم النموذج يجب ألا يتجاوز 200 حرف / Template name must not exceed 200 characters',
            'any.required': 'اسم النموذج مطلوب / Template name is required'
        }),
    nameAr: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'الاسم العربي يجب ألا يتجاوز 200 حرف / Arabic name must not exceed 200 characters'
        }),
    description: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'الوصف يجب ألا يتجاوز 1000 حرف / Description must not exceed 1000 characters'
        }),
    itemId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null, '')
        .messages({
            'string.pattern.base': 'معرف الصنف غير صالح / Invalid item ID format'
        }),
    itemGroup: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'مجموعة الصنف يجب ألا تتجاوز 100 حرف / Item group must not exceed 100 characters'
        }),
    parameters: Joi.array()
        .items(templateParameterSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'المعايير يجب أن تكون مصفوفة / Parameters must be an array',
            'array.min': 'يجب إضافة معيار واحد على الأقل / At least one parameter is required',
            'any.required': 'المعايير مطلوبة / Parameters are required'
        }),
    isActive: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'حقل النشاط يجب أن يكون قيمة منطقية / Active must be a boolean'
        })
});

/**
 * Update template validation schema
 * All fields are optional for partial updates
 */
const updateTemplateSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(200)
        .messages({
            'string.min': 'اسم النموذج يجب أن يكون حرفين على الأقل / Template name must be at least 2 characters',
            'string.max': 'اسم النموذج يجب ألا يتجاوز 200 حرف / Template name must not exceed 200 characters'
        }),
    nameAr: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'الاسم العربي يجب ألا يتجاوز 200 حرف / Arabic name must not exceed 200 characters'
        }),
    description: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'الوصف يجب ألا يتجاوز 1000 حرف / Description must not exceed 1000 characters'
        }),
    itemId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null, '')
        .messages({
            'string.pattern.base': 'معرف الصنف غير صالح / Invalid item ID format'
        }),
    itemGroup: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'مجموعة الصنف يجب ألا تتجاوز 100 حرف / Item group must not exceed 100 characters'
        }),
    parameters: Joi.array()
        .items(templateParameterSchema)
        .min(1)
        .messages({
            'array.base': 'المعايير يجب أن تكون مصفوفة / Parameters must be an array',
            'array.min': 'يجب إضافة معيار واحد على الأقل / At least one parameter is required'
        }),
    isActive: Joi.boolean()
        .messages({
            'boolean.base': 'حقل النشاط يجب أن يكون قيمة منطقية / Active must be a boolean'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ============================================
// ACTION (CAPA) VALIDATION SCHEMAS
// ============================================

/**
 * Create action validation schema
 */
const createActionSchema = Joi.object({
    actionType: Joi.string()
        .valid('corrective', 'preventive')
        .required()
        .messages({
            'string.empty': 'نوع الإجراء مطلوب / Action type is required',
            'any.only': 'نوع الإجراء غير صالح / Invalid action type',
            'any.required': 'نوع الإجراء مطلوب / Action type is required'
        }),
    inspectionId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null, '')
        .messages({
            'string.pattern.base': 'معرف الفحص غير صالح / Invalid inspection ID format'
        }),
    itemId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null, '')
        .messages({
            'string.pattern.base': 'معرف الصنف غير صالح / Invalid item ID format'
        }),
    problem: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .messages({
            'string.empty': 'وصف المشكلة مطلوب / Problem description is required',
            'string.min': 'وصف المشكلة يجب أن يكون 10 أحرف على الأقل / Problem description must be at least 10 characters',
            'string.max': 'وصف المشكلة يجب ألا يتجاوز 5000 حرف / Problem description must not exceed 5000 characters',
            'any.required': 'وصف المشكلة مطلوب / Problem description is required'
        }),
    rootCause: Joi.string()
        .max(5000)
        .allow('', null)
        .messages({
            'string.max': 'السبب الجذري يجب ألا يتجاوز 5000 حرف / Root cause must not exceed 5000 characters'
        }),
    action: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .messages({
            'string.empty': 'وصف الإجراء مطلوب / Action description is required',
            'string.min': 'وصف الإجراء يجب أن يكون 10 أحرف على الأقل / Action description must be at least 10 characters',
            'string.max': 'وصف الإجراء يجب ألا يتجاوز 5000 حرف / Action description must not exceed 5000 characters',
            'any.required': 'وصف الإجراء مطلوب / Action description is required'
        }),
    responsiblePerson: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.empty': 'الشخص المسؤول مطلوب / Responsible person is required',
            'string.pattern.base': 'معرف الشخص المسؤول غير صالح / Invalid responsible person ID format',
            'any.required': 'الشخص المسؤول مطلوب / Responsible person is required'
        }),
    targetDate: Joi.date()
        .iso()
        .required()
        .messages({
            'date.base': 'التاريخ المستهدف غير صالح / Invalid target date',
            'any.required': 'التاريخ المستهدف مطلوب / Target date is required'
        }),
    remarks: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Remarks must not exceed 2000 characters'
        })
});

/**
 * Update action validation schema
 * All fields are optional for partial updates
 */
const updateActionSchema = Joi.object({
    problem: Joi.string()
        .min(10)
        .max(5000)
        .messages({
            'string.min': 'وصف المشكلة يجب أن يكون 10 أحرف على الأقل / Problem description must be at least 10 characters',
            'string.max': 'وصف المشكلة يجب ألا يتجاوز 5000 حرف / Problem description must not exceed 5000 characters'
        }),
    rootCause: Joi.string()
        .max(5000)
        .allow('', null)
        .messages({
            'string.max': 'السبب الجذري يجب ألا يتجاوز 5000 حرف / Root cause must not exceed 5000 characters'
        }),
    action: Joi.string()
        .min(10)
        .max(5000)
        .messages({
            'string.min': 'وصف الإجراء يجب أن يكون 10 أحرف على الأقل / Action description must be at least 10 characters',
            'string.max': 'وصف الإجراء يجب ألا يتجاوز 5000 حرف / Action description must not exceed 5000 characters'
        }),
    responsiblePerson: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .messages({
            'string.pattern.base': 'معرف الشخص المسؤول غير صالح / Invalid responsible person ID format'
        }),
    targetDate: Joi.date()
        .iso()
        .messages({
            'date.base': 'التاريخ المستهدف غير صالح / Invalid target date'
        }),
    completionDate: Joi.date()
        .iso()
        .allow(null)
        .messages({
            'date.base': 'تاريخ الإنجاز غير صالح / Invalid completion date'
        }),
    status: Joi.string()
        .valid('open', 'in_progress', 'completed', 'cancelled')
        .messages({
            'any.only': 'حالة الإجراء غير صالحة / Invalid action status'
        }),
    verification: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'التحقق يجب ألا يتجاوز 2000 حرف / Verification must not exceed 2000 characters'
        }),
    verifiedBy: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null, '')
        .messages({
            'string.pattern.base': 'معرف الشخص المتحقق غير صالح / Invalid verifier ID format'
        }),
    verifiedDate: Joi.date()
        .iso()
        .allow(null)
        .messages({
            'date.base': 'تاريخ التحقق غير صالح / Invalid verification date'
        }),
    remarks: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Remarks must not exceed 2000 characters'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ============================================
// SETTINGS VALIDATION SCHEMA
// ============================================

/**
 * Update settings validation schema
 */
const updateSettingsSchema = Joi.object({
    autoInspectionOnReceipt: Joi.boolean()
        .messages({
            'boolean.base': 'حقل الفحص التلقائي يجب أن يكون قيمة منطقية / Auto inspection must be a boolean'
        }),
    defaultTemplateId: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .allow(null, '')
        .messages({
            'string.pattern.base': 'معرف النموذج الافتراضي غير صالح / Invalid default template ID format'
        }),
    failedInspectionAction: Joi.string()
        .valid('reject', 'hold', 'notify')
        .messages({
            'any.only': 'إجراء الفحص الفاشل غير صالح / Invalid failed inspection action'
        }),
    enableBatchTracking: Joi.boolean()
        .messages({
            'boolean.base': 'حقل تتبع الدفعات يجب أن يكون قيمة منطقية / Batch tracking must be a boolean'
        }),
    inspectionThresholds: Joi.object()
        .pattern(Joi.string(), Joi.number().min(0).max(100))
        .messages({
            'object.base': 'عتبات الفحص يجب أن تكون كائناً / Inspection thresholds must be an object'
        }),
    notifications: Joi.object({
        enableNotifications: Joi.boolean(),
        notifyOnFailure: Joi.boolean(),
        notifyOnActionDue: Joi.boolean(),
        notifyOnActionOverdue: Joi.boolean()
    }).messages({
        'object.base': 'إعدادات الإشعارات يجب أن تكون كائناً / Notifications must be an object'
    }),
    qualityScoring: Joi.object({
        enableScoring: Joi.boolean(),
        scoringMethod: Joi.string().valid('weighted', 'simple', 'custom')
    }).messages({
        'object.base': 'إعدادات التقييم يجب أن تكون كائناً / Quality scoring must be an object'
    }),
    documentation: Joi.object({
        requirePhotos: Joi.boolean(),
        requireSignatures: Joi.boolean(),
        attachmentTypes: Joi.array().items(Joi.string())
    }).messages({
        'object.base': 'إعدادات التوثيق يجب أن تكون كائناً / Documentation must be an object'
    }),
    integration: Joi.object({
        syncWithInventory: Joi.boolean(),
        syncWithPurchase: Joi.boolean(),
        syncWithProduction: Joi.boolean()
    }).messages({
        'object.base': 'إعدادات التكامل يجب أن تكون كائناً / Integration must be an object'
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
        createInspection: createInspectionSchema,
        updateInspection: updateInspectionSchema,
        createTemplate: createTemplateSchema,
        updateTemplate: updateTemplateSchema,
        createAction: createActionSchema,
        updateAction: updateActionSchema,
        updateSettings: updateSettingsSchema,
        inspectionReading: inspectionReadingSchema,
        templateParameter: templateParameterSchema
    },

    // Middleware (for route use)
    validateCreateInspection: validate(createInspectionSchema),
    validateUpdateInspection: validate(updateInspectionSchema),
    validateCreateTemplate: validate(createTemplateSchema),
    validateUpdateTemplate: validate(updateTemplateSchema),
    validateCreateAction: validate(createActionSchema),
    validateUpdateAction: validate(updateActionSchema),
    validateUpdateSettings: validate(updateSettingsSchema),

    // Generic validate function
    validate
};
