/**
 * Expense Policy Routes
 *
 * Routes for managing expense policies
 */

const express = require('express');
const router = express.Router();
const { userMiddleware } = require('../middlewares');
const { firmAdminOnly, financeAccessOnly } = require('../middlewares/firmFilter.middleware');
const {
    getExpensePolicies,
    getExpensePolicy,
    getDefaultPolicy,
    getMyPolicy,
    createExpensePolicy,
    updateExpensePolicy,
    deleteExpensePolicy,
    setAsDefault,
    toggleStatus,
    duplicatePolicy,
    checkCompliance,
    createDefaultPolicy
} = require('../controllers/expensePolicy.controller');

// All routes require authentication
router.use(userMiddleware);

/**
 * @route   GET /api/expense-policies
 * @desc    Get all expense policies
 * @access  Private - Finance access
 */
router.get('/', financeAccessOnly, getExpensePolicies);

/**
 * @route   GET /api/expense-policies/default
 * @desc    Get default expense policy
 * @access  Private
 */
router.get('/default', getDefaultPolicy);

/**
 * @route   GET /api/expense-policies/my-policy
 * @desc    Get applicable policy for current user
 * @access  Private
 */
router.get('/my-policy', getMyPolicy);

/**
 * @route   POST /api/expense-policies/create-default
 * @desc    Create default expense policy
 * @access  Private - Admin only
 */
router.post('/create-default', firmAdminOnly, createDefaultPolicy);

/**
 * @route   GET /api/expense-policies/:id
 * @desc    Get single expense policy
 * @access  Private - Finance access
 */
router.get('/:id', financeAccessOnly, getExpensePolicy);

/**
 * @route   POST /api/expense-policies
 * @desc    Create expense policy
 * @access  Private - Admin only
 */
router.post('/', firmAdminOnly, createExpensePolicy);

/**
 * @route   PUT /api/expense-policies/:id
 * @desc    Update expense policy
 * @access  Private - Admin only
 */
router.put('/:id', firmAdminOnly, updateExpensePolicy);

/**
 * @route   POST /api/expense-policies/:id/set-default
 * @desc    Set expense policy as default
 * @access  Private - Admin only
 */
router.post('/:id/set-default', firmAdminOnly, setAsDefault);

/**
 * @route   POST /api/expense-policies/:id/toggle-status
 * @desc    Toggle expense policy active status
 * @access  Private - Admin only
 */
router.post('/:id/toggle-status', firmAdminOnly, toggleStatus);

/**
 * @route   POST /api/expense-policies/:id/duplicate
 * @desc    Duplicate expense policy
 * @access  Private - Admin only
 */
router.post('/:id/duplicate', firmAdminOnly, duplicatePolicy);

/**
 * @route   POST /api/expense-policies/:policyId/check-compliance
 * @desc    Check expense compliance against a policy
 * @access  Private
 */
router.post('/:policyId/check-compliance', checkCompliance);

/**
 * @route   POST /api/expense-policies/check-compliance
 * @desc    Check expense compliance against applicable policy
 * @access  Private
 */
router.post('/check-compliance', (req, res, next) => {
    req.params.policyId = 'applicable';
    checkCompliance(req, res, next);
});

/**
 * @route   DELETE /api/expense-policies/:id
 * @desc    Delete expense policy
 * @access  Private - Admin only
 */
router.delete('/:id', firmAdminOnly, deleteExpensePolicy);

module.exports = router;
