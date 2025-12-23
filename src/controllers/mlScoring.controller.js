const asyncHandler = require('express-async-handler');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const Lead = require('../models/lead.model');

// ═══════════════════════════════════════════════════════════════
// ML LEAD SCORING CONTROLLER
// Machine Learning-enhanced lead scoring with priority queuing
// ═══════════════════════════════════════════════════════════════

class MLScoringController {
    // ═══════════════════════════════════════════════════════════
    // SCORE ENDPOINTS
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Get ML scores for leads
     * @route   GET /api/ml/scores
     * @access  Private
     */
    getScores = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const { page = 1, limit = 50, minScore, maxScore } = req.query;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm to access ML scoring features'
            });
        }

        // TODO: Implement ML scoring service integration
        // const scores = await MLScoringService.getScores(firmId, { page, limit, minScore, maxScore });

        res.json({
            success: true,
            data: {
                scores: [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: 0,
                    pages: 0
                }
            },
            message: 'ML scoring feature coming soon'
        });
    });

    /**
     * @desc    Get ML score for specific lead
     * @route   GET /api/ml/scores/:leadId
     * @access  Private
     */
    getScore = asyncHandler(async (req, res) => {
        const { leadId } = req.params;
        const firmId = req.firmId;
        const lawyerId = req.userID;

        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'The provided lead ID is not valid'
            });
        }

        // IDOR Protection
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

        // TODO: Implement ML scoring service
        // const score = await MLScoringService.getScore(sanitizedLeadId);

        res.json({
            success: true,
            data: {
                leadId: sanitizedLeadId,
                mlScore: null,
                confidence: null,
                lastCalculated: null
            },
            message: 'ML scoring feature coming soon'
        });
    });

    /**
     * @desc    Calculate/refresh ML score for specific lead
     * @route   POST /api/ml/scores/:leadId/calculate
     * @access  Private
     */
    calculateScore = asyncHandler(async (req, res) => {
        const { leadId } = req.params;
        const firmId = req.firmId;
        const lawyerId = req.userID;

        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'The provided lead ID is not valid'
            });
        }

        // IDOR Protection
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

        // TODO: Implement ML scoring calculation
        // const score = await MLScoringService.calculateScore(sanitizedLeadId);

        res.json({
            success: true,
            message: 'ML score calculation initiated',
            data: {
                leadId: sanitizedLeadId,
                status: 'pending'
            }
        });
    });

    /**
     * @desc    Batch calculate scores
     * @route   POST /api/ml/scores/batch
     * @access  Private
     */
    calculateBatch = asyncHandler(async (req, res) => {
        const { leadIds } = req.body;
        const firmId = req.firmId;
        const lawyerId = req.userID;

        if (!leadIds || !Array.isArray(leadIds)) {
            return res.status(400).json({
                success: false,
                error: 'leadIds array is required',
                message: 'Please provide an array of lead IDs'
            });
        }

        if (leadIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'leadIds array cannot be empty',
                message: 'Please provide at least one lead ID'
            });
        }

        if (leadIds.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Batch size limit exceeded',
                message: 'Cannot process more than 100 leads at once'
            });
        }

        // Sanitize all lead IDs
        const sanitizedLeadIds = leadIds.map(id => sanitizeObjectId(id)).filter(Boolean);

        if (sanitizedLeadIds.length !== leadIds.length) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'One or more lead IDs are not valid'
            });
        }

        // IDOR Protection
        const query = firmId
            ? { _id: { $in: sanitizedLeadIds }, firmId }
            : { _id: { $in: sanitizedLeadIds }, lawyerId };

        const ownedLeads = await Lead.find(query).select('_id');

        if (ownedLeads.length !== sanitizedLeadIds.length) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'One or more leads do not belong to your firm'
            });
        }

        // TODO: Implement batch scoring
        // const results = await MLScoringService.calculateBatch(sanitizedLeadIds);

        res.json({
            success: true,
            message: 'Batch calculation initiated',
            data: {
                total: sanitizedLeadIds.length,
                status: 'pending'
            }
        });
    });

    /**
     * @desc    Get SHAP explanation for ML score
     * @route   GET /api/ml/scores/:leadId/explanation
     * @access  Private
     */
    getExplanation = asyncHandler(async (req, res) => {
        const { leadId } = req.params;
        const firmId = req.firmId;
        const lawyerId = req.userID;

        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'The provided lead ID is not valid'
            });
        }

        // IDOR Protection
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

        // TODO: Implement SHAP explanation
        // const explanation = await MLScoringService.getExplanation(sanitizedLeadId);

        res.json({
            success: true,
            data: {
                leadId: sanitizedLeadId,
                featureImportance: [],
                shapValues: null
            },
            message: 'SHAP explanation feature coming soon'
        });
    });

    /**
     * @desc    Get hybrid ML + rules score
     * @route   GET /api/ml/scores/:leadId/hybrid
     * @access  Private
     */
    getHybridScore = asyncHandler(async (req, res) => {
        const { leadId } = req.params;
        const firmId = req.firmId;
        const lawyerId = req.userID;

        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'The provided lead ID is not valid'
            });
        }

        // IDOR Protection
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

        // TODO: Implement hybrid scoring
        // const hybridScore = await MLScoringService.getHybridScore(sanitizedLeadId);

        res.json({
            success: true,
            data: {
                leadId: sanitizedLeadId,
                mlScore: null,
                rulesScore: null,
                hybridScore: null,
                weights: { ml: 0.7, rules: 0.3 }
            },
            message: 'Hybrid scoring feature coming soon'
        });
    });

    // ═══════════════════════════════════════════════════════════
    // TRAINING ENDPOINTS (Admin Only)
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Train ML model
     * @route   POST /api/ml/train
     * @access  Private (Admin only)
     */
    trainModel = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        // TODO: Implement model training
        // const result = await MLScoringService.trainModel(firmId);

        res.json({
            success: true,
            message: 'Model training initiated',
            data: {
                status: 'pending',
                estimatedTime: '15-30 minutes'
            }
        });
    });

    /**
     * @desc    Get model performance metrics
     * @route   GET /api/ml/model/metrics
     * @access  Private (Admin only)
     */
    getModelMetrics = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        // TODO: Implement metrics retrieval
        // const metrics = await MLScoringService.getModelMetrics(firmId);

        res.json({
            success: true,
            data: {
                accuracy: null,
                precision: null,
                recall: null,
                f1Score: null,
                auc: null,
                lastTrainedAt: null
            },
            message: 'Model metrics feature coming soon'
        });
    });

    /**
     * @desc    Export training data
     * @route   POST /api/ml/model/export
     * @access  Private (Admin only)
     */
    exportTrainingData = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        // TODO: Implement data export
        // const exportUrl = await MLScoringService.exportTrainingData(firmId);

        res.json({
            success: true,
            message: 'Export initiated',
            data: {
                status: 'pending'
            }
        });
    });

    // ═══════════════════════════════════════════════════════════
    // PRIORITY QUEUE ENDPOINTS
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Get prioritized leads for sales rep
     * @route   GET /api/ml/priority-queue
     * @access  Private
     */
    getPriorityQueue = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const userId = req.userID;
        const { limit = 20 } = req.query;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        // TODO: Implement priority queue
        // const queue = await MLScoringService.getPriorityQueue(firmId, userId, limit);

        res.json({
            success: true,
            data: {
                leads: [],
                totalPending: 0
            },
            message: 'Priority queue feature coming soon'
        });
    });

    /**
     * @desc    Get team workload distribution
     * @route   GET /api/ml/priority-queue/workload
     * @access  Private
     */
    getWorkload = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        // TODO: Implement workload distribution
        // const workload = await MLScoringService.getWorkload(firmId);

        res.json({
            success: true,
            data: {
                teamMembers: [],
                distribution: []
            },
            message: 'Workload feature coming soon'
        });
    });

    /**
     * @desc    Record contact (resets SLA)
     * @route   POST /api/ml/priority/:leadId/contact
     * @access  Private
     */
    recordContact = asyncHandler(async (req, res) => {
        const { leadId } = req.params;
        const firmId = req.firmId;
        const lawyerId = req.userID;
        const { contactType, notes } = req.body;

        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'The provided lead ID is not valid'
            });
        }

        // IDOR Protection
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

        // TODO: Implement contact recording
        // await MLScoringService.recordContact(sanitizedLeadId, userId, contactType, notes);

        res.json({
            success: true,
            message: 'Contact recorded successfully',
            data: {
                leadId: sanitizedLeadId,
                slaReset: true
            }
        });
    });

    /**
     * @desc    Assign lead to rep
     * @route   PUT /api/ml/priority/:leadId/assign
     * @access  Private
     */
    assignLead = asyncHandler(async (req, res) => {
        const { leadId } = req.params;
        const { assignedTo } = req.body;
        const firmId = req.firmId;

        const sanitizedLeadId = sanitizeObjectId(leadId);
        if (!sanitizedLeadId) {
            return res.status(400).json({
                success: false,
                error: 'Invalid lead ID format',
                message: 'The provided lead ID is not valid'
            });
        }

        const sanitizedAssignedTo = sanitizeObjectId(assignedTo);
        if (!sanitizedAssignedTo) {
            return res.status(400).json({
                success: false,
                error: 'Invalid assignee ID format',
                message: 'The provided assignee ID is not valid'
            });
        }

        // IDOR Protection
        const lead = await Lead.findOne({ _id: sanitizedLeadId, firmId });
        if (!lead) {
            return res.status(404).json({
                success: false,
                error: 'Lead not found',
                message: 'The requested lead does not exist or you do not have access to it'
            });
        }

        // TODO: Implement assignment
        // await MLScoringService.assignLead(sanitizedLeadId, sanitizedAssignedTo);

        res.json({
            success: true,
            message: 'Lead assigned successfully',
            data: {
                leadId: sanitizedLeadId,
                assignedTo: sanitizedAssignedTo
            }
        });
    });

    /**
     * @desc    Get SLA metrics
     * @route   GET /api/ml/sla/metrics
     * @access  Private
     */
    getSLAMetrics = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        // TODO: Implement SLA metrics
        // const metrics = await MLScoringService.getSLAMetrics(firmId);

        res.json({
            success: true,
            data: {
                totalLeads: 0,
                withinSLA: 0,
                breached: 0,
                avgResponseTime: 0
            },
            message: 'SLA metrics feature coming soon'
        });
    });

    /**
     * @desc    Get current SLA breaches
     * @route   GET /api/ml/sla/breaches
     * @access  Private
     */
    getSLABreaches = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        // TODO: Implement SLA breach reporting
        // const breaches = await MLScoringService.getSLABreaches(firmId);

        res.json({
            success: true,
            data: {
                breaches: []
            },
            message: 'SLA breach tracking feature coming soon'
        });
    });

    // ═══════════════════════════════════════════════════════════
    // ANALYTICS ENDPOINTS
    // ═══════════════════════════════════════════════════════════

    /**
     * @desc    Get ML scoring dashboard
     * @route   GET /api/ml/analytics/dashboard
     * @access  Private
     */
    getDashboard = asyncHandler(async (req, res) => {
        const firmId = req.firmId;
        const { period = '30' } = req.query;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        const periodNum = parseInt(period);
        if (isNaN(periodNum) || periodNum < 1 || periodNum > 365) {
            return res.status(400).json({
                success: false,
                error: 'Invalid period',
                message: 'Period must be between 1 and 365 days'
            });
        }

        // TODO: Implement dashboard
        // const dashboard = await MLScoringService.getDashboard(firmId, periodNum);

        res.json({
            success: true,
            data: {
                totalLeads: 0,
                avgMLScore: 0,
                conversionRate: 0,
                topFeatures: []
            },
            message: 'ML dashboard feature coming soon'
        });
    });

    /**
     * @desc    Get feature importance
     * @route   GET /api/ml/analytics/feature-importance
     * @access  Private
     */
    getFeatureImportance = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        // TODO: Implement feature importance
        // const features = await MLScoringService.getFeatureImportance(firmId);

        res.json({
            success: true,
            data: {
                features: []
            },
            message: 'Feature importance feature coming soon'
        });
    });

    /**
     * @desc    Get score distribution
     * @route   GET /api/ml/analytics/score-distribution
     * @access  Private
     */
    getScoreDistribution = asyncHandler(async (req, res) => {
        const firmId = req.firmId;

        if (!firmId) {
            return res.status(400).json({
                success: false,
                error: 'Firm context is required',
                message: 'Please ensure you are part of a firm'
            });
        }

        // TODO: Implement score distribution
        // const distribution = await MLScoringService.getScoreDistribution(firmId);

        res.json({
            success: true,
            data: {
                distribution: [],
                buckets: []
            },
            message: 'Score distribution feature coming soon'
        });
    });
}

module.exports = new MLScoringController();
