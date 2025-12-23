/**
 * PDFMe Controller
 *
 * Handles API endpoints for PDFMe template management and PDF generation.
 */

const PdfmeService = require('../services/pdfme.service');
const PdfmeTemplate = require('../models/pdfmeTemplate.model');
const QueueService = require('../services/queue.service');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Sanitize a string to be safe for use in filenames
 * Only allows alphanumeric characters, hyphens, and underscores
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeForFilename = (str) => {
    if (!str) return '';
    return String(str).replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-');
};

/**
 * @swagger
 * tags:
 *   name: PDFMe
 *   description: PDFMe template management and PDF generation
 */

/**
 * List all templates for the authenticated user
 * GET /api/pdfme/templates
 */
const listTemplates = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const {
            category,
            type,
            isActive,
            limit = 50,
            skip = 0,
            sort = 'createdAt',
            order = 'desc'
        } = req.query;

        // Whitelist allowed sort fields to prevent information disclosure
        const allowedSortFields = ['createdAt', 'updatedAt', 'name', 'category', 'type'];
        const sanitizedSort = allowedSortFields.includes(sort) ? sort : 'createdAt';

        // Validate and sanitize pagination parameters
        const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
        const sanitizedSkip = Math.max(parseInt(skip) || 0, 0);

        const options = {
            category,
            type,
            isActive: isActive !== 'false',
            limit: sanitizedLimit,
            skip: sanitizedSkip,
            sort: { [sanitizedSort]: order === 'desc' ? -1 : 1 }
        };

        const result = await PdfmeService.listTemplates(lawyerId, options);

        res.json({
            success: true,
            data: result.templates,
            meta: {
                total: result.total,
                limit: result.limit,
                skip: result.skip
            }
        });
    } catch (error) {
        logger.error('Error listing templates', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'LIST_TEMPLATES_ERROR',
                message: error.message,
                messageAr: 'فشل في جلب القوالب'
            }
        });
    }
};

/**
 * Get a single template by ID
 * GET /api/pdfme/templates/:id
 */
const getTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid template ID',
                    messageAr: 'معرف القالب غير صالح'
                }
            });
        }

        const template = await PdfmeTemplate.findOne({
            _id: id,
            lawyerId
        });

        if (!template) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Template not found',
                    messageAr: 'القالب غير موجود'
                }
            });
        }

        // IDOR protection - verify firmId ownership
        if (firmId && template.firmId && template.firmId.toString() !== sanitizeObjectId(firmId).toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied to this template',
                    messageAr: 'تم رفض الوصول إلى هذا القالب'
                }
            });
        }

        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        logger.error('Error getting template', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'GET_TEMPLATE_ERROR',
                message: error.message,
                messageAr: 'فشل في جلب القالب'
            }
        });
    }
};

/**
 * Create a new template
 * POST /api/pdfme/templates
 */
const createTemplate = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;

        // Mass assignment protection - only allow specific fields
        const allowedFields = [
            'name',
            'description',
            'category',
            'type',
            'schemas',
            'basePdf',
            'sampleInputs',
            'isActive',
            'isDefault',
            'metadata',
            'tags'
        ];
        const templateData = pickAllowedFields(req.body, allowedFields);

        // Validate required fields
        if (!templateData.name) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Template name is required',
                    messageAr: 'اسم القالب مطلوب'
                }
            });
        }

        // Input validation for template data
        if (templateData.schemas) {
            if (!Array.isArray(templateData.schemas)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Schemas must be an array',
                        messageAr: 'يجب أن تكون المخططات مصفوفة'
                    }
                });
            }

            // Prevent template injection - validate schema structure
            for (const schema of templateData.schemas) {
                if (typeof schema !== 'object' || schema === null) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Invalid schema format',
                            messageAr: 'تنسيق المخطط غير صالح'
                        }
                    });
                }

                // Prevent script injection in schema values
                const schemaStr = JSON.stringify(schema);
                if (/<script|javascript:|onerror=|onclick=/i.test(schemaStr)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'SECURITY_ERROR',
                            message: 'Invalid characters detected in schema',
                            messageAr: 'تم اكتشاف أحرف غير صالحة في المخطط'
                        }
                    });
                }
            }
        }

        // Validate basePdf if provided
        if (templateData.basePdf && typeof templateData.basePdf !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'basePdf must be a string',
                    messageAr: 'يجب أن يكون basePdf نصًا'
                }
            });
        }

        // IDOR protection - ensure firmId is set correctly
        if (firmId) {
            templateData.firmId = sanitizeObjectId(firmId);
        }

        const template = await PdfmeService.createTemplate(templateData, lawyerId);

        res.status(201).json({
            success: true,
            data: template,
            message: 'Template created successfully',
            messageAr: 'تم إنشاء القالب بنجاح'
        });
    } catch (error) {
        logger.error('Error creating template', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'CREATE_TEMPLATE_ERROR',
                message: error.message,
                messageAr: 'فشل في إنشاء القالب'
            }
        });
    }
};

/**
 * Update a template
 * PUT /api/pdfme/templates/:id
 */
const updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid template ID',
                    messageAr: 'معرف القالب غير صالح'
                }
            });
        }

        // Verify ownership
        const existing = await PdfmeTemplate.findOne({ _id: id, lawyerId });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Template not found',
                    messageAr: 'القالب غير موجود'
                }
            });
        }

        // IDOR protection - verify firmId ownership
        if (firmId && existing.firmId && existing.firmId.toString() !== sanitizeObjectId(firmId).toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied to this template',
                    messageAr: 'تم رفض الوصول إلى هذا القالب'
                }
            });
        }

        // Prevent modifying system templates
        if (existing.isSystem) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'System templates cannot be modified',
                    messageAr: 'لا يمكن تعديل قوالب النظام'
                }
            });
        }

        // Mass assignment protection - only allow specific fields
        const allowedFields = [
            'name',
            'description',
            'category',
            'type',
            'schemas',
            'basePdf',
            'sampleInputs',
            'isActive',
            'isDefault',
            'metadata',
            'tags'
        ];
        const updateData = pickAllowedFields(req.body, allowedFields);

        // Input validation for template data
        if (updateData.schemas) {
            if (!Array.isArray(updateData.schemas)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Schemas must be an array',
                        messageAr: 'يجب أن تكون المخططات مصفوفة'
                    }
                });
            }

            // Prevent template injection - validate schema structure
            for (const schema of updateData.schemas) {
                if (typeof schema !== 'object' || schema === null) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Invalid schema format',
                            messageAr: 'تنسيق المخطط غير صالح'
                        }
                    });
                }

                // Prevent script injection in schema values
                const schemaStr = JSON.stringify(schema);
                if (/<script|javascript:|onerror=|onclick=/i.test(schemaStr)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'SECURITY_ERROR',
                            message: 'Invalid characters detected in schema',
                            messageAr: 'تم اكتشاف أحرف غير صالحة في المخطط'
                        }
                    });
                }
            }
        }

        // Validate basePdf if provided
        if (updateData.basePdf && typeof updateData.basePdf !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'basePdf must be a string',
                    messageAr: 'يجب أن يكون basePdf نصًا'
                }
            });
        }

        const template = await PdfmeService.updateTemplate(id, updateData, lawyerId);

        res.json({
            success: true,
            data: template,
            message: 'Template updated successfully',
            messageAr: 'تم تحديث القالب بنجاح'
        });
    } catch (error) {
        logger.error('Error updating template', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'UPDATE_TEMPLATE_ERROR',
                message: error.message,
                messageAr: 'فشل في تحديث القالب'
            }
        });
    }
};

/**
 * Delete a template
 * DELETE /api/pdfme/templates/:id
 */
const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid template ID',
                    messageAr: 'معرف القالب غير صالح'
                }
            });
        }

        // Verify ownership
        const existing = await PdfmeTemplate.findOne({ _id: id, lawyerId });
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Template not found',
                    messageAr: 'القالب غير موجود'
                }
            });
        }

        // IDOR protection - verify firmId ownership
        if (firmId && existing.firmId && existing.firmId.toString() !== sanitizeObjectId(firmId).toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied to this template',
                    messageAr: 'تم رفض الوصول إلى هذا القالب'
                }
            });
        }

        // Prevent deleting system templates
        if (existing.isSystem) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'System templates cannot be deleted',
                    messageAr: 'لا يمكن حذف قوالب النظام'
                }
            });
        }

        await PdfmeService.deleteTemplate(id);

        res.json({
            success: true,
            message: 'Template deleted successfully',
            messageAr: 'تم حذف القالب بنجاح'
        });
    } catch (error) {
        logger.error('Error deleting template', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'DELETE_TEMPLATE_ERROR',
                message: error.message,
                messageAr: 'فشل في حذف القالب'
            }
        });
    }
};

/**
 * Clone a template
 * POST /api/pdfme/templates/:id/clone
 */
const cloneTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid template ID',
                    messageAr: 'معرف القالب غير صالح'
                }
            });
        }

        // Verify source template exists and user has access
        const sourceTemplate = await PdfmeTemplate.findOne({ _id: id, lawyerId });
        if (!sourceTemplate) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Template not found or access denied',
                    messageAr: 'القالب غير موجود أو تم رفض الوصول'
                }
            });
        }

        // IDOR protection - verify firmId ownership
        if (firmId && sourceTemplate.firmId && sourceTemplate.firmId.toString() !== sanitizeObjectId(firmId).toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied to this template',
                    messageAr: 'تم رفض الوصول إلى هذا القالب'
                }
            });
        }

        const template = await PdfmeService.cloneTemplate(id, name, lawyerId);

        res.status(201).json({
            success: true,
            data: template,
            message: 'Template cloned successfully',
            messageAr: 'تم نسخ القالب بنجاح'
        });
    } catch (error) {
        logger.error('Error cloning template', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'CLONE_TEMPLATE_ERROR',
                message: error.message,
                messageAr: 'فشل في نسخ القالب'
            }
        });
    }
};

/**
 * Set template as default for its category
 * POST /api/pdfme/templates/:id/set-default
 */
const setDefaultTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid template ID',
                    messageAr: 'معرف القالب غير صالح'
                }
            });
        }

        // Verify template exists and user has access
        const existingTemplate = await PdfmeTemplate.findOne({ _id: id, lawyerId });
        if (!existingTemplate) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Template not found or access denied',
                    messageAr: 'القالب غير موجود أو تم رفض الوصول'
                }
            });
        }

        // IDOR protection - verify firmId ownership
        if (firmId && existingTemplate.firmId && existingTemplate.firmId.toString() !== sanitizeObjectId(firmId).toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied to this template',
                    messageAr: 'تم رفض الوصول إلى هذا القالب'
                }
            });
        }

        const template = await PdfmeService.setAsDefault(id, lawyerId);

        res.json({
            success: true,
            data: template,
            message: 'Template set as default successfully',
            messageAr: 'تم تعيين القالب كافتراضي بنجاح'
        });
    } catch (error) {
        logger.error('Error setting default template', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'SET_DEFAULT_ERROR',
                message: error.message,
                messageAr: 'فشل في تعيين القالب كافتراضي'
            }
        });
    }
};

/**
 * Generate PDF synchronously (for small/quick PDFs)
 * POST /api/pdfme/generate
 */
const generatePDF = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;
        const { templateId, template, inputs, type = 'custom' } = req.body;

        if (!templateId && !template) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Either templateId or template must be provided',
                    messageAr: 'يجب توفير معرف القالب أو القالب'
                }
            });
        }

        if (!inputs || (Array.isArray(inputs) && inputs.length === 0)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Inputs are required',
                    messageAr: 'البيانات مطلوبة'
                }
            });
        }

        // Validate inputs structure and prevent injection
        if (Array.isArray(inputs)) {
            for (const input of inputs) {
                if (typeof input !== 'object' || input === null) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Invalid input format',
                            messageAr: 'تنسيق الإدخال غير صالح'
                        }
                    });
                }

                // Prevent script injection in input values
                const inputStr = JSON.stringify(input);
                if (/<script|javascript:|onerror=|onclick=/i.test(inputStr)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'SECURITY_ERROR',
                            message: 'Invalid characters detected in inputs',
                            messageAr: 'تم اكتشاف أحرف غير صالحة في المدخلات'
                        }
                    });
                }
            }
        }

        // IDOR protection - verify template ownership if templateId provided
        if (templateId) {
            if (!mongoose.Types.ObjectId.isValid(templateId)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ID',
                        message: 'Invalid template ID',
                        messageAr: 'معرف القالب غير صالح'
                    }
                });
            }

            const templateDoc = await PdfmeTemplate.findOne({ _id: templateId, lawyerId });
            if (!templateDoc) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Template not found or access denied',
                        messageAr: 'القالب غير موجود أو تم رفض الوصول'
                    }
                });
            }

            // Verify firmId ownership
            if (firmId && templateDoc.firmId && templateDoc.firmId.toString() !== sanitizeObjectId(firmId).toString()) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Access denied to this template',
                        messageAr: 'تم رفض الوصول إلى هذا القالب'
                    }
                });
            }
        }

        const pdfBuffer = await PdfmeService.generatePDF({
            templateId,
            template,
            inputs
        });

        // Generate filename (sanitize type to prevent invalid characters)
        const fileName = `${sanitizeForFilename(type)}-${Date.now()}.pdf`;

        // Save to file system
        const filePath = await PdfmeService.savePDF(pdfBuffer, fileName);

        res.json({
            success: true,
            data: {
                fileName,
                filePath,
                size: pdfBuffer.length
            },
            message: 'PDF generated successfully',
            messageAr: 'تم إنشاء PDF بنجاح'
        });
    } catch (error) {
        logger.error('Error generating PDF', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'GENERATE_PDF_ERROR',
                message: error.message,
                messageAr: 'فشل في إنشاء PDF'
            }
        });
    }
};

/**
 * Generate PDF asynchronously via queue (for large/batch PDFs)
 * POST /api/pdfme/generate/async
 */
const generatePDFAsync = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;
        const { templateId, template, inputs, type = 'custom', priority = 3 } = req.body;

        if (!templateId && !template) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Either templateId or template must be provided',
                    messageAr: 'يجب توفير معرف القالب أو القالب'
                }
            });
        }

        // Validate inputs
        if (!inputs || (Array.isArray(inputs) && inputs.length === 0)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Inputs are required',
                    messageAr: 'البيانات مطلوبة'
                }
            });
        }

        // Validate inputs structure and prevent injection
        if (Array.isArray(inputs)) {
            for (const input of inputs) {
                if (typeof input !== 'object' || input === null) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'VALIDATION_ERROR',
                            message: 'Invalid input format',
                            messageAr: 'تنسيق الإدخال غير صالح'
                        }
                    });
                }

                // Prevent script injection in input values
                const inputStr = JSON.stringify(input);
                if (/<script|javascript:|onerror=|onclick=/i.test(inputStr)) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: 'SECURITY_ERROR',
                            message: 'Invalid characters detected in inputs',
                            messageAr: 'تم اكتشاف أحرف غير صالحة في المدخلات'
                        }
                    });
                }
            }
        }

        // Validate priority (must be between 1 and 10)
        const sanitizedPriority = Math.min(Math.max(parseInt(priority) || 3, 1), 10);

        // IDOR protection - verify template ownership if templateId provided
        if (templateId) {
            if (!mongoose.Types.ObjectId.isValid(templateId)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_ID',
                        message: 'Invalid template ID',
                        messageAr: 'معرف القالب غير صالح'
                    }
                });
            }
            const templateExists = await PdfmeTemplate.findOne({ _id: templateId, lawyerId });
            if (!templateExists) {
                return res.status(404).json({
                    success: false,
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Template not found or access denied',
                        messageAr: 'القالب غير موجود أو تم رفض الوصول'
                    }
                });
            }

            // Verify firmId ownership
            if (firmId && templateExists.firmId && templateExists.firmId.toString() !== sanitizeObjectId(firmId).toString()) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'FORBIDDEN',
                        message: 'Access denied to this template',
                        messageAr: 'تم رفض الوصول إلى هذا القالب'
                    }
                });
            }
        }

        // Queue the job
        const job = await QueueService.addJob('pdf', {
            type: 'pdfme',
            data: {
                templateId,
                template,
                inputs,
                docType: type,
                lawyerId
            }
        }, {
            priority: sanitizedPriority
        });

        res.json({
            success: true,
            data: {
                jobId: job.jobId,
                status: 'queued'
            },
            message: 'PDF generation job queued',
            messageAr: 'تم إضافة مهمة إنشاء PDF إلى قائمة الانتظار'
        });
    } catch (error) {
        logger.error('Error queuing PDF generation', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'QUEUE_PDF_ERROR',
                message: error.message,
                messageAr: 'فشل في إضافة مهمة إنشاء PDF'
            }
        });
    }
};

/**
 * Generate invoice PDF directly
 * POST /api/pdfme/generate/invoice
 */
const generateInvoicePDF = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { invoiceData, templateId, includeQR = false, qrData } = req.body;

        if (!invoiceData) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invoice data is required',
                    messageAr: 'بيانات الفاتورة مطلوبة'
                }
            });
        }

        let pdfBuffer;

        if (includeQR && qrData) {
            pdfBuffer = await PdfmeService.generateInvoiceWithQR(
                invoiceData,
                qrData,
                templateId,
                lawyerId
            );
        } else {
            pdfBuffer = await PdfmeService.generateInvoicePDF(
                invoiceData,
                templateId,
                lawyerId
            );
        }

        // Generate filename (sanitize invoice number to prevent invalid characters)
        const invoiceNumber = sanitizeForFilename(invoiceData.invoiceNumber) || Date.now();
        const fileName = `invoice-${invoiceNumber}.pdf`;

        // Save to file system
        const filePath = await PdfmeService.savePDF(pdfBuffer, fileName, 'invoices');

        res.json({
            success: true,
            data: {
                fileName,
                filePath,
                size: pdfBuffer.length
            },
            message: 'Invoice PDF generated successfully',
            messageAr: 'تم إنشاء فاتورة PDF بنجاح'
        });
    } catch (error) {
        logger.error('Error generating invoice PDF', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'GENERATE_INVOICE_ERROR',
                message: error.message,
                messageAr: 'فشل في إنشاء فاتورة PDF'
            }
        });
    }
};

/**
 * Generate contract PDF directly
 * POST /api/pdfme/generate/contract
 */
const generateContractPDF = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { contractData, templateId } = req.body;

        if (!contractData) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Contract data is required',
                    messageAr: 'بيانات العقد مطلوبة'
                }
            });
        }

        const pdfBuffer = await PdfmeService.generateContractPDF(
            contractData,
            templateId,
            lawyerId
        );

        // Generate filename (sanitize contract number to prevent invalid characters)
        const contractNumber = sanitizeForFilename(contractData.contractNumber) || Date.now();
        const fileName = `contract-${contractNumber}.pdf`;

        // Save to file system
        const filePath = await PdfmeService.savePDF(pdfBuffer, fileName, 'contracts');

        res.json({
            success: true,
            data: {
                fileName,
                filePath,
                size: pdfBuffer.length
            },
            message: 'Contract PDF generated successfully',
            messageAr: 'تم إنشاء عقد PDF بنجاح'
        });
    } catch (error) {
        logger.error('Error generating contract PDF', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'GENERATE_CONTRACT_ERROR',
                message: error.message,
                messageAr: 'فشل في إنشاء عقد PDF'
            }
        });
    }
};

/**
 * Generate receipt PDF directly
 * POST /api/pdfme/generate/receipt
 */
const generateReceiptPDF = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { receiptData, templateId } = req.body;

        if (!receiptData) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Receipt data is required',
                    messageAr: 'بيانات الإيصال مطلوبة'
                }
            });
        }

        const pdfBuffer = await PdfmeService.generateReceiptPDF(
            receiptData,
            templateId,
            lawyerId
        );

        // Generate filename (sanitize receipt number to prevent invalid characters)
        const receiptNumber = sanitizeForFilename(receiptData.receiptNumber) || Date.now();
        const fileName = `receipt-${receiptNumber}.pdf`;

        // Save to file system
        const filePath = await PdfmeService.savePDF(pdfBuffer, fileName, 'receipts');

        res.json({
            success: true,
            data: {
                fileName,
                filePath,
                size: pdfBuffer.length
            },
            message: 'Receipt PDF generated successfully',
            messageAr: 'تم إنشاء إيصال PDF بنجاح'
        });
    } catch (error) {
        logger.error('Error generating receipt PDF', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'GENERATE_RECEIPT_ERROR',
                message: error.message,
                messageAr: 'فشل في إنشاء إيصال PDF'
            }
        });
    }
};

/**
 * Download generated PDF
 * GET /api/pdfme/download/:fileName
 */
const downloadPDF = async (req, res) => {
    try {
        const { fileName } = req.params;
        const { subDir = 'pdfs' } = req.query;
        const path = require('path');
        const fs = require('fs').promises;

        // Whitelist allowed subdirectories to prevent directory traversal
        const allowedSubDirs = ['pdfs', 'invoices', 'contracts', 'receipts'];
        const sanitizedSubDir = allowedSubDirs.includes(subDir) ? subDir : 'pdfs';

        // Sanitize filename to prevent directory traversal
        const sanitizedFileName = path.basename(fileName);

        // Security: Only allow PDF file extensions
        const fileExt = path.extname(sanitizedFileName).toLowerCase();
        if (fileExt !== '.pdf') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_FILE_TYPE',
                    message: 'Only PDF files can be downloaded',
                    messageAr: 'يمكن تنزيل ملفات PDF فقط'
                }
            });
        }

        // Security: Validate filename format (alphanumeric, hyphens, underscores only)
        const fileNameWithoutExt = path.basename(sanitizedFileName, '.pdf');
        if (!/^[a-zA-Z0-9_-]+$/.test(fileNameWithoutExt)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_FILENAME',
                    message: 'Invalid filename format',
                    messageAr: 'تنسيق اسم الملف غير صالح'
                }
            });
        }

        const filePath = path.join(__dirname, '../../uploads', sanitizedSubDir, sanitizedFileName);

        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'File not found',
                    messageAr: 'الملف غير موجود'
                }
            });
        }

        // Set security headers for download
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFileName}"`);

        res.download(filePath, sanitizedFileName);
    } catch (error) {
        logger.error('Error downloading PDF', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'DOWNLOAD_ERROR',
                message: error.message,
                messageAr: 'فشل في تنزيل الملف'
            }
        });
    }
};

/**
 * Preview template with sample data
 * POST /api/pdfme/templates/:id/preview
 */
const previewTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;
        const { inputs } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_ID',
                    message: 'Invalid template ID',
                    messageAr: 'معرف القالب غير صالح'
                }
            });
        }

        const template = await PdfmeTemplate.findOne({ _id: id, lawyerId });
        if (!template) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'NOT_FOUND',
                    message: 'Template not found',
                    messageAr: 'القالب غير موجود'
                }
            });
        }

        // IDOR protection - verify firmId ownership
        if (firmId && template.firmId && template.firmId.toString() !== sanitizeObjectId(firmId).toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied to this template',
                    messageAr: 'تم رفض الوصول إلى هذا القالب'
                }
            });
        }

        // Use provided inputs or sample inputs from template
        const previewInputs = inputs || template.sampleInputs || {};

        // Validate preview inputs if provided
        if (inputs) {
            const inputStr = JSON.stringify(inputs);
            if (/<script|javascript:|onerror=|onclick=/i.test(inputStr)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: 'SECURITY_ERROR',
                        message: 'Invalid characters detected in inputs',
                        messageAr: 'تم اكتشاف أحرف غير صالحة في المدخلات'
                    }
                });
            }
        }

        const pdfBuffer = await PdfmeService.generatePDF({
            template: template.toPdfmeFormat(),
            inputs: previewInputs
        });

        // Send PDF as base64 for preview
        res.json({
            success: true,
            data: {
                pdf: pdfBuffer.toString('base64'),
                mimeType: 'application/pdf'
            }
        });
    } catch (error) {
        logger.error('Error previewing template', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'PREVIEW_ERROR',
                message: error.message,
                messageAr: 'فشل في معاينة القالب'
            }
        });
    }
};

/**
 * Get default template for a category
 * GET /api/pdfme/templates/default/:category
 */
const getDefaultTemplate = async (req, res) => {
    try {
        const { category } = req.params;
        const lawyerId = req.userID;

        const validCategories = ['invoice', 'contract', 'receipt', 'report', 'statement', 'letter', 'certificate', 'custom'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_CATEGORY',
                    message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
                    messageAr: 'فئة غير صالحة'
                }
            });
        }

        const template = await PdfmeTemplate.getDefault(lawyerId, category);

        if (!template) {
            // Return built-in default
            let builtInTemplate;
            switch (category) {
                case 'invoice':
                    builtInTemplate = PdfmeService.getDefaultInvoiceTemplate();
                    break;
                case 'contract':
                    builtInTemplate = PdfmeService.getDefaultContractTemplate();
                    break;
                case 'receipt':
                    builtInTemplate = PdfmeService.getDefaultReceiptTemplate();
                    break;
                default:
                    builtInTemplate = null;
            }

            return res.json({
                success: true,
                data: builtInTemplate,
                isBuiltIn: true,
                message: 'Using built-in default template',
                messageAr: 'استخدام القالب الافتراضي المدمج'
            });
        }

        res.json({
            success: true,
            data: template,
            isBuiltIn: false
        });
    } catch (error) {
        logger.error('Error getting default template', { error: error.message });
        res.status(500).json({
            success: false,
            error: {
                code: 'GET_DEFAULT_ERROR',
                message: error.message,
                messageAr: 'فشل في جلب القالب الافتراضي'
            }
        });
    }
};

module.exports = {
    // Template CRUD
    listTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    cloneTemplate,
    setDefaultTemplate,
    getDefaultTemplate,
    previewTemplate,

    // PDF Generation
    generatePDF,
    generatePDFAsync,
    generateInvoicePDF,
    generateContractPDF,
    generateReceiptPDF,
    downloadPDF
};
