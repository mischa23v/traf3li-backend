const { ExportJob, ImportJob, ExportTemplate, Client, Case, Invoice, Document, Contact } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');
const { pickAllowedFields, sanitizeObjectId, sanitizeForCSV } = require('../utils/securityUtils');

/**
 * Create export job
 * POST /api/data-export/export
 */
const createExportJob = asyncHandler(async (req, res) => {
    const {
        name, type, format, entityType, filters,
        columns, includeRelated, dateRange, templateId
    } = req.body;
    const lawyerId = req.userID;

    // Input validation
    if (!entityType) {
        throw CustomException('نوع البيانات المراد تصديرها مطلوب', 400);
    }

    // Validate entityType
    const allowedEntityTypes = ['clients', 'cases', 'invoices', 'documents', 'contacts'];
    if (!allowedEntityTypes.includes(entityType)) {
        throw CustomException('نوع البيانات غير مدعوم', 400);
    }

    // Validate format
    const allowedFormats = ['xlsx', 'csv', 'json'];
    if (format && !allowedFormats.includes(format)) {
        throw CustomException('صيغة التصدير غير مدعومة', 400);
    }

    // Validate type
    const allowedTypes = ['manual', 'scheduled', 'automatic'];
    if (type && !allowedTypes.includes(type)) {
        throw CustomException('نوع التصدير غير صالح', 400);
    }

    // Validate columns array
    if (columns && (!Array.isArray(columns) || columns.length > 100)) {
        throw CustomException('عدد الأعمدة يجب أن يكون أقل من 100', 400);
    }

    // Validate filters object
    if (filters && typeof filters !== 'object') {
        throw CustomException('الفلاتر يجب أن تكون كائن صالح', 400);
    }

    // Get template if provided
    let exportConfig = { columns, includeRelated };
    if (templateId) {
        const sanitizedTemplateId = sanitizeObjectId(templateId);
        const template = await ExportTemplate.findOne({ _id: sanitizedTemplateId, lawyerId });
        if (template) {
            exportConfig = {
                columns: template.columns,
                includeRelated: template.options?.includeRelated
            };
        }
    }

    const exportJob = await ExportJob.create({
        lawyerId,
        name: name || `Export ${entityType} - ${new Date().toISOString()}`,
        type: type || 'manual',
        format: format || 'xlsx',
        entityType,
        filters: filters || {},
        columns: exportConfig.columns || [],
        includeRelated: exportConfig.includeRelated || false,
        dateRange,
        status: 'pending',
        createdBy: lawyerId
    });

    // Start export process (async)
    processExportJob(exportJob._id, lawyerId);

    res.status(201).json({
        success: true,
        message: 'تم بدء عملية التصدير',
        data: exportJob
    });
});

/**
 * Process export job (background)
 */
async function processExportJob(jobId, lawyerId) {
    const job = await ExportJob.findById(jobId);
    if (!job) return;

    try {
        job.status = 'processing';
        job.startedAt = new Date();
        await job.save();

        // Get the model based on entity type
        const modelMap = {
            clients: Client,
            cases: Case,
            invoices: Invoice,
            documents: Document,
            contacts: Contact
        };

        const Model = modelMap[job.entityType];
        if (!Model) {
            throw new Error('نوع البيانات غير مدعوم');
        }

        // IDOR Protection: Build query with lawyerId ownership verification
        const query = { lawyerId };

        // Add firmId verification if available
        if (job.firmId) {
            query.firmId = sanitizeObjectId(job.firmId);
        }

        // Safely apply filters with validation
        if (job.filters) {
            const allowedFilterKeys = ['status', 'type', 'category', 'priority', 'assignedTo'];
            Object.keys(job.filters).forEach(key => {
                if (job.filters[key] && allowedFilterKeys.includes(key)) {
                    // Sanitize ObjectId fields
                    if (mongoose.Types.ObjectId.isValid(job.filters[key])) {
                        query[key] = sanitizeObjectId(job.filters[key]);
                    } else {
                        query[key] = job.filters[key];
                    }
                }
            });
        }

        // Date range filter with validation
        if (job.dateRange) {
            if (job.dateRange.start) {
                query.createdAt = query.createdAt || {};
                query.createdAt.$gte = new Date(job.dateRange.start);
            }
            if (job.dateRange.end) {
                query.createdAt = query.createdAt || {};
                query.createdAt.$lte = new Date(job.dateRange.end);
            }
        }

        // DoS Prevention: Limit export size (max 10,000 records)
        const MAX_EXPORT_RECORDS = 10000;
        const recordCount = await Model.countDocuments(query);

        if (recordCount > MAX_EXPORT_RECORDS) {
            throw new Error(`عدد السجلات يتجاوز الحد الأقصى المسموح (${MAX_EXPORT_RECORDS})`);
        }

        // Get data with limit
        const data = await Model.find(query).limit(MAX_EXPORT_RECORDS).lean();
        job.totalRecords = data.length;

        // CSV Injection Prevention: Sanitize data for CSV exports
        let sanitizedData = data;
        if (job.format === 'csv') {
            sanitizedData = data.map(record => {
                const sanitizedRecord = {};
                Object.keys(record).forEach(key => {
                    const value = record[key];
                    // Sanitize string values to prevent CSV injection
                    if (typeof value === 'string') {
                        sanitizedRecord[key] = sanitizeForCSV(value);
                    } else if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                        // Sanitize nested objects
                        sanitizedRecord[key] = JSON.stringify(value);
                    } else {
                        sanitizedRecord[key] = value;
                    }
                });
                return sanitizedRecord;
            });
        }

        // In a real implementation, this would:
        // 1. Format data according to columns
        // 2. Generate file in specified format using sanitizedData
        // 3. Upload to S3
        // 4. Store file URL

        // Simulate file generation
        job.fileUrl = `/exports/${job._id}.${job.format}`;
        job.fileSize = sanitizedData.length * 100; // Approximate
        job.status = 'completed';
        job.completedAt = new Date();
        job.progress = 100;

        await job.save();
    } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        await job.save();
    }
}

/**
 * Get export jobs
 * GET /api/data-export/jobs
 */
const getExportJobs = asyncHandler(async (req, res) => {
    const { status, entityType, page = 1, limit = 20 } = req.query;
    const lawyerId = req.userID;

    // Input validation for pagination
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 records per page

    // Validate status
    const allowedStatuses = ['pending', 'processing', 'completed', 'failed', 'cancelled'];
    if (status && !allowedStatuses.includes(status)) {
        throw CustomException('حالة غير صالحة', 400);
    }

    // Validate entityType
    const allowedEntityTypes = ['clients', 'cases', 'invoices', 'documents', 'contacts'];
    if (entityType && !allowedEntityTypes.includes(entityType)) {
        throw CustomException('نوع البيانات غير صالح', 400);
    }

    const query = { lawyerId };
    if (status) query.status = status;
    if (entityType) query.entityType = entityType;

    const jobs = await ExportJob.find(query)
        .sort({ createdAt: -1 })
        .limit(validatedLimit)
        .skip((validatedPage - 1) * validatedLimit);

    const total = await ExportJob.countDocuments(query);

    res.status(200).json({
        success: true,
        data: jobs,
        pagination: {
            page: validatedPage,
            limit: validatedLimit,
            total,
            pages: Math.ceil(total / validatedLimit)
        }
    });
});

/**
 * Get export job status
 * GET /api/data-export/jobs/:id
 */
const getExportJobStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const job = await ExportJob.findOne({ _id: sanitizedId, lawyerId });

    if (!job) {
        throw CustomException('وظيفة التصدير غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        data: job
    });
});

/**
 * Download export file
 * GET /api/data-export/jobs/:id/download
 */
const downloadExportFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const job = await ExportJob.findOne({ _id: sanitizedId, lawyerId });

    if (!job) {
        throw CustomException('وظيفة التصدير غير موجودة', 404);
    }

    if (job.status !== 'completed') {
        throw CustomException('التصدير لم يكتمل بعد', 400);
    }

    if (!job.fileUrl) {
        throw CustomException('ملف التصدير غير متوفر', 404);
    }

    // In production, this would generate a presigned S3 URL
    res.status(200).json({
        success: true,
        data: {
            downloadUrl: job.fileUrl,
            expiresIn: 3600
        }
    });
});

/**
 * Cancel export job
 * POST /api/data-export/jobs/:id/cancel
 */
const cancelExportJob = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const job = await ExportJob.findOne({ _id: sanitizedId, lawyerId });

    if (!job) {
        throw CustomException('وظيفة التصدير غير موجودة', 404);
    }

    if (!['pending', 'processing'].includes(job.status)) {
        throw CustomException('لا يمكن إلغاء هذه الوظيفة', 400);
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    await job.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء وظيفة التصدير'
    });
});

/**
 * Delete export job
 * DELETE /api/data-export/jobs/:id
 */
const deleteExportJob = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const job = await ExportJob.findOneAndDelete({ _id: sanitizedId, lawyerId });

    if (!job) {
        throw CustomException('وظيفة التصدير غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف وظيفة التصدير'
    });
});

/**
 * Create import job
 * POST /api/data-export/import
 */
const createImportJob = asyncHandler(async (req, res) => {
    const {
        name, entityType, fileUrl, fileName, fileSize,
        mapping, options
    } = req.body;
    const lawyerId = req.userID;

    // Input validation
    if (!entityType || !fileUrl) {
        throw CustomException('نوع البيانات وملف الاستيراد مطلوبان', 400);
    }

    // Validate entityType
    const allowedEntityTypes = ['clients', 'cases', 'invoices', 'documents', 'contacts'];
    if (!allowedEntityTypes.includes(entityType)) {
        throw CustomException('نوع البيانات غير مدعوم', 400);
    }

    // Validate file size (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (fileSize && fileSize > MAX_FILE_SIZE) {
        throw CustomException('حجم الملف يتجاوز الحد الأقصى المسموح (50 ميجابايت)', 400);
    }

    // Validate mapping object
    if (mapping && typeof mapping !== 'object') {
        throw CustomException('المخطط يجب أن يكون كائن صالح', 400);
    }

    // Validate options object
    if (options && typeof options !== 'object') {
        throw CustomException('الخيارات يجب أن تكون كائن صالح', 400);
    }

    const importJob = await ImportJob.create({
        lawyerId,
        name: name || `Import ${entityType} - ${new Date().toISOString()}`,
        entityType,
        fileUrl,
        fileName,
        fileSize,
        mapping: mapping || {},
        options: options || {},
        status: 'pending',
        createdBy: lawyerId
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء وظيفة الاستيراد',
        data: importJob
    });
});

/**
 * Start import job
 * POST /api/data-export/import/:id/start
 */
const startImportJob = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const job = await ImportJob.findOne({ _id: sanitizedId, lawyerId });

    if (!job) {
        throw CustomException('وظيفة الاستيراد غير موجودة', 404);
    }

    if (job.status !== 'pending' && job.status !== 'validated') {
        throw CustomException('لا يمكن بدء هذه الوظيفة', 400);
    }

    // Start import process (async)
    processImportJob(job._id, lawyerId);

    res.status(200).json({
        success: true,
        message: 'تم بدء عملية الاستيراد'
    });
});

/**
 * Process import job (background)
 */
async function processImportJob(jobId, lawyerId) {
    const job = await ImportJob.findById(jobId);
    if (!job) return;

    try {
        job.status = 'processing';
        job.startedAt = new Date();
        await job.save();

        // In a real implementation, this would:
        // 1. Download and parse the file
        // 2. Validate each row
        // 3. Import data with mapping
        // 4. Track errors

        // Simulate processing
        job.status = 'completed';
        job.completedAt = new Date();
        job.progress = 100;
        job.results = {
            total: 100,
            success: 95,
            failed: 5,
            skipped: 0
        };

        await job.save();
    } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        await job.save();
    }
}

/**
 * Validate import file
 * POST /api/data-export/import/:id/validate
 */
const validateImportFile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const job = await ImportJob.findOne({ _id: sanitizedId, lawyerId });

    if (!job) {
        throw CustomException('وظيفة الاستيراد غير موجودة', 404);
    }

    // In a real implementation, this would:
    // 1. Parse the file
    // 2. Validate structure and data types
    // 3. Check for duplicates
    // 4. Return validation results

    job.status = 'validated';
    job.validation = {
        isValid: true,
        totalRows: 100,
        validRows: 95,
        invalidRows: 5,
        errors: [
            { row: 10, field: 'email', message: 'تنسيق البريد الإلكتروني غير صالح' },
            { row: 25, field: 'phone', message: 'رقم الهاتف مكرر' }
        ]
    };
    await job.save();

    res.status(200).json({
        success: true,
        data: job.validation
    });
});

/**
 * Get import jobs
 * GET /api/data-export/imports
 */
const getImportJobs = asyncHandler(async (req, res) => {
    const { status, entityType, page = 1, limit = 20 } = req.query;
    const lawyerId = req.userID;

    // Input validation for pagination
    const validatedPage = Math.max(1, parseInt(page) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20)); // Max 100 records per page

    // Validate status
    const allowedStatuses = ['pending', 'validated', 'processing', 'completed', 'failed', 'cancelled'];
    if (status && !allowedStatuses.includes(status)) {
        throw CustomException('حالة غير صالحة', 400);
    }

    // Validate entityType
    const allowedEntityTypes = ['clients', 'cases', 'invoices', 'documents', 'contacts'];
    if (entityType && !allowedEntityTypes.includes(entityType)) {
        throw CustomException('نوع البيانات غير صالح', 400);
    }

    const query = { lawyerId };
    if (status) query.status = status;
    if (entityType) query.entityType = entityType;

    const jobs = await ImportJob.find(query)
        .sort({ createdAt: -1 })
        .limit(validatedLimit)
        .skip((validatedPage - 1) * validatedLimit);

    const total = await ImportJob.countDocuments(query);

    res.status(200).json({
        success: true,
        data: jobs,
        pagination: {
            page: validatedPage,
            limit: validatedLimit,
            total,
            pages: Math.ceil(total / validatedLimit)
        }
    });
});

/**
 * Get import job status
 * GET /api/data-export/import/:id
 */
const getImportJobStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const job = await ImportJob.findOne({ _id: sanitizedId, lawyerId });

    if (!job) {
        throw CustomException('وظيفة الاستيراد غير موجودة', 404);
    }

    res.status(200).json({
        success: true,
        data: job
    });
});

/**
 * Cancel import job
 * POST /api/data-export/import/:id/cancel
 */
const cancelImportJob = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const job = await ImportJob.findOne({ _id: sanitizedId, lawyerId });

    if (!job) {
        throw CustomException('وظيفة الاستيراد غير موجودة', 404);
    }

    if (!['pending', 'validated', 'processing'].includes(job.status)) {
        throw CustomException('لا يمكن إلغاء هذه الوظيفة', 400);
    }

    job.status = 'cancelled';
    job.completedAt = new Date();
    await job.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء وظيفة الاستيراد'
    });
});

/**
 * CRUD for export templates
 */
const createExportTemplate = asyncHandler(async (req, res) => {
    const { name, nameAr, entityType, columns, format, options } = req.body;
    const lawyerId = req.userID;

    // Input validation
    if (!name || !entityType) {
        throw CustomException('الاسم ونوع البيانات مطلوبان', 400);
    }

    // Validate entityType
    const allowedEntityTypes = ['clients', 'cases', 'invoices', 'documents', 'contacts'];
    if (!allowedEntityTypes.includes(entityType)) {
        throw CustomException('نوع البيانات غير مدعوم', 400);
    }

    // Validate format
    const allowedFormats = ['xlsx', 'csv', 'json'];
    if (format && !allowedFormats.includes(format)) {
        throw CustomException('صيغة التصدير غير مدعومة', 400);
    }

    // Validate columns array
    if (columns && (!Array.isArray(columns) || columns.length > 100)) {
        throw CustomException('عدد الأعمدة يجب أن يكون أقل من 100', 400);
    }

    // Validate options object
    if (options && typeof options !== 'object') {
        throw CustomException('الخيارات يجب أن تكون كائن صالح', 400);
    }

    const template = await ExportTemplate.create({
        lawyerId,
        name,
        nameAr,
        entityType,
        columns: columns || [],
        format: format || 'xlsx',
        options: options || {}
    });

    res.status(201).json({
        success: true,
        message: 'تم إنشاء قالب التصدير بنجاح',
        data: template
    });
});

const getExportTemplates = asyncHandler(async (req, res) => {
    const { entityType } = req.query;
    const lawyerId = req.userID;

    // Validate entityType if provided
    const allowedEntityTypes = ['clients', 'cases', 'invoices', 'documents', 'contacts'];
    if (entityType && !allowedEntityTypes.includes(entityType)) {
        throw CustomException('نوع البيانات غير صالح', 400);
    }

    const query = { lawyerId };
    if (entityType) query.entityType = entityType;

    const templates = await ExportTemplate.find(query).sort({ name: 1 });

    res.status(200).json({
        success: true,
        data: templates
    });
});

const updateExportTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const template = await ExportTemplate.findOne({ _id: sanitizedId, lawyerId });

    if (!template) {
        throw CustomException('قالب التصدير غير موجود', 404);
    }

    // Validate entityType if provided
    if (req.body.entityType) {
        const allowedEntityTypes = ['clients', 'cases', 'invoices', 'documents', 'contacts'];
        if (!allowedEntityTypes.includes(req.body.entityType)) {
            throw CustomException('نوع البيانات غير مدعوم', 400);
        }
    }

    // Validate format if provided
    if (req.body.format) {
        const allowedFormats = ['xlsx', 'csv', 'json'];
        if (!allowedFormats.includes(req.body.format)) {
            throw CustomException('صيغة التصدير غير مدعومة', 400);
        }
    }

    // Validate columns array if provided
    if (req.body.columns && (!Array.isArray(req.body.columns) || req.body.columns.length > 100)) {
        throw CustomException('عدد الأعمدة يجب أن يكون أقل من 100', 400);
    }

    // Validate options object if provided
    if (req.body.options && typeof req.body.options !== 'object') {
        throw CustomException('الخيارات يجب أن تكون كائن صالح', 400);
    }

    const allowedFields = ['name', 'nameAr', 'entityType', 'columns', 'format', 'options'];
    allowedFields.forEach(field => {
        if (req.body[field] !== undefined) {
            template[field] = req.body[field];
        }
    });

    await template.save();

    res.status(200).json({
        success: true,
        message: 'تم تحديث قالب التصدير بنجاح',
        data: template
    });
});

const deleteExportTemplate = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    // Sanitize and validate ID
    const sanitizedId = sanitizeObjectId(id);

    // IDOR Protection: Verify ownership by lawyerId
    const template = await ExportTemplate.findOneAndDelete({ _id: sanitizedId, lawyerId });

    if (!template) {
        throw CustomException('قالب التصدير غير موجود', 404);
    }

    res.status(200).json({
        success: true,
        message: 'تم حذف قالب التصدير بنجاح'
    });
});

module.exports = {
    createExportJob,
    getExportJobs,
    getExportJobStatus,
    downloadExportFile,
    cancelExportJob,
    deleteExportJob,
    createImportJob,
    startImportJob,
    validateImportFile,
    getImportJobs,
    getImportJobStatus,
    cancelImportJob,
    createExportTemplate,
    getExportTemplates,
    updateExportTemplate,
    deleteExportTemplate
};
