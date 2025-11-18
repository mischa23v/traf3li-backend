const Expense = require('../models/expense.model');
const Case = require('../models/case.model');

// Create expense
exports.createExpense = async (req, res) => {
  try {
    const { description, amount, category, caseId, date, receiptUrl, notes, isBillable } = req.body;

    // Validate required fields
    if (!description || !amount || !category || !date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const expense = new Expense({
      description,
      amount,
      category,
      caseId,
      userId: req.user._id,
      date,
      receiptUrl,
      notes,
      isBillable: isBillable !== undefined ? isBillable : false,
    });

    await expense.save();

    // Populate fields
    if (expense.caseId) {
      await expense.populate('caseId', 'caseNumber title');
    }

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense,
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create expense',
      error: error.message,
    });
  }
};

// Get all expenses with filters
exports.getExpenses = async (req, res) => {
  try {
    const { period, startDate, endDate, caseId, category, isBillable, isReimbursed, page = 1, limit = 50 } = req.query;

    const filter = { userId: req.user._id };

    // Apply period filter
    if (period) {
      const now = new Date();
      let start = new Date();

      switch (period) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          filter.date = { $gte: start, $lte: now };
          break;
        case 'week':
          start.setDate(start.getDate() - 7);
          filter.date = { $gte: start, $lte: now };
          break;
        case 'month':
          start.setMonth(start.getMonth() - 1);
          filter.date = { $gte: start, $lte: now };
          break;
        case 'year':
          start.setFullYear(start.getFullYear() - 1);
          filter.date = { $gte: start, $lte: now };
          break;
      }
    }

    // Apply date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Apply other filters
    if (caseId) filter.caseId = caseId;
    if (category) filter.category = category;
    if (isBillable !== undefined) filter.isBillable = isBillable === 'true';
    if (isReimbursed !== undefined) filter.isReimbursed = isReimbursed === 'true';

    const expenses = await Expense.find(filter)
      .populate('caseId', 'caseNumber title')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Expense.countDocuments(filter);

    res.json({
      success: true,
      expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message,
    });
  }
};

// Get single expense
exports.getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('caseId', 'caseNumber title');

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Check permissions
    if (expense.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense',
      error: error.message,
    });
  }
};

// Update expense
exports.updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Check permissions
    if (expense.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Cannot update if already reimbursed
    if (expense.isReimbursed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update reimbursed expense',
      });
    }

    // Update fields
    const { description, amount, category, date, receiptUrl, notes, isBillable } = req.body;

    if (description) expense.description = description;
    if (amount) expense.amount = amount;
    if (category) expense.category = category;
    if (date) expense.date = date;
    if (receiptUrl !== undefined) expense.receiptUrl = receiptUrl;
    if (notes !== undefined) expense.notes = notes;
    if (isBillable !== undefined) expense.isBillable = isBillable;

    await expense.save();

    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense,
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message,
    });
  }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Check permissions
    if (expense.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Cannot delete if already reimbursed
    if (expense.isReimbursed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete reimbursed expense',
      });
    }

    await expense.deleteOne();

    res.json({
      success: true,
      message: 'Expense deleted successfully',
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: error.message,
    });
  }
};

// Get expense statistics
exports.getExpenseStats = async (req, res) => {
  try {
    const { period, startDate, endDate, caseId } = req.query;

    const filters = { userId: req.user._id };

    // Apply period filter
    if (period) {
      const now = new Date();
      let start = new Date();

      switch (period) {
        case 'today':
          start.setHours(0, 0, 0, 0);
          filters.startDate = start.toISOString();
          filters.endDate = now.toISOString();
          break;
        case 'week':
          start.setDate(start.getDate() - 7);
          filters.startDate = start.toISOString();
          filters.endDate = now.toISOString();
          break;
        case 'month':
          start.setMonth(start.getMonth() - 1);
          filters.startDate = start.toISOString();
          filters.endDate = now.toISOString();
          break;
      }
    }

    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (caseId) filters.caseId = caseId;

    const stats = await Expense.getExpenseStats(filters);
    const byCategory = await Expense.getExpensesByCategory(filters);

    res.json({
      success: true,
      stats,
      byCategory,
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
};

// Get expenses by case
exports.getExpensesByCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const expenses = await Expense.find({
      caseId,
      userId: req.user._id,
    }).sort({ date: -1 });

    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const billableAmount = expenses.filter(exp => exp.isBillable).reduce((sum, exp) => sum + exp.amount, 0);

    res.json({
      success: true,
      expenses,
      summary: {
        totalAmount,
        billableAmount,
        count: expenses.length,
      },
    });
  } catch (error) {
    console.error('Get expenses by case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message,
    });
  }
};

// Export expenses to CSV
exports.exportExpenses = async (req, res) => {
  try {
    const { startDate, endDate, caseId, category } = req.query;

    const filter = { userId: req.user._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (caseId) filter.caseId = caseId;
    if (category) filter.category = category;

    const expenses = await Expense.find(filter)
      .populate('caseId', 'caseNumber title')
      .sort({ date: 1 });

    // Generate CSV
    const csv = [
      ['Date', 'Case', 'Description', 'Category', 'Amount (SAR)', 'Billable', 'Reimbursed', 'Notes'].join(','),
      ...expenses.map(exp => [
        exp.date.toISOString().split('T')[0],
        exp.caseId ? exp.caseId.caseNumber : 'N/A',
        `"${exp.description}"`,
        exp.category,
        exp.amount.toFixed(2),
        exp.isBillable ? 'Yes' : 'No',
        exp.isReimbursed ? 'Yes' : 'No',
        `"${exp.notes || ''}"`,
      ].join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expenses-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export expenses',
      error: error.message,
    });
  }
};

// Upload receipt
exports.uploadReceiptToExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Check permissions
    if (expense.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { receiptUrl } = req.body;

    if (!receiptUrl) {
      return res.status(400).json({
        success: false,
        message: 'Receipt URL is required',
      });
    }

    expense.receiptUrl = receiptUrl;
    await expense.save();

    res.json({
      success: true,
      message: 'Receipt uploaded successfully',
      expense,
    });
  } catch (error) {
    console.error('Upload receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload receipt',
      error: error.message,
    });
  }
};

// Mark expense as reimbursed
exports.markExpenseAsReimbursed = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

    // Check permissions
    if (expense.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    expense.isReimbursed = true;
    expense.reimbursedAt = new Date();
    await expense.save();

    res.json({
      success: true,
      message: 'Expense marked as reimbursed',
      expense,
    });
  } catch (error) {
    console.error('Mark expense as reimbursed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark expense as reimbursed',
      error: error.message,
    });
  }
};

module.exports = exports;
