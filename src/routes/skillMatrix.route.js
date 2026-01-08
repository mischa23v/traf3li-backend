/**
 * Skill Matrix & Competency Tracking Routes
 *
 * Enterprise skill management with SFIA 7-level framework
 * Includes: Skills, Skill Types, Competencies, Assessments, CPD
 *
 * SECURITY: All routes require authentication (via global middleware)
 */

const express = require('express');
const router = express.Router();
const skillMatrixController = require('../controllers/skillMatrix.controller');

// ═══════════════════════════════════════════════════════════════
// SFIA FRAMEWORK
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/skills/sfia-levels
 * Get SFIA 7-level proficiency framework
 */
router.get('/sfia-levels', skillMatrixController.getSfiaLevels);

// ═══════════════════════════════════════════════════════════════
// SKILL TYPE ROUTES (Hierarchical Categories)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/skills/types
 * Get all skill types (hierarchical or flat)
 * Query: classification, flat
 */
router.get('/types', skillMatrixController.getSkillTypes);

/**
 * POST /api/hr/skills/types
 * Create skill type
 */
router.post('/types', skillMatrixController.createSkillType);

/**
 * PATCH /api/hr/skills/types/:id
 * Update skill type
 */
router.patch('/types/:id', skillMatrixController.updateSkillType);

// ═══════════════════════════════════════════════════════════════
// COMPETENCY ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/skills/competencies
 * Get all competencies
 * Query: type, cluster, isMandatory, search, page, limit
 */
router.get('/competencies', skillMatrixController.getCompetencies);

/**
 * GET /api/hr/skills/competencies/:id
 * Get single competency
 */
router.get('/competencies/:id', skillMatrixController.getCompetencyById);

/**
 * POST /api/hr/skills/competencies
 * Create competency
 */
router.post('/competencies', skillMatrixController.createCompetency);

/**
 * PATCH /api/hr/skills/competencies/:id
 * Update competency
 */
router.patch('/competencies/:id', skillMatrixController.updateCompetency);

/**
 * DELETE /api/hr/skills/competencies/:id
 * Delete competency (soft delete)
 */
router.delete('/competencies/:id', skillMatrixController.deleteCompetency);

// ═══════════════════════════════════════════════════════════════
// SKILL ASSESSMENT ROUTES (360-Degree)
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/skills/assessments
 * Get skill assessments
 * Query: employeeId, assessmentType, status, page, limit
 */
router.get('/assessments', skillMatrixController.getSkillAssessments);

/**
 * GET /api/hr/skills/assessments/:id
 * Get single assessment
 */
router.get('/assessments/:id', skillMatrixController.getAssessmentById);

/**
 * POST /api/hr/skills/assessments
 * Create skill assessment
 */
router.post('/assessments', skillMatrixController.createAssessment);

/**
 * PATCH /api/hr/skills/assessments/:id
 * Update assessment
 */
router.patch('/assessments/:id', skillMatrixController.updateAssessment);

/**
 * POST /api/hr/skills/assessments/:id/self-assessment
 * Submit self-assessment ratings
 */
router.post('/assessments/:id/self-assessment', skillMatrixController.submitSelfAssessment);

// ═══════════════════════════════════════════════════════════════
// CERTIFICATION & CPD ROUTES
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/hr/skills/expiring-certifications
 * Get certifications expiring soon
 * Query: days (default 30)
 */
router.get('/expiring-certifications', skillMatrixController.getExpiringCertifications);

/**
 * GET /api/hr/skills/cpd-non-compliant
 * Get employees not meeting CPD requirements
 */
router.get('/cpd-non-compliant', skillMatrixController.getCpdNonCompliant);

/**
 * GET /api/hr/skills/needing-review
 * Get skills needing periodic review
 * Query: days (0 = overdue, positive = upcoming)
 */
router.get('/needing-review', skillMatrixController.getSkillsNeedingReview);

// ═══════════════════════════════════════════════════════════════
// SKILL CRUD ROUTES
// ═══════════════════════════════════════════════════════════════

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
 * GET /api/hr/skills
 * Get all skills with filtering
 * Query: category, isVerifiable, isActive, search, page, limit, sortBy, sortOrder
 */
router.get('/', skillMatrixController.getSkills);

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
