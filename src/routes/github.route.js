const express = require('express');
const { userMiddleware, firmFilter } = require('../middlewares');
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

/**
 * @openapi
 * /api/github/auth:
 *   get:
 *     summary: Get GitHub OAuth authorization URL
 *     description: Initiates GitHub OAuth flow by generating authorization URL
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authorization URL generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     authUrl:
 *                       type: string
 *                       example: https://github.com/login/oauth/authorize?...
 *                     state:
 *                       type: string
 *                       example: abc123def456
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/auth',
    userMiddleware,
    firmFilter,
    getAuthUrl
);

/**
 * @openapi
 * /api/github/callback:
 *   get:
 *     summary: Handle GitHub OAuth callback
 *     description: Exchanges authorization code for access token
 *     tags:
 *       - GitHub Integration
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: Authorization code from GitHub
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *         description: State token for CSRF protection
 *     responses:
 *       200:
 *         description: GitHub connected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: GitHub connected successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     githubUserId:
 *                       type: number
 *                     githubUsername:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
app.get('/callback',
    auditAction('connect', 'github_integration'),
    invalidateCache(githubInvalidationPatterns),
    handleCallback
);

/**
 * @openapi
 * /api/github/disconnect:
 *   post:
 *     summary: Disconnect GitHub integration
 *     description: Revokes GitHub access and disconnects the integration
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: GitHub disconnected successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: GitHub disconnected successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.post('/disconnect',
    userMiddleware,
    firmFilter,
    auditAction('disconnect', 'github_integration', { severity: 'medium' }),
    invalidateCache(githubInvalidationPatterns),
    disconnect
);

/**
 * @openapi
 * /api/github/status:
 *   get:
 *     summary: Get GitHub connection status
 *     description: Returns current connection status and metadata
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     githubUsername:
 *                       type: string
 *                     connectedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/status',
    userMiddleware,
    firmFilter,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:status`;
    }),
    getStatus
);

// ═══════════════════════════════════════════════════════════════
// REPOSITORY ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/github/repositories:
 *   get:
 *     summary: List user repositories
 *     description: Retrieves list of accessible GitHub repositories
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [all, public, private]
 *         description: Filter by repository visibility
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created, updated, pushed, full_name]
 *         description: Sort repositories by field
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Number of repositories per page
 *     responses:
 *       200:
 *         description: Repositories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/repositories',
    userMiddleware,
    firmFilter,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:repos:url:${req.originalUrl}`;
    }),
    listRepositories
);

/**
 * @openapi
 * /api/github/repositories/{owner}/{repo}:
 *   get:
 *     summary: Get repository details
 *     description: Retrieves detailed information about a specific repository
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *         description: Repository owner (username or organization)
 *       - in: path
 *         name: repo
 *         required: true
 *         schema:
 *           type: string
 *         description: Repository name
 *     responses:
 *       200:
 *         description: Repository details retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
app.get('/repositories/:owner/:repo',
    userMiddleware,
    firmFilter,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:repo:${req.params.owner}:${req.params.repo}`;
    }),
    getRepository
);

// ═══════════════════════════════════════════════════════════════
// ISSUE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/github/repositories/{owner}/{repo}/issues:
 *   get:
 *     summary: List repository issues
 *     description: Retrieves list of issues for a repository
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: repo
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [open, closed, all]
 *         description: Filter by issue state
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created, updated, comments]
 *         description: Sort issues by field
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of issues per page
 *     responses:
 *       200:
 *         description: Issues retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/repositories/:owner/:repo/issues',
    userMiddleware,
    firmFilter,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:issues:${req.params.owner}:${req.params.repo}:url:${req.originalUrl}`;
    }),
    listIssues
);

/**
 * @openapi
 * /api/github/repositories/{owner}/{repo}/issues:
 *   post:
 *     summary: Create issue
 *     description: Creates a new issue in the repository (for case tracking)
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: repo
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Case #12345: Client contract review"
 *               body:
 *                 type: string
 *                 example: "Review and update client contract terms"
 *               labels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["case", "legal"]
 *               assignees:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["username"]
 *     responses:
 *       201:
 *         description: Issue created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.post('/repositories/:owner/:repo/issues',
    userMiddleware,
    firmFilter,
    auditAction('create', 'github_issue'),
    invalidateCache([
        'github:firm:{firmId}:issues:*'
    ]),
    createIssue
);

// ═══════════════════════════════════════════════════════════════
// PULL REQUEST ENDPOINTS
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/github/repositories/{owner}/{repo}/pulls:
 *   get:
 *     summary: List pull requests
 *     description: Retrieves list of pull requests for a repository
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: repo
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *           enum: [open, closed, all]
 *         description: Filter by PR state
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created, updated, popularity, long-running]
 *         description: Sort pull requests by field
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort direction
 *       - in: query
 *         name: perPage
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of pull requests per page
 *     responses:
 *       200:
 *         description: Pull requests retrieved successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.get('/repositories/:owner/:repo/pulls',
    userMiddleware,
    firmFilter,
    cacheResponse(GITHUB_CACHE_TTL, (req) => {
        const sanitizedFirmId = sanitizeObjectId(req.firmId) || 'none';
        return `github:firm:${sanitizedFirmId}:pulls:${req.params.owner}:${req.params.repo}:url:${req.originalUrl}`;
    }),
    listPullRequests
);

/**
 * @openapi
 * /api/github/repositories/{owner}/{repo}/pulls/{prNumber}/comments:
 *   post:
 *     summary: Create pull request comment
 *     description: Adds a comment to a pull request
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: repo
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: prNumber
 *         required: true
 *         schema:
 *           type: integer
 *         description: Pull request number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - body
 *             properties:
 *               body:
 *                 type: string
 *                 example: "LGTM - reviewed for compliance"
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.post('/repositories/:owner/:repo/pulls/:prNumber/comments',
    userMiddleware,
    firmFilter,
    auditAction('create', 'github_pr_comment'),
    createPullRequestComment
);

// ═══════════════════════════════════════════════════════════════
// SETTINGS ENDPOINT
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/github/settings:
 *   put:
 *     summary: Update sync settings
 *     description: Updates GitHub integration sync settings
 *     tags:
 *       - GitHub Integration
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               autoSync:
 *                 type: boolean
 *               syncInterval:
 *                 type: string
 *                 enum: [manual, hourly, daily]
 *               notifications:
 *                 type: object
 *                 properties:
 *                   pushEvents:
 *                     type: boolean
 *                   issueEvents:
 *                     type: boolean
 *                   prEvents:
 *                     type: boolean
 *               caseTracking:
 *                 type: object
 *                 properties:
 *                   enabled:
 *                     type: boolean
 *                   tagPattern:
 *                     type: string
 *                     example: "#CASE-{number}"
 *                   autoLinkCommits:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
app.put('/settings',
    userMiddleware,
    firmFilter,
    auditAction('update', 'github_settings'),
    invalidateCache([
        'github:firm:{firmId}:status'
    ]),
    updateSettings
);

// ═══════════════════════════════════════════════════════════════
// WEBHOOK ENDPOINT
// ═══════════════════════════════════════════════════════════════

/**
 * @openapi
 * /api/github/webhook:
 *   post:
 *     summary: Handle GitHub webhook
 *     description: Receives and processes GitHub webhook events
 *     tags:
 *       - GitHub Integration
 *     parameters:
 *       - in: header
 *         name: X-GitHub-Event
 *         required: true
 *         schema:
 *           type: string
 *         description: GitHub event type
 *       - in: header
 *         name: X-Hub-Signature-256
 *         required: true
 *         schema:
 *           type: string
 *         description: Webhook signature for verification
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 */
app.post('/webhook',
    // Note: Webhook endpoint may need special handling for firmId
    // GitHub doesn't send firmId, so it might need to be in the webhook URL
    // or derived from the payload
    handleWebhook
);

module.exports = app;
