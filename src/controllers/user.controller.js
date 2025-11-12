const { User } = require('../models');
const { CustomException } = require('../utils');

// Get user profile by ID (public)
const getUserProfile = async (request, response) => {
    const { _id } = request.params;
    
    try {
        const user = await User.findById(_id).select('-password');
        
        if (!user) {
            throw CustomException('User not found!', 404);
        }
        
        return response.send({
            error: false,
            user
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get comprehensive lawyer profile by USERNAME (public)
const getLawyerProfile = async (request, response) => {
    const { username } = request.params;
    
    try {
        const user = await User.findOne({ username }).select('-password');
        
        if (!user) {
            throw CustomException('User not found!', 404);
        }
        
        if (!user.isSeller) {
            throw CustomException('This user is not a lawyer!', 400);
        }
        
        // Get lawyer's gigs
        const { Gig } = require('../models');
        const gigs = await Gig.find({ userID: user._id, isActive: true });
        
        // Get all reviews for lawyer's gigs
        const { Review } = require('../models');
        const gigIDs = gigs.map(gig => gig._id);
        const reviews = await Review.find({ gigID: { $in: gigIDs } })
            .populate('userID', 'username image country')
            .populate('gigID', 'title')
            .sort({ createdAt: -1 });
        
        // Get orders stats
        const { Order } = require('../models');
        const completedOrders = await Order.find({ 
            sellerID: user._id,
            isCompleted: true 
        });
        
        const totalProjects = completedOrders.length;
        
        // Calculate average rating from all gigs
        const totalStars = gigs.reduce((sum, gig) => sum + (gig.totalStars || 0), 0);
        const totalRatings = gigs.reduce((sum, gig) => sum + (gig.starNumber || 0), 0);
        const averageRating = totalRatings > 0 ? (totalStars / totalRatings).toFixed(1) : 0;
        
        // Calculate member duration
        const memberSince = new Date(user.createdAt);
        const now = new Date();
        const yearsDiff = now.getFullYear() - memberSince.getFullYear();
        const monthsDiff = now.getMonth() - memberSince.getMonth();
        const totalMonths = yearsDiff * 12 + monthsDiff;
        
        let memberDuration;
        if (totalMonths < 12) {
            memberDuration = `${totalMonths} ${totalMonths === 1 ? 'شهر' : 'أشهر'}`;
        } else {
            memberDuration = `${yearsDiff} ${yearsDiff === 1 ? 'سنة' : 'سنوات'}`;
        }
        
        // Count active projects
        const activeProjects = await Order.countDocuments({
            sellerID: user._id,
            isCompleted: false,
            status: { $in: ['pending', 'accepted', 'in-progress'] }
        });
        
        return response.send({
            error: false,
            profile: {
                user,
                gigs,
                reviews,
                stats: {
                    totalProjects,
                    activeProjects,
                    averageRating,
                    totalReviews: totalRatings,
                    completionRate: totalProjects > 0 ? 98 : 0,
                    responseTime: '4 ساعات',
                    memberDuration,
                    memberSince: memberSince.toLocaleDateString('ar-SA')
                }
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all lawyers with filters (public)
const getLawyers = async (request, response) => {
    try {
        const { 
            search, 
            specialization, 
            city, 
            minRating, 
            minPrice, 
            maxPrice,
            page = 1,
            limit = 10
        } = request.query;
        
        // Build filter query
        const filter = { isSeller: true };
        
        // Search by name or description
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Filter by specialization
        if (specialization) {
            filter['lawyerProfile.specialization'] = specialization;
        }
        
        // Filter by city
        if (city) {
            filter.country = city;
        }
        
        // Filter by rating
        if (minRating) {
            filter['lawyerProfile.rating'] = { $gte: parseFloat(minRating) };
        }
        
        // Get lawyers
        const lawyers = await User.find(filter)
            .select('-password')
            .sort({ 'lawyerProfile.rating': -1, 'lawyerProfile.totalReviews': -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        
        // Get total count for pagination
        const total = await User.countDocuments(filter);
        
        // For each lawyer, get their gigs to calculate price range
        const { Gig } = require('../models');
        const lawyersWithPriceRange = await Promise.all(
            lawyers.map(async (lawyer) => {
                try {
                    const gigs = await Gig.find({ 
                        userID: lawyer._id, 
                        isActive: true 
                    }).select('price');
                    
                    let priceMin = 0;
                    let priceMax = 0;
                    
                    if (gigs.length > 0) {
                        const prices = gigs.map(g => g.price);
                        priceMin = Math.min(...prices);
                        priceMax = Math.max(...prices);
                    }
                    
                    return {
                        ...lawyer.toObject(),
                        priceRange: { min: priceMin, max: priceMax }
                    };
                } catch (gigError) {
                    console.error('Gig lookup failed for lawyer:', lawyer._id);
                    return {
                        ...lawyer.toObject(),
                        priceRange: { min: 500, max: 5000 }
                    };
                }
            })
        );
        
        // Apply price filter if provided
        let filteredLawyers = lawyersWithPriceRange;
        if (minPrice || maxPrice) {
            filteredLawyers = lawyersWithPriceRange.filter(lawyer => {
                const min = minPrice ? lawyer.priceRange.min >= parseInt(minPrice) : true;
                const max = maxPrice ? lawyer.priceRange.max <= parseInt(maxPrice) : true;
                return min && max;
            });
        }
        
        return response.status(200).json({
            error: false,
            lawyers: filteredLawyers,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('getLawyers ERROR:', error.message);
        console.error('Full error:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch lawyers'
        });
    }
};

// Update user profile (protected)
const updateUserProfile = async (request, response) => {
    const { _id } = request.params;
    
    try {
        if (request.userID !== _id) {
            throw CustomException('You can only update your own profile!', 403);
        }
        
        const updatedUser = await User.findByIdAndUpdate(
            _id,
            { $set: request.body },
            { new: true }
        ).select('-password');
        
        return response.send({
            error: false,
            user: updatedUser
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete user account (protected)
const deleteUser = async (request, response) => {
    const { _id } = request.params;
    
    try {
        if (request.userID !== _id) {
            throw CustomException('You can only delete your own account!', 403);
        }
        
        await User.findByIdAndDelete(_id);
        
        return response.send({
            error: false,
            message: 'User account deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    getUserProfile,
    getLawyerProfile,
    getLawyers,
    updateUserProfile,
    deleteUser
};
