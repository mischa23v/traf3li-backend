/**
 * GitHub Integration Service
 *
 * Provides comprehensive GitHub API integration for the TRAF3LI platform:
 * - OAuth 2.0 authentication flow
 * - Repository management
 * - Issue creation and tracking
 * - Pull request management
 * - Webhook handling for real-time updates
 * - Case-to-commit linking
 *
 * Features:
 * - Circuit breaker protection for resilience
 * - Secure token storage with encryption
 * - Comprehensive error handling and logging
 * - FirmId isolation for multi-tenancy
 */

const axios = require('axios');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/encryption');
const { withCircuitBreaker } = require('../utils/circuitBreaker');
const logger = require('../utils/logger');
const GithubIntegration = require('../models/githubIntegration.model');
const Case = require('../models/case.model');
const cacheService = require('./cache.service');

// Initialize environment variables
const {
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    GITHUB_REDIRECT_URI,
    BACKEND_URL,
    API_URL
} = process.env;

// GitHub API Configuration
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_AUTH_BASE = 'https://github.com';

const GITHUB_CONFIG = {
    clientId: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    redirectUri: GITHUB_REDIRECT_URI || `${BACKEND_URL || API_URL}/api/github/callback`,
    scopes: [
        'repo',           // Full control of private repositories
        'read:user',      // Read user profile data
        'user:email',     // Read user email addresses
        'write:repo_hook' // Write repository webhooks
    ]
};

// Rate limiting configuration
const RATE_LIMIT = {
    perHour: 5000,
    checkInterval: 60000 // Check every minute
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create GitHub API client with authentication
 * @param {string} accessToken - GitHub access token
 * @returns {Object} Axios instance
 */
function createGitHubClient(accessToken) {
    return axios.create({
        baseURL: GITHUB_API_BASE,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'TRAF3LI-LegalTech'
        }
    });
}

/**
 * Get authenticated client for a firm
 * @param {string} firmId - Firm ID
 * @returns {Promise<Object>} { client, integration }
 */
async function getAuthenticatedClient(firmId) {
    const integration = await GithubIntegration.findOne({ firmId, isActive: true });

    if (!integration) {
        throw new Error('GitHub not connected for this firm');
    }

    // Check if token is expired (though GitHub tokens don't expire by default)
    if (integration.isTokenExpired()) {
        throw new Error('GitHub token expired. Please reconnect.');
    }

    // Decrypt the access token
    const accessToken = decrypt(integration.accessToken);
    const client = createGitHubClient(accessToken);

    return { client, integration };
}

/**
 * Extract case number from text using pattern
 * @param {string} text - Text to search
 * @param {string} pattern - Pattern to match (e.g., "#CASE-{number}")
 * @returns {Array<string>} Array of case numbers
 */
function extractCaseNumbers(text, pattern = '#CASE-{number}') {
    if (!text) return [];

    // Convert pattern to regex
    // #CASE-{number} -> /#CASE-(\d+)/gi
    const regexPattern = pattern
        .replace(/\{number\}/g, '(\\d+)')
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\{number\\\}/g, '(\\d+)');

    const regex = new RegExp(regexPattern, 'gi');
    const matches = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
        matches.push(match[1]);
    }

    return matches;
}

// ═══════════════════════════════════════════════════════════════
// GITHUB SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

class GitHubService {
    constructor() {
        this.rateLimitCache = new Map();
    }

    /**
     * Check if GitHub is configured
     * @returns {boolean}
     */
    isConfigured() {
        return !!(GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET);
    }

    // ═══════════════════════════════════════════════════════════════
    // OAUTH FLOW
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate OAuth authorization URL
     * @param {string} firmId - Firm ID
     * @param {string} userId - User ID
     * @param {string} state - Optional state parameter
     * @returns {Promise<Object>} { authUrl, state }
     */
    async getAuthUrl(firmId, userId, state = null) {
        if (!this.isConfigured()) {
            throw new Error('GitHub not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.');
        }

        // Generate state token for security
        const stateToken = state || crypto.randomBytes(16).toString('hex');

        // Store state in cache for verification (15 minutes)
        await cacheService.set(
            `github:oauth:${stateToken}`,
            { firmId, userId },
            900
        );

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: GITHUB_CONFIG.clientId,
            redirect_uri: GITHUB_CONFIG.redirectUri,
            scope: GITHUB_CONFIG.scopes.join(' '),
            state: stateToken,
            allow_signup: 'false'
        });

        const authUrl = `${GITHUB_AUTH_BASE}/login/oauth/authorize?${params.toString()}`;

        logger.info('GitHub OAuth URL generated', { firmId, userId, state: stateToken });

        return {
            authUrl,
            state: stateToken
        };
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     * @param {string} code - Authorization code
     * @param {string} state - State parameter from authorization
     * @returns {Promise<Object>} Connection result
     */
    async exchangeCode(code, state) {
        if (!this.isConfigured()) {
            throw new Error('GitHub not configured');
        }

        // Retrieve and verify state
        const stateData = await cacheService.get(`github:oauth:${state}`);
        if (!stateData) {
            throw new Error('Invalid or expired state token');
        }

        const { firmId, userId } = stateData;

        return withCircuitBreaker('github', async () => {
            // Exchange code for access token
            const tokenResponse = await axios.post(
                `${GITHUB_AUTH_BASE}/login/oauth/access_token`,
                {
                    client_id: GITHUB_CONFIG.clientId,
                    client_secret: GITHUB_CONFIG.clientSecret,
                    code,
                    redirect_uri: GITHUB_CONFIG.redirectUri
                },
                {
                    headers: {
                        'Accept': 'application/json'
                    }
                }
            );

            const { access_token, token_type, scope } = tokenResponse.data;

            if (!access_token) {
                throw new Error('Failed to obtain access token from GitHub');
            }

            // Get user information
            const userClient = createGitHubClient(access_token);
            const userResponse = await userClient.get('/user');
            const githubUser = userResponse.data;

            // Encrypt tokens
            const encryptedAccessToken = encrypt(access_token);

            // Check if integration already exists
            let integration = await GithubIntegration.findOne({ firmId, userId });

            if (integration) {
                // Update existing integration
                integration.accessToken = encryptedAccessToken;
                integration.tokenType = token_type || 'bearer';
                integration.scope = scope;
                integration.githubUserId = githubUser.id;
                integration.githubUsername = githubUser.login;
                integration.githubEmail = githubUser.email;
                integration.avatarUrl = githubUser.avatar_url;
                integration.profileUrl = githubUser.html_url;
                integration.githubName = githubUser.name;
                integration.company = githubUser.company;
                integration.location = githubUser.location;
                integration.bio = githubUser.bio;
                integration.isActive = true;
                integration.connectedAt = new Date();
                integration.disconnectedAt = null;
            } else {
                // Create new integration
                integration = new GithubIntegration({
                    firmId,
                    userId,
                    accessToken: encryptedAccessToken,
                    tokenType: token_type || 'bearer',
                    scope,
                    githubUserId: githubUser.id,
                    githubUsername: githubUser.login,
                    githubEmail: githubUser.email,
                    avatarUrl: githubUser.avatar_url,
                    profileUrl: githubUser.html_url,
                    githubName: githubUser.name,
                    company: githubUser.company,
                    location: githubUser.location,
                    bio: githubUser.bio,
                    isActive: true,
                    connectedAt: new Date()
                });
            }

            await integration.save();

            // Delete state from cache
            await cacheService.del(`github:oauth:${state}`);

            logger.info('GitHub connection established', {
                firmId,
                userId,
                githubUserId: githubUser.id,
                githubUsername: githubUser.login
            });

            return {
                success: true,
                githubUserId: githubUser.id,
                githubUsername: githubUser.login,
                avatarUrl: githubUser.avatar_url
            };
        });
    }

    /**
     * Disconnect GitHub integration
     * @param {string} firmId - Firm ID
     * @returns {Promise<Object>} Disconnection result
     */
    async disconnect(firmId) {
        const integration = await GithubIntegration.findOne({ firmId, isActive: true });

        if (!integration) {
            throw new Error('GitHub not connected');
        }

        // Mark as disconnected
        integration.isActive = false;
        integration.disconnectedAt = new Date();

        await integration.save();

        logger.info('GitHub disconnected', { firmId });

        return { success: true };
    }

    /**
     * Get connection status
     * @param {string} firmId - Firm ID
     * @returns {Promise<Object>} Connection status
     */
    async getStatus(firmId) {
        const integration = await GithubIntegration.findOne({ firmId })
            .select('-accessToken -refreshToken');

        if (!integration) {
            return {
                connected: false,
                message: 'GitHub not configured'
            };
        }

        if (!integration.isActive) {
            return {
                connected: false,
                message: 'GitHub disconnected',
                disconnectedAt: integration.disconnectedAt
            };
        }

        return {
            connected: true,
            githubUsername: integration.githubUsername,
            githubUserId: integration.githubUserId,
            avatarUrl: integration.avatarUrl,
            connectedAt: integration.connectedAt,
            repositoriesCount: integration.repositories.length,
            linkedCommitsCount: integration.linkedCommits.length,
            lastSyncedAt: integration.lastSyncedAt,
            rateLimit: integration.rateLimit
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // REPOSITORY OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List user repositories
     * @param {string} firmId - Firm ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of repositories
     */
    async listRepositories(firmId, options = {}) {
        const { client } = await getAuthenticatedClient(firmId);

        return withCircuitBreaker('github', async () => {
            const params = {
                visibility: options.visibility || 'all',
                sort: options.sort || 'updated',
                direction: 'desc',
                per_page: options.perPage || 100
            };

            const response = await client.get('/user/repos', { params });

            return response.data.map(repo => ({
                id: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description,
                private: repo.private,
                owner: repo.owner.login,
                url: repo.html_url,
                defaultBranch: repo.default_branch,
                language: repo.language,
                stars: repo.stargazers_count,
                forks: repo.forks_count,
                openIssues: repo.open_issues_count,
                createdAt: repo.created_at,
                updatedAt: repo.updated_at
            }));
        });
    }

    /**
     * Get repository details
     * @param {string} firmId - Firm ID
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @returns {Promise<Object>} Repository details
     */
    async getRepository(firmId, owner, repo) {
        const { client } = await getAuthenticatedClient(firmId);

        return withCircuitBreaker('github', async () => {
            const response = await client.get(`/repos/${owner}/${repo}`);
            const repoData = response.data;

            return {
                id: repoData.id,
                name: repoData.name,
                fullName: repoData.full_name,
                description: repoData.description,
                private: repoData.private,
                owner: repoData.owner.login,
                url: repoData.html_url,
                defaultBranch: repoData.default_branch,
                language: repoData.language,
                stars: repoData.stargazers_count,
                forks: repoData.forks_count,
                openIssues: repoData.open_issues_count,
                size: repoData.size,
                createdAt: repoData.created_at,
                updatedAt: repoData.updated_at,
                pushedAt: repoData.pushed_at
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // ISSUE OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List issues for a repository
     * @param {string} firmId - Firm ID
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of issues
     */
    async listIssues(firmId, owner, repo, options = {}) {
        const { client } = await getAuthenticatedClient(firmId);

        return withCircuitBreaker('github', async () => {
            const params = {
                state: options.state || 'open',
                sort: options.sort || 'created',
                direction: options.direction || 'desc',
                per_page: options.perPage || 30
            };

            const response = await client.get(`/repos/${owner}/${repo}/issues`, { params });

            return response.data
                .filter(issue => !issue.pull_request) // Exclude pull requests
                .map(issue => ({
                    id: issue.id,
                    number: issue.number,
                    title: issue.title,
                    body: issue.body,
                    state: issue.state,
                    labels: issue.labels.map(l => l.name),
                    assignee: issue.assignee?.login,
                    createdBy: issue.user.login,
                    createdAt: issue.created_at,
                    updatedAt: issue.updated_at,
                    closedAt: issue.closed_at,
                    url: issue.html_url,
                    comments: issue.comments
                }));
        });
    }

    /**
     * Create issue (for case tracking)
     * @param {string} firmId - Firm ID
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {Object} issueData - Issue data
     * @returns {Promise<Object>} Created issue
     */
    async createIssue(firmId, owner, repo, issueData) {
        const { client } = await getAuthenticatedClient(firmId);

        return withCircuitBreaker('github', async () => {
            const payload = {
                title: issueData.title,
                body: issueData.body,
                labels: issueData.labels || [],
                assignees: issueData.assignees || []
            };

            const response = await client.post(`/repos/${owner}/${repo}/issues`, payload);
            const issue = response.data;

            logger.info('GitHub issue created', {
                firmId,
                repository: `${owner}/${repo}`,
                issueNumber: issue.number,
                title: issue.title
            });

            return {
                id: issue.id,
                number: issue.number,
                title: issue.title,
                body: issue.body,
                state: issue.state,
                url: issue.html_url,
                createdAt: issue.created_at
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // PULL REQUEST OPERATIONS
    // ═══════════════════════════════════════════════════════════════

    /**
     * List pull requests
     * @param {string} firmId - Firm ID
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {Object} options - Query options
     * @returns {Promise<Array>} List of pull requests
     */
    async listPullRequests(firmId, owner, repo, options = {}) {
        const { client } = await getAuthenticatedClient(firmId);

        return withCircuitBreaker('github', async () => {
            const params = {
                state: options.state || 'open',
                sort: options.sort || 'created',
                direction: options.direction || 'desc',
                per_page: options.perPage || 30
            };

            const response = await client.get(`/repos/${owner}/${repo}/pulls`, { params });

            return response.data.map(pr => ({
                id: pr.id,
                number: pr.number,
                title: pr.title,
                body: pr.body,
                state: pr.state,
                draft: pr.draft,
                createdBy: pr.user.login,
                head: pr.head.ref,
                base: pr.base.ref,
                mergeable: pr.mergeable,
                merged: pr.merged,
                mergedAt: pr.merged_at,
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                closedAt: pr.closed_at,
                url: pr.html_url,
                comments: pr.comments,
                commits: pr.commits,
                additions: pr.additions,
                deletions: pr.deletions
            }));
        });
    }

    /**
     * Create pull request comment
     * @param {string} firmId - Firm ID
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {number} prNumber - Pull request number
     * @param {string} body - Comment body
     * @returns {Promise<Object>} Created comment
     */
    async createPullRequestComment(firmId, owner, repo, prNumber, body) {
        const { client } = await getAuthenticatedClient(firmId);

        return withCircuitBreaker('github', async () => {
            const response = await client.post(
                `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
                { body }
            );

            const comment = response.data;

            logger.info('GitHub PR comment created', {
                firmId,
                repository: `${owner}/${repo}`,
                prNumber,
                commentId: comment.id
            });

            return {
                id: comment.id,
                body: comment.body,
                createdBy: comment.user.login,
                createdAt: comment.created_at,
                url: comment.html_url
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // CASE LINKING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Link commits to cases based on commit messages
     * @param {string} firmId - Firm ID
     * @param {Array} commits - Array of commits
     * @returns {Promise<Array>} Linked commits
     */
    async linkCommitsToCases(firmId, commits) {
        const integration = await GithubIntegration.findOne({ firmId, isActive: true });
        if (!integration) {
            throw new Error('GitHub not connected');
        }

        const pattern = integration.syncSettings?.caseTracking?.tagPattern || '#CASE-{number}';
        const linkedCommits = [];

        for (const commit of commits) {
            const message = commit.commit?.message || commit.message;
            const caseNumbers = extractCaseNumbers(message, pattern);

            for (const caseNumber of caseNumbers) {
                try {
                    // Find case by case number
                    const caseDoc = await Case.findOne({
                        firmId,
                        caseNumber: caseNumber
                    });

                    if (caseDoc) {
                        const linkedCommit = integration.linkCommitToCase(
                            {
                                sha: commit.sha,
                                message: message,
                                author: commit.commit?.author?.name || commit.author,
                                repository: commit.repository,
                                url: commit.html_url
                            },
                            caseDoc._id
                        );

                        linkedCommits.push({
                            commitSha: commit.sha,
                            caseId: caseDoc._id,
                            caseNumber: caseNumber,
                            message: message
                        });
                    }
                } catch (error) {
                    logger.error('Failed to link commit to case', {
                        firmId,
                        commitSha: commit.sha,
                        caseNumber,
                        error: error.message
                    });
                }
            }
        }

        if (linkedCommits.length > 0) {
            await integration.save();
            logger.info('Commits linked to cases', {
                firmId,
                count: linkedCommits.length
            });
        }

        return linkedCommits;
    }

    // ═══════════════════════════════════════════════════════════════
    // WEBHOOK HANDLING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Handle webhook event
     * @param {string} firmId - Firm ID
     * @param {Object} payload - Webhook payload
     * @param {string} signature - Webhook signature
     * @param {string} event - Event type
     * @returns {Promise<Object>} Processing result
     */
    async handleWebhook(firmId, payload, signature, event) {
        const integration = await GithubIntegration.findOne({ firmId, isActive: true });
        if (!integration) {
            throw new Error('GitHub not connected');
        }

        // Verify webhook signature
        const isValid = this.verifyWebhookSignature(payload, signature, integration);
        if (!isValid) {
            throw new Error('Invalid webhook signature');
        }

        logger.info('GitHub webhook received', {
            firmId,
            event,
            repository: payload.repository?.full_name
        });

        // Handle different event types
        switch (event) {
            case 'push':
                return await this.handlePushEvent(firmId, payload);

            case 'issues':
                return await this.handleIssuesEvent(firmId, payload);

            case 'pull_request':
                return await this.handlePullRequestEvent(firmId, payload);

            case 'issue_comment':
                return await this.handleCommentEvent(firmId, payload);

            default:
                logger.info('Unhandled webhook event', { event });
                return { handled: false, event };
        }
    }

    /**
     * Verify webhook signature
     * @param {Object} payload - Webhook payload
     * @param {string} signature - Signature from header
     * @param {Object} integration - GitHub integration
     * @returns {boolean} Verification result
     */
    verifyWebhookSignature(payload, signature, integration) {
        if (!signature) {
            return false;
        }

        // Find the repository's webhook secret
        const repoId = payload.repository?.id;
        const repo = integration.repositories.find(r => r.repoId === repoId);

        if (!repo || !repo.webhookSecret) {
            return false;
        }

        const hmac = crypto.createHmac('sha256', repo.webhookSecret);
        hmac.update(JSON.stringify(payload));
        const expectedSignature = 'sha256=' + hmac.digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Handle push event
     * @param {string} firmId - Firm ID
     * @param {Object} payload - Webhook payload
     * @returns {Promise<Object>} Processing result
     */
    async handlePushEvent(firmId, payload) {
        const commits = payload.commits || [];

        // Link commits to cases
        const linkedCommits = await this.linkCommitsToCases(firmId, commits);

        return {
            event: 'push',
            repository: payload.repository.full_name,
            branch: payload.ref.replace('refs/heads/', ''),
            commits: commits.length,
            linkedCommits: linkedCommits.length
        };
    }

    /**
     * Handle issues event
     * @param {string} firmId - Firm ID
     * @param {Object} payload - Webhook payload
     * @returns {Promise<Object>} Processing result
     */
    async handleIssuesEvent(firmId, payload) {
        const { action, issue } = payload;

        logger.info('GitHub issue event', {
            firmId,
            action,
            issueNumber: issue.number,
            title: issue.title
        });

        // TODO: Implement issue-to-case linking logic
        // Could auto-create cases from issues or link existing cases

        return {
            event: 'issues',
            action,
            issueNumber: issue.number,
            title: issue.title
        };
    }

    /**
     * Handle pull request event
     * @param {string} firmId - Firm ID
     * @param {Object} payload - Webhook payload
     * @returns {Promise<Object>} Processing result
     */
    async handlePullRequestEvent(firmId, payload) {
        const { action, pull_request } = payload;

        logger.info('GitHub PR event', {
            firmId,
            action,
            prNumber: pull_request.number,
            title: pull_request.title
        });

        return {
            event: 'pull_request',
            action,
            prNumber: pull_request.number,
            title: pull_request.title
        };
    }

    /**
     * Handle comment event
     * @param {string} firmId - Firm ID
     * @param {Object} payload - Webhook payload
     * @returns {Promise<Object>} Processing result
     */
    async handleCommentEvent(firmId, payload) {
        const { action, issue, comment } = payload;

        logger.info('GitHub comment event', {
            firmId,
            action,
            issueNumber: issue.number,
            commentId: comment.id
        });

        return {
            event: 'issue_comment',
            action,
            issueNumber: issue.number,
            commentId: comment.id
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Update sync settings
     * @param {string} firmId - Firm ID
     * @param {Object} settings - New settings
     * @returns {Promise<Object>} Updated settings
     */
    async updateSettings(firmId, settings) {
        const integration = await GithubIntegration.findOne({ firmId, isActive: true });
        if (!integration) {
            throw new Error('GitHub not connected');
        }

        Object.assign(integration.syncSettings, settings);
        await integration.save();

        logger.info('GitHub settings updated', { firmId, settings });

        return integration.syncSettings;
    }
}

// Export singleton instance
module.exports = new GitHubService();

// Also export class for testing
module.exports.GitHubService = GitHubService;
