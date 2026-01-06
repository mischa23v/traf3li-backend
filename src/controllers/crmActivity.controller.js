const CrmActivity = require('../models/crmActivity.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ============================================
// SECURITY CONFIGURATION
// ============================================

// Allowed fields for mass assignment protection
const ALLOWED_ACTIVITY_FIELDS = [
    'type', 'subType', 'entityType', 'entityId', 'entityName',
    'secondaryEntityType', 'secondaryEntityId', 'secondaryEntityName',
    'title', 'titleAr', 'description', 'descriptionAr',
    'emailData', 'callData', 'meetingData', 'taskData',
    'scheduledAt', 'completedAt', 'duration',
    'performedBy', 'assignedTo',
    'attachments', 'status', 'outcome', 'outcomeNotes',
    'isPrivate', 'visibleTo', 'tags', 'source', 'externalId', 'metadata'
];

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate activity data
 */
const validateActivityData = (data) => {
    const errors = [];

    // Required fields
    if (!data.type) errors.push('Activity type is required');
    if (!data.entityType) errors.push('Entity type is required');
    if (!data.entityId) errors.push('Entity ID is required');
    if (!data.title) errors.push('Activity title is required');

    // Validate type
    const validTypes = [
        'call', 'email', 'sms', 'whatsapp', 'meeting',
        'note', 'task', 'document', 'proposal',
        'status_change', 'stage_change', 'assignment',
        'lead_created', 'lead_converted', 'case_created', 'case_updated', 'case_deleted',
        'other'
    ];
    if (data.type && !validTypes.includes(data.type)) {
        errors.push(`Invalid activity type: ${data.type}`);
    }

    // Validate entityType
    const validEntityTypes = ['lead', 'client', 'contact', 'case', 'organization'];
    if (data.entityType && !validEntityTypes.includes(data.entityType)) {
        errors.push(`Invalid entity type: ${data.entityType}`);
    }

    // Validate ObjectIds
    if (data.entityId && !sanitizeObjectId(data.entityId)) {
        errors.push('Invalid entity ID format');
    }
    if (data.performedBy && !sanitizeObjectId(data.performedBy)) {
        errors.push('Invalid performedBy ID format');
    }
    if (data.assignedTo && !sanitizeObjectId(data.assignedTo)) {
        errors.push('Invalid assignedTo ID format');
    }
    if (data.secondaryEntityId && !sanitizeObjectId(data.secondaryEntityId)) {
        errors.push('Invalid secondary entity ID format');
    }

    // Validate dates
    if (data.scheduledAt && isNaN(Date.parse(data.scheduledAt))) {
        errors.push('Invalid scheduledAt date format');
    }
    if (data.completedAt && isNaN(Date.parse(data.completedAt))) {
        errors.push('Invalid completedAt date format');
    }

    // Validate duration
    if (data.duration !== undefined && (isNaN(data.duration) || data.duration < 0)) {
        errors.push('Duration must be a positive number');
    }

    // Validate status
    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (data.status && !validStatuses.includes(data.status)) {
        errors.push(`Invalid status: ${data.status}`);
    }

    // Validate task data
    if (data.taskData) {
        if (data.taskData.dueDate && isNaN(Date.parse(data.taskData.dueDate))) {
            errors.push('Invalid task due date format');
        }
        if (data.taskData.priority && !['low', 'normal', 'high', 'urgent'].includes(data.taskData.priority)) {
            errors.push('Invalid task priority');
        }
    }

    // Validate meeting data
    if (data.meetingData) {
        if (data.meetingData.scheduledStart && isNaN(Date.parse(data.meetingData.scheduledStart))) {
            errors.push('Invalid meeting start date format');
        }
        if (data.meetingData.scheduledEnd && isNaN(Date.parse(data.meetingData.scheduledEnd))) {
            errors.push('Invalid meeting end date format');
        }
    }

    return errors;
};

/**
 * Verify entity ownership (IDOR protection)
 * Ensures the entity belongs to the user's firm or is assigned to them
 */
const verifyEntityOwnership = async (entityType, entityId, firmQuery) => {
    try {
        let Model;
        const modelMap = {
            'lead': 'Lead',
            'client': 'Client',
            'contact': 'Contact',
            'case': 'Case',
            'organization': 'Organization'
        };

        const modelName = modelMap[entityType];
        if (!modelName) {
            return { valid: false, error: `Invalid entity type: ${entityType}` };
        }

        try {
            Model = mongoose.model(modelName);
        } catch (error) {
            // Model might not exist - skip verification for now
            return { valid: true };
        }

        const query = { _id: entityId, ...firmQuery };

        const entity = await Model.findOne(query).select('_id');

        if (!entity) {
            return {
                valid: false,
                error: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found or access denied`
            };
        }

        return { valid: true };
    } catch (error) {
        logger.error('Error verifying entity ownership:', error);
        return { valid: false, error: 'Error verifying entity ownership' };
    }
};

// ============================================
// CRM ACTIVITY CRUD
// ============================================

// Create activity
exports.createActivity = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const firmId = req.user?.firmId;

        // Mass assignment protection - only allow specific fields
        const filteredData = pickAllowedFields(req.body, ALLOWED_ACTIVITY_FIELDS);

        // Input validation
        const validationErrors = validateActivityData(filteredData);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // IDOR protection - verify entity ownership
        const ownershipCheck = await verifyEntityOwnership(
            filteredData.entityType,
            filteredData.entityId,
            req.firmQuery
        );

        if (!ownershipCheck.valid) {
            return res.status(403).json({
                success: false,
                message: ownershipCheck.error || 'Access denied'
            });
        }

        // Verify secondary entity ownership if provided
        if (filteredData.secondaryEntityId && filteredData.secondaryEntityType) {
            const secondaryOwnershipCheck = await verifyEntityOwnership(
                filteredData.secondaryEntityType,
                filteredData.secondaryEntityId,
                req.firmQuery
            );

            if (!secondaryOwnershipCheck.valid) {
                return res.status(403).json({
                    success: false,
                    message: secondaryOwnershipCheck.error || 'Access denied to secondary entity'
                });
            }
        }

        // Set system-controlled fields
        const activityData = {
            ...filteredData,
            lawyerId,
            performedBy: filteredData.performedBy || lawyerId
        };

        const activity = await CrmActivity.create(activityData);

        res.status(201).json({
            success: true,
            message: 'Activity created successfully',
            data: activity
        });
    } catch (error) {
        logger.error('Error creating activity:', error);
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
        logger.error('Error getting activities:', error);
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

        // Validate ID parameter
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId && !id.startsWith('ACT-')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid activity ID format'
            });
        }

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
        logger.error('Error getting activity:', error);
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
        const firmId = req.user?.firmId;

        // Validate ID parameter
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId && !id.startsWith('ACT-')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid activity ID format'
            });
        }

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

        // Mass assignment protection - only allow specific fields
        const filteredUpdates = pickAllowedFields(req.body, ALLOWED_ACTIVITY_FIELDS);

        // If entityType or entityId is being changed, verify ownership
        if (filteredUpdates.entityType || filteredUpdates.entityId) {
            const newEntityType = filteredUpdates.entityType || activity.entityType;
            const newEntityId = filteredUpdates.entityId || activity.entityId;

            const ownershipCheck = await verifyEntityOwnership(
                newEntityType,
                newEntityId,
                req.firmQuery
            );

            if (!ownershipCheck.valid) {
                return res.status(403).json({
                    success: false,
                    message: ownershipCheck.error || 'Access denied to entity'
                });
            }
        }

        // Verify secondary entity ownership if being changed
        if (filteredUpdates.secondaryEntityId || filteredUpdates.secondaryEntityType) {
            const newSecondaryType = filteredUpdates.secondaryEntityType || activity.secondaryEntityType;
            const newSecondaryId = filteredUpdates.secondaryEntityId || activity.secondaryEntityId;

            if (newSecondaryId && newSecondaryType) {
                const secondaryOwnershipCheck = await verifyEntityOwnership(
                    newSecondaryType,
                    newSecondaryId,
                    req.firmQuery
                );

                if (!secondaryOwnershipCheck.valid) {
                    return res.status(403).json({
                        success: false,
                        message: secondaryOwnershipCheck.error || 'Access denied to secondary entity'
                    });
                }
            }
        }

        // Validate updated data
        const dataToValidate = { ...activity.toObject(), ...filteredUpdates };
        const validationErrors = validateActivityData(dataToValidate);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validationErrors
            });
        }

        // Apply updates
        Object.keys(filteredUpdates).forEach(key => {
            activity[key] = filteredUpdates[key];
        });

        await activity.save();

        res.json({
            success: true,
            message: 'Activity updated successfully',
            data: activity
        });
    } catch (error) {
        logger.error('Error updating activity:', error);
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

        // Validate ID parameter
        const sanitizedId = sanitizeObjectId(id);
        if (!sanitizedId && !id.startsWith('ACT-')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid activity ID format'
            });
        }

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
        logger.error('Error deleting activity:', error);
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
        const firmId = req.user?.firmId;
        const { type, page = 1, limit = 20 } = req.query;

        // Validate entity ID format
        if (!sanitizeObjectId(entityId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entity ID format'
            });
        }

        // Validate entityType
        const validEntityTypes = ['lead', 'client', 'contact', 'case', 'organization'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entity type'
            });
        }

        // IDOR protection - verify entity ownership
        const ownershipCheck = await verifyEntityOwnership(
            entityType,
            entityId,
            req.firmQuery
        );

        if (!ownershipCheck.valid) {
            return res.status(403).json({
                success: false,
                message: ownershipCheck.error || 'Access denied'
            });
        }

        const activities = await CrmActivity.getEntityActivities(entityType, entityId, {
            type,
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit)
        });

        const total = await CrmActivity.countDocuments({
            entityType,
            entityId,
            lawyerId // Ensure only activities owned by this lawyer are counted
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
        logger.error('Error getting entity activities:', error);
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
        logger.error('Error getting timeline:', error);
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
        logger.error('Error getting activity stats:', error);
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
        logger.error('Error getting upcoming tasks:', error);
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
        logger.error('Error completing task:', error);
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
        const firmId = req.user?.firmId;
        const {
            entityType, entityId, entityName,
            direction, phoneNumber, duration, outcome, notes
        } = req.body;

        // Input validation
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Entity type and ID are required'
            });
        }

        if (!['inbound', 'outbound'].includes(direction)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid call direction. Must be "inbound" or "outbound"'
            });
        }

        // Validate entity ID format
        if (!sanitizeObjectId(entityId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entity ID format'
            });
        }

        // Validate duration
        if (duration !== undefined && (isNaN(duration) || duration < 0)) {
            return res.status(400).json({
                success: false,
                message: 'Duration must be a positive number'
            });
        }

        // IDOR protection - verify entity ownership
        const ownershipCheck = await verifyEntityOwnership(
            entityType,
            entityId,
            req.firmQuery
        );

        if (!ownershipCheck.valid) {
            return res.status(403).json({
                success: false,
                message: ownershipCheck.error || 'Access denied'
            });
        }

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
        logger.error('Error logging call:', error);
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
        const firmId = req.user?.firmId;
        const {
            entityType, entityId, entityName,
            subject, from, to, cc, bodyPreview, isIncoming
        } = req.body;

        // Input validation
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Entity type and ID are required'
            });
        }

        // Validate entity ID format
        if (!sanitizeObjectId(entityId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entity ID format'
            });
        }

        // IDOR protection - verify entity ownership
        const ownershipCheck = await verifyEntityOwnership(
            entityType,
            entityId,
            req.firmQuery
        );

        if (!ownershipCheck.valid) {
            return res.status(403).json({
                success: false,
                message: ownershipCheck.error || 'Access denied'
            });
        }

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
        logger.error('Error logging email:', error);
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
        const firmId = req.user?.firmId;
        const {
            entityType, entityId, entityName,
            meetingType, location, scheduledStart, scheduledEnd,
            agenda, summary, nextSteps, participants, outcome
        } = req.body;

        // Input validation
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Entity type and ID are required'
            });
        }

        // Validate entity ID format
        if (!sanitizeObjectId(entityId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entity ID format'
            });
        }

        // Validate meeting type
        const validMeetingTypes = ['in_person', 'video', 'phone', 'court', 'consultation'];
        if (meetingType && !validMeetingTypes.includes(meetingType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid meeting type'
            });
        }

        // Validate dates
        if (scheduledStart && isNaN(Date.parse(scheduledStart))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid scheduledStart date format'
            });
        }
        if (scheduledEnd && isNaN(Date.parse(scheduledEnd))) {
            return res.status(400).json({
                success: false,
                message: 'Invalid scheduledEnd date format'
            });
        }

        // IDOR protection - verify entity ownership
        const ownershipCheck = await verifyEntityOwnership(
            entityType,
            entityId,
            req.firmQuery
        );

        if (!ownershipCheck.valid) {
            return res.status(403).json({
                success: false,
                message: ownershipCheck.error || 'Access denied'
            });
        }

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
        logger.error('Error logging meeting:', error);
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
        const firmId = req.user?.firmId;
        const {
            entityType, entityId, entityName,
            title, content, isPrivate, tags
        } = req.body;

        // Input validation
        if (!entityType || !entityId) {
            return res.status(400).json({
                success: false,
                message: 'Entity type and ID are required'
            });
        }

        // Validate entity ID format
        if (!sanitizeObjectId(entityId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid entity ID format'
            });
        }

        // IDOR protection - verify entity ownership
        const ownershipCheck = await verifyEntityOwnership(
            entityType,
            entityId,
            req.firmQuery
        );

        if (!ownershipCheck.valid) {
            return res.status(403).json({
                success: false,
                message: ownershipCheck.error || 'Access denied'
            });
        }

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
        logger.error('Error adding note:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding note',
            error: error.message
        });
    }
};
