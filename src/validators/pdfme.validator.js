/**
 * PDFMe Route Validation Schemas
 *
 * Uses Joi for request validation on PDFMe endpoints.
 * Provides both validation schemas and middleware functions.
 * Supports bilingual error messages (Arabic/English).
 */

const Joi = require('joi');

// ============================================
// CONSTANTS
// ============================================

const VALID_CATEGORIES = ['invoice', 'contract', 'receipt', 'report', 'statement', 'letter', 'certificate', 'custom'];
const VALID_TYPES = ['standard', 'detailed', 'summary', 'minimal', 'custom'];
const MAX_TEMPLATE_NAME_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 1000;

// ============================================
// SUB-SCHEMAS
// ============================================

/**
 * MongoDB ObjectId validation
 */
const objectIdSchema = Joi.string()
    .hex()
    .length(24)
    .messages({
        'string.hex': 'معرف غير صالح / Invalid ID format',
        'string.length': 'معرف غير صالح / Invalid ID format'
    });

/**
 * Schema field schema for PDFMe templates
 */
const schemaFieldSchema = Joi.object({
    name: Joi.string().required(),
    type: Joi.string().required(),
    position: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required()
    }).required(),
    width: Joi.number().positive().required(),
    height: Joi.number().positive().required(),
    fontSize: Joi.number().positive(),
    fontColor: Joi.string(),
    alignment: Joi.string().valid('left', 'center', 'right'),
    readOnly: Joi.boolean(),
    content: Joi.string().allow(''),
    lineHeight: Joi.number().positive(),
    color: Joi.string()
}).unknown(true); // Allow additional PDFMe-specific fields

/**
 * Font schema for custom fonts
 */
const fontSchema = Joi.object({
    name: Joi.string().required(),
    data: Joi.string(), // Base64 or URL
    fallback: Joi.boolean().default(false),
    subset: Joi.boolean().default(true)
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Create template validation schema
 */
const createTemplateSchema = Joi.object({
    name: Joi.string()
        .required()
        .min(1)
        .max(MAX_TEMPLATE_NAME_LENGTH)
        .messages({
            'string.empty': 'اسم القالب مطلوب / Template name is required',
            'any.required': 'اسم القالب مطلوب / Template name is required',
            'string.max': `اسم القالب يجب ألا يتجاوز ${MAX_TEMPLATE_NAME_LENGTH} حرف / Template name must not exceed ${MAX_TEMPLATE_NAME_LENGTH} characters`
        }),
    nameAr: Joi.string()
        .max(MAX_TEMPLATE_NAME_LENGTH)
        .allow('', null)
        .messages({
            'string.max': `الاسم العربي يجب ألا يتجاوز ${MAX_TEMPLATE_NAME_LENGTH} حرف / Arabic name must not exceed ${MAX_TEMPLATE_NAME_LENGTH} characters`
        }),
    description: Joi.string()
        .max(MAX_DESCRIPTION_LENGTH)
        .allow('', null)
        .messages({
            'string.max': `الوصف يجب ألا يتجاوز ${MAX_DESCRIPTION_LENGTH} حرف / Description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`
        }),
    descriptionAr: Joi.string()
        .max(MAX_DESCRIPTION_LENGTH)
        .allow('', null)
        .messages({
            'string.max': `الوصف العربي يجب ألا يتجاوز ${MAX_DESCRIPTION_LENGTH} حرف / Arabic description must not exceed ${MAX_DESCRIPTION_LENGTH} characters`
        }),
    category: Joi.string()
        .valid(...VALID_CATEGORIES)
        .required()
        .messages({
            'any.only': `الفئة غير صالحة / Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
            'any.required': 'الفئة مطلوبة / Category is required'
        }),
    type: Joi.string()
        .valid(...VALID_TYPES)
        .default('standard')
        .messages({
            'any.only': `النوع غير صالح / Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
        }),
    basePdf: Joi.string()
        .default('BLANK_PDF')
        .messages({
            'string.base': 'قالب PDF الأساسي يجب أن يكون نصاً / Base PDF must be a string'
        }),
    schemas: Joi.array()
        .items(Joi.array().items(schemaFieldSchema))
        .default([[]])
        .messages({
            'array.base': 'مخطط القالب يجب أن يكون مصفوفة / Schemas must be an array'
        }),
    fonts: Joi.array()
        .items(fontSchema)
        .messages({
            'array.base': 'الخطوط يجب أن تكون مصفوفة / Fonts must be an array'
        }),
    isDefault: Joi.boolean()
        .default(false),
    isActive: Joi.boolean()
        .default(true),
    sampleInputs: Joi.object()
        .allow(null)
});

/**
 * Update template validation schema
 */
const updateTemplateSchema = Joi.object({
    name: Joi.string()
        .min(1)
        .max(MAX_TEMPLATE_NAME_LENGTH)
        .messages({
            'string.empty': 'اسم القالب لا يمكن أن يكون فارغاً / Template name cannot be empty',
            'string.max': `اسم القالب يجب ألا يتجاوز ${MAX_TEMPLATE_NAME_LENGTH} حرف / Template name must not exceed ${MAX_TEMPLATE_NAME_LENGTH} characters`
        }),
    nameAr: Joi.string()
        .max(MAX_TEMPLATE_NAME_LENGTH)
        .allow('', null),
    description: Joi.string()
        .max(MAX_DESCRIPTION_LENGTH)
        .allow('', null),
    descriptionAr: Joi.string()
        .max(MAX_DESCRIPTION_LENGTH)
        .allow('', null),
    category: Joi.string()
        .valid(...VALID_CATEGORIES)
        .messages({
            'any.only': `الفئة غير صالحة / Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
        }),
    type: Joi.string()
        .valid(...VALID_TYPES)
        .messages({
            'any.only': `النوع غير صالح / Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`
        }),
    basePdf: Joi.string(),
    schemas: Joi.array()
        .items(Joi.array().items(schemaFieldSchema)),
    fonts: Joi.array()
        .items(fontSchema),
    isDefault: Joi.boolean(),
    isActive: Joi.boolean(),
    sampleInputs: Joi.object()
        .allow(null)
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Clone template validation schema
 */
const cloneTemplateSchema = Joi.object({
    name: Joi.string()
        .min(1)
        .max(MAX_TEMPLATE_NAME_LENGTH)
        .messages({
            'string.max': `اسم القالب يجب ألا يتجاوز ${MAX_TEMPLATE_NAME_LENGTH} حرف / Template name must not exceed ${MAX_TEMPLATE_NAME_LENGTH} characters`
        }),
    nameAr: Joi.string()
        .max(MAX_TEMPLATE_NAME_LENGTH)
        .allow('', null)
});

/**
 * Generate PDF validation schema
 */
const generatePdfSchema = Joi.object({
    templateId: objectIdSchema,
    template: Joi.object({
        basePdf: Joi.string().required(),
        schemas: Joi.array().items(Joi.array().items(schemaFieldSchema)).required()
    }),
    inputs: Joi.alternatives()
        .try(
            Joi.object().min(1),
            Joi.array().items(Joi.object()).min(1)
        )
        .required()
        .messages({
            'alternatives.match': 'البيانات يجب أن تكون كائن أو مصفوفة من الكائنات / Inputs must be an object or array of objects',
            'any.required': 'البيانات مطلوبة / Inputs are required'
        }),
    type: Joi.string()
        .max(50)
        .default('custom')
}).or('templateId', 'template').messages({
    'object.missing': 'يجب توفير معرف القالب أو القالب / Either templateId or template must be provided'
});

/**
 * Generate PDF async validation schema
 */
const generatePdfAsyncSchema = Joi.object({
    templateId: objectIdSchema,
    template: Joi.object({
        basePdf: Joi.string().required(),
        schemas: Joi.array().items(Joi.array().items(schemaFieldSchema)).required()
    }),
    inputs: Joi.alternatives()
        .try(
            Joi.object().min(1),
            Joi.array().items(Joi.object()).min(1)
        )
        .required()
        .messages({
            'alternatives.match': 'البيانات يجب أن تكون كائن أو مصفوفة من الكائنات / Inputs must be an object or array of objects',
            'any.required': 'البيانات مطلوبة / Inputs are required'
        }),
    type: Joi.string()
        .max(50)
        .default('custom'),
    priority: Joi.number()
        .integer()
        .min(1)
        .max(10)
        .default(3)
        .messages({
            'number.min': 'الأولوية يجب أن تكون بين 1 و 10 / Priority must be between 1 and 10',
            'number.max': 'الأولوية يجب أن تكون بين 1 و 10 / Priority must be between 1 and 10'
        })
}).or('templateId', 'template').messages({
    'object.missing': 'يجب توفير معرف القالب أو القالب / Either templateId or template must be provided'
});

/**
 * Invoice data schema for PDF generation
 */
const invoiceDataSchema = Joi.object({
    invoiceNumber: Joi.string().max(50),
    date: Joi.date().iso(),
    dueDate: Joi.date().iso(),
    client: Joi.object({
        name: Joi.string(),
        fullName: Joi.string(),
        address: Joi.string(),
        phone: Joi.string(),
        email: Joi.string().email(),
        vatNumber: Joi.string()
    }),
    lawyer: Joi.object(),
    firm: Joi.object(),
    items: Joi.array().items(Joi.object({
        description: Joi.string(),
        quantity: Joi.number(),
        unitPrice: Joi.number(),
        lineTotal: Joi.number()
    })),
    subtotal: Joi.number(),
    discountAmount: Joi.number(),
    taxAmount: Joi.number(),
    totalAmount: Joi.number(),
    currency: Joi.string().length(3).uppercase().default('SAR'),
    notes: Joi.string().max(2000).allow('', null),
    paymentTerms: Joi.string().max(500).allow('', null),
    bankDetails: Joi.string().max(500).allow('', null)
}).unknown(true);

/**
 * Generate invoice PDF validation schema
 */
const generateInvoicePdfSchema = Joi.object({
    invoiceData: invoiceDataSchema.required().messages({
        'any.required': 'بيانات الفاتورة مطلوبة / Invoice data is required'
    }),
    templateId: objectIdSchema,
    includeQR: Joi.boolean().default(false),
    qrData: Joi.string().when('includeQR', {
        is: true,
        then: Joi.string().required().messages({
            'any.required': 'بيانات رمز QR مطلوبة عند تضمين QR / QR data is required when includeQR is true'
        }),
        otherwise: Joi.string().allow('', null)
    })
});

/**
 * Contract data schema for PDF generation
 */
const contractDataSchema = Joi.object({
    contractNumber: Joi.string().max(50),
    title: Joi.string().max(500),
    date: Joi.date().iso(),
    effectiveDate: Joi.date().iso(),
    expiryDate: Joi.date().iso(),
    parties: Joi.array().items(Joi.object({
        name: Joi.string(),
        role: Joi.string()
    })),
    content: Joi.string().max(50000),
    terms: Joi.string().max(10000),
    signatures: Joi.array()
}).unknown(true);

/**
 * Generate contract PDF validation schema
 */
const generateContractPdfSchema = Joi.object({
    contractData: contractDataSchema.required().messages({
        'any.required': 'بيانات العقد مطلوبة / Contract data is required'
    }),
    templateId: objectIdSchema
});

/**
 * Receipt data schema for PDF generation
 */
const receiptDataSchema = Joi.object({
    receiptNumber: Joi.string().max(50),
    date: Joi.date().iso(),
    paidBy: Joi.object({
        name: Joi.string()
    }),
    receivedBy: Joi.object({
        name: Joi.string()
    }),
    amount: Joi.number(),
    currency: Joi.string().length(3).uppercase().default('SAR'),
    paymentMethod: Joi.string().max(50),
    description: Joi.string().max(2000).allow('', null),
    invoiceRef: Joi.string().max(100).allow('', null)
}).unknown(true);

/**
 * Generate receipt PDF validation schema
 */
const generateReceiptPdfSchema = Joi.object({
    receiptData: receiptDataSchema.required().messages({
        'any.required': 'بيانات الإيصال مطلوبة / Receipt data is required'
    }),
    templateId: objectIdSchema
});

/**
 * Preview template validation schema
 */
const previewTemplateSchema = Joi.object({
    inputs: Joi.object().allow(null)
});

/**
 * List templates query validation schema
 */
const listTemplatesQuerySchema = Joi.object({
    category: Joi.string()
        .valid(...VALID_CATEGORIES)
        .messages({
            'any.only': `الفئة غير صالحة / Invalid category`
        }),
    type: Joi.string()
        .valid(...VALID_TYPES)
        .messages({
            'any.only': `النوع غير صالح / Invalid type`
        }),
    isActive: Joi.string()
        .valid('true', 'false'),
    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(50)
        .messages({
            'number.min': 'الحد الأدنى للنتائج هو 1 / Minimum limit is 1',
            'number.max': 'الحد الأقصى للنتائج هو 100 / Maximum limit is 100'
        }),
    skip: Joi.number()
        .integer()
        .min(0)
        .default(0)
        .messages({
            'number.min': 'لا يمكن أن يكون التخطي سالباً / Skip cannot be negative'
        }),
    sort: Joi.string()
        .valid('createdAt', 'updatedAt', 'name', 'category', 'type')
        .default('createdAt')
        .messages({
            'any.only': 'حقل الفرز غير صالح / Invalid sort field'
        }),
    order: Joi.string()
        .valid('asc', 'desc')
        .default('desc')
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
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'خطأ في التحقق / Validation error',
                    messageAr: 'خطأ في التحقق من البيانات'
                },
                errors
            });
        }

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
        createTemplate: createTemplateSchema,
        updateTemplate: updateTemplateSchema,
        cloneTemplate: cloneTemplateSchema,
        generatePdf: generatePdfSchema,
        generatePdfAsync: generatePdfAsyncSchema,
        generateInvoicePdf: generateInvoicePdfSchema,
        generateContractPdf: generateContractPdfSchema,
        generateReceiptPdf: generateReceiptPdfSchema,
        previewTemplate: previewTemplateSchema,
        listTemplatesQuery: listTemplatesQuerySchema
    },

    // Middleware (for route use)
    validateCreateTemplate: validate(createTemplateSchema),
    validateUpdateTemplate: validate(updateTemplateSchema),
    validateCloneTemplate: validate(cloneTemplateSchema),
    validateGeneratePdf: validate(generatePdfSchema),
    validateGeneratePdfAsync: validate(generatePdfAsyncSchema),
    validateGenerateInvoicePdf: validate(generateInvoicePdfSchema),
    validateGenerateContractPdf: validate(generateContractPdfSchema),
    validateGenerateReceiptPdf: validate(generateReceiptPdfSchema),
    validatePreviewTemplate: validate(previewTemplateSchema),
    validateListTemplatesQuery: validate(listTemplatesQuerySchema, 'query'),

    // Generic validate function
    validate,

    // Constants
    VALID_CATEGORIES,
    VALID_TYPES
};
