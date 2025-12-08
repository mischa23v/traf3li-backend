const { TimeEntry, BillingRate, BillingActivity, Case, Client } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// In-memory timer state (in production, use Redis or database)
const activeTimers = new Map();

// ═══════════════════════════════════════════════════════════════
// HELPER: Get firm filter for multi-tenancy
// ═══════════════════════════════════════════════════════════════
const getFirmFilter = (req) => {
    if (req.firm && req.firm._id) {
        return { firmId: req.firm._id };
    }
    if (req.firmId) {
        return { firmId: req.firmId };
    }
    if (req.user && req.user._id) {
        return { lawyerId: req.user._id };
    }
    return {};
};

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════
const validateTimeEntry = (data) => {
    const errors = [];

    if (!data.clientId) errors.push('Client is required');
    if (!data.date) errors.push('Date is required');
    if (!data.description || data.description.length < 10) {
        errors.push('Description must be at least 10 characters');
    }
    if (!data.duration || data.duration <= 0) errors.push('Duration must be positive');
    if (data.duration > 1440) errors.push('Duration cannot exceed 24 hours (1440 minutes)');
    if (!data.hourlyRate && data.hourlyRate !== 0) errors.push('Hourly rate is required');

    if (new Date(data.date) > new Date()) {
        errors.push('Date cannot be in the future');
    }

    if (data.writeOff && !data.writeOffReason) {
        errors.push('Write-off reason is required');
    }

    if (data.writeDown && (!data.writeDownAmount || !data.writeDownReason)) {
        errors.push('Write-down amount and reason are required');
    }

    // Validate start/end time if both provided
    if (data.startTime && data.endTime) {
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(data.startTime)) errors.push('Invalid start time format (HH:mm)');
        if (!timeRegex.test(data.endTime)) errors.push('Invalid end time format (HH:mm)');
    }

    // Validate activity code
    if (data.activityCode) {
        const validCodes = Object.keys(TimeEntry.UTBMS_CODES);
        const legacyCodes = TimeEntry.LEGACY_ACTIVITY_CODES;
        if (!validCodes.includes(data.activityCode) && !legacyCodes.includes(data.activityCode)) {
            errors.push('Invalid activity code');
        }
    }

    return errors;
};

// ═══════════════════════════════════════════════════════════════
// TIMER OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Start timer for time tracking
 * POST /api/time-tracking/timer/start
 */
const startTimer = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot create time entries', 403);
    }

    const { caseId, clientId, activityCode, description } = req.body;
    const userId = req.userID || req.user?._id;
    const firmId = req.firmId || req.firm?._id;

    if (activeTimers.has(userId.toString())) {
        throw new CustomException('A timer is already running. Please stop it first.', 400);
    }

    // Validate case if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw new CustomException('Case not found', 404);
        }
    }

    // Get applicable hourly rate
    let hourlyRate = 0;
    if (BillingRate && BillingRate.getApplicableRate) {
        hourlyRate = await BillingRate.getApplicableRate(userId, clientId, null, activityCode);
    }

    const timerState = {
        userId,
        firmId,
        caseId,
        clientId,
        activityCode,
        description: description || '',
        hourlyRate: hourlyRate || 0,
        startedAt: new Date(),
        pausedDuration: 0,
        isPaused: false,
        pausedAt: null
    };

    activeTimers.set(userId.toString(), timerState);

    res.status(200).json({
        success: true,
        message: 'Timer started successfully',
        timer: {
            startedAt: timerState.startedAt,
            hourlyRate: timerState.hourlyRate,
            description: timerState.description,
            caseId: timerState.caseId,
            clientId: timerState.clientId,
            activityCode: timerState.activityCode
        }
    });
});

/**
 * Pause timer
 * POST /api/time-tracking/timer/pause
 */
const pauseTimer = asyncHandler(async (req, res) => {
    const userId = (req.userID || req.user?._id).toString();
    const timer = activeTimers.get(userId);

    if (!timer) {
        throw new CustomException('No active timer', 400);
    }

    if (timer.isPaused) {
        throw new CustomException('Timer is already paused', 400);
    }

    timer.isPaused = true;
    timer.pausedAt = new Date();

    res.status(200).json({
        success: true,
        message: 'Timer paused',
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
    const userId = (req.userID || req.user?._id).toString();
    const timer = activeTimers.get(userId);

    if (!timer) {
        throw new CustomException('No active timer', 400);
    }

    if (!timer.isPaused) {
        throw new CustomException('Timer is already running', 400);
    }

    const pausedTime = new Date() - timer.pausedAt;
    timer.pausedDuration += pausedTime;
    timer.isPaused = false;
    timer.pausedAt = null;

    res.status(200).json({
        success: true,
        message: 'Timer resumed',
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
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot create time entries', 403);
    }

    const userId = (req.userID || req.user?._id).toString();
    const firmId = req.firmId || req.firm?._id;
    const { notes, isBillable = true, timeType = 'billable' } = req.body;

    const timer = activeTimers.get(userId);

    if (!timer) {
        throw new CustomException('No active timer', 400);
    }

    if (timer.isPaused) {
        const pausedTime = new Date() - timer.pausedAt;
        timer.pausedDuration += pausedTime;
    }

    const duration = calculateElapsedMinutes(timer);

    if (duration < 1) {
        activeTimers.delete(userId);
        throw new CustomException('Duration must be at least 1 minute', 400);
    }

    const timeEntry = await TimeEntry.create({
        firmId,
        assigneeId: userId,
        userId: userId,
        lawyerId: userId,
        clientId: timer.clientId,
        caseId: timer.caseId,
        date: timer.startedAt,
        description: timer.description || 'Timer-based entry',
        duration,
        hourlyRate: timer.hourlyRate,
        activityCode: timer.activityCode,
        timeType,
        isBillable: timeType === 'billable',
        wasTimerBased: true,
        timerStartedAt: timer.startedAt,
        timerPausedDuration: timer.pausedDuration,
        notes: notes || '',
        status: 'pending',
        history: [{
            action: 'created',
            performedBy: userId,
            timestamp: new Date(),
            details: { method: 'timer' }
        }]
    });

    // Log activity
    if (BillingActivity && BillingActivity.logActivity) {
        await BillingActivity.logActivity({
            activityType: 'time_entry_created',
            userId,
            clientId: timer.clientId,
            relatedModel: 'TimeEntry',
            relatedId: timeEntry._id,
            description: `Time entry created via timer: ${timer.description}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    activeTimers.delete(userId);

    await timeEntry.populate([
        { path: 'assigneeId', select: 'name email' },
        { path: 'clientId', select: 'firstName lastName companyName' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Timer stopped and time entry created',
        data: { timeEntry }
    });
});

/**
 * Get current timer status
 * GET /api/time-tracking/timer/status
 */
const getTimerStatus = asyncHandler(async (req, res) => {
    const userId = (req.userID || req.user?._id).toString();
    const timer = activeTimers.get(userId);

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
            clientId: timer.clientId,
            activityCode: timer.activityCode,
            hourlyRate: timer.hourlyRate,
            isPaused: timer.isPaused,
            pausedAt: timer.pausedAt,
            elapsedMinutes: calculateElapsedMinutes(timer),
            pausedDuration: timer.pausedDuration
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// TIME ENTRY CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Create time entry manually
 * POST /api/time-tracking/entries
 */
const createTimeEntry = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot create time entries', 403);
    }

    const userId = req.userID || req.user?._id;
    const firmId = req.firmId || req.firm?._id;

    // Validate required fields
    const errors = validateTimeEntry(req.body);
    if (errors.length > 0) {
        throw new CustomException(errors.join('. '), 400);
    }

    const {
        clientId,
        caseId,
        date,
        description,
        duration,
        hourlyRate,
        activityCode,
        timeType = 'billable',
        isBillable,
        notes,
        attachments,
        assigneeId,
        startTime,
        endTime,
        breakMinutes,
        departmentId,
        locationId,
        practiceArea,
        phase,
        taskId,
        writeOff,
        writeOffReason,
        writeDown,
        writeDownAmount,
        writeDownReason,
        billStatus = 'draft'
    } = req.body;

    // Validate case access if provided
    if (caseId) {
        const caseDoc = await Case.findById(caseId);
        if (!caseDoc) {
            throw new CustomException('Case not found', 404);
        }
    }

    // Create time entry
    const timeEntry = await TimeEntry.create({
        firmId,
        assigneeId: assigneeId || userId,
        userId,
        lawyerId: assigneeId || userId,
        clientId,
        caseId,
        date: new Date(date),
        description,
        duration,
        hourlyRate,
        activityCode,
        timeType,
        isBillable: isBillable !== undefined ? isBillable : (timeType === 'billable'),
        startTime,
        endTime,
        breakMinutes: breakMinutes || 0,
        notes,
        attachments: attachments || [],
        departmentId,
        locationId,
        practiceArea,
        phase,
        taskId,
        writeOff: writeOff || false,
        writeOffReason,
        writeDown: writeDown || false,
        writeDownAmount,
        writeDownReason,
        billStatus,
        status: 'pending',
        wasTimerBased: false,
        createdBy: userId,
        history: [{
            action: 'created',
            performedBy: userId,
            timestamp: new Date(),
            details: { method: 'manual' }
        }]
    });

    // Handle write-off/write-down
    if (writeOff) {
        timeEntry.writeOffBy = userId;
        timeEntry.writeOffAt = new Date();
        await timeEntry.save();
    }
    if (writeDown && writeDownAmount > 0) {
        timeEntry.writeDownBy = userId;
        timeEntry.writeDownAt = new Date();
        await timeEntry.save();
    }

    // Log activity
    if (BillingActivity && BillingActivity.logActivity) {
        await BillingActivity.logActivity({
            activityType: 'time_entry_created',
            userId,
            clientId,
            relatedModel: 'TimeEntry',
            relatedId: timeEntry._id,
            description: `Time entry created: ${description}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    await timeEntry.populate([
        { path: 'assigneeId', select: 'name email' },
        { path: 'clientId', select: 'firstName lastName companyName' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(201).json({
        success: true,
        message: 'Time entry created successfully',
        data: { timeEntry }
    });
});

/**
 * Get time entries with filters
 * GET /api/time-tracking/entries
 */
const getTimeEntries = asyncHandler(async (req, res) => {
    const {
        status,
        billStatus,
        caseId,
        clientId,
        assigneeId,
        startDate,
        endDate,
        isBillable,
        timeType,
        activityCode,
        page = 1,
        limit = 25
    } = req.query;

    const firmFilter = getFirmFilter(req);
    const isDeparted = req.user?.departed || req.isDeparted;

    // Build query
    let query;
    if (isDeparted) {
        query = { lawyerId: req.userID || req.user?._id };
    } else {
        query = { ...firmFilter };
    }

    // Apply filters
    if (status) query.status = status;
    if (billStatus) query.billStatus = billStatus;
    if (caseId) query.caseId = caseId;
    if (clientId) query.clientId = clientId;
    if (assigneeId) query.assigneeId = assigneeId;
    if (isBillable !== undefined) query.isBillable = isBillable === 'true';
    if (timeType) query.timeType = timeType;
    if (activityCode) query.activityCode = activityCode;

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const [entries, total] = await Promise.all([
        TimeEntry.find(query)
            .populate('assigneeId', 'name email')
            .populate('userId', 'name email')
            .populate('clientId', 'firstName lastName companyName')
            .populate('caseId', 'title caseNumber')
            .populate('approvedBy', 'name email')
            .populate('rejectedBy', 'name email')
            .populate('invoiceId', 'invoiceNumber')
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limitNum),
        TimeEntry.countDocuments(query)
    ]);

    // Calculate summary
    const summaryAgg = await TimeEntry.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalDuration: { $sum: '$duration' },
                totalBillable: {
                    $sum: { $cond: [{ $eq: ['$timeType', 'billable'] }, '$duration', 0] }
                },
                totalAmount: { $sum: '$finalAmount' },
                billable: {
                    $sum: { $cond: [{ $eq: ['$timeType', 'billable'] }, '$duration', 0] }
                },
                non_billable: {
                    $sum: { $cond: [{ $eq: ['$timeType', 'non_billable'] }, '$duration', 0] }
                },
                pro_bono: {
                    $sum: { $cond: [{ $eq: ['$timeType', 'pro_bono'] }, '$duration', 0] }
                },
                internal: {
                    $sum: { $cond: [{ $eq: ['$timeType', 'internal'] }, '$duration', 0] }
                }
            }
        }
    ]);

    const summary = summaryAgg[0] || {
        totalDuration: 0,
        totalBillable: 0,
        totalAmount: 0
    };

    // Return data as array directly for frontend compatibility
    // Frontend expects data to be an array (data.map, data.forEach)
    res.status(200).json({
        success: true,
        data: Array.isArray(entries) ? entries : [],
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        summary: {
            totalDuration: summary.totalDuration || 0,
            totalBillable: summary.totalBillable || 0,
            totalAmount: summary.totalAmount || 0,
            byTimeType: {
                billable: summary.billable || 0,
                non_billable: summary.non_billable || 0,
                pro_bono: summary.pro_bono || 0,
                internal: summary.internal || 0
            }
        }
    });
});

/**
 * Get single time entry
 * GET /api/time-tracking/entries/:id
 */
const getTimeEntry = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmFilter = getFirmFilter(req);

    const timeEntry = await TimeEntry.findOne({ _id: id, ...firmFilter })
        .populate('assigneeId', 'name email')
        .populate('userId', 'name email')
        .populate('clientId', 'firstName lastName companyName email')
        .populate('caseId', 'title caseNumber category')
        .populate('approvedBy', 'name email')
        .populate('rejectedBy', 'name email')
        .populate('writeOffBy', 'name email')
        .populate('writeDownBy', 'name email')
        .populate('invoiceId', 'invoiceNumber status');

    if (!timeEntry) {
        throw new CustomException('Time entry not found', 404);
    }

    res.status(200).json({
        success: true,
        data: timeEntry
    });
});

/**
 * Update time entry
 * PATCH /api/time-tracking/entries/:id
 */
const updateTimeEntry = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot update time entries', 403);
    }

    const { id } = req.params;
    const userId = req.userID || req.user?._id;
    const firmFilter = getFirmFilter(req);

    const timeEntry = await TimeEntry.findOne({ _id: id, ...firmFilter });

    if (!timeEntry) {
        throw new CustomException('Time entry not found', 404);
    }

    // Cannot update if invoiced
    if (timeEntry.invoiceId) {
        throw new CustomException('Cannot update invoiced time entry', 400);
    }

    // Cannot update if approved (unless admin)
    if (timeEntry.status === 'approved') {
        throw new CustomException('Cannot update approved time entry', 400);
    }

    // Track changes
    const changes = {};
    const allowedFields = [
        'description', 'duration', 'hourlyRate', 'activityCode',
        'timeType', 'isBillable', 'notes', 'startTime', 'endTime',
        'breakMinutes', 'date', 'clientId', 'caseId', 'assigneeId',
        'departmentId', 'locationId', 'practiceArea', 'phase', 'taskId'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== timeEntry[field]) {
            changes[field] = { old: timeEntry[field], new: req.body[field] };
            timeEntry[field] = req.body[field];
        }
    });

    // Add to history if changes made
    if (Object.keys(changes).length > 0) {
        timeEntry.history.push({
            action: 'updated',
            performedBy: userId,
            timestamp: new Date(),
            details: { changes }
        });

        // Legacy edit history
        timeEntry.editHistory.push({
            editedBy: userId,
            editedAt: new Date(),
            changes
        });
    }

    await timeEntry.save();

    // Log activity
    if (BillingActivity && BillingActivity.logActivity && Object.keys(changes).length > 0) {
        await BillingActivity.logActivity({
            activityType: 'time_entry_updated',
            userId,
            clientId: timeEntry.clientId,
            relatedModel: 'TimeEntry',
            relatedId: timeEntry._id,
            description: `Time entry updated: ${timeEntry.description}`,
            changes,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    await timeEntry.populate([
        { path: 'assigneeId', select: 'name email' },
        { path: 'clientId', select: 'firstName lastName companyName' },
        { path: 'caseId', select: 'title caseNumber' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Time entry updated successfully',
        data: { timeEntry }
    });
});

/**
 * Delete time entry
 * DELETE /api/time-tracking/entries/:id
 */
const deleteTimeEntry = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot delete time entries', 403);
    }

    const { id } = req.params;
    const firmFilter = getFirmFilter(req);

    const timeEntry = await TimeEntry.findOne({ _id: id, ...firmFilter });

    if (!timeEntry) {
        throw new CustomException('Time entry not found', 404);
    }

    if (timeEntry.invoiceId) {
        throw new CustomException('Cannot delete invoiced time entry', 400);
    }

    await TimeEntry.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'Time entry deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// WRITE-OFF / WRITE-DOWN
// ═══════════════════════════════════════════════════════════════

/**
 * Write off a time entry
 * POST /api/time-tracking/entries/:id/write-off
 */
const writeOffTimeEntry = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot write off time entries', 403);
    }

    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.userID || req.user?._id;
    const firmFilter = getFirmFilter(req);

    if (!reason || reason.trim().length === 0) {
        throw new CustomException('Write-off reason is required', 400);
    }

    const timeEntry = await TimeEntry.findOne({ _id: id, ...firmFilter });

    if (!timeEntry) {
        throw new CustomException('Time entry not found', 404);
    }

    await timeEntry.writeOffEntry(reason, userId);

    // Log activity
    if (BillingActivity && BillingActivity.logActivity) {
        await BillingActivity.logActivity({
            activityType: 'time_entry_written_off',
            userId,
            clientId: timeEntry.clientId,
            relatedModel: 'TimeEntry',
            relatedId: timeEntry._id,
            description: `Time entry written off: ${reason}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    await timeEntry.populate([
        { path: 'assigneeId', select: 'name email' },
        { path: 'writeOffBy', select: 'name email' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Time entry written off successfully',
        data: { timeEntry }
    });
});

/**
 * Write down a time entry
 * POST /api/time-tracking/entries/:id/write-down
 */
const writeDownTimeEntry = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot write down time entries', 403);
    }

    const { id } = req.params;
    const { amount, reason } = req.body;
    const userId = req.userID || req.user?._id;
    const firmFilter = getFirmFilter(req);

    if (!amount || amount <= 0) {
        throw new CustomException('Write-down amount is required and must be positive', 400);
    }

    if (!reason || reason.trim().length === 0) {
        throw new CustomException('Write-down reason is required', 400);
    }

    const timeEntry = await TimeEntry.findOne({ _id: id, ...firmFilter });

    if (!timeEntry) {
        throw new CustomException('Time entry not found', 404);
    }

    await timeEntry.writeDownEntry(amount, reason, userId);

    // Log activity
    if (BillingActivity && BillingActivity.logActivity) {
        await BillingActivity.logActivity({
            activityType: 'time_entry_written_down',
            userId,
            clientId: timeEntry.clientId,
            relatedModel: 'TimeEntry',
            relatedId: timeEntry._id,
            description: `Time entry written down by ${amount}: ${reason}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    await timeEntry.populate([
        { path: 'assigneeId', select: 'name email' },
        { path: 'writeDownBy', select: 'name email' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Time entry written down successfully',
        data: { timeEntry }
    });
});

// ═══════════════════════════════════════════════════════════════
// APPROVAL WORKFLOW
// ═══════════════════════════════════════════════════════════════

/**
 * Approve time entry
 * POST /api/time-tracking/entries/:id/approve
 */
const approveTimeEntry = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot approve time entries', 403);
    }

    const { id } = req.params;
    const userId = req.userID || req.user?._id;
    const firmFilter = getFirmFilter(req);

    const timeEntry = await TimeEntry.findOne({ _id: id, ...firmFilter });

    if (!timeEntry) {
        throw new CustomException('Time entry not found', 404);
    }

    await timeEntry.approve(userId);

    // Log activity
    if (BillingActivity && BillingActivity.logActivity) {
        await BillingActivity.logActivity({
            activityType: 'time_entry_approved',
            userId,
            clientId: timeEntry.clientId,
            relatedModel: 'TimeEntry',
            relatedId: timeEntry._id,
            description: `Time entry approved: ${timeEntry.description}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    await timeEntry.populate([
        { path: 'assigneeId', select: 'name email' },
        { path: 'approvedBy', select: 'name email' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Time entry approved successfully',
        data: { timeEntry }
    });
});

/**
 * Reject time entry
 * POST /api/time-tracking/entries/:id/reject
 */
const rejectTimeEntry = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot reject time entries', 403);
    }

    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.userID || req.user?._id;
    const firmFilter = getFirmFilter(req);

    if (!reason || reason.trim().length === 0) {
        throw new CustomException('Rejection reason is required', 400);
    }

    const timeEntry = await TimeEntry.findOne({ _id: id, ...firmFilter });

    if (!timeEntry) {
        throw new CustomException('Time entry not found', 404);
    }

    await timeEntry.reject(reason, userId);

    // Log activity
    if (BillingActivity && BillingActivity.logActivity) {
        await BillingActivity.logActivity({
            activityType: 'time_entry_rejected',
            userId,
            clientId: timeEntry.clientId,
            relatedModel: 'TimeEntry',
            relatedId: timeEntry._id,
            description: `Time entry rejected: ${reason}`,
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
        });
    }

    await timeEntry.populate([
        { path: 'assigneeId', select: 'name email' },
        { path: 'rejectedBy', select: 'name email' }
    ]);

    res.status(200).json({
        success: true,
        message: 'Time entry rejected',
        data: { timeEntry }
    });
});

// ═══════════════════════════════════════════════════════════════
// ANALYTICS & REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get time entry statistics
 * GET /api/time-tracking/stats
 */
const getTimeStats = asyncHandler(async (req, res) => {
    const { startDate, endDate, caseId, clientId, assigneeId, groupBy = 'day' } = req.query;
    const firmFilter = getFirmFilter(req);
    const isDeparted = req.user?.departed || req.isDeparted;

    let matchQuery;
    if (isDeparted) {
        matchQuery = { lawyerId: req.userID || req.user?._id };
    } else {
        matchQuery = { ...firmFilter };
    }

    if (startDate || endDate) {
        matchQuery.date = {};
        if (startDate) matchQuery.date.$gte = new Date(startDate);
        if (endDate) matchQuery.date.$lte = new Date(endDate);
    }

    if (caseId) matchQuery.caseId = caseId;
    if (clientId) matchQuery.clientId = clientId;
    if (assigneeId) matchQuery.assigneeId = assigneeId;

    // Overall stats
    const overallStats = await TimeEntry.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalEntries: { $sum: 1 },
                totalDuration: { $sum: '$duration' },
                totalAmount: { $sum: '$finalAmount' },
                billableDuration: { $sum: { $cond: [{ $eq: ['$timeType', 'billable'] }, '$duration', 0] } },
                billableAmount: { $sum: { $cond: [{ $eq: ['$timeType', 'billable'] }, '$finalAmount', 0] } },
                avgHourlyRate: { $avg: '$hourlyRate' }
            }
        }
    ]);

    // By time type
    const byTimeType = await TimeEntry.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$timeType',
                count: { $sum: 1 },
                totalDuration: { $sum: '$duration' },
                totalAmount: { $sum: '$finalAmount' }
            }
        }
    ]);

    // By activity code
    const byActivity = await TimeEntry.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$activityCode',
                count: { $sum: 1 },
                totalDuration: { $sum: '$duration' },
                totalAmount: { $sum: '$finalAmount' }
            }
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 10 }
    ]);

    // By status
    const byStatus = await TimeEntry.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                totalAmount: { $sum: '$finalAmount' }
            }
        }
    ]);

    // By bill status
    const byBillStatus = await TimeEntry.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$billStatus',
                count: { $sum: 1 },
                totalAmount: { $sum: '$finalAmount' }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: {
            overall: overallStats[0] || {
                totalEntries: 0,
                totalDuration: 0,
                totalAmount: 0,
                billableDuration: 0,
                billableAmount: 0,
                avgHourlyRate: 0
            },
            byTimeType,
            byActivity,
            byStatus,
            byBillStatus
        }
    });
});

/**
 * Get weekly time entries for calendar view
 * GET /api/time-tracking/weekly
 */
const getWeeklyEntries = asyncHandler(async (req, res) => {
    const { weekStartDate } = req.query;
    const firmFilter = getFirmFilter(req);
    const isDeparted = req.user?.departed || req.isDeparted;

    let startDate;
    if (weekStartDate) {
        startDate = new Date(weekStartDate);
    } else {
        startDate = new Date();
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
    }
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    let weekQuery;
    if (isDeparted) {
        weekQuery = { lawyerId: req.userID || req.user?._id };
    } else {
        weekQuery = { ...firmFilter };
    }

    const timeEntries = await TimeEntry.find({
        ...weekQuery,
        date: { $gte: startDate, $lte: endDate }
    })
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName companyName')
        .sort({ date: 1 });

    // Group entries by project (case)
    const projectsMap = new Map();
    const dailyTotals = {};
    let weeklyTotal = 0;

    for (let i = 0; i < 7; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        dailyTotals[date.toISOString().split('T')[0]] = 0;
    }

    timeEntries.forEach(entry => {
        const projectId = entry.caseId?._id?.toString() || 'no-project';
        const projectName = entry.caseId?.title || 'No Project';
        const clientName = entry.clientId ?
            `${entry.clientId.firstName || ''} ${entry.clientId.lastName || ''}`.trim() ||
            entry.clientId.companyName : 'No Client';

        if (!projectsMap.has(projectId)) {
            projectsMap.set(projectId, {
                projectId,
                projectName,
                clientName,
                entries: {},
                totalHours: 0
            });
        }

        const project = projectsMap.get(projectId);
        const dateKey = entry.date.toISOString().split('T')[0];

        if (!project.entries[dateKey]) {
            project.entries[dateKey] = [];
        }

        project.entries[dateKey].push({
            entryId: entry._id,
            duration: entry.duration,
            description: entry.description,
            isBillable: entry.isBillable,
            timeType: entry.timeType
        });

        const hoursWorked = entry.duration / 60;
        project.totalHours += hoursWorked;
        dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + entry.duration;
        weeklyTotal += entry.duration;
    });

    res.status(200).json({
        success: true,
        data: {
            weekStartDate: startDate.toISOString().split('T')[0],
            weekEndDate: endDate.toISOString().split('T')[0],
            projects: Array.from(projectsMap.values()),
            dailyTotals,
            weeklyTotal
        }
    });
});

/**
 * Get unbilled entries for invoicing
 * GET /api/time-tracking/unbilled
 */
const getUnbilledEntries = asyncHandler(async (req, res) => {
    const { clientId, caseId } = req.query;
    const firmFilter = getFirmFilter(req);

    const entries = await TimeEntry.getUnbilledEntries({
        ...firmFilter,
        clientId,
        caseId
    });

    const totalAmount = entries.reduce((sum, entry) => sum + entry.finalAmount, 0);
    const totalDuration = entries.reduce((sum, entry) => sum + entry.duration, 0);

    res.status(200).json({
        success: true,
        data: {
            entries,
            count: entries.length,
            totalAmount,
            totalDuration
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// UTBMS ACTIVITY CODES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all UTBMS activity codes
 * GET /api/time-tracking/activity-codes
 */
const getActivityCodes = asyncHandler(async (req, res) => {
    const codes = Object.entries(TimeEntry.UTBMS_CODES).map(([code, details]) => ({
        code,
        ...details
    }));

    // Group by category
    const grouped = {};
    codes.forEach(item => {
        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }
        grouped[item.category].push(item);
    });

    res.status(200).json({
        success: true,
        data: {
            codes,
            grouped,
            timeTypes: TimeEntry.TIME_TYPES.map(type => ({
                value: type,
                label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                labelAr: {
                    'billable': 'قابل للفوترة',
                    'non_billable': 'غير قابل للفوترة',
                    'pro_bono': 'خدمات مجانية',
                    'internal': 'داخلي'
                }[type]
            }))
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Bulk delete time entries
 * DELETE /api/time-tracking/entries/bulk
 */
const bulkDeleteTimeEntries = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot delete time entries', 403);
    }

    const { entryIds } = req.body;
    const firmFilter = getFirmFilter(req);

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
        throw new CustomException('Entry IDs are required', 400);
    }

    // Verify entries belong to firm and are not invoiced
    const entries = await TimeEntry.find({
        _id: { $in: entryIds },
        ...firmFilter,
        invoiceId: { $exists: false }
    });

    if (entries.length !== entryIds.length) {
        throw new CustomException('Some entries are invalid or cannot be deleted', 400);
    }

    await TimeEntry.deleteMany({ _id: { $in: entryIds } });

    res.status(200).json({
        success: true,
        message: `${entries.length} time entries deleted successfully`,
        count: entries.length
    });
});

/**
 * Bulk approve time entries
 * POST /api/time-tracking/entries/bulk-approve
 */
const bulkApproveTimeEntries = asyncHandler(async (req, res) => {
    if (req.user?.departed || req.isDeparted) {
        throw new CustomException('Departed users cannot approve time entries', 403);
    }

    const { entryIds } = req.body;
    const userId = req.userID || req.user?._id;
    const firmFilter = getFirmFilter(req);

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
        throw new CustomException('Entry IDs are required', 400);
    }

    const result = await TimeEntry.updateMany(
        {
            _id: { $in: entryIds },
            ...firmFilter,
            status: 'pending'
        },
        {
            $set: {
                status: 'approved',
                approvedBy: userId,
                approvedAt: new Date(),
                billStatus: 'unbilled'
            },
            $push: {
                history: {
                    action: 'approved',
                    performedBy: userId,
                    timestamp: new Date(),
                    details: { bulk: true }
                }
            }
        }
    );

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} time entries approved`,
        count: result.modifiedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function calculateElapsedMinutes(timer) {
    const now = timer.isPaused ? timer.pausedAt : new Date();
    const totalMs = now - timer.startedAt - timer.pausedDuration;
    return Math.max(1, Math.round(totalMs / 1000 / 60));
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

    // Write-off / Write-down
    writeOffTimeEntry,
    writeDownTimeEntry,

    // Approval workflow
    approveTimeEntry,
    rejectTimeEntry,

    // Analytics
    getTimeStats,
    getWeeklyEntries,
    getUnbilledEntries,

    // UTBMS codes
    getActivityCodes,

    // Bulk operations
    bulkDeleteTimeEntries,
    bulkApproveTimeEntries
};
