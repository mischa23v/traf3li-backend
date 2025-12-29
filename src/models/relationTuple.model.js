/**
 * Relation Tuple Model - Zanzibar-Style Relationships
 *
 * Implements Google Zanzibar / Ory Keto style relation tuples:
 * - Subject-Relation-Object triples
 * - Namespace-based organization
 * - Computed/inherited relations
 * - Efficient permission checks and reverse lookups
 *
 * Format: namespace:object#relation@subject
 * Example: cases:case_123#assignee@user:user_456
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// RELATION TUPLE SCHEMA
// ═══════════════════════════════════════════════════════════════

const relationTupleSchema = new mongoose.Schema({
    // Firm scope (multi-tenancy)
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
     },


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    // Object (the resource)
    namespace: {
        type: String,
        required: true,
        index: true
    },
    object: {
        type: String,   // Object ID (e.g., 'case_123')
        required: true
    },

    // Relation
    relation: {
        type: String,   // e.g., 'owner', 'assignee', 'viewer'
        required: true,
        index: true
    },

    // Subject (who has the relation)
    subjectNamespace: {
        type: String,   // e.g., 'user', 'role', 'group'
        default: 'user'
    },
    subjectObject: {
        type: String,   // e.g., 'user_456' or 'lawyer'
        required: true
    },
    subjectRelation: String, // Optional: for subject sets (e.g., 'member')

    // Metadata
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    expiresAt: Date,      // Optional expiration
    metadata: mongoose.Schema.Types.Mixed  // Additional context
}, {
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

// Primary lookup: object-relation-subject
relationTupleSchema.index({
    firmId: 1,
    namespace: 1,
    object: 1,
    relation: 1,
    subjectNamespace: 1,
    subjectObject: 1
}, { unique: true });

// Reverse lookup: find all objects a subject has access to
relationTupleSchema.index({
    firmId: 1,
    subjectNamespace: 1,
    subjectObject: 1,
    namespace: 1,
    relation: 1
});

// Namespace + relation lookup
relationTupleSchema.index({
    firmId: 1,
    namespace: 1,
    relation: 1
});

// TTL index for expired tuples
relationTupleSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, partialFilterExpression: { expiresAt: { $exists: true } } }
);

// ═══════════════════════════════════════════════════════════════
// VIRTUAL PROPERTIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get tuple in Zanzibar string format
 */
relationTupleSchema.virtual('tupleString').get(function() {
    const subject = this.subjectRelation
        ? `${this.subjectNamespace}:${this.subjectObject}#${this.subjectRelation}`
        : `${this.subjectNamespace}:${this.subjectObject}`;
    return `${this.namespace}:${this.object}#${this.relation}@${subject}`;
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a relation tuple
 */
relationTupleSchema.statics.createTuple = async function(firmId, tuple, createdBy) {
    const existing = await this.findOne({
        firmId,
        namespace: tuple.namespace,
        object: tuple.object,
        relation: tuple.relation,
        subjectNamespace: tuple.subjectNamespace || 'user',
        subjectObject: tuple.subjectObject
    });

    if (existing) {
        // Update metadata if exists
        existing.metadata = { ...existing.metadata, ...tuple.metadata };
        existing.expiresAt = tuple.expiresAt;
        await existing.save();
        return existing;
    }

    return this.create({
        firmId,
        ...tuple,
        subjectNamespace: tuple.subjectNamespace || 'user',
        createdBy
    });
};

/**
 * Delete a relation tuple
 */
relationTupleSchema.statics.deleteTuple = async function(firmId, tuple) {
    return this.deleteOne({
        firmId,
        namespace: tuple.namespace,
        object: tuple.object,
        relation: tuple.relation,
        subjectNamespace: tuple.subjectNamespace || 'user',
        subjectObject: tuple.subjectObject
    });
};

/**
 * Check if a relation exists (direct check)
 */
relationTupleSchema.statics.checkDirect = async function(firmId, tuple) {
    const exists = await this.exists({
        firmId,
        namespace: tuple.namespace,
        object: tuple.object,
        relation: tuple.relation,
        subjectNamespace: tuple.subjectNamespace || 'user',
        subjectObject: tuple.subjectObject,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
        ]
    });

    return !!exists;
};

/**
 * Get all subjects with a relation to an object
 */
relationTupleSchema.statics.getSubjects = async function(firmId, namespace, object, relation) {
    const tuples = await this.find({
        firmId,
        namespace,
        object,
        relation,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
        ]
    }).lean();

    return tuples.map(t => ({
        namespace: t.subjectNamespace,
        object: t.subjectObject,
        relation: t.subjectRelation
    }));
};

/**
 * Get all objects a subject has access to (reverse lookup)
 */
relationTupleSchema.statics.getObjects = async function(firmId, subjectNamespace, subjectObject, options = {}) {
    const query = {
        firmId,
        subjectNamespace,
        subjectObject,
        $or: [
            { expiresAt: { $exists: false } },
            { expiresAt: { $gt: new Date() } }
        ]
    };

    if (options.namespace) {
        query.namespace = options.namespace;
    }

    if (options.relation) {
        query.relation = options.relation;
    }

    const tuples = await this.find(query).lean();

    return tuples.map(t => ({
        namespace: t.namespace,
        object: t.object,
        relation: t.relation
    }));
};

/**
 * Expand a userset (get all subjects through computed relations)
 */
relationTupleSchema.statics.expand = async function(firmId, namespace, object, relation, namespaceConfig) {
    const results = new Set();

    // Get direct relations
    const direct = await this.getSubjects(firmId, namespace, object, relation);
    direct.forEach(s => results.add(JSON.stringify(s)));

    // Check for computed usersets in namespace config
    if (namespaceConfig) {
        const relationConfig = namespaceConfig.relations?.find(r => r.name === relation);

        if (relationConfig?.computedUserset) {
            // Recursively expand the computed userset
            const computed = await this.expand(
                firmId,
                namespace,
                object,
                relationConfig.computedUserset,
                namespaceConfig
            );
            computed.forEach(s => results.add(JSON.stringify(s)));
        }
    }

    // Expand subject sets (e.g., role:lawyer#member)
    for (const subject of direct) {
        if (subject.relation) {
            const subjectMembers = await this.getSubjects(
                firmId,
                subject.namespace,
                subject.object,
                subject.relation
            );
            subjectMembers.forEach(s => results.add(JSON.stringify(s)));
        }
    }

    return Array.from(results).map(s => JSON.parse(s));
};

/**
 * Delete all tuples for an object
 */
relationTupleSchema.statics.deleteForObject = async function(firmId, namespace, object) {
    return this.deleteMany({ firmId, namespace, object });
};

/**
 * Delete all tuples for a subject
 */
relationTupleSchema.statics.deleteForSubject = async function(firmId, subjectNamespace, subjectObject) {
    return this.deleteMany({ firmId, subjectNamespace, subjectObject });
};

/**
 * Transfer ownership/relations to another subject
 */
relationTupleSchema.statics.transferRelations = async function(
    firmId,
    fromSubject,
    toSubject,
    options = {}
) {
    const query = {
        firmId,
        subjectNamespace: fromSubject.namespace || 'user',
        subjectObject: fromSubject.object
    };

    if (options.namespace) {
        query.namespace = options.namespace;
    }

    if (options.relations) {
        query.relation = { $in: options.relations };
    }

    const tuples = await this.find(query);

    const transferred = [];
    for (const tuple of tuples) {
        // Create new tuple for target subject
        const newTuple = await this.createTuple(firmId, {
            namespace: tuple.namespace,
            object: tuple.object,
            relation: tuple.relation,
            subjectNamespace: toSubject.namespace || 'user',
            subjectObject: toSubject.object,
            metadata: {
                ...tuple.metadata,
                transferredFrom: fromSubject.object,
                transferredAt: new Date()
            }
        }, tuple.createdBy);

        transferred.push(newTuple);

        // Delete old tuple if not keeping
        if (!options.keepOriginal) {
            await tuple.deleteOne();
        }
    }

    return transferred;
};

/**
 * Bulk create tuples
 */
relationTupleSchema.statics.createMany = async function(firmId, tuples, createdBy) {
    const operations = tuples.map(tuple => ({
        updateOne: {
            filter: {
                firmId,
                namespace: tuple.namespace,
                object: tuple.object,
                relation: tuple.relation,
                subjectNamespace: tuple.subjectNamespace || 'user',
                subjectObject: tuple.subjectObject
            },
            update: {
                $set: {
                    ...tuple,
                    subjectNamespace: tuple.subjectNamespace || 'user',
                    createdBy
                },
                $setOnInsert: { createdAt: new Date() }
            },
            upsert: true
        }
    }));

    return this.bulkWrite(operations);
};

/**
 * Get statistics for a firm
 */
relationTupleSchema.statics.getStats = async function(firmId) {
    const stats = await this.aggregate([
        { $match: { firmId: new mongoose.Types.ObjectId(firmId) } },
        {
            $group: {
                _id: { namespace: '$namespace', relation: '$relation' },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: '$_id.namespace',
                relations: {
                    $push: {
                        relation: '$_id.relation',
                        count: '$count'
                    }
                },
                total: { $sum: '$count' }
            }
        }
    ]);

    return {
        byNamespace: stats,
        total: stats.reduce((sum, ns) => sum + ns.total, 0)
    };
};

const RelationTuple = mongoose.model('RelationTuple', relationTupleSchema);

module.exports = RelationTuple;
