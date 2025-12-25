/**
 * Subcontracting Validation Schemas
 *
 * Joi validation schemas for subcontracting endpoints including:
 * - Subcontracting Orders
 * - Subcontracting Receipts
 * - Subcontracting Settings
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
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Service item schema
 * Used for service items in subcontracting orders
 */
const serviceItemSchema = Joi.object({
    itemId: objectIdValidator.required().messages({
        'any.required': 'معرف العنصر مطلوب / Item ID is required'
    }),
    itemName: Joi.string()
        .min(1)
        .max(500)
        .messages({
            'string.empty': 'اسم العنصر مطلوب / Item name is required',
            'string.max': 'اسم العنصر يجب ألا يتجاوز 500 حرف / Item name must not exceed 500 characters'
        }),
    qty: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'الكمية يجب أن تكون رقماً / Quantity must be a number',
            'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number',
            'any.required': 'الكمية مطلوبة / Quantity is required'
        }),
    rate: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'السعر يجب أن يكون رقماً / Rate must be a number',
            'number.min': 'السعر يجب أن يكون صفراً أو أكثر / Rate must be 0 or more',
            'any.required': 'السعر مطلوب / Rate is required'
        }),
    amount: Joi.number()
        .min(0)
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً / Amount must be a number',
            'number.min': 'المبلغ يجب أن يكون صفراً أو أكثر / Amount must be 0 or more'
        }),
    uom: Joi.string()
        .max(50)
        .messages({
            'string.max': 'وحدة القياس يجب ألا تتجاوز 50 حرف / Unit of measure must not exceed 50 characters'
        })
});

/**
 * Raw material schema
 * Used for raw materials in subcontracting orders
 */
const rawMaterialSchema = Joi.object({
    itemId: objectIdValidator.required().messages({
        'any.required': 'معرف العنصر مطلوب / Item ID is required'
    }),
    itemName: Joi.string()
        .min(1)
        .max(500)
        .messages({
            'string.empty': 'اسم العنصر مطلوب / Item name is required',
            'string.max': 'اسم العنصر يجب ألا يتجاوز 500 حرف / Item name must not exceed 500 characters'
        }),
    requiredQty: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'الكمية المطلوبة يجب أن تكون رقماً / Required quantity must be a number',
            'number.positive': 'الكمية المطلوبة يجب أن تكون رقماً موجباً / Required quantity must be a positive number',
            'any.required': 'الكمية المطلوبة مطلوبة / Required quantity is required'
        }),
    sourceWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف المستودع غير صالح / Invalid warehouse ID format'
    }),
    sourceWarehouseName: Joi.string()
        .max(500)
        .messages({
            'string.max': 'اسم المستودع يجب ألا يتجاوز 500 حرف / Warehouse name must not exceed 500 characters'
        }),
    uom: Joi.string()
        .max(50)
        .messages({
            'string.max': 'وحدة القياس يجب ألا تتجاوز 50 حرف / Unit of measure must not exceed 50 characters'
        }),
    rate: Joi.number()
        .min(0)
        .messages({
            'number.base': 'السعر يجب أن يكون رقماً / Rate must be a number',
            'number.min': 'السعر يجب أن يكون صفراً أو أكثر / Rate must be 0 or more'
        }),
    amount: Joi.number()
        .min(0)
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً / Amount must be a number',
            'number.min': 'المبلغ يجب أن يكون صفراً أو أكثر / Amount must be 0 or more'
        })
});

/**
 * Finished goods schema
 * Used for finished goods in subcontracting orders and receipts
 */
const finishedGoodsSchema = Joi.object({
    itemId: objectIdValidator.required().messages({
        'any.required': 'معرف العنصر مطلوب / Item ID is required'
    }),
    itemName: Joi.string()
        .min(1)
        .max(500)
        .messages({
            'string.empty': 'اسم العنصر مطلوب / Item name is required',
            'string.max': 'اسم العنصر يجب ألا يتجاوز 500 حرف / Item name must not exceed 500 characters'
        }),
    qty: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'الكمية يجب أن تكون رقماً / Quantity must be a number',
            'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number',
            'any.required': 'الكمية مطلوبة / Quantity is required'
        }),
    targetWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف المستودع غير صالح / Invalid warehouse ID format'
    }),
    targetWarehouseName: Joi.string()
        .max(500)
        .messages({
            'string.max': 'اسم المستودع يجب ألا يتجاوز 500 حرف / Warehouse name must not exceed 500 characters'
        }),
    uom: Joi.string()
        .max(50)
        .messages({
            'string.max': 'وحدة القياس يجب ألا تتجاوز 50 حرف / Unit of measure must not exceed 50 characters'
        }),
    rate: Joi.number()
        .min(0)
        .messages({
            'number.base': 'السعر يجب أن يكون رقماً / Rate must be a number',
            'number.min': 'السعر يجب أن يكون صفراً أو أكثر / Rate must be 0 or more'
        }),
    amount: Joi.number()
        .min(0)
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً / Amount must be a number',
            'number.min': 'المبلغ يجب أن يكون صفراً أو أكثر / Amount must be 0 or more'
        }),
    receivedQty: Joi.number()
        .min(0)
        .messages({
            'number.base': 'الكمية المستلمة يجب أن تكون رقماً / Received quantity must be a number',
            'number.min': 'الكمية المستلمة يجب أن تكون صفراً أو أكثر / Received quantity must be 0 or more'
        })
});

/**
 * Returned/Consumed materials schema
 * Used for returned and consumed materials in receipts
 */
const materialMovementSchema = Joi.object({
    itemId: objectIdValidator.required().messages({
        'any.required': 'معرف العنصر مطلوب / Item ID is required'
    }),
    itemName: Joi.string()
        .min(1)
        .max(500)
        .messages({
            'string.empty': 'اسم العنصر مطلوب / Item name is required',
            'string.max': 'اسم العنصر يجب ألا يتجاوز 500 حرف / Item name must not exceed 500 characters'
        }),
    qty: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'الكمية يجب أن تكون رقماً / Quantity must be a number',
            'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number',
            'any.required': 'الكمية مطلوبة / Quantity is required'
        }),
    uom: Joi.string()
        .max(50)
        .messages({
            'string.max': 'وحدة القياس يجب ألا تتجاوز 50 حرف / Unit of measure must not exceed 50 characters'
        })
});

// ═══════════════════════════════════════════════════════════════
// ORDER VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Create order validation schema
 */
const createOrderSchema = Joi.object({
    supplierId: objectIdValidator.required().messages({
        'any.required': 'معرف المورد مطلوب / Supplier ID is required'
    }),
    supplierName: Joi.string()
        .min(1)
        .max(500)
        .required()
        .messages({
            'string.empty': 'اسم المورد مطلوب / Supplier name is required',
            'string.max': 'اسم المورد يجب ألا يتجاوز 500 حرف / Supplier name must not exceed 500 characters',
            'any.required': 'اسم المورد مطلوب / Supplier name is required'
        }),
    orderNumber: Joi.string()
        .max(100)
        .messages({
            'string.max': 'رقم الطلب يجب ألا يتجاوز 100 حرف / Order number must not exceed 100 characters'
        }),
    orderDate: Joi.date()
        .iso()
        .required()
        .messages({
            'date.base': 'تاريخ الطلب غير صالح / Invalid order date',
            'any.required': 'تاريخ الطلب مطلوب / Order date is required'
        }),
    requiredDate: Joi.date()
        .iso()
        .min(Joi.ref('orderDate'))
        .messages({
            'date.base': 'تاريخ الاستحقاق غير صالح / Invalid required date',
            'date.min': 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ الطلب / Required date must be after order date'
        }),
    serviceItems: Joi.array()
        .items(serviceItemSchema)
        .required()
        .messages({
            'array.base': 'عناصر الخدمة يجب أن تكون مصفوفة / Service items must be an array',
            'any.required': 'عناصر الخدمة مطلوبة / Service items are required'
        }),
    rawMaterials: Joi.array()
        .items(rawMaterialSchema)
        .required()
        .messages({
            'array.base': 'المواد الخام يجب أن تكون مصفوفة / Raw materials must be an array',
            'any.required': 'المواد الخام مطلوبة / Raw materials are required'
        }),
    finishedGoods: Joi.array()
        .items(finishedGoodsSchema)
        .required()
        .messages({
            'array.base': 'البضائع المصنعة يجب أن تكون مصفوفة / Finished goods must be an array',
            'any.required': 'البضائع المصنعة مطلوبة / Finished goods are required'
        }),
    supplierWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف مستودع المورد غير صالح / Invalid supplier warehouse ID format'
    }),
    rawMaterialWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف مستودع المواد الخام غير صالح / Invalid raw material warehouse ID format'
    }),
    finishedGoodsWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف مستودع البضائع المصنعة غير صالح / Invalid finished goods warehouse ID format'
    }),
    purchaseOrderId: objectIdValidator.messages({
        'string.pattern.base': 'معرف أمر الشراء غير صالح / Invalid purchase order ID format'
    }),
    remarks: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Remarks must not exceed 2000 characters'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .default('SAR')
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        })
});

/**
 * Update order validation schema
 * All fields are optional for partial updates
 */
const updateOrderSchema = Joi.object({
    supplierName: Joi.string()
        .min(1)
        .max(500)
        .messages({
            'string.empty': 'اسم المورد مطلوب / Supplier name is required',
            'string.max': 'اسم المورد يجب ألا يتجاوز 500 حرف / Supplier name must not exceed 500 characters'
        }),
    orderDate: Joi.date()
        .iso()
        .messages({
            'date.base': 'تاريخ الطلب غير صالح / Invalid order date'
        }),
    requiredDate: Joi.date()
        .iso()
        .messages({
            'date.base': 'تاريخ الاستحقاق غير صالح / Invalid required date'
        }),
    serviceItems: Joi.array()
        .items(serviceItemSchema)
        .min(1)
        .messages({
            'array.base': 'عناصر الخدمة يجب أن تكون مصفوفة / Service items must be an array',
            'array.min': 'يجب تقديم عنصر خدمة واحد على الأقل / At least one service item must be provided'
        }),
    rawMaterials: Joi.array()
        .items(rawMaterialSchema)
        .messages({
            'array.base': 'المواد الخام يجب أن تكون مصفوفة / Raw materials must be an array'
        }),
    finishedGoods: Joi.array()
        .items(finishedGoodsSchema)
        .messages({
            'array.base': 'البضائع المصنعة يجب أن تكون مصفوفة / Finished goods must be an array'
        }),
    supplierWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف مستودع المورد غير صالح / Invalid supplier warehouse ID format'
    }),
    rawMaterialWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف مستودع المواد الخام غير صالح / Invalid raw material warehouse ID format'
    }),
    finishedGoodsWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف مستودع البضائع المصنعة غير صالح / Invalid finished goods warehouse ID format'
    }),
    remarks: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Remarks must not exceed 2000 characters'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ═══════════════════════════════════════════════════════════════
// RECEIPT VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Create receipt validation schema
 */
const createReceiptSchema = Joi.object({
    subcontractingOrderId: objectIdValidator.required().messages({
        'any.required': 'معرف طلب المقاولة الباطنية مطلوب / Subcontracting order ID is required'
    }),
    receiptNumber: Joi.string()
        .max(100)
        .messages({
            'string.max': 'رقم الإيصال يجب ألا يتجاوز 100 حرف / Receipt number must not exceed 100 characters'
        }),
    postingDate: Joi.date()
        .iso()
        .default(() => new Date())
        .messages({
            'date.base': 'تاريخ الترحيل غير صالح / Invalid posting date'
        }),
    postingTime: Joi.date()
        .iso()
        .default(() => new Date())
        .messages({
            'date.base': 'وقت الترحيل غير صالح / Invalid posting time'
        }),
    finishedGoods: Joi.array()
        .items(finishedGoodsSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'البضائع المصنعة يجب أن تكون مصفوفة / Finished goods must be an array',
            'array.min': 'يجب تقديم عنصر واحد على الأقل من البضائع المصنعة / At least one finished goods item must be provided',
            'any.required': 'البضائع المصنعة مطلوبة / Finished goods are required'
        }),
    returnedMaterials: Joi.array()
        .items(materialMovementSchema)
        .messages({
            'array.base': 'المواد المرتجعة يجب أن تكون مصفوفة / Returned materials must be an array'
        }),
    consumedMaterials: Joi.array()
        .items(materialMovementSchema)
        .messages({
            'array.base': 'المواد المستهلكة يجب أن تكون مصفوفة / Consumed materials must be an array'
        }),
    remarks: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Remarks must not exceed 2000 characters'
        })
});

// ═══════════════════════════════════════════════════════════════
// SETTINGS VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Update settings validation schema
 */
const updateSettingsSchema = Joi.object({
    defaultSupplierWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف مستودع المورد الافتراضي غير صالح / Invalid default supplier warehouse ID format'
    }),
    defaultRawMaterialWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف مستودع المواد الخام الافتراضي غير صالح / Invalid default raw material warehouse ID format'
    }),
    defaultFinishedGoodsWarehouse: objectIdValidator.messages({
        'string.pattern.base': 'معرف مستودع البضائع المصنعة الافتراضي غير صالح / Invalid default finished goods warehouse ID format'
    }),
    autoCreateReceipt: Joi.boolean()
        .messages({
            'boolean.base': 'الإنشاء التلقائي للإيصالات يجب أن يكون قيمة منطقية / Auto create receipt must be a boolean'
        }),
    trackReturnedMaterials: Joi.boolean()
        .messages({
            'boolean.base': 'تتبع المواد المرتجعة يجب أن يكون قيمة منطقية / Track returned materials must be a boolean'
        }),
    requireQualityInspection: Joi.boolean()
        .messages({
            'boolean.base': 'اشتراط فحص الجودة يجب أن يكون قيمة منطقية / Require quality inspection must be a boolean'
        })
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

// ═══════════════════════════════════════════════════════════════
// EXPORT MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Schemas (for direct use)
    schemas: {
        createOrder: createOrderSchema,
        updateOrder: updateOrderSchema,
        createReceipt: createReceiptSchema,
        updateSettings: updateSettingsSchema,
        serviceItem: serviceItemSchema,
        rawMaterial: rawMaterialSchema,
        finishedGoods: finishedGoodsSchema,
        materialMovement: materialMovementSchema
    },

    // Middleware (for route use)
    validateCreateOrder: validate(createOrderSchema),
    validateUpdateOrder: validate(updateOrderSchema),
    validateCreateReceipt: validate(createReceiptSchema),
    validateUpdateSettings: validate(updateSettingsSchema),

    // Generic validate function
    validate,

    // Custom validators
    objectIdValidator
};
