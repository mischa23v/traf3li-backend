const TimeEntry = require('../models/timeEntry.model');
const Case = require('../models/case.model');

// Create time entry
exports.createTimeEntry = async (req, res) => {
  try {
    const { description, caseId, date, startTime, endTime, duration, hourlyRate, isBillable, notes } = req.body;

    // Validate required fields
    if (!description || !caseId || !date || !startTime || !duration || !hourlyRate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const timeEntry = new TimeEntry({
      description,
      caseId,
      userId: req.user._id,
      date,
      startTime,
      endTime,
      duration,
      hourlyRate,
      isBillable: isBillable !== undefined ? isBillable : true,
      notes,
    });

    // totalAmount is auto-calculated by pre-save hook
    await timeEntry.save();

    // Populate fields
    await timeEntry.populate('caseId', 'caseNumber title');

    res.status(201).json({
      success: true,
      message: 'Time entry created successfully',
      timeEntry,
    });
  } catch (error) {
    console.error('Create time entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create time entry',
      error: error.message,
    });
  }
};

// Get all time entries with filters
exports.getTimeEntries = async (req, res) => {
  try {
    const { period, startDate, endDate, caseId, isBillable, isBilled, page = 1, limit = 50 } = req.query;

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
    if (isBillable !== undefined) filter.isBillable = isBillable === 'true';
    if (isBilled !== undefined) filter.isBilled = isBilled === 'true';

    const timeEntries = await TimeEntry.find(filter)
      .populate('caseId', 'caseNumber title')
      .sort({ date: -1, startTime: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await TimeEntry.countDocuments(filter);

    res.json({
      success: true,
      timeEntries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get time entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time entries',
      error: error.message,
    });
  }
};

// Get single time entry
exports.getTimeEntry = async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id)
      .populate('caseId', 'caseNumber title');

    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found',
      });
    }

    // Check permissions
    if (timeEntry.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      timeEntry,
    });
  } catch (error) {
    console.error('Get time entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time entry',
      error: error.message,
    });
  }
};

// Update time entry
exports.updateTimeEntry = async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id);

    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found',
      });
    }

    // Check permissions
    if (timeEntry.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Cannot update if already billed
    if (timeEntry.isBilled) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update billed time entry',
      });
    }

    // Update fields
    const { description, startTime, endTime, duration, hourlyRate, isBillable, notes } = req.body;
    
    if (description) timeEntry.description = description;
    if (startTime) timeEntry.startTime = startTime;
    if (endTime) timeEntry.endTime = endTime;
    if (duration) timeEntry.duration = duration;
    if (hourlyRate) timeEntry.hourlyRate = hourlyRate;
    if (isBillable !== undefined) timeEntry.isBillable = isBillable;
    if (notes !== undefined) timeEntry.notes = notes;

    await timeEntry.save();

    res.json({
      success: true,
      message: 'Time entry updated successfully',
      timeEntry,
    });
  } catch (error) {
    console.error('Update time entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update time entry',
      error: error.message,
    });
  }
};

// Delete time entry
exports.deleteTimeEntry = async (req, res) => {
  try {
    const timeEntry = await TimeEntry.findById(req.params.id);

    if (!timeEntry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found',
      });
    }

    // Check permissions
    if (timeEntry.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Cannot delete if already billed
    if (timeEntry.isBilled) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete billed time entry',
      });
    }

    await timeEntry.deleteOne();

    res.json({
      success: true,
      message: 'Time entry deleted successfully',
    });
  } catch (error) {
    console.error('Delete time entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete time entry',
      error: error.message,
    });
  }
};

// Get time statistics
exports.getTimeStats = async (req, res) => {
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

    const stats = await TimeEntry.getTimeStats(filters);

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get time stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
};

// Get time by case
exports.getTimeByCase = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const timeByCase = await TimeEntry.getTimeByCase(req.user._id, filters);

    res.json({
      success: true,
      data: timeByCase,
    });
  } catch (error) {
    console.error('Get time by case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error.message,
    });
  }
};

// Get time by day
exports.getTimeByDay = async (req, res) => {
  try {
    const { startDate, endDate, caseId } = req.query;

    const filters = { userId: req.user._id };
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (caseId) filters.caseId = caseId;

    const timeByDay = await TimeEntry.getTimeByDay(filters);

    res.json({
      success: true,
      data: timeByDay,
    });
  } catch (error) {
    console.error('Get time by day error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error.message,
    });
  }
};

// Get unbilled time entries
exports.getUnbilledTime = async (req, res) => {
  try {
    const { caseId } = req.query;

    const filter = {
      userId: req.user._id,
      isBillable: true,
      isBilled: false,
    };

    if (caseId) filter.caseId = caseId;

    const timeEntries = await TimeEntry.find(filter)
      .populate('caseId', 'caseNumber title')
      .sort({ date: 1 });

    const totalAmount = timeEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);
    const totalMinutes = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);

    res.json({
      success: true,
      timeEntries,
      summary: {
        totalAmount,
        totalMinutes,
        count: timeEntries.length,
      },
    });
  } catch (error) {
    console.error('Get unbilled time error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unbilled time',
      error: error.message,
    });
  }
};

// Mark time entries as billed
exports.markTimeAsBilled = async (req, res) => {
  try {
    const { entryIds, invoiceId } = req.body;

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Entry IDs array is required',
      });
    }

    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        message: 'Invoice ID is required',
      });
    }

    // Verify all entries belong to user
    const entries = await TimeEntry.find({
      _id: { $in: entryIds },
      userId: req.user._id,
    });

    if (entries.length !== entryIds.length) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to some entries',
      });
    }

    // Mark as billed
    await TimeEntry.markAsBilled(entryIds, invoiceId);

    res.json({
      success: true,
      message: `${entryIds.length} time entries marked as billed`,
    });
  } catch (error) {
    console.error('Mark time as billed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark time as billed',
      error: error.message,
    });
  }
};

// Get time entries by case
exports.getTimeEntriesByCase = async (req, res) => {
  try {
    const { caseId } = req.params;

    const timeEntries = await TimeEntry.find({
      caseId,
      userId: req.user._id,
    }).sort({ date: -1 });

    const totalMinutes = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    const totalAmount = timeEntries.reduce((sum, entry) => sum + entry.totalAmount, 0);

    res.json({
      success: true,
      timeEntries,
      summary: {
        totalMinutes,
        totalAmount,
        count: timeEntries.length,
      },
    });
  } catch (error) {
    console.error('Get time entries by case error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch time entries',
      error: error.message,
    });
  }
};

// Export time entries to CSV
exports.exportTimeEntries = async (req, res) => {
  try {
    const { startDate, endDate, caseId } = req.query;

    const filter = { userId: req.user._id };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    if (caseId) filter.caseId = caseId;

    const timeEntries = await TimeEntry.find(filter)
      .populate('caseId', 'caseNumber title')
      .sort({ date: 1 });

    // Generate CSV
    const csv = [
      ['Date', 'Case', 'Description', 'Start Time', 'End Time', 'Duration (min)', 'Rate (SAR)', 'Amount (SAR)', 'Billable', 'Billed'].join(','),
      ...timeEntries.map(entry => [
        entry.date.toISOString().split('T')[0],
        entry.caseId ? entry.caseId.caseNumber : 'N/A',
        `"${entry.description}"`,
        entry.startTime,
        entry.endTime || 'N/A',
        entry.duration,
        entry.hourlyRate,
        entry.totalAmount.toFixed(2),
        entry.isBillable ? 'Yes' : 'No',
        entry.isBilled ? 'Yes' : 'No',
      ].join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=time-entries-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export time entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export time entries',
      error: error.message,
    });
  }
};

module.exports = exports;
