const express = require('express');
const router = express.Router();
const cycleController = require('../controllers/cycle.controller');
const { userMiddleware, firmFilter } = require('../middlewares');

// Apply authentication and firm filtering to all routes
router.use(userMiddleware);
router.use(firmFilter);

// Special queries (must be before :id routes)
router.get('/active', cycleController.getActiveCycle);
router.get('/stats', cycleController.getCycleStats);

// Cycle management
router.get('/', cycleController.listCycles);
router.post('/', cycleController.createCycle);
router.get('/:id', cycleController.getCycle);
router.post('/:id/start', cycleController.startCycle);
router.post('/:id/complete', cycleController.completeCycle);
router.get('/:id/progress', cycleController.getCycleProgress);
router.get('/:id/burndown', cycleController.getBurndown);

// Task management in cycles
router.post('/:id/tasks/:taskId', cycleController.addTaskToCycle);
router.delete('/:id/tasks/:taskId', cycleController.removeTaskFromCycle);

module.exports = router;
