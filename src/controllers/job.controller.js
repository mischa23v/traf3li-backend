const Job = require('../models/job.model');
const Proposal = require('../models/proposal.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const Joi = require('joi');

// Validation schemas
const createJobSchema = Joi.object({
    title: Joi.string().trim().min(10).max(200).required()
        .messages({
            'string.min': 'Title must be at least 10 characters',
            'string.max': 'Title cannot exceed 200 characters',
            'any.required': 'Title is required'
        }),
    description: Joi.string().trim().min(50).max(5000).required()
        .messages({
            'string.min': 'Description must be at least 50 characters',
            'string.max': 'Description cannot exceed 5000 characters',
            'any.required': 'Description is required'
        }),
    category: Joi.string().valid('labor', 'commercial', 'personal-status', 'criminal', 'real-estate', 'traffic', 'administrative', 'other').required()
        .messages({
            'any.only': 'Invalid category',
            'any.required': 'Category is required'
        }),
    budget: Joi.object({
        min: Joi.number().min(0).max(1000000).required()
            .messages({
                'number.min': 'Minimum budget must be at least 0',
                'number.max': 'Minimum budget cannot exceed 1,000,000',
                'any.required': 'Minimum budget is required'
            }),
        max: Joi.number().min(Joi.ref('min')).max(1000000).required()
            .messages({
                'number.min': 'Maximum budget must be greater than or equal to minimum budget',
                'number.max': 'Maximum budget cannot exceed 1,000,000',
                'any.required': 'Maximum budget is required'
            })
    }).required().messages({
        'any.required': 'Budget is required'
    }),
    deadline: Joi.date().min('now').optional()
        .messages({
            'date.min': 'Deadline must be in the future'
        }),
    location: Joi.string().trim().max(200).optional(),
    requirements: Joi.array().items(Joi.string().trim().max(500)).max(20).optional(),
    attachments: Joi.array().items(
        Joi.object({
            name: Joi.string().max(255).required(),
            url: Joi.string().uri().required(),
            uploadedAt: Joi.date().optional()
        })
    ).max(10).optional()
});

const updateJobSchema = Joi.object({
    title: Joi.string().trim().min(10).max(200).optional(),
    description: Joi.string().trim().min(50).max(5000).optional(),
    category: Joi.string().valid('labor', 'commercial', 'personal-status', 'criminal', 'real-estate', 'traffic', 'administrative', 'other').optional(),
    budget: Joi.object({
        min: Joi.number().min(0).max(1000000).optional(),
        max: Joi.number().min(Joi.ref('min')).max(1000000).optional()
    }).optional(),
    deadline: Joi.date().min('now').optional(),
    location: Joi.string().trim().max(200).optional(),
    requirements: Joi.array().items(Joi.string().trim().max(500)).max(20).optional(),
    attachments: Joi.array().items(
        Joi.object({
            name: Joi.string().max(255).required(),
            url: Joi.string().uri().required(),
            uploadedAt: Joi.date().optional()
        })
    ).max(10).optional(),
    status: Joi.string().valid('open', 'in-progress', 'completed', 'cancelled').optional()
}).min(1);

// Allowed fields for mass assignment protection
const ALLOWED_JOB_FIELDS = [
    'title',
    'description',
    'category',
    'budget',
    'deadline',
    'location',
    'requirements',
    'attachments'
];

const ALLOWED_UPDATE_FIELDS = [
    ...ALLOWED_JOB_FIELDS,
    'status'
];

// Create job
exports.createJob = async (req, res, next) => {
    try {
        // Validate input
        const { error, value } = createJobSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            throw CustomException(errorMessage, 400);
        }

        // Mass assignment protection - only allow specific fields
        const safeJobData = pickAllowedFields(value, ALLOWED_JOB_FIELDS);

        // Additional budget validation
        if (safeJobData.budget) {
            if (safeJobData.budget.min < 0) {
                throw CustomException('Minimum budget cannot be negative', 400);
            }
            if (safeJobData.budget.max > 1000000) {
                throw CustomException('Maximum budget cannot exceed 1,000,000', 400);
            }
            if (safeJobData.budget.min > safeJobData.budget.max) {
                throw CustomException('Minimum budget cannot be greater than maximum budget', 400);
            }
        }

        const job = await Job.create({
            ...safeJobData,
            userID: req.userID  // ✅ CHANGED from clientId to userID
        });
        res.status(201).json(job);
    } catch (error) {
        next(error);
    }
};

// Get all jobs
exports.getJobs = async (req, res, next) => {
    try {
        const { category, status, minBudget, maxBudget } = req.query;

        // Validate query parameters
        const validCategories = ['labor', 'commercial', 'personal-status', 'criminal', 'real-estate', 'traffic', 'administrative', 'other'];
        const validStatuses = ['open', 'in-progress', 'completed', 'cancelled'];

        const filter = { status: validStatuses.includes(status) ? status : 'open' };

        if (category && validCategories.includes(category)) {
            filter.category = category;
        }

        if (minBudget || maxBudget) {
            const min = parseFloat(minBudget);
            const max = parseFloat(maxBudget);

            // Validate budget parameters
            if (minBudget && (isNaN(min) || min < 0)) {
                throw CustomException('Invalid minimum budget', 400);
            }
            if (maxBudget && (isNaN(max) || max < 0 || max > 1000000)) {
                throw CustomException('Invalid maximum budget', 400);
            }

            if (minBudget) filter['budget.min'] = { $gte: min };
            if (maxBudget) filter['budget.max'] = { $lte: max };
        }

        const jobs = await Job.find(filter)
            .populate('userID', 'username image country')  // ✅ CHANGED from clientId to userID
            .sort({ createdAt: -1 });

        res.status(200).json(jobs);
    } catch (error) {
        next(error);
    }
};

// Get single job
exports.getJob = async (req, res, next) => {
    try {
        // Sanitize ObjectId
        const jobId = sanitizeObjectId(req.params._id);
        if (!jobId) {
            throw CustomException('Invalid job ID', 400);
        }

        const job = await Job.findByIdAndUpdate(
            jobId,
            { $inc: { views: 1 } },
            { new: true }
        ).populate('userID', 'username image email phone country createdAt');  // ✅ CHANGED from clientId to userID

        if (!job) {
            throw CustomException('Job not found', 404);
        }

        res.status(200).json(job);
    } catch (error) {
        next(error);
    }
};

// Update job
exports.updateJob = async (req, res, next) => {
    try {
        // Sanitize ObjectId
        const jobId = sanitizeObjectId(req.params._id);
        if (!jobId) {
            throw CustomException('Invalid job ID', 400);
        }

        // Validate input
        const { error, value } = updateJobSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            throw CustomException(errorMessage, 400);
        }

        const job = await Job.findById(jobId);

        if (!job) {
            throw CustomException('Job not found', 404);
        }

        // IDOR protection - verify ownership
        if (job.userID.toString() !== req.userID) {  // ✅ CHANGED from clientId to userID
            throw CustomException('Not authorized to update this job', 403);
        }

        // Mass assignment protection - only allow specific fields
        const safeUpdateData = pickAllowedFields(value, ALLOWED_UPDATE_FIELDS);

        // Additional budget validation if budget is being updated
        if (safeUpdateData.budget) {
            const budgetMin = safeUpdateData.budget.min ?? job.budget?.min ?? 0;
            const budgetMax = safeUpdateData.budget.max ?? job.budget?.max ?? 0;

            if (budgetMin < 0) {
                throw CustomException('Minimum budget cannot be negative', 400);
            }
            if (budgetMax > 1000000) {
                throw CustomException('Maximum budget cannot exceed 1,000,000', 400);
            }
            if (budgetMin > budgetMax) {
                throw CustomException('Minimum budget cannot be greater than maximum budget', 400);
            }
        }

        Object.assign(job, safeUpdateData);
        await job.save();

        res.status(200).json(job);
    } catch (error) {
        next(error);
    }
};

// Delete job
exports.deleteJob = async (req, res, next) => {
    try {
        // Sanitize ObjectId
        const jobId = sanitizeObjectId(req.params._id);
        if (!jobId) {
            throw CustomException('Invalid job ID', 400);
        }

        const job = await Job.findById(jobId);

        if (!job) {
            throw CustomException('Job not found', 404);
        }

        // IDOR protection - verify ownership
        if (job.userID.toString() !== req.userID) {  // ✅ CHANGED from clientId to userID
            throw CustomException('Not authorized to delete this job', 403);
        }

        await Job.findByIdAndDelete(jobId);
        await Proposal.deleteMany({ jobId: jobId });

        res.status(200).json({ message: 'Job deleted successfully' });
    } catch (error) {
        next(error);
    }
};

// Get my jobs (as client)
exports.getMyJobs = async (req, res, next) => {
    try {
        const jobs = await Job.find({ userID: req.userID })  // ✅ CHANGED from clientId to userID
            .sort({ createdAt: -1 });

        res.status(200).json(jobs);
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
