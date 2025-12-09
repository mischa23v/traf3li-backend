const { PerformanceReview, ReviewTemplate, CalibrationSession, Employee } = require('../models');
const mongoose = require('mongoose');

/**
 * Performance Review Controller
 * MODULE 6: إدارة الأداء
 * Handles all performance management operations
 */

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE REVIEWS - CRUD
// ═══════════════════════════════════════════════════════════════

/**
 * Get all performance reviews with filtering
 * GET /api/hr/performance-reviews
 */
const getPerformanceReviews = async (req, res) => {
    try {
        const {
            firmId,
            reviewType,
            status,
            departmentId,
            reviewerId,
            employeeId,
            periodYear,
            finalRating,
            search,
            page = 1,
            limit = 20,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const query = { isDeleted: false };

        // Multi-tenancy
        if (firmId) query.firmId = firmId;
        if (req.user?.firmId) query.firmId = req.user.firmId;

        // Filters
        if (reviewType) query.reviewType = reviewType;
        if (status) query.status = status;
        if (departmentId) query.departmentId = departmentId;
        if (reviewerId) query.reviewerId = reviewerId;
        if (employeeId) query.employeeId = employeeId;
        if (finalRating) query.finalRating = finalRating;

        if (periodYear) {
            query['reviewPeriod.startDate'] = {
                $gte: new Date(periodYear, 0, 1),
                $lte: new Date(periodYear, 11, 31, 23, 59, 59)
            };
        }

        if (search) {
            query.$or = [
                { employeeName: { $regex: search, $options: 'i' } },
                { employeeNameAr: { $regex: search, $options: 'i' } },
                { reviewId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

        const [reviews, total] = await Promise.all([
            PerformanceReview.find(query)
                .populate('employeeId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic')
                .populate('reviewerId', 'employeeId personalInfo.fullNameEnglish personalInfo.fullNameArabic')
                .populate('departmentId', 'name nameAr')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit)),
            PerformanceReview.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: reviews,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching performance reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching performance reviews',
            error: error.message
        });
    }
};

/**
 * Get performance review statistics
 * GET /api/hr/performance-reviews/stats
 */
const getPerformanceStats = async (req, res) => {
    try {
        const { periodYear, departmentId, firmId } = req.query;
        const targetFirmId = firmId || req.user?.firmId;

        // Validate firmId is present
        if (!targetFirmId) {
            return res.status(400).json({
                success: false,
                message: 'Firm ID is required'
            });
        }

        const match = {
            firmId: new mongoose.Types.ObjectId(targetFirmId),
            isDeleted: false
        };

        if (periodYear) {
            match['reviewPeriod.startDate'] = {
                $gte: new Date(periodYear, 0, 1),
                $lte: new Date(periodYear, 11, 31, 23, 59, 59)
            };
        }

        if (departmentId) {
            match.departmentId = new mongoose.Types.ObjectId(departmentId);
        }

        const [
            totalReviews,
            byStatus,
            byRating,
            avgScore,
            overdueCount,
            upcomingCount
        ] = await Promise.all([
            // Total reviews
            PerformanceReview.countDocuments(match),

            // By status
            PerformanceReview.aggregate([
                { $match: match },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),

            // By rating
            PerformanceReview.aggregate([
                { $match: { ...match, finalRating: { $ne: null } } },
                { $group: { _id: '$finalRating', count: { $sum: 1 } } }
            ]),

            // Average score
            PerformanceReview.aggregate([
                { $match: { ...match, overallScore: { $ne: null } } },
                { $group: { _id: null, avg: { $avg: '$overallScore' } } }
            ]),

            // Overdue
            PerformanceReview.countDocuments({
                ...match,
                status: { $nin: ['completed', 'acknowledged'] },
                $or: [
                    { 'reviewPeriod.reviewDueDate': { $lt: new Date() } },
                    { dueDate: { $lt: new Date() } }
                ]
            }),

            // Upcoming (due in next 7 days)
            PerformanceReview.countDocuments({
                ...match,
                status: { $nin: ['completed', 'acknowledged'] },
                $or: [
                    {
                        'reviewPeriod.reviewDueDate': {
                            $gte: new Date(),
                            $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        }
                    },
                    {
                        dueDate: {
                            $gte: new Date(),
                            $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                        }
                    }
                ]
            })
        ]);

        // Calculate completion rate
        const completed = byStatus.find(s => s._id === 'completed' || s._id === 'acknowledged');
        const completionRate = totalReviews > 0
            ? ((completed?.count || 0) / totalReviews) * 100
            : 0;

        // Calculate rating percentages
        const ratingTotal = byRating.reduce((sum, r) => sum + r.count, 0);
        const ratingWithPercentage = byRating.map(r => ({
            rating: r._id,
            count: r.count,
            percentage: ratingTotal > 0 ? parseFloat(((r.count / ratingTotal) * 100).toFixed(1)) : 0
        }));

        res.status(200).json({
            success: true,
            data: {
                totalReviews,
                byStatus: byStatus.map(s => ({ status: s._id, count: s.count })),
                byRating: ratingWithPercentage,
                avgOverallScore: avgScore[0]?.avg ? parseFloat(avgScore[0].avg.toFixed(2)) : null,
                completionRate: parseFloat(completionRate.toFixed(1)),
                overdueReviews: overdueCount,
                upcomingDue: upcomingCount
            }
        });
    } catch (error) {
        console.error('Error fetching performance stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching performance statistics',
            error: error.message
        });
    }
};

/**
 * Get single performance review
 * GET /api/hr/performance-reviews/:id
 */
const getPerformanceReviewById = async (req, res) => {
    try {
        const review = await PerformanceReview.findById(req.params.id)
            .populate('employeeId', 'employeeId personalInfo employmentDetails')
            .populate('reviewerId', 'employeeId personalInfo')
            .populate('managerId', 'employeeId personalInfo')
            .populate('departmentId', 'name nameAr')
            .populate('templateId')
            .populate('feedback360.providers.providerId', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic')
            .populate('developmentPlan.mentorAssigned.mentorId', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic');

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        res.status(200).json({
            success: true,
            data: review
        });
    } catch (error) {
        console.error('Error fetching performance review:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching performance review',
            error: error.message
        });
    }
};

/**
 * Create new performance review
 * POST /api/hr/performance-reviews
 */
const createPerformanceReview = async (req, res) => {
    try {
        const {
            employeeId,
            reviewType,
            reviewPeriod,
            templateId,
            goals,
            kpis,
            include360Feedback,
            feedbackProviders,
            firmId,
            lawyerId
        } = req.body;

        // Get employee details
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({
                success: false,
                message: 'Employee not found'
            });
        }

        // Get template if provided
        let template = null;
        if (templateId) {
            template = await ReviewTemplate.findById(templateId);
        }

        // Build review object
        const reviewData = {
            employeeId,
            employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
            employeeNameAr: employee.personalInfo?.fullNameArabic,
            employeeNumber: employee.employeeId,
            department: employee.employmentDetails?.department,
            departmentAr: employee.employmentDetails?.departmentAr,
            departmentId: employee.employmentDetails?.departmentId,
            position: employee.employmentDetails?.jobTitle,
            positionAr: employee.employmentDetails?.jobTitleAr,
            reviewerId: employee.employmentDetails?.reportingTo || req.user?._id,
            managerId: employee.employmentDetails?.reportingTo,
            reviewType,
            reviewPeriod,
            templateId,
            firmId: firmId || req.user?.firmId,
            lawyerId: lawyerId || req.user?._id,
            createdBy: req.user?._id,
            status: 'draft',
            isAttorney: employee.employmentDetails?.jobCategory === 'legal' ||
                        employee.employmentDetails?.jobTitle?.toLowerCase().includes('lawyer') ||
                        employee.employmentDetails?.jobTitle?.toLowerCase().includes('attorney')
        };

        // Get reviewer name
        if (reviewData.reviewerId) {
            const reviewer = await Employee.findById(reviewData.reviewerId);
            if (reviewer) {
                reviewData.reviewerName = reviewer.personalInfo?.fullNameEnglish || reviewer.personalInfo?.fullNameArabic;
                reviewData.reviewerNameAr = reviewer.personalInfo?.fullNameArabic;
                reviewData.reviewerTitle = reviewer.employmentDetails?.jobTitle;
            }
        }

        // Get manager name
        if (reviewData.managerId) {
            const manager = await Employee.findById(reviewData.managerId);
            if (manager) {
                reviewData.managerName = manager.personalInfo?.fullNameEnglish || manager.personalInfo?.fullNameArabic;
                reviewData.managerNameAr = manager.personalInfo?.fullNameArabic;
            }
        }

        // Add competencies from template
        if (template?.competencies) {
            reviewData.competencies = template.competencies.map(c => ({
                competencyId: c.competencyId,
                competencyName: c.name,
                competencyNameAr: c.nameAr,
                competencyCategory: c.category,
                competencyDescription: c.description,
                competencyDescriptionAr: c.descriptionAr,
                weight: c.weight,
                ratingScale: template.ratingScale || '1-5'
            }));
        }

        // Add goals if provided
        if (goals && goals.length > 0) {
            reviewData.goals = goals.map((g, idx) => ({
                goalId: `GOAL-${idx + 1}`,
                ...g,
                status: 'not_started'
            }));
        }

        // Add KPIs if provided
        if (kpis && kpis.length > 0) {
            reviewData.kpis = kpis.map((k, idx) => ({
                kpiId: `KPI-${idx + 1}`,
                ...k,
                actual: 0,
                achievementPercentage: 0
            }));
        }

        // Add 360 feedback providers
        if (include360Feedback && feedbackProviders?.length > 0) {
            reviewData.feedback360 = {
                enabled: true,
                providers: feedbackProviders.map(p => ({
                    providerId: p.providerId,
                    providerName: p.providerName,
                    providerNameAr: p.providerNameAr,
                    relationship: p.relationship,
                    status: 'pending',
                    requestedAt: new Date()
                })),
                responses: [],
                aggregatedRatings: []
            };
        }

        // Set up approval workflow
        reviewData.approvalWorkflow = [
            { stepNumber: 1, approverRole: 'employee', stepName: 'Self Assessment', status: 'pending' },
            { stepNumber: 2, approverRole: 'manager', stepName: 'Manager Review', status: 'pending' },
            { stepNumber: 3, approverRole: 'hr', stepName: 'HR Approval', status: 'pending' }
        ];
        reviewData.currentApprovalStep = 1;

        // Set due dates
        if (reviewPeriod?.reviewDueDate) {
            reviewData.dueDate = reviewPeriod.reviewDueDate;
        }

        const review = new PerformanceReview(reviewData);
        await review.save();

        res.status(201).json({
            success: true,
            message: 'Performance review created successfully',
            data: review
        });
    } catch (error) {
        console.error('Error creating performance review:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating performance review',
            error: error.message
        });
    }
};

/**
 * Update performance review
 * PATCH /api/hr/performance-reviews/:id
 */
const updatePerformanceReview = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedUpdates = [
            'goals', 'kpis', 'competencies', 'developmentPlan', 'strengths',
            'areasForImprovement', 'notes', 'nextSteps', 'dueDate', 'reviewPeriod'
        ];

        const filteredUpdates = {};
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        const review = await PerformanceReview.findByIdAndUpdate(
            id,
            {
                $set: {
                    ...filteredUpdates,
                    lastModifiedBy: req.user?._id,
                    lastModifiedAt: new Date()
                }
            },
            { new: true, runValidators: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Performance review updated successfully',
            data: review
        });
    } catch (error) {
        console.error('Error updating performance review:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating performance review',
            error: error.message
        });
    }
};

/**
 * Delete performance review (soft delete)
 * DELETE /api/hr/performance-reviews/:id
 */
const deletePerformanceReview = async (req, res) => {
    try {
        const review = await PerformanceReview.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: req.user?._id
                }
            },
            { new: true }
        );

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Performance review deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting performance review:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting performance review',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SELF-ASSESSMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Submit self-assessment
 * POST /api/hr/performance-reviews/:id/self-assessment
 */
const submitSelfAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            accomplishments,
            accomplishmentsAr,
            keyAchievements,
            challenges,
            challengesAr,
            strengths,
            strengthsAr,
            developmentNeeds,
            developmentNeedsAr,
            careerAspirations,
            careerAspirationsAr,
            trainingRequests,
            additionalComments,
            additionalCommentsAr,
            selfRating,
            competencyRatings,
            goalRatings
        } = req.body;

        const review = await PerformanceReview.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        // Update self-assessment
        review.selfAssessment = {
            required: true,
            submitted: true,
            submittedOn: new Date(),
            selfRating,
            accomplishments,
            accomplishmentsAr,
            keyAchievements,
            challenges,
            challengesAr,
            strengths,
            strengthsAr,
            developmentNeeds,
            developmentNeedsAr,
            careerAspirations,
            careerAspirationsAr,
            trainingRequests,
            additionalComments,
            additionalCommentsAr
        };

        // Update competency self-ratings
        if (competencyRatings && review.competencies) {
            competencyRatings.forEach(cr => {
                const comp = review.competencies.find(c => c.competencyId === cr.competencyId);
                if (comp) {
                    comp.selfRating = cr.rating;
                    comp.selfComments = cr.comments;
                }
            });
        }

        // Update goal self-ratings
        if (goalRatings && review.goals) {
            goalRatings.forEach(gr => {
                const goal = review.goals.find(g => g.goalId === gr.goalId);
                if (goal) {
                    goal.selfRating = gr.rating;
                    goal.employeeComments = gr.comments;
                    if (gr.actualValue !== undefined) {
                        goal.actualValue = gr.actualValue;
                        if (goal.targetValue) {
                            goal.achievementPercentage = parseFloat(((gr.actualValue / goal.targetValue) * 100).toFixed(1));
                        }
                    }
                }
            });
        }

        // Transition status
        try {
            review.transitionTo('manager_review');
        } catch (e) {
            review.status = 'manager_review';
        }

        // Update approval workflow
        const employeeStep = review.approvalWorkflow?.find(s => s.approverRole === 'employee');
        if (employeeStep) {
            employeeStep.status = 'approved';
            employeeStep.approverId = req.user?._id;
            employeeStep.actionDate = new Date();
        }
        review.currentApprovalStep = 2;

        await review.save();

        res.status(200).json({
            success: true,
            message: 'Self-assessment submitted successfully',
            data: review
        });
    } catch (error) {
        console.error('Error submitting self-assessment:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting self-assessment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// MANAGER ASSESSMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Submit manager assessment
 * POST /api/hr/performance-reviews/:id/manager-assessment
 */
const submitManagerAssessment = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            overallComments,
            overallCommentsAr,
            keyAchievements,
            performanceHighlights,
            performanceHighlightsAr,
            areasExceeded,
            areasMet,
            areasBelow,
            improvementProgress,
            behavioralObservations,
            workQualityAssessment,
            collaborationAssessment,
            initiativeAssessment,
            adaptabilityAssessment,
            leadershipAssessment,
            technicalSkillsAssessment,
            communicationAssessment,
            attendanceAssessment,
            professionalismAssessment,
            overallRating,
            ratingJustification,
            potentialAssessment,
            recommendations,
            competencyRatings,
            goalRatings,
            kpiRatings,
            attorneyMetrics,
            strengths,
            areasForImprovement
        } = req.body;

        const review = await PerformanceReview.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        // Update manager assessment
        review.managerAssessment = {
            completedAt: new Date(),
            overallComments,
            overallCommentsAr,
            keyAchievements,
            performanceHighlights,
            performanceHighlightsAr,
            areasExceeded,
            areasMet,
            areasBelow,
            improvementProgress,
            behavioralObservations,
            workQualityAssessment,
            collaborationAssessment,
            initiativeAssessment,
            adaptabilityAssessment,
            leadershipAssessment,
            technicalSkillsAssessment,
            communicationAssessment,
            attendanceAssessment,
            professionalismAssessment,
            overallRating,
            ratingJustification,
            potentialAssessment
        };

        // Update recommendations
        if (recommendations) {
            review.recommendations = recommendations;
        }

        // Update strengths
        if (strengths) {
            review.strengths = strengths;
        }

        // Update areas for improvement
        if (areasForImprovement) {
            review.areasForImprovement = areasForImprovement;
        }

        // Update competency manager ratings
        if (competencyRatings && review.competencies) {
            competencyRatings.forEach(cr => {
                const comp = review.competencies.find(c => c.competencyId === cr.competencyId);
                if (comp) {
                    comp.managerRating = cr.rating;
                    comp.managerComments = cr.comments;
                    comp.managerCommentsAr = cr.commentsAr;
                    comp.examples = cr.examples || comp.examples;

                    // Determine rating label
                    const labels = {
                        5: { en: 'Exceptional', ar: 'استثنائي' },
                        4: { en: 'Exceeds Expectations', ar: 'يتجاوز التوقعات' },
                        3: { en: 'Meets Expectations', ar: 'يلبي التوقعات' },
                        2: { en: 'Needs Improvement', ar: 'يحتاج تحسين' },
                        1: { en: 'Unsatisfactory', ar: 'غير مرضي' }
                    };
                    if (cr.rating && labels[cr.rating]) {
                        comp.ratingLabel = labels[cr.rating].en;
                        comp.ratingLabelAr = labels[cr.rating].ar;
                    }
                }
            });
        }

        // Update goal manager ratings
        if (goalRatings && review.goals) {
            goalRatings.forEach(gr => {
                const goal = review.goals.find(g => g.goalId === gr.goalId);
                if (goal) {
                    goal.managerRating = gr.rating;
                    goal.managerComments = gr.comments;

                    // Update status based on rating
                    if (gr.rating >= 4) goal.status = 'exceeded';
                    else if (gr.rating >= 3) goal.status = 'completed';
                    else if (gr.rating >= 2) goal.status = 'in_progress';
                    else goal.status = 'not_achieved';
                }
            });
        }

        // Update KPI actuals and ratings
        if (kpiRatings && review.kpis) {
            kpiRatings.forEach(kr => {
                const kpi = review.kpis.find(k => k.kpiId === kr.kpiId);
                if (kpi) {
                    kpi.actual = kr.actual;
                    kpi.comments = kr.comments;
                }
            });
        }

        // Update attorney metrics if applicable
        if (review.isAttorney && attorneyMetrics) {
            review.attorneyMetrics = attorneyMetrics;
        }

        // Calculate overall score
        review.calculateOverallScore();

        // Set final rating
        review.finalRating = overallRating;

        // Update approval workflow
        const managerStep = review.approvalWorkflow?.find(s => s.approverRole === 'manager');
        if (managerStep) {
            managerStep.status = 'approved';
            managerStep.approverId = req.user?._id;
            managerStep.actionDate = new Date();
        }
        review.currentApprovalStep = 3;

        review.lastModifiedBy = req.user?._id;
        review.lastModifiedAt = new Date();

        await review.save();

        res.status(200).json({
            success: true,
            message: 'Manager assessment submitted successfully',
            data: review
        });
    } catch (error) {
        console.error('Error submitting manager assessment:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting manager assessment',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// 360 FEEDBACK
// ═══════════════════════════════════════════════════════════════

/**
 * Request 360 feedback
 * POST /api/hr/performance-reviews/:id/360-feedback/request
 */
const request360Feedback = async (req, res) => {
    try {
        const { id } = req.params;
        const { providers } = req.body;

        const review = await PerformanceReview.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        // Initialize feedback360 if not exists
        if (!review.feedback360) {
            review.feedback360 = {
                enabled: true,
                providers: [],
                responses: [],
                aggregatedRatings: []
            };
        }

        review.feedback360.enabled = true;

        // Add new providers
        for (const p of providers) {
            const exists = review.feedback360.providers.find(
                ep => ep.providerId.toString() === p.providerId
            );

            if (!exists) {
                // Get provider details
                const provider = await Employee.findById(p.providerId);
                review.feedback360.providers.push({
                    providerId: p.providerId,
                    providerName: provider?.personalInfo?.fullNameEnglish || p.providerName,
                    providerNameAr: provider?.personalInfo?.fullNameArabic || p.providerNameAr,
                    providerRole: provider?.employmentDetails?.jobTitle,
                    relationship: p.relationship,
                    status: 'pending',
                    requestedAt: new Date(),
                    anonymous: p.anonymous !== false
                });
            }
        }

        await review.save();

        // TODO: Send email notifications to feedback providers

        res.status(200).json({
            success: true,
            message: '360 feedback requested successfully',
            data: review.feedback360
        });
    } catch (error) {
        console.error('Error requesting 360 feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Error requesting 360 feedback',
            error: error.message
        });
    }
};

/**
 * Submit 360 feedback response
 * POST /api/hr/performance-reviews/:id/360-feedback/:providerId
 */
const submit360Feedback = async (req, res) => {
    try {
        const { id, providerId } = req.params;
        const { ratings, overallRating, strengths, areasForImprovement, specificFeedback } = req.body;

        const review = await PerformanceReview.findById(id);

        if (!review || !review.feedback360) {
            return res.status(404).json({
                success: false,
                message: 'Performance review or 360 feedback not found'
            });
        }

        // Find provider
        const provider = review.feedback360.providers.find(
            p => p.providerId.toString() === providerId
        );

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Feedback provider not found'
            });
        }

        // Update provider status
        provider.status = 'completed';
        provider.completedAt = new Date();

        // Add response
        review.feedback360.responses.push({
            providerId,
            ratings,
            overallRating,
            strengths,
            areasForImprovement,
            specificFeedback,
            submittedAt: new Date(),
            anonymous: provider.anonymous
        });

        // Recalculate aggregated ratings
        const allRatings = {};
        review.feedback360.responses.forEach(response => {
            if (response.ratings) {
                response.ratings.forEach(r => {
                    if (!allRatings[r.competencyId]) {
                        allRatings[r.competencyId] = { total: 0, count: 0 };
                    }
                    allRatings[r.competencyId].total += r.rating;
                    allRatings[r.competencyId].count += 1;
                });
            }
        });

        review.feedback360.aggregatedRatings = Object.entries(allRatings).map(([compId, data]) => ({
            competencyId: compId,
            avgRating: parseFloat((data.total / data.count).toFixed(2)),
            responseCount: data.count
        }));

        // Update summary
        const allStrengths = review.feedback360.responses.flatMap(r => r.strengths ? [r.strengths] : []);
        const allDevAreas = review.feedback360.responses.flatMap(r => r.areasForImprovement ? [r.areasForImprovement] : []);

        // Calculate overall sentiment
        const avgOverall = review.feedback360.responses
            .filter(r => r.overallRating)
            .reduce((sum, r) => sum + r.overallRating, 0) /
            (review.feedback360.responses.filter(r => r.overallRating).length || 1);

        let sentiment = 'mixed';
        if (avgOverall >= 4) sentiment = 'positive';
        else if (avgOverall <= 2.5) sentiment = 'negative';

        review.feedback360.summary = {
            commonStrengths: allStrengths.slice(0, 5),
            commonDevelopmentAreas: allDevAreas.slice(0, 5),
            overallSentiment: sentiment
        };

        await review.save();

        res.status(200).json({
            success: true,
            message: 'Feedback submitted successfully'
        });
    } catch (error) {
        console.error('Error submitting 360 feedback:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting 360 feedback',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// DEVELOPMENT PLAN
// ═══════════════════════════════════════════════════════════════

/**
 * Create/Update development plan
 * POST /api/hr/performance-reviews/:id/development-plan
 */
const createDevelopmentPlan = async (req, res) => {
    try {
        const { id } = req.params;
        const { items, trainingRecommendations, mentorAssigned, careerPath, careerAspirations, successionPlanning } = req.body;

        const review = await PerformanceReview.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        review.developmentPlan = {
            required: true,
            items: items?.map((item, idx) => ({
                itemId: `DEV-${review.reviewId}-${idx + 1}`,
                ...item,
                status: item.status || 'not_started',
                progress: item.progress || 0
            })) || [],
            trainingRecommendations,
            mentorAssigned,
            careerPath,
            careerAspirations,
            successionPlanning
        };

        review.lastModifiedBy = req.user?._id;
        review.lastModifiedAt = new Date();

        await review.save();

        res.status(200).json({
            success: true,
            message: 'Development plan created successfully',
            data: review.developmentPlan
        });
    } catch (error) {
        console.error('Error creating development plan:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating development plan',
            error: error.message
        });
    }
};

/**
 * Update development plan item
 * PATCH /api/hr/performance-reviews/:id/development-plan/:itemId
 */
const updateDevelopmentPlanItem = async (req, res) => {
    try {
        const { id, itemId } = req.params;
        const { status, progress, actions, completedActions } = req.body;

        const review = await PerformanceReview.findById(id);

        if (!review || !review.developmentPlan) {
            return res.status(404).json({
                success: false,
                message: 'Development plan not found'
            });
        }

        const item = review.developmentPlan.items.find(i => i.itemId === itemId);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Development plan item not found'
            });
        }

        if (status) item.status = status;
        if (progress !== undefined) item.progress = progress;
        if (actions) item.developmentActions = actions;
        if (item.status === 'completed' && !item.completionDate) {
            item.completionDate = new Date();
        }

        review.lastModifiedBy = req.user?._id;
        review.lastModifiedAt = new Date();

        await review.save();

        res.status(200).json({
            success: true,
            message: 'Development plan item updated',
            data: item
        });
    } catch (error) {
        console.error('Error updating development plan item:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating development plan item',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// COMPLETION & ACKNOWLEDGEMENT
// ═══════════════════════════════════════════════════════════════

/**
 * Complete review
 * POST /api/hr/performance-reviews/:id/complete
 */
const completeReview = async (req, res) => {
    try {
        const { id } = req.params;

        const review = await PerformanceReview.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        // Validate required data
        if (!review.managerAssessment?.completedAt) {
            return res.status(400).json({
                success: false,
                message: 'Manager assessment must be completed first'
            });
        }

        if (!review.finalRating) {
            return res.status(400).json({
                success: false,
                message: 'Final rating must be set'
            });
        }

        // Calculate final score if not done
        if (!review.overallScore) {
            review.calculateOverallScore();
        }

        // Transition status
        review.status = 'completed';
        review.completedOn = new Date();

        // Update HR approval
        const hrStep = review.approvalWorkflow?.find(s => s.approverRole === 'hr');
        if (hrStep) {
            hrStep.status = 'approved';
            hrStep.approverId = req.user?._id;
            hrStep.actionDate = new Date();
        }

        review.finalApprovalStatus = 'approved';
        review.finalApprover = req.user?._id;
        review.finalApprovalDate = new Date();

        review.lastModifiedBy = req.user?._id;
        review.lastModifiedAt = new Date();

        await review.save();

        // Update employee record with latest performance data
        await Employee.findByIdAndUpdate(review.employeeId, {
            $set: {
                'performanceInfo.lastPerformanceRating': review.finalRating,
                'performanceInfo.lastPerformanceScore': review.overallScore,
                'performanceInfo.lastPerformanceReviewDate': new Date()
            },
            $push: {
                'performanceInfo.performanceHistory': {
                    reviewId: review._id,
                    period: review.reviewPeriod,
                    rating: review.finalRating,
                    score: review.overallScore,
                    completedDate: new Date()
                }
            }
        });

        res.status(200).json({
            success: true,
            message: 'Performance review completed successfully',
            data: review
        });
    } catch (error) {
        console.error('Error completing review:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing review',
            error: error.message
        });
    }
};

/**
 * Employee acknowledge review
 * POST /api/hr/performance-reviews/:id/acknowledge
 */
const acknowledgeReview = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            agreesWithReview,
            agreement,
            employeeComments,
            employeeCommentsAr,
            disagreementAreas,
            disagreementExplanation,
            additionalAchievements,
            supportRequested,
            careerGoalsAlignment,
            signature
        } = req.body;

        const review = await PerformanceReview.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        if (review.status !== 'completed') {
            return res.status(400).json({
                success: false,
                message: 'Review must be completed before acknowledgement'
            });
        }

        review.employeeResponse = {
            responseProvided: true,
            responseDate: new Date(),
            agreesWithReview,
            agreement,
            employeeComments,
            employeeCommentsAr,
            disagreementAreas,
            disagreementExplanation,
            additionalAchievements,
            supportRequested,
            careerGoalsAlignment,
            acknowledged: true,
            acknowledgedDate: new Date(),
            signature
        };

        // Check if dispute raised
        if (!agreesWithReview || (disagreementAreas && disagreementAreas.length > 0)) {
            review.dispute = {
                disputed: true,
                disputeDate: new Date(),
                disputeReason: disagreementExplanation,
                disputeAreas: disagreementAreas?.map(area => ({
                    area,
                    justification: disagreementExplanation
                })),
                disputeStatus: 'submitted'
            };
            review.status = 'disputed';
        } else {
            review.status = 'acknowledged';
        }

        review.acknowledgedOn = new Date();

        await review.save();

        res.status(200).json({
            success: true,
            message: review.status === 'disputed' ? 'Review disputed - HR will review' : 'Review acknowledged successfully',
            data: review
        });
    } catch (error) {
        console.error('Error acknowledging review:', error);
        res.status(500).json({
            success: false,
            message: 'Error acknowledging review',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CALIBRATION
// ═══════════════════════════════════════════════════════════════

/**
 * Submit for calibration
 * POST /api/hr/performance-reviews/:id/calibration
 */
const submitForCalibration = async (req, res) => {
    try {
        const { id } = req.params;
        const { calibrationSessionId } = req.body;

        const review = await PerformanceReview.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        const session = await CalibrationSession.findById(calibrationSessionId);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Calibration session not found'
            });
        }

        // Store original rating
        review.calibration = {
            calibrationSessionId,
            calibrationSession: session.sessionName,
            preCalibrationRating: review.finalRating,
            calibrated: false
        };

        // Add to session
        if (!session.reviewsIncluded.includes(review._id)) {
            session.reviewsIncluded.push(review._id);
            session.totalReviewsCount = session.reviewsIncluded.length;
            await session.save();
        }

        // Transition status
        review.status = 'calibration';

        await review.save();

        res.status(200).json({
            success: true,
            message: 'Review submitted for calibration',
            data: review
        });
    } catch (error) {
        console.error('Error submitting for calibration:', error);
        res.status(500).json({
            success: false,
            message: 'Error submitting for calibration',
            error: error.message
        });
    }
};

/**
 * Apply calibration result
 * POST /api/hr/performance-reviews/:id/calibration/apply
 */
const applyCalibration = async (req, res) => {
    try {
        const { id } = req.params;
        const { finalRating, adjustmentReason, comparativeRanking, calibrationNotes } = req.body;

        const review = await PerformanceReview.findById(id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        // Update calibration data
        review.calibration = {
            ...review.calibration,
            calibrated: true,
            calibrationDate: new Date(),
            calibratedBy: req.user?._id,
            postCalibrationRating: finalRating,
            ratingAdjusted: review.finalRating !== finalRating,
            adjustmentReason,
            comparativeRanking,
            calibrationNotes
        };

        // Update final rating if changed
        if (finalRating) {
            review.finalRating = finalRating;
        }

        await review.save();

        res.status(200).json({
            success: true,
            message: 'Calibration applied successfully',
            data: review
        });
    } catch (error) {
        console.error('Error applying calibration:', error);
        res.status(500).json({
            success: false,
            message: 'Error applying calibration',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EMPLOYEE HISTORY & TEAM REPORTS
// ═══════════════════════════════════════════════════════════════

/**
 * Get employee performance history
 * GET /api/hr/performance-reviews/employee/:employeeId/history
 */
const getEmployeeHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const firmId = req.query.firmId || req.user?.firmId;

        const reviews = await PerformanceReview.getEmployeeHistory(employeeId, firmId);

        // Build rating trend
        const ratingTrend = reviews.map(r => ({
            period: `${new Date(r.reviewPeriod?.startDate).getFullYear()} ${r.reviewType}`,
            rating: r.finalRating,
            score: r.overallScore
        })).reverse();

        // Aggregate strengths and development areas
        const allStrengths = reviews.flatMap(r => r.managerAssessment?.areasExceeded || []);
        const allDevAreas = reviews.flatMap(r => [
            ...(r.selfAssessment?.developmentNeeds ? [r.selfAssessment.developmentNeeds] : []),
            ...(r.managerAssessment?.areasBelow || [])
        ]);

        res.status(200).json({
            success: true,
            data: {
                reviews,
                ratingTrend,
                strengthsOverTime: [...new Set(allStrengths)],
                developmentAreasOverTime: [...new Set(allDevAreas)]
            }
        });
    } catch (error) {
        console.error('Error fetching employee performance history:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching employee performance history',
            error: error.message
        });
    }
};

/**
 * Get team performance summary
 * GET /api/hr/performance-reviews/team/:managerId/summary
 */
const getTeamSummary = async (req, res) => {
    try {
        const { managerId } = req.params;
        const { periodYear } = req.query;
        const firmId = req.query.firmId || req.user?.firmId;

        // Validate required parameters
        if (!firmId) {
            return res.status(400).json({
                success: false,
                message: 'Firm ID is required'
            });
        }

        const match = {
            firmId: new mongoose.Types.ObjectId(firmId),
            $or: [
                { reviewerId: new mongoose.Types.ObjectId(managerId) },
                { managerId: new mongoose.Types.ObjectId(managerId) }
            ],
            isDeleted: false
        };

        if (periodYear) {
            match['reviewPeriod.startDate'] = {
                $gte: new Date(periodYear, 0, 1),
                $lte: new Date(periodYear, 11, 31, 23, 59, 59)
            };
        }

        const reviews = await PerformanceReview.find(match)
            .populate('employeeId', 'personalInfo.fullNameEnglish personalInfo.fullNameArabic employeeId')
            .select('employeeId status finalRating overallScore employeeName');

        // Calculate statistics
        const ratingDistribution = {};
        let totalScore = 0;
        let scoreCount = 0;
        let completedCount = 0;
        let pendingCount = 0;

        const teamMembers = reviews.map(r => {
            if (r.finalRating) {
                ratingDistribution[r.finalRating] = (ratingDistribution[r.finalRating] || 0) + 1;
            }

            if (r.overallScore) {
                totalScore += r.overallScore;
                scoreCount++;
            }

            if (r.status === 'completed' || r.status === 'acknowledged') {
                completedCount++;
            } else {
                pendingCount++;
            }

            return {
                employeeId: r.employeeId?._id,
                employeeName: r.employeeName || r.employeeId?.personalInfo?.fullNameEnglish,
                employeeNameAr: r.employeeId?.personalInfo?.fullNameArabic,
                reviewStatus: r.status,
                finalRating: r.finalRating,
                overallScore: r.overallScore
            };
        });

        res.status(200).json({
            success: true,
            data: {
                teamMembers,
                ratingDistribution: Object.entries(ratingDistribution).map(([rating, count]) => ({
                    rating,
                    count
                })),
                avgTeamScore: scoreCount > 0 ? parseFloat((totalScore / scoreCount).toFixed(2)) : null,
                completedCount,
                pendingCount,
                totalReviews: reviews.length
            }
        });
    } catch (error) {
        console.error('Error fetching team performance summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching team performance summary',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Bulk create reviews
 * POST /api/hr/performance-reviews/bulk-create
 */
const bulkCreateReviews = async (req, res) => {
    try {
        const { departmentId, employeeIds, reviewType, reviewPeriod, templateId, firmId, lawyerId } = req.body;

        const targetFirmId = firmId || req.user?.firmId;

        let targetEmployees;

        if (employeeIds && employeeIds.length > 0) {
            targetEmployees = await Employee.find({
                _id: { $in: employeeIds },
                firmId: targetFirmId,
                'employmentDetails.employmentStatus': 'active'
            });
        } else if (departmentId) {
            targetEmployees = await Employee.find({
                firmId: targetFirmId,
                'employmentDetails.departmentId': departmentId,
                'employmentDetails.employmentStatus': 'active'
            });
        } else {
            return res.status(400).json({
                success: false,
                message: 'Must provide employeeIds or departmentId'
            });
        }

        // Get template
        const template = templateId ? await ReviewTemplate.findById(templateId) : null;

        const createdReviews = [];
        const errors = [];

        for (const employee of targetEmployees) {
            try {
                // Check if review already exists for this period
                const existing = await PerformanceReview.findOne({
                    employeeId: employee._id,
                    reviewType,
                    'reviewPeriod.startDate': reviewPeriod.startDate,
                    'reviewPeriod.endDate': reviewPeriod.endDate,
                    isDeleted: false
                });

                if (existing) {
                    errors.push({
                        employeeId: employee._id,
                        employeeName: employee.personalInfo?.fullNameEnglish,
                        error: 'Review already exists for this period'
                    });
                    continue;
                }

                const reviewData = {
                    employeeId: employee._id,
                    employeeName: employee.personalInfo?.fullNameEnglish || employee.personalInfo?.fullNameArabic,
                    employeeNameAr: employee.personalInfo?.fullNameArabic,
                    employeeNumber: employee.employeeId,
                    department: employee.employmentDetails?.department,
                    departmentAr: employee.employmentDetails?.departmentAr,
                    departmentId: employee.employmentDetails?.departmentId,
                    position: employee.employmentDetails?.jobTitle,
                    positionAr: employee.employmentDetails?.jobTitleAr,
                    reviewerId: employee.employmentDetails?.reportingTo || req.user?._id,
                    managerId: employee.employmentDetails?.reportingTo,
                    reviewType,
                    reviewPeriod,
                    templateId,
                    firmId: targetFirmId,
                    lawyerId: lawyerId || req.user?._id,
                    createdBy: req.user?._id,
                    status: 'draft',
                    isAttorney: employee.employmentDetails?.jobCategory === 'legal'
                };

                // Add competencies from template
                if (template?.competencies) {
                    reviewData.competencies = template.competencies.map(c => ({
                        competencyId: c.competencyId,
                        competencyName: c.name,
                        competencyNameAr: c.nameAr,
                        competencyCategory: c.category,
                        weight: c.weight
                    }));
                }

                // Set up approval workflow
                reviewData.approvalWorkflow = [
                    { stepNumber: 1, approverRole: 'employee', stepName: 'Self Assessment', status: 'pending' },
                    { stepNumber: 2, approverRole: 'manager', stepName: 'Manager Review', status: 'pending' },
                    { stepNumber: 3, approverRole: 'hr', stepName: 'HR Approval', status: 'pending' }
                ];

                const review = new PerformanceReview(reviewData);
                await review.save();
                createdReviews.push(review);
            } catch (err) {
                errors.push({
                    employeeId: employee._id,
                    employeeName: employee.personalInfo?.fullNameEnglish,
                    error: err.message
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'Bulk creation completed',
            data: {
                created: createdReviews.length,
                failed: errors.length,
                reviews: createdReviews,
                errors
            }
        });
    } catch (error) {
        console.error('Error bulk creating reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error bulk creating reviews',
            error: error.message
        });
    }
};

/**
 * Send reminder
 * POST /api/hr/performance-reviews/:id/reminder
 */
const sendReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const { reminderType } = req.body;

        const review = await PerformanceReview.findById(id)
            .populate('employeeId', 'personalInfo.email personalInfo.fullNameEnglish')
            .populate('reviewerId', 'personalInfo.email personalInfo.fullNameEnglish');

        if (!review) {
            return res.status(404).json({
                success: false,
                message: 'Performance review not found'
            });
        }

        // TODO: Implement email sending based on reminderType
        // - self_assessment: Send to employee
        // - manager_review: Send to manager
        // - 360_feedback: Send to pending providers
        // - acknowledgement: Send to employee

        res.status(200).json({
            success: true,
            message: 'Reminder sent successfully'
        });
    } catch (error) {
        console.error('Error sending reminder:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending reminder',
            error: error.message
        });
    }
};

/**
 * Get overdue reviews
 * GET /api/hr/performance-reviews/overdue
 */
const getOverdueReviews = async (req, res) => {
    try {
        const firmId = req.query.firmId || req.user?.firmId;

        const reviews = await PerformanceReview.getOverdueReviews(firmId);

        res.status(200).json({
            success: true,
            data: reviews,
            total: reviews.length
        });
    } catch (error) {
        console.error('Error fetching overdue reviews:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching overdue reviews',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════

/**
 * Get review templates
 * GET /api/hr/performance-reviews/templates
 */
const getTemplates = async (req, res) => {
    try {
        const { reviewType, firmId } = req.query;
        const targetFirmId = firmId || req.user?.firmId;

        const query = { firmId: targetFirmId, isActive: true };
        if (reviewType) query.reviewType = reviewType;

        const templates = await ReviewTemplate.find(query).sort({ name: 1 });

        res.status(200).json({
            success: true,
            data: templates
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching templates',
            error: error.message
        });
    }
};

/**
 * Create review template
 * POST /api/hr/performance-reviews/templates
 */
const createTemplate = async (req, res) => {
    try {
        const templateData = {
            ...req.body,
            firmId: req.body.firmId || req.user?.firmId,
            createdBy: req.user?._id
        };

        const template = new ReviewTemplate(templateData);
        await template.save();

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: template
        });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating template',
            error: error.message
        });
    }
};

/**
 * Update review template
 * PATCH /api/hr/performance-reviews/templates/:id
 */
const updateTemplate = async (req, res) => {
    try {
        const template = await ReviewTemplate.findByIdAndUpdate(
            req.params.id,
            {
                $set: {
                    ...req.body,
                    updatedBy: req.user?._id,
                    updatedAt: new Date()
                }
            },
            { new: true }
        );

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Template updated successfully',
            data: template
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating template',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// CALIBRATION SESSIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get calibration sessions
 * GET /api/hr/performance-reviews/calibration-sessions
 */
const getCalibrationSessions = async (req, res) => {
    try {
        const { periodYear, status, departmentId, firmId } = req.query;
        const targetFirmId = firmId || req.user?.firmId;

        const query = { firmId: targetFirmId };
        if (periodYear) query.periodYear = parseInt(periodYear);
        if (status) query.status = status;
        if (departmentId) query.departmentId = departmentId;

        const sessions = await CalibrationSession.find(query)
            .populate('departmentId', 'name nameAr')
            .populate('reviewsIncluded', 'reviewId employeeName finalRating overallScore')
            .sort({ scheduledDate: -1 });

        res.status(200).json({
            success: true,
            data: sessions
        });
    } catch (error) {
        console.error('Error fetching calibration sessions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching calibration sessions',
            error: error.message
        });
    }
};

/**
 * Create calibration session
 * POST /api/hr/performance-reviews/calibration-sessions
 */
const createCalibrationSession = async (req, res) => {
    try {
        const sessionData = {
            ...req.body,
            firmId: req.body.firmId || req.user?.firmId,
            createdBy: req.user?._id,
            status: 'scheduled'
        };

        const session = new CalibrationSession(sessionData);
        await session.save();

        res.status(201).json({
            success: true,
            message: 'Calibration session created successfully',
            data: session
        });
    } catch (error) {
        console.error('Error creating calibration session:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating calibration session',
            error: error.message
        });
    }
};

/**
 * Complete calibration session
 * POST /api/hr/performance-reviews/calibration-sessions/:id/complete
 */
const completeCalibrationSession = async (req, res) => {
    try {
        const session = await CalibrationSession.findById(req.params.id)
            .populate('reviewsIncluded');

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Calibration session not found'
            });
        }

        // Calculate final rating distribution
        session.calculateDistribution();

        session.status = 'completed';
        session.completedAt = new Date();
        session.completedBy = req.user?._id;
        session.actualEndTime = new Date();

        await session.save();

        // Update all included reviews to completed status
        await PerformanceReview.updateMany(
            { _id: { $in: session.reviewsIncluded.map(r => r._id) } },
            { $set: { status: 'completed', completedOn: new Date() } }
        );

        res.status(200).json({
            success: true,
            message: 'Calibration session completed',
            data: session
        });
    } catch (error) {
        console.error('Error completing calibration session:', error);
        res.status(500).json({
            success: false,
            message: 'Error completing calibration session',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

module.exports = {
    // CRUD
    getPerformanceReviews,
    getPerformanceStats,
    getPerformanceReviewById,
    createPerformanceReview,
    updatePerformanceReview,
    deletePerformanceReview,

    // Self-assessment
    submitSelfAssessment,

    // Manager assessment
    submitManagerAssessment,

    // 360 Feedback
    request360Feedback,
    submit360Feedback,

    // Development plan
    createDevelopmentPlan,
    updateDevelopmentPlanItem,

    // Completion & acknowledgement
    completeReview,
    acknowledgeReview,

    // Calibration
    submitForCalibration,
    applyCalibration,

    // History & reports
    getEmployeeHistory,
    getTeamSummary,
    getOverdueReviews,

    // Bulk operations
    bulkCreateReviews,
    sendReminder,

    // Templates
    getTemplates,
    createTemplate,
    updateTemplate,

    // Calibration sessions
    getCalibrationSessions,
    createCalibrationSession,
    completeCalibrationSession
};
