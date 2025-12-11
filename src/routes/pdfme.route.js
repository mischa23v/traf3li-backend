/**
 * PDFMe Routes
 *
 * Routes for PDFMe template management and PDF generation.
 */

const express = require('express');
const router = express.Router();
const authenticate = require('../middlewares/authenticate');
const pdfmeController = require('../controllers/pdfme.controller');
const { createRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateCreateTemplate,
    validateUpdateTemplate,
    validateCloneTemplate,
    validateGeneratePdf,
    validateGeneratePdfAsync,
    validateGenerateInvoicePdf,
    validateGenerateContractPdf,
    validateGenerateReceiptPdf,
    validatePreviewTemplate,
    validateListTemplatesQuery
} = require('../validators/pdfme.validator');

/**
 * Rate limiter for PDF generation (resource-intensive operations)
 * 30 PDF generations per 15 minutes per user
 */
const pdfGenerationLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 PDF generations per window
    message: {
        success: false,
        error: {
            code: 'PDF_RATE_LIMIT_EXCEEDED',
            message: 'Too many PDF generation requests. Please try again later.',
            messageAr: 'طلبات إنشاء PDF كثيرة جداً. يرجى المحاولة لاحقاً.'
        }
    },
    keyGenerator: (req) => req.userID || req.ip
});

/**
 * @swagger
 * /api/pdfme/templates:
 *   get:
 *     summary: List all templates
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [invoice, contract, receipt, report, statement, letter, certificate, custom]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [standard, detailed, summary, minimal, custom]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: List of templates
 */
router.get('/templates', authenticate, validateListTemplatesQuery, pdfmeController.listTemplates);

/**
 * @swagger
 * /api/pdfme/templates/default/{category}:
 *   get:
 *     summary: Get default template for a category
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: category
 *         required: true
 *         schema:
 *           type: string
 *           enum: [invoice, contract, receipt, report, statement, letter, certificate, custom]
 *     responses:
 *       200:
 *         description: Default template for the category
 */
router.get('/templates/default/:category', authenticate, pdfmeController.getDefaultTemplate);

/**
 * @swagger
 * /api/pdfme/templates/{id}:
 *   get:
 *     summary: Get a template by ID
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         description: Template not found
 */
router.get('/templates/:id', authenticate, pdfmeController.getTemplate);

/**
 * @swagger
 * /api/pdfme/templates:
 *   post:
 *     summary: Create a new template
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               nameAr:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [invoice, contract, receipt, report, statement, letter, certificate, custom]
 *               basePdf:
 *                 type: string
 *               schemas:
 *                 type: array
 *     responses:
 *       201:
 *         description: Template created successfully
 */
router.post('/templates', authenticate, validateCreateTemplate, pdfmeController.createTemplate);

/**
 * @swagger
 * /api/pdfme/templates/{id}:
 *   put:
 *     summary: Update a template
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Template updated successfully
 */
router.put('/templates/:id', authenticate, validateUpdateTemplate, pdfmeController.updateTemplate);

/**
 * @swagger
 * /api/pdfme/templates/{id}:
 *   delete:
 *     summary: Delete a template
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template deleted successfully
 */
router.delete('/templates/:id', authenticate, pdfmeController.deleteTemplate);

/**
 * @swagger
 * /api/pdfme/templates/{id}/clone:
 *   post:
 *     summary: Clone a template
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Template cloned successfully
 */
router.post('/templates/:id/clone', authenticate, validateCloneTemplate, pdfmeController.cloneTemplate);

/**
 * @swagger
 * /api/pdfme/templates/{id}/set-default:
 *   post:
 *     summary: Set template as default for its category
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Template set as default
 */
router.post('/templates/:id/set-default', authenticate, pdfmeController.setDefaultTemplate);

/**
 * @swagger
 * /api/pdfme/templates/{id}/preview:
 *   post:
 *     summary: Preview template with sample data
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               inputs:
 *                 type: object
 *     responses:
 *       200:
 *         description: PDF preview as base64
 */
router.post('/templates/:id/preview', authenticate, validatePreviewTemplate, pdfmeController.previewTemplate);

/**
 * @swagger
 * /api/pdfme/generate:
 *   post:
 *     summary: Generate PDF synchronously
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templateId:
 *                 type: string
 *               template:
 *                 type: object
 *               inputs:
 *                 type: object
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: PDF generated successfully
 */
router.post('/generate', authenticate, pdfGenerationLimiter, validateGeneratePdf, pdfmeController.generatePDF);

/**
 * @swagger
 * /api/pdfme/generate/async:
 *   post:
 *     summary: Generate PDF asynchronously via queue
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templateId:
 *                 type: string
 *               template:
 *                 type: object
 *               inputs:
 *                 type: object
 *               type:
 *                 type: string
 *               priority:
 *                 type: integer
 *                 default: 3
 *     responses:
 *       200:
 *         description: PDF generation job queued
 */
router.post('/generate/async', authenticate, pdfGenerationLimiter, validateGeneratePdfAsync, pdfmeController.generatePDFAsync);

/**
 * @swagger
 * /api/pdfme/generate/invoice:
 *   post:
 *     summary: Generate invoice PDF
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - invoiceData
 *             properties:
 *               invoiceData:
 *                 type: object
 *               templateId:
 *                 type: string
 *               includeQR:
 *                 type: boolean
 *               qrData:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invoice PDF generated
 */
router.post('/generate/invoice', authenticate, pdfGenerationLimiter, validateGenerateInvoicePdf, pdfmeController.generateInvoicePDF);

/**
 * @swagger
 * /api/pdfme/generate/contract:
 *   post:
 *     summary: Generate contract PDF
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contractData
 *             properties:
 *               contractData:
 *                 type: object
 *               templateId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contract PDF generated
 */
router.post('/generate/contract', authenticate, pdfGenerationLimiter, validateGenerateContractPdf, pdfmeController.generateContractPDF);

/**
 * @swagger
 * /api/pdfme/generate/receipt:
 *   post:
 *     summary: Generate receipt PDF
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiptData
 *             properties:
 *               receiptData:
 *                 type: object
 *               templateId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Receipt PDF generated
 */
router.post('/generate/receipt', authenticate, pdfGenerationLimiter, validateGenerateReceiptPdf, pdfmeController.generateReceiptPDF);

/**
 * @swagger
 * /api/pdfme/download/{fileName}:
 *   get:
 *     summary: Download a generated PDF
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: subDir
 *         schema:
 *           type: string
 *           default: pdfs
 *     responses:
 *       200:
 *         description: PDF file download
 *       404:
 *         description: File not found
 */
router.get('/download/:fileName', authenticate, pdfmeController.downloadPDF);

module.exports = router;
