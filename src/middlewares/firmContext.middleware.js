/**
 * Firm Context Middleware
 * Attaches firm context to the request for multi-tenancy support
 */

const { User, Firm } = require('../models');

/**
 * Attach Firm Context
 * Adds firmId and firm-related data to the request object
 * This is a lighter version of firmFilter for HR/Payroll routes
 */
const attachFirmContext = async (req, res, next) => {
    try {
        const userId = req.userID || req.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Get user with firm information
        const user = await User.findById(userId)
            .select('firmId firmRole firmStatus isSoloLawyer lawyerWorkMode role')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Attach user info to request
        req.user = user;

        // Handle solo lawyers - they work without a firm
        if (user.isSoloLawyer || (!user.firmId && user.role === 'lawyer')) {
            req.firmId = null;
            req.firmRole = 'owner'; // Solo lawyers have full access
            req.isSoloLawyer = true;
            req.firmQuery = { userId }; // Filter by user's own data
            return next();
        }

        // Attach firm context if user belongs to a firm
        if (user.firmId) {
            req.firmId = user.firmId;
            req.firmRole = user.firmRole || 'member';
            req.firmStatus = user.firmStatus || 'active';
            req.firmQuery = { firmId: user.firmId };

            // Get firm details if needed
            const firm = await Firm.findById(user.firmId)
                .select('name ownerId settings')
                .lean();

            if (firm) {
                req.firm = firm;
                req.isOwner = firm.ownerId?.toString() === userId;
            }
        } else {
            // User without firm - allow personal data access
            req.firmId = null;
            req.firmRole = null;
            req.firmQuery = { userId };
        }

        next();
    } catch (error) {
        console.error('Firm context middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to load firm context',
            error: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

module.exports = {
    attachFirmContext
};
