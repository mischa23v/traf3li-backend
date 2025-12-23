const LeadScoringService = require('../services/leadScoring.service');
const asyncHandler = require('express-async-handler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const Lead = require('../models/lead.model');

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
        const firmId = req.firmId;

        // firmId is required for lead scoring configuration
        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required for lead scoring configuration',
                message: 'Please ensure you are part of a firm to access lead scoring features'
            });
        }

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
        const firmId = req.firmId;

        // firmId is required for lead scoring configuration
        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required for lead scoring configuration',
                message: 'Please ensure you are part of a firm to access lead scoring features'
            });
        }

        // Mass assignment protection - only allow specific fields
        const allowedFields = [
            'weights',
            'thresholds',
            'decaySettings',
            'behavioralScoring',
            'demographicScoring',
            'firmographicScoring',
            'engagementScoring',
            'qualificationScoring',
            'enabled',
            'autoCalculate',
            'customRules'
        ];
        const configData = pickAllowedFields(req.body, allowedFields);

        // Input validation for scoring rules
        if (configData.weights) {
            const validWeightKeys = [
                'demographic',
                'firmographic',
                'behavioral',
                'engagement',
                'qualification'
            ];

            for (const key in configData.weights) {
                if (!validWeightKeys.includes(key)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid weight key: ${key}`,
                        message: 'Weight keys must be one of: demographic, firmographic, behavioral, engagement, qualification'
                    });
                }

                const weight = configData.weights[key];
                if (typeof weight !== 'number' || weight < 0 || weight > 100) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid weight value for ${key}`,
                        message: 'Weight values must be numbers between 0 and 100'
                    });
                }
            }
        }

        // Validate thresholds
        if (configData.thresholds) {
            const validThresholdKeys = ['A', 'B', 'C', 'D'];
            for (const key in configData.thresholds) {
                if (!validThresholdKeys.includes(key)) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid threshold key: ${key}`,
                        message: 'Threshold keys must be one of: A, B, C, D'
                    });
                }

                const threshold = configData.thresholds[key];
                if (typeof threshold !== 'number' || threshold < 0 || threshold > 150) {
                    return res.status(400).json({
                        success: false,
                        error: `Invalid threshold value for grade ${key}`,
                        message: 'Threshold values must be numbers between 0 and 150'
                    });
                }
            }
        }

        // Validate decay settings
        if (configData.decaySettings) {
            if (configData.decaySettings.enabled !== undefined && typeof configData.decaySettings.enabled !== 'boolean') {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid decay enabled value',
                    message: 'Decay enabled must be a boolean'
                });
            }

            if (configData.decaySettings.rate !== undefined) {
                const rate = configData.decaySettings.rate;
                if (typeof rate !== 'number' || rate < 0 || rate > 100) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid decay rate',
                        message: 'Decay rate must be a number between 0 and 100'
                    });
                }
            }
        }

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
        const firmId = req.firmId;
        const lawyerId = req.userID;

        // Sanitize and validate leadId
        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'The provided lead ID is not valid'
            });
        }

        // IDOR Protection - Verify lead belongs to the user's firm or lawyer
        const query = firmId
            ? { _id: sanitizedLeadId, firmId }
            : { _id: sanitizedLeadId, lawyerId };

        const lead = await Lead.findOne(query);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found',
                message: 'The requested lead does not exist or you do not have access to it'
            });
        }

        const score = await LeadScoringService.calculateScore(sanitizedLeadId);

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
        const firmId = req.firmId;

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
        const firmId = req.firmId;
        const lawyerId = req.userID;

        if (!leadIds || !Array.isArray(leadIds)) {
            return res.status(400).json({
                success: false,
                message: 'leadIds array is required'
            });
        }

        // Validate array size to prevent DoS
        if (leadIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'leadIds array cannot be empty'
            });
        }

        if (leadIds.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Cannot process more than 100 leads at once. Please batch your requests.'
            });
        }

        // Sanitize all lead IDs and validate format
        const sanitizedLeadIds = leadIds.map(id => sanitizeObjectId(id)).filter(Boolean);

        if (sanitizedLeadIds.length !== leadIds.length) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'One or more lead IDs are not valid'
            });
        }

        // IDOR Protection - Verify all leads belong to the user's firm or lawyer
        const query = firmId
            ? { _id: { $in: sanitizedLeadIds }, firmId }
            : { _id: { $in: sanitizedLeadIds }, lawyerId };

        const ownedLeads = await Lead.find(query).select('_id');

        if (ownedLeads.length !== sanitizedLeadIds.length) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'One or more leads do not belong to your firm or you do not have access to them'
            });
        }

        const results = await LeadScoringService.recalculateBatch(sanitizedLeadIds);

        res.json({
            success: true,
            data: results
        });
    });

    // ═══════════════════════════════════════════════════════════
    // REPORTING & ANALYTICS
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Get all lead scores for firm
     * @route   GET /api/lead-scoring/scores
     * @access  Private
     */
    getScores = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const lawyerId = req.userID;
        const { page = 1, limit = 50 } = req.query;

        // Use firmId if available, otherwise fallback to lawyerId for solo lawyers
        const scores = await LeadScoringService.getAllScores(
            firmId || lawyerId,
            !!firmId,
            { page: parseInt(page), limit: parseInt(limit) }
        );

        res.json({
            success: true,
            data: scores
        });
    });

    /**
     * @desc    Get lead scoring leaderboard
     * @route   GET /api/lead-scoring/leaderboard
     * @access  Private
     */
    getLeaderboard = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const lawyerId = req.userID;
        const limit = parseInt(req.query.limit) || 10;

        // Use firmId if available, otherwise fallback to lawyerId for solo lawyers
        const leaderboard = await LeadScoringService.getLeaderboard(
            firmId || lawyerId,
            !!firmId,
            limit
        );

        res.json({
            success: true,
            data: leaderboard
        });
    });

    /**
     * @desc    Get score distribution
     * @route   GET /api/lead-scoring/distribution
     * @access  Private
     */
    getScoreDistribution = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

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
        const firmId = req.firmId;
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
        const firmId = req.firmId;
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
        const firmId = req.firmId;
        const lawyerId = req.userID;

        // Sanitize and validate leadId
        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'The provided lead ID is not valid'
            });
        }

        // IDOR Protection - Verify lead belongs to the user's firm or lawyer
        const query = firmId
            ? { _id: sanitizedLeadId, firmId }
            : { _id: sanitizedLeadId, lawyerId };

        const lead = await Lead.findOne(query);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found',
                message: 'The requested lead does not exist or you do not have access to it'
            });
        }

        const insights = await LeadScoringService.getLeadInsights(sanitizedLeadId);
        const similarLeads = await LeadScoringService.getSimilarConvertedLeads(sanitizedLeadId);
        const recommendedActions = await LeadScoringService.getRecommendedActions(sanitizedLeadId);

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
        const firmId = req.firmId;
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
        const firmId = req.firmId;

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

        // Input validation - prevent score manipulation
        if (!leadId) {
            return res.status(400).json({
                success: false,
                error: 'leadId is required'
            });
        }

        // Sanitize and validate leadId
        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format'
            });
        }

        // Sanitize campaignId if provided
        let sanitizedCampaignId = null;
        if (campaignId) {
            sanitizedCampaignId = sanitizeObjectId(campaignId);
            if (!sanitizedCampaignId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID format'
                });
            }
        }

        // Verify lead exists before tracking
        const lead = await Lead.findById(sanitizedLeadId);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        await LeadScoringService.trackEmailOpen(sanitizedLeadId, sanitizedCampaignId);

        res.json({ success: true });
    });

    /**
     * @desc    Track email click
     * @route   POST /api/lead-scoring/track/email-click
     * @access  Public (webhook)
     */
    trackEmailClick = asyncHandler(async (req, res) => {
        const { leadId, campaignId, link } = req.body;

        // Input validation - prevent score manipulation
        if (!leadId) {
            return res.status(400).json({
                success: false,
                error: 'leadId is required'
            });
        }

        // Sanitize and validate leadId
        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format'
            });
        }

        // Sanitize campaignId if provided
        let sanitizedCampaignId = null;
        if (campaignId) {
            sanitizedCampaignId = sanitizeObjectId(campaignId);
            if (!sanitizedCampaignId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid campaign ID format'
                });
            }
        }

        // Validate link (optional but should be reasonable length if provided)
        if (link && (typeof link !== 'string' || link.length > 2048)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid link format or length'
            });
        }

        // Verify lead exists before tracking
        const lead = await Lead.findById(sanitizedLeadId);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        await LeadScoringService.trackEmailClick(sanitizedLeadId, sanitizedCampaignId, link);

        res.json({ success: true });
    });

    /**
     * @desc    Track meeting scheduled/attended
     * @route   POST /api/lead-scoring/track/meeting
     * @access  Private
     */
    trackMeeting = asyncHandler(async (req, res) => {
        const { leadId, action } = req.body; // action: 'scheduled' or 'attended'
        const firmId = req.firmId;
        const lawyerId = req.userID;

        // Input validation - prevent score manipulation
        if (!leadId) {
            return res.status(400).json({
                success: false,
                error: 'leadId is required'
            });
        }

        if (!action || !['scheduled', 'attended'].includes(action)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid action. Must be either "scheduled" or "attended"'
            });
        }

        // Sanitize and validate leadId
        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format'
            });
        }

        // IDOR Protection - Verify lead belongs to the user's firm or lawyer
        const query = firmId
            ? { _id: sanitizedLeadId, firmId }
            : { _id: sanitizedLeadId, lawyerId };

        const lead = await Lead.findOne(query);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found or you do not have access to it'
            });
        }

        if (action === 'scheduled') {
            await LeadScoringService.trackMeetingScheduled(sanitizedLeadId);
        } else if (action === 'attended') {
            await LeadScoringService.trackMeetingAttended(sanitizedLeadId);
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
        const firmId = req.firmId;
        const lawyerId = req.userID;

        // Input validation - prevent score manipulation
        if (!leadId) {
            return res.status(400).json({
                success: false,
                error: 'leadId is required'
            });
        }

        // Sanitize and validate leadId
        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format'
            });
        }

        // Validate durationMinutes to prevent score manipulation
        if (durationMinutes !== undefined && durationMinutes !== null) {
            if (typeof durationMinutes !== 'number' || durationMinutes < 0 || durationMinutes > 1440) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid duration. Must be a number between 0 and 1440 minutes (24 hours)'
                });
            }
        }

        // IDOR Protection - Verify lead belongs to the user's firm or lawyer
        const query = firmId
            ? { _id: sanitizedLeadId, firmId }
            : { _id: sanitizedLeadId, lawyerId };

        const lead = await Lead.findOne(query);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found or you do not have access to it'
            });
        }

        await LeadScoringService.trackCallCompleted(sanitizedLeadId, durationMinutes);

        res.json({ success: true });
    });

    /**
     * @desc    Track document view
     * @route   POST /api/lead-scoring/track/document-view
     * @access  Public (webhook)
     */
    trackDocumentView = asyncHandler(async (req, res) => {
        const { leadId, documentId } = req.body;

        // Input validation - prevent score manipulation
        if (!leadId) {
            return res.status(400).json({
                success: false,
                error: 'leadId is required'
            });
        }

        // Sanitize and validate leadId
        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format'
            });
        }

        // Sanitize documentId if provided
        let sanitizedDocumentId = null;
        if (documentId) {
            sanitizedDocumentId = sanitizeObjectId(documentId);
            if (!sanitizedDocumentId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid document ID format'
                });
            }
        }

        // Verify lead exists before tracking
        const lead = await Lead.findById(sanitizedLeadId);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        await LeadScoringService.trackDocumentView(sanitizedLeadId, sanitizedDocumentId);

        res.json({ success: true });
    });

    /**
     * @desc    Track website visit
     * @route   POST /api/lead-scoring/track/website-visit
     * @access  Public (webhook)
     */
    trackWebsiteVisit = asyncHandler(async (req, res) => {
        const { leadId, page, duration } = req.body;

        // Input validation - prevent score manipulation
        if (!leadId) {
            return res.status(400).json({
                success: false,
                error: 'leadId is required'
            });
        }

        // Sanitize and validate leadId
        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format'
            });
        }

        // Validate page (optional but should be reasonable length if provided)
        if (page && (typeof page !== 'string' || page.length > 2048)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid page format or length'
            });
        }

        // Validate duration to prevent score manipulation
        if (duration !== undefined && duration !== null) {
            if (typeof duration !== 'number' || duration < 0 || duration > 86400) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid duration. Must be a number between 0 and 86400 seconds (24 hours)'
                });
            }
        }

        // Verify lead exists before tracking
        const lead = await Lead.findById(sanitizedLeadId);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        await LeadScoringService.trackWebsiteVisit(sanitizedLeadId, page, duration);

        res.json({ success: true });
    });

    /**
     * @desc    Track form submission
     * @route   POST /api/lead-scoring/track/form-submit
     * @access  Public (webhook)
     */
    trackFormSubmit = asyncHandler(async (req, res) => {
        const { leadId, formId } = req.body;

        // Input validation - prevent score manipulation
        if (!leadId) {
            return res.status(400).json({
                success: false,
                error: 'leadId is required'
            });
        }

        // Sanitize and validate leadId
        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format'
            });
        }

        // Sanitize formId if provided
        let sanitizedFormId = null;
        if (formId) {
            sanitizedFormId = sanitizeObjectId(formId);
            if (!sanitizedFormId) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid form ID format'
                });
            }
        }

        // Verify lead exists before tracking
        const lead = await Lead.findById(sanitizedLeadId);
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found'
            });
        }

        await LeadScoringService.trackFormSubmission(sanitizedLeadId, sanitizedFormId);

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
        const firmId = req.firmId;

        const result = await LeadScoringService.processAllDecay(firmId);

        res.json({
            success: true,
            message: `Processed decay for ${result.processed} leads`,
            data: result
        });
    });
}

module.exports = new LeadScoringController();
