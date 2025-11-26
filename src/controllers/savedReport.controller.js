const { SavedReport, DashboardWidget } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

// ==================== Saved Reports ====================

/**
 * Create saved report
 * POST /api/saved-reports
 */
const createReport = asyncHandler(async (req, res) => {
    const {
        name, nameAr, description, type, config,
        isScheduled, scheduleFrequency, scheduleTime,
        scheduleDayOfWeek, scheduleDayOfMonth, recipients
    } = req.body;
    const lawyerId = req.userID;

    if (!name || !type) {
        throw new CustomException('اسم التقرير ونوعه مطلوبان', 400);
    }

    const report = await SavedReport.create({
        lawyerId,
        name,
        nameAr,
        description,
        type,
        config: config || {},
        isScheduled: isScheduled || false,
        scheduleFrequency,
        scheduleTime,
        scheduleDayOfWeek,
        scheduleDayOfMonth,
        recipients: recipients || [],
        createdBy: lawyerId
    });

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
    const { type, isScheduled, page = 1, limit = 50 } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };
    if (type) query.type = type;
    if (isScheduled !== undefined) query.isScheduled = isScheduled === 'true';

    const reports = await SavedReport.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await SavedReport.countDocuments(query);

    res.status(200).json({
        success: true,
        data: reports,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single saved report
 * GET /api/saved-reports/:id
 */
const getReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const report = await SavedReport.findOne({ _id: id, lawyerId });

    if (!report) {
        throw new CustomException('التقرير غير موجود', 404);
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const report = await SavedReport.findOne({ _id: id, lawyerId });

    if (!report) {
        throw new CustomException('التقرير غير موجود', 404);
    }

    const allowedFields = [
        'name', 'nameAr', 'description', 'type', 'config',
        'isScheduled', 'scheduleFrequency', 'scheduleTime',
        'scheduleDayOfWeek', 'scheduleDayOfMonth', 'recipients'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            report[field] = req.body[field];
        }
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const report = await SavedReport.findOneAndDelete({ _id: id, lawyerId });

    if (!report) {
        throw new CustomException('التقرير غير موجود', 404);
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
    const { id } = req.params;
    const { overrideConfig } = req.body;
    const lawyerId = req.userID;

    const report = await SavedReport.findOne({ _id: id, lawyerId });

    if (!report) {
        throw new CustomException('التقرير غير موجود', 404);
    }

    // Merge override config with saved config
    const config = { ...report.config, ...overrideConfig };

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
    const { id } = req.params;
    const { name, nameAr } = req.body;
    const lawyerId = req.userID;

    const original = await SavedReport.findOne({ _id: id, lawyerId });

    if (!original) {
        throw new CustomException('التقرير غير موجود', 404);
    }

    const duplicate = await SavedReport.create({
        lawyerId,
        name: name || `${original.name} (نسخة)`,
        nameAr: nameAr || `${original.nameAr} (نسخة)`,
        description: original.description,
        type: original.type,
        config: original.config,
        isScheduled: false,
        createdBy: lawyerId
    });

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
    const {
        name, nameAr, type, dataSource, config,
        position, size, refreshInterval
    } = req.body;
    const lawyerId = req.userID;

    if (!name || !type || !dataSource) {
        throw new CustomException('الاسم والنوع ومصدر البيانات مطلوبة', 400);
    }

    const widget = await DashboardWidget.create({
        lawyerId,
        name,
        nameAr,
        type,
        dataSource,
        config: config || {},
        position: position || { x: 0, y: 0 },
        size: size || { width: 1, height: 1 },
        refreshInterval: refreshInterval || 300,
        isActive: true
    });

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
    const { isActive } = req.query;
    const lawyerId = req.userID;

    const query = { lawyerId };
    if (isActive !== undefined) query.isActive = isActive === 'true';

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
    const { id } = req.params;
    const lawyerId = req.userID;

    const widget = await DashboardWidget.findOne({ _id: id, lawyerId });

    if (!widget) {
        throw new CustomException('الودجت غير موجود', 404);
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const widget = await DashboardWidget.findOne({ _id: id, lawyerId });

    if (!widget) {
        throw new CustomException('الودجت غير موجود', 404);
    }

    const allowedFields = [
        'name', 'nameAr', 'type', 'dataSource', 'config',
        'position', 'size', 'refreshInterval', 'isActive'
    ];

    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            widget[field] = req.body[field];
        }
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
    const { id } = req.params;
    const lawyerId = req.userID;

    const widget = await DashboardWidget.findOneAndDelete({ _id: id, lawyerId });

    if (!widget) {
        throw new CustomException('الودجت غير موجود', 404);
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
    const { widgets } = req.body;
    const lawyerId = req.userID;

    if (!widgets || !Array.isArray(widgets)) {
        throw new CustomException('قائمة الودجات مطلوبة', 400);
    }

    const updates = widgets.map(w => ({
        updateOne: {
            filter: { _id: w.id, lawyerId },
            update: {
                position: w.position,
                size: w.size
            }
        }
    }));

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
    const { id } = req.params;
    const lawyerId = req.userID;

    const widget = await DashboardWidget.findOne({ _id: id, lawyerId });

    if (!widget) {
        throw new CustomException('الودجت غير موجود', 404);
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
