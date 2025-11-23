const { TimeEntry, BillingRate, BillingActivity, Case } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// In-memory timer state (in production, use Redis or database)
const activeTimers = new Map();

/**
 * Start timer for time tracking
 * POST /api/time-tracking/timer/start
 */
const startTimer = asyncHandler(async (req, res) => {
    const { caseId, clientId, activityCode, description } = req.body;
    const lawyerId = req.userID;

    // Check if timer already running for this lawyer
    if (activeTimers.has(lawyerId)) {
        throw new CustomException('يوجد مؤقت قيد التشغيل بالفعل. يرجى إيقافه أولاً', 400);
    }

    // Validate case if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw new CustomException('القضية غير موجودة', 404);
        }
        if (caseDoc.lawyerId.toString() !== lawyerId) {
            throw new CustomException('لا يمكنك الوصول إلى هذه القضية', 403);
        }
    }

    // Get applicable hourly rate
    const hourlyRate = await BillingRate.getApplicableRate(lawyerId, clientId, null, activityCode);

    if (!hourlyRate) {
        throw new CustomException('لم يتم العثور على سعر بالساعة. يرجى تعيين الأسعار أولاً', 400);
    }

    // Create timer state
    const timerState = {
        lawyerId,
        caseId,
        clientId,
        activityCode,
        description: description || '',
        hourlyRate,
        startedAt: new Date(),
        pausedDuration: 0,
        isPaused: false,
        pausedAt: null
    };

    activeTimers.set(lawyerId, timerState);

    res.status(200).json({
        success: true,
        message: 'تم بدء المؤقت بنجاح',
        timer: {
            startedAt: timerState.startedAt,
            hourlyRate: timerState.hourlyRate,
            description: timerState.description,
            caseId: timerState.caseId,
            activityCode: timerState.activityCode
        }
    });
});

/**
 * Pause timer
 * POST /api/time-tracking/timer/pause
 */
const pauseTimer = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const timer = activeTimers.get(lawyerId);

    if (!timer) {
        throw new CustomException('لا يوجد مؤقت نشط', 400);
    }

    if (timer.isPaused) {
        throw new CustomException('المؤقت متوقف مؤقتاً بالفعل', 400);
    }

    timer.isPaused = true;
    timer.pausedAt = new Date();

    res.status(200).json({
        success: true,
        message: 'تم إيقاف المؤقت مؤقتاً',
        timer: {
            pausedAt: timer.pausedAt,
            elapsedMinutes: calculateElapsedMinutes(timer)
        }
    });
});

/**
 * Resume timer
 * POST /api/time-tracking/timer/resume
 */
const resumeTimer = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;

    const timer = activeTimers.get(lawyerId);

    if (!timer) {
        throw new CustomException('لا يوجد مؤقت نشط', 400);
    }

    if (!timer.isPaused) {
        throw new CustomException('المؤقت قيد التشغيل بالفعل', 400);
    }

    // Add paused duration
    const pausedTime = new Date() - timer.pausedAt;
    timer.pausedDuration += pausedTime;
    timer.isPaused = false;
    timer.pausedAt = null;

    res.status(200).json({
        success: true,
        message: 'تم استئناف المؤقت',
        timer: {
            elapsedMinutes: calculateElapsedMinutes(timer),
            pausedDuration: timer.pausedDuration
        }
    });
});

/**
 * Stop timer and create time entry
 * POST /api/time-tracking/timer/stop
 */
const stopTimer = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const { notes, isBillable = true } = req.body;

    const timer = activeTimers.get(lawyerId);

    if (!timer) {
        throw new CustomException('لا يوجد مؤقت نشط', 400);
    }

    // If paused, add final pause duration
    if (timer.isPaused) {
        const pausedTime = new Date() - timer.pausedAt;
        timer.pausedDuration += pausedTime;
    }

    // Calculate total duration in minutes
    const duration = calculateElapsedMinutes(timer);

    // Create time entry
    const timeEntry = await TimeEntry.create({
        lawyerId,
        clientId: timer.clientId,
        caseId: timer.caseId,
        date: timer.startedAt,
        description: timer.description,
        duration,
        hourlyRate: timer.hourlyRate,
        activityCode: timer.activityCode,
        isBillable,
        wasTimerBased: true,
        timerStartedAt: timer.startedAt,
        timerPausedDuration: timer.pausedDuration,
        notes: notes || '',
        status: 'draft'
    });

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'time_entry_created',
        userId: lawyerId,
        clientId: timer.clientId,
        relatedModel: 'TimeEntry',
        relatedId: timeEntry._id,
        description: `تم إنشاء إدخال وقت جديد: ${timer.description}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    // Remove timer
    activeTimers.delete(lawyerId);

    // Populate response
    await timeEntry.populate([
        { path: 'lawyerId', select: 'username image' },
        { path: 'clientId', select: 'username' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إيقاف المؤقت وإنشاء إدخال الوقت',
        timeEntry
    });
});

/**
 * Get current timer status
 * GET /api/time-tracking/timer/status
 */
const getTimerStatus = asyncHandler(async (req, res) => {
    const lawyerId = req.userID;
    const timer = activeTimers.get(lawyerId);

    if (!timer) {
        return res.status(200).json({
            success: true,
            isRunning: false,
            timer: null
        });
    }

    res.status(200).json({
        success: true,
        isRunning: true,
        timer: {
            startedAt: timer.startedAt,
            description: timer.description,
            caseId: timer.caseId,
            activityCode: timer.activityCode,
            hourlyRate: timer.hourlyRate,
            isPaused: timer.isPaused,
            pausedAt: timer.pausedAt,
            elapsedMinutes: calculateElapsedMinutes(timer),
            pausedDuration: timer.pausedDuration
        }
    });
});

/**
 * Create time entry manually
 * POST /api/time-tracking/entries
 */
const createTimeEntry = asyncHandler(async (req, res) => {
    const {
        caseId,
        clientId,
        date,
        description,
        duration,
        hourlyRate,
        activityCode,
        isBillable = true,
        notes,
        attachments
    } = req.body;

    const lawyerId = req.userID;

    // Validate required fields
    if (!description || !date || !duration || !hourlyRate) {
        throw new CustomException('الحقول المطلوبة: الوصف، التاريخ، المدة، السعر بالساعة', 400);
    }

    // Validate case
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw new CustomException('القضية غير موجودة', 404);
        }
        if (caseDoc.lawyerId.toString() !== lawyerId) {
            throw new CustomException('لا يمكنك الوصول إلى هذه القضية', 403);
        }
    }

    const timeEntry = await TimeEntry.create({
        lawyerId,
        clientId,
        caseId,
        date: new Date(date),
        description,
        duration,
        hourlyRate,
        activityCode,
        isBillable,
        notes,
        attachments: attachments || [],
        status: 'draft',
        wasTimerBased: false
    });

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'time_entry_created',
        userId: lawyerId,
        clientId,
        relatedModel: 'TimeEntry',
        relatedId: timeEntry._id,
        description: `تم إنشاء إدخال وقت يدوي: ${description}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await timeEntry.populate([
        { path: 'lawyerId', select: 'username image' },
        { path: 'clientId', select: 'username' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء إدخال الوقت بنجاح',
        timeEntry
    });
});

/**
 * Get time entries with filters
 * GET /api/time-tracking/entries
 */
const getTimeEntries = asyncHandler(async (req, res) => {
    const {
        status,
        caseId,
        clientId,
        startDate,
        endDate,
        isBillable,
        activityCode,
        page = 1,
        limit = 50
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (status) query.status = status;
    if (caseId) query.caseId = caseId;
    if (clientId) query.clientId = clientId;
    if (isBillable !== undefined) query.isBillable = isBillable === 'true';
    if (activityCode) query.activityCode = activityCode;

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    const timeEntries = await TimeEntry.find(query)
        .populate('lawyerId', 'username image')
        .populate('clientId', 'username')
        .populate('caseId', 'title caseNumber')
        .populate('approvedBy', 'username')
        .populate('invoiceId', 'invoiceNumber')
        .sort({ date: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await TimeEntry.countDocuments(query);

    // Calculate totals
    const totals = await TimeEntry.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalDuration: { $sum: '$duration' },
                totalAmount: { $sum: '$totalAmount' },
                billableDuration: {
                    $sum: { $cond: ['$isBillable', '$duration', 0] }
                },
                billableAmount: {
                    $sum: { $cond: ['$isBillable', '$totalAmount', 0] }
                }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: timeEntries,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        },
        summary: totals[0] || {
            totalDuration: 0,
            totalAmount: 0,
            billableDuration: 0,
            billableAmount: 0
        }
    });
});

/**
 * Get single time entry
 * GET /api/time-tracking/entries/:id
 */
const getTimeEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const timeEntry = await TimeEntry.findById(id)
        .populate('lawyerId', 'username image email')
        .populate('clientId', 'username email')
        .populate('caseId', 'title caseNumber category')
        .populate('approvedBy', 'username')
        .populate('invoiceId', 'invoiceNumber status');

    if (!timeEntry) {
        throw new CustomException('إدخال الوقت غير موجود', 404);
    }

    if (timeEntry.lawyerId._id.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الإدخال', 403);
    }

    res.status(200).json({
        success: true,
        data: timeEntry
    });
});

/**
 * Update time entry
 * PUT /api/time-tracking/entries/:id
 */
const updateTimeEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const timeEntry = await TimeEntry.findById(id);

    if (!timeEntry) {
        throw new CustomException('إدخال الوقت غير موجود', 404);
    }

    if (timeEntry.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الإدخال', 403);
    }

    // Cannot update if invoiced
    if (timeEntry.invoiceId) {
        throw new CustomException('لا يمكن تحديث إدخال وقت مُدرج في فاتورة', 400);
    }

    // Cannot update if approved
    if (timeEntry.status === 'approved') {
        throw new CustomException('لا يمكن تحديث إدخال وقت تمت الموافقة عليه', 400);
    }

    // Track changes
    const changes = {};
    const allowedFields = ['description', 'duration', 'hourlyRate', 'activityCode', 'isBillable', 'notes'];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== timeEntry[field]) {
            changes[field] = { old: timeEntry[field], new: req.body[field] };
            timeEntry[field] = req.body[field];
        }
    });

    // Add to edit history
    if (Object.keys(changes).length > 0) {
        timeEntry.editHistory.push({
            editedBy: lawyerId,
            editedAt: new Date(),
            changes
        });
    }

    await timeEntry.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'time_entry_updated',
        userId: lawyerId,
        clientId: timeEntry.clientId,
        relatedModel: 'TimeEntry',
        relatedId: timeEntry._id,
        description: `تم تحديث إدخال الوقت: ${timeEntry.description}`,
        changes,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await timeEntry.populate([
        { path: 'lawyerId', select: 'username image' },
        { path: 'clientId', select: 'username' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم تحديث إدخال الوقت بنجاح',
        timeEntry
    });
});

/**
 * Delete time entry
 * DELETE /api/time-tracking/entries/:id
 */
const deleteTimeEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const timeEntry = await TimeEntry.findById(id);

    if (!timeEntry) {
        throw new CustomException('إدخال الوقت غير موجود', 404);
    }

    if (timeEntry.lawyerId.toString() !== lawyerId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا الإدخال', 403);
    }

    // Cannot delete if invoiced
    if (timeEntry.invoiceId) {
        throw new CustomException('لا يمكن حذف إدخال وقت مُدرج في فاتورة', 400);
    }

    await TimeEntry.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف إدخال الوقت بنجاح'
    });
});

/**
 * Approve time entry
 * POST /api/time-tracking/entries/:id/approve
 */
const approveTimeEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const approverId = req.userID;

    const timeEntry = await TimeEntry.findById(id);

    if (!timeEntry) {
        throw new CustomException('إدخال الوقت غير موجود', 404);
    }

    if (timeEntry.status === 'approved') {
        throw new CustomException('تمت الموافقة على الإدخال بالفعل', 400);
    }

    if (timeEntry.status === 'invoiced') {
        throw new CustomException('لا يمكن الموافقة على إدخال مُدرج في فاتورة', 400);
    }

    timeEntry.status = 'approved';
    timeEntry.approvedBy = approverId;
    timeEntry.approvedAt = new Date();
    await timeEntry.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'time_entry_approved',
        userId: approverId,
        clientId: timeEntry.clientId,
        relatedModel: 'TimeEntry',
        relatedId: timeEntry._id,
        description: `تمت الموافقة على إدخال الوقت: ${timeEntry.description}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await timeEntry.populate([
        { path: 'lawyerId', select: 'username image' },
        { path: 'approvedBy', select: 'username' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تمت الموافقة على إدخال الوقت بنجاح',
        timeEntry
    });
});

/**
 * Reject time entry
 * POST /api/time-tracking/entries/:id/reject
 */
const rejectTimeEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const reviewerId = req.userID;

    if (!reason) {
        throw new CustomException('سبب الرفض مطلوب', 400);
    }

    const timeEntry = await TimeEntry.findById(id);

    if (!timeEntry) {
        throw new CustomException('إدخال الوقت غير موجود', 404);
    }

    timeEntry.status = 'rejected';
    timeEntry.rejectionReason = reason;
    await timeEntry.save();

    // Log activity
    await BillingActivity.logActivity({
        activityType: 'time_entry_rejected',
        userId: reviewerId,
        clientId: timeEntry.clientId,
        relatedModel: 'TimeEntry',
        relatedId: timeEntry._id,
        description: `تم رفض إدخال الوقت: ${timeEntry.description}. السبب: ${reason}`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    await timeEntry.populate([
        { path: 'lawyerId', select: 'username image' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم رفض إدخال الوقت',
        timeEntry
    });
});

/**
 * Get time entry statistics
 * GET /api/time-tracking/stats
 */
const getTimeStats = asyncHandler(async (req, res) => {
    const { startDate, endDate, caseId, groupBy = 'day' } = req.query;
    const lawyerId = req.userID;

    const matchQuery = { lawyerId };

    if (startDate || endDate) {
        matchQuery.date = {};
        if (startDate) matchQuery.date.$gte = new Date(startDate);
        if (endDate) matchQuery.date.$lte = new Date(endDate);
    }

    if (caseId) matchQuery.caseId = caseId;

    // Overall stats
    const overallStats = await TimeEntry.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalEntries: { $sum: 1 },
                totalDuration: { $sum: '$duration' },
                totalAmount: { $sum: '$totalAmount' },
                billableDuration: { $sum: { $cond: ['$isBillable', '$duration', 0] } },
                billableAmount: { $sum: { $cond: ['$isBillable', '$totalAmount', 0] } },
                avgHourlyRate: { $avg: '$hourlyRate' }
            }
        }
    ]);

    // Group by activity code
    const byActivity = await TimeEntry.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$activityCode',
                count: { $sum: 1 },
                totalDuration: { $sum: '$duration' },
                totalAmount: { $sum: '$totalAmount' }
            }
        },
        { $sort: { totalAmount: -1 } }
    ]);

    // Group by status
    const byStatus = await TimeEntry.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: {
            overall: overallStats[0] || {},
            byActivity,
            byStatus
        }
    });
});

/**
 * Bulk delete time entries
 * DELETE /api/time-tracking/entries/bulk
 */
const bulkDeleteTimeEntries = asyncHandler(async (req, res) => {
    const { entryIds } = req.body;
    const lawyerId = req.userID;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
        throw new CustomException('معرفات الإدخالات مطلوبة', 400);
    }

    // Verify all entries belong to lawyer and are not invoiced
    const entries = await TimeEntry.find({
        _id: { $in: entryIds },
        lawyerId,
        invoiceId: { $exists: false }
    });

    if (entries.length !== entryIds.length) {
        throw new CustomException('بعض الإدخالات غير صالحة للحذف', 400);
    }

    await TimeEntry.deleteMany({ _id: { $in: entryIds } });

    res.status(200).json({
        success: true,
        message: `تم حذف ${entries.length} إدخالات وقت بنجاح`,
        count: entries.length
    });
});

// Helper function to calculate elapsed minutes from timer
function calculateElapsedMinutes(timer) {
    const now = timer.isPaused ? timer.pausedAt : new Date();
    const totalMs = now - timer.startedAt - timer.pausedDuration;
    return Math.round(totalMs / 1000 / 60); // Convert to minutes
}

module.exports = {
    // Timer operations
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    getTimerStatus,

    // Time entry CRUD
    createTimeEntry,
    getTimeEntries,
    getTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,

    // Approval workflow
    approveTimeEntry,
    rejectTimeEntry,

    // Analytics
    getTimeStats,

    // Bulk operations
    bulkDeleteTimeEntries
};
