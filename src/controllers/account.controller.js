const Account = require('../models/account.model');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Get all accounts
 * GET /api/accounts
 * Query params: type, isActive, includeHierarchy
 */
const getAccounts = asyncHandler(async (req, res) => {
    const { type, isActive, includeHierarchy } = req.query;

    // If hierarchy requested, use getHierarchy method
    if (includeHierarchy === 'true') {
        const options = {};
        if (type) options.type = type;
        if (isActive !== undefined) options.isActive = isActive === 'true';

        const hierarchy = await Account.getHierarchy(options);
        return res.status(200).json({
            success: true,
            data: hierarchy
        });
    }

    // Standard flat list
    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const accounts = await Account.find(query)
        .populate('parentAccountId', 'code name')
        .sort({ code: 1 });

    res.status(200).json({
        success: true,
        count: accounts.length,
        data: accounts
    });
});

/**
 * Get single account with balance
 * GET /api/accounts/:id
 */
const getAccount = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.params.id)
        .populate('parentAccountId', 'code name')
        .populate('children', 'code name type');

    if (!account) {
        return res.status(404).json({
            success: false,
            error: 'Account not found'
        });
    }

    // Get account balance
    const balanceInfo = await Account.getAccountBalance(account._id);

    res.status(200).json({
        success: true,
        data: {
            ...account.toObject(),
            balance: balanceInfo
        }
    });
});

/**
 * Create new account
 * POST /api/accounts
 */
const createAccount = asyncHandler(async (req, res) => {
    const {
        code,
        name,
        nameAr,
        type,
        subType,
        parentAccountId,
        description,
        descriptionAr,
        isSystem
    } = req.body;

    // Validate required fields
    if (!code || !name || !type) {
        return res.status(400).json({
            success: false,
            error: 'Code, name, and type are required'
        });
    }

    // Check for duplicate code
    const existingAccount = await Account.findOne({ code });
    if (existingAccount) {
        return res.status(400).json({
            success: false,
            error: `Account with code ${code} already exists`
        });
    }

    // Validate parent account if provided
    if (parentAccountId) {
        const parentAccount = await Account.findById(parentAccountId);
        if (!parentAccount) {
            return res.status(400).json({
                success: false,
                error: 'Parent account not found'
            });
        }
    }

    const account = await Account.create({
        code,
        name,
        nameAr,
        type,
        subType,
        parentAccountId,
        description,
        descriptionAr,
        isSystem: isSystem || false,
        createdBy: req.user?._id
    });

    res.status(201).json({
        success: true,
        data: account
    });
});

/**
 * Update account
 * PATCH /api/accounts/:id
 */
const updateAccount = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.params.id);

    if (!account) {
        return res.status(404).json({
            success: false,
            error: 'Account not found'
        });
    }

    // Don't allow changing code of system accounts
    if (account.isSystem && req.body.code && req.body.code !== account.code) {
        return res.status(400).json({
            success: false,
            error: 'Cannot change code of system account'
        });
    }

    // Check for duplicate code if code is being changed
    if (req.body.code && req.body.code !== account.code) {
        const existingAccount = await Account.findOne({ code: req.body.code });
        if (existingAccount) {
            return res.status(400).json({
                success: false,
                error: `Account with code ${req.body.code} already exists`
            });
        }
    }

    // Validate parent account if provided
    if (req.body.parentAccountId) {
        // Prevent circular reference
        if (req.body.parentAccountId === req.params.id) {
            return res.status(400).json({
                success: false,
                error: 'Account cannot be its own parent'
            });
        }

        const parentAccount = await Account.findById(req.body.parentAccountId);
        if (!parentAccount) {
            return res.status(400).json({
                success: false,
                error: 'Parent account not found'
            });
        }
    }

    // Update allowed fields
    const allowedFields = [
        'code', 'name', 'nameAr', 'type', 'subType',
        'parentAccountId', 'description', 'descriptionAr', 'isActive'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            account[field] = req.body[field];
        }
    });

    account.updatedBy = req.user?._id;
    await account.save();

    res.status(200).json({
        success: true,
        data: account
    });
});

/**
 * Delete account
 * DELETE /api/accounts/:id
 */
const deleteAccount = asyncHandler(async (req, res) => {
    const account = await Account.findById(req.params.id);

    if (!account) {
        return res.status(404).json({
            success: false,
            error: 'Account not found'
        });
    }

    // Check if can be deleted
    const { canDelete, reason } = await account.canDelete();
    if (!canDelete) {
        return res.status(400).json({
            success: false,
            error: reason
        });
    }

    await account.deleteOne();

    res.status(200).json({
        success: true,
        data: {},
        message: 'Account deleted successfully'
    });
});

/**
 * Get account balance
 * GET /api/accounts/:id/balance
 * Query params: asOfDate, caseId
 */
const getAccountBalance = asyncHandler(async (req, res) => {
    const { asOfDate, caseId } = req.query;

    const account = await Account.findById(req.params.id);
    if (!account) {
        return res.status(404).json({
            success: false,
            error: 'Account not found'
        });
    }

    const balance = await Account.getAccountBalance(
        req.params.id,
        asOfDate ? new Date(asOfDate) : null,
        caseId || null
    );

    res.status(200).json({
        success: true,
        data: balance
    });
});

/**
 * Get account types for dropdown
 * GET /api/accounts/types
 */
const getAccountTypes = asyncHandler(async (req, res) => {
    const types = [
        { value: 'Asset', label: 'Asset', labelAr: 'أصول' },
        { value: 'Liability', label: 'Liability', labelAr: 'التزامات' },
        { value: 'Equity', label: 'Equity', labelAr: 'حقوق الملكية' },
        { value: 'Income', label: 'Income', labelAr: 'إيرادات' },
        { value: 'Expense', label: 'Expense', labelAr: 'مصروفات' }
    ];

    const subTypes = [
        { value: 'Current Asset', label: 'Current Asset', type: 'Asset' },
        { value: 'Fixed Asset', label: 'Fixed Asset', type: 'Asset' },
        { value: 'Other Asset', label: 'Other Asset', type: 'Asset' },
        { value: 'Current Liability', label: 'Current Liability', type: 'Liability' },
        { value: 'Long-term Liability', label: 'Long-term Liability', type: 'Liability' },
        { value: 'Other Liability', label: 'Other Liability', type: 'Liability' },
        { value: "Owner's Equity", label: "Owner's Equity", type: 'Equity' },
        { value: 'Retained Earnings', label: 'Retained Earnings', type: 'Equity' },
        { value: 'Operating Income', label: 'Operating Income', type: 'Income' },
        { value: 'Other Income', label: 'Other Income', type: 'Income' },
        { value: 'Cost of Goods Sold', label: 'Cost of Goods Sold', type: 'Expense' },
        { value: 'Operating Expense', label: 'Operating Expense', type: 'Expense' },
        { value: 'Other Expense', label: 'Other Expense', type: 'Expense' }
    ];

    res.status(200).json({
        success: true,
        data: { types, subTypes }
    });
});

module.exports = {
    getAccounts,
    getAccount,
    createAccount,
    updateAccount,
    deleteAccount,
    getAccountBalance,
    getAccountTypes
};
