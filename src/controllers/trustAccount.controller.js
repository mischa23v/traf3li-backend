const {
    TrustAccount, ClientTrustBalance, TrustTransaction,
    TrustReconciliation, ThreeWayReconciliation, Client, Case
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');

// ==================== Trust Account Management ====================

/**
 * Create trust account
 * POST /api/trust-accounts
 */
const createTrustAccount = asyncHandler(async (req, res) => {
    const {
        name, nameAr, accountNumber, bankName, bankBranch,
        currency, description, isDefault
    } = req.body;
    const lawyerId = req.userID;

    if (!name || !accountNumber || !bankName) {
        throw CustomException('الاسم ورقم الحساب واسم البنك مطلوبة', 400);
    }

    // Check for duplicate account number
    const existing = await TrustAccount.findOne({ lawyerId, accountNumber });
    if (existing) {
        throw CustomException('رقم الحساب موجود بالفعل', 400);
    }

    // If setting as default, remove default from others
    if (isDefault) {
        await TrustAccount.updateMany({ lawyerId }, { isDefault: false });
    }

    const trustAccount = await TrustAccount.create({
        lawyerId,
        name,
        nameAr,
        accountNumber,
        bankName,
        bankBranch,
        currency: currency || 'SAR',
        description,
        isDefault: isDefault || false,
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
 */
const getTrustAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const account = await TrustAccount.findOne({ _id: id, lawyerId });

    if (!account) {
        throw CustomException('حساب الأمانات غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: account
    });
});

/**
 * Update trust account
 * PATCH /api/trust-accounts/:id
 */
const updateTrustAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const account = await TrustAccount.findOne({ _id: id, lawyerId });

    if (!account) {
        throw CustomException('حساب الأمانات غير موجود', 404);
    }

    // If setting as default, remove default from others
    if (req.body.isDefault && !account.isDefault) {
        await TrustAccount.updateMany(
            { lawyerId, _id: { $ne: id } },
            { isDefault: false }
        );
    }

    const allowedFields = ['name', 'nameAr', 'bankName', 'bankBranch', 'currency', 'description', 'isDefault', 'isActive'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            account[field] = req.body[field];
        }
    });

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
 */
const deleteTrustAccount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const account = await TrustAccount.findOne({ _id: id, lawyerId });

    if (!account) {
        throw CustomException('حساب الأمانات غير موجود', 404);
    }

    if (account.balance !== 0) {
        throw CustomException('لا يمكن حذف حساب به رصيد', 400);
    }

    // Check for transactions
    const hasTransactions = await TrustTransaction.exists({ trustAccountId: id });
    if (hasTransactions) {
        throw CustomException('لا يمكن حذف حساب به معاملات', 400);
    }

    await TrustAccount.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف حساب الأمانات بنجاح'
    });
});

// ==================== Trust Transactions ====================

/**
 * Create trust transaction (deposit/withdrawal)
 * POST /api/trust-accounts/:id/transactions
 */
const createTransaction = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
        type, clientId, caseId, amount, description,
        reference, paymentMethod, checkNumber
    } = req.body;
    const lawyerId = req.userID;

    if (!type || !clientId || !amount) {
        throw CustomException('نوع المعاملة والعميل والمبلغ مطلوبة', 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const account = await TrustAccount.findOne({ _id: id, lawyerId }).session(session);
        if (!account) {
            throw CustomException('حساب الأمانات غير موجود', 404);
        }

        // Get or create client trust balance
        let clientBalance = await ClientTrustBalance.findOne({
            trustAccountId: id,
            clientId
        }).session(session);

        if (!clientBalance) {
            clientBalance = await ClientTrustBalance.create([{
                lawyerId,
                trustAccountId: id,
                clientId,
                balance: 0
            }], { session });
            clientBalance = clientBalance[0];
        }

        // Validate withdrawal
        if (type === 'withdrawal' || type === 'disbursement') {
            if (clientBalance.balance < amount) {
                throw CustomException('رصيد العميل غير كافٍ', 400);
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

        // Create transaction
        const transaction = await TrustTransaction.create([{
            lawyerId,
            trustAccountId: id,
            clientId,
            caseId,
            transactionNumber,
            type,
            amount,
            description,
            reference,
            paymentMethod,
            checkNumber,
            balanceBefore: account.balance,
            balanceAfter: newAccountBalance,
            clientBalanceBefore: clientBalance.balance,
            clientBalanceAfter: newClientBalance,
            status: 'completed',
            createdBy: lawyerId
        }], { session });

        // Update balances
        account.balance = newAccountBalance;
        await account.save({ session });

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
 */
const getTransactions = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { clientId, type, startDate, endDate, page = 1, limit = 50 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId, trustAccountId: id };
    if (clientId) query.clientId = clientId;
    if (type) query.type = type;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
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
 */
const getTransaction = asyncHandler(async (req, res) => {
    const { id, transactionId } = req.params;
    const lawyerId = req.userID;

    const transaction = await TrustTransaction.findOne({
        _id: transactionId,
        trustAccountId: id,
        lawyerId
    })
        .populate('clientId', 'firstName lastName companyName email')
        .populate('caseId', 'title caseNumber');

    if (!transaction) {
        throw CustomException('المعاملة غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        data: transaction
    });
});

/**
 * Void transaction
 * POST /api/trust-accounts/:id/transactions/:transactionId/void
 */
const voidTransaction = asyncHandler(async (req, res) => {
    const { id, transactionId } = req.params;
    const { reason } = req.body;
    const lawyerId = req.userID;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transaction = await TrustTransaction.findOne({
            _id: transactionId,
            trustAccountId: id,
            lawyerId
        }).session(session);

        if (!transaction) {
            throw CustomException('المعاملة غير موجودة', 404);
        }

        if (transaction.status === 'voided') {
            throw CustomException('المعاملة ملغاة بالفعل', 400);
        }

        // Reverse the balance changes
        const account = await TrustAccount.findById(id).session(session);
        const clientBalance = await ClientTrustBalance.findOne({
            trustAccountId: id,
            clientId: transaction.clientId
        }).session(session);

        const isDebit = ['withdrawal', 'disbursement', 'transfer_out'].includes(transaction.type);
        const reverseChange = isDebit ? transaction.amount : -transaction.amount;

        account.balance += reverseChange;
        await account.save({ session });

        if (clientBalance) {
            clientBalance.balance += reverseChange;
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
 */
const getClientBalances = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const balances = await ClientTrustBalance.find({
        lawyerId,
        trustAccountId: id
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
 */
const getClientBalance = asyncHandler(async (req, res) => {
    const { id, clientId } = req.params;
    const lawyerId = req.userID;

    const balance = await ClientTrustBalance.findOne({
        lawyerId,
        trustAccountId: id,
        clientId
    }).populate('clientId', 'firstName lastName companyName email phone');

    if (!balance) {
        // Return zero balance if no record exists
        const client = await Client.findById(clientId);
        return res.status(200).json({
            success: true,
            data: {
                clientId,
                client,
                balance: 0,
                transactions: []
            }
        });
    }

    // Get recent transactions
    const transactions = await TrustTransaction.find({
        lawyerId,
        trustAccountId: id,
        clientId
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
 */
const transferBetweenClients = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { fromClientId, toClientId, amount, description } = req.body;
    const lawyerId = req.userID;

    if (!fromClientId || !toClientId || !amount) {
        throw CustomException('العميل المصدر والمستلم والمبلغ مطلوبة', 400);
    }

    if (fromClientId === toClientId) {
        throw CustomException('لا يمكن التحويل لنفس العميل', 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get source client balance
        const fromBalance = await ClientTrustBalance.findOne({
            trustAccountId: id,
            clientId: fromClientId
        }).session(session);

        if (!fromBalance || fromBalance.balance < amount) {
            throw CustomException('رصيد العميل المصدر غير كافٍ', 400);
        }

        // Get or create destination client balance
        let toBalance = await ClientTrustBalance.findOne({
            trustAccountId: id,
            clientId: toClientId
        }).session(session);

        if (!toBalance) {
            toBalance = await ClientTrustBalance.create([{
                lawyerId,
                trustAccountId: id,
                clientId: toClientId,
                balance: 0
            }], { session });
            toBalance = toBalance[0];
        }

        // Generate transaction numbers
        const transactionCount = await TrustTransaction.countDocuments({ lawyerId });
        const outNumber = `TT-${new Date().getFullYear()}-${String(transactionCount + 1).padStart(6, '0')}`;
        const inNumber = `TT-${new Date().getFullYear()}-${String(transactionCount + 2).padStart(6, '0')}`;

        // Create transfer out transaction
        await TrustTransaction.create([{
            lawyerId,
            trustAccountId: id,
            clientId: fromClientId,
            transactionNumber: outNumber,
            type: 'transfer_out',
            amount,
            description: description || `تحويل إلى عميل آخر`,
            reference: inNumber,
            clientBalanceBefore: fromBalance.balance,
            clientBalanceAfter: fromBalance.balance - amount,
            status: 'completed',
            createdBy: lawyerId
        }], { session });

        // Create transfer in transaction
        await TrustTransaction.create([{
            lawyerId,
            trustAccountId: id,
            clientId: toClientId,
            transactionNumber: inNumber,
            type: 'transfer_in',
            amount,
            description: description || `تحويل من عميل آخر`,
            reference: outNumber,
            clientBalanceBefore: toBalance.balance,
            clientBalanceAfter: toBalance.balance + amount,
            status: 'completed',
            createdBy: lawyerId
        }], { session });

        // Update balances
        fromBalance.balance -= amount;
        fromBalance.lastTransactionDate = new Date();
        await fromBalance.save({ session });

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
 */
const createReconciliation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { bankStatementBalance, statementDate, adjustments, notes } = req.body;
    const lawyerId = req.userID;

    if (bankStatementBalance === undefined || !statementDate) {
        throw CustomException('رصيد كشف البنك وتاريخ الكشف مطلوبان', 400);
    }

    const account = await TrustAccount.findOne({ _id: id, lawyerId });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود', 404);
    }

    // Calculate book balance
    const bookBalance = account.balance;
    const adjustedBalance = bookBalance + (adjustments?.reduce((sum, a) => sum + a.amount, 0) || 0);
    const difference = bankStatementBalance - adjustedBalance;

    const reconciliation = await TrustReconciliation.create({
        lawyerId,
        trustAccountId: id,
        statementDate: new Date(statementDate),
        bankStatementBalance,
        bookBalance,
        adjustments: adjustments || [],
        difference,
        status: Math.abs(difference) < 0.01 ? 'balanced' : 'pending',
        notes,
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: difference === 0 ? 'التسوية متطابقة' : 'يوجد فرق في التسوية',
        data: reconciliation
    });
});

/**
 * Get reconciliations
 * GET /api/trust-accounts/:id/reconciliations
 */
const getReconciliations = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId, trustAccountId: id };
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
 */
const createThreeWayReconciliation = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { bankStatementBalance, statementDate, notes } = req.body;
    const lawyerId = req.userID;

    const account = await TrustAccount.findOne({ _id: id, lawyerId });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود', 404);
    }

    // Get all client balances
    const clientBalances = await ClientTrustBalance.find({
        trustAccountId: id
    }).populate('clientId', 'firstName lastName companyName');

    const clientLedgerTotal = clientBalances.reduce((sum, cb) => sum + cb.balance, 0);
    const bookBalance = account.balance;

    // Calculate differences
    const bankToBook = bankStatementBalance - bookBalance;
    const bookToClient = bookBalance - clientLedgerTotal;
    const bankToClient = bankStatementBalance - clientLedgerTotal;

    const isBalanced = Math.abs(bankToBook) < 0.01 &&
        Math.abs(bookToClient) < 0.01 &&
        Math.abs(bankToClient) < 0.01;

    const reconciliation = await ThreeWayReconciliation.create({
        lawyerId,
        trustAccountId: id,
        reconciliationDate: new Date(statementDate),
        bankStatementBalance,
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
        notes,
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
 */
const getThreeWayReconciliations = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const lawyerId = req.userID;

    const reconciliations = await ThreeWayReconciliation.find({
        lawyerId,
        trustAccountId: id
    })
        .sort({ reconciliationDate: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ThreeWayReconciliation.countDocuments({
        lawyerId,
        trustAccountId: id
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
 */
const getAccountSummary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const account = await TrustAccount.findOne({ _id: id, lawyerId });
    if (!account) {
        throw CustomException('حساب الأمانات غير موجود', 404);
    }

    // Get client count and total
    const clientBalances = await ClientTrustBalance.find({ trustAccountId: id });
    const activeClients = clientBalances.filter(cb => cb.balance > 0).length;
    const totalClientBalance = clientBalances.reduce((sum, cb) => sum + cb.balance, 0);

    // Get recent transactions
    const recentTransactions = await TrustTransaction.find({ trustAccountId: id })
        .populate('clientId', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(5);

    // Get last reconciliation
    const lastReconciliation = await TrustReconciliation.findOne({ trustAccountId: id })
        .sort({ statementDate: -1 });

    // Transaction summary for the month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await TrustTransaction.aggregate([
        {
            $match: {
                trustAccountId: new mongoose.Types.ObjectId(id),
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
