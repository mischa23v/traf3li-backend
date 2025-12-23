/**
 * Prepared Report Controller
 *
 * Handles pre-computed cached reports.
 *
 * @module controllers/preparedReport
 */

const PreparedReport = require('../models/preparedReport.model');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');
const { sanitizeObjectId, pickAllowedFields } = require('../utils/securityUtils');

/**
 * Get all prepared reports
 * GET /api/prepared-reports
 */
const getPreparedReports = asyncHandler(async (req, res) => {
    const { reportType, status, page = 1, limit = 20 } = req.query;

    const query = { firmId: req.firmId };
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [reports, total] = await Promise.all([
        PreparedReport.find(query)
            .select('-data') // Don't return full data in list
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit, 10))
            .lean(),
        PreparedReport.countDocuments(query)
    ]);

    res.json({
        success: true,
        data: reports,
        meta: {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            total,
            pages: Math.ceil(total / parseInt(limit, 10))
        }
    });
});

/**
 * Get prepared report by ID
 * GET /api/prepared-reports/:id
 */
const getPreparedReport = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid report ID | معرف التقرير غير صالح', 400);
    }

    const report = await PreparedReport.findOne({
        _id: id,
        firmId: req.firmId
    });

    if (!report) {
        throw new CustomException('Report not found | التقرير غير موجود', 404);
    }

    // Update access tracking
    report.accessCount += 1;
    report.lastAccessedAt = new Date();
    await report.save();

    res.json({
        success: true,
        data: report
    });
});

/**
 * Request a prepared report (get from cache or trigger generation)
 * POST /api/prepared-reports/request
 */
const requestPreparedReport = asyncHandler(async (req, res) => {
    const allowedFields = [
        'reportType', 'name', 'nameAr', 'parameters', 'ttlMinutes', 'autoRefresh'
    ];
    const safeData = pickAllowedFields(req.body, allowedFields);

    if (!safeData.reportType) {
        throw new CustomException('Report type is required | نوع التقرير مطلوب', 400);
    }

    const result = await PreparedReport.findOrCreate(
        req.firmId,
        safeData.reportType,
        safeData.parameters || {},
        {
            name: safeData.name,
            nameAr: safeData.nameAr,
            ttlMinutes: safeData.ttlMinutes,
            autoRefresh: safeData.autoRefresh,
            userId: req.userID
        }
    );

    if (result.cached) {
        res.json({
            success: true,
            message: 'Report retrieved from cache | تم استرداد التقرير من ذاكرة التخزين المؤقت',
            cached: true,
            data: result.report
        });
    } else if (result.pending) {
        res.status(202).json({
            success: true,
            message: 'Report is being generated | جاري إنشاء التقرير',
            pending: true,
            data: {
                id: result.report._id,
                status: result.report.status,
                generationStartedAt: result.report.generationStartedAt
            }
        });
    } else {
        // Trigger background generation
        // In production, this would be a job queue
        generateReportAsync(result.report, req.firmId, req.userID);

        res.status(202).json({
            success: true,
            message: 'Report generation started | بدأ إنشاء التقرير',
            queued: true,
            data: {
                id: result.report._id,
                status: result.report.status,
                generationStartedAt: result.report.generationStartedAt
            }
        });
    }
});

/**
 * Refresh a prepared report
 * POST /api/prepared-reports/:id/refresh
 */
const refreshPreparedReport = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid report ID | معرف التقرير غير صالح', 400);
    }

    const report = await PreparedReport.findOne({
        _id: id,
        firmId: req.firmId
    });

    if (!report) {
        throw new CustomException('Report not found | التقرير غير موجود', 404);
    }

    await report.refresh(req.userID);

    // Trigger background regeneration
    generateReportAsync(report, req.firmId, req.userID);

    res.status(202).json({
        success: true,
        message: 'Report refresh started | بدأ تحديث التقرير',
        data: {
            id: report._id,
            status: report.status,
            generationStartedAt: report.generationStartedAt
        }
    });
});

/**
 * Delete prepared report
 * DELETE /api/prepared-reports/:id
 */
const deletePreparedReport = asyncHandler(async (req, res) => {
    const id = sanitizeObjectId(req.params.id);
    if (!id) {
        throw new CustomException('Invalid report ID | معرف التقرير غير صالح', 400);
    }

    const report = await PreparedReport.findOne({
        _id: id,
        firmId: req.firmId
    });

    if (!report) {
        throw new CustomException('Report not found | التقرير غير موجود', 404);
    }

    await PreparedReport.deleteOne({ _id: id });

    res.json({
        success: true,
        message: 'Report deleted successfully | تم حذف التقرير بنجاح'
    });
});

/**
 * Get cache statistics
 * GET /api/prepared-reports/stats
 */
const getCacheStats = asyncHandler(async (req, res) => {
    const stats = await PreparedReport.getCacheStats(req.firmId);

    res.json({
        success: true,
        data: stats
    });
});

/**
 * Clean up expired reports
 * POST /api/prepared-reports/cleanup
 */
const cleanupReports = asyncHandler(async (req, res) => {
    const deletedCount = await PreparedReport.cleanup(req.firmId);

    res.json({
        success: true,
        message: `Cleaned up ${deletedCount} expired reports | تم تنظيف ${deletedCount} تقرير منتهي الصلاحية`,
        data: { deletedCount }
    });
});

/**
 * Background report generation (simplified - in production use job queue)
 */
async function generateReportAsync(report, firmId, userId) {
    try {
        // Import report generators based on type
        const reportGenerators = {
            trial_balance: generateTrialBalance,
            balance_sheet: generateBalanceSheet,
            profit_loss: generateProfitLoss,
            aging_receivables: generateAgingReceivables,
            payroll_summary: generatePayrollSummary
            // Add more generators as needed
        };

        const generator = reportGenerators[report.reportType];

        if (!generator) {
            await report.markFailed(new Error(`Unknown report type: ${report.reportType}`));
            return;
        }

        const { data, summary } = await generator(firmId, report.parameters);
        await report.markReady(data, summary);
    } catch (error) {
        console.error(`Error generating report ${report._id}:`, error);
        await report.markFailed(error);
    }
}

// Placeholder report generators (would connect to actual report logic)
async function generateTrialBalance(firmId, params) {
    const GeneralLedger = require('../models/generalLedger.model');
    const Account = require('../models/account.model');

    const asOfDate = params.asOfDate || new Date();
    const trialBalance = await GeneralLedger.getTrialBalance(asOfDate);

    return {
        data: trialBalance,
        summary: {
            rowCount: trialBalance.balances?.length || 0,
            totalAmount: trialBalance.totalDebits,
            currency: 'SAR',
            highlights: [
                { label: 'Total Debits', value: trialBalance.totalDebits },
                { label: 'Total Credits', value: trialBalance.totalCredits },
                { label: 'Balanced', value: trialBalance.isBalanced }
            ]
        }
    };
}

async function generateBalanceSheet(firmId, params) {
    // Placeholder - would call actual balance sheet logic
    return {
        data: { placeholder: true },
        summary: { rowCount: 0 }
    };
}

async function generateProfitLoss(firmId, params) {
    // Placeholder - would call actual P&L logic
    return {
        data: { placeholder: true },
        summary: { rowCount: 0 }
    };
}

async function generateAgingReceivables(firmId, params) {
    // Placeholder - would call actual aging logic
    return {
        data: { placeholder: true },
        summary: { rowCount: 0 }
    };
}

async function generatePayrollSummary(firmId, params) {
    // Placeholder - would call actual payroll logic
    return {
        data: { placeholder: true },
        summary: { rowCount: 0 }
    };
}

module.exports = {
    getPreparedReports,
    getPreparedReport,
    requestPreparedReport,
    refreshPreparedReport,
    deletePreparedReport,
    getCacheStats,
    cleanupReports
};
