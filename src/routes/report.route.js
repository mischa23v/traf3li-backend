const express = require('express');
const { userMiddleware } = require('../middlewares');
const {
    listReports,
    createReport,
    getReport,
    deleteReport,
    executeReport,
    exportReport,
    updateSchedule
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

// Report export
app.post('/export', userMiddleware, exportReport);

// Report operations
app.post('/generate', userMiddleware, createReport);
app.get('/', userMiddleware, listReports);
app.get('/:id', userMiddleware, getReport);
app.delete('/:id', userMiddleware, deleteReport);
app.post('/:id/execute', userMiddleware, executeReport);

// Report scheduling
app.put('/:id/schedule', userMiddleware, updateSchedule);

module.exports = app;
