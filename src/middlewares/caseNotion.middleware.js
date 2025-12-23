const logger = require('../utils/logger');
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

        // DEBUG: Log all inputs
        logger.info('=== caseNotion.canAccessCase DEBUG ===');
        logger.info('URL:', req.originalUrl);
        logger.info('caseId from params:', caseId);
        logger.info('req.userID:', req.userID);
        logger.info('req.user?._id:', req.user?._id?.toString());
        logger.info('userId resolved to:', userId?.toString());
        logger.info('req.user?.firmId:', req.user?.firmId?.toString());
        logger.info('req.firmId:', req.firmId?.toString());
        logger.info('req.user?.role:', req.user?.role);
        logger.info('req.isSoloLawyer:', req.isSoloLawyer);

        // First, find the case
        const caseDoc = await Case.findById(caseId);

        if (!caseDoc) {
            logger.info('Case NOT FOUND for id:', caseId);
            return res.status(404).json({
                error: true,
                message: 'Case not found'
            });
        }

        logger.info('Case found:');
        logger.info('  - case._id:', caseDoc._id?.toString());
        logger.info('  - case.lawyerId:', caseDoc.lawyerId?.toString());
        logger.info('  - case.clientId:', caseDoc.clientId?.toString());
        logger.info('  - case.firmId:', caseDoc.firmId?.toString());
        logger.info('  - case.createdBy:', caseDoc.createdBy?.toString());
        logger.info('  - case.teamMembers:', caseDoc.teamMembers?.map(m => m.toString()));

        // Admin bypass
        if (req.user?.role === 'admin') {
            logger.info('Admin bypass - GRANTED');
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

        logger.info('Access checks:');
        logger.info('  - isLawyer:', isLawyer);
        logger.info('  - isClient:', isClient);
        logger.info('  - isTeamMember:', isTeamMember);
        logger.info('  - isCreator:', isCreator);

        if (req.user?.firmId) {
            // Firm user: can access if case belongs to same firm OR user is lawyer/client/team member
            const sameFirm = caseDoc.firmId && caseDoc.firmId.toString() === req.user.firmId.toString();
            logger.info('  - sameFirm:', sameFirm, '(case.firmId:', caseDoc.firmId?.toString(), 'vs user.firmId:', req.user.firmId?.toString(), ')');
            hasAccess = sameFirm || isLawyer || isClient || isTeamMember || isCreator;
            logger.info('Firm user path - hasAccess:', hasAccess);
        } else {
            // Solo lawyer / non-firm user: can access if they are lawyer/client/team member/creator
            hasAccess = isLawyer || isClient || isTeamMember || isCreator;
            logger.info('Solo/non-firm user path - hasAccess:', hasAccess);
        }

        if (!hasAccess) {
            logger.info('ACCESS DENIED - returning 403');
            return res.status(403).json({
                error: true,
                message: 'Access denied to this case'
            });
        }

        logger.info('ACCESS GRANTED - proceeding to next()');
        req.case = caseDoc;
        next();
    } catch (error) {
        logger.error('canAccessCase ERROR:', error.message);
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
