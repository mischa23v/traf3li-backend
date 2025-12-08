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
        .required()
        .messages({
            'any.required': 'معرف العميل مطلوب / Client ID is required',
            'string.empty': 'معرف العميل لا يمكن أن يكون فارغاً / Client ID cannot be empty'
        }),

    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'المبلغ يجب أن يكون رقماً / Amount must be a number',
            'number.positive': 'المبلغ يجب أن يكون موجباً / Amount must be positive',
            'any.required': 'المبلغ مطلوب / Amount is required'
        }),

    method: Joi.string()
        .valid(...paymentMethods)
        .required()
        .messages({
            'any.only': 'طريقة الدفع غير صالحة / Invalid payment method',
            'any.required': 'طريقة الدفع مطلوبة / Payment method is required'
        }),

    status: Joi.string()
        .valid(...paymentStatuses)
        .default('pending'),

    reference: Joi.string()
        .max(100)
        .messages({
            'string.max': 'رقم المرجع طويل جداً / Reference number is too long'
        }),

    date: Joi.date()
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
        .when('method', {
            is: 'check',
            then: Joi.required(),
            otherwise: Joi.optional()
        })
        .messages({
            'any.required': 'رقم الشيك مطلوب عند الدفع بالشيك / Check number is required for check payments'
        }),

    checkDate: Joi.date()
        .when('method', {
            is: 'check',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),

    bankName: Joi.string()
        .max(100),

    // Invoice application
    invoices: Joi.array()
        .items(Joi.object({
            invoiceId: Joi.string().required(),
            amount: Joi.number().positive().required()
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

    method: Joi.string()
        .valid(...paymentMethods),

    status: Joi.string()
        .valid(...paymentStatuses),

    reference: Joi.string().max(100),
    date: Joi.date().max('now'),
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
            invoiceId: Joi.string().required(),
            amount: Joi.number().positive().required()
        }))
        .min(1)
        .required()
        .messages({
            'array.min': 'يجب تطبيق الدفع على فاتورة واحدة على الأقل / Must apply payment to at least one invoice',
            'any.required': 'قائمة الفواتير مطلوبة / Invoices list is required'
        })
});

/**
 * Create refund validation schema
 */
const createRefundSchema = Joi.object({
    amount: Joi.number()
        .positive()
        .required()
        .messages({
            'number.positive': 'مبلغ الاسترداد يجب أن يكون موجباً / Refund amount must be positive',
            'any.required': 'مبلغ الاسترداد مطلوب / Refund amount is required'
        }),

    reason: Joi.string()
        .required()
        .max(500)
        .messages({
            'any.required': 'سبب الاسترداد مطلوب / Refund reason is required',
            'string.max': 'السبب طويل جداً / Reason is too long'
        }),

    method: Joi.string()
        .valid(...paymentMethods),

    date: Joi.date()
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
        .required()
        .messages({
            'any.only': 'حالة الشيك غير صالحة / Invalid check status',
            'any.required': 'حالة الشيك مطلوبة / Check status is required'
        }),

    statusDate: Joi.date()
        .max('now')
        .default(() => new Date()),

    notes: Joi.string()
        .max(1000),

    bounceReason: Joi.string()
        .when('status', {
            is: 'bounced',
            then: Joi.required(),
            otherwise: Joi.optional()
        })
        .messages({
            'any.required': 'سبب ارتداد الشيك مطلوب / Bounce reason is required for bounced checks'
        })
});

/**
 * Reconcile payment validation schema
 */
const reconcilePaymentSchema = Joi.object({
    bankTransactionId: Joi.string()
        .required()
        .messages({
            'any.required': 'معرف العملية البنكية مطلوب / Bank transaction ID is required'
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
        .min(1)
        .max(100)
        .required()
        .messages({
            'array.min': 'يجب تحديد دفعة واحدة على الأقل / Must select at least one payment',
            'array.max': 'لا يمكن حذف أكثر من 100 دفعة في وقت واحد / Cannot delete more than 100 payments at once',
            'any.required': 'قائمة المعرفات مطلوبة / IDs list is required'
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
        bulkDelete: bulkDeleteSchema
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

    // Generic validate function
    validate
};
