const express = require('express');
const router = express.Router();
const caseController = require('../controllers/case.controller');
const { authenticate } = require('../middlewares/authenticate');

// All routes require authentication
router.use(authenticate);

// Get all cases
router.get('/', caseController.getCases);

// Get case statistics
router.get('/stats', caseController.getCaseStats);

// Get single case (with financial data)
router.get('/:id', caseController.getCase);

// Get case timeline
router.get('/:id/timeline', caseController.getCaseTimeline);

// Create case
router.post('/', caseController.createCase);

// Update case
router.put('/:id', caseController.updateCase);

// Delete case
router.delete('/:id', caseController.deleteCase);

module.exports = router;
