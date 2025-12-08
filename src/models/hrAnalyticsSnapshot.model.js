const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * HR Analytics Snapshot Model
 * Stores periodic snapshots of HR metrics for historical tracking and trend analysis
 * Enables comparison of metrics over time (MoM, YoY)
 */

const hrAnalyticsSnapshotSchema = new Schema({
    // Snapshot Identification
    snapshotId: {
        type: String,
        unique: true,
        required: true
    },
    snapshotType: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'],
        required: true,
        index: true
    },
    snapshotDate: {
        type: Date,
        required: true,
        index: true
    },
    period: {
        startDate: Date,
        endDate: Date,
        year: Number,
        quarter: Number,
        month: Number,
        week: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // 1. WORKFORCE DEMOGRAPHICS
    // ═══════════════════════════════════════════════════════════════
    demographics: {
        totalEmployees: { type: Number, default: 0 },
        activeEmployees: { type: Number, default: 0 },
        inactiveEmployees: { type: Number, default: 0 },

        // Age Distribution
        ageDistribution: [{
            ageRange: String, // "18-25", "26-35", etc.
            count: Number,
            percentage: Number
        }],
        averageAge: Number,
        medianAge: Number,

        // Gender Breakdown
        genderBreakdown: {
            male: { type: Number, default: 0 },
            female: { type: Number, default: 0 },
            malePercentage: Number,
            femalePercentage: Number
        },

        // Department Distribution
        departmentDistribution: [{
            department: String,
            count: Number,
            percentage: Number,
            headcount: Number
        }],

        // Tenure Distribution
        tenureDistribution: [{
            tenureRange: String, // "0-1 year", "1-3 years", etc.
            count: Number,
            percentage: Number
        }],
        averageTenure: Number,
        medianTenure: Number,

        // Nationality Breakdown (Saudi-specific)
        nationalityBreakdown: [{
            nationality: String,
            count: Number,
            percentage: Number
        }],

        // Saudization Ratio (Critical for Saudi compliance)
        saudization: {
            totalSaudis: { type: Number, default: 0 },
            totalNonSaudis: { type: Number, default: 0 },
            saudiPercentage: Number,
            nonSaudiPercentage: Number,
            complianceTarget: { type: Number, default: 50 }, // Nitaqat requirement
            complianceStatus: { type: String, enum: ['compliant', 'at_risk', 'non_compliant'] },
            greenZoneMin: Number,
            actualRatio: Number
        },

        // Employment Type
        employmentTypeBreakdown: {
            fullTime: { type: Number, default: 0 },
            partTime: { type: Number, default: 0 },
            contract: { type: Number, default: 0 },
            temporary: { type: Number, default: 0 }
        },

        // Position Level
        positionLevelBreakdown: [{
            level: String,
            count: Number,
            percentage: Number
        }]
    },

    // ═══════════════════════════════════════════════════════════════
    // 2. TURNOVER ANALYSIS
    // ═══════════════════════════════════════════════════════════════
    turnover: {
        // Headcount
        startingHeadcount: Number,
        endingHeadcount: Number,
        averageHeadcount: Number,

        // Turnover Counts
        totalSeparations: { type: Number, default: 0 },
        voluntarySeparations: { type: Number, default: 0 },
        involuntarySeparations: { type: Number, default: 0 },
        retirements: { type: Number, default: 0 },

        // Turnover Rates
        turnoverRate: Number, // (separations / avg headcount) * 100
        voluntaryTurnoverRate: Number,
        involuntaryTurnoverRate: Number,
        retentionRate: Number, // 100 - turnover rate

        // By Department
        byDepartment: [{
            department: String,
            separations: Number,
            headcount: Number,
            turnoverRate: Number
        }],

        // By Tenure
        byTenure: [{
            tenureRange: String,
            separations: Number,
            percentage: Number
        }],

        // Average Tenure Before Leaving
        averageTenureBeforeLeaving: Number,
        medianTenureBeforeLeaving: Number,

        // Cost Analysis
        costOfTurnover: {
            totalCost: Number,
            averageCostPerSeparation: Number,
            recruitmentCosts: Number,
            trainingCosts: Number,
            lostProductivityCosts: Number
        },

        // Regrettable vs Non-regrettable
        regrettableTurnover: Number,
        nonRegrettableTurnover: Number,

        // 90-Day Turnover (new hires leaving within 90 days)
        ninetyDayTurnover: {
            count: Number,
            rate: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // 3. ABSENTEEISM TRACKING
    // ═══════════════════════════════════════════════════════════════
    absenteeism: {
        // Overall Metrics
        totalAbsences: { type: Number, default: 0 },
        totalAbsenceDays: Number,
        absenteeismRate: Number, // (absence days / total working days) * 100
        averageAbsencesPerEmployee: Number,

        // By Type
        byType: {
            unauthorized: { type: Number, default: 0 },
            authorized: { type: Number, default: 0 },
            sick: { type: Number, default: 0 },
            emergency: { type: Number, default: 0 }
        },

        // By Department
        byDepartment: [{
            department: String,
            absences: Number,
            absenceRate: Number
        }],

        // Patterns
        patterns: {
            mondayAbsences: Number,
            fridayAbsences: Number,
            weekendAdjacent: Number, // Mon/Fri pattern
            repeatOffenders: Number // Employees with >5 absences
        },

        // Cost Impact
        costOfAbsenteeism: {
            totalCost: Number,
            directCosts: Number,
            indirectCosts: Number,
            averageCostPerDay: Number
        },

        // Sick Leave Patterns
        sickLeave: {
            totalDays: Number,
            averagePerEmployee: Number,
            shortTerm: Number, // 1-3 days
            mediumTerm: Number, // 4-10 days
            longTerm: Number // >10 days
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // 4. LEAVE ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    leave: {
        // Leave Utilization
        totalLeaveRequests: { type: Number, default: 0 },
        approvedLeaves: { type: Number, default: 0 },
        rejectedLeaves: { type: Number, default: 0 },
        pendingLeaves: { type: Number, default: 0 },
        approvalRate: Number,

        // Leave Days
        totalLeaveDaysTaken: Number,
        averageLeaveDaysPerEmployee: Number,

        // By Type
        byType: [{
            leaveType: String,
            leaveTypeName: String,
            leaveTypeNameAr: String,
            count: Number,
            totalDays: Number,
            averageDuration: Number
        }],

        // Balance Trends
        balanceTrends: {
            totalEntitlement: Number,
            totalUsed: Number,
            totalRemaining: Number,
            utilizationRate: Number, // (used / entitlement) * 100
            averageBalance: Number
        },

        // Upcoming Leaves (forecast)
        upcomingLeaves: {
            next30Days: Number,
            next60Days: Number,
            next90Days: Number,
            peakPeriods: [{
                period: String,
                employeesOnLeave: Number
            }]
        },

        // Carry Forward
        carryForward: {
            totalDaysCarried: Number,
            employeesWithCarryForward: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // 5. ATTENDANCE ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    attendance: {
        // Overall Metrics
        totalAttendanceRecords: Number,
        presentDays: Number,
        absentDays: Number,
        attendanceRate: Number, // (present / total expected) * 100

        // Punctuality
        punctuality: {
            onTimeArrivals: Number,
            lateArrivals: Number,
            lateArrivalRate: Number,
            averageLateMinutes: Number,
            earlyDepartures: Number,
            earlyDepartureRate: Number
        },

        // Working Hours
        workingHours: {
            totalHours: Number,
            averageHoursPerEmployee: Number,
            averageHoursPerDay: Number,
            regularHours: Number,
            overtimeHours: Number,
            overtimeRate: Number // (overtime / regular) * 100
        },

        // Overtime Analysis
        overtime: {
            totalOvertimeHours: Number,
            totalOvertimeCost: Number,
            averageOvertimePerEmployee: Number,
            employeesWithOvertime: Number,
            overtimePercentage: Number,
            byDepartment: [{
                department: String,
                overtimeHours: Number,
                cost: Number
            }]
        },

        // Compliance
        complianceIssues: {
            missedCheckIns: Number,
            missedCheckOuts: Number,
            violationCount: Number,
            complianceRate: Number
        },

        // Average Check-in/Check-out Times
        averageCheckInTime: String,
        averageCheckOutTime: String
    },

    // ═══════════════════════════════════════════════════════════════
    // 6. PERFORMANCE ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    performance: {
        // Reviews Completed
        totalReviews: Number,
        completedReviews: Number,
        pendingReviews: Number,
        overdueReviews: Number,
        completionRate: Number,

        // Rating Distribution
        ratingDistribution: {
            exceptional: { type: Number, default: 0 },
            exceedsExpectations: { type: Number, default: 0 },
            meetsExpectations: { type: Number, default: 0 },
            needsImprovement: { type: Number, default: 0 },
            unsatisfactory: { type: Number, default: 0 }
        },

        // Average Scores
        averageOverallScore: Number,
        averageCompetencyScore: Number,
        averageGoalsScore: Number,
        averageKPIScore: Number,

        // Trends
        performanceTrend: { type: String, enum: ['improving', 'stable', 'declining'] },
        ratingChange: Number, // compared to previous period

        // By Department
        byDepartment: [{
            department: String,
            averageScore: Number,
            reviewsCompleted: Number,
            topPerformers: Number,
            lowPerformers: Number
        }],

        // Goal Achievement
        goalMetrics: {
            totalGoals: Number,
            achievedGoals: Number,
            achievementRate: Number,
            averageAchievementPercentage: Number
        },

        // High Performers / Low Performers
        highPerformers: Number, // Rating >= 4
        lowPerformers: Number, // Rating < 2.5

        // PIPs (Performance Improvement Plans)
        activePIPs: Number,
        completedPIPs: Number
    },

    // ═══════════════════════════════════════════════════════════════
    // 7. RECRUITMENT ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    recruitment: {
        // Job Postings
        totalJobPostings: Number,
        activePostings: Number,
        closedPostings: Number,
        filledPositions: Number,
        fillRate: Number,

        // Applications
        totalApplications: Number,
        screenedApplications: Number,
        interviewedCandidates: Number,
        offersExtended: Number,
        offersAccepted: Number,
        offerAcceptanceRate: Number,

        // Time to Hire
        averageTimeToHire: Number, // days
        medianTimeToHire: Number,
        timeToHireByPosition: [{
            position: String,
            averageDays: Number
        }],

        // Cost Per Hire
        totalRecruitmentCost: Number,
        costPerHire: Number,
        costBreakdown: {
            advertisingCosts: Number,
            agencyFees: Number,
            internalCosts: Number,
            relocationCosts: Number
        },

        // Source Effectiveness
        sourceEffectiveness: [{
            source: String, // "LinkedIn", "Indeed", "Referral", etc.
            applications: Number,
            hires: Number,
            conversionRate: Number,
            costPerHire: Number,
            qualityOfHire: Number
        }],

        // Pipeline Metrics
        pipeline: {
            candidatesInPipeline: Number,
            byStage: [{
                stage: String,
                count: Number,
                percentage: Number
            }],
            averageTimeInStage: [{
                stage: String,
                days: Number
            }]
        },

        // Quality of Hire
        qualityOfHire: {
            averagePerformanceRating: Number,
            retentionRateAfter90Days: Number,
            retentionRateAfter1Year: Number,
            managerSatisfactionScore: Number
        },

        // Diversity Hiring
        diversityMetrics: {
            femaleHires: Number,
            femaleHirePercentage: Number,
            nationalityDiversity: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // 8. COMPENSATION ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    compensation: {
        // Salary Overview
        totalPayroll: Number,
        averageSalary: Number,
        medianSalary: Number,
        salaryRange: {
            min: Number,
            max: Number,
            q1: Number,
            q3: Number
        },

        // Distribution
        salaryDistribution: [{
            range: String, // "0-5000", "5001-10000", etc.
            count: Number,
            percentage: Number
        }],

        // By Department
        byDepartment: [{
            department: String,
            averageSalary: Number,
            medianSalary: Number,
            totalPayroll: Number,
            headcount: Number
        }],

        // By Position/Level
        byLevel: [{
            level: String,
            averageSalary: Number,
            medianSalary: Number,
            count: Number
        }],

        // Pay Equity Analysis
        payEquity: {
            genderPayGap: Number, // (male avg - female avg) / male avg * 100
            maleAverageSalary: Number,
            femaleAverageSalary: Number,
            nationalityPayGap: Number,
            saudiAverageSalary: Number,
            nonSaudiAverageSalary: Number
        },

        // Compa-Ratio (Actual vs Market)
        compaRatio: {
            overall: Number,
            byDepartment: [{
                department: String,
                compaRatio: Number
            }],
            byPosition: [{
                position: String,
                compaRatio: Number
            }]
        },

        // Salary Changes
        salaryChanges: {
            increases: Number,
            decreases: Number,
            averageIncreasePercentage: Number,
            totalIncreaseCost: Number,
            promotions: Number
        },

        // Benefits Utilization
        benefits: {
            totalBenefitsCost: Number,
            averageBenefitsPerEmployee: Number,
            benefitsCostPercentage: Number, // % of total compensation
            topUtilizedBenefits: [{
                benefit: String,
                utilizationRate: Number
            }]
        },

        // GOSI Contributions
        gosiContributions: {
            totalEmployeeContributions: Number,
            totalEmployerContributions: Number,
            totalContributions: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // 9. TRAINING ANALYTICS
    // ═══════════════════════════════════════════════════════════════
    training: {
        // Training Programs
        totalPrograms: Number,
        activePrograms: Number,
        completedPrograms: Number,

        // Participation
        totalParticipants: Number,
        uniqueEmployeesTrained: Number,
        trainingParticipationRate: Number, // (trained / total employees) * 100

        // Hours & Investment
        totalTrainingHours: Number,
        averageHoursPerEmployee: Number,
        totalTrainingCost: Number,
        costPerEmployee: Number,
        costPerHour: Number,

        // Completion Metrics
        totalEnrollments: Number,
        completions: Number,
        dropouts: Number,
        completionRate: Number,
        averageCompletionTime: Number,

        // By Type
        byType: [{
            trainingType: String,
            programs: Number,
            participants: Number,
            hours: Number,
            cost: Number
        }],

        // By Department
        byDepartment: [{
            department: String,
            employeesTrained: Number,
            trainingHours: Number,
            cost: Number,
            participationRate: Number
        }],

        // Effectiveness
        effectiveness: {
            averageRating: Number,
            averageSatisfactionScore: Number,
            knowledgeGainScore: Number,
            skillImprovementScore: Number,
            postTrainingPerformanceImprovement: Number
        },

        // Skills Development
        skillsGained: [{
            skill: String,
            employeesTrained: Number,
            proficiencyGained: Number
        }],

        // ROI
        trainingROI: {
            totalInvestment: Number,
            estimatedReturn: Number,
            roiPercentage: Number
        },

        // Certification
        certifications: {
            totalCertifications: Number,
            employeesWithCertifications: Number,
            expiringCertifications: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // COMPARISON DATA (MoM, YoY)
    // ═══════════════════════════════════════════════════════════════
    comparison: {
        previousPeriodId: { type: Schema.Types.ObjectId, ref: 'HRAnalyticsSnapshot' },
        yearAgoPeriodId: { type: Schema.Types.ObjectId, ref: 'HRAnalyticsSnapshot' },

        changes: {
            headcountChange: Number,
            headcountChangePercentage: Number,
            turnoverRateChange: Number,
            absenteeismRateChange: Number,
            averageSalaryChange: Number,
            averageSalaryChangePercentage: Number,
            performanceScoreChange: Number,
            saudizationChange: Number
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // META DATA
    // ═══════════════════════════════════════════════════════════════
    metadata: {
        generatedAt: { type: Date, default: Date.now },
        generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        generationDuration: Number, // milliseconds
        dataQuality: {
            completeness: Number, // percentage
            accuracy: Number,
            missingFields: [String],
            warnings: [String]
        },
        calculationNotes: [String]
    },

    // Multi-tenancy
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
hrAnalyticsSnapshotSchema.index({ firmId: 1, snapshotType: 1, snapshotDate: -1 });
hrAnalyticsSnapshotSchema.index({ firmId: 1, 'period.year': 1, 'period.month': 1 });
hrAnalyticsSnapshotSchema.index({ snapshotDate: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════
hrAnalyticsSnapshotSchema.pre('save', async function(next) {
    if (this.isNew && !this.snapshotId) {
        const date = this.snapshotDate || new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const count = await this.constructor.countDocuments({
            firmId: this.firmId,
            snapshotDate: this.snapshotDate
        });
        this.snapshotId = `SNAP-${this.snapshotType.toUpperCase()}-${dateStr}-${String(count + 1).padStart(3, '0')}`;
    }
    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Get latest snapshot
hrAnalyticsSnapshotSchema.statics.getLatest = function(firmId, snapshotType) {
    return this.findOne({
        firmId,
        ...(snapshotType && { snapshotType })
    }).sort({ snapshotDate: -1 });
};

// Get snapshot by period
hrAnalyticsSnapshotSchema.statics.getByPeriod = function(firmId, year, month, quarter) {
    const query = { firmId };
    if (year) query['period.year'] = year;
    if (month) query['period.month'] = month;
    if (quarter) query['period.quarter'] = quarter;

    return this.findOne(query).sort({ snapshotDate: -1 });
};

// Get trend data
hrAnalyticsSnapshotSchema.statics.getTrend = async function(firmId, snapshotType, limit = 12) {
    return this.find({ firmId, snapshotType })
        .sort({ snapshotDate: -1 })
        .limit(limit)
        .select('snapshotDate demographics.totalEmployees turnover.turnoverRate absenteeism.absenteeismRate performance.averageOverallScore compensation.averageSalary');
};

module.exports = mongoose.model('HRAnalyticsSnapshot', hrAnalyticsSnapshotSchema);
