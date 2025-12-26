/**
 * Dunning Routes
 *
 * Routes for managing dunning policies, history, and reporting
 * Handles automated collection workflows for overdue invoices
 *
 * Base route: /api/dunning
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares');
const { firmAdminOnly, financeAccessOnly } = require('../middlewares/firmFilter.middleware');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { checkPermission } = require('../middlewares/authorize.middleware');
const Joi = require('joi');

// Import dunning controller
const {
    // Policy CRUD
    listPolicies: getDunningPolicies,
    getPolicy: getDunningPolicy,
    createPolicy: createDunningPolicy,
    updatePolicy: updateDunningPolicy,
    deletePolicy: deleteDunningPolicy,
    setDefaultPolicy: setAsDefault,

    // History Management
    listHistory: getDunningHistory,
    getInvoiceHistory: getInvoiceDunningHistory,
    pauseDunning,
    resumeDunning,
    advanceStage: escalateDunning,

    // Dashboard & Reports
    getDashboard: getDunningDashboard,
    getReport: getDunningReport
} = require('../controllers/dunning.controller');

// ═══════════════════════════════════════════════════════════════
// VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Dunning stage schema for validation
 */
const dunningStageSchema = Joi.object({
    order: Joi.number()
        .integer()
        .min(1)
        .required()
        .messages({
            'number.base': 'الترتيب يجب أن يكون رقماً / Order must be a number',
            'number.min': 'الترتيب يجب أن يكون 1 أو أكثر / Order must be 1 or greater',
            'any.required': 'الترتيب مطلوب / Order is required'
        }),
    daysOverdue: Joi.number()
        .valid(7, 14, 30, 60, 90)
        .required()
        .messages({
            'any.only': 'أيام التأخير يجب أن تكون 7، 14، 30، 60، أو 90 / Days overdue must be 7, 14, 30, 60, or 90',
            'any.required': 'أيام التأخير مطلوبة / Days overdue is required'
        }),
    action: Joi.string()
        .valid('email', 'sms', 'call', 'collection_agency')
        .required()
        .messages({
            'any.only': 'الإجراء غير صالح / Invalid action type',
            'any.required': 'الإجراء مطلوب / Action is required'
        }),
    template: Joi.string()
        .trim()
        .max(100)
        .allow('', null)
        .messages({
            'string.max': 'اسم القالب يجب ألا يتجاوز 100 حرف / Template name must not exceed 100 characters'
        }),
    addLateFee: Joi.boolean()
        .default(false)
        .messages({
            'boolean.base': 'إضافة رسوم تأخير يجب أن تكون قيمة منطقية / Add late fee must be a boolean'
        }),
    lateFeeAmount: Joi.number()
        .min(0)
        .default(0)
        .messages({
            'number.base': 'مبلغ رسوم التأخير يجب أن يكون رقماً / Late fee amount must be a number',
            'number.min': 'مبلغ رسوم التأخير يجب أن يكون صفراً أو أكثر / Late fee amount must be 0 or greater'
        }),
    lateFeeType: Joi.string()
        .valid('fixed', 'percentage')
        .default('fixed')
        .messages({
            'any.only': 'نوع رسوم التأخير غير صالح / Invalid late fee type'
        }),
    escalateTo: Joi.string()
        .hex()
        .length(24)
        .allow(null, '')
        .messages({
            'string.hex': 'معرف المستخدم للتصعيد غير صالح / Invalid escalate user ID format',
            'string.length': 'معرف المستخدم للتصعيد غير صالح / Invalid escalate user ID format'
        })
});

/**
 * Create dunning policy validation
 */
const validateCreatePolicy = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string()
            .trim()
            .min(1)
            .max(200)
            .required()
            .messages({
                'string.empty': 'اسم السياسة مطلوب / Policy name is required',
                'string.max': 'اسم السياسة يجب ألا يتجاوز 200 حرف / Policy name must not exceed 200 characters',
                'any.required': 'اسم السياسة مطلوب / Policy name is required'
            }),
        stages: Joi.array()
            .items(dunningStageSchema)
            .min(1)
            .messages({
                'array.base': 'المراحل يجب أن تكون مصفوفة / Stages must be an array',
                'array.min': 'يجب إضافة مرحلة واحدة على الأقل / At least one stage is required'
            }),
        pauseConditions: Joi.array()
            .items(Joi.string().valid('dispute_open', 'payment_plan_active'))
            .default([])
            .messages({
                'array.base': 'شروط الإيقاف يجب أن تكون مصفوفة / Pause conditions must be an array'
            }),
        isDefault: Joi.boolean()
            .default(false)
            .messages({
                'boolean.base': 'قيمة افتراضي يجب أن تكون قيمة منطقية / Is default must be a boolean'
            }),
        isActive: Joi.boolean()
            .default(true)
            .messages({
                'boolean.base': 'حالة التفعيل يجب أن تكون قيمة منطقية / Is active must be a boolean'
            })
    });

    const { error, value } = schema.validate(req.body, {
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
            message: 'خطأ في التحقق / Validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Update dunning policy validation
 */
const validateUpdatePolicy = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string()
            .trim()
            .min(1)
            .max(200)
            .messages({
                'string.empty': 'اسم السياسة مطلوب / Policy name is required',
                'string.max': 'اسم السياسة يجب ألا يتجاوز 200 حرف / Policy name must not exceed 200 characters'
            }),
        stages: Joi.array()
            .items(dunningStageSchema)
            .min(1)
            .messages({
                'array.base': 'المراحل يجب أن تكون مصفوفة / Stages must be an array',
                'array.min': 'يجب إضافة مرحلة واحدة على الأقل / At least one stage is required'
            }),
        pauseConditions: Joi.array()
            .items(Joi.string().valid('dispute_open', 'payment_plan_active'))
            .messages({
                'array.base': 'شروط الإيقاف يجب أن تكون مصفوفة / Pause conditions must be an array'
            }),
        isActive: Joi.boolean()
            .messages({
                'boolean.base': 'حالة التفعيل يجب أن تكون قيمة منطقية / Is active must be a boolean'
            })
    }).min(1).messages({
        'object.min': 'يجب تقديم حقل واحد على الأقل للتحديث / At least one field must be provided for update'
    });

    const { error, value } = schema.validate(req.body, {
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
            message: 'خطأ في التحقق / Validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Apply policy to invoice validation
 */
const validateApplyPolicy = (req, res, next) => {
    const schema = Joi.object({
        invoiceId: Joi.string()
            .hex()
            .length(24)
            .required()
            .messages({
                'string.hex': 'معرف الفاتورة غير صالح / Invalid invoice ID format',
                'string.length': 'معرف الفاتورة غير صالح / Invalid invoice ID format',
                'any.required': 'معرف الفاتورة مطلوب / Invoice ID is required'
            })
    });

    const { error, value } = schema.validate(req.body, {
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
            message: 'خطأ في التحقق / Validation error',
            errors
        });
    }

    req.body = value;
    next();
};

/**
 * Create dunning action validation
 */
const validateCreateAction = (req, res, next) => {
    const schema = Joi.object({
        invoiceId: Joi.string()
            .hex()
            .length(24)
            .required()
            .messages({
                'string.hex': 'معرف الفاتورة غير صالح / Invalid invoice ID format',
                'string.length': 'معرف الفاتورة غير صالح / Invalid invoice ID format',
                'any.required': 'معرف الفاتورة مطلوب / Invoice ID is required'
            }),
        action: Joi.string()
            .valid('email', 'sms', 'call', 'collection_agency', 'pause', 'resume')
            .required()
            .messages({
                'any.only': 'نوع الإجراء غير صالح / Invalid action type',
                'any.required': 'نوع الإجراء مطلوب / Action is required'
            }),
        notes: Joi.string()
            .max(1000)
            .allow('', null)
            .messages({
                'string.max': 'الملاحظات يجب ألا تتجاوز 1000 حرف / Notes must not exceed 1000 characters'
            }),
        scheduledDate: Joi.date()
            .iso()
            .allow(null)
            .messages({
                'date.base': 'تاريخ الجدولة غير صالح / Invalid scheduled date'
            })
    });

    const { error, value } = schema.validate(req.body, {
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
            message: 'خطأ في التحقق / Validation error',
            errors
        });
    }

    req.body = value;
    next();
};

// ═══════════════════════════════════════════════════════════════
// ALL ROUTES REQUIRE AUTHENTICATION
// ═══════════════════════════════════════════════════════════════
router.use(userMiddleware);

// ═══════════════════════════════════════════════════════════════
// DASHBOARD & REPORTS (must be before parameterized routes)
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/dunning/dashboard
 * @desc    Get dunning dashboard with overview stats
 * @access  Private - Finance access
 */
router.get('/dashboard',
    financeAccessOnly,
    getDunningDashboard
);

// TODO: Implement getDunningStats in controller
// /**
//  * @route   GET /api/dunning/stats
//  * @desc    Get dunning statistics
//  * @access  Private - Finance access
//  */
// router.get('/stats',
//     financeAccessOnly,
//     getDunningStats
// );

/**
 * @route   GET /api/dunning/report
 * @desc    Get detailed dunning report
 * @access  Private - Finance access
 */
router.get('/report',
    financeAccessOnly,
    getDunningReport
);

// TODO: Implement exportDunningReport in controller
// /**
//  * @route   GET /api/dunning/report/export
//  * @desc    Export dunning report (CSV/Excel)
//  * @access  Private - Finance access
//  */
// router.get('/report/export',
//     financeAccessOnly,
//     exportDunningReport
// );

// TODO: Implement getOverdueInvoicesList in controller
// /**
//  * @route   GET /api/dunning/overdue-invoices
//  * @desc    Get list of overdue invoices for dunning
//  * @access  Private - Finance access
//  */
// router.get('/overdue-invoices',
//     financeAccessOnly,
//     getOverdueInvoicesList
// );

// TODO: Implement getUpcomingActions in controller
// /**
//  * @route   GET /api/dunning/upcoming-actions
//  * @desc    Get upcoming scheduled dunning actions
//  * @access  Private - Finance access
//  */
// router.get('/upcoming-actions',
//     financeAccessOnly,
//     getUpcomingActions
// );

// TODO: Implement getPausedInvoices in controller
// /**
//  * @route   GET /api/dunning/paused-invoices
//  * @desc    Get invoices with paused dunning
//  * @access  Private - Finance access
//  */
// router.get('/paused-invoices',
//     financeAccessOnly,
//     getPausedInvoices
// );

// ═══════════════════════════════════════════════════════════════
// POLICY ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/dunning/policies
 * @desc    Get all dunning policies
 * @access  Private - Finance access
 */
router.get('/policies',
    financeAccessOnly,
    getDunningPolicies
);

// TODO: Implement getDefaultPolicy in controller
// /**
//  * @route   GET /api/dunning/policies/default
//  * @desc    Get default dunning policy
//  * @access  Private - Finance access
//  */
// router.get('/policies/default',
//     financeAccessOnly,
//     getDefaultPolicy
// );

/**
 * @route   POST /api/dunning/policies
 * @desc    Create new dunning policy
 * @access  Private - Admin only
 */
router.post('/policies',
    firmAdminOnly,
    validateCreatePolicy,
    auditAction('create_dunning_policy', 'dunning', { severity: 'medium' }),
    createDunningPolicy
);

/**
 * @route   GET /api/dunning/policies/:id
 * @desc    Get single dunning policy
 * @access  Private - Finance access
 */
router.get('/policies/:id',
    financeAccessOnly,
    getDunningPolicy
);

/**
 * @route   PUT /api/dunning/policies/:id
 * @desc    Update dunning policy
 * @access  Private - Admin only
 */
router.put('/policies/:id',
    firmAdminOnly,
    validateUpdatePolicy,
    auditAction('update_dunning_policy', 'dunning', { captureChanges: true }),
    updateDunningPolicy
);

/**
 * @route   DELETE /api/dunning/policies/:id
 * @desc    Delete dunning policy
 * @access  Private - Admin only
 */
router.delete('/policies/:id',
    firmAdminOnly,
    auditAction('delete_dunning_policy', 'dunning', { severity: 'high' }),
    deleteDunningPolicy
);

/**
 * @route   POST /api/dunning/policies/:id/set-default
 * @desc    Set policy as default
 * @access  Private - Admin only
 */
router.post('/policies/:id/set-default',
    firmAdminOnly,
    auditAction('set_default_dunning_policy', 'dunning', { severity: 'medium' }),
    setAsDefault
);

// TODO: Implement togglePolicyStatus in controller
// /**
//  * @route   POST /api/dunning/policies/:id/toggle-status
//  * @desc    Toggle policy active/inactive status
//  * @access  Private - Admin only
//  */
// router.post('/policies/:id/toggle-status',
//     firmAdminOnly,
//     auditAction('toggle_dunning_policy_status', 'dunning'),
//     togglePolicyStatus
// );

// TODO: Implement duplicatePolicy in controller
// /**
//  * @route   POST /api/dunning/policies/:id/duplicate
//  * @desc    Duplicate an existing policy
//  * @access  Private - Admin only
//  */
// router.post('/policies/:id/duplicate',
//     firmAdminOnly,
//     auditAction('duplicate_dunning_policy', 'dunning'),
//     duplicatePolicy
// );

// TODO: Implement testPolicy in controller
// /**
//  * @route   POST /api/dunning/policies/:id/test
//  * @desc    Test policy against sample data
//  * @access  Private - Finance access
//  */
// router.post('/policies/:id/test',
//     financeAccessOnly,
//     testPolicy
// );

// TODO: Implement applyPolicyToInvoice in controller
// /**
//  * @route   POST /api/dunning/policies/:id/apply
//  * @desc    Manually apply policy to specific invoice
//  * @access  Private - Finance access
//  */
// router.post('/policies/:id/apply',
//     financeAccessOnly,
//     validateApplyPolicy,
//     auditAction('apply_dunning_policy', 'dunning', { severity: 'medium' }),
//     applyPolicyToInvoice
// );

// ═══════════════════════════════════════════════════════════════
// HISTORY ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/dunning/history
 * @desc    Get dunning history for all invoices
 * @access  Private - Finance access
 */
router.get('/history',
    financeAccessOnly,
    getDunningHistory
);

/**
 * @route   GET /api/dunning/history/invoice/:invoiceId
 * @desc    Get dunning history for specific invoice
 * @access  Private - Finance access
 */
router.get('/history/invoice/:invoiceId',
    financeAccessOnly,
    getInvoiceDunningHistory
);

// TODO: Implement createDunningAction in controller
// /**
//  * @route   POST /api/dunning/history
//  * @desc    Create manual dunning action
//  * @access  Private - Finance access
//  */
// router.post('/history',
//     financeAccessOnly,
//     validateCreateAction,
//     auditAction('create_dunning_action', 'dunning', { severity: 'medium' }),
//     createDunningAction
// );

/**
 * @route   POST /api/dunning/history/:invoiceId/pause
 * @desc    Pause dunning for specific invoice
 * @access  Private - Finance access
 */
router.post('/history/:invoiceId/pause',
    financeAccessOnly,
    auditAction('pause_dunning', 'dunning'),
    pauseDunning
);

/**
 * @route   POST /api/dunning/history/:invoiceId/resume
 * @desc    Resume dunning for specific invoice
 * @access  Private - Finance access
 */
router.post('/history/:invoiceId/resume',
    financeAccessOnly,
    auditAction('resume_dunning', 'dunning'),
    resumeDunning
);

/**
 * @route   POST /api/dunning/history/:invoiceId/escalate
 * @desc    Escalate dunning for specific invoice
 * @access  Private - Admin only
 */
router.post('/history/:invoiceId/escalate',
    firmAdminOnly,
    auditAction('escalate_dunning', 'dunning', { severity: 'high' }),
    escalateDunning
);

module.exports = router;
