const { SavedReport, DashboardWidget } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ==================== Saved Reports ====================

/**
 * Create saved report
 * POST /api/saved-reports
 */
const createReport = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = [
        'name', 'nameAr', 'description', 'type', 'config',
        'isScheduled', 'scheduleFrequency', 'scheduleTime',
        'scheduleDayOfWeek', 'scheduleDayOfMonth', 'recipients'
    ];
    const data = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!data.name || !data.type) {
        throw CustomException('اسم التقرير ونوعه مطلوبان', 400);
    }

    if (typeof data.name !== 'string' || typeof data.type !== 'string') {
        throw CustomException('اسم التقرير ونوعه يجب أن يكونا نصاً', 400);
    }

    if (data.config && typeof data.config !== 'object') {
        throw CustomException('الإعدادات يجب أن تكون كائناً', 400);
    }

    if (data.recipients && !Array.isArray(data.recipients)) {
        throw CustomException('المستلمون يجب أن يكونوا مصفوفة', 400);
    }

    if (data.isScheduled && typeof data.isScheduled !== 'boolean') {
        throw CustomException('isScheduled يجب أن يكون قيمة منطقية', 400);
    }

    // SECURITY FIX: Use req.addFirmId for proper tenant context
    const report = await SavedReport.create(req.addFirmId({
        name: data.name,
        nameAr: data.nameAr,
        description: data.description,
        type: data.type,
        config: data.config || {},
        isScheduled: data.isScheduled || false,
        scheduleFrequency: data.scheduleFrequency,
        scheduleTime: data.scheduleTime,
        scheduleDayOfWeek: data.scheduleDayOfWeek,
        scheduleDayOfMonth: data.scheduleDayOfMonth,
        recipients: data.recipients || [],
        createdBy: req.userID
    }));

    res.status(201).json({
        success: true,
        message: 'تم إنشاء التقرير المحفوظ بنجاح',
        data: report
    });
});

/**
 * Get all saved reports
 * GET /api/saved-reports
 */
const getReports = asyncHandler(async (req, res) => {
    // Input validation and sanitization
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 100);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const query = { ...req.firmQuery };

    // NoSQL injection protection - ensure query parameters are strings
    if (req.query.type) {
        if (typeof req.query.type !== 'string') {
            throw CustomException('نوع التقرير يجب أن يكون نصاً', 400);
        }
        query.type = req.query.type;
    }

    if (req.query.isScheduled !== undefined) {
        query.isScheduled = req.query.isScheduled === 'true';
    }

    const reports = await SavedReport.find(query)
        .sort({ createdAt: -1 })
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum);

    const total = await SavedReport.countDocuments(query);

    res.status(200).json({
        success: true,
        data: reports,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
});

/**
 * Get single saved report
 * GET /api/saved-reports/:id
 */
const getReport = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize ID
    const reportId = sanitizeObjectId(req.params.id);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const report = await SavedReport.findOne({ _id: reportId, ...req.firmQuery });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: report
    });
});

/**
 * Update saved report
 * PATCH /api/saved-reports/:id
 */
const updateReport = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize ID
    const reportId = sanitizeObjectId(req.params.id);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const report = await SavedReport.findOne({ _id: reportId, ...req.firmQuery });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Mass assignment protection
    const allowedFields = [
        'name', 'nameAr', 'description', 'type', 'config',
        'isScheduled', 'scheduleFrequency', 'scheduleTime',
        'scheduleDayOfWeek', 'scheduleDayOfMonth', 'recipients'
    ];
    const updates = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (updates.name !== undefined && typeof updates.name !== 'string') {
        throw CustomException('اسم التقرير يجب أن يكون نصاً', 400);
    }

    if (updates.type !== undefined && typeof updates.type !== 'string') {
        throw CustomException('نوع التقرير يجب أن يكون نصاً', 400);
    }

    if (updates.config !== undefined && typeof updates.config !== 'object') {
        throw CustomException('الإعدادات يجب أن تكون كائناً', 400);
    }

    if (updates.recipients !== undefined && !Array.isArray(updates.recipients)) {
        throw CustomException('المستلمون يجب أن يكونوا مصفوفة', 400);
    }

    if (updates.isScheduled !== undefined && typeof updates.isScheduled !== 'boolean') {
        throw CustomException('isScheduled يجب أن يكون قيمة منطقية', 400);
    }

    // Apply updates
    Object.keys(updates).forEach(field => {
        report[field] = updates[field];
    });

    await report.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث التقرير بنجاح',
        data: report
    });
});

/**
 * Delete saved report
 * DELETE /api/saved-reports/:id
 */
const deleteReport = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize ID
    const reportId = sanitizeObjectId(req.params.id);

    // SECURITY FIX: Use atomic findOneAndDelete with req.firmQuery
    const report = await SavedReport.findOneAndDelete({ _id: reportId, ...req.firmQuery });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف التقرير بنجاح'
    });
});

/**
 * Run saved report
 * POST /api/saved-reports/:id/run
 */
const runReport = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize ID
    const reportId = sanitizeObjectId(req.params.id);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const report = await SavedReport.findOne({ _id: reportId, ...req.firmQuery });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Mass assignment protection and input validation
    const allowedFields = ['overrideConfig'];
    const data = pickAllowedFields(req.body, allowedFields);

    // Validate overrideConfig is an object if provided
    if (data.overrideConfig) {
        if (typeof data.overrideConfig !== 'object' || Array.isArray(data.overrideConfig)) {
            throw CustomException('الإعدادات البديلة يجب أن تكون كائناً', 400);
        }
    }

    // Merge override config with saved config
    const config = { ...report.config, ...(data.overrideConfig || {}) };

    // In production, this would actually run the report query
    // and return the data based on report type
    const reportData = {
        reportId: report._id,
        reportName: report.name,
        type: report.type,
        config,
        generatedAt: new Date(),
        // Placeholder data - would be actual report data in production
        data: [],
        summary: {}
    };

    // Update last run info
    report.lastRun = new Date();
    report.lastRunResult = {
        success: true,
        recordCount: 0
    };
    await report.save();

    res.status(200).json({
        success: true,
        data: reportData
    });
});

/**
 * Duplicate saved report
 * POST /api/saved-reports/:id/duplicate
 */
const duplicateReport = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize ID
    const reportId = sanitizeObjectId(req.params.id);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const original = await SavedReport.findOne({ _id: reportId, ...req.firmQuery });

    if (!original) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Mass assignment protection
    const allowedFields = ['name', 'nameAr'];
    const data = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (data.name && typeof data.name !== 'string') {
        throw CustomException('اسم التقرير يجب أن يكون نصاً', 400);
    }

    if (data.nameAr && typeof data.nameAr !== 'string') {
        throw CustomException('الاسم العربي يجب أن يكون نصاً', 400);
    }

    // SECURITY FIX: Use req.addFirmId for proper tenant context
    const duplicate = await SavedReport.create(req.addFirmId({
        name: data.name || `${original.name} (نسخة)`,
        nameAr: data.nameAr || `${original.nameAr} (نسخة)`,
        description: original.description,
        type: original.type,
        config: original.config,
        isScheduled: false,
        createdBy: req.userID
    }));

    res.status(201).json({
        success: true,
        message: 'تم نسخ التقرير بنجاح',
        data: duplicate
    });
});

// ==================== Dashboard Widgets ====================

/**
 * Create dashboard widget
 * POST /api/dashboard-widgets
 */
const createWidget = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = [
        'name', 'nameAr', 'type', 'dataSource', 'config',
        'position', 'size', 'refreshInterval'
    ];
    const data = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!data.name || !data.type || !data.dataSource) {
        throw CustomException('الاسم والنوع ومصدر البيانات مطلوبة', 400);
    }

    if (typeof data.name !== 'string' || typeof data.type !== 'string' || typeof data.dataSource !== 'string') {
        throw CustomException('الاسم والنوع ومصدر البيانات يجب أن تكون نصوصاً', 400);
    }

    if (data.config && typeof data.config !== 'object') {
        throw CustomException('الإعدادات يجب أن تكون كائناً', 400);
    }

    if (data.position && (typeof data.position !== 'object' || Array.isArray(data.position))) {
        throw CustomException('الموقع يجب أن يكون كائناً', 400);
    }

    if (data.size && (typeof data.size !== 'object' || Array.isArray(data.size))) {
        throw CustomException('الحجم يجب أن يكون كائناً', 400);
    }

    if (data.refreshInterval && typeof data.refreshInterval !== 'number') {
        throw CustomException('فترة التحديث يجب أن تكون رقماً', 400);
    }

    // SECURITY FIX: Use req.addFirmId for proper tenant context
    const widget = await DashboardWidget.create(req.addFirmId({
        name: data.name,
        nameAr: data.nameAr,
        type: data.type,
        dataSource: data.dataSource,
        config: data.config || {},
        position: data.position || { x: 0, y: 0 },
        size: data.size || { width: 1, height: 1 },
        refreshInterval: data.refreshInterval || 300,
        isActive: true
    }));

    res.status(201).json({
        success: true,
        message: 'تم إنشاء الودجت بنجاح',
        data: widget
    });
});

/**
 * Get all dashboard widgets
 * GET /api/dashboard-widgets
 */
const getWidgets = asyncHandler(async (req, res) => {
    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const query = { ...req.firmQuery };
    if (req.query.isActive !== undefined) {
        query.isActive = req.query.isActive === 'true';
    }

    const widgets = await DashboardWidget.find(query)
        .sort({ 'position.y': 1, 'position.x': 1 });

    res.status(200).json({
        success: true,
        data: widgets
    });
});

/**
 * Get single widget
 * GET /api/dashboard-widgets/:id
 */
const getWidget = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize ID
    const widgetId = sanitizeObjectId(req.params.id);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const widget = await DashboardWidget.findOne({ _id: widgetId, ...req.firmQuery });

    if (!widget) {
        throw CustomException('الودجت غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        data: widget
    });
});

/**
 * Update widget
 * PATCH /api/dashboard-widgets/:id
 */
const updateWidget = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize ID
    const widgetId = sanitizeObjectId(req.params.id);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const widget = await DashboardWidget.findOne({ _id: widgetId, ...req.firmQuery });

    if (!widget) {
        throw CustomException('الودجت غير موجود', 404);
    }

    // Mass assignment protection
    const allowedFields = [
        'name', 'nameAr', 'type', 'dataSource', 'config',
        'position', 'size', 'refreshInterval', 'isActive'
    ];
    const updates = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (updates.name !== undefined && typeof updates.name !== 'string') {
        throw CustomException('اسم الودجت يجب أن يكون نصاً', 400);
    }

    if (updates.type !== undefined && typeof updates.type !== 'string') {
        throw CustomException('نوع الودجت يجب أن يكون نصاً', 400);
    }

    if (updates.dataSource !== undefined && typeof updates.dataSource !== 'string') {
        throw CustomException('مصدر البيانات يجب أن يكون نصاً', 400);
    }

    if (updates.config !== undefined && typeof updates.config !== 'object') {
        throw CustomException('الإعدادات يجب أن تكون كائناً', 400);
    }

    if (updates.position !== undefined && (typeof updates.position !== 'object' || Array.isArray(updates.position))) {
        throw CustomException('الموقع يجب أن يكون كائناً', 400);
    }

    if (updates.size !== undefined && (typeof updates.size !== 'object' || Array.isArray(updates.size))) {
        throw CustomException('الحجم يجب أن يكون كائناً', 400);
    }

    if (updates.refreshInterval !== undefined && typeof updates.refreshInterval !== 'number') {
        throw CustomException('فترة التحديث يجب أن تكون رقماً', 400);
    }

    if (updates.isActive !== undefined && typeof updates.isActive !== 'boolean') {
        throw CustomException('isActive يجب أن يكون قيمة منطقية', 400);
    }

    // Apply updates
    Object.keys(updates).forEach(field => {
        widget[field] = updates[field];
    });

    await widget.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث الودجت بنجاح',
        data: widget
    });
});

/**
 * Delete widget
 * DELETE /api/dashboard-widgets/:id
 */
const deleteWidget = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize ID
    const widgetId = sanitizeObjectId(req.params.id);

    // SECURITY FIX: Use atomic findOneAndDelete with req.firmQuery
    const widget = await DashboardWidget.findOneAndDelete({ _id: widgetId, ...req.firmQuery });

    if (!widget) {
        throw CustomException('الودجت غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف الودجت بنجاح'
    });
});

/**
 * Update widgets layout (bulk position update)
 * PATCH /api/dashboard-widgets/layout
 */
const updateLayout = asyncHandler(async (req, res) => {
    // Mass assignment protection
    const allowedFields = ['widgets'];
    const data = pickAllowedFields(req.body, allowedFields);

    // Input validation
    if (!data.widgets || !Array.isArray(data.widgets)) {
        throw CustomException('قائمة الودجات مطلوبة', 400);
    }

    if (data.widgets.length === 0) {
        throw CustomException('قائمة الودجات لا يمكن أن تكون فارغة', 400);
    }

    // Validate each widget in the array
    const updates = data.widgets.map(w => {
        if (!w.id) {
            throw CustomException('معرف الودجت مطلوب', 400);
        }

        // IDOR protection - sanitize widget ID
        const widgetId = sanitizeObjectId(w.id);

        if (!w.position || typeof w.position !== 'object' || Array.isArray(w.position)) {
            throw CustomException('موقع الودجت يجب أن يكون كائناً', 400);
        }

        if (!w.size || typeof w.size !== 'object' || Array.isArray(w.size)) {
            throw CustomException('حجم الودجت يجب أن يكون كائناً', 400);
        }

        // SECURITY FIX: Use req.firmQuery for proper tenant isolation
        return {
            updateOne: {
                filter: { _id: widgetId, ...req.firmQuery },
                update: {
                    position: w.position,
                    size: w.size
                }
            }
        };
    });

    await DashboardWidget.bulkWrite(updates);

    res.status(200).json({
        success: true,
        message: 'تم تحديث التخطيط بنجاح'
    });
});

/**
 * Get widget data
 * GET /api/dashboard-widgets/:id/data
 */
const getWidgetData = asyncHandler(async (req, res) => {
    // IDOR protection - sanitize ID
    const widgetId = sanitizeObjectId(req.params.id);

    // SECURITY FIX: Use req.firmQuery for proper tenant isolation
    const widget = await DashboardWidget.findOne({ _id: widgetId, ...req.firmQuery });

    if (!widget) {
        throw CustomException('الودجت غير موجود', 404);
    }

    // In production, this would fetch actual data based on dataSource
    // and widget configuration
    const data = {
        widgetId: widget._id,
        dataSource: widget.dataSource,
        lastUpdated: new Date(),
        // Placeholder - would be actual widget data
        value: null,
        chartData: null
    };

    res.status(200).json({
        success: true,
        data
    });
});

/**
 * Get default widgets
 * GET /api/dashboard-widgets/defaults
 */
const getDefaultWidgets = asyncHandler(async (req, res) => {
    // Return a set of default widgets for new users
    const defaults = [
        {
            name: 'Active Cases',
            nameAr: 'القضايا النشطة',
            type: 'counter',
            dataSource: 'cases',
            config: { filter: { status: 'active' } },
            position: { x: 0, y: 0 },
            size: { width: 1, height: 1 }
        },
        {
            name: 'Pending Tasks',
            nameAr: 'المهام المعلقة',
            type: 'counter',
            dataSource: 'tasks',
            config: { filter: { status: 'pending' } },
            position: { x: 1, y: 0 },
            size: { width: 1, height: 1 }
        },
        {
            name: 'Upcoming Hearings',
            nameAr: 'الجلسات القادمة',
            type: 'list',
            dataSource: 'hearings',
            config: { limit: 5 },
            position: { x: 2, y: 0 },
            size: { width: 2, height: 1 }
        },
        {
            name: 'Revenue This Month',
            nameAr: 'الإيرادات هذا الشهر',
            type: 'chart',
            dataSource: 'invoices',
            config: { chartType: 'bar', period: 'month' },
            position: { x: 0, y: 1 },
            size: { width: 2, height: 2 }
        }
    ];

    res.status(200).json({
        success: true,
        data: defaults
    });
});

module.exports = {
    // Saved Reports
    createReport,
    getReports,
    getReport,
    updateReport,
    deleteReport,
    runReport,
    duplicateReport,
    // Dashboard Widgets
    createWidget,
    getWidgets,
    getWidget,
    updateWidget,
    deleteWidget,
    updateLayout,
    getWidgetData,
    getDefaultWidgets
};
