/**
 * Unified Data Flow Routes
 *
 * Provides consolidated data endpoints for seamless dashboard integration.
 * Combines data from multiple modules for efficient frontend consumption.
 *
 * Features:
 * - Billable items aggregation
 * - Open invoices summary
 * - Financial summary
 * - Client-case-invoice relationships
 * - HR dashboard data
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Models
const TimeEntry = require('../models/timeEntry.model');
const Invoice = require('../models/invoice.model');
const Payment = require('../models/payment.model');
const Case = require('../models/case.model');
const Client = require('../models/client.model');
const Employee = require('../models/employee.model');
const LeaveRequest = require('../models/leaveRequest.model');
const Attendance = require('../models/attendanceRecord.model');
const PayrollRun = require('../models/payrollRun.model');

// Apply authentication to all routes
router.use(verifyToken);
router.use(attachFirmContext);
router.use(apiRateLimiter);

// ==================== BILLABLE ITEMS ====================

/**
 * @route   GET /api/unified/billable-items
 * @desc    Get all unbilled time entries and expenses
 * @access  Private
 */
router.get('/billable-items', async (req, res) => {
  try {
    const { clientId, caseId, startDate, endDate } = req.query;

    const query = {
      firmId: req.firmId,
      isBillable: true,
      status: { $in: ['approved', 'submitted'] },
      invoiceId: { $exists: false }
    };

    if (clientId) query.clientId = clientId;
    if (caseId) query.caseId = caseId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const timeEntries = await TimeEntry.find(query)
      .populate('clientId', 'name nameAr clientId')
      .populate('caseId', 'caseNumber title')
      .populate('userId', 'name email')
      .sort({ date: -1 });

    // Calculate totals
    const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const totalAmount = timeEntries.reduce((sum, entry) => sum + ((entry.duration || 0) * (entry.rate || 0)), 0);

    // Group by client
    const byClient = {};
    timeEntries.forEach(entry => {
      const clientKey = entry.clientId?._id?.toString() || 'unknown';
      if (!byClient[clientKey]) {
        byClient[clientKey] = {
          client: entry.clientId,
          entries: [],
          totalHours: 0,
          totalAmount: 0
        };
      }
      byClient[clientKey].entries.push(entry);
      byClient[clientKey].totalHours += entry.duration || 0;
      byClient[clientKey].totalAmount += (entry.duration || 0) * (entry.rate || 0);
    });

    res.json({
      success: true,
      data: {
        entries: timeEntries,
        summary: {
          totalEntries: timeEntries.length,
          totalHours,
          totalAmount,
          currency: 'SAR'
        },
        byClient: Object.values(byClient)
      }
    });
  } catch (error) {
    console.error('Error fetching billable items:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== OPEN INVOICES ====================

/**
 * @route   GET /api/unified/open-invoices
 * @desc    Get all unpaid invoices with aging analysis
 * @access  Private
 */
router.get('/open-invoices', async (req, res) => {
  try {
    const { clientId } = req.query;

    const query = {
      firmId: req.firmId,
      status: { $in: ['sent', 'overdue', 'partially_paid'] }
    };

    if (clientId) query.clientId = clientId;

    const invoices = await Invoice.find(query)
      .populate('clientId', 'name nameAr clientId email')
      .populate('caseId', 'caseNumber title')
      .sort({ dueDate: 1 });

    // Calculate aging
    const now = new Date();
    const aging = {
      current: { count: 0, amount: 0 },
      days1_30: { count: 0, amount: 0 },
      days31_60: { count: 0, amount: 0 },
      days61_90: { count: 0, amount: 0 },
      over90: { count: 0, amount: 0 }
    };

    let totalOutstanding = 0;

    invoices.forEach(invoice => {
      const balance = invoice.totalAmount - (invoice.paidAmount || 0);
      totalOutstanding += balance;

      const daysOverdue = invoice.dueDate
        ? Math.floor((now - invoice.dueDate) / (1000 * 60 * 60 * 24))
        : 0;

      if (daysOverdue <= 0) {
        aging.current.count++;
        aging.current.amount += balance;
      } else if (daysOverdue <= 30) {
        aging.days1_30.count++;
        aging.days1_30.amount += balance;
      } else if (daysOverdue <= 60) {
        aging.days31_60.count++;
        aging.days31_60.amount += balance;
      } else if (daysOverdue <= 90) {
        aging.days61_90.count++;
        aging.days61_90.amount += balance;
      } else {
        aging.over90.count++;
        aging.over90.amount += balance;
      }
    });

    res.json({
      success: true,
      data: {
        invoices,
        summary: {
          totalInvoices: invoices.length,
          totalOutstanding,
          currency: 'SAR'
        },
        aging
      }
    });
  } catch (error) {
    console.error('Error fetching open invoices:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== FINANCIAL SUMMARY ====================

/**
 * @route   GET /api/unified/financial-summary
 * @desc    Get comprehensive financial summary
 * @access  Private
 */
router.get('/financial-summary', async (req, res) => {
  try {
    const { year, month } = req.query;
    const firmId = mongoose.Types.ObjectId(req.firmId);

    // Date range for current period
    const currentYear = parseInt(year) || new Date().getFullYear();
    const currentMonth = month ? parseInt(month) - 1 : new Date().getMonth();

    const periodStart = new Date(currentYear, currentMonth, 1);
    const periodEnd = new Date(currentYear, currentMonth + 1, 0);

    // Year to date
    const ytdStart = new Date(currentYear, 0, 1);
    const ytdEnd = periodEnd;

    // Invoice stats
    const invoiceStats = await Invoice.aggregate([
      {
        $match: {
          firmId,
          invoiceDate: { $gte: periodStart, $lte: periodEnd }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Payment stats
    const paymentStats = await Payment.aggregate([
      {
        $match: {
          firmId,
          paymentDate: { $gte: periodStart, $lte: periodEnd },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          total: { $sum: '$amount' }
        }
      }
    ]);

    // YTD revenue
    const ytdRevenue = await Payment.aggregate([
      {
        $match: {
          firmId,
          paymentDate: { $gte: ytdStart, $lte: ytdEnd },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly trend (last 12 months)
    const yearAgo = new Date(currentYear - 1, currentMonth + 1, 1);
    const monthlyTrend = await Payment.aggregate([
      {
        $match: {
          firmId,
          paymentDate: { $gte: yearAgo, $lte: periodEnd },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$paymentDate' },
            month: { $month: '$paymentDate' }
          },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Outstanding balance
    const outstandingBalance = await Invoice.aggregate([
      {
        $match: {
          firmId,
          status: { $in: ['sent', 'overdue', 'partially_paid'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Billable hours
    const billableHours = await TimeEntry.aggregate([
      {
        $match: {
          firmId,
          date: { $gte: periodStart, $lte: periodEnd },
          isBillable: true
        }
      },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$duration' },
          billedHours: {
            $sum: {
              $cond: [{ $ifNull: ['$invoiceId', false] }, '$duration', 0]
            }
          },
          unbilledHours: {
            $sum: {
              $cond: [{ $ifNull: ['$invoiceId', false] }, 0, '$duration']
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: {
          year: currentYear,
          month: currentMonth + 1,
          start: periodStart,
          end: periodEnd
        },
        invoices: {
          byStatus: invoiceStats,
          total: invoiceStats.reduce((sum, s) => sum + s.total, 0),
          count: invoiceStats.reduce((sum, s) => sum + s.count, 0)
        },
        payments: {
          byMethod: paymentStats,
          total: paymentStats.reduce((sum, s) => sum + s.total, 0),
          count: paymentStats.reduce((sum, s) => sum + s.count, 0)
        },
        ytd: {
          revenue: ytdRevenue[0]?.total || 0,
          paymentCount: ytdRevenue[0]?.count || 0
        },
        outstanding: {
          balance: outstandingBalance[0]?.total || 0,
          invoiceCount: outstandingBalance[0]?.count || 0
        },
        billableHours: billableHours[0] || { totalHours: 0, billedHours: 0, unbilledHours: 0 },
        monthlyTrend,
        currency: 'SAR'
      }
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CLIENT PORTFOLIO ====================

/**
 * @route   GET /api/unified/client-portfolio/:clientId
 * @desc    Get complete client portfolio with all related data
 * @access  Private
 */
router.get('/client-portfolio/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const firmId = req.firmId;

    // Get client details
    const client = await Client.findOne({ _id: clientId, firmId });
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Get all cases for this client
    const cases = await Case.find({ clientId, firmId })
      .select('caseNumber title status caseType openDate closeDate')
      .sort({ openDate: -1 });

    // Get all invoices
    const invoices = await Invoice.find({ clientId, firmId })
      .select('invoiceNumber invoiceDate dueDate totalAmount paidAmount status')
      .sort({ invoiceDate: -1 });

    // Get all payments
    const payments = await Payment.find({ clientId, firmId, status: 'completed' })
      .select('paymentDate amount paymentMethod referenceNumber')
      .sort({ paymentDate: -1 });

    // Calculate stats
    const totalBilled = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);
    const outstandingBalance = totalBilled - totalPaid;

    // Get unbilled hours
    const unbilledHours = await TimeEntry.aggregate([
      {
        $match: {
          firmId: mongoose.Types.ObjectId(firmId),
          clientId: mongoose.Types.ObjectId(clientId),
          isBillable: true,
          invoiceId: { $exists: false }
        }
      },
      {
        $group: {
          _id: null,
          hours: { $sum: '$duration' },
          amount: { $sum: { $multiply: ['$duration', '$rate'] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        client,
        cases: {
          list: cases,
          total: cases.length,
          active: cases.filter(c => c.status === 'active').length
        },
        invoices: {
          list: invoices,
          total: invoices.length,
          totalBilled,
          totalPaid,
          outstandingBalance
        },
        payments: {
          list: payments,
          total: payments.length,
          totalAmount: payments.reduce((sum, p) => sum + p.amount, 0)
        },
        unbilled: unbilledHours[0] || { hours: 0, amount: 0 },
        currency: 'SAR'
      }
    });
  } catch (error) {
    console.error('Error fetching client portfolio:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== HR DASHBOARD DATA ====================

/**
 * @route   GET /api/unified/hr-dashboard
 * @desc    Get comprehensive HR dashboard data
 * @access  Private
 */
router.get('/hr-dashboard', async (req, res) => {
  try {
    const firmId = mongoose.Types.ObjectId(req.firmId);
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Employee stats
    const employeeStats = await Employee.aggregate([
      { $match: { firmId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalEmployees = employeeStats.reduce((sum, s) => sum + s.count, 0);
    const activeEmployees = employeeStats.find(s => s._id === 'active')?.count || 0;

    // Leave requests this month
    const leaveStats = await LeaveRequest.aggregate([
      {
        $match: {
          firmId,
          startDate: { $lte: endOfMonth },
          endDate: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Attendance today
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const attendanceStats = await Attendance.aggregate([
      {
        $match: {
          firmId,
          date: { $gte: todayStart, $lte: todayEnd }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Upcoming birthdays (next 30 days)
    const upcomingBirthdays = await Employee.aggregate([
      {
        $match: {
          firmId,
          status: 'active',
          dateOfBirth: { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          employeeId: 1,
          dateOfBirth: 1,
          birthdayThisYear: {
            $dateFromParts: {
              year: { $year: today },
              month: { $month: '$dateOfBirth' },
              day: { $dayOfMonth: '$dateOfBirth' }
            }
          }
        }
      },
      {
        $match: {
          birthdayThisYear: {
            $gte: today,
            $lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
          }
        }
      },
      { $sort: { birthdayThisYear: 1 } },
      { $limit: 10 }
    ]);

    // Probation ending (next 30 days)
    const probationEnding = await Employee.find({
      firmId: req.firmId,
      status: 'active',
      probationEndDate: {
        $gte: today,
        $lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      }
    })
      .select('employeeId firstName lastName probationEndDate')
      .sort({ probationEndDate: 1 })
      .limit(10);

    // Recent payroll
    const recentPayroll = await PayrollRun.find({ firmId: req.firmId })
      .select('periodStart periodEnd status totalNetPay employeeCount')
      .sort({ createdAt: -1 })
      .limit(3);

    res.json({
      success: true,
      data: {
        employees: {
          total: totalEmployees,
          active: activeEmployees,
          byStatus: employeeStats
        },
        leave: {
          thisMonth: leaveStats,
          pendingApproval: leaveStats.find(s => s._id === 'pending')?.count || 0
        },
        attendance: {
          today: attendanceStats,
          present: attendanceStats.find(s => s._id === 'present')?.count || 0,
          absent: activeEmployees - (attendanceStats.find(s => s._id === 'present')?.count || 0)
        },
        alerts: {
          upcomingBirthdays,
          probationEnding
        },
        payroll: recentPayroll
      }
    });
  } catch (error) {
    console.error('Error fetching HR dashboard:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CASE FINANCIAL SUMMARY ====================

/**
 * @route   GET /api/unified/case-financials/:caseId
 * @desc    Get financial summary for a specific case
 * @access  Private
 */
router.get('/case-financials/:caseId', async (req, res) => {
  try {
    const { caseId } = req.params;
    const firmId = req.firmId;

    // Get case details
    const caseDoc = await Case.findOne({ _id: caseId, firmId })
      .populate('clientId', 'name nameAr clientId');

    if (!caseDoc) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    // Time entries
    const timeEntries = await TimeEntry.aggregate([
      {
        $match: {
          firmId: mongoose.Types.ObjectId(firmId),
          caseId: mongoose.Types.ObjectId(caseId)
        }
      },
      {
        $group: {
          _id: '$isBillable',
          hours: { $sum: '$duration' },
          amount: { $sum: { $multiply: ['$duration', '$rate'] } }
        }
      }
    ]);

    const billable = timeEntries.find(t => t._id === true) || { hours: 0, amount: 0 };
    const nonBillable = timeEntries.find(t => t._id === false) || { hours: 0, amount: 0 };

    // Invoices
    const invoices = await Invoice.find({ caseId, firmId })
      .select('invoiceNumber invoiceDate totalAmount paidAmount status');

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

    // Unbilled time
    const unbilledTime = await TimeEntry.aggregate([
      {
        $match: {
          firmId: mongoose.Types.ObjectId(firmId),
          caseId: mongoose.Types.ObjectId(caseId),
          isBillable: true,
          invoiceId: { $exists: false }
        }
      },
      {
        $group: {
          _id: null,
          hours: { $sum: '$duration' },
          amount: { $sum: { $multiply: ['$duration', '$rate'] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        case: {
          _id: caseDoc._id,
          caseNumber: caseDoc.caseNumber,
          title: caseDoc.title,
          client: caseDoc.clientId
        },
        timeTracking: {
          billable,
          nonBillable,
          total: {
            hours: billable.hours + nonBillable.hours,
            amount: billable.amount
          }
        },
        invoicing: {
          invoices,
          totalInvoiced,
          totalPaid,
          outstanding: totalInvoiced - totalPaid
        },
        unbilled: unbilledTime[0] || { hours: 0, amount: 0 },
        profitability: {
          revenue: totalPaid,
          estimatedValue: billable.amount,
          unbilledValue: unbilledTime[0]?.amount || 0
        },
        currency: 'SAR'
      }
    });
  } catch (error) {
    console.error('Error fetching case financials:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
