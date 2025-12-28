/**
 * AI Transaction Matching Controller
 *
 * Provides endpoints for:
 * - AI-powered transaction matching
 * - Batch matching
 * - Match confirmation/rejection (learning feedback)
 * - Matching statistics
 * - Pattern management
 */

const asyncHandler = require('../utils/asyncHandler');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const aiMatchingService = require('../services/aiTransactionMatching.service');
const BankTransaction = require('../models/bankTransaction.model');
const BankTransactionMatch = require('../models/bankTransactionMatch.model');
const MatchingPattern = require('../models/matchingPattern.model');
const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// MATCHING OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Find matches for a single transaction
 * POST /api/ai-matching/match
 */
exports.findMatches = asyncHandler(async (req, res) => {
    const { transactionId, options = {} } = req.body;

    if (!transactionId) {
        throw CustomException('Transaction ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(transactionId);
    if (!sanitizedId) {
        throw CustomException('Invalid transaction ID', 400);
    }

    // Get transaction with tenant isolation
    const transaction = await BankTransaction.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // Find matches using AI service
    const results = await aiMatchingService.findMatches(transaction, {
        firmId: req.firmQuery.firmId,
        lawyerId: req.userID,
        ...options
    });

    res.status(200).json({
        success: true,
        data: results
    });
});

/**
 * Batch match multiple transactions
 * POST /api/ai-matching/batch
 */
exports.batchMatch = asyncHandler(async (req, res) => {
    const { transactionIds, options = {} } = req.body;

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        throw CustomException('Transaction IDs array is required', 400);
    }

    if (transactionIds.length > 100) {
        throw CustomException('Maximum 100 transactions per batch', 400);
    }

    // Sanitize all IDs
    const sanitizedIds = transactionIds
        .map(id => sanitizeObjectId(id))
        .filter(Boolean);

    // Get transactions with tenant isolation
    const transactions = await BankTransaction.find({
        _id: { $in: sanitizedIds },
        ...req.firmQuery
    });

    if (transactions.length === 0) {
        throw CustomException('No valid transactions found', 404);
    }

    // Batch match using AI service
    const results = await aiMatchingService.batchMatch(transactions, {
        firmId: req.firmQuery.firmId,
        lawyerId: req.userID,
        ...options
    });

    res.status(200).json({
        success: true,
        data: results
    });
});

/**
 * Auto-match unmatched transactions
 * POST /api/ai-matching/auto-match
 */
exports.autoMatch = asyncHandler(async (req, res) => {
    const { accountId, dateFrom, dateTo, limit = 50 } = req.body;

    // Build query for unmatched transactions
    const query = {
        ...req.firmQuery,
        matched: { $ne: true },
        isReconciled: { $ne: true }
    };

    if (accountId) {
        const sanitizedAccountId = sanitizeObjectId(accountId);
        if (!sanitizedAccountId) {
            throw CustomException('Invalid account ID', 400);
        }
        query.accountId = sanitizedAccountId;
    }

    if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) query.date.$gte = new Date(dateFrom);
        if (dateTo) query.date.$lte = new Date(dateTo);
    }

    // Get unmatched transactions
    const transactions = await BankTransaction.find(query)
        .sort({ date: -1 })
        .limit(Math.min(limit, 100));

    if (transactions.length === 0) {
        return res.status(200).json({
            success: true,
            message: 'No unmatched transactions found',
            data: { total: 0, matched: 0, autoMatched: 0 }
        });
    }

    // Run batch matching
    const results = await aiMatchingService.batchMatch(transactions, {
        firmId: req.firmQuery.firmId,
        lawyerId: req.userID
    });

    // Apply auto-matches
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let appliedCount = 0;

        for (const result of results.matches) {
            if (result.autoMatchApplied && result.bestMatch) {
                // Create match record
                await BankTransactionMatch.create([{
                    bankTransactionId: result.transaction.id,
                    matchType: result.bestMatch.recordType.toLowerCase(),
                    matchedRecordId: result.bestMatch.recordId,
                    matchScore: result.bestMatch.score,
                    confidence: result.bestMatch.confidence,
                    matchReasons: result.bestMatch.reasons,
                    matchMethod: 'ai_suggested',
                    status: 'auto_confirmed',
                    matchedAt: new Date(),
                    firmId: req.firmQuery.firmId,
                    lawyerId: req.userID
                }], { session });

                // Update transaction as matched
                await BankTransaction.findByIdAndUpdate(
                    result.transaction.id,
                    {
                        matched: true,
                        matchedTransactionId: result.bestMatch.recordId,
                        matchedType: result.bestMatch.recordType
                    },
                    { session }
                );

                // Record confirmation for learning
                await aiMatchingService.recordConfirmation({
                    firmId: req.firmQuery.firmId,
                    transactionId: result.transaction.id,
                    matchedRecordId: result.bestMatch.recordId,
                    matchedRecordType: result.bestMatch.recordType,
                    matchScore: result.bestMatch.score,
                    matchReasons: result.bestMatch.reasons
                });

                appliedCount++;
            }
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            data: {
                total: results.total,
                evaluated: results.candidatesEvaluated,
                autoMatched: appliedCount,
                suggested: results.suggested,
                unmatched: results.unmatched,
                autoMatchRate: results.statistics.autoMatchRate,
                processingTimeMs: results.processingTimeMs
            }
        });

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// MATCH CONFIRMATION/REJECTION (LEARNING)
// ═══════════════════════════════════════════════════════════════

/**
 * Confirm a suggested match
 * POST /api/ai-matching/confirm
 */
exports.confirmMatch = asyncHandler(async (req, res) => {
    const allowedFields = ['transactionId', 'matchedRecordId', 'matchedRecordType', 'matchScore'];
    const data = pickAllowedFields(req.body, allowedFields);

    if (!data.transactionId || !data.matchedRecordId || !data.matchedRecordType) {
        throw CustomException('Transaction ID, matched record ID, and type are required', 400);
    }

    const sanitizedTxnId = sanitizeObjectId(data.transactionId);
    const sanitizedRecordId = sanitizeObjectId(data.matchedRecordId);

    if (!sanitizedTxnId || !sanitizedRecordId) {
        throw CustomException('Invalid IDs provided', 400);
    }

    // Verify transaction exists and belongs to firm
    const transaction = await BankTransaction.findOne({
        _id: sanitizedTxnId,
        ...req.firmQuery
    });

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Create or update match record
        await BankTransactionMatch.findOneAndUpdate(
            { bankTransactionId: sanitizedTxnId },
            {
                matchType: data.matchedRecordType.toLowerCase(),
                matchedRecordId: sanitizedRecordId,
                matchScore: data.matchScore || 100,
                confidence: 'high',
                matchMethod: 'manual',
                status: 'confirmed',
                matchedBy: req.userID,
                matchedAt: new Date(),
                firmId: req.firmQuery.firmId,
                lawyerId: req.userID
            },
            { upsert: true, session }
        );

        // Update transaction
        await BankTransaction.findByIdAndUpdate(
            sanitizedTxnId,
            {
                matched: true,
                matchedTransactionId: sanitizedRecordId,
                matchedType: data.matchedRecordType
            },
            { session }
        );

        await session.commitTransaction();

        // Record confirmation for learning (async, don't wait)
        aiMatchingService.recordConfirmation({
            firmId: req.firmQuery.firmId,
            transactionId: sanitizedTxnId,
            matchedRecordId: sanitizedRecordId,
            matchedRecordType: data.matchedRecordType,
            matchScore: data.matchScore || 100,
            matchReasons: ['User confirmed']
        }).catch(err => console.error('Learning record error:', err));

        res.status(200).json({
            success: true,
            message: 'Match confirmed successfully'
        });

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

/**
 * Reject a suggested match
 * POST /api/ai-matching/reject
 */
exports.rejectMatch = asyncHandler(async (req, res) => {
    const allowedFields = ['transactionId', 'rejectedRecordId', 'rejectedRecordType', 'reason'];
    const data = pickAllowedFields(req.body, allowedFields);

    if (!data.transactionId) {
        throw CustomException('Transaction ID is required', 400);
    }

    const sanitizedTxnId = sanitizeObjectId(data.transactionId);
    if (!sanitizedTxnId) {
        throw CustomException('Invalid transaction ID', 400);
    }

    // Verify transaction exists
    const transaction = await BankTransaction.findOne({
        _id: sanitizedTxnId,
        ...req.firmQuery
    });

    if (!transaction) {
        throw CustomException('Transaction not found', 404);
    }

    // Update match record if exists
    if (data.rejectedRecordId) {
        await BankTransactionMatch.findOneAndUpdate(
            {
                bankTransactionId: sanitizedTxnId,
                matchedRecordId: sanitizeObjectId(data.rejectedRecordId)
            },
            {
                status: 'rejected',
                rejectedBy: req.userID,
                rejectedAt: new Date(),
                rejectionReason: data.reason || 'User rejected'
            }
        );
    }

    // Record rejection for learning (async)
    if (data.rejectedRecordId && data.rejectedRecordType) {
        aiMatchingService.recordRejection({
            firmId: req.firmQuery.firmId,
            transactionId: sanitizedTxnId,
            rejectedRecordId: sanitizeObjectId(data.rejectedRecordId),
            rejectedRecordType: data.rejectedRecordType,
            reason: data.reason
        }).catch(err => console.error('Learning record error:', err));
    }

    res.status(200).json({
        success: true,
        message: 'Match rejected successfully'
    });
});

/**
 * Unmatch a previously matched transaction
 * POST /api/ai-matching/unmatch
 */
exports.unmatchTransaction = asyncHandler(async (req, res) => {
    const { transactionId } = req.body;

    if (!transactionId) {
        throw CustomException('Transaction ID is required', 400);
    }

    const sanitizedId = sanitizeObjectId(transactionId);
    if (!sanitizedId) {
        throw CustomException('Invalid transaction ID', 400);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Update transaction
        const transaction = await BankTransaction.findOneAndUpdate(
            { _id: sanitizedId, ...req.firmQuery },
            {
                matched: false,
                $unset: { matchedTransactionId: 1, matchedType: 1 }
            },
            { session, new: true }
        );

        if (!transaction) {
            throw CustomException('Transaction not found', 404);
        }

        // Update match record
        await BankTransactionMatch.findOneAndUpdate(
            { bankTransactionId: sanitizedId },
            { status: 'unmatched', unmatchedAt: new Date(), unmatchedBy: req.userID },
            { session }
        );

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: 'Transaction unmatched successfully'
        });

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});

// ═══════════════════════════════════════════════════════════════
// STATISTICS & INSIGHTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get matching statistics
 * GET /api/ai-matching/stats
 */
exports.getMatchingStats = asyncHandler(async (req, res) => {
    const firmId = req.firmQuery.firmId;

    const stats = await aiMatchingService.getMatchingStats(firmId);

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Get pattern statistics
 * GET /api/ai-matching/patterns/stats
 */
exports.getPatternStats = asyncHandler(async (req, res) => {
    const firmId = req.firmQuery.firmId;

    const stats = await MatchingPattern.getStatistics(firmId);

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Get learned patterns
 * GET /api/ai-matching/patterns
 */
exports.getPatterns = asyncHandler(async (req, res) => {
    const { type, minStrength = 0, limit = 50 } = req.query;

    const patterns = await MatchingPattern.getActivePatterns(req.firmQuery.firmId, {
        type,
        minStrength: parseInt(minStrength),
        limit: Math.min(parseInt(limit), 100)
    });

    res.status(200).json({
        success: true,
        data: patterns
    });
});

/**
 * Cleanup old patterns
 * POST /api/ai-matching/patterns/cleanup
 */
exports.cleanupPatterns = asyncHandler(async (req, res) => {
    // Check admin permission
    if (!req.hasPermission('settings', 'full')) {
        throw CustomException('Admin permission required', 403);
    }

    const { maxAgeDays = 180, maxPatterns = 1000 } = req.body;

    const result = await MatchingPattern.cleanup(req.firmQuery.firmId, {
        maxAgeDays: Math.max(30, parseInt(maxAgeDays)),
        maxPatterns: Math.max(100, parseInt(maxPatterns))
    });

    // Also cleanup via service
    await aiMatchingService.cleanupPatterns(req.firmQuery.firmId);

    res.status(200).json({
        success: true,
        message: 'Pattern cleanup completed',
        data: result
    });
});

// ═══════════════════════════════════════════════════════════════
// SUGGESTIONS & REVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * Get pending match suggestions for review
 * GET /api/ai-matching/suggestions
 */
exports.getPendingSuggestions = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, minScore = 50 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [suggestions, total] = await Promise.all([
        BankTransactionMatch.find({
            firmId: req.firmQuery.firmId,
            status: 'suggested',
            matchScore: { $gte: parseInt(minScore) }
        })
            .populate('bankTransactionId', 'date amount type description reference')
            .sort({ matchScore: -1, createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean(),
        BankTransactionMatch.countDocuments({
            firmId: req.firmQuery.firmId,
            status: 'suggested',
            matchScore: { $gte: parseInt(minScore) }
        })
    ]);

    res.status(200).json({
        success: true,
        data: {
            suggestions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        }
    });
});

/**
 * Bulk confirm suggestions
 * POST /api/ai-matching/suggestions/bulk-confirm
 */
exports.bulkConfirmSuggestions = asyncHandler(async (req, res) => {
    const { matchIds } = req.body;

    if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
        throw CustomException('Match IDs array is required', 400);
    }

    if (matchIds.length > 50) {
        throw CustomException('Maximum 50 matches per bulk operation', 400);
    }

    const sanitizedIds = matchIds.map(id => sanitizeObjectId(id)).filter(Boolean);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Get matches to confirm
        const matches = await BankTransactionMatch.find({
            _id: { $in: sanitizedIds },
            firmId: req.firmQuery.firmId,
            status: 'suggested'
        }).session(session);

        let confirmedCount = 0;

        for (const match of matches) {
            // Update match status
            match.status = 'confirmed';
            match.matchedBy = req.userID;
            match.matchedAt = new Date();
            await match.save({ session });

            // Update transaction
            await BankTransaction.findByIdAndUpdate(
                match.bankTransactionId,
                {
                    matched: true,
                    matchedTransactionId: match.matchedRecordId,
                    matchedType: match.matchType
                },
                { session }
            );

            // Record for learning (async)
            aiMatchingService.recordConfirmation({
                firmId: req.firmQuery.firmId,
                transactionId: match.bankTransactionId,
                matchedRecordId: match.matchedRecordId,
                matchedRecordType: match.matchType,
                matchScore: match.matchScore,
                matchReasons: match.matchReasons
            }).catch(() => {});

            confirmedCount++;
        }

        await session.commitTransaction();

        res.status(200).json({
            success: true,
            message: `${confirmedCount} matches confirmed`,
            data: { confirmed: confirmedCount }
        });

    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
});
