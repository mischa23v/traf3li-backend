const Joi = require('joi');
const { Gig } = require('../models');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// ============================================
// VALIDATION SCHEMAS
// ============================================

/**
 * Allowed fields for gig creation/update (Mass Assignment Protection)
 * Excludes sensitive/system-managed fields: userID, totalStars, starNumber, sales, createdAt, updatedAt
 */
const ALLOWED_GIG_FIELDS = [
    'title',
    'description',
    'category',
    'price',
    'cover',
    'images',
    'shortTitle',
    'shortDesc',
    'deliveryTime',
    'revisionNumber',
    'features',
    'consultationType',
    'languages',
    'duration',
    'isActive'
];

/**
 * Create gig validation schema
 */
const createGigSchema = Joi.object({
    title: Joi.string()
        .min(3)
        .max(200)
        .required()
        .messages({
            'string.min': 'Title is too short (minimum 3 characters)',
            'string.max': 'Title is too long (maximum 200 characters)',
            'any.required': 'Title is required'
        }),
    description: Joi.string()
        .min(10)
        .max(5000)
        .required()
        .messages({
            'string.min': 'Description is too short (minimum 10 characters)',
            'string.max': 'Description is too long (maximum 5000 characters)',
            'any.required': 'Description is required'
        }),
    category: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Category is too short',
            'string.max': 'Category is too long',
            'any.required': 'Category is required'
        }),
    price: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.base': 'Price must be a number',
            'number.min': 'Price cannot be negative',
            'any.required': 'Price is required'
        }),
    cover: Joi.string()
        .uri()
        .required()
        .messages({
            'string.uri': 'Cover must be a valid URL',
            'any.required': 'Cover image is required'
        }),
    images: Joi.array()
        .items(Joi.string().uri())
        .messages({
            'array.base': 'Images must be an array',
            'string.uri': 'Each image must be a valid URL'
        }),
    shortTitle: Joi.string()
        .min(3)
        .max(100)
        .required()
        .messages({
            'string.min': 'Short title is too short (minimum 3 characters)',
            'string.max': 'Short title is too long (maximum 100 characters)',
            'any.required': 'Short title is required'
        }),
    shortDesc: Joi.string()
        .min(10)
        .max(500)
        .required()
        .messages({
            'string.min': 'Short description is too short (minimum 10 characters)',
            'string.max': 'Short description is too long (maximum 500 characters)',
            'any.required': 'Short description is required'
        }),
    deliveryTime: Joi.string()
        .max(50)
        .required()
        .messages({
            'string.max': 'Delivery time is too long',
            'any.required': 'Delivery time is required'
        }),
    revisionNumber: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'Revision number must be a number',
            'number.integer': 'Revision number must be an integer',
            'number.min': 'Revision number cannot be negative',
            'any.required': 'Revision number is required'
        }),
    features: Joi.array()
        .items(Joi.string().max(200))
        .messages({
            'array.base': 'Features must be an array',
            'string.max': 'Each feature is too long (maximum 200 characters)'
        }),
    consultationType: Joi.string()
        .valid('video', 'phone', 'in-person', 'document-review', 'email')
        .messages({
            'any.only': 'Invalid consultation type. Allowed: video, phone, in-person, document-review, email'
        }),
    languages: Joi.array()
        .items(Joi.string().max(50))
        .default(['arabic'])
        .messages({
            'array.base': 'Languages must be an array'
        }),
    duration: Joi.number()
        .integer()
        .min(1)
        .default(30)
        .messages({
            'number.base': 'Duration must be a number',
            'number.integer': 'Duration must be an integer',
            'number.min': 'Duration must be at least 1 minute'
        }),
    isActive: Joi.boolean()
        .default(true)
        .messages({
            'boolean.base': 'isActive must be a boolean'
        })
});

/**
 * Get gigs query validation schema
 */
const getGigsQuerySchema = Joi.object({
    category: Joi.string().max(100),
    search: Joi.string().max(200),
    max: Joi.number().min(0),
    min: Joi.number().min(0),
    userID: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
    sort: Joi.string().valid('price', 'createdAt', 'totalStars', 'sales').default('createdAt')
});

/**
 * MongoDB ObjectId parameter validation schema
 */
const objectIdParamSchema = Joi.object({
    _id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid gig ID format',
            'any.required': 'Gig ID is required'
        })
});

// ============================================
// CONTROLLER FUNCTIONS
// ============================================

const createGig = async (request, response) => {
    try {
        // Validate seller permission
        if (!request.isSeller) {
            throw CustomException('Only sellers can create new Gigs!', 403);
        }

        // SECURITY: Input validation with Joi
        const { error, value } = createGigSchema.validate(request.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return response.status(400).send({
                error: true,
                message: 'Validation error',
                errors
            });
        }

        // SECURITY: Mass assignment protection - only allow specific fields
        const allowedData = pickAllowedFields(value, ALLOWED_GIG_FIELDS);

        // Create gig with validated data and authenticated user ID
        const gig = new Gig({
            userID: request.userID,
            ...allowedData
        });

        await gig.save();
        return response.status(201).send(gig);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

const deleteGig = async (request, response) => {
    try {
        // SECURITY: Validate ObjectId parameter
        const { error } = objectIdParamSchema.validate(request.params);
        if (error) {
            return response.status(400).send({
                error: true,
                message: 'Invalid gig ID format'
            });
        }

        // SECURITY: Sanitize ObjectId to prevent NoSQL injection
        const gigId = sanitizeObjectId(request.params._id);
        if (!gigId) {
            return response.status(400).send({
                error: true,
                message: 'Invalid gig ID format'
            });
        }

        // SECURITY: TOCTOU Fix - Use atomic delete with ownership check in query
        // This prevents race conditions where ownership could change between check and delete
        const result = await Gig.deleteOne({
            _id: gigId,
            userID: request.userID  // Include ownership in delete query
        });

        if (result.deletedCount === 0) {
            // Check if gig exists but user doesn't own it
            const existingGig = await Gig.findById(gigId);
            if (existingGig) {
                throw CustomException('Invalid request! Cannot delete other user gigs!', 403);
            }
            throw CustomException('Gig not found!', 404);
        }
        return response.send({
            error: false,
            message: 'Gig had been successfully deleted!'
        });
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

const getGig = async (request, response) => {
    try {
        // SECURITY: Validate ObjectId parameter
        const { error } = objectIdParamSchema.validate(request.params);
        if (error) {
            return response.status(400).send({
                error: true,
                message: 'Invalid gig ID format'
            });
        }

        // SECURITY: Sanitize ObjectId to prevent NoSQL injection
        const gigId = sanitizeObjectId(request.params._id);
        if (!gigId) {
            return response.status(400).send({
                error: true,
                message: 'Invalid gig ID format'
            });
        }

        const gig = await Gig.findOne({ _id: gigId }).populate('userID', 'username country image createdAt email description');

        if (!gig) {
            throw CustomException('Gig not found!', 404);
        }

        return response.send(gig);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

const getGigs = async (request, response) => {
    try {
        // SECURITY: Validate query parameters
        const { error, value } = getGigsQuerySchema.validate(request.query, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));
            return response.status(400).send({
                error: true,
                message: 'Validation error',
                errors
            });
        }

        const { category, search, max, min, userID, sort } = value;

        // SECURITY: Sanitize userID if provided to prevent NoSQL injection
        let sanitizedUserID = null;
        if (userID) {
            sanitizedUserID = sanitizeObjectId(userID);
            if (!sanitizedUserID) {
                return response.status(400).send({
                    error: true,
                    message: 'Invalid user ID format'
                });
            }
        }

        const filters = {
            ...(sanitizedUserID && { userID: sanitizedUserID }),
            ...(category && { category: { $regex: category, $options: 'i' } }),
            ...(search && { title: { $regex: search, $options: 'i' } }),
            ...((min || max) && {
                price: {
                    ...(max && { $lte: max }),
                    ...(min && { $gte: min }),
                },
            })
        }

        const gigs = await Gig.find(filters).sort({ [sort]: -1 }).populate('userID', 'username cover email description isSeller _id image');
        return response.send(gigs);
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

module.exports = {
    createGig,
    deleteGig,
    getGig,
    getGigs
}