const { SLA, SLAInstance } = require('../models/sla.model');
const SLAService = require('../services/sla.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Helper function to escape regex special characters (ReDoS protection)
const escapeRegex = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Get firmId from user context
 */
const getFirmId = (req) => {
    return req.firmId || req.user?.firmId || null;
};

// ═══════════════════════════════════════════════════════════════
// SLA CONFIGURATION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * List SLA configurations
 * GET /api/sla
 */
const listSLAs = asyncHandler(async (req, res) => {
    const {
        priority,
        search,
        page = 1,
        limit = 50
    } = req.query;

    const firmId = getFirmId(req);
    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Build query with IDOR protection
    const query = { firmId };

    if (priority) {
        query.priority = priority;
    }

    // Search by name
    if (search) {
        const escapedSearch = escapeRegex(search);
        query.name = { $regex: escapedSearch, $options: 'i' };
    }

    const slas = await SLA.find(query)
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SLA.countDocuments(query);

    res.status(200).json({
        success: true,
        data: slas,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Create SLA configuration
 * POST /api/sla
 */
const createSLA = asyncHandler(async (req, res) => {
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Mass assignment protection
    const allowedFields = [
        'name',
        'priority',
        'metrics',
        'businessHours',
        'pauseConditions',
        'appliesTo'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const {
        name,
        priority,
        metrics,
        businessHours,
        pauseConditions,
        appliesTo
    } = sanitizedData;

    // Validate required fields
    if (!name || !priority) {
        throw CustomException('الاسم والأولوية مطلوبان', 400);
    }

    // Validate at least one metric is configured
    if (!metrics || Object.keys(metrics).length === 0) {
        throw CustomException('يجب تكوين مقياس واحد على الأقل', 400);
    }

    // Validate metric thresholds
    const validMetrics = ['firstResponseTime', 'nextResponseTime', 'timeToClose', 'timeToResolve'];
    for (const metricKey of validMetrics) {
        const metric = metrics[metricKey];
        if (metric) {
            if (typeof metric.target !== 'number' || metric.target <= 0) {
                throw CustomException(`مقياس ${metricKey} يجب أن يحتوي على هدف صالح`, 400);
            }
            if (typeof metric.warning !== 'number' || metric.warning <= 0) {
                throw CustomException(`مقياس ${metricKey} يجب أن يحتوي على تحذير صالح`, 400);
            }
            if (typeof metric.breach !== 'number' || metric.breach <= 0) {
                throw CustomException(`مقياس ${metricKey} يجب أن يحتوي على خرق صالح`, 400);
            }
            // Validate logical order: target <= warning <= breach
            if (metric.target > metric.breach) {
                throw CustomException(`الهدف يجب أن يكون أقل من أو يساوي الخرق لـ ${metricKey}`, 400);
            }
        }
    }

    // Validate business hours schedule if enabled
    if (businessHours?.enabled && businessHours.schedule) {
        if (!Array.isArray(businessHours.schedule)) {
            throw CustomException('جدول ساعات العمل يجب أن يكون مصفوفة', 400);
        }

        for (const scheduleItem of businessHours.schedule) {
            if (typeof scheduleItem.day !== 'number' || scheduleItem.day < 0 || scheduleItem.day > 6) {
                throw CustomException('يوم الجدول يجب أن يكون بين 0 و 6', 400);
            }
            if (!scheduleItem.startTime || !scheduleItem.endTime) {
                throw CustomException('وقت البدء والانتهاء مطلوبان للجدول', 400);
            }
            // Validate time format (HH:mm)
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(scheduleItem.startTime) || !timeRegex.test(scheduleItem.endTime)) {
                throw CustomException('تنسيق الوقت غير صالح. استخدم HH:mm', 400);
            }
        }
    }

    // Create SLA
    const sla = await SLA.create({
        firmId,
        name,
        priority,
        metrics,
        businessHours,
        pauseConditions,
        appliesTo,
        createdBy: userId
    });

    await sla.populate([
        { path: 'createdBy', select: 'username email' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء SLA بنجاح',
        data: sla
    });
});

/**
 * Get single SLA
 * GET /api/sla/:id
 */
const getSLA = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    const sla = await SLA.findOne({ _id: sanitizedId, firmId })
        .populate('createdBy', 'username email')
        .populate('updatedBy', 'username email');

    if (!sla) {
        throw CustomException('SLA غير موجود', 404);
    }

    // IDOR protection - firm ownership already verified in query above
    if (sla.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا SLA', 403);
    }

    res.status(200).json({
        success: true,
        data: sla
    });
});

/**
 * Update SLA
 * PUT /api/sla/:id
 */
const updateSLA = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);
    const userId = req.userID;

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    const sla = await SLA.findOne({ _id: sanitizedId, firmId });

    if (!sla) {
        throw CustomException('SLA غير موجود', 404);
    }

    // IDOR protection - firm ownership already verified in query above
    if (sla.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا SLA', 403);
    }

    // Mass assignment protection
    const allowedFields = [
        'name',
        'priority',
        'metrics',
        'businessHours',
        'pauseConditions',
        'appliesTo'
    ];
    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Validate metrics if provided
    if (sanitizedData.metrics) {
        const validMetrics = ['firstResponseTime', 'nextResponseTime', 'timeToClose', 'timeToResolve'];
        for (const metricKey of validMetrics) {
            const metric = sanitizedData.metrics[metricKey];
            if (metric) {
                if (typeof metric.target !== 'number' || metric.target <= 0) {
                    throw CustomException(`مقياس ${metricKey} يجب أن يحتوي على هدف صالح`, 400);
                }
                if (typeof metric.warning !== 'number' || metric.warning <= 0) {
                    throw CustomException(`مقياس ${metricKey} يجب أن يحتوي على تحذير صالح`, 400);
                }
                if (typeof metric.breach !== 'number' || metric.breach <= 0) {
                    throw CustomException(`مقياس ${metricKey} يجب أن يحتوي على خرق صالح`, 400);
                }
                if (metric.target > metric.breach) {
                    throw CustomException(`الهدف يجب أن يكون أقل من أو يساوي الخرق لـ ${metricKey}`, 400);
                }
            }
        }
    }

    // Validate business hours schedule if provided
    if (sanitizedData.businessHours?.enabled && sanitizedData.businessHours.schedule) {
        if (!Array.isArray(sanitizedData.businessHours.schedule)) {
            throw CustomException('جدول ساعات العمل يجب أن يكون مصفوفة', 400);
        }

        for (const scheduleItem of sanitizedData.businessHours.schedule) {
            if (typeof scheduleItem.day !== 'number' || scheduleItem.day < 0 || scheduleItem.day > 6) {
                throw CustomException('يوم الجدول يجب أن يكون بين 0 و 6', 400);
            }
            if (!scheduleItem.startTime || !scheduleItem.endTime) {
                throw CustomException('وقت البدء والانتهاء مطلوبان للجدول', 400);
            }
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(scheduleItem.startTime) || !timeRegex.test(scheduleItem.endTime)) {
                throw CustomException('تنسيق الوقت غير صالح. استخدم HH:mm', 400);
            }
        }
    }

    // Apply updates
    Object.keys(sanitizedData).forEach(field => {
        sla[field] = sanitizedData[field];
    });

    sla.updatedBy = userId;
    await sla.save();

    await sla.populate([
        { path: 'createdBy', select: 'username email' },
        { path: 'updatedBy', select: 'username email' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم تحديث SLA بنجاح',
        data: sla
    });
});

/**
 * Delete SLA
 * DELETE /api/sla/:id
 */
const deleteSLA = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    const sla = await SLA.findOne({ _id: sanitizedId, firmId });

    if (!sla) {
        throw CustomException('SLA غير موجود', 404);
    }

    // IDOR protection - firm ownership already verified in query above
    if (sla.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا SLA', 403);
    }

    // Check for active instances
    const activeInstancesCount = await SLAInstance.countDocuments({
        slaId: sanitizedId,
        $or: [
            { 'metrics.firstResponse.status': 'pending' },
            { 'metrics.nextResponse.status': 'pending' },
            { 'metrics.resolution.status': 'pending' }
        ]
    });

    if (activeInstancesCount > 0) {
        throw CustomException(
            `لا يمكن حذف SLA. يوجد ${activeInstancesCount} من الحالات النشطة المرتبطة به`,
            400
        );
    }

    await SLA.findOneAndDelete({ _id: sanitizedId, firmId });

    res.status(200).json({
        success: true,
        message: 'تم حذف SLA بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// SLA APPLICATION AND MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Apply SLA to ticket
 * POST /api/sla/:id/apply/:ticketId
 */
const applySLAToTicket = asyncHandler(async (req, res) => {
    const { id, ticketId } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Sanitize ObjectIds
    const sanitizedSlaId = sanitizeObjectId(id);
    const sanitizedTicketId = sanitizeObjectId(ticketId);

    if (!sanitizedSlaId || !sanitizedTicketId) {
        throw CustomException('معرف غير صالح', 400);
    }

    // Verify SLA exists and belongs to firm
    const sla = await SLA.findOne({ _id: sanitizedSlaId, firmId });
    if (!sla) {
        throw CustomException('SLA غير موجود', 404);
    }

    // IDOR protection - firm ownership already verified in query above
    if (sla.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا SLA', 403);
    }

    // Apply SLA using service
    const instance = await SLAService.applySLA(sanitizedTicketId, sanitizedSlaId);

    await instance.populate([
        { path: 'slaId', select: 'name priority metrics' },
        { path: 'ticketId', select: 'title caseNumber status' }
    ]);

    res.status(201).json({
        success: true,
        message: 'تم تطبيق SLA على التذكرة بنجاح',
        data: instance
    });
});

/**
 * Pause SLA
 * POST /api/sla/instance/:id/pause
 */
const pauseSLA = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    // Verify instance exists and belongs to firm
    const instance = await SLAInstance.findOne({ _id: sanitizedId, firmId });
    if (!instance) {
        throw CustomException('مثيل SLA غير موجود', 404);
    }

    // IDOR protection - firm ownership already verified in query above
    if (instance.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا المثيل', 403);
    }

    // Pause using service
    const updatedInstance = await SLAService.pauseSLA(sanitizedId, reason);

    await updatedInstance.populate([
        { path: 'slaId', select: 'name priority' },
        { path: 'ticketId', select: 'title caseNumber' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم إيقاف SLA مؤقتاً',
        data: updatedInstance
    });
});

/**
 * Resume SLA
 * POST /api/sla/instance/:id/resume
 */
const resumeSLA = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Sanitize ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف غير صالح', 400);
    }

    // Verify instance exists and belongs to firm
    const instance = await SLAInstance.findOne({ _id: sanitizedId, firmId });
    if (!instance) {
        throw CustomException('مثيل SLA غير موجود', 404);
    }

    // IDOR protection - firm ownership already verified in query above
    if (instance.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا المثيل', 403);
    }

    // Resume using service
    const updatedInstance = await SLAService.resumeSLA(sanitizedId);

    await updatedInstance.populate([
        { path: 'slaId', select: 'name priority' },
        { path: 'ticketId', select: 'title caseNumber' }
    ]);

    res.status(200).json({
        success: true,
        message: 'تم استئناف SLA',
        data: updatedInstance
    });
});

// ═══════════════════════════════════════════════════════════════
// REPORTING AND ANALYTICS
// ═══════════════════════════════════════════════════════════════

/**
 * Get SLA performance stats
 * GET /api/sla/stats
 */
const getStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Build date range
    const dateRange = {};
    if (startDate) {
        dateRange.start = new Date(startDate);
        if (isNaN(dateRange.start.getTime())) {
            throw CustomException('تاريخ البدء غير صالح', 400);
        }
    }
    if (endDate) {
        dateRange.end = new Date(endDate);
        if (isNaN(dateRange.end.getTime())) {
            throw CustomException('تاريخ الانتهاء غير صالح', 400);
        }
    }

    // Get stats using service
    const stats = await SLAService.getPerformanceStats(firmId, dateRange);

    res.status(200).json({
        success: true,
        data: stats
    });
});

/**
 * Get SLA for ticket
 * GET /api/sla/instance/:ticketId
 */
const getSLAForTicket = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const firmId = getFirmId(req);

    if (!firmId) {
        throw CustomException('معرف الشركة مطلوب', 400);
    }

    // Sanitize ObjectId
    const sanitizedTicketId = sanitizeObjectId(ticketId);
    if (!sanitizedTicketId) {
        throw CustomException('معرف غير صالح', 400);
    }

    // Get SLA instance using service
    const instance = await SLAService.getSLAByTicket(sanitizedTicketId);

    if (!instance) {
        throw CustomException('لا يوجد SLA لهذه التذكرة', 404);
    }

    // IDOR protection
    if (instance.firmId.toString() !== firmId.toString()) {
        throw CustomException('لا يمكنك الوصول إلى هذا المثيل', 403);
    }

    await instance.populate([
        { path: 'slaId', select: 'name priority metrics' },
        { path: 'ticketId', select: 'title caseNumber status' }
    ]);

    res.status(200).json({
        success: true,
        data: instance
    });
});

module.exports = {
    listSLAs,
    createSLA,
    getSLA,
    updateSLA,
    deleteSLA,
    applySLAToTicket,
    pauseSLA,
    resumeSLA,
    getStats,
    getSLAForTicket
};
