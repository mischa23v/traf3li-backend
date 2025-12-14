const { Report, Invoice, Expense, TimeEntry, Payment, Case, Client } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const QueueService = require('../services/queue.service');

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
        throw CustomException('اسم التقرير ونوعه مطلوبان', 400);
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
        throw CustomException('نوع التقرير غير صالح', 400);
    }

    // Date validation
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
        throw CustomException('تاريخ البداية يجب أن يكون قبل تاريخ النهاية', 400);
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
        lastRun: new Date(),
        status: 'queued'
    });

    // Queue report generation for background processing
    const job = await QueueService.generateReport(
        {
            firmId: req.firmId || userId,
            reportId: report._id,
            reportType,
            startDate,
            endDate,
            filters,
            outputFormat
        },
        reportType === 'financial' ? 'financial' :
        reportType === 'time_utilization' ? 'time-utilization' :
        reportType === 'aging' ? 'client-aging' : 'analytics',
        { priority: 2 }
    );

    res.status(201).json({
        success: true,
        message: 'تم إنشاء التقرير وإضافته إلى قائمة الانتظار',
        message_en: 'Report queued successfully for generation',
        report,
        jobId: job.jobId,
        note: 'Report is being generated in the background. You will be notified when it is ready.'
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
        throw CustomException('التقرير غير موجود', 404);
    }

    if (report.createdBy._id.toString() !== userId && !report.isPublic) {
        throw CustomException('لا يمكنك الوصول إلى هذا التقرير', 403);
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
        throw CustomException('التقرير غير موجود', 404);
    }

    if (report.createdBy.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذا التقرير', 403);
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
        throw CustomException('التقرير غير موجود', 404);
    }

    if (report.createdBy.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذا التقرير', 403);
    }

    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly'];
    if (!validFrequencies.includes(scheduleFrequency)) {
        throw CustomException('تكرار الجدولة غير صالح', 400);
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
        throw CustomException('التقرير غير موجود', 404);
    }

    if (report.createdBy.toString() !== userId) {
        throw CustomException('لا يمكنك الوصول إلى هذا التقرير', 403);
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

    const invoices = await Invoice.find(query).populate('clientId', 'name').lean();

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

    const invoices = await Invoice.find(query).populate('clientId', 'name email').lean();

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
        .populate('clientId', 'name')
        .lean();

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

    const timeEntries = await TimeEntry.find(query).populate('caseId', 'caseNumber title').lean();

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

    const invoices = await Invoice.find(invoiceQuery).lean();
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);

    // Get expenses
    const expenseQuery = { userId };
    if (dateQuery.$gte) expenseQuery.date = dateQuery;
    if (filters.caseId) expenseQuery.caseId = filters.caseId;

    const expenses = await Expense.find(expenseQuery).lean();
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

    const timeEntries = await TimeEntry.find(query).lean();

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

    const invoices = await Invoice.find(query).lean();

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

    const expenses = await Expense.find(expenseQuery).lean();
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

// ==================== Direct Report Endpoints ====================

/**
 * Get accounts aging report (direct access)
 * GET /api/reports/accounts-aging
 */
const getAccountsAgingReport = asyncHandler(async (req, res) => {
    const { clientId } = req.query;
    const lawyerId = req.userID;

    const filters = {};
    if (clientId) filters.clientId = clientId;

    const agingData = await generateAgingReport(lawyerId, filters);

    res.status(200).json({
        success: true,
        report: 'accounts-aging',
        generatedAt: new Date(),
        data: agingData
    });
});

/**
 * Get revenue by client report
 * GET /api/reports/revenue-by-client
 */
const getRevenueByClientReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const lawyerId = req.userID;

    const dateQuery = {};
    if (startDate && endDate) {
        dateQuery.issueDate = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const invoices = await Invoice.find({ lawyerId, ...dateQuery })
        .populate('clientId', 'firstName lastName username email')
        .lean();

    // Group by client
    const byClient = {};
    invoices.forEach(inv => {
        const clientId = inv.clientId?._id?.toString() || 'unknown';
        const clientName = inv.clientId
            ? `${inv.clientId.firstName || ''} ${inv.clientId.lastName || inv.clientId.username}`.trim()
            : 'Unknown Client';

        if (!byClient[clientId]) {
            byClient[clientId] = {
                clientId,
                clientName,
                email: inv.clientId?.email,
                totalInvoiced: 0,
                totalPaid: 0,
                totalOutstanding: 0,
                invoiceCount: 0
            };
        }

        byClient[clientId].totalInvoiced += inv.totalAmount || 0;
        byClient[clientId].totalPaid += inv.amountPaid || 0;
        byClient[clientId].totalOutstanding += (inv.totalAmount || 0) - (inv.amountPaid || 0);
        byClient[clientId].invoiceCount += 1;
    });

    const clients = Object.values(byClient).sort((a, b) => b.totalInvoiced - a.totalInvoiced);

    const totals = clients.reduce((acc, client) => {
        acc.totalInvoiced += client.totalInvoiced;
        acc.totalPaid += client.totalPaid;
        acc.totalOutstanding += client.totalOutstanding;
        return acc;
    }, { totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0 });

    res.status(200).json({
        success: true,
        report: 'revenue-by-client',
        generatedAt: new Date(),
        period: { startDate, endDate },
        summary: totals,
        data: clients
    });
});

/**
 * Get outstanding invoices report
 * GET /api/reports/outstanding-invoices
 */
const getOutstandingInvoicesReport = asyncHandler(async (req, res) => {
    const { clientId, caseId, minAmount, maxAmount } = req.query;
    const lawyerId = req.userID;

    const query = {
        lawyerId,
        status: { $in: ['sent', 'partial', 'overdue'] }
    };

    if (clientId) query.clientId = clientId;
    if (caseId) query.caseId = caseId;

    const invoices = await Invoice.find(query)
        .populate('clientId', 'firstName lastName username email')
        .populate('caseId', 'title caseNumber')
        .sort({ dueDate: 1 })
        .lean();

    // Calculate outstanding amounts and filter
    let outstandingInvoices = invoices.map(inv => {
        const outstanding = (inv.totalAmount || 0) - (inv.amountPaid || 0);
        const now = new Date();
        const daysOverdue = inv.dueDate ? Math.floor((now - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)) : 0;

        return {
            _id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            client: inv.clientId ? {
                _id: inv.clientId._id,
                name: `${inv.clientId.firstName || ''} ${inv.clientId.lastName || inv.clientId.username}`.trim(),
                email: inv.clientId.email
            } : null,
            case: inv.caseId ? {
                _id: inv.caseId._id,
                title: inv.caseId.title,
                caseNumber: inv.caseId.caseNumber
            } : null,
            totalAmount: inv.totalAmount,
            amountPaid: inv.amountPaid || 0,
            outstanding,
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            daysOverdue: Math.max(0, daysOverdue),
            status: inv.status
        };
    });

    // Apply amount filters if provided
    if (minAmount) {
        outstandingInvoices = outstandingInvoices.filter(inv => inv.outstanding >= parseFloat(minAmount));
    }
    if (maxAmount) {
        outstandingInvoices = outstandingInvoices.filter(inv => inv.outstanding <= parseFloat(maxAmount));
    }

    const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + inv.outstanding, 0);

    res.status(200).json({
        success: true,
        report: 'outstanding-invoices',
        generatedAt: new Date(),
        summary: {
            totalOutstanding,
            invoiceCount: outstandingInvoices.length,
            averageOutstanding: outstandingInvoices.length > 0 ? totalOutstanding / outstandingInvoices.length : 0
        },
        data: outstandingInvoices
    });
});

/**
 * Get time entries report (exportable)
 * GET /api/reports/time-entries
 */
const getTimeEntriesReport = asyncHandler(async (req, res) => {
    const {
        startDate,
        endDate,
        clientId,
        caseId,
        isBillable,
        status,
        page = 1,
        limit = 100
    } = req.query;

    const lawyerId = req.userID;
    const query = { lawyerId };

    if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
    }

    if (clientId) query.clientId = clientId;
    if (caseId) query.caseId = caseId;
    if (isBillable !== undefined) query.isBillable = isBillable === 'true';
    if (status) query.status = status;

    const timeEntries = await TimeEntry.find(query)
        .populate('clientId', 'firstName lastName username')
        .populate('caseId', 'title caseNumber')
        .sort({ date: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .lean();

    const total = await TimeEntry.countDocuments(query);

    // Calculate totals
    const allEntries = await TimeEntry.find(query).lean();
    const totalHours = allEntries.reduce((sum, e) => sum + (e.hours || 0), 0);
    const billableHours = allEntries.filter(e => e.isBillable).reduce((sum, e) => sum + (e.hours || 0), 0);
    const totalBillableAmount = allEntries.reduce((sum, e) => sum + (e.billableAmount || 0), 0);

    res.status(200).json({
        success: true,
        report: 'time-entries',
        generatedAt: new Date(),
        period: { startDate, endDate },
        summary: {
            totalHours,
            billableHours,
            nonBillableHours: totalHours - billableHours,
            totalBillableAmount,
            entriesCount: total
        },
        data: timeEntries.map(entry => ({
            _id: entry._id,
            date: entry.date,
            client: entry.clientId ? {
                name: `${entry.clientId.firstName || ''} ${entry.clientId.lastName || entry.clientId.username}`.trim()
            } : null,
            case: entry.caseId ? {
                title: entry.caseId.title,
                caseNumber: entry.caseId.caseNumber
            } : null,
            description: entry.description,
            hours: entry.hours,
            rate: entry.rate,
            billableAmount: entry.billableAmount,
            isBillable: entry.isBillable,
            status: entry.status
        })),
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
});

/**
 * Export data to various formats
 * POST /api/reports/export
 */
const exportReport = asyncHandler(async (req, res) => {
    const {
        reportType,
        format = 'json',
        startDate,
        endDate,
        filters = {}
    } = req.body;

    const lawyerId = req.userID;

    // Validate format
    const validFormats = ['json', 'csv', 'pdf', 'excel'];
    if (!validFormats.includes(format)) {
        throw CustomException('Invalid export format. Use json, csv, pdf, or excel', 400);
    }

    // Validate report type
    const validTypes = ['invoices', 'payments', 'expenses', 'time-entries', 'clients', 'statements'];
    if (!validTypes.includes(reportType)) {
        throw CustomException('Invalid report type', 400);
    }

    let data;
    let fileName;

    switch (reportType) {
        case 'invoices':
            const invoiceQuery = { lawyerId };
            if (startDate) invoiceQuery.issueDate = { $gte: new Date(startDate) };
            if (endDate) invoiceQuery.issueDate = { ...invoiceQuery.issueDate, $lte: new Date(endDate) };
            if (filters.status) invoiceQuery.status = filters.status;
            if (filters.clientId) invoiceQuery.clientId = filters.clientId;

            data = await Invoice.find(invoiceQuery)
                .populate('clientId', 'firstName lastName username email')
                .populate('caseId', 'title caseNumber')
                .lean();
            fileName = `invoices_export_${Date.now()}`;
            break;

        case 'payments':
            const paymentQuery = { lawyerId };
            if (startDate) paymentQuery.paymentDate = { $gte: new Date(startDate) };
            if (endDate) paymentQuery.paymentDate = { ...paymentQuery.paymentDate, $lte: new Date(endDate) };
            if (filters.status) paymentQuery.status = filters.status;
            if (filters.clientId) paymentQuery.clientId = filters.clientId;

            data = await Payment.find(paymentQuery)
                .populate('clientId', 'firstName lastName username email')
                .populate('invoiceId', 'invoiceNumber')
                .lean();
            fileName = `payments_export_${Date.now()}`;
            break;

        case 'expenses':
            const expenseQuery = { lawyerId };
            if (startDate) expenseQuery.date = { $gte: new Date(startDate) };
            if (endDate) expenseQuery.date = { ...expenseQuery.date, $lte: new Date(endDate) };
            if (filters.category) expenseQuery.category = filters.category;
            if (filters.caseId) expenseQuery.caseId = filters.caseId;

            data = await Expense.find(expenseQuery)
                .populate('caseId', 'title caseNumber')
                .lean();
            fileName = `expenses_export_${Date.now()}`;
            break;

        case 'time-entries':
            const timeQuery = { lawyerId };
            if (startDate) timeQuery.date = { $gte: new Date(startDate) };
            if (endDate) timeQuery.date = { ...timeQuery.date, $lte: new Date(endDate) };
            if (filters.caseId) timeQuery.caseId = filters.caseId;
            if (filters.clientId) timeQuery.clientId = filters.clientId;

            data = await TimeEntry.find(timeQuery)
                .populate('caseId', 'title caseNumber')
                .populate('clientId', 'firstName lastName username')
                .lean();
            fileName = `time_entries_export_${Date.now()}`;
            break;

        default:
            data = [];
            fileName = `export_${Date.now()}`;
    }

    // For now, return JSON format
    // In production, implement actual CSV/PDF/Excel generation
    if (format === 'json') {
        res.status(200).json({
            success: true,
            fileName: `${fileName}.json`,
            format,
            recordCount: data.length,
            exportedAt: new Date(),
            data
        });
    } else {
        // Placeholder for other formats
        res.status(200).json({
            success: true,
            message: `Export to ${format} format - data prepared`,
            fileName: `${fileName}.${format}`,
            format,
            recordCount: data.length,
            exportedAt: new Date(),
            // In production: downloadUrl would be returned
            data // Returning data for now, remove in production
        });
    }
});

// ==================== Chart Endpoints for Dashboard ====================

/**
 * Get cases chart data (monthly case counts)
 * GET /api/reports/cases-chart
 */
const getCasesChart = asyncHandler(async (req, res) => {
    const { months = 12 } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build match filter
    const matchFilter = firmId
        ? { firmId: require('mongoose').Types.ObjectId.createFromHexString(firmId) }
        : { lawyerId: require('mongoose').Types.ObjectId.createFromHexString(lawyerId) };

    // Calculate start date
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate cases by month and status
    const casesData = await Case.aggregate([
        {
            $match: {
                ...matchFilter,
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' },
                    status: '$status'
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: { year: '$_id.year', month: '$_id.month' },
                statuses: {
                    $push: {
                        status: '$_id.status',
                        count: '$count'
                    }
                },
                total: { $sum: '$count' }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format data for chart
    const chartData = casesData.map(item => {
        const monthStr = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        const statusCounts = item.statuses.reduce((acc, s) => {
            acc[s.status] = s.count;
            return acc;
        }, {});

        return {
            month: monthStr,
            label: new Date(item._id.year, item._id.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
            total: item.total,
            opened: statusCounts.open || statusCounts.active || statusCounts.in_progress || 0,
            closed: statusCounts.closed || statusCounts.completed || statusCounts.resolved || 0,
            pending: statusCounts.pending || statusCounts.on_hold || 0,
            ...statusCounts
        };
    });

    res.status(200).json({
        success: true,
        report: 'cases-chart',
        period: { months: parseInt(months), startDate },
        generatedAt: new Date(),
        data: chartData
    });
});

/**
 * Get revenue chart data (monthly revenue)
 * GET /api/reports/revenue-chart
 */
const getRevenueChart = asyncHandler(async (req, res) => {
    const { months = 12 } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    // Build match filter
    const matchFilter = firmId
        ? { firmId: require('mongoose').Types.ObjectId.createFromHexString(firmId) }
        : { lawyerId: require('mongoose').Types.ObjectId.createFromHexString(lawyerId) };

    // Calculate start date
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate revenue by month
    const revenueData = await Invoice.aggregate([
        {
            $match: {
                ...matchFilter,
                issueDate: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$issueDate' },
                    month: { $month: '$issueDate' }
                },
                totalInvoiced: { $sum: '$totalAmount' },
                totalPaid: { $sum: '$amountPaid' },
                invoiceCount: { $sum: 1 },
                paidCount: {
                    $sum: { $cond: [{ $eq: ['$status', 'paid'] }, 1, 0] }
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get expenses by month
    const expenseData = await Expense.aggregate([
        {
            $match: {
                ...matchFilter,
                date: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$date' },
                    month: { $month: '$date' }
                },
                totalExpenses: { $sum: '$amount' },
                expenseCount: { $sum: 1 }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Create a map of expenses by month
    const expenseMap = expenseData.reduce((acc, item) => {
        const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        acc[key] = item;
        return acc;
    }, {});

    // Format data for chart
    const chartData = revenueData.map(item => {
        const monthStr = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        const expenses = expenseMap[monthStr]?.totalExpenses || 0;

        return {
            month: monthStr,
            label: new Date(item._id.year, item._id.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
            revenue: item.totalInvoiced,
            collected: item.totalPaid,
            expenses: expenses,
            profit: item.totalPaid - expenses,
            invoiceCount: item.invoiceCount,
            collectionRate: item.totalInvoiced > 0
                ? parseFloat(((item.totalPaid / item.totalInvoiced) * 100).toFixed(1))
                : 0
        };
    });

    // Calculate totals
    const totals = chartData.reduce((acc, item) => {
        acc.totalRevenue += item.revenue;
        acc.totalCollected += item.collected;
        acc.totalExpenses += item.expenses;
        acc.totalProfit += item.profit;
        return acc;
    }, { totalRevenue: 0, totalCollected: 0, totalExpenses: 0, totalProfit: 0 });

    res.status(200).json({
        success: true,
        report: 'revenue-chart',
        period: { months: parseInt(months), startDate },
        generatedAt: new Date(),
        data: chartData,
        summary: totals
    });
});

/**
 * Get tasks chart data (task completion rates over time)
 * GET /api/reports/tasks-chart
 */
const getTasksChart = asyncHandler(async (req, res) => {
    const { months = 12 } = req.query;
    const lawyerId = req.userID;
    const firmId = req.firmId;

    const Task = require('../models').Task;

    // Build match filter
    const matchFilter = firmId
        ? { firmId: require('mongoose').Types.ObjectId.createFromHexString(firmId) }
        : { lawyerId: require('mongoose').Types.ObjectId.createFromHexString(lawyerId) };

    // Calculate start date
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - parseInt(months));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    // Aggregate tasks by month and status
    const tasksData = await Task.aggregate([
        {
            $match: {
                ...matchFilter,
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: '$createdAt' },
                    month: { $month: '$createdAt' }
                },
                total: { $sum: 1 },
                completed: {
                    $sum: { $cond: [{ $in: ['$status', ['completed', 'done', 'Completed']] }, 1, 0] }
                },
                inProgress: {
                    $sum: { $cond: [{ $in: ['$status', ['in_progress', 'in-progress', 'InProgress']] }, 1, 0] }
                },
                pending: {
                    $sum: { $cond: [{ $in: ['$status', ['pending', 'todo', 'Pending', 'open']] }, 1, 0] }
                },
                overdue: {
                    $sum: { $cond: [{ $in: ['$status', ['overdue', 'Overdue']] }, 1, 0] }
                }
            }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Format data for chart
    const chartData = tasksData.map(item => {
        const monthStr = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        const completionRate = item.total > 0
            ? parseFloat(((item.completed / item.total) * 100).toFixed(1))
            : 0;

        return {
            month: monthStr,
            label: new Date(item._id.year, item._id.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' }),
            total: item.total,
            completed: item.completed,
            inProgress: item.inProgress,
            pending: item.pending,
            overdue: item.overdue,
            completionRate
        };
    });

    // Calculate overall stats
    const totals = chartData.reduce((acc, item) => {
        acc.total += item.total;
        acc.completed += item.completed;
        acc.inProgress += item.inProgress;
        acc.pending += item.pending;
        acc.overdue += item.overdue;
        return acc;
    }, { total: 0, completed: 0, inProgress: 0, pending: 0, overdue: 0 });

    totals.overallCompletionRate = totals.total > 0
        ? parseFloat(((totals.completed / totals.total) * 100).toFixed(1))
        : 0;

    res.status(200).json({
        success: true,
        report: 'tasks-chart',
        period: { months: parseInt(months), startDate },
        generatedAt: new Date(),
        data: chartData,
        summary: totals
    });
});

module.exports = {
    generateReport,
    getReports,
    getReport,
    deleteReport,
    getReportTemplates,
    scheduleReport,
    unscheduleReport,
    // Direct report endpoints
    getAccountsAgingReport,
    getRevenueByClientReport,
    getOutstandingInvoicesReport,
    getTimeEntriesReport,
    exportReport,
    // Chart endpoints
    getCasesChart,
    getRevenueChart,
    getTasksChart
};
