const Case = require('../models/case.model');
const Document = require('../models/document.model');
const TimeEntry = require('../models/timeEntry.model');
const Expense = require('../models/expense.model');
const CalendarEvent = require('../models/calendarEvent.model');

// Get all cases (existing function - keeping for reference)
exports.getCases = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    
    // If lawyer, show only their cases
    if (req.user.role === 'lawyer') {
      filter.lawyerId = req.user._id;
    }
    // If client, show only their cases
    else if (req.user.role === 'client') {
      filter.clientId = req.user._id;
    }
    // Admin sees all cases (no filter)

    if (status) filter.status = status;

    const cases = await Case.find(filter)
      .populate('clientId', 'fullName email phone')
      .populate('lawyerId', 'fullName email phone')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Case.countDocuments(filter);

    res.json({
      success: true,
      cases,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cases',
      error: error.message,
    });
  }
};

// Get single case with complete financial data
exports.getCase = async (req, res) => {
  try {
    const caseData = await Case.findById(req.params.id)
      .populate('clientId', 'fullName email phone nationalId')
      .populate('lawyerId', 'fullName email phone licenseNumber');

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    // Check permissions
    const canAccess = 
      req.user.role === 'admin' ||
      caseData.lawyerId._id.toString() === req.user._id.toString() ||
      caseData.clientId._id.toString() === req.user._id.toString();

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Get related data
    const [documents, timeEntries, expenses, events] = await Promise.all([
      Document.find({ caseId: caseData._id }),
      TimeEntry.find({ caseId: caseData._id }),
      Expense.find({ caseId: caseData._id }),
      CalendarEvent.find({ caseId: caseData._id, status: 'scheduled' }).sort({ startDate: 1 }),
    ]);

    // Calculate financial data
    const totalTimeSpent = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalTimeAmount = timeEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    const billedTime = timeEntries.filter(e => e.isBilled).reduce((sum, e) => sum + e.totalAmount, 0);
    const billedExpenses = expenses.filter(e => e.invoiceId).reduce((sum, e) => sum + e.amount, 0);
    const totalBilled = billedTime + billedExpenses;

    const unbilledTime = timeEntries.filter(e => !e.isBilled && e.isBillable).reduce((sum, e) => sum + e.totalAmount, 0);
    const unbilledExpenses = expenses.filter(e => !e.invoiceId && e.isBillable).reduce((sum, e) => sum + e.amount, 0);
    const totalUnbilled = unbilledTime + unbilledExpenses;

    // Next hearing
    const nextHearing = events.find(e => e.type === 'hearing' && new Date(e.startDate) > new Date());

    // Add computed fields to case
    const caseWithFinancials = {
      ...caseData.toObject(),
      financials: {
        totalTimeSpent, // minutes
        totalTimeAmount, // SAR
        totalExpenses, // SAR
        totalBilled, // SAR
        totalUnbilled, // SAR
        profitability: totalBilled - totalExpenses, // Simple profit calculation
      },
      counts: {
        documents: documents.length,
        timeEntries: timeEntries.length,
        expenses: expenses.length,
        upcomingEvents: events.length,
      },
      nextHearing: nextHearing || null,
    };

    res.json({
      success: true,
      case: caseWithFinancials,
    });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch case',
      error: error.message,
    });
  }
};

// Create case
exports.createCase = async (req, res) => {
  try {
    const {
      caseNumber,
      title,
      description,
      caseType,
      court,
      clientId,
      status,
      filingDate,
      nextHearingDate,
    } = req.body;

    // Validate required fields
    if (!caseNumber || !title || !caseType || !clientId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    // Check if case number exists
    const existingCase = await Case.findOne({ caseNumber });
    if (existingCase) {
      return res.status(400).json({
        success: false,
        message: 'Case number already exists',
      });
    }

    const caseData = new Case({
      caseNumber,
      title,
      description,
      caseType,
      court,
      clientId,
      lawyerId: req.user._id, // Current user is the lawyer
      status: status || 'open',
      filingDate,
      nextHearingDate,
    });

    await caseData.save();

    await caseData.populate('clientId', 'fullName email phone');
    await caseData.populate('lawyerId', 'fullName email phone');

    res.status(201).json({
      success: true,
      message: 'Case created successfully',
      case: caseData,
    });
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create case',
      error: error.message,
    });
  }
};

// Update case
exports.updateCase = async (req, res) => {
  try {
    const caseData = await Case.findById(req.params.id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    // Check permissions (only lawyer or admin can update)
    if (req.user.role !== 'admin' && caseData.lawyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update fields
    const allowedUpdates = [
      'title',
      'description',
      'status',
      'court',
      'nextHearingDate',
      'closedDate',
      'outcome',
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        caseData[field] = req.body[field];
      }
    });

    await caseData.save();

    res.json({
      success: true,
      message: 'Case updated successfully',
      case: caseData,
    });
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update case',
      error: error.message,
    });
  }
};

// Delete case
exports.deleteCase = async (req, res) => {
  try {
    const caseData = await Case.findById(req.params.id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    // Only admin or assigned lawyer can delete
    if (req.user.role !== 'admin' && caseData.lawyerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Check if case has related data
    const hasDocuments = await Document.exists({ caseId: caseData._id });
    const hasTimeEntries = await TimeEntry.exists({ caseId: caseData._id });
    const hasExpenses = await Expense.exists({ caseId: caseData._id });

    if (hasDocuments || hasTimeEntries || hasExpenses) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete case with related documents, time entries, or expenses. Please remove them first.',
      });
    }

    await caseData.deleteOne();

    res.json({
      success: true,
      message: 'Case deleted successfully',
    });
  } catch (error) {
    console.error('Delete case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete case',
      error: error.message,
    });
  }
};

// Get case statistics
exports.getCaseStats = async (req, res) => {
  try {
    const filter = {};
    
    if (req.user.role === 'lawyer') {
      filter.lawyerId = req.user._id;
    } else if (req.user.role === 'client') {
      filter.clientId = req.user._id;
    }

    const stats = await Case.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await Case.countDocuments(filter);

    const statsByStatus = {
      total,
      open: 0,
      in_progress: 0,
      closed: 0,
      on_hold: 0,
    };

    stats.forEach((stat) => {
      statsByStatus[stat._id] = stat.count;
    });

    res.json({
      success: true,
      stats: statsByStatus,
    });
  } catch (error) {
    console.error('Get case stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
};

// Get case timeline (all activities)
exports.getCaseTimeline = async (req, res) => {
  try {
    const { id } = req.params;

    const caseData = await Case.findById(id);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found',
      });
    }

    // Get all activities
    const [documents, timeEntries, expenses, events] = await Promise.all([
      Document.find({ caseId: id }).select('createdAt originalName uploadedBy').populate('uploadedBy', 'fullName'),
      TimeEntry.find({ caseId: id }).select('createdAt description duration'),
      Expense.find({ caseId: id }).select('createdAt description amount'),
      CalendarEvent.find({ caseId: id }).select('startDate title type status'),
    ]);

    // Combine and sort by date
    const timeline = [
      ...documents.map(d => ({
        type: 'document',
        date: d.createdAt,
        description: `تم رفع مستند: ${d.originalName}`,
        user: d.uploadedBy.fullName,
      })),
      ...timeEntries.map(t => ({
        type: 'time',
        date: t.createdAt,
        description: `${t.description} (${t.duration} دقيقة)`,
      })),
      ...expenses.map(e => ({
        type: 'expense',
        date: e.createdAt,
        description: `${e.description} (${e.amount} ر.س)`,
      })),
      ...events.map(e => ({
        type: 'event',
        date: e.startDate,
        description: `${e.title}`,
        eventType: e.type,
        status: e.status,
      })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      timeline,
    });
  } catch (error) {
    console.error('Get case timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch timeline',
      error: error.message,
    });
  }
};

module.exports = exports;
