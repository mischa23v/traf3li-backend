const express = require('express');
const router = express.Router();
const jobPositionController = require('../controllers/jobPosition.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

router.use(apiRateLimiter);
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// STATIC ROUTES (must come before parameterized routes)
// ═══════════════════════════════════════════════════════════════

// Statistics
router.get('/stats', jobPositionController.getJobPositionStats);

// Vacant positions
router.get('/vacant', jobPositionController.getVacantPositions);

// Org chart
router.get('/org-chart', jobPositionController.getOrgChart);

// Export
router.get('/export', jobPositionController.exportJobPositions);

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List all job positions
router.get('/', jobPositionController.getJobPositions);

// Create new job position
router.post('/', jobPositionController.createJobPosition);

// Bulk delete
router.post('/bulk-delete', jobPositionController.bulkDeleteJobPositions);

// ═══════════════════════════════════════════════════════════════
// DEPARTMENT ROUTES
// ═══════════════════════════════════════════════════════════════

// Get positions by department
router.get('/department/:departmentId', jobPositionController.getPositionsByDepartment);

// ═══════════════════════════════════════════════════════════════
// SINGLE POSITION OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get single job position
router.get('/:id', jobPositionController.getJobPosition);

// Update job position
router.patch('/:id', jobPositionController.updateJobPosition);
router.put('/:id', jobPositionController.updateJobPosition);

// Delete job position
router.delete('/:id', jobPositionController.deleteJobPosition);

// ═══════════════════════════════════════════════════════════════
// HIERARCHY OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get position hierarchy (upward chain and direct reports)
router.get('/:id/hierarchy', jobPositionController.getPositionHierarchy);

// ═══════════════════════════════════════════════════════════════
// STATUS OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Freeze position
router.post('/:id/freeze', jobPositionController.freezePosition);

// Unfreeze position
router.post('/:id/unfreeze', jobPositionController.unfreezePosition);

// Eliminate position
router.post('/:id/eliminate', jobPositionController.eliminatePosition);

// Mark position as vacant
router.post('/:id/vacant', jobPositionController.markPositionVacant);

// ═══════════════════════════════════════════════════════════════
// INCUMBENT OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Fill position (assign incumbent)
router.post('/:id/fill', jobPositionController.fillPosition);

// Vacate position (remove incumbent)
router.post('/:id/vacate', jobPositionController.vacatePosition);

// ═══════════════════════════════════════════════════════════════
// CLONE & COPY
// ═══════════════════════════════════════════════════════════════

// Clone position
router.post('/:id/clone', jobPositionController.clonePosition);

// ═══════════════════════════════════════════════════════════════
// SECTION UPDATES
// ═══════════════════════════════════════════════════════════════

// Update responsibilities
router.put('/:id/responsibilities', jobPositionController.updateResponsibilities);

// Update qualifications
router.put('/:id/qualifications', jobPositionController.updateQualifications);

// Update salary range
router.put('/:id/salary-range', jobPositionController.updateSalaryRange);

// Update competencies
router.put('/:id/competencies', jobPositionController.updateCompetencies);

// ═══════════════════════════════════════════════════════════════
// DOCUMENTS
// ═══════════════════════════════════════════════════════════════

// Add document
router.post('/:id/documents', jobPositionController.addDocument);

module.exports = router;
