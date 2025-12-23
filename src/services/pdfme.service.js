/**
 * PDFMe Service
 *
 * Handles PDF generation using PDFMe library.
 * Provides template management, font handling, and PDF generation.
 */

const { generate } = require('@pdfme/generator');
const { BLANK_PDF } = require('@pdfme/common');
const { text, image, barcodes, line, rectangle, ellipse, table } = require('@pdfme/schemas');
const PdfmeTemplate = require('../models/pdfmeTemplate.model.js');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// Available plugins for PDFMe - all supported schema types
const plugins = {
    // Basic types
    text,
    image,
    table,
    // Shapes
    line,
    rectangle,
    ellipse,
    // All barcode types
    qrcode: barcodes.qrcode,
    ean13: barcodes.ean13,
    ean8: barcodes.ean8,
    code128: barcodes.code128,
    code39: barcodes.code39,
    upca: barcodes.upca,
    upce: barcodes.upce,
    itf14: barcodes.itf14,
    nw7: barcodes.nw7,
    japanpost: barcodes.japanpost,
    gs1datamatrix: barcodes.gs1datamatrix,
    pdf417: barcodes.pdf417
};

class PdfmeService {
    /**
     * Generate PDF from template and inputs
     * @param {Object} options - Generation options
     * @param {string} options.templateId - Template ID from database
     * @param {Object} options.template - Direct template object (alternative to templateId)
     * @param {Array} options.inputs - Array of input data for each page
     * @param {Object} options.options - Additional PDFMe options
     * @param {string} options.lawyerId - Optional lawyer ID for ownership verification
     * @returns {Promise<Buffer>} PDF buffer
     */
    static async generatePDF({ templateId, template, inputs, options = {}, lawyerId }) {
        try {
            let pdfmeTemplate;

            if (templateId) {
                // Load template from database with optional ownership check
                const query = { _id: templateId };
                if (lawyerId) {
                    query.lawyerId = lawyerId;
                }
                const dbTemplate = await PdfmeTemplate.findOne(query);
                if (!dbTemplate) {
                    throw new Error('Template not found or access denied');
                }
                // Update usage tracking
                dbTemplate.usageCount = (dbTemplate.usageCount || 0) + 1;
                dbTemplate.lastUsedAt = new Date();
                await dbTemplate.save();
                pdfmeTemplate = dbTemplate.toPdfmeFormat();
            } else if (template) {
                // Use provided template directly
                pdfmeTemplate = template;
            } else {
                throw new Error('Either templateId or template must be provided');
            }

            // Validate inputs
            if (!inputs || (Array.isArray(inputs) && inputs.length === 0)) {
                throw new Error('Inputs are required for PDF generation');
            }

            // Resolve basePdf
            if (pdfmeTemplate.basePdf === 'BLANK_PDF') {
                pdfmeTemplate.basePdf = BLANK_PDF;
            }

            // Generate PDF with timeout protection
            const pdf = await generate({
                template: pdfmeTemplate,
                inputs: Array.isArray(inputs) ? inputs : [inputs],
                plugins,
                options: {
                    ...options
                }
            });

            return Buffer.from(pdf);
        } catch (error) {
            logger.error('PDF generation error:', error.message);
            throw error;
        }
    }

    /**
     * Generate invoice PDF using PDFMe
     * @param {Object} invoiceData - Invoice data
     * @param {string} templateId - Optional specific template ID
     * @param {string} lawyerId - Lawyer ID for default template lookup
     * @returns {Promise<Buffer>} PDF buffer
     */
    static async generateInvoicePDF(invoiceData, templateId, lawyerId) {
        try {
            let template;

            if (templateId) {
                // Verify ownership when templateId is provided
                const query = { _id: templateId };
                if (lawyerId) {
                    query.lawyerId = lawyerId;
                }
                const dbTemplate = await PdfmeTemplate.findOne(query);
                if (dbTemplate) {
                    template = dbTemplate.toPdfmeFormat();
                }
            }

            if (!template && lawyerId) {
                const defaultTemplate = await PdfmeTemplate.getDefault(lawyerId, 'invoice');
                if (defaultTemplate) {
                    template = defaultTemplate.toPdfmeFormat();
                }
            }

            // If no template found, use default invoice template
            if (!template) {
                template = this.getDefaultInvoiceTemplate();
            }

            // Map invoice data to template inputs
            const inputs = this.mapInvoiceToInputs(invoiceData);

            return this.generatePDF({ template, inputs });
        } catch (error) {
            logger.error('Invoice PDF generation error:', error.message);
            throw error;
        }
    }

    /**
     * Map invoice data to PDFMe input format
     */
    static mapInvoiceToInputs(invoiceData) {
        const {
            invoiceNumber = '',
            date = new Date(),
            dueDate,
            client = {},
            lawyer = {},
            firm = {},
            items = [],
            subtotal = 0,
            discountAmount = 0,
            taxAmount = 0,
            totalAmount = 0,
            currency = 'SAR',
            notes = '',
            paymentTerms = '',
            bankDetails = ''
        } = invoiceData;

        // Format date
        const formatDate = (d) => {
            if (!d) return '';
            const date = new Date(d);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        // Format currency
        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-SA', {
                style: 'currency',
                currency: currency
            }).format(amount || 0);
        };

        // Build items table as text
        const itemsText = items.map((item, index) => {
            return `${index + 1}. ${item.description || ''} | Qty: ${item.quantity || 1} | ${formatCurrency(item.unitPrice)} | ${formatCurrency(item.lineTotal)}`;
        }).join('\n');

        return {
            // Header
            invoiceNumber: invoiceNumber || 'N/A',
            invoiceDate: formatDate(date),
            dueDate: formatDate(dueDate),

            // Company/Lawyer info
            companyName: firm?.name || lawyer?.businessName || 'Company Name',
            companyAddress: firm?.address || lawyer?.address || '',
            companyPhone: firm?.phone || lawyer?.phone || '',
            companyEmail: firm?.email || lawyer?.email || '',
            companyLogo: firm?.logo || lawyer?.profileImage || '',
            vatNumber: firm?.vatNumber || lawyer?.vatNumber || '',

            // Client info
            clientName: client?.name || client?.fullName || 'Client Name',
            clientAddress: client?.address || '',
            clientPhone: client?.phone || '',
            clientEmail: client?.email || '',
            clientVat: client?.vatNumber || '',

            // Items (as formatted text - for simple templates)
            itemsTable: itemsText,

            // Totals
            subtotal: formatCurrency(subtotal),
            discount: formatCurrency(discountAmount),
            tax: formatCurrency(taxAmount),
            total: formatCurrency(totalAmount),

            // Footer
            notes: notes || '',
            paymentTerms: paymentTerms || '',
            bankDetails: bankDetails || '',

            // Currency
            currency: currency
        };
    }

    /**
     * Get default invoice template (built-in)
     */
    static getDefaultInvoiceTemplate() {
        return {
            basePdf: BLANK_PDF,
            schemas: [
                [
                    // Company Logo placeholder
                    {
                        name: 'companyLogo',
                        type: 'image',
                        position: { x: 15, y: 15 },
                        width: 40,
                        height: 20
                    },
                    // Invoice Title
                    {
                        name: 'invoiceTitle',
                        type: 'text',
                        position: { x: 150, y: 15 },
                        width: 45,
                        height: 10,
                        fontSize: 24,
                        fontColor: '#1E40AF',
                        alignment: 'right',
                        readOnly: true,
                        content: 'INVOICE'
                    },
                    // Invoice Number
                    {
                        name: 'invoiceNumberLabel',
                        type: 'text',
                        position: { x: 130, y: 28 },
                        width: 30,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        alignment: 'right',
                        readOnly: true,
                        content: 'Invoice #:'
                    },
                    {
                        name: 'invoiceNumber',
                        type: 'text',
                        position: { x: 162, y: 28 },
                        width: 33,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937',
                        alignment: 'right'
                    },
                    // Date
                    {
                        name: 'dateLabel',
                        type: 'text',
                        position: { x: 130, y: 36 },
                        width: 30,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        alignment: 'right',
                        readOnly: true,
                        content: 'Date:'
                    },
                    {
                        name: 'invoiceDate',
                        type: 'text',
                        position: { x: 162, y: 36 },
                        width: 33,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937',
                        alignment: 'right'
                    },
                    // Due Date
                    {
                        name: 'dueDateLabel',
                        type: 'text',
                        position: { x: 130, y: 44 },
                        width: 30,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        alignment: 'right',
                        readOnly: true,
                        content: 'Due Date:'
                    },
                    {
                        name: 'dueDate',
                        type: 'text',
                        position: { x: 162, y: 44 },
                        width: 33,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937',
                        alignment: 'right'
                    },
                    // Company Info Section
                    {
                        name: 'companyName',
                        type: 'text',
                        position: { x: 15, y: 40 },
                        width: 80,
                        height: 7,
                        fontSize: 12,
                        fontColor: '#1F2937'
                    },
                    {
                        name: 'companyAddress',
                        type: 'text',
                        position: { x: 15, y: 48 },
                        width: 80,
                        height: 12,
                        fontSize: 9,
                        fontColor: '#6B7280',
                        lineHeight: 1.3
                    },
                    {
                        name: 'companyPhone',
                        type: 'text',
                        position: { x: 15, y: 62 },
                        width: 80,
                        height: 5,
                        fontSize: 9,
                        fontColor: '#6B7280'
                    },
                    {
                        name: 'companyEmail',
                        type: 'text',
                        position: { x: 15, y: 68 },
                        width: 80,
                        height: 5,
                        fontSize: 9,
                        fontColor: '#6B7280'
                    },
                    // Divider line
                    {
                        name: 'divider1',
                        type: 'line',
                        position: { x: 15, y: 80 },
                        width: 180,
                        height: 0.5,
                        color: '#E5E7EB'
                    },
                    // Bill To Section
                    {
                        name: 'billToLabel',
                        type: 'text',
                        position: { x: 15, y: 85 },
                        width: 30,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Bill To:'
                    },
                    {
                        name: 'clientName',
                        type: 'text',
                        position: { x: 15, y: 92 },
                        width: 80,
                        height: 7,
                        fontSize: 11,
                        fontColor: '#1F2937'
                    },
                    {
                        name: 'clientAddress',
                        type: 'text',
                        position: { x: 15, y: 100 },
                        width: 80,
                        height: 12,
                        fontSize: 9,
                        fontColor: '#6B7280',
                        lineHeight: 1.3
                    },
                    {
                        name: 'clientPhone',
                        type: 'text',
                        position: { x: 15, y: 114 },
                        width: 80,
                        height: 5,
                        fontSize: 9,
                        fontColor: '#6B7280'
                    },
                    {
                        name: 'clientEmail',
                        type: 'text',
                        position: { x: 15, y: 120 },
                        width: 80,
                        height: 5,
                        fontSize: 9,
                        fontColor: '#6B7280'
                    },
                    // Items Table Header
                    {
                        name: 'tableHeaderBg',
                        type: 'rectangle',
                        position: { x: 15, y: 135 },
                        width: 180,
                        height: 8,
                        color: '#1E40AF'
                    },
                    {
                        name: 'tableHeader',
                        type: 'text',
                        position: { x: 17, y: 136 },
                        width: 176,
                        height: 6,
                        fontSize: 9,
                        fontColor: '#FFFFFF',
                        readOnly: true,
                        content: 'Description                                                              Qty        Unit Price        Total'
                    },
                    // Items content
                    {
                        name: 'itemsTable',
                        type: 'text',
                        position: { x: 17, y: 146 },
                        width: 176,
                        height: 70,
                        fontSize: 9,
                        fontColor: '#374151',
                        lineHeight: 1.5
                    },
                    // Totals Section
                    {
                        name: 'subtotalLabel',
                        type: 'text',
                        position: { x: 120, y: 220 },
                        width: 35,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        alignment: 'right',
                        readOnly: true,
                        content: 'Subtotal:'
                    },
                    {
                        name: 'subtotal',
                        type: 'text',
                        position: { x: 160, y: 220 },
                        width: 35,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937',
                        alignment: 'right'
                    },
                    {
                        name: 'discountLabel',
                        type: 'text',
                        position: { x: 120, y: 228 },
                        width: 35,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        alignment: 'right',
                        readOnly: true,
                        content: 'Discount:'
                    },
                    {
                        name: 'discount',
                        type: 'text',
                        position: { x: 160, y: 228 },
                        width: 35,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937',
                        alignment: 'right'
                    },
                    {
                        name: 'taxLabel',
                        type: 'text',
                        position: { x: 120, y: 236 },
                        width: 35,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        alignment: 'right',
                        readOnly: true,
                        content: 'VAT (15%):'
                    },
                    {
                        name: 'tax',
                        type: 'text',
                        position: { x: 160, y: 236 },
                        width: 35,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937',
                        alignment: 'right'
                    },
                    // Total with background
                    {
                        name: 'totalBg',
                        type: 'rectangle',
                        position: { x: 115, y: 244 },
                        width: 80,
                        height: 10,
                        color: '#F3F4F6'
                    },
                    {
                        name: 'totalLabel',
                        type: 'text',
                        position: { x: 120, y: 246 },
                        width: 35,
                        height: 7,
                        fontSize: 12,
                        fontColor: '#1E40AF',
                        alignment: 'right',
                        readOnly: true,
                        content: 'Total:'
                    },
                    {
                        name: 'total',
                        type: 'text',
                        position: { x: 160, y: 246 },
                        width: 35,
                        height: 7,
                        fontSize: 12,
                        fontColor: '#1E40AF',
                        alignment: 'right'
                    },
                    // Notes section
                    {
                        name: 'notesLabel',
                        type: 'text',
                        position: { x: 15, y: 260 },
                        width: 30,
                        height: 5,
                        fontSize: 9,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Notes:'
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        position: { x: 15, y: 266 },
                        width: 85,
                        height: 20,
                        fontSize: 8,
                        fontColor: '#6B7280',
                        lineHeight: 1.3
                    },
                    // Bank Details
                    {
                        name: 'bankDetailsLabel',
                        type: 'text',
                        position: { x: 110, y: 260 },
                        width: 40,
                        height: 5,
                        fontSize: 9,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Bank Details:'
                    },
                    {
                        name: 'bankDetails',
                        type: 'text',
                        position: { x: 110, y: 266 },
                        width: 85,
                        height: 20,
                        fontSize: 8,
                        fontColor: '#6B7280',
                        lineHeight: 1.3
                    }
                ]
            ]
        };
    }

    /**
     * Generate contract PDF using PDFMe
     */
    static async generateContractPDF(contractData, templateId, lawyerId) {
        try {
            let template;

            if (templateId) {
                // Verify ownership when templateId is provided
                const query = { _id: templateId };
                if (lawyerId) {
                    query.lawyerId = lawyerId;
                }
                const dbTemplate = await PdfmeTemplate.findOne(query);
                if (dbTemplate) {
                    template = dbTemplate.toPdfmeFormat();
                }
            }

            if (!template && lawyerId) {
                const defaultTemplate = await PdfmeTemplate.getDefault(lawyerId, 'contract');
                if (defaultTemplate) {
                    template = defaultTemplate.toPdfmeFormat();
                }
            }

            if (!template) {
                template = this.getDefaultContractTemplate();
            }

            const inputs = this.mapContractToInputs(contractData);
            return this.generatePDF({ template, inputs });
        } catch (error) {
            logger.error('Contract PDF generation error:', error.message);
            throw error;
        }
    }

    /**
     * Map contract data to PDFMe input format
     */
    static mapContractToInputs(contractData) {
        const {
            contractNumber = '',
            title = '',
            date = new Date(),
            effectiveDate,
            expiryDate,
            parties = [],
            content = '',
            terms = '',
            signatures = []
        } = contractData;

        const formatDate = (d) => {
            if (!d) return '';
            const date = new Date(d);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        // Format parties
        const partiesText = parties.map((party, index) => {
            return `Party ${index + 1}: ${party.name || ''} (${party.role || ''})`;
        }).join('\n');

        return {
            contractNumber: contractNumber || 'N/A',
            title: title || 'Contract Agreement',
            date: formatDate(date),
            effectiveDate: formatDate(effectiveDate),
            expiryDate: formatDate(expiryDate),
            parties: partiesText,
            content: content,
            terms: terms
        };
    }

    /**
     * Get default contract template
     */
    static getDefaultContractTemplate() {
        return {
            basePdf: BLANK_PDF,
            schemas: [
                [
                    {
                        name: 'title',
                        type: 'text',
                        position: { x: 15, y: 20 },
                        width: 180,
                        height: 12,
                        fontSize: 18,
                        fontColor: '#1E40AF',
                        alignment: 'center'
                    },
                    {
                        name: 'contractNumber',
                        type: 'text',
                        position: { x: 15, y: 35 },
                        width: 180,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        alignment: 'center'
                    },
                    {
                        name: 'date',
                        type: 'text',
                        position: { x: 15, y: 45 },
                        width: 180,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        alignment: 'center'
                    },
                    {
                        name: 'partiesLabel',
                        type: 'text',
                        position: { x: 15, y: 60 },
                        width: 40,
                        height: 6,
                        fontSize: 11,
                        fontColor: '#1F2937',
                        readOnly: true,
                        content: 'Parties:'
                    },
                    {
                        name: 'parties',
                        type: 'text',
                        position: { x: 15, y: 68 },
                        width: 180,
                        height: 25,
                        fontSize: 10,
                        fontColor: '#374151',
                        lineHeight: 1.4
                    },
                    {
                        name: 'contentLabel',
                        type: 'text',
                        position: { x: 15, y: 100 },
                        width: 40,
                        height: 6,
                        fontSize: 11,
                        fontColor: '#1F2937',
                        readOnly: true,
                        content: 'Agreement:'
                    },
                    {
                        name: 'content',
                        type: 'text',
                        position: { x: 15, y: 108 },
                        width: 180,
                        height: 140,
                        fontSize: 10,
                        fontColor: '#374151',
                        lineHeight: 1.5
                    },
                    {
                        name: 'termsLabel',
                        type: 'text',
                        position: { x: 15, y: 255 },
                        width: 60,
                        height: 6,
                        fontSize: 11,
                        fontColor: '#1F2937',
                        readOnly: true,
                        content: 'Terms & Conditions:'
                    },
                    {
                        name: 'terms',
                        type: 'text',
                        position: { x: 15, y: 263 },
                        width: 180,
                        height: 25,
                        fontSize: 9,
                        fontColor: '#6B7280',
                        lineHeight: 1.3
                    }
                ]
            ]
        };
    }

    /**
     * Generate receipt PDF
     */
    static async generateReceiptPDF(receiptData, templateId, lawyerId) {
        try {
            let template;

            if (templateId) {
                // Verify ownership when templateId is provided
                const query = { _id: templateId };
                if (lawyerId) {
                    query.lawyerId = lawyerId;
                }
                const dbTemplate = await PdfmeTemplate.findOne(query);
                if (dbTemplate) {
                    template = dbTemplate.toPdfmeFormat();
                }
            }

            if (!template && lawyerId) {
                const defaultTemplate = await PdfmeTemplate.getDefault(lawyerId, 'receipt');
                if (defaultTemplate) {
                    template = defaultTemplate.toPdfmeFormat();
                }
            }

            if (!template) {
                template = this.getDefaultReceiptTemplate();
            }

            const inputs = this.mapReceiptToInputs(receiptData);
            return this.generatePDF({ template, inputs });
        } catch (error) {
            logger.error('Receipt PDF generation error:', error.message);
            throw error;
        }
    }

    /**
     * Map receipt data to PDFMe inputs
     */
    static mapReceiptToInputs(receiptData) {
        const {
            receiptNumber = '',
            date = new Date(),
            paidBy = {},
            receivedBy = {},
            amount = 0,
            currency = 'SAR',
            paymentMethod = '',
            description = '',
            invoiceRef = ''
        } = receiptData;

        const formatDate = (d) => {
            if (!d) return '';
            const date = new Date(d);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };

        const formatCurrency = (amount) => {
            return new Intl.NumberFormat('en-SA', {
                style: 'currency',
                currency: currency
            }).format(amount || 0);
        };

        return {
            receiptNumber: receiptNumber || 'N/A',
            date: formatDate(date),
            paidByName: paidBy?.name || '',
            receivedByName: receivedBy?.name || '',
            amount: formatCurrency(amount),
            paymentMethod: paymentMethod || '',
            description: description || '',
            invoiceRef: invoiceRef || ''
        };
    }

    /**
     * Get default receipt template
     */
    static getDefaultReceiptTemplate() {
        return {
            basePdf: BLANK_PDF,
            schemas: [
                [
                    {
                        name: 'title',
                        type: 'text',
                        position: { x: 15, y: 20 },
                        width: 180,
                        height: 12,
                        fontSize: 20,
                        fontColor: '#059669',
                        alignment: 'center',
                        readOnly: true,
                        content: 'PAYMENT RECEIPT'
                    },
                    {
                        name: 'receiptNumberLabel',
                        type: 'text',
                        position: { x: 15, y: 40 },
                        width: 40,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Receipt #:'
                    },
                    {
                        name: 'receiptNumber',
                        type: 'text',
                        position: { x: 57, y: 40 },
                        width: 50,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937'
                    },
                    {
                        name: 'dateLabel',
                        type: 'text',
                        position: { x: 130, y: 40 },
                        width: 25,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Date:'
                    },
                    {
                        name: 'date',
                        type: 'text',
                        position: { x: 157, y: 40 },
                        width: 40,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937'
                    },
                    {
                        name: 'divider',
                        type: 'line',
                        position: { x: 15, y: 52 },
                        width: 180,
                        height: 0.5,
                        color: '#E5E7EB'
                    },
                    {
                        name: 'paidByLabel',
                        type: 'text',
                        position: { x: 15, y: 60 },
                        width: 40,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Received From:'
                    },
                    {
                        name: 'paidByName',
                        type: 'text',
                        position: { x: 15, y: 68 },
                        width: 80,
                        height: 7,
                        fontSize: 11,
                        fontColor: '#1F2937'
                    },
                    {
                        name: 'amountLabel',
                        type: 'text',
                        position: { x: 15, y: 90 },
                        width: 40,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Amount:'
                    },
                    {
                        name: 'amountBg',
                        type: 'rectangle',
                        position: { x: 15, y: 98 },
                        width: 100,
                        height: 15,
                        color: '#ECFDF5'
                    },
                    {
                        name: 'amount',
                        type: 'text',
                        position: { x: 20, y: 102 },
                        width: 90,
                        height: 10,
                        fontSize: 16,
                        fontColor: '#059669'
                    },
                    {
                        name: 'paymentMethodLabel',
                        type: 'text',
                        position: { x: 15, y: 120 },
                        width: 50,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Payment Method:'
                    },
                    {
                        name: 'paymentMethod',
                        type: 'text',
                        position: { x: 70, y: 120 },
                        width: 60,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937'
                    },
                    {
                        name: 'invoiceRefLabel',
                        type: 'text',
                        position: { x: 15, y: 130 },
                        width: 50,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Invoice Reference:'
                    },
                    {
                        name: 'invoiceRef',
                        type: 'text',
                        position: { x: 70, y: 130 },
                        width: 60,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#1F2937'
                    },
                    {
                        name: 'descriptionLabel',
                        type: 'text',
                        position: { x: 15, y: 145 },
                        width: 40,
                        height: 6,
                        fontSize: 10,
                        fontColor: '#6B7280',
                        readOnly: true,
                        content: 'Description:'
                    },
                    {
                        name: 'description',
                        type: 'text',
                        position: { x: 15, y: 153 },
                        width: 180,
                        height: 25,
                        fontSize: 10,
                        fontColor: '#374151',
                        lineHeight: 1.4
                    }
                ]
            ]
        };
    }

    /**
     * Save generated PDF to file system
     */
    static async savePDF(pdfBuffer, fileName, subDir = 'pdfs') {
        try {
            // Whitelist allowed subdirectories
            const allowedSubDirs = ['pdfs', 'invoices', 'contracts', 'receipts'];
            const sanitizedSubDir = allowedSubDirs.includes(subDir) ? subDir : 'pdfs';

            // Sanitize filename
            const sanitizedFileName = path.basename(fileName);

            const uploadsDir = path.join(__dirname, '../../uploads', sanitizedSubDir);
            await fs.mkdir(uploadsDir, { recursive: true });

            const filePath = path.join(uploadsDir, sanitizedFileName);
            await fs.writeFile(filePath, pdfBuffer);

            return filePath;
        } catch (error) {
            logger.error('Error saving PDF:', error.message);
            throw new Error('Failed to save PDF file');
        }
    }

    /**
     * Create a new template
     */
    static async createTemplate(templateData, lawyerId) {
        const template = new PdfmeTemplate({
            ...templateData,
            lawyerId,
            createdBy: lawyerId
        });

        return await template.save();
    }

    /**
     * Update an existing template
     */
    static async updateTemplate(templateId, templateData, userId) {
        return await PdfmeTemplate.findByIdAndUpdate(
            templateId,
            {
                ...templateData,
                updatedBy: userId
            },
            { new: true }
        );
    }

    /**
     * Delete a template
     */
    static async deleteTemplate(templateId) {
        return await PdfmeTemplate.findByIdAndDelete(templateId);
    }

    /**
     * List templates
     */
    static async listTemplates(lawyerId, options = {}) {
        const {
            category,
            type,
            isActive = true,
            limit = 50,
            skip = 0,
            sort = { createdAt: -1 }
        } = options;

        const query = { lawyerId, isActive };
        if (category) query.category = category;
        if (type) query.type = type;

        const [templates, total] = await Promise.all([
            PdfmeTemplate.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .select('-schemas -basePdf -fonts'),
            PdfmeTemplate.countDocuments(query)
        ]);

        return { templates, total, limit, skip };
    }

    /**
     * Get template by ID
     */
    static async getTemplate(templateId) {
        return await PdfmeTemplate.findById(templateId);
    }

    /**
     * Clone a template
     */
    static async cloneTemplate(templateId, newName, lawyerId) {
        const template = await PdfmeTemplate.findById(templateId);
        if (!template) {
            throw new Error('Template not found');
        }

        return await template.clone(newName, lawyerId);
    }

    /**
     * Set template as default for its category
     */
    static async setAsDefault(templateId, lawyerId) {
        const template = await PdfmeTemplate.findOne({
            _id: templateId,
            lawyerId
        });

        if (!template) {
            throw new Error('Template not found');
        }

        template.isDefault = true;
        return await template.save();
    }

    /**
     * Generate PDF with QR code (for ZATCA compliance)
     */
    static async generateInvoiceWithQR(invoiceData, qrCodeData, templateId, lawyerId) {
        const inputs = {
            ...this.mapInvoiceToInputs(invoiceData),
            qrCode: qrCodeData
        };

        let template;
        if (templateId) {
            template = await PdfmeTemplate.findById(templateId);
            template = template?.toPdfmeFormat();
        }

        if (!template) {
            template = this.getDefaultInvoiceTemplate();
            // Add QR code field to the template
            template.schemas[0].push({
                name: 'qrCode',
                type: 'qrcode',
                position: { x: 15, y: 220 },
                width: 30,
                height: 30
            });
        }

        return this.generatePDF({ template, inputs });
    }
}

module.exports = PdfmeService;
