const {
    TrustAccount, ClientTrustBalance, TrustTransaction,
    TrustReconciliation, ThreeWayReconciliation, Client, Case
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeString, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

// ==================== SECURITY CONSTANTS ====================

// Allowed transaction types
const ALLOWED_TRANSACTION_TYPES = ['deposit', 'withdrawal', 'disbursement', 'transfer_out', 'transfer_in'];

// Allowed fields for trust account creation
const TRUST_ACCOUNT_CREATE_FIELDS = ['name', 'nameAr', 'accountNumber', 'bankName', 'bankBranch', 'currency', 'description', 'isDefault'];

// Allowed fields for trust account update
const TRUST_ACCOUNT_UPDATE_FIELDS = ['name', 'nameAr', 'bankName', 'bankBranch', 'currency', 'description', 'isDefault', 'isActive'];

// Allowed fields for transaction creation
const TRANSACTION_CREATE_FIELDS = ['type', 'clientId', 'caseId', 'amount', 'description', 'reference', 'paymentMethod', 'checkNumber'];

// Allowed fields for void transaction
const VOID_TRANSACTION_FIELDS = ['reason'];

// Allowed fields for transfer
const TRANSFER_FIELDS = ['fromClientId', 'toClientId', 'amount', 'description'];

// Allowed fields for reconciliation
const RECONCILIATION_CREATE_FIELDS = ['bankStatementBalance', 'statementDate', 'adjustments', 'notes'];

// Allowed fields for three-way reconciliation
const THREE_WAY_RECONCILIATION_FIELDS = ['bankStatementBalance', 'statementDate', 'notes'];

// ==================== HELPER FUNCTIONS ====================

/**
 * Validate amount is a positive number
 */
const validateAmount = (amount) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        throw CustomException('المبلغ يجب أن يكون رقماً موجباً', 400);
    }
    return numAmount;
};

/**
 * Validate transaction type
 */
const validateTransactionType = (type) => {
    if (!ALLOWED_TRANSACTION_TYPES.includes(type)) {
        throw CustomException('نوع المعاملة غير صحيح', 400);
    }
    return type;
};

/**
 * Verify IDOR - Check if resource belongs to current user
 * SECURITY FIX: Use firmQuery for proper tenant isolation (supports both firm members and solo lawyers)
 */
const verifyIDORTrustAccount = async (accountId, firmQuery) => {
    const account = await TrustAccount.findOne({ _id: accountId, ...firmQuery });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
    }
    return account;
};

/**
 * Verify IDOR - Check if client belongs to current lawyer
 * SECURITY FIX: Use firmQuery for proper tenant isolation (supports both firm members and solo lawyers)
 */
const verifyIDORClient = async (clientId, firmQuery) => {
    const client = await Client.findOne({ _id: clientId, ...firmQuery });
    if (!client) {
        throw CustomException('العميل غير موجود أو ليس لديك صلاحية', 404);
    }
    return client;
};

/**
 * Verify IDOR - Check if case belongs to current lawyer
 * SECURITY FIX: Use firmQuery for proper tenant isolation (supports both firm members and solo lawyers)
 */
const verifyIDORCase = async (caseId, firmQuery) => {
    const caseRecord = await Case.findOne({ _id: caseId, ...firmQuery });
    if (!caseRecord) {
        throw CustomException('القضية غير موجودة أو ليس لديك صلاحية', 404);
    }
    return caseRecord;
};

// ==================== Trust Account Management ====================

/**
 * Create trust account
 * POST /api/trust-accounts
 * SECURITY: Mass assignment protection via pickAllowedFields
 */
const createTrustAccount = asyncHandler(async (req, res) => {
    // Mass assignment protection - only allow specific fields
    const safeBody = pickAllowedFields(req.body, TRUST_ACCOUNT_CREATE_FIELDS);
    const { name, accountNumber, bankName } = safeBody;

    // Validate required fields
    if (!name || !accountNumber || !bankName) {
        throw CustomException('الاسم ورقم الحساب واسم البنك مطلوبة', 400);
    }

    // Sanitize string inputs
    const sanitizedName = sanitizeString(name);
    const sanitizedAccountNumber = sanitizeString(accountNumber);
    const sanitizedBankName = sanitizeString(bankName);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // Check for duplicate account number
    const existing = await TrustAccount.findOne({
        ...req.firmQuery,
        accountNumber: sanitizedAccountNumber
    });
    if (existing) {
        throw CustomException('رقم الحساب موجود بالفعل', 400);
    }

    // If setting as default, remove default from others
    if (safeBody.isDefault) {
        await TrustAccount.updateMany({ ...req.firmQuery }, { isDefault: false });
    }

    // SECURITY FIX: Use req.addFirmId for proper tenant context
    const trustAccount = await TrustAccount.create(req.addFirmId({
        name: sanitizedName,
        nameAr: sanitizeString(safeBody.nameAr || ''),
        accountNumber: sanitizedAccountNumber,
        bankName: sanitizedBankName,
        bankBranch: sanitizeString(safeBody.bankBranch || ''),
        currency: safeBody.currency || 'SAR',
        description: sanitizeString(safeBody.description || ''),
        isDefault: safeBody.isDefault || false,
        balance: 0
    }));

    res.status(201).json({
        success: true,
        message: 'تم إنشاء حساب الأمانات بنجاح',
        data: trustAccount
    });
});

/**
 * Get all trust accounts
 * GET /api/trust-accounts
 */
const getTrustAccounts = asyncHandler(async (req, res) => {
    const { isActive } = req.query;

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const query = { ...req.firmQuery };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const accounts = await TrustAccount.find(query)
        .sort({ isDefault: -1, name: 1 });

    res.status(200).json({
        success: true,
        data: accounts
    });
});

/**
 * Get single trust account
 * GET /api/trust-accounts/:id
 * SECURITY: IDOR protection, ID validation
 */
const getTrustAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    const account = await TrustAccount.findOne({ _id: sanitizedId, ...req.firmQuery });

    if (!account) {
        throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
    }

    res.status(200).json({
        success: true,
        data: account
    });
});

/**
 * Update trust account
 * PATCH /api/trust-accounts/:id
 * SECURITY: IDOR protection, mass assignment protection, input validation
 */
const updateTrustAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    const account = await verifyIDORTrustAccount(sanitizedId, req.firmQuery);

    // Mass assignment protection - only allow specific fields
    const safeBody = pickAllowedFields(req.body, TRUST_ACCOUNT_UPDATE_FIELDS);

    // If setting as default, remove default from others
    if (safeBody.isDefault && !account.isDefault) {
        await TrustAccount.updateMany(
            { ...req.firmQuery, _id: { $ne: sanitizedId } },
            { isDefault: false }
        );
    }

    // Apply safe updates with input sanitization
    if (safeBody.name !== undefined) {
        account.name = sanitizeString(safeBody.name);
    }
    if (safeBody.nameAr !== undefined) {
        account.nameAr = sanitizeString(safeBody.nameAr);
    }
    if (safeBody.bankName !== undefined) {
        account.bankName = sanitizeString(safeBody.bankName);
    }
    if (safeBody.bankBranch !== undefined) {
        account.bankBranch = sanitizeString(safeBody.bankBranch);
    }
    if (safeBody.currency !== undefined) {
        account.currency = sanitizeString(safeBody.currency);
    }
    if (safeBody.description !== undefined) {
        account.description = sanitizeString(safeBody.description);
    }
    if (safeBody.isDefault !== undefined) {
        account.isDefault = safeBody.isDefault;
    }
    if (safeBody.isActive !== undefined) {
        account.isActive = safeBody.isActive;
    }

    await account.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث حساب الأمانات بنجاح',
        data: account
    });
});

/**
 * Delete trust account
 * DELETE /api/trust-accounts/:id
 * SECURITY: IDOR protection, ID validation
 */
const deleteTrustAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    const account = await verifyIDORTrustAccount(sanitizedId, req.firmQuery);

    if (account.balance !== 0) {
        throw CustomException('لا يمكن حذف حساب به رصيد', 400);
    }

    // Check for transactions
    const hasTransactions = await TrustTransaction.exists({ trustAccountId: sanitizedId, ...req.firmQuery });
    if (hasTransactions) {
        throw CustomException('لا يمكن حذف حساب به معاملات', 400);
    }

    // SECURITY FIX: Use req.firmQuery for atomic delete with tenant isolation
    await TrustAccount.findOneAndDelete({ _id: sanitizedId, ...req.firmQuery });

    res.status(200).json({
        success: true,
        message: 'تم حذف حساب الأمانات بنجاح'
    });
});

// ==================== Trust Transactions ====================

/**
 * Create trust transaction (deposit/withdrawal)
 * POST /api/trust-accounts/:id/transactions
 * SECURITY: IDOR protection, mass assignment, amount validation, transaction type validation
 * RACE CONDITION PROTECTION: MongoDB transactions with session locks
 */
const createTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate and sanitize ID
    const sanitizedAccountId = sanitizeObjectId(id);
    if (!sanitizedAccountId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // Mass assignment protection - only allow specific fields
    const safeBody = pickAllowedFields(req.body, TRANSACTION_CREATE_FIELDS);
    const { type, clientId, caseId, description, reference, paymentMethod, checkNumber } = safeBody;

    // Validate required fields
    if (!type || !clientId) {
        throw CustomException('نوع المعاملة والعميل مطلوبة', 400);
    }

    if (!safeBody.amount) {
        throw CustomException('المبلغ مطلوب', 400);
    }

    // Validate transaction type
    validateTransactionType(type);

    // Validate amount
    const amount = validateAmount(safeBody.amount);

    // Validate and sanitize IDs
    const sanitizedClientId = sanitizeObjectId(clientId);
    if (!sanitizedClientId) {
        throw CustomException('معرف العميل غير صحيح', 400);
    }

    const sanitizedCaseId = caseId ? sanitizeObjectId(caseId) : null;
    if (caseId && !sanitizedCaseId) {
        throw CustomException('معرف القضية غير صحيح', 400);
    }

    // MongoDB transaction with session for race condition protection
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // SECURITY FIX: Use req.firmQuery for proper tenant isolation
        // IDOR check - verify account ownership
        const account = await TrustAccount.findOne({
            _id: sanitizedAccountId,
            ...req.firmQuery
        }).session(session);

        if (!account) {
            throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
        }

        // IDOR check - verify client ownership
        const client = await Client.findOne({
            _id: sanitizedClientId,
            ...req.firmQuery
        }).session(session);

        if (!client) {
            throw CustomException('العميل غير موجود أو ليس لديك صلاحية', 404);
        }

        // IDOR check - verify case ownership if provided
        if (sanitizedCaseId) {
            const caseRecord = await Case.findOne({
                _id: sanitizedCaseId,
                ...req.firmQuery
            }).session(session);

            if (!caseRecord) {
                throw CustomException('القضية غير موجودة أو ليس لديك صلاحية', 404);
            }
        }

        // Calculate balance change
        const isDebit = ['withdrawal', 'disbursement', 'transfer_out'].includes(type);
        const balanceChange = isDebit ? -amount : amount;

        // Update account balance atomically
        const accountBalanceBefore = account.balance;
        const updatedAccount = await TrustAccount.findOneAndUpdate(
            {
                _id: sanitizedAccountId,
                ...req.firmQuery
            },
            { $inc: { balance: balanceChange } },
            { new: true, session }
        );

        if (!updatedAccount) {
            throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
        }

        const accountBalanceAfter = updatedAccount.balance;

        // Get or create client trust balance
        let clientBalance = await ClientTrustBalance.findOne({
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedClientId,
            ...req.firmQuery
        }).session(session);

        if (!clientBalance) {
            // SECURITY FIX: Use req.addFirmId for proper tenant context
            const firmData = req.addFirmId({
                trustAccountId: sanitizedAccountId,
                clientId: sanitizedClientId,
                balance: 0
            });
            clientBalance = await ClientTrustBalance.create([firmData], { session });
            clientBalance = clientBalance[0];
        }

        const clientBalanceBefore = clientBalance.balance;

        // Update client balance atomically with minimum balance check for debits
        const clientBalanceFilter = {
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedClientId,
            ...req.firmQuery
        };

        // For debits, ensure sufficient balance in the atomic operation
        if (isDebit) {
            clientBalanceFilter.balance = { $gte: amount };
        }

        const updatedClientBalance = await ClientTrustBalance.findOneAndUpdate(
            clientBalanceFilter,
            {
                $inc: { balance: balanceChange },
                $set: { lastTransactionDate: new Date() }
            },
            { new: true, session }
        );

        if (!updatedClientBalance) {
            // Rollback account balance since client balance update failed
            await TrustAccount.findOneAndUpdate(
                { _id: sanitizedAccountId, ...req.firmQuery },
                { $inc: { balance: -balanceChange } },
                { session }
            );
            throw CustomException('رصيد العميل غير كافٍ للسحب', 400);
        }

        const clientBalanceAfter = updatedClientBalance.balance;

        // Generate transaction number
        const transactionCount = await TrustTransaction.countDocuments({ ...req.firmQuery });
        const transactionNumber = `TT-${new Date().getFullYear()}-${String(transactionCount + 1).padStart(6, '0')}`;

        // SECURITY FIX: Use req.addFirmId for proper tenant context
        // Create transaction with sanitized inputs
        const transactionData = req.addFirmId({
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedClientId,
            caseId: sanitizedCaseId,
            transactionNumber,
            type,
            amount,
            description: sanitizeString(description || ''),
            reference: sanitizeString(reference || ''),
            paymentMethod: sanitizeString(paymentMethod || ''),
            checkNumber: sanitizeString(checkNumber || ''),
            balanceBefore: accountBalanceBefore,
            balanceAfter: accountBalanceAfter,
            clientBalanceBefore: clientBalanceBefore,
            clientBalanceAfter: clientBalanceAfter,
            status: 'completed',
            createdBy: req.userID
        });
        const transaction = await TrustTransaction.create([transactionData], { session });

        await session.commitTransaction();

        res.status(201).json({
            success: true,
            message: 'تم إنشاء المعاملة بنجاح',
            data: transaction[0]
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get transactions for trust account
 * GET /api/trust-accounts/:id/transactions
 * SECURITY: IDOR protection, ID validation, transaction type validation
 */
const getTransactions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { clientId, type, startDate, endDate, page = 1, limit = 50 } = req.query;

    // Validate and sanitize account ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedId, req.firmQuery);

    const query = { ...req.firmQuery, trustAccountId: sanitizedId };

    // Validate and add clientId filter if provided
    if (clientId) {
        const sanitizedClientId = sanitizeObjectId(clientId);
        if (!sanitizedClientId) {
            throw CustomException('معرف العميل غير صحيح', 400);
        }
        query.clientId = sanitizedClientId;
    }

    // Validate transaction type if provided
    if (type) {
        if (!ALLOWED_TRANSACTION_TYPES.includes(type)) {
            throw CustomException('نوع المعاملة غير صحيح', 400);
        }
        query.type = type;
    }

    // Validate date range
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
            const startDateObj = new Date(startDate);
            if (isNaN(startDateObj.getTime())) {
                throw CustomException('تاريخ البداية غير صحيح', 400);
            }
            query.createdAt.$gte = startDateObj;
        }
        if (endDate) {
            const endDateObj = new Date(endDate);
            if (isNaN(endDateObj.getTime())) {
                throw CustomException('تاريخ النهاية غير صحيح', 400);
            }
            query.createdAt.$lte = endDateObj;
        }
    }

    const transactions = await TrustTransaction.find(query)
        .populate('clientId', 'firstName lastName companyName')
        .populate('caseId', 'title caseNumber')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await TrustTransaction.countDocuments(query);

    res.status(200).json({
        success: true,
        data: transactions,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get transaction details
 * GET /api/trust-accounts/:id/transactions/:transactionId
 * SECURITY: IDOR protection, ID validation
 */
const getTransaction = asyncHandler(async (req, res) => {
    const { id, transactionId } = req.params;

    // Validate and sanitize IDs
    const sanitizedAccountId = sanitizeObjectId(id);
    if (!sanitizedAccountId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    const sanitizedTransactionId = sanitizeObjectId(transactionId);
    if (!sanitizedTransactionId) {
        throw CustomException('معرف المعاملة غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership first
    await verifyIDORTrustAccount(sanitizedAccountId, req.firmQuery);

    // IDOR protection - verify transaction belongs to user and account
    const transaction = await TrustTransaction.findOne({
        _id: sanitizedTransactionId,
        trustAccountId: sanitizedAccountId,
        ...req.firmQuery
    })
        .populate('clientId', 'firstName lastName companyName email')
        .populate('caseId', 'title caseNumber');

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة أو ليس لديك صلاحية', 404);
    }

    res.status(200).json({
        success: true,
        data: transaction
    });
});

/**
 * Void transaction
 * POST /api/trust-accounts/:id/transactions/:transactionId/void
 * SECURITY: IDOR protection, mass assignment, race condition protection
 */
const voidTransaction = asyncHandler(async (req, res) => {
    const { id, transactionId } = req.params;

    // Validate and sanitize IDs
    const sanitizedAccountId = sanitizeObjectId(id);
    if (!sanitizedAccountId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    const sanitizedTransactionId = sanitizeObjectId(transactionId);
    if (!sanitizedTransactionId) {
        throw CustomException('معرف المعاملة غير صحيح', 400);
    }

    // Mass assignment protection
    const safeBody = pickAllowedFields(req.body, VOID_TRANSACTION_FIELDS);
    const reason = sanitizeString(safeBody.reason || '');

    // MongoDB transaction with session for race condition protection
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // SECURITY FIX: Use req.firmQuery for proper tenant isolation
        // IDOR check - verify transaction belongs to user
        const transaction = await TrustTransaction.findOne({
            _id: sanitizedTransactionId,
            trustAccountId: sanitizedAccountId,
            ...req.firmQuery
        }).session(session);

        if (!transaction) {
            throw CustomException('المعاملة غير موجودة أو ليس لديك صلاحية', 404);
        }

        if (transaction.status === 'voided') {
            throw CustomException('المعاملة ملغاة بالفعل', 400);
        }

        // IDOR check - verify account ownership
        const account = await TrustAccount.findOne({
            _id: sanitizedAccountId,
            ...req.firmQuery
        }).session(session);

        if (!account) {
            throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
        }

        // Reverse the balance changes atomically
        const isDebit = ['withdrawal', 'disbursement', 'transfer_out'].includes(transaction.type);
        const reverseChange = isDebit ? transaction.amount : -transaction.amount;

        // Update account balance atomically
        const updatedAccount = await TrustAccount.findOneAndUpdate(
            {
                _id: sanitizedAccountId,
                ...req.firmQuery
            },
            { $inc: { balance: reverseChange } },
            { new: true, session }
        );

        if (!updatedAccount) {
            throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
        }

        // Update client balance atomically if exists
        const clientBalance = await ClientTrustBalance.findOne({
            trustAccountId: sanitizedAccountId,
            clientId: transaction.clientId,
            ...req.firmQuery
        }).session(session);

        if (clientBalance) {
            // For void reversals that would result in withdrawal (reverseChange < 0),
            // ensure sufficient balance in the atomic operation
            const clientBalanceFilter = {
                trustAccountId: sanitizedAccountId,
                clientId: transaction.clientId,
                ...req.firmQuery
            };

            if (reverseChange < 0) {
                clientBalanceFilter.balance = { $gte: Math.abs(reverseChange) };
            }

            const updatedClientBalance = await ClientTrustBalance.findOneAndUpdate(
                clientBalanceFilter,
                {
                    $inc: { balance: reverseChange },
                    $set: { lastTransactionDate: new Date() }
                },
                { new: true, session }
            );

            if (!updatedClientBalance) {
                // Rollback account balance
                await TrustAccount.findOneAndUpdate(
                    { _id: sanitizedAccountId, ...req.firmQuery },
                    { $inc: { balance: -reverseChange } },
                    { session }
                );
                throw CustomException('رصيد العميل غير كافٍ لإلغاء المعاملة', 400);
            }
        }

        // Update transaction status
        transaction.status = 'voided';
        transaction.voidedAt = new Date();
        transaction.voidedBy = req.userID;
        transaction.voidReason = reason;
        await transaction.save({ session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'تم إلغاء المعاملة بنجاح',
            data: transaction
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ==================== Client Trust Balances ====================

/**
 * Get client trust balances
 * GET /api/trust-accounts/:id/balances
 * SECURITY: IDOR protection, ID validation
 */
const getClientBalances = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedId, req.firmQuery);

    const balances = await ClientTrustBalance.find({
        ...req.firmQuery,
        trustAccountId: sanitizedId
    })
        .populate('clientId', 'firstName lastName companyName email')
        .sort({ balance: -1 });

    res.status(200).json({
        success: true,
        data: balances
    });
});

/**
 * Get client trust balance details
 * GET /api/trust-accounts/:id/balances/:clientId
 * SECURITY: IDOR protection, ID validation
 */
const getClientBalance = asyncHandler(async (req, res) => {
    const { id, clientId } = req.params;

    // Validate and sanitize IDs
    const sanitizedAccountId = sanitizeObjectId(id);
    if (!sanitizedAccountId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    const sanitizedClientId = sanitizeObjectId(clientId);
    if (!sanitizedClientId) {
        throw CustomException('معرف العميل غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedAccountId, req.firmQuery);

    // IDOR protection - verify client ownership
    const client = await Client.findOne({
        _id: sanitizedClientId,
        ...req.firmQuery
    });

    if (!client) {
        throw CustomException('العميل غير موجود أو ليس لديك صلاحية', 404);
    }

    const balance = await ClientTrustBalance.findOne({
        ...req.firmQuery,
        trustAccountId: sanitizedAccountId,
        clientId: sanitizedClientId
    }).populate('clientId', 'firstName lastName companyName email phone');

    if (!balance) {
        // Return zero balance if no record exists
        return res.status(200).json({
            success: true,
            data: {
                clientId: sanitizedClientId,
                client,
                balance: 0,
                transactions: []
            }
        });
    }

    // Get recent transactions
    const transactions = await TrustTransaction.find({
        ...req.firmQuery,
        trustAccountId: sanitizedAccountId,
        clientId: sanitizedClientId
    })
        .sort({ createdAt: -1 })
        .limit(10);

    res.status(200).json({
        success: true,
        data: {
            ...balance.toObject(),
            recentTransactions: transactions
        }
    });
});

/**
 * Transfer between clients
 * POST /api/trust-accounts/:id/transfer
 * SECURITY: IDOR protection, mass assignment, amount validation, race condition protection
 */
const transferBetweenClients = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate and sanitize account ID
    const sanitizedAccountId = sanitizeObjectId(id);
    if (!sanitizedAccountId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // Mass assignment protection
    const safeBody = pickAllowedFields(req.body, TRANSFER_FIELDS);
    const { fromClientId, toClientId } = safeBody;

    // Validate required fields
    if (!fromClientId || !toClientId) {
        throw CustomException('العميل المصدر والمستلم مطلوبة', 400);
    }

    if (!safeBody.amount) {
        throw CustomException('المبلغ مطلوب', 400);
    }

    // Validate amount
    const amount = validateAmount(safeBody.amount);

    // Validate and sanitize client IDs
    const sanitizedFromClientId = sanitizeObjectId(fromClientId);
    if (!sanitizedFromClientId) {
        throw CustomException('معرف العميل المصدر غير صحيح', 400);
    }

    const sanitizedToClientId = sanitizeObjectId(toClientId);
    if (!sanitizedToClientId) {
        throw CustomException('معرف العميل المستقبل غير صحيح', 400);
    }

    if (sanitizedFromClientId === sanitizedToClientId) {
        throw CustomException('لا يمكن التحويل لنفس العميل', 400);
    }

    // MongoDB transaction with session for race condition protection
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // SECURITY FIX: Use req.firmQuery for proper tenant isolation
        // IDOR check - verify account ownership
        const account = await TrustAccount.findOne({
            _id: sanitizedAccountId,
            ...req.firmQuery
        }).session(session);

        if (!account) {
            throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
        }

        // IDOR check - verify source client ownership
        const fromClient = await Client.findOne({
            _id: sanitizedFromClientId,
            ...req.firmQuery
        }).session(session);

        if (!fromClient) {
            throw CustomException('العميل المصدر غير موجود أو ليس لديك صلاحية', 404);
        }

        // IDOR check - verify destination client ownership
        const toClient = await Client.findOne({
            _id: sanitizedToClientId,
            ...req.firmQuery
        }).session(session);

        if (!toClient) {
            throw CustomException('العميل المستقبل غير موجود أو ليس لديك صلاحية', 404);
        }

        // Get source client balance with race condition protection
        const fromBalance = await ClientTrustBalance.findOne({
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedFromClientId,
            ...req.firmQuery
        }).session(session);

        if (!fromBalance) {
            throw CustomException('العميل المصدر ليس لديه رصيد', 404);
        }

        const fromBalanceBefore = fromBalance.balance;

        // Get or create destination client balance with race condition protection
        let toBalance = await ClientTrustBalance.findOne({
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedToClientId,
            ...req.firmQuery
        }).session(session);

        if (!toBalance) {
            // SECURITY FIX: Use req.addFirmId for proper tenant context
            const firmData = req.addFirmId({
                trustAccountId: sanitizedAccountId,
                clientId: sanitizedToClientId,
                balance: 0
            });
            toBalance = await ClientTrustBalance.create([firmData], { session });
            toBalance = toBalance[0];
        }

        const toBalanceBefore = toBalance.balance;

        // Update source balance atomically with minimum balance check
        const updatedFromBalance = await ClientTrustBalance.findOneAndUpdate(
            {
                trustAccountId: sanitizedAccountId,
                clientId: sanitizedFromClientId,
                ...req.firmQuery,
                balance: { $gte: amount } // Ensure sufficient balance
            },
            {
                $inc: { balance: -amount },
                $set: { lastTransactionDate: new Date() }
            },
            { new: true, session }
        );

        if (!updatedFromBalance) {
            throw CustomException('رصيد العميل المصدر غير كافٍ للتحويل', 400);
        }

        const fromBalanceAfter = updatedFromBalance.balance;

        // Update destination balance atomically
        const updatedToBalance = await ClientTrustBalance.findOneAndUpdate(
            {
                trustAccountId: sanitizedAccountId,
                clientId: sanitizedToClientId,
                ...req.firmQuery
            },
            {
                $inc: { balance: amount },
                $set: { lastTransactionDate: new Date() }
            },
            { new: true, session }
        );

        if (!updatedToBalance) {
            // Rollback source balance
            await ClientTrustBalance.findOneAndUpdate(
                {
                    trustAccountId: sanitizedAccountId,
                    clientId: sanitizedFromClientId,
                    ...req.firmQuery
                },
                {
                    $inc: { balance: amount },
                    $set: { lastTransactionDate: new Date() }
                },
                { session }
            );
            throw CustomException('فشل تحديث رصيد العميل المستقبل', 500);
        }

        const toBalanceAfter = updatedToBalance.balance;

        // Generate transaction numbers
        const transactionCount = await TrustTransaction.countDocuments({ ...req.firmQuery });
        const outNumber = `TT-${new Date().getFullYear()}-${String(transactionCount + 1).padStart(6, '0')}`;
        const inNumber = `TT-${new Date().getFullYear()}-${String(transactionCount + 2).padStart(6, '0')}`;

        // SECURITY FIX: Use req.addFirmId for proper tenant context
        // Create transfer out transaction with sanitized description
        const outTransactionData = req.addFirmId({
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedFromClientId,
            transactionNumber: outNumber,
            type: 'transfer_out',
            amount,
            description: sanitizeString(safeBody.description || `تحويل إلى عميل آخر`),
            reference: inNumber,
            clientBalanceBefore: fromBalanceBefore,
            clientBalanceAfter: fromBalanceAfter,
            status: 'completed',
            createdBy: req.userID
        });
        await TrustTransaction.create([outTransactionData], { session });

        // Create transfer in transaction with sanitized description
        const inTransactionData = req.addFirmId({
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedToClientId,
            transactionNumber: inNumber,
            type: 'transfer_in',
            amount,
            description: sanitizeString(safeBody.description || `تحويل من عميل آخر`),
            reference: outNumber,
            clientBalanceBefore: toBalanceBefore,
            clientBalanceAfter: toBalanceAfter,
            status: 'completed',
            createdBy: req.userID
        });
        await TrustTransaction.create([inTransactionData], { session });

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'تم التحويل بنجاح'
        });
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ==================== Reconciliation ====================

/**
 * Create bank reconciliation
 * POST /api/trust-accounts/:id/reconciliations
 * SECURITY: IDOR protection, mass assignment, amount validation
 */
const createReconciliation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // Mass assignment protection
    const safeBody = pickAllowedFields(req.body, RECONCILIATION_CREATE_FIELDS);
    const { bankStatementBalance, statementDate, adjustments, notes } = safeBody;

    // Validate required fields
    if (bankStatementBalance === undefined || !statementDate) {
        throw CustomException('رصيد كشف البنك وتاريخ الكشف مطلوبان', 400);
    }

    // Validate amount
    const validatedBalance = validateAmount(bankStatementBalance);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    const account = await TrustAccount.findOne({ _id: sanitizedId, ...req.firmQuery });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
    }

    // Validate and sanitize adjustments if provided
    let validatedAdjustments = [];
    if (adjustments && Array.isArray(adjustments)) {
        validatedAdjustments = adjustments.map(adj => {
            const amount = validateAmount(adj.amount);
            return {
                description: sanitizeString(adj.description || ''),
                amount
            };
        });
    }

    // Calculate book balance
    const bookBalance = account.balance;
    const adjustedBalance = bookBalance + (validatedAdjustments.reduce((sum, a) => sum + a.amount, 0) || 0);
    const difference = validatedBalance - adjustedBalance;

    // SECURITY FIX: Use req.addFirmId for proper tenant context
    const reconciliation = await TrustReconciliation.create(req.addFirmId({
        trustAccountId: sanitizedId,
        statementDate: new Date(statementDate),
        bankStatementBalance: validatedBalance,
        bookBalance,
        adjustments: validatedAdjustments,
        difference,
        status: Math.abs(difference) < 0.01 ? 'balanced' : 'pending',
        notes: sanitizeString(notes || ''),
        createdBy: req.userID
    }));

    res.status(201).json({
        success: true,
        message: Math.abs(difference) < 0.01 ? 'التسوية متطابقة' : 'يوجد فرق في التسوية',
        data: reconciliation
    });
});

/**
 * Get reconciliations
 * GET /api/trust-accounts/:id/reconciliations
 * SECURITY: IDOR protection, ID validation
 */
const getReconciliations = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedId, req.firmQuery);

    const query = { ...req.firmQuery, trustAccountId: sanitizedId };
    if (status) query.status = status;

    const reconciliations = await TrustReconciliation.find(query)
        .sort({ statementDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await TrustReconciliation.countDocuments(query);

    res.status(200).json({
        success: true,
        data: reconciliations,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Create three-way reconciliation
 * POST /api/trust-accounts/:id/three-way-reconciliation
 * SECURITY: IDOR protection, mass assignment, amount validation
 */
const createThreeWayReconciliation = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // Mass assignment protection
    const safeBody = pickAllowedFields(req.body, THREE_WAY_RECONCILIATION_FIELDS);
    const { bankStatementBalance, statementDate, notes } = safeBody;

    // Validate required fields
    if (bankStatementBalance === undefined || !statementDate) {
        throw CustomException('رصيد كشف البنك وتاريخ الكشف مطلوبان', 400);
    }

    // Validate amount
    const validatedBalance = validateAmount(bankStatementBalance);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    const account = await TrustAccount.findOne({ _id: sanitizedId, ...req.firmQuery });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
    }

    // Get all client balances for this account
    const clientBalances = await ClientTrustBalance.find({
        trustAccountId: sanitizedId,
        ...req.firmQuery
    }).populate('clientId', 'firstName lastName companyName');

    const clientLedgerTotal = clientBalances.reduce((sum, cb) => sum + cb.balance, 0);
    const bookBalance = account.balance;

    // Calculate differences
    const bankToBook = validatedBalance - bookBalance;
    const bookToClient = bookBalance - clientLedgerTotal;
    const bankToClient = validatedBalance - clientLedgerTotal;

    const isBalanced = Math.abs(bankToBook) < 0.01 &&
        Math.abs(bookToClient) < 0.01 &&
        Math.abs(bankToClient) < 0.01;

    // SECURITY FIX: Use req.addFirmId for proper tenant context
    const reconciliation = await ThreeWayReconciliation.create(req.addFirmId({
        trustAccountId: sanitizedId,
        reconciliationDate: new Date(statementDate),
        bankStatementBalance: validatedBalance,
        bookBalance,
        clientLedgerTotal,
        clientBalances: clientBalances.map(cb => ({
            clientId: cb.clientId._id,
            balance: cb.balance
        })),
        differences: {
            bankToBook,
            bookToClient,
            bankToClient
        },
        status: isBalanced ? 'balanced' : 'discrepancy',
        notes: sanitizeString(notes || ''),
        createdBy: req.userID
    }));

    res.status(201).json({
        success: true,
        message: isBalanced ? 'التسوية الثلاثية متطابقة' : 'يوجد فروقات في التسوية الثلاثية',
        data: reconciliation
    });
});

/**
 * Get three-way reconciliations
 * GET /api/trust-accounts/:id/three-way-reconciliations
 * SECURITY: IDOR protection, ID validation
 */
const getThreeWayReconciliations = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedId, req.firmQuery);

    const reconciliations = await ThreeWayReconciliation.find({
        ...req.firmQuery,
        trustAccountId: sanitizedId
    })
        .sort({ reconciliationDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ThreeWayReconciliation.countDocuments({
        ...req.firmQuery,
        trustAccountId: sanitizedId
    });

    res.status(200).json({
        success: true,
        data: reconciliations,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get trust account summary/dashboard
 * GET /api/trust-accounts/:id/summary
 * SECURITY: IDOR protection, ID validation
 */
const getAccountSummary = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    // IDOR protection - verify account ownership
    const account = await TrustAccount.findOne({ _id: sanitizedId, ...req.firmQuery });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
    }

    // Get client count and total with ownership filter
    const clientBalances = await ClientTrustBalance.find({
        ...req.firmQuery,
        trustAccountId: sanitizedId
    });
    const activeClients = clientBalances.filter(cb => cb.balance > 0).length;
    const totalClientBalance = clientBalances.reduce((sum, cb) => sum + cb.balance, 0);

    // Get recent transactions with ownership filter
    const recentTransactions = await TrustTransaction.find({
        ...req.firmQuery,
        trustAccountId: sanitizedId
    })
        .populate('clientId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5);

    // Get last reconciliation with ownership filter
    const lastReconciliation = await TrustReconciliation.findOne({
        ...req.firmQuery,
        trustAccountId: sanitizedId
    })
        .sort({ statementDate: -1 });

    // Transaction summary for the month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Build aggregation match with proper tenant isolation
    const aggregateMatch = {
        trustAccountId: new mongoose.Types.ObjectId(sanitizedId),
        createdAt: { $gte: startOfMonth },
        status: 'completed'
    };
    // SECURITY FIX: Add tenant filter to aggregation
    if (req.firmQuery.firmId) {
        aggregateMatch.firmId = new mongoose.Types.ObjectId(req.firmQuery.firmId);
    } else if (req.firmQuery.lawyerId) {
        aggregateMatch.lawyerId = new mongoose.Types.ObjectId(req.firmQuery.lawyerId);
    }

    const monthlyStats = await TrustTransaction.aggregate([
        { $match: aggregateMatch },
        {
            $group: {
                _id: '$type',
                total: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: {
            account: {
                name: account.name,
                accountNumber: account.accountNumber,
                bankName: account.bankName,
                balance: account.balance
            },
            clients: {
                total: clientBalances.length,
                active: activeClients,
                totalBalance: totalClientBalance
            },
            reconciliation: {
                lastDate: lastReconciliation?.statementDate,
                status: lastReconciliation?.status,
                difference: lastReconciliation?.difference
            },
            monthlyActivity: monthlyStats,
            recentTransactions
        }
    });
});

module.exports = {
    // Trust Account
    createTrustAccount,
    getTrustAccounts,
    getTrustAccount,
    updateTrustAccount,
    deleteTrustAccount,
    // Transactions
    createTransaction,
    getTransactions,
    getTransaction,
    voidTransaction,
    // Client Balances
    getClientBalances,
    getClientBalance,
    transferBetweenClients,
    // Reconciliation
    createReconciliation,
    getReconciliations,
    createThreeWayReconciliation,
    getThreeWayReconciliations,
    // Summary
    getAccountSummary
};
