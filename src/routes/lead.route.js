const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const { userMiddleware, firmFilter } = require('../middlewares');
const { apiRateLimiter } = require('../middlewares/rateLimiter.middleware');
const {
    validateCreateLead,
    validateUpdateLead,
    validateUpdateStatus,
    validateMoveToStage,
    validateConvertToClient,
    validateLogActivity,
    validateScheduleFollowUp,
    validateGetLeadsQuery,
    validateGetActivitiesQuery,
    validateLeadIdParam
} = require('../validators/lead.validator');

// Apply rate limiting, authentication and firm filter to all routes
router.use(apiRateLimiter);
router.use(userMiddleware, firmFilter);

// ============================================
// BATCH ENDPOINT: CRM OVERVIEW
// ============================================
router.get('/overview', leadController.getCrmOverview);

// ============================================
// LEAD ROUTES
// ============================================

// Bulk delete (must be before /:id routes)
router.post('/bulk-delete', leadController.bulkDeleteLeads);

// CRUD
router.post('/', validateCreateLead, leadController.createLead);
router.get('/', validateGetLeadsQuery, leadController.getLeads);
router.get('/stats', leadController.getStats);
router.get('/follow-up', leadController.getNeedingFollowUp);
router.get('/pipeline/:pipelineId?', leadController.getByPipeline);
router.get('/:id', validateLeadIdParam, leadController.getLead);
router.put('/:id', validateLeadIdParam, validateUpdateLead, leadController.updateLead);
router.delete('/:id', validateLeadIdParam, leadController.deleteLead);

// Status & Pipeline
router.post('/:id/status', validateLeadIdParam, validateUpdateStatus, leadController.updateStatus);
router.post('/:id/move', validateLeadIdParam, validateMoveToStage, leadController.moveToStage);

// Conversion
router.get('/:id/conversion-preview', validateLeadIdParam, leadController.previewConversion);
router.post('/:id/convert', validateLeadIdParam, validateConvertToClient, leadController.convertToClient);

// Activities
router.get('/:id/activities', validateLeadIdParam, validateGetActivitiesQuery, leadController.getActivities);
router.post('/:id/activities', validateLeadIdParam, validateLogActivity, leadController.logActivity);
router.post('/:id/follow-up', validateLeadIdParam, validateScheduleFollowUp, leadController.scheduleFollowUp);

// ============================================
// NAJIZ VERIFICATION ROUTES
// ============================================

// Wathq - Commercial Registration Verification
router.post('/:id/verify/wathq', validateLeadIdParam, async (req, res) => {
    try {
        const Lead = require('../models/lead.model');
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        // TODO: Integrate with actual Wathq API
        lead.isVerified = true;
        lead.verificationSource = 'wathq';
        lead.verifiedAt = new Date();
        lead.verificationData = {
            method: 'manual',
            verifiedBy: req.userID,
            crNumber: req.body.crNumber || lead.crNumber
        };
        await lead.save();

        res.json({
            success: true,
            message: 'Wathq verification recorded',
            data: {
                isVerified: lead.isVerified,
                verificationSource: lead.verificationSource,
                verifiedAt: lead.verifiedAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Absher - National ID / Iqama Verification
router.post('/:id/verify/absher', validateLeadIdParam, async (req, res) => {
    try {
        const Lead = require('../models/lead.model');
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        // TODO: Integrate with actual Absher API
        lead.isVerified = true;
        lead.verificationSource = 'absher';
        lead.verifiedAt = new Date();
        lead.verificationData = {
            method: 'manual',
            verifiedBy: req.userID,
            nationalId: req.body.nationalId || lead.nationalId,
            iqamaNumber: req.body.iqamaNumber || lead.iqamaNumber
        };
        await lead.save();

        res.json({
            success: true,
            message: 'Absher verification recorded',
            data: {
                isVerified: lead.isVerified,
                verificationSource: lead.verificationSource,
                verifiedAt: lead.verifiedAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Saudi Post - National Address Verification
router.post('/:id/verify/address', validateLeadIdParam, async (req, res) => {
    try {
        const Lead = require('../models/lead.model');
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        // TODO: Integrate with actual Saudi Post API
        if (!lead.nationalAddress) {
            lead.nationalAddress = {};
        }

        if (req.body) {
            Object.assign(lead.nationalAddress, req.body);
        }

        lead.nationalAddress.isVerified = true;
        lead.nationalAddress.verifiedAt = new Date();
        await lead.save();

        res.json({
            success: true,
            message: 'Address verification recorded',
            data: {
                nationalAddress: lead.nationalAddress
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Conflict Check
router.post('/:id/conflict-check', validateLeadIdParam, async (req, res) => {
    try {
        const Lead = require('../models/lead.model');
        const lead = await Lead.findById(req.params.id);

        if (!lead) {
            return res.status(404).json({ success: false, message: 'Lead not found' });
        }

        // Run conflict check against existing clients and leads
        const Client = require('../models/client.model');
        const conflicts = [];

        // Check by national ID
        if (lead.nationalId) {
            const existingClient = await Client.findOne({
                firmId: lead.firmId,
                nationalId: lead.nationalId,
                _id: { $ne: lead._id }
            });
            if (existingClient) {
                conflicts.push({
                    type: 'nationalId',
                    entity: 'client',
                    entityId: existingClient._id,
                    message: 'Client exists with same National ID'
                });
            }
        }

        // Check by CR number
        if (lead.crNumber) {
            const existingClient = await Client.findOne({
                firmId: lead.firmId,
                crNumber: lead.crNumber,
                _id: { $ne: lead._id }
            });
            if (existingClient) {
                conflicts.push({
                    type: 'crNumber',
                    entity: 'client',
                    entityId: existingClient._id,
                    message: 'Client exists with same CR Number'
                });
            }
        }

        lead.conflictCheckStatus = conflicts.length > 0 ? 'potential_conflict' : 'clear';
        lead.conflictCheckDate = new Date();
        lead.conflictNotes = conflicts.length > 0 ? JSON.stringify(conflicts) : 'No conflicts found';
        await lead.save();

        res.json({
            success: true,
            hasConflict: conflicts.length > 0,
            conflicts,
            data: {
                conflictCheckStatus: lead.conflictCheckStatus,
                conflictCheckDate: lead.conflictCheckDate
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
