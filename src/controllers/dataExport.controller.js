const { ExportJob, ImportJob, ExportTemplate, Client, Case, Invoice, Document, Contact } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const mongoose = require('mongoose');

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

    if (!entityType) {
        throw new CustomException('نوع البيانات المراد تصديرها مطلوب', 400);
    }

    // Get template if provided
    let exportConfig = { columns, includeRelated };
    if (templateId) {
        const template = await ExportTemplate.findOne({ _id: templateId, lawyerId });
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

        // Build query
        const query = { lawyerId };
        if (job.filters) {
            Object.keys(job.filters).forEach(key => {
                if (job.filters[key]) {
                    query[key] = job.filters[key];
                }
            });
        }

        // Date range filter
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

        // Get data
        const data = await Model.find(query).lean();
        job.totalRecords = data.length;

        // In a real implementation, this would:
        // 1. Format data according to columns
        // 2. Generate file in specified format
        // 3. Upload to S3
        // 4. Store file URL

        // Simulate file generation
        job.fileUrl = `/exports/${job._id}.${job.format}`;
        job.fileSize = data.length * 100; // Approximate
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

    const query = { lawyerId };
    if (status) query.status = status;
    if (entityType) query.entityType = entityType;

    const jobs = await ExportJob.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ExportJob.countDocuments(query);

    res.status(200).json({
        success: true,
        data: jobs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
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

    const job = await ExportJob.findOne({ _id: id, lawyerId });

    if (!job) {
        throw new CustomException('وظيفة التصدير غير موجودة', 404);
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

    const job = await ExportJob.findOne({ _id: id, lawyerId });

    if (!job) {
        throw new CustomException('وظيفة التصدير غير موجودة', 404);
    }

    if (job.status !== 'completed') {
        throw new CustomException('التصدير لم يكتمل بعد', 400);
    }

    if (!job.fileUrl) {
        throw new CustomException('ملف التصدير غير متوفر', 404);
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

    const job = await ExportJob.findOne({ _id: id, lawyerId });

    if (!job) {
        throw new CustomException('وظيفة التصدير غير موجودة', 404);
    }

    if (!['pending', 'processing'].includes(job.status)) {
        throw new CustomException('لا يمكن إلغاء هذه الوظيفة', 400);
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

    const job = await ExportJob.findOneAndDelete({ _id: id, lawyerId });

    if (!job) {
        throw new CustomException('وظيفة التصدير غير موجودة', 404);
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

    if (!entityType || !fileUrl) {
        throw new CustomException('نوع البيانات وملف الاستيراد مطلوبان', 400);
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

    const job = await ImportJob.findOne({ _id: id, lawyerId });

    if (!job) {
        throw new CustomException('وظيفة الاستيراد غير موجودة', 404);
    }

    if (job.status !== 'pending' && job.status !== 'validated') {
        throw new CustomException('لا يمكن بدء هذه الوظيفة', 400);
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

    const job = await ImportJob.findOne({ _id: id, lawyerId });

    if (!job) {
        throw new CustomException('وظيفة الاستيراد غير موجودة', 404);
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

    const query = { lawyerId };
    if (status) query.status = status;
    if (entityType) query.entityType = entityType;

    const jobs = await ImportJob.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ImportJob.countDocuments(query);

    res.status(200).json({
        success: true,
        data: jobs,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
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

    const job = await ImportJob.findOne({ _id: id, lawyerId });

    if (!job) {
        throw new CustomException('وظيفة الاستيراد غير موجودة', 404);
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

    const job = await ImportJob.findOne({ _id: id, lawyerId });

    if (!job) {
        throw new CustomException('وظيفة الاستيراد غير موجودة', 404);
    }

    if (!['pending', 'validated', 'processing'].includes(job.status)) {
        throw new CustomException('لا يمكن إلغاء هذه الوظيفة', 400);
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

    if (!name || !entityType) {
        throw new CustomException('الاسم ونوع البيانات مطلوبان', 400);
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

    const template = await ExportTemplate.findOne({ _id: id, lawyerId });

    if (!template) {
        throw new CustomException('قالب التصدير غير موجود', 404);
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

    const template = await ExportTemplate.findOneAndDelete({ _id: id, lawyerId });

    if (!template) {
        throw new CustomException('قالب التصدير غير موجود', 404);
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
