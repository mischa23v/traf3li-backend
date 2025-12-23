const { User } = require('../models');
const { CustomException, apiResponse } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizeEmail } = require('../utils/securityUtils');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

// Get user profile by ID (public)
// UPDATED: Now uses standardized API response format
const getUserProfile = async (request, response) => {
    const { _id } = request.params;

    try {
        // IDOR Protection: Sanitize object ID
        const sanitizedId = sanitizeObjectId(_id);
        if (!sanitizedId) {
            return apiResponse.badRequest(response, 'Invalid user ID format');
        }

        const user = await User.findById(sanitizedId).select('-password').lean();

        if (!user) {
            return apiResponse.notFound(response, 'User not found');
        }

        // Using standardized success response
        return apiResponse.success(
            response,
            { user },
            'User profile retrieved successfully'
        );
    } catch (error) {
        // Using standardized error response
        return apiResponse.internalError(
            response,
            error.message || 'Failed to retrieve user profile',
            { stack: error.stack }
        );
    }
};

// Get comprehensive lawyer profile by USERNAME (public)
const getLawyerProfile = async (request, response) => {
    const { username } = request.params;
    
    try {
        const user = await User.findOne({ username }).select('-password').lean();

        if (!user) {
            throw CustomException('User not found!', 404);
        }
        
        if (!user.isSeller) {
            throw CustomException('This user is not a lawyer!', 400);
        }
        
        // Get lawyer's gigs
        const { Gig } = require('../models');
        const gigs = await Gig.find({ userID: user._id, isActive: true }).lean();
        
        // Get all reviews for lawyer's gigs
        const { Review } = require('../models');
        const gigIDs = gigs.map(gig => gig._id);
        const reviews = await Review.find({ gigID: { $in: gigIDs } })
            .populate('userID', 'username image country')
            .populate('gigID', 'title')
            .sort({ createdAt: -1 })
            .lean();
        
        // Get orders stats
        const { Order } = require('../models');
        const completedOrders = await Order.find({
            sellerID: user._id,
            isCompleted: true
        }).lean();
        
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
        
        // ✅ PERFORMANCE: Use lean() for faster queries and parallel execution
        const [lawyers, total] = await Promise.all([
            User.find(filter)
                .select('-password')
                .sort({ 'lawyerProfile.rating': -1, 'lawyerProfile.totalReviews': -1 })
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit))
                .lean(), // Convert to plain JS objects for better performance
            User.countDocuments(filter)
        ]);

        // ✅ PERFORMANCE: Batch fetch all gigs at once instead of N+1 queries
        const { Gig } = require('../models');
        const lawyerIds = lawyers.map(l => l._id);

        const allGigs = await Gig.find({
            userID: { $in: lawyerIds },
            isActive: true
        })
        .select('userID price')
        .lean();

        // Group gigs by lawyer ID for quick lookup
        const gigsByLawyer = allGigs.reduce((acc, gig) => {
            const lawyerId = gig.userID.toString();
            if (!acc[lawyerId]) acc[lawyerId] = [];
            acc[lawyerId].push(gig.price);
            return acc;
        }, {});

        // Calculate price ranges for each lawyer
        const lawyersWithPriceRange = lawyers.map((lawyer) => {
            try {
                const prices = gigsByLawyer[lawyer._id.toString()] || [];

                let priceMin = 0;
                let priceMax = 0;

                if (prices.length > 0) {
                    priceMin = Math.min(...prices);
                    priceMax = Math.max(...prices);
                }

                return {
                    ...lawyer,
                    priceRange: { min: priceMin, max: priceMax }
                };
            } catch (gigError) {
                logger.error('Price calculation failed for lawyer:', lawyer._id);
                return {
                    ...lawyer,
                    priceRange: { min: 0, max: 0 }
                };
            }
        });
        
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
        logger.error('getLawyers ERROR:', error.message);
        logger.error('Full error:', error);
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
        // IDOR Protection: Sanitize object ID
        const sanitizedId = sanitizeObjectId(_id);
        if (!sanitizedId) {
            throw CustomException('Invalid user ID format', 400);
        }

        // IDOR Protection: Verify ownership
        if (request.userID !== sanitizedId) {
            throw CustomException('You can only update your own profile!', 403);
        }

        // Mass Assignment Protection: Define allowed fields
        const allowedFields = [
            'username',
            'email',
            'firstName',
            'lastName',
            'phone',
            'image',
            'country',
            'description',
            'lawyerProfile',
            'language',
            'timezone',
            'notifications'
        ];

        // CRITICAL: NEVER allow these fields to be updated by users
        const blockedFields = ['role', 'isAdmin', 'isSeller', 'permissions', 'isVerified', 'createdAt', 'updatedAt'];

        // Check if any blocked fields are in the request
        const hasBlockedFields = blockedFields.some(field => request.body.hasOwnProperty(field));
        if (hasBlockedFields) {
            throw CustomException('Cannot update restricted fields', 403);
        }

        // Mass Assignment Protection: Pick only allowed fields
        const updateData = pickAllowedFields(request.body, allowedFields);

        // Input Validation: Validate email if provided
        if (updateData.email) {
            const sanitizedEmail = sanitizeEmail(updateData.email);
            if (!sanitizedEmail) {
                throw CustomException('Invalid email format', 400);
            }
            updateData.email = sanitizedEmail;

            // Check if email is already taken by another user
            const existingUser = await User.findOne({
                email: sanitizedEmail,
                _id: { $ne: sanitizedId }
            });
            if (existingUser) {
                throw CustomException('Email already in use', 400);
            }
        }

        // Input Validation: Validate username if provided
        if (updateData.username) {
            if (updateData.username.length < 3 || updateData.username.length > 30) {
                throw CustomException('Username must be between 3 and 30 characters', 400);
            }

            // Check if username is already taken
            const existingUser = await User.findOne({
                username: updateData.username,
                _id: { $ne: sanitizedId }
            });
            if (existingUser) {
                throw CustomException('Username already taken', 400);
            }
        }

        // Password Security: Handle password updates separately
        if (request.body.password) {
            // Input Validation: Validate password strength
            if (request.body.password.length < 8) {
                throw CustomException('Password must be at least 8 characters long', 400);
            }

            // Password Security: Hash password with bcrypt
            const hashedPassword = await bcrypt.hash(request.body.password, 10);
            updateData.password = hashedPassword;
        }

        const updatedUser = await User.findByIdAndUpdate(
            sanitizedId,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            throw CustomException('User not found', 404);
        }

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
        // IDOR Protection: Sanitize object ID
        const sanitizedId = sanitizeObjectId(_id);
        if (!sanitizedId) {
            throw CustomException('Invalid user ID format', 400);
        }

        // IDOR Protection: Verify ownership
        if (request.userID !== sanitizedId) {
            throw CustomException('You can only delete your own account!', 403);
        }

        const deletedUser = await User.findByIdAndDelete(sanitizedId);

        if (!deletedUser) {
            throw CustomException('User not found', 404);
        }

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

// Get team members for case/task assignment
const getTeamMembers = async (request, response) => {
    try {
        const users = await User.find({
            isSeller: true,
            role: { $in: ['lawyer', 'admin', 'paralegal', 'assistant'] }
        })
            .select('_id firstName lastName email role image lawyerProfile.specialization')
            .sort({ firstName: 1 })
            .lean();

        // Transform to match expected format
        const formattedUsers = users.map(user => ({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            avatar: user.image,
            status: 'active'
        }));

        return response.send({
            error: false,
            users: formattedUsers
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
    deleteUser,
    getTeamMembers
};
