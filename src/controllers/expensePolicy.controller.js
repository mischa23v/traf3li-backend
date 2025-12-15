/**
 * Expense Policy Controller
 *
 * Handles expense policies CRUD and compliance checking
 */

const ExpensePolicy = require('../models/expensePolicy.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Get all expense policies
 */
const getExpensePolicies = asyncHandler(async (req, res) => {
    const { isActive, policyType, applicableTo } = req.query;

    const query = { ...req.firmQuery };
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (policyType) query.policyType = policyType;
    if (applicableTo) query.applicableTo = applicableTo;

    const policies = await ExpensePolicy.find(query)
        .populate('applicableUsers', 'firstName lastName email')
        .sort({ isDefault: -1, name: 1 });

    res.json({
        success: true,
        data: policies
    });
});

/**
 * Get single expense policy
 */
const getExpensePolicy = asyncHandler(async (req, res) => {
    const policy = await ExpensePolicy.findOne({
        _id: req.params.id,
        ...req.firmQuery
    }).populate('applicableUsers', 'firstName lastName email');

    if (!policy) {
        throw CustomException('Expense policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة المصروفات'
        });
    }

    res.json({
        success: true,
        data: policy
    });
});

/**
 * Get default expense policy
 */
const getDefaultPolicy = asyncHandler(async (req, res) => {
    const policy = await ExpensePolicy.findOne({
        ...req.firmQuery,
        isActive: true,
        isDefault: true
    });

    res.json({
        success: true,
        data: policy
    });
});

/**
 * Get applicable policy for current user
 */
const getMyPolicy = asyncHandler(async (req, res) => {
    const User = require('../models/user.model');
    const user = await User.findById(req.userID).select('firmRole department');

    const policy = await ExpensePolicy.getApplicablePolicy(
        req.firmId,
        req.firmId ? null : req.userID,
        req.userID,
        user?.firmRole,
        user?.department
    );

    res.json({
        success: true,
        data: policy
    });
});

/**
 * Create expense policy
 */
const createExpensePolicy = asyncHandler(async (req, res) => {
    const {
        name, nameAr, description, descriptionAr,
        policyType, applicableTo, applicableRoles, applicableDepartments, applicableUsers,
        globalLimits, categoryLimits, receiptPolicy, approvalRules,
        autoApproveBelow, requiresManagerApproval, requiresFinanceApproval, financeApprovalThreshold,
        reimbursement, perDiem, mileage, billableRules, currency,
        auditSettings, violationPolicy,
        effectiveDate, expiryDate
    } = req.body;

    const policy = new ExpensePolicy({
        firmId: req.firmId,
        lawyerId: req.firmId ? null : req.userID,
        name,
        nameAr,
        description,
        descriptionAr,
        policyType,
        applicableTo,
        applicableRoles,
        applicableDepartments,
        applicableUsers,
        globalLimits,
        categoryLimits,
        receiptPolicy,
        approvalRules,
        autoApproveBelow,
        requiresManagerApproval,
        requiresFinanceApproval,
        financeApprovalThreshold,
        reimbursement,
        perDiem,
        mileage,
        billableRules,
        currency,
        auditSettings,
        violationPolicy,
        effectiveDate: effectiveDate || new Date(),
        expiryDate,
        createdBy: req.userID
    });

    await policy.save();

    res.status(201).json({
        success: true,
        data: policy,
        message: 'Expense policy created',
        messageAr: 'تم إنشاء سياسة المصروفات'
    });
});

/**
 * Update expense policy
 */
const updateExpensePolicy = asyncHandler(async (req, res) => {
    const policy = await ExpensePolicy.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!policy) {
        throw CustomException('Expense policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة المصروفات'
        });
    }

    const allowedFields = [
        'name', 'nameAr', 'description', 'descriptionAr',
        'policyType', 'applicableTo', 'applicableRoles', 'applicableDepartments', 'applicableUsers',
        'globalLimits', 'categoryLimits', 'receiptPolicy', 'approvalRules',
        'autoApproveBelow', 'requiresManagerApproval', 'requiresFinanceApproval', 'financeApprovalThreshold',
        'reimbursement', 'perDiem', 'mileage', 'billableRules', 'currency',
        'auditSettings', 'violationPolicy',
        'effectiveDate', 'expiryDate', 'isActive'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            policy[field] = req.body[field];
        }
    });

    policy.updatedBy = req.userID;
    await policy.save();

    res.json({
        success: true,
        data: policy,
        message: 'Expense policy updated',
        messageAr: 'تم تحديث سياسة المصروفات'
    });
});

/**
 * Delete expense policy
 */
const deleteExpensePolicy = asyncHandler(async (req, res) => {
    const policy = await ExpensePolicy.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!policy) {
        throw CustomException('Expense policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة المصروفات'
        });
    }

    if (policy.isDefault) {
        throw CustomException('Cannot delete default policy. Set another as default first.', 400, {
            messageAr: 'لا يمكن حذف السياسة الافتراضية. قم بتعيين سياسة أخرى كافتراضية أولاً.'
        });
    }

    await policy.deleteOne();

    res.json({
        success: true,
        message: 'Expense policy deleted',
        messageAr: 'تم حذف سياسة المصروفات'
    });
});

/**
 * Set as default policy
 */
const setAsDefault = asyncHandler(async (req, res) => {
    const policy = await ExpensePolicy.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!policy) {
        throw CustomException('Expense policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة المصروفات'
        });
    }

    if (!policy.isActive) {
        throw CustomException('Cannot set inactive policy as default', 400, {
            messageAr: 'لا يمكن تعيين سياسة غير نشطة كافتراضية'
        });
    }

    await policy.setAsDefault(req.userID);

    res.json({
        success: true,
        data: policy,
        message: 'Default expense policy updated',
        messageAr: 'تم تحديث سياسة المصروفات الافتراضية'
    });
});

/**
 * Toggle policy active status
 */
const toggleStatus = asyncHandler(async (req, res) => {
    const policy = await ExpensePolicy.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!policy) {
        throw CustomException('Expense policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة المصروفات'
        });
    }

    if (policy.isDefault && policy.isActive) {
        throw CustomException('Cannot deactivate default policy', 400, {
            messageAr: 'لا يمكن إلغاء تفعيل السياسة الافتراضية'
        });
    }

    policy.isActive = !policy.isActive;
    policy.updatedBy = req.userID;
    await policy.save();

    res.json({
        success: true,
        data: policy,
        message: `Policy ${policy.isActive ? 'activated' : 'deactivated'}`,
        messageAr: `تم ${policy.isActive ? 'تفعيل' : 'إلغاء تفعيل'} السياسة`
    });
});

/**
 * Duplicate policy
 */
const duplicatePolicy = asyncHandler(async (req, res) => {
    const source = await ExpensePolicy.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!source) {
        throw CustomException('Expense policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة المصروفات'
        });
    }

    const duplicate = new ExpensePolicy({
        ...source.toObject(),
        _id: undefined,
        name: `${source.name} (Copy)`,
        nameAr: source.nameAr ? `${source.nameAr} (نسخة)` : undefined,
        isDefault: false,
        usageCount: 0,
        totalExpensesProcessed: 0,
        createdAt: undefined,
        updatedAt: undefined,
        createdBy: req.userID,
        updatedBy: undefined
    });

    await duplicate.save();

    res.status(201).json({
        success: true,
        data: duplicate,
        message: 'Policy duplicated',
        messageAr: 'تم نسخ السياسة'
    });
});

/**
 * Check expense compliance against a policy
 */
const checkCompliance = asyncHandler(async (req, res) => {
    const { policyId } = req.params;
    const { expense } = req.body;

    if (!expense) {
        throw CustomException('Expense data is required', 400, {
            messageAr: 'بيانات المصروف مطلوبة'
        });
    }

    let policy;
    if (policyId === 'applicable' || !policyId) {
        // Get applicable policy for user
        const User = require('../models/user.model');
        const user = await User.findById(req.userID).select('firmRole department');

        policy = await ExpensePolicy.getApplicablePolicy(
            req.firmId,
            req.firmId ? null : req.userID,
            req.userID,
            user?.firmRole,
            user?.department
        );
    } else {
        policy = await ExpensePolicy.findOne({
            _id: policyId,
            ...req.firmQuery
        });
    }

    if (!policy) {
        // No policy - allow expense
        return res.json({
            success: true,
            data: {
                compliant: true,
                violations: [],
                warnings: [],
                requiresApproval: null,
                autoApprove: true,
                policyApplied: null
            }
        });
    }

    const result = await policy.checkCompliance(expense, req.userID);
    result.policyApplied = {
        id: policy._id,
        name: policy.name,
        nameAr: policy.nameAr
    };

    res.json({
        success: true,
        data: result
    });
});

/**
 * Create default policy
 */
const createDefaultPolicy = asyncHandler(async (req, res) => {
    // Check if default already exists
    const existing = await ExpensePolicy.findOne({
        ...req.firmQuery,
        isDefault: true
    });

    if (existing) {
        throw CustomException('Default policy already exists', 400, {
            messageAr: 'السياسة الافتراضية موجودة بالفعل'
        });
    }

    const policy = await ExpensePolicy.createDefaultPolicy(
        req.firmId,
        req.firmId ? null : req.userID,
        req.userID
    );

    res.status(201).json({
        success: true,
        data: policy,
        message: 'Default policy created',
        messageAr: 'تم إنشاء السياسة الافتراضية'
    });
});

module.exports = {
    getExpensePolicies,
    getExpensePolicy,
    getDefaultPolicy,
    getMyPolicy,
    createExpensePolicy,
    updateExpensePolicy,
    deleteExpensePolicy,
    setAsDefault,
    toggleStatus,
    duplicatePolicy,
    checkCompliance,
    createDefaultPolicy
};
