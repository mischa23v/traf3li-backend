/**
 * Data Export Service for TRAF3LI
 * Comprehensive export system with support for multiple formats and entities
 */

const ExcelJS = require('exceljs');
const { parse } = require('json2csv');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const logger = require('../utils/logger');
const {
  Invoice,
  Client,
  TimeEntry,
  Expense,
  Payment,
  Case,
  ExportJob,
  ExportTemplate
} = require('../models');
const AuditLog = require('../models/auditLog.model');
const { sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Export data to Excel (XLSX) with formatting
 */
async function exportToExcel(data, config = {}) {
  try {
    const {
      sheetName = 'Sheet1',
      columns = [],
      fileName = 'export.xlsx',
      formatting = {},
      language = 'ar',
      autoFilter = true,
      freezeHeader = true
    } = config;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: language === 'ar' }]
    });

    // Define columns
    if (columns.length > 0) {
      worksheet.columns = columns.map(col => ({
        header: language === 'ar' ? col.labelAr || col.label : col.label,
        key: col.field,
        width: col.width || 15,
        style: col.style || {}
      }));
    } else if (data.length > 0) {
      // Auto-generate columns from first row
      const firstRow = data[0];
      worksheet.columns = Object.keys(firstRow).map(key => ({
        header: key,
        key: key,
        width: 15
      }));
    }

    // Style header row
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data rows
    data.forEach((row, index) => {
      const excelRow = worksheet.addRow(row);

      // Apply formatting for specific data types
      columns.forEach((col, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);

        if (col.format === 'currency') {
          cell.numFmt = formatting.currencyFormat || '#,##0.00';
        } else if (col.format === 'date') {
          cell.numFmt = formatting.dateFormat || 'dd/mm/yyyy';
        } else if (col.format === 'percentage') {
          cell.numFmt = '0.00%';
        }
      });

      // Alternate row colors
      if (formatting.alternateRows && index % 2 === 0) {
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' }
        };
      }
    });

    // Auto-filter
    if (autoFilter && data.length > 0) {
      worksheet.autoFilter = {
        from: 'A1',
        to: String.fromCharCode(64 + columns.length) + '1'
      };
    }

    // Freeze header row
    if (freezeHeader) {
      worksheet.views = [
        { state: 'frozen', ySplit: 1, rightToLeft: language === 'ar' }
      ];
    }

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  } catch (error) {
    logger.error('Error exporting to Excel:', error);
    throw new Error(`Failed to export to Excel: ${error.message}`);
  }
}

/**
 * Export data to PDF with template
 */
async function exportToPDF(data, template, config = {}) {
  try {
    const {
      fileName = 'export.pdf',
      language = 'ar',
      pageSize = 'A4',
      orientation = 'portrait',
      margins = { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' }
    } = config;

    // Generate HTML from template
    let html = await generateHtmlFromTemplate(template, data, config);

    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: pageSize,
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: margins
    });

    await browser.close();
    return pdfBuffer;
  } catch (error) {
    logger.error('Error exporting to PDF:', error);
    throw new Error(`Failed to export to PDF: ${error.message}`);
  }
}

/**
 * Export data to CSV
 */
async function exportToCSV(data, config = {}) {
  try {
    const {
      columns = [],
      language = 'ar',
      delimiter = ',',
      withBOM = true // For Excel compatibility
    } = config;

    let fields;
    if (columns.length > 0) {
      fields = columns.map(col => ({
        label: language === 'ar' ? col.labelAr || col.label : col.label,
        value: col.field
      }));
    } else {
      fields = Object.keys(data[0] || {});
    }

    const csv = parse(data, { fields, delimiter });

    // Add BOM for proper UTF-8 encoding in Excel
    const buffer = Buffer.from(withBOM ? '\uFEFF' + csv : csv, 'utf-8');
    return buffer;
  } catch (error) {
    logger.error('Error exporting to CSV:', error);
    throw new Error(`Failed to export to CSV: ${error.message}`);
  }
}

/**
 * Export data to JSON
 */
async function exportToJSON(data, config = {}) {
  try {
    const {
      pretty = true,
      columns = []
    } = config;

    // Filter data by columns if specified
    let filteredData = data;
    if (columns.length > 0) {
      filteredData = data.map(row => {
        const filtered = {};
        columns.forEach(col => {
          if (row[col.field] !== undefined) {
            filtered[col.field] = row[col.field];
          }
        });
        return filtered;
      });
    }

    const json = pretty
      ? JSON.stringify(filteredData, null, 2)
      : JSON.stringify(filteredData);

    return Buffer.from(json, 'utf-8');
  } catch (error) {
    logger.error('Error exporting to JSON:', error);
    throw new Error(`Failed to export to JSON: ${error.message}`);
  }
}

/**
 * Export invoices with filters
 */
async function exportInvoices(firmId, filters = {}, format = 'xlsx') {
  try {
    const query = { firmId: sanitizeObjectId(firmId) };

    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.clientId) query.clientId = sanitizeObjectId(filters.clientId);
    if (filters.dateFrom || filters.dateTo) {
      query.issueDate = {};
      if (filters.dateFrom) query.issueDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.issueDate.$lte = new Date(filters.dateTo);
    }

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name nameAr email')
      .populate('caseId', 'caseNumber title')
      .sort({ issueDate: -1 })
      .limit(10000)
      .lean();

    // Transform data
    const data = invoices.map(inv => ({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientId?.name || inv.clientId?.nameAr || '',
      caseNumber: inv.caseId?.caseNumber || '',
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      subtotal: inv.subtotal,
      vatAmount: inv.vatAmount,
      total: inv.total,
      paidAmount: inv.paidAmount || 0,
      balance: inv.total - (inv.paidAmount || 0),
      status: inv.status,
      currency: inv.currency || 'SAR'
    }));

    // Column definitions
    const columns = [
      { field: 'invoiceNumber', label: 'Invoice Number', labelAr: 'رقم الفاتورة', width: 15 },
      { field: 'clientName', label: 'Client', labelAr: 'العميل', width: 25 },
      { field: 'caseNumber', label: 'Case Number', labelAr: 'رقم القضية', width: 15 },
      { field: 'issueDate', label: 'Issue Date', labelAr: 'تاريخ الإصدار', width: 15, format: 'date' },
      { field: 'dueDate', label: 'Due Date', labelAr: 'تاريخ الاستحقاق', width: 15, format: 'date' },
      { field: 'subtotal', label: 'Subtotal', labelAr: 'المجموع الفرعي', width: 15, format: 'currency' },
      { field: 'vatAmount', label: 'VAT', labelAr: 'ضريبة القيمة المضافة', width: 15, format: 'currency' },
      { field: 'total', label: 'Total', labelAr: 'الإجمالي', width: 15, format: 'currency' },
      { field: 'paidAmount', label: 'Paid', labelAr: 'المدفوع', width: 15, format: 'currency' },
      { field: 'balance', label: 'Balance', labelAr: 'الرصيد', width: 15, format: 'currency' },
      { field: 'status', label: 'Status', labelAr: 'الحالة', width: 12 }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Invoices' });
  } catch (error) {
    logger.error('Error exporting invoices:', error);
    throw error;
  }
}

/**
 * Export clients with filters
 */
async function exportClients(firmId, filters = {}, format = 'xlsx') {
  try {
    const query = { firmId: sanitizeObjectId(firmId) };

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;

    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    const data = clients.map(client => ({
      clientId: client.clientId,
      name: client.name,
      nameAr: client.nameAr,
      email: client.email,
      phone: client.phone,
      type: client.type,
      status: client.status,
      nationalId: client.nationalId || '',
      commercialRegister: client.commercialRegister || '',
      city: client.address?.city || '',
      createdAt: client.createdAt
    }));

    const columns = [
      { field: 'clientId', label: 'Client ID', labelAr: 'رقم العميل', width: 15 },
      { field: 'name', label: 'Name (EN)', labelAr: 'الاسم (EN)', width: 25 },
      { field: 'nameAr', label: 'Name (AR)', labelAr: 'الاسم (AR)', width: 25 },
      { field: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', width: 25 },
      { field: 'phone', label: 'Phone', labelAr: 'الهاتف', width: 15 },
      { field: 'type', label: 'Type', labelAr: 'النوع', width: 12 },
      { field: 'status', label: 'Status', labelAr: 'الحالة', width: 12 },
      { field: 'nationalId', label: 'National ID', labelAr: 'الهوية الوطنية', width: 15 },
      { field: 'city', label: 'City', labelAr: 'المدينة', width: 15 },
      { field: 'createdAt', label: 'Created Date', labelAr: 'تاريخ الإنشاء', width: 15, format: 'date' }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Clients' });
  } catch (error) {
    logger.error('Error exporting clients:', error);
    throw error;
  }
}

/**
 * Export time entries with filters
 */
async function exportTimeEntries(firmId, filters = {}, format = 'xlsx') {
  try {
    const query = { firmId: sanitizeObjectId(firmId) };

    if (filters.userId) query.userId = sanitizeObjectId(filters.userId);
    if (filters.caseId) query.caseId = sanitizeObjectId(filters.caseId);
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
    }

    const timeEntries = await TimeEntry.find(query)
      .populate('userId', 'firstName lastName')
      .populate('caseId', 'caseNumber title')
      .populate('activityId', 'name nameAr')
      .sort({ date: -1 })
      .limit(10000)
      .lean();

    const data = timeEntries.map(entry => ({
      date: entry.date,
      user: `${entry.userId?.firstName || ''} ${entry.userId?.lastName || ''}`,
      caseNumber: entry.caseId?.caseNumber || '',
      caseTitle: entry.caseId?.title || '',
      activity: entry.activityId?.name || entry.activityId?.nameAr || '',
      description: entry.description || '',
      hours: entry.duration / 60, // Convert minutes to hours
      rate: entry.rate,
      amount: entry.amount,
      billable: entry.billable ? 'Yes' : 'No',
      status: entry.status
    }));

    const columns = [
      { field: 'date', label: 'Date', labelAr: 'التاريخ', width: 15, format: 'date' },
      { field: 'user', label: 'User', labelAr: 'المستخدم', width: 20 },
      { field: 'caseNumber', label: 'Case Number', labelAr: 'رقم القضية', width: 15 },
      { field: 'caseTitle', label: 'Case Title', labelAr: 'عنوان القضية', width: 25 },
      { field: 'activity', label: 'Activity', labelAr: 'النشاط', width: 20 },
      { field: 'description', label: 'Description', labelAr: 'الوصف', width: 35 },
      { field: 'hours', label: 'Hours', labelAr: 'الساعات', width: 10 },
      { field: 'rate', label: 'Rate', labelAr: 'السعر', width: 12, format: 'currency' },
      { field: 'amount', label: 'Amount', labelAr: 'المبلغ', width: 12, format: 'currency' },
      { field: 'billable', label: 'Billable', labelAr: 'قابل للفوترة', width: 12 },
      { field: 'status', label: 'Status', labelAr: 'الحالة', width: 12 }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Time Entries' });
  } catch (error) {
    logger.error('Error exporting time entries:', error);
    throw error;
  }
}

/**
 * Export expenses with filters
 */
async function exportExpenses(firmId, filters = {}, format = 'xlsx') {
  try {
    const query = { firmId: sanitizeObjectId(firmId) };

    if (filters.caseId) query.caseId = sanitizeObjectId(filters.caseId);
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.date = {};
      if (filters.dateFrom) query.date.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.date.$lte = new Date(filters.dateTo);
    }

    const expenses = await Expense.find(query)
      .populate('caseId', 'caseNumber title')
      .populate('categoryId', 'name nameAr')
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 })
      .limit(10000)
      .lean();

    const data = expenses.map(exp => ({
      date: exp.date,
      caseNumber: exp.caseId?.caseNumber || '',
      category: exp.categoryId?.name || exp.categoryId?.nameAr || '',
      description: exp.description || '',
      amount: exp.amount,
      vat: exp.vatAmount || 0,
      total: exp.total,
      billable: exp.billable ? 'Yes' : 'No',
      status: exp.status,
      submittedBy: `${exp.createdBy?.firstName || ''} ${exp.createdBy?.lastName || ''}`
    }));

    const columns = [
      { field: 'date', label: 'Date', labelAr: 'التاريخ', width: 15, format: 'date' },
      { field: 'caseNumber', label: 'Case Number', labelAr: 'رقم القضية', width: 15 },
      { field: 'category', label: 'Category', labelAr: 'الفئة', width: 20 },
      { field: 'description', label: 'Description', labelAr: 'الوصف', width: 35 },
      { field: 'amount', label: 'Amount', labelAr: 'المبلغ', width: 12, format: 'currency' },
      { field: 'vat', label: 'VAT', labelAr: 'ضريبة القيمة المضافة', width: 12, format: 'currency' },
      { field: 'total', label: 'Total', labelAr: 'الإجمالي', width: 12, format: 'currency' },
      { field: 'billable', label: 'Billable', labelAr: 'قابل للفوترة', width: 12 },
      { field: 'status', label: 'Status', labelAr: 'الحالة', width: 12 },
      { field: 'submittedBy', label: 'Submitted By', labelAr: 'تم التقديم بواسطة', width: 20 }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Expenses' });
  } catch (error) {
    logger.error('Error exporting expenses:', error);
    throw error;
  }
}

/**
 * Export payments with filters
 */
async function exportPayments(firmId, filters = {}, format = 'xlsx') {
  try {
    const query = { firmId: sanitizeObjectId(firmId) };

    if (filters.clientId) query.clientId = sanitizeObjectId(filters.clientId);
    if (filters.status) query.status = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      query.paymentDate = {};
      if (filters.dateFrom) query.paymentDate.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.paymentDate.$lte = new Date(filters.dateTo);
    }

    const payments = await Payment.find(query)
      .populate('clientId', 'name nameAr')
      .populate('invoiceId', 'invoiceNumber')
      .sort({ paymentDate: -1 })
      .limit(10000)
      .lean();

    const data = payments.map(payment => ({
      paymentNumber: payment.paymentNumber || payment.receiptNumber,
      paymentDate: payment.paymentDate,
      clientName: payment.clientId?.name || payment.clientId?.nameAr || '',
      invoiceNumber: payment.invoiceId?.invoiceNumber || '',
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      referenceNumber: payment.referenceNumber || '',
      status: payment.status,
      notes: payment.notes || ''
    }));

    const columns = [
      { field: 'paymentNumber', label: 'Payment Number', labelAr: 'رقم الدفع', width: 15 },
      { field: 'paymentDate', label: 'Date', labelAr: 'التاريخ', width: 15, format: 'date' },
      { field: 'clientName', label: 'Client', labelAr: 'العميل', width: 25 },
      { field: 'invoiceNumber', label: 'Invoice Number', labelAr: 'رقم الفاتورة', width: 15 },
      { field: 'amount', label: 'Amount', labelAr: 'المبلغ', width: 15, format: 'currency' },
      { field: 'paymentMethod', label: 'Payment Method', labelAr: 'طريقة الدفع', width: 15 },
      { field: 'referenceNumber', label: 'Reference', labelAr: 'المرجع', width: 20 },
      { field: 'status', label: 'Status', labelAr: 'الحالة', width: 12 },
      { field: 'notes', label: 'Notes', labelAr: 'ملاحظات', width: 30 }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Payments' });
  } catch (error) {
    logger.error('Error exporting payments:', error);
    throw error;
  }
}

/**
 * Export cases with filters
 */
async function exportCases(firmId, filters = {}, format = 'xlsx') {
  try {
    const query = { firmId: sanitizeObjectId(firmId) };

    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;
    if (filters.priority) query.priority = filters.priority;

    const cases = await Case.find(query)
      .populate('clientId', 'name nameAr')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    const data = cases.map(caseItem => ({
      caseNumber: caseItem.caseNumber,
      title: caseItem.title,
      clientName: caseItem.clientId?.name || caseItem.clientId?.nameAr || '',
      category: caseItem.category,
      status: caseItem.status,
      priority: caseItem.priority,
      court: caseItem.court || '',
      assignedTo: caseItem.assignedTo?.map(u => `${u.firstName} ${u.lastName}`).join(', ') || '',
      claimAmount: caseItem.claimAmount || 0,
      createdAt: caseItem.createdAt
    }));

    const columns = [
      { field: 'caseNumber', label: 'Case Number', labelAr: 'رقم القضية', width: 15 },
      { field: 'title', label: 'Title', labelAr: 'العنوان', width: 30 },
      { field: 'clientName', label: 'Client', labelAr: 'العميل', width: 25 },
      { field: 'category', label: 'Category', labelAr: 'الفئة', width: 20 },
      { field: 'status', label: 'Status', labelAr: 'الحالة', width: 12 },
      { field: 'priority', label: 'Priority', labelAr: 'الأولوية', width: 12 },
      { field: 'court', label: 'Court', labelAr: 'المحكمة', width: 25 },
      { field: 'assignedTo', label: 'Assigned To', labelAr: 'المسند إلى', width: 25 },
      { field: 'claimAmount', label: 'Claim Amount', labelAr: 'قيمة المطالبة', width: 15, format: 'currency' },
      { field: 'createdAt', label: 'Created Date', labelAr: 'تاريخ الإنشاء', width: 15, format: 'date' }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Cases' });
  } catch (error) {
    logger.error('Error exporting cases:', error);
    throw error;
  }
}

/**
 * Export audit logs with filters
 */
async function exportAuditLog(firmId, filters = {}, format = 'xlsx') {
  try {
    const query = { firmId: sanitizeObjectId(firmId) };

    if (filters.action) query.action = filters.action;
    if (filters.userId) query.userId = sanitizeObjectId(filters.userId);
    if (filters.dateFrom || filters.dateTo) {
      query.timestamp = {};
      if (filters.dateFrom) query.timestamp.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.timestamp.$lte = new Date(filters.dateTo);
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'firstName lastName email')
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    const data = logs.map(log => ({
      timestamp: log.timestamp,
      user: log.userId ? `${log.userId.firstName} ${log.userId.lastName}` : 'System',
      email: log.userId?.email || '',
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId?.toString() || '',
      ipAddress: log.ipAddress || '',
      userAgent: log.userAgent || '',
      details: JSON.stringify(log.details || {})
    }));

    const columns = [
      { field: 'timestamp', label: 'Timestamp', labelAr: 'الوقت', width: 20, format: 'date' },
      { field: 'user', label: 'User', labelAr: 'المستخدم', width: 20 },
      { field: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', width: 25 },
      { field: 'action', label: 'Action', labelAr: 'الإجراء', width: 20 },
      { field: 'entityType', label: 'Entity Type', labelAr: 'نوع الكيان', width: 15 },
      { field: 'entityId', label: 'Entity ID', labelAr: 'معرف الكيان', width: 25 },
      { field: 'ipAddress', label: 'IP Address', labelAr: 'عنوان IP', width: 15 },
      { field: 'details', label: 'Details', labelAr: 'التفاصيل', width: 40 }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Audit Log' });
  } catch (error) {
    logger.error('Error exporting audit log:', error);
    throw error;
  }
}

/**
 * Export financial report
 */
async function exportFinancialReport(firmId, dateRange = {}, format = 'xlsx') {
  try {
    const { start, end } = dateRange;
    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = end ? new Date(end) : new Date();

    // Get invoices
    const invoices = await Invoice.find({
      firmId: sanitizeObjectId(firmId),
      issueDate: { $gte: startDate, $lte: endDate }
    }).lean();

    // Get payments
    const payments = await Payment.find({
      firmId: sanitizeObjectId(firmId),
      paymentDate: { $gte: startDate, $lte: endDate }
    }).lean();

    // Get expenses
    const expenses = await Expense.find({
      firmId: sanitizeObjectId(firmId),
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    // Calculate totals
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.total || 0), 0);
    const totalOutstanding = totalRevenue - totalPaid;

    const data = [
      { metric: 'Total Revenue', metricAr: 'إجمالي الإيرادات', amount: totalRevenue },
      { metric: 'Total Collected', metricAr: 'إجمالي المحصل', amount: totalPaid },
      { metric: 'Outstanding', metricAr: 'المستحق', amount: totalOutstanding },
      { metric: 'Total Expenses', metricAr: 'إجمالي المصروفات', amount: totalExpenses },
      { metric: 'Net Income', metricAr: 'صافي الدخل', amount: totalPaid - totalExpenses }
    ];

    const columns = [
      { field: 'metricAr', label: 'Metric', labelAr: 'المقياس', width: 25 },
      { field: 'amount', label: 'Amount (SAR)', labelAr: 'المبلغ (ريال)', width: 20, format: 'currency' }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Financial Summary' });
  } catch (error) {
    logger.error('Error exporting financial report:', error);
    throw error;
  }
}

/**
 * Export AR Aging Report
 */
async function exportARAgingReport(firmId, format = 'xlsx') {
  try {
    const invoices = await Invoice.find({
      firmId: sanitizeObjectId(firmId),
      status: { $in: ['sent', 'overdue', 'partially_paid'] }
    })
    .populate('clientId', 'name nameAr')
    .lean();

    const now = new Date();
    const data = invoices.map(inv => {
      const balance = inv.total - (inv.paidAmount || 0);
      const daysPastDue = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));

      let agingBucket = 'Current';
      if (daysPastDue > 0 && daysPastDue <= 30) agingBucket = '1-30 Days';
      else if (daysPastDue > 30 && daysPastDue <= 60) agingBucket = '31-60 Days';
      else if (daysPastDue > 60 && daysPastDue <= 90) agingBucket = '61-90 Days';
      else if (daysPastDue > 90) agingBucket = '90+ Days';

      return {
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientId?.name || inv.clientId?.nameAr || '',
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        total: inv.total,
        paid: inv.paidAmount || 0,
        balance: balance,
        daysPastDue: daysPastDue > 0 ? daysPastDue : 0,
        agingBucket: agingBucket
      };
    });

    const columns = [
      { field: 'invoiceNumber', label: 'Invoice Number', labelAr: 'رقم الفاتورة', width: 15 },
      { field: 'clientName', label: 'Client', labelAr: 'العميل', width: 25 },
      { field: 'issueDate', label: 'Issue Date', labelAr: 'تاريخ الإصدار', width: 15, format: 'date' },
      { field: 'dueDate', label: 'Due Date', labelAr: 'تاريخ الاستحقاق', width: 15, format: 'date' },
      { field: 'total', label: 'Total', labelAr: 'الإجمالي', width: 15, format: 'currency' },
      { field: 'paid', label: 'Paid', labelAr: 'المدفوع', width: 15, format: 'currency' },
      { field: 'balance', label: 'Balance', labelAr: 'الرصيد', width: 15, format: 'currency' },
      { field: 'daysPastDue', label: 'Days Past Due', labelAr: 'أيام التأخير', width: 15 },
      { field: 'agingBucket', label: 'Aging Bucket', labelAr: 'فئة التقادم', width: 15 }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'AR Aging' });
  } catch (error) {
    logger.error('Error exporting AR aging report:', error);
    throw error;
  }
}

/**
 * Export Trust Account Report
 */
async function exportTrustAccountReport(firmId, dateRange = {}, format = 'xlsx') {
  try {
    const TrustTransaction = require('../models/trustTransaction.model');
    const { start, end } = dateRange;
    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = end ? new Date(end) : new Date();

    const transactions = await TrustTransaction.find({
      firmId: sanitizeObjectId(firmId),
      date: { $gte: startDate, $lte: endDate }
    })
    .populate('clientId', 'name nameAr')
    .populate('caseId', 'caseNumber')
    .sort({ date: 1 })
    .lean();

    const data = transactions.map(txn => ({
      date: txn.date,
      clientName: txn.clientId?.name || txn.clientId?.nameAr || '',
      caseNumber: txn.caseId?.caseNumber || '',
      type: txn.type,
      description: txn.description || '',
      deposits: txn.type === 'deposit' ? txn.amount : 0,
      withdrawals: txn.type === 'withdrawal' ? txn.amount : 0,
      balance: txn.runningBalance || 0
    }));

    const columns = [
      { field: 'date', label: 'Date', labelAr: 'التاريخ', width: 15, format: 'date' },
      { field: 'clientName', label: 'Client', labelAr: 'العميل', width: 25 },
      { field: 'caseNumber', label: 'Case Number', labelAr: 'رقم القضية', width: 15 },
      { field: 'type', label: 'Type', labelAr: 'النوع', width: 12 },
      { field: 'description', label: 'Description', labelAr: 'الوصف', width: 30 },
      { field: 'deposits', label: 'Deposits', labelAr: 'الإيداعات', width: 15, format: 'currency' },
      { field: 'withdrawals', label: 'Withdrawals', labelAr: 'السحوبات', width: 15, format: 'currency' },
      { field: 'balance', label: 'Balance', labelAr: 'الرصيد', width: 15, format: 'currency' }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Trust Account' });
  } catch (error) {
    logger.error('Error exporting trust account report:', error);
    throw error;
  }
}

/**
 * Export Productivity Report
 */
async function exportProductivityReport(firmId, dateRange = {}, format = 'xlsx') {
  try {
    const User = require('../models/user.model');
    const { start, end } = dateRange;
    const startDate = start ? new Date(start) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = end ? new Date(end) : new Date();

    const users = await User.find({ firmId: sanitizeObjectId(firmId), role: { $ne: 'client' } })
      .select('firstName lastName email')
      .lean();

    const data = await Promise.all(users.map(async (user) => {
      const timeEntries = await TimeEntry.find({
        userId: user._id,
        date: { $gte: startDate, $lte: endDate }
      }).lean();

      const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const billableHours = timeEntries.filter(e => e.billable).reduce((sum, entry) => sum + (entry.duration / 60), 0);
      const revenue = timeEntries.reduce((sum, entry) => sum + (entry.amount || 0), 0);

      return {
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        totalHours: totalHours.toFixed(2),
        billableHours: billableHours.toFixed(2),
        utilizationRate: totalHours > 0 ? ((billableHours / totalHours) * 100).toFixed(2) : 0,
        revenue: revenue
      };
    }));

    const columns = [
      { field: 'name', label: 'Name', labelAr: 'الاسم', width: 25 },
      { field: 'email', label: 'Email', labelAr: 'البريد الإلكتروني', width: 25 },
      { field: 'totalHours', label: 'Total Hours', labelAr: 'إجمالي الساعات', width: 15 },
      { field: 'billableHours', label: 'Billable Hours', labelAr: 'الساعات القابلة للفوترة', width: 18 },
      { field: 'utilizationRate', label: 'Utilization %', labelAr: 'نسبة الاستخدام %', width: 15 },
      { field: 'revenue', label: 'Revenue', labelAr: 'الإيرادات', width: 15, format: 'currency' }
    ];

    return await exportByFormat(data, format, { columns, sheetName: 'Productivity' });
  } catch (error) {
    logger.error('Error exporting productivity report:', error);
    throw error;
  }
}

/**
 * Create async export job
 */
async function createExportJob(firmId, entityTypes, filters = {}, format = 'xlsx') {
  try {
    const job = await ExportJob.create({
      lawyerId: firmId, // Using firmId as the identifier
      firmId: sanitizeObjectId(firmId),
      entityType: Array.isArray(entityTypes) ? entityTypes[0] : entityTypes,
      format: format,
      filters: filters,
      status: 'pending',
      progress: 0
    });

    return job;
  } catch (error) {
    logger.error('Error creating export job:', error);
    throw error;
  }
}

/**
 * Get export job status
 */
async function getExportStatus(jobId) {
  try {
    const job = await ExportJob.findById(sanitizeObjectId(jobId)).lean();

    if (!job) {
      throw new Error('Export job not found');
    }

    return {
      id: job._id,
      status: job.status,
      progress: job.progress,
      fileUrl: job.fileUrl,
      fileName: job.fileName,
      fileSize: job.fileSize,
      totalRecords: job.totalRecords,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    };
  } catch (error) {
    logger.error('Error getting export status:', error);
    throw error;
  }
}

/**
 * Download export file
 */
async function downloadExport(jobId) {
  try {
    const job = await ExportJob.findById(sanitizeObjectId(jobId)).lean();

    if (!job) {
      throw new Error('Export job not found');
    }

    if (job.status !== 'completed') {
      throw new Error('Export job is not completed yet');
    }

    return {
      fileUrl: job.fileUrl,
      fileName: job.fileName,
      fileSize: job.fileSize
    };
  } catch (error) {
    logger.error('Error downloading export:', error);
    throw error;
  }
}

/**
 * List export history
 */
async function listExportHistory(firmId, limit = 50) {
  try {
    const jobs = await ExportJob.find({ firmId: sanitizeObjectId(firmId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return jobs.map(job => ({
      id: job._id,
      entityType: job.entityType,
      format: job.format,
      status: job.status,
      progress: job.progress,
      totalRecords: job.totalRecords,
      fileSize: job.fileSize,
      createdAt: job.createdAt,
      completedAt: job.completedAt
    }));
  } catch (error) {
    logger.error('Error listing export history:', error);
    throw error;
  }
}

/**
 * Helper function to export data in specified format
 */
async function exportByFormat(data, format, config = {}) {
  switch (format.toLowerCase()) {
    case 'xlsx':
    case 'excel':
      return await exportToExcel(data, config);
    case 'csv':
      return await exportToCSV(data, config);
    case 'json':
      return await exportToJSON(data, config);
    case 'pdf':
      return await exportToPDF(data, 'default', config);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Generate HTML from template
 */
async function generateHtmlFromTemplate(template, data, config = {}) {
  const { language = 'ar' } = config;

  // Basic template - can be enhanced with actual template files
  const direction = language === 'ar' ? 'rtl' : 'ltr';

  let html = `
<!DOCTYPE html>
<html dir="${direction}" lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Export Report</title>
    <style>
        body {
            font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, sans-serif;
            direction: ${direction};
            padding: 20px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: ${language === 'ar' ? 'right' : 'left'};
        }
        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }
        h1 {
            color: #333;
        }
    </style>
</head>
<body>
    <h1>${template.title || 'Export Report'}</h1>
    <table>
        <thead>
            <tr>
`;

  // Add headers
  if (data.length > 0) {
    Object.keys(data[0]).forEach(key => {
      html += `<th>${key}</th>`;
    });
  }

  html += `
            </tr>
        </thead>
        <tbody>
`;

  // Add data rows
  data.forEach(row => {
    html += '<tr>';
    Object.values(row).forEach(value => {
      html += `<td>${value}</td>`;
    });
    html += '</tr>';
  });

  html += `
        </tbody>
    </table>
</body>
</html>
`;

  return html;
}

module.exports = {
  exportToExcel,
  exportToPDF,
  exportToCSV,
  exportToJSON,
  exportInvoices,
  exportClients,
  exportTimeEntries,
  exportExpenses,
  exportPayments,
  exportCases,
  exportAuditLog,
  exportFinancialReport,
  exportARAgingReport,
  exportTrustAccountReport,
  exportProductivityReport,
  createExportJob,
  getExportStatus,
  downloadExport,
  listExportHistory,
  exportByFormat
};
