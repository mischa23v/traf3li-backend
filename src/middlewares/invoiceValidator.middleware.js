/**
 * Invoice Validation Middleware
 *
 * Provides comprehensive validation for invoice-related API requests
 * using Joi validation library with Arabic error messages
 */

const Joi = require('joi');

// ============ LINE ITEM SCHEMA ============
const lineItemSchema = Joi.object({
    type: Joi.string()
        .valid('time', 'expense', 'flat_fee', 'product', 'discount', 'subtotal', 'comment')
        .default('time'),
    date: Joi.date().iso(),
    description: Joi.string().required().max(1000).messages({
        'string.empty': 'وصف البند مطلوب',
        'any.required': 'وصف البند مطلوب',
        'string.max': 'وصف البند يجب ألا يتجاوز 1000 حرف'
    }),
    quantity: Joi.number().min(0).default(1).messages({
        'number.min': 'الكمية يجب أن تكون صفر أو أكثر'
    }),
    unitPrice: Joi.number().min(0).default(0).messages({
        'number.min': 'سعر الوحدة يجب أن يكون صفر أو أكثر'
    }),
    discountType: Joi.string().valid('percentage', 'fixed'),
    discountValue: Joi.number().min(0).messages({
        'number.min': 'قيمة الخصم يجب أن تكون صفر أو أكثر'
    }),
    lineTotal: Joi.number(),
    taxable: Joi.boolean().default(true),
    attorneyId: Joi.string().hex().length(24),
    activityCode: Joi.string().valid('L110', 'L120', 'L130', 'L140', 'L210', 'L220', 'L230', 'L240'),
    timeEntryId: Joi.string().hex().length(24),
    expenseId: Joi.string().hex().length(24)
});

// ============ INSTALLMENT SCHEMA ============
const installmentSchema = Joi.object({
    dueDate: Joi.date().iso().required().messages({
        'any.required': 'تاريخ استحقاق القسط مطلوب'
    }),
    amount: Joi.number().positive().required().messages({
        'any.required': 'مبلغ القسط مطلوب',
        'number.positive': 'مبلغ القسط يجب أن يكون موجب'
    }),
    status: Joi.string().valid('pending', 'paid', 'overdue').default('pending')
});

// ============ ZATCA ADDRESS SCHEMA ============
const zatcaAddressSchema = Joi.object({
    street: Joi.string().max(200),
    buildingNumber: Joi.string().max(20),
    city: Joi.string().max(100),
    postalCode: Joi.string().max(10),
    province: Joi.string().max(100),
    country: Joi.string().default('SA').length(2)
});

// ============ MAIN INVOICE SCHEMA ============
const invoiceSchema = Joi.object({
    // Header
    invoiceNumber: Joi.string(),
    status: Joi.string().valid('draft', 'pending_approval', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'void', 'written_off', 'cancelled'),

    // Client & Case
    clientId: Joi.string().hex().length(24).required().messages({
        'any.required': 'معرف العميل مطلوب',
        'string.hex': 'معرف العميل غير صالح',
        'string.length': 'معرف العميل غير صالح'
    }),
    clientType: Joi.string().valid('individual', 'corporate', 'government').default('individual'),
    caseId: Joi.string().hex().length(24).allow(null, ''),
    contractId: Joi.string().hex().length(24).allow(null, ''),

    // Dates
    issueDate: Joi.date().iso().default(() => new Date()),
    dueDate: Joi.date().iso().required().messages({
        'any.required': 'تاريخ الاستحقاق مطلوب'
    }),
    paymentTerms: Joi.string()
        .valid('due_on_receipt', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'net_90', 'eom', 'custom')
        .default('net_30'),
    currency: Joi.string().default('SAR'),

    // Organization
    firmSize: Joi.string().valid('solo', 'small', 'medium', 'large'),
    departmentId: Joi.string().valid('commercial', 'criminal', 'corporate', 'real_estate', 'labor', 'family'),
    locationId: Joi.string().valid('riyadh', 'jeddah', 'dammam', 'makkah', 'madinah'),
    responsibleAttorneyId: Joi.string().hex().length(24),
    billingArrangement: Joi.string().valid('hourly', 'flat_fee', 'contingency', 'blended', 'monthly_retainer', 'percentage'),
    customerPONumber: Joi.string().max(50),
    matterNumber: Joi.string().max(50),

    // Line Items
    items: Joi.array().items(lineItemSchema).min(1).required().messages({
        'array.min': 'الفاتورة يجب أن تحتوي على عنصر واحد على الأقل',
        'any.required': 'عناصر الفاتورة مطلوبة'
    }),

    // Totals (calculated on backend, but can be passed)
    subtotal: Joi.number(),
    discountType: Joi.string().valid('percentage', 'fixed').default('percentage'),
    discountValue: Joi.number().min(0).default(0).messages({
        'number.min': 'قيمة الخصم يجب أن تكون صفر أو أكثر'
    }),
    discountAmount: Joi.number(),
    vatRate: Joi.number().min(0).max(100).default(15).messages({
        'number.min': 'معدل الضريبة يجب أن يكون صفر أو أكثر',
        'number.max': 'معدل الضريبة يجب أن يكون 100 أو أقل'
    }),
    vatAmount: Joi.number(),
    totalAmount: Joi.number(),
    depositAmount: Joi.number().min(0).default(0),

    // Notes
    notes: Joi.string().max(500),
    customerNotes: Joi.string().max(2000),
    internalNotes: Joi.string().max(2000),
    termsAndConditions: Joi.string().max(5000),
    termsTemplate: Joi.string().valid('standard', 'corporate', 'government', 'custom'),

    // ZATCA
    zatca: Joi.object({
        invoiceType: Joi.string().valid('388', '386', '383', '381'),
        invoiceSubtype: Joi.string().valid('0100000', '0200000'),
        sellerVATNumber: Joi.string().pattern(/^[0-9]{15}$/).messages({
            'string.pattern.base': 'الرقم الضريبي للبائع يجب أن يكون 15 رقم'
        }),
        sellerCR: Joi.string().max(20),
        sellerAddress: zatcaAddressSchema,
        buyerVATNumber: Joi.string().pattern(/^[0-9]{15}$/).allow('', null).messages({
            'string.pattern.base': 'الرقم الضريبي للمشتري يجب أن يكون 15 رقم'
        }),
        buyerCR: Joi.string().max(20),
        buyerAddress: zatcaAddressSchema
    }),

    // Retainer
    applyFromRetainer: Joi.number().min(0).default(0),

    // Payment Plan
    paymentPlan: Joi.object({
        enabled: Joi.boolean().default(false),
        installments: Joi.number().valid(2, 3, 4, 6, 12),
        frequency: Joi.string().valid('weekly', 'biweekly', 'monthly'),
        schedule: Joi.array().items(installmentSchema)
    }),

    // Payment Settings
    bankAccountId: Joi.string().hex().length(24),
    paymentInstructions: Joi.string().max(1000),
    enableOnlinePayment: Joi.boolean().default(false),

    // Late Fees
    lateFees: Joi.object({
        enabled: Joi.boolean().default(false),
        type: Joi.string().valid('daily_percentage', 'monthly_percentage', 'fixed'),
        rate: Joi.number().min(0),
        gracePeriod: Joi.number().min(0).default(0)
    }),

    // Approval
    approval: Joi.object({
        required: Joi.boolean().default(false),
        chain: Joi.array().items(Joi.object({
            approverId: Joi.string().hex().length(24).required(),
            notes: Joi.string().max(500)
        }))
    }),

    // Email
    email: Joi.object({
        template: Joi.string().valid('standard', 'reminder', 'final_notice', 'thank_you'),
        subject: Joi.string().max(200),
        body: Joi.string().max(5000),
        ccRecipients: Joi.array().items(Joi.string().email()),
        autoSendOnApproval: Joi.boolean().default(false)
    }),

    // Attachments
    attachments: Joi.array().items(Joi.object({
        filename: Joi.string().required(),
        url: Joi.string().required(),
        type: Joi.string(),
        size: Joi.number()
    })),

    // WIP & Budget
    wip: Joi.object({
        wipAmount: Joi.number().min(0),
        writeOffAmount: Joi.number().min(0),
        writeDownAmount: Joi.number().min(0),
        adjustmentReason: Joi.string().valid('client_relationship', 'collection_risk', 'quality_issue', 'competitive_pricing', 'pro_bono')
    }),

    budget: Joi.object({
        projectBudget: Joi.number().min(0),
        budgetConsumed: Joi.number().min(0),
        percentComplete: Joi.number().min(0).max(100)
    })
});

// ============ UPDATE INVOICE SCHEMA ============
const updateInvoiceSchema = invoiceSchema.keys({
    clientId: Joi.string().hex().length(24),  // Not required on update
    dueDate: Joi.date().iso(),  // Not required on update
    items: Joi.array().items(lineItemSchema).min(1)  // Not required on update
}).fork(['clientId', 'dueDate', 'items'], (schema) => schema.optional());

// ============ PAYMENT SCHEMA ============
const paymentSchema = Joi.object({
    amount: Joi.number().positive().required().messages({
        'any.required': 'مبلغ الدفعة مطلوب',
        'number.positive': 'مبلغ الدفعة يجب أن يكون موجب'
    }),
    paymentMethod: Joi.string()
        .valid('cash', 'bank_transfer', 'credit_card', 'debit_card', 'check', 'online', 'retainer')
        .required()
        .messages({
            'any.required': 'طريقة الدفع مطلوبة'
        }),
    reference: Joi.string().max(100),
    transactionId: Joi.string().max(100),
    paymentDate: Joi.date().iso(),
    notes: Joi.string().max(500),
    bankAccountId: Joi.string().hex().length(24)
});

// ============ VOID INVOICE SCHEMA ============
const voidInvoiceSchema = Joi.object({
    reason: Joi.string().required().max(500).messages({
        'any.required': 'سبب الإلغاء مطلوب',
        'string.max': 'سبب الإلغاء يجب ألا يتجاوز 500 حرف'
    })
});

// ============ APPROVAL SCHEMA ============
const approvalSchema = Joi.object({
    notes: Joi.string().max(500)
});

// ============ REJECTION SCHEMA ============
const rejectionSchema = Joi.object({
    reason: Joi.string().required().max(500).messages({
        'any.required': 'سبب الرفض مطلوب',
        'string.max': 'سبب الرفض يجب ألا يتجاوز 500 حرف'
    })
});

// ============ SEND REMINDER SCHEMA ============
const reminderSchema = Joi.object({
    template: Joi.string().valid('standard', 'reminder', 'final_notice').default('reminder'),
    customMessage: Joi.string().max(2000),
    ccRecipients: Joi.array().items(Joi.string().email())
});

// ============ RETAINER APPLICATION SCHEMA ============
const retainerApplicationSchema = Joi.object({
    amount: Joi.number().positive().required().messages({
        'any.required': 'مبلغ العربون مطلوب',
        'number.positive': 'مبلغ العربون يجب أن يكون موجب'
    }),
    retainerId: Joi.string().hex().length(24).required().messages({
        'any.required': 'معرف العربون مطلوب'
    })
});

// ============ VALIDATION MIDDLEWARE FUNCTIONS ============

/**
 * Validate create invoice request
 */
const validateInvoice = (req, res, next) => {
    const { error, value } = invoiceSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
        }));
        return res.status(400).json({
            success: false,
            message: 'خطأ في البيانات المدخلة',
            message_en: 'Validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate update invoice request
 */
const validateUpdateInvoice = (req, res, next) => {
    const { error, value } = updateInvoiceSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
        }));
        return res.status(400).json({
            success: false,
            message: 'خطأ في البيانات المدخلة',
            message_en: 'Validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate payment request
 */
const validatePayment = (req, res, next) => {
    const { error, value } = paymentSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
        }));
        return res.status(400).json({
            success: false,
            message: 'خطأ في بيانات الدفعة',
            message_en: 'Payment validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate void invoice request
 */
const validateVoid = (req, res, next) => {
    const { error, value } = voidInvoiceSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
        }));
        return res.status(400).json({
            success: false,
            message: 'خطأ في بيانات الإلغاء',
            message_en: 'Void validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate approval request
 */
const validateApproval = (req, res, next) => {
    const { error, value } = approvalSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
        }));
        return res.status(400).json({
            success: false,
            message: 'خطأ في بيانات الموافقة',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate rejection request
 */
const validateRejection = (req, res, next) => {
    const { error, value } = rejectionSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
        }));
        return res.status(400).json({
            success: false,
            message: 'خطأ في بيانات الرفض',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate send reminder request
 */
const validateReminder = (req, res, next) => {
    const { error, value } = reminderSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
        }));
        return res.status(400).json({
            success: false,
            message: 'خطأ في بيانات التذكير',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Validate retainer application request
 */
const validateRetainerApplication = (req, res, next) => {
    const { error, value } = retainerApplicationSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
        }));
        return res.status(400).json({
            success: false,
            message: 'خطأ في بيانات العربون',
            errors
        });
    }

    req.body = value;
    next();
};

module.exports = {
    validateInvoice,
    validateUpdateInvoice,
    validatePayment,
    validateVoid,
    validateApproval,
    validateRejection,
    validateReminder,
    validateRetainerApplication,
    // Export schemas for testing
    invoiceSchema,
    paymentSchema,
    voidInvoiceSchema
};
