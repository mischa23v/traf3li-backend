const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const { s3Client, BUCKETS } = require('../configs/storage');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');

/**
 * Quote PDF Generation Service
 * Creates professional bilingual (Arabic/English) PDF quotes
 */
class QuotePdfService {
    constructor() {
        // Font paths for Arabic support
        this.fonts = {
            regular: path.join(__dirname, '../assets/fonts/NotoSansArabic-Regular.ttf'),
            bold: path.join(__dirname, '../assets/fonts/NotoSansArabic-Bold.ttf')
        };

        // Check if fonts exist, fall back to defaults
        this.hasArabicFonts = fs.existsSync(this.fonts.regular);

        if (!this.hasArabicFonts) {
            logger.warn('Arabic fonts not found, will use default fonts for PDF generation');
        }
    }

    /**
     * Generate PDF for a quote
     * @param {Object} quote - Quote document with populated references
     * @param {Object} options - Generation options
     */
    async generatePdf(quote, options = {}) {
        const {
            language = 'ar',
            includeTerms = true,
            includeSignature = true,
            watermark = null,
            firmDetails = {}
        } = options;

        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({
                    size: 'A4',
                    margin: 50,
                    info: {
                        Title: `Quote ${quote.quoteId}`,
                        Author: firmDetails.name || 'Traf3li CRM',
                        Subject: quote.title,
                        Creator: 'Traf3li Quote Generator'
                    }
                });

                const chunks = [];
                doc.on('data', chunk => chunks.push(chunk));
                doc.on('end', () => {
                    const pdfBuffer = Buffer.concat(chunks);
                    resolve(pdfBuffer);
                });
                doc.on('error', reject);

                // Register fonts if available
                if (this.hasArabicFonts) {
                    doc.registerFont('Arabic', this.fonts.regular);
                    doc.registerFont('Arabic-Bold', this.fonts.bold);
                }

                // Add watermark if specified
                if (watermark) {
                    this.addWatermark(doc, watermark);
                }

                // Generate content based on language
                if (language === 'ar') {
                    this.generateArabicContent(doc, quote, firmDetails, options);
                } else {
                    this.generateEnglishContent(doc, quote, firmDetails, options);
                }

                doc.end();
            } catch (error) {
                logger.error('Error generating quote PDF:', error);
                reject(error);
            }
        });
    }

    /**
     * Generate English content
     */
    generateEnglishContent(doc, quote, firmDetails, options) {
        // Header
        doc.fontSize(20)
           .font('Helvetica-Bold')
           .text('QUOTATION', { align: 'center' });

        doc.moveDown();

        // Quote info box
        doc.fontSize(10)
           .font('Helvetica')
           .text(`Quote #: ${quote.quoteId}`, { align: 'right' })
           .text(`Date: ${this.formatDate(quote.createdAt)}`, { align: 'right' })
           .text(`Valid Until: ${this.formatDate(quote.validUntil)}`, { align: 'right' });

        doc.moveDown(2);

        // Firm details (left) and Customer details (right)
        const startY = doc.y;

        // From section
        doc.font('Helvetica-Bold')
           .text('FROM:', 50, startY)
           .font('Helvetica')
           .text(firmDetails.name || 'Your Company', 50, doc.y)
           .text(firmDetails.address || '', 50, doc.y)
           .text(firmDetails.phone || '', 50, doc.y)
           .text(firmDetails.email || '', 50, doc.y);

        // To section
        doc.font('Helvetica-Bold')
           .text('TO:', 300, startY)
           .font('Helvetica')
           .text(this.getCustomerName(quote), 300, doc.y)
           .text(quote.customerEmail || '', 300, doc.y)
           .text(quote.customerPhone || '', 300, doc.y);

        doc.moveDown(4);

        // Title
        if (quote.title) {
            doc.font('Helvetica-Bold')
               .fontSize(14)
               .text(`RE: ${quote.title}`, 50);
            doc.moveDown();
        }

        // Description
        if (quote.description) {
            doc.font('Helvetica')
               .fontSize(10)
               .text(quote.description, 50);
            doc.moveDown();
        }

        // Line items table
        this.drawLineItemsTable(doc, quote.lineItems, 'en');

        // Totals
        this.drawTotals(doc, quote, 'en');

        // Terms
        if (options.includeTerms && quote.terms) {
            doc.moveDown(2);
            doc.font('Helvetica-Bold')
               .fontSize(12)
               .text('Terms & Conditions:');
            doc.font('Helvetica')
               .fontSize(9)
               .text(quote.terms);
        }

        // Signature section
        if (options.includeSignature) {
            this.drawSignatureSection(doc, quote, 'en');
        }

        // Footer
        this.drawFooter(doc, quote, firmDetails, 'en');
    }

    /**
     * Generate Arabic content (RTL)
     */
    generateArabicContent(doc, quote, firmDetails, options) {
        const fontName = this.hasArabicFonts ? 'Arabic' : 'Helvetica';
        const fontBold = this.hasArabicFonts ? 'Arabic-Bold' : 'Helvetica-Bold';

        // Header
        doc.fontSize(22)
           .font(fontBold)
           .text('عرض سعر', { align: 'center' });

        doc.moveDown();

        // Quote info
        doc.fontSize(10)
           .font(fontName)
           .text(`رقم العرض: ${quote.quoteId}`, { align: 'left', features: ['rtla'] })
           .text(`التاريخ: ${this.formatDateAr(quote.createdAt)}`, { align: 'left', features: ['rtla'] })
           .text(`صالح حتى: ${this.formatDateAr(quote.validUntil)}`, { align: 'left', features: ['rtla'] });

        doc.moveDown(2);

        // From/To sections
        const startY = doc.y;

        // From (right side for RTL)
        doc.font(fontBold)
           .text('من:', 350, startY, { features: ['rtla'] })
           .font(fontName)
           .text(firmDetails.nameAr || firmDetails.name || 'شركتكم', 350, doc.y, { features: ['rtla'] });

        // To (left side for RTL)
        doc.font(fontBold)
           .text('إلى:', 50, startY, { features: ['rtla'] })
           .font(fontName)
           .text(this.getCustomerNameAr(quote), 50, doc.y, { features: ['rtla'] });

        doc.moveDown(4);

        // Title
        if (quote.titleAr || quote.title) {
            doc.font(fontBold)
               .fontSize(14)
               .text(`الموضوع: ${quote.titleAr || quote.title}`, { align: 'right', features: ['rtla'] });
            doc.moveDown();
        }

        // Line items table (Arabic)
        this.drawLineItemsTable(doc, quote.lineItems, 'ar');

        // Totals
        this.drawTotals(doc, quote, 'ar');

        // Terms
        if (options.includeTerms && (quote.termsAr || quote.terms)) {
            doc.moveDown(2);
            doc.font(fontBold)
               .fontSize(12)
               .text('الشروط والأحكام:', { align: 'right', features: ['rtla'] });
            doc.font(fontName)
               .fontSize(9)
               .text(quote.termsAr || quote.terms, { align: 'right', features: ['rtla'] });
        }

        // Signature section
        if (options.includeSignature) {
            this.drawSignatureSection(doc, quote, 'ar');
        }

        // Footer
        this.drawFooter(doc, quote, firmDetails, 'ar');
    }

    /**
     * Draw line items table
     */
    drawLineItemsTable(doc, lineItems, lang) {
        const headers = lang === 'ar'
            ? ['البند', 'الوصف', 'الكمية', 'السعر', 'المجموع']
            : ['Item', 'Description', 'Qty', 'Price', 'Total'];

        const tableTop = doc.y;
        const colWidths = [150, 150, 50, 70, 80];
        let x = 50;

        // Draw header
        doc.font('Helvetica-Bold')
           .fontSize(10);

        headers.forEach((header, i) => {
            doc.text(header, x, tableTop, { width: colWidths[i], align: 'center' });
            x += colWidths[i];
        });

        // Header line
        doc.moveTo(50, tableTop + 15)
           .lineTo(550, tableTop + 15)
           .stroke();

        // Draw items
        let y = tableTop + 25;
        doc.font('Helvetica').fontSize(9);

        (lineItems || []).forEach(item => {
            x = 50;
            const values = [
                item.name || item.productName || '',
                item.description || '',
                item.quantity?.toString() || '1',
                this.formatCurrency(item.unitPrice || 0),
                this.formatCurrency(item.total || (item.quantity * item.unitPrice) || 0)
            ];

            values.forEach((val, i) => {
                doc.text(val, x, y, { width: colWidths[i], align: i > 1 ? 'right' : 'left' });
                x += colWidths[i];
            });

            y += 20;

            // Add page if needed
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        });

        // Bottom line
        doc.moveTo(50, y)
           .lineTo(550, y)
           .stroke();

        doc.y = y + 10;
    }

    /**
     * Draw totals section
     */
    drawTotals(doc, quote, lang) {
        const labels = lang === 'ar'
            ? { subtotal: 'المجموع الفرعي', discount: 'الخصم', tax: 'الضريبة', total: 'الإجمالي' }
            : { subtotal: 'Subtotal', discount: 'Discount', tax: 'VAT (15%)', total: 'TOTAL' };

        const x = 400;
        let y = doc.y + 20;

        doc.font('Helvetica').fontSize(10);

        // Subtotal
        doc.text(labels.subtotal, x, y);
        doc.text(this.formatCurrency(quote.subtotal || 0), x + 80, y, { align: 'right' });
        y += 15;

        // Discount
        if (quote.discountAmount > 0) {
            doc.text(labels.discount, x, y);
            doc.text(`-${this.formatCurrency(quote.discountAmount)}`, x + 80, y, { align: 'right' });
            y += 15;
        }

        // Tax
        doc.text(labels.tax, x, y);
        doc.text(this.formatCurrency(quote.taxAmount || 0), x + 80, y, { align: 'right' });
        y += 15;

        // Total
        doc.moveTo(x, y).lineTo(x + 100, y).stroke();
        y += 5;
        doc.font('Helvetica-Bold').fontSize(12);
        doc.text(labels.total, x, y);
        doc.text(this.formatCurrency(quote.grandTotal || 0), x + 80, y, { align: 'right' });

        doc.y = y + 20;
    }

    /**
     * Draw signature section
     */
    drawSignatureSection(doc, quote, lang) {
        doc.moveDown(3);

        const labels = lang === 'ar'
            ? { acceptance: 'القبول', signature: 'التوقيع', date: 'التاريخ', name: 'الاسم' }
            : { acceptance: 'Acceptance', signature: 'Signature', date: 'Date', name: 'Name' };

        doc.font('Helvetica-Bold')
           .fontSize(12)
           .text(labels.acceptance);

        doc.moveDown();
        doc.font('Helvetica').fontSize(10);

        // Signature line
        doc.text(`${labels.signature}: ________________________`);
        doc.moveDown(0.5);
        doc.text(`${labels.name}: ________________________`);
        doc.moveDown(0.5);
        doc.text(`${labels.date}: ________________________`);

        // If already signed, show signature
        if (quote.customerSignature?.signedAt) {
            doc.moveDown();
            doc.font('Helvetica-Oblique')
               .fontSize(9)
               .text(`Signed by ${quote.customerSignature.signerName} on ${this.formatDate(quote.customerSignature.signedAt)}`);
        }
    }

    /**
     * Draw footer
     */
    drawFooter(doc, quote, firmDetails, lang) {
        const pageHeight = doc.page.height;

        doc.fontSize(8)
           .font('Helvetica')
           .text(
               lang === 'ar' ? 'شكراً لتعاملكم معنا' : 'Thank you for your business',
               50,
               pageHeight - 50,
               { align: 'center', width: 500 }
           );
    }

    /**
     * Add watermark
     */
    addWatermark(doc, text) {
        doc.save();
        doc.rotate(-45, { origin: [300, 400] });
        doc.fontSize(60)
           .fillColor('#CCCCCC')
           .opacity(0.3)
           .text(text, 100, 350, { align: 'center' });
        doc.restore();
        doc.fillColor('#000000').opacity(1);
    }

    /**
     * Save PDF to S3/R2
     */
    async savePdfToS3(pdfBuffer, quote, firmId) {
        if (!s3Client) {
            logger.warn('S3/R2 not configured, cannot save PDF');
            return null;
        }

        try {
            const fileName = `quotes/${firmId}/${quote.quoteId}-${Date.now()}.pdf`;
            const bucketName = BUCKETS.documents;

            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: pdfBuffer,
                ContentType: 'application/pdf',
                Metadata: {
                    quoteId: quote.quoteId,
                    firmId: firmId.toString(),
                    generatedAt: new Date().toISOString()
                }
            });

            await s3Client.send(command);

            logger.info(`Quote PDF saved to S3: ${fileName}`);
            return fileName;
        } catch (error) {
            logger.error('Error saving quote PDF to S3:', error);
            throw error;
        }
    }

    // Helper methods
    getCustomerName(quote) {
        if (quote.customerType === 'lead' && quote.leadId) {
            return quote.leadId.displayName || `${quote.leadId.firstName} ${quote.leadId.lastName}`;
        }
        if (quote.customerType === 'client' && quote.clientId) {
            return quote.clientId.displayName || quote.clientId.companyName;
        }
        return quote.customerName || 'Customer';
    }

    getCustomerNameAr(quote) {
        if (quote.customerType === 'lead' && quote.leadId) {
            return quote.leadId.fullNameArabic || quote.leadId.companyNameAr || this.getCustomerName(quote);
        }
        if (quote.customerType === 'client' && quote.clientId) {
            return quote.clientId.fullNameArabic || quote.clientId.companyNameAr || this.getCustomerName(quote);
        }
        return quote.customerNameAr || quote.customerName || 'العميل';
    }

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatDateAr(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatCurrency(amount, currency = 'SAR') {
        return new Intl.NumberFormat('en-SA', {
            style: 'currency',
            currency
        }).format(amount / 100); // Assuming amounts in halalas
    }
}

module.exports = new QuotePdfService();
