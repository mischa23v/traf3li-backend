const express = require('express');
const router = express.Router();
const organizationalUnitController = require('../controllers/organizationalUnit.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Statistics
router.get('/stats', organizationalUnitController.getOrganizationalUnitStats);

// Hierarchy tree
router.get('/tree', organizationalUnitController.getOrganizationalTree);

// Export
router.get('/export', organizationalUnitController.exportOrganizationalUnits);

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List all organizational units
router.get('/', organizationalUnitController.getOrganizationalUnits);

// Create new organizational unit
router.post('/', organizationalUnitController.createOrganizationalUnit);

// Bulk delete
router.post('/bulk-delete', organizationalUnitController.bulkDeleteOrganizationalUnits);

// ═══════════════════════════════════════════════════════════════
// SINGLE UNIT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get single organizational unit
router.get('/:id', organizationalUnitController.getOrganizationalUnit);

// Update organizational unit
router.patch('/:id', organizationalUnitController.updateOrganizationalUnit);

// Delete organizational unit
router.delete('/:id', organizationalUnitController.deleteOrganizationalUnit);

// ═══════════════════════════════════════════════════════════════
// HIERARCHY OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get child units
router.get('/:id/children', organizationalUnitController.getChildUnits);

// Get unit path (ancestors)
router.get('/:id/path', organizationalUnitController.getUnitPath);

// Move unit to new parent
router.post('/:id/move', organizationalUnitController.moveOrganizationalUnit);

// ═══════════════════════════════════════════════════════════════
// STATUS OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Dissolve unit
router.post('/:id/dissolve', organizationalUnitController.dissolveOrganizationalUnit);

// Activate unit
router.post('/:id/activate', organizationalUnitController.activateOrganizationalUnit);

// Deactivate unit
router.post('/:id/deactivate', organizationalUnitController.deactivateOrganizationalUnit);

// ═══════════════════════════════════════════════════════════════
// HEADCOUNT & BUDGET
// ═══════════════════════════════════════════════════════════════

// Update headcount
router.patch('/:id/headcount', organizationalUnitController.updateHeadcount);

// Update budget
router.patch('/:id/budget', organizationalUnitController.updateBudget);

// ═══════════════════════════════════════════════════════════════
// KPIs
// ═══════════════════════════════════════════════════════════════

// Add KPI
router.post('/:id/kpis', organizationalUnitController.addKPI);

// Update KPI
router.patch('/:id/kpis/:kpiId', organizationalUnitController.updateKPI);

// Delete KPI
router.delete('/:id/kpis/:kpiId', organizationalUnitController.deleteKPI);

// ═══════════════════════════════════════════════════════════════
// LEADERSHIP
// ═══════════════════════════════════════════════════════════════

// Add leadership position
router.post('/:id/leadership', organizationalUnitController.addLeadershipPosition);

// Update leadership position
router.patch('/:id/leadership/:positionId', organizationalUnitController.updateLeadershipPosition);

// Delete leadership position
router.delete('/:id/leadership/:positionId', organizationalUnitController.deleteLeadershipPosition);

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════

// Add document
router.post('/:id/documents', organizationalUnitController.addDocument);

module.exports = router;
