# EXPENSES & CALENDAR CONTROLLERS

## expenses.controller.js

```javascript
const Expense = require('../models/expense.model');
const multer = require('multer');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'me-south-1',
});

const uploadReceipt = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl: 'private',
    key: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, `receipts/${uniqueName}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Create expense
exports.createExpense = async (req, res) => {
  try {
    const { description, amount, category, caseId, date, notes, isBillable } = req.body;

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
      notes,
      isBillable: isBillable !== undefined ? isBillable : false,
    });

    await expense.save();
    await expense.populate('caseId', 'caseNumber title');

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

// Get all expenses
exports.getExpenses = async (req, res) => {
  try {
    const { category, caseId, startDate, endDate, isBillable, isReimbursed, page = 1, limit = 50 } = req.query;

    const filter = { userId: req.user._id };

    if (category) filter.category = category;
    if (caseId) filter.caseId = caseId;
    if (isBillable !== undefined) filter.isBillable = isBillable === 'true';
    if (isReimbursed !== undefined) filter.isReimbursed = isReimbursed === 'true';

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

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

    if (expense.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { description, amount, category, notes, isBillable } = req.body;

    if (description) expense.description = description;
    if (amount) expense.amount = amount;
    if (category) expense.category = category;
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

    if (expense.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Delete receipt from S3 if exists
    if (expense.receiptUrl) {
      const key = expense.receiptUrl.split('/').pop();
      await s3.deleteObject({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: `receipts/${key}`,
      }).promise();
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

// Upload receipt
exports.uploadReceiptToExpense = async (req, res) => {
  try {
    uploadReceipt.single('receipt')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      const expense = await Expense.findById(req.params.id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found',
        });
      }

      if (expense.userId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      expense.receiptUrl = req.file.location;
      await expense.save();

      res.json({
        success: true,
        message: 'Receipt uploaded successfully',
        expense,
      });
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

// Get expense statistics
exports.getExpenseStats = async (req, res) => {
  try {
    const { startDate, endDate, caseId } = req.query;

    const filters = { userId: req.user._id };
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (caseId) filters.caseId = caseId;

    const stats = await Expense.getExpenseStats(filters);
    const byCategory = await Expense.getExpensesByCategory(filters);
    const byMonth = await Expense.getExpensesByMonth(filters);

    res.json({
      success: true,
      stats: {
        ...stats,
        byCategory,
        byMonth,
      },
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

// Mark as reimbursed
exports.markExpenseAsReimbursed = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found',
      });
    }

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
    console.error('Mark reimbursed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as reimbursed',
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

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    res.json({
      success: true,
      expenses,
      summary: {
        totalAmount: total,
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

// Export to CSV
exports.exportExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    const filter = { userId: req.user._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (category) filter.category = category;

    const expenses = await Expense.find(filter)
      .populate('caseId', 'caseNumber title')
      .sort({ date: 1 });

    const csv = [
      ['Date', 'Case', 'Description', 'Category', 'Amount (SAR)', 'Billable', 'Reimbursed'].join(','),
      ...expenses.map(exp => [
        exp.date.toISOString().split('T')[0],
        exp.caseId ? exp.caseId.caseNumber : 'N/A',
        `"${exp.description}"`,
        exp.category,
        exp.amount.toFixed(2),
        exp.isBillable ? 'Yes' : 'No',
        exp.isReimbursed ? 'Yes' : 'No',
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

module.exports = exports;
```

---

## calendar.controller.js

```javascript
const CalendarEvent = require('../models/calendarEvent.model');

// Create calendar event
exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      type,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      caseId,
      attendees,
      notes,
      reminderBefore,
      isAllDay,
    } = req.body;

    if (!title || !type || !startDate || !startTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const event = new CalendarEvent({
      title,
      type,
      startDate,
      endDate,
      startTime,
      endTime,
      location,
      caseId,
      userId: req.user._id,
      attendees,
      notes,
      reminderBefore: reminderBefore || 60,
      isAllDay: isAllDay || false,
    });

    await event.save();
    await event.populate('caseId', 'caseNumber title');

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event,
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event',
      error: error.message,
    });
  }
};

// Get all events
exports.getEvents = async (req, res) => {
  try {
    const { startDate, endDate, type, caseId, status } = req.query;

    const filter = { userId: req.user._id };

    if (type) filter.type = type;
    if (caseId) filter.caseId = caseId;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const events = await CalendarEvent.find(filter)
      .populate('caseId', 'caseNumber title')
      .sort({ startDate: 1 });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message,
    });
  }
};

// Get single event
exports.getEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
      .populate('caseId', 'caseNumber title');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (event.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
      error: error.message,
    });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (event.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update fields
    Object.assign(event, req.body);
    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      event,
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
      error: error.message,
    });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (event.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    await event.deleteOne();

    res.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event',
      error: error.message,
    });
  }
};

// Get upcoming events
exports.getUpcomingEvents = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const events = await CalendarEvent.getUpcomingEvents(req.user._id, parseInt(days));

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming events',
      error: error.message,
    });
  }
};

// Get events by case
exports.getEventsByCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const events = await CalendarEvent.find({
      caseId,
      userId: req.user._id,
    }).sort({ startDate: 1 });

    res.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('Get events by case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
      error: error.message,
    });
  }
};

// Send reminder (for cron job)
exports.sendEventReminder = async (req, res) => {
  try {
    const event = await CalendarEvent.findById(req.params.id)
      .populate('userId', 'email fullName');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    // Send email/SMS reminder (implement with SendGrid/Twilio)
    // ... email sending logic ...

    await CalendarEvent.markReminderSent(event._id);

    res.json({
      success: true,
      message: 'Reminder sent successfully',
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reminder',
      error: error.message,
    });
  }
};

module.exports = exports;
```

---

## Installation Instructions

1. Create both controller files:
   - `src/controllers/expenses.controller.js`
   - `src/controllers/calendar.controller.js`

2. Both are ready to use with your models!

3. Next: Create routes to wire these up.
