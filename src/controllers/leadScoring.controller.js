const LeadScoringService = require('../services/leadScoring.service');
const asyncHandler = require('express-async-handler');

// ═══════════════════════════════════════════════════════════════
// LEAD SCORING CONTROLLER
// ═══════════════════════════════════════════════════════════════

class LeadScoringController {
    // ═══════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Get lead scoring configuration
     * @route   GET /api/lead-scoring/config
     * @access  Private
     */
    getConfig = asyncHandler(async (req, res) => {
        const firmId = req.user.firmId;

        const config = await LeadScoringService.getConfig(firmId);

        res.json({
            success: true,
            data: config
        });
    });

    /**
     * @desc    Update lead scoring configuration
     * @route   PUT /api/lead-scoring/config
     * @access  Private (Admin only)
     */
    updateConfig = asyncHandler(async (req, res) => {
        const firmId = req.user.firmId;
        const configData = req.body;

        const config = await LeadScoringService.updateConfig(firmId, configData);

        res.json({
            success: true,
            message: 'Configuration updated successfully',
            data: config
        });
    });

    // ═══════════════════════════════════════════════════════════
    // SCORE CALCULATION
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Calculate score for a specific lead
     * @route   POST /api/lead-scoring/calculate/:leadId
     * @access  Private
     */
    calculateScore = asyncHandler(async (req, res) => {
        const { leadId } = req.params;

        const score = await LeadScoringService.calculateScore(leadId);

        res.json({
            success: true,
            message: 'Lead score calculated successfully',
            data: score
        });
    });

    /**
     * @desc    Recalculate all lead scores for firm
     * @route   POST /api/lead-scoring/calculate-all
     * @access  Private (Admin only)
     */
    calculateAllScores = asyncHandler(async (req, res) => {
        const firmId = req.user.firmId;

        const results = await LeadScoringService.recalculateAllScores(firmId);

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        res.json({
            success: true,
            message: `Recalculated ${successful} leads successfully, ${failed} failed`,
            data: {
                total: results.length,
                successful,
                failed,
                results
            }
        });
    });

    /**
     * @desc    Calculate scores for specific leads (batch)
     * @route   POST /api/lead-scoring/calculate-batch
     * @access  Private
     */
    calculateBatch = asyncHandler(async (req, res) => {
        const { leadIds } = req.body;

        if (!leadIds || !Array.isArray(leadIds)) {
            return res.status(400).json({
                success: false,
                message: 'leadIds array is required'
            });
        }

        const results = await LeadScoringService.recalculateBatch(leadIds);

        res.json({
            success: true,
            data: results
        });
    });

    // ═══════════════════════════════════════════════════════════
    // REPORTING & ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Get score distribution
     * @route   GET /api/lead-scoring/distribution
     * @access  Private
     */
    getScoreDistribution = asyncHandler(async (req, res) => {
        const firmId = req.user.firmId;

        const distribution = await LeadScoringService.getScoreDistribution(firmId);

        res.json({
            success: true,
            data: distribution
        });
    });

    /**
     * @desc    Get top scoring leads
     * @route   GET /api/lead-scoring/top-leads
     * @access  Private
     */
    getTopLeads = asyncHandler(async (req, res) => {
        const firmId = req.user.firmId;
        const limit = parseInt(req.query.limit) || 20;

        const leads = await LeadScoringService.getTopLeads(firmId, limit);

        res.json({
            success: true,
            data: leads
        });
    });

    /**
     * @desc    Get leads by grade
     * @route   GET /api/lead-scoring/by-grade/:grade
     * @access  Private
     */
    getLeadsByGrade = asyncHandler(async (req, res) => {
        const firmId = req.user.firmId;
        const { grade } = req.params;
        const limit = parseInt(req.query.limit) || 50;
        const skip = parseInt(req.query.skip) || 0;

        const leads = await LeadScoringService.getLeadsByGrade(firmId, grade, { limit, skip });

        res.json({
            success: true,
            data: leads
        });
    });

    /**
     * @desc    Get lead insights
     * @route   GET /api/lead-scoring/insights/:leadId
     * @access  Private
     */
    getLeadInsights = asyncHandler(async (req, res) => {
        const { leadId } = req.params;

        const insights = await LeadScoringService.getLeadInsights(leadId);
        const similarLeads = await LeadScoringService.getSimilarConvertedLeads(leadId);
        const recommendedActions = await LeadScoringService.getRecommendedActions(leadId);

        res.json({
            success: true,
            data: {
                insights,
                similarLeads,
                recommendedActions
            }
        });
    });

    /**
     * @desc    Get score trends
     * @route   GET /api/lead-scoring/trends
     * @access  Private
     */
    getScoreTrends = asyncHandler(async (req, res) => {
        const firmId = req.user.firmId;
        const { startDate, endDate } = req.query;

        const trends = await LeadScoringService.getScoreTrends(firmId, {
            start: startDate,
            end: endDate
        });

        res.json({
            success: true,
            data: trends
        });
    });

    /**
     * @desc    Get conversion analysis
     * @route   GET /api/lead-scoring/conversion-analysis
     * @access  Private
     */
    getConversionAnalysis = asyncHandler(async (req, res) => {
        const firmId = req.user.firmId;

        const analysis = await LeadScoringService.getConversionAnalysis(firmId);

        res.json({
            success: true,
            data: analysis
        });
    });

    // ═══════════════════════════════════════════════════════════
    // BEHAVIORAL TRACKING
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Track email open
     * @route   POST /api/lead-scoring/track/email-open
     * @access  Public (webhook)
     */
    trackEmailOpen = asyncHandler(async (req, res) => {
        const { leadId, campaignId } = req.body;

        await LeadScoringService.trackEmailOpen(leadId, campaignId);

        res.json({ success: true });
    });

    /**
     * @desc    Track email click
     * @route   POST /api/lead-scoring/track/email-click
     * @access  Public (webhook)
     */
    trackEmailClick = asyncHandler(async (req, res) => {
        const { leadId, campaignId, link } = req.body;

        await LeadScoringService.trackEmailClick(leadId, campaignId, link);

        res.json({ success: true });
    });

    /**
     * @desc    Track meeting scheduled/attended
     * @route   POST /api/lead-scoring/track/meeting
     * @access  Private
     */
    trackMeeting = asyncHandler(async (req, res) => {
        const { leadId, action } = req.body; // action: 'scheduled' or 'attended'

        if (action === 'scheduled') {
            await LeadScoringService.trackMeetingScheduled(leadId);
        } else if (action === 'attended') {
            await LeadScoringService.trackMeetingAttended(leadId);
        }

        res.json({ success: true });
    });

    /**
     * @desc    Track phone call
     * @route   POST /api/lead-scoring/track/call
     * @access  Private
     */
    trackCall = asyncHandler(async (req, res) => {
        const { leadId, durationMinutes } = req.body;

        await LeadScoringService.trackCallCompleted(leadId, durationMinutes);

        res.json({ success: true });
    });

    /**
     * @desc    Track document view
     * @route   POST /api/lead-scoring/track/document-view
     * @access  Public (webhook)
     */
    trackDocumentView = asyncHandler(async (req, res) => {
        const { leadId, documentId } = req.body;

        await LeadScoringService.trackDocumentView(leadId, documentId);

        res.json({ success: true });
    });

    /**
     * @desc    Track website visit
     * @route   POST /api/lead-scoring/track/website-visit
     * @access  Public (webhook)
     */
    trackWebsiteVisit = asyncHandler(async (req, res) => {
        const { leadId, page, duration } = req.body;

        await LeadScoringService.trackWebsiteVisit(leadId, page, duration);

        res.json({ success: true });
    });

    /**
     * @desc    Track form submission
     * @route   POST /api/lead-scoring/track/form-submit
     * @access  Public (webhook)
     */
    trackFormSubmit = asyncHandler(async (req, res) => {
        const { leadId, formId } = req.body;

        await LeadScoringService.trackFormSubmission(leadId, formId);

        res.json({ success: true });
    });

    // ═══════════════════════════════════════════════════════════
    // DECAY MANAGEMENT
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Process decay for all leads
     * @route   POST /api/lead-scoring/process-decay
     * @access  Private (Admin/Cron)
     */
    processDecay = asyncHandler(async (req, res) => {
        const firmId = req.user.firmId;

        const result = await LeadScoringService.processAllDecay(firmId);

        res.json({
            success: true,
            message: `Processed decay for ${result.processed} leads`,
            data: result
        });
    });
}

module.exports = new LeadScoringController();
