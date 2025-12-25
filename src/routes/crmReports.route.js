/**
 * CRM Reports Routes
 *
 * Routes for CRM analytics and reporting.
 */

const express = require('express');
const router = express.Router();
const crmReportsController = require('../controllers/crmReports.controller');
const {
    validateCampaignEfficiency,
    validateLeadOwnerEfficiency,
    validateFirstResponseTime,
    validateLostOpportunity,
    validateSalesPipeline,
    validateProspectsEngaged,
    validateLeadConversionTime
} = require('../validators/crm.validator');
const { verifyToken } = require('../middlewares/jwt');
const { firmFilter } = require('../middlewares/firmFilter.middleware');
const { sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

// Apply authentication and firm filter middleware
router.use(verifyToken, firmFilter);

// ═══════════════════════════════════════════════════════════════
// CRM REPORTS ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * @route   GET /api/v1/reports/crm/campaign-efficiency
 * @desc    Get campaign efficiency report
 * @access  Private
 */
router.get('/campaign-efficiency', sensitiveRateLimiter, validateCampaignEfficiency, crmReportsController.getCampaignEfficiency);

/**
 * @route   GET /api/v1/reports/crm/lead-owner-efficiency
 * @desc    Get lead owner efficiency report
 * @access  Private
 */
router.get('/lead-owner-efficiency', sensitiveRateLimiter, validateLeadOwnerEfficiency, crmReportsController.getLeadOwnerEfficiency);

/**
 * @route   GET /api/v1/reports/crm/first-response-time
 * @desc    Get first response time report
 * @access  Private
 */
router.get('/first-response-time', sensitiveRateLimiter, validateFirstResponseTime, crmReportsController.getFirstResponseTime);

/**
 * @route   GET /api/v1/reports/crm/lost-opportunity
 * @desc    Get lost opportunity analysis report
 * @access  Private
 */
router.get('/lost-opportunity', sensitiveRateLimiter, validateLostOpportunity, crmReportsController.getLostOpportunity);

/**
 * @route   GET /api/v1/reports/crm/sales-pipeline
 * @desc    Get sales pipeline report
 * @access  Private
 */
router.get('/sales-pipeline', sensitiveRateLimiter, validateSalesPipeline, crmReportsController.getSalesPipeline);

/**
 * @route   GET /api/v1/reports/crm/prospects-engaged
 * @desc    Get prospects engaged but not converted report
 * @access  Private
 */
router.get('/prospects-engaged', sensitiveRateLimiter, validateProspectsEngaged, crmReportsController.getProspectsEngaged);

/**
 * @route   GET /api/v1/reports/crm/lead-conversion-time
 * @desc    Get lead conversion time report
 * @access  Private
 */
router.get('/lead-conversion-time', sensitiveRateLimiter, validateLeadConversionTime, crmReportsController.getLeadConversionTime);

module.exports = router;
