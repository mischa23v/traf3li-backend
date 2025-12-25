/**
 * Playbook Routes - Incident Response Playbook API
 *
 * All routes require authentication and firm membership.
 */

const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
const {
  listPlaybooks,
  createPlaybook,
  getPlaybook,
  updatePlaybook,
  deletePlaybook,
  startExecution,
  advanceStep,
  skipStep,
  abortExecution,
  retryStep,
  getExecutionStatus,
  getExecutionHistory,
  matchPlaybook,
  getPlaybookStats,
  getExecutionStats
} = require('../controllers/playbook.controller');

const router = express.Router();

// Apply authentication and firm filter to all routes
router.use(userMiddleware, firmFilter);

// ═══════════════════════════════════════════════════════════════
// PLAYBOOK MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/playbooks - List playbooks
router.get('/', listPlaybooks);

// POST /api/playbooks - Create playbook
router.post('/', createPlaybook);

// GET /api/playbooks/stats - Get playbook statistics
router.get('/stats', getPlaybookStats);

// POST /api/playbooks/match - Match playbook for incident
router.post('/match', matchPlaybook);

// GET /api/playbooks/:id - Get playbook by ID
router.get('/:id', getPlaybook);

// PUT /api/playbooks/:id - Update playbook
router.put('/:id', updatePlaybook);

// DELETE /api/playbooks/:id - Delete playbook
router.delete('/:id', deletePlaybook);

// ═══════════════════════════════════════════════════════════════
// EXECUTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// POST /api/playbooks/execute - Start playbook execution
router.post('/execute', startExecution);

// GET /api/playbooks/executions/stats - Get execution statistics
router.get('/executions/stats', getExecutionStats);

// GET /api/playbooks/executions/incident/:incidentId - Get execution history for incident
router.get('/executions/incident/:incidentId', getExecutionHistory);

// GET /api/playbooks/executions/:id - Get execution status
router.get('/executions/:id', getExecutionStatus);

// POST /api/playbooks/executions/:id/advance - Advance to next step
router.post('/executions/:id/advance', advanceStep);

// POST /api/playbooks/executions/:id/skip - Skip step
router.post('/executions/:id/skip', skipStep);

// POST /api/playbooks/executions/:id/abort - Abort execution
router.post('/executions/:id/abort', abortExecution);

// POST /api/playbooks/executions/:id/retry/:stepIndex - Retry failed step
router.post('/executions/:id/retry/:stepIndex', retryStep);

module.exports = router;
