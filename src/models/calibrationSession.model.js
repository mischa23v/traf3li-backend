const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/**
 * Calibration Session Model
 * Used for performance review calibration across teams/departments
 */

// Participant Schema
const ParticipantSchema = new Schema({
    participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: String,
    nameAr: String,
    role: String,
    department: String,
    isLeader: { type: Boolean, default: false }
}, { _id: false });

// Rating Distribution Schema
const RatingDistributionSchema = new Schema({
    rating: {
        type: String,
        enum: ['exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory'],
        required: true
    },
    count: { type: Number, default: 0 },
    targetPercentage: { type: Number, default: 0 },
    actualPercentage: { type: Number, default: 0 },
    withinTarget: { type: Boolean, default: false }
}, { _id: false });

// Review Adjustment Schema
const ReviewAdjustmentSchema = new Schema({
    reviewId: { type: Schema.Types.ObjectId, ref: 'PerformanceReview', required: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: String,
    employeeNameAr: String,

    originalRating: {
        type: String,
        enum: ['exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory']
    },
    originalScore: Number,

    adjustedRating: {
        type: String,
        enum: ['exceptional', 'exceeds_expectations', 'meets_expectations', 'needs_improvement', 'unsatisfactory']
    },
    adjustedScore: Number,

    wasAdjusted: { type: Boolean, default: false },
    adjustmentReason: String,

    comparativeRanking: Number,
    discussionNotes: String,

    adjustedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    adjustedAt: Date
}, { _id: false });

// Main Calibration Session Schema
const CalibrationSessionSchema = new Schema({
    sessionId: {
        type: String,
        unique: true,
        required: true
    },

    // Basic Info
    sessionName: { type: String, required: true },
    sessionNameAr: String,

    description: String,
    descriptionAr: String,

    // Period
    periodYear: { type: Number, required: true, index: true },
    periodQuarter: Number,

    reviewType: {
        type: String,
        enum: ['annual', 'mid_year', 'quarterly', 'probation', 'project', 'ad_hoc'],
        required: true
    },

    // Scope
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    departmentName: String,
    departmentNameAr: String,

    // Covers multiple departments
    departments: [{
        departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
        name: String,
        nameAr: String
    }],

    // Status
    status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'scheduled',
        index: true
    },

    // Schedule
    scheduledDate: { type: Date, required: true },
    scheduledEndTime: Date,
    actualStartTime: Date,
    actualEndTime: Date,

    // Location/Meeting
    meetingLocation: String,
    meetingLink: String, // Virtual meeting URL

    // Participants
    participants: [ParticipantSchema],
    facilitator: {
        participantId: { type: Schema.Types.ObjectId, ref: 'User' },
        name: String,
        nameAr: String
    },

    // Reviews to calibrate
    reviewsIncluded: [{ type: Schema.Types.ObjectId, ref: 'PerformanceReview' }],
    totalReviewsCount: { type: Number, default: 0 },

    // Review adjustments
    reviewAdjustments: [ReviewAdjustmentSchema],

    // Rating Distribution
    ratingDistribution: [RatingDistributionSchema],

    // Target Distribution (Forced ranking)
    targetDistribution: {
        exceptional: { type: Number, default: 10 }, // 10%
        exceeds_expectations: { type: Number, default: 20 }, // 20%
        meets_expectations: { type: Number, default: 50 }, // 50%
        needs_improvement: { type: Number, default: 15 }, // 15%
        unsatisfactory: { type: Number, default: 5 } // 5%
    },

    enforceDistribution: { type: Boolean, default: false },

    // Statistics
    statistics: {
        totalReviews: { type: Number, default: 0 },
        reviewsAdjusted: { type: Number, default: 0 },
        adjustmentRate: { type: Number, default: 0 },
        averageScoreBefore: Number,
        averageScoreAfter: Number,
        distributionMet: { type: Boolean, default: false }
    },

    // Discussion Topics
    discussionTopics: [{
        topic: String,
        notes: String,
        decisions: String
    }],

    // Action Items
    actionItems: [{
        action: String,
        assignee: String,
        dueDate: Date,
        status: { type: String, enum: ['pending', 'completed'], default: 'pending' }
    }],

    // Session Notes
    notes: String,
    notesAr: String,

    // Decisions made
    keyDecisions: [String],

    // Completion
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Multi-tenancy
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // Audit
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }

}, {
    timestamps: true
});

// Indexes
CalibrationSessionSchema.index({ firmId: 1, periodYear: 1, status: 1 });
CalibrationSessionSchema.index({ firmId: 1, departmentId: 1, periodYear: 1 });
CalibrationSessionSchema.index({ firmId: 1, scheduledDate: 1 });

// Pre-save hook
CalibrationSessionSchema.pre('save', async function(next) {
    if (this.isNew && !this.sessionId) {
        const count = await mongoose.model('CalibrationSession').countDocuments({
            firmId: this.firmId,
            periodYear: this.periodYear
        });
        this.sessionId = `CAL-${this.periodYear}-${String(count + 1).padStart(3, '0')}`;
    }

    // Update total reviews count
    if (this.reviewsIncluded) {
        this.totalReviewsCount = this.reviewsIncluded.length;
    }

    this.updatedAt = new Date();
    next();
});

// Method: Calculate rating distribution
CalibrationSessionSchema.methods.calculateDistribution = function() {
    if (!this.reviewAdjustments || this.reviewAdjustments.length === 0) return;

    const distribution = {
        exceptional: 0,
        exceeds_expectations: 0,
        meets_expectations: 0,
        needs_improvement: 0,
        unsatisfactory: 0
    };

    // Count adjusted ratings (or original if not adjusted)
    this.reviewAdjustments.forEach(adj => {
        const rating = adj.adjustedRating || adj.originalRating;
        if (rating && distribution.hasOwnProperty(rating)) {
            distribution[rating]++;
        }
    });

    const total = this.reviewAdjustments.length;

    // Update rating distribution
    this.ratingDistribution = Object.entries(distribution).map(([rating, count]) => {
        const targetPct = this.targetDistribution?.[rating] || 0;
        const actualPct = total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;

        return {
            rating,
            count,
            targetPercentage: targetPct,
            actualPercentage: actualPct,
            withinTarget: Math.abs(actualPct - targetPct) <= 5 // Within 5% tolerance
        };
    });

    // Check if distribution is met
    const allWithinTarget = this.ratingDistribution.every(r => r.withinTarget);

    // Update statistics
    const adjustedCount = this.reviewAdjustments.filter(a => a.wasAdjusted).length;
    this.statistics = {
        ...this.statistics,
        totalReviews: total,
        reviewsAdjusted: adjustedCount,
        adjustmentRate: total > 0 ? parseFloat(((adjustedCount / total) * 100).toFixed(1)) : 0,
        distributionMet: allWithinTarget
    };

    return this.ratingDistribution;
};

// Method: Add review to session
CalibrationSessionSchema.methods.addReview = function(reviewId) {
    if (!this.reviewsIncluded.includes(reviewId)) {
        this.reviewsIncluded.push(reviewId);
        this.totalReviewsCount = this.reviewsIncluded.length;
    }
    return this;
};

// Method: Remove review from session
CalibrationSessionSchema.methods.removeReview = function(reviewId) {
    this.reviewsIncluded = this.reviewsIncluded.filter(
        id => id.toString() !== reviewId.toString()
    );
    this.totalReviewsCount = this.reviewsIncluded.length;
    return this;
};

// Static: Get upcoming sessions
CalibrationSessionSchema.statics.getUpcomingSessions = function(firmId, days = 30) {
    const future = new Date();
    future.setDate(future.getDate() + days);

    return this.find({
        firmId,
        status: 'scheduled',
        scheduledDate: {
            $gte: new Date(),
            $lte: future
        }
    })
    .populate('departmentId', 'name nameAr')
    .sort({ scheduledDate: 1 });
};

// Static: Get by period
CalibrationSessionSchema.statics.getByPeriod = function(firmId, year, quarter) {
    const query = {
        firmId,
        periodYear: year
    };

    if (quarter) {
        query.periodQuarter = quarter;
    }

    return this.find(query)
        .populate('departmentId', 'name nameAr')
        .populate('reviewsIncluded', 'reviewId employeeName finalRating overallScore')
        .sort({ scheduledDate: -1 });
};

module.exports = mongoose.model('CalibrationSession', CalibrationSessionSchema);
