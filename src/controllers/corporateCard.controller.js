/**
 * Corporate Card Controller
 *
 * Handles corporate card management, transaction import, and reconciliation
 */

const CorporateCard = require('../models/corporateCard.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Get all corporate cards
 */
const getCorporateCards = asyncHandler(async (req, res) => {
    const { status, cardHolderId, cardType, page = 1, limit = 20 } = req.query;

    const query = { ...req.firmQuery };
    if (status) query.status = status;
    if (cardHolderId) query.cardHolderId = cardHolderId;
    if (cardType) query.cardType = cardType;

    const total = await CorporateCard.countDocuments(query);
    const cards = await CorporateCard.find(query)
        .select('-transactions') // Exclude transactions for list view
        .populate('cardHolderId', 'firstName lastName email')
        .populate('linkedBankAccountId', 'bankName accountNumber')
        .populate('expensePolicyId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit, 10));

    res.json({
        success: true,
        data: {
            cards,
            pagination: {
                total,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                totalPages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Get single corporate card
 */
const getCorporateCard = asyncHandler(async (req, res) => {
    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    })
        .select('-transactions') // Transactions fetched separately
        .populate('cardHolderId', 'firstName lastName email')
        .populate('linkedBankAccountId')
        .populate('linkedGLAccountId', 'code name')
        .populate('expensePolicyId');

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    res.json({
        success: true,
        data: card
    });
});

/**
 * Get card summary/stats
 */
const getSummary = asyncHandler(async (req, res) => {
    const summary = await CorporateCard.getSummary(req.firmId, req.firmId ? null : req.userID);

    res.json({
        success: true,
        data: summary
    });
});

/**
 * Create corporate card
 */
const createCorporateCard = asyncHandler(async (req, res) => {
    const {
        cardName, cardNameAr, cardType, cardBrand, cardNumber,
        issuingBank, issuingBankAr, cardHolderId, cardHolderName,
        creditLimit, dailyLimit, monthlyLimit, singleTransactionLimit,
        billingCycle, statementClosingDay,
        linkedBankAccountId, linkedGLAccountId, expensePolicyId,
        expiryDate, autoCategorization, alerts, notes
    } = req.body;

    // Validate card number (should be last 4 digits only)
    const last4 = cardNumber.slice(-4);

    // Check for duplicate
    const existing = await CorporateCard.findOne({
        ...req.firmQuery,
        cardNumber: { $regex: last4 + '$' }
    });

    if (existing) {
        throw CustomException('Card with these last 4 digits already exists', 400, {
            messageAr: 'يوجد بالفعل بطاقة بهذه الأرقام الأخيرة'
        });
    }

    const card = new CorporateCard({
        firmId: req.firmId,
        lawyerId: req.firmId ? null : req.userID,
        cardName,
        cardNameAr,
        cardType,
        cardBrand,
        cardNumber: last4, // Store only last 4 digits
        issuingBank,
        issuingBankAr,
        cardHolderId,
        cardHolderName,
        creditLimit,
        dailyLimit,
        monthlyLimit,
        singleTransactionLimit,
        availableCredit: creditLimit,
        billingCycle,
        statementClosingDay,
        linkedBankAccountId,
        linkedGLAccountId,
        expensePolicyId,
        expiryDate,
        autoCategorization,
        alerts,
        notes,
        activatedAt: new Date(),
        createdBy: req.userID
    });

    await card.save();

    res.status(201).json({
        success: true,
        data: card,
        message: 'Corporate card created',
        messageAr: 'تم إنشاء البطاقة'
    });
});

/**
 * Update corporate card
 */
const updateCorporateCard = asyncHandler(async (req, res) => {
    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    const allowedFields = [
        'cardName', 'cardNameAr', 'cardHolderId', 'cardHolderName',
        'creditLimit', 'dailyLimit', 'monthlyLimit', 'singleTransactionLimit',
        'billingCycle', 'statementClosingDay',
        'linkedBankAccountId', 'linkedGLAccountId', 'expensePolicyId',
        'expiryDate', 'autoCategorization', 'alerts', 'notes', 'internalNotes'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            card[field] = req.body[field];
        }
    });

    // Update available credit if credit limit changed
    if (req.body.creditLimit !== undefined) {
        card.availableCredit = req.body.creditLimit - card.currentBalance;
    }

    card.updatedBy = req.userID;
    await card.save();

    res.json({
        success: true,
        data: card,
        message: 'Corporate card updated',
        messageAr: 'تم تحديث البطاقة'
    });
});

/**
 * Delete corporate card
 */
const deleteCorporateCard = asyncHandler(async (req, res) => {
    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // Can only delete if no transactions
    if (card.transactions && card.transactions.length > 0) {
        throw CustomException('Cannot delete card with transactions', 400, {
            messageAr: 'لا يمكن حذف بطاقة بها معاملات'
        });
    }

    await card.deleteOne();

    res.json({
        success: true,
        message: 'Corporate card deleted',
        messageAr: 'تم حذف البطاقة'
    });
});

/**
 * Block corporate card
 */
const blockCard = asyncHandler(async (req, res) => {
    const { reason } = req.body;

    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    await card.block(req.userID, reason);

    res.json({
        success: true,
        data: card,
        message: 'Card blocked',
        messageAr: 'تم حظر البطاقة'
    });
});

/**
 * Unblock corporate card
 */
const unblockCard = asyncHandler(async (req, res) => {
    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    await card.unblock(req.userID);

    res.json({
        success: true,
        data: card,
        message: 'Card unblocked',
        messageAr: 'تم إلغاء حظر البطاقة'
    });
});

/**
 * Get card transactions
 */
const getTransactions = asyncHandler(async (req, res) => {
    const { status, startDate, endDate, category, page = 1, limit = 50 } = req.query;

    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // Filter transactions
    let transactions = card.transactions;

    if (status) {
        transactions = transactions.filter(t => t.status === status);
    }
    if (startDate) {
        const start = new Date(startDate);
        transactions = transactions.filter(t => new Date(t.transactionDate) >= start);
    }
    if (endDate) {
        const end = new Date(endDate);
        transactions = transactions.filter(t => new Date(t.transactionDate) <= end);
    }
    if (category) {
        transactions = transactions.filter(t => t.category === category);
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

    // Paginate
    const total = transactions.length;
    const startIndex = (page - 1) * limit;
    transactions = transactions.slice(startIndex, startIndex + parseInt(limit, 10));

    res.json({
        success: true,
        data: {
            transactions,
            pagination: {
                total,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
                totalPages: Math.ceil(total / limit)
            }
        }
    });
});

/**
 * Import transactions from statement
 */
const importTransactions = asyncHandler(async (req, res) => {
    const { transactions } = req.body;

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        throw CustomException('Transactions array is required', 400, {
            messageAr: 'قائمة المعاملات مطلوبة'
        });
    }

    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    const result = await card.importTransactions(transactions, req.userID);

    res.json({
        success: true,
        data: result,
        message: `Imported ${result.imported} transactions`,
        messageAr: `تم استيراد ${result.imported} معاملة`
    });
});

/**
 * Get unmatched transactions
 */
const getUnmatchedTransactions = asyncHandler(async (req, res) => {
    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    const unmatched = card.getUnmatchedTransactions();

    res.json({
        success: true,
        data: unmatched
    });
});

/**
 * Reconcile transaction with expense
 */
const reconcileTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { expenseId } = req.body;

    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    const transaction = await card.reconcileTransaction(transactionId, expenseId, req.userID);

    res.json({
        success: true,
        data: transaction,
        message: 'Transaction reconciled',
        messageAr: 'تمت مطابقة المعاملة'
    });
});

/**
 * Dispute transaction
 */
const disputeTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { reason } = req.body;

    if (!reason) {
        throw CustomException('Dispute reason is required', 400, {
            messageAr: 'سبب الاعتراض مطلوب'
        });
    }

    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    const transaction = await card.disputeTransaction(transactionId, reason, req.userID);

    res.json({
        success: true,
        data: transaction,
        message: 'Transaction disputed',
        messageAr: 'تم الاعتراض على المعاملة'
    });
});

/**
 * Get spending statistics
 */
const getSpendingStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate) : new Date();

    const spendingByCategory = await CorporateCard.getSpendingByCategory(
        req.firmId,
        req.firmId ? null : req.userID,
        start,
        end
    );

    res.json({
        success: true,
        data: {
            startDate: start,
            endDate: end,
            byCategory: spendingByCategory
        }
    });
});

/**
 * Categorize transaction
 */
const categorizeTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { category, categoryAr, isBillable, clientId, caseId } = req.body;

    const card = await CorporateCard.findOne({
        _id: req.params.id,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    const transaction = card.transactions.find(t => t.transactionId === transactionId);
    if (!transaction) {
        throw CustomException('Transaction not found', 404, {
            messageAr: 'لم يتم العثور على المعاملة'
        });
    }

    if (category) transaction.category = category;
    if (categoryAr) transaction.categoryAr = categoryAr;
    if (isBillable !== undefined) transaction.isBillable = isBillable;
    if (clientId) transaction.clientId = clientId;
    if (caseId) transaction.caseId = caseId;
    transaction.autoCategoirzed = false;

    card.updatedBy = req.userID;
    await card.save();

    res.json({
        success: true,
        data: transaction,
        message: 'Transaction categorized',
        messageAr: 'تم تصنيف المعاملة'
    });
});

module.exports = {
    getCorporateCards,
    getCorporateCard,
    getSummary,
    createCorporateCard,
    updateCorporateCard,
    deleteCorporateCard,
    blockCard,
    unblockCard,
    getTransactions,
    importTransactions,
    getUnmatchedTransactions,
    reconcileTransaction,
    disputeTransaction,
    getSpendingStats,
    categorizeTransaction
};
