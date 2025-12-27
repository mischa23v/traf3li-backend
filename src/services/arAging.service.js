/**
 * AR Aging Service
 *
 * Accounts Receivable Aging report system for tracking outstanding invoices
 * and managing collections with aging buckets: Current, 1-30, 31-60, 61-90, 91-120, 120+ days
 *
 * @module services/arAging.service
 */

const mongoose = require('mongoose');
const Invoice = require('../models/invoice.model');
const Client = require('../models/client.model');
const logger = require('../utils/logger');
const { CustomException } = require('../utils');
const { fromHalalas } = require('../utils/currency');

/**
 * Aging bucket definitions
 */
const AGING_BUCKETS = {
  current: { label: 'Current (Not Due)', min: null, max: 0 },
  days_1_30: { label: '1-30 Days', min: 1, max: 30 },
  days_31_60: { label: '31-60 Days', min: 31, max: 60 },
  days_61_90: { label: '61-90 Days', min: 61, max: 90 },
  days_91_120: { label: '91-120 Days', min: 91, max: 120 },
  days_120_plus: { label: '120+ Days', min: 121, max: null }
};

/**
 * Calculate days overdue for an invoice
 * @param {Date} dueDate - Invoice due date
 * @returns {Number} Days overdue (negative if not yet due)
 */
const calculateDaysOverdue = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  const diffTime = now - due;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Determine aging bucket for an invoice
 * @param {Number} daysOverdue - Days overdue
 * @returns {String} Bucket key
 */
const getAgingBucket = (daysOverdue) => {
  if (daysOverdue < 0) return 'current';
  if (daysOverdue <= 30) return 'days_1_30';
  if (daysOverdue <= 60) return 'days_31_60';
  if (daysOverdue <= 90) return 'days_61_90';
  if (daysOverdue <= 120) return 'days_91_120';
  return 'days_120_plus';
};

/**
 * Get detailed AR aging report
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Detailed aging report
 */
const getAgingReport = async (firmId, filters = {}) => {
  try {
    logger.info('Generating AR aging report', { firmId, filters });

    // Build query for outstanding invoices
    const query = {
      firmId: new mongoose.Types.ObjectId(firmId),
      status: { $in: ['sent', 'viewed', 'partial', 'overdue'] },
      balanceDue: { $gt: 0 }
    };

    // Apply filters
    if (filters.clientId) {
      query.clientId = new mongoose.Types.ObjectId(filters.clientId);
    }
    if (filters.lawyerId) {
      query.lawyerId = new mongoose.Types.ObjectId(filters.lawyerId);
    }
    if (filters.agingBucket) {
      // Filter by specific aging bucket - will be applied after calculation
    }
    if (filters.minAmount) {
      query.balanceDue = { ...query.balanceDue, $gte: filters.minAmount };
    }
    if (filters.maxAmount) {
      query.balanceDue = { ...query.balanceDue, $lte: filters.maxAmount };
    }

    // Fetch invoices with client data
    const invoices = await Invoice.find(query)
      .populate('clientId', 'displayName fullNameArabic companyName email phone clientNumber clientType')
      .populate('lawyerId', 'firstName lastName email')
      .sort({ dueDate: 1 })
      .lean();

    // Calculate aging for each invoice
    const agingData = invoices.map(invoice => {
      const daysOverdue = calculateDaysOverdue(invoice.dueDate);
      const bucket = getAgingBucket(daysOverdue);
      const balanceDue = fromHalalas(invoice.balanceDue);

      return {
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        clientId: invoice.clientId?._id,
        clientName: invoice.clientId?.displayName || invoice.clientId?.fullNameArabic || invoice.clientId?.companyName,
        clientNumber: invoice.clientId?.clientNumber,
        clientEmail: invoice.clientId?.email,
        clientPhone: invoice.clientId?.phone,
        clientType: invoice.clientId?.clientType,
        lawyerId: invoice.lawyerId?._id,
        lawyerName: invoice.lawyerId ? `${invoice.lawyerId.firstName} ${invoice.lawyerId.lastName}` : null,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        totalAmount: fromHalalas(invoice.totalAmount),
        amountPaid: fromHalalas(invoice.amountPaid),
        balanceDue: balanceDue,
        currency: invoice.currency,
        daysOverdue: daysOverdue,
        agingBucket: bucket,
        agingBucketLabel: AGING_BUCKETS[bucket].label,
        status: invoice.status,
        lastReminderAt: invoice.email?.lastReminderAt,
        reminderCount: invoice.email?.reminderCount || 0
      };
    });

    // Apply aging bucket filter if specified
    let filteredData = agingData;
    if (filters.agingBucket) {
      filteredData = agingData.filter(item => item.agingBucket === filters.agingBucket);
    }

    // Calculate bucket totals
    const bucketTotals = {};
    Object.keys(AGING_BUCKETS).forEach(bucket => {
      const bucketItems = filteredData.filter(item => item.agingBucket === bucket);
      bucketTotals[bucket] = {
        label: AGING_BUCKETS[bucket].label,
        count: bucketItems.length,
        total: bucketItems.reduce((sum, item) => sum + item.balanceDue, 0)
      };
    });

    // Calculate overall totals
    const totalOutstanding = filteredData.reduce((sum, item) => sum + item.balanceDue, 0);
    const totalInvoices = filteredData.length;

    logger.info('AR aging report generated successfully', {
      firmId,
      totalInvoices,
      totalOutstanding
    });

    return {
      summary: {
        totalInvoices,
        totalOutstanding,
        currency: 'SAR',
        reportDate: new Date(),
        bucketTotals
      },
      invoices: filteredData,
      filters: filters
    };
  } catch (error) {
    logger.error('Error generating AR aging report:', error);
    throw error;
  }
};

/**
 * Get aging report for specific client
 * @param {ObjectId} firmId - Firm ID
 * @param {ObjectId} clientId - Client ID
 * @returns {Promise<Object>} Client aging report
 */
const getAgingByClient = async (firmId, clientId) => {
  try {
    logger.info('Generating AR aging report for client', { firmId, clientId });

    // Get client details
    const client = await Client.findOne({
      _id: new mongoose.Types.ObjectId(clientId),
      firmId: new mongoose.Types.ObjectId(firmId)
    });

    if (!client) {
      throw CustomException('Client not found', 404);
    }

    // Get aging report filtered by client
    const agingReport = await getAgingReport(firmId, { clientId });

    // Add client details
    return {
      client: {
        id: client._id,
        name: client.displayName,
        number: client.clientNumber,
        email: client.email,
        phone: client.phone,
        type: client.clientType
      },
      ...agingReport
    };
  } catch (error) {
    logger.error('Error generating client AR aging report:', error);
    throw error;
  }
};

/**
 * Get aging summary with totals per bucket
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Object>} Aging summary
 */
const getAgingSummary = async (firmId) => {
  try {
    logger.info('Generating AR aging summary', { firmId });

    const report = await getAgingReport(firmId);

    // Calculate additional metrics
    const totalInvoices = report.invoices.length;
    const avgDaysOverdue = totalInvoices > 0
      ? report.invoices.reduce((sum, inv) => sum + Math.max(0, inv.daysOverdue), 0) / totalInvoices
      : 0;

    // Calculate collection efficiency (amount paid vs total invoiced)
    const totalInvoiced = report.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = report.invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;

    // Group by client
    const clientGroups = {};
    report.invoices.forEach(inv => {
      const key = inv.clientId?.toString() || 'unknown';
      if (!clientGroups[key]) {
        clientGroups[key] = {
          clientId: inv.clientId,
          clientName: inv.clientName,
          clientNumber: inv.clientNumber,
          invoiceCount: 0,
          totalOutstanding: 0
        };
      }
      clientGroups[key].invoiceCount++;
      clientGroups[key].totalOutstanding += inv.balanceDue;
    });

    const topClients = Object.values(clientGroups)
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      .slice(0, 10);

    return {
      summary: report.summary,
      metrics: {
        avgDaysOverdue: Math.round(avgDaysOverdue),
        collectionRate: Math.round(collectionRate * 100) / 100,
        totalInvoiced,
        totalPaid
      },
      bucketDistribution: report.summary.bucketTotals,
      topClientsByOutstanding: topClients
    };
  } catch (error) {
    logger.error('Error generating AR aging summary:', error);
    throw error;
  }
};

/**
 * Get collection forecast based on historical payment patterns
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Object>} Collection forecast
 */
const getCollectionForecast = async (firmId) => {
  try {
    logger.info('Generating collection forecast', { firmId });

    // Get current aging report
    const agingReport = await getAgingReport(firmId);

    // Calculate expected collection dates based on aging buckets
    // Using conservative estimates:
    // - Current: 90% within 30 days
    // - 1-30 days: 70% within 30 days, 20% within 60 days
    // - 31-60 days: 50% within 30 days, 30% within 60 days
    // - 61-90 days: 30% within 60 days, 30% within 90 days
    // - 91-120 days: 20% within 90 days
    // - 120+ days: 10% within 120 days

    const forecast = {
      next30Days: 0,
      next60Days: 0,
      next90Days: 0,
      next120Days: 0,
      uncertain: 0
    };

    agingReport.invoices.forEach(inv => {
      const amount = inv.balanceDue;

      switch (inv.agingBucket) {
        case 'current':
          forecast.next30Days += amount * 0.9;
          forecast.next60Days += amount * 0.08;
          forecast.uncertain += amount * 0.02;
          break;
        case 'days_1_30':
          forecast.next30Days += amount * 0.7;
          forecast.next60Days += amount * 0.2;
          forecast.uncertain += amount * 0.1;
          break;
        case 'days_31_60':
          forecast.next30Days += amount * 0.5;
          forecast.next60Days += amount * 0.3;
          forecast.next90Days += amount * 0.1;
          forecast.uncertain += amount * 0.1;
          break;
        case 'days_61_90':
          forecast.next60Days += amount * 0.3;
          forecast.next90Days += amount * 0.3;
          forecast.uncertain += amount * 0.4;
          break;
        case 'days_91_120':
          forecast.next90Days += amount * 0.2;
          forecast.next120Days += amount * 0.2;
          forecast.uncertain += amount * 0.6;
          break;
        case 'days_120_plus':
          forecast.next120Days += amount * 0.1;
          forecast.uncertain += amount * 0.9;
          break;
      }
    });

    // Round values
    Object.keys(forecast).forEach(key => {
      forecast[key] = Math.round(forecast[key] * 100) / 100;
    });

    return {
      forecastDate: new Date(),
      totalOutstanding: agingReport.summary.totalOutstanding,
      expectedCollections: forecast,
      currency: 'SAR',
      note: 'Forecast based on historical collection patterns and aging bucket analysis'
    };
  } catch (error) {
    logger.error('Error generating collection forecast:', error);
    throw error;
  }
};

/**
 * Calculate collection priority score for an invoice
 * Higher score = higher priority for collection
 * @param {ObjectId} invoiceId - Invoice ID
 * @returns {Promise<Object>} Priority score and details
 */
const getCollectionPriorityScore = async (invoiceId, firmId) => {
  try {
    logger.info('Calculating collection priority score', { invoiceId });

    const invoice = await Invoice.findOne({ _id: invoiceId, firmId })
      .populate('clientId', 'displayName totalOutstanding activeCases clientTier')
      .lean();

    if (!invoice) {
      throw CustomException('Invoice not found', 404);
    }

    let score = 0;
    const factors = [];

    // Factor 1: Amount (0-30 points)
    const amount = fromHalalas(invoice.balanceDue);
    if (amount > 50000) {
      score += 30;
      factors.push({ factor: 'Large amount (>50K SAR)', points: 30 });
    } else if (amount > 20000) {
      score += 20;
      factors.push({ factor: 'Medium amount (>20K SAR)', points: 20 });
    } else if (amount > 5000) {
      score += 10;
      factors.push({ factor: 'Small amount (>5K SAR)', points: 10 });
    } else {
      score += 5;
      factors.push({ factor: 'Minimal amount (<5K SAR)', points: 5 });
    }

    // Factor 2: Days overdue (0-40 points)
    const daysOverdue = calculateDaysOverdue(invoice.dueDate);
    if (daysOverdue > 120) {
      score += 40;
      factors.push({ factor: 'Severely overdue (>120 days)', points: 40 });
    } else if (daysOverdue > 90) {
      score += 30;
      factors.push({ factor: 'Very overdue (>90 days)', points: 30 });
    } else if (daysOverdue > 60) {
      score += 20;
      factors.push({ factor: 'Overdue (>60 days)', points: 20 });
    } else if (daysOverdue > 30) {
      score += 10;
      factors.push({ factor: 'Recently overdue (>30 days)', points: 10 });
    } else if (daysOverdue > 0) {
      score += 5;
      factors.push({ factor: 'Just overdue (<30 days)', points: 5 });
    }

    // Factor 3: Client tier (0-15 points)
    if (invoice.clientId?.clientTier === 'vip') {
      score += 15;
      factors.push({ factor: 'VIP client', points: 15 });
    } else if (invoice.clientId?.clientTier === 'premium') {
      score += 10;
      factors.push({ factor: 'Premium client', points: 10 });
    } else {
      score += 5;
      factors.push({ factor: 'Standard client', points: 5 });
    }

    // Factor 4: Client total outstanding (0-10 points)
    const clientOutstanding = fromHalalas(invoice.clientId?.totalOutstanding || 0);
    if (clientOutstanding > 100000) {
      score += 10;
      factors.push({ factor: 'High client debt (>100K SAR)', points: 10 });
    } else if (clientOutstanding > 50000) {
      score += 7;
      factors.push({ factor: 'Medium client debt (>50K SAR)', points: 7 });
    } else if (clientOutstanding > 10000) {
      score += 5;
      factors.push({ factor: 'Low client debt (>10K SAR)', points: 5 });
    }

    // Factor 5: Reminder count (0-5 points)
    const reminderCount = invoice.email?.reminderCount || 0;
    if (reminderCount >= 3) {
      score += 5;
      factors.push({ factor: 'Multiple reminders sent (≥3)', points: 5 });
    } else if (reminderCount >= 1) {
      score += 3;
      factors.push({ factor: 'Reminder sent', points: 3 });
    }

    // Determine priority level
    let priorityLevel;
    if (score >= 80) {
      priorityLevel = 'critical';
    } else if (score >= 60) {
      priorityLevel = 'high';
    } else if (score >= 40) {
      priorityLevel = 'medium';
    } else {
      priorityLevel = 'low';
    }

    return {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      score,
      priorityLevel,
      factors,
      recommendations: generateCollectionRecommendations(score, daysOverdue, amount, reminderCount),
      calculatedAt: new Date()
    };
  } catch (error) {
    logger.error('Error calculating collection priority score:', error);
    throw error;
  }
};

/**
 * Generate collection recommendations based on score and factors
 * @private
 */
const generateCollectionRecommendations = (score, daysOverdue, amount, reminderCount) => {
  const recommendations = [];

  if (score >= 80) {
    recommendations.push('Immediate escalation to legal action recommended');
    recommendations.push('Consider engaging collection agency');
  } else if (score >= 60) {
    recommendations.push('Schedule direct phone call with client');
    recommendations.push('Send formal demand letter');
  } else if (score >= 40) {
    recommendations.push('Send payment reminder email');
    recommendations.push('Offer payment plan if applicable');
  } else {
    recommendations.push('Send friendly reminder');
    recommendations.push('Monitor for next 7 days');
  }

  if (daysOverdue > 90 && reminderCount < 2) {
    recommendations.push('Increase reminder frequency');
  }

  if (amount > 20000) {
    recommendations.push('Assign dedicated collection manager');
  }

  return recommendations;
};

/**
 * Export aging report to Excel format
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Excel file data
 */
const exportAgingReportToExcel = async (firmId, filters = {}) => {
  try {
    logger.info('Exporting AR aging report to Excel', { firmId, filters });

    const report = await getAgingReport(firmId, filters);

    // Structure data for Excel export
    const excelData = {
      sheets: [
        {
          name: 'Aging Summary',
          data: [
            ['AR Aging Report'],
            ['Generated:', new Date().toISOString()],
            [''],
            ['Summary'],
            ['Total Invoices:', report.summary.totalInvoices],
            ['Total Outstanding:', report.summary.totalOutstanding, 'SAR'],
            [''],
            ['Aging Bucket', 'Count', 'Total Amount (SAR)'],
            ...Object.entries(report.summary.bucketTotals).map(([key, bucket]) => [
              bucket.label,
              bucket.count,
              bucket.total
            ])
          ]
        },
        {
          name: 'Invoice Details',
          data: [
            [
              'Invoice Number',
              'Client Name',
              'Client Number',
              'Issue Date',
              'Due Date',
              'Days Overdue',
              'Total Amount',
              'Amount Paid',
              'Balance Due',
              'Aging Bucket',
              'Status'
            ],
            ...report.invoices.map(inv => [
              inv.invoiceNumber,
              inv.clientName,
              inv.clientNumber,
              new Date(inv.issueDate).toLocaleDateString(),
              new Date(inv.dueDate).toLocaleDateString(),
              inv.daysOverdue,
              inv.totalAmount,
              inv.amountPaid,
              inv.balanceDue,
              inv.agingBucketLabel,
              inv.status
            ])
          ]
        }
      ],
      metadata: {
        filename: `AR_Aging_Report_${new Date().toISOString().split('T')[0]}.xlsx`,
        format: 'excel'
      }
    };

    return excelData;
  } catch (error) {
    logger.error('Error exporting AR aging report to Excel:', error);
    throw error;
  }
};

/**
 * Export aging report to PDF format
 * @param {ObjectId} firmId - Firm ID
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} PDF file data
 */
const exportAgingReportToPDF = async (firmId, filters = {}) => {
  try {
    logger.info('Exporting AR aging report to PDF', { firmId, filters });

    const report = await getAgingReport(firmId, filters);

    // Structure data for PDF export
    const pdfData = {
      title: 'Accounts Receivable Aging Report',
      date: new Date().toLocaleDateString(),
      summary: report.summary,
      invoices: report.invoices,
      metadata: {
        filename: `AR_Aging_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        format: 'pdf'
      }
    };

    return pdfData;
  } catch (error) {
    logger.error('Error exporting AR aging report to PDF:', error);
    throw error;
  }
};

/**
 * Export aging report (wrapper for multiple formats)
 * @param {ObjectId} firmId - Firm ID
 * @param {String} format - Export format ('excel' or 'pdf')
 * @param {Object} filters - Filter options
 * @returns {Promise<Object>} Export data
 */
const exportAgingReport = async (firmId, format = 'excel', filters = {}) => {
  try {
    if (format === 'excel') {
      return await exportAgingReportToExcel(firmId, filters);
    } else if (format === 'pdf') {
      return await exportAgingReportToPDF(firmId, filters);
    } else {
      throw CustomException('Invalid export format. Use "excel" or "pdf"', 400);
    }
  } catch (error) {
    logger.error('Error exporting AR aging report:', error);
    throw error;
  }
};

module.exports = {
  getAgingReport,
  getAgingByClient,
  getAgingSummary,
  getCollectionForecast,
  getCollectionPriorityScore,
  exportAgingReport,
  AGING_BUCKETS
};
