const mongoose = require('mongoose');
const Case = require('../models/case.model');
const Task = require('../models/task.model');
const Reminder = require('../models/reminder.model');
const Event = require('../models/event.model');
const CaseNotionPage = require('../models/caseNotionPage.model');
const CaseAuditService = require('../services/caseAuditService');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// VALID STAGES BY CATEGORY
// ═══════════════════════════════════════════════════════════════

const VALID_STAGES = {
    labor: ['filing', 'friendly_settlement_1', 'friendly_settlement_2', 'labor_court', 'appeal', 'execution'],
    commercial: ['filing', 'mediation', 'commercial_court', 'appeal', 'supreme', 'execution'],
    civil: ['filing', 'reconciliation', 'general_court', 'appeal', 'supreme', 'execution'],
    family: ['filing', 'reconciliation_committee', 'family_court', 'appeal', 'supreme', 'execution'],
    criminal: ['investigation', 'prosecution', 'criminal_court', 'appeal', 'supreme', 'execution'],
    administrative: ['grievance', 'administrative_court', 'admin_appeal', 'supreme_admin', 'execution'],
    other: ['filing', 'first_hearing', 'ongoing_hearings', 'appeal', 'final']
};

// ═══════════════════════════════════════════════════════════════
// GET CASES FOR PIPELINE VIEW
// ═══════════════════════════════════════════════════════════════

exports.getCasesForPipeline = async (req, res) => {
    try {
        const { category, outcome, priority, page = 1, limit = 100 } = req.query;
        const userId = req.userID || req.user?._id;

        // DEBUG: Log all inputs
        logger.info('getCasesForPipeline DEBUG', {
            url: req.originalUrl,
            reqUserID: req.userID,
            reqUserId: req.user?._id?.toString(),
            userIdResolved: userId?.toString(),
            reqUserFirmId: req.user?.firmId?.toString(),
            reqFirmId: req.firmId?.toString(),
            isSoloLawyer: req.isSoloLawyer,
            queryParams: { category, outcome, priority, page, limit }
        });

        // Build match stage
        const matchStage = { deletedAt: null };

        // Multi-tenant filter - include cases from firm OR where user is the lawyer
        if (req.user?.firmId) {
            matchStage.$or = [
                { firmId: new mongoose.Types.ObjectId(req.user.firmId) },
                { lawyerId: new mongoose.Types.ObjectId(userId) }
            ];
            logger.info('Firm user - using $or filter', { firmId: req.user.firmId, lawyerId: userId });
        } else {
            matchStage.lawyerId = new mongoose.Types.ObjectId(userId);
            logger.info('Non-firm user - filtering by lawyerId only', { lawyerId: userId });
        }

        // Apply filters
        if (category && category !== 'all') {
            matchStage.category = category;
        }
        if (outcome && outcome !== 'all') {
            matchStage.outcome = outcome;
        }
        if (priority && priority !== 'all') {
            matchStage.priority = priority;
        }

        logger.info('Final matchStage', { matchStage: JSON.stringify(matchStage, null, 2) });

        // Aggregation pipeline
        const cases = await Case.aggregate([
            { $match: matchStage },
            { $sort: { updatedAt: -1 } },
            { $skip: (parseInt(page) - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
            // Lookup client
            {
                $lookup: {
                    from: 'clients',
                    localField: 'clientId',
                    foreignField: '_id',
                    as: 'client'
                }
            },
            { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
            // Lookup lawyer
            {
                $lookup: {
                    from: 'users',
                    localField: 'lawyerId',
                    foreignField: '_id',
                    as: 'lawyer'
                }
            },
            { $unwind: { path: '$lawyer', preserveNullAndEmptyArrays: true } },
            // Lookup tasks count
            {
                $lookup: {
                    from: 'tasks',
                    let: { caseId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$caseId', '$$caseId'] } } },
                        { $count: 'count' }
                    ],
                    as: 'taskStats'
                }
            },
            // Lookup notion pages count
            {
                $lookup: {
                    from: 'casenotionpages',
                    let: { caseId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$caseId', '$$caseId'] }, deletedAt: null } },
                        { $count: 'count' }
                    ],
                    as: 'notionStats'
                }
            },
            // Lookup reminders count
            {
                $lookup: {
                    from: 'reminders',
                    let: { caseId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$caseId', '$$caseId'] } } },
                        { $count: 'count' }
                    ],
                    as: 'reminderStats'
                }
            },
            // Lookup events count
            {
                $lookup: {
                    from: 'events',
                    let: { caseId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$caseId', '$$caseId'] } } },
                        { $count: 'count' }
                    ],
                    as: 'eventStats'
                }
            },
            // Project fields
            {
                $project: {
                    _id: 1,
                    caseNumber: 1,
                    title: 1,
                    category: 1,
                    status: 1,
                    priority: 1,
                    outcome: 1,
                    plaintiffName: {
                        $ifNull: ['$plaintiffName', { $ifNull: ['$plaintiff.fullNameArabic', '$laborCaseDetails.plaintiff.name'] }]
                    },
                    defendantName: {
                        $ifNull: ['$defendantName', { $ifNull: ['$defendant.fullNameArabic', '$laborCaseDetails.company.name'] }]
                    },
                    clientId: {
                        _id: '$client._id',
                        name: { $ifNull: ['$client.companyName', { $concat: ['$client.firstName', ' ', '$client.lastName'] }] },
                        phone: '$client.phone'
                    },
                    court: 1,
                    judge: 1,
                    nextHearing: 1,
                    claimAmount: 1,
                    expectedWinAmount: 1,
                    currentStage: { $ifNull: ['$currentStage', 'filing'] },
                    stageEnteredAt: { $ifNull: ['$stageEnteredAt', '$createdAt'] },
                    tasksCount: { $ifNull: [{ $arrayElemAt: ['$taskStats.count', 0] }, 0] },
                    notionPagesCount: { $ifNull: [{ $arrayElemAt: ['$notionStats.count', 0] }, 0] },
                    remindersCount: { $ifNull: [{ $arrayElemAt: ['$reminderStats.count', 0] }, 0] },
                    eventsCount: { $ifNull: [{ $arrayElemAt: ['$eventStats.count', 0] }, 0] },
                    notesCount: { $size: { $ifNull: ['$notes', []] } },
                    createdAt: 1,
                    updatedAt: 1,
                    latestNote: { $arrayElemAt: ['$notes', -1] }
                }
            },
            // Add computed fields
            {
                $addFields: {
                    daysInCurrentStage: {
                        $floor: {
                            $divide: [
                                { $subtract: [new Date(), '$stageEnteredAt'] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    }
                }
            }
        ]);

        // Get total count
        const total = await Case.countDocuments(matchStage);

        // Get statistics by stage and outcome
        const stageStats = await Case.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $ifNull: ['$currentStage', 'filing'] },
                    count: { $sum: 1 }
                }
            }
        ]);

        const outcomeStats = await Case.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$outcome',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Convert stats to objects
        const byStage = {};
        stageStats.forEach(s => { byStage[s._id] = s.count; });

        const byOutcome = {};
        outcomeStats.forEach(s => { byOutcome[s._id || 'ongoing'] = s.count; });

        res.json({
            error: false,
            cases,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            statistics: {
                total,
                byStage,
                byOutcome
            }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// MOVE CASE TO STAGE
// ═══════════════════════════════════════════════════════════════

exports.moveCaseToStage = async (req, res) => {
    try {
        const { id } = req.params;

        // Mass assignment protection - only allow specific fields
        const allowedFields = pickAllowedFields(req.body, ['newStage', 'notes']);
        const { newStage, notes } = allowedFields;

        const userId = req.userID || req.user?._id;

        // Sanitize and validate IDs
        const sanitizedCaseId = sanitizeObjectId(id);
        if (!sanitizedCaseId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid case ID',
                code: 'INVALID_ID'
            });
        }

        // Find the case
        const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
        if (!caseDoc) {
            return res.status(404).json({
                error: true,
                message: 'Case not found',
                code: 'CASE_NOT_FOUND'
            });
        }

        // Ownership already verified by req.firmQuery
        const sanitizedUserId = sanitizeObjectId(userId);
        const sanitizedFirmId = sanitizeObjectId(req.user?.firmId);

        const isLawyer = caseDoc.lawyerId && caseDoc.lawyerId.toString() === sanitizedUserId?.toString();
        const sameFirm = sanitizedFirmId && caseDoc.firmId && caseDoc.firmId.toString() === sanitizedFirmId.toString();
        const hasAccess = sameFirm || isLawyer;

        if (!hasAccess) {
            return res.status(403).json({
                error: true,
                message: 'Unauthorized - you do not have access to this case',
                code: 'UNAUTHORIZED'
            });
        }

        // Prevent unauthorized stage modifications - check if case is already ended
        if (caseDoc.status === 'closed' || caseDoc.status === 'completed') {
            return res.status(400).json({
                error: true,
                message: 'Cannot modify ended case',
                code: 'CASE_ALREADY_ENDED'
            });
        }

        // Input validation - validate newStage is provided and is a string
        if (!newStage || typeof newStage !== 'string') {
            return res.status(400).json({
                error: true,
                message: 'Valid stage is required',
                code: 'VALIDATION_ERROR'
            });
        }

        // Validate stage for category
        const categoryKey = caseDoc.category?.toLowerCase() || 'other';
        const validStages = VALID_STAGES[categoryKey] || VALID_STAGES.other;

        if (!validStages.includes(newStage)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid stage for case category',
                code: 'INVALID_STAGE',
                details: {
                    category: caseDoc.category,
                    requestedStage: newStage,
                    validStages
                }
            });
        }

        const oldStage = caseDoc.currentStage || 'filing';
        const now = new Date();

        // Add to stage history
        if (!caseDoc.stageHistory) {
            caseDoc.stageHistory = [];
        }

        // Close previous stage entry
        const lastHistoryEntry = caseDoc.stageHistory[caseDoc.stageHistory.length - 1];
        if (lastHistoryEntry && !lastHistoryEntry.exitedAt) {
            lastHistoryEntry.exitedAt = now;
        }

        // Add new stage entry
        caseDoc.stageHistory.push({
            stage: newStage,
            enteredAt: now,
            notes,
            changedBy: req.user._id
        });

        // Update current stage and sync pipelineStage alias
        caseDoc.currentStage = newStage;
        caseDoc.pipelineStage = newStage; // Keep in sync for backwards compatibility
        caseDoc.stageEnteredAt = now;

        await caseDoc.save();

        // Log audit
        try {
            await CaseAuditService.logCaseUpdate(caseDoc._id, req.user._id, {
                action: 'stage_change',
                oldStage,
                newStage,
                notes
            });
        } catch (auditError) {
            logger.error('Audit log error', { error: auditError.message });
        }

        res.json({
            error: false,
            message: 'تم نقل القضية إلى المرحلة الجديدة',
            case: {
                _id: caseDoc._id,
                currentStage: caseDoc.currentStage,
                stageEnteredAt: caseDoc.stageEnteredAt,
                stageHistory: caseDoc.stageHistory
            }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// END CASE
// ═══════════════════════════════════════════════════════════════

exports.endCase = async (req, res) => {
    try {
        const { id } = req.params;

        // Mass assignment protection - only allow specific fields
        const allowedFields = pickAllowedFields(req.body, ['outcome', 'endReason', 'finalAmount', 'notes', 'endDate']);
        const { outcome, endReason, finalAmount, notes, endDate } = allowedFields;

        const userId = req.userID || req.user?._id;

        // Sanitize and validate IDs
        const sanitizedCaseId = sanitizeObjectId(id);
        if (!sanitizedCaseId) {
            return res.status(400).json({
                error: true,
                message: 'Invalid case ID',
                code: 'INVALID_ID'
            });
        }

        // Find the case
        const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
        if (!caseDoc) {
            return res.status(404).json({
                error: true,
                message: 'Case not found',
                code: 'CASE_NOT_FOUND'
            });
        }

        // Ownership already verified by req.firmQuery
        const sanitizedUserId = sanitizeObjectId(userId);
        const sanitizedFirmId = sanitizeObjectId(req.user?.firmId);

        const isLawyer = caseDoc.lawyerId && caseDoc.lawyerId.toString() === sanitizedUserId?.toString();
        const sameFirm = sanitizedFirmId && caseDoc.firmId && caseDoc.firmId.toString() === sanitizedFirmId.toString();
        const hasAccess = sameFirm || isLawyer;

        if (!hasAccess) {
            return res.status(403).json({
                error: true,
                message: 'Unauthorized - you do not have access to this case',
                code: 'UNAUTHORIZED'
            });
        }

        // Prevent unauthorized modifications - check if case is already ended
        if (caseDoc.status === 'closed' || caseDoc.status === 'completed') {
            return res.status(400).json({
                error: true,
                message: 'Case is already ended',
                code: 'CASE_ALREADY_ENDED'
            });
        }

        // Input validation - validate outcome is provided and valid
        if (!outcome || typeof outcome !== 'string') {
            return res.status(400).json({
                error: true,
                message: 'Outcome is required',
                code: 'VALIDATION_ERROR'
            });
        }

        const validOutcomes = ['won', 'lost', 'settled'];
        if (!validOutcomes.includes(outcome)) {
            return res.status(400).json({
                error: true,
                message: 'Invalid outcome',
                code: 'VALIDATION_ERROR',
                details: { validOutcomes }
            });
        }

        // Validate finalAmount if provided
        if (finalAmount !== undefined && finalAmount !== null) {
            const amount = parseFloat(finalAmount);
            if (isNaN(amount) || amount < 0) {
                return res.status(400).json({
                    error: true,
                    message: 'Invalid final amount',
                    code: 'VALIDATION_ERROR'
                });
            }
        }

        // Update case
        caseDoc.outcome = outcome;
        caseDoc.status = 'closed';
        caseDoc.endDate = endDate ? new Date(endDate) : new Date();
        caseDoc.endDetails = {
            endDate: caseDoc.endDate,
            endReason,
            finalAmount,
            notes,
            endedBy: req.user._id
        };

        // Close last stage history entry
        if (caseDoc.stageHistory && caseDoc.stageHistory.length > 0) {
            const lastEntry = caseDoc.stageHistory[caseDoc.stageHistory.length - 1];
            if (!lastEntry.exitedAt) {
                lastEntry.exitedAt = new Date();
            }
        }

        await caseDoc.save();

        // Log audit
        try {
            await CaseAuditService.logCaseUpdate(caseDoc._id, req.user._id, {
                action: 'case_ended',
                outcome,
                endReason,
                finalAmount
            });
        } catch (auditError) {
            logger.error('Audit log error', { error: auditError.message });
        }

        res.json({
            error: false,
            message: 'تم إنهاء القضية بنجاح',
            case: {
                _id: caseDoc._id,
                status: caseDoc.status,
                outcome: caseDoc.outcome,
                endDetails: caseDoc.endDetails
            }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET PIPELINE STATISTICS
// ═══════════════════════════════════════════════════════════════

exports.getPipelineStatistics = async (req, res) => {
    try {
        const { category, dateFrom, dateTo } = req.query;
        const userId = req.userID || req.user?._id;

        // Build match stage
        const matchStage = { deletedAt: null };

        // Multi-tenant filter - include cases from firm OR where user is the lawyer
        if (req.user?.firmId) {
            matchStage.$or = [
                { firmId: new mongoose.Types.ObjectId(req.user.firmId) },
                { lawyerId: new mongoose.Types.ObjectId(userId) }
            ];
        } else {
            matchStage.lawyerId = new mongoose.Types.ObjectId(userId);
        }

        if (category && category !== 'all') {
            matchStage.category = category;
        }

        if (dateFrom || dateTo) {
            matchStage.createdAt = {};
            if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
            if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
        }

        // Get basic counts
        const [
            totalCases,
            activeCases,
            wonCases,
            lostCases,
            settledCases
        ] = await Promise.all([
            Case.countDocuments(matchStage),
            Case.countDocuments({ ...matchStage, outcome: 'ongoing' }),
            Case.countDocuments({ ...matchStage, outcome: 'won' }),
            Case.countDocuments({ ...matchStage, outcome: 'lost' }),
            Case.countDocuments({ ...matchStage, outcome: 'settled' })
        ]);

        // Get by category
        const categoryStats = await Case.aggregate([
            { $match: matchStage },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        const byCategory = {};
        categoryStats.forEach(s => { byCategory[s._id || 'other'] = s.count; });

        // Get by stage for each category
        const stageStats = await Case.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        category: '$category',
                        stage: { $ifNull: ['$currentStage', 'filing'] }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        const byStage = {};
        stageStats.forEach(s => {
            const cat = s._id.category || 'other';
            if (!byStage[cat]) byStage[cat] = {};
            byStage[cat][s._id.stage] = s.count;
        });

        // Get average days in stage
        const avgDaysStats = await Case.aggregate([
            { $match: { ...matchStage, stageEnteredAt: { $exists: true } } },
            {
                $addFields: {
                    daysInStage: {
                        $divide: [
                            { $subtract: [new Date(), '$stageEnteredAt'] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: {
                        category: '$category',
                        stage: { $ifNull: ['$currentStage', 'filing'] }
                    },
                    avgDays: { $avg: '$daysInStage' }
                }
            }
        ]);

        const avgDaysInStage = {};
        avgDaysStats.forEach(s => {
            const cat = s._id.category || 'other';
            if (!avgDaysInStage[cat]) avgDaysInStage[cat] = {};
            avgDaysInStage[cat][s._id.stage] = Math.round(s.avgDays);
        });

        // Get financial stats
        const financialStats = await Case.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    totalClaimAmount: { $sum: { $ifNull: ['$claimAmount', 0] } },
                    totalWonAmount: {
                        $sum: {
                            $cond: [
                                { $eq: ['$outcome', 'won'] },
                                { $ifNull: ['$endDetails.finalAmount', '$claimAmount'] },
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const totalClaimAmount = financialStats[0]?.totalClaimAmount || 0;
        const totalWonAmount = financialStats[0]?.totalWonAmount || 0;

        // Calculate success rate
        const completedCases = wonCases + lostCases + settledCases;
        const successRate = completedCases > 0 ? (wonCases + settledCases) / completedCases : 0;

        res.json({
            error: false,
            statistics: {
                totalCases,
                activeCases,
                wonCases,
                lostCases,
                settledCases,
                byCategory,
                byStage,
                avgDaysInStage,
                totalClaimAmount,
                totalWonAmount,
                successRate: Math.round(successRate * 100) / 100
            }
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET VALID STAGES FOR CATEGORY
// ═══════════════════════════════════════════════════════════════

exports.getValidStages = async (req, res) => {
    try {
        const { category } = req.params;
        const categoryKey = category?.toLowerCase() || 'other';
        const stages = VALID_STAGES[categoryKey] || VALID_STAGES.other;

        res.json({
            error: false,
            category: categoryKey,
            stages,
            allCategories: Object.keys(VALID_STAGES)
        });
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

// Export valid stages constant for use in validators
exports.VALID_STAGES = VALID_STAGES;

// ═══════════════════════════════════════════════════════════════
// GET CASES GROUPED BY STAGE (KANBAN BOARD VIEW)
// ═══════════════════════════════════════════════════════════════

exports.getCasesByStage = async (req, res) => {
    try {
        const { category, status = 'active' } = req.query;
        const userId = req.userID || req.user?._id;

        // Sanitize and validate IDs
        const sanitizedUserId = sanitizeObjectId(userId);
        const sanitizedFirmId = sanitizeObjectId(req.user?.firmId);

        if (!sanitizedUserId) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized - invalid user ID'
            });
        }

        // Build query with $and to avoid conflicts
        const andConditions = [{ deletedAt: null }];

        // IDOR Protection - Multi-tenant filter with sanitized IDs
        if (sanitizedFirmId) {
            andConditions.push({
                $or: [
                    { firmId: new mongoose.Types.ObjectId(sanitizedFirmId) },
                    { lawyerId: new mongoose.Types.ObjectId(sanitizedUserId) }
                ]
            });
        } else {
            andConditions.push({ lawyerId: new mongoose.Types.ObjectId(sanitizedUserId) });
        }

        if (category && category !== 'all') {
            andConditions.push({ category });
        }

        // Filter by status
        if (status === 'active') {
            andConditions.push({ status: { $nin: ['closed', 'completed', 'archived'] } });
            andConditions.push({ outcome: { $nin: ['won', 'lost', 'settled'] } });
        } else if (status === 'closed') {
            andConditions.push({
                $or: [
                    { status: { $in: ['closed', 'completed'] } },
                    { outcome: { $in: ['won', 'lost', 'settled'] } }
                ]
            });
        }

        const query = { $and: andConditions };

        // Get cases with latest note
        const cases = await Case.find(query)
            .populate('clientId', 'name firstName lastName companyName phone')
            .select({
                title: 1,
                caseNumber: 1,
                category: 1,
                status: 1,
                priority: 1,
                plaintiffName: 1,
                defendantName: 1,
                'laborCaseDetails.plaintiff.name': 1,
                'laborCaseDetails.company.name': 1,
                court: 1,
                claimAmount: 1,
                currentStage: 1,
                pipelineStage: 1,
                stageEnteredAt: 1,
                nextHearing: 1,
                outcome: 1,
                notes: { $slice: -1 }, // Get only latest note
                updatedAt: 1,
                createdAt: 1
            })
            .sort({ updatedAt: -1 });

        // Group by stage
        const grouped = {};
        cases.forEach(caseDoc => {
            const stageId = caseDoc.currentStage || caseDoc.pipelineStage || 'filing';
            if (!grouped[stageId]) {
                grouped[stageId] = [];
            }

            // Calculate days in stage
            const daysInStage = caseDoc.stageEnteredAt
                ? Math.floor((new Date() - new Date(caseDoc.stageEnteredAt)) / (1000 * 60 * 60 * 24))
                : 0;

            // Get plaintiff and defendant names with fallbacks
            const plaintiffName = caseDoc.plaintiffName ||
                caseDoc.laborCaseDetails?.plaintiff?.name ||
                '';
            const defendantName = caseDoc.defendantName ||
                caseDoc.laborCaseDetails?.company?.name ||
                '';

            grouped[stageId].push({
                _id: caseDoc._id,
                title: caseDoc.title,
                caseNumber: caseDoc.caseNumber,
                category: caseDoc.category,
                status: caseDoc.status,
                priority: caseDoc.priority,
                plaintiffName,
                defendantName,
                clientId: caseDoc.clientId,
                court: caseDoc.court,
                claimAmount: caseDoc.claimAmount,
                currentStage: stageId,
                stageEnteredAt: caseDoc.stageEnteredAt,
                daysInStage,
                nextHearing: caseDoc.nextHearing,
                outcome: caseDoc.outcome,
                latestNote: caseDoc.notes?.[0]?.text || null,
                updatedAt: caseDoc.updatedAt,
                createdAt: caseDoc.createdAt
            });
        });

        res.json({
            success: true,
            data: grouped
        });
    } catch (error) {
        logger.error('Error getting cases by stage', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to get cases'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET NOTES FOR A CASE
// ═══════════════════════════════════════════════════════════════

exports.getNotes = async (req, res) => {
    try {
        const { _id: id } = req.params;
        const { limit = 50, offset = 0, sort = '-date' } = req.query;
        const userId = req.userID || req.user?._id;

        // Sanitize and validate IDs
        const sanitizedCaseId = sanitizeObjectId(id);
        if (!sanitizedCaseId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid case ID'
            });
        }

        // Find the case
        const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery })
            .populate('notes.createdBy', 'name firstName lastName email')
            .select('notes lawyerId firmId');

        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        // IDOR Protection - verify firmId ownership
        const sanitizedUserId = sanitizeObjectId(userId);
        const sanitizedFirmId = sanitizeObjectId(req.user?.firmId);

        const isLawyer = caseDoc.lawyerId && caseDoc.lawyerId.toString() === sanitizedUserId?.toString();
        const sameFirm = sanitizedFirmId && caseDoc.firmId && caseDoc.firmId.toString() === sanitizedFirmId.toString();
        const hasAccess = sameFirm || isLawyer;

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - you do not have access to this case'
            });
        }

        // Get notes array
        let notes = caseDoc.notes || [];

        // Filter private notes if user is not the creator
        notes = notes.filter(note => {
            if (note.isPrivate) {
                return note.createdBy?._id?.toString() === userId?.toString() ||
                       note.createdBy?.toString() === userId?.toString();
            }
            return true;
        });

        // Sort notes
        const sortField = sort.startsWith('-') ? sort.slice(1) : sort;
        const sortOrder = sort.startsWith('-') ? -1 : 1;
        notes.sort((a, b) => {
            const aVal = a[sortField] || a.createdAt || a.date;
            const bVal = b[sortField] || b.createdAt || b.date;
            if (aVal < bVal) return -sortOrder;
            if (aVal > bVal) return sortOrder;
            return 0;
        });

        // Apply pagination
        const total = notes.length;
        notes = notes.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

        res.json({
            success: true,
            data: notes,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        logger.error('Error getting notes', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to get notes'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// ADD NOTE TO CASE (Enhanced version with isPrivate and stageId)
// ═══════════════════════════════════════════════════════════════

exports.addNote = async (req, res) => {
    try {
        const { _id: id } = req.params;

        // Mass assignment protection - only allow specific fields
        const allowedFields = pickAllowedFields(req.body, ['text', 'isPrivate', 'stageId']);
        const { text, isPrivate = false, stageId } = allowedFields;

        const userId = req.userID || req.user?._id;

        // Input validation - validate text is provided
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Note text is required'
            });
        }

        // Sanitize and validate IDs
        const sanitizedCaseId = sanitizeObjectId(id);
        if (!sanitizedCaseId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid case ID'
            });
        }

        const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        // IDOR Protection - verify firmId ownership
        const sanitizedUserId = sanitizeObjectId(userId);
        const sanitizedFirmId = sanitizeObjectId(req.user?.firmId);

        const isLawyer = caseDoc.lawyerId && caseDoc.lawyerId.toString() === sanitizedUserId?.toString();
        const sameFirm = sanitizedFirmId && caseDoc.firmId && caseDoc.firmId.toString() === sanitizedFirmId.toString();
        const hasAccess = sameFirm || isLawyer;

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - you do not have access to this case'
            });
        }

        // Validate stageId if provided
        let validatedStageId = stageId || caseDoc.currentStage;
        if (stageId) {
            const categoryKey = caseDoc.category?.toLowerCase() || 'other';
            const validStages = VALID_STAGES[categoryKey] || VALID_STAGES.other;
            if (!validStages.includes(stageId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid stage for case category'
                });
            }
        }

        // Add note to beginning of array (newest first)
        const newNote = {
            text: text.trim(),
            date: new Date(),
            createdBy: req.user._id,
            createdAt: new Date(),
            isPrivate: Boolean(isPrivate),
            stageId: validatedStageId
        };

        caseDoc.notes.unshift(newNote);
        caseDoc.updatedAt = new Date();
        await caseDoc.save();

        res.json({
            success: true,
            data: caseDoc.notes[0]
        });
    } catch (error) {
        logger.error('Error adding note', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to add note'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE NOTE
// ═══════════════════════════════════════════════════════════════

exports.updateNote = async (req, res) => {
    try {
        const { _id: id, noteId } = req.params;

        // Mass assignment protection - only allow specific fields
        const allowedFields = pickAllowedFields(req.body, ['text', 'isPrivate']);
        const { text, isPrivate } = allowedFields;

        const userId = req.userID || req.user?._id;

        // Sanitize and validate IDs
        const sanitizedCaseId = sanitizeObjectId(id);
        const sanitizedNoteId = sanitizeObjectId(noteId);
        if (!sanitizedCaseId || !sanitizedNoteId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid case or note ID'
            });
        }

        const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        // IDOR Protection - verify firmId ownership
        const sanitizedUserId = sanitizeObjectId(userId);
        const sanitizedFirmId = sanitizeObjectId(req.user?.firmId);

        const isLawyer = caseDoc.lawyerId && caseDoc.lawyerId.toString() === sanitizedUserId?.toString();
        const sameFirm = sanitizedFirmId && caseDoc.firmId && caseDoc.firmId.toString() === sanitizedFirmId.toString();
        const hasAccess = sameFirm || isLawyer;

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - you do not have access to this case'
            });
        }

        // Find the note
        const note = caseDoc.notes.id(sanitizedNoteId);
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Prevent unauthorized modifications - only the creator can edit a note
        const isCreator = note.createdBy?.toString() === sanitizedUserId?.toString();
        if (!isCreator) {
            return res.status(403).json({
                success: false,
                message: 'Only the note creator can edit this note'
            });
        }

        // Input validation and update note
        if (text !== undefined) {
            if (typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Note text must be a non-empty string'
                });
            }
            note.text = text.trim();
        }
        if (isPrivate !== undefined) {
            note.isPrivate = Boolean(isPrivate);
        }

        caseDoc.updatedAt = new Date();
        await caseDoc.save();

        res.json({
            success: true,
            data: note
        });
    } catch (error) {
        logger.error('Error updating note', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to update note'
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DELETE NOTE
// ═══════════════════════════════════════════════════════════════

exports.deleteNote = async (req, res) => {
    try {
        const { _id: id, noteId } = req.params;
        const userId = req.userID || req.user?._id;

        // Sanitize and validate IDs
        const sanitizedCaseId = sanitizeObjectId(id);
        const sanitizedNoteId = sanitizeObjectId(noteId);
        if (!sanitizedCaseId || !sanitizedNoteId) {
            return res.status(400).json({
                success: false,
                message: 'Invalid case or note ID'
            });
        }

        const caseDoc = await Case.findOne({ _id: sanitizedCaseId, ...req.firmQuery });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'Case not found'
            });
        }

        // IDOR Protection - verify firmId ownership
        const sanitizedUserId = sanitizeObjectId(userId);
        const sanitizedFirmId = sanitizeObjectId(req.user?.firmId);

        const isLawyer = caseDoc.lawyerId && caseDoc.lawyerId.toString() === sanitizedUserId?.toString();
        const sameFirm = sanitizedFirmId && caseDoc.firmId && caseDoc.firmId.toString() === sanitizedFirmId.toString();
        const hasAccess = sameFirm || isLawyer;

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized - you do not have access to this case'
            });
        }

        // Find the note
        const note = caseDoc.notes.id(sanitizedNoteId);
        if (!note) {
            return res.status(404).json({
                success: false,
                message: 'Note not found'
            });
        }

        // Prevent unauthorized modifications - only the creator can delete a note
        const isCreator = note.createdBy?.toString() === sanitizedUserId?.toString();
        if (!isCreator) {
            return res.status(403).json({
                success: false,
                message: 'Only the note creator can delete this note'
            });
        }

        // Remove note
        caseDoc.notes.pull(sanitizedNoteId);
        caseDoc.updatedAt = new Date();
        await caseDoc.save();

        res.json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting note', { error: error.message });
        res.status(500).json({
            success: false,
            message: 'Failed to delete note'
        });
    }
};
