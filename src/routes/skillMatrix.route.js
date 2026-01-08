/**
 * Skill Matrix & Competency Tracking Routes
 *
 * Enterprise skill management endpoints
 *
 * SECURITY: All routes require authentication (via global middleware)
 */

const express = require('express');
const router = express.Router();
const skillMatrixController = require('../controllers/skillMatrix.controller');

// ═══════════════════════════════════════════════════════════════
// SKILL CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/skills
 * Get all skills with filtering
 * Query: category, isVerifiable, isActive, search, page, limit, sortBy, sortOrder
 */
router.get('/', skillMatrixController.getSkills);

/**
 * GET /api/hr/skills/by-category
 * Get skills grouped by category
 */
router.get('/by-category', skillMatrixController.getSkillsByCategory);

/**
 * GET /api/hr/skills/stats
 * Get skill statistics
 */
router.get('/stats', skillMatrixController.getSkillStats);

/**
 * GET /api/hr/skills/matrix
 * Get team skill matrix
 * Query: departmentId, skillCategory, skillIds
 */
router.get('/matrix', skillMatrixController.getSkillMatrix);

/**
 * GET /api/hr/skills/gap-analysis
 * Get skill gap analysis
 * Query: departmentId, roleId, targetProficiency
 */
router.get('/gap-analysis', skillMatrixController.getSkillGapAnalysis);

/**
 * GET /api/hr/skills/:id
 * Get single skill details
 */
router.get('/:id', skillMatrixController.getSkillById);

/**
 * POST /api/hr/skills
 * Create new skill
 */
router.post('/', skillMatrixController.createSkill);

/**
 * PATCH /api/hr/skills/:id
 * Update skill
 */
router.patch('/:id', skillMatrixController.updateSkill);

/**
 * DELETE /api/hr/skills/:id
 * Delete skill (soft delete if assigned)
 */
router.delete('/:id', skillMatrixController.deleteSkill);

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE SKILL ASSIGNMENT ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/hr/skills/assign
 * Assign skill to employee
 */
router.post('/assign', skillMatrixController.assignSkillToEmployee);

/**
 * DELETE /api/hr/skills/assign/:employeeId/:skillId
 * Remove skill from employee
 */
router.delete('/assign/:employeeId/:skillId', skillMatrixController.removeSkillFromEmployee);

/**
 * GET /api/hr/skills/employee/:employeeId
 * Get employee skills
 */
router.get('/employee/:employeeId', skillMatrixController.getEmployeeSkills);

/**
 * GET /api/hr/skills/:skillId/employees
 * Find employees with specific skill
 * Query: minProficiency, verified
 */
router.get('/:skillId/employees', skillMatrixController.getEmployeesWithSkill);

// ═══════════════════════════════════════════════════════════════
// VERIFICATION & ENDORSEMENT ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/hr/skills/verify
 * Verify employee skill
 */
router.post('/verify', skillMatrixController.verifySkill);

/**
 * POST /api/hr/skills/endorse
 * Endorse employee skill (peer endorsement)
 */
router.post('/endorse', skillMatrixController.endorseSkill);

module.exports = router;
