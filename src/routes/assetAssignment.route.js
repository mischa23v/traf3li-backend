const express = require('express');
const router = express.Router();
const assetAssignmentController = require('../controllers/assetAssignment.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

/**
 * Asset Assignment Routes - HR Management
 * Module 14: الأصول والمعدات (Assets & Equipment)
 * Base path: /api/hr/asset-assignments
 */

// Apply authentication middleware
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/asset-assignments/stats - Get assignment statistics
router.get('/stats', assetAssignmentController.getAssignmentStats);

// GET /api/hr/asset-assignments/overdue - Get overdue returns
router.get('/overdue', assetAssignmentController.getOverdueReturns);

// GET /api/hr/asset-assignments/maintenance-due - Get assets needing maintenance
router.get('/maintenance-due', assetAssignmentController.getMaintenanceDue);

// GET /api/hr/asset-assignments/warranty-expiring - Get warranty expiring soon
router.get('/warranty-expiring', assetAssignmentController.getWarrantyExpiring);

// GET /api/hr/asset-assignments/export - Export assignments
router.get('/export', assetAssignmentController.exportAssignments);

// GET /api/hr/asset-assignments/policies - Get asset policies
router.get('/policies', assetAssignmentController.getPolicies);

// POST /api/hr/asset-assignments/bulk-delete - Bulk delete assignments
router.post('/bulk-delete', assetAssignmentController.bulkDeleteAssignments);

// GET /api/hr/asset-assignments/by-employee/:employeeId - Get employee's assignments
router.get('/by-employee/:employeeId', assetAssignmentController.getAssignmentsByEmployee);

// ═══════════════════════════════════════════════════════════════
// CORE CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/hr/asset-assignments - List all assignments
router.get('/', assetAssignmentController.getAssignments);

// POST /api/hr/asset-assignments - Create new assignment
router.post('/', assetAssignmentController.createAssignment);

// GET /api/hr/asset-assignments/:id - Get single assignment
router.get('/:id', assetAssignmentController.getAssignment);

// PATCH /api/hr/asset-assignments/:id - Update assignment
router.patch('/:id', assetAssignmentController.updateAssignment);

// DELETE /api/hr/asset-assignments/:id - Delete assignment
router.delete('/:id', assetAssignmentController.deleteAssignment);

// ═══════════════════════════════════════════════════════════════
// WORKFLOW ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/asset-assignments/:id/acknowledge - Employee acknowledges receipt
router.post('/:id/acknowledge', assetAssignmentController.acknowledgeAssignment);

// POST /api/hr/asset-assignments/:id/return/initiate - Initiate return process
router.post('/:id/return/initiate', assetAssignmentController.initiateReturn);

// POST /api/hr/asset-assignments/:id/return/complete - Complete return
router.post('/:id/return/complete', assetAssignmentController.completeReturn);

// PUT /api/hr/asset-assignments/:id/status - Update assignment status
router.put('/:id/status', assetAssignmentController.updateStatus);

// POST /api/hr/asset-assignments/:id/transfer - Transfer to another employee
router.post('/:id/transfer', assetAssignmentController.transferAsset);

// POST /api/hr/asset-assignments/:id/clearance - Issue clearance certificate
router.post('/:id/clearance', assetAssignmentController.issueClearance);

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE & REPAIRS ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/asset-assignments/:id/maintenance - Record maintenance
router.post('/:id/maintenance', assetAssignmentController.recordMaintenance);

// POST /api/hr/asset-assignments/:id/repair - Report repair needed
router.post('/:id/repair', assetAssignmentController.reportRepair);

// PUT /api/hr/asset-assignments/:id/repair/:repairId - Update repair status
router.put('/:id/repair/:repairId', assetAssignmentController.updateRepairStatus);

// ═══════════════════════════════════════════════════════════════
// INCIDENT ROUTES
// ═══════════════════════════════════════════════════════════════

// POST /api/hr/asset-assignments/:id/incident - Report incident
router.post('/:id/incident', assetAssignmentController.reportIncident);

module.exports = router;
