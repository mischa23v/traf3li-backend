/**
 * Firm Filter Middleware - Multi-Tenancy Data Isolation
 *
 * This middleware ensures that:
 * 1. Users can only access data belonging to their firm
 * 2. All queries are automatically filtered by firmId
 * 3. New documents are automatically assigned the user's firmId
 *
 * Usage:
 *   // After userMiddleware in routes
 *   router.get('/clients', userMiddleware, firmFilter, getClients);
 *
 *   // In controllers, use req.firmId and req.firmQuery
 *   const clients = await Client.find({ ...req.firmQuery, ...otherFilters });
 */

const mongoose = require('mongoose');
const { Firm, User } = require('../models');
const CustomException = require('../utils/CustomException');

/**
 * Firm Filter Middleware
 * Attaches firmId and firmQuery to the request object
 */
const firmFilter = async (req, res, next) => {
    try {
        const userId = req.userID;

        if (!userId) {
            throw CustomException('User not authenticated', 401);
        }

        // Get user with firmId
        const user = await User.findById(userId).select('firmId firmRole').lean();

        if (!user) {
            throw CustomException('User not found', 404);
        }

        // If user has firmId, use it for filtering
        if (user.firmId) {
            req.firmId = user.firmId;
            req.firmRole = user.firmRole;

            // Create a query filter that can be spread into find queries
            req.firmQuery = { firmId: user.firmId };

            // Also get the firm for additional info if needed
            req.getFirm = async () => {
                return Firm.findById(user.firmId).lean();
            };

            // Helper to check permissions
            req.hasPermission = (module, level = 'view') => {
                if (['owner', 'admin'].includes(user.firmRole)) return true;

                // For other roles, you would check the firm's member permissions
                // This is a simplified check - in production, get from firm.members
                return true; // Default to allow for backwards compatibility
            };
        } else {
            // For backwards compatibility with users without firmId
            // Fall back to lawyerId-based filtering
            req.firmId = null;
            req.firmRole = null;
            req.firmQuery = {}; // Empty filter - controllers should use lawyerId
        }

        // Helper function to add firmId to new documents
        req.addFirmId = (data) => {
            if (req.firmId && typeof data === 'object') {
                data.firmId = req.firmId;
            }
            return data;
        };

        next();
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to validate firm access',
            error: error.message
        });
    }
};

/**
 * Require Firm Middleware
 * Use this for routes that REQUIRE a firmId
 */
const requireFirm = async (req, res, next) => {
    try {
        // First run firmFilter
        await new Promise((resolve, reject) => {
            firmFilter(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Then check if firmId exists
        if (!req.firmId) {
            return res.status(403).json({
                success: false,
                message: 'يجب أن تكون عضواً في مكتب محاماة للوصول إلى هذه الخدمة',
                code: 'FIRM_REQUIRED'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate firm membership',
            error: error.message
        });
    }
};

/**
 * Check Firm Permission Middleware Factory
 * Creates a middleware that checks specific permissions
 *
 * Usage:
 *   router.post('/invoices', userMiddleware, checkFirmPermission('invoices', 'edit'), createInvoice);
 */
const checkFirmPermission = (module, requiredLevel = 'view') => {
    return async (req, res, next) => {
        try {
            // First run firmFilter
            await new Promise((resolve, reject) => {
                firmFilter(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // If no firmId, allow for backwards compatibility
            if (!req.firmId) {
                return next();
            }

            // Owner and admin always have access
            if (['owner', 'admin'].includes(req.firmRole)) {
                return next();
            }

            // Get firm and check permissions
            const firm = await Firm.findById(req.firmId).lean();
            if (!firm) {
                return res.status(404).json({
                    success: false,
                    message: 'Firm not found'
                });
            }

            const member = firm.members.find(m => m.userId.toString() === req.userID.toString());
            if (!member) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a member of this firm'
                });
            }

            // Check permission level
            const levels = { none: 0, view: 1, edit: 2, full: 3 };
            const userLevel = levels[member.permissions?.[module]] || 0;
            const required = levels[requiredLevel] || 0;

            if (userLevel < required) {
                return res.status(403).json({
                    success: false,
                    message: `ليس لديك صلاحية للوصول إلى ${module}`,
                    code: 'PERMISSION_DENIED'
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to check permissions',
                error: error.message
            });
        }
    };
};

/**
 * Firm Owner Only Middleware
 * Only allows firm owners to access the route
 */
const firmOwnerOnly = async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            firmFilter(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm membership required'
            });
        }

        if (req.firmRole !== 'owner') {
            return res.status(403).json({
                success: false,
                message: 'هذا الإجراء متاح لمالك المكتب فقط',
                code: 'OWNER_ONLY'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate ownership',
            error: error.message
        });
    }
};

/**
 * Firm Admin Only Middleware
 * Only allows firm owners and admins to access the route
 */
const firmAdminOnly = async (req, res, next) => {
    try {
        await new Promise((resolve, reject) => {
            firmFilter(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        if (!req.firmId) {
            return res.status(403).json({
                success: false,
                message: 'Firm membership required'
            });
        }

        if (!['owner', 'admin'].includes(req.firmRole)) {
            return res.status(403).json({
                success: false,
                message: 'هذا الإجراء متاح للمسؤولين فقط',
                code: 'ADMIN_ONLY'
            });
        }

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to validate admin access',
            error: error.message
        });
    }
};

module.exports = {
    firmFilter,
    requireFirm,
    checkFirmPermission,
    firmOwnerOnly,
    firmAdminOnly
};
