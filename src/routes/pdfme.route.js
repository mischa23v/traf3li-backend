router.get('/templates', authenticate, validateListTemplatesQuery, pdfmeController.listTemplates);

router.get('/templates/default/:category', authenticate, pdfmeController.getDefaultTemplate);

router.get('/templates/:id', authenticate, pdfmeController.getTemplate);

router.post('/templates', authenticate, validateCreateTemplate, pdfmeController.createTemplate);

router.put('/templates/:id', authenticate, validateUpdateTemplate, pdfmeController.updateTemplate);

router.delete('/templates/:id', authenticate, pdfmeController.deleteTemplate);

router.post('/templates/:id/clone', authenticate, validateCloneTemplate, pdfmeController.cloneTemplate);

router.post('/templates/:id/set-default', authenticate, pdfmeController.setDefaultTemplate);

router.post('/templates/:id/preview', authenticate, validatePreviewTemplate, pdfmeController.previewTemplate);

router.post('/generate', authenticate, pdfGenerationLimiter, validateGeneratePdf, pdfmeController.generatePDF);

router.post('/generate/async', authenticate, pdfGenerationLimiter, validateGeneratePdfAsync, pdfmeController.generatePDFAsync);

router.post('/generate/invoice', authenticate, pdfGenerationLimiter, validateGenerateInvoicePdf, pdfmeController.generateInvoicePDF);

router.post('/generate/contract', authenticate, pdfGenerationLimiter, validateGenerateContractPdf, pdfmeController.generateContractPDF);

router.post('/generate/receipt', authenticate, pdfGenerationLimiter, validateGenerateReceiptPdf, pdfmeController.generateReceiptPDF);

router.get('/download/:fileName', authenticate, pdfmeController.downloadPDF);

module.exports = router;
