const CrmActivity = require('../models/crmActivity.model');

// ============================================
// CRM ACTIVITY CRUD
// ============================================

// Create activity
exports.createActivity = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const activityData = {
            ...req.body,
            lawyerId,
            performedBy: req.body.performedBy || lawyerId
        };

        const activity = await CrmActivity.create(activityData);

        res.status(201).json({
            success: true,
            message: 'Activity created successfully',
            data: activity
        });
    } catch (error) {
        console.error('Error creating activity:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating activity',
            error: error.message
        });
    }
};

// Get activities (with filters)
exports.getActivities = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const {
            type, entityType, entityId, performedBy,
            startDate, endDate, page = 1, limit = 50
        } = req.query;

        const query = { lawyerId };

        if (type) query.type = type;
        if (entityType) query.entityType = entityType;
        if (entityId) query.entityId = entityId;
        if (performedBy) query.performedBy = performedBy;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const activities = await CrmActivity.find(query)
            .populate('performedBy', 'firstName lastName avatar')
            .populate('assignedTo', 'firstName lastName avatar')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        const total = await CrmActivity.countDocuments(query);

        res.json({
            success: true,
            data: activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting activities:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting activities',
            error: error.message
        });
    }
};

// Get single activity
exports.getActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;

        const activity = await CrmActivity.findOne({
            $or: [{ _id: id }, { activityId: id }],
            lawyerId
        })
        .populate('performedBy', 'firstName lastName avatar email')
        .populate('assignedTo', 'firstName lastName avatar email');

        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Activity not found'
            });
        }

        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        console.error('Error getting activity:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting activity',
            error: error.message
        });
    }
};

// Update activity
exports.updateActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const updates = req.body;

        const activity = await CrmActivity.findOne({
            $or: [{ _id: id }, { activityId: id }],
            lawyerId
        });

        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Activity not found'
            });
        }

        // Apply updates
        Object.keys(updates).forEach(key => {
            if (!['lawyerId', 'activityId', '_id'].includes(key)) {
                activity[key] = updates[key];
            }
        });

        await activity.save();

        res.json({
            success: true,
            message: 'Activity updated successfully',
            data: activity
        });
    } catch (error) {
        console.error('Error updating activity:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating activity',
            error: error.message
        });
    }
};

// Delete activity
exports.deleteActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;

        const activity = await CrmActivity.findOneAndDelete({
            $or: [{ _id: id }, { activityId: id }],
            lawyerId
        });

        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Activity not found'
            });
        }

        res.json({
            success: true,
            message: 'Activity deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting activity:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting activity',
            error: error.message
        });
    }
};

// ============================================
// ENTITY ACTIVITIES
// ============================================

// Get activities for an entity
exports.getEntityActivities = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const lawyerId = req.userID;
        const { type, page = 1, limit = 20 } = req.query;

        const activities = await CrmActivity.getEntityActivities(entityType, entityId, {
            type,
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit)
        });

        const total = await CrmActivity.countDocuments({
            entityType,
            entityId
        });

        res.json({
            success: true,
            data: activities,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting entity activities:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting activities',
            error: error.message
        });
    }
};

// ============================================
// TIMELINE & DASHBOARD
// ============================================

// Get activity timeline
exports.getTimeline = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { entityTypes, types, startDate, endDate, limit = 50 } = req.query;

        const activities = await CrmActivity.getTimeline(lawyerId, {
            entityTypes: entityTypes ? entityTypes.split(',') : undefined,
            types: types ? types.split(',') : undefined,
            startDate,
            endDate,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        console.error('Error getting timeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting timeline',
            error: error.message
        });
    }
};

// Get activity statistics
exports.getStats = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { startDate, endDate } = req.query;

        const stats = await CrmActivity.getStats(lawyerId, {
            start: startDate,
            end: endDate
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error getting activity stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting statistics',
            error: error.message
        });
    }
};

// ============================================
// TASKS
// ============================================

// Get upcoming tasks
exports.getUpcomingTasks = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { assignedTo, endDate, limit = 20 } = req.query;

        const tasks = await CrmActivity.getUpcomingTasks(lawyerId, {
            assignedTo,
            endDate: endDate ? new Date(endDate) : undefined,
            limit: parseInt(limit)
        });

        res.json({
            success: true,
            data: tasks
        });
    } catch (error) {
        console.error('Error getting upcoming tasks:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting tasks',
            error: error.message
        });
    }
};

// Complete task
exports.completeTask = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const { outcomeNotes } = req.body;

        const activity = await CrmActivity.findOne({
            $or: [{ _id: id }, { activityId: id }],
            lawyerId,
            type: 'task'
        });

        if (!activity) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        activity.status = 'completed';
        activity.completedAt = new Date();
        activity.outcomeNotes = outcomeNotes;

        if (activity.taskData) {
            activity.taskData.status = 'completed';
            activity.taskData.completedAt = new Date();
            activity.taskData.completedBy = lawyerId;
        }

        await activity.save();

        res.json({
            success: true,
            message: 'Task completed successfully',
            data: activity
        });
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing task',
            error: error.message
        });
    }
};

// ============================================
// QUICK LOG METHODS
// ============================================

// Log a call
exports.logCall = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const {
            entityType, entityId, entityName,
            direction, phoneNumber, duration, outcome, notes
        } = req.body;

        const activity = await CrmActivity.create({
            lawyerId,
            type: 'call',
            entityType,
            entityId,
            entityName,
            title: `${direction === 'outbound' ? 'Outgoing' : 'Incoming'} call${entityName ? ` with ${entityName}` : ''}`,
            description: notes,
            performedBy: lawyerId,
            callData: {
                direction,
                phoneNumber,
                duration,
                outcome,
                callNotes: notes
            },
            duration,
            status: 'completed',
            completedAt: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Call logged successfully',
            data: activity
        });
    } catch (error) {
        console.error('Error logging call:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging call',
            error: error.message
        });
    }
};

// Log an email
exports.logEmail = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const {
            entityType, entityId, entityName,
            subject, from, to, cc, bodyPreview, isIncoming
        } = req.body;

        const activity = await CrmActivity.create({
            lawyerId,
            type: 'email',
            entityType,
            entityId,
            entityName,
            title: subject || `Email ${isIncoming ? 'from' : 'to'} ${entityName || 'contact'}`,
            performedBy: lawyerId,
            emailData: {
                subject,
                from,
                to: Array.isArray(to) ? to : [to],
                cc: cc ? (Array.isArray(cc) ? cc : [cc]) : [],
                bodyPreview,
                isIncoming
            },
            status: 'completed',
            completedAt: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Email logged successfully',
            data: activity
        });
    } catch (error) {
        console.error('Error logging email:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging email',
            error: error.message
        });
    }
};

// Log a meeting
exports.logMeeting = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const {
            entityType, entityId, entityName,
            meetingType, location, scheduledStart, scheduledEnd,
            agenda, summary, nextSteps, participants, outcome
        } = req.body;

        const activity = await CrmActivity.create({
            lawyerId,
            type: 'meeting',
            entityType,
            entityId,
            entityName,
            title: `Meeting${entityName ? ` with ${entityName}` : ''}`,
            description: summary,
            performedBy: lawyerId,
            meetingData: {
                meetingType: meetingType || 'in_person',
                location,
                scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
                scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
                agenda,
                summary,
                nextSteps,
                participants,
                outcome
            },
            scheduledAt: scheduledStart ? new Date(scheduledStart) : undefined,
            status: outcome ? 'completed' : 'scheduled',
            completedAt: outcome ? new Date() : undefined
        });

        res.status(201).json({
            success: true,
            message: 'Meeting logged successfully',
            data: activity
        });
    } catch (error) {
        console.error('Error logging meeting:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging meeting',
            error: error.message
        });
    }
};

// Add a note
exports.addNote = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const {
            entityType, entityId, entityName,
            title, content, isPrivate, tags
        } = req.body;

        const activity = await CrmActivity.create({
            lawyerId,
            type: 'note',
            entityType,
            entityId,
            entityName,
            title: title || 'Note',
            description: content,
            performedBy: lawyerId,
            isPrivate,
            tags,
            status: 'completed',
            completedAt: new Date()
        });

        res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: activity
        });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding note',
            error: error.message
        });
    }
};
