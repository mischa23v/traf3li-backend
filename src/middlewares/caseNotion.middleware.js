const Case = require('../models/case.model');
const CaseNotionPage = require('../models/caseNotionPage.model');

// ═══════════════════════════════════════════════════════════════
// CASENOTION ACCESS CONTROL MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

/**
 * Check if user can access the case
 */
exports.canAccessCase = async (req, res, next) => {
    try {
        const { caseId } = req.params;
        const userId = req.userID || req.user?._id;

        // First, find the case
        const caseDoc = await Case.findById(caseId);

        if (!caseDoc) {
            return res.status(404).json({
                error: true,
                message: 'Case not found'
            });
        }

        // Admin bypass
        if (req.user?.role === 'admin') {
            req.case = caseDoc;
            return next();
        }

        // Check access based on user context
        let hasAccess = false;

        // Check if user is the lawyer or client
        const isLawyer = caseDoc.lawyerId && caseDoc.lawyerId.toString() === userId?.toString();
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === userId?.toString();
        const isTeamMember = caseDoc.teamMembers?.some(m => m.toString() === userId?.toString());
        const isCreator = caseDoc.createdBy && caseDoc.createdBy.toString() === userId?.toString();

        if (req.user?.firmId) {
            // Firm user: can access if case belongs to same firm OR user is lawyer/client/team member
            const sameFirm = caseDoc.firmId && caseDoc.firmId.toString() === req.user.firmId.toString();
            hasAccess = sameFirm || isLawyer || isClient || isTeamMember || isCreator;
        } else {
            // Solo lawyer / non-firm user: can access if they are lawyer/client/team member/creator
            hasAccess = isLawyer || isClient || isTeamMember || isCreator;
        }

        if (!hasAccess) {
            return res.status(403).json({
                error: true,
                message: 'Access denied to this case'
            });
        }

        req.case = caseDoc;
        next();
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Check if user can edit the page
 */
exports.canEditPage = async (req, res, next) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        // Check if user has edit permission
        const hasEditAccess =
            req.user.role === 'admin' ||
            page.createdBy.toString() === req.user._id.toString() ||
            page.sharedWith.some(s =>
                s.userId.toString() === req.user._id.toString() &&
                s.permission === 'edit'
            );

        if (!hasEditAccess) {
            return res.status(403).json({
                error: true,
                message: 'You do not have edit permission for this page'
            });
        }

        req.page = page;
        next();
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};

/**
 * Check if user can view the page (including shared access)
 */
exports.canViewPage = async (req, res, next) => {
    try {
        const { pageId } = req.params;

        const page = await CaseNotionPage.findById(pageId);
        if (!page) {
            return res.status(404).json({ error: true, message: 'Page not found' });
        }

        const hasViewAccess =
            req.user.role === 'admin' ||
            page.isPublic ||
            page.createdBy.toString() === req.user._id.toString() ||
            page.sharedWith.some(s =>
                s.userId.toString() === req.user._id.toString()
            );

        if (!hasViewAccess) {
            return res.status(403).json({
                error: true,
                message: 'You do not have view permission for this page'
            });
        }

        req.page = page;
        next();
    } catch (error) {
        res.status(500).json({ error: true, message: error.message });
    }
};
