/**
 * GitHub Integration Controller
 *
 * Handles GitHub OAuth authentication, repository management,
 * issue tracking, and webhook processing.
 */

const logger = require('../utils/logger');
const githubService = require('../services/github.service');

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Get OAuth authorization URL
 * Redirects user to GitHub authorization page
 */
const getAuthUrl = async (req, res) => {
    try {
        const firmId = req.firmId;
        const userId = req.userID;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const result = await githubService.getAuthUrl(firmId, userId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Error getting GitHub auth URL:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على رابط المصادقة',
            error_en: 'Failed to get authorization URL',
            details: error.message
        });
    }
};

/**
 * Handle OAuth callback
 * Exchanges authorization code for access token
 */
const handleCallback = async (req, res) => {
    try {
        const { code, state } = req.query;

        if (!code || !state) {
            return res.status(400).json({
                success: false,
                error: 'رمز التفويض والحالة مطلوبان',
                error_en: 'Authorization code and state are required'
            });
        }

        const result = await githubService.exchangeCode(code, state);

        return res.status(200).json({
            success: true,
            message: 'تم الاتصال بـ GitHub بنجاح',
            message_en: 'GitHub connected successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error handling GitHub callback:', error);
        return res.status(500).json({
            success: false,
            error: 'فشلت معالجة استجابة GitHub',
            error_en: 'Failed to handle GitHub callback',
            details: error.message
        });
    }
};

/**
 * Disconnect GitHub integration
 */
const disconnect = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const result = await githubService.disconnect(firmId);

        return res.status(200).json({
            success: true,
            message: 'تم قطع الاتصال بـ GitHub بنجاح',
            message_en: 'GitHub disconnected successfully',
            data: result
        });
    } catch (error) {
        logger.error('Error disconnecting GitHub:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل قطع الاتصال بـ GitHub',
            error_en: 'Failed to disconnect GitHub',
            details: error.message
        });
    }
};

/**
 * Get GitHub connection status
 */
const getStatus = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const status = await githubService.getStatus(firmId);

        return res.status(200).json({
            success: true,
            data: status
        });
    } catch (error) {
        logger.error('Error getting GitHub status:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على حالة GitHub',
            error_en: 'Failed to get GitHub status',
            details: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// REPOSITORY HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * List user repositories
 */
const listRepositories = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { visibility, sort, perPage } = req.query;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const repositories = await githubService.listRepositories(firmId, {
            visibility,
            sort,
            perPage: perPage ? parseInt(perPage) : 100
        });

        return res.status(200).json({
            success: true,
            data: repositories,
            count: repositories.length
        });
    } catch (error) {
        logger.error('Error listing GitHub repositories:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على قائمة المستودعات',
            error_en: 'Failed to list repositories',
            details: error.message
        });
    }
};

/**
 * Get repository details
 */
const getRepository = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { owner, repo } = req.params;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        if (!owner || !repo) {
            return res.status(400).json({
                success: false,
                error: 'المالك واسم المستودع مطلوبان',
                error_en: 'Owner and repository name are required'
            });
        }

        const repository = await githubService.getRepository(firmId, owner, repo);

        return res.status(200).json({
            success: true,
            data: repository
        });
    } catch (error) {
        logger.error('Error getting GitHub repository:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على تفاصيل المستودع',
            error_en: 'Failed to get repository details',
            details: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// ISSUE HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * List issues for a repository
 */
const listIssues = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { owner, repo } = req.params;
        const { state, sort, direction, perPage } = req.query;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        if (!owner || !repo) {
            return res.status(400).json({
                success: false,
                error: 'المالك واسم المستودع مطلوبان',
                error_en: 'Owner and repository name are required'
            });
        }

        const issues = await githubService.listIssues(firmId, owner, repo, {
            state,
            sort,
            direction,
            perPage: perPage ? parseInt(perPage) : 30
        });

        return res.status(200).json({
            success: true,
            data: issues,
            count: issues.length
        });
    } catch (error) {
        logger.error('Error listing GitHub issues:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على قائمة المشكلات',
            error_en: 'Failed to list issues',
            details: error.message
        });
    }
};

/**
 * Create issue (for case tracking)
 */
const createIssue = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { owner, repo } = req.params;
        const { title, body, labels, assignees } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        if (!owner || !repo) {
            return res.status(400).json({
                success: false,
                error: 'المالك واسم المستودع مطلوبان',
                error_en: 'Owner and repository name are required'
            });
        }

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'عنوان المشكلة مطلوب',
                error_en: 'Issue title is required'
            });
        }

        const issue = await githubService.createIssue(firmId, owner, repo, {
            title,
            body,
            labels,
            assignees
        });

        return res.status(201).json({
            success: true,
            message: 'تم إنشاء المشكلة بنجاح',
            message_en: 'Issue created successfully',
            data: issue
        });
    } catch (error) {
        logger.error('Error creating GitHub issue:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل إنشاء المشكلة',
            error_en: 'Failed to create issue',
            details: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// PULL REQUEST HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * List pull requests for a repository
 */
const listPullRequests = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { owner, repo } = req.params;
        const { state, sort, direction, perPage } = req.query;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        if (!owner || !repo) {
            return res.status(400).json({
                success: false,
                error: 'المالك واسم المستودع مطلوبان',
                error_en: 'Owner and repository name are required'
            });
        }

        const pullRequests = await githubService.listPullRequests(firmId, owner, repo, {
            state,
            sort,
            direction,
            perPage: perPage ? parseInt(perPage) : 30
        });

        return res.status(200).json({
            success: true,
            data: pullRequests,
            count: pullRequests.length
        });
    } catch (error) {
        logger.error('Error listing GitHub pull requests:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل الحصول على قائمة طلبات السحب',
            error_en: 'Failed to list pull requests',
            details: error.message
        });
    }
};

/**
 * Create pull request comment
 */
const createPullRequestComment = async (req, res) => {
    try {
        const firmId = req.firmId;
        const { owner, repo, prNumber } = req.params;
        const { body } = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        if (!owner || !repo || !prNumber) {
            return res.status(400).json({
                success: false,
                error: 'المالك واسم المستودع ورقم طلب السحب مطلوبة',
                error_en: 'Owner, repository name, and PR number are required'
            });
        }

        if (!body) {
            return res.status(400).json({
                success: false,
                error: 'نص التعليق مطلوب',
                error_en: 'Comment body is required'
            });
        }

        const comment = await githubService.createPullRequestComment(
            firmId,
            owner,
            repo,
            parseInt(prNumber),
            body
        );

        return res.status(201).json({
            success: true,
            message: 'تم إنشاء التعليق بنجاح',
            message_en: 'Comment created successfully',
            data: comment
        });
    } catch (error) {
        logger.error('Error creating GitHub PR comment:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل إنشاء التعليق',
            error_en: 'Failed to create comment',
            details: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// SETTINGS HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Update sync settings
 */
const updateSettings = async (req, res) => {
    try {
        const firmId = req.firmId;
        const settings = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        const updatedSettings = await githubService.updateSettings(firmId, settings);

        return res.status(200).json({
            success: true,
            message: 'تم تحديث الإعدادات بنجاح',
            message_en: 'Settings updated successfully',
            data: updatedSettings
        });
    } catch (error) {
        logger.error('Error updating GitHub settings:', error);
        return res.status(500).json({
            success: false,
            error: 'فشل تحديث الإعدادات',
            error_en: 'Failed to update settings',
            details: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// WEBHOOK HANDLER
// ═══════════════════════════════════════════════════════════════

/**
 * Handle GitHub webhook events
 * Called by GitHub when data changes in their system
 */
const handleWebhook = async (req, res) => {
    try {
        const firmId = req.firmId;
        const signature = req.headers['x-hub-signature-256'];
        const event = req.headers['x-github-event'];
        const payload = req.body;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'معرف الشركة مطلوب',
                error_en: 'Firm ID is required'
            });
        }

        if (!signature || !event) {
            return res.status(400).json({
                success: false,
                error: 'رؤوس الويب هوك مفقودة',
                error_en: 'Webhook headers missing'
            });
        }

        const result = await githubService.handleWebhook(firmId, payload, signature, event);

        // Return 200 OK immediately to GitHub
        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Error handling GitHub webhook:', error);

        // Still return 200 to GitHub to avoid retries
        return res.status(200).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    // Auth
    getAuthUrl,
    handleCallback,
    disconnect,
    getStatus,

    // Repositories
    listRepositories,
    getRepository,

    // Issues
    listIssues,
    createIssue,

    // Pull Requests
    listPullRequests,
    createPullRequestComment,

    // Settings
    updateSettings,

    // Webhook
    handleWebhook
};
