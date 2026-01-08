/**
 * Employee Self-Service Portal Routes
 *
 * Unified employee portal for:
 * - Personal profile management
 * - Leave requests and balances
 * - Loan and advance requests
 * - Payslip viewing
 * - Pending approvals (as approver)
 *
 * Inspired by: Odoo, ERPNext, BambooHR, ZenHR, Jisr
 */

const express = require('express');
const router = express.Router();
const selfServiceController = require('../controllers/employeeSelfService.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { sanitizeObjectId } = require('../utils/securityUtils');

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// DASHBOARD & PROFILE
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/self-service/dashboard
 * Get employee's main portal dashboard
 * Returns summary of leave, loans, advances, payslips, approvals
 */
router.get('/dashboard', selfServiceController.getMyDashboard);

/**
 * GET /api/hr/self-service/profile
 * Get employee's profile information
 */
router.get('/profile', selfServiceController.getMyProfile);

/**
 * PATCH /api/hr/self-service/profile
 * Update limited profile fields (contact info, address, emergency contact)
 */
router.patch('/profile', selfServiceController.updateMyProfile);

// ═══════════════════════════════════════════════════════════════
// LEAVE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/self-service/leave/balances
 * Get employee's leave balances
 * Query params: year (default: current year)
 */
router.get('/leave/balances', selfServiceController.getMyLeaveBalances);

/**
 * GET /api/hr/self-service/leave/requests
 * Get employee's leave request history
 * Query params: status, page, limit
 */
router.get('/leave/requests', selfServiceController.getMyLeaveRequests);

/**
 * POST /api/hr/self-service/leave/request
 * Submit a new leave request
 * Body: leaveType, startDate, endDate, reason, halfDay, attachments
 */
router.post('/leave/request', selfServiceController.submitLeaveRequest);

/**
 * POST /api/hr/self-service/leave/request/:requestId/cancel
 * Cancel a pending leave request
 */
router.post('/leave/request/:requestId/cancel', selfServiceController.cancelMyLeaveRequest);

// ═══════════════════════════════════════════════════════════════
// FINANCIAL REQUESTS
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/self-service/loans
 * Get employee's loan history
 */
router.get('/loans', selfServiceController.getMyLoans);

/**
 * GET /api/hr/self-service/advances
 * Get employee's advance history
 */
router.get('/advances', selfServiceController.getMyAdvances);

// ═══════════════════════════════════════════════════════════════
// PAYROLL
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/self-service/payslips
 * Get employee's payslip history
 * Query params: year
 */
router.get('/payslips', selfServiceController.getMyPayslips);

// ═══════════════════════════════════════════════════════════════
// APPROVALS (As Approver)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/self-service/approvals/pending
 * Get pending approval items (leave, loans, advances)
 * Query params: type (leave, loan, advance), page, limit
 */
router.get('/approvals/pending', selfServiceController.getMyPendingApprovals);

module.exports = router;
