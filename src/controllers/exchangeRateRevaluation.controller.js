/**
 * Exchange Rate Revaluation Controller
 *
 * Handles period-end revaluation of foreign currency balances
 * to recognize unrealized gains/losses.
 *
 * @module controllers/exchangeRateRevaluation
 */

const ExchangeRateRevaluation = require('../models/exchangeRateRevaluation.model');
const Account = require('../models/account.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { sanitizeObjectId, pickAllowedFields } = require('../utils/securityUtils');

/**
 * Get all revaluations for the firm
 * GET /api/exchange-rate-revaluations
 */
const getRevaluations = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        year,
        currency,
        status
    } = req.query;

    const result = await ExchangeRateRevaluation.getHistory(req.firmId, {
        year: year ? parseInt(year, 10) : undefined,
        currency,
        status,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    });

    res.json({
        success: true,
        data: result.data,
        meta: result.meta
    });
});

/**
 * Get single revaluation
 * GET /api/exchange-rate-revaluations/:id
 */
const getRevaluation = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid revaluation ID | معرف إعادة التقييم غير صالح', 400);
    }

    const revaluation = await ExchangeRateRevaluation.findOne({
        _id: id,
        firmId: req.firmId
    })
        .populate('gainAccountId', 'code name')
        .populate('lossAccountId', 'code name')
        .populate('createdBy', 'name email')
        .populate('postedBy', 'name email')
        .lean();

    if (!revaluation) {
        throw new CustomException('Revaluation not found | إعادة التقييم غير موجودة', 404);
    }

    res.json({
        success: true,
        data: revaluation
    });
});

/**
 * Preview revaluation (calculate without posting)
 * POST /api/exchange-rate-revaluations/preview
 */
const previewRevaluation = asyncHandler(async (req, res) => {
    const allowedFields = ['revaluationDate', 'baseCurrency', 'targetCurrencies', 'gainAccountId', 'lossAccountId'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    if (!safeData.revaluationDate) {
        throw new CustomException('Revaluation date is required | تاريخ إعادة التقييم مطلوب', 400);
    }

    // Check if period already has revaluation
    const date = new Date(safeData.revaluationDate);
    const hasExisting = await ExchangeRateRevaluation.hasRevaluationForPeriod(
        req.firmId,
        date.getFullYear(),
        date.getMonth() + 1
    );

    // Run revaluation in preview mode
    const revaluation = await ExchangeRateRevaluation.runRevaluation({
        firmId: req.firmId,
        revaluationDate: safeData.revaluationDate,
        baseCurrency: safeData.baseCurrency || 'SAR',
        targetCurrencies: safeData.targetCurrencies,
        gainAccountId: safeData.gainAccountId ? sanitizeObjectId(safeData.gainAccountId) : null,
        lossAccountId: safeData.lossAccountId ? sanitizeObjectId(safeData.lossAccountId) : null,
        createdBy: req.userID
    });

    // Delete the preview document (it was just for calculation)
    await ExchangeRateRevaluation.deleteOne({ _id: revaluation._id });

    res.json({
        success: true,
        data: {
            hasExistingRevaluation: hasExisting,
            revaluationDate: safeData.revaluationDate,
            entries: revaluation.entries,
            summary: revaluation.summary,
            currencies: revaluation.targetCurrencies
        }
    });
});

/**
 * Run revaluation (create draft)
 * POST /api/exchange-rate-revaluations
 */
const runRevaluation = asyncHandler(async (req, res) => {
    const allowedFields = ['revaluationDate', 'baseCurrency', 'targetCurrencies', 'gainAccountId', 'lossAccountId', 'notes'];
    const safeData = pickAllowedFields(req.body, allowedFields);

    if (!safeData.revaluationDate) {
        throw new CustomException('Revaluation date is required | تاريخ إعادة التقييم مطلوب', 400);
    }

    // Validate gain/loss accounts
    if (safeData.gainAccountId) {
        const gainAccount = await Account.findOne({
            _id: sanitizeObjectId(safeData.gainAccountId),
            firmId: req.firmId,
            isActive: true
        });
        if (!gainAccount) {
            throw new CustomException('Invalid gain account | حساب المكاسب غير صالح', 400);
        }
    }

    if (safeData.lossAccountId) {
        const lossAccount = await Account.findOne({
            _id: sanitizeObjectId(safeData.lossAccountId),
            firmId: req.firmId,
            isActive: true
        });
        if (!lossAccount) {
            throw new CustomException('Invalid loss account | حساب الخسائر غير صالح', 400);
        }
    }

    // Check for existing revaluation in period
    const date = new Date(safeData.revaluationDate);
    const hasExisting = await ExchangeRateRevaluation.hasRevaluationForPeriod(
        req.firmId,
        date.getFullYear(),
        date.getMonth() + 1
    );

    if (hasExisting) {
        throw new CustomException(
            'Revaluation already exists for this period. Reverse it first to create a new one. | ' +
            'إعادة التقييم موجودة بالفعل لهذه الفترة. قم بعكسها أولاً لإنشاء واحدة جديدة.',
            400
        );
    }

    // Run revaluation
    const revaluation = await ExchangeRateRevaluation.runRevaluation({
        firmId: req.firmId,
        revaluationDate: safeData.revaluationDate,
        baseCurrency: safeData.baseCurrency || 'SAR',
        targetCurrencies: safeData.targetCurrencies,
        gainAccountId: safeData.gainAccountId ? sanitizeObjectId(safeData.gainAccountId) : null,
        lossAccountId: safeData.lossAccountId ? sanitizeObjectId(safeData.lossAccountId) : null,
        createdBy: req.userID
    });

    if (safeData.notes) {
        revaluation.notes = safeData.notes;
        await revaluation.save();
    }

    res.status(201).json({
        success: true,
        message: 'Revaluation created successfully | تم إنشاء إعادة التقييم بنجاح',
        data: revaluation
    });
});

/**
 * Post revaluation to GL
 * POST /api/exchange-rate-revaluations/:id/post
 */
const postRevaluation = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid revaluation ID | معرف إعادة التقييم غير صالح', 400);
    }

    const revaluation = await ExchangeRateRevaluation.findOne({
        _id: id,
        firmId: req.firmId
    });

    if (!revaluation) {
        throw new CustomException('Revaluation not found | إعادة التقييم غير موجودة', 404);
    }

    if (revaluation.status !== 'draft') {
        throw new CustomException(
            'Only draft revaluations can be posted | يمكن ترحيل إعادة التقييم المسودة فقط',
            400
        );
    }

    // Validate that gain/loss accounts are set
    if (revaluation.summary.totalUnrealizedGain > 0 && !revaluation.gainAccountId) {
        throw new CustomException(
            'Gain account is required to post revaluation with gains | حساب المكاسب مطلوب لترحيل إعادة التقييم مع المكاسب',
            400
        );
    }

    if (revaluation.summary.totalUnrealizedLoss > 0 && !revaluation.lossAccountId) {
        throw new CustomException(
            'Loss account is required to post revaluation with losses | حساب الخسائر مطلوب لترحيل إعادة التقييم مع الخسائر',
            400
        );
    }

    await revaluation.postToGL(req.userID);

    res.json({
        success: true,
        message: 'Revaluation posted to GL successfully | تم ترحيل إعادة التقييم إلى دفتر الأستاذ بنجاح',
        data: revaluation
    });
});

/**
 * Reverse revaluation
 * POST /api/exchange-rate-revaluations/:id/reverse
 */
const reverseRevaluation = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid revaluation ID | معرف إعادة التقييم غير صالح', 400);
    }

    const { reason } = req.body;
    if (!reason || !reason.trim()) {
        throw new CustomException('Reversal reason is required | سبب العكس مطلوب', 400);
    }

    const revaluation = await ExchangeRateRevaluation.findOne({
        _id: id,
        firmId: req.firmId
    });

    if (!revaluation) {
        throw new CustomException('Revaluation not found | إعادة التقييم غير موجودة', 404);
    }

    if (revaluation.status !== 'posted') {
        throw new CustomException(
            'Only posted revaluations can be reversed | يمكن عكس إعادة التقييم المرحلة فقط',
            400
        );
    }

    await revaluation.reverse(req.userID, reason.trim());

    res.json({
        success: true,
        message: 'Revaluation reversed successfully | تم عكس إعادة التقييم بنجاح',
        data: revaluation
    });
});

/**
 * Delete draft revaluation
 * DELETE /api/exchange-rate-revaluations/:id
 */
const deleteRevaluation = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid revaluation ID | معرف إعادة التقييم غير صالح', 400);
    }

    const revaluation = await ExchangeRateRevaluation.findOne({
        _id: id,
        firmId: req.firmId
    });

    if (!revaluation) {
        throw new CustomException('Revaluation not found | إعادة التقييم غير موجودة', 404);
    }

    if (revaluation.status !== 'draft') {
        throw new CustomException(
            'Only draft revaluations can be deleted | يمكن حذف إعادة التقييم المسودة فقط',
            400
        );
    }

    await ExchangeRateRevaluation.deleteOne({ _id: id });

    res.json({
        success: true,
        message: 'Revaluation deleted successfully | تم حذف إعادة التقييم بنجاح'
    });
});

/**
 * Get revaluation summary report
 * GET /api/exchange-rate-revaluations/report
 */
const getRevaluationReport = asyncHandler(async (req, res) => {
    const { year, startDate, endDate } = req.query;

    const query = {
        firmId: req.firmId,
        status: 'posted'
    };

    if (year) {
        query.fiscalYear = parseInt(year, 10);
    }

    if (startDate && endDate) {
        query.revaluationDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const report = await ExchangeRateRevaluation.aggregate([
        { $match: query },
        {
            $group: {
                _id: {
                    year: '$fiscalYear',
                    month: '$fiscalMonth'
                },
                revaluations: { $push: '$$ROOT' },
                totalGain: { $sum: '$summary.totalUnrealizedGain' },
                totalLoss: { $sum: '$summary.totalUnrealizedLoss' },
                netGainLoss: { $sum: '$summary.netGainLoss' },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        {
            $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                totalGain: 1,
                totalLoss: 1,
                netGainLoss: 1,
                count: 1,
                revaluations: {
                    revaluationNumber: 1,
                    revaluationDate: 1,
                    targetCurrencies: 1,
                    'summary.netGainLoss': 1
                }
            }
        }
    ]);

    // Calculate totals
    const totals = report.reduce((acc, period) => ({
        totalGain: acc.totalGain + period.totalGain,
        totalLoss: acc.totalLoss + period.totalLoss,
        netGainLoss: acc.netGainLoss + period.netGainLoss,
        count: acc.count + period.count
    }), { totalGain: 0, totalLoss: 0, netGainLoss: 0, count: 0 });

    res.json({
        success: true,
        data: {
            periods: report,
            totals
        }
    });
});

/**
 * Get accounts suitable for revaluation (foreign currency accounts)
 * GET /api/exchange-rate-revaluations/accounts
 */
const getRevaluationAccounts = asyncHandler(async (req, res) => {
    // Get accounts that have foreign currency transactions
    const GeneralLedger = require('../models/generalLedger.model');

    const accounts = await GeneralLedger.aggregate([
        {
            $match: {
                firmId: req.firmId,
                status: 'posted',
                'meta.currency': { $exists: true, $ne: 'SAR' }
            }
        },
        {
            $group: {
                _id: '$debitAccountId',
                currencies: { $addToSet: '$meta.currency' },
                transactionCount: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'accounts',
                localField: '_id',
                foreignField: '_id',
                as: 'account'
            }
        },
        { $unwind: '$account' },
        {
            $project: {
                _id: 1,
                code: '$account.code',
                name: '$account.name',
                type: '$account.type',
                currencies: 1,
                transactionCount: 1
            }
        },
        { $sort: { code: 1 } }
    ]);

    // Also get gain/loss accounts (income/expense type)
    const gainLossAccounts = await Account.find({
        firmId: req.firmId,
        isActive: true,
        type: { $in: ['Income', 'Expense'] },
        $or: [
            { name: { $regex: /exchange|forex|currency|gain|loss/i } },
            { nameAr: { $regex: /صرف|عملة|ربح|خسارة/i } }
        ]
    }).select('code name nameAr type').lean();

    res.json({
        success: true,
        data: {
            foreignCurrencyAccounts: accounts,
            gainLossAccounts
        }
    });
});

module.exports = {
    getRevaluations,
    getRevaluation,
    previewRevaluation,
    runRevaluation,
    postRevaluation,
    reverseRevaluation,
    deleteRevaluation,
    getRevaluationReport,
    getRevaluationAccounts
};
