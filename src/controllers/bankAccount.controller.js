const { BankAccount } = require('../models');
const QueueService = require('../services/queue.service');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');
const { pickAllowedFields } = require('../utils/securityUtils');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Allowed fields for bank account creation and updates
const ALLOWED_CREATE_FIELDS = [
    'name',
    'nameAr',
    'type',
    'bankName',
    'accountNumber',
    'currency',
    'openingBalance',
    'iban',
    'swiftCode',
    'routingNumber',
    'branchName',
    'branchCode',
    'accountHolder',
    'accountHolderAddress',
    'minBalance',
    'overdraftLimit',
    'interestRate',
    'description',
    'notes',
    'color',
    'icon',
    'isDefault'
];

const ALLOWED_UPDATE_FIELDS = [
    'name',
    'nameAr',
    'type',
    'bankName',
    'accountNumber',
    'currency',
    'iban',
    'swiftCode',
    'routingNumber',
    'branchName',
    'branchCode',
    'accountHolder',
    'accountHolderAddress',
    'minBalance',
    'overdraftLimit',
    'interestRate',
    'description',
    'notes',
    'color',
    'icon',
    'isDefault'
];

// Saudi IBAN validation regex (SA + 22 digits)
const saudiIBANRegex = /^SA\d{22}$/;

/**
 * Validate IBAN for Saudi accounts
 * @param {string} iban - IBAN to validate
 * @throws {Error} if IBAN format is invalid
 */
const validateSaudiIBAN = (iban) => {
    if (iban && !saudiIBANRegex.test(iban)) {
        throw new Error('Invalid Saudi IBAN format (must be SA followed by 22 digits)');
    }
};

// Create bank account
const createBankAccount = asyncHandler(async (req, res) => {
    // SECURITY: Mass assignment protection - only allow specified fields
    const sanitizedData = pickAllowedFields(req.body, ALLOWED_CREATE_FIELDS);
    const {
        name,
        nameAr,
        type,
        bankName,
        accountNumber,
        currency,
        openingBalance,
        iban,
        swiftCode,
        routingNumber,
        branchName,
        branchCode,
        accountHolder,
        accountHolderAddress,
        minBalance,
        overdraftLimit,
        interestRate,
        description,
        notes,
        color,
        icon,
        isDefault
    } = sanitizedData;

    if (!name || name.length < 2) {
        throw CustomException('Account name is required (min 2 characters)', 400);
    }

    if (!type) {
        throw CustomException('Account type is required', 400);
    }

    // SECURITY: Validate IBAN format for Saudi accounts
    validateSaudiIBAN(iban);

    // SECURITY FIX: Use req.addFirmId for proper tenant context
    const account = await BankAccount.create(req.addFirmId({
        name,
        nameAr,
        type,
        bankName,
        accountNumber,
        currency: currency || 'SAR',
        openingBalance: openingBalance || 0,
        balance: openingBalance || 0,
        availableBalance: openingBalance || 0,
        iban,
        swiftCode,
        routingNumber,
        branchName,
        branchCode,
        accountHolder,
        accountHolderAddress,
        minBalance,
        overdraftLimit,
        interestRate,
        description,
        notes,
        color,
        icon,
        isDefault
    }));

    // Fire-and-forget: Queue the billing activity log
    QueueService.logBillingActivity({
        activityType: 'bank_account_created',
        userId: req.userID,
        relatedModel: 'BankAccount',
        relatedId: account._id,
        description: `Bank account "${name}" created`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(201).json({
        success: true,
        message: 'Bank account created successfully',
        account
    });
});

// Get all bank accounts
const getBankAccounts = asyncHandler(async (req, res) => {
    const {
        type,
        currency,
        isActive,
        search,
        page = 1,
        limit = 20
    } = req.query;

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const filters = { ...req.firmQuery };

    if (type) filters.type = type;
    if (currency) filters.currency = currency;
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    if (search) {
        filters.$or = [
            { name: { $regex: escapeRegex(search), $options: 'i' } },
            { accountNumber: { $regex: escapeRegex(search), $options: 'i' } },
            { bankName: { $regex: escapeRegex(search), $options: 'i' } }
        ];
    }

    const accounts = await BankAccount.find(filters)
        .sort({ isDefault: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await BankAccount.countDocuments(filters);

    return res.json({
        success: true,
        accounts,
        total
    });
});

// Get single bank account
const getBankAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const account = await BankAccount.findOne({ _id: id, ...req.firmQuery });

    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    return res.json({
        success: true,
        account
    });
});

// Update bank account
const updateBankAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const account = await BankAccount.findOne({ _id: id, ...req.firmQuery });

    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    // SECURITY: Mass assignment protection - only allow specified fields
    const sanitizedData = pickAllowedFields(req.body, ALLOWED_UPDATE_FIELDS);

    // SECURITY: Validate IBAN format for Saudi accounts
    if (sanitizedData.iban) {
        validateSaudiIBAN(sanitizedData.iban);
    }

    // Don't allow changing opening balance after transactions exist
    if (sanitizedData.openingBalance !== undefined && sanitizedData.openingBalance !== account.openingBalance) {
        const BankTransaction = require('../models').BankTransaction;
        const txnCount = await BankTransaction.countDocuments({ accountId: id, ...req.firmQuery });
        if (txnCount > 0) {
            throw CustomException('Cannot change opening balance after transactions exist', 400);
        }
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const updatedAccount = await BankAccount.findOneAndUpdate(
        { _id: id, ...req.firmQuery },
        { $set: sanitizedData },
        { new: true, runValidators: true }
    );

    return res.json({
        success: true,
        message: 'Bank account updated successfully',
        account: updatedAccount
    });
});

// Delete bank account
const deleteBankAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const account = await BankAccount.findOne({ _id: id, ...req.firmQuery });

    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    // Check for existing transactions
    const BankTransaction = require('../models').BankTransaction;
    const txnCount = await BankTransaction.countDocuments({ accountId: id, ...req.firmQuery });
    if (txnCount > 0) {
        throw CustomException('Cannot delete account with existing transactions. Deactivate it instead.', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    await BankAccount.findOneAndDelete({ _id: id, ...req.firmQuery });

    return res.json({
        success: true,
        message: 'Bank account deleted successfully'
    });
});

// Set account as default
const setDefault = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const account = await BankAccount.findOne({ _id: id, ...req.firmQuery });

    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    await BankAccount.updateMany(
        { ...req.firmQuery, _id: { $ne: id } },
        { isDefault: false }
    );

    account.isDefault = true;
    await account.save();

    return res.json({
        success: true,
        message: 'Account set as default successfully',
        account
    });
});

// Get account balance history
const getBalanceHistory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { period = 'month' } = req.query;

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const account = await BankAccount.findOne({ _id: id, ...req.firmQuery });

    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    // Pass firmQuery to model method for proper tenant isolation
    const data = await BankAccount.getBalanceHistory(id, period, req.firmQuery);

    return res.json({
        success: true,
        data
    });
});

// Get accounts summary
const getSummary = asyncHandler(async (req, res) => {
    // SECURITY FIX: Pass req.firmQuery for proper tenant isolation
    const summary = await BankAccount.getSummary(req.firmQuery);

    return res.json({
        success: true,
        summary
    });
});

// Sync bank account (placeholder for bank connection sync)
const syncAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const account = await BankAccount.findOne({ _id: id, ...req.firmQuery });

    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    if (!account.connection || account.connection.status !== 'connected') {
        throw CustomException('Account is not connected to a bank provider', 400);
    }

    // Placeholder for actual bank sync - would integrate with Plaid/Yodlee/etc.
    account.lastSyncedAt = new Date();
    account.connection.lastSyncedAt = new Date();
    await account.save();

    return res.json({
        success: true,
        message: 'Sync completed',
        synced: 0,
        newTransactions: 0,
        lastSyncedAt: account.lastSyncedAt
    });
});

// Disconnect bank connection
const disconnectAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const account = await BankAccount.findOne({ _id: id, ...req.firmQuery });

    if (!account) {
        throw CustomException('Bank account not found', 404);
    }

    if (account.connection) {
        account.connection.status = 'disconnected';
        account.connection.accessToken = null;
        account.connection.refreshToken = null;
        await account.save();
    }

    return res.json({
        success: true,
        message: 'Account disconnected successfully'
    });
});

module.exports = {
    createBankAccount,
    getBankAccounts,
    getBankAccount,
    updateBankAccount,
    deleteBankAccount,
    setDefault,
    getBalanceHistory,
    getSummary,
    syncAccount,
    disconnectAccount
};
