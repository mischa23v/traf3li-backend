/**
 * Buying Route Validation Schemas
 *
 * Uses Joi for request validation on buying endpoints.
 * Provides both validation schemas and middleware functions.
 */

const Joi = require('joi');

// ============================================
// SUB-SCHEMAS
// ============================================

/**
 * Item schema for purchase orders, receipts, invoices, etc.
 */
const itemSchema = Joi.object({
    itemId: Joi.string()
        .hex()
        .length(24)
        .messages({
            'string.hex': 'معرف العنصر غير صالح / Invalid item ID format',
            'string.length': 'معرف العنصر غير صالح / Invalid item ID format'
        }),
    itemName: Joi.string()
        .max(200)
        .messages({
            'string.max': 'اسم العنصر يجب ألا يتجاوز 200 حرف / Item name must not exceed 200 characters'
        }),
    description: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'الوصف يجب ألا يتجاوز 1000 حرف / Description must not exceed 1000 characters'
        }),
    quantity: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'الكمية يجب أن تكون رقماً / Quantity must be a number',
            'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number',
            'any.required': 'الكمية مطلوبة / Quantity is required'
        }),
    rate: Joi.number()
        .min(0)
        .messages({
            'number.base': 'السعر يجب أن يكون رقماً / Rate must be a number',
            'number.min': 'السعر يجب أن يكون صفراً أو أكثر / Rate must be zero or more'
        }),
    uom: Joi.string()
        .max(50)
        .messages({
            'string.max': 'وحدة القياس يجب ألا تتجاوز 50 حرف / UOM must not exceed 50 characters'
        }),
    amount: Joi.number()
        .min(0)
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً / Amount must be a number',
            'number.min': 'المبلغ يجب أن يكون صفراً أو أكثر / Amount must be zero or more'
        }),
    taxable: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'حقل الضريبة يجب أن يكون قيمة منطقية / Taxable must be a boolean'
        })
});

/**
 * Address schema
 */
const addressSchema = Joi.object({
    addressLine1: Joi.string().max(200).messages({
        'string.max': 'سطر العنوان الأول طويل جداً / Address line 1 is too long'
    }),
    addressLine2: Joi.string().max(200).allow('', null).messages({
        'string.max': 'سطر العنوان الثاني طويل جداً / Address line 2 is too long'
    }),
    city: Joi.string().max(100).messages({
        'string.max': 'اسم المدينة طويل جداً / City name is too long'
    }),
    state: Joi.string().max(100).allow('', null).messages({
        'string.max': 'اسم الولاية طويل جداً / State name is too long'
    }),
    postalCode: Joi.string().max(20).allow('', null).messages({
        'string.max': 'الرمز البريدي طويل جداً / Postal code is too long'
    }),
    country: Joi.string().max(100).default('Saudi Arabia').messages({
        'string.max': 'اسم الدولة طويل جداً / Country name is too long'
    })
});

// ============================================
// SUPPLIER VALIDATION SCHEMAS
// ============================================

/**
 * Create supplier validation schema
 */
const createSupplierSchema = Joi.object({
    name: Joi.string()
        .required()
        .max(200)
        .messages({
            'string.empty': 'اسم المورد مطلوب / Supplier name is required',
            'string.max': 'اسم المورد يجب ألا يتجاوز 200 حرف / Supplier name must not exceed 200 characters',
            'any.required': 'اسم المورد مطلوب / Supplier name is required'
        }),
    supplierType: Joi.string()
        .valid('company', 'individual', 'distributor', 'manufacturer', 'wholesaler', 'retailer')
        .default('company')
        .messages({
            'any.only': 'نوع المورد غير صالح / Invalid supplier type'
        }),
    supplierGroup: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'مجموعة المورد يجب ألا تتجاوز 100 حرف / Supplier group must not exceed 100 characters'
        }),
    taxId: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'الرقم الضريبي يجب ألا يتجاوز 50 حرف / Tax ID must not exceed 50 characters'
        }),
    email: Joi.string()
        .email()
        .lowercase()
        .allow('', null)
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
        }),
    phone: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'رقم الهاتف يجب ألا يتجاوز 50 حرف / Phone must not exceed 50 characters'
        }),
    website: Joi.string()
        .uri()
        .allow('', null)
        .messages({
            'string.uri': 'رابط الموقع غير صالح / Invalid website URL'
        }),
    address: addressSchema,
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    paymentTerms: Joi.string()
        .valid('immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90')
        .default('net_30')
        .messages({
            'any.only': 'شروط الدفع غير صالحة / Invalid payment terms'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .default('SAR')
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        }),
    creditLimit: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'حد الائتمان يجب أن يكون رقماً / Credit limit must be a number',
            'number.min': 'حد الائتمان يجب أن يكون صفراً أو أكثر / Credit limit must be zero or more'
        }),
    isActive: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'حقل النشاط يجب أن يكون قيمة منطقية / Active must be a boolean'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'string.max': 'الوسم يجب ألا يتجاوز 50 حرف / Tag must not exceed 50 characters'
        })
});

/**
 * Update supplier validation schema
 */
const updateSupplierSchema = Joi.object({
    name: Joi.string()
        .max(200)
        .messages({
            'string.max': 'اسم المورد يجب ألا يتجاوز 200 حرف / Supplier name must not exceed 200 characters'
        }),
    supplierType: Joi.string()
        .valid('company', 'individual', 'distributor', 'manufacturer', 'wholesaler', 'retailer')
        .messages({
            'any.only': 'نوع المورد غير صالح / Invalid supplier type'
        }),
    supplierGroup: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'مجموعة المورد يجب ألا تتجاوز 100 حرف / Supplier group must not exceed 100 characters'
        }),
    taxId: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'الرقم الضريبي يجب ألا يتجاوز 50 حرف / Tax ID must not exceed 50 characters'
        }),
    email: Joi.string()
        .email()
        .lowercase()
        .allow('', null)
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
        }),
    phone: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'رقم الهاتف يجب ألا يتجاوز 50 حرف / Phone must not exceed 50 characters'
        }),
    website: Joi.string()
        .uri()
        .allow('', null)
        .messages({
            'string.uri': 'رابط الموقع غير صالح / Invalid website URL'
        }),
    address: addressSchema,
    billingAddress: addressSchema,
    shippingAddress: addressSchema,
    paymentTerms: Joi.string()
        .valid('immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90')
        .messages({
            'any.only': 'شروط الدفع غير صالحة / Invalid payment terms'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        }),
    creditLimit: Joi.number()
        .min(0)
        .messages({
            'number.base': 'حد الائتمان يجب أن يكون رقماً / Credit limit must be a number',
            'number.min': 'حد الائتمان يجب أن يكون صفراً أو أكثر / Credit limit must be zero or more'
        }),
    isActive: Joi.boolean()
        .messages({
            'boolean.base': 'حقل النشاط يجب أن يكون قيمة منطقية / Active must be a boolean'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'string.max': 'الوسم يجب ألا يتجاوز 50 حرف / Tag must not exceed 50 characters'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ============================================
// PURCHASE ORDER VALIDATION SCHEMAS
// ============================================

/**
 * Create purchase order validation schema
 */
const createPurchaseOrderSchema = Joi.object({
    supplierId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف المورد غير صالح / Invalid supplier ID format',
            'string.length': 'معرف المورد غير صالح / Invalid supplier ID format',
            'any.required': 'معرف المورد مطلوب / Supplier ID is required'
        }),
    orderDate: Joi.date()
        .iso()
        .required()
        .messages({
            'date.base': 'تاريخ الطلب غير صالح / Invalid order date',
            'any.required': 'تاريخ الطلب مطلوب / Order date is required'
        }),
    expectedDeliveryDate: Joi.date()
        .iso()
        .min(Joi.ref('orderDate'))
        .messages({
            'date.base': 'تاريخ التسليم المتوقع غير صالح / Invalid expected delivery date',
            'date.min': 'تاريخ التسليم المتوقع يجب أن يكون بعد تاريخ الطلب / Expected delivery date must be after order date'
        }),
    items: Joi.array()
        .items(itemSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'البنود يجب أن تكون مصفوفة / Items must be an array',
            'array.min': 'يجب أن يحتوي الطلب على بند واحد على الأقل / Order must contain at least one item',
            'any.required': 'البنود مطلوبة / Items are required'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .default('SAR')
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        }),
    taxRate: Joi.number()
        .min(0)
        .max(100)
        .default(15)
        .messages({
            'number.base': 'معدل الضريبة يجب أن يكون رقماً / Tax rate must be a number',
            'number.min': 'معدل الضريبة يجب أن يكون صفراً أو أكثر / Tax rate must be 0 or more',
            'number.max': 'معدل الضريبة يجب أن يكون 100 أو أقل / Tax rate must be 100 or less'
        }),
    discountType: Joi.string()
        .valid('percentage', 'fixed')
        .default('percentage')
        .messages({
            'any.only': 'نوع الخصم غير صالح / Invalid discount type'
        }),
    discountValue: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'قيمة الخصم يجب أن تكون رقماً / Discount value must be a number',
            'number.min': 'قيمة الخصم يجب أن تكون صفراً أو أكثر / Discount value must be 0 or more'
        }),
    shippingAddress: addressSchema,
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        }),
    termsAndConditions: Joi.string()
        .max(5000)
        .allow('', null)
        .messages({
            'string.max': 'الشروط والأحكام يجب ألا تتجاوز 5000 حرف / Terms and conditions must not exceed 5000 characters'
        })
});

// ============================================
// PURCHASE RECEIPT VALIDATION SCHEMAS
// ============================================

/**
 * Create purchase receipt validation schema
 */
const createPurchaseReceiptSchema = Joi.object({
    supplierId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف المورد غير صالح / Invalid supplier ID format',
            'string.length': 'معرف المورد غير صالح / Invalid supplier ID format',
            'any.required': 'معرف المورد مطلوب / Supplier ID is required'
        }),
    purchaseOrderId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف أمر الشراء غير صالح / Invalid purchase order ID format',
            'string.length': 'معرف أمر الشراء غير صالح / Invalid purchase order ID format',
            'any.required': 'معرف أمر الشراء مطلوب / Purchase order ID is required'
        }),
    receiptDate: Joi.date()
        .iso()
        .default(() => new Date())
        .messages({
            'date.base': 'تاريخ الاستلام غير صالح / Invalid receipt date'
        }),
    items: Joi.array()
        .items(itemSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'البنود يجب أن تكون مصفوفة / Items must be an array',
            'array.min': 'يجب أن يحتوي إيصال الاستلام على بند واحد على الأقل / Receipt must contain at least one item',
            'any.required': 'البنود مطلوبة / Items are required'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        }),
    rejectedItems: Joi.array()
        .items(Joi.object({
            itemId: Joi.string().hex().length(24),
            quantity: Joi.number().positive(),
            reason: Joi.string().max(500)
        }))
        .messages({
            'array.base': 'البنود المرفوضة يجب أن تكون مصفوفة / Rejected items must be an array'
        })
});

// ============================================
// PURCHASE INVOICE VALIDATION SCHEMAS
// ============================================

/**
 * Create purchase invoice validation schema
 */
const createPurchaseInvoiceSchema = Joi.object({
    supplierId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف المورد غير صالح / Invalid supplier ID format',
            'string.length': 'معرف المورد غير صالح / Invalid supplier ID format',
            'any.required': 'معرف المورد مطلوب / Supplier ID is required'
        }),
    purchaseOrderId: Joi.string()
        .hex()
        .length(24)
        .allow(null, '')
        .messages({
            'string.hex': 'معرف أمر الشراء غير صالح / Invalid purchase order ID format',
            'string.length': 'معرف أمر الشراء غير صالح / Invalid purchase order ID format'
        }),
    invoiceNumber: Joi.string()
        .max(100)
        .messages({
            'string.max': 'رقم الفاتورة يجب ألا يتجاوز 100 حرف / Invoice number must not exceed 100 characters'
        }),
    invoiceDate: Joi.date()
        .iso()
        .default(() => new Date())
        .messages({
            'date.base': 'تاريخ الفاتورة غير صالح / Invalid invoice date'
        }),
    dueDate: Joi.date()
        .iso()
        .min(Joi.ref('invoiceDate'))
        .messages({
            'date.base': 'تاريخ الاستحقاق غير صالح / Invalid due date',
            'date.min': 'تاريخ الاستحقاق يجب أن يكون بعد تاريخ الفاتورة / Due date must be after invoice date'
        }),
    items: Joi.array()
        .items(itemSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'البنود يجب أن تكون مصفوفة / Items must be an array',
            'array.min': 'يجب أن تحتوي الفاتورة على بند واحد على الأقل / Invoice must contain at least one item',
            'any.required': 'البنود مطلوبة / Items are required'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .default('SAR')
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        }),
    taxRate: Joi.number()
        .min(0)
        .max(100)
        .default(15)
        .messages({
            'number.base': 'معدل الضريبة يجب أن يكون رقماً / Tax rate must be a number',
            'number.min': 'معدل الضريبة يجب أن يكون صفراً أو أكثر / Tax rate must be 0 or more',
            'number.max': 'معدل الضريبة يجب أن يكون 100 أو أقل / Tax rate must be 100 or less'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        })
});

// ============================================
// MATERIAL REQUEST VALIDATION SCHEMAS
// ============================================

/**
 * Create material request validation schema
 */
const createMaterialRequestSchema = Joi.object({
    requestType: Joi.string()
        .valid('purchase', 'transfer', 'manufacture', 'customer_provided')
        .required()
        .messages({
            'any.only': 'نوع الطلب غير صالح / Invalid request type',
            'any.required': 'نوع الطلب مطلوب / Request type is required'
        }),
    requestDate: Joi.date()
        .iso()
        .default(() => new Date())
        .messages({
            'date.base': 'تاريخ الطلب غير صالح / Invalid request date'
        }),
    requiredBy: Joi.date()
        .iso()
        .min(Joi.ref('requestDate'))
        .messages({
            'date.base': 'التاريخ المطلوب غير صالح / Invalid required by date',
            'date.min': 'التاريخ المطلوب يجب أن يكون بعد تاريخ الطلب / Required by date must be after request date'
        }),
    items: Joi.array()
        .items(itemSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'البنود يجب أن تكون مصفوفة / Items must be an array',
            'array.min': 'يجب أن يحتوي الطلب على بند واحد على الأقل / Request must contain at least one item',
            'any.required': 'البنود مطلوبة / Items are required'
        }),
    requestedBy: Joi.string()
        .hex()
        .length(24)
        .messages({
            'string.hex': 'معرف المستخدم غير صالح / Invalid user ID format',
            'string.length': 'معرف المستخدم غير صالح / Invalid user ID format'
        }),
    department: Joi.string()
        .max(100)
        .messages({
            'string.max': 'اسم القسم يجب ألا يتجاوز 100 حرف / Department must not exceed 100 characters'
        }),
    purpose: Joi.string()
        .max(500)
        .messages({
            'string.max': 'الغرض يجب ألا يتجاوز 500 حرف / Purpose must not exceed 500 characters'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        })
});

// ============================================
// RFQ VALIDATION SCHEMAS
// ============================================

/**
 * Create RFQ validation schema
 */
const createRFQSchema = Joi.object({
    rfqDate: Joi.date()
        .iso()
        .default(() => new Date())
        .messages({
            'date.base': 'تاريخ طلب عرض الأسعار غير صالح / Invalid RFQ date'
        }),
    responseDeadline: Joi.date()
        .iso()
        .min(Joi.ref('rfqDate'))
        .messages({
            'date.base': 'الموعد النهائي للرد غير صالح / Invalid response deadline',
            'date.min': 'الموعد النهائي للرد يجب أن يكون بعد تاريخ طلب عرض الأسعار / Response deadline must be after RFQ date'
        }),
    items: Joi.array()
        .items(itemSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'البنود يجب أن تكون مصفوفة / Items must be an array',
            'array.min': 'يجب أن يحتوي طلب عرض الأسعار على بند واحد على الأقل / RFQ must contain at least one item',
            'any.required': 'البنود مطلوبة / Items are required'
        }),
    suppliers: Joi.array()
        .items(Joi.string().hex().length(24))
        .min(1)
        .required()
        .messages({
            'array.base': 'الموردون يجب أن يكونوا مصفوفة / Suppliers must be an array',
            'array.min': 'يجب اختيار مورد واحد على الأقل / At least one supplier must be selected',
            'any.required': 'الموردون مطلوبون / Suppliers are required',
            'string.hex': 'معرف المورد غير صالح / Invalid supplier ID format',
            'string.length': 'معرف المورد غير صالح / Invalid supplier ID format'
        }),
    termsAndConditions: Joi.string()
        .max(5000)
        .allow('', null)
        .messages({
            'string.max': 'الشروط والأحكام يجب ألا تتجاوز 5000 حرف / Terms and conditions must not exceed 5000 characters'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        })
});

/**
 * Update RFQ validation schema
 */
const updateRFQSchema = Joi.object({
    rfqDate: Joi.date()
        .iso()
        .messages({
            'date.base': 'تاريخ طلب عرض الأسعار غير صالح / Invalid RFQ date'
        }),
    responseDeadline: Joi.date()
        .iso()
        .messages({
            'date.base': 'الموعد النهائي للرد غير صالح / Invalid response deadline'
        }),
    items: Joi.array()
        .items(itemSchema)
        .min(1)
        .messages({
            'array.base': 'البنود يجب أن تكون مصفوفة / Items must be an array',
            'array.min': 'يجب أن يحتوي طلب عرض الأسعار على بند واحد على الأقل / RFQ must contain at least one item'
        }),
    suppliers: Joi.array()
        .items(Joi.string().hex().length(24))
        .min(1)
        .messages({
            'array.base': 'الموردون يجب أن يكونوا مصفوفة / Suppliers must be an array',
            'array.min': 'يجب اختيار مورد واحد على الأقل / At least one supplier must be selected',
            'string.hex': 'معرف المورد غير صالح / Invalid supplier ID format',
            'string.length': 'معرف المورد غير صالح / Invalid supplier ID format'
        }),
    termsAndConditions: Joi.string()
        .max(5000)
        .allow('', null)
        .messages({
            'string.max': 'الشروط والأحكام يجب ألا تتجاوز 5000 حرف / Terms and conditions must not exceed 5000 characters'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

// ============================================
// SETTINGS VALIDATION SCHEMAS
// ============================================

/**
 * Update buying settings validation schema
 */
const updateSettingsSchema = Joi.object({
    autoGeneratePO: Joi.boolean()
        .messages({
            'boolean.base': 'حقل التوليد التلقائي يجب أن يكون قيمة منطقية / Auto generate must be a boolean'
        }),
    defaultCurrency: Joi.string()
        .length(3)
        .uppercase()
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        }),
    defaultTaxRate: Joi.number()
        .min(0)
        .max(100)
        .messages({
            'number.base': 'معدل الضريبة الافتراضي يجب أن يكون رقماً / Default tax rate must be a number',
            'number.min': 'معدل الضريبة الافتراضي يجب أن يكون صفراً أو أكثر / Default tax rate must be 0 or more',
            'number.max': 'معدل الضريبة الافتراضي يجب أن يكون 100 أو أقل / Default tax rate must be 100 or less'
        }),
    defaultPaymentTerms: Joi.string()
        .valid('immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90')
        .messages({
            'any.only': 'شروط الدفع الافتراضية غير صالحة / Invalid default payment terms'
        }),
    requireApprovalForPO: Joi.boolean()
        .messages({
            'boolean.base': 'حقل طلب الموافقة يجب أن يكون قيمة منطقية / Require approval must be a boolean'
        }),
    approvalThreshold: Joi.number()
        .min(0)
        .messages({
            'number.base': 'حد الموافقة يجب أن يكون رقماً / Approval threshold must be a number',
            'number.min': 'حد الموافقة يجب أن يكون صفراً أو أكثر / Approval threshold must be zero or more'
        }),
    allowBackdatedPO: Joi.boolean()
        .messages({
            'boolean.base': 'حقل السماح بالتواريخ السابقة يجب أن يكون قيمة منطقية / Allow backdated must be a boolean'
        }),
    notifyOnLowStock: Joi.boolean()
        .messages({
            'boolean.base': 'حقل الإشعار عند انخفاض المخزون يجب أن يكون قيمة منطقية / Notify on low stock must be a boolean'
        }),
    lowStockThreshold: Joi.number()
        .min(0)
        .messages({
            'number.base': 'حد انخفاض المخزون يجب أن يكون رقماً / Low stock threshold must be a number',
            'number.min': 'حد انخفاض المخزون يجب أن يكون صفراً أو أكثر / Low stock threshold must be zero or more'
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
        createSupplier: createSupplierSchema,
        updateSupplier: updateSupplierSchema,
        createPurchaseOrder: createPurchaseOrderSchema,
        createPurchaseReceipt: createPurchaseReceiptSchema,
        createPurchaseInvoice: createPurchaseInvoiceSchema,
        createMaterialRequest: createMaterialRequestSchema,
        createRFQ: createRFQSchema,
        updateRFQ: updateRFQSchema,
        updateSettings: updateSettingsSchema,
        item: itemSchema,
        address: addressSchema
    },

    // Middleware (for route use)
    validateCreateSupplier: validate(createSupplierSchema),
    validateUpdateSupplier: validate(updateSupplierSchema),
    validateCreatePurchaseOrder: validate(createPurchaseOrderSchema),
    validateCreatePurchaseReceipt: validate(createPurchaseReceiptSchema),
    validateCreatePurchaseInvoice: validate(createPurchaseInvoiceSchema),
    validateCreateMaterialRequest: validate(createMaterialRequestSchema),
    validateCreateRFQ: validate(createRFQSchema),
    validateUpdateRFQ: validate(updateRFQSchema),
    validateUpdateSettings: validate(updateSettingsSchema),

    // Generic validate function
    validate
};
