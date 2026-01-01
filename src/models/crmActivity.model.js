const mongoose = require('mongoose');

// Participant schema for meetings/calls
const participantSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['user', 'contact', 'client', 'lead'],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    name: String,
    email: String,
    phone: String,
    attended: { type: Boolean, default: true }
}, { _id: false });

// Email tracking schema
const emailTrackingSchema = new mongoose.Schema({
    messageId: String,
    threadId: String,
    from: String,
    to: [String],
    cc: [String],
    bcc: [String],
    subject: String,
    bodyPreview: String, // First 500 chars
    hasAttachments: Boolean,
    attachmentCount: { type: Number, default: 0 },
    isIncoming: { type: Boolean, default: false },
    opened: { type: Boolean, default: false },
    openedAt: Date,
    openCount: { type: Number, default: 0 },
    clicked: { type: Boolean, default: false },
    clickedLinks: [String],
    replied: { type: Boolean, default: false },
    repliedAt: Date
}, { _id: false });

// Call tracking schema
const callTrackingSchema = new mongoose.Schema({
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true
    },
    phoneNumber: String,
    duration: Number, // in seconds
    startedAt: Date,
    endedAt: Date,
    outcome: {
        type: String,
        enum: ['connected', 'no_answer', 'busy', 'voicemail', 'wrong_number', 'callback_requested']
    },
    recordingUrl: String,
    transcription: String,
    callNotes: String
}, { _id: false });

// Meeting tracking schema
const meetingTrackingSchema = new mongoose.Schema({
    meetingType: {
        type: String,
        enum: ['in_person', 'video', 'phone', 'court', 'consultation'],
        default: 'in_person'
    },
    location: String,
    locationAr: String,
    scheduledStart: Date,
    scheduledEnd: Date,
    actualStart: Date,
    actualEnd: Date,
    actualDuration: Number, // in minutes
    outcome: {
        type: String,
        enum: ['completed', 'cancelled', 'rescheduled', 'no_show']
    },
    meetingUrl: String, // For video meetings
    agenda: String,
    summary: String,
    nextSteps: String,
    participants: [participantSchema]
}, { _id: false });

// Task/Follow-up schema
const taskInfoSchema = new mongoose.Schema({
    dueDate: Date,
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },
    completedAt: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reminderDate: Date,
    reminderSent: { type: Boolean, default: false }
}, { _id: false });

const crmActivitySchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    activityId: {
        type: String,
        unique: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY TYPE
    // ═══════════════════════════════════════════════════════════════
    type: {
        type: String,
        enum: [
            // Communication
            'call',           // مكالمة
            'email',          // بريد إلكتروني
            'sms',            // رسالة نصية
            'whatsapp',       // واتساب
            'meeting',        // اجتماع

            // Actions
            'note',           // ملاحظة
            'task',           // مهمة
            'document',       // مستند
            'proposal',       // عرض سعر

            // Status changes
            'status_change',  // تغيير الحالة
            'stage_change',   // تغيير المرحلة
            'assignment',     // تعيين

            // Conversions
            'lead_created',   // إنشاء عميل محتمل
            'lead_converted', // تحويل العميل المحتمل
            'case_created',   // إنشاء قضية
            'case_updated',   // تحديث قضية
            'case_deleted',   // حذف قضية

            // Appointments
            'appointment_created',     // إنشاء موعد
            'appointment_updated',     // تحديث موعد
            'appointment_deleted',     // حذف موعد
            'appointment_cancelled',   // إلغاء موعد
            'appointment_completed',   // إكمال موعد
            'appointment_confirmed',   // تأكيد موعد
            'appointment_rescheduled', // إعادة جدولة موعد
            'appointment_no_show',     // عدم حضور
            'appointment_synced',      // مزامنة موعد

            // Other
            'other'
        ],
        required: true,
        index: true
    },
    subType: String, // For additional categorization

    // ═══════════════════════════════════════════════════════════════
    // RELATED ENTITY
    // ═══════════════════════════════════════════════════════════════
    entityType: {
        type: String,
        enum: ['lead', 'client', 'contact', 'case', 'organization', 'appointment'],
        required: true,
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    // Denormalized for quick display
    entityName: String,

    // Secondary entity (e.g., case linked to client)
    secondaryEntityType: String,
    secondaryEntityId: mongoose.Schema.Types.ObjectId,
    secondaryEntityName: String,

    // ═══════════════════════════════════════════════════════════════
    // ACTIVITY CONTENT
    // ═══════════════════════════════════════════════════════════════
    title: {
        type: String,
        required: true,
        maxlength: 500
    },
    titleAr: {
        type: String,
        maxlength: 500
    },
    description: {
        type: String,
        maxlength: 10000
    },
    descriptionAr: {
        type: String,
        maxlength: 10000
    },

    // ═══════════════════════════════════════════════════════════════
    // TYPE-SPECIFIC DATA
    // ═══════════════════════════════════════════════════════════════
    emailData: emailTrackingSchema,
    callData: callTrackingSchema,
    meetingData: meetingTrackingSchema,
    taskData: taskInfoSchema,

    // ═══════════════════════════════════════════════════════════════
    // SCHEDULING
    // ═══════════════════════════════════════════════════════════════
    scheduledAt: Date,
    completedAt: Date,
    duration: Number, // in minutes

    // ═══════════════════════════════════════════════════════════════
    // ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    // ═══════════════════════════════════════════════════════════════
    // ATTACHMENTS
    // ═══════════════════════════════════════════════════════════════
    attachments: [{
        fileName: String,
        fileUrl: String,
        fileKey: String,
        fileType: String,
        fileSize: Number,
        uploadedAt: { type: Date, default: Date.now }
    }],

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'completed'
    },
    outcome: String,
    outcomeNotes: String,

    // ═══════════════════════════════════════════════════════════════
    // VISIBILITY
    // ═══════════════════════════════════════════════════════════════
    isPrivate: { type: Boolean, default: false },
    visibleTo: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    tags: [{ type: String, trim: true }],
    source: {
        type: String,
        enum: ['manual', 'email_sync', 'calendar_sync', 'phone_integration', 'automation', 'import'],
        default: 'manual'
    },
    externalId: String, // For synced activities
    metadata: mongoose.Schema.Types.Mixed
}, {
    timestamps: true,
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
crmActivitySchema.index({ lawyerId: 1, entityType: 1, entityId: 1 });
crmActivitySchema.index({ lawyerId: 1, type: 1, createdAt: -1 });
crmActivitySchema.index({ lawyerId: 1, performedBy: 1, createdAt: -1 });
crmActivitySchema.index({ lawyerId: 1, 'taskData.dueDate': 1, 'taskData.status': 1 });
crmActivitySchema.index({ lawyerId: 1, scheduledAt: 1 });
crmActivitySchema.index({ title: 'text', description: 'text' });
crmActivitySchema.index({ firmId: 1, lawyerId: 1, createdAt: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
crmActivitySchema.pre('save', async function(next) {
    if (!this.activityId) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const count = await this.constructor.countDocuments({
            createdAt: {
                $gte: new Date(year, date.getMonth(), 1),
                $lt: new Date(year, date.getMonth() + 1, 1)
            }
        });
        this.activityId = `ACT-${year}${month}-${String(count + 1).padStart(6, '0')}`;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get activities for an entity
crmActivitySchema.statics.getEntityActivities = async function(entityType, entityId, options = {}) {
    const query = {
        entityType,
        entityId: new mongoose.Types.ObjectId(entityId)
    };

    if (options.type) query.type = options.type;
    if (options.performedBy) query.performedBy = new mongoose.Types.ObjectId(options.performedBy);

    // Date range
    if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
        if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
    }

    return await this.find(query)
        .populate('performedBy', 'firstName lastName avatar')
        .populate('assignedTo', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0);
};

// Get upcoming tasks
crmActivitySchema.statics.getUpcomingTasks = async function(lawyerId, options = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        type: 'task',
        'taskData.status': { $in: ['pending', 'in_progress'] }
    };

    if (options.assignedTo) {
        query.assignedTo = new mongoose.Types.ObjectId(options.assignedTo);
    }

    const endDate = options.endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
    query['taskData.dueDate'] = { $lte: endDate };

    return await this.find(query)
        .populate('performedBy', 'firstName lastName avatar')
        .populate('assignedTo', 'firstName lastName avatar')
        .sort({ 'taskData.dueDate': 1 })
        .limit(options.limit || 20);
};

// Get activity timeline for dashboard
crmActivitySchema.statics.getTimeline = async function(lawyerId, options = {}) {
    const query = { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (options.entityTypes) {
        query.entityType = { $in: options.entityTypes };
    }

    if (options.types) {
        query.type = { $in: options.types };
    }

    // Date range (default last 30 days)
    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: startDate };
    if (options.endDate) query.createdAt.$lte = new Date(options.endDate);

    return await this.find(query)
        .populate('performedBy', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .limit(options.limit || 100);
};

// Get activity statistics
crmActivitySchema.statics.getStats = async function(lawyerId, dateRange = {}) {
    const matchQuery = { lawyerId: new mongoose.Types.ObjectId(lawyerId) };

    if (dateRange.start) matchQuery.createdAt = { $gte: new Date(dateRange.start) };
    if (dateRange.end) matchQuery.createdAt = { ...matchQuery.createdAt, $lte: new Date(dateRange.end) };

    // By type
    const byType = await this.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    // By entity type
    const byEntity = await this.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);

    // By user
    const byUser = await this.aggregate([
        { $match: matchQuery },
        { $group: { _id: '$performedBy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    // Total
    const total = await this.countDocuments(matchQuery);

    // Communication stats
    const communications = await this.aggregate([
        { $match: { ...matchQuery, type: { $in: ['call', 'email', 'meeting'] } } },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                avgDuration: { $avg: '$duration' }
            }
        }
    ]);

    return {
        total,
        byType: byType.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
        byEntity: byEntity.reduce((acc, item) => { acc[item._id] = item.count; return acc; }, {}),
        byUser,
        communications
    };
};

// Log a quick activity
crmActivitySchema.statics.logActivity = async function(data) {
    const activityData = {
        lawyerId: data.lawyerId,
        type: data.type,
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        title: data.title,
        description: data.description,
        performedBy: data.performedBy || data.lawyerId,
        status: 'completed',
        completedAt: new Date()
    };

    // Include firmId if provided (for firm members)
    if (data.firmId) {
        activityData.firmId = data.firmId;
    }

    return await this.create(activityData);
};

module.exports = mongoose.model('CrmActivity', crmActivitySchema);
