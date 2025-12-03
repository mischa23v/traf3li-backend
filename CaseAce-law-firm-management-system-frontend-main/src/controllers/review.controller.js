const { Review, Gig, Order } = require('../models');
const { CustomException } = require('../utils');

const createReview = async(request, response) => {
    const { gigID, star, description } = request.body;
    try {
        if(request.isSeller) {
            throw CustomException("Sellers can't create reviews!", 403);
        }

        // ✅ CHECK IF USER PURCHASED THIS GIG
        const hasPurchased = await Order.findOne({
            gigID,
            buyerID: request.userID,
            isCompleted: true
        });

        if(!hasPurchased) {
            throw CustomException("You must purchase this service before reviewing!", 403);
        }

        // ✅ CHECK IF USER ALREADY REVIEWED
        const existingReview = await Review.findOne({
            gigID,
            userID: request.userID
        });

        if(existingReview) {
            throw CustomException("You have already reviewed this service!", 400);
        }

        const review = new Review({
            userID: request.userID,
            gigID,
            star,
            description
        });

        await Gig.findByIdAndUpdate(gigID, { $inc: { totalStars: star, starNumber: 1 } });
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
    const { gigID } = request.params;
    
    try {
        const reviews = await Review.find({ gigID })
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
    // TODO: Implement if needed
}

module.exports = {
    createReview,
    getReview,
    deleteReview
}
