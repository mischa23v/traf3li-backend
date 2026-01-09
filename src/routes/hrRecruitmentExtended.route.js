/**
 * HR Recruitment Extended Routes
 *
 * Extended routes for recruitment at /api/hr/recruitment
 *
 * Security:
 * - Multi-tenant isolation via req.firmQuery
 * - Mass assignment protection via pickAllowedFields
 * - ID sanitization via sanitizeObjectId
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Firm = require('../models/firm.model');
const { CustomException } = require('../utils');
const { pickAllowedFields, sanitizeObjectId, sanitizePagination } = require('../utils/securityUtils');

const ALLOWED_STATUS_FIELDS = ['status', 'notes', 'nextStep'];
const ALLOWED_OFFER_FIELDS = [
    'position', 'salary', 'startDate', 'benefits', 'conditions',
    'expiryDate', 'currency', 'notes'
];

/**
 * POST /api/hr/recruitment/jobs/:jobId/close
 * Close a job posting
 */
router.post('/jobs/:jobId/close', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.jobId);
        if (!sanitizedId) {
            throw CustomException('Invalid job ID format', 400);
        }

        const { reason } = req.body;

        const result = await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.jobs._id': sanitizedId
            },
            {
                $set: {
                    'recruitment.jobs.$.status': 'closed',
                    'recruitment.jobs.$.closedAt': new Date(),
                    'recruitment.jobs.$.closedBy': req.userID,
                    'recruitment.jobs.$.closeReason': reason
                }
            },
            { new: true }
        );

        if (!result) {
            throw CustomException('Job not found', 404);
        }

        return res.json({
            success: true,
            message: 'Job closed successfully'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/jobs/:jobId/hold
 * Put job on hold
 */
router.post('/jobs/:jobId/hold', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.jobId);
        if (!sanitizedId) {
            throw CustomException('Invalid job ID format', 400);
        }

        const { reason } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.jobs._id': sanitizedId
            },
            {
                $set: {
                    'recruitment.jobs.$.status': 'on_hold',
                    'recruitment.jobs.$.heldAt': new Date(),
                    'recruitment.jobs.$.heldBy': req.userID,
                    'recruitment.jobs.$.holdReason': reason
                }
            }
        );

        return res.json({
            success: true,
            message: 'Job put on hold'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/jobs/:jobId/duplicate
 * Duplicate a job posting
 */
router.post('/jobs/:jobId/duplicate', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.jobId);
        if (!sanitizedId) {
            throw CustomException('Invalid job ID format', 400);
        }

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('recruitment.jobs');

        const sourceJob = (firm?.recruitment?.jobs || [])
            .find(j => j._id.toString() === sanitizedId);

        if (!sourceJob) {
            throw CustomException('Job not found', 404);
        }

        const newJobId = new mongoose.Types.ObjectId();
        const jobData = {
            ...sourceJob.toObject(),
            _id: newJobId,
            title: `${sourceJob.title} (Copy)`,
            status: 'draft',
            applicantCount: 0,
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            { _id: req.firmId },
            { $push: { 'recruitment.jobs': jobData } }
        );

        return res.status(201).json({
            success: true,
            message: 'Job duplicated',
            data: jobData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/recruitment/jobs/:jobId/applicants
 * Get applicants for a job
 */
router.get('/jobs/:jobId/applicants', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.jobId);
        if (!sanitizedId) {
            throw CustomException('Invalid job ID format', 400);
        }

        const { status, stage } = req.query;
        const { page, limit, skip } = sanitizePagination(req.query, { maxLimit: 100 });

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('recruitment.applicants');

        let applicants = (firm?.recruitment?.applicants || [])
            .filter(a => a.jobId?.toString() === sanitizedId);

        if (status) {
            applicants = applicants.filter(a => a.status === status);
        }

        if (stage) {
            applicants = applicants.filter(a => a.stage === stage);
        }

        applicants.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

        const total = applicants.length;
        const paginatedApplicants = applicants.slice(skip, skip + limit);

        return res.json({
            success: true,
            count: paginatedApplicants.length,
            data: paginatedApplicants,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/:applicantId/status
 * Update applicant status
 */
router.post('/applicants/:applicantId/status', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.applicantId);
        if (!sanitizedId) {
            throw CustomException('Invalid applicant ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_STATUS_FIELDS);

        if (!allowedFields.status) {
            throw CustomException('Status is required', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': sanitizedId
            },
            {
                $set: {
                    'recruitment.applicants.$.status': allowedFields.status,
                    'recruitment.applicants.$.notes': allowedFields.notes,
                    'recruitment.applicants.$.statusUpdatedAt': new Date(),
                    'recruitment.applicants.$.statusUpdatedBy': req.userID
                },
                $push: {
                    'recruitment.applicants.$.statusHistory': {
                        status: allowedFields.status,
                        notes: allowedFields.notes,
                        changedAt: new Date(),
                        changedBy: req.userID
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: 'Applicant status updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/:applicantId/screen
 * Screen an applicant
 */
router.post('/applicants/:applicantId/screen', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.applicantId);
        if (!sanitizedId) {
            throw CustomException('Invalid applicant ID format', 400);
        }

        const { passed, notes, criteria } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': sanitizedId
            },
            {
                $set: {
                    'recruitment.applicants.$.stage': passed ? 'screened' : 'rejected',
                    'recruitment.applicants.$.screeningResult': {
                        passed,
                        notes,
                        criteria,
                        screenedAt: new Date(),
                        screenedBy: req.userID
                    }
                }
            }
        );

        return res.json({
            success: true,
            message: `Applicant ${passed ? 'passed' : 'failed'} screening`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/:applicantId/interviews/:interviewId/complete
 * Complete an interview
 */
router.post('/applicants/:applicantId/interviews/:interviewId/complete', async (req, res) => {
    try {
        const applicantId = sanitizeObjectId(req.params.applicantId);
        const interviewId = sanitizeObjectId(req.params.interviewId);

        if (!applicantId || !interviewId) {
            throw CustomException('Invalid ID format', 400);
        }

        const { rating, feedback, recommendation, notes } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': applicantId,
                'recruitment.applicants.interviews._id': interviewId
            },
            {
                $set: {
                    'recruitment.applicants.$[applicant].interviews.$[interview].status': 'completed',
                    'recruitment.applicants.$[applicant].interviews.$[interview].rating': rating,
                    'recruitment.applicants.$[applicant].interviews.$[interview].feedback': feedback,
                    'recruitment.applicants.$[applicant].interviews.$[interview].recommendation': recommendation,
                    'recruitment.applicants.$[applicant].interviews.$[interview].completedAt': new Date(),
                    'recruitment.applicants.$[applicant].interviews.$[interview].completedBy': req.userID
                }
            },
            {
                arrayFilters: [
                    { 'applicant._id': applicantId },
                    { 'interview._id': interviewId }
                ]
            }
        );

        return res.json({
            success: true,
            message: 'Interview completed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/:applicantId/assessments/:assessmentId/complete
 * Complete an assessment
 */
router.post('/applicants/:applicantId/assessments/:assessmentId/complete', async (req, res) => {
    try {
        const applicantId = sanitizeObjectId(req.params.applicantId);
        const assessmentId = sanitizeObjectId(req.params.assessmentId);

        if (!applicantId || !assessmentId) {
            throw CustomException('Invalid ID format', 400);
        }

        const { score, maxScore, passed, notes } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': applicantId,
                'recruitment.applicants.assessments._id': assessmentId
            },
            {
                $set: {
                    'recruitment.applicants.$[applicant].assessments.$[assessment].status': 'completed',
                    'recruitment.applicants.$[applicant].assessments.$[assessment].score': score,
                    'recruitment.applicants.$[applicant].assessments.$[assessment].maxScore': maxScore,
                    'recruitment.applicants.$[applicant].assessments.$[assessment].passed': passed,
                    'recruitment.applicants.$[applicant].assessments.$[assessment].notes': notes,
                    'recruitment.applicants.$[applicant].assessments.$[assessment].completedAt': new Date()
                }
            },
            {
                arrayFilters: [
                    { 'applicant._id': applicantId },
                    { 'assessment._id': assessmentId }
                ]
            }
        );

        return res.json({
            success: true,
            message: 'Assessment completed'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/:applicantId/offer
 * Create job offer
 */
router.post('/applicants/:applicantId/offer', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.applicantId);
        if (!sanitizedId) {
            throw CustomException('Invalid applicant ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_OFFER_FIELDS);

        if (!allowedFields.salary || !allowedFields.startDate) {
            throw CustomException('Salary and start date are required', 400);
        }

        const offerId = new mongoose.Types.ObjectId();
        const offer = {
            _id: offerId,
            ...allowedFields,
            status: 'pending',
            createdAt: new Date(),
            createdBy: req.userID
        };

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': sanitizedId
            },
            {
                $set: {
                    'recruitment.applicants.$.stage': 'offer',
                    'recruitment.applicants.$.offer': offer
                }
            }
        );

        return res.status(201).json({
            success: true,
            message: 'Offer created',
            data: offer
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * PATCH /api/hr/recruitment/applicants/:applicantId/offer
 * Update job offer
 */
router.patch('/applicants/:applicantId/offer', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.applicantId);
        if (!sanitizedId) {
            throw CustomException('Invalid applicant ID format', 400);
        }

        const allowedFields = pickAllowedFields(req.body, ALLOWED_OFFER_FIELDS);

        const updates = Object.keys(allowedFields).reduce((acc, key) => {
            acc[`recruitment.applicants.$.offer.${key}`] = allowedFields[key];
            return acc;
        }, {
            'recruitment.applicants.$.offer.updatedAt': new Date(),
            'recruitment.applicants.$.offer.updatedBy': req.userID
        });

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': sanitizedId
            },
            { $set: updates }
        );

        return res.json({
            success: true,
            message: 'Offer updated'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/:applicantId/offer/accept
 * Accept job offer
 */
router.post('/applicants/:applicantId/offer/accept', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.applicantId);
        if (!sanitizedId) {
            throw CustomException('Invalid applicant ID format', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': sanitizedId
            },
            {
                $set: {
                    'recruitment.applicants.$.stage': 'hired',
                    'recruitment.applicants.$.offer.status': 'accepted',
                    'recruitment.applicants.$.offer.acceptedAt': new Date()
                }
            }
        );

        return res.json({
            success: true,
            message: 'Offer accepted'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/:applicantId/offer/reject
 * Reject job offer
 */
router.post('/applicants/:applicantId/offer/reject', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.applicantId);
        if (!sanitizedId) {
            throw CustomException('Invalid applicant ID format', 400);
        }

        const { reason } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': sanitizedId
            },
            {
                $set: {
                    'recruitment.applicants.$.offer.status': 'rejected',
                    'recruitment.applicants.$.offer.rejectedAt': new Date(),
                    'recruitment.applicants.$.offer.rejectionReason': reason
                }
            }
        );

        return res.json({
            success: true,
            message: 'Offer rejected'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/:applicantId/flag
 * Flag an applicant
 */
router.post('/applicants/:applicantId/flag', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.applicantId);
        if (!sanitizedId) {
            throw CustomException('Invalid applicant ID format', 400);
        }

        const { reason, priority } = req.body;

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': sanitizedId
            },
            {
                $set: {
                    'recruitment.applicants.$.flagged': true,
                    'recruitment.applicants.$.flagReason': reason,
                    'recruitment.applicants.$.flagPriority': priority || 'normal',
                    'recruitment.applicants.$.flaggedAt': new Date(),
                    'recruitment.applicants.$.flaggedBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Applicant flagged'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/:applicantId/unflag
 * Unflag an applicant
 */
router.post('/applicants/:applicantId/unflag', async (req, res) => {
    try {
        const sanitizedId = sanitizeObjectId(req.params.applicantId);
        if (!sanitizedId) {
            throw CustomException('Invalid applicant ID format', 400);
        }

        await Firm.findOneAndUpdate(
            {
                _id: req.firmId,
                'recruitment.applicants._id': sanitizedId
            },
            {
                $set: {
                    'recruitment.applicants.$.flagged': false,
                    'recruitment.applicants.$.unflaggedAt': new Date(),
                    'recruitment.applicants.$.unflaggedBy': req.userID
                }
            }
        );

        return res.json({
            success: true,
            message: 'Applicant unflagged'
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/applicants/bulk-update
 * Bulk update applicants
 */
router.post('/applicants/bulk-update', async (req, res) => {
    try {
        const { applicantIds, updates } = req.body;

        if (!Array.isArray(applicantIds) || applicantIds.length === 0) {
            throw CustomException('Array of applicant IDs is required', 400);
        }

        if (applicantIds.length > 50) {
            throw CustomException('Maximum 50 applicants per bulk update', 400);
        }

        const sanitizedIds = applicantIds.map(id => sanitizeObjectId(id)).filter(Boolean);
        const allowedUpdates = pickAllowedFields(updates, ['status', 'stage', 'notes']);

        let updatedCount = 0;

        for (const applicantId of sanitizedIds) {
            const result = await Firm.findOneAndUpdate(
                {
                    _id: req.firmId,
                    'recruitment.applicants._id': applicantId
                },
                {
                    $set: Object.keys(allowedUpdates).reduce((acc, key) => {
                        acc[`recruitment.applicants.$.${key}`] = allowedUpdates[key];
                        return acc;
                    }, {
                        'recruitment.applicants.$.updatedAt': new Date(),
                        'recruitment.applicants.$.updatedBy': req.userID
                    })
                }
            );
            if (result) updatedCount++;
        }

        return res.json({
            success: true,
            message: `Updated ${updatedCount} applicants`
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * POST /api/hr/recruitment/parse-resume
 * Parse resume file
 */
router.post('/parse-resume', async (req, res) => {
    try {
        const { fileUrl, fileName } = req.body;

        if (!fileUrl) {
            throw CustomException('File URL is required', 400);
        }

        // In production, integrate with resume parsing service
        // Return mock parsed data for now
        const parsedData = {
            name: null,
            email: null,
            phone: null,
            skills: [],
            experience: [],
            education: [],
            parseConfidence: 0,
            rawText: ''
        };

        return res.json({
            success: true,
            message: 'Resume parsing initiated',
            data: parsedData
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

/**
 * GET /api/hr/recruitment/applicants/export
 * Export applicants
 */
router.get('/applicants/export', async (req, res) => {
    try {
        const { jobId, status, format } = req.query;

        const firm = await Firm.findOne({ _id: req.firmId })
            .select('recruitment.applicants name');

        let applicants = firm?.recruitment?.applicants || [];

        if (jobId) {
            const sanitizedJobId = sanitizeObjectId(jobId);
            if (sanitizedJobId) {
                applicants = applicants.filter(a =>
                    a.jobId?.toString() === sanitizedJobId
                );
            }
        }

        if (status) {
            applicants = applicants.filter(a => a.status === status);
        }

        const exportId = new mongoose.Types.ObjectId();

        return res.json({
            success: true,
            message: 'Export initiated',
            data: {
                exportId: exportId.toString(),
                format: format || 'xlsx',
                recordCount: applicants.length,
                firmName: firm?.name
            }
        });
    } catch ({ message, status = 500 }) {
        return res.status(status).json({ success: false, message });
    }
});

module.exports = router;
