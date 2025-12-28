const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },
    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // ═══════════════════════════════════════════════════════════════
    // RELATED ENTITY (Polymorphic)
    // ═══════════════════════════════════════════════════════════════
    res_model: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    res_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY TYPE
    // ═══════════════════════════════════════════════════════════════
    activity_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActivityType',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY CONTENT
    // ═══════════════════════════════════════════════════════════════
    summary: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    note: {
        type: String,
        trim: true,
        maxlength: 10000
    },

    // ═══════════════════════════════════════════════════════════════
    // SCHEDULING
    // ═══════════════════════════════════════════════════════════════
    date_deadline: {
        type: Date,
        required: true,
        index: true
    },
    startDateTime: {
        type: Date
    },
    endDateTime: {
        type: Date
    },
    duration: {
        type: Number,  // Duration in minutes
        min: 0
    },
    isAllDay: {
        type: Boolean,
        default: false
    },
    reminder: {
        enabled: { type: Boolean, default: true },
        minutesBefore: { type: Number, default: 15 },
        reminderSent: { type: Boolean, default: false },
        reminderSentAt: Date
    },
    recurrence: {
        isRecurring: { type: Boolean, default: false },
        pattern: {
            type: String,
            enum: ['daily', 'weekly', 'biweekly', 'monthly', 'yearly']
        },
        interval: { type: Number, default: 1 },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],
        endDate: Date,
        occurrences: { type: Number },
        parentActivityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Activity' }
    },

    // ═══════════════════════════════════════════════════════════════
    // PRIORITY & TYPE
    // ═══════════════════════════════════════════════════════════════
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    category: {
        type: String,
        enum: ['call', 'meeting', 'email', 'task', 'deadline', 'follow_up', 'reminder', 'event', 'other'],
        default: 'task'
    },
    direction: {
        type: String,
        enum: ['inbound', 'outbound', 'internal'],
        default: 'outbound'
    },

    // ═══════════════════════════════════════════════════════════════
    // USER ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    create_user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    state: {
        type: String,
        enum: ['scheduled', 'done', 'cancelled'],
        default: 'scheduled',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPLETION
    // ═══════════════════════════════════════════════════════════════
    done_date: {
        type: Date
    },
    done_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    feedback: {
        type: String,
        trim: true,
        maxlength: 2000
    },

    // ═══════════════════════════════════════════════════════════════
    // CALENDAR INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    calendar_event_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event'
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY CHAINING & RECOMMENDATIONS
    // ═══════════════════════════════════════════════════════════════
    recommended_activity_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActivityType'
    },
    previous_activity_type_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ActivityType'
    },
    chained_from_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity'
    },

    // ═══════════════════════════════════════════════════════════════
    // AUTOMATION
    // ═══════════════════════════════════════════════════════════════
    automated: {
        type: Boolean,
        default: false
    },

    // ═══════════════════════════════════════════════════════════════
    // PARTICIPANTS (CRM pattern)
    // ═══════════════════════════════════════════════════════════════
    additionalAttendees: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        contactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact' },
        email: { type: String, trim: true },
        name: { type: String, trim: true },
        status: { type: String, enum: ['pending', 'accepted', 'declined', 'tentative'], default: 'pending' }
    }],
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // RELATED ENTITIES (Direct references)
    // ═══════════════════════════════════════════════════════════════
    relatedLeadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        index: true
    },
    relatedClientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        index: true
    },
    relatedContactId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        index: true
    },
    relatedCaseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        index: true
    },
    relatedQuoteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quote',
        index: true
    },
    relatedOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // LOCATION (Meeting/Call specific)
    // ═══════════════════════════════════════════════════════════════
    location: {
        type: String,
        trim: true,
        maxlength: 500
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    meetingLink: {
        type: String,
        trim: true
    },
    meetingProvider: {
        type: String,
        enum: ['zoom', 'teams', 'google_meet', 'webex', 'other']
    },
    dialInNumber: {
        type: String,
        trim: true
    },
    callRecordingUrl: {
        type: String,
        trim: true
    },

    // ═══════════════════════════════════════════════════════════════
    // OUTCOME (Salesforce pattern)
    // ═══════════════════════════════════════════════════════════════
    outcome: {
        result: {
            type: String,
            enum: ['completed', 'no_answer', 'left_voicemail', 'busy', 'wrong_number', 'rescheduled', 'cancelled', 'positive', 'negative', 'neutral']
        },
        notes: { type: String, maxlength: 2000 },
        sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] }
    },
    nextSteps: {
        type: String,
        maxlength: 2000
    },
    followUpDate: {
        type: Date
    },
    conversionResult: {
        converted: { type: Boolean, default: false },
        convertedToType: { type: String, enum: ['opportunity', 'client', 'case', 'order'] },
        convertedToId: { type: mongoose.Schema.Types.ObjectId }
    },

    // ═══════════════════════════════════════════════════════════════
    // CALL SPECIFIC
    // ═══════════════════════════════════════════════════════════════
    callDetails: {
        phoneNumber: { type: String, trim: true },
        callDuration: { type: Number },  // in seconds
        callType: { type: String, enum: ['inbound', 'outbound', 'missed', 'scheduled'] },
        disposition: { type: String, trim: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // EMAIL SPECIFIC
    // ═══════════════════════════════════════════════════════════════
    emailDetails: {
        emailId: { type: String, trim: true },
        subject: { type: String, trim: true },
        direction: { type: String, enum: ['sent', 'received'] },
        opened: { type: Boolean, default: false },
        openedAt: Date,
        clicked: { type: Boolean, default: false },
        clickedAt: Date
    },

    // ═══════════════════════════════════════════════════════════════
    // INTEGRATION
    // ═══════════════════════════════════════════════════════════════
    integration: {
        externalId: { type: String, trim: true },
        sourceSystem: { type: String, trim: true },
        lastSyncDate: Date,
        googleEventId: { type: String, trim: true },
        outlookEventId: { type: String, trim: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // TAGS
    // ═══════════════════════════════════════════════════════════════
    tags: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
activitySchema.index({ firmId: 1, res_model: 1, res_id: 1 });
activitySchema.index({ firmId: 1, user_id: 1, state: 1, date_deadline: 1 });
activitySchema.index({ firmId: 1, date_deadline: 1, state: 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════
activitySchema.virtual('is_overdue').get(function() {
    if (this.state !== 'scheduled') {
        return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.date_deadline < today;
});

// Ensure virtuals are included in JSON output
activitySchema.set('toJSON', { virtuals: true });
activitySchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all activities for a specific record
 * @param {String} res_model - Model name (e.g., 'Case', 'Client')
 * @param {ObjectId} res_id - Document ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
activitySchema.statics.getActivitiesForRecord = async function(res_model, res_id, options = {}) {
    const query = {
        res_model,
        res_id: new mongoose.Types.ObjectId(res_id)
    };

    if (options.firmId) {
        query.firmId = new mongoose.Types.ObjectId(options.firmId);
    }

    if (options.state) {
        query.state = options.state;
    }

    if (options.user_id) {
        query.user_id = new mongoose.Types.ObjectId(options.user_id);
    }

    // Date range
    if (options.startDate || options.endDate) {
        query.date_deadline = {};
        if (options.startDate) query.date_deadline.$gte = new Date(options.startDate);
        if (options.endDate) query.date_deadline.$lte = new Date(options.endDate);
    }

    return await this.find(query)
        .populate('activity_type_id', 'name icon color')
        .populate('user_id', 'firstName lastName avatar')
        .populate('create_user_id', 'firstName lastName avatar')
        .populate('done_by', 'firstName lastName avatar')
        .sort({ date_deadline: 1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0);
};

/**
 * Get activities assigned to a user
 * @param {ObjectId} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
activitySchema.statics.getUserActivities = async function(userId, options = {}) {
    const query = {
        user_id: new mongoose.Types.ObjectId(userId)
    };

    if (options.firmId) {
        query.firmId = new mongoose.Types.ObjectId(options.firmId);
    }

    if (options.state) {
        query.state = options.state;
    } else {
        query.state = { $in: ['scheduled', 'done'] };
    }

    if (options.res_model) {
        query.res_model = options.res_model;
    }

    // Date range
    if (options.startDate || options.endDate) {
        query.date_deadline = {};
        if (options.startDate) query.date_deadline.$gte = new Date(options.startDate);
        if (options.endDate) query.date_deadline.$lte = new Date(options.endDate);
    }

    return await this.find(query)
        .populate('activity_type_id', 'name icon color')
        .populate('create_user_id', 'firstName lastName avatar')
        .populate('done_by', 'firstName lastName avatar')
        .sort({ date_deadline: 1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

/**
 * Get overdue activities for a firm
 * @param {ObjectId} firmId - Firm ID
 * @returns {Promise<Array>}
 */
activitySchema.statics.getOverdueActivities = async function(firmId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
        state: 'scheduled',
        date_deadline: { $lt: today }
    };

    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    return await this.find(query)
        .populate('activity_type_id', 'name icon color')
        .populate('user_id', 'firstName lastName avatar')
        .populate('create_user_id', 'firstName lastName avatar')
        .sort({ date_deadline: 1 });
};

/**
 * Get today's activities for a firm or user
 * @param {ObjectId} firmId - Firm ID
 * @param {ObjectId} userId - Optional User ID
 * @returns {Promise<Array>}
 */
activitySchema.statics.getTodayActivities = async function(firmId, userId = null) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const query = {
        state: 'scheduled',
        date_deadline: { $gte: startOfDay, $lte: endOfDay }
    };

    if (firmId) {
        query.firmId = new mongoose.Types.ObjectId(firmId);
    }

    if (userId) {
        query.user_id = new mongoose.Types.ObjectId(userId);
    }

    return await this.find(query)
        .populate('activity_type_id', 'name icon color')
        .populate('user_id', 'firstName lastName avatar')
        .populate('create_user_id', 'firstName lastName avatar')
        .sort({ date_deadline: 1 });
};

/**
 * Mark an activity as done
 * @param {ObjectId} activityId - Activity ID
 * @param {ObjectId} userId - User ID who completed it
 * @param {String} feedback - Optional feedback
 * @returns {Promise<Object>}
 */
activitySchema.statics.markAsDone = async function(activityId, userId, feedback = null) {
    const activity = await this.findById(activityId);

    if (!activity) {
        throw new Error('Activity not found');
    }

    if (activity.state === 'done') {
        throw new Error('Activity already marked as done');
    }

    activity.state = 'done';
    activity.done_date = new Date();
    activity.done_by = new mongoose.Types.ObjectId(userId);
    if (feedback) {
        activity.feedback = feedback;
    }

    await activity.save();

    return activity.populate([
        { path: 'activity_type_id', select: 'name icon color' },
        { path: 'user_id', select: 'firstName lastName avatar' },
        { path: 'done_by', select: 'firstName lastName avatar' }
    ]);
};

/**
 * Schedule a follow-up activity
 * @param {ObjectId} activityId - Current activity ID
 * @param {ObjectId} activityTypeId - Follow-up activity type ID
 * @param {ObjectId} userId - User ID to assign to
 * @param {Date} deadline - Deadline for follow-up
 * @returns {Promise<Object>}
 */
activitySchema.statics.scheduleFollowUp = async function(activityId, activityTypeId, userId, deadline) {
    const currentActivity = await this.findById(activityId);

    if (!currentActivity) {
        throw new Error('Activity not found');
    }

    // Create follow-up activity
    const followUpActivity = await this.create({
        firmId: currentActivity.firmId,
        res_model: currentActivity.res_model,
        res_id: currentActivity.res_id,
        activity_type_id: new mongoose.Types.ObjectId(activityTypeId),
        summary: `Follow-up: ${currentActivity.summary}`,
        note: `Follow-up activity from: ${currentActivity.summary}`,
        date_deadline: new Date(deadline),
        user_id: new mongoose.Types.ObjectId(userId),
        create_user_id: currentActivity.create_user_id,
        previous_activity_type_id: currentActivity.activity_type_id,
        chained_from_id: currentActivity._id,
        state: 'scheduled',
        automated: false
    });

    // Update current activity to reference the follow-up
    currentActivity.recommended_activity_type_id = new mongoose.Types.ObjectId(activityTypeId);
    await currentActivity.save();

    return followUpActivity.populate([
        { path: 'activity_type_id', select: 'name icon color' },
        { path: 'user_id', select: 'firstName lastName avatar' },
        { path: 'create_user_id', select: 'firstName lastName avatar' }
    ]);
};

module.exports = mongoose.model('Activity', activitySchema);
