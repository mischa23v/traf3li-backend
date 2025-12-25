/**
 * AR Aging Controller
 *
 * HTTP endpoints for Accounts Receivable Aging reports
 *
 * @module controllers/arAging.controller
 */

const arAgingService = require('../services/arAging.service');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Get AR aging report with filters
 * GET /api/ar-aging/report
 *
 * Query params:
 * - firmId: Firm ID (required)
 * - clientId: Filter by specific client
 * - lawyerId: Filter by lawyer
 * - agingBucket: Filter by aging bucket (current, days_1_30, etc.)
 * - minAmount: Minimum balance due
 * - maxAmount: Maximum balance due
 */
const getAgingReport = async (request, response) => {
  try {
    const { firmId, clientId, lawyerId, agingBucket, minAmount, maxAmount } = request.query;

    // Validate required parameters
    if (!firmId) {
      throw CustomException('Firm ID is required', 400);
    }

    const sanitizedFirmId = sanitizeObjectId(firmId);

    // Build filters
    const filters = {};

    if (clientId) {
      filters.clientId = sanitizeObjectId(clientId);
    }

    if (lawyerId) {
      filters.lawyerId = sanitizeObjectId(lawyerId);
    }

    if (agingBucket) {
      // Validate aging bucket
      const validBuckets = ['current', 'days_1_30', 'days_31_60', 'days_61_90', 'days_91_120', 'days_120_plus'];
      if (!validBuckets.includes(agingBucket)) {
        throw CustomException('Invalid aging bucket', 400);
      }
      filters.agingBucket = agingBucket;
    }

    if (minAmount !== undefined) {
      const amount = parseFloat(minAmount);
      if (isNaN(amount) || amount < 0) {
        throw CustomException('Invalid minimum amount', 400);
      }
      filters.minAmount = amount;
    }

    if (maxAmount !== undefined) {
      const amount = parseFloat(maxAmount);
      if (isNaN(amount) || amount < 0) {
        throw CustomException('Invalid maximum amount', 400);
      }
      filters.maxAmount = amount;
    }

    // Get aging report
    const report = await arAgingService.getAgingReport(sanitizedFirmId, filters);

    return response.status(200).send({
      error: false,
      message: 'AR aging report retrieved successfully',
      data: report
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error getting AR aging report:', message);
    return response.status(status).send({
      error: true,
      message
    });
  }
};

/**
 * Get AR aging summary with bucket totals
 * GET /api/ar-aging/summary
 *
 * Query params:
 * - firmId: Firm ID (required)
 */
const getAgingSummary = async (request, response) => {
  try {
    const { firmId } = request.query;

    // Validate required parameters
    if (!firmId) {
      throw CustomException('Firm ID is required', 400);
    }

    const sanitizedFirmId = sanitizeObjectId(firmId);

    // Get aging summary
    const summary = await arAgingService.getAgingSummary(sanitizedFirmId);

    return response.status(200).send({
      error: false,
      message: 'AR aging summary retrieved successfully',
      data: summary
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error getting AR aging summary:', message);
    return response.status(status).send({
      error: true,
      message
    });
  }
};

/**
 * Get AR aging report for specific client
 * GET /api/ar-aging/client/:clientId
 *
 * Query params:
 * - firmId: Firm ID (required)
 */
const getAgingByClient = async (request, response) => {
  try {
    const { clientId } = request.params;
    const { firmId } = request.query;

    // Validate required parameters
    if (!clientId) {
      throw CustomException('Client ID is required', 400);
    }

    if (!firmId) {
      throw CustomException('Firm ID is required', 400);
    }

    const sanitizedFirmId = sanitizeObjectId(firmId);
    const sanitizedClientId = sanitizeObjectId(clientId);

    // Get client aging report
    const report = await arAgingService.getAgingByClient(sanitizedFirmId, sanitizedClientId);

    return response.status(200).send({
      error: false,
      message: 'Client AR aging report retrieved successfully',
      data: report
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error getting client AR aging report:', message);
    return response.status(status).send({
      error: true,
      message
    });
  }
};

/**
 * Get collection forecast
 * GET /api/ar-aging/forecast
 *
 * Query params:
 * - firmId: Firm ID (required)
 */
const getCollectionForecast = async (request, response) => {
  try {
    const { firmId } = request.query;

    // Validate required parameters
    if (!firmId) {
      throw CustomException('Firm ID is required', 400);
    }

    const sanitizedFirmId = sanitizeObjectId(firmId);

    // Get collection forecast
    const forecast = await arAgingService.getCollectionForecast(sanitizedFirmId);

    return response.status(200).send({
      error: false,
      message: 'Collection forecast retrieved successfully',
      data: forecast
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error getting collection forecast:', message);
    return response.status(status).send({
      error: true,
      message
    });
  }
};

/**
 * Get collection priority score for an invoice
 * GET /api/ar-aging/priority/:invoiceId
 *
 * Params:
 * - invoiceId: Invoice ID (required)
 */
const getCollectionPriorityScore = async (request, response) => {
  try {
    const { invoiceId } = request.params;

    // Validate required parameters
    if (!invoiceId) {
      throw CustomException('Invoice ID is required', 400);
    }

    const sanitizedInvoiceId = sanitizeObjectId(invoiceId);

    // Get priority score
    const priorityScore = await arAgingService.getCollectionPriorityScore(sanitizedInvoiceId);

    return response.status(200).send({
      error: false,
      message: 'Collection priority score calculated successfully',
      data: priorityScore
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error getting collection priority score:', message);
    return response.status(status).send({
      error: true,
      message
    });
  }
};

/**
 * Export AR aging report
 * GET /api/ar-aging/export
 *
 * Query params:
 * - firmId: Firm ID (required)
 * - format: Export format ('excel' or 'pdf', default: 'excel')
 * - clientId: Filter by specific client
 * - lawyerId: Filter by lawyer
 * - agingBucket: Filter by aging bucket
 */
const exportAgingReport = async (request, response) => {
  try {
    const { firmId, format = 'excel', clientId, lawyerId, agingBucket } = request.query;

    // Validate required parameters
    if (!firmId) {
      throw CustomException('Firm ID is required', 400);
    }

    // Validate format
    if (!['excel', 'pdf'].includes(format)) {
      throw CustomException('Invalid format. Use "excel" or "pdf"', 400);
    }

    const sanitizedFirmId = sanitizeObjectId(firmId);

    // Build filters
    const filters = {};

    if (clientId) {
      filters.clientId = sanitizeObjectId(clientId);
    }

    if (lawyerId) {
      filters.lawyerId = sanitizeObjectId(lawyerId);
    }

    if (agingBucket) {
      // Validate aging bucket
      const validBuckets = ['current', 'days_1_30', 'days_31_60', 'days_61_90', 'days_91_120', 'days_120_plus'];
      if (!validBuckets.includes(agingBucket)) {
        throw CustomException('Invalid aging bucket', 400);
      }
      filters.agingBucket = agingBucket;
    }

    // Export report
    const exportData = await arAgingService.exportAgingReport(sanitizedFirmId, format, filters);

    return response.status(200).send({
      error: false,
      message: `AR aging report exported to ${format.toUpperCase()} successfully`,
      data: exportData
    });
  } catch ({ message, status = 500 }) {
    logger.error('Error exporting AR aging report:', message);
    return response.status(status).send({
      error: true,
      message
    });
  }
};

module.exports = {
  getAgingReport,
  getAgingSummary,
  getAgingByClient,
  getCollectionForecast,
  getCollectionPriorityScore,
  exportAgingReport
};
