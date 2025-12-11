/**
 * PDFMe Controller
 *
 * Handles API endpoints for PDFMe template management and PDF generation.
 */

const PdfmeService = require('../services/pdfme.service');
const PdfmeTemplate = require('../models/pdfmeTemplate.model');
const QueueService = require('../services/queue.service');
const { CustomException } = require('../utils');
const mongoose = require('mongoose');

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

        const options = {
            category,
            type,
            isActive: isActive !== 'false',
            limit: parseInt(limit),
            skip: parseInt(skip),
            sort: { [sort]: order === 'desc' ? -1 : 1 }
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
        console.error('Error listing templates:', error);
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

        res.json({
            success: true,
            data: template
        });
    } catch (error) {
        console.error('Error getting template:', error);
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
        const templateData = req.body;

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

        const template = await PdfmeService.createTemplate(templateData, lawyerId);

        res.status(201).json({
            success: true,
            data: template,
            message: 'Template created successfully',
            messageAr: 'تم إنشاء القالب بنجاح'
        });
    } catch (error) {
        console.error('Error creating template:', error);
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
        const updateData = req.body;

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

        const template = await PdfmeService.updateTemplate(id, updateData, lawyerId);

        res.json({
            success: true,
            data: template,
            message: 'Template updated successfully',
            messageAr: 'تم تحديث القالب بنجاح'
        });
    } catch (error) {
        console.error('Error updating template:', error);
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
        console.error('Error deleting template:', error);
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

        const template = await PdfmeService.cloneTemplate(id, name, lawyerId);

        res.status(201).json({
            success: true,
            data: template,
            message: 'Template cloned successfully',
            messageAr: 'تم نسخ القالب بنجاح'
        });
    } catch (error) {
        console.error('Error cloning template:', error);
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

        const template = await PdfmeService.setAsDefault(id, lawyerId);

        res.json({
            success: true,
            data: template,
            message: 'Template set as default successfully',
            messageAr: 'تم تعيين القالب كافتراضي بنجاح'
        });
    } catch (error) {
        console.error('Error setting default template:', error);
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

        const pdfBuffer = await PdfmeService.generatePDF({
            templateId,
            template,
            inputs
        });

        // Generate filename
        const fileName = `${type}-${Date.now()}.pdf`;

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
        console.error('Error generating PDF:', error);
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
            priority
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
        console.error('Error queuing PDF generation:', error);
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

        // Generate filename
        const invoiceNumber = invoiceData.invoiceNumber || Date.now();
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
        console.error('Error generating invoice PDF:', error);
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

        // Generate filename
        const contractNumber = contractData.contractNumber || Date.now();
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
        console.error('Error generating contract PDF:', error);
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

        // Generate filename
        const receiptNumber = receiptData.receiptNumber || Date.now();
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
        console.error('Error generating receipt PDF:', error);
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

        // Sanitize filename to prevent directory traversal
        const sanitizedFileName = path.basename(fileName);
        const filePath = path.join(__dirname, '../../uploads', subDir, sanitizedFileName);

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

        res.download(filePath, sanitizedFileName);
    } catch (error) {
        console.error('Error downloading PDF:', error);
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

        // Use provided inputs or sample inputs from template
        const previewInputs = inputs || template.sampleInputs || {};

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
        console.error('Error previewing template:', error);
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
        console.error('Error getting default template:', error);
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
