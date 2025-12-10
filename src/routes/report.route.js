const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
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
    exportReport
} = require('../controllers/report.controller');

// Accounting reports
const {
    getProfitLossReport,
    getBalanceSheetReport,
    getCaseProfitabilityReport,
    getARAgingReport,
    getTrialBalanceReport,
    getBudgetVarianceReport,
    getAPAgingReport,
    getClientStatement,
    getVendorLedger,
    getGrossProfitReport,
    getCostCenterReport
} = require('../controllers/accountingReports.controller');

const app = express.Router();

// Accounting/Financial reports (must be before /:id routes)
app.get('/profit-loss', userMiddleware, getProfitLossReport);
app.get('/balance-sheet', userMiddleware, getBalanceSheetReport);
app.get('/case-profitability', userMiddleware, getCaseProfitabilityReport);
app.get('/ar-aging', userMiddleware, getARAgingReport);
app.get('/trial-balance', userMiddleware, getTrialBalanceReport);
// NEW ERPNext-equivalent reports
app.get('/budget-variance', userMiddleware, getBudgetVarianceReport);
app.get('/ap-aging', userMiddleware, getAPAgingReport);
app.get('/client-statement', userMiddleware, getClientStatement);
app.get('/vendor-ledger', userMiddleware, getVendorLedger);
app.get('/gross-profit', userMiddleware, getGrossProfitReport);
app.get('/cost-center', userMiddleware, getCostCenterReport);

// Direct report endpoints (must be before /:id routes)
app.get('/accounts-aging', userMiddleware, getAccountsAgingReport);
app.get('/revenue-by-client', userMiddleware, getRevenueByClientReport);
app.get('/outstanding-invoices', userMiddleware, getOutstandingInvoicesReport);
app.get('/time-entries', userMiddleware, getTimeEntriesReport);
app.post('/export', userMiddleware, exportReport);

// Report operations
app.post('/generate', userMiddleware, generateReport);
app.get('/', userMiddleware, getReports);
app.get('/templates', userMiddleware, getReportTemplates);
app.get('/:id', userMiddleware, getReport);
app.delete('/:id', userMiddleware, deleteReport);

// Report scheduling
app.post('/:id/schedule', userMiddleware, scheduleReport);
app.delete('/:id/schedule', userMiddleware, unscheduleReport);

module.exports = app;
