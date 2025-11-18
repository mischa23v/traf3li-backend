const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ['hearing', 'meeting', 'deadline', 'consultation'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
    },
    startTime: {
      type: String,
      required: true, // Format: "HH:mm"
    },
    endTime: {
      type: String, // Format: "HH:mm"
    },
    location: {
      type: String,
      maxlength: 500,
    },
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    attendees: [{
      type: String, // Email addresses or user IDs
    }],
    notes: {
      type: String,
      maxlength: 2000,
    },
    reminderBefore: {
      type: Number, // Minutes before event (e.g., 60 = 1 hour)
      default: 60,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    isAllDay: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'postponed'],
      default: 'scheduled',
    },
    // Recurring events (future feature)
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrenceRule: {
      type: String, // iCal RRULE format
    },
    parentEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CalendarEvent', // Link to parent for recurring events
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
calendarEventSchema.index({ userId: 1, startDate: 1 });
calendarEventSchema.index({ caseId: 1, startDate: 1 });
calendarEventSchema.index({ type: 1, startDate: 1 });
calendarEventSchema.index({ status: 1, startDate: 1 });
calendarEventSchema.index({ reminderSent: 1, startDate: 1 });

// Virtual for checking if event is past
calendarEventSchema.virtual('isPast').get(function() {
  return new Date(this.startDate) < new Date();
});

// Virtual for checking if event is today
calendarEventSchema.virtual('isToday').get(function() {
  const today = new Date();
  const eventDate = new Date(this.startDate);
  return (
    eventDate.getDate() === today.getDate() &&
    eventDate.getMonth() === today.getMonth() &&
    eventDate.getFullYear() === today.getFullYear()
  );
});

// Method to check if reminder should be sent
calendarEventSchema.methods.shouldSendReminder = function() {
  if (this.reminderSent) return false;
  if (this.status !== 'scheduled') return false;

  const now = new Date();
  const eventTime = new Date(this.startDate);
  const reminderTime = new Date(eventTime.getTime() - this.reminderBefore * 60000);

  return now >= reminderTime && now < eventTime;
};

// Static method: Get upcoming events
calendarEventSchema.statics.getUpcomingEvents = async function(userId, days = 7) {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);

  return await this.find({
    userId: userId,
    startDate: {
      $gte: startDate,
      $lte: endDate,
    },
    status: 'scheduled',
  })
    .populate('caseId', 'caseNumber title')
    .sort({ startDate: 1 })
    .limit(20);
};

// Static method: Get events for date range
calendarEventSchema.statics.getEventsForRange = async function(userId, startDate, endDate) {
  return await this.find({
    userId: userId,
    startDate: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  })
    .populate('caseId', 'caseNumber title')
    .sort({ startDate: 1 });
};

// Static method: Get events needing reminders
calendarEventSchema.statics.getEventsNeedingReminders = async function() {
  const now = new Date();
  const checkUntil = new Date();
  checkUntil.setHours(checkUntil.getHours() + 24); // Check next 24 hours

  return await this.find({
    reminderSent: false,
    status: 'scheduled',
    startDate: {
      $gte: now,
      $lte: checkUntil,
    },
  })
    .populate('userId', 'email fullName')
    .populate('caseId', 'caseNumber title');
};

// Static method: Mark reminder as sent
calendarEventSchema.statics.markReminderSent = async function(eventId) {
  return await this.findByIdAndUpdate(
    eventId,
    { reminderSent: true },
    { new: true }
  );
};

// Static method: Get event statistics
calendarEventSchema.statics.getEventStats = async function(userId, filters = {}) {
  const matchStage = { userId: mongoose.Types.ObjectId(userId) };
  
  if (filters.startDate || filters.endDate) {
    matchStage.startDate = {};
    if (filters.startDate) matchStage.startDate.$gte = new Date(filters.startDate);
    if (filters.endDate) matchStage.startDate.$lte = new Date(filters.endDate);
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        _id: 0,
      },
    },
  ]);
};

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

module.exports = CalendarEvent;
