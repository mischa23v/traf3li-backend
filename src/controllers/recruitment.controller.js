const { JobPosting, Applicant } = require('../models');
const mongoose = require('mongoose');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

/**
 * Recruitment Controller
 * MODULE 7: التوظيف ونظام تتبع المتقدمين (Recruitment & ATS)
 * Handles Job Postings and Applicant Management
 */

// ═══════════════════════════════════════════════════════════════
// JOB POSTING ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get all job postings
 * GET /api/hr/recruitment/jobs
 */
exports.getJobPostings = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const {
            status,
            departmentId,
            category,
            employmentType,
            positionLevel,
            priority,
            search,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const query = {};
        if (isSoloLawyer || !firmId) {
            query.lawyerId = lawyerId;
        } else {
            query.firmId = firmId;
        }

        // Apply filters
        if (status) query.status = status;
        if (departmentId) query.departmentId = departmentId;
        if (category) query.category = category;
        if (employmentType) query.employmentType = employmentType;
        if (positionLevel) query.positionLevel = positionLevel;
        if (priority) query.priority = priority;

        // Text search
        if (search) {
            query.$text = { $search: search };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const [jobs, total] = await Promise.all([
            JobPosting.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('departmentId', 'name nameAr')
                .populate('recruitmentTeam.hiringManager.userId', 'name email')
                .populate('recruitmentTeam.recruiter.userId', 'name email'),
            JobPosting.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: jobs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error fetching job postings:', error);
        res.status(500).json({ success: false, message: 'Error fetching job postings', error: error.message });
    }
};

/**
 * Get single job posting
 * GET /api/hr/recruitment/jobs/:id
 */
exports.getJobPostingById = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { id } = req.params;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const job = await JobPosting.findOne({ _id: sanitizeObjectId(id), ...baseQuery })
            .populate('departmentId', 'name nameAr')
            .populate('recruitmentTeam.hiringManager.userId', 'name email')
            .populate('recruitmentTeam.recruiter.userId', 'name email')
            .populate('recruitmentTeam.hrContact.userId', 'name email');

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job posting not found' });
        }

        res.json({ success: true, data: job });
    } catch (error) {
        logger.error('Error fetching job posting:', error);
        res.status(500).json({ success: false, message: 'Error fetching job posting', error: error.message });
    }
};

/**
 * Create job posting
 * POST /api/hr/recruitment/jobs
 */
exports.createJobPosting = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;

        // Mass assignment protection
        const allowedFields = [
            'title', 'titleAr', 'description', 'descriptionAr', 'requirements', 'requirementsAr',
            'responsibilities', 'responsibilitiesAr', 'qualifications', 'qualificationsAr',
            'benefits', 'benefitsAr', 'departmentId', 'category', 'employmentType', 'positionLevel',
            'openings', 'location', 'locationAr', 'salaryRange', 'priority', 'urgency',
            'applicationDeadline', 'expectedStartDate', 'workSchedule', 'remotePolicy',
            'requiredSkills', 'preferredSkills', 'requiredCertifications', 'requiredLanguages',
            'educationRequirements', 'experienceRequirements', 'recruitmentTeam', 'approvers',
            'status', 'approvalStatus', 'isPublic', 'isFeatured', 'tags', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        const jobData = {
            ...sanitizedData,
            firmId, // From middleware (null for solo lawyers)
            lawyerId, // From middleware
            createdBy: userId,
            updatedBy: userId,
            statusHistory: [{
                status: sanitizedData.status || 'draft',
                changedBy: userId,
                changedByName: userName,
                reason: 'Job posting created'
            }]
        };

        const job = new JobPosting(jobData);
        await job.save();

        res.status(201).json({
            success: true,
            message: 'Job posting created successfully',
            data: job
        });
    } catch (error) {
        logger.error('Error creating job posting:', error);
        res.status(500).json({ success: false, message: 'Error creating job posting', error: error.message });
    }
};

/**
 * Update job posting
 * PATCH /api/hr/recruitment/jobs/:id
 */
exports.updateJobPosting = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'title', 'titleAr', 'description', 'descriptionAr', 'requirements', 'requirementsAr',
            'responsibilities', 'responsibilitiesAr', 'qualifications', 'qualificationsAr',
            'benefits', 'benefitsAr', 'departmentId', 'category', 'employmentType', 'positionLevel',
            'openings', 'location', 'locationAr', 'salaryRange', 'priority', 'urgency',
            'applicationDeadline', 'expectedStartDate', 'workSchedule', 'remotePolicy',
            'requiredSkills', 'preferredSkills', 'requiredCertifications', 'requiredLanguages',
            'educationRequirements', 'experienceRequirements', 'recruitmentTeam', 'approvers',
            'status', 'approvalStatus', 'isPublic', 'isFeatured', 'tags', 'customFields', 'filled', 'remaining'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const job = await JobPosting.findOneAndUpdate(
            { _id: sanitizeObjectId(id), ...baseQuery },
            { ...sanitizedData, updatedBy: userId, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job posting not found' });
        }

        res.json({
            success: true,
            message: 'Job posting updated successfully',
            data: job
        });
    } catch (error) {
        logger.error('Error updating job posting:', error);
        res.status(500).json({ success: false, message: 'Error updating job posting', error: error.message });
    }
};

/**
 * Delete job posting
 * DELETE /api/hr/recruitment/jobs/:id
 */
exports.deleteJobPosting = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { id } = req.params;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }

        // Check if there are any applicants
        const applicantCount = await Applicant.countDocuments({
            ...baseQuery,
            'applications.jobPostingId': sanitizeObjectId(id)
        });

        if (applicantCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete job posting with ${applicantCount} applicants. Consider closing it instead.`
            });
        }

        const job = await JobPosting.findOneAndDelete({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job posting not found' });
        }

        res.json({
            success: true,
            message: 'Job posting deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting job posting:', error);
        res.status(500).json({ success: false, message: 'Error deleting job posting', error: error.message });
    }
};

/**
 * Change job posting status
 * POST /api/hr/recruitment/jobs/:id/status
 */
exports.changeJobStatus = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;
        const { status, reason } = req.body;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const job = await JobPosting.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job posting not found' });
        }

        await job.changeStatus(status, userId, userName, reason);

        res.json({
            success: true,
            message: `Job status changed to ${status}`,
            data: job
        });
    } catch (error) {
        logger.error('Error changing job status:', error);
        res.status(500).json({ success: false, message: 'Error changing job status', error: error.message });
    }
};

/**
 * Publish job posting
 * POST /api/hr/recruitment/jobs/:id/publish
 */
exports.publishJob = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;
        const { channels } = req.body;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const job = await JobPosting.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job posting not found' });
        }

        // Add posting channels
        if (channels && channels.length > 0) {
            channels.forEach(channel => {
                job.postingChannels.push({
                    ...channel,
                    postedAt: new Date(),
                    isActive: true
                });
            });
        }

        await job.changeStatus('open', userId, userName, 'Job published');

        res.json({
            success: true,
            message: 'Job published successfully',
            data: job
        });
    } catch (error) {
        logger.error('Error publishing job:', error);
        res.status(500).json({ success: false, message: 'Error publishing job', error: error.message });
    }
};

/**
 * Clone job posting
 * POST /api/hr/recruitment/jobs/:id/clone
 */
exports.cloneJob = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const { id } = req.params;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const originalJob = await JobPosting.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!originalJob) {
            return res.status(404).json({ success: false, message: 'Job posting not found' });
        }

        const cloneData = originalJob.toObject();
        delete cloneData._id;
        delete cloneData.jobId;
        delete cloneData.createdAt;
        delete cloneData.updatedAt;
        delete cloneData.publishedAt;
        delete cloneData.closedAt;
        delete cloneData.filledAt;
        delete cloneData.statistics;
        delete cloneData.statusHistory;
        delete cloneData.approvalHistory;
        delete cloneData.postingChannels;

        cloneData.title = `${cloneData.title} (Copy)`;
        cloneData.status = 'draft';
        cloneData.approvalStatus = 'draft';
        cloneData.filled = 0;
        cloneData.remaining = cloneData.openings;
        cloneData.createdBy = userId;
        cloneData.updatedBy = userId;

        const newJob = new JobPosting(cloneData);
        await newJob.save();

        res.status(201).json({
            success: true,
            message: 'Job posting cloned successfully',
            data: newJob
        });
    } catch (error) {
        logger.error('Error cloning job:', error);
        res.status(500).json({ success: false, message: 'Error cloning job', error: error.message });
    }
};

/**
 * Get recruitment statistics
 * GET /api/hr/recruitment/stats
 */
exports.getRecruitmentStats = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = startDate;
        if (endDate) dateRange.endDate = endDate;

        // Pass firmId or lawyerId based on user type
        const filterParam = firmId || lawyerId;
        const [jobStats, applicantStats] = await Promise.all([
            JobPosting.getRecruitmentStats(filterParam, dateRange),
            Applicant.getRecruitmentStats(filterParam, dateRange)
        ]);

        res.json({
            success: true,
            data: {
                jobs: jobStats,
                applicants: applicantStats
            }
        });
    } catch (error) {
        logger.error('Error fetching recruitment stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching recruitment stats', error: error.message });
    }
};

/**
 * Get jobs nearing deadline
 * GET /api/hr/recruitment/jobs/nearing-deadline
 */
exports.getJobsNearingDeadline = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { days = 7 } = req.query;

        // Pass firmId or lawyerId based on user type
        const filterParam = firmId || lawyerId;
        const jobs = await JobPosting.getJobsNearingDeadline(filterParam, parseInt(days));

        res.json({
            success: true,
            data: jobs
        });
    } catch (error) {
        logger.error('Error fetching jobs nearing deadline:', error);
        res.status(500).json({ success: false, message: 'Error fetching jobs', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// APPLICANT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get applicant statistics
 * GET /api/hr/recruitment/applicants/stats
 */
exports.getApplicantStats = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { startDate, endDate } = req.query;

        const dateRange = {};
        if (startDate) dateRange.startDate = startDate;
        if (endDate) dateRange.endDate = endDate;

        // Pass firmId or lawyerId based on user type
        const filterParam = firmId || lawyerId;
        const stats = await Applicant.getRecruitmentStats(filterParam, dateRange);

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error fetching applicant stats:', error);
        res.status(500).json({ success: false, message: 'Error fetching applicant stats', error: error.message });
    }
};

/**
 * Get all applicants
 * GET /api/hr/recruitment/applicants
 */
exports.getApplicants = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const {
            jobPostingId,
            status,
            stage,
            talentPool,
            tags,
            search,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const query = {};
        if (isSoloLawyer || !firmId) {
            query.lawyerId = lawyerId;
        } else {
            query.firmId = firmId;
        }

        // Apply filters
        if (jobPostingId) {
            query['applications.jobPostingId'] = jobPostingId;
        }
        if (status) {
            query['applications.status'] = status;
        }
        if (stage) {
            query['applications.currentStage'] = stage;
        }
        if (talentPool) {
            query.talentPool = talentPool;
        }
        if (tags) {
            query.tags = { $in: Array.isArray(tags) ? tags : [tags] };
        }

        // Text search
        if (search) {
            query.$text = { $search: search };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        const [applicants, total] = await Promise.all([
            Applicant.find(query)
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .populate('applications.jobPostingId', 'title titleAr jobId status')
                .select('-resumeText -communications -activities'),
            Applicant.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: applicants,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error fetching applicants:', error);
        res.status(500).json({ success: false, message: 'Error fetching applicants', error: error.message });
    }
};

/**
 * Get single applicant
 * GET /api/hr/recruitment/applicants/:id
 */
exports.getApplicantById = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { id } = req.params;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery })
            .populate('applications.jobPostingId', 'title titleAr jobId status')
            .populate('interviews.interviewers.userId', 'name email')
            .populate('notes.createdBy', 'name')
            .populate('activities.performedBy', 'name');

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        res.json({ success: true, data: applicant });
    } catch (error) {
        logger.error('Error fetching applicant:', error);
        res.status(500).json({ success: false, message: 'Error fetching applicant', error: error.message });
    }
};

/**
 * Create applicant (manual entry or application)
 * POST /api/hr/recruitment/applicants
 */
exports.createApplicant = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;

        // Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }

        // Check if applicant already exists by email
        const existingApplicant = await Applicant.findOne({ ...baseQuery, email: req.body.email });

        if (existingApplicant) {
            // If applying to a new job, add the application
            if (req.body.jobPostingId) {
                const jobPosting = await JobPosting.findById(req.body.jobPostingId);
                if (!jobPosting) {
                    return res.status(404).json({ success: false, message: 'Job posting not found' });
                }

                await existingApplicant.addApplication(
                    req.body.jobPostingId,
                    jobPosting.title,
                    req.body.source || 'direct',
                    req.body.coverLetter
                );

                await existingApplicant.addActivity(
                    'application_submitted',
                    `Applied to ${jobPosting.title}`,
                    userId,
                    userName
                );

                // Update job statistics
                await jobPosting.updateStatistics('totalApplications');
                await jobPosting.updateStatistics('newApplications');

                return res.status(200).json({
                    success: true,
                    message: 'Application added to existing applicant',
                    data: existingApplicant
                });
            }

            return res.status(400).json({
                success: false,
                message: 'Applicant with this email already exists',
                existingApplicantId: existingApplicant._id
            });
        }

        // Mass assignment protection - Create new applicant
        const allowedFields = [
            'fullName', 'fullNameAr', 'email', 'phone', 'alternatePhone', 'dateOfBirth',
            'gender', 'nationality', 'nationalId', 'passportNumber', 'maritalStatus',
            'address', 'city', 'country', 'linkedinProfile', 'portfolioUrl', 'website',
            'currentJobTitle', 'currentEmployer', 'currentSalary', 'expectedSalary', 'noticePeriod',
            'totalYearsExperience', 'skills', 'languages', 'education', 'workExperience',
            'certifications', 'resume', 'resumeUrl', 'coverLetter', 'profilePhoto',
            'availability', 'willingToRelocate', 'preferredWorkLocation', 'preferredWorkType',
            'tags', 'talentPool', 'source', 'referredBy', 'notes', 'consent',
            'jobPostingId', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation for critical fields
        if (!sanitizedData.fullName || !sanitizedData.email) {
            return res.status(400).json({
                success: false,
                message: 'Full name and email are required'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedData.email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Sanitize resume/document fields if present
        if (sanitizedData.resumeUrl) {
            // Basic URL validation
            try {
                new URL(sanitizedData.resumeUrl);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid resume URL format'
                });
            }
        }

        const applicantData = {
            ...sanitizedData,
            firmId, // From middleware (null for solo lawyers)
            lawyerId, // From middleware
            createdBy: userId,
            updatedBy: userId,
            activities: [{
                activityType: 'application_submitted',
                description: 'Applicant profile created',
                performedBy: userId,
                performedByName: userName
            }]
        };

        // If applying to a job
        if (sanitizedData.jobPostingId) {
            const jobPosting = await JobPosting.findById(sanitizeObjectId(sanitizedData.jobPostingId));
            if (!jobPosting) {
                return res.status(404).json({ success: false, message: 'Job posting not found' });
            }

            applicantData.applications = [{
                jobPostingId: sanitizedData.jobPostingId,
                jobTitle: jobPosting.title,
                source: sanitizedData.source || 'direct',
                coverLetter: sanitizedData.coverLetter,
                currentStage: 'applied',
                status: 'active',
                stageHistory: [{
                    stage: 'applied',
                    enteredAt: new Date()
                }]
            }];
            applicantData.primaryApplication = sanitizedData.jobPostingId;

            // Update job statistics
            await jobPosting.updateStatistics('totalApplications');
            await jobPosting.updateStatistics('newApplications');
        }

        const applicant = new Applicant(applicantData);
        await applicant.save();

        res.status(201).json({
            success: true,
            message: 'Applicant created successfully',
            data: applicant
        });
    } catch (error) {
        logger.error('Error creating applicant:', error);
        res.status(500).json({ success: false, message: 'Error creating applicant', error: error.message });
    }
};

/**
 * Update applicant
 * PATCH /api/hr/recruitment/applicants/:id
 */
exports.updateApplicant = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'fullName', 'fullNameAr', 'email', 'phone', 'alternatePhone', 'dateOfBirth',
            'gender', 'nationality', 'nationalId', 'passportNumber', 'maritalStatus',
            'address', 'city', 'country', 'linkedinProfile', 'portfolioUrl', 'website',
            'currentJobTitle', 'currentEmployer', 'currentSalary', 'expectedSalary', 'noticePeriod',
            'totalYearsExperience', 'skills', 'languages', 'education', 'workExperience',
            'certifications', 'resume', 'resumeUrl', 'coverLetter', 'profilePhoto',
            'availability', 'willingToRelocate', 'preferredWorkLocation', 'preferredWorkType',
            'tags', 'talentPool', 'overallRating', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation for email if provided
        if (sanitizedData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sanitizedData.email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }
        }

        // Sanitize resume/document fields if present
        if (sanitizedData.resumeUrl) {
            try {
                new URL(sanitizedData.resumeUrl);
            } catch (e) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid resume URL format'
                });
            }
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOneAndUpdate(
            { _id: sanitizeObjectId(id), ...baseQuery },
            { ...sanitizedData, updatedBy: userId, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        // Add activity
        await applicant.addActivity(
            'other',
            'Applicant profile updated',
            userId,
            userName
        );

        res.json({
            success: true,
            message: 'Applicant updated successfully',
            data: applicant
        });
    } catch (error) {
        logger.error('Error updating applicant:', error);
        res.status(500).json({ success: false, message: 'Error updating applicant', error: error.message });
    }
};

/**
 * Delete applicant
 * DELETE /api/hr/recruitment/applicants/:id
 */
exports.deleteApplicant = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { id } = req.params;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOneAndDelete({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        res.json({
            success: true,
            message: 'Applicant deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting applicant:', error);
        res.status(500).json({ success: false, message: 'Error deleting applicant', error: error.message });
    }
};

/**
 * Update applicant stage
 * POST /api/hr/recruitment/applicants/:id/stage
 */
exports.updateApplicantStage = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;
        const { jobPostingId, stage, outcome, notes } = req.body;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        const previousStage = applicant.applications.find(
            a => a.jobPostingId.toString() === jobPostingId
        )?.currentStage;

        await applicant.updateApplicationStage(jobPostingId, stage, outcome, notes);

        // Add activity
        await applicant.addActivity(
            'stage_change',
            `Moved from ${previousStage} to ${stage}`,
            userId,
            userName,
            { previousStage, newStage: stage, jobPostingId }
        );

        // Update job posting statistics
        const jobPosting = await JobPosting.findById(jobPostingId);
        if (jobPosting) {
            if (stage === 'hired') {
                await jobPosting.updateStatistics('hires');
            } else if (stage === 'rejected') {
                await jobPosting.updateStatistics('rejectedApplications');
            } else if (stage === 'withdrawn') {
                await jobPosting.updateStatistics('withdrawnApplications');
            } else if (['phone_interview', 'technical_interview', 'hr_interview', 'panel_interview'].includes(stage)) {
                await jobPosting.updateStatistics('interviewedCandidates');
            } else if (stage === 'screening') {
                await jobPosting.updateStatistics('screenedApplications');
            }
        }

        res.json({
            success: true,
            message: `Applicant moved to ${stage}`,
            data: applicant
        });
    } catch (error) {
        logger.error('Error updating applicant stage:', error);
        res.status(500).json({ success: false, message: 'Error updating stage', error: error.message });
    }
};

/**
 * Reject applicant
 * POST /api/hr/recruitment/applicants/:id/reject
 */
exports.rejectApplicant = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;
        const { jobPostingId, reason, sendEmail = false } = req.body;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        // Update application status
        const app = applicant.applications.find(
            a => a.jobPostingId.toString() === jobPostingId
        );

        if (app) {
            app.status = 'rejected';
            app.rejectionReason = reason;
            app.closedAt = new Date();
            await applicant.save();
        }

        // Add activity
        await applicant.addActivity(
            'rejected',
            `Application rejected: ${reason}`,
            userId,
            userName,
            { jobPostingId, reason }
        );

        // Update job statistics
        const jobPosting = await JobPosting.findById(jobPostingId);
        if (jobPosting) {
            await jobPosting.updateStatistics('rejectedApplications');
        }

        // TODO: Send rejection email if sendEmail is true

        res.json({
            success: true,
            message: 'Applicant rejected',
            data: applicant
        });
    } catch (error) {
        logger.error('Error rejecting applicant:', error);
        res.status(500).json({ success: false, message: 'Error rejecting applicant', error: error.message });
    }
};

/**
 * Get pipeline for job posting
 * GET /api/hr/recruitment/jobs/:id/pipeline
 */
exports.getJobPipeline = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { id } = req.params;

        // Pass firmId or lawyerId based on user type
        const filterParam = firmId || lawyerId;
        const pipelineCounts = await Applicant.getPipelineCounts(filterParam, id);

        // Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }

        // Get applicants by stage
        const stages = ['applied', 'screening', 'phone_interview', 'technical_interview',
                       'hr_interview', 'panel_interview', 'assessment', 'reference_check',
                       'background_check', 'offer', 'negotiation'];

        const pipeline = await Promise.all(
            stages.map(async (stage) => {
                const applicants = await Applicant.find({
                    ...baseQuery,
                    'applications': {
                        $elemMatch: {
                            jobPostingId: id,
                            currentStage: stage,
                            status: 'active'
                        }
                    }
                })
                .select('applicantId fullName fullNameAr email phone overallRating')
                .limit(50);

                return {
                    stage,
                    count: pipelineCounts[stage] || 0,
                    applicants
                };
            })
        );

        res.json({
            success: true,
            data: {
                counts: pipelineCounts,
                pipeline
            }
        });
    } catch (error) {
        logger.error('Error fetching pipeline:', error);
        res.status(500).json({ success: false, message: 'Error fetching pipeline', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// INTERVIEW ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Schedule interview
 * POST /api/hr/recruitment/applicants/:id/interviews
 */
exports.scheduleInterview = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'jobPostingId', 'interviewType', 'scheduledDate', 'duration', 'location',
            'locationAr', 'interviewMode', 'meetingLink', 'interviewers', 'notes',
            'jobRelated', 'stage', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (!sanitizedData.scheduledDate || !sanitizedData.interviewType) {
            return res.status(400).json({
                success: false,
                message: 'Scheduled date and interview type are required'
            });
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        await applicant.scheduleInterview(sanitizedData);

        // Add activity
        await applicant.addActivity(
            'interview_scheduled',
            `Interview scheduled for ${new Date(sanitizedData.scheduledDate).toLocaleDateString()}`,
            userId,
            userName,
            { interviewType: sanitizedData.interviewType, scheduledDate: sanitizedData.scheduledDate }
        );

        res.status(201).json({
            success: true,
            message: 'Interview scheduled successfully',
            data: applicant.interviews[applicant.interviews.length - 1]
        });
    } catch (error) {
        logger.error('Error scheduling interview:', error);
        res.status(500).json({ success: false, message: 'Error scheduling interview', error: error.message });
    }
};

/**
 * Update interview
 * PATCH /api/hr/recruitment/applicants/:id/interviews/:interviewId
 */
exports.updateInterview = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const { id, interviewId } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'scheduledDate', 'duration', 'location', 'locationAr', 'interviewMode',
            'meetingLink', 'interviewers', 'status', 'notes', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        const interview = applicant.interviews.id(sanitizeObjectId(interviewId));
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }

        Object.assign(interview, sanitizedData);
        applicant.updatedBy = userId;
        await applicant.save();

        res.json({
            success: true,
            message: 'Interview updated successfully',
            data: interview
        });
    } catch (error) {
        logger.error('Error updating interview:', error);
        res.status(500).json({ success: false, message: 'Error updating interview', error: error.message });
    }
};

/**
 * Submit interview feedback
 * POST /api/hr/recruitment/applicants/:id/interviews/:interviewId/feedback
 */
exports.submitInterviewFeedback = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id, interviewId } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'overallRating', 'technicalSkills', 'communicationSkills', 'cultureFit',
            'strengths', 'weaknesses', 'recommendation', 'comments', 'detailedScores', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (sanitizedData.overallRating !== undefined) {
            const rating = Number(sanitizedData.overallRating);
            if (isNaN(rating) || rating < 0 || rating > 10) {
                return res.status(400).json({
                    success: false,
                    message: 'Overall rating must be between 0 and 10'
                });
            }
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        const interview = applicant.interviews.id(sanitizeObjectId(interviewId));
        if (!interview) {
            return res.status(404).json({ success: false, message: 'Interview not found' });
        }

        // Check if feedback already exists from this interviewer
        const existingFeedback = interview.feedback.find(
            f => f.interviewerId?.toString() === userId.toString()
        );

        if (existingFeedback) {
            Object.assign(existingFeedback, {
                ...sanitizedData,
                submittedAt: new Date()
            });
        } else {
            interview.feedback.push({
                ...sanitizedData,
                interviewerId: userId,
                interviewerName: userName,
                submittedAt: new Date()
            });
        }

        // Calculate aggregated score
        if (interview.feedback.length > 0) {
            const avgScore = interview.feedback.reduce((sum, f) => sum + (f.overallRating || 0), 0) / interview.feedback.length;
            interview.aggregatedScore = Math.round(avgScore * 10) / 10;
        }

        // Mark interview as completed if all interviewers have submitted
        if (interview.interviewers.length <= interview.feedback.length) {
            interview.status = 'completed';
        }

        await applicant.save();

        // Recalculate overall rating
        applicant.calculateOverallRating();
        await applicant.save();

        // Add activity
        await applicant.addActivity(
            'interview_completed',
            `Interview feedback submitted`,
            userId,
            userName,
            { interviewId, rating: sanitizedData.overallRating }
        );

        res.json({
            success: true,
            message: 'Interview feedback submitted',
            data: interview
        });
    } catch (error) {
        logger.error('Error submitting feedback:', error);
        res.status(500).json({ success: false, message: 'Error submitting feedback', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// ASSESSMENT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Send assessment
 * POST /api/hr/recruitment/applicants/:id/assessments
 */
exports.sendAssessment = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'assessmentName', 'assessmentType', 'provider', 'assessmentUrl', 'instructions',
            'dueDate', 'estimatedDuration', 'maxScore', 'passingScore', 'jobPostingId', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (!sanitizedData.assessmentName || !sanitizedData.assessmentType) {
            return res.status(400).json({
                success: false,
                message: 'Assessment name and type are required'
            });
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        const assessmentId = `ASS-${applicant.applicantId}-${applicant.assessments.length + 1}`;
        applicant.assessments.push({
            ...sanitizedData,
            assessmentId,
            status: 'sent',
            sentAt: new Date()
        });

        await applicant.save();

        // Add activity
        await applicant.addActivity(
            'assessment_sent',
            `Assessment sent: ${sanitizedData.assessmentName}`,
            userId,
            userName,
            { assessmentType: sanitizedData.assessmentType }
        );

        res.status(201).json({
            success: true,
            message: 'Assessment sent successfully',
            data: applicant.assessments[applicant.assessments.length - 1]
        });
    } catch (error) {
        logger.error('Error sending assessment:', error);
        res.status(500).json({ success: false, message: 'Error sending assessment', error: error.message });
    }
};

/**
 * Record assessment result
 * PATCH /api/hr/recruitment/applicants/:id/assessments/:assessmentId
 */
exports.updateAssessmentResult = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id, assessmentId } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'score', 'maxScore', 'passingScore', 'percentile', 'passed', 'results',
            'feedback', 'completedAt', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (sanitizedData.score !== undefined && sanitizedData.maxScore !== undefined) {
            if (sanitizedData.score > sanitizedData.maxScore) {
                return res.status(400).json({
                    success: false,
                    message: 'Score cannot exceed maximum score'
                });
            }
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        const assessment = applicant.assessments.id(sanitizeObjectId(assessmentId));
        if (!assessment) {
            return res.status(404).json({ success: false, message: 'Assessment not found' });
        }

        Object.assign(assessment, {
            ...sanitizedData,
            status: 'completed',
            completedAt: new Date()
        });

        // Calculate if passed
        if (assessment.score && assessment.maxScore) {
            const passingThreshold = sanitizedData.passingScore || (assessment.maxScore * 0.7);
            assessment.passed = assessment.score >= passingThreshold;
            assessment.percentile = Math.round((assessment.score / assessment.maxScore) * 100);
        }

        await applicant.save();

        // Add activity
        await applicant.addActivity(
            'assessment_completed',
            `Assessment completed: ${assessment.assessmentName} - Score: ${assessment.score}/${assessment.maxScore}`,
            userId,
            userName,
            { assessmentId, score: assessment.score, passed: assessment.passed }
        );

        res.json({
            success: true,
            message: 'Assessment result recorded',
            data: assessment
        });
    } catch (error) {
        logger.error('Error updating assessment:', error);
        res.status(500).json({ success: false, message: 'Error updating assessment', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// OFFER ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Create offer
 * POST /api/hr/recruitment/applicants/:id/offers
 */
exports.createOffer = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'jobPostingId', 'positionTitle', 'positionTitleAr', 'departmentId', 'employmentType',
            'startDate', 'salary', 'benefits', 'allowances', 'workSchedule', 'probationPeriod',
            'contractDuration', 'location', 'locationAr', 'offerLetterUrl', 'expiryDate',
            'terms', 'specialConditions', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (!sanitizedData.positionTitle || !sanitizedData.salary) {
            return res.status(400).json({
                success: false,
                message: 'Position title and salary are required'
            });
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        await applicant.createOffer(sanitizedData, userId);

        // Add activity
        await applicant.addActivity(
            'offer_sent',
            `Offer created for ${sanitizedData.positionTitle}`,
            userId,
            userName,
            { salary: sanitizedData.salary?.amount }
        );

        res.status(201).json({
            success: true,
            message: 'Offer created successfully',
            data: applicant.offers[applicant.offers.length - 1]
        });
    } catch (error) {
        logger.error('Error creating offer:', error);
        res.status(500).json({ success: false, message: 'Error creating offer', error: error.message });
    }
};

/**
 * Update offer status
 * PATCH /api/hr/recruitment/applicants/:id/offers/:offerId
 */
exports.updateOffer = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id, offerId } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'status', 'salary', 'benefits', 'allowances', 'startDate', 'expiryDate',
            'terms', 'specialConditions', 'declinedReason', 'negotiationNotes', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        const offer = applicant.offers.id(sanitizeObjectId(offerId));
        if (!offer) {
            return res.status(404).json({ success: false, message: 'Offer not found' });
        }

        const previousStatus = offer.status;
        Object.assign(offer, sanitizedData);

        // Track response
        if (sanitizedData.status === 'accepted' || sanitizedData.status === 'declined') {
            offer.respondedAt = new Date();
        }

        await applicant.save();

        // Update job statistics
        if (offer.jobPostingId) {
            const jobPosting = await JobPosting.findById(offer.jobPostingId);
            if (jobPosting) {
                if (sanitizedData.status === 'sent' && previousStatus !== 'sent') {
                    await jobPosting.updateStatistics('offersExtended');
                }
                if (sanitizedData.status === 'accepted') {
                    await jobPosting.updateStatistics('offersAccepted');
                }
                if (sanitizedData.status === 'declined') {
                    await jobPosting.updateStatistics('offersDeclined');
                }
            }
        }

        // Add activity
        await applicant.addActivity(
            sanitizedData.status === 'accepted' ? 'offer_accepted' : sanitizedData.status === 'declined' ? 'offer_declined' : 'other',
            `Offer ${sanitizedData.status}`,
            userId,
            userName,
            { offerId, status: sanitizedData.status }
        );

        res.json({
            success: true,
            message: 'Offer updated successfully',
            data: offer
        });
    } catch (error) {
        logger.error('Error updating offer:', error);
        res.status(500).json({ success: false, message: 'Error updating offer', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// REFERENCE CHECK ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Add reference
 * POST /api/hr/recruitment/applicants/:id/references
 */
exports.addReference = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'name', 'relationship', 'company', 'position', 'email', 'phone',
            'yearsKnown', 'notes', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (!sanitizedData.name || !sanitizedData.relationship) {
            return res.status(400).json({
                success: false,
                message: 'Reference name and relationship are required'
            });
        }

        // Email validation if provided
        if (sanitizedData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sanitizedData.email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        applicant.references.push(sanitizedData);
        applicant.updatedBy = userId;
        await applicant.save();

        res.status(201).json({
            success: true,
            message: 'Reference added successfully',
            data: applicant.references[applicant.references.length - 1]
        });
    } catch (error) {
        logger.error('Error adding reference:', error);
        res.status(500).json({ success: false, message: 'Error adding reference', error: error.message });
    }
};

/**
 * Record reference check result
 * PATCH /api/hr/recruitment/applicants/:id/references/:referenceId
 */
exports.updateReferenceCheck = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id, referenceId } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'response', 'contacted', 'contactedDate', 'notes', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        const reference = applicant.references.id(sanitizeObjectId(referenceId));
        if (!reference) {
            return res.status(404).json({ success: false, message: 'Reference not found' });
        }

        Object.assign(reference, sanitizedData);

        if (sanitizedData.response) {
            reference.contacted = true;
            reference.contactedDate = new Date();
            reference.contactedBy = userId;
        }

        await applicant.save();

        // Add activity
        await applicant.addActivity(
            'reference_checked',
            `Reference check completed for ${reference.name}`,
            userId,
            userName,
            { referenceId, rating: reference.response?.overallRating }
        );

        res.json({
            success: true,
            message: 'Reference check updated',
            data: reference
        });
    } catch (error) {
        logger.error('Error updating reference:', error);
        res.status(500).json({ success: false, message: 'Error updating reference', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// NOTES & COMMUNICATION ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Add note
 * POST /api/hr/recruitment/applicants/:id/notes
 */
exports.addNote = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = ['noteType', 'content', 'isPrivate'];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (!sanitizedData.content) {
            return res.status(400).json({
                success: false,
                message: 'Note content is required'
            });
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        await applicant.addNote(
            sanitizedData.noteType || 'general',
            sanitizedData.content,
            userId,
            userName,
            sanitizedData.isPrivate
        );

        // Add activity
        await applicant.addActivity(
            'note_added',
            'Note added to applicant profile',
            userId,
            userName
        );

        res.status(201).json({
            success: true,
            message: 'Note added successfully',
            data: applicant.notes[applicant.notes.length - 1]
        });
    } catch (error) {
        logger.error('Error adding note:', error);
        res.status(500).json({ success: false, message: 'Error adding note', error: error.message });
    }
};

/**
 * Log communication
 * POST /api/hr/recruitment/applicants/:id/communications
 */
exports.logCommunication = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'communicationType', 'subject', 'message', 'direction', 'status',
            'attachments', 'metadata', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (!sanitizedData.communicationType || !sanitizedData.subject) {
            return res.status(400).json({
                success: false,
                message: 'Communication type and subject are required'
            });
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        applicant.communications.push({
            ...sanitizedData,
            sentBy: userId,
            sentByName: userName,
            sentAt: new Date()
        });

        await applicant.save();

        res.status(201).json({
            success: true,
            message: 'Communication logged',
            data: applicant.communications[applicant.communications.length - 1]
        });
    } catch (error) {
        logger.error('Error logging communication:', error);
        res.status(500).json({ success: false, message: 'Error logging communication', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// TALENT POOL ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get talent pool
 * GET /api/hr/recruitment/talent-pool
 */
exports.getTalentPool = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const { poolType, page = 1, limit = 20 } = req.query;

        // Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const query = {
            ...baseQuery,
            isBlacklisted: { $ne: true },
            'consent.talentPoolRetention': true
        };

        if (poolType) {
            query.talentPool = poolType;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [applicants, total] = await Promise.all([
            Applicant.find(query)
                .sort({ overallRating: -1, totalYearsExperience: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .select('applicantId fullName fullNameAr email phone skills totalYearsExperience overallRating talentPool tags'),
            Applicant.countDocuments(query)
        ]);

        res.json({
            success: true,
            data: applicants,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error fetching talent pool:', error);
        res.status(500).json({ success: false, message: 'Error fetching talent pool', error: error.message });
    }
};

/**
 * Update talent pool status
 * PATCH /api/hr/recruitment/applicants/:id/talent-pool
 */
exports.updateTalentPoolStatus = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;
        const { talentPool, tags } = req.body;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        if (talentPool) {
            applicant.talentPool = talentPool;
        }

        if (tags) {
            applicant.tags = tags;
        }

        applicant.updatedBy = userId;
        await applicant.save();

        // Add activity
        await applicant.addActivity(
            'other',
            `Talent pool status updated to ${talentPool}`,
            userId,
            userName
        );

        res.json({
            success: true,
            message: 'Talent pool status updated',
            data: applicant
        });
    } catch (error) {
        logger.error('Error updating talent pool status:', error);
        res.status(500).json({ success: false, message: 'Error updating talent pool', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Bulk update applicant stages
 * POST /api/hr/recruitment/applicants/bulk-stage-update
 */
exports.bulkUpdateStage = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { applicantIds, jobPostingId, stage, outcome, notes } = req.body;

        // Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }

        const results = {
            success: [],
            failed: []
        };

        for (const applicantId of applicantIds) {
            try {
                const applicant = await Applicant.findOne({ _id: applicantId, ...baseQuery });

                if (applicant) {
                    await applicant.updateApplicationStage(jobPostingId, stage, outcome, notes);
                    await applicant.addActivity(
                        'stage_change',
                        `Moved to ${stage} (bulk update)`,
                        userId,
                        userName,
                        { newStage: stage, jobPostingId }
                    );
                    results.success.push(applicantId);
                } else {
                    results.failed.push({ id: applicantId, reason: 'Not found' });
                }
            } catch (err) {
                results.failed.push({ id: applicantId, reason: err.message });
            }
        }

        res.json({
            success: true,
            message: `Bulk update completed. ${results.success.length} succeeded, ${results.failed.length} failed.`,
            data: results
        });
    } catch (error) {
        logger.error('Error in bulk stage update:', error);
        res.status(500).json({ success: false, message: 'Error in bulk update', error: error.message });
    }
};

/**
 * Bulk reject applicants
 * POST /api/hr/recruitment/applicants/bulk-reject
 */
exports.bulkReject = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { applicantIds, jobPostingId, reason } = req.body;

        // Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }

        const results = {
            success: [],
            failed: []
        };

        for (const applicantId of applicantIds) {
            try {
                const applicant = await Applicant.findOne({ _id: applicantId, ...baseQuery });

                if (applicant) {
                    const app = applicant.applications.find(
                        a => a.jobPostingId.toString() === jobPostingId
                    );

                    if (app) {
                        app.status = 'rejected';
                        app.rejectionReason = reason;
                        app.closedAt = new Date();
                        await applicant.save();

                        await applicant.addActivity(
                            'rejected',
                            `Application rejected (bulk): ${reason}`,
                            userId,
                            userName,
                            { jobPostingId, reason }
                        );
                        results.success.push(applicantId);
                    } else {
                        results.failed.push({ id: applicantId, reason: 'Application not found' });
                    }
                } else {
                    results.failed.push({ id: applicantId, reason: 'Applicant not found' });
                }
            } catch (err) {
                results.failed.push({ id: applicantId, reason: err.message });
            }
        }

        // Update job statistics
        const jobPosting = await JobPosting.findById(jobPostingId);
        if (jobPosting) {
            await jobPosting.updateStatistics('rejectedApplications', results.success.length);
        }

        res.json({
            success: true,
            message: `Bulk rejection completed. ${results.success.length} rejected, ${results.failed.length} failed.`,
            data: results
        });
    } catch (error) {
        logger.error('Error in bulk rejection:', error);
        res.status(500).json({ success: false, message: 'Error in bulk rejection', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// BACKGROUND CHECK ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * Initiate background check
 * POST /api/hr/recruitment/applicants/:id/background-check
 */
exports.initiateBackgroundCheck = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'provider', 'checkTypes', 'referenceNumber', 'requestedBy', 'notes', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (!sanitizedData.provider) {
            return res.status(400).json({
                success: false,
                message: 'Background check provider is required'
            });
        }

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        applicant.backgroundCheck = {
            ...sanitizedData,
            status: 'in_progress',
            initiatedAt: new Date()
        };

        applicant.updatedBy = userId;
        await applicant.save();

        // Add activity
        await applicant.addActivity(
            'other',
            'Background check initiated',
            userId,
            userName,
            { provider: sanitizedData.provider }
        );

        res.json({
            success: true,
            message: 'Background check initiated',
            data: applicant.backgroundCheck
        });
    } catch (error) {
        logger.error('Error initiating background check:', error);
        res.status(500).json({ success: false, message: 'Error initiating background check', error: error.message });
    }
};

/**
 * Update background check results
 * PATCH /api/hr/recruitment/applicants/:id/background-check
 */
exports.updateBackgroundCheck = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = [
            'status', 'results', 'findings', 'cleared', 'reportUrl', 'completedAt',
            'verifiedBy', 'notes', 'customFields'
        ];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        applicant.backgroundCheck = {
            ...applicant.backgroundCheck,
            ...sanitizedData,
            completedAt: new Date()
        };

        applicant.updatedBy = userId;
        await applicant.save();

        // Add activity
        await applicant.addActivity(
            'other',
            `Background check ${sanitizedData.status}`,
            userId,
            userName,
            { status: sanitizedData.status }
        );

        res.json({
            success: true,
            message: 'Background check updated',
            data: applicant.backgroundCheck
        });
    } catch (error) {
        logger.error('Error updating background check:', error);
        res.status(500).json({ success: false, message: 'Error updating background check', error: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
// HIRE APPLICANT
// ═══════════════════════════════════════════════════════════════

/**
 * Hire applicant (convert to employee)
 * POST /api/hr/recruitment/applicants/:id/hire
 */
exports.hireApplicant = async (req, res) => {
    try {
        const firmId = req.firmId; // From firmContext middleware
        const lawyerId = req.userID || req.userId;
        const userId = req.userID || req.userId;
        const userName = req.user?.name;
        const { id } = req.params;

        // Mass assignment protection
        const allowedFields = ['jobPostingId', 'startDate', 'employeeData'];
        const sanitizedData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (!sanitizedData.jobPostingId || !sanitizedData.startDate) {
            return res.status(400).json({
                success: false,
                message: 'Job posting ID and start date are required'
            });
        }

        const { jobPostingId, startDate, employeeData } = sanitizedData;

        // IDOR protection: Build query based on firmId (firm) or lawyerId (solo lawyer)
        const isSoloLawyer = req.isSoloLawyer;
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }
        const applicant = await Applicant.findOne({ _id: sanitizeObjectId(id), ...baseQuery });

        if (!applicant) {
            return res.status(404).json({ success: false, message: 'Applicant not found' });
        }

        // Update application status
        await applicant.updateApplicationStage(jobPostingId, 'hired', 'Hired', 'Applicant hired');

        // Set onboarding info
        applicant.onboarding = {
            hiredForJobId: jobPostingId,
            startDate,
            onboardingStatus: 'pending',
            ...employeeData
        };

        await applicant.save();

        // Update job statistics
        const jobPosting = await JobPosting.findById(jobPostingId);
        if (jobPosting) {
            await jobPosting.updateStatistics('hires');
        }

        // Add activity
        await applicant.addActivity(
            'hired',
            'Applicant hired',
            userId,
            userName,
            { jobPostingId, startDate }
        );

        res.json({
            success: true,
            message: 'Applicant hired successfully',
            data: applicant
        });
    } catch (error) {
        logger.error('Error hiring applicant:', error);
        res.status(500).json({ success: false, message: 'Error hiring applicant', error: error.message });
    }
};

/**
 * Bulk delete applicants
 * POST /api/hr/recruitment/applicants/bulk-delete
 */
exports.bulkDeleteApplicants = async (req, res) => {
    try {
        const { ids } = req.body;
        const firmId = req.firmId;
        const lawyerId = req.userID || req.userId;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب توفير قائمة المعرفات / IDs list is required'
            });
        }

        // Build access query
        const accessQuery = firmId
            ? { _id: { $in: ids }, firmId }
            : { _id: { $in: ids }, lawyerId };

        const result = await Applicant.deleteMany(accessQuery);

        res.json({
            success: true,
            message: `تم حذف ${result.deletedCount} متقدم بنجاح / ${result.deletedCount} applicant(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        logger.error('Error bulk deleting applicants:', error);
        res.status(500).json({
            success: false,
            message: 'Error bulk deleting applicants',
            error: error.message
        });
    }
};
