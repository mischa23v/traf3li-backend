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
 */
const verifyIDORTrustAccount = async (accountId, lawyerId) => {
    const account = await TrustAccount.findOne({ _id: accountId, lawyerId });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
    }
    return account;
};

/**
 * Verify IDOR - Check if client belongs to current lawyer
 */
const verifyIDORClient = async (clientId, lawyerId) => {
    const client = await Client.findOne({ _id: clientId, lawyerId });
    if (!client) {
        throw CustomException('العميل غير موجود أو ليس لديك صلاحية', 404);
    }
    return client;
};

/**
 * Verify IDOR - Check if case belongs to current lawyer
 */
const verifyIDORCase = async (caseId, lawyerId) => {
    const caseRecord = await Case.findOne({ _id: caseId, lawyerId });
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
    const lawyerId = req.userID;

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

    // Check for duplicate account number
    const existing = await TrustAccount.findOne({
        lawyerId,
        accountNumber: sanitizedAccountNumber
    });
    if (existing) {
        throw CustomException('رقم الحساب موجود بالفعل', 400);
    }

    // If setting as default, remove default from others
    if (safeBody.isDefault) {
        await TrustAccount.updateMany({ lawyerId }, { isDefault: false });
    }

    const trustAccount = await TrustAccount.create({
        lawyerId,
        name: sanitizedName,
        nameAr: sanitizeString(safeBody.nameAr || ''),
        accountNumber: sanitizedAccountNumber,
        bankName: sanitizedBankName,
        bankBranch: sanitizeString(safeBody.bankBranch || ''),
        currency: safeBody.currency || 'SAR',
        description: sanitizeString(safeBody.description || ''),
        isDefault: safeBody.isDefault || false,
        balance: 0
    });

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
    const lawyerId = req.userID;

    const query = { lawyerId };
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
    const lawyerId = req.userID;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // IDOR protection - verify account ownership
    const account = await TrustAccount.findOne({ _id: sanitizedId, lawyerId });

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
    const lawyerId = req.userID;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // IDOR protection - verify account ownership
    const account = await verifyIDORTrustAccount(sanitizedId, lawyerId);

    // Mass assignment protection - only allow specific fields
    const safeBody = pickAllowedFields(req.body, TRUST_ACCOUNT_UPDATE_FIELDS);

    // If setting as default, remove default from others
    if (safeBody.isDefault && !account.isDefault) {
        await TrustAccount.updateMany(
            { lawyerId, _id: { $ne: sanitizedId } },
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
    const lawyerId = req.userID;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // IDOR protection - verify account ownership
    const account = await verifyIDORTrustAccount(sanitizedId, lawyerId);

    if (account.balance !== 0) {
        throw CustomException('لا يمكن حذف حساب به رصيد', 400);
    }

    // Check for transactions
    const hasTransactions = await TrustTransaction.exists({ trustAccountId: sanitizedId });
    if (hasTransactions) {
        throw CustomException('لا يمكن حذف حساب به معاملات', 400);
    }

    await TrustAccount.findByIdAndDelete(sanitizedId);

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
    const lawyerId = req.userID;

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
        // IDOR check - verify account ownership
        const account = await TrustAccount.findOne({
            _id: sanitizedAccountId,
            lawyerId
        }).session(session);

        if (!account) {
            throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
        }

        // IDOR check - verify client ownership
        const client = await Client.findOne({
            _id: sanitizedClientId,
            lawyerId
        }).session(session);

        if (!client) {
            throw CustomException('العميل غير موجود أو ليس لديك صلاحية', 404);
        }

        // IDOR check - verify case ownership if provided
        if (sanitizedCaseId) {
            const caseRecord = await Case.findOne({
                _id: sanitizedCaseId,
                lawyerId
            }).session(session);

            if (!caseRecord) {
                throw CustomException('القضية غير موجودة أو ليس لديك صلاحية', 404);
            }
        }

        // Get or create client trust balance with race condition protection (locked by session)
        let clientBalance = await ClientTrustBalance.findOne({
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedClientId,
            lawyerId
        }).session(session);

        if (!clientBalance) {
            clientBalance = await ClientTrustBalance.create([{
                lawyerId,
                trustAccountId: sanitizedAccountId,
                clientId: sanitizedClientId,
                balance: 0
            }], { session });
            clientBalance = clientBalance[0];
        }

        // Validate withdrawal - check balance before debit
        if (type === 'withdrawal' || type === 'disbursement') {
            if (clientBalance.balance < amount) {
                throw CustomException('رصيد العميل غير كافٍ للسحب', 400);
            }
        }

        // Calculate new balances
        const isDebit = ['withdrawal', 'disbursement', 'transfer_out'].includes(type);
        const balanceChange = isDebit ? -amount : amount;

        const newAccountBalance = account.balance + balanceChange;
        const newClientBalance = clientBalance.balance + balanceChange;

        // Generate transaction number
        const transactionCount = await TrustTransaction.countDocuments({ lawyerId });
        const transactionNumber = `TT-${new Date().getFullYear()}-${String(transactionCount + 1).padStart(6, '0')}`;

        // Create transaction with sanitized inputs
        const transaction = await TrustTransaction.create([{
            lawyerId,
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
            balanceBefore: account.balance,
            balanceAfter: newAccountBalance,
            clientBalanceBefore: clientBalance.balance,
            clientBalanceAfter: newClientBalance,
            status: 'completed',
            createdBy: lawyerId
        }], { session });

        // Update account balance (race condition protected by transaction)
        account.balance = newAccountBalance;
        await account.save({ session });

        // Update client balance
        clientBalance.balance = newClientBalance;
        clientBalance.lastTransactionDate = new Date();
        await clientBalance.save({ session });

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
    const lawyerId = req.userID;

    // Validate and sanitize account ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedId, lawyerId);

    const query = { lawyerId, trustAccountId: sanitizedId };

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
    const lawyerId = req.userID;

    // Validate and sanitize IDs
    const sanitizedAccountId = sanitizeObjectId(id);
    if (!sanitizedAccountId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    const sanitizedTransactionId = sanitizeObjectId(transactionId);
    if (!sanitizedTransactionId) {
        throw CustomException('معرف المعاملة غير صحيح', 400);
    }

    // IDOR protection - verify account ownership first
    await verifyIDORTrustAccount(sanitizedAccountId, lawyerId);

    // IDOR protection - verify transaction belongs to user and account
    const transaction = await TrustTransaction.findOne({
        _id: sanitizedTransactionId,
        trustAccountId: sanitizedAccountId,
        lawyerId
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
    const lawyerId = req.userID;

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
        // IDOR check - verify transaction belongs to user
        const transaction = await TrustTransaction.findOne({
            _id: sanitizedTransactionId,
            trustAccountId: sanitizedAccountId,
            lawyerId
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
            lawyerId
        }).session(session);

        if (!account) {
            throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
        }

        // Get client balance with race condition protection
        const clientBalance = await ClientTrustBalance.findOne({
            trustAccountId: sanitizedAccountId,
            clientId: transaction.clientId,
            lawyerId
        }).session(session);

        // Reverse the balance changes
        const isDebit = ['withdrawal', 'disbursement', 'transfer_out'].includes(transaction.type);
        const reverseChange = isDebit ? transaction.amount : -transaction.amount;

        account.balance += reverseChange;
        await account.save({ session });

        if (clientBalance) {
            clientBalance.balance += reverseChange;
            clientBalance.lastTransactionDate = new Date();
            await clientBalance.save({ session });
        }

        // Update transaction status
        transaction.status = 'voided';
        transaction.voidedAt = new Date();
        transaction.voidedBy = lawyerId;
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
    const lawyerId = req.userID;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedId, lawyerId);

    const balances = await ClientTrustBalance.find({
        lawyerId,
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
    const lawyerId = req.userID;

    // Validate and sanitize IDs
    const sanitizedAccountId = sanitizeObjectId(id);
    if (!sanitizedAccountId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    const sanitizedClientId = sanitizeObjectId(clientId);
    if (!sanitizedClientId) {
        throw CustomException('معرف العميل غير صحيح', 400);
    }

    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedAccountId, lawyerId);

    // IDOR protection - verify client ownership
    const client = await Client.findOne({
        _id: sanitizedClientId,
        lawyerId
    });

    if (!client) {
        throw CustomException('العميل غير موجود أو ليس لديك صلاحية', 404);
    }

    const balance = await ClientTrustBalance.findOne({
        lawyerId,
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
        lawyerId,
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
    const lawyerId = req.userID;

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
        // IDOR check - verify account ownership
        const account = await TrustAccount.findOne({
            _id: sanitizedAccountId,
            lawyerId
        }).session(session);

        if (!account) {
            throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
        }

        // IDOR check - verify source client ownership
        const fromClient = await Client.findOne({
            _id: sanitizedFromClientId,
            lawyerId
        }).session(session);

        if (!fromClient) {
            throw CustomException('العميل المصدر غير موجود أو ليس لديك صلاحية', 404);
        }

        // IDOR check - verify destination client ownership
        const toClient = await Client.findOne({
            _id: sanitizedToClientId,
            lawyerId
        }).session(session);

        if (!toClient) {
            throw CustomException('العميل المستقبل غير موجود أو ليس لديك صلاحية', 404);
        }

        // Get source client balance with race condition protection
        const fromBalance = await ClientTrustBalance.findOne({
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedFromClientId,
            lawyerId
        }).session(session);

        if (!fromBalance || fromBalance.balance < amount) {
            throw CustomException('رصيد العميل المصدر غير كافٍ للتحويل', 400);
        }

        // Get or create destination client balance with race condition protection
        let toBalance = await ClientTrustBalance.findOne({
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedToClientId,
            lawyerId
        }).session(session);

        if (!toBalance) {
            toBalance = await ClientTrustBalance.create([{
                lawyerId,
                trustAccountId: sanitizedAccountId,
                clientId: sanitizedToClientId,
                balance: 0
            }], { session });
            toBalance = toBalance[0];
        }

        // Generate transaction numbers
        const transactionCount = await TrustTransaction.countDocuments({ lawyerId });
        const outNumber = `TT-${new Date().getFullYear()}-${String(transactionCount + 1).padStart(6, '0')}`;
        const inNumber = `TT-${new Date().getFullYear()}-${String(transactionCount + 2).padStart(6, '0')}`;

        // Create transfer out transaction with sanitized description
        await TrustTransaction.create([{
            lawyerId,
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedFromClientId,
            transactionNumber: outNumber,
            type: 'transfer_out',
            amount,
            description: sanitizeString(safeBody.description || `تحويل إلى عميل آخر`),
            reference: inNumber,
            clientBalanceBefore: fromBalance.balance,
            clientBalanceAfter: fromBalance.balance - amount,
            status: 'completed',
            createdBy: lawyerId
        }], { session });

        // Create transfer in transaction with sanitized description
        await TrustTransaction.create([{
            lawyerId,
            trustAccountId: sanitizedAccountId,
            clientId: sanitizedToClientId,
            transactionNumber: inNumber,
            type: 'transfer_in',
            amount,
            description: sanitizeString(safeBody.description || `تحويل من عميل آخر`),
            reference: outNumber,
            clientBalanceBefore: toBalance.balance,
            clientBalanceAfter: toBalance.balance + amount,
            status: 'completed',
            createdBy: lawyerId
        }], { session });

        // Update source balance (race condition protected by transaction)
        fromBalance.balance -= amount;
        fromBalance.lastTransactionDate = new Date();
        await fromBalance.save({ session });

        // Update destination balance
        toBalance.balance += amount;
        toBalance.lastTransactionDate = new Date();
        await toBalance.save({ session });

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
    const lawyerId = req.userID;

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

    // IDOR protection - verify account ownership
    const account = await TrustAccount.findOne({ _id: sanitizedId, lawyerId });
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

    const reconciliation = await TrustReconciliation.create({
        lawyerId,
        trustAccountId: sanitizedId,
        statementDate: new Date(statementDate),
        bankStatementBalance: validatedBalance,
        bookBalance,
        adjustments: validatedAdjustments,
        difference,
        status: Math.abs(difference) < 0.01 ? 'balanced' : 'pending',
        notes: sanitizeString(notes || ''),
        createdBy: lawyerId
    });

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
    const lawyerId = req.userID;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedId, lawyerId);

    const query = { lawyerId, trustAccountId: sanitizedId };
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
    const lawyerId = req.userID;

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

    // IDOR protection - verify account ownership
    const account = await TrustAccount.findOne({ _id: sanitizedId, lawyerId });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
    }

    // Get all client balances for this account
    const clientBalances = await ClientTrustBalance.find({
        trustAccountId: sanitizedId,
        lawyerId
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

    const reconciliation = await ThreeWayReconciliation.create({
        lawyerId,
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
        createdBy: lawyerId
    });

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
    const lawyerId = req.userID;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // IDOR protection - verify account ownership
    await verifyIDORTrustAccount(sanitizedId, lawyerId);

    const reconciliations = await ThreeWayReconciliation.find({
        lawyerId,
        trustAccountId: sanitizedId
    })
        .sort({ reconciliationDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ThreeWayReconciliation.countDocuments({
        lawyerId,
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
    const lawyerId = req.userID;

    // Validate and sanitize ID
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صحيح', 400);
    }

    // IDOR protection - verify account ownership
    const account = await TrustAccount.findOne({ _id: sanitizedId, lawyerId });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود أو ليس لديك صلاحية', 404);
    }

    // Get client count and total with ownership filter
    const clientBalances = await ClientTrustBalance.find({
        lawyerId,
        trustAccountId: sanitizedId
    });
    const activeClients = clientBalances.filter(cb => cb.balance > 0).length;
    const totalClientBalance = clientBalances.reduce((sum, cb) => sum + cb.balance, 0);

    // Get recent transactions with ownership filter
    const recentTransactions = await TrustTransaction.find({
        lawyerId,
        trustAccountId: sanitizedId
    })
        .populate('clientId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5);

    // Get last reconciliation with ownership filter
    const lastReconciliation = await TrustReconciliation.findOne({
        lawyerId,
        trustAccountId: sanitizedId
    })
        .sort({ statementDate: -1 });

    // Transaction summary for the month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await TrustTransaction.aggregate([
        {
            $match: {
                lawyerId: new mongoose.Types.ObjectId(lawyerId),
                trustAccountId: new mongoose.Types.ObjectId(sanitizedId),
                createdAt: { $gte: startOfMonth },
                status: 'completed'
            }
        },
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
