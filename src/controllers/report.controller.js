const { Report, Invoice, Expense, TimeEntry, Payment, Case, Client } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Generate report
 * POST /api/reports/generate
 */
const generateReport = asyncHandler(async (req, res) => {
    const {
        reportName,
        reportType,
        startDate,
        endDate,
        filters = {},
        outputFormat = 'pdf',
        emailRecipients = []
    } = req.body;

    const userId = req.userID;

    // Validate required fields
    if (!reportName || !reportType) {
        throw new CustomException('اسم التقرير ونوعه مطلوبان', 400);
    }

    const validReportTypes = [
        'revenue',
        'aging',
        'realization',
        'collections',
        'productivity',
        'profitability',
        'time_utilization',
        'tax',
        'custom'
    ];

    if (!validReportTypes.includes(reportType)) {
        throw new CustomException('نوع التقرير غير صالح', 400);
    }

    // Date validation
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        throw new CustomException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية', 400);
    }

    // Generate report data based on type
    let reportData;

    switch (reportType) {
        case 'revenue':
            reportData = await generateRevenueReport(userId, startDate, endDate, filters);
            break;
        case 'aging':
            reportData = await generateAgingReport(userId, filters);
            break;
        case 'collections':
            reportData = await generateCollectionsReport(userId, startDate, endDate, filters);
            break;
        case 'productivity':
            reportData = await generateProductivityReport(userId, startDate, endDate, filters);
            break;
        case 'profitability':
            reportData = await generateProfitabilityReport(userId, startDate, endDate, filters);
            break;
        case 'time_utilization':
            reportData = await generateTimeUtilizationReport(userId, startDate, endDate, filters);
            break;
        case 'tax':
            reportData = await generateTaxReport(userId, startDate, endDate, filters);
            break;
        default:
            reportData = { message: 'Custom report - data not generated' };
    }

    // Create report record
    const report = await Report.create({
        reportName,
        reportType,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        filters,
        createdBy: userId,
        outputFormat,
        emailRecipients,
        lastRun: new Date()
    });

    // TODO: Generate PDF/Excel/CSV file and upload to cloud storage
    // report.outputUrl = await generateReportFile(report, reportData);
    // await report.save();

    res.status(201).json({
        success: true,
        message: 'تم إنشاء التقرير بنجاح',
        report,
        data: reportData
    });
});

/**
 * Get reports
 * GET /api/reports
 */
const getReports = asyncHandler(async (req, res) => {
    const {
        reportType,
        isScheduled,
        page = 1,
        limit = 20
    } = req.query;

    const userId = req.userID;
    const query = { createdBy: userId };

    if (reportType) query.reportType = reportType;
    if (isScheduled !== undefined) query.isScheduled = isScheduled === 'true';

    const reports = await Report.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Report.countDocuments(query);

    res.status(200).json({
        success: true,
        data: reports,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Get single report
 * GET /api/reports/:id
 */
const getReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const report = await Report.findById(id).populate('createdBy', 'username email');

    if (!report) {
        throw new CustomException('التقرير غير موجود', 404);
    }

    if (report.createdBy._id.toString() !== userId && !report.isPublic) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقرير', 403);
    }

    res.status(200).json({
        success: true,
        data: report
    });
});

/**
 * Delete report
 * DELETE /api/reports/:id
 */
const deleteReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const report = await Report.findById(id);

    if (!report) {
        throw new CustomException('التقرير غير موجود', 404);
    }

    if (report.createdBy.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقرير', 403);
    }

    await Report.findByIdAndDelete(id);

    res.status(200).json({
        success: true,
        message: 'تم حذف التقرير بنجاح'
    });
});

/**
 * Get report templates
 * GET /api/reports/templates
 */
const getReportTemplates = asyncHandler(async (req, res) => {
    const templates = [
        {
            type: 'revenue',
            name: 'تقرير الإيرادات',
            description: 'تحليل شامل للإيرادات حسب الفترة الزمنية',
            requiredFields: ['startDate', 'endDate'],
            optionalFields: ['clientId', 'caseId']
        },
        {
            type: 'aging',
            name: 'تقرير الفواتير المتأخرة',
            description: 'تحليل الفواتير غير المدفوعة حسب فترات التأخير',
            requiredFields: [],
            optionalFields: ['clientId']
        },
        {
            type: 'collections',
            name: 'تقرير التحصيلات',
            description: 'تقرير المدفوعات المحصلة',
            requiredFields: ['startDate', 'endDate'],
            optionalFields: ['clientId', 'paymentMethod']
        },
        {
            type: 'productivity',
            name: 'تقرير الإنتاجية',
            description: 'تحليل الساعات المسجلة والإنتاجية',
            requiredFields: ['startDate', 'endDate'],
            optionalFields: ['caseId']
        },
        {
            type: 'profitability',
            name: 'تقرير الربحية',
            description: 'تحليل الأرباح والخسائر',
            requiredFields: ['startDate', 'endDate'],
            optionalFields: ['caseId', 'clientId']
        },
        {
            type: 'time_utilization',
            name: 'تقرير استخدام الوقت',
            description: 'تحليل توزيع الوقت على القضايا والأنشطة',
            requiredFields: ['startDate', 'endDate'],
            optionalFields: []
        },
        {
            type: 'tax',
            name: 'تقرير الضرائب',
            description: 'تقرير ضريبة القيمة المضافة (15%)',
            requiredFields: ['startDate', 'endDate'],
            optionalFields: []
        }
    ];

    res.status(200).json({
        success: true,
        templates
    });
});

/**
 * Schedule report
 * POST /api/reports/:id/schedule
 */
const scheduleReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { scheduleFrequency, emailRecipients } = req.body;
    const userId = req.userID;

    const report = await Report.findById(id);

    if (!report) {
        throw new CustomException('التقرير غير موجود', 404);
    }

    if (report.createdBy.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقرير', 403);
    }

    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
    if (!validFrequencies.includes(scheduleFrequency)) {
        throw new CustomException('تكرار الجدولة غير صالح', 400);
    }

    report.isScheduled = true;
    report.scheduleFrequency = scheduleFrequency;
    if (emailRecipients) report.emailRecipients = emailRecipients;

    // Calculate next run date
    const now = new Date();
    switch (scheduleFrequency) {
        case 'daily':
            report.nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
        case 'weekly':
            report.nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
        case 'monthly':
            report.nextRun = new Date(now.setMonth(now.getMonth() + 1));
            break;
        case 'quarterly':
            report.nextRun = new Date(now.setMonth(now.getMonth() + 3));
            break;
    }

    await report.save();

    res.status(200).json({
        success: true,
        message: 'تم جدولة التقرير بنجاح',
        report
    });
});

/**
 * Unschedule report
 * DELETE /api/reports/:id/schedule
 */
const unscheduleReport = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.userID;

    const report = await Report.findById(id);

    if (!report) {
        throw new CustomException('التقرير غير موجود', 404);
    }

    if (report.createdBy.toString() !== userId) {
        throw new CustomException('لا يمكنك الوصول إلى هذا التقرير', 403);
    }

    report.isScheduled = false;
    report.scheduleFrequency = undefined;
    report.nextRun = undefined;

    await report.save();

    res.status(200).json({
        success: true,
        message: 'تم إلغاء جدولة التقرير بنجاح',
        report
    });
});

// ==================== Report Generation Helper Functions ====================

/**
 * Generate Revenue Report
 */
async function generateRevenueReport(userId, startDate, endDate, filters) {
    const query = { lawyerId: userId };

    if (startDate && endDate) {
        query.issueDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    if (filters.clientId) query.clientId = filters.clientId;
    if (filters.caseId) query.caseId = filters.caseId;

    const invoices = await Invoice.find(query).populate('clientId', 'name');

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalOutstanding = totalRevenue - totalCollected;

    const byStatus = invoices.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
    }, {});

    return {
        summary: {
            totalRevenue,
            totalCollected,
            totalOutstanding,
            invoiceCount: invoices.length
        },
        byStatus,
        invoices: invoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            client: inv.clientId?.name,
            totalAmount: inv.totalAmount,
            amountPaid: inv.amountPaid,
            status: inv.status,
            issueDate: inv.issueDate
        }))
    };
}

/**
 * Generate Aging Report
 */
async function generateAgingReport(userId, filters) {
    const query = {
        lawyerId: userId,
        status: { $in: ['sent', 'partial', 'overdue'] }
    };

    if (filters.clientId) query.clientId = filters.clientId;

    const invoices = await Invoice.find(query).populate('clientId', 'name email');

    const now = new Date();
    const aging = {
        current: [],
        days30: [],
        days60: [],
        days90: [],
        days90Plus: []
    };

    invoices.forEach(inv => {
        const daysOverdue = Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
        const outstanding = inv.totalAmount - (inv.amountPaid || 0);

        const item = {
            invoiceNumber: inv.invoiceNumber,
            client: inv.clientId?.name,
            totalAmount: inv.totalAmount,
            outstanding,
            dueDate: inv.dueDate,
            daysOverdue
        };

        if (daysOverdue < 0) aging.current.push(item);
        else if (daysOverdue <= 30) aging.days30.push(item);
        else if (daysOverdue <= 60) aging.days60.push(item);
        else if (daysOverdue <= 90) aging.days90.push(item);
        else aging.days90Plus.push(item);
    });

    return {
        summary: {
            current: aging.current.reduce((sum, i) => sum + i.outstanding, 0),
            days30: aging.days30.reduce((sum, i) => sum + i.outstanding, 0),
            days60: aging.days60.reduce((sum, i) => sum + i.outstanding, 0),
            days90: aging.days90.reduce((sum, i) => sum + i.outstanding, 0),
            days90Plus: aging.days90Plus.reduce((sum, i) => sum + i.outstanding, 0)
        },
        details: aging
    };
}

/**
 * Generate Collections Report
 */
async function generateCollectionsReport(userId, startDate, endDate, filters) {
    const query = { userId, status: 'completed' };

    if (startDate && endDate) {
        query.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    if (filters.clientId) query.clientId = filters.clientId;
    if (filters.paymentMethod) query.paymentMethod = filters.paymentMethod;

    const payments = await Payment.find(query)
        .populate('invoiceId', 'invoiceNumber')
        .populate('clientId', 'name');

    const totalCollected = payments.reduce((sum, pay) => sum + pay.amount, 0);

    const byMethod = payments.reduce((acc, pay) => {
        const method = pay.paymentMethod || 'other';
        acc[method] = (acc[method] || 0) + pay.amount;
        return acc;
    }, {});

    return {
        summary: {
            totalCollected,
            paymentCount: payments.length,
            averagePayment: payments.length > 0 ? totalCollected / payments.length : 0
        },
        byMethod,
        payments: payments.map(pay => ({
            paymentId: pay.paymentId,
            client: pay.clientId?.name,
            amount: pay.amount,
            method: pay.paymentMethod,
            date: pay.paymentDate,
            invoice: pay.invoiceId?.invoiceNumber
        }))
    };
}

/**
 * Generate Productivity Report
 */
async function generateProductivityReport(userId, startDate, endDate, filters) {
    const query = { lawyerId: userId };

    if (startDate && endDate) {
        query.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    if (filters.caseId) query.caseId = filters.caseId;

    const timeEntries = await TimeEntry.find(query).populate('caseId', 'caseNumber title');

    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const totalBillableAmount = timeEntries.reduce((sum, entry) => sum + (entry.billableAmount || 0), 0);

    const byCase = timeEntries.reduce((acc, entry) => {
        const caseId = entry.caseId?._id?.toString() || 'uncategorized';
        if (!acc[caseId]) {
            acc[caseId] = {
                case: entry.caseId?.title || 'غير مصنف',
                hours: 0,
                billableAmount: 0
            };
        }
        acc[caseId].hours += entry.hours;
        acc[caseId].billableAmount += entry.billableAmount || 0;
        return acc;
    }, {});

    return {
        summary: {
            totalHours,
            totalBillableAmount,
            averageHourlyRate: totalHours > 0 ? totalBillableAmount / totalHours : 0,
            entriesCount: timeEntries.length
        },
        byCase: Object.values(byCase)
    };
}

/**
 * Generate Profitability Report
 */
async function generateProfitabilityReport(userId, startDate, endDate, filters) {
    const dateQuery = {};
    if (startDate && endDate) {
        dateQuery.$gte = new Date(startDate);
        dateQuery.$lte = new Date(endDate);
    }

    // Get invoices
    const invoiceQuery = { lawyerId: userId };
    if (dateQuery.$gte) invoiceQuery.issueDate = dateQuery;
    if (filters.caseId) invoiceQuery.caseId = filters.caseId;
    if (filters.clientId) invoiceQuery.clientId = filters.clientId;

    const invoices = await Invoice.find(invoiceQuery);
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);

    // Get expenses
    const expenseQuery = { userId };
    if (dateQuery.$gte) expenseQuery.date = dateQuery;
    if (filters.caseId) expenseQuery.caseId = filters.caseId;

    const expenses = await Expense.find(expenseQuery);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
        summary: {
            totalRevenue,
            totalExpenses,
            netProfit,
            profitMargin: profitMargin.toFixed(2) + '%'
        },
        details: {
            invoiceCount: invoices.length,
            expenseCount: expenses.length
        }
    };
}

/**
 * Generate Time Utilization Report
 */
async function generateTimeUtilizationReport(userId, startDate, endDate, filters) {
    const query = { lawyerId: userId };

    if (startDate && endDate) {
        query.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const timeEntries = await TimeEntry.find(query);

    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
    const billableHours = timeEntries.filter(e => e.isBillable).reduce((sum, e) => sum + e.hours, 0);
    const nonBillableHours = totalHours - billableHours;

    const utilizationRate = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

    const byActivity = timeEntries.reduce((acc, entry) => {
        const activity = entry.activityCode || 'other';
        if (!acc[activity]) {
            acc[activity] = { hours: 0, billable: 0, nonBillable: 0 };
        }
        acc[activity].hours += entry.hours;
        if (entry.isBillable) acc[activity].billable += entry.hours;
        else acc[activity].nonBillable += entry.hours;
        return acc;
    }, {});

    return {
        summary: {
            totalHours,
            billableHours,
            nonBillableHours,
            utilizationRate: utilizationRate.toFixed(2) + '%'
        },
        byActivity
    };
}

/**
 * Generate Tax Report (Saudi VAT 15%)
 */
async function generateTaxReport(userId, startDate, endDate, filters) {
    const query = { lawyerId: userId };

    if (startDate && endDate) {
        query.issueDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const invoices = await Invoice.find(query);

    const totalSales = invoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const totalVAT = invoices.reduce((sum, inv) => sum + (inv.vatAmount || 0), 0);
    const totalWithVAT = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Get deductible expenses (business expenses with VAT)
    const expenseQuery = { userId, category: { $ne: 'personal' } };
    if (startDate && endDate) {
        expenseQuery.date = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const expenses = await Expense.find(expenseQuery);
    const deductibleVAT = expenses.reduce((sum, exp) => {
        // Assuming 15% VAT on expenses
        return sum + (exp.amount * 0.15);
    }, 0);

    const netVAT = totalVAT - deductibleVAT;

    return {
        summary: {
            totalSales,
            totalVAT,
            totalWithVAT,
            deductibleVAT,
            netVATPayable: netVAT,
            vatRate: '15%'
        },
        invoices: invoices.map(inv => ({
            invoiceNumber: inv.invoiceNumber,
            subtotal: inv.subtotal,
            vatAmount: inv.vatAmount,
            totalAmount: inv.totalAmount,
            issueDate: inv.issueDate
        }))
    };
}

module.exports = {
    generateReport,
    getReports,
    getReport,
    deleteReport,
    getReportTemplates,
    scheduleReport,
    unscheduleReport
};
