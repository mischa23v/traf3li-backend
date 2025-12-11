/**
 * PDFMe Routes
 *
 * Routes for PDFMe template management and PDF generation.
 */

const express = require('express');
const router = express.Router();
const slowDown = require('express-slow-down');
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

// ==================== RATE LIMITERS ====================

/**
 * General limiter for template operations (100 requests per 15 min)
 * Used for CRUD operations on templates
 */
const templateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: {
        success: false,
        error: {
            code: 'TEMPLATE_RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            messageAr: 'طلبات كثيرة جداً. يرجى المحاولة لاحقاً.'
        }
    },
    keyGenerator: (req) => req.userID ? req.userID.toString() : 'anonymous',
    skip: (req) => !req.userID
});

/**
 * Strict limiter for PDF generation (10 requests per minute per user)
 * Used for CPU-intensive PDF generation operations
 */
const generateLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 PDF generations per minute
    message: {
        success: false,
        error: {
            code: 'PDF_GENERATION_RATE_LIMIT_EXCEEDED',
            message: 'PDF generation limit reached. Please wait 1 minute.',
            messageAr: 'تم الوصول إلى حد إنشاء PDF. يرجى الانتظار دقيقة واحدة.'
        }
    },
    // Use userID for rate limiting (always available after authenticate middleware)
    // This avoids IPv6 validation issues since we don't fall back to IP
    keyGenerator: (req) => req.userID ? req.userID.toString() : 'anonymous',
    skip: (req) => !req.userID // Skip rate limiting if somehow unauthenticated (shouldn't happen)
});

/**
 * Speed limiter - slow down after 5 requests
 * Adds progressive delay to prevent burst requests
 */
const generateSlowDown = slowDown({
    windowMs: 60 * 1000, // 1 minute
    delayAfter: 5, // Allow 5 requests per minute at full speed
    delayMs: (hits) => hits * 500, // Add 500ms delay per request after limit
    maxDelayMs: 5000 // Max 5 second delay
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
router.get('/templates', authenticate, templateLimiter, validateListTemplatesQuery, pdfmeController.listTemplates);

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
router.get('/templates/default/:category', authenticate, templateLimiter, pdfmeController.getDefaultTemplate);

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
router.get('/templates/:id', authenticate, templateLimiter, pdfmeController.getTemplate);

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
router.post('/templates', authenticate, templateLimiter, validateCreateTemplate, pdfmeController.createTemplate);

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
router.put('/templates/:id', authenticate, templateLimiter, validateUpdateTemplate, pdfmeController.updateTemplate);

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
router.delete('/templates/:id', authenticate, templateLimiter, pdfmeController.deleteTemplate);

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
router.post('/templates/:id/clone', authenticate, templateLimiter, validateCloneTemplate, pdfmeController.cloneTemplate);

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
router.post('/templates/:id/set-default', authenticate, templateLimiter, pdfmeController.setDefaultTemplate);

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
// Preview with generation limiter (generates PDF)
router.post('/templates/:id/preview', authenticate, generateSlowDown, generateLimiter, validatePreviewTemplate, pdfmeController.previewTemplate);

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
// ==================== PDF GENERATION ROUTES (STRICT LIMITS) ====================

router.post('/generate', authenticate, generateSlowDown, generateLimiter, validateGeneratePdf, pdfmeController.generatePDF);

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
router.post('/generate/async', authenticate, generateSlowDown, generateLimiter, validateGeneratePdfAsync, pdfmeController.generatePDFAsync);

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
router.post('/generate/invoice', authenticate, generateSlowDown, generateLimiter, validateGenerateInvoicePdf, pdfmeController.generateInvoicePDF);

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
router.post('/generate/contract', authenticate, generateSlowDown, generateLimiter, validateGenerateContractPdf, pdfmeController.generateContractPDF);

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
router.post('/generate/receipt', authenticate, generateSlowDown, generateLimiter, validateGenerateReceiptPdf, pdfmeController.generateReceiptPDF);

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
// Download - moderate limits
router.get('/download/:fileName', authenticate, templateLimiter, pdfmeController.downloadPDF);

// ==================== JOB STATUS ROUTES ====================

/**
 * @swagger
 * /api/pdfme/jobs/{jobId}/status:
 *   get:
 *     summary: Get async PDF generation job status
 *     tags: [PDFMe]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status
 *       404:
 *         description: Job not found
 */
router.get('/jobs/:jobId/status', authenticate, pdfmeController.getJobStatusEndpoint);

// ==================== ADMIN ROUTES ====================

/**
 * @swagger
 * /api/pdfme/admin/storage-stats:
 *   get:
 *     summary: Get PDF storage statistics
 *     tags: [PDFMe Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Storage statistics
 */
router.get('/admin/storage-stats', authenticate, pdfmeController.getStorageStats);

/**
 * @swagger
 * /api/pdfme/admin/cleanup:
 *   post:
 *     summary: Trigger manual PDF cleanup
 *     tags: [PDFMe Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxAgeHours:
 *                 type: integer
 *                 default: 24
 *                 description: Delete files older than this many hours
 *     responses:
 *       200:
 *         description: Cleanup completed
 */
router.post('/admin/cleanup', authenticate, pdfmeController.triggerCleanup);

/**
 * @swagger
 * /api/pdfme/admin/queue-stats:
 *   get:
 *     summary: Get PDF queue statistics
 *     tags: [PDFMe Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue statistics
 */
router.get('/admin/queue-stats', authenticate, pdfmeController.getQueueStatsEndpoint);

module.exports = router;
