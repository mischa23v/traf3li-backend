/**
 * CRM Transaction Controller
 *
 * Enterprise-grade transaction/audit log endpoints.
 * All endpoints enforce multi-tenant isolation via req.firmQuery.
 */

const crmTransactionService = require('../services/crmTransaction.service');
const staleLeadsService = require('../services/staleLeads.service');
const revenueForecastService = require('../services/revenueForecast.service');
const { CustomException } = require('../utils');
const { sanitizeObjectId } = require('../utils/securityUtils');

/**
 * Get transactions with filters
 * GET /api/crm-transactions
 */
const getTransactions = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId && !req.isSoloLawyer) {
            throw CustomException('Firm context required', 400);
        }

        const result = await crmTransactionService.getTransactions(
            firmId || req.userID,
            {
                type: req.query.type,
                category: req.query.category,
                entityType: req.query.entityType,
                entityId: req.query.entityId,
                performedBy: req.query.performedBy,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                page: parseInt(req.query.page) || 1,
                limit: parseInt(req.query.limit) || 50,
                sort: req.query.sort || '-createdAt'
            }
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[CRMTransaction] Get transactions error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve transactions'
        });
    }
};

/**
 * Get entity timeline
 * GET /api/crm-transactions/entity/:entityType/:entityId
 */
const getEntityTimeline = async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const firmId = req.firmId;

        const sanitizedEntityId = sanitizeObjectId(entityId);

        const result = await crmTransactionService.getEntityTimeline(
            entityType,
            sanitizedEntityId,
            firmId,
            {
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0,
                types: req.query.types ? req.query.types.split(',') : null,
                startDate: req.query.startDate,
                endDate: req.query.endDate
            }
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[CRMTransaction] Get timeline error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve timeline'
        });
    }
};

/**
 * Get transaction summary
 * GET /api/crm-transactions/summary
 */
const getSummary = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const summary = await crmTransactionService.getSummary(firmId, {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            entityType: req.query.entityType
        });

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('[CRMTransaction] Get summary error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve summary'
        });
    }
};

/**
 * Get user activity summary
 * GET /api/crm-transactions/user-activity/:userId
 */
const getUserActivity = async (req, res) => {
    try {
        const { userId } = req.params;
        const firmId = req.firmId;

        const sanitizedUserId = sanitizeObjectId(userId);

        const activity = await crmTransactionService.getUserActivitySummary(
            sanitizedUserId,
            firmId,
            { days: parseInt(req.query.days) || 30 }
        );

        res.json({
            success: true,
            data: activity
        });
    } catch (error) {
        console.error('[CRMTransaction] Get user activity error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve user activity'
        });
    }
};

/**
 * Get daily report
 * GET /api/crm-transactions/daily-report
 */
const getDailyReport = async (req, res) => {
    try {
        const firmId = req.firmId;
        const date = req.query.date ? new Date(req.query.date) : new Date();

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const report = await crmTransactionService.getDailyReport(firmId, date);

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('[CRMTransaction] Get daily report error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to generate daily report'
        });
    }
};

/**
 * Export transactions
 * GET /api/crm-transactions/export
 */
const exportTransactions = async (req, res) => {
    try {
        const firmId = req.firmId;
        const format = req.query.format || 'json';

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const data = await crmTransactionService.exportTransactions(firmId, {
            format,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            type: req.query.type,
            category: req.query.category
        });

        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=crm-transactions.csv');
            return res.send(data);
        }

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('[CRMTransaction] Export error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to export transactions'
        });
    }
};

/**
 * Get stale leads
 * GET /api/crm-transactions/stale-leads
 */
const getStaleLeads = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId && !req.isSoloLawyer) {
            throw CustomException('Firm context required', 400);
        }

        const result = req.isSoloLawyer
            ? await staleLeadsService.getStaleLeadsForLawyer(req.userID, {
                threshold: req.query.threshold,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            })
            : await staleLeadsService.getStaleLeads(firmId, {
                threshold: req.query.threshold,
                stageId: req.query.stageId ? sanitizeObjectId(req.query.stageId) : null,
                assignedTo: req.query.assignedTo ? sanitizeObjectId(req.query.assignedTo) : null,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('[CRMTransaction] Get stale leads error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve stale leads'
        });
    }
};

/**
 * Get stale leads summary
 * GET /api/crm-transactions/stale-leads/summary
 */
const getStaleSummary = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const summary = await staleLeadsService.getStaleSummary(firmId);

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('[CRMTransaction] Get stale summary error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve stale summary'
        });
    }
};

/**
 * Get staleness by stage
 * GET /api/crm-transactions/stale-leads/by-stage
 */
const getStalenessbyStage = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const data = await staleLeadsService.getStalenessbyStage(
            firmId,
            req.query.pipelineId ? sanitizeObjectId(req.query.pipelineId) : null
        );

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error('[CRMTransaction] Get staleness by stage error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve staleness by stage'
        });
    }
};

/**
 * Get leads needing attention
 * GET /api/crm-transactions/leads-needing-attention
 */
const getLeadsNeedingAttention = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const leads = await staleLeadsService.getLeadsNeedingAttention(firmId, {
            limit: parseInt(req.query.limit) || 10
        });

        res.json({
            success: true,
            data: leads
        });
    } catch (error) {
        console.error('[CRMTransaction] Get leads needing attention error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve leads needing attention'
        });
    }
};

/**
 * Get revenue forecast
 * GET /api/crm-transactions/revenue-forecast
 */
const getRevenueForecast = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const forecast = await revenueForecastService.getForecast(firmId, {
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            pipelineId: req.query.pipelineId ? sanitizeObjectId(req.query.pipelineId) : null,
            assignedTo: req.query.assignedTo ? sanitizeObjectId(req.query.assignedTo) : null,
            groupBy: req.query.groupBy
        });

        res.json({
            success: true,
            data: forecast
        });
    } catch (error) {
        console.error('[CRMTransaction] Get revenue forecast error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve revenue forecast'
        });
    }
};

/**
 * Get forecast by period
 * GET /api/crm-transactions/revenue-forecast/by-period
 */
const getForecastByPeriod = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const forecast = await revenueForecastService.getForecastByPeriod(firmId, {
            months: parseInt(req.query.months) || 6,
            pipelineId: req.query.pipelineId ? sanitizeObjectId(req.query.pipelineId) : null
        });

        res.json({
            success: true,
            data: forecast
        });
    } catch (error) {
        console.error('[CRMTransaction] Get forecast by period error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve forecast by period'
        });
    }
};

/**
 * Get pipeline velocity
 * GET /api/crm-transactions/pipeline-velocity
 */
const getPipelineVelocity = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const velocity = await revenueForecastService.getPipelineVelocity(firmId, {
            days: parseInt(req.query.days) || 90,
            pipelineId: req.query.pipelineId ? sanitizeObjectId(req.query.pipelineId) : null
        });

        res.json({
            success: true,
            data: velocity
        });
    } catch (error) {
        console.error('[CRMTransaction] Get pipeline velocity error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve pipeline velocity'
        });
    }
};

/**
 * Get forecast trends
 * GET /api/crm-transactions/forecast-trends
 */
const getForecastTrends = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const trends = await revenueForecastService.getForecastTrends(firmId, {
            months: parseInt(req.query.months) || 6
        });

        res.json({
            success: true,
            data: trends
        });
    } catch (error) {
        console.error('[CRMTransaction] Get forecast trends error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve forecast trends'
        });
    }
};

/**
 * Get forecast by category
 * GET /api/crm-transactions/forecast-by-category
 */
const getForecastByCategory = async (req, res) => {
    try {
        const firmId = req.firmId;

        if (!firmId) {
            throw CustomException('Firm context required', 400);
        }

        const forecast = await revenueForecastService.getForecastByCategory(firmId, {
            quarter: parseInt(req.query.quarter),
            year: parseInt(req.query.year) || new Date().getFullYear()
        });

        res.json({
            success: true,
            data: forecast
        });
    } catch (error) {
        console.error('[CRMTransaction] Get forecast by category error:', error.message);
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || 'Failed to retrieve forecast by category'
        });
    }
};

module.exports = {
    getTransactions,
    getEntityTimeline,
    getSummary,
    getUserActivity,
    getDailyReport,
    exportTransactions,
    getStaleLeads,
    getStaleSummary,
    getStalenessbyStage,
    getLeadsNeedingAttention,
    getRevenueForecast,
    getForecastByPeriod,
    getPipelineVelocity,
    getForecastTrends,
    getForecastByCategory
};
