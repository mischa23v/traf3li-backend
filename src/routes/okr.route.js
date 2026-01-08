/**
 * OKR & 9-Box Grid Routes
 *
 * Enterprise goal and talent management
 *
 * SECURITY: All routes require authentication (via global middleware)
 */

const express = require('express');
const router = express.Router();
const okrController = require('../controllers/okr.controller');

// ═══════════════════════════════════════════════════════════════
// OKR ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/okrs/stats
 * Get OKR statistics
 */
router.get('/stats', okrController.getOKRStats);

/**
 * GET /api/hr/okrs/tree
 * Get OKR tree (hierarchical view)
 */
router.get('/tree', okrController.getOKRTree);

/**
 * GET /api/hr/okrs
 * Get all OKRs
 */
router.get('/', okrController.getOKRs);

/**
 * GET /api/hr/okrs/:id
 * Get single OKR
 */
router.get('/:id', okrController.getOKRById);

/**
 * POST /api/hr/okrs
 * Create OKR
 */
router.post('/', okrController.createOKR);

/**
 * PATCH /api/hr/okrs/:id
 * Update OKR
 */
router.patch('/:id', okrController.updateOKR);

/**
 * POST /api/hr/okrs/:id/activate
 * Activate OKR
 */
router.post('/:id/activate', okrController.activateOKR);

/**
 * PATCH /api/hr/okrs/:id/key-results/:keyResultId
 * Update key result progress
 */
router.patch('/:id/key-results/:keyResultId', okrController.updateKeyResult);

/**
 * POST /api/hr/okrs/:id/check-in
 * Add check-in
 */
router.post('/:id/check-in', okrController.addCheckIn);

/**
 * DELETE /api/hr/okrs/:id
 * Delete OKR
 */
router.delete('/:id', okrController.deleteOKR);

// ═══════════════════════════════════════════════════════════════
// 9-BOX GRID ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/nine-box/distribution
 * Get 9-Box grid distribution
 */
router.get('/nine-box/distribution', okrController.getNineBoxDistribution);

/**
 * GET /api/hr/nine-box/succession
 * Get succession candidates
 */
router.get('/nine-box/succession', okrController.getSuccessionCandidates);

/**
 * GET /api/hr/nine-box/employee/:employeeId
 * Get employee's 9-Box history
 */
router.get('/nine-box/employee/:employeeId', okrController.getEmployeeNineBoxHistory);

/**
 * GET /api/hr/nine-box
 * Get 9-Box assessments
 */
router.get('/nine-box', okrController.getNineBoxAssessments);

/**
 * POST /api/hr/nine-box
 * Create or update 9-Box assessment
 */
router.post('/nine-box', okrController.createNineBoxAssessment);

module.exports = router;
