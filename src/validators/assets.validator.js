/**
 * Assets Module Validation Schemas
 *
 * Joi validation schemas for assets endpoints including:
 * - Assets (fixed assets with depreciation tracking)
 * - Asset Categories
 * - Maintenance Schedules
 * - Asset Movements
 * - Settings
 */

const Joi = require('joi');

// ═══════════════════════════════════════════════════════════════
// CUSTOM VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * MongoDB ObjectId validator
 */
const objectIdValidator = Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'معرف غير صالح / Invalid ID format'
});

// ═══════════════════════════════════════════════════════════════
// ASSET VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Create asset validation schema
 */
const createAssetSchema = Joi.object({
    assetName: Joi.string()
        .required()
        .max(200)
        .messages({
            'string.empty': 'اسم الأصل مطلوب / Asset name is required',
            'string.max': 'اسم الأصل طويل جداً / Asset name is too long'
        }),

    assetNameAr: Joi.string().max(200),

    description: Joi.string().max(1000),

    serialNo: Joi.string().max(100),

    image: Joi.string().uri(),

    tags: Joi.array().items(Joi.string()),

    assetCategory: objectIdValidator.messages({
        'string.pattern.base': 'معرف الفئة غير صالح / Invalid category ID'
    }),

    itemId: objectIdValidator,

    itemCode: Joi.string(),

    isExistingAsset: Joi.boolean(),

    location: Joi.string().max(200),

    custodian: objectIdValidator.messages({
        'string.pattern.base': 'معرف الأمين غير صالح / Invalid custodian ID'
    }),

    custodianName: Joi.string(),

    department: Joi.string().max(200),

    company: Joi.string().max(200),

    purchaseDate: Joi.date(),

    purchaseInvoiceId: objectIdValidator,

    supplierId: objectIdValidator,

    supplierName: Joi.string(),

    grossPurchaseAmount: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'مبلغ الشراء يجب أن يكون رقماً / Purchase amount must be a number',
            'number.min': 'مبلغ الشراء يجب أن يكون موجباً / Purchase amount must be positive',
            'any.required': 'مبلغ الشراء مطلوب / Purchase amount is required'
        }),

    purchaseReceiptAmount: Joi.number().min(0),

    currency: Joi.string().length(3).default('SAR'),

    assetQuantity: Joi.number().min(1).default(1),

    availableForUseDate: Joi.date(),

    depreciationMethod: Joi.string()
        .valid('straight_line', 'double_declining_balance', 'written_down_value')
        .messages({
            'any.only': 'طريقة الإهلاك غير صالحة / Invalid depreciation method'
        }),

    totalNumberOfDepreciations: Joi.number().min(0),

    frequencyOfDepreciation: Joi.string()
        .valid('monthly', 'quarterly', 'half_yearly', 'yearly')
        .messages({
            'any.only': 'تكرار الإهلاك غير صالح / Invalid depreciation frequency'
        }),

    depreciationStartDate: Joi.date(),

    expectedValueAfterUsefulLife: Joi.number().min(0),

    openingAccumulatedDepreciation: Joi.number().min(0),

    warrantyExpiryDate: Joi.date(),

    insuranceDetails: Joi.object({
        insurer: Joi.string(),
        policyNo: Joi.string(),
        startDate: Joi.date(),
        endDate: Joi.date(),
        insuredValue: Joi.number().min(0)
    }),

    status: Joi.string().valid('draft', 'submitted', 'active', 'disposed')
});

/**
 * Update asset validation schema
 */
const updateAssetSchema = Joi.object({
    assetName: Joi.string().max(200),
    assetNameAr: Joi.string().max(200),
    description: Joi.string().max(1000),
    serialNo: Joi.string().max(100),
    image: Joi.string().uri(),
    tags: Joi.array().items(Joi.string()),
    assetCategory: objectIdValidator,
    itemId: objectIdValidator,
    itemCode: Joi.string(),
    isExistingAsset: Joi.boolean(),
    location: Joi.string().max(200),
    custodian: objectIdValidator,
    custodianName: Joi.string(),
    department: Joi.string().max(200),
    company: Joi.string().max(200),
    purchaseDate: Joi.date(),
    purchaseInvoiceId: objectIdValidator,
    supplierId: objectIdValidator,
    supplierName: Joi.string(),
    grossPurchaseAmount: Joi.number().min(0),
    purchaseReceiptAmount: Joi.number().min(0),
    currency: Joi.string().length(3),
    assetQuantity: Joi.number().min(1),
    availableForUseDate: Joi.date(),
    depreciationMethod: Joi.string().valid('straight_line', 'double_declining_balance', 'written_down_value'),
    totalNumberOfDepreciations: Joi.number().min(0),
    frequencyOfDepreciation: Joi.string().valid('monthly', 'quarterly', 'half_yearly', 'yearly'),
    depreciationStartDate: Joi.date(),
    expectedValueAfterUsefulLife: Joi.number().min(0),
    openingAccumulatedDepreciation: Joi.number().min(0),
    warrantyExpiryDate: Joi.date(),
    insuranceDetails: Joi.object({
        insurer: Joi.string(),
        policyNo: Joi.string(),
        startDate: Joi.date(),
        endDate: Joi.date(),
        insuredValue: Joi.number().min(0)
    }),
    status: Joi.string().valid('draft', 'submitted', 'active', 'disposed')
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ═══════════════════════════════════════════════════════════════
// CATEGORY VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Create category validation schema
 */
const createCategorySchema = Joi.object({
    name: Joi.string()
        .required()
        .max(200)
        .messages({
            'string.empty': 'اسم الفئة مطلوب / Category name is required',
            'string.max': 'اسم الفئة طويل جداً / Category name is too long'
        }),

    nameAr: Joi.string().max(200),

    parentCategory: objectIdValidator.messages({
        'string.pattern.base': 'معرف الفئة الأصلية غير صالح / Invalid parent category ID'
    }),

    isGroup: Joi.boolean(),

    depreciationMethod: Joi.string()
        .valid('straight_line', 'double_declining_balance', 'written_down_value')
        .messages({
            'any.only': 'طريقة الإهلاك غير صالحة / Invalid depreciation method'
        }),

    totalNumberOfDepreciations: Joi.number().min(0),

    frequencyOfDepreciation: Joi.string()
        .valid('monthly', 'quarterly', 'half_yearly', 'yearly')
        .messages({
            'any.only': 'تكرار الإهلاك غير صالح / Invalid depreciation frequency'
        }),

    enableCwip: Joi.boolean(),

    fixedAssetAccount: objectIdValidator,

    accumulatedDepreciationAccount: objectIdValidator,

    depreciationExpenseAccount: objectIdValidator,

    isActive: Joi.boolean()
});

/**
 * Update category validation schema
 */
const updateCategorySchema = Joi.object({
    name: Joi.string().max(200),
    nameAr: Joi.string().max(200),
    parentCategory: objectIdValidator,
    isGroup: Joi.boolean(),
    depreciationMethod: Joi.string().valid('straight_line', 'double_declining_balance', 'written_down_value'),
    totalNumberOfDepreciations: Joi.number().min(0),
    frequencyOfDepreciation: Joi.string().valid('monthly', 'quarterly', 'half_yearly', 'yearly'),
    enableCwip: Joi.boolean(),
    fixedAssetAccount: objectIdValidator,
    accumulatedDepreciationAccount: objectIdValidator,
    depreciationExpenseAccount: objectIdValidator,
    isActive: Joi.boolean()
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Create maintenance schedule validation schema
 */
const createMaintenanceScheduleSchema = Joi.object({
    assetId: objectIdValidator
        .required()
        .messages({
            'any.required': 'معرف الأصل مطلوب / Asset ID is required',
            'string.pattern.base': 'معرف الأصل غير صالح / Invalid asset ID'
        }),

    assetName: Joi.string(),

    maintenanceType: Joi.string()
        .valid('preventive', 'corrective', 'calibration')
        .required()
        .messages({
            'any.required': 'نوع الصيانة مطلوب / Maintenance type is required',
            'any.only': 'نوع الصيانة غير صالح / Invalid maintenance type'
        }),

    frequency: Joi.string()
        .valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly')
        .required()
        .messages({
            'any.required': 'تكرار الصيانة مطلوب / Frequency is required',
            'any.only': 'تكرار الصيانة غير صالح / Invalid frequency'
        }),

    lastMaintenanceDate: Joi.date(),

    nextMaintenanceDate: Joi.date()
        .required()
        .messages({
            'any.required': 'تاريخ الصيانة القادمة مطلوب / Next maintenance date is required'
        }),

    assignTo: objectIdValidator,

    assignToName: Joi.string(),

    description: Joi.string().max(1000),

    certificateRequired: Joi.boolean()
});

/**
 * Update maintenance schedule validation schema
 */
const updateMaintenanceScheduleSchema = Joi.object({
    assetId: objectIdValidator,
    assetName: Joi.string(),
    maintenanceType: Joi.string().valid('preventive', 'corrective', 'calibration'),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly'),
    lastMaintenanceDate: Joi.date(),
    nextMaintenanceDate: Joi.date(),
    assignTo: objectIdValidator,
    assignToName: Joi.string(),
    description: Joi.string().max(1000),
    certificateRequired: Joi.boolean()
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ═══════════════════════════════════════════════════════════════
// MOVEMENT VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Create movement validation schema
 */
const createMovementSchema = Joi.object({
    assetId: objectIdValidator
        .required()
        .messages({
            'any.required': 'معرف الأصل مطلوب / Asset ID is required',
            'string.pattern.base': 'معرف الأصل غير صالح / Invalid asset ID'
        }),

    assetName: Joi.string(),

    movementType: Joi.string()
        .valid('issue', 'receipt', 'transfer', 'scrap', 'repair', 'return')
        .required()
        .messages({
            'any.required': 'نوع الحركة مطلوب / Movement type is required',
            'any.only': 'نوع الحركة غير صالح / Invalid movement type'
        }),

    fromLocation: Joi.string().max(200),

    toLocation: Joi.string().max(200),

    fromCustodian: objectIdValidator,

    toCustodian: objectIdValidator,

    quantity: Joi.number().min(1).default(1),

    movementDate: Joi.date().default(() => new Date()),

    purpose: Joi.string().max(500),

    notes: Joi.string().max(1000),

    attachments: Joi.array().items(Joi.string().uri())
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS VALIDATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Update settings validation schema
 */
const updateSettingsSchema = Joi.object({
    enableDepreciation: Joi.boolean(),

    defaultDepreciationMethod: Joi.string()
        .valid('straight_line', 'double_declining_balance', 'written_down_value'),

    defaultDepreciationFrequency: Joi.string()
        .valid('monthly', 'quarterly', 'half_yearly', 'yearly'),

    enableMaintenanceScheduling: Joi.boolean(),

    maintenanceReminderDays: Joi.number().min(1).max(365),

    warrantyReminderDays: Joi.number().min(1).max(365),

    requireApprovalForDisposal: Joi.boolean(),

    requireApprovalForTransfer: Joi.boolean(),

    autoGenerateAssetNumber: Joi.boolean(),

    assetNumberPrefix: Joi.string().max(10),

    assetNumberSeries: Joi.string().max(20),

    trackAssetLocation: Joi.boolean(),

    trackAssetCustodian: Joi.boolean(),

    enableQRCodeGeneration: Joi.boolean(),

    enableBarcodeGeneration: Joi.boolean()
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE FACTORY
// ═══════════════════════════════════════════════════════════════

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
                message: detail.message,
                type: detail.type
            }));

            return res.status(400).json({
                success: false,
                message: 'خطأ في التحقق من البيانات / Validation error',
                errors
            });
        }

        // Replace request data with validated/sanitized data
        req[source] = value;
        next();
    };
};

// ═══════════════════════════════════════════════════════════════
// EXPORT SCHEMAS AND MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Schemas (for direct use in tests)
    schemas: {
        createAsset: createAssetSchema,
        updateAsset: updateAssetSchema,
        createCategory: createCategorySchema,
        updateCategory: updateCategorySchema,
        createMaintenanceSchedule: createMaintenanceScheduleSchema,
        updateMaintenanceSchedule: updateMaintenanceScheduleSchema,
        createMovement: createMovementSchema,
        updateSettings: updateSettingsSchema
    },

    // Middleware (for route use)
    validateCreateAsset: validate(createAssetSchema),
    validateUpdateAsset: validate(updateAssetSchema),
    validateCreateCategory: validate(createCategorySchema),
    validateUpdateCategory: validate(updateCategorySchema),
    validateCreateMaintenanceSchedule: validate(createMaintenanceScheduleSchema),
    validateUpdateMaintenanceSchedule: validate(updateMaintenanceScheduleSchema),
    validateCreateMovement: validate(createMovementSchema),
    validateUpdateSettings: validate(updateSettingsSchema),

    // Generic validate function
    validate
};
