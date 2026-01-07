const express = require('express');
const { userMiddleware } = require('../middlewares');
const { auditAction } = require('../middlewares/auditLog.middleware');
const { cacheResponse, invalidateCache } = require('../middlewares/cache.middleware');
const { sanitizeObjectId } = require('../utils/securityUtils');

const {
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,
    listRepositories,
    getRepository,
    listIssues,
    createIssue,
    listPullRequests,
    createPullRequestComment,
    updateSettings,
    handleWebhook
} = require('../controllers/github.controller');

const app = express.Router();

// Cache TTL: 300 seconds (5 minutes) for GitHub endpoints
const GITHUB_CACHE_TTL = 300;

// Cache invalidation patterns for GitHub mutations
const githubInvalidationPatterns = [
    'github:firm:{firmId}:*',
    'dashboard:firm:{firmId}:*'
];

// ═══════════════════════════════════════════════════════════════
// OAUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/auth',
    userMiddleware,
    getAuthUrl
);

app.get('/callback',
    auditAction('connect', 'github_integration'),
    invalidateCache(githubInvalidationPatterns),
    handleCallback
);

app.post('/disconnect',
    userMiddleware,
    auditAction('disconnect', 'github_integration', { severity: 'medium' }),
    invalidateCache(githubInvalidationPatterns),
    disconnect
);

app.get('/status',
    userMiddleware,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:status`;
    }),
    getStatus
);

// ═══════════════════════════════════════════════════════════════
// REPOSITORY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/repositories',
    userMiddleware,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:repos:url:${req.originalUrl}`;
    }),
    listRepositories
);

app.get('/repositories/:owner/:repo',
    userMiddleware,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:repo:${req.params.owner}:${req.params.repo}`;
    }),
    getRepository
);

// ═══════════════════════════════════════════════════════════════
// ISSUE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/repositories/:owner/:repo/issues',
    userMiddleware,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:issues:${req.params.owner}:${req.params.repo}:url:${req.originalUrl}`;
    }),
    listIssues
);

app.post('/repositories/:owner/:repo/issues',
    userMiddleware,
    auditAction('create', 'github_issue'),
    invalidateCache([
        'github:firm:{firmId}:issues:*'
    ]),
    createIssue
);

// ═══════════════════════════════════════════════════════════════
// PULL REQUEST ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/repositories/:owner/:repo/pulls',
    userMiddleware,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:pulls:${req.params.owner}:${req.params.repo}:url:${req.originalUrl}`;
    }),
    listPullRequests
);

app.post('/repositories/:owner/:repo/pulls/:prNumber/comments',
    userMiddleware,
    auditAction('create', 'github_pr_comment'),
    createPullRequestComment
);

// ═══════════════════════════════════════════════════════════════
// SETTINGS ENDPOINT
// ═══════════════════════════════════════════════════════════════

app.put('/settings',
    userMiddleware,
    auditAction('update', 'github_settings'),
    invalidateCache([
        'github:firm:{firmId}:status'
    ]),
    updateSettings
);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINT
// ═══════════════════════════════════════════════════════════════

app.post('/webhook',
    // Note: Webhook endpoint may need special handling for firmId
    // GitHub doesn't send firmId, so it might need to be in the webhook URL
    // or derived from the payload
    handleWebhook
);

module.exports = app;
