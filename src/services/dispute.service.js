const Dispute = require('../models/dispute.model');
const { Case, Payment, User } = require('../models');
const logger = require('../utils/logger');
const { CustomException } = require('../utils');

/**
 * Create a new dispute
 * @param {Object} disputeData - Dispute data
 * @param {ObjectId} userId - User creating the dispute
 * @returns {Promise<Dispute>}
 */
const createDispute = async (disputeData, userId) => {
    try {
        // Validate case exists if caseId provided
        if (disputeData.caseId) {
            const caseExists = await Case.findById(disputeData.caseId);
            if (!caseExists) {
                throw CustomException('Case not found', 404);
            }
        }

        // Validate payment exists if paymentId provided
        if (disputeData.paymentId) {
            const paymentExists = await Payment.findById(disputeData.paymentId);
            if (!paymentExists) {
                throw CustomException('Payment not found', 404);
            }
        }

        // Validate client exists
        const clientExists = await User.findById(disputeData.clientId);
        if (!clientExists) {
            throw CustomException('Client not found', 404);
        }

        // Validate lawyer exists
        const lawyerExists = await User.findById(disputeData.lawyerId);
        if (!lawyerExists) {
            throw CustomException('Lawyer not found', 404);
        }

        // Create dispute
        const dispute = new Dispute({
            ...disputeData,
            timeline: [{
                action: 'Dispute created',
                by: userId,
                at: new Date(),
                notes: `Dispute type: ${disputeData.type}`
            }]
        });

        await dispute.save();

        logger.info(`Dispute created: ${dispute._id} by user ${userId}`);

        return dispute;
    } catch (error) {
        logger.error('Error creating dispute:', error);
        throw error;
    }
};

/**
 * Get disputes with filters and pagination
 * @param {Object} filters - Filter criteria
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} - Disputes and pagination info
 */
const getDisputes = async (filters = {}, options = {}) => {
    try {
        const {
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = options;

        const query = {};

        // Apply filters
        if (filters.firmId) query.firmId = filters.firmId;
        if (filters.status) query.status = filters.status;
        if (filters.type) query.type = filters.type;
        if (filters.priority) query.priority = filters.priority;
        if (filters.clientId) query.clientId = filters.clientId;
        if (filters.lawyerId) query.lawyerId = filters.lawyerId;
        if (filters.mediatorId) query.mediatorId = filters.mediatorId;
        if (filters.caseId) query.caseId = filters.caseId;
        if (filters.paymentId) query.paymentId = filters.paymentId;

        // Date range filter
        if (filters.startDate || filters.endDate) {
            query.createdAt = {};
            if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
        }

        const skip = (page - 1) * limit;
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const [disputes, total] = await Promise.all([
            Dispute.find(query)
                .populate('clientId', 'firstName lastName email username')
                .populate('lawyerId', 'firstName lastName email username')
                .populate('mediatorId', 'firstName lastName email username')
                .populate('caseId', 'title caseNumber')
                .populate('paymentId', 'paymentNumber amount')
                .populate('firmId', 'name')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Dispute.countDocuments(query)
        ]);

        return {
            disputes,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        };
    } catch (error) {
        logger.error('Error fetching disputes:', error);
        throw error;
    }
};

/**
 * Get dispute by ID
 * @param {ObjectId} disputeId - Dispute ID
 * @returns {Promise<Dispute>}
 */
const getDisputeById = async (disputeId) => {
    try {
        const dispute = await Dispute.findById(disputeId)
            .populate('clientId', 'firstName lastName email username phone')
            .populate('lawyerId', 'firstName lastName email username phone')
            .populate('mediatorId', 'firstName lastName email username')
            .populate('caseId', 'title caseNumber description')
            .populate('paymentId', 'paymentNumber amount paymentDate paymentMethod')
            .populate('firmId', 'name email phone')
            .populate('timeline.by', 'firstName lastName username')
            .populate('mediatorNotes.createdBy', 'firstName lastName username')
            .populate('resolution.resolvedBy', 'firstName lastName username');

        if (!dispute) {
            throw CustomException('Dispute not found', 404);
        }

        return dispute;
    } catch (error) {
        logger.error('Error fetching dispute:', error);
        throw error;
    }
};

/**
 * Lawyer responds to dispute
 * @param {ObjectId} disputeId - Dispute ID
 * @param {Object} responseData - Response data
 * @param {ObjectId} userId - User ID (lawyer)
 * @returns {Promise<Dispute>}
 */
const lawyerRespond = async (disputeId, responseData, userId) => {
    try {
        const dispute = await Dispute.findById(disputeId);

        if (!dispute) {
            throw CustomException('Dispute not found', 404);
        }

        // Verify user is the lawyer
        if (dispute.lawyerId.toString() !== userId.toString()) {
            throw CustomException('Unauthorized: Only the assigned lawyer can respond', 403);
        }

        // Check if already responded
        if (dispute.lawyerResponse) {
            throw CustomException('Lawyer has already responded to this dispute', 400);
        }

        // Update dispute
        dispute.lawyerResponse = responseData.response;
        dispute.lawyerResponseDate = new Date();

        // Add evidence if provided
        if (responseData.evidence && responseData.evidence.length > 0) {
            dispute.lawyerEvidence = responseData.evidence;
        }

        // Update status to under_review
        dispute._modifiedBy = userId;
        dispute._statusChangeNotes = 'Lawyer submitted response';
        dispute.status = 'under_review';

        dispute.addTimelineEntry('Lawyer responded to dispute', userId, 'Response submitted');

        await dispute.save();

        logger.info(`Lawyer ${userId} responded to dispute ${disputeId}`);

        return dispute;
    } catch (error) {
        logger.error('Error in lawyer response:', error);
        throw error;
    }
};

/**
 * Escalate dispute
 * @param {ObjectId} disputeId - Dispute ID
 * @param {Object} escalationData - Escalation data
 * @param {ObjectId} userId - User escalating
 * @returns {Promise<Dispute>}
 */
const escalateDispute = async (disputeId, escalationData, userId) => {
    try {
        const dispute = await Dispute.findById(disputeId);

        if (!dispute) {
            throw CustomException('Dispute not found', 404);
        }

        // Verify user is authorized (client, lawyer, or admin)
        const isAuthorized =
            dispute.clientId.toString() === userId.toString() ||
            dispute.lawyerId.toString() === userId.toString();

        if (!isAuthorized) {
            throw CustomException('Unauthorized to escalate this dispute', 403);
        }

        await dispute.escalate(userId, escalationData.reason);

        // Assign mediator if provided
        if (escalationData.mediatorId) {
            const mediatorExists = await User.findById(escalationData.mediatorId);
            if (!mediatorExists) {
                throw CustomException('Mediator not found', 404);
            }
            dispute.mediatorId = escalationData.mediatorId;
            dispute.addTimelineEntry(
                `Mediator assigned`,
                userId,
                `Mediator: ${mediatorExists.firstName} ${mediatorExists.lastName}`
            );
            await dispute.save();
        }

        logger.info(`Dispute ${disputeId} escalated by user ${userId}`);

        return dispute;
    } catch (error) {
        logger.error('Error escalating dispute:', error);
        throw error;
    }
};

/**
 * Resolve dispute (admin/mediator only)
 * @param {ObjectId} disputeId - Dispute ID
 * @param {Object} resolutionData - Resolution data
 * @param {ObjectId} userId - User resolving (admin/mediator)
 * @returns {Promise<Dispute>}
 */
const resolveDispute = async (disputeId, resolutionData, userId) => {
    try {
        const dispute = await Dispute.findById(disputeId);

        if (!dispute) {
            throw CustomException('Dispute not found', 404);
        }

        // Verify user is mediator or admin
        // Note: Admin check should be done in controller middleware
        const isMediator = dispute.mediatorId &&
            dispute.mediatorId.toString() === userId.toString();

        if (!isMediator) {
            throw CustomException('Unauthorized: Only assigned mediator or admin can resolve', 403);
        }

        await dispute.resolve(resolutionData, userId);

        logger.info(`Dispute ${disputeId} resolved by user ${userId}`);

        return dispute;
    } catch (error) {
        logger.error('Error resolving dispute:', error);
        throw error;
    }
};

/**
 * Add evidence to dispute
 * @param {ObjectId} disputeId - Dispute ID
 * @param {Object} evidenceData - Evidence data
 * @param {ObjectId} userId - User adding evidence
 * @param {String} userRole - 'client' or 'lawyer'
 * @returns {Promise<Dispute>}
 */
const addEvidence = async (disputeId, evidenceData, userId, userRole) => {
    try {
        const dispute = await Dispute.findById(disputeId);

        if (!dispute) {
            throw CustomException('Dispute not found', 404);
        }

        // Verify user is authorized
        if (userRole === 'client' && dispute.clientId.toString() !== userId.toString()) {
            throw CustomException('Unauthorized: Not the dispute client', 403);
        }

        if (userRole === 'lawyer' && dispute.lawyerId.toString() !== userId.toString()) {
            throw CustomException('Unauthorized: Not the assigned lawyer', 403);
        }

        // Cannot add evidence to closed disputes
        if (dispute.status === 'closed' || dispute.status === 'resolved') {
            throw CustomException('Cannot add evidence to a closed/resolved dispute', 400);
        }

        // Add evidence to appropriate array
        const evidence = {
            type: evidenceData.type || 'document',
            url: evidenceData.url,
            filename: evidenceData.filename,
            fileKey: evidenceData.fileKey,
            description: evidenceData.description,
            uploadedAt: new Date()
        };

        if (userRole === 'client') {
            if (!dispute.clientEvidence) {
                dispute.clientEvidence = [];
            }
            dispute.clientEvidence.push(evidence);
        } else {
            if (!dispute.lawyerEvidence) {
                dispute.lawyerEvidence = [];
            }
            dispute.lawyerEvidence.push(evidence);
        }

        dispute.addTimelineEntry(
            `${userRole === 'client' ? 'Client' : 'Lawyer'} added evidence`,
            userId,
            evidenceData.description || 'Evidence uploaded'
        );

        await dispute.save();

        logger.info(`Evidence added to dispute ${disputeId} by ${userRole} ${userId}`);

        return dispute;
    } catch (error) {
        logger.error('Error adding evidence:', error);
        throw error;
    }
};

/**
 * Add mediator note
 * @param {ObjectId} disputeId - Dispute ID
 * @param {String} note - Note text
 * @param {ObjectId} userId - Mediator user ID
 * @returns {Promise<Dispute>}
 */
const addMediatorNote = async (disputeId, note, userId) => {
    try {
        const dispute = await Dispute.findById(disputeId);

        if (!dispute) {
            throw CustomException('Dispute not found', 404);
        }

        // Verify user is mediator
        const isMediator = dispute.mediatorId &&
            dispute.mediatorId.toString() === userId.toString();

        if (!isMediator) {
            throw CustomException('Unauthorized: Only assigned mediator can add notes', 403);
        }

        if (!dispute.mediatorNotes) {
            dispute.mediatorNotes = [];
        }

        dispute.mediatorNotes.push({
            note,
            createdBy: userId,
            createdAt: new Date()
        });

        await dispute.save();

        logger.info(`Mediator note added to dispute ${disputeId}`);

        return dispute;
    } catch (error) {
        logger.error('Error adding mediator note:', error);
        throw error;
    }
};

/**
 * Get dispute statistics
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Object>}
 */
const getDisputeStats = async (filters = {}) => {
    try {
        return await Dispute.getDisputeStats(filters);
    } catch (error) {
        logger.error('Error fetching dispute stats:', error);
        throw error;
    }
};

/**
 * Get disputes by type
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array>}
 */
const getDisputesByType = async (filters = {}) => {
    try {
        return await Dispute.getDisputesByType(filters);
    } catch (error) {
        logger.error('Error fetching disputes by type:', error);
        throw error;
    }
};

/**
 * Update dispute status
 * @param {ObjectId} disputeId - Dispute ID
 * @param {String} status - New status
 * @param {ObjectId} userId - User updating
 * @returns {Promise<Dispute>}
 */
const updateDisputeStatus = async (disputeId, status, userId) => {
    try {
        const dispute = await Dispute.findById(disputeId);

        if (!dispute) {
            throw CustomException('Dispute not found', 404);
        }

        // Validate status
        if (!Dispute.DISPUTE_STATUSES.includes(status)) {
            throw CustomException('Invalid dispute status', 400);
        }

        dispute._modifiedBy = userId;
        dispute._statusChangeNotes = `Status updated to ${status}`;
        dispute.status = status;

        await dispute.save();

        logger.info(`Dispute ${disputeId} status updated to ${status} by user ${userId}`);

        return dispute;
    } catch (error) {
        logger.error('Error updating dispute status:', error);
        throw error;
    }
};

module.exports = {
    createDispute,
    getDisputes,
    getDisputeById,
    lawyerRespond,
    escalateDispute,
    resolveDispute,
    addEvidence,
    addMediatorNote,
    getDisputeStats,
    getDisputesByType,
    updateDisputeStatus
};
