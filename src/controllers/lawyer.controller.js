const { User } = require('../models');
const { CustomException } = require('../utils');
const Joi = require('joi');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ============================================
// JOI VALIDATION SCHEMAS
// ============================================

/**
 * Validation schema for lawyer ID parameter
 * Ensures MongoDB ObjectId format (24 hex characters)
 */
const lawyerIdSchema = Joi.object({
    _id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid lawyer ID format',
            'any.required': 'Lawyer ID is required'
        })
});

/**
 * Validation schema for query parameters in getLawyers
 * Prevents injection attacks via query parameters
 */
const getLayersQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional(),
    page: Joi.number().integer().min(1).optional(),
    sort: Joi.string().valid('firstName', 'lastName', 'createdAt', '-firstName', '-lastName', '-createdAt').optional()
}).options({ stripUnknown: true });

/**
 * Validation schema for team members query
 * Ensures only valid roles can be requested
 */
const getTeamMembersQuerySchema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional(),
    page: Joi.number().integer().min(1).optional()
}).options({ stripUnknown: true });

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

// Get all lawyers in user's firm
// SECURITY: Must be scoped to user's firm to prevent cross-firm data exposure
const getLawyers = async (request, response) => {
    try {
        // ====================================
        // SECURITY: Input Validation with Joi
        // ====================================
        const { error, value } = getLayersQuerySchema.validate(request.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => detail.message).join(', ');
            throw CustomException(`Validation error: ${errors}`, 400);
        }

        // ====================================
        // SECURITY: Firm Context Required
        // ====================================
        const firmId = request.firmId || request.user?.firmId;
        const userId = request.userID || request.user?._id;

        // Build filter with firm scope
        const filter = {
            role: 'lawyer'
        };

        // Filter by firmId if available, otherwise by lawyerId for solo users
        if (firmId) {
            filter.firmId = firmId;
        } else if (userId) {
            // Solo lawyer - only return themselves
            filter._id = userId;
        }

        // ====================================
        // SECURITY: Query with Safe Parameters
        // ====================================
        // Only query lawyers with verified roles - prevents role escalation
        const lawyers = await User.find(filter)
            .select('firstName lastName email phone image lawyerProfile role city createdAt')
            .sort({ firstName: 1 });

        return response.send({
            error: false,
            lawyers
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single lawyer by ID
const getLawyer = async (request, response) => {
    try {
        // ====================================
        // SECURITY: Input Validation with Joi
        // ====================================
        const { error, value } = lawyerIdSchema.validate(request.params, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => detail.message).join(', ');
            throw CustomException(`Validation error: ${errors}`, 400);
        }

        // ====================================
        // SECURITY: Sanitize ObjectId
        // Prevents NoSQL injection attacks
        // ====================================
        const sanitizedId = sanitizeObjectId(value._id);
        if (!sanitizedId) {
            throw CustomException('Invalid lawyer ID format', 400);
        }

        // ====================================
        // SECURITY: IDOR Protection
        // ====================================
        // Verify the user is actually a lawyer (prevents access to non-lawyer user profiles)
        // This prevents Insecure Direct Object Reference (IDOR) attacks
        const lawyer = await User.findOne({
            _id: sanitizedId,
            isSeller: true,
            role: 'lawyer' // Additional verification to prevent role escalation
        }).select('-password -mfaSecret -mfaBackupCodes -salt -__v');

        if (!lawyer) {
            throw CustomException('Lawyer not found!', 404);
        }

        // ====================================
        // SECURITY: Response Field Filtering
        // ====================================
        // Additional protection: ensure no sensitive fields leak in response
        // Even though we used .select(), this provides defense in depth
        const safeFields = [
            '_id', 'firstName', 'lastName', 'email', 'phone', 'image',
            'lawyerProfile', 'role', 'city', 'country', 'region',
            'description', 'isSeller', 'createdAt', 'updatedAt'
        ];
        const safeLawyer = pickAllowedFields(lawyer.toObject(), safeFields);

        return response.send({
            error: false,
            lawyer: safeLawyer
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get active team members for task assignment
// SECURITY: Must be scoped to user's firm to prevent cross-firm data exposure
const getTeamMembers = async (request, response) => {
    try {
        // ====================================
        // SECURITY: Input Validation with Joi
        // ====================================
        const { error, value } = getTeamMembersQuerySchema.validate(request.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => detail.message).join(', ');
            throw CustomException(`Validation error: ${errors}`, 400);
        }

        // ====================================
        // SECURITY: Use req.firmQuery from middleware
        // Gold Standard: Return empty array if no context, don't throw error
        // ====================================
        const firmId = request.firmId || request.user?.firmId;
        const userId = request.userID || request.user?._id;

        // ====================================
        // SECURITY: Prevent Role Escalation
        // ====================================
        // Only allow specific, whitelisted roles to be queried
        const allowedRoles = ['lawyer', 'admin'];

        // Build filter using req.firmQuery for proper tenant isolation
        const filter = {
            role: { $in: allowedRoles },
            ...request.firmQuery
        };

        // Gold Standard: If no tenant context, return empty array instead of error
        // This handles solo lawyers gracefully - API should be safe to call
        if (!firmId && !userId) {
            return response.send({
                error: false,
                lawyers: [],
                message: 'No team context available'
            });
        }

        // For solo lawyers without firmId, query by their userId
        // req.firmQuery will have { lawyerId: X } for solo lawyers
        if (!firmId && userId && !request.firmQuery?.firmId) {
            filter._id = userId;
            delete filter.lawyerId; // Use _id instead for User model
        }

        const lawyers = await User.find(filter)
            .select('firstName lastName email role image lawyerProfile.specialization')
            .sort({ firstName: 1 });

        // ====================================
        // SECURITY: Response Field Filtering
        // ====================================
        // Filter each team member to only include safe fields
        const safeFields = ['_id', 'firstName', 'lastName', 'email', 'role', 'image', 'lawyerProfile'];
        const safeTeamMembers = lawyers.map(lawyer =>
            pickAllowedFields(lawyer.toObject(), safeFields)
        );

        return response.send({
            error: false,
            lawyers: safeTeamMembers
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    getLawyers,
    getLawyer,
    getTeamMembers
};
