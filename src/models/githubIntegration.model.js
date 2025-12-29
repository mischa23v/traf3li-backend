const mongoose = require('mongoose');

/**
 * GitHub Integration Model
 *
 * Manages GitHub OAuth connections for law firms.
 * Enables case tracking, issue creation, and commit linking.
 */

// Repository schema
const repositorySchema = new mongoose.Schema({
    repoId: {
        type: Number,
        required: true
    },
    repoName: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    description: String,
    isPrivate: {
        type: Boolean,
        default: false
    },
    defaultBranch: {
        type: String,
        default: 'main'
    },
    url: String,
    htmlUrl: String,
    connectedAt: {
        type: Date,
        default: Date.now
    },
    isActive: {
        type: Boolean,
        default: true
    },
    webhookId: Number,
    webhookSecret: String,
    // Sync settings per repository
    syncSettings: {
        syncIssues: { type: Boolean, default: true },
        syncPullRequests: { type: Boolean, default: true },
        syncCommits: { type: Boolean, default: true },
        autoLinkCases: { type: Boolean, default: true },
        notifyOnPush: { type: Boolean, default: false },
        notifyOnIssue: { type: Boolean, default: true },
        notifyOnPR: { type: Boolean, default: true }
    }
}, { _id: true });

// Linked case/commit schema
const linkedCommitSchema = new mongoose.Schema({
    commitSha: {
        type: String,
        required: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true
    },
    repository: String,
    message: String,
    author: String,
    url: String,
    linkedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: true });

const githubIntegrationSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM & USER
    // ═══════════════════════════════════════════════════════════════
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
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // GITHUB CREDENTIALS (Encrypted)
    // ═══════════════════════════════════════════════════════════════
    accessToken: {
        type: String,
        required: true
        // Will be encrypted by plugin
    },
    refreshToken: {
        type: String,
        required: false
        // Will be encrypted by plugin
    },
    tokenType: {
        type: String,
        default: 'bearer'
    },
    scope: String,
    expiresAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // GITHUB USER INFO
    // ═══════════════════════════════════════════════════════════════
    githubUserId: {
        type: Number,
        required: true,
        index: true
    },
    githubUsername: {
        type: String,
        required: true
    },
    githubEmail: String,
    avatarUrl: String,
    profileUrl: String,
    githubName: String,
    company: String,
    location: String,
    bio: String,

    // ═══════════════════════════════════════════════════════════════
    // CONNECTED REPOSITORIES
    // ═══════════════════════════════════════════════════════════════
    repositories: [repositorySchema],

    // ═══════════════════════════════════════════════════════════════
    // LINKED COMMITS & CASES
    // ═══════════════════════════════════════════════════════════════
    linkedCommits: [linkedCommitSchema],

    // ═══════════════════════════════════════════════════════════════
    // SYNC SETTINGS
    // ═══════════════════════════════════════════════════════════════
    syncSettings: {
        autoSync: {
            type: Boolean,
            default: false
        },
        syncInterval: {
            type: String,
            enum: ['manual', 'hourly', 'daily'],
            default: 'manual'
        },
        notifications: {
            pushEvents: { type: Boolean, default: false },
            issueEvents: { type: Boolean, default: true },
            prEvents: { type: Boolean, default: true },
            commitComments: { type: Boolean, default: false },
            releaseEvents: { type: Boolean, default: false }
        },
        caseTracking: {
            enabled: { type: Boolean, default: true },
            tagPattern: {
                type: String,
                default: '#CASE-{number}'
            },
            autoCreateIssues: { type: Boolean, default: false },
            autoLinkCommits: { type: Boolean, default: true }
        },
        lastSync: {
            issues: Date,
            pullRequests: Date,
            commits: Date,
            webhooks: Date
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // STATUS
    // ═══════════════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true
    },
    connectedAt: {
        type: Date,
        default: Date.now
    },
    disconnectedAt: Date,
    lastSyncedAt: Date,
    lastRefreshedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    rateLimit: {
        remaining: Number,
        limit: Number,
        resetAt: Date
    }
}, {
    versionKey: false,
    timestamps: true
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════
githubIntegrationSchema.index({ firmId: 1, isActive: 1 });
githubIntegrationSchema.index({ firmId: 1, userId: 1 });
githubIntegrationSchema.index({ githubUserId: 1 });
githubIntegrationSchema.index({ 'repositories.repoId': 1 });
githubIntegrationSchema.index({ 'linkedCommits.caseId': 1 });
githubIntegrationSchema.index({ 'linkedCommits.commitSha': 1 });

// ═══════════════════════════════════════════════════════════════
// ENCRYPTION PLUGIN - Protect sensitive tokens
// ═══════════════════════════════════════════════════════════════
const encryptionPlugin = require('./plugins/encryption.plugin');

githubIntegrationSchema.plugin(encryptionPlugin, {
    fields: [
        'accessToken',
        'refreshToken'
    ],
    searchableFields: []
});

// ═══════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Add repository to integration
 */
githubIntegrationSchema.methods.addRepository = function(repoData) {
    const existing = this.repositories.find(r => r.repoId === repoData.id);
    if (existing) {
        return existing;
    }

    const repo = {
        repoId: repoData.id,
        repoName: repoData.name,
        fullName: repoData.full_name,
        owner: repoData.owner?.login || repoData.owner,
        description: repoData.description,
        isPrivate: repoData.private,
        defaultBranch: repoData.default_branch || 'main',
        url: repoData.url,
        htmlUrl: repoData.html_url,
        connectedAt: new Date(),
        isActive: true,
        syncSettings: {
            syncIssues: true,
            syncPullRequests: true,
            syncCommits: true,
            autoLinkCases: true,
            notifyOnPush: false,
            notifyOnIssue: true,
            notifyOnPR: true
        }
    };

    this.repositories.push(repo);
    return repo;
};

/**
 * Remove repository from integration
 */
githubIntegrationSchema.methods.removeRepository = function(repoId) {
    const index = this.repositories.findIndex(r => r.repoId === repoId);
    if (index > -1) {
        this.repositories.splice(index, 1);
        return true;
    }
    return false;
};

/**
 * Link commit to case
 */
githubIntegrationSchema.methods.linkCommitToCase = function(commitData, caseId) {
    const existing = this.linkedCommits.find(
        lc => lc.commitSha === commitData.sha && lc.caseId.toString() === caseId.toString()
    );

    if (existing) {
        return existing;
    }

    const linkedCommit = {
        commitSha: commitData.sha,
        caseId: caseId,
        repository: commitData.repository,
        message: commitData.message,
        author: commitData.author,
        url: commitData.url,
        linkedAt: new Date()
    };

    this.linkedCommits.push(linkedCommit);
    return linkedCommit;
};

/**
 * Get repository by ID
 */
githubIntegrationSchema.methods.getRepository = function(repoId) {
    return this.repositories.find(r => r.repoId === repoId);
};

/**
 * Update repository sync settings
 */
githubIntegrationSchema.methods.updateRepositorySettings = function(repoId, settings) {
    const repo = this.repositories.find(r => r.repoId === repoId);
    if (!repo) {
        throw new Error('Repository not found');
    }

    Object.assign(repo.syncSettings, settings);
    return repo;
};

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

/**
 * Get active integration by firm
 */
githubIntegrationSchema.statics.getByFirm = function(firmId) {
    return this.findOne({ firmId, isActive: true });
};

/**
 * Get integration by firm and user
 */
githubIntegrationSchema.statics.getByFirmAndUser = function(firmId, userId) {
    return this.findOne({ firmId, userId, isActive: true });
};

/**
 * Check if token is expired
 */
githubIntegrationSchema.methods.isTokenExpired = function() {
    if (!this.expiresAt) {
        return false; // GitHub tokens don't expire by default
    }
    return new Date() >= this.expiresAt;
};

/**
 * Get commits linked to a case
 */
githubIntegrationSchema.methods.getCommitsByCase = function(caseId) {
    return this.linkedCommits.filter(lc => lc.caseId.toString() === caseId.toString());
};

module.exports = mongoose.model('GithubIntegration', githubIntegrationSchema);
