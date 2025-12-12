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

        const query = { _id: caseId };

        // Add firm/lawyer filter
        if (req.user.firmId) {
            query.firmId = req.user.firmId;
        } else {
            query.$or = [
                { lawyerId: req.user._id },
                { teamMembers: req.user._id },
                { createdBy: req.user._id }
            ];
        }

        const caseDoc = await Case.findOne(query);

        if (!caseDoc && req.user.role !== 'admin') {
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
