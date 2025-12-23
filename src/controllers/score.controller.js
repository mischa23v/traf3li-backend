const { Score, User, Review, PeerReview, Case, Message } = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Calculate lawyer score based on algorithm
const calculateLawyerScore = async (lawyerId) => {
    try {
        // IDOR Protection: Sanitize lawyer ID
        const sanitizedLawyerId = sanitizeObjectId(lawyerId, 'Lawyer ID');

        const user = await User.findById(sanitizedLawyerId);
        if (!user || user.role !== 'lawyer') {
            throw CustomException('Lawyer not found!', 404);
        }

        // 1. Client Rating (25%) - from reviews
        const reviews = await Review.find({ gigID: { $in: await getGigsByLawyer(sanitizedLawyerId) } });
        const avgClientRating = reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.star, 0) / reviews.length) * 2
            : 0;

        // 2. Peer Rating (20%) - from peer reviews
        const peerReviews = await PeerReview.find({ toLawyer: sanitizedLawyerId, verified: true });
        const avgPeerRating = peerReviews.length > 0
            ? (peerReviews.reduce((sum, r) => sum + ((r.competence + r.integrity + r.communication + r.ethics) / 4), 0) / peerReviews.length) * 2
            : 0;

        // 3. Win Rate (20%) - from cases
        const cases = await Case.find({ lawyerId: sanitizedLawyerId });
        const completedCases = cases.filter(c => c.outcome !== 'ongoing');
        const wonCases = cases.filter(c => c.outcome === 'won');
        const winRate = completedCases.length > 0 
            ? (wonCases.length / completedCases.length) * 10 
            : 0;

        // 4. Experience (15%) - from profile
        const experience = Math.min((user.lawyerProfile?.yearsExperience || 0) / 20, 1) * 10;

        // 5. Response Rate (10%) - simplified for now
        const responseRate = 8; // Placeholder - calculate from message response times

        // 6. Engagement (10%) - active cases and Q&A answers
        const activeCases = cases.filter(c => c.status === 'active').length;
        const engagement = Math.min(activeCases / 10, 1) * 10;

        // Calculate weighted score
        const overallScore = (
            (avgClientRating * 0.25) +
            (avgPeerRating * 0.20) +
            (winRate * 0.20) +
            (experience * 0.15) +
            (responseRate * 0.10) +
            (engagement * 0.10)
        );

        // Determine badge
        let badge = 'none';
        if (overallScore >= 9.0) badge = 'platinum';
        else if (overallScore >= 8.0) badge = 'gold';
        else if (overallScore >= 7.0) badge = 'silver';
        else if (overallScore >= 6.0) badge = 'bronze';

        // Update or create score
        const score = await Score.findOneAndUpdate(
            { lawyerId: sanitizedLawyerId },
            {
                lawyerId: sanitizedLawyerId,
                clientRating: avgClientRating,
                peerRating: avgPeerRating,
                winRate,
                experience,
                responseRate,
                engagement,
                overallScore: Math.round(overallScore * 10) / 10,
                badge,
                lastUpdated: new Date()
            },
            { new: true, upsert: true }
        );

        return score;
    } catch (error) {
        throw error;
    }
};

// Helper function
const getGigsByLawyer = async (lawyerId) => {
    const { Gig } = require('../models');
    // Note: lawyerId is already sanitized before this function is called
    const gigs = await Gig.find({ userID: lawyerId });
    return gigs.map(g => g._id);
};

// Get lawyer score
const getLawyerScore = async (request, response) => {
    const { lawyerId } = request.params;
    try {
        // IDOR Protection: Sanitize lawyer ID
        const sanitizedLawyerId = sanitizeObjectId(lawyerId, 'Lawyer ID');

        let score = await Score.findOne({ lawyerId: sanitizedLawyerId });

        if (!score) {
            // Calculate if doesn't exist
            score = await calculateLawyerScore(sanitizedLawyerId);
        }

        return response.send({
            error: false,
            score
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Recalculate lawyer score (admin or system trigger)
const recalculateScore = async (request, response) => {
    const { lawyerId } = request.params;
    try {
        // IDOR Protection: Sanitize lawyer ID
        const sanitizedLawyerId = sanitizeObjectId(lawyerId, 'Lawyer ID');

        const score = await calculateLawyerScore(sanitizedLawyerId);

        return response.status(202).send({
            error: false,
            message: 'Score recalculated successfully!',
            score
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get top lawyers by score
const getTopLawyers = async (request, response) => {
    const { limit = 10 } = request.query;
    try {
        // Input Validation: Validate limit parameter
        const parsedLimit = parseInt(limit);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
            return response.status(400).send({
                error: true,
                message: 'Limit must be a number between 1 and 100'
            });
        }

        const topScores = await Score.find()
            .sort({ overallScore: -1 })
            .limit(parsedLimit)
            .populate('lawyerId', 'username image email country lawyerProfile');

        return response.send({
            error: false,
            lawyers: topScores
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    getLawyerScore,
    recalculateScore,
    getTopLawyers,
    calculateLawyerScore
};
