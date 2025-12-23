const express = require('express');
const router = express.Router();
const consolidatedReportsController = require('../controllers/consolidatedReports.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// CONSOLIDATED FINANCIAL REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/reports/consolidated/profit-loss
 * Get consolidated profit & loss report across multiple firms
 * Query params:
 *   - firmIds: Array of firm IDs to include (optional, defaults to all user's firms)
 *   - startDate: Start date (required)
 *   - endDate: End date (required)
 *   - includeEliminations: Boolean to include intercompany eliminations (optional)
 *   - currency: Target currency for reporting (optional, default: SAR)
 */
router.get('/profit-loss', consolidatedReportsController.getConsolidatedProfitLoss);

/**
 * GET /api/reports/consolidated/balance-sheet
 * Get consolidated balance sheet across multiple firms
 * Query params:
 *   - firmIds: Array of firm IDs to include (optional, defaults to all user's firms)
 *   - asOfDate: Date for balance sheet (optional, defaults to today)
 *   - includeEliminations: Boolean to include intercompany eliminations (optional)
 *   - currency: Target currency for reporting (optional, default: SAR)
 */
router.get('/balance-sheet', consolidatedReportsController.getConsolidatedBalanceSheet);

/**
 * GET /api/reports/consolidated/cash-flow
 * Get consolidated cash flow report across multiple firms
 * Query params:
 *   - firmIds: Array of firm IDs to include (optional, defaults to all user's firms)
 *   - startDate: Start date (required)
 *   - endDate: End date (required)
 *   - currency: Target currency for reporting (optional, default: SAR)
 */
router.get('/cash-flow', consolidatedReportsController.getConsolidatedCashFlow);

/**
 * GET /api/reports/consolidated/comparison
 * Get side-by-side comparison of firms
 * Query params:
 *   - firmIds: Array of firm IDs to compare (optional, defaults to all user's firms)
 *   - startDate: Start date (required)
 *   - endDate: End date (required)
 *   - metrics: Array of metrics to compare (optional)
 *     Available: revenue, expenses, profit, profitMargin, clientCount, invoiceCount
 */
router.get('/comparison', consolidatedReportsController.getCompanyComparison);

// ═══════════════════════════════════════════════════════════════
// INTERCOMPANY ELIMINATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/reports/consolidated/eliminations
 * Get calculated elimination entries based on intercompany transactions
 * Query params:
 *   - firmIds: Array of firm IDs (optional, defaults to all user's firms)
 *   - startDate: Start date (optional)
 *   - endDate: End date (optional)
 */
router.get('/eliminations', consolidatedReportsController.getEliminationEntries);

/**
 * POST /api/reports/consolidated/eliminations
 * Create a manual elimination entry
 * Body:
 *   - sourceFirmId: Source firm ID (required)
 *   - targetFirmId: Target firm ID (required)
 *   - transactionType: Type (sale/purchase/transfer/loan/reimbursement) (required)
 *   - amount: Amount (required)
 *   - currency: Currency code (optional, default: SAR)
 *   - transactionDate: Transaction date (required)
 *   - reference: Reference number (optional)
 *   - description: Description (optional)
 */
router.post('/eliminations', consolidatedReportsController.createManualElimination);

/**
 * GET /api/reports/consolidated/auto-eliminations
 * Get automatically calculated intercompany eliminations
 * Query params:
 *   - firmIds: Array of firm IDs (required, minimum 2)
 *   - asOfDate: As of date for calculations (optional, defaults to today)
 */
router.get('/auto-eliminations', consolidatedReportsController.getAutoEliminations);

/**
 * GET /api/reports/consolidated/full-statement
 * Get complete consolidated financial statement package
 * Includes: Balance Sheet, Profit & Loss, Eliminations Schedule
 * Query params:
 *   - firmIds: Array of firm IDs (optional, defaults to all user's firms)
 *   - startDate: Start date (required)
 *   - endDate: End date (required)
 *   - currency: Target currency (optional, default: SAR)
 */
router.get('/full-statement', consolidatedReportsController.getFullConsolidatedStatement);

module.exports = router;
