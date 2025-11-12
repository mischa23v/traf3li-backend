const { PeerReview, User } = require('../models');
const { CustomException } = require('../utils');
const { calculateLawyerScore } = require('./score.controller');

// Create peer review
const createPeerReview = async (request, response) => {
    const { toLawyer, competence, integrity, communication, ethics, comment } = request.body;
    try {
        // Check if reviewer is a lawyer
        const reviewer = await User.findById(request.userID);
        if (reviewer.role !== 'lawyer') {
            throw CustomException('Only lawyers can submit peer reviews!', 403);
        }

        // Check if target is a lawyer
        const targetLawyer = await User.findById(toLawyer);
        if (!targetLawyer || targetLawyer.role !== 'lawyer') {
            throw CustomException('Target user is not a lawyer!', 404);
        }

        // Check if already reviewed
        const existing = await PeerReview.findOne({ fromLawyer: request.userID, toLawyer });
        if (existing) {
            throw CustomException('You have already reviewed this lawyer!', 400);
        }

        const peerReview = new PeerReview({
            fromLawyer: request.userID,
            toLawyer,
            competence,
            integrity,
            communication,
            ethics,
            comment
        });

        await peerReview.save();

        // Recalculate lawyer score
        await calculateLawyerScore(toLawyer);

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
    const { lawyerId } = request.params;
    try {
        const reviews = await PeerReview.find({ toLawyer: lawyerId, verified: true })
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
    const { _id } = request.params;
    try {
        const review = await PeerReview.findByIdAndUpdate(
            _id,
            { verified: true },
            { new: true }
        );

        if (!review) {
            throw CustomException('Peer review not found!', 404);
        }

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
