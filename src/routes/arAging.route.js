/**
 * AR Aging Routes
 *
 * Routes for Accounts Receivable Aging reports
 *
 * @module routes/arAging.route
 */

const express = require('express');
const {
  getAgingReport,
  getAgingSummary,
  getAgingByClient,
  getCollectionForecast,
  getCollectionPriorityScore,
  exportAgingReport
} = require('../controllers/arAging.controller');
const { authenticate } = require('../middlewares');

const app = express.Router();

// ═══════════════════════════════════════════════════════════════
// AR AGING ROUTES (require authentication)
// ═══════════════════════════════════════════════════════════════

/**
 * Get AR aging report with filters
 * GET /api/ar-aging/report
 * Auth: Required
 *
 * Query params:
 * - firmId: Firm ID (required)
 * - clientId: Filter by specific client (optional)
 * - lawyerId: Filter by lawyer (optional)
 * - agingBucket: Filter by aging bucket - current, days_1_30, days_31_60, days_61_90, days_91_120, days_120_plus (optional)
 * - minAmount: Minimum balance due (optional)
 * - maxAmount: Maximum balance due (optional)
 *
 * Response:
 * {
 *   "error": false,
 *   "message": "AR aging report retrieved successfully",
 *   "data": {
 *     "summary": {
 *       "totalInvoices": 50,
 *       "totalOutstanding": 125000.50,
 *       "currency": "SAR",
 *       "reportDate": "2025-12-25T10:30:00.000Z",
 *       "bucketTotals": {
 *         "current": { "label": "Current (Not Due)", "count": 10, "total": 25000 },
 *         "days_1_30": { "label": "1-30 Days", "count": 15, "total": 35000 },
 *         ...
 *       }
 *     },
 *     "invoices": [...],
 *     "filters": {...}
 *   }
 * }
 */
app.get('/report', authenticate, getAgingReport);

/**
 * Get AR aging summary with totals per bucket
 * GET /api/ar-aging/summary
 * Auth: Required
 *
 * Query params:
 * - firmId: Firm ID (required)
 *
 * Response:
 * {
 *   "error": false,
 *   "message": "AR aging summary retrieved successfully",
 *   "data": {
 *     "summary": {...},
 *     "metrics": {
 *       "avgDaysOverdue": 45,
 *       "collectionRate": 85.5,
 *       "totalInvoiced": 150000,
 *       "totalPaid": 128250
 *     },
 *     "bucketDistribution": {...},
 *     "topClientsByOutstanding": [...]
 *   }
 * }
 */
app.get('/summary', authenticate, getAgingSummary);

/**
 * Get AR aging report for specific client
 * GET /api/ar-aging/client/:clientId
 * Auth: Required
 *
 * Params:
 * - clientId: Client ID (required)
 *
 * Query params:
 * - firmId: Firm ID (required)
 *
 * Response:
 * {
 *   "error": false,
 *   "message": "Client AR aging report retrieved successfully",
 *   "data": {
 *     "client": {
 *       "id": "...",
 *       "name": "Client Name",
 *       "number": "CLT-00123",
 *       "email": "client@example.com",
 *       "phone": "+966...",
 *       "type": "individual"
 *     },
 *     "summary": {...},
 *     "invoices": [...]
 *   }
 * }
 */
app.get('/client/:clientId', authenticate, getAgingByClient);

/**
 * Get collection forecast
 * GET /api/ar-aging/forecast
 * Auth: Required
 *
 * Query params:
 * - firmId: Firm ID (required)
 *
 * Response:
 * {
 *   "error": false,
 *   "message": "Collection forecast retrieved successfully",
 *   "data": {
 *     "forecastDate": "2025-12-25T10:30:00.000Z",
 *     "totalOutstanding": 125000.50,
 *     "expectedCollections": {
 *       "next30Days": 65000.25,
 *       "next60Days": 30000.10,
 *       "next90Days": 15000.05,
 *       "next120Days": 5000.10,
 *       "uncertain": 10000.00
 *     },
 *     "currency": "SAR",
 *     "note": "Forecast based on historical collection patterns and aging bucket analysis"
 *   }
 * }
 */
app.get('/forecast', authenticate, getCollectionForecast);

/**
 * Get collection priority score for an invoice
 * GET /api/ar-aging/priority/:invoiceId
 * Auth: Required
 *
 * Params:
 * - invoiceId: Invoice ID (required)
 *
 * Response:
 * {
 *   "error": false,
 *   "message": "Collection priority score calculated successfully",
 *   "data": {
 *     "invoiceId": "...",
 *     "invoiceNumber": "INV-2025-000123",
 *     "score": 75,
 *     "priorityLevel": "high",
 *     "factors": [
 *       { "factor": "Large amount (>50K SAR)", "points": 30 },
 *       { "factor": "Very overdue (>90 days)", "points": 30 },
 *       ...
 *     ],
 *     "recommendations": [
 *       "Schedule direct phone call with client",
 *       "Send formal demand letter",
 *       ...
 *     ],
 *     "calculatedAt": "2025-12-25T10:30:00.000Z"
 *   }
 * }
 */
app.get('/priority/:invoiceId', authenticate, getCollectionPriorityScore);

/**
 * Export AR aging report
 * GET /api/ar-aging/export
 * Auth: Required
 *
 * Query params:
 * - firmId: Firm ID (required)
 * - format: Export format - 'excel' or 'pdf' (default: 'excel')
 * - clientId: Filter by specific client (optional)
 * - lawyerId: Filter by lawyer (optional)
 * - agingBucket: Filter by aging bucket (optional)
 *
 * Response:
 * {
 *   "error": false,
 *   "message": "AR aging report exported to EXCEL successfully",
 *   "data": {
 *     "sheets": [...],
 *     "metadata": {
 *       "filename": "AR_Aging_Report_2025-12-25.xlsx",
 *       "format": "excel"
 *     }
 *   }
 * }
 */
app.get('/export', authenticate, exportAgingReport);

module.exports = app;
