/**
 * Manufacturing Module Validation Schemas
 *
 * Uses Joi for request validation on manufacturing endpoints.
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
// SUB-SCHEMAS
// ============================================

/**
 * BOM item schema
 * Used for items in Bill of Materials
 */
const bomItemSchema = Joi.object({
    itemId: objectIdValidator.required().messages({
        'any.required': 'معرف الصنف مطلوب / Item ID is required'
    }),
    quantity: Joi.number().positive().required().messages({
        'number.base': 'الكمية يجب أن تكون رقماً / Quantity must be a number',
        'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number',
        'any.required': 'الكمية مطلوبة / Quantity is required'
    }),
    uom: Joi.string().max(50).messages({
        'string.max': 'وحدة القياس طويلة جداً / UOM is too long'
    }),
    scrapRate: Joi.number().min(0).max(100).default(0).messages({
        'number.min': 'معدل الهدر يجب أن يكون صفراً أو أكثر / Scrap rate must be 0 or more',
        'number.max': 'معدل الهدر يجب أن يكون 100 أو أقل / Scrap rate must be 100 or less'
    }),
    notes: Joi.string().max(500).allow('', null)
});

/**
 * Operation schema
 * Used for operations in work orders and job cards
 */
const operationSchema = Joi.object({
    name: Joi.string().max(200).required().messages({
        'string.max': 'اسم العملية طويل جداً / Operation name is too long',
        'any.required': 'اسم العملية مطلوب / Operation name is required'
    }),
    workstationId: objectIdValidator,
    sequence: Joi.number().integer().min(1).messages({
        'number.min': 'التسلسل يجب أن يكون 1 أو أكثر / Sequence must be 1 or more'
    }),
    estimatedTime: Joi.number().min(0).messages({
        'number.min': 'الوقت المقدر يجب أن يكون صفراً أو أكثر / Estimated time must be 0 or more'
    }),
    description: Joi.string().max(1000).allow('', null),
    instructions: Joi.string().max(2000).allow('', null)
});

// ============================================
// BOM VALIDATION SCHEMAS
// ============================================

/**
 * Create BOM validation schema
 */
const createBOMSchema = Joi.object({
    itemId: objectIdValidator.required().messages({
        'any.required': 'معرف الصنف مطلوب / Item ID is required'
    }),
    quantity: Joi.number().positive().required().messages({
        'number.base': 'الكمية يجب أن تكون رقماً / Quantity must be a number',
        'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number',
        'any.required': 'الكمية مطلوبة / Quantity is required'
    }),
    uom: Joi.string().max(50).required().messages({
        'string.max': 'وحدة القياس طويلة جداً / UOM is too long',
        'any.required': 'وحدة القياس مطلوبة / UOM is required'
    }),
    items: Joi.array().items(bomItemSchema).min(1).required().messages({
        'array.min': 'يجب أن يحتوي BOM على صنف واحد على الأقل / BOM must contain at least one item',
        'any.required': 'الأصناف مطلوبة / Items are required'
    }),
    operations: Joi.array().items(operationSchema),
    isActive: Joi.boolean().default(true),
    isDefault: Joi.boolean().default(false),
    description: Joi.string().max(1000).allow('', null),
    notes: Joi.string().max(2000).allow('', null)
});

/**
 * Update BOM validation schema
 */
const updateBOMSchema = Joi.object({
    itemId: objectIdValidator,
    quantity: Joi.number().positive().messages({
        'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number'
    }),
    uom: Joi.string().max(50),
    items: Joi.array().items(bomItemSchema).min(1).messages({
        'array.min': 'يجب أن يحتوي BOM على صنف واحد على الأقل / BOM must contain at least one item'
    }),
    operations: Joi.array().items(operationSchema),
    isActive: Joi.boolean(),
    isDefault: Joi.boolean(),
    description: Joi.string().max(1000).allow('', null),
    notes: Joi.string().max(2000).allow('', null)
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ============================================
// WORKSTATION VALIDATION SCHEMAS
// ============================================

/**
 * Create workstation validation schema
 */
const createWorkstationSchema = Joi.object({
    name: Joi.string().max(200).required().messages({
        'string.max': 'الاسم طويل جداً / Name is too long',
        'any.required': 'الاسم مطلوب / Name is required'
    }),
    code: Joi.string().max(50).messages({
        'string.max': 'الكود طويل جداً / Code is too long'
    }),
    type: Joi.string().valid('manual', 'automated', 'semi_automated').default('manual').messages({
        'any.only': 'النوع غير صالح / Invalid type'
    }),
    capacity: Joi.number().min(0).messages({
        'number.min': 'السعة يجب أن تكون صفراً أو أكثر / Capacity must be 0 or more'
    }),
    location: Joi.string().max(200),
    isActive: Joi.boolean().default(true),
    hourlyRate: Joi.number().min(0).messages({
        'number.min': 'المعدل بالساعة يجب أن يكون صفراً أو أكثر / Hourly rate must be 0 or more'
    }),
    description: Joi.string().max(1000).allow('', null),
    notes: Joi.string().max(2000).allow('', null)
});

/**
 * Update workstation validation schema
 */
const updateWorkstationSchema = Joi.object({
    name: Joi.string().max(200).messages({
        'string.max': 'الاسم طويل جداً / Name is too long'
    }),
    code: Joi.string().max(50),
    type: Joi.string().valid('manual', 'automated', 'semi_automated').messages({
        'any.only': 'النوع غير صالح / Invalid type'
    }),
    capacity: Joi.number().min(0).messages({
        'number.min': 'السعة يجب أن تكون صفراً أو أكثر / Capacity must be 0 or more'
    }),
    location: Joi.string().max(200),
    isActive: Joi.boolean(),
    hourlyRate: Joi.number().min(0).messages({
        'number.min': 'المعدل بالساعة يجب أن يكون صفراً أو أكثر / Hourly rate must be 0 or more'
    }),
    description: Joi.string().max(1000).allow('', null),
    notes: Joi.string().max(2000).allow('', null)
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ============================================
// WORK ORDER VALIDATION SCHEMAS
// ============================================

/**
 * Create work order validation schema
 */
const createWorkOrderSchema = Joi.object({
    itemId: objectIdValidator.required().messages({
        'any.required': 'معرف الصنف مطلوب / Item ID is required'
    }),
    bomId: objectIdValidator.required().messages({
        'any.required': 'معرف BOM مطلوب / BOM ID is required'
    }),
    qty: Joi.number().positive().required().messages({
        'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number',
        'any.required': 'الكمية مطلوبة / Quantity is required'
    }),
    plannedStartDate: Joi.date().required().messages({
        'any.required': 'تاريخ البدء المخطط مطلوب / Planned start date is required'
    }),
    targetWarehouse: objectIdValidator.required().messages({
        'any.required': 'المستودع المستهدف مطلوب / Target warehouse is required'
    }),
    sourceWarehouse: objectIdValidator,
    salesOrderId: objectIdValidator,
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal').messages({
        'any.only': 'الأولوية غير صالحة / Invalid priority'
    }),
    notes: Joi.string().max(2000).allow('', null),
    expectedCompletionDate: Joi.date()
});

/**
 * Update work order validation schema
 */
const updateWorkOrderSchema = Joi.object({
    itemId: objectIdValidator,
    bomId: objectIdValidator,
    qty: Joi.number().positive().messages({
        'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number'
    }),
    plannedStartDate: Joi.date(),
    targetWarehouse: objectIdValidator,
    sourceWarehouse: objectIdValidator,
    salesOrderId: objectIdValidator,
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').messages({
        'any.only': 'الأولوية غير صالحة / Invalid priority'
    }),
    status: Joi.string().valid('draft', 'submitted', 'in_progress', 'completed', 'cancelled').messages({
        'any.only': 'الحالة غير صالحة / Invalid status'
    }),
    notes: Joi.string().max(2000).allow('', null),
    expectedCompletionDate: Joi.date()
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ============================================
// JOB CARD VALIDATION SCHEMAS
// ============================================

/**
 * Create job card validation schema
 */
const createJobCardSchema = Joi.object({
    workOrderId: objectIdValidator.required().messages({
        'any.required': 'معرف أمر العمل مطلوب / Work order ID is required'
    }),
    operation: operationSchema.required().messages({
        'any.required': 'العملية مطلوبة / Operation is required'
    }),
    assignedTo: objectIdValidator,
    plannedStartDate: Joi.date(),
    plannedEndDate: Joi.date(),
    notes: Joi.string().max(2000).allow('', null)
});

/**
 * Update job card validation schema
 */
const updateJobCardSchema = Joi.object({
    workOrderId: objectIdValidator,
    operation: operationSchema,
    assignedTo: objectIdValidator,
    plannedStartDate: Joi.date(),
    plannedEndDate: Joi.date(),
    actualStartDate: Joi.date(),
    actualEndDate: Joi.date(),
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'on_hold').messages({
        'any.only': 'الحالة غير صالحة / Invalid status'
    }),
    notes: Joi.string().max(2000).allow('', null),
    completionNotes: Joi.string().max(2000).allow('', null)
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
    defaultWarehouse: objectIdValidator,
    autoCreateJobCards: Joi.boolean(),
    allowOverProduction: Joi.boolean(),
    trackOperationTime: Joi.boolean(),
    requireMaterialTransfer: Joi.boolean(),
    enableQualityChecks: Joi.boolean(),
    materialRequestApproval: Joi.boolean(),
    workOrderPrefix: Joi.string().max(10),
    jobCardPrefix: Joi.string().max(10),
    bomPrefix: Joi.string().max(10)
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
        createBOM: createBOMSchema,
        updateBOM: updateBOMSchema,
        createWorkstation: createWorkstationSchema,
        updateWorkstation: updateWorkstationSchema,
        createWorkOrder: createWorkOrderSchema,
        updateWorkOrder: updateWorkOrderSchema,
        createJobCard: createJobCardSchema,
        updateJobCard: updateJobCardSchema,
        updateSettings: updateSettingsSchema,
        bomItem: bomItemSchema,
        operation: operationSchema
    },

    // Middleware (for route use)
    validateCreateBOM: validate(createBOMSchema),
    validateUpdateBOM: validate(updateBOMSchema),
    validateCreateWorkstation: validate(createWorkstationSchema),
    validateUpdateWorkstation: validate(updateWorkstationSchema),
    validateCreateWorkOrder: validate(createWorkOrderSchema),
    validateUpdateWorkOrder: validate(updateWorkOrderSchema),
    validateCreateJobCard: validate(createJobCardSchema),
    validateUpdateJobCard: validate(updateJobCardSchema),
    validateUpdateSettings: validate(updateSettingsSchema),

    // Generic validate function
    validate
};
