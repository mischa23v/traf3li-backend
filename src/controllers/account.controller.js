const Account = require('../models/account.model');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

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
    // Sanitize and validate account ID
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid account ID format'
        });
    }

    const account = await Account.findById(sanitizedId)
        .populate('parentAccountId', 'code name')
        .populate('children', 'code name type');

    if (!account) {
        return res.status(404).json({
            success: false,
            error: 'Account not found'
        });
    }

    // Get account balance (read-only - calculated from general ledger)
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
    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'code',
        'name',
        'nameAr',
        'type',
        'subType',
        'parentAccountId',
        'description',
        'descriptionAr'
    ];
    const accountData = pickAllowedFields(req.body, allowedFields);

    // Input validation - validate required fields
    if (!accountData.code || !accountData.name || !accountData.type) {
        return res.status(400).json({
            success: false,
            error: 'Code, name, and type are required'
        });
    }

    // Validate account code format (must be numeric)
    if (!/^\d+$/.test(accountData.code)) {
        return res.status(400).json({
            success: false,
            error: 'Account code must be numeric'
        });
    }

    // Validate account type
    const validTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
    if (!validTypes.includes(accountData.type)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid account type'
        });
    }

    // Validate name length
    if (accountData.name.length > 100) {
        return res.status(400).json({
            success: false,
            error: 'Account name cannot exceed 100 characters'
        });
    }

    // Check for duplicate code
    const existingAccount = await Account.findOne({ code: accountData.code });
    if (existingAccount) {
        return res.status(400).json({
            success: false,
            error: `Account with code ${accountData.code} already exists`
        });
    }

    // Validate and sanitize parent account ID if provided
    if (accountData.parentAccountId) {
        const sanitizedParentId = sanitizeObjectId(accountData.parentAccountId);
        if (!sanitizedParentId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid parent account ID format'
            });
        }

        const parentAccount = await Account.findById(sanitizedParentId);
        if (!parentAccount) {
            return res.status(400).json({
                success: false,
                error: 'Parent account not found'
            });
        }

        accountData.parentAccountId = sanitizedParentId;
    }

    // System-controlled fields
    accountData.isSystem = false; // Users cannot create system accounts
    accountData.createdBy = req.user?._id;

    const account = await Account.create(accountData);

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
    // Sanitize and validate account ID
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid account ID format'
        });
    }

    const account = await Account.findById(sanitizedId);

    if (!account) {
        return res.status(404).json({
            success: false,
            error: 'Account not found'
        });
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'code',
        'name',
        'nameAr',
        'type',
        'subType',
        'parentAccountId',
        'description',
        'descriptionAr',
        'isActive'
    ];
    const updateData = pickAllowedFields(req.body, allowedFields);

    // Protect system accounts from modification
    if (account.isSystem) {
        // System accounts cannot have their type or code changed
        if (updateData.code && updateData.code !== account.code) {
            return res.status(400).json({
                success: false,
                error: 'Cannot change code of system account'
            });
        }
        if (updateData.type && updateData.type !== account.type) {
            return res.status(400).json({
                success: false,
                error: 'Cannot change type of system account'
            });
        }
    }

    // Input validation for code if being changed
    if (updateData.code) {
        // Validate code format
        if (!/^\d+$/.test(updateData.code)) {
            return res.status(400).json({
                success: false,
                error: 'Account code must be numeric'
            });
        }

        // Check for duplicate code
        if (updateData.code !== account.code) {
            const existingAccount = await Account.findOne({ code: updateData.code });
            if (existingAccount) {
                return res.status(400).json({
                    success: false,
                    error: `Account with code ${updateData.code} already exists`
                });
            }
        }
    }

    // Validate account type if being changed
    if (updateData.type) {
        const validTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];
        if (!validTypes.includes(updateData.type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account type'
            });
        }
    }

    // Validate name length if being changed
    if (updateData.name && updateData.name.length > 100) {
        return res.status(400).json({
            success: false,
            error: 'Account name cannot exceed 100 characters'
        });
    }

    // Validate and sanitize parent account if provided
    if (updateData.parentAccountId !== undefined) {
        if (updateData.parentAccountId) {
            const sanitizedParentId = sanitizeObjectId(updateData.parentAccountId);
            if (!sanitizedParentId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid parent account ID format'
                });
            }

            // Prevent circular reference
            if (sanitizedParentId === sanitizedId) {
                return res.status(400).json({
                    success: false,
                    error: 'Account cannot be its own parent'
                });
            }

            const parentAccount = await Account.findById(sanitizedParentId);
            if (!parentAccount) {
                return res.status(400).json({
                    success: false,
                    error: 'Parent account not found'
                });
            }

            updateData.parentAccountId = sanitizedParentId;
        }
    }

    // Apply updates to account
    Object.keys(updateData).forEach(field => {
        account[field] = updateData[field];
    });

    // System-controlled fields
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
    // Sanitize and validate account ID
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid account ID format'
        });
    }

    const account = await Account.findById(sanitizedId);

    if (!account) {
        return res.status(404).json({
            success: false,
            error: 'Account not found'
        });
    }

    // Protect system accounts from deletion
    if (account.isSystem) {
        return res.status(403).json({
            success: false,
            error: 'Cannot delete system account'
        });
    }

    // Check if can be deleted (has children or transactions)
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
    // Sanitize and validate account ID
    const sanitizedId = sanitizeObjectId(req.params.id);
    if (!sanitizedId) {
        return res.status(400).json({
            success: false,
            error: 'Invalid account ID format'
        });
    }

    const account = await Account.findById(sanitizedId);
    if (!account) {
        return res.status(404).json({
            success: false,
            error: 'Account not found'
        });
    }

    // Sanitize caseId if provided
    let sanitizedCaseId = null;
    if (req.query.caseId) {
        sanitizedCaseId = sanitizeObjectId(req.query.caseId);
        if (!sanitizedCaseId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid case ID format'
            });
        }
    }

    // Validate date if provided
    let validatedDate = null;
    if (req.query.asOfDate) {
        validatedDate = new Date(req.query.asOfDate);
        if (isNaN(validatedDate.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid date format'
            });
        }
    }

    // Get balance (read-only - calculated from general ledger)
    const balance = await Account.getAccountBalance(
        sanitizedId,
        validatedDate,
        sanitizedCaseId
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
