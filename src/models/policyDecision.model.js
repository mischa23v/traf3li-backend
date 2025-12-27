/**
 * Policy Decision Model - Authorization Audit Trail
 *
 * Inspired by OPA (Open Policy Agent) decision logs:
 * - Complete audit trail of all authorization decisions
 * - Request context preservation
 * - Policy evaluation details
 * - Performance metrics
 * - Compliance reporting
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// POLICY DECISION SCHEMA
// ═══════════════════════════════════════════════════════════════

const policyDecisionSchema = new mongoose.Schema({
    // Firm scope
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },

    // Decision ID for reference
    decisionId: {
        type: String,
        required: true,
        unique: true,
        default: () => `dec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    },

    // Request details (what was requested)
    request: {
        // Subject making the request
        subject: {
            userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            role: String,
            roles: [String],          // Effective roles including inherited
            attributes: mongoose.Schema.Types.Mixed  // Additional subject attributes
        },

        // Resource being accessed
        resource: {
            namespace: { type: String, required: true },
            type: String,
            id: String,
            attributes: mongoose.Schema.Types.Mixed  // Resource attributes for ABAC
        },

        // Action being performed
        action: {
            type: String,
            required: true
        },

        // Request context
        context: {
            ipAddress: String,
            userAgent: String,
            requestPath: String,
            requestMethod: String,
            timestamp: { type: Date, default: Date.now }
        }
    },

    // Decision result
    decision: {
        allowed: { type: Boolean, required: true },
        reason: String,               // Human-readable reason
        reasonCode: String,           // Machine-readable code
        effect: {
            type: String,
            enum: ['allow', 'deny', 'not_applicable'],
            required: true
        }
    },

    // Policies evaluated
    policiesEvaluated: [{
        policyId: String,
        policyName: String,
        effect: { type: String, enum: ['allow', 'deny'] },
        matched: Boolean,
        priority: Number,
        conditions: [{
            field: String,
            operator: String,
            expected: mongoose.Schema.Types.Mixed,
            actual: mongoose.Schema.Types.Mixed,
            result: Boolean
        }]
    }],

    // Relation tuples checked (for ReBAC)
    relationsChecked: [{
        namespace: String,
        object: String,
        relation: String,
        subject: String,
        found: Boolean,
        path: [String]    // For transitive relations, the path taken
    }],

    // Decision strategy used
    decisionStrategy: {
        type: String,
        enum: ['unanimous', 'affirmative', 'consensus'],
        default: 'affirmative'
    },

    // Performance metrics
    metrics: {
        evaluationTimeMs: Number,     // Total evaluation time
        policiesChecked: Number,      // Number of policies checked
        relationsChecked: Number,     // Number of relation tuples checked
        cacheHit: Boolean,            // Whether result was from cache
        depth: Number                 // Recursion depth for computed relations
    },

    // Error information (if evaluation failed)
    error: {
        occurred: { type: Boolean, default: false },
        code: String,
        message: String,
        stack: String
    },

    // Tags for categorization
    tags: [String],

    // Revision info
    configVersion: Number    // Permission config version at time of decision
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Primary lookup indexes
policyDecisionSchema.index({ firmId: 1, createdAt: -1 });
policyDecisionSchema.index({ firmId: 1, 'request.subject.userId': 1, createdAt: -1 });
policyDecisionSchema.index({ firmId: 1, 'request.resource.namespace': 1, createdAt: -1 });
policyDecisionSchema.index({ firmId: 1, 'decision.allowed': 1, createdAt: -1 });

// Error tracking
policyDecisionSchema.index({ firmId: 1, 'error.occurred': 1, createdAt: -1 });

// TTL index for automatic cleanup (90 days by default)
policyDecisionSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Log a policy decision
 */
policyDecisionSchema.statics.log = async function(data) {
    return this.create(data);
};

/**
 * Get decisions for a user
 */
policyDecisionSchema.statics.getForUser = async function(firmId, userId, options = {}) {
    const query = {
        firmId,
        'request.subject.userId': userId
    };

    if (options.allowed !== undefined) {
        query['decision.allowed'] = options.allowed;
    }

    if (options.namespace) {
        query['request.resource.namespace'] = options.namespace;
    }

    if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
        if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0)
        .lean();
};

/**
 * Get decisions for a resource
 */
policyDecisionSchema.statics.getForResource = async function(firmId, namespace, resourceId, options = {}) {
    const query = {
        firmId,
        'request.resource.namespace': namespace
    };

    if (resourceId) {
        query['request.resource.id'] = resourceId;
    }

    if (options.allowed !== undefined) {
        query['decision.allowed'] = options.allowed;
    }

    if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
        if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .skip(options.skip || 0)
        .lean();
};

/**
 * Get denied access attempts (security monitoring)
 */
policyDecisionSchema.statics.getDeniedAttempts = async function(firmId, options = {}) {
    const query = {
        firmId,
        'decision.allowed': false
    };

    if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
        if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
    }

    if (options.userId) {
        query['request.subject.userId'] = options.userId;
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 100)
        .populate('request.subject.userId', 'firstName lastName email')
        .lean();
};

/**
 * Get decision statistics
 */
policyDecisionSchema.statics.getStats = async function(firmId, options = {}) {
    const startDate = options.startDate
        ? new Date(options.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate ? new Date(options.endDate) : new Date();

    const stats = await this.aggregate([
        {
            $match: {
                firmId: new mongoose.Types.ObjectId(firmId),
                createdAt: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $facet: {
                // Overall stats
                overall: [
                    {
                        $group: {
                            _id: null,
                            total: { $sum: 1 },
                            allowed: { $sum: { $cond: ['$decision.allowed', 1, 0] } },
                            denied: { $sum: { $cond: ['$decision.allowed', 0, 1] } },
                            errors: { $sum: { $cond: ['$error.occurred', 1, 0] } },
                            avgEvaluationTimeMs: { $avg: '$metrics.evaluationTimeMs' },
                            cacheHits: { $sum: { $cond: ['$metrics.cacheHit', 1, 0] } }
                        }
                    }
                ],

                // By namespace
                byNamespace: [
                    {
                        $group: {
                            _id: '$request.resource.namespace',
                            total: { $sum: 1 },
                            allowed: { $sum: { $cond: ['$decision.allowed', 1, 0] } },
                            denied: { $sum: { $cond: ['$decision.allowed', 0, 1] } }
                        }
                    },
                    { $sort: { total: -1 } }
                ],

                // By action
                byAction: [
                    {
                        $group: {
                            _id: '$request.action',
                            total: { $sum: 1 },
                            allowed: { $sum: { $cond: ['$decision.allowed', 1, 0] } },
                            denied: { $sum: { $cond: ['$decision.allowed', 0, 1] } }
                        }
                    },
                    { $sort: { total: -1 } }
                ],

                // Top denied users
                topDenied: [
                    { $match: { 'decision.allowed': false } },
                    {
                        $group: {
                            _id: '$request.subject.userId',
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ],

                // Timeline (hourly)
                timeline: [
                    {
                        $group: {
                            _id: {
                                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                                hour: { $hour: '$createdAt' }
                            },
                            total: { $sum: 1 },
                            denied: { $sum: { $cond: ['$decision.allowed', 0, 1] } }
                        }
                    },
                    { $sort: { '_id.date': 1, '_id.hour': 1 } },
                    { $limit: 168 } // Last 7 days hourly
                ]
            }
        }
    ]);

    return {
        ...stats[0].overall[0],
        byNamespace: stats[0].byNamespace,
        byAction: stats[0].byAction,
        topDenied: stats[0].topDenied,
        timeline: stats[0].timeline,
        period: { startDate, endDate }
    };
};

/**
 * Get compliance report
 */
policyDecisionSchema.statics.getComplianceReport = async function(firmId, options = {}) {
    const startDate = options.startDate
        ? new Date(options.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate ? new Date(options.endDate) : new Date();

    const decisions = await this.find({
        firmId,
        createdAt: { $gte: startDate, $lte: endDate }
    })
        .populate('request.subject.userId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .lean();

    // Group by day
    const byDay = {};
    decisions.forEach(d => {
        const day = d.createdAt.toISOString().split('T')[0];
        if (!byDay[day]) {
            byDay[day] = { total: 0, allowed: 0, denied: 0 };
        }
        byDay[day].total++;
        if (d.decision.allowed) {
            byDay[day].allowed++;
        } else {
            byDay[day].denied++;
        }
    });

    // Sensitive operations (denials on critical resources)
    const sensitiveOperations = decisions.filter(d =>
        !d.decision.allowed &&
        ['team', 'settings', 'reports'].includes(d.request.resource.namespace)
    );

    return {
        period: { startDate, endDate },
        summary: {
            totalDecisions: decisions.length,
            allowedCount: decisions.filter(d => d.decision.allowed).length,
            deniedCount: decisions.filter(d => !d.decision.allowed).length,
            errorCount: decisions.filter(d => d.error?.occurred).length
        },
        dailyBreakdown: byDay,
        sensitiveOperations: sensitiveOperations.slice(0, 100),
        generatedAt: new Date()
    };
};

/**
 * Export decisions for external analysis
 */
policyDecisionSchema.statics.exportDecisions = async function(firmId, options = {}) {
    const query = { firmId };

    if (options.startDate || options.endDate) {
        query.createdAt = {};
        if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
        if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
    }

    if (options.allowed !== undefined) {
        query['decision.allowed'] = options.allowed;
    }

    return this.find(query)
        .sort({ createdAt: -1 })
        .lean();
};

/**
 * Clean up old decisions (beyond retention period)
 */
policyDecisionSchema.statics.cleanup = async function(firmId, retentionDays = 90) {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    return this.deleteMany({
        firmId,
        createdAt: { $lt: cutoffDate }
    });
};

const PolicyDecision = mongoose.model('PolicyDecision', policyDecisionSchema);

module.exports = PolicyDecision;
