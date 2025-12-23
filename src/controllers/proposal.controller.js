const { Proposal, Job, Order, User } = require('../models');
const { CustomException } = require('../utils');
const { createNotification } = require('./notification.controller'); // ✅ ADDED
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Create proposal
exports.createProposal = async (req, res, next) => {
    try {
        // SECURITY: Input validation - sanitize jobId
        const jobId = sanitizeObjectId(req.body.jobId);
        if (!jobId) {
            throw CustomException('Invalid job ID format', 400);
        }

        const job = await Job.findById(jobId).populate('userID', 'username');

        if (!job) {
            throw CustomException('Job not found', 404);
        }

        if (job.status !== 'open') {
            throw CustomException('Job is not accepting proposals', 400);
        }

        if (job.userID._id.toString() === req.userID) {
            throw CustomException('Cannot submit proposal to your own job', 400);
        }

        // Check if already submitted
        const existing = await Proposal.findOne({
            jobId: jobId,
            lawyerId: req.userID
        });

        if (existing) {
            throw CustomException('Already submitted proposal for this job', 400);
        }

        // SECURITY: Mass assignment protection - only allow specific fields
        const allowedFields = ['jobId', 'coverLetter', 'bidAmount', 'deliveryDays', 'additionalNotes'];
        const safeData = pickAllowedFields(req.body, allowedFields);

        const proposal = await Proposal.create({
            ...safeData,
            jobId: jobId,
            lawyerId: req.userID
        });

        // Increment proposals count
        await Job.findByIdAndUpdate(jobId, {
            $inc: { proposalsCount: 1 }
        });

        // ✅ ADDED: Create notification for job poster
        const lawyer = await User.findById(req.userID).select('username');
        await createNotification({
            userId: job.userID._id,
            type: 'proposal',
            title: 'عرض محاماة جديد',
            message: `وصلك عرض جديد من ${lawyer.username} على "${job.title}"`,
            link: `/jobs/${job._id}`,
            data: {
                proposalId: proposal._id,
                jobId: job._id,
                lawyerId: req.userID
            },
            icon: '📄',
            priority: 'high'
        });

        res.status(201).json(proposal);
    } catch (error) {
        next(error);
    }
};

// Get proposals for a job
exports.getJobProposals = async (req, res, next) => {
    try {
        // SECURITY: Input validation - sanitize jobId
        const jobId = sanitizeObjectId(req.params.jobId);
        if (!jobId) {
            throw CustomException('Invalid job ID format', 400);
        }

        const job = await Job.findById(jobId);

        if (!job) {
            throw CustomException('Job not found', 404);
        }

        // SECURITY: IDOR protection - verify user owns the job
        if (job.userID.toString() !== req.userID) {
            throw CustomException('Not authorized', 403);
        }

        const proposals = await Proposal.find({ jobId: jobId })
            .populate('lawyerId', 'username image email phone description lawyerProfile')
            .sort({ createdAt: -1 });

        res.status(200).json(proposals);
    } catch (error) {
        next(error);
    }
};

// Get my proposals (as lawyer)
exports.getMyProposals = async (req, res, next) => {
    try {
        const proposals = await Proposal.find({ lawyerId: req.userID })
            .populate('jobId')
            .sort({ createdAt: -1 });

        res.status(200).json(proposals);
    } catch (error) {
        next(error);
    }
};

// Accept proposal (UPDATED - redirect to payment)
exports.acceptProposal = async (req, res, next) => {
    try {
        // SECURITY: Input validation - sanitize proposal ID
        const proposalId = sanitizeObjectId(req.params._id);
        if (!proposalId) {
            throw CustomException('Invalid proposal ID format', 400);
        }

        const proposal = await Proposal.findById(proposalId).populate('lawyerId', 'username');

        if (!proposal) {
            throw CustomException('Proposal not found', 404);
        }

        const job = await Job.findById(proposal.jobId);

        if (!job) {
            throw CustomException('Job not found', 404);
        }

        // SECURITY: IDOR protection - verify user owns the job
        if (job.userID.toString() !== req.userID) {
            throw CustomException('Not authorized', 403);
        }

        // Update proposal status
        proposal.status = 'accepted';
        await proposal.save();

        // Update job
        job.status = 'in-progress';
        job.acceptedProposal = proposal._id;
        await job.save();

        // Reject other proposals
        await Proposal.updateMany(
            { jobId: job._id, _id: { $ne: proposal._id } },
            { status: 'rejected' }
        );

        // ✅ ADDED: Create notification for lawyer
        await createNotification({
            userId: proposal.lawyerId._id,
            type: 'proposal_accepted',
            title: 'تم قبول عرضك',
            message: `تم قبول عرضك على "${job.title}"`,
            link: '/my-proposals',
            data: {
                proposalId: proposal._id,
                jobId: job._id
            },
            icon: '✅',
            priority: 'high'
        });

        // ✅ DON'T create order yet - client needs to pay first
        // Return proposal ID so frontend can redirect to payment
        res.status(200).json({ 
            message: 'Proposal accepted. Please proceed to payment.',
            proposal,
            requiresPayment: true,
            proposalId: proposal._id
        });
    } catch (error) {
        next(error);
    }
};

// Reject proposal
exports.rejectProposal = async (req, res, next) => {
    try {
        // SECURITY: Input validation - sanitize proposal ID
        const proposalId = sanitizeObjectId(req.params._id);
        if (!proposalId) {
            throw CustomException('Invalid proposal ID format', 400);
        }

        const proposal = await Proposal.findById(proposalId).populate('lawyerId', 'username');

        if (!proposal) {
            throw CustomException('Proposal not found', 404);
        }

        const job = await Job.findById(proposal.jobId);

        if (!job) {
            throw CustomException('Job not found', 404);
        }

        // SECURITY: IDOR protection - verify user owns the job
        if (job.userID.toString() !== req.userID) {
            throw CustomException('Not authorized', 403);
        }

        proposal.status = 'rejected';
        await proposal.save();

        // ✅ ADDED: Notify lawyer (optional - less critical)
        await createNotification({
            userId: proposal.lawyerId._id,
            type: 'proposal',
            title: 'تحديث على عرضك',
            message: `تم رفض عرضك على "${job.title}"`,
            link: '/my-proposals',
            data: {
                proposalId: proposal._id,
                jobId: job._id
            },
            icon: '❌',
            priority: 'medium'
        });

        res.status(200).json({ message: 'Proposal rejected' });
    } catch (error) {
        next(error);
    }
};

// Withdraw proposal
exports.withdrawProposal = async (req, res, next) => {
    try {
        // SECURITY: Input validation - sanitize proposal ID
        const proposalId = sanitizeObjectId(req.params._id);
        if (!proposalId) {
            throw CustomException('Invalid proposal ID format', 400);
        }

        const proposal = await Proposal.findById(proposalId);

        if (!proposal) {
            throw CustomException('Proposal not found', 404);
        }

        // SECURITY: IDOR protection - verify user is the lawyer who submitted the proposal
        if (proposal.lawyerId.toString() !== req.userID) {
            throw CustomException('Not authorized', 403);
        }

        if (proposal.status !== 'pending') {
            throw CustomException('Cannot withdraw this proposal', 400);
        }

        proposal.status = 'withdrawn';
        await proposal.save();

        // Decrement proposals count
        await Job.findByIdAndUpdate(proposal.jobId, {
            $inc: { proposalsCount: -1 }
        });

        res.status(200).json({ message: 'Proposal withdrawn' });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;
