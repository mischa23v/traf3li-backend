/**
 * Payment Route Validation Schemas
 *
 * Uses Joi for request validation on payment endpoints.
 * Provides both validation schemas and middleware functions.
 */

const Joi = require('joi');

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Payment method enum
 */
const paymentMethods = [
    'cash',
    'check',
    'credit_card',
    'debit_card',
    'bank_transfer',
    'wire_transfer',
    'stripe',
    'paypal',
    'other'
];

/**
 * Payment status enum
 */
const paymentStatuses = [
    'pending',
    'completed',
    'failed',
    'refunded',
    'cancelled',
    'processing'
];

/**
 * Check status enum
 */
const checkStatuses = [
    'received',
    'deposited',
    'cleared',
    'bounced',
    'cancelled'
];

/**
 * Create payment validation schema
 */
const createPaymentSchema = Joi.object({
    clientId: Joi.string()
        .messages({
            'string.empty': 'معرف العميل لا يمكن أن يكون فارغاً / Client ID cannot be empty'
        }),

    amount: Joi.number()
        .positive()
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً / Amount must be a number',
            'number.positive': 'المبلغ يجب أن يكون موجباً / Amount must be positive'
        }),

    paymentMethod: Joi.string()
        .valid(...paymentMethods)
        .messages({
            'any.only': 'طريقة الدفع غير صالحة / Invalid payment method'
        }),

    status: Joi.string()
        .valid(...paymentStatuses)
        .default('pending'),

    referenceNumber: Joi.string()
        .max(100)
        .messages({
            'string.max': 'رقم المرجع طويل جداً / Reference number is too long'
        }),

    paymentDate: Joi.date()
        .max('now')
        .messages({
            'date.max': 'تاريخ الدفع لا يمكن أن يكون في المستقبل / Payment date cannot be in the future'
        }),

    notes: Joi.string()
        .max(1000)
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
        }),

    // Check-specific fields
    checkNumber: Joi.string()
        .messages({
            'string.empty': 'رقم الشيك لا يمكن أن يكون فارغاً / Check number cannot be empty'
        }),

    checkDate: Joi.date(),

    bankName: Joi.string()
        .max(100),

    // Invoice application
    invoices: Joi.array()
        .items(Joi.object({
            invoiceId: Joi.string(),
            amount: Joi.number().positive()
        })),

    // Metadata
    metadata: Joi.object()
});

/**
 * Update payment validation schema
 */
const updatePaymentSchema = Joi.object({
    amount: Joi.number()
        .positive()
        .messages({
            'number.positive': 'المبلغ يجب أن يكون موجباً / Amount must be positive'
        }),

    paymentMethod: Joi.string()
        .valid(...paymentMethods),

    status: Joi.string()
        .valid(...paymentStatuses),

    referenceNumber: Joi.string().max(100),
    paymentDate: Joi.date().max('now'),
    notes: Joi.string().max(1000),
    checkNumber: Joi.string(),
    checkDate: Joi.date(),
    bankName: Joi.string().max(100),
    metadata: Joi.object()
}).min(1).messages({
    'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
});

/**
 * Apply payment to invoices validation schema
 */
const applyPaymentSchema = Joi.object({
    invoices: Joi.array()
        .items(Joi.object({
            invoiceId: Joi.string(),
            amount: Joi.number().positive()
        }))
        .messages({
            'array.base': 'قائمة الفواتير يجب أن تكون مصفوفة / Invoices must be an array'
        })
});

/**
 * Create refund validation schema
 */
const createRefundSchema = Joi.object({
    amount: Joi.number()
        .positive()
        .messages({
            'number.positive': 'مبلغ الاسترداد يجب أن يكون موجباً / Refund amount must be positive'
        }),

    reason: Joi.string()
        .max(500)
        .messages({
            'string.max': 'السبب طويل جداً / Reason is too long'
        }),

    refundMethod: Joi.string()
        .valid(...paymentMethods),

    refundDate: Joi.date()
        .max('now'),

    notes: Joi.string()
        .max(1000)
});

/**
 * Update check status validation schema
 */
const updateCheckStatusSchema = Joi.object({
    status: Joi.string()
        .valid(...checkStatuses)
        .messages({
            'any.only': 'حالة الشيك غير صالحة / Invalid check status'
        }),

    statusDate: Joi.date()
        .max('now')
        .default(() => new Date()),

    notes: Joi.string()
        .max(1000),

    bounceReason: Joi.string()
        .messages({
            'string.empty': 'سبب ارتداد الشيك لا يمكن أن يكون فارغاً / Bounce reason cannot be empty'
        })
});

/**
 * Reconcile payment validation schema
 */
const reconcilePaymentSchema = Joi.object({
    bankTransactionId: Joi.string()
        .messages({
            'string.empty': 'معرف العملية البنكية لا يمكن أن يكون فارغاً / Bank transaction ID cannot be empty'
        }),

    reconciledDate: Joi.date()
        .max('now')
        .default(() => new Date()),

    notes: Joi.string()
        .max(1000)
});

/**
 * Query/filter validation schema
 */
const paymentQuerySchema = Joi.object({
    clientId: Joi.string(),
    method: Joi.string().valid(...paymentMethods),
    status: Joi.string().valid(...paymentStatuses),
    startDate: Joi.date(),
    endDate: Joi.date().min(Joi.ref('startDate')),
    minAmount: Joi.number().positive(),
    maxAmount: Joi.number().positive().min(Joi.ref('minAmount')),
    search: Joi.string(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(50),
    sortBy: Joi.string().valid('date', 'amount', 'createdAt', 'clientName'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * Bulk delete validation schema
 */
const bulkDeleteSchema = Joi.object({
    ids: Joi.array()
        .items(Joi.string())
        .max(100)
        .messages({
            'array.max': 'لا يمكن حذف أكثر من 100 دفعة في وقت واحد / Cannot delete more than 100 payments at once'
        })
});

/**
 * Send receipt schema
 * POST /api/payments/:id/send-receipt
 */
const sendReceiptSchema = Joi.object({
    email: Joi.string()
        .email()
        .optional()
        .messages({
            'string.email': 'البريد الإلكتروني غير صالح / Invalid email address'
        }),
    includeDetails: Joi.boolean()
        .optional()
        .default(true)
});

/**
 * Record invoice payment schema
 * POST /api/invoices/:id/payments
 */
const recordInvoicePaymentSchema = Joi.object({
    amount: Joi.number()
        .positive()
        .messages({
            'number.positive': 'المبلغ يجب أن يكون موجباً / Amount must be positive'
        }),
    paymentMethod: Joi.string()
        .valid(...paymentMethods)
        .optional()
        .messages({
            'any.only': 'طريقة الدفع غير صالحة / Invalid payment method'
        }),
    transactionId: Joi.string()
        .max(100)
        .optional()
        .messages({
            'string.max': 'رقم المعاملة طويل جداً / Transaction ID is too long'
        }),
    notes: Joi.string()
        .max(500)
        .optional()
        .messages({
            'string.max': 'الملاحظات طويلة جداً / Notes are too long'
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

// ============================================
// EXPORT SCHEMAS AND MIDDLEWARE
// ============================================

module.exports = {
    // Schemas (for direct use in tests)
    schemas: {
        createPayment: createPaymentSchema,
        updatePayment: updatePaymentSchema,
        applyPayment: applyPaymentSchema,
        createRefund: createRefundSchema,
        updateCheckStatus: updateCheckStatusSchema,
        reconcilePayment: reconcilePaymentSchema,
        paymentQuery: paymentQuerySchema,
        bulkDelete: bulkDeleteSchema,
        sendReceipt: sendReceiptSchema,
        recordInvoicePayment: recordInvoicePaymentSchema
    },

    // Enums
    enums: {
        paymentMethods,
        paymentStatuses,
        checkStatuses
    },

    // Middleware (for route use)
    validateCreatePayment: validate(createPaymentSchema),
    validateUpdatePayment: validate(updatePaymentSchema),
    validateApplyPayment: validate(applyPaymentSchema),
    validateCreateRefund: validate(createRefundSchema),
    validateUpdateCheckStatus: validate(updateCheckStatusSchema),
    validateReconcilePayment: validate(reconcilePaymentSchema),
    validatePaymentQuery: validate(paymentQuerySchema, 'query'),
    validateBulkDelete: validate(bulkDeleteSchema),
    validateSendReceipt: validate(sendReceiptSchema),
    validateRecordInvoicePayment: validate(recordInvoicePaymentSchema),

    // Generic validate function
    validate
};
