/**
 * Inventory Route Validation Schemas
 *
 * Uses Joi for request validation on inventory endpoints.
 * Provides both validation schemas and middleware functions.
 * Supports bilingual error messages (Arabic/English).
 */

const Joi = require('joi');

// ============================================
// SUB-SCHEMAS
// ============================================

/**
 * Stock entry item schema
 * Used for items in stock entries
 */
const stockEntryItemSchema = Joi.object({
    itemId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف الصنف غير صالح / Invalid item ID format',
            'string.length': 'معرف الصنف غير صالح / Invalid item ID format',
            'any.required': 'معرف الصنف مطلوب / Item ID is required'
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
        .messages({
            'number.base': 'السعر يجب أن يكون رقماً / Rate must be a number',
            'number.min': 'السعر يجب أن يكون صفراً أو أكثر / Rate must be zero or greater'
        }),
    batchNo: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'رقم الدفعة طويل جداً / Batch number is too long'
        }),
    serialNo: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'الرقم التسلسلي طويل جداً / Serial number is too long'
        }),
    expiryDate: Joi.date()
        .iso()
        .allow(null)
        .messages({
            'date.base': 'تاريخ الانتهاء غير صالح / Invalid expiry date'
        })
});

/**
 * Reconciliation item schema
 * Used for items in reconciliations
 */
const reconciliationItemSchema = Joi.object({
    itemId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف الصنف غير صالح / Invalid item ID format',
            'string.length': 'معرف الصنف غير صالح / Invalid item ID format',
            'any.required': 'معرف الصنف مطلوب / Item ID is required'
        }),
    systemQty: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'الكمية النظامية يجب أن تكون رقماً / System quantity must be a number',
            'number.min': 'الكمية النظامية يجب أن تكون صفراً أو أكثر / System quantity must be zero or greater',
            'any.required': 'الكمية النظامية مطلوبة / System quantity is required'
        }),
    actualQty: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'الكمية الفعلية يجب أن تكون رقماً / Actual quantity must be a number',
            'number.min': 'الكمية الفعلية يجب أن تكون صفراً أو أكثر / Actual quantity must be zero or greater',
            'any.required': 'الكمية الفعلية مطلوبة / Actual quantity is required'
        }),
    batchNo: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'رقم الدفعة طويل جداً / Batch number is too long'
        }),
    serialNo: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'الرقم التسلسلي طويل جداً / Serial number is too long'
        })
});

/**
 * UOM conversion schema
 */
const uomConversionSchema = Joi.object({
    uom: Joi.string()
        .required()
        .messages({
            'string.empty': 'وحدة القياس مطلوبة / UOM is required',
            'any.required': 'وحدة القياس مطلوبة / UOM is required'
        }),
    conversionFactor: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'معامل التحويل يجب أن يكون رقماً / Conversion factor must be a number',
            'number.positive': 'معامل التحويل يجب أن يكون رقماً موجباً / Conversion factor must be a positive number',
            'any.required': 'معامل التحويل مطلوب / Conversion factor is required'
        })
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Create item validation schema
 */
const createItemSchema = Joi.object({
    itemCode: Joi.string()
        .max(50)
        .messages({
            'string.max': 'رمز الصنف طويل جداً / Item code is too long'
        }),
    name: Joi.string()
        .required()
        .max(200)
        .messages({
            'string.empty': 'اسم الصنف مطلوب / Item name is required',
            'string.max': 'اسم الصنف طويل جداً / Item name is too long',
            'any.required': 'اسم الصنف مطلوب / Item name is required'
        }),
    nameAr: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'الاسم بالعربية طويل جداً / Arabic name is too long'
        }),
    description: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'الوصف طويل جداً / Description is too long'
        }),
    descriptionAr: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'الوصف بالعربية طويل جداً / Arabic description is too long'
        }),
    itemType: Joi.string()
        .valid('product', 'service', 'component', 'consumable')
        .required()
        .messages({
            'any.only': 'نوع الصنف يجب أن يكون منتج، خدمة، مكون، أو مستهلك / Item type must be product, service, component, or consumable',
            'any.required': 'نوع الصنف مطلوب / Item type is required'
        }),
    itemGroup: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'مجموعة الصنف طويلة جداً / Item group is too long'
        }),
    brand: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'العلامة التجارية طويلة جداً / Brand is too long'
        }),
    manufacturer: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'الشركة المصنعة طويلة جداً / Manufacturer is too long'
        }),
    sku: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'SKU طويل جداً / SKU is too long'
        }),
    barcode: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'الباركود طويل جداً / Barcode is too long'
        }),
    hsnCode: Joi.string()
        .max(20)
        .allow('', null)
        .messages({
            'string.max': 'كود HSN طويل جداً / HSN code is too long'
        }),
    stockUom: Joi.string()
        .required()
        .max(50)
        .messages({
            'string.empty': 'وحدة قياس المخزون مطلوبة / Stock UOM is required',
            'string.max': 'وحدة قياس المخزون طويلة جداً / Stock UOM is too long',
            'any.required': 'وحدة قياس المخزون مطلوبة / Stock UOM is required'
        }),
    purchaseUom: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'وحدة قياس الشراء طويلة جداً / Purchase UOM is too long'
        }),
    salesUom: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'وحدة قياس البيع طويلة جداً / Sales UOM is too long'
        }),
    uomConversions: Joi.array()
        .items(uomConversionSchema)
        .messages({
            'array.base': 'تحويلات وحدات القياس يجب أن تكون مصفوفة / UOM conversions must be an array'
        }),
    standardRate: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'السعر القياسي يجب أن يكون رقماً / Standard rate must be a number',
            'number.min': 'السعر القياسي يجب أن يكون صفراً أو أكثر / Standard rate must be zero or greater',
            'any.required': 'السعر القياسي مطلوب / Standard rate is required'
        }),
    valuationRate: Joi.number()
        .min(0)
        .messages({
            'number.base': 'سعر التقييم يجب أن يكون رقماً / Valuation rate must be a number',
            'number.min': 'سعر التقييم يجب أن يكون صفراً أو أكثر / Valuation rate must be zero or greater'
        }),
    lastPurchaseRate: Joi.number()
        .min(0)
        .messages({
            'number.base': 'سعر الشراء الأخير يجب أن يكون رقماً / Last purchase rate must be a number',
            'number.min': 'سعر الشراء الأخير يجب أن يكون صفراً أو أكثر / Last purchase rate must be zero or greater'
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
            'number.min': 'معدل الضريبة يجب أن يكون صفراً أو أكثر / Tax rate must be zero or greater',
            'number.max': 'معدل الضريبة يجب أن يكون 100 أو أقل / Tax rate must be 100 or less'
        }),
    taxTemplateId: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف قالب الضريبة غير صالح / Invalid tax template ID format',
            'string.length': 'معرف قالب الضريبة غير صالح / Invalid tax template ID format'
        }),
    isZeroRated: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'معفى من الضريبة يجب أن يكون صحيح أو خطأ / Zero rated must be true or false'
        }),
    isExempt: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'مستثنى يجب أن يكون صحيح أو خطأ / Exempt must be true or false'
        }),
    isStockItem: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'صنف مخزني يجب أن يكون صحيح أو خطأ / Stock item must be true or false'
        }),
    hasVariants: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'له متغيرات يجب أن يكون صحيح أو خطأ / Has variants must be true or false'
        }),
    hasBatchNo: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'له رقم دفعة يجب أن يكون صحيح أو خطأ / Has batch number must be true or false'
        }),
    hasSerialNo: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'له رقم تسلسلي يجب أن يكون صحيح أو خطأ / Has serial number must be true or false'
        }),
    hasExpiryDate: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'له تاريخ انتهاء يجب أن يكون صحيح أو خطأ / Has expiry date must be true or false'
        }),
    shelfLifeInDays: Joi.number()
        .integer()
        .min(0)
        .messages({
            'number.base': 'مدة الصلاحية يجب أن تكون رقماً / Shelf life must be a number',
            'number.integer': 'مدة الصلاحية يجب أن تكون عدداً صحيحاً / Shelf life must be an integer',
            'number.min': 'مدة الصلاحية يجب أن تكون صفراً أو أكثر / Shelf life must be zero or greater'
        }),
    warrantyPeriod: Joi.number()
        .integer()
        .min(0)
        .messages({
            'number.base': 'فترة الضمان يجب أن تكون رقماً / Warranty period must be a number',
            'number.integer': 'فترة الضمان يجب أن تكون عدداً صحيحاً / Warranty period must be an integer',
            'number.min': 'فترة الضمان يجب أن تكون صفراً أو أكثر / Warranty period must be zero or greater'
        }),
    safetyStock: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'المخزون الآمن يجب أن يكون رقماً / Safety stock must be a number',
            'number.min': 'المخزون الآمن يجب أن يكون صفراً أو أكثر / Safety stock must be zero or greater'
        }),
    reorderLevel: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'مستوى إعادة الطلب يجب أن يكون رقماً / Reorder level must be a number',
            'number.min': 'مستوى إعادة الطلب يجب أن يكون صفراً أو أكثر / Reorder level must be zero or greater'
        }),
    reorderQty: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'كمية إعادة الطلب يجب أن تكون رقماً / Reorder quantity must be a number',
            'number.min': 'كمية إعادة الطلب يجب أن تكون صفراً أو أكثر / Reorder quantity must be zero or greater'
        }),
    leadTimeDays: Joi.number()
        .integer()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'وقت التوريد يجب أن يكون رقماً / Lead time must be a number',
            'number.integer': 'وقت التوريد يجب أن يكون عدداً صحيحاً / Lead time must be an integer',
            'number.min': 'وقت التوريد يجب أن يكون صفراً أو أكثر / Lead time must be zero or greater'
        }),
    valuationMethod: Joi.string()
        .valid('FIFO', 'LIFO', 'Moving Average', 'Weighted Average')
        .default('FIFO')
        .messages({
            'any.only': 'طريقة التقييم غير صالحة / Invalid valuation method'
        }),
    status: Joi.string()
        .valid('active', 'inactive', 'discontinued')
        .default('active')
        .messages({
            'any.only': 'الحالة يجب أن تكون نشط، غير نشط، أو متوقف / Status must be active, inactive, or discontinued'
        }),
    image: Joi.string()
        .uri()
        .allow('', null)
        .messages({
            'string.uri': 'رابط الصورة غير صالح / Invalid image URL'
        }),
    images: Joi.array()
        .items(Joi.string().uri())
        .messages({
            'string.uri': 'رابط الصورة غير صالح / Invalid image URL'
        }),
    weightPerUnit: Joi.number()
        .min(0)
        .messages({
            'number.base': 'الوزن للوحدة يجب أن يكون رقماً / Weight per unit must be a number',
            'number.min': 'الوزن للوحدة يجب أن يكون صفراً أو أكثر / Weight per unit must be zero or greater'
        }),
    weightUom: Joi.string()
        .valid('kg', 'g', 'lb', 'oz', 'ton')
        .messages({
            'any.only': 'وحدة قياس الوزن غير صالحة / Invalid weight UOM'
        }),
    defaultSupplier: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف المورد غير صالح / Invalid supplier ID format',
            'string.length': 'معرف المورد غير صالح / Invalid supplier ID format'
        }),
    supplierItems: Joi.array()
        .items(Joi.object({
            supplierId: Joi.string().hex().length(24),
            supplierItemCode: Joi.string().max(100),
            leadTimeDays: Joi.number().integer().min(0)
        }))
        .messages({
            'array.base': 'أصناف المورد يجب أن تكون مصفوفة / Supplier items must be an array'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'string.max': 'الوسم طويل جداً / Tag is too long'
        }),
    customFields: Joi.object()
});

/**
 * Update item validation schema
 */
const updateItemSchema = Joi.object({
    name: Joi.string()
        .max(200)
        .messages({
            'string.max': 'اسم الصنف طويل جداً / Item name is too long'
        }),
    nameAr: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'الاسم بالعربية طويل جداً / Arabic name is too long'
        }),
    description: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'الوصف طويل جداً / Description is too long'
        }),
    descriptionAr: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'الوصف بالعربية طويل جداً / Arabic description is too long'
        }),
    itemGroup: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'مجموعة الصنف طويلة جداً / Item group is too long'
        }),
    brand: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'العلامة التجارية طويلة جداً / Brand is too long'
        }),
    manufacturer: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'الشركة المصنعة طويلة جداً / Manufacturer is too long'
        }),
    sku: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'SKU طويل جداً / SKU is too long'
        }),
    barcode: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'الباركود طويل جداً / Barcode is too long'
        }),
    hsnCode: Joi.string()
        .max(20)
        .allow('', null)
        .messages({
            'string.max': 'كود HSN طويل جداً / HSN code is too long'
        }),
    purchaseUom: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'وحدة قياس الشراء طويلة جداً / Purchase UOM is too long'
        }),
    salesUom: Joi.string()
        .max(50)
        .allow('', null)
        .messages({
            'string.max': 'وحدة قياس البيع طويلة جداً / Sales UOM is too long'
        }),
    uomConversions: Joi.array()
        .items(uomConversionSchema)
        .messages({
            'array.base': 'تحويلات وحدات القياس يجب أن تكون مصفوفة / UOM conversions must be an array'
        }),
    standardRate: Joi.number()
        .min(0)
        .messages({
            'number.base': 'السعر القياسي يجب أن يكون رقماً / Standard rate must be a number',
            'number.min': 'السعر القياسي يجب أن يكون صفراً أو أكثر / Standard rate must be zero or greater'
        }),
    valuationRate: Joi.number()
        .min(0)
        .messages({
            'number.base': 'سعر التقييم يجب أن يكون رقماً / Valuation rate must be a number',
            'number.min': 'سعر التقييم يجب أن يكون صفراً أو أكثر / Valuation rate must be zero or greater'
        }),
    currency: Joi.string()
        .length(3)
        .uppercase()
        .messages({
            'string.length': 'رمز العملة يجب أن يكون 3 أحرف / Currency code must be 3 characters',
            'string.uppercase': 'رمز العملة يجب أن يكون بأحرف كبيرة / Currency code must be uppercase'
        }),
    taxRate: Joi.number()
        .min(0)
        .max(100)
        .messages({
            'number.base': 'معدل الضريبة يجب أن يكون رقماً / Tax rate must be a number',
            'number.min': 'معدل الضريبة يجب أن يكون صفراً أو أكثر / Tax rate must be zero or greater',
            'number.max': 'معدل الضريبة يجب أن يكون 100 أو أقل / Tax rate must be 100 or less'
        }),
    taxTemplateId: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف قالب الضريبة غير صالح / Invalid tax template ID format',
            'string.length': 'معرف قالب الضريبة غير صالح / Invalid tax template ID format'
        }),
    isZeroRated: Joi.boolean()
        .messages({
            'boolean.base': 'معفى من الضريبة يجب أن يكون صحيح أو خطأ / Zero rated must be true or false'
        }),
    isExempt: Joi.boolean()
        .messages({
            'boolean.base': 'مستثنى يجب أن يكون صحيح أو خطأ / Exempt must be true or false'
        }),
    hasVariants: Joi.boolean()
        .messages({
            'boolean.base': 'له متغيرات يجب أن يكون صحيح أو خطأ / Has variants must be true or false'
        }),
    hasBatchNo: Joi.boolean()
        .messages({
            'boolean.base': 'له رقم دفعة يجب أن يكون صحيح أو خطأ / Has batch number must be true or false'
        }),
    hasSerialNo: Joi.boolean()
        .messages({
            'boolean.base': 'له رقم تسلسلي يجب أن يكون صحيح أو خطأ / Has serial number must be true or false'
        }),
    hasExpiryDate: Joi.boolean()
        .messages({
            'boolean.base': 'له تاريخ انتهاء يجب أن يكون صحيح أو خطأ / Has expiry date must be true or false'
        }),
    shelfLifeInDays: Joi.number()
        .integer()
        .min(0)
        .messages({
            'number.base': 'مدة الصلاحية يجب أن تكون رقماً / Shelf life must be a number',
            'number.integer': 'مدة الصلاحية يجب أن تكون عدداً صحيحاً / Shelf life must be an integer',
            'number.min': 'مدة الصلاحية يجب أن تكون صفراً أو أكثر / Shelf life must be zero or greater'
        }),
    warrantyPeriod: Joi.number()
        .integer()
        .min(0)
        .messages({
            'number.base': 'فترة الضمان يجب أن تكون رقماً / Warranty period must be a number',
            'number.integer': 'فترة الضمان يجب أن تكون عدداً صحيحاً / Warranty period must be an integer',
            'number.min': 'فترة الضمان يجب أن تكون صفراً أو أكثر / Warranty period must be zero or greater'
        }),
    safetyStock: Joi.number()
        .min(0)
        .messages({
            'number.base': 'المخزون الآمن يجب أن يكون رقماً / Safety stock must be a number',
            'number.min': 'المخزون الآمن يجب أن يكون صفراً أو أكثر / Safety stock must be zero or greater'
        }),
    reorderLevel: Joi.number()
        .min(0)
        .messages({
            'number.base': 'مستوى إعادة الطلب يجب أن يكون رقماً / Reorder level must be a number',
            'number.min': 'مستوى إعادة الطلب يجب أن يكون صفراً أو أكثر / Reorder level must be zero or greater'
        }),
    reorderQty: Joi.number()
        .min(0)
        .messages({
            'number.base': 'كمية إعادة الطلب يجب أن تكون رقماً / Reorder quantity must be a number',
            'number.min': 'كمية إعادة الطلب يجب أن تكون صفراً أو أكثر / Reorder quantity must be zero or greater'
        }),
    leadTimeDays: Joi.number()
        .integer()
        .min(0)
        .messages({
            'number.base': 'وقت التوريد يجب أن يكون رقماً / Lead time must be a number',
            'number.integer': 'وقت التوريد يجب أن يكون عدداً صحيحاً / Lead time must be an integer',
            'number.min': 'وقت التوريد يجب أن تكون صفراً أو أكثر / Lead time must be zero or greater'
        }),
    valuationMethod: Joi.string()
        .valid('FIFO', 'LIFO', 'Moving Average', 'Weighted Average')
        .messages({
            'any.only': 'طريقة التقييم غير صالحة / Invalid valuation method'
        }),
    status: Joi.string()
        .valid('active', 'inactive', 'discontinued')
        .messages({
            'any.only': 'الحالة يجب أن تكون نشط، غير نشط، أو متوقف / Status must be active, inactive, or discontinued'
        }),
    disabled: Joi.boolean()
        .messages({
            'boolean.base': 'معطل يجب أن يكون صحيح أو خطأ / Disabled must be true or false'
        }),
    image: Joi.string()
        .uri()
        .allow('', null)
        .messages({
            'string.uri': 'رابط الصورة غير صالح / Invalid image URL'
        }),
    images: Joi.array()
        .items(Joi.string().uri())
        .messages({
            'string.uri': 'رابط الصورة غير صالح / Invalid image URL'
        }),
    weightPerUnit: Joi.number()
        .min(0)
        .messages({
            'number.base': 'الوزن للوحدة يجب أن يكون رقماً / Weight per unit must be a number',
            'number.min': 'الوزن للوحدة يجب أن يكون صفراً أو أكثر / Weight per unit must be zero or greater'
        }),
    weightUom: Joi.string()
        .valid('kg', 'g', 'lb', 'oz', 'ton')
        .messages({
            'any.only': 'وحدة قياس الوزن غير صالحة / Invalid weight UOM'
        }),
    defaultSupplier: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف المورد غير صالح / Invalid supplier ID format',
            'string.length': 'معرف المورد غير صالح / Invalid supplier ID format'
        }),
    supplierItems: Joi.array()
        .items(Joi.object({
            supplierId: Joi.string().hex().length(24),
            supplierItemCode: Joi.string().max(100),
            leadTimeDays: Joi.number().integer().min(0)
        }))
        .messages({
            'array.base': 'أصناف المورد يجب أن تكون مصفوفة / Supplier items must be an array'
        }),
    tags: Joi.array()
        .items(Joi.string().max(50))
        .messages({
            'string.max': 'الوسم طويل جداً / Tag is too long'
        }),
    customFields: Joi.object()
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Create warehouse validation schema
 */
const createWarehouseSchema = Joi.object({
    name: Joi.string()
        .required()
        .max(200)
        .messages({
            'string.empty': 'اسم المستودع مطلوب / Warehouse name is required',
            'string.max': 'اسم المستودع طويل جداً / Warehouse name is too long',
            'any.required': 'اسم المستودع مطلوب / Warehouse name is required'
        }),
    nameAr: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'الاسم بالعربية طويل جداً / Arabic name is too long'
        }),
    warehouseType: Joi.string()
        .valid('main', 'transit', 'virtual', 'retail')
        .default('main')
        .messages({
            'any.only': 'نوع المستودع غير صالح / Invalid warehouse type'
        }),
    parentWarehouse: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف المستودع الأب غير صالح / Invalid parent warehouse ID format',
            'string.length': 'معرف المستودع الأب غير صالح / Invalid parent warehouse ID format'
        }),
    isGroup: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'هل مجموعة يجب أن يكون صحيح أو خطأ / Is group must be true or false'
        }),
    company: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'اسم الشركة طويل جداً / Company name is too long'
        }),
    address: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'العنوان طويل جداً / Address is too long'
        }),
    city: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'المدينة طويلة جداً / City is too long'
        }),
    region: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'المنطقة طويلة جداً / Region is too long'
        }),
    country: Joi.string()
        .max(100)
        .default('Saudi Arabia')
        .messages({
            'string.max': 'الدولة طويلة جداً / Country is too long'
        }),
    postalCode: Joi.string()
        .max(20)
        .allow('', null)
        .messages({
            'string.max': 'الرمز البريدي طويل جداً / Postal code is too long'
        }),
    latitude: Joi.number()
        .min(-90)
        .max(90)
        .allow(null)
        .messages({
            'number.base': 'خط العرض يجب أن يكون رقماً / Latitude must be a number',
            'number.min': 'خط العرض يجب أن يكون بين -90 و 90 / Latitude must be between -90 and 90',
            'number.max': 'خط العرض يجب أن يكون بين -90 و 90 / Latitude must be between -90 and 90'
        }),
    longitude: Joi.number()
        .min(-180)
        .max(180)
        .allow(null)
        .messages({
            'number.base': 'خط الطول يجب أن يكون رقماً / Longitude must be a number',
            'number.min': 'خط الطول يجب أن يكون بين -180 و 180 / Longitude must be between -180 and 180',
            'number.max': 'خط الطول يجب أن يكون بين -180 و 180 / Longitude must be between -180 and 180'
        }),
    contactPerson: Joi.string()
        .max(150)
        .allow('', null)
        .messages({
            'string.max': 'اسم الشخص المسؤول طويل جداً / Contact person name is too long'
        }),
    phone: Joi.string()
        .max(20)
        .allow('', null)
        .messages({
            'string.max': 'رقم الهاتف طويل جداً / Phone number is too long'
        }),
    email: Joi.string()
        .email()
        .allow('', null)
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
        }),
    isDefault: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'افتراضي يجب أن يكون صحيح أو خطأ / Is default must be true or false'
        }),
    accountId: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف الحساب غير صالح / Invalid account ID format',
            'string.length': 'معرف الحساب غير صالح / Invalid account ID format'
        })
});

/**
 * Update warehouse validation schema
 */
const updateWarehouseSchema = Joi.object({
    name: Joi.string()
        .max(200)
        .messages({
            'string.max': 'اسم المستودع طويل جداً / Warehouse name is too long'
        }),
    nameAr: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'الاسم بالعربية طويل جداً / Arabic name is too long'
        }),
    warehouseType: Joi.string()
        .valid('main', 'transit', 'virtual', 'retail')
        .messages({
            'any.only': 'نوع المستودع غير صالح / Invalid warehouse type'
        }),
    parentWarehouse: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف المستودع الأب غير صالح / Invalid parent warehouse ID format',
            'string.length': 'معرف المستودع الأب غير صالح / Invalid parent warehouse ID format'
        }),
    isGroup: Joi.boolean()
        .messages({
            'boolean.base': 'هل مجموعة يجب أن يكون صحيح أو خطأ / Is group must be true or false'
        }),
    company: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'اسم الشركة طويل جداً / Company name is too long'
        }),
    address: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'العنوان طويل جداً / Address is too long'
        }),
    city: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'المدينة طويلة جداً / City is too long'
        }),
    region: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'المنطقة طويلة جداً / Region is too long'
        }),
    country: Joi.string()
        .max(100)
        .messages({
            'string.max': 'الدولة طويلة جداً / Country is too long'
        }),
    postalCode: Joi.string()
        .max(20)
        .allow('', null)
        .messages({
            'string.max': 'الرمز البريدي طويل جداً / Postal code is too long'
        }),
    latitude: Joi.number()
        .min(-90)
        .max(90)
        .allow(null)
        .messages({
            'number.base': 'خط العرض يجب أن يكون رقماً / Latitude must be a number',
            'number.min': 'خط العرض يجب أن يكون بين -90 و 90 / Latitude must be between -90 and 90',
            'number.max': 'خط العرض يجب أن يكون بين -90 و 90 / Latitude must be between -90 and 90'
        }),
    longitude: Joi.number()
        .min(-180)
        .max(180)
        .allow(null)
        .messages({
            'number.base': 'خط الطول يجب أن يكون رقماً / Longitude must be a number',
            'number.min': 'خط الطول يجب أن يكون بين -180 و 180 / Longitude must be between -180 and 180',
            'number.max': 'خط الطول يجب أن يكون بين -180 و 180 / Longitude must be between -180 and 180'
        }),
    contactPerson: Joi.string()
        .max(150)
        .allow('', null)
        .messages({
            'string.max': 'اسم الشخص المسؤول طويل جداً / Contact person name is too long'
        }),
    phone: Joi.string()
        .max(20)
        .allow('', null)
        .messages({
            'string.max': 'رقم الهاتف طويل جداً / Phone number is too long'
        }),
    email: Joi.string()
        .email()
        .allow('', null)
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
        }),
    isDefault: Joi.boolean()
        .messages({
            'boolean.base': 'افتراضي يجب أن يكون صحيح أو خطأ / Is default must be true or false'
        }),
    disabled: Joi.boolean()
        .messages({
            'boolean.base': 'معطل يجب أن يكون صحيح أو خطأ / Disabled must be true or false'
        }),
    accountId: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف الحساب غير صالح / Invalid account ID format',
            'string.length': 'معرف الحساب غير صالح / Invalid account ID format'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Create stock entry validation schema
 */
const createStockEntrySchema = Joi.object({
    entryType: Joi.string()
        .valid('Material Receipt', 'Material Issue', 'Material Transfer', 'Manufacture', 'Repack', 'Send to Subcontractor', 'Receive from Subcontractor')
        .required()
        .messages({
            'any.only': 'نوع الإدخال غير صالح / Invalid entry type',
            'any.required': 'نوع الإدخال مطلوب / Entry type is required'
        }),
    postingDate: Joi.date()
        .iso()
        .required()
        .messages({
            'date.base': 'تاريخ الترحيل غير صالح / Invalid posting date',
            'any.required': 'تاريخ الترحيل مطلوب / Posting date is required'
        }),
    postingTime: Joi.string()
        .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .messages({
            'string.pattern.base': 'وقت الترحيل غير صالح (استخدم HH:MM) / Invalid posting time (use HH:MM)'
        }),
    fromWarehouse: Joi.string()
        .hex()
        .length(24)
        .when('entryType', {
            is: Joi.valid('Material Issue', 'Material Transfer'),
            then: Joi.required()
        })
        .messages({
            'string.hex': 'معرف المستودع المصدر غير صالح / Invalid from warehouse ID format',
            'string.length': 'معرف المستودع المصدر غير صالح / Invalid from warehouse ID format',
            'any.required': 'المستودع المصدر مطلوب / From warehouse is required'
        }),
    toWarehouse: Joi.string()
        .hex()
        .length(24)
        .when('entryType', {
            is: Joi.valid('Material Receipt', 'Material Transfer'),
            then: Joi.required()
        })
        .messages({
            'string.hex': 'معرف المستودع الوجهة غير صالح / Invalid to warehouse ID format',
            'string.length': 'معرف المستودع الوجهة غير صالح / Invalid to warehouse ID format',
            'any.required': 'المستودع الوجهة مطلوب / To warehouse is required'
        }),
    items: Joi.array()
        .items(stockEntryItemSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'الأصناف يجب أن تكون مصفوفة / Items must be an array',
            'array.min': 'يجب إضافة صنف واحد على الأقل / At least one item must be added',
            'any.required': 'الأصناف مطلوبة / Items are required'
        }),
    referenceType: Joi.string()
        .valid('Purchase Order', 'Sales Order', 'Production Order', 'Material Request')
        .allow('', null)
        .messages({
            'any.only': 'نوع المرجع غير صالح / Invalid reference type'
        }),
    referenceId: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف المرجع غير صالح / Invalid reference ID format',
            'string.length': 'معرف المرجع غير صالح / Invalid reference ID format'
        }),
    purchaseOrderId: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف أمر الشراء غير صالح / Invalid purchase order ID format',
            'string.length': 'معرف أمر الشراء غير صالح / Invalid purchase order ID format'
        }),
    salesOrderId: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف أمر البيع غير صالح / Invalid sales order ID format',
            'string.length': 'معرف أمر البيع غير صالح / Invalid sales order ID format'
        }),
    remarks: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Remarks are too long'
        }),
    company: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'اسم الشركة طويل جداً / Company name is too long'
        })
});

/**
 * Create batch validation schema
 */
const createBatchSchema = Joi.object({
    batchNo: Joi.string()
        .required()
        .max(100)
        .messages({
            'string.empty': 'رقم الدفعة مطلوب / Batch number is required',
            'string.max': 'رقم الدفعة طويل جداً / Batch number is too long',
            'any.required': 'رقم الدفعة مطلوب / Batch number is required'
        }),
    itemId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف الصنف غير صالح / Invalid item ID format',
            'string.length': 'معرف الصنف غير صالح / Invalid item ID format',
            'any.required': 'معرف الصنف مطلوب / Item ID is required'
        }),
    warehouseId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف المستودع غير صالح / Invalid warehouse ID format',
            'string.length': 'معرف المستودع غير صالح / Invalid warehouse ID format',
            'any.required': 'معرف المستودع مطلوب / Warehouse ID is required'
        }),
    qty: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'الكمية يجب أن تكون رقماً / Quantity must be a number',
            'number.min': 'الكمية يجب أن تكون صفراً أو أكثر / Quantity must be zero or greater',
            'any.required': 'الكمية مطلوبة / Quantity is required'
        }),
    manufacturingDate: Joi.date()
        .iso()
        .max('now')
        .allow(null)
        .messages({
            'date.base': 'تاريخ التصنيع غير صالح / Invalid manufacturing date',
            'date.max': 'تاريخ التصنيع لا يمكن أن يكون في المستقبل / Manufacturing date cannot be in the future'
        }),
    expiryDate: Joi.date()
        .iso()
        .min(Joi.ref('manufacturingDate'))
        .allow(null)
        .messages({
            'date.base': 'تاريخ الانتهاء غير صالح / Invalid expiry date',
            'date.min': 'تاريخ الانتهاء يجب أن يكون بعد تاريخ التصنيع / Expiry date must be after manufacturing date'
        }),
    supplierBatchNo: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'رقم دفعة المورد طويل جداً / Supplier batch number is too long'
        }),
    notes: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        })
});

/**
 * Create serial number validation schema
 */
const createSerialNumberSchema = Joi.object({
    serialNo: Joi.string()
        .required()
        .max(100)
        .messages({
            'string.empty': 'الرقم التسلسلي مطلوب / Serial number is required',
            'string.max': 'الرقم التسلسلي طويل جداً / Serial number is too long',
            'any.required': 'الرقم التسلسلي مطلوب / Serial number is required'
        }),
    itemId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف الصنف غير صالح / Invalid item ID format',
            'string.length': 'معرف الصنف غير صالح / Invalid item ID format',
            'any.required': 'معرف الصنف مطلوب / Item ID is required'
        }),
    warehouseId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف المستودع غير صالح / Invalid warehouse ID format',
            'string.length': 'معرف المستودع غير صالح / Invalid warehouse ID format',
            'any.required': 'معرف المستودع مطلوب / Warehouse ID is required'
        }),
    status: Joi.string()
        .valid('Available', 'Delivered', 'Expired', 'Returned', 'Damaged')
        .default('Available')
        .messages({
            'any.only': 'حالة الرقم التسلسلي غير صالحة / Invalid serial number status'
        }),
    purchaseDate: Joi.date()
        .iso()
        .max('now')
        .allow(null)
        .messages({
            'date.base': 'تاريخ الشراء غير صالح / Invalid purchase date',
            'date.max': 'تاريخ الشراء لا يمكن أن يكون في المستقبل / Purchase date cannot be in the future'
        }),
    warrantyExpiryDate: Joi.date()
        .iso()
        .min(Joi.ref('purchaseDate'))
        .allow(null)
        .messages({
            'date.base': 'تاريخ انتهاء الضمان غير صالح / Invalid warranty expiry date',
            'date.min': 'تاريخ انتهاء الضمان يجب أن يكون بعد تاريخ الشراء / Warranty expiry date must be after purchase date'
        }),
    notes: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        })
});

/**
 * Create reconciliation validation schema
 */
const createReconciliationSchema = Joi.object({
    warehouseId: Joi.string()
        .hex()
        .length(24)
        .required()
        .messages({
            'string.hex': 'معرف المستودع غير صالح / Invalid warehouse ID format',
            'string.length': 'معرف المستودع غير صالح / Invalid warehouse ID format',
            'any.required': 'معرف المستودع مطلوب / Warehouse ID is required'
        }),
    reconciliationDate: Joi.date()
        .iso()
        .max('now')
        .required()
        .messages({
            'date.base': 'تاريخ التسوية غير صالح / Invalid reconciliation date',
            'date.max': 'تاريخ التسوية لا يمكن أن يكون في المستقبل / Reconciliation date cannot be in the future',
            'any.required': 'تاريخ التسوية مطلوب / Reconciliation date is required'
        }),
    items: Joi.array()
        .items(reconciliationItemSchema)
        .min(1)
        .required()
        .messages({
            'array.base': 'الأصناف يجب أن تكون مصفوفة / Items must be an array',
            'array.min': 'يجب إضافة صنف واحد على الأقل / At least one item must be added',
            'any.required': 'الأصناف مطلوبة / Items are required'
        }),
    remarks: Joi.string()
        .max(1000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Remarks are too long'
        })
});

/**
 * Create item group validation schema
 */
const createItemGroupSchema = Joi.object({
    name: Joi.string()
        .required()
        .max(100)
        .messages({
            'string.empty': 'اسم المجموعة مطلوب / Item group name is required',
            'string.max': 'اسم المجموعة طويل جداً / Item group name is too long',
            'any.required': 'اسم المجموعة مطلوب / Item group name is required'
        }),
    nameAr: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'الاسم بالعربية طويل جداً / Arabic name is too long'
        }),
    parentGroup: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'المجموعة الأب طويلة جداً / Parent group is too long'
        }),
    description: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'الوصف طويل جداً / Description is too long'
        })
});

/**
 * Create UOM validation schema
 */
const createUomSchema = Joi.object({
    name: Joi.string()
        .required()
        .max(50)
        .messages({
            'string.empty': 'اسم وحدة القياس مطلوب / UOM name is required',
            'string.max': 'اسم وحدة القياس طويل جداً / UOM name is too long',
            'any.required': 'اسم وحدة القياس مطلوب / UOM name is required'
        }),
    symbol: Joi.string()
        .max(10)
        .allow('', null)
        .messages({
            'string.max': 'رمز وحدة القياس طويل جداً / UOM symbol is too long'
        }),
    description: Joi.string()
        .max(200)
        .allow('', null)
        .messages({
            'string.max': 'الوصف طويل جداً / Description is too long'
        })
});

/**
 * Update settings validation schema
 */
const updateSettingsSchema = Joi.object({
    defaultValuationMethod: Joi.string()
        .valid('FIFO', 'LIFO', 'Moving Average', 'Weighted Average')
        .messages({
            'any.only': 'طريقة التقييم الافتراضية غير صالحة / Invalid default valuation method'
        }),
    autoGenerateItemCode: Joi.boolean()
        .messages({
            'boolean.base': 'التوليد التلقائي لرمز الصنف يجب أن يكون صحيح أو خطأ / Auto generate item code must be true or false'
        }),
    itemCodePrefix: Joi.string()
        .max(10)
        .allow('', null)
        .messages({
            'string.max': 'بادئة رمز الصنف طويلة جداً / Item code prefix is too long'
        }),
    allowNegativeStock: Joi.boolean()
        .messages({
            'boolean.base': 'السماح بالمخزون السالب يجب أن يكون صحيح أو خطأ / Allow negative stock must be true or false'
        }),
    enableBatchTracking: Joi.boolean()
        .messages({
            'boolean.base': 'تفعيل تتبع الدفعات يجب أن يكون صحيح أو خطأ / Enable batch tracking must be true or false'
        }),
    enableSerialTracking: Joi.boolean()
        .messages({
            'boolean.base': 'تفعيل التتبع التسلسلي يجب أن يكون صحيح أو خطأ / Enable serial tracking must be true or false'
        }),
    enableExpiryTracking: Joi.boolean()
        .messages({
            'boolean.base': 'تفعيل تتبع الانتهاء يجب أن يكون صحيح أو خطأ / Enable expiry tracking must be true or false'
        }),
    defaultWarehouse: Joi.string()
        .hex()
        .length(24)
        .allow(null)
        .messages({
            'string.hex': 'معرف المستودع الافتراضي غير صالح / Invalid default warehouse ID format',
            'string.length': 'معرف المستودع الافتراضي غير صالح / Invalid default warehouse ID format'
        }),
    lowStockThreshold: Joi.number()
        .min(0)
        .messages({
            'number.base': 'حد المخزون المنخفض يجب أن يكون رقماً / Low stock threshold must be a number',
            'number.min': 'حد المخزون المنخفض يجب أن يكون صفراً أو أكثر / Low stock threshold must be zero or greater'
        }),
    autoReorderEnabled: Joi.boolean()
        .messages({
            'boolean.base': 'تفعيل إعادة الطلب التلقائي يجب أن يكون صحيح أو خطأ / Auto reorder enabled must be true or false'
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
        createItem: createItemSchema,
        updateItem: updateItemSchema,
        createWarehouse: createWarehouseSchema,
        updateWarehouse: updateWarehouseSchema,
        createStockEntry: createStockEntrySchema,
        createBatch: createBatchSchema,
        createSerialNumber: createSerialNumberSchema,
        createReconciliation: createReconciliationSchema,
        createItemGroup: createItemGroupSchema,
        createUom: createUomSchema,
        updateSettings: updateSettingsSchema,
        stockEntryItem: stockEntryItemSchema,
        reconciliationItem: reconciliationItemSchema,
        uomConversion: uomConversionSchema
    },

    // Middleware (for route use)
    validateCreateItem: validate(createItemSchema),
    validateUpdateItem: validate(updateItemSchema),
    validateCreateWarehouse: validate(createWarehouseSchema),
    validateUpdateWarehouse: validate(updateWarehouseSchema),
    validateCreateStockEntry: validate(createStockEntrySchema),
    validateCreateBatch: validate(createBatchSchema),
    validateCreateSerialNumber: validate(createSerialNumberSchema),
    validateCreateReconciliation: validate(createReconciliationSchema),
    validateCreateItemGroup: validate(createItemGroupSchema),
    validateCreateUom: validate(createUomSchema),
    validateUpdateSettings: validate(updateSettingsSchema),

    // Generic validate function
    validate
};
