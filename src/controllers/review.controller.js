const { Review, Gig, Order } = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

const createReview = async(request, response) => {
    try {
        if(request.isSeller) {
            throw CustomException("Sellers can't create reviews!", 403);
        }

        // Mass Assignment Protection
        const allowedFields = ['gigID', 'star', 'description'];
        const sanitizedBody = pickAllowedFields(request.body, allowedFields);
        const { gigID, star, description } = sanitizedBody;

        // Input Validation - Required Fields
        if (!gigID) {
            throw CustomException("Gig ID is required", 400);
        }
        if (star === undefined || star === null) {
            throw CustomException("Star rating is required", 400);
        }
        if (!description || typeof description !== 'string') {
            throw CustomException("Description is required and must be a string", 400);
        }

        // IDOR Protection - Sanitize ObjectId
        const sanitizedGigID = sanitizeObjectId(gigID);

        // Input Validation - Star rating range (1-5)
        if (typeof star !== 'number' || star < 1 || star > 5 || !Number.isInteger(star)) {
            throw CustomException("Star rating must be an integer between 1 and 5", 400);
        }

        // Input Validation - Description length
        const trimmedDescription = description.trim();
        if (trimmedDescription.length < 10) {
            throw CustomException("Description must be at least 10 characters", 400);
        }
        if (trimmedDescription.length > 1000) {
            throw CustomException("Description must not exceed 1000 characters", 400);
        }

        // XSS Prevention - Sanitize description
        const sanitizedDescription = trimmedDescription
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');

        // ✅ CHECK IF USER PURCHASED THIS GIG
        const hasPurchased = await Order.findOne({
            gigID: sanitizedGigID,
            buyerID: request.userID,
            isCompleted: true
        });

        if(!hasPurchased) {
            throw CustomException("You must purchase this service before reviewing!", 403);
        }

        // ✅ CHECK IF USER ALREADY REVIEWED
        const existingReview = await Review.findOne({
            gigID: sanitizedGigID,
            userID: request.userID
        });

        if(existingReview) {
            throw CustomException("You have already reviewed this service!", 400);
        }

        const review = new Review({
            userID: request.userID,
            gigID: sanitizedGigID,
            star,
            description: sanitizedDescription
        });

        await Gig.findByIdAndUpdate(sanitizedGigID, { $inc: { totalStars: star, starNumber: 1 } });
        await review.save();

        return response.status(201).send({
            error: false,
            review
        })
    }
    catch({message, status = 500}) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

const getReview = async (request, response) => {
    try {
        const { gigID } = request.params;

        // Input Validation - Required Field
        if (!gigID) {
            throw CustomException("Gig ID is required", 400);
        }

        // IDOR Protection - Sanitize ObjectId
        const sanitizedGigID = sanitizeObjectId(gigID);

        const reviews = await Review.find({ gigID: sanitizedGigID })
            .populate('userID', 'username image email country')
            .sort({ createdAt: -1 }); // ✅ Newest first
        return response.status(200).send(reviews);
    }
    catch({message, status = 500}) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

const deleteReview = async (request, response) => {
    try {
        const { reviewID } = request.params;

        // Input Validation - Required Field
        if (!reviewID) {
            throw CustomException("Review ID is required", 400);
        }

        // IDOR Protection - Sanitize ObjectId
        const sanitizedReviewID = sanitizeObjectId(reviewID);

        // Find the review
        const review = await Review.findById(sanitizedReviewID);

        if (!review) {
            throw CustomException("Review not found", 404);
        }

        // Ownership Verification - Only the review owner can delete
        if (review.userID.toString() !== request.userID.toString()) {
            throw CustomException("You are not authorized to delete this review", 403);
        }

        // Update the gig's star count before deleting the review
        await Gig.findByIdAndUpdate(review.gigID, {
            $inc: { totalStars: -review.star, starNumber: -1 }
        });

        // Delete the review
        await Review.findByIdAndDelete(sanitizedReviewID);

        return response.status(200).send({
            error: false,
            message: "Review deleted successfully"
        });
    }
    catch({message, status = 500}) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

module.exports = {
    createReview,
    getReview,
    deleteReview
}
