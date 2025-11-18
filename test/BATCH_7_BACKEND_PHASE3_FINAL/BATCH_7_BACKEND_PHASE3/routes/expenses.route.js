const express = require('express');
const router = express.Router();
const expensesController = require('../controllers/expenses.controller');
const { authenticate } = require('../middlewares/authenticate');

// Create expense
router.post(
  '/',
  authenticate,
  expensesController.createExpense
);

// Get all expenses with filters
router.get(
  '/',
  authenticate,
  expensesController.getExpenses
);

// Get expense statistics
router.get(
  '/stats',
  authenticate,
  expensesController.getExpenseStats
);

// Export expenses to CSV
router.get(
  '/export',
  authenticate,
  expensesController.exportExpenses
);

// Get expenses by case
router.get(
  '/case/:caseId',
  authenticate,
  expensesController.getExpensesByCase
);

// Get single expense
router.get(
  '/:id',
  authenticate,
  expensesController.getExpense
);

// Update expense
router.put(
  '/:id',
  authenticate,
  expensesController.updateExpense
);

// Delete expense
router.delete(
  '/:id',
  authenticate,
  expensesController.deleteExpense
);

// Upload receipt to expense
router.post(
  '/:id/upload-receipt',
  authenticate,
  expensesController.uploadReceiptToExpense
);

// Mark expense as reimbursed
router.post(
  '/:id/reimburse',
  authenticate,
  expensesController.markExpenseAsReimbursed
);

module.exports = router;
