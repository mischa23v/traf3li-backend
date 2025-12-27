/**
 * Corporate Card Controller
 *
 * Handles corporate card management, transaction import, and reconciliation
 */

const CorporateCard = require('../models/corporateCard.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');

/**
 * Escape special regex characters to prevent regex injection
 */
const escapeRegex = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Helper function to mask sensitive card data
 */
const maskCardData = (card) => {
    if (!card) return card;

    const cardObj = card.toObject ? card.toObject() : card;

    // Mask card number (show only last 4 digits with asterisks)
    if (cardObj.cardNumber) {
        cardObj.cardNumber = `****${cardObj.cardNumber.slice(-4)}`;
    }

    return cardObj;
};

/**
 * Helper function to validate spending limits
 */
const validateSpendingLimits = (data) => {
    const limitFields = ['creditLimit', 'dailyLimit', 'monthlyLimit', 'singleTransactionLimit'];

    for (const field of limitFields) {
        if (data[field] !== undefined) {
            const value = Number(data[field]);

            if (isNaN(value)) {
                throw CustomException(`${field} must be a valid number`, 400, {
                    messageAr: `${field} يجب أن يكون رقمًا صالحًا`
                });
            }

            if (value < 0) {
                throw CustomException(`${field} cannot be negative`, 400, {
                    messageAr: `${field} لا يمكن أن يكون سالبًا`
                });
            }

            // Convert to number to ensure type safety
            data[field] = value;
        }
    }

    // Validate limit hierarchies
    if (data.singleTransactionLimit && data.dailyLimit) {
        if (data.singleTransactionLimit > data.dailyLimit) {
            throw CustomException('Single transaction limit cannot exceed daily limit', 400, {
                messageAr: 'لا يمكن أن يتجاوز حد المعاملة الواحدة الحد اليومي'
            });
        }
    }

    if (data.dailyLimit && data.monthlyLimit) {
        if (data.dailyLimit * 31 > data.monthlyLimit) {
            throw CustomException('Daily limit is too high for monthly limit', 400, {
                messageAr: 'الحد اليومي مرتفع جدًا بالنسبة للحد الشهري'
            });
        }
    }

    return data;
};

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

    // Mask sensitive card data
    const maskedCards = cards.map(card => maskCardData(card));

    res.json({
        success: true,
        data: {
            cards: maskedCards,
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
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    const card = await CorporateCard.findOne({
        _id: cardId,
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

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    // Mask sensitive card data
    const maskedCard = maskCardData(card);

    res.json({
        success: true,
        data: maskedCard
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
    // Mass Assignment Protection: Only allow specific fields
    const allowedFields = [
        'cardName', 'cardNameAr', 'cardType', 'cardBrand', 'cardNumber',
        'issuingBank', 'issuingBankAr', 'cardHolderId', 'cardHolderName',
        'creditLimit', 'dailyLimit', 'monthlyLimit', 'singleTransactionLimit',
        'billingCycle', 'statementClosingDay',
        'linkedBankAccountId', 'linkedGLAccountId', 'expensePolicyId',
        'expiryDate', 'autoCategorization', 'alerts', 'notes'
    ];

    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate spending limits
    validateSpendingLimits(safeData);

    // Validate required fields
    if (!safeData.cardName || !safeData.cardType || !safeData.cardBrand || !safeData.cardNumber) {
        throw CustomException('Missing required fields', 400, {
            messageAr: 'حقول مطلوبة مفقودة'
        });
    }

    // Validate card number (should be last 4 digits only)
    const last4 = safeData.cardNumber.slice(-4);

    if (!/^\d{4}$/.test(last4)) {
        throw CustomException('Card number must contain at least 4 digits', 400, {
            messageAr: 'يجب أن يحتوي رقم البطاقة على 4 أرقام على الأقل'
        });
    }

    // Check for duplicate
    const existing = await CorporateCard.findOne({
        ...req.firmQuery,
        cardNumber: { $regex: escapeRegex(last4) + '$' }
    });

    if (existing) {
        throw CustomException('Card with these last 4 digits already exists', 400, {
            messageAr: 'يوجد بالفعل بطاقة بهذه الأرقام الأخيرة'
        });
    }

    const card = new CorporateCard({
        firmId: req.firmId,
        lawyerId: req.firmId ? null : req.userID,
        cardName: safeData.cardName,
        cardNameAr: safeData.cardNameAr,
        cardType: safeData.cardType,
        cardBrand: safeData.cardBrand,
        cardNumber: last4, // Store only last 4 digits
        issuingBank: safeData.issuingBank,
        issuingBankAr: safeData.issuingBankAr,
        cardHolderId: safeData.cardHolderId,
        cardHolderName: safeData.cardHolderName,
        creditLimit: safeData.creditLimit,
        dailyLimit: safeData.dailyLimit,
        monthlyLimit: safeData.monthlyLimit,
        singleTransactionLimit: safeData.singleTransactionLimit,
        availableCredit: safeData.creditLimit,
        billingCycle: safeData.billingCycle,
        statementClosingDay: safeData.statementClosingDay,
        linkedBankAccountId: safeData.linkedBankAccountId,
        linkedGLAccountId: safeData.linkedGLAccountId,
        expensePolicyId: safeData.expensePolicyId,
        expiryDate: safeData.expiryDate,
        autoCategorization: safeData.autoCategorization,
        alerts: safeData.alerts,
        notes: safeData.notes,
        activatedAt: new Date(),
        createdBy: req.userID
    });

    await card.save();

    // Mask sensitive data in response
    const maskedCard = maskCardData(card);

    res.status(201).json({
        success: true,
        data: maskedCard,
        message: 'Corporate card created',
        messageAr: 'تم إنشاء البطاقة'
    });
});

/**
 * Update corporate card
 */
const updateCorporateCard = asyncHandler(async (req, res) => {
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    const card = await CorporateCard.findOne({
        _id: cardId,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    // Mass Assignment Protection: Only allow specific fields
    const allowedFields = [
        'cardName', 'cardNameAr', 'cardHolderId', 'cardHolderName',
        'creditLimit', 'dailyLimit', 'monthlyLimit', 'singleTransactionLimit',
        'billingCycle', 'statementClosingDay',
        'linkedBankAccountId', 'linkedGLAccountId', 'expensePolicyId',
        'expiryDate', 'autoCategorization', 'alerts', 'notes', 'internalNotes'
    ];

    const safeData = pickAllowedFields(req.body, allowedFields);

    // Validate spending limits if any are being updated
    validateSpendingLimits(safeData);

    // Apply updates
    Object.keys(safeData).forEach(field => {
        card[field] = safeData[field];
    });

    // Update available credit if credit limit changed
    if (safeData.creditLimit !== undefined) {
        card.availableCredit = safeData.creditLimit - card.currentBalance;
    }

    card.updatedBy = req.userID;
    await card.save();

    // Mask sensitive data in response
    const maskedCard = maskCardData(card);

    res.json({
        success: true,
        data: maskedCard,
        message: 'Corporate card updated',
        messageAr: 'تم تحديث البطاقة'
    });
});

/**
 * Delete corporate card
 */
const deleteCorporateCard = asyncHandler(async (req, res) => {
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    const card = await CorporateCard.findOne({
        _id: cardId,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
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
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    // Mass Assignment Protection
    const safeData = pickAllowedFields(req.body, ['reason']);
    const { reason } = safeData;

    const card = await CorporateCard.findOne({
        _id: cardId,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    await card.block(req.userID, reason);

    // Mask sensitive data in response
    const maskedCard = maskCardData(card);

    res.json({
        success: true,
        data: maskedCard,
        message: 'Card blocked',
        messageAr: 'تم حظر البطاقة'
    });
});

/**
 * Unblock corporate card
 */
const unblockCard = asyncHandler(async (req, res) => {
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    const card = await CorporateCard.findOne({
        _id: cardId,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    await card.unblock(req.userID);

    // Mask sensitive data in response
    const maskedCard = maskCardData(card);

    res.json({
        success: true,
        data: maskedCard,
        message: 'Card unblocked',
        messageAr: 'تم إلغاء حظر البطاقة'
    });
});

/**
 * Get card transactions
 */
const getTransactions = asyncHandler(async (req, res) => {
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    const { status, startDate, endDate, category, page = 1, limit = 50 } = req.query;

    const card = await CorporateCard.findOne({
        _id: cardId,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
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

    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    // Use MongoDB transaction for atomic balance updates
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const card = await CorporateCard.findOne({
            _id: cardId,
            ...req.firmQuery
        }).session(session);

        if (!card) {
            await session.abortTransaction();
            throw CustomException('Corporate card not found', 404, {
                messageAr: 'لم يتم العثور على البطاقة'
            });
        }

        // IDOR Protection: Verify firmId ownership
        const userFirmId = req.firmId?.toString();
        const userLawyerId = req.userID?.toString();
        const cardFirmId = card.firmId?.toString();
        const cardLawyerId = card.lawyerId?.toString();

        if (userFirmId && cardFirmId !== userFirmId) {
            await session.abortTransaction();
            throw CustomException('Unauthorized access to this card', 403, {
                messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
            });
        }

        if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
            await session.abortTransaction();
            throw CustomException('Unauthorized access to this card', 403, {
                messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
            });
        }

        // Import transactions within the session
        const imported = [];
        const duplicates = [];
        const errors = [];

        for (const tx of transactions) {
            try {
                // Validate transaction amount
                if (tx.amount === undefined || isNaN(Number(tx.amount))) {
                    errors.push({ transactionId: tx.transactionId, error: 'Invalid amount' });
                    continue;
                }

                const exists = card.transactions.some(t => t.transactionId === tx.transactionId);
                if (exists) {
                    duplicates.push(tx.transactionId);
                    continue;
                }

                // Auto-categorize
                if (card.autoCategorization?.enabled) {
                    const category = card.autoCategorizeMerchant(tx.merchantName);
                    if (category) {
                        tx.category = category.category;
                        tx.isBillable = category.isBillable || false;
                        tx.autoCategoirzed = true;
                    }
                }

                tx.importedAt = new Date();
                card.transactions.push(tx);
                imported.push(tx.transactionId);

                // Update balance atomically
                card.currentBalance += Number(tx.amount);
            } catch (error) {
                errors.push({ transactionId: tx.transactionId, error: error.message });
            }
        }

        // Update stats
        card.stats.transactionCount += imported.length;
        card.stats.pendingTransactions += imported.length;
        card.lastSyncAt = new Date();
        card.updatedBy = req.userID;

        await card.save({ session });

        // Commit the transaction
        await session.commitTransaction();

        const result = {
            imported: imported.length,
            duplicates: duplicates.length,
            errors: errors.length,
            importedIds: imported,
            duplicateIds: duplicates,
            errorDetails: errors
        };

        res.json({
            success: true,
            data: result,
            message: `Imported ${result.imported} transactions`,
            messageAr: `تم استيراد ${result.imported} معاملة`
        });
    } catch (error) {
        // Rollback on error
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Get unmatched transactions
 */
const getUnmatchedTransactions = asyncHandler(async (req, res) => {
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    const card = await CorporateCard.findOne({
        _id: cardId,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
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
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    const { transactionId } = req.params;

    // Mass Assignment Protection
    const safeData = pickAllowedFields(req.body, ['expenseId']);
    const { expenseId } = safeData;

    const card = await CorporateCard.findOne({
        _id: cardId,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
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
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    const { transactionId } = req.params;

    // Mass Assignment Protection
    const safeData = pickAllowedFields(req.body, ['reason']);
    const { reason } = safeData;

    if (!reason) {
        throw CustomException('Dispute reason is required', 400, {
            messageAr: 'سبب الاعتراض مطلوب'
        });
    }

    const card = await CorporateCard.findOne({
        _id: cardId,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
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
    // Sanitize ObjectId to prevent NoSQL injection
    const cardId = sanitizeObjectId(req.params.id);
    if (!cardId) {
        throw CustomException('Invalid card ID', 400, {
            messageAr: 'معرف البطاقة غير صالح'
        });
    }

    const { transactionId } = req.params;

    // Mass Assignment Protection: Only allow specific fields
    const safeData = pickAllowedFields(req.body, [
        'category', 'categoryAr', 'isBillable', 'clientId', 'caseId'
    ]);

    const card = await CorporateCard.findOne({
        _id: cardId,
        ...req.firmQuery
    });

    if (!card) {
        throw CustomException('Corporate card not found', 404, {
            messageAr: 'لم يتم العثور على البطاقة'
        });
    }

    // IDOR Protection: Verify firmId ownership
    const userFirmId = req.firmId?.toString();
    const userLawyerId = req.userID?.toString();
    const cardFirmId = card.firmId?.toString();
    const cardLawyerId = card.lawyerId?.toString();

    if (userFirmId && cardFirmId !== userFirmId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    if (!userFirmId && userLawyerId && cardLawyerId !== userLawyerId) {
        throw CustomException('Unauthorized access to this card', 403, {
            messageAr: 'غير مصرح بالوصول إلى هذه البطاقة'
        });
    }

    const transaction = card.transactions.find(t => t.transactionId === transactionId);
    if (!transaction) {
        throw CustomException('Transaction not found', 404, {
            messageAr: 'لم يتم العثور على المعاملة'
        });
    }

    // Update transaction with safe data
    if (safeData.category) transaction.category = safeData.category;
    if (safeData.categoryAr) transaction.categoryAr = safeData.categoryAr;
    if (safeData.isBillable !== undefined) transaction.isBillable = safeData.isBillable;
    if (safeData.clientId) transaction.clientId = safeData.clientId;
    if (safeData.caseId) transaction.caseId = safeData.caseId;
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
