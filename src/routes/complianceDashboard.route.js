/**
 * Compliance Dashboard Routes
 *
 * Saudi Arabia HR Compliance Monitoring
 * GOSI, WPS, Nitaqat, Labor Law compliance tracking
 *
 * Official Sources: hrsd.gov.sa, mol.gov.sa, gosi.gov.sa, mudad.com.sa
 */

const express = require('express');
const router = express.Router();
const complianceController = require('../controllers/complianceDashboard.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// COMPLIANCE DASHBOARD ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/compliance/dashboard
 * Get full compliance dashboard with all metrics
 */
router.get('/dashboard', complianceController.getComplianceDashboard);

/**
 * GET /api/hr/compliance/gosi
 * Get GOSI (Social Insurance) compliance status
 * Shows contribution calculations and registration status
 */
router.get('/gosi', complianceController.getGosiCompliance);

/**
 * GET /api/hr/compliance/nitaqat
 * Get Nitaqat (Saudization) status
 * Shows current band, percentage, and requirements
 */
router.get('/nitaqat', complianceController.getNitaqatStatus);

/**
 * GET /api/hr/compliance/wps
 * Get WPS (Wage Protection System) status
 * Shows submission deadlines and history
 */
router.get('/wps', complianceController.getWpsStatus);

/**
 * GET /api/hr/compliance/documents/expiring
 * Get expiring employee documents (Iqama, Passport, Work Permit)
 * Query params: daysAhead (default: 30)
 */
router.get('/documents/expiring', complianceController.getExpiringDocumentsEndpoint);

/**
 * GET /api/hr/compliance/probation/ending
 * Get employees with probation period ending soon
 * Query params: daysAhead (default: 30)
 */
router.get('/probation/ending', complianceController.getProbationEndingEndpoint);

/**
 * GET /api/hr/compliance/contracts/expiring
 * Get employees with contracts expiring soon
 * Query params: daysAhead (default: 60)
 */
router.get('/contracts/expiring', complianceController.getContractsExpiringEndpoint);

/**
 * GET /api/hr/compliance/labor-law
 * Get Labor Law compliance checklist
 * Shows status of all key Labor Law requirements
 */
router.get('/labor-law', complianceController.getLaborLawChecklist);

module.exports = router;
