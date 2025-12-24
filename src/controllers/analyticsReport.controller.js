const mongoose = require('mongoose');
const {
    AnalyticsReport,
    Employee,
    Invoice,
    Expense,
    TimeEntry,
    Payment,
    Case,
    Client,
    Task,
    Lead,
    PayrollRun
} = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all analytics reports
 * GET /api/analytics-reports
 */
const getReports = asyncHandler(async (req, res) => {
    const {
        section,
        category,
        status = 'active',
        isTemplate,
        isFavorite,
        isPinned,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = req.query;

    const firmId = req.firmId;
    const lawyerId = req.userID;

    // Input validation
    const validSections = ['hr', 'finance', 'tasks', 'crm', 'sales', 'general'];
    const validStatuses = ['active', 'inactive', 'archived', 'draft'];
    const validSortFields = ['createdAt', 'updatedAt', 'name', 'nameAr', 'section', 'category', 'runCount', 'viewCount'];
    const validSortOrders = ['asc', 'desc'];

    if (section && !validSections.includes(section)) {
        throw CustomException('قسم غير صالح', 400);
    }

    if (status && !validStatuses.includes(status)) {
        throw CustomException('حالة غير صالحة', 400);
    }

    if (!validSortFields.includes(sortBy)) {
        throw CustomException('حقل الفرز غير صالح', 400);
    }

    if (!validSortOrders.includes(sortOrder)) {
        throw CustomException('ترتيب الفرز غير صالح', 400);
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const isSoloLawyer = req.isSoloLawyer;
    const query = {};
    if (isSoloLawyer || !firmId) {
        query.lawyerId = lawyerId;
    } else {
        query.firmId = firmId;
    }

    if (section) query.section = section;
    if (category) query.category = category;
    if (status) query.status = status;
    if (isTemplate !== undefined) query.isTemplate = isTemplate === 'true';
    if (isFavorite !== undefined) query.isFavorite = isFavorite === 'true';
    if (isPinned !== undefined) query.isPinned = isPinned === 'true';

    if (search) {
        // Sanitize search input to prevent regex injection
        const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').substring(0, 100);
        query.$or = [
            { name: { $regex: sanitizedSearch, $options: 'i' } },
            { nameAr: { $regex: sanitizedSearch, $options: 'i' } },
            { description: { $regex: sanitizedSearch, $options: 'i' } },
            { tags: { $in: [new RegExp(sanitizedSearch, 'i')] } }
        ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const reports = await AnalyticsReport.find(query)
        .sort(sortOptions)
        .limit(limitNum)
        .skip((pageNum - 1) * limitNum)
        .populate('createdBy', 'firstName lastName')
        .populate('updatedBy', 'firstName lastName');

    const total = await AnalyticsReport.countDocuments(query);

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
 * Get single report
 * GET /api/analytics-reports/:id
 */
const getReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    const report = await AnalyticsReport.findOne({ _id: sanitizedId, firmId })
        .populate('createdBy', 'firstName lastName email')
        .populate('updatedBy', 'firstName lastName email')
        .populate('lastRunBy', 'firstName lastName');

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Record view
    await report.recordView();

    res.status(200).json({
        success: true,
        data: report
    });
});

/**
 * Create new report
 * POST /api/analytics-reports
 */
const createReport = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'section',
        'category',
        'reportType',
        'columns',
        'charts',
        'filters',
        'aggregations',
        'dateRange',
        'groupBy',
        'sortBy',
        'sortOrder',
        'limit',
        'tags',
        'isTemplate',
        'schedule',
        'exportFormats',
        'hrConfig',
        'financeConfig',
        'tasksConfig',
        'crmConfig',
        'salesConfig',
        'status'
    ];

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    const reportData = {
        ...sanitizedData,
        firmId,
        lawyerId,
        createdBy: lawyerId,
        updatedBy: lawyerId
    };

    const report = await AnalyticsReport.create(reportData);

    res.status(201).json({
        success: true,
        message: 'تم إنشاء التقرير بنجاح',
        data: report
    });
});

/**
 * Update report
 * PATCH /api/analytics-reports/:id
 */
const updateReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    const report = await AnalyticsReport.findOne({ _id: sanitizedId, firmId });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = [
        'name',
        'nameAr',
        'description',
        'descriptionAr',
        'section',
        'category',
        'reportType',
        'columns',
        'charts',
        'filters',
        'aggregations',
        'dateRange',
        'groupBy',
        'sortBy',
        'sortOrder',
        'limit',
        'tags',
        'isTemplate',
        'isFavorite',
        'isPinned',
        'pinnedOrder',
        'schedule',
        'exportFormats',
        'hrConfig',
        'financeConfig',
        'tasksConfig',
        'crmConfig',
        'salesConfig',
        'status'
    ];

    const sanitizedData = pickAllowedFields(req.body, allowedFields);

    // Store previous version if significant changes
    if (sanitizedData.columns || sanitizedData.charts || sanitizedData.filters || sanitizedData.aggregations) {
        report.previousVersions.push({
            version: report.version,
            config: {
                columns: report.columns,
                charts: report.charts,
                filters: report.filters,
                aggregations: report.aggregations
            },
            updatedAt: report.updatedAt,
            updatedBy: report.updatedBy
        });
    }

    Object.assign(report, sanitizedData);
    report.updatedBy = lawyerId;

    await report.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث التقرير بنجاح',
        data: report
    });
});

/**
 * Delete report
 * DELETE /api/analytics-reports/:id
 */
const deleteReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    const report = await AnalyticsReport.findOneAndDelete({ _id: sanitizedId, firmId });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف التقرير بنجاح'
    });
});

/**
 * Bulk delete reports
 * POST /api/analytics-reports/bulk-delete
 */
const bulkDeleteReports = asyncHandler(async (req, res) => {
    const { ids } = req.body;
    const firmId = req.firmId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        throw CustomException('الرجاء تحديد التقارير المراد حذفها', 400);
    }

    // Limit bulk operations to prevent abuse
    if (ids.length > 100) {
        throw CustomException('لا يمكن حذف أكثر من 100 تقرير في وقت واحد', 400);
    }

    // Sanitize all IDs to prevent injection
    const sanitizedIds = ids.map(id => sanitizeObjectId(id));

    const result = await AnalyticsReport.deleteMany({
        _id: { $in: sanitizedIds },
        firmId
    });

    res.status(200).json({
        success: true,
        message: `تم حذف ${result.deletedCount} تقرير بنجاح`,
        deletedCount: result.deletedCount
    });
});

// ═══════════════════════════════════════════════════════════════
// REPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Run/Execute a report
 * POST /api/analytics-reports/:id/run
 */
const runReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { dateRange, filters } = req.body;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    const report = await AnalyticsReport.findOne({ _id: sanitizedId, firmId });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Validate dateRange if provided
    if (dateRange && typeof dateRange === 'object') {
        const validDateRangeTypes = ['custom', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year', 'last_7_days', 'last_30_days', 'last_90_days', 'last_365_days'];

        if (dateRange.type && !validDateRangeTypes.includes(dateRange.type)) {
            throw CustomException('نوع نطاق التاريخ غير صالح', 400);
        }
    }

    // Generate report data based on section
    let data;
    const mergedDateRange = dateRange || report.dateRange;
    const mergedFilters = { ...report.filters, ...filters };

    switch (report.section) {
        case 'hr':
            data = await generateHRReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        case 'finance':
            data = await generateFinanceReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        case 'tasks':
            data = await generateTasksReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        case 'crm':
            data = await generateCRMReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        case 'sales':
            data = await generateSalesReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        default:
            data = await generateGeneralReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
    }

    // Record the run
    await report.recordRun(lawyerId);

    res.status(200).json({
        success: true,
        reportId: report._id,
        reportName: report.name,
        section: report.section,
        category: report.category,
        generatedAt: new Date(),
        dateRange: mergedDateRange,
        data
    });
});

/**
 * Clone/Duplicate a report
 * POST /api/analytics-reports/:id/clone
 */
const cloneReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    const report = await AnalyticsReport.findOne({ _id: sanitizedId, firmId });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Validate name length
    if (name && name.length > 200) {
        throw CustomException('اسم التقرير طويل جداً', 400);
    }

    const clonedReport = await report.clone(name, lawyerId);

    res.status(201).json({
        success: true,
        message: 'تم نسخ التقرير بنجاح',
        data: clonedReport
    });
});

/**
 * Toggle favorite status
 * POST /api/analytics-reports/:id/favorite
 */
const toggleFavorite = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    const report = await AnalyticsReport.findOne({ _id: sanitizedId, firmId });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    const isFavorite = await report.toggleFavorite();

    res.status(200).json({
        success: true,
        message: isFavorite ? 'تمت إضافة التقرير للمفضلة' : 'تمت إزالة التقرير من المفضلة',
        isFavorite
    });
});

/**
 * Toggle pinned status
 * POST /api/analytics-reports/:id/pin
 */
const togglePinned = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { order } = req.body;
    const firmId = req.firmId;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    const report = await AnalyticsReport.findOne({ _id: sanitizedId, firmId });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Validate order if provided
    if (order !== undefined && (typeof order !== 'number' || order < 0 || order > 1000)) {
        throw CustomException('قيمة الترتيب غير صالحة', 400);
    }

    const isPinned = await report.togglePinned(order);

    res.status(200).json({
        success: true,
        message: isPinned ? 'تم تثبيت التقرير' : 'تم إلغاء تثبيت التقرير',
        isPinned
    });
});

// ═══════════════════════════════════════════════════════════════
// SCHEDULING
// ═══════════════════════════════════════════════════════════════

/**
 * Schedule a report
 * POST /api/analytics-reports/:id/schedule
 */
const scheduleReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { schedule } = req.body;
    const firmId = req.firmId;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    const report = await AnalyticsReport.findOne({ _id: sanitizedId, firmId });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Validate schedule object
    if (!schedule || typeof schedule !== 'object') {
        throw CustomException('بيانات الجدولة غير صالحة', 400);
    }

    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (schedule.frequency && !validFrequencies.includes(schedule.frequency)) {
        throw CustomException('تكرار الجدولة غير صالح', 400);
    }

    // Only allow specific schedule fields
    const allowedScheduleFields = ['frequency', 'time', 'dayOfWeek', 'dayOfMonth', 'recipients', 'format'];
    const sanitizedSchedule = pickAllowedFields(schedule, allowedScheduleFields);

    report.schedule = {
        ...report.schedule,
        ...sanitizedSchedule,
        enabled: true
    };

    // Calculate next run
    report.calculateNextRun();

    await report.save();

    res.status(200).json({
        success: true,
        message: 'تم جدولة التقرير بنجاح',
        schedule: report.schedule
    });
});

/**
 * Unschedule a report
 * DELETE /api/analytics-reports/:id/schedule
 */
const unscheduleReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const firmId = req.firmId;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    const report = await AnalyticsReport.findOne({ _id: sanitizedId, firmId });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    if (report.schedule) {
        report.schedule.enabled = false;
        report.schedule.nextRun = undefined;
    }

    await report.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء جدولة التقرير بنجاح'
    });
});

// ═══════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * Get report templates
 * GET /api/analytics-reports/templates
 */
const getTemplates = asyncHandler(async (req, res) => {
    const { section, category } = req.query;
    const firmId = req.firmId;

    // Validate section if provided
    if (section) {
        const validSections = ['hr', 'finance', 'tasks', 'crm', 'sales', 'general'];
        if (!validSections.includes(section)) {
            throw CustomException('قسم غير صالح', 400);
        }
    }

    const templates = await AnalyticsReport.getTemplates(firmId, section);

    let filteredTemplates = templates;
    if (category) {
        filteredTemplates = templates.filter(t => t.category === category);
    }

    res.status(200).json({
        success: true,
        data: filteredTemplates
    });
});

/**
 * Create report from template
 * POST /api/analytics-reports/from-template/:templateId
 */
const createFromTemplate = asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const { name, nameAr } = req.body;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // Sanitize template ID to prevent injection
    const sanitizedTemplateId = sanitizeObjectId(templateId);

    // Validate name inputs
    if (name && name.length > 200) {
        throw CustomException('اسم التقرير طويل جداً', 400);
    }
    if (nameAr && nameAr.length > 200) {
        throw CustomException('الاسم العربي للتقرير طويل جداً', 400);
    }

    const template = await AnalyticsReport.findOne({
        _id: sanitizedTemplateId,
        isTemplate: true
    });

    if (!template) {
        throw CustomException('القالب غير موجود', 404);
    }

    const newReport = await template.clone(name || template.name, lawyerId);
    newReport.firmId = firmId;
    newReport.lawyerId = lawyerId;
    newReport.isTemplate = false;
    newReport.templateId = templateId;
    if (nameAr) newReport.nameAr = nameAr;

    await newReport.save();

    res.status(201).json({
        success: true,
        message: 'تم إنشاء التقرير من القالب بنجاح',
        data: newReport
    });
});

// ═══════════════════════════════════════════════════════════════
// STATISTICS & DASHBOARD
// ═══════════════════════════════════════════════════════════════

/**
 * Get report statistics
 * GET /api/analytics-reports/stats
 */
const getStats = asyncHandler(async (req, res) => {
    const firmId = req.firmId;

    const stats = await AnalyticsReport.getStats(firmId);

    const totalReports = stats.reduce((sum, s) => sum + s.count, 0);
    const totalScheduled = stats.reduce((sum, s) => sum + s.scheduled, 0);
    const totalRuns = stats.reduce((sum, s) => sum + s.totalRuns, 0);

    res.status(200).json({
        success: true,
        data: {
            summary: {
                totalReports,
                totalScheduled,
                totalRuns
            },
            bySection: stats
        }
    });
});

/**
 * Get favorite reports
 * GET /api/analytics-reports/favorites
 */
const getFavorites = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const lawyerId = req.userID;

    const favorites = await AnalyticsReport.getFavorites(firmId, lawyerId);

    res.status(200).json({
        success: true,
        data: favorites
    });
});

/**
 * Get pinned reports for dashboard
 * GET /api/analytics-reports/pinned
 */
const getPinnedReports = asyncHandler(async (req, res) => {
    const firmId = req.firmId;
    const lawyerId = req.userID;

    const pinned = await AnalyticsReport.getPinnedReports(firmId, lawyerId);

    res.status(200).json({
        success: true,
        data: pinned
    });
});

/**
 * Get reports by section
 * GET /api/analytics-reports/section/:section
 */
const getBySection = asyncHandler(async (req, res) => {
    const { section } = req.params;
    const { category, limit = 50 } = req.query;
    const firmId = req.firmId;

    // Validate section
    const validSections = ['hr', 'finance', 'tasks', 'crm', 'sales', 'general'];
    if (!validSections.includes(section)) {
        throw CustomException('قسم غير صالح', 400);
    }

    // Validate and sanitize limit
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const reports = await AnalyticsReport.getBySection(firmId, section, {
        category,
        limit: limitNum
    });

    res.status(200).json({
        success: true,
        section,
        data: reports
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Export report
 * POST /api/analytics-reports/:id/export
 */
const exportReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { format = 'pdf', dateRange, filters } = req.body;
    const firmId = req.firmId;
    const lawyerId = req.userID;

    // Sanitize ID to prevent injection
    const sanitizedId = sanitizeObjectId(id);

    // Validate format
    const validFormats = ['pdf', 'excel', 'csv', 'json'];
    if (!validFormats.includes(format)) {
        throw CustomException('صيغة التصدير غير صالحة', 400);
    }

    // Validate dateRange if provided
    if (dateRange && typeof dateRange === 'object') {
        const validDateRangeTypes = ['custom', 'today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_year', 'last_year', 'last_7_days', 'last_30_days', 'last_90_days', 'last_365_days'];

        if (dateRange.type && !validDateRangeTypes.includes(dateRange.type)) {
            throw CustomException('نوع نطاق التاريخ غير صالح', 400);
        }
    }

    const report = await AnalyticsReport.findOne({ _id: sanitizedId, firmId });

    if (!report) {
        throw CustomException('التقرير غير موجود', 404);
    }

    // Generate report data
    const mergedDateRange = dateRange || report.dateRange;
    const mergedFilters = { ...report.filters, ...filters };

    let data;
    switch (report.section) {
        case 'hr':
            data = await generateHRReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        case 'finance':
            data = await generateFinanceReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        case 'tasks':
            data = await generateTasksReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        case 'crm':
            data = await generateCRMReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        case 'sales':
            data = await generateSalesReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
            break;
        default:
            data = await generateGeneralReportData(firmId, lawyerId, report, mergedDateRange, mergedFilters);
    }

    // For now return JSON, in production implement actual file generation
    const fileName = `${report.reportId || report._id}_${Date.now()}.${format}`;

    res.status(200).json({
        success: true,
        fileName,
        format,
        reportName: report.name,
        generatedAt: new Date(),
        data
    });
});

// ═══════════════════════════════════════════════════════════════
// SECTION-SPECIFIC REPORT GENERATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate HR Report Data
 */
async function generateHRReportData(firmId, lawyerId, report, dateRange, filters) {
    const config = report.hrConfig || {};
    const category = config.category || report.category;

    const dateQuery = buildDateQuery(dateRange);

    switch (category) {
        case 'employee_data':
            return await generateEmployeeDataReport(firmId, config, dateQuery);
        case 'payroll':
            return await generatePayrollReport(firmId, config, dateQuery);
        case 'attendance':
            return await generateAttendanceReport(firmId, config, dateQuery);
        case 'performance':
            return await generatePerformanceReport(firmId, config, dateQuery);
        case 'compliance':
            return await generateComplianceReport(firmId, config, dateQuery);
        default:
            return await generateEmployeeDataReport(firmId, config, dateQuery);
    }
}

async function generateEmployeeDataReport(firmId, config, dateQuery) {
    const query = { firmId };

    if (config.employeeFilters) {
        if (config.employeeFilters.departments?.length) {
            query.department = { $in: config.employeeFilters.departments };
        }
        if (config.employeeFilters.statuses?.length) {
            query.employmentStatus = { $in: config.employeeFilters.statuses };
        }
        if (config.employeeFilters.employmentTypes?.length) {
            query.employmentType = { $in: config.employeeFilters.employmentTypes };
        }
    }

    const employees = await Employee.find(query)
        .select('firstName lastName employeeId department position employmentStatus hireDate salary')
        .lean();

    const byDepartment = employees.reduce((acc, emp) => {
        const dept = emp.department || 'غير محدد';
        if (!acc[dept]) acc[dept] = { count: 0, totalSalary: 0 };
        acc[dept].count++;
        acc[dept].totalSalary += emp.salary?.basic || 0;
        return acc;
    }, {});

    const byStatus = employees.reduce((acc, emp) => {
        const status = emp.employmentStatus || 'active';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    return {
        summary: {
            totalEmployees: employees.length,
            totalSalaryBudget: employees.reduce((sum, e) => sum + (e.salary?.basic || 0), 0),
            averageSalary: employees.length > 0
                ? employees.reduce((sum, e) => sum + (e.salary?.basic || 0), 0) / employees.length
                : 0
        },
        byDepartment: Object.entries(byDepartment).map(([dept, data]) => ({
            department: dept,
            ...data
        })),
        byStatus,
        records: employees
    };
}

async function generatePayrollReport(firmId, config, dateQuery) {
    const query = { firmId };
    if (dateQuery.startDate || dateQuery.endDate) {
        query.payPeriodStart = {};
        if (dateQuery.startDate) query.payPeriodStart.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.payPeriodStart.$lte = dateQuery.endDate;
    }

    const payrollRuns = await PayrollRun.find(query)
        .populate('employeeId', 'firstName lastName employeeId department')
        .lean();

    const totalGross = payrollRuns.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
    const totalDeductions = payrollRuns.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
    const totalNet = payrollRuns.reduce((sum, p) => sum + (p.netSalary || 0), 0);

    const byDepartment = payrollRuns.reduce((acc, p) => {
        const dept = p.employeeId?.department || 'غير محدد';
        if (!acc[dept]) acc[dept] = { gross: 0, deductions: 0, net: 0, count: 0 };
        acc[dept].gross += p.grossSalary || 0;
        acc[dept].deductions += p.totalDeductions || 0;
        acc[dept].net += p.netSalary || 0;
        acc[dept].count++;
        return acc;
    }, {});

    return {
        summary: {
            totalGrossSalary: totalGross,
            totalDeductions,
            totalNetSalary: totalNet,
            payrollCount: payrollRuns.length
        },
        byDepartment: Object.entries(byDepartment).map(([dept, data]) => ({
            department: dept,
            ...data
        })),
        records: payrollRuns.slice(0, 100)
    };
}

async function generateAttendanceReport(firmId, config, dateQuery) {
    // Placeholder - implement based on Attendance model
    return {
        summary: {
            totalWorkDays: 0,
            presentDays: 0,
            absentDays: 0,
            lateDays: 0,
            averageAttendance: '0%'
        },
        byDepartment: [],
        records: []
    };
}

async function generatePerformanceReport(firmId, config, dateQuery) {
    // Placeholder - implement based on PerformanceReview model
    return {
        summary: {
            totalReviews: 0,
            averageRating: 0,
            topPerformers: [],
            needsImprovement: []
        },
        byDepartment: [],
        records: []
    };
}

async function generateComplianceReport(firmId, config, dateQuery) {
    const employees = await HR.find({ firmId })
        .select('firstName lastName employeeId nationality iqamaNumber iqamaExpiry passportExpiry workPermitExpiry')
        .lean();

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringDocuments = {
        iqama: [],
        passport: [],
        workPermit: []
    };

    employees.forEach(emp => {
        if (emp.iqamaExpiry && new Date(emp.iqamaExpiry) <= thirtyDays) {
            expiringDocuments.iqama.push({
                employee: `${emp.firstName} ${emp.lastName}`,
                employeeId: emp.employeeId,
                expiryDate: emp.iqamaExpiry
            });
        }
        if (emp.passportExpiry && new Date(emp.passportExpiry) <= thirtyDays) {
            expiringDocuments.passport.push({
                employee: `${emp.firstName} ${emp.lastName}`,
                employeeId: emp.employeeId,
                expiryDate: emp.passportExpiry
            });
        }
        if (emp.workPermitExpiry && new Date(emp.workPermitExpiry) <= thirtyDays) {
            expiringDocuments.workPermit.push({
                employee: `${emp.firstName} ${emp.lastName}`,
                employeeId: emp.employeeId,
                expiryDate: emp.workPermitExpiry
            });
        }
    });

    // Saudization calculation
    const saudiCount = employees.filter(e => e.nationality === 'Saudi' || e.nationality === 'سعودي').length;
    const saudizationRate = employees.length > 0 ? (saudiCount / employees.length) * 100 : 0;

    return {
        summary: {
            totalEmployees: employees.length,
            saudiEmployees: saudiCount,
            nonSaudiEmployees: employees.length - saudiCount,
            saudizationRate: saudizationRate.toFixed(2) + '%',
            expiringDocumentsCount: expiringDocuments.iqama.length + expiringDocuments.passport.length + expiringDocuments.workPermit.length
        },
        expiringDocuments,
        saudization: {
            target: 30, // Configurable target
            actual: saudizationRate,
            compliant: saudizationRate >= 30
        }
    };
}

/**
 * Generate Finance Report Data
 */
async function generateFinanceReportData(firmId, lawyerId, report, dateRange, filters) {
    const config = report.financeConfig || {};
    const category = config.category || report.category;

    const dateQuery = buildDateQuery(dateRange);

    switch (category) {
        case 'invoices':
            return await generateInvoicesReport(lawyerId, config, dateQuery);
        case 'expenses':
            return await generateExpensesReport(lawyerId, config, dateQuery);
        case 'cash_flow':
            return await generateCashFlowReport(lawyerId, config, dateQuery);
        case 'profitability':
            return await generateProfitabilityReport(lawyerId, config, dateQuery);
        case 'aging':
            return await generateAgingReport(lawyerId, config);
        case 'revenue':
            return await generateRevenueReport(lawyerId, config, dateQuery);
        default:
            return await generateInvoicesReport(lawyerId, config, dateQuery);
    }
}

async function generateInvoicesReport(lawyerId, config, dateQuery) {
    const query = { lawyerId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.issueDate = {};
        if (dateQuery.startDate) query.issueDate.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.issueDate.$lte = dateQuery.endDate;
    }

    if (config.invoiceConfig?.statuses?.length) {
        query.status = { $in: config.invoiceConfig.statuses };
    }

    const invoices = await Invoice.find(query)
        .populate('clientId', 'firstName lastName username')
        .populate('caseId', 'title caseNumber')
        .lean();

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalOutstanding = totalInvoiced - totalPaid;

    const byStatus = invoices.reduce((acc, inv) => {
        const status = inv.status || 'draft';
        if (!acc[status]) acc[status] = { count: 0, amount: 0 };
        acc[status].count++;
        acc[status].amount += inv.totalAmount || 0;
        return acc;
    }, {});

    return {
        summary: {
            totalInvoiced,
            totalPaid,
            totalOutstanding,
            invoiceCount: invoices.length,
            collectionRate: totalInvoiced > 0 ? ((totalPaid / totalInvoiced) * 100).toFixed(2) + '%' : '0%'
        },
        byStatus: Object.entries(byStatus).map(([status, data]) => ({
            status,
            ...data
        })),
        records: invoices.slice(0, 100)
    };
}

async function generateExpensesReport(lawyerId, config, dateQuery) {
    const query = { lawyerId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.date = {};
        if (dateQuery.startDate) query.date.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.date.$lte = dateQuery.endDate;
    }

    if (config.expenseConfig?.categories?.length) {
        query.category = { $in: config.expenseConfig.categories };
    }

    const expenses = await Expense.find(query)
        .populate('caseId', 'title caseNumber')
        .lean();

    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

    const byCategory = expenses.reduce((acc, exp) => {
        const cat = exp.category || 'other';
        if (!acc[cat]) acc[cat] = { count: 0, amount: 0 };
        acc[cat].count++;
        acc[cat].amount += exp.amount || 0;
        return acc;
    }, {});

    const billableExpenses = expenses.filter(e => e.billable);
    const totalBillable = billableExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
        summary: {
            totalExpenses,
            totalBillable,
            totalNonBillable: totalExpenses - totalBillable,
            expenseCount: expenses.length,
            billablePercentage: totalExpenses > 0 ? ((totalBillable / totalExpenses) * 100).toFixed(2) + '%' : '0%'
        },
        byCategory: Object.entries(byCategory).map(([category, data]) => ({
            category,
            ...data
        })),
        records: expenses.slice(0, 100)
    };
}

async function generateCashFlowReport(lawyerId, config, dateQuery) {
    // Incoming - Payments received
    const paymentQuery = { lawyerId, status: 'completed' };
    if (dateQuery.startDate || dateQuery.endDate) {
        paymentQuery.paymentDate = {};
        if (dateQuery.startDate) paymentQuery.paymentDate.$gte = dateQuery.startDate;
        if (dateQuery.endDate) paymentQuery.paymentDate.$lte = dateQuery.endDate;
    }

    const payments = await Payment.find(paymentQuery).lean();
    const totalIncoming = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // Outgoing - Expenses
    const expenseQuery = { lawyerId };
    if (dateQuery.startDate || dateQuery.endDate) {
        expenseQuery.date = {};
        if (dateQuery.startDate) expenseQuery.date.$gte = dateQuery.startDate;
        if (dateQuery.endDate) expenseQuery.date.$lte = dateQuery.endDate;
    }

    const expenses = await Expense.find(expenseQuery).lean();
    const totalOutgoing = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const netCashFlow = totalIncoming - totalOutgoing;

    return {
        summary: {
            totalIncoming,
            totalOutgoing,
            netCashFlow,
            cashFlowRatio: totalOutgoing > 0 ? (totalIncoming / totalOutgoing).toFixed(2) : 'N/A'
        },
        incoming: {
            total: totalIncoming,
            count: payments.length,
            byMethod: payments.reduce((acc, p) => {
                const method = p.paymentMethod || 'other';
                acc[method] = (acc[method] || 0) + (p.amount || 0);
                return acc;
            }, {})
        },
        outgoing: {
            total: totalOutgoing,
            count: expenses.length,
            byCategory: expenses.reduce((acc, e) => {
                const cat = e.category || 'other';
                acc[cat] = (acc[cat] || 0) + (e.amount || 0);
                return acc;
            }, {})
        }
    };
}

async function generateProfitabilityReport(lawyerId, config, dateQuery) {
    const invoiceQuery = { lawyerId };
    const expenseQuery = { lawyerId };

    if (dateQuery.startDate || dateQuery.endDate) {
        invoiceQuery.issueDate = {};
        expenseQuery.date = {};
        if (dateQuery.startDate) {
            invoiceQuery.issueDate.$gte = dateQuery.startDate;
            expenseQuery.date.$gte = dateQuery.startDate;
        }
        if (dateQuery.endDate) {
            invoiceQuery.issueDate.$lte = dateQuery.endDate;
            expenseQuery.date.$lte = dateQuery.endDate;
        }
    }

    const invoices = await Invoice.find(invoiceQuery).lean();
    const expenses = await Expense.find(expenseQuery).lean();

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const grossProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return {
        summary: {
            totalRevenue,
            totalExpenses,
            grossProfit,
            profitMargin: profitMargin.toFixed(2) + '%'
        },
        revenue: {
            invoiced: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
            collected: totalRevenue,
            outstanding: invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0) - (inv.amountPaid || 0), 0)
        },
        expenses: {
            total: totalExpenses,
            byCategory: expenses.reduce((acc, e) => {
                const cat = e.category || 'other';
                acc[cat] = (acc[cat] || 0) + (e.amount || 0);
                return acc;
            }, {})
        }
    };
}

async function generateAgingReport(lawyerId, config) {
    const query = {
        lawyerId,
        status: { $in: ['sent', 'partial', 'overdue'] }
    };

    const invoices = await Invoice.find(query)
        .populate('clientId', 'firstName lastName username')
        .lean();

    const now = new Date();
    const aging = {
        current: { count: 0, amount: 0 },
        days1_30: { count: 0, amount: 0 },
        days31_60: { count: 0, amount: 0 },
        days61_90: { count: 0, amount: 0 },
        days90Plus: { count: 0, amount: 0 }
    };

    const details = [];

    invoices.forEach(inv => {
        const daysOverdue = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
        const outstanding = (inv.totalAmount || 0) - (inv.amountPaid || 0);

        const item = {
            invoiceNumber: inv.invoiceNumber,
            client: inv.clientId ? `${inv.clientId.firstName || ''} ${inv.clientId.lastName || inv.clientId.username}`.trim() : 'Unknown',
            totalAmount: inv.totalAmount,
            outstanding,
            dueDate: inv.dueDate,
            daysOverdue: Math.max(0, daysOverdue)
        };

        if (daysOverdue < 0) {
            aging.current.count++;
            aging.current.amount += outstanding;
            item.bucket = 'current';
        } else if (daysOverdue <= 30) {
            aging.days1_30.count++;
            aging.days1_30.amount += outstanding;
            item.bucket = '1-30';
        } else if (daysOverdue <= 60) {
            aging.days31_60.count++;
            aging.days31_60.amount += outstanding;
            item.bucket = '31-60';
        } else if (daysOverdue <= 90) {
            aging.days61_90.count++;
            aging.days61_90.amount += outstanding;
            item.bucket = '61-90';
        } else {
            aging.days90Plus.count++;
            aging.days90Plus.amount += outstanding;
            item.bucket = '90+';
        }

        details.push(item);
    });

    const totalOutstanding = Object.values(aging).reduce((sum, b) => sum + b.amount, 0);

    return {
        summary: {
            totalOutstanding,
            invoiceCount: invoices.length,
            averageAge: details.length > 0 ? (details.reduce((sum, d) => sum + d.daysOverdue, 0) / details.length).toFixed(1) : 0
        },
        aging,
        records: details.sort((a, b) => b.daysOverdue - a.daysOverdue).slice(0, 100)
    };
}

async function generateRevenueReport(lawyerId, config, dateQuery) {
    const query = { lawyerId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.issueDate = {};
        if (dateQuery.startDate) query.issueDate.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.issueDate.$lte = dateQuery.endDate;
    }

    const invoices = await Invoice.find(query)
        .populate('clientId', 'firstName lastName username')
        .lean();

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);

    // Group by month
    const byMonth = invoices.reduce((acc, inv) => {
        const date = new Date(inv.issueDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[key]) acc[key] = { invoiced: 0, collected: 0, count: 0 };
        acc[key].invoiced += inv.totalAmount || 0;
        acc[key].collected += inv.amountPaid || 0;
        acc[key].count++;
        return acc;
    }, {});

    // Group by client
    const byClient = invoices.reduce((acc, inv) => {
        const clientName = inv.clientId
            ? `${inv.clientId.firstName || ''} ${inv.clientId.lastName || inv.clientId.username}`.trim()
            : 'Unknown';
        if (!acc[clientName]) acc[clientName] = { invoiced: 0, collected: 0, count: 0 };
        acc[clientName].invoiced += inv.totalAmount || 0;
        acc[clientName].collected += inv.amountPaid || 0;
        acc[clientName].count++;
        return acc;
    }, {});

    return {
        summary: {
            totalInvoiced,
            totalCollected,
            totalOutstanding: totalInvoiced - totalCollected,
            collectionRate: totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(2) + '%' : '0%',
            invoiceCount: invoices.length
        },
        byMonth: Object.entries(byMonth)
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => a.month.localeCompare(b.month)),
        byClient: Object.entries(byClient)
            .map(([client, data]) => ({ client, ...data }))
            .sort((a, b) => b.invoiced - a.invoiced)
            .slice(0, 20)
    };
}

/**
 * Generate Tasks Report Data
 */
async function generateTasksReportData(firmId, lawyerId, report, dateRange, filters) {
    const config = report.tasksConfig || {};
    const category = config.category || report.category;

    const dateQuery = buildDateQuery(dateRange);

    switch (category) {
        case 'task_completion':
            return await generateTaskCompletionReport(lawyerId, config, dateQuery);
        case 'time_tracking':
            return await generateTimeTrackingReport(lawyerId, config, dateQuery);
        case 'team_productivity':
            return await generateProductivityReport2(lawyerId, config, dateQuery);
        default:
            return await generateTaskCompletionReport(lawyerId, config, dateQuery);
    }
}

async function generateTaskCompletionReport(lawyerId, config, dateQuery) {
    const query = { lawyerId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.createdAt = {};
        if (dateQuery.startDate) query.createdAt.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.createdAt.$lte = dateQuery.endDate;
    }

    const tasks = await Task.find(query)
        .populate('caseId', 'title caseNumber')
        .lean();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const overdueTasks = tasks.filter(t => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < new Date()).length;

    const byStatus = tasks.reduce((acc, t) => {
        const status = t.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    const byPriority = tasks.reduce((acc, t) => {
        const priority = t.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
    }, {});

    return {
        summary: {
            totalTasks,
            completedTasks,
            pendingTasks: totalTasks - completedTasks,
            overdueTasks,
            completionRate: totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) + '%' : '0%'
        },
        byStatus,
        byPriority,
        records: tasks.slice(0, 100)
    };
}

async function generateTimeTrackingReport(lawyerId, config, dateQuery) {
    const query = { lawyerId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.date = {};
        if (dateQuery.startDate) query.date.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.date.$lte = dateQuery.endDate;
    }

    if (config.timeTrackingConfig?.billableOnly) {
        query.isBillable = true;
    }

    const entries = await TimeEntry.find(query)
        .populate('caseId', 'title caseNumber')
        .populate('clientId', 'firstName lastName username')
        .lean();

    const totalHours = entries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const billableHours = entries.filter(e => e.isBillable).reduce((sum, e) => sum + (e.hours || 0), 0);
    const totalBillableAmount = entries.reduce((sum, e) => sum + (e.billableAmount || 0), 0);

    const byActivity = entries.reduce((acc, e) => {
        const activity = e.activityCode || 'other';
        if (!acc[activity]) acc[activity] = { hours: 0, billable: 0, amount: 0 };
        acc[activity].hours += e.hours || 0;
        if (e.isBillable) acc[activity].billable += e.hours || 0;
        acc[activity].amount += e.billableAmount || 0;
        return acc;
    }, {});

    return {
        summary: {
            totalHours,
            billableHours,
            nonBillableHours: totalHours - billableHours,
            utilizationRate: totalHours > 0 ? ((billableHours / totalHours) * 100).toFixed(2) + '%' : '0%',
            totalBillableAmount,
            averageRate: billableHours > 0 ? (totalBillableAmount / billableHours).toFixed(2) : 0
        },
        byActivity: Object.entries(byActivity).map(([activity, data]) => ({
            activity,
            ...data
        })),
        records: entries.slice(0, 100)
    };
}

async function generateProductivityReport2(lawyerId, config, dateQuery) {
    const timeQuery = { lawyerId };
    const taskQuery = { lawyerId };

    if (dateQuery.startDate || dateQuery.endDate) {
        timeQuery.date = {};
        taskQuery.createdAt = {};
        if (dateQuery.startDate) {
            timeQuery.date.$gte = dateQuery.startDate;
            taskQuery.createdAt.$gte = dateQuery.startDate;
        }
        if (dateQuery.endDate) {
            timeQuery.date.$lte = dateQuery.endDate;
            taskQuery.createdAt.$lte = dateQuery.endDate;
        }
    }

    const timeEntries = await TimeEntry.find(timeQuery).lean();
    const tasks = await Task.find(taskQuery).lean();

    const totalHours = timeEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const billableHours = timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + (e.hours || 0), 0);
    const completedTasks = tasks.filter(t => t.status === 'completed').length;

    const target = config.productivityConfig?.billableTarget || 6.5;

    return {
        summary: {
            totalHours,
            billableHours,
            totalTasks: tasks.length,
            completedTasks,
            taskCompletionRate: tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(2) + '%' : '0%',
            utilizationRate: totalHours > 0 ? ((billableHours / totalHours) * 100).toFixed(2) + '%' : '0%',
            targetBillableHours: target,
            targetAchievement: target > 0 ? ((billableHours / target) * 100).toFixed(2) + '%' : '0%'
        }
    };
}

/**
 * Generate CRM Report Data
 */
async function generateCRMReportData(firmId, lawyerId, report, dateRange, filters) {
    const config = report.crmConfig || {};
    const category = config.category || report.category;

    const dateQuery = buildDateQuery(dateRange);

    switch (category) {
        case 'leads':
            return await generateLeadsReport(firmId, config, dateQuery);
        case 'pipeline':
            return await generatePipelineReport(firmId, config, dateQuery);
        case 'contacts':
            return await generateContactsReport(firmId, config, dateQuery);
        default:
            return await generateLeadsReport(firmId, config, dateQuery);
    }
}

async function generateLeadsReport(firmId, config, dateQuery) {
    const query = { firmId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.createdAt = {};
        if (dateQuery.startDate) query.createdAt.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.createdAt.$lte = dateQuery.endDate;
    }

    if (config.leadConfig?.sources?.length) {
        query.source = { $in: config.leadConfig.sources };
    }
    if (config.leadConfig?.statuses?.length) {
        query.status = { $in: config.leadConfig.statuses };
    }

    const leads = await Lead.find(query)
        .populate('assignedTo', 'firstName lastName')
        .lean();

    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.status === 'converted' || l.status === 'won').length;
    const lostLeads = leads.filter(l => l.status === 'lost' || l.status === 'disqualified').length;

    const bySource = leads.reduce((acc, l) => {
        const source = l.source || 'other';
        if (!acc[source]) acc[source] = { total: 0, converted: 0 };
        acc[source].total++;
        if (l.status === 'converted' || l.status === 'won') acc[source].converted++;
        return acc;
    }, {});

    const byStatus = leads.reduce((acc, l) => {
        const status = l.status || 'new';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});

    return {
        summary: {
            totalLeads,
            convertedLeads,
            lostLeads,
            activeLeads: totalLeads - convertedLeads - lostLeads,
            conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) + '%' : '0%'
        },
        bySource: Object.entries(bySource).map(([source, data]) => ({
            source,
            ...data,
            conversionRate: data.total > 0 ? ((data.converted / data.total) * 100).toFixed(2) + '%' : '0%'
        })),
        byStatus,
        records: leads.slice(0, 100)
    };
}

async function generatePipelineReport(firmId, config, dateQuery) {
    const query = { firmId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.createdAt = {};
        if (dateQuery.startDate) query.createdAt.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.createdAt.$lte = dateQuery.endDate;
    }

    const leads = await Lead.find(query).lean();

    const byStage = leads.reduce((acc, l) => {
        const stage = l.stage || l.status || 'new';
        if (!acc[stage]) acc[stage] = { count: 0, value: 0 };
        acc[stage].count++;
        acc[stage].value += l.expectedValue || l.estimatedValue || 0;
        return acc;
    }, {});

    const totalValue = leads.reduce((sum, l) => sum + (l.expectedValue || l.estimatedValue || 0), 0);
    const weightedValue = leads.reduce((sum, l) => {
        const probability = l.probability || 0.5;
        return sum + ((l.expectedValue || l.estimatedValue || 0) * probability);
    }, 0);

    return {
        summary: {
            totalLeads: leads.length,
            totalPipelineValue: totalValue,
            weightedPipelineValue: weightedValue
        },
        byStage: Object.entries(byStage).map(([stage, data]) => ({
            stage,
            ...data
        })),
        funnel: Object.entries(byStage).map(([stage, data]) => ({
            stage,
            count: data.count,
            percentage: leads.length > 0 ? ((data.count / leads.length) * 100).toFixed(2) + '%' : '0%'
        }))
    };
}

async function generateContactsReport(firmId, config, dateQuery) {
    const query = { firmId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.createdAt = {};
        if (dateQuery.startDate) query.createdAt.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.createdAt.$lte = dateQuery.endDate;
    }

    const clients = await Client.find(query).lean();

    const totalClients = clients.length;
    const activeClients = clients.filter(c => c.status === 'active').length;

    const byType = clients.reduce((acc, c) => {
        const type = c.type || c.clientType || 'individual';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {});

    return {
        summary: {
            totalContacts: totalClients,
            activeContacts: activeClients,
            inactiveContacts: totalClients - activeClients
        },
        byType,
        records: clients.slice(0, 100)
    };
}

/**
 * Generate Sales Report Data
 */
async function generateSalesReportData(firmId, lawyerId, report, dateRange, filters) {
    const config = report.salesConfig || {};
    const category = config.category || report.category;

    const dateQuery = buildDateQuery(dateRange);

    switch (category) {
        case 'revenue':
            return await generateSalesRevenueReport(lawyerId, config, dateQuery);
        case 'conversions':
            return await generateConversionsReport(firmId, config, dateQuery);
        case 'forecasting':
            return await generateForecastReport(firmId, lawyerId, config, dateQuery);
        default:
            return await generateSalesRevenueReport(lawyerId, config, dateQuery);
    }
}

async function generateSalesRevenueReport(lawyerId, config, dateQuery) {
    // Use invoices as sales proxy
    const query = { lawyerId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.issueDate = {};
        if (dateQuery.startDate) query.issueDate.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.issueDate.$lte = dateQuery.endDate;
    }

    const invoices = await Invoice.find(query).lean();

    const totalSales = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);

    // Group by month for trend
    const byMonth = invoices.reduce((acc, inv) => {
        const date = new Date(inv.issueDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[key]) acc[key] = { sales: 0, collected: 0, count: 0 };
        acc[key].sales += inv.totalAmount || 0;
        acc[key].collected += inv.amountPaid || 0;
        acc[key].count++;
        return acc;
    }, {});

    return {
        summary: {
            totalSales,
            totalCollected,
            averageSale: invoices.length > 0 ? totalSales / invoices.length : 0,
            transactionCount: invoices.length
        },
        trend: Object.entries(byMonth)
            .map(([month, data]) => ({ month, ...data }))
            .sort((a, b) => a.month.localeCompare(b.month))
    };
}

async function generateConversionsReport(firmId, config, dateQuery) {
    const query = { firmId };

    if (dateQuery.startDate || dateQuery.endDate) {
        query.createdAt = {};
        if (dateQuery.startDate) query.createdAt.$gte = dateQuery.startDate;
        if (dateQuery.endDate) query.createdAt.$lte = dateQuery.endDate;
    }

    const leads = await Lead.find(query).lean();

    const totalLeads = leads.length;
    const converted = leads.filter(l => l.status === 'converted' || l.status === 'won').length;
    const lost = leads.filter(l => l.status === 'lost' || l.status === 'disqualified').length;

    const bySource = leads.reduce((acc, l) => {
        const source = l.source || 'other';
        if (!acc[source]) acc[source] = { total: 0, converted: 0, lost: 0 };
        acc[source].total++;
        if (l.status === 'converted' || l.status === 'won') acc[source].converted++;
        if (l.status === 'lost' || l.status === 'disqualified') acc[source].lost++;
        return acc;
    }, {});

    return {
        summary: {
            totalLeads,
            converted,
            lost,
            pending: totalLeads - converted - lost,
            conversionRate: totalLeads > 0 ? ((converted / totalLeads) * 100).toFixed(2) + '%' : '0%',
            lossRate: totalLeads > 0 ? ((lost / totalLeads) * 100).toFixed(2) + '%' : '0%'
        },
        bySource: Object.entries(bySource).map(([source, data]) => ({
            source,
            ...data,
            conversionRate: data.total > 0 ? ((data.converted / data.total) * 100).toFixed(2) + '%' : '0%'
        }))
    };
}

async function generateForecastReport(firmId, lawyerId, config, dateQuery) {
    // Get active leads for pipeline
    const leads = await Lead.find({
        firmId,
        status: { $nin: ['converted', 'won', 'lost', 'disqualified'] }
    }).lean();

    const totalPipelineValue = leads.reduce((sum, l) => sum + (l.expectedValue || l.estimatedValue || 0), 0);

    // Calculate weighted forecast
    const weightedForecast = leads.reduce((sum, l) => {
        const probability = l.probability || 0.3;
        return sum + ((l.expectedValue || l.estimatedValue || 0) * probability);
    }, 0);

    // Get recent sales for baseline
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const recentInvoices = await Invoice.find({
        lawyerId,
        issueDate: { $gte: threeMonthsAgo }
    }).lean();

    const recentRevenue = recentInvoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const monthlyAverage = recentRevenue / 3;

    return {
        summary: {
            totalPipelineValue,
            weightedForecast,
            monthlyAverage,
            projectedQuarterly: monthlyAverage * 3 + weightedForecast
        },
        pipeline: {
            totalLeads: leads.length,
            totalValue: totalPipelineValue,
            weightedValue: weightedForecast
        },
        historical: {
            last3Months: recentRevenue,
            averageMonthly: monthlyAverage
        }
    };
}

/**
 * Generate General Report Data
 */
async function generateGeneralReportData(firmId, lawyerId, report, dateRange, filters) {
    return {
        message: 'General report - customize based on requirements',
        section: report.section,
        category: report.category,
        dateRange,
        filters
    };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function buildDateQuery(dateRange) {
    if (!dateRange) return {};

    const result = {};

    if (dateRange.type && dateRange.type !== 'custom') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (dateRange.type) {
            case 'today':
                result.startDate = today;
                result.endDate = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
                break;
            case 'yesterday':
                result.startDate = new Date(today.getTime() - 24 * 60 * 60 * 1000);
                result.endDate = new Date(today.getTime() - 1);
                break;
            case 'this_week':
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                result.startDate = startOfWeek;
                result.endDate = now;
                break;
            case 'last_week':
                const lastWeekStart = new Date(today);
                lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
                const lastWeekEnd = new Date(lastWeekStart);
                lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
                lastWeekEnd.setHours(23, 59, 59, 999);
                result.startDate = lastWeekStart;
                result.endDate = lastWeekEnd;
                break;
            case 'this_month':
                result.startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                result.endDate = now;
                break;
            case 'last_month':
                result.startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                result.endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
                break;
            case 'this_quarter':
                const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                result.startDate = quarterStart;
                result.endDate = now;
                break;
            case 'last_quarter':
                const lastQStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
                const lastQEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0, 23, 59, 59, 999);
                result.startDate = lastQStart;
                result.endDate = lastQEnd;
                break;
            case 'this_year':
                result.startDate = new Date(now.getFullYear(), 0, 1);
                result.endDate = now;
                break;
            case 'last_year':
                result.startDate = new Date(now.getFullYear() - 1, 0, 1);
                result.endDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
                break;
            case 'last_7_days':
                result.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                result.endDate = now;
                break;
            case 'last_30_days':
                result.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                result.endDate = now;
                break;
            case 'last_90_days':
                result.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                result.endDate = now;
                break;
            case 'last_365_days':
                result.startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                result.endDate = now;
                break;
        }
    } else {
        if (dateRange.startDate) result.startDate = new Date(dateRange.startDate);
        if (dateRange.endDate) result.endDate = new Date(dateRange.endDate);
    }

    return result;
}

module.exports = {
    // CRUD
    getReports,
    getReport,
    createReport,
    updateReport,
    deleteReport,
    bulkDeleteReports,

    // Operations
    runReport,
    cloneReport,
    toggleFavorite,
    togglePinned,
    exportReport,

    // Scheduling
    scheduleReport,
    unscheduleReport,

    // Templates
    getTemplates,
    createFromTemplate,

    // Stats & Dashboard
    getStats,
    getFavorites,
    getPinnedReports,
    getBySection
};
