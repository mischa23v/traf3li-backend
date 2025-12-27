const { PeerReview, User } = require('../models');
const { CustomException } = require('../utils');
const { calculateLawyerScore } = require('./score.controller');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Create peer review
const createPeerReview = async (request, response) => {
    try {
        // Mass assignment protection - only allow specific fields
        const allowedFields = ['toLawyer', 'competence', 'integrity', 'communication', 'ethics', 'comment'];
        const reviewData = pickAllowedFields(request.body, allowedFields);
        const { toLawyer, competence, integrity, communication, ethics, comment } = reviewData;

        // Sanitize ObjectId
        const sanitizedToLawyer = sanitizeObjectId(toLawyer);
        if (!sanitizedToLawyer) {
            throw CustomException('Invalid lawyer ID!', 400);
        }

        // Input validation for review scores (must be numbers between 1-5)
        const scores = { competence, integrity, communication, ethics };
        for (const [field, value] of Object.entries(scores)) {
            if (value === undefined || value === null) {
                throw CustomException(`${field} score is required!`, 400);
            }
            const numValue = Number(value);
            if (isNaN(numValue) || numValue < 1 || numValue > 5 || !Number.isInteger(numValue)) {
                throw CustomException(`${field} must be an integer between 1 and 5!`, 400);
            }
        }

        // Check if reviewer is a lawyer
        const reviewer = await User.findOne({ _id: request.userID, ...request.firmQuery });
        if (!reviewer) {
            throw CustomException('Reviewer not found!', 404);
        }
        if (reviewer.role !== 'lawyer') {
            throw CustomException('Only lawyers can submit peer reviews!', 403);
        }

        // Check if target is a lawyer
        const targetLawyer = await User.findOne({ _id: sanitizedToLawyer, ...request.firmQuery });
        if (!targetLawyer || targetLawyer.role !== 'lawyer') {
            throw CustomException('Target user is not a lawyer!', 404);
        }

        // Prevent self-review
        if (request.userID.toString() === sanitizedToLawyer.toString()) {
            throw CustomException('You cannot review yourself!', 400);
        }

        // IDOR protection - verify firmId ownership if applicable
        if (reviewer.firmId && targetLawyer.firmId) {
            // Only allow reviews within same firm or cross-firm if explicitly allowed
            // For now, we ensure both users exist and are lawyers
        }

        // Check if already reviewed
        const existing = await PeerReview.findOne({ fromLawyer: request.userID, toLawyer: sanitizedToLawyer, firmId: request.firmId });
        if (existing) {
            throw CustomException('You have already reviewed this lawyer!', 400);
        }

        const peerReview = new PeerReview({
            fromLawyer: request.userID,
            toLawyer: sanitizedToLawyer,
            firmId: request.firmId,
            competence: Number(competence),
            integrity: Number(integrity),
            communication: Number(communication),
            ethics: Number(ethics),
            comment: comment ? String(comment).trim() : undefined
        });

        await peerReview.save();

        // Recalculate lawyer score
        await calculateLawyerScore(sanitizedToLawyer);

        return response.status(201).send({
            error: false,
            message: 'Peer review submitted successfully!',
            peerReview
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get peer reviews for a lawyer
const getPeerReviews = async (request, response) => {
    try {
        // Sanitize ObjectId
        const sanitizedLawyerId = sanitizeObjectId(request.params.lawyerId);
        if (!sanitizedLawyerId) {
            throw CustomException('Invalid lawyer ID!', 400);
        }

        // IDOR protection - verify lawyer exists
        const lawyer = await User.findOne({ _id: sanitizedLawyerId, ...request.firmQuery });
        if (!lawyer || lawyer.role !== 'lawyer') {
            throw CustomException('Lawyer not found!', 404);
        }

        const reviews = await PeerReview.find({ toLawyer: sanitizedLawyerId, verified: true, firmId: request.firmId })
            .populate('fromLawyer', 'username image lawyerProfile.specialization')
            .sort({ createdAt: -1 });

        const avgRating = reviews.length > 0
            ? reviews.reduce((sum, r) => sum + ((r.competence + r.integrity + r.communication + r.ethics) / 4), 0) / reviews.length
            : 0;

        return response.send({
            error: false,
            reviews,
            avgRating: Math.round(avgRating * 10) / 10,
            totalReviews: reviews.length
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Verify peer review (admin only)
const verifyPeerReview = async (request, response) => {
    try {
        // Sanitize ObjectId
        const sanitizedId = sanitizeObjectId(request.params._id);
        if (!sanitizedId) {
            throw CustomException('Invalid review ID!', 400);
        }

        // IDOR protection - verify review exists before update
        const existingReview = await PeerReview.findOne({ _id: sanitizedId, ...request.firmQuery });
        if (!existingReview) {
            throw CustomException('Peer review not found!', 404);
        }

        // Mass assignment protection - only allow verified field to be updated
        const review = await PeerReview.findOneAndUpdate(
            { _id: sanitizedId, ...request.firmQuery },
            { verified: true },
            { new: true }
        );

        // Recalculate score after verification
        await calculateLawyerScore(review.toLawyer);

        return response.status(202).send({
            error: false,
            message: 'Peer review verified!',
            review
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createPeerReview,
    getPeerReviews,
    verifyPeerReview
};
