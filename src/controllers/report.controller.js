/**
 * Report Controller - Report Builder
 *
 * Handles self-serve report builder endpoints for creating, managing,
 * and executing custom reports with dynamic data sources, filters,
 * and visualizations.
 */

const mongoose = require('mongoose');
const ReportDefinition = require('../models/reportDefinition.model');
const ReportBuilderService = require('../services/reportBuilder.service');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');
const { sanitizeFilename } = require('../utils/sanitize');

/**
 * Helper function to check if request has valid tenant context
 * Works for both firm members (firmId) and solo lawyers (lawyerId)
 * @param {Object} req - Express request object
 * @returns {boolean} True if valid tenant context exists
 */
const hasTenantContext = (req) => {
    return Boolean(
        req.firmQuery &&
        (req.firmQuery.firmId || req.firmQuery.lawyerId)
    );
};

/**
 * Helper function to get tenant filter for queries
 * Converts string IDs to ObjectIds for aggregation pipelines
 * @param {Object} req - Express request object
 * @returns {Object} Filter object with firmId or lawyerId
 */
const getTenantFilter = (req) => {
    if (req.firmQuery?.firmId) {
        return { firmId: new mongoose.Types.ObjectId(req.firmQuery.firmId) };
    } else if (req.firmQuery?.lawyerId) {
        return { lawyerId: new mongoose.Types.ObjectId(req.firmQuery.lawyerId) };
    }
    // Fallback for safety - should not reach here if hasTenantContext passes
    return { lawyerId: new mongoose.Types.ObjectId(req.userID) };
};

// ═══════════════════════════════════════════════════════════════
// REPORT DEFINITION CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * List reports
 * GET /api/reports
 */
const listReports = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Mass assignment protection - only allow specific query parameters
    const allowedParams = pickAllowedFields(req.query, [
        'type', 'scope', 'search', 'page', 'limit', 'sortBy', 'sortOrder'
    ]);

    const {
        type,
        scope,
        search,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
    } = allowedParams;

    // Input validation
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(Math.max(1, parseInt(limit) || 50), 100);

    // Validate type if provided
    if (type && !['table', 'chart', 'pivot', 'funnel', 'cohort', 'dashboard'].includes(type)) {
        throw CustomException('نوع التقرير غير صالح / Invalid report type', 400);
    }

    // Validate scope if provided
    if (scope && !['personal', 'team', 'global'].includes(scope)) {
        throw CustomException('نطاق التقرير غير صالح / Invalid report scope', 400);
    }

    // Get reports using service with tenant filter
    const tenantFilter = getTenantFilter(req);
    const result = await ReportBuilderService.getReportsForUser(tenantFilter, userId, {
        type,
        scope,
        search,
        page: pageNum,
        limit: limitNum,
        sortBy,
        sortOrder
    });

    logger.info('Reports listed successfully', {
        userId,
        tenantFilter,
        count: result.reports.length,
        total: result.pagination.total
    });

    res.status(200).json({
        success: true,
        data: result.reports,
        pagination: result.pagination
    });
});

/**
 * Create report
 * POST /api/reports
 */
const createReport = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Mass assignment protection - only allow specific fields
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'description',
        'type',
        'dataSources',
        'columns',
        'filters',
        'groupBy',
        'visualization',
        'schedule',
        'isPublic',
        'scope'
    ]);

    // Input validation - check required fields
    if (!allowedFields.name || !allowedFields.type) {
        throw CustomException('اسم التقرير ونوعه مطلوبان / Report name and type are required', 400);
    }

    if (typeof allowedFields.name !== 'string' || allowedFields.name.length > 200) {
        throw CustomException('اسم التقرير غير صالح / Invalid report name', 400);
    }

    // Validate report definition
    const validation = ReportBuilderService.validateReportDefinition(allowedFields);
    if (!validation.valid) {
        logger.warn('Report validation failed', {
            userId,
            tenantFilter: getTenantFilter(req),
            errors: validation.errors
        });
        throw CustomException(
            `فشل التحقق من صحة التقرير / Validation failed: ${validation.errors.join(', ')}`,
            400
        );
    }

    // Create report definition using req.addFirmId for proper tenant context
    const reportData = req.addFirmId({
        ...allowedFields,
        ownerId: userId,
        createdBy: userId,
        scope: allowedFields.scope || 'personal',
        isPublic: allowedFields.isPublic || false
    });

    const report = await ReportDefinition.create(reportData);

    logger.info('Report created successfully', {
        reportId: report._id,
        userId,
        tenantFilter: getTenantFilter(req),
        type: report.type,
        name: report.name
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء التقرير بنجاح / Report created successfully',
        data: report
    });
});

/**
 * Get report definition
 * GET /api/reports/:id
 */
const getReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف التقرير غير صالح / Invalid report ID', 400);
    }

    // Get report with tenant isolation (firmId OR lawyerId)
    const report = await ReportDefinition.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    })
        .populate('ownerId', 'name email username')
        .populate('createdBy', 'name email username');

    if (!report) {
        throw CustomException('التقرير غير موجود / Report not found', 404);
    }

    // IDOR Protection: Verify access based on scope
    const hasAccess =
        report.scope === 'global' && report.isPublic ||
        report.scope === 'team' ||
        (report.scope === 'personal' && report.ownerId._id.toString() === userId);

    if (!hasAccess) {
        throw CustomException('التقرير غير موجود / Report not found', 404);
    }

    logger.info('Report retrieved successfully', {
        reportId: report._id,
        userId,
        tenantFilter: getTenantFilter(req)
    });

    res.status(200).json({
        success: true,
        data: report
    });
});

/**
 * Update report
 * PUT /api/reports/:id
 */
const updateReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف التقرير غير صالح / Invalid report ID', 400);
    }

    // Mass assignment protection - only allow specific fields
    const allowedUpdates = pickAllowedFields(req.body, [
        'name',
        'description',
        'type',
        'dataSources',
        'columns',
        'filters',
        'groupBy',
        'visualization',
        'isPublic',
        'scope'
    ]);

    // Get report with tenant isolation (firmId OR lawyerId)
    const report = await ReportDefinition.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!report) {
        throw CustomException('التقرير غير موجود / Report not found', 404);
    }

    // IDOR Protection: Only owner can update personal reports
    if (report.scope === 'personal' && report.ownerId.toString() !== userId) {
        throw CustomException('التقرير غير موجود / Report not found', 404);
    }

    // TODO: Add role-based permission check for team/global reports
    // For team/global reports, only admins should be able to update

    // Input validation - validate name if provided
    if (allowedUpdates.name !== undefined) {
        if (typeof allowedUpdates.name !== 'string' || allowedUpdates.name.length > 200) {
            throw CustomException('اسم التقرير غير صالح / Invalid report name', 400);
        }
    }

    // Validate report definition if structural changes
    if (allowedUpdates.type || allowedUpdates.dataSources || allowedUpdates.columns || allowedUpdates.filters) {
        const updatedDefinition = {
            ...report.toObject(),
            ...allowedUpdates
        };

        const validation = ReportBuilderService.validateReportDefinition(updatedDefinition);
        if (!validation.valid) {
            logger.warn('Report validation failed on update', {
                userId,
                tenantFilter: getTenantFilter(req),
                reportId: sanitizedId,
                errors: validation.errors
            });
            throw CustomException(
                `فشل التحقق من صحة التقرير / Validation failed: ${validation.errors.join(', ')}`,
                400
            );
        }
    }

    // Apply updates
    Object.keys(allowedUpdates).forEach(field => {
        report[field] = allowedUpdates[field];
    });

    await report.save();

    logger.info('Report updated successfully', {
        reportId: report._id,
        userId,
        tenantFilter: getTenantFilter(req),
        updatedFields: Object.keys(allowedUpdates)
    });

    res.status(200).json({
        success: true,
        message: 'تم تحديث التقرير بنجاح / Report updated successfully',
        data: report
    });
});

/**
 * Delete report
 * DELETE /api/reports/:id
 */
const deleteReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف التقرير غير صالح / Invalid report ID', 400);
    }

    // Get report with tenant isolation (firmId OR lawyerId)
    const report = await ReportDefinition.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });

    if (!report) {
        throw CustomException('التقرير غير موجود / Report not found', 404);
    }

    // IDOR Protection: Only owner can delete
    if (report.ownerId.toString() !== userId) {
        throw CustomException('التقرير غير موجود / Report not found', 404);
    }

    await ReportDefinition.findOneAndDelete({
        _id: sanitizedId,
        ...req.firmQuery
    });

    logger.info('Report deleted successfully', {
        reportId: sanitizedId,
        userId,
        tenantFilter: getTenantFilter(req)
    });

    res.status(200).json({
        success: true,
        message: 'تم حذف التقرير بنجاح / Report deleted successfully'
    });
});

// ═══════════════════════════════════════════════════════════════
// REPORT EXECUTION & EXPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Execute report
 * GET /api/reports/:id/execute
 */
const executeReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف التقرير غير صالح / Invalid report ID', 400);
    }

    // Mass assignment protection - get query parameters (filter inputs)
    const params = { ...req.query };

    // Remove system parameters from user input
    delete params.page;
    delete params.limit;

    // Validate limit parameter
    const limit = parseInt(params._limit) || 10000;
    if (limit > 50000) {
        throw CustomException('الحد الأقصى للصفوف هو 50000 / Maximum limit is 50000 rows', 400);
    }
    params._limit = limit;

    // Execute report using service with tenant filter
    const tenantFilter = getTenantFilter(req);
    const result = await ReportBuilderService.executeReport(
        sanitizedId,
        params,
        userId,
        tenantFilter
    );

    logger.info('Report executed successfully', {
        reportId: sanitizedId,
        userId,
        tenantFilter,
        rowCount: result.data?.rows?.length || 0
    });

    res.status(200).json({
        success: true,
        data: result
    });
});

/**
 * Export report
 * GET /api/reports/:id/export/:format
 */
const exportReport = asyncHandler(async (req, res) => {
    const { id, format } = req.params;
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف التقرير غير صالح / Invalid report ID', 400);
    }

    // Validate format
    const validFormats = ['csv', 'excel', 'xlsx', 'pdf'];
    if (!validFormats.includes(format.toLowerCase())) {
        throw CustomException(
            'صيغة التصدير غير صالحة / Invalid export format. Use: csv, excel, or pdf',
            400
        );
    }

    // Mass assignment protection - get query parameters (filter inputs)
    const params = { ...req.query };

    // Export report using service with tenant filter
    const tenantFilter = getTenantFilter(req);
    const exportedData = await ReportBuilderService.exportReport(
        sanitizedId,
        format,
        params,
        userId,
        tenantFilter
    );

    logger.info('Report exported successfully', {
        reportId: sanitizedId,
        userId,
        tenantFilter,
        format,
        size: exportedData.length
    });

    // Set appropriate content type and headers
    let contentType;
    let extension;

    switch (format.toLowerCase()) {
        case 'csv':
            contentType = 'text/csv';
            extension = 'csv';
            break;
        case 'excel':
        case 'xlsx':
            contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            extension = 'xlsx';
            break;
        case 'pdf':
            contentType = 'application/pdf';
            extension = 'pdf';
            break;
        default:
            contentType = 'application/octet-stream';
            extension = format;
    }

    // Get report name for filename with tenant isolation
    const report = await ReportDefinition.findOne({
        _id: sanitizedId,
        ...req.firmQuery
    });
    const filename = report
        ? sanitizeFilename(`${report.name}_${Date.now()}.${extension}`)
        : `report_${Date.now()}.${extension}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportedData);
});

// ═══════════════════════════════════════════════════════════════
// REPORT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Clone report
 * POST /api/reports/:id/clone
 */
const cloneReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف التقرير غير صالح / Invalid report ID', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, ['name']);

    // Input validation
    const newName = allowedFields.name;
    if (newName && (typeof newName !== 'string' || newName.length > 200)) {
        throw CustomException('اسم التقرير غير صالح / Invalid report name', 400);
    }

    // Clone report using service with tenant filter
    const tenantFilter = getTenantFilter(req);
    const clonedReport = await ReportBuilderService.cloneReport(
        sanitizedId,
        userId,
        newName,
        tenantFilter
    );

    logger.info('Report cloned successfully', {
        originalId: sanitizedId,
        clonedId: clonedReport._id,
        userId,
        tenantFilter
    });

    res.status(201).json({
        success: true,
        message: 'تم نسخ التقرير بنجاح / Report cloned successfully',
        data: clonedReport
    });
});

/**
 * Update schedule
 * PUT /api/reports/:id/schedule
 */
const updateSchedule = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Sanitize and validate ObjectId
    const sanitizedId = sanitizeObjectId(id);
    if (!sanitizedId) {
        throw CustomException('معرف التقرير غير صالح / Invalid report ID', 400);
    }

    // Mass assignment protection
    const allowedFields = pickAllowedFields(req.body, [
        'enabled',
        'frequency',
        'recipients',
        'format'
    ]);

    // Input validation
    if (allowedFields.enabled !== undefined && typeof allowedFields.enabled !== 'boolean') {
        throw CustomException('enabled يجب أن يكون قيمة منطقية / enabled must be a boolean', 400);
    }

    if (allowedFields.frequency && !['daily', 'weekly', 'monthly'].includes(allowedFields.frequency)) {
        throw CustomException(
            'تكرار الجدولة غير صالح / Invalid frequency. Use: daily, weekly, or monthly',
            400
        );
    }

    if (allowedFields.format && !['pdf', 'excel', 'csv'].includes(allowedFields.format)) {
        throw CustomException(
            'صيغة التصدير غير صالحة / Invalid format. Use: pdf, excel, or csv',
            400
        );
    }

    if (allowedFields.recipients) {
        if (!Array.isArray(allowedFields.recipients)) {
            throw CustomException('قائمة المستلمين يجب أن تكون مصفوفة / Recipients must be an array', 400);
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        for (const email of allowedFields.recipients) {
            if (!emailRegex.test(email)) {
                throw CustomException(
                    `بريد إلكتروني غير صالح: ${email} / Invalid email: ${email}`,
                    400
                );
            }
        }
    }

    // Schedule report using service
    const updatedReport = await ReportBuilderService.scheduleReport(
        sanitizedId,
        allowedFields,
        userId
    );

    logger.info('Report schedule updated successfully', {
        reportId: sanitizedId,
        userId,
        tenantFilter: getTenantFilter(req),
        enabled: allowedFields.enabled,
        frequency: allowedFields.frequency
    });

    res.status(200).json({
        success: true,
        message: 'تم تحديث جدولة التقرير بنجاح / Report schedule updated successfully',
        data: updatedReport
    });
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════

/**
 * Validate report definition
 * POST /api/reports/validate
 */
const validateReport = asyncHandler(async (req, res) => {
    const userId = req.userID;

    // Validate tenant context (works for both firm members and solo lawyers)
    if (!hasTenantContext(req)) {
        throw CustomException('يجب أن تكون جزءًا من شركة أو محامٍ مستقل / You must be part of a firm or a solo lawyer', 403);
    }

    // Mass assignment protection - only allow report definition fields
    const allowedFields = pickAllowedFields(req.body, [
        'name',
        'description',
        'type',
        'dataSources',
        'columns',
        'filters',
        'groupBy',
        'visualization'
    ]);

    // Validate definition using service
    const validation = ReportBuilderService.validateReportDefinition(allowedFields);

    logger.info('Report validation performed', {
        userId,
        tenantFilter: getTenantFilter(req),
        valid: validation.valid,
        errorCount: validation.errors.length
    });

    res.status(200).json({
        success: true,
        data: {
            valid: validation.valid,
            errors: validation.errors
        }
    });
});

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // CRUD
    listReports,
    createReport,
    getReport,
    updateReport,
    deleteReport,

    // Execution & Export
    executeReport,
    exportReport,

    // Operations
    cloneReport,
    updateSchedule,

    // Validation
    validateReport
};
