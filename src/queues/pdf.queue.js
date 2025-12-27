/**
 * PDF Queue Processor
 *
 * Handles asynchronous PDF generation for invoices, reports, and documents.
 * Uses Puppeteer for rendering HTML to PDF and PDFMe for template-based generation.
 */

const { createQueue } = require('../configs/queue');
// Lazy load puppeteer to reduce startup memory - it will be loaded on first PDF generation
let puppeteer = null;
const getPuppeteer = () => {
  if (!puppeteer) {
    puppeteer = require('puppeteer');
  }
  return puppeteer;
};
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

// PDFMe imports for template-based PDF generation
let PdfmeService = null;
try {
    PdfmeService = require('../services/pdfme.service');
} catch (err) {
    logger.info('PDFMe service not available, template-based PDF generation disabled');
}

// Create PDF queue
const pdfQueue = createQueue('pdf', {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000
    },
    removeOnComplete: {
      age: 172800, // 48 hours
      count: 200
    },
    timeout: 120000 // 2 minutes timeout for PDF generation
  },
  settings: {
    lockDuration: 120000
  }
});

// Browser instance pool (reuse browser for better performance)
let browserInstance = null;

/**
 * Get or create browser instance
 */
async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await getPuppeteer().launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
  }
  return browserInstance;
}

/**
 * Process PDF jobs
 */
pdfQueue.process(async (job) => {
  const { type, data } = job.data;

  logger.info(`📄 Processing PDF job ${job.id} of type: ${type}`);

  try {
    switch (type) {
      case 'invoice':
        return await generateInvoicePDF(data, job);

      case 'report':
        return await generateReportPDF(data, job);

      case 'statement':
        return await generateStatementPDF(data, job);

      case 'contract':
        return await generateContractPDF(data, job);

      case 'custom':
        return await generateCustomPDF(data, job);

      // PDFMe template-based generation
      case 'pdfme':
        return await generatePdfmePDF(data, job);

      case 'pdfme-invoice':
        return await generatePdfmeInvoicePDF(data, job);

      case 'pdfme-contract':
        return await generatePdfmeContractPDF(data, job);

      case 'pdfme-receipt':
        return await generatePdfmeReceiptPDF(data, job);

      default:
        throw new Error(`Unknown PDF type: ${type}`);
    }
  } catch (error) {
    logger.error(`❌ PDF job ${job.id} failed:`, error.message);
    throw error;
  }
});

/**
 * Generate invoice PDF
 */
async function generateInvoicePDF(data, job) {
  const { invoiceId, invoiceData, options = {}, firmId } = data;

  // Verify firmId is provided for authorization
  if (!firmId) {
    throw new Error('firmId is required for invoice PDF generation');
  }

  // Verify invoice belongs to the firm if invoiceId is provided
  if (invoiceId && invoiceData?.firmId && invoiceData.firmId.toString() !== firmId.toString()) {
    throw new Error('Invoice does not belong to the specified firm');
  }

  await job.progress(10);

  // Generate HTML from invoice data
  const html = generateInvoiceHTML(invoiceData);

  await job.progress(30);

  // Generate PDF
  const pdfBuffer = await generatePDF(html, {
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm'
    },
    ...options
  });

  await job.progress(80);

  // Save PDF to file system or S3
  const fileName = `invoice-${invoiceId}-${Date.now()}.pdf`;
  const filePath = await savePDF(pdfBuffer, fileName);

  await job.progress(100);

  logger.info(`✅ Invoice PDF generated: ${fileName}`);
  return {
    success: true,
    invoiceId,
    fileName,
    filePath,
    size: pdfBuffer.length
  };
}

/**
 * Generate report PDF
 */
async function generateReportPDF(data, job) {
  const { reportId, reportData, reportType, options = {}, firmId } = data;

  // Verify firmId is provided for authorization
  if (!firmId) {
    throw new Error('firmId is required for report PDF generation');
  }

  // Verify report belongs to the firm if reportData contains firmId
  if (reportData?.firmId && reportData.firmId.toString() !== firmId.toString()) {
    throw new Error('Report does not belong to the specified firm');
  }

  await job.progress(10);

  // Generate HTML from report data
  const html = generateReportHTML(reportData, reportType);

  await job.progress(30);

  // Generate PDF with landscape for wider reports
  const pdfBuffer = await generatePDF(html, {
    format: 'A4',
    landscape: reportData.layout === 'landscape',
    printBackground: true,
    margin: {
      top: '15mm',
      bottom: '15mm',
      left: '10mm',
      right: '10mm'
    },
    ...options
  });

  await job.progress(80);

  // Save PDF
  const fileName = `report-${reportType}-${reportId}-${Date.now()}.pdf`;
  const filePath = await savePDF(pdfBuffer, fileName);

  await job.progress(100);

  logger.info(`✅ Report PDF generated: ${fileName}`);
  return {
    success: true,
    reportId,
    reportType,
    fileName,
    filePath,
    size: pdfBuffer.length
  };
}

/**
 * Generate statement PDF
 */
async function generateStatementPDF(data, job) {
  const { statementId, statementData, options = {}, firmId } = data;

  // Verify firmId is provided for authorization
  if (!firmId) {
    throw new Error('firmId is required for statement PDF generation');
  }

  // Verify statement belongs to the firm if statementData contains firmId
  if (statementData?.firmId && statementData.firmId.toString() !== firmId.toString()) {
    throw new Error('Statement does not belong to the specified firm');
  }

  await job.progress(10);

  const html = generateStatementHTML(statementData);

  await job.progress(30);

  const pdfBuffer = await generatePDF(html, {
    format: 'A4',
    printBackground: true,
    ...options
  });

  await job.progress(80);

  const fileName = `statement-${statementId}-${Date.now()}.pdf`;
  const filePath = await savePDF(pdfBuffer, fileName);

  await job.progress(100);

  logger.info(`✅ Statement PDF generated: ${fileName}`);
  return {
    success: true,
    statementId,
    fileName,
    filePath,
    size: pdfBuffer.length
  };
}

/**
 * Generate contract PDF
 */
async function generateContractPDF(data, job) {
  const { contractId, contractData, options = {}, firmId } = data;

  // Verify firmId is provided for authorization
  if (!firmId) {
    throw new Error('firmId is required for contract PDF generation');
  }

  // Verify contract belongs to the firm if contractData contains firmId
  if (contractData?.firmId && contractData.firmId.toString() !== firmId.toString()) {
    throw new Error('Contract does not belong to the specified firm');
  }

  await job.progress(10);

  const html = generateContractHTML(contractData);

  await job.progress(30);

  const pdfBuffer = await generatePDF(html, {
    format: 'A4',
    printBackground: true,
    ...options
  });

  await job.progress(80);

  const fileName = `contract-${contractId}-${Date.now()}.pdf`;
  const filePath = await savePDF(pdfBuffer, fileName);

  await job.progress(100);

  logger.info(`✅ Contract PDF generated: ${fileName}`);
  return {
    success: true,
    contractId,
    fileName,
    filePath,
    size: pdfBuffer.length
  };
}

/**
 * Generate custom PDF from HTML
 */
async function generateCustomPDF(data, job) {
  const { html, fileName: customFileName, options = {}, firmId } = data;

  // Verify firmId is provided for authorization
  if (!firmId) {
    throw new Error('firmId is required for custom PDF generation');
  }

  await job.progress(20);

  const pdfBuffer = await generatePDF(html, {
    format: 'A4',
    printBackground: true,
    ...options
  });

  await job.progress(80);

  const fileName = customFileName || `document-${Date.now()}.pdf`;
  const filePath = await savePDF(pdfBuffer, fileName);

  await job.progress(100);

  logger.info(`✅ Custom PDF generated: ${fileName}`);
  return {
    success: true,
    fileName,
    filePath,
    size: pdfBuffer.length
  };
}

/**
 * Core PDF generation function using Puppeteer
 */
async function generatePDF(html, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, {
      waitUntil: 'networkidle0'
    });

    const pdfBuffer = await page.pdf(options);

    return pdfBuffer;
  } finally {
    await page.close();
  }
}

/**
 * Save PDF to file system
 */
async function savePDF(pdfBuffer, fileName) {
  const uploadsDir = path.join(__dirname, '../../uploads/pdfs');

  // Create directory if it doesn't exist
  await fs.mkdir(uploadsDir, { recursive: true });

  const filePath = path.join(uploadsDir, fileName);
  await fs.writeFile(filePath, pdfBuffer);

  return filePath;
}

/**
 * Generate invoice HTML template
 */
function generateInvoiceHTML(invoiceData) {
  // This is a simplified template - you should use a proper template engine
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .invoice-details { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        .total { font-weight: bold; font-size: 18px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>INVOICE</h1>
        <p>Invoice #${invoiceData.invoiceNumber || 'N/A'}</p>
      </div>
      <div class="invoice-details">
        <p><strong>Date:</strong> ${invoiceData.date || new Date().toLocaleDateString()}</p>
        <p><strong>Client:</strong> ${invoiceData.clientName || 'N/A'}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${(invoiceData.items || []).map(item => `
            <tr>
              <td>${item.description}</td>
              <td>${item.quantity}</td>
              <td>${item.price}</td>
              <td>${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr class="total">
            <td colspan="3">Total</td>
            <td>${invoiceData.totalAmount || '0.00'}</td>
          </tr>
        </tfoot>
      </table>
    </body>
    </html>
  `;
}

/**
 * Generate report HTML template
 */
function generateReportHTML(reportData, reportType) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { color: #333; }
        .report-meta { margin-bottom: 20px; color: #666; }
      </style>
    </head>
    <body>
      <h1>${reportType.toUpperCase()} Report</h1>
      <div class="report-meta">
        <p>Generated: ${new Date().toLocaleString()}</p>
      </div>
      <div class="content">
        ${reportData.content || '<p>Report content</p>'}
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate statement HTML template
 */
function generateStatementHTML(statementData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { color: #333; }
      </style>
    </head>
    <body>
      <h1>Statement</h1>
      <p>Period: ${statementData.period || 'N/A'}</p>
      <div>${statementData.content || '<p>Statement content</p>'}</div>
    </body>
    </html>
  `;
}

/**
 * Generate contract HTML template
 */
function generateContractHTML(contractData) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Times New Roman', serif; margin: 0; padding: 30px; line-height: 1.6; }
        h1 { text-align: center; }
      </style>
    </head>
    <body>
      <h1>CONTRACT</h1>
      <div>${contractData.content || '<p>Contract content</p>'}</div>
    </body>
    </html>
  `;
}

// ============ PDFME GENERATION FUNCTIONS ============

/**
 * Generate PDF using PDFMe (template-based)
 */
async function generatePdfmePDF(data, job) {
  if (!PdfmeService) {
    throw new Error('PDFMe service not available');
  }

  const { templateId, template, inputs, docType = 'custom', lawyerId, firmId } = data;

  // Verify firmId is provided for authorization
  if (!firmId) {
    throw new Error('firmId is required for PDFMe PDF generation');
  }

  await job.progress(10);

  const pdfBuffer = await PdfmeService.generatePDF({
    templateId,
    template,
    inputs
  });

  await job.progress(80);

  const fileName = `${docType}-${Date.now()}.pdf`;
  const filePath = await PdfmeService.savePDF(pdfBuffer, fileName);

  await job.progress(100);

  logger.info(`✅ PDFMe PDF generated: ${fileName}`);
  return {
    success: true,
    fileName,
    filePath,
    size: pdfBuffer.length,
    generator: 'pdfme'
  };
}

/**
 * Generate invoice PDF using PDFMe
 */
async function generatePdfmeInvoicePDF(data, job) {
  if (!PdfmeService) {
    throw new Error('PDFMe service not available');
  }

  const { invoiceData, templateId, lawyerId, includeQR, qrData, firmId } = data;

  // Verify firmId is provided for authorization
  if (!firmId) {
    throw new Error('firmId is required for PDFMe invoice PDF generation');
  }

  // Verify invoice belongs to the firm if invoiceData contains firmId
  if (invoiceData?.firmId && invoiceData.firmId.toString() !== firmId.toString()) {
    throw new Error('Invoice does not belong to the specified firm');
  }

  await job.progress(10);

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

  await job.progress(80);

  const invoiceNumber = invoiceData.invoiceNumber || Date.now();
  const fileName = `invoice-${invoiceNumber}-${Date.now()}.pdf`;
  const filePath = await PdfmeService.savePDF(pdfBuffer, fileName, 'invoices');

  await job.progress(100);

  logger.info(`✅ PDFMe Invoice PDF generated: ${fileName}`);
  return {
    success: true,
    invoiceNumber,
    fileName,
    filePath,
    size: pdfBuffer.length,
    generator: 'pdfme'
  };
}

/**
 * Generate contract PDF using PDFMe
 */
async function generatePdfmeContractPDF(data, job) {
  if (!PdfmeService) {
    throw new Error('PDFMe service not available');
  }

  const { contractData, templateId, lawyerId, firmId } = data;

  // Verify firmId is provided for authorization
  if (!firmId) {
    throw new Error('firmId is required for PDFMe contract PDF generation');
  }

  // Verify contract belongs to the firm if contractData contains firmId
  if (contractData?.firmId && contractData.firmId.toString() !== firmId.toString()) {
    throw new Error('Contract does not belong to the specified firm');
  }

  await job.progress(10);

  const pdfBuffer = await PdfmeService.generateContractPDF(
    contractData,
    templateId,
    lawyerId
  );

  await job.progress(80);

  const contractNumber = contractData.contractNumber || Date.now();
  const fileName = `contract-${contractNumber}-${Date.now()}.pdf`;
  const filePath = await PdfmeService.savePDF(pdfBuffer, fileName, 'contracts');

  await job.progress(100);

  logger.info(`✅ PDFMe Contract PDF generated: ${fileName}`);
  return {
    success: true,
    contractNumber,
    fileName,
    filePath,
    size: pdfBuffer.length,
    generator: 'pdfme'
  };
}

/**
 * Generate receipt PDF using PDFMe
 */
async function generatePdfmeReceiptPDF(data, job) {
  if (!PdfmeService) {
    throw new Error('PDFMe service not available');
  }

  const { receiptData, templateId, lawyerId, firmId } = data;

  // Verify firmId is provided for authorization
  if (!firmId) {
    throw new Error('firmId is required for PDFMe receipt PDF generation');
  }

  // Verify receipt belongs to the firm if receiptData contains firmId
  if (receiptData?.firmId && receiptData.firmId.toString() !== firmId.toString()) {
    throw new Error('Receipt does not belong to the specified firm');
  }

  await job.progress(10);

  const pdfBuffer = await PdfmeService.generateReceiptPDF(
    receiptData,
    templateId,
    lawyerId
  );

  await job.progress(80);

  const receiptNumber = receiptData.receiptNumber || Date.now();
  const fileName = `receipt-${receiptNumber}-${Date.now()}.pdf`;
  const filePath = await PdfmeService.savePDF(pdfBuffer, fileName, 'receipts');

  await job.progress(100);

  logger.info(`✅ PDFMe Receipt PDF generated: ${fileName}`);
  return {
    success: true,
    receiptNumber,
    fileName,
    filePath,
    size: pdfBuffer.length,
    generator: 'pdfme'
  };
}

// Cleanup browser on queue close
pdfQueue.on('close', async () => {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
    logger.info('🔒 PDF browser instance closed');
  }
});

module.exports = pdfQueue;
