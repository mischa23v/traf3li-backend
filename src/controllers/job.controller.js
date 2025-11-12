const Job = require('../models/job.model');
const Proposal = require('../models/proposal.model');
const { CustomException } = require('../utils');

// Create job
exports.createJob = async (req, res, next) => {
    try {
        const job = await Job.create({
            ...req.body,
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
        
        const filter = { status: status || 'open' };
        
        if (category) filter.category = category;
        if (minBudget || maxBudget) {
            filter['budget.min'] = { $gte: minBudget || 0 };
            filter['budget.max'] = { $lte: maxBudget || 999999 };
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
        const job = await Job.findByIdAndUpdate(
            req.params._id,
            { $inc: { views: 1 } },
            { new: true }
        ).populate('userID', 'username image email phone country createdAt');  // ✅ CHANGED from clientId to userID

        if (!job) {
            throw new CustomException('Job not found', 404);
        }

        res.status(200).json(job);
    } catch (error) {
        next(error);
    }
};

// Update job
exports.updateJob = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params._id);

        if (!job) {
            throw new CustomException('Job not found', 404);
        }

        if (job.userID.toString() !== req.userID) {  // ✅ CHANGED from clientId to userID
            throw new CustomException('Not authorized', 403);
        }

        Object.assign(job, req.body);
        await job.save();

        res.status(200).json(job);
    } catch (error) {
        next(error);
    }
};

// Delete job
exports.deleteJob = async (req, res, next) => {
    try {
        const job = await Job.findById(req.params._id);

        if (!job) {
            throw new CustomException('Job not found', 404);
        }

        if (job.userID.toString() !== req.userID) {  // ✅ CHANGED from clientId to userID
            throw new CustomException('Not authorized', 403);
        }

        await Job.findByIdAndDelete(req.params._id);
        await Proposal.deleteMany({ jobId: req.params._id });

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
