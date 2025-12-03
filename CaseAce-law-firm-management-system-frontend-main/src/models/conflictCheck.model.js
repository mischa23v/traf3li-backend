const mongoose = require('mongoose');

const conflictMatchSchema = new mongoose.Schema({
    partySearched: {
        type: String,
        required: true
    },
    matchedEntity: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['client', 'contact', 'organization', 'case_party'],
            required: true
        },
        entityType: String
    },
    matchScore: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    matchType: {
        type: String,
        enum: ['client', 'adverse_party', 'related_party', 'witness', 'previous_representation', 'business_relationship', 'family_relationship'],
        required: true
    },
    severity: {
        type: String,
        enum: ['critical', 'high', 'medium', 'low'],
        required: true
    },
    details: String,
    relatedCases: [{
        caseId: mongoose.Schema.Types.ObjectId,
        caseNumber: String,
        caseName: String,
        role: String,
        status: String
    }],
    relatedMatters: [{
        matterId: mongoose.Schema.Types.ObjectId,
        matterNumber: String,
        description: String
    }],
    notes: String,
    resolution: {
        status: {
            type: String,
            enum: ['cleared', 'flagged', 'waived']
        },
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolvedAt: Date,
        notes: String
    }
});

const partySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['individual', 'organization']
    },
    aliases: [String],
    identifiers: [{
        type: String,
        value: String
    }],
    relatedParties: [String]
});

const conflictCheckSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    entityType: {
        type: String,
        enum: ['client', 'case', 'matter'],
        required: true
    },
    entityId: mongoose.Schema.Types.ObjectId,
    parties: [partySchema],
    searchScope: {
        activeClients: { type: Boolean, default: true },
        formerClients: { type: Boolean, default: true },
        adverseParties: { type: Boolean, default: true },
        relatedParties: { type: Boolean, default: true },
        contacts: { type: Boolean, default: true },
        organizations: { type: Boolean, default: true }
    },
    status: {
        type: String,
        enum: ['pending', 'cleared', 'flagged', 'waived'],
        default: 'pending'
    },
    totalMatches: {
        type: Number,
        default: 0
    },
    matches: [conflictMatchSchema],
    clearanceNotes: String,
    waiverDetails: {
        waivedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        waivedAt: Date,
        reason: String,
        clientConsent: Boolean,
        consentDetails: String,
        expiresAt: Date,
        attachments: [String]
    },
    checkedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
conflictCheckSchema.index({ lawyerId: 1, status: 1 });
conflictCheckSchema.index({ lawyerId: 1, entityType: 1, entityId: 1 });

// Static method: Calculate match score using Levenshtein distance
conflictCheckSchema.statics.calculateMatchScore = function(str1, str2) {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 100;

    const m = s1.length;
    const n = s2.length;

    if (m === 0) return n === 0 ? 100 : 0;
    if (n === 0) return 0;

    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }

    const maxLen = Math.max(m, n);
    const distance = dp[m][n];
    return Math.round((1 - distance / maxLen) * 100);
};

// Static method: Determine severity
conflictCheckSchema.statics.determineSeverity = function(matchScore, matchType) {
    if (matchScore >= 95 && ['client', 'adverse_party'].includes(matchType)) {
        return 'critical';
    }
    if (matchScore >= 85 && ['client', 'adverse_party', 'previous_representation'].includes(matchType)) {
        return 'high';
    }
    if (matchScore >= 70) {
        return 'medium';
    }
    return 'low';
};

// Static method: Run conflict check
conflictCheckSchema.statics.runCheck = async function(lawyerId, parties, searchScope = {}) {
    const Client = mongoose.model('Client');
    const Contact = mongoose.model('Contact');
    const Organization = mongoose.model('Organization');
    const Case = mongoose.model('Case');

    const matches = [];
    const scope = {
        activeClients: true,
        formerClients: true,
        adverseParties: true,
        relatedParties: true,
        contacts: true,
        organizations: true,
        ...searchScope
    };

    for (const party of parties) {
        const searchNames = [party.name, ...(party.aliases || [])];

        for (const searchName of searchNames) {
            // Search clients
            if (scope.activeClients || scope.formerClients) {
                const clientQuery = { lawyerId };
                if (!scope.formerClients) {
                    clientQuery.status = 'active';
                }

                const clients = await Client.find(clientQuery);
                for (const client of clients) {
                    const score = this.calculateMatchScore(searchName, client.name || client.fullName);
                    if (score >= 60) {
                        matches.push({
                            partySearched: searchName,
                            matchedEntity: {
                                id: client._id,
                                name: client.name || client.fullName,
                                type: 'client'
                            },
                            matchScore: score,
                            matchType: 'client',
                            severity: this.determineSeverity(score, 'client')
                        });
                    }
                }
            }

            // Search contacts
            if (scope.contacts) {
                const contacts = await Contact.find({ lawyerId });
                for (const contact of contacts) {
                    const fullName = `${contact.firstName} ${contact.lastName}`;
                    const score = this.calculateMatchScore(searchName, fullName);
                    if (score >= 60) {
                        matches.push({
                            partySearched: searchName,
                            matchedEntity: {
                                id: contact._id,
                                name: fullName,
                                type: 'contact',
                                entityType: contact.category
                            },
                            matchScore: score,
                            matchType: contact.category === 'opposing_party' ? 'adverse_party' : 'related_party',
                            severity: this.determineSeverity(score, contact.category === 'opposing_party' ? 'adverse_party' : 'related_party')
                        });
                    }
                }
            }

            // Search organizations
            if (scope.organizations) {
                const organizations = await Organization.find({ lawyerId });
                for (const org of organizations) {
                    const score = this.calculateMatchScore(searchName, org.name);
                    if (score >= 60) {
                        matches.push({
                            partySearched: searchName,
                            matchedEntity: {
                                id: org._id,
                                name: org.name,
                                type: 'organization',
                                entityType: org.type
                            },
                            matchScore: score,
                            matchType: 'business_relationship',
                            severity: this.determineSeverity(score, 'business_relationship')
                        });
                    }
                }
            }
        }
    }

    // Sort by severity and score
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    matches.sort((a, b) => {
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
            return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.matchScore - a.matchScore;
    });

    return matches;
};

module.exports = mongoose.model('ConflictCheck', conflictCheckSchema);
