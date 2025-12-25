/**
 * Dunning Controller
 *
 * Handles dunning policies, dunning history, and automated debt collection workflows.
 * Manages reminder stages, escalations, late fees, and reporting.
 */

const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const DunningPolicy = require('../models/dunningPolicy.model');
const { Invoice } = require('../models');
const logger = require('../utils/logger');

// Note: When dunning service is implemented, replace direct model calls with service methods
// const dunningService = require('../services/dunning.service');

// ═══════════════════════════════════════════════════════════════
// ALLOWED FIELDS FOR MASS ASSIGNMENT PROTECTION
// ═══════════════════════════════════════════════════════════════
const POLICY_CREATE_ALLOWED_FIELDS = [
    'name',
    'nameAr',
    'description',
    'descriptionAr',
    'stages',
    'isActive',
    'applyToAllClients',
    'clientIds',
    'excludeClientIds',
    'minInvoiceAmount',
    'maxInvoiceAmount',
    'currency',
    'autoApply',
    'pauseOnPartialPayment',
    'pauseOnDispute',
    'businessDaysOnly',
    'notificationSettings'
];

const POLICY_UPDATE_ALLOWED_FIELDS = [
    'name',
    'nameAr',
    'description',
    'descriptionAr',
    'stages',
    'isActive',
    'applyToAllClients',
    'clientIds',
    'excludeClientIds',
    'minInvoiceAmount',
    'maxInvoiceAmount',
    'currency',
    'autoApply',
    'pauseOnPartialPayment',
    'pauseOnDispute',
    'businessDaysOnly',
    'notificationSettings'
];

// ═══════════════════════════════════════════════════════════════
// DUNNING POLICY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/dunning/policies
 * List all dunning policies for firm
 */
const listPolicies = asyncHandler(async (req, res) => {
    const { isActive, isDefault } = req.query;

    const query = { ...req.firmQuery };

    if (isActive !== undefined) {
        query.isActive = isActive === 'true';
    }

    if (isDefault !== undefined) {
        query.isDefault = isDefault === 'true';
    }

    const policies = await DunningPolicy.find(query)
        .populate('clientIds', 'name email')
        .populate('excludeClientIds', 'name email')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .sort({ isDefault: -1, createdAt: -1 });

    res.json({
        success: true,
        data: policies,
        count: policies.length
    });
});

/**
 * POST /api/dunning/policies
 * Create new dunning policy
 */
const createPolicy = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('Access denied: Departed users cannot manage dunning policies', 403, {
            messageAr: 'ليس لديك صلاحية لإدارة سياسات التحصيل'
        });
    }

    // Mass assignment protection
    const sanitizedData = pickAllowedFields(req.body, POLICY_CREATE_ALLOWED_FIELDS);

    // Validate required fields
    if (!sanitizedData.name) {
        throw CustomException('Policy name is required', 400, {
            messageAr: 'اسم السياسة مطلوب'
        });
    }

    if (!sanitizedData.stages || !Array.isArray(sanitizedData.stages) || sanitizedData.stages.length === 0) {
        throw CustomException('At least one dunning stage is required', 400, {
            messageAr: 'مرحلة واحدة على الأقل مطلوبة'
        });
    }

    // Validate stage order and days
    const sortedStages = [...sanitizedData.stages].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sortedStages.length; i++) {
        if (sortedStages[i].order !== i + 1) {
            throw CustomException('Stage orders must be sequential starting from 1', 400, {
                messageAr: 'يجب أن تكون ترتيب المراحل متسلسلة بدءًا من 1'
            });
        }

        if (i > 0 && sortedStages[i].daysOverdue <= sortedStages[i - 1].daysOverdue) {
            throw CustomException('Each stage must have more days overdue than the previous stage', 400, {
                messageAr: 'يجب أن يكون لكل مرحلة أيام تأخير أكثر من المرحلة السابقة'
            });
        }
    }

    // Create policy
    const policy = new DunningPolicy({
        firmId: req.firmId,
        lawyerId: req.firmId ? null : req.userID,
        ...sanitizedData,
        createdBy: req.userID
    });

    await policy.save();

    res.status(201).json({
        success: true,
        data: policy,
        message: 'Dunning policy created successfully',
        messageAr: 'تم إنشاء سياسة التحصيل بنجاح'
    });
});

/**
 * GET /api/dunning/policies/:id
 * Get single dunning policy
 */
const getPolicy = asyncHandler(async (req, res) => {
    const policyId = sanitizeObjectId(req.params.id, 'Policy ID');

    const policy = await DunningPolicy.findOne({
        _id: policyId,
        ...req.firmQuery
    })
        .populate('clientIds', 'name email')
        .populate('excludeClientIds', 'name email')
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email');

    if (!policy) {
        throw CustomException('Dunning policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة التحصيل'
        });
    }

    res.json({
        success: true,
        data: policy
    });
});

/**
 * PUT /api/dunning/policies/:id
 * Update dunning policy
 */
const updatePolicy = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('Access denied: Departed users cannot manage dunning policies', 403, {
            messageAr: 'ليس لديك صلاحية لإدارة سياسات التحصيل'
        });
    }

    const policyId = sanitizeObjectId(req.params.id, 'Policy ID');

    const policy = await DunningPolicy.findOne({
        _id: policyId,
        ...req.firmQuery
    });

    if (!policy) {
        throw CustomException('Dunning policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة التحصيل'
        });
    }

    // Mass assignment protection
    const sanitizedData = pickAllowedFields(req.body, POLICY_UPDATE_ALLOWED_FIELDS);

    // Validate stages if provided
    if (sanitizedData.stages) {
        if (!Array.isArray(sanitizedData.stages) || sanitizedData.stages.length === 0) {
            throw CustomException('At least one dunning stage is required', 400, {
                messageAr: 'مرحلة واحدة على الأقل مطلوبة'
            });
        }

        // Validate stage order and days
        const sortedStages = [...sanitizedData.stages].sort((a, b) => a.order - b.order);
        for (let i = 0; i < sortedStages.length; i++) {
            if (sortedStages[i].order !== i + 1) {
                throw CustomException('Stage orders must be sequential starting from 1', 400, {
                    messageAr: 'يجب أن تكون ترتيب المراحل متسلسلة بدءًا من 1'
                });
            }

            if (i > 0 && sortedStages[i].daysOverdue <= sortedStages[i - 1].daysOverdue) {
                throw CustomException('Each stage must have more days overdue than the previous stage', 400, {
                    messageAr: 'يجب أن يكون لكل مرحلة أيام تأخير أكثر من المرحلة السابقة'
                });
            }
        }
    }

    // Apply updates
    Object.keys(sanitizedData).forEach(field => {
        policy[field] = sanitizedData[field];
    });

    policy.updatedBy = req.userID;
    await policy.save();

    res.json({
        success: true,
        data: policy,
        message: 'Dunning policy updated successfully',
        messageAr: 'تم تحديث سياسة التحصيل بنجاح'
    });
});

/**
 * DELETE /api/dunning/policies/:id
 * Soft delete dunning policy
 */
const deletePolicy = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('Access denied: Departed users cannot manage dunning policies', 403, {
            messageAr: 'ليس لديك صلاحية لإدارة سياسات التحصيل'
        });
    }

    const policyId = sanitizeObjectId(req.params.id, 'Policy ID');

    const policy = await DunningPolicy.findOne({
        _id: policyId,
        ...req.firmQuery
    });

    if (!policy) {
        throw CustomException('Dunning policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة التحصيل'
        });
    }

    if (policy.isDefault) {
        throw CustomException('Cannot delete default policy. Set another policy as default first.', 400, {
            messageAr: 'لا يمكن حذف السياسة الافتراضية. قم بتعيين سياسة أخرى كافتراضية أولاً'
        });
    }

    // Check if policy is actively being used
    // TODO: Add check for active dunning processes using this policy
    // const activeProcesses = await DunningHistory.countDocuments({ policyId, status: 'active' });
    // if (activeProcesses > 0) {
    //     throw CustomException('Cannot delete policy with active dunning processes', 400, {
    //         messageAr: 'لا يمكن حذف سياسة لديها عمليات تحصيل نشطة'
    //     });
    // }

    // Soft delete
    policy.isActive = false;
    policy.deletedAt = new Date();
    policy.deletedBy = req.userID;
    await policy.save();

    res.json({
        success: true,
        message: 'Dunning policy deleted successfully',
        messageAr: 'تم حذف سياسة التحصيل بنجاح'
    });
});

/**
 * POST /api/dunning/policies/:id/set-default
 * Set dunning policy as default
 */
const setDefaultPolicy = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('Access denied: Departed users cannot manage dunning policies', 403, {
            messageAr: 'ليس لديك صلاحية لإدارة سياسات التحصيل'
        });
    }

    const policyId = sanitizeObjectId(req.params.id, 'Policy ID');

    const policy = await DunningPolicy.findOne({
        _id: policyId,
        ...req.firmQuery
    });

    if (!policy) {
        throw CustomException('Dunning policy not found', 404, {
            messageAr: 'لم يتم العثور على سياسة التحصيل'
        });
    }

    if (!policy.isActive) {
        throw CustomException('Cannot set inactive policy as default', 400, {
            messageAr: 'لا يمكن تعيين سياسة غير نشطة كافتراضية'
        });
    }

    // Remove default flag from all other policies
    await DunningPolicy.updateMany(
        { ...req.firmQuery, _id: { $ne: policyId } },
        { $set: { isDefault: false } }
    );

    // Set this policy as default
    policy.isDefault = true;
    policy.updatedBy = req.userID;
    await policy.save();

    res.json({
        success: true,
        data: policy,
        message: 'Default dunning policy updated successfully',
        messageAr: 'تم تحديث سياسة التحصيل الافتراضية بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// DUNNING HISTORY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/dunning/history
 * List dunning history with filters
 *
 * Note: This endpoint requires DunningHistory model to be implemented
 * Currently returns placeholder response
 */
const listHistory = asyncHandler(async (req, res) => {
    const {
        status,
        invoiceId,
        clientId,
        policyId,
        currentStage,
        startDate,
        endDate,
        page = 1,
        limit = 50
    } = req.query;

    // TODO: Implement when DunningHistory model is available
    // const query = { ...req.firmQuery };
    //
    // if (status) query.status = status;
    // if (invoiceId) query.invoiceId = sanitizeObjectId(invoiceId, 'Invoice ID');
    // if (clientId) query.clientId = sanitizeObjectId(clientId, 'Client ID');
    // if (policyId) query.policyId = sanitizeObjectId(policyId, 'Policy ID');
    // if (currentStage) query.currentStage = parseInt(currentStage);
    //
    // if (startDate || endDate) {
    //     query.createdAt = {};
    //     if (startDate) query.createdAt.$gte = new Date(startDate);
    //     if (endDate) query.createdAt.$lte = new Date(endDate);
    // }
    //
    // const skip = (parseInt(page) - 1) * parseInt(limit);
    //
    // const [history, total] = await Promise.all([
    //     DunningHistory.find(query)
    //         .populate('invoiceId', 'invoiceNumber amount dueDate')
    //         .populate('clientId', 'name email')
    //         .populate('policyId', 'name')
    //         .sort({ createdAt: -1 })
    //         .limit(parseInt(limit))
    //         .skip(skip),
    //     DunningHistory.countDocuments(query)
    // ]);

    logger.info('Dunning history requested - DunningHistory model not yet implemented');

    res.json({
        success: true,
        data: [],
        pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0
        },
        message: 'DunningHistory model not yet implemented',
        messageAr: 'نموذج سجل التحصيل غير متاح حالياً'
    });
});

/**
 * GET /api/dunning/history/:invoiceId
 * Get dunning history for specific invoice
 *
 * Note: This endpoint requires DunningHistory model to be implemented
 */
const getInvoiceHistory = asyncHandler(async (req, res) => {
    const invoiceId = sanitizeObjectId(req.params.invoiceId, 'Invoice ID');

    // Verify invoice exists and user has access
    const invoice = await Invoice.findOne({
        _id: invoiceId,
        ...req.firmQuery
    });

    if (!invoice) {
        throw CustomException('Invoice not found', 404, {
            messageAr: 'لم يتم العثور على الفاتورة'
        });
    }

    // TODO: Implement when DunningHistory model is available
    // const history = await DunningHistory.find({
    //     invoiceId,
    //     ...req.firmQuery
    // })
    //     .populate('policyId', 'name stages')
    //     .sort({ createdAt: -1 });

    logger.info(`Dunning history for invoice ${invoiceId} requested - DunningHistory model not yet implemented`);

    res.json({
        success: true,
        data: {
            invoice: {
                id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                amount: invoice.totalAmount,
                dueDate: invoice.dueDate
            },
            history: []
        },
        message: 'DunningHistory model not yet implemented',
        messageAr: 'نموذج سجل التحصيل غير متاح حالياً'
    });
});

/**
 * POST /api/dunning/history/:id/pause
 * Pause dunning process
 *
 * Note: This endpoint requires DunningHistory model to be implemented
 */
const pauseDunning = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('Access denied: Departed users cannot manage dunning processes', 403, {
            messageAr: 'ليس لديك صلاحية لإدارة عمليات التحصيل'
        });
    }

    const historyId = sanitizeObjectId(req.params.id, 'History ID');
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
        throw CustomException('Pause reason is required (minimum 3 characters)', 400, {
            messageAr: 'سبب الإيقاف مطلوب (3 أحرف على الأقل)'
        });
    }

    // TODO: Implement when DunningHistory model is available
    // const dunningProcess = await DunningHistory.findOne({
    //     _id: historyId,
    //     ...req.firmQuery
    // });
    //
    // if (!dunningProcess) {
    //     throw CustomException('Dunning process not found', 404, {
    //         messageAr: 'لم يتم العثور على عملية التحصيل'
    //     });
    // }
    //
    // if (dunningProcess.status !== 'active') {
    //     throw CustomException('Can only pause active dunning processes', 400, {
    //         messageAr: 'يمكن فقط إيقاف عمليات التحصيل النشطة'
    //     });
    // }
    //
    // dunningProcess.status = 'paused';
    // dunningProcess.pausedAt = new Date();
    // dunningProcess.pausedBy = req.userID;
    // dunningProcess.pauseReason = reason;
    // await dunningProcess.save();

    logger.info(`Pause dunning ${historyId} requested - DunningHistory model not yet implemented`);

    res.json({
        success: true,
        message: 'DunningHistory model not yet implemented',
        messageAr: 'نموذج سجل التحصيل غير متاح حالياً'
    });
});

/**
 * POST /api/dunning/history/:id/resume
 * Resume paused dunning process
 *
 * Note: This endpoint requires DunningHistory model to be implemented
 */
const resumeDunning = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('Access denied: Departed users cannot manage dunning processes', 403, {
            messageAr: 'ليس لديك صلاحية لإدارة عمليات التحصيل'
        });
    }

    const historyId = sanitizeObjectId(req.params.id, 'History ID');

    // TODO: Implement when DunningHistory model is available
    // const dunningProcess = await DunningHistory.findOne({
    //     _id: historyId,
    //     ...req.firmQuery
    // });
    //
    // if (!dunningProcess) {
    //     throw CustomException('Dunning process not found', 404, {
    //         messageAr: 'لم يتم العثور على عملية التحصيل'
    //     });
    // }
    //
    // if (dunningProcess.status !== 'paused') {
    //     throw CustomException('Can only resume paused dunning processes', 400, {
    //         messageAr: 'يمكن فقط استئناف عمليات التحصيل الموقوفة'
    //     });
    // }
    //
    // dunningProcess.status = 'active';
    // dunningProcess.resumedAt = new Date();
    // dunningProcess.resumedBy = req.userID;
    // await dunningProcess.save();

    logger.info(`Resume dunning ${historyId} requested - DunningHistory model not yet implemented`);

    res.json({
        success: true,
        message: 'DunningHistory model not yet implemented',
        messageAr: 'نموذج سجل التحصيل غير متاح حالياً'
    });
});

/**
 * POST /api/dunning/history/:id/advance
 * Manually advance to next dunning stage
 *
 * Note: This endpoint requires DunningHistory model to be implemented
 */
const advanceStage = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('Access denied: Departed users cannot manage dunning processes', 403, {
            messageAr: 'ليس لديك صلاحية لإدارة عمليات التحصيل'
        });
    }

    const historyId = sanitizeObjectId(req.params.id, 'History ID');
    const { reason } = req.body;

    // TODO: Implement when DunningHistory model is available
    // const dunningProcess = await DunningHistory.findOne({
    //     _id: historyId,
    //     ...req.firmQuery
    // }).populate('policyId');
    //
    // if (!dunningProcess) {
    //     throw CustomException('Dunning process not found', 404, {
    //         messageAr: 'لم يتم العثور على عملية التحصيل'
    //     });
    // }
    //
    // if (dunningProcess.status !== 'active') {
    //     throw CustomException('Can only advance active dunning processes', 400, {
    //         messageAr: 'يمكن فقط تقديم عمليات التحصيل النشطة'
    //     });
    // }
    //
    // const policy = dunningProcess.policyId;
    // const nextStage = dunningProcess.currentStage + 1;
    //
    // if (nextStage > policy.stages.length) {
    //     throw CustomException('Already at final dunning stage', 400, {
    //         messageAr: 'بالفعل في المرحلة النهائية للتحصيل'
    //     });
    // }
    //
    // dunningProcess.currentStage = nextStage;
    // dunningProcess.stageHistory.push({
    //     stage: nextStage,
    //     advancedAt: new Date(),
    //     advancedBy: req.userID,
    //     reason: reason || 'Manual advancement',
    //     isManual: true
    // });
    // await dunningProcess.save();
    //
    // // TODO: Trigger stage action (email, SMS, etc.)
    // await dunningService.executeStageAction(dunningProcess, policy.stages[nextStage - 1]);

    logger.info(`Advance dunning stage ${historyId} requested - DunningHistory model not yet implemented`);

    res.json({
        success: true,
        message: 'DunningHistory model not yet implemented',
        messageAr: 'نموذج سجل التحصيل غير متاح حالياً'
    });
});

/**
 * POST /api/dunning/history/:id/cancel
 * Cancel dunning process
 *
 * Note: This endpoint requires DunningHistory model to be implemented
 */
const cancelDunning = asyncHandler(async (req, res) => {
    // Block departed users from financial operations
    if (req.isDeparted) {
        throw CustomException('Access denied: Departed users cannot manage dunning processes', 403, {
            messageAr: 'ليس لديك صلاحية لإدارة عمليات التحصيل'
        });
    }

    const historyId = sanitizeObjectId(req.params.id, 'History ID');
    const { reason } = req.body;

    if (!reason || reason.trim().length < 3) {
        throw CustomException('Cancellation reason is required (minimum 3 characters)', 400, {
            messageAr: 'سبب الإلغاء مطلوب (3 أحرف على الأقل)'
        });
    }

    // TODO: Implement when DunningHistory model is available
    // const dunningProcess = await DunningHistory.findOne({
    //     _id: historyId,
    //     ...req.firmQuery
    // });
    //
    // if (!dunningProcess) {
    //     throw CustomException('Dunning process not found', 404, {
    //         messageAr: 'لم يتم العثور على عملية التحصيل'
    //     });
    // }
    //
    // if (dunningProcess.status === 'cancelled' || dunningProcess.status === 'completed') {
    //     throw CustomException('Cannot cancel completed or already cancelled dunning process', 400, {
    //         messageAr: 'لا يمكن إلغاء عملية تحصيل مكتملة أو ملغاة بالفعل'
    //     });
    // }
    //
    // dunningProcess.status = 'cancelled';
    // dunningProcess.cancelledAt = new Date();
    // dunningProcess.cancelledBy = req.userID;
    // dunningProcess.cancellationReason = reason;
    // await dunningProcess.save();

    logger.info(`Cancel dunning ${historyId} requested - DunningHistory model not yet implemented`);

    res.json({
        success: true,
        message: 'DunningHistory model not yet implemented',
        messageAr: 'نموذج سجل التحصيل غير متاح حالياً'
    });
});

// ═══════════════════════════════════════════════════════════════
// DASHBOARD & REPORTING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/dunning/dashboard
 * Get dunning dashboard statistics
 */
const getDashboard = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Get active policies count
    const activePolicies = await DunningPolicy.countDocuments({
        ...req.firmQuery,
        isActive: true
    });

    // Get overdue invoices
    const overdueInvoices = await Invoice.aggregate([
        {
            $match: {
                ...req.firmQuery,
                status: { $in: ['sent', 'overdue', 'partially_paid'] },
                dueDate: { $lt: new Date() }
            }
        },
        {
            $group: {
                _id: null,
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' },
                totalOutstanding: { $sum: { $subtract: ['$totalAmount', '$amountPaid'] } }
            }
        }
    ]);

    const overdueStats = overdueInvoices[0] || {
        count: 0,
        totalAmount: 0,
        totalOutstanding: 0
    };

    // Calculate aging buckets
    const now = new Date();
    const agingBuckets = await Invoice.aggregate([
        {
            $match: {
                ...req.firmQuery,
                status: { $in: ['sent', 'overdue', 'partially_paid'] },
                dueDate: { $lt: now }
            }
        },
        {
            $addFields: {
                daysOverdue: {
                    $divide: [
                        { $subtract: [now, '$dueDate'] },
                        1000 * 60 * 60 * 24
                    ]
                }
            }
        },
        {
            $bucket: {
                groupBy: '$daysOverdue',
                boundaries: [0, 7, 14, 30, 60, 90, Infinity],
                default: 'over_90',
                output: {
                    count: { $sum: 1 },
                    amount: { $sum: { $subtract: ['$totalAmount', '$amountPaid'] } }
                }
            }
        }
    ]);

    // TODO: Add dunning history stats when model is available
    // const activeProcesses = await DunningHistory.countDocuments({
    //     ...req.firmQuery,
    //     status: 'active'
    // });
    //
    // const pausedProcesses = await DunningHistory.countDocuments({
    //     ...req.firmQuery,
    //     status: 'paused'
    // });
    //
    // const completedProcesses = await DunningHistory.countDocuments({
    //     ...req.firmQuery,
    //     status: 'completed',
    //     ...(Object.keys(dateFilter).length > 0 && { completedAt: dateFilter })
    // });

    res.json({
        success: true,
        data: {
            policies: {
                active: activePolicies,
                total: await DunningPolicy.countDocuments(req.firmQuery)
            },
            overdue: {
                count: overdueStats.count,
                totalAmount: overdueStats.totalAmount,
                totalOutstanding: overdueStats.totalOutstanding
            },
            aging: agingBuckets.map(bucket => ({
                range: bucket._id === 'over_90' ? '90+' : `${bucket._id}-${bucket._id === 0 ? 7 : bucket._id === 7 ? 14 : bucket._id === 14 ? 30 : bucket._id === 30 ? 60 : bucket._id === 60 ? 90 : 'Infinity'}`,
                count: bucket.count,
                amount: bucket.amount
            })),
            processes: {
                active: 0, // TODO: Implement when DunningHistory model is available
                paused: 0,
                completed: 0
            }
        }
    });
});

/**
 * GET /api/dunning/report
 * Generate dunning report with optional export
 */
const getReport = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        policyId,
        format = 'json', // json, csv, xlsx
        groupBy = 'policy' // policy, client, stage, date
    } = req.query;

    // Validate format
    const validFormats = ['json', 'csv', 'xlsx'];
    if (!validFormats.includes(format)) {
        throw CustomException(`Invalid format. Must be one of: ${validFormats.join(', ')}`, 400, {
            messageAr: 'صيغة غير صالحة'
        });
    }

    // Build filters
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const query = { ...req.firmQuery };
    if (policyId) {
        query._id = sanitizeObjectId(policyId, 'Policy ID');
    }

    // Get policies
    const policies = await DunningPolicy.find(query)
        .populate('clientIds', 'name email')
        .lean();

    // TODO: Add dunning history data when model is available
    // const historyData = await DunningHistory.aggregate([
    //     {
    //         $match: {
    //             ...req.firmQuery,
    //             ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    //             ...(policyId && { policyId: mongoose.Types.ObjectId(policyId) })
    //         }
    //     },
    //     {
    //         $group: {
    //             _id: groupBy === 'policy' ? '$policyId' :
    //                  groupBy === 'client' ? '$clientId' :
    //                  groupBy === 'stage' ? '$currentStage' :
    //                  { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
    //             totalProcesses: { $sum: 1 },
    //             activeProcesses: {
    //                 $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
    //             },
    //             completedProcesses: {
    //                 $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
    //             },
    //             cancelledProcesses: {
    //                 $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
    //             },
    //             totalInvoices: { $addToSet: '$invoiceId' }
    //         }
    //     }
    // ]);

    const reportData = {
        generatedAt: new Date(),
        period: {
            startDate: startDate || null,
            endDate: endDate || null
        },
        groupBy,
        policies: policies.map(p => ({
            id: p._id,
            name: p.name,
            nameAr: p.nameAr,
            isActive: p.isActive,
            isDefault: p.isDefault,
            stages: p.stages.length
        })),
        summary: {
            totalPolicies: policies.length,
            activePolicies: policies.filter(p => p.isActive).length,
            // Add more summary stats when DunningHistory is available
        }
    };

    // Handle different export formats
    if (format === 'json') {
        res.json({
            success: true,
            data: reportData
        });
    } else if (format === 'csv') {
        // TODO: Implement CSV export
        // const csv = convertToCSV(reportData);
        // res.setHeader('Content-Type', 'text/csv');
        // res.setHeader('Content-Disposition', `attachment; filename=dunning-report-${Date.now()}.csv`);
        // res.send(csv);

        throw CustomException('CSV export not yet implemented', 501, {
            messageAr: 'تصدير CSV غير متاح حالياً'
        });
    } else if (format === 'xlsx') {
        // TODO: Implement XLSX export
        // const workbook = convertToXLSX(reportData);
        // res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        // res.setHeader('Content-Disposition', `attachment; filename=dunning-report-${Date.now()}.xlsx`);
        // await workbook.xlsx.write(res);

        throw CustomException('XLSX export not yet implemented', 501, {
            messageAr: 'تصدير XLSX غير متاح حالياً'
        });
    }
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // Policy endpoints
    listPolicies,
    createPolicy,
    getPolicy,
    updatePolicy,
    deletePolicy,
    setDefaultPolicy,

    // History endpoints
    listHistory,
    getInvoiceHistory,
    pauseDunning,
    resumeDunning,
    advanceStage,
    cancelDunning,

    // Dashboard & reporting
    getDashboard,
    getReport
};
