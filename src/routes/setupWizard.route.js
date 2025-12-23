const express = require('express');
const router = express.Router();
const setupWizardController = require('../controllers/setupWizard.controller');
const { verifyToken } = require('../middlewares/jwt');
const { attachFirmContext } = require('../middlewares/firmContext.middleware');
const { requireAdmin } = require('../middlewares/permission.middleware');

// Apply authentication and firm context middleware to all routes
router.use(verifyToken);
router.use(attachFirmContext);

// ═══════════════════════════════════════════════════════════════
// USER ENDPOINTS - Setup Wizard Progress
// ═══════════════════════════════════════════════════════════════

// GET /api/setup/status - Get full setup status with all sections and tasks
router.get('/status', setupWizardController.getSetupStatus);

// GET /api/setup/sections - Get all active sections with their tasks
router.get('/sections', setupWizardController.getSections);

// POST /api/setup/tasks/:taskId/complete - Mark task as complete
router.post('/tasks/:taskId/complete', setupWizardController.completeTask);

// POST /api/setup/tasks/:taskId/skip - Mark task as skipped
router.post('/tasks/:taskId/skip', setupWizardController.skipTask);

// GET /api/setup/next-task - Get next incomplete required task
router.get('/next-task', setupWizardController.getNextTask);

// GET /api/setup/progress-percentage - Calculate overall completion percentage
router.get('/progress-percentage', setupWizardController.getProgressPercentage);

// POST /api/setup/reset - Reset user's setup progress (admin only)
router.post('/reset', requireAdmin(), setupWizardController.resetProgress);

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS - Section Management
// ═══════════════════════════════════════════════════════════════

// POST /api/setup/admin/sections - Create new section
router.post('/admin/sections', requireAdmin(), setupWizardController.createSection);

// PATCH /api/setup/admin/sections/:sectionId - Update section
router.patch('/admin/sections/:sectionId', requireAdmin(), setupWizardController.updateSection);

// DELETE /api/setup/admin/sections/:sectionId - Delete section
router.delete('/admin/sections/:sectionId', requireAdmin(), setupWizardController.deleteSection);

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS - Task Management
// ═══════════════════════════════════════════════════════════════

// POST /api/setup/admin/tasks - Create new task
router.post('/admin/tasks', requireAdmin(), setupWizardController.createTask);

// PATCH /api/setup/admin/tasks/:taskId - Update task
router.patch('/admin/tasks/:taskId', requireAdmin(), setupWizardController.updateTask);

// DELETE /api/setup/admin/tasks/:taskId - Delete task
router.delete('/admin/tasks/:taskId', requireAdmin(), setupWizardController.deleteTask);

module.exports = router;
