/**
 * Report Queue Processor
 *
 * Handles generation of large/complex reports that may take significant time.
 * Supports financial reports, analytics, exports, and custom reports.
 */

const { createQueue } = require('../configs/queue');

// Create report queue
const reportQueue = createQueue('report', {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 10000
    },
    removeOnComplete: {
      age: 604800, // Keep for 7 days
      count: 100
    },
    timeout: 300000 // 5 minutes timeout
  },
  settings: {
    lockDuration: 300000
  }
});

/**
 * Process report jobs
 */
reportQueue.process(async (job) => {
  const { type, data } = job.data;

  console.log(`📊 Processing report job ${job.id} of type: ${type}`);

  try {
    switch (type) {
      case 'financial':
        return await generateFinancialReport(data, job);

      case 'analytics':
        return await generateAnalyticsReport(data, job);

      case 'time-utilization':
        return await generateTimeUtilizationReport(data, job);

      case 'client-aging':
        return await generateClientAgingReport(data, job);

      case 'custom':
        return await generateCustomReport(data, job);

      case 'data-export':
        return await generateDataExport(data, job);

      default:
        throw new Error(`Unknown report type: ${type}`);
    }
  } catch (error) {
    console.error(`❌ Report job ${job.id} failed:`, error.message);
    throw error;
  }
});

/**
 * Generate financial report
 */
async function generateFinancialReport(data, job) {
  const { firmId, startDate, endDate, reportType, format } = data;

  await job.progress(10);

  // Import models
  const { Invoice, Payment, Expense } = require('../models');

  await job.progress(20);

  // Fetch invoices
  const invoices = await Invoice.find({
    firmId,
    issueDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
  }).populate('clientId', 'name');

  await job.progress(40);

  // Fetch payments
  const payments = await Payment.find({
    firmId,
    paymentDate: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });

  await job.progress(60);

  // Fetch expenses
  const expenses = await Expense.find({
    firmId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });

  await job.progress(70);

  // Calculate metrics
  const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalPayments = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const reportData = {
    period: { startDate, endDate },
    summary: {
      totalRevenue,
      totalPayments,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      outstandingBalance: totalRevenue - totalPayments
    },
    invoices: invoices.length,
    payments: payments.length,
    expenses: expenses.length
  };

  await job.progress(90);

  // Save report
  const SavedReport = require('../models/savedReport.model');
  const report = await SavedReport.create({
    firmId,
    reportType: 'financial',
    data: reportData,
    generatedAt: new Date()
  });

  await job.progress(100);

  console.log(`✅ Financial report generated: ${report._id}`);
  return {
    success: true,
    reportId: report._id,
    reportType: 'financial',
    summary: reportData.summary
  };
}

/**
 * Generate analytics report
 */
async function generateAnalyticsReport(data, job) {
  const { firmId, startDate, endDate, metrics } = data;

  await job.progress(10);

  const { Case, Client, TimeEntry } = require('../models');

  await job.progress(20);

  // Fetch cases
  const cases = await Case.find({
    firmId,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });

  await job.progress(40);

  // Fetch clients
  const clients = await Client.find({
    firmId,
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });

  await job.progress(60);

  // Fetch time entries
  const timeEntries = await TimeEntry.find({
    firmId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });

  await job.progress(80);

  const reportData = {
    period: { startDate, endDate },
    metrics: {
      totalCases: cases.length,
      newClients: clients.length,
      totalHoursBilled: timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0) / 60,
      casesByStatus: groupBy(cases, 'status'),
      casesByType: groupBy(cases, 'type')
    }
  };

  await job.progress(90);

  const SavedReport = require('../models/savedReport.model');
  const report = await SavedReport.create({
    firmId,
    reportType: 'analytics',
    data: reportData,
    generatedAt: new Date()
  });

  await job.progress(100);

  console.log(`✅ Analytics report generated: ${report._id}`);
  return {
    success: true,
    reportId: report._id,
    reportType: 'analytics',
    metrics: reportData.metrics
  };
}

/**
 * Generate time utilization report
 */
async function generateTimeUtilizationReport(data, job) {
  const { firmId, startDate, endDate, staffIds } = data;

  await job.progress(10);

  const { TimeEntry, User } = require('../models');

  await job.progress(20);

  const query = {
    firmId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  };

  if (staffIds && staffIds.length > 0) {
    query.userId = { $in: staffIds };
  }

  const timeEntries = await TimeEntry.find(query).populate('userId', 'name');

  await job.progress(60);

  // Group by user
  const byUser = {};
  timeEntries.forEach(entry => {
    const userId = entry.userId._id.toString();
    if (!byUser[userId]) {
      byUser[userId] = {
        name: entry.userId.name,
        totalMinutes: 0,
        billableMinutes: 0,
        nonBillableMinutes: 0,
        entries: 0
      };
    }
    byUser[userId].totalMinutes += entry.duration || 0;
    byUser[userId].entries += 1;
    if (entry.isBillable) {
      byUser[userId].billableMinutes += entry.duration || 0;
    } else {
      byUser[userId].nonBillableMinutes += entry.duration || 0;
    }
  });

  await job.progress(80);

  const reportData = {
    period: { startDate, endDate },
    summary: {
      totalEntries: timeEntries.length,
      totalHours: timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0) / 60
    },
    byUser
  };

  await job.progress(90);

  const SavedReport = require('../models/savedReport.model');
  const report = await SavedReport.create({
    firmId,
    reportType: 'time-utilization',
    data: reportData,
    generatedAt: new Date()
  });

  await job.progress(100);

  console.log(`✅ Time utilization report generated: ${report._id}`);
  return {
    success: true,
    reportId: report._id,
    reportType: 'time-utilization'
  };
}

/**
 * Generate client aging report
 */
async function generateClientAgingReport(data, job) {
  const { firmId } = data;

  await job.progress(10);

  const { Invoice } = require('../models');

  await job.progress(20);

  const unpaidInvoices = await Invoice.find({
    firmId,
    status: { $in: ['pending', 'overdue'] }
  }).populate('clientId', 'name email');

  await job.progress(60);

  // Group by aging period
  const now = new Date();
  const aging = {
    current: [],
    '30days': [],
    '60days': [],
    '90days': [],
    '90plus': []
  };

  unpaidInvoices.forEach(invoice => {
    const daysPastDue = Math.floor((now - new Date(invoice.dueDate)) / (1000 * 60 * 60 * 24));

    if (daysPastDue < 0) {
      aging.current.push(invoice);
    } else if (daysPastDue <= 30) {
      aging['30days'].push(invoice);
    } else if (daysPastDue <= 60) {
      aging['60days'].push(invoice);
    } else if (daysPastDue <= 90) {
      aging['90days'].push(invoice);
    } else {
      aging['90plus'].push(invoice);
    }
  });

  await job.progress(80);

  const reportData = {
    generatedAt: now,
    summary: {
      total: unpaidInvoices.length,
      current: aging.current.length,
      '30days': aging['30days'].length,
      '60days': aging['60days'].length,
      '90days': aging['90days'].length,
      '90plus': aging['90plus'].length
    },
    aging
  };

  await job.progress(90);

  const SavedReport = require('../models/savedReport.model');
  const report = await SavedReport.create({
    firmId,
    reportType: 'client-aging',
    data: reportData,
    generatedAt: new Date()
  });

  await job.progress(100);

  console.log(`✅ Client aging report generated: ${report._id}`);
  return {
    success: true,
    reportId: report._id,
    reportType: 'client-aging',
    summary: reportData.summary
  };
}

/**
 * Generate custom report
 */
async function generateCustomReport(data, job) {
  const { firmId, query, aggregation, name } = data;

  await job.progress(20);

  // Execute custom query/aggregation
  // This is a placeholder - implement based on your needs

  await job.progress(60);

  const reportData = {
    name,
    generatedAt: new Date(),
    results: [] // Results from custom query
  };

  await job.progress(80);

  const SavedReport = require('../models/savedReport.model');
  const report = await SavedReport.create({
    firmId,
    reportType: 'custom',
    name,
    data: reportData,
    generatedAt: new Date()
  });

  await job.progress(100);

  console.log(`✅ Custom report generated: ${report._id}`);
  return {
    success: true,
    reportId: report._id,
    reportType: 'custom'
  };
}

/**
 * Generate data export
 */
async function generateDataExport(data, job) {
  const { firmId, exportType, format, filters } = data;

  await job.progress(10);

  const fs = require('fs').promises;
  const path = require('path');

  // Fetch data based on export type
  let exportData;
  switch (exportType) {
    case 'invoices':
      const { Invoice } = require('../models');
      exportData = await Invoice.find({ firmId, ...filters });
      break;
    case 'clients':
      const { Client } = require('../models');
      exportData = await Client.find({ firmId, ...filters });
      break;
    case 'cases':
      const { Case } = require('../models');
      exportData = await Case.find({ firmId, ...filters });
      break;
    default:
      throw new Error(`Unknown export type: ${exportType}`);
  }

  await job.progress(50);

  // Convert to requested format
  let fileContent;
  let fileExtension;

  if (format === 'csv') {
    fileContent = convertToCSV(exportData);
    fileExtension = 'csv';
  } else if (format === 'json') {
    fileContent = JSON.stringify(exportData, null, 2);
    fileExtension = 'json';
  }

  await job.progress(80);

  // Save file
  const fileName = `export-${exportType}-${Date.now()}.${fileExtension}`;
  const exportsDir = path.join(__dirname, '../../uploads/exports');
  await fs.mkdir(exportsDir, { recursive: true });
  const filePath = path.join(exportsDir, fileName);
  await fs.writeFile(filePath, fileContent);

  await job.progress(100);

  console.log(`✅ Data export generated: ${fileName}`);
  return {
    success: true,
    exportType,
    format,
    fileName,
    filePath,
    recordCount: exportData.length
  };
}

/**
 * Helper: Group array by property
 */
function groupBy(array, property) {
  return array.reduce((acc, obj) => {
    const key = obj[property] || 'unknown';
    if (!acc[key]) {
      acc[key] = 0;
    }
    acc[key]++;
    return acc;
  }, {});
}

/**
 * Helper: Convert array to CSV
 */
function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).map(val =>
    typeof val === 'string' ? `"${val}"` : val
  ).join(','));

  return [headers, ...rows].join('\n');
}

module.exports = reportQueue;
