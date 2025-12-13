/**
 * Invoice Route Validation Schemas
 *
 * Uses Joi for request validation on invoice endpoints.
 * Provides both validation schemas and middleware functions.
 * Supports Saudi VAT (15%) and bilingual error messages (Arabic/English).
 */

const Joi = require('joi');

// ============================================
// CONSTANTS
// ============================================

const SAUDI_VAT_RATE = 15;

// ============================================
// SUB-SCHEMAS
// ============================================

/**
 * Invoice item schema
 * Used for line items in invoices
 */
const invoiceItemSchema = Joi.object({
    description: Joi.string()
        .min(1)
        .max(1000)
        .messages({
            'string.empty': 'وصف البند مطلوب / Item description is required',
            'string.min': 'وصف البند مطلوب / Item description is required',
            'string.max': 'وصف البند يجب ألا يتجاوز 1000 حرف / Item description must not exceed 1000 characters'
        }),
    quantity: Joi.number()
        .positive()
        .default(1)
        .messages({
            'number.base': 'الكمية يجب أن تكون رقماً / Quantity must be a number',
            'number.positive': 'الكمية يجب أن تكون رقماً موجباً / Quantity must be a positive number'
        }),
    rate: Joi.number()
        .positive()
        .messages({
            'number.base': 'السعر يجب أن يكون رقماً / Rate must be a number',
            'number.positive': 'السعر يجب أن يكون رقماً موجباً / Rate must be a positive number'
        }),
    taxable: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'حقل الضريبة يجب أن يكون قيمة منطقية / Taxable must be a boolean'
        })
});

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Create invoice validation schema
 */
const createInvoiceSchema = Joi.object({
    clientId: Joi.string()
        .hex()
        .length(24)
        .messages({
            'string.hex': 'معرف العميل غير صالح / Invalid client ID format',
            'string.length': 'معرف العميل غير صالح / Invalid client ID format'
        }),
    items: Joi.array()
        .items(invoiceItemSchema)
        .messages({
            'array.base': 'البنود يجب أن تكون مصفوفة / Items must be an array'
        }),
    dueDate: Joi.date()
        .iso()
        .messages({
            'date.base': 'تاريخ الاستحقاق غير صالح / Invalid due date'
        }),
    issueDate: Joi.date()
        .iso()
        .default(() => new Date())
        .messages({
            'date.base': 'تاريخ الإصدار غير صالح / Invalid issue date'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        }),
    vatRate: Joi.number()
        .min(0)
        .max(100)
        .default(SAUDI_VAT_RATE)
        .messages({
            'number.base': 'معدل الضريبة يجب أن يكون رقماً / VAT rate must be a number',
            'number.min': 'معدل الضريبة يجب أن يكون صفراً أو أكثر / VAT rate must be 0 or more',
            'number.max': 'معدل الضريبة يجب أن يكون 100 أو أقل / VAT rate must be 100 or less'
        }),
    caseId: Joi.string()
        .hex()
        .length(24)
        .allow(null, '')
        .messages({
            'string.hex': 'معرف القضية غير صالح / Invalid case ID format',
            'string.length': 'معرف القضية غير صالح / Invalid case ID format'
        }),
    paymentTerms: Joi.string()
        .valid('due_on_receipt', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90')
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
    discountValue: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'قيمة الخصم يجب أن تكون رقماً / Discount value must be a number',
            'number.min': 'قيمة الخصم يجب أن تكون صفراً أو أكثر / Discount value must be 0 or more'
        }),
    discountType: Joi.string()
        .valid('percentage', 'fixed')
        .default('percentage')
        .messages({
            'any.only': 'نوع الخصم غير صالح / Invalid discount type'
        })
});

/**
 * Update invoice validation schema
 * All fields are optional for partial updates
 */
const updateInvoiceSchema = Joi.object({
    clientId: Joi.string()
        .hex()
        .length(24)
        .messages({
            'string.hex': 'معرف العميل غير صالح / Invalid client ID format',
            'string.length': 'معرف العميل غير صالح / Invalid client ID format'
        }),
    items: Joi.array()
        .items(invoiceItemSchema)
        .min(1)
        .messages({
            'array.base': 'البنود يجب أن تكون مصفوفة / Items must be an array',
            'array.min': 'الفاتورة يجب أن تحتوي على بند واحد على الأقل / Invoice must contain at least one item'
        }),
    dueDate: Joi.date()
        .iso()
        .messages({
            'date.base': 'تاريخ الاستحقاق غير صالح / Invalid due date'
        }),
    issueDate: Joi.date()
        .iso()
        .messages({
            'date.base': 'تاريخ الإصدار غير صالح / Invalid issue date'
        }),
    notes: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 2000 حرف / Notes must not exceed 2000 characters'
        }),
    vatRate: Joi.number()
        .min(0)
        .max(100)
        .messages({
            'number.base': 'معدل الضريبة يجب أن يكون رقماً / VAT rate must be a number',
            'number.min': 'معدل الضريبة يجب أن يكون صفراً أو أكثر / VAT rate must be 0 or more',
            'number.max': 'معدل الضريبة يجب أن يكون 100 أو أقل / VAT rate must be 100 or less'
        }),
    status: Joi.string()
        .valid('draft', 'pending_approval', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'cancelled')
        .messages({
            'any.only': 'حالة الفاتورة غير صالحة / Invalid invoice status'
        }),
    caseId: Joi.string()
        .hex()
        .length(24)
        .allow(null, '')
        .messages({
            'string.hex': 'معرف القضية غير صالح / Invalid case ID format',
            'string.length': 'معرف القضية غير صالح / Invalid case ID format'
        }),
    paymentTerms: Joi.string()
        .valid('due_on_receipt', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90')
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
    discountValue: Joi.number()
        .min(0)
        .messages({
            'number.base': 'قيمة الخصم يجب أن تكون رقماً / Discount value must be a number',
            'number.min': 'قيمة الخصم يجب أن تكون صفراً أو أكثر / Discount value must be 0 or more'
        }),
    discountType: Joi.string()
        .valid('percentage', 'fixed')
        .messages({
            'any.only': 'نوع الخصم غير صالح / Invalid discount type'
        })
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Add line item validation schema
 */
const addLineItemSchema = invoiceItemSchema;

/**
 * Send invoice validation schema
 */
const sendInvoiceSchema = Joi.object({
    email: Joi.string()
        .email()
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email format'
        }),
    message: Joi.string()
        .max(2000)
        .allow('', null)
        .messages({
            'string.max': 'الرسالة يجب ألا تتجاوز 2000 حرف / Message must not exceed 2000 characters'
        }),
    subject: Joi.string()
        .max(200)
        .messages({
            'string.max': 'عنوان البريد يجب ألا يتجاوز 200 حرف / Subject must not exceed 200 characters'
        }),
    ccRecipients: Joi.array()
        .items(Joi.string().email().messages({
            'string.email': 'أحد عناوين البريد الإلكتروني للنسخة غير صالح / Invalid CC email address'
        }))
        .messages({
            'array.base': 'مستلمو النسخة يجب أن يكونوا مصفوفة / CC recipients must be an array'
        })
});

/**
 * Record payment validation schema
 */
const recordPaymentSchema = Joi.object({
    amount: Joi.number()
        .positive()
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً / Amount must be a number',
            'number.positive': 'المبلغ يجب أن يكون رقماً موجباً / Amount must be a positive number'
        }),
    method: Joi.string()
        .valid('cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'online', 'retainer', 'mada', 'stc_pay', 'apple_pay')
        .messages({
            'any.only': 'طريقة الدفع غير صالحة / Invalid payment method'
        }),
    reference: Joi.string()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'المرجع يجب ألا يتجاوز 100 حرف / Reference must not exceed 100 characters'
        }),
    transactionId: Joi.string()
        .max(100)
        .messages({
            'string.max': 'معرف المعاملة يجب ألا يتجاوز 100 حرف / Transaction ID must not exceed 100 characters'
        }),
    paymentDate: Joi.date()
        .iso()
        .default(() => new Date())
        .messages({
            'date.base': 'تاريخ الدفع غير صالح / Invalid payment date'
        }),
    notes: Joi.string()
        .max(500)
        .allow('', null)
        .messages({
            'string.max': 'الملاحظات يجب ألا تتجاوز 500 حرف / Notes must not exceed 500 characters'
        }),
    bankAccountId: Joi.string()
        .hex()
        .length(24)
        .messages({
            'string.hex': 'معرف الحساب البنكي غير صالح / Invalid bank account ID format',
            'string.length': 'معرف الحساب البنكي غير صالح / Invalid bank account ID format'
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
        createInvoice: createInvoiceSchema,
        updateInvoice: updateInvoiceSchema,
        addLineItem: addLineItemSchema,
        sendInvoice: sendInvoiceSchema,
        recordPayment: recordPaymentSchema,
        invoiceItem: invoiceItemSchema
    },

    // Middleware (for route use)
    validateCreateInvoice: validate(createInvoiceSchema),
    validateUpdateInvoice: validate(updateInvoiceSchema),
    validateAddLineItem: validate(addLineItemSchema),
    validateSendInvoice: validate(sendInvoiceSchema),
    validateRecordPayment: validate(recordPaymentSchema),

    // Generic validate function
    validate,

    // Constants
    SAUDI_VAT_RATE
};
