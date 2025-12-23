const express = require('express');
const router = express.Router();
const compensationRewardController = require('../controllers/compensationReward.controller');
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

// Statistics & Reports
router.get('/stats', compensationRewardController.getCompensationStats);
router.get('/pending-reviews', compensationRewardController.getPendingReviews);
router.get('/department-summary', compensationRewardController.getDepartmentSummary);
router.get('/export', compensationRewardController.exportCompensation);

// Pay Grade Analysis
router.get('/pay-grade-analysis/:payGrade', compensationRewardController.getPayGradeAnalysis);

// Get compensation by employee (before :id to avoid conflict)
router.get('/employee/:employeeId', compensationRewardController.getEmployeeCompensation);

// ═══════════════════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// List all compensation records
router.get('/', compensationRewardController.getCompensationRecords);

// Create new compensation record
router.post('/', compensationRewardController.createCompensationRecord);

// Bulk delete
router.post('/bulk-delete', compensationRewardController.bulkDeleteRecords);

// ═══════════════════════════════════════════════════════════════
// SINGLE RECORD OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Get single compensation record
router.get('/:id', compensationRewardController.getCompensationRecord);

// Update compensation record
router.patch('/:id', compensationRewardController.updateCompensationRecord);
router.put('/:id', compensationRewardController.updateCompensationRecord);

// Delete compensation record
router.delete('/:id', compensationRewardController.deleteCompensationRecord);

// ═══════════════════════════════════════════════════════════════
// SALARY OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Process salary increase
router.post('/:id/salary-increase', compensationRewardController.processSalaryIncrease);

// ═══════════════════════════════════════════════════════════════
// ALLOWANCE OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Add allowance
router.post('/:id/allowances', compensationRewardController.addAllowance);

// Update allowance
router.patch('/:id/allowances/:allowanceId', compensationRewardController.updateAllowance);
router.put('/:id/allowances/:allowanceId', compensationRewardController.updateAllowance);

// Remove allowance
router.delete('/:id/allowances/:allowanceId', compensationRewardController.removeAllowance);

// ═══════════════════════════════════════════════════════════════
// BONUS OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Process bonus
router.post('/:id/bonus', compensationRewardController.processBonus);

// ═══════════════════════════════════════════════════════════════
// SALARY REVIEW OPERATIONS
// ═══════════════════════════════════════════════════════════════

// Submit for salary review
router.post('/:id/submit-review', compensationRewardController.submitForReview);

// Approve salary review
router.post('/:id/approve-review', compensationRewardController.approveReview);

// Decline salary review
router.post('/:id/decline-review', compensationRewardController.declineReview);

// ═══════════════════════════════════════════════════════════════
// RECOGNITION & AWARDS
// ═══════════════════════════════════════════════════════════════

// Add recognition award
router.post('/:id/recognition', compensationRewardController.addRecognition);

// ═══════════════════════════════════════════════════════════════
// TOTAL REWARDS STATEMENT
// ═══════════════════════════════════════════════════════════════

// Generate total rewards statement
router.post('/:id/total-rewards-statement', compensationRewardController.generateTotalRewardsStatement);

module.exports = router;
