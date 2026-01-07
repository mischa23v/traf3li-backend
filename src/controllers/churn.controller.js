exports.getHealthScore = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const sanitizedFirmId = sanitizeObjectId(firmId);

    // Validate firmId matches authenticated user's firm
    if (sanitizedFirmId !== req.firmId) {
        throw new CustomException('Resource not found', 404, 'المورد غير موجود');
    }

    // TODO: Replace with actual health score calculation logic
    // This should pull from actual models: HealthScore, Firm, Usage metrics, etc.
    // Use: HealthScore.findOne({ firmId: req.firmId, ...req.firmQuery })
    const healthScore = {
        firmId: sanitizedFirmId,
        score: 75,
        tier: 'medium_risk',
        factors: {
            usage: { score: 80, weight: 0.3, trend: 'stable' },
            engagement: { score: 70, weight: 0.25, trend: 'declining' },
            support: { score: 60, weight: 0.15, trend: 'stable' },
            payment: { score: 90, weight: 0.2, trend: 'improving' },
            tenure: { score: 85, weight: 0.1, trend: 'stable' }
        },
        lastCalculated: new Date(),
        nextCalculation: new Date(Date.now() + 24 * 60 * 60 * 1000),
        recommendedActions: [
            {
                type: 'engagement',
                priority: 'high',
                action: 'Schedule check-in call',
                reason: 'Engagement declining over last 30 days'
            },
            {
                type: 'support',
                priority: 'medium',
                action: 'Review support tickets',
                reason: 'Low support satisfaction score'
            }
        ]
    };

    res.status(200).json({
        success: true,
        data: healthScore
    });
});

exports.getHealthScoreHistory = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const { days = 90 } = req.query;
    const sanitizedFirmId = sanitizeObjectId(firmId);

    // Validate firmId matches authenticated user's firm
    if (sanitizedFirmId !== req.firmId) {
        throw new CustomException('Resource not found', 404, 'المورد غير موجود');
    }

    // Validate days parameter
    const daysNum = Math.max(7, Math.min(365, parseInt(days) || 90));

    // TODO: Replace with actual database query
    // Query HealthScoreHistory model for historical data
    // Use: HealthScoreHistory.find({ firmId: req.firmId, ...req.firmQuery })
    const history = [];
    const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

    // Generate sample historical data (replace with actual query)
    for (let i = 0; i < daysNum; i += 7) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
        history.push({
            date,
            score: 70 + Math.random() * 20,
            tier: Math.random() > 0.5 ? 'medium_risk' : 'low_risk',
            factors: {
                usage: 75 + Math.random() * 15,
                engagement: 65 + Math.random() * 20,
                support: 60 + Math.random() * 25,
                payment: 85 + Math.random() * 10,
                tenure: 80 + Math.random() * 10
            }
        });
    }

    res.status(200).json({
        success: true,
        data: {
            firmId: sanitizedFirmId,
            period: { days: daysNum, from: startDate, to: new Date() },
            history,
            trends: {
                overall: 'stable',
                usage: 'declining',
                engagement: 'declining',
                support: 'stable',
                payment: 'improving'
            }
        }
    });
});

exports.recalculateHealthScore = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const sanitizedFirmId = sanitizeObjectId(firmId);
    const userId = req.userID;

    // Validate firmId matches authenticated user's firm
    if (sanitizedFirmId !== req.firmId) {
        throw new CustomException('Resource not found', 404, 'المورد غير موجود');
    }

    logger.info('Health score recalculation triggered', {
        firmId: sanitizedFirmId,
        triggeredBy: userId
    });

    // TODO: Implement actual health score calculation
    // This should:
    // 1. Fetch firm data using: Firm.findOne({ _id: req.firmId, ...req.firmQuery })
    // 2. Calculate all factor scores
    // 3. Apply weights and compute overall score
    // 4. Determine risk tier
    // 5. Save to HealthScore model with firmId isolation
    // 6. Create HealthScoreHistory entry with firmId isolation

    const recalculatedScore = {
        firmId: sanitizedFirmId,
        score: 72,
        tier: 'medium_risk',
        previousScore: 75,
        change: -3,
        calculatedAt: new Date(),
        calculatedBy: userId,
        factors: {
            usage: { score: 78, previousScore: 80, change: -2 },
            engagement: { score: 68, previousScore: 70, change: -2 },
            support: { score: 60, previousScore: 60, change: 0 },
            payment: { score: 90, previousScore: 90, change: 0 },
            tenure: { score: 85, previousScore: 85, change: 0 }
        }
    };

    res.status(200).json({
        success: true,
        message: 'Health score recalculated successfully',
        messageAr: 'تم إعادة حساب درجة الصحة بنجاح',
        data: recalculatedScore
    });
});

exports.getAtRiskFirms = asyncHandler(async (req, res) => {
    const {
        tier,
        minScore,
        maxScore,
        sortBy = 'score',
        sortOrder = 'asc',
        page = 1,
        limit = 20
    } = req.query;

    // Validation
    const validTiers = ['critical', 'high_risk', 'medium_risk', 'low_risk'];
    const validSortFields = ['score', 'lastActivity', 'mrr', 'tenure', 'companyName'];

    if (tier && !validTiers.includes(tier)) {
        throw new CustomException('Invalid tier value', 400, 'قيمة المستوى غير صالحة');
    }

    if (!validSortFields.includes(sortBy)) {
        throw new CustomException('Invalid sort field', 400, 'حقل الترتيب غير صالح');
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // TODO: Replace with actual database query
    // Query HealthScore model with filters and firmId isolation
    // Use: HealthScore.find({ ...req.firmQuery, ...filters })
    const atRiskFirms = [
        {
            firmId: '507f1f77bcf86cd799439011',
            companyName: 'Example Law Firm',
            score: 45,
            tier: 'high_risk',
            mrr: 5000,
            tenure: 24,
            lastActivity: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            primaryRisk: 'engagement',
            interventionStatus: 'pending',
            assignedCSM: 'John Doe'
        },
        {
            firmId: '507f1f77bcf86cd799439012',
            companyName: 'Another Legal Practice',
            score: 55,
            tier: 'medium_risk',
            mrr: 3000,
            tenure: 12,
            lastActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            primaryRisk: 'usage',
            interventionStatus: 'in_progress',
            assignedCSM: 'Jane Smith'
        }
    ];

    const total = atRiskFirms.length;

    res.status(200).json({
        success: true,
        data: atRiskFirms,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        },
        summary: {
            critical: 0,
            high_risk: 1,
            medium_risk: 1,
            low_risk: 0,
            totalMRRatRisk: 8000
        }
    });
});

// ============================================
// CHURN EVENT ENDPOINTS
// ============================================

exports.recordChurnEvent = asyncHandler(async (req, res) => {
    const {
        firmId,
        eventType,
        reason,
        reasonCategory,
        notes,
        exitSurveyCompleted,
        lostMRR,
        downgradeToPlan
    } = req.body;

    const recordedBy = req.userID;
    const sanitizedFirmId = sanitizeObjectId(firmId);

    // Validate firmId matches authenticated user's firm
    if (sanitizedFirmId !== req.firmId) {
        throw new CustomException('Resource not found', 404, 'المورد غير موجود');
    }

    // Validation
    const validEventTypes = ['churn', 'downgrade', 'pause', 'reactivation'];
    const validReasonCategories = [
        'price',
        'features',
        'support',
        'usability',
        'competitor',
        'business_closure',
        'other'
    ];

    if (!validEventTypes.includes(eventType)) {
        throw new CustomException('Invalid event type', 400, 'نوع الحدث غير صالح');
    }

    if (reasonCategory && !validReasonCategories.includes(reasonCategory)) {
        throw new CustomException('Invalid reason category', 400, 'فئة السبب غير صالحة');
    }

    // TODO: Create ChurnEvent model entry with firmId isolation
    // Use: new ChurnEvent({ firmId: req.firmId, ... }).save()
    const churnEvent = {
        _id: '507f1f77bcf86cd799439999',
        firmId: sanitizedFirmId,
        eventType,
        reason,
        reasonCategory,
        notes,
        exitSurveyCompleted: exitSurveyCompleted || false,
        lostMRR: lostMRR || 0,
        downgradeToPlan,
        recordedBy,
        recordedAt: new Date(),
        status: 'active'
    };

    logger.info('Churn event recorded', {
        eventId: churnEvent._id,
        firmId: sanitizedFirmId,
        eventType,
        reasonCategory
    });

    res.status(201).json({
        success: true,
        message: 'Churn event recorded successfully',
        messageAr: 'تم تسجيل حدث الإلغاء بنجاح',
        data: churnEvent
    });
});

exports.getChurnEvents = asyncHandler(async (req, res) => {
    const {
        eventType,
        reasonCategory,
        startDate,
        endDate,
        firmId,
        page = 1,
        limit = 20,
        sortBy = 'recordedAt',
        sortOrder = 'desc'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    // TODO: Query ChurnEvent model with filters
    // Use: ChurnEvent.find({ ...req.firmQuery, ...otherFilters })
    const events = [
        {
            _id: '507f1f77bcf86cd799439999',
            firmId: '507f1f77bcf86cd799439011',
            companyName: 'Example Law Firm',
            eventType: 'churn',
            reason: 'Switched to competitor',
            reasonCategory: 'competitor',
            lostMRR: 5000,
            recordedAt: new Date(),
            exitSurveyCompleted: true
        }
    ];

    const total = events.length;

    res.status(200).json({
        success: true,
        data: events,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
});

exports.updateChurnReason = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason, reasonCategory, notes } = req.body;
    const sanitizedId = sanitizeObjectId(id);

    // TODO: Update ChurnEvent in database with firmId isolation
    // Use: ChurnEvent.findOneAndUpdate({ _id: sanitizedId, ...req.firmQuery }, { reason, reasonCategory, notes, updatedAt: new Date(), updatedBy: req.userID }, { new: true })
    // If not found, throw: new CustomException('Resource not found', 404, 'المورد غير موجود')
    const updatedEvent = {
        _id: sanitizedId,
        reason,
        reasonCategory,
        notes,
        updatedAt: new Date(),
        updatedBy: req.userID
    };

    res.status(200).json({
        success: true,
        message: 'Churn reason updated successfully',
        messageAr: 'تم تحديث سبب الإلغاء بنجاح',
        data: updatedEvent
    });
});

exports.recordExitSurvey = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { responses } = req.body;
    const sanitizedId = sanitizeObjectId(id);

    if (!responses || typeof responses !== 'object') {
        throw new CustomException('Invalid survey responses', 400, 'استجابات الاستبيان غير صالحة');
    }

    // TODO: Validate ChurnEvent exists and belongs to user's firm
    // Use: const event = await ChurnEvent.findOne({ _id: sanitizedId, ...req.firmQuery })
    // If not found, throw: new CustomException('Resource not found', 404, 'المورد غير موجود')
    // Then save exit survey responses
    const exitSurvey = {
        eventId: sanitizedId,
        responses,
        completedAt: new Date(),
        completedBy: req.userID
    };

    res.status(200).json({
        success: true,
        message: 'Exit survey recorded successfully',
        messageAr: 'تم تسجيل استبيان الخروج بنجاح',
        data: exitSurvey
    });
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

exports.getDashboardMetrics = asyncHandler(async (req, res) => {
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    // TODO: Calculate actual metrics from database with firmId isolation
    // All queries should include: ...req.firmQuery
    const metrics = {
        period: { days, from: new Date(Date.now() - days * 24 * 60 * 60 * 1000), to: new Date() },
        churnRate: {
            current: 5.2,
            previous: 6.1,
            change: -0.9,
            trend: 'improving'
        },
        mrrChurnRate: {
            current: 4.8,
            previous: 5.5,
            change: -0.7,
            trend: 'improving'
        },
        customersAtRisk: {
            total: 45,
            critical: 5,
            high: 15,
            medium: 25,
            totalMRR: 125000
        },
        recentChurns: {
            count: 8,
            totalMRR: 24000,
            topReasons: [
                { category: 'competitor', count: 3, percentage: 37.5 },
                { category: 'price', count: 2, percentage: 25 },
                { category: 'features', count: 2, percentage: 25 }
            ]
        },
        interventions: {
            active: 12,
            completed: 8,
            successRate: 62.5
        },
        healthScoreDistribution: {
            excellent: 120,
            good: 85,
            fair: 45,
            poor: 25,
            critical: 10
        }
    };

    res.status(200).json({
        success: true,
        data: metrics
    });
});

exports.getChurnRate = asyncHandler(async (req, res) => {
    const {
        groupBy = 'month',
        startDate,
        endDate,
        includeDowngrades = 'true'
    } = req.query;

    const validGroupBy = ['day', 'week', 'month', 'quarter'];
    if (!validGroupBy.includes(groupBy)) {
        throw new CustomException('Invalid groupBy value', 400, 'قيمة التجميع غير صالحة');
    }

    // TODO: Calculate from ChurnEvent and Firm models with firmId isolation
    // Use: ChurnEvent.find({ ...req.firmQuery, ...filters })
    // Use: Firm.find({ ...req.firmQuery, ...filters })
    const data = {
        period: { groupBy, from: startDate, to: endDate },
        timeline: [
            { period: '2024-01', customerChurnRate: 4.5, mrrChurnRate: 4.2, churned: 12, downgraded: 3 },
            { period: '2024-02', customerChurnRate: 5.1, mrrChurnRate: 4.8, churned: 14, downgraded: 2 },
            { period: '2024-03', customerChurnRate: 5.8, mrrChurnRate: 5.3, churned: 16, downgraded: 4 },
            { period: '2024-04', customerChurnRate: 5.2, mrrChurnRate: 4.8, churned: 15, downgraded: 3 }
        ],
        averages: {
            customerChurnRate: 5.15,
            mrrChurnRate: 4.78,
            monthlyChurns: 14.25
        }
    };

    res.status(200).json({
        success: true,
        data
    });
});

exports.getChurnReasons = asyncHandler(async (req, res) => {
    const { startDate, endDate, eventType = 'churn' } = req.query;

    // TODO: Aggregate from ChurnEvent model with firmId isolation
    // Use: ChurnEvent.aggregate([{ $match: { ...req.firmQuery, ...filters } }, ...])
    const reasons = [
        {
            category: 'competitor',
            count: 45,
            percentage: 28.1,
            mrrLost: 135000,
            topReasons: [
                'Switched to cheaper competitor',
                'Better features elsewhere',
                'Competitor offered migration help'
            ]
        },
        {
            category: 'price',
            count: 38,
            percentage: 23.8,
            mrrLost: 95000,
            topReasons: [
                'Too expensive',
                'Budget cuts',
                'Not enough ROI'
            ]
        },
        {
            category: 'features',
            count: 32,
            percentage: 20.0,
            mrrLost: 80000,
            topReasons: [
                'Missing critical features',
                'Poor integration support',
                'Limited customization'
            ]
        },
        {
            category: 'support',
            count: 22,
            percentage: 13.8,
            mrrLost: 55000,
            topReasons: [
                'Slow response times',
                'Unresolved issues',
                'Poor documentation'
            ]
        },
        {
            category: 'usability',
            count: 15,
            percentage: 9.4,
            mrrLost: 37500,
            topReasons: [
                'Too complex',
                'Steep learning curve',
                'Poor UX'
            ]
        },
        {
            category: 'business_closure',
            count: 8,
            percentage: 5.0,
            mrrLost: 20000,
            topReasons: [
                'Business shut down',
                'Merged with another firm',
                'Practice area change'
            ]
        }
    ];

    const total = reasons.reduce((sum, r) => sum + r.count, 0);
    const totalMRRLost = reasons.reduce((sum, r) => sum + r.mrrLost, 0);

    res.status(200).json({
        success: true,
        data: {
            period: { from: startDate, to: endDate },
            reasons,
            summary: {
                totalChurns: total,
                totalMRRLost,
                topCategory: 'competitor'
            }
        }
    });
});

exports.getCohortAnalysis = asyncHandler(async (req, res) => {
    const { cohortBy = 'month', periods = 12 } = req.query;

    const validCohortBy = ['month', 'quarter', 'year'];
    if (!validCohortBy.includes(cohortBy)) {
        throw new CustomException('Invalid cohortBy value', 400, 'قيمة التجميع غير صالحة');
    }

    // TODO: Calculate from Firm model based on createdAt with firmId isolation
    // Use: Firm.find({ ...req.firmQuery, ...filters })
    const cohorts = [
        {
            cohort: '2024-01',
            size: 120,
            retention: [100, 95, 92, 88, 85, 82, 80, 78, 76, 74, 72, 70],
            ltv: 45000,
            churnedCount: 50
        },
        {
            cohort: '2024-02',
            size: 135,
            retention: [100, 96, 93, 90, 87, 85, 83, 81, 79, 77, 75],
            ltv: 42000,
            churnedCount: 34
        },
        {
            cohort: '2024-03',
            size: 145,
            retention: [100, 97, 94, 91, 89, 87, 85, 83, 81, 79],
            ltv: 38000,
            churnedCount: 30
        },
        {
            cohort: '2024-04',
            size: 150,
            retention: [100, 98, 95, 93, 91, 89, 87, 85, 83],
            ltv: 35000,
            churnedCount: 26
        }
    ];

    res.status(200).json({
        success: true,
        data: {
            cohortBy,
            periods: parseInt(periods),
            cohorts,
            averageRetention: {
                month1: 100,
                month3: 93.5,
                month6: 86.75,
                month12: 71
            }
        }
    });
});

exports.getRevenueAtRisk = asyncHandler(async (req, res) => {
    const { includeProjections = 'true' } = req.query;

    // TODO: Calculate from HealthScore and Firm billing data with firmId isolation
    // Use: HealthScore.find({ ...req.firmQuery, ...filters })
    // Use: Firm.find({ ...req.firmQuery, ...filters })
    const revenueAtRisk = {
        current: {
            critical: { customers: 5, mrr: 25000, arr: 300000 },
            high: { customers: 15, mrr: 75000, arr: 900000 },
            medium: { customers: 25, mrr: 125000, arr: 1500000 },
            total: { customers: 45, mrr: 225000, arr: 2700000 }
        },
        trends: {
            week: { change: -5000, trend: 'improving' },
            month: { change: 15000, trend: 'worsening' },
            quarter: { change: 35000, trend: 'worsening' }
        },
        projections: includeProjections === 'true' ? {
            next30Days: { expectedChurns: 3, projectedMRRLoss: 15000 },
            next60Days: { expectedChurns: 6, projectedMRRLoss: 28000 },
            next90Days: { expectedChurns: 9, projectedMRRLoss: 42000 }
        } : null,
        bySegment: [
            { segment: 'Enterprise', customers: 2, mrr: 50000, churnProbability: 0.15 },
            { segment: 'Mid-Market', customers: 18, mrr: 108000, churnProbability: 0.22 },
            { segment: 'SMB', customers: 25, mrr: 67000, churnProbability: 0.28 }
        ]
    };

    res.status(200).json({
        success: true,
        data: revenueAtRisk
    });
});

// ============================================
// INTERVENTION ENDPOINTS
// ============================================

exports.getInterventionHistory = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const sanitizedFirmId = sanitizeObjectId(firmId);

    // Validate firmId matches authenticated user's firm
    if (sanitizedFirmId !== req.firmId) {
        throw new CustomException('Resource not found', 404, 'المورد غير موجود');
    }

    // TODO: Query Intervention model with firmId isolation
    // Use: Intervention.find({ firmId: req.firmId, ...req.firmQuery })
    const interventions = [
        {
            _id: '507f1f77bcf86cd799439100',
            firmId: sanitizedFirmId,
            type: 'outreach_call',
            triggeredBy: 'health_score_drop',
            triggeredAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            assignedTo: 'John Doe',
            status: 'completed',
            outcome: 'positive',
            notes: 'Customer feedback positive. Addressed feature concerns.',
            healthScoreBefore: 65,
            healthScoreAfter: 75,
            completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        },
        {
            _id: '507f1f77bcf86cd799439101',
            firmId: sanitizedFirmId,
            type: 'feature_training',
            triggeredBy: 'low_usage',
            triggeredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            assignedTo: 'Jane Smith',
            status: 'completed',
            outcome: 'positive',
            notes: 'Provided training on advanced features.',
            healthScoreBefore: 70,
            healthScoreAfter: 78,
            completedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        }
    ];

    res.status(200).json({
        success: true,
        data: interventions,
        summary: {
            total: interventions.length,
            completed: 2,
            positive: 2,
            averageScoreImprovement: 8.5
        }
    });
});

exports.triggerIntervention = asyncHandler(async (req, res) => {
    const { firmId } = req.params;
    const { type, assignedTo, priority, notes } = req.body;
    const sanitizedFirmId = sanitizeObjectId(firmId);
    const triggeredBy = req.userID;

    // Validate firmId matches authenticated user's firm
    if (sanitizedFirmId !== req.firmId) {
        throw new CustomException('Resource not found', 404, 'المورد غير موجود');
    }

    const validTypes = [
        'outreach_call',
        'check_in_email',
        'feature_training',
        'account_review',
        'executive_engagement',
        'discount_offer',
        'custom'
    ];

    if (!validTypes.includes(type)) {
        throw new CustomException('Invalid intervention type', 400, 'نوع التدخل غير صالح');
    }

    // TODO: Create Intervention model entry with firmId isolation
    // Use: new Intervention({ firmId: req.firmId, type, ... }).save()
    const intervention = {
        _id: '507f1f77bcf86cd799439102',
        firmId: sanitizedFirmId,
        type,
        triggeredBy: 'manual',
        triggeredByUser: triggeredBy,
        triggeredAt: new Date(),
        assignedTo,
        priority: priority || 'medium',
        status: 'pending',
        notes
    };

    logger.info('Intervention triggered', {
        interventionId: intervention._id,
        firmId: sanitizedFirmId,
        type,
        triggeredBy
    });

    res.status(201).json({
        success: true,
        message: 'Intervention triggered successfully',
        messageAr: 'تم تفعيل التدخل بنجاح',
        data: intervention
    });
});

exports.getInterventionStats = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'type' } = req.query;

    // TODO: Aggregate from Intervention model with firmId isolation
    // Use: Intervention.aggregate([{ $match: { ...req.firmQuery, ...filters } }, ...])
    const stats = {
        period: { from: startDate, to: endDate },
        overall: {
            total: 156,
            completed: 124,
            inProgress: 18,
            pending: 14,
            successRate: 68.5,
            averageScoreImprovement: 7.2
        },
        byType: [
            {
                type: 'outreach_call',
                count: 45,
                completed: 38,
                successRate: 71.1,
                averageScoreImprovement: 8.5,
                averageTimeToComplete: 3.2
            },
            {
                type: 'feature_training',
                count: 38,
                completed: 32,
                successRate: 75.0,
                averageScoreImprovement: 9.1,
                averageTimeToComplete: 5.5
            },
            {
                type: 'check_in_email',
                count: 42,
                completed: 35,
                successRate: 54.3,
                averageScoreImprovement: 4.2,
                averageTimeToComplete: 1.5
            },
            {
                type: 'account_review',
                count: 31,
                completed: 19,
                successRate: 78.9,
                averageScoreImprovement: 11.3,
                averageTimeToComplete: 7.2
            }
        ],
        outcomes: {
            positive: 85,
            neutral: 24,
            negative: 15,
            churned: 8
        },
        savedRevenue: {
            total: 420000,
            average: 3387
        }
    };

    res.status(200).json({
        success: true,
        data: stats
    });
});

// ============================================
// REPORT ENDPOINTS
// ============================================

exports.generateReport = asyncHandler(async (req, res) => {
    const {
        reportType = 'comprehensive',
        startDate,
        endDate,
        format = 'json'
    } = req.query;

    const validTypes = ['comprehensive', 'executive', 'detailed', 'trends'];
    const validFormats = ['json', 'pdf', 'csv', 'xlsx'];

    if (!validTypes.includes(reportType)) {
        throw new CustomException('Invalid report type', 400, 'نوع التقرير غير صالح');
    }

    if (!validFormats.includes(format)) {
        throw new CustomException('Invalid format', 400, 'تنسيق غير صالح');
    }

    // TODO: Generate actual report based on type with firmId isolation
    // All data queries should include: ...req.firmQuery
    const report = {
        type: reportType,
        generatedAt: new Date(),
        generatedBy: req.userID,
        period: { from: startDate, to: endDate },
        summary: {
            totalCustomers: 285,
            churned: 15,
            churnRate: 5.3,
            mrrChurnRate: 4.8,
            revenueAtRisk: 225000,
            interventionsActive: 12,
            interventionSuccessRate: 68.5
        },
        sections: {
            overview: {},
            churnAnalysis: {},
            atRiskCustomers: {},
            interventions: {},
            recommendations: []
        }
    };

    if (format !== 'json') {
        // TODO: Generate file and return download URL
        return res.status(200).json({
            success: true,
            message: `Report generation started. Format: ${format}`,
            data: {
                downloadUrl: '/api/downloads/churn-report-123.pdf',
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
        });
    }

    res.status(200).json({
        success: true,
        data: report
    });
});

exports.exportAtRiskList = asyncHandler(async (req, res) => {
    const { tier, minScore, format = 'csv' } = req.query;

    const validFormats = ['csv', 'xlsx', 'json'];
    if (!validFormats.includes(format)) {
        throw new CustomException('Invalid format', 400, 'تنسيق غير صالح');
    }

    // TODO: Query and format data for export with firmId isolation
    // Use: HealthScore.find({ ...req.firmQuery, ...filters })
    const exportData = {
        generatedAt: new Date(),
        filters: { tier, minScore },
        count: 45,
        downloadUrl: `/api/downloads/at-risk-customers.${format}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    res.status(200).json({
        success: true,
        message: 'Export generated successfully',
        messageAr: 'تم إنشاء التصدير بنجاح',
        data: exportData
    });
});

exports.getExecutiveSummary = asyncHandler(async (req, res) => {
    const { period = '30' } = req.query;
    const days = parseInt(period) || 30;

    // TODO: Calculate from all churn-related models with firmId isolation
    // All queries should include: ...req.firmQuery
    const summary = {
        period: { days, from: new Date(Date.now() - days * 24 * 60 * 60 * 1000), to: new Date() },
        keyMetrics: {
            churnRate: { value: 5.2, change: -0.9, trend: 'improving' },
            mrrChurnRate: { value: 4.8, change: -0.7, trend: 'improving' },
            customersAtRisk: { value: 45, change: 5, trend: 'worsening' },
            revenueAtRisk: { value: 225000, change: 15000, trend: 'worsening' },
            netMRRChurn: { value: -12000, change: -3000, trend: 'improving' }
        },
        alerts: [
            {
                level: 'critical',
                message: '5 enterprise customers at critical risk',
                action: 'Immediate executive engagement required'
            },
            {
                level: 'warning',
                message: 'Support satisfaction scores declining',
                action: 'Review support team performance'
            },
            {
                level: 'info',
                message: 'Intervention success rate improving',
                action: 'Continue current strategies'
            }
        ],
        topActions: [
            'Schedule calls with 5 critical-risk enterprise customers',
            'Review pricing concerns from exit surveys',
            'Improve feature adoption for mid-market segment'
        ],
        wins: [
            'Churn rate decreased 14.8% vs last period',
            '12 successful interventions prevented $84K MRR loss',
            'Support response time improved 22%'
        ]
    };

    res.status(200).json({
        success: true,
        data: summary
    });
});
