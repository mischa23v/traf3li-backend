const Lead = require('../models/lead.model');
const Pipeline = require('../models/pipeline.model');
const CrmActivity = require('../models/crmActivity.model');
const Client = require('../models/client.model');
const { pickAllowedFields, sanitizeEmail, sanitizePhone } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ============================================
// LEAD CRUD OPERATIONS
// ============================================

// Create a new lead
exports.createLead = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى العملاء المحتملين'
            });
        }

        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware

        // ═══════════════════════════════════════════════════════════════
        // MASS ASSIGNMENT PROTECTION - Only allow specific fields
        // ═══════════════════════════════════════════════════════════════
        const ALLOWED_LEAD_FIELDS = ['name', 'email', 'phone', 'source', 'status', 'notes', 'assignedTo'];
        const sanitizedData = pickAllowedFields(req.body, ALLOWED_LEAD_FIELDS);

        // ═══════════════════════════════════════════════════════════════
        // INPUT VALIDATION - Email and Phone
        // ═══════════════════════════════════════════════════════════════
        if (sanitizedData.email) {
            sanitizedData.email = sanitizeEmail(sanitizedData.email);
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sanitizedData.email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }
        }

        if (sanitizedData.phone) {
            sanitizedData.phone = sanitizePhone(sanitizedData.phone);
            // Validate phone has at least 7 digits after sanitization
            const digitsOnly = sanitizedData.phone.replace(/\D/g, '');
            if (digitsOnly.length < 7) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid phone number format'
                });
            }
        }

        const leadData = {
            ...sanitizedData,
            lawyerId,
            firmId, // Add firmId for multi-tenancy
            createdBy: lawyerId
        };

        // Get default pipeline if not specified
        let pipeline = null;
        if (!leadData.pipelineId) {
            pipeline = await Pipeline.getDefault(lawyerId, 'lead');
            leadData.pipelineId = pipeline._id;
            leadData.pipelineStageId = pipeline.stages[0]?.stageId;
        } else {
            // Fetch the specified pipeline
            pipeline = await Pipeline.findById(leadData.pipelineId);
        }

        const lead = await Lead.create(leadData);

        // ═══════════════════════════════════════════════════════════════
        // EXECUTE STAGE AUTOMATION - "onEnter" for initial stage
        // ═══════════════════════════════════════════════════════════════
        const PipelineAutomationService = require('../services/pipelineAutomation.service');
        let automationResults = null;

        if (pipeline && lead.pipelineStageId) {
            const initialStage = pipeline.getStage(lead.pipelineStageId);
            if (initialStage) {
                try {
                    const automationResult = await PipelineAutomationService.executeOnEnter(
                        lead,
                        initialStage,
                        lawyerId
                    );
                    automationResults = automationResult;
                } catch (automationError) {
                    logger.error('Initial stage automation error:', automationError);
                    // Don't fail lead creation if automation fails
                }
            }
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId,
            type: 'lead_created',
            entityType: 'lead',
            entityId: lead._id,
            entityName: lead.displayName,
            title: `New lead created: ${lead.displayName}`,
            performedBy: lawyerId
        });

        res.status(201).json({
            success: true,
            message: 'Lead created successfully',
            data: {
                lead,
                automation: automationResults
            }
        });
    } catch (error) {
        logger.error('Error creating lead:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating lead',
            error: error.message
        });
    }
};

// Get all leads
exports.getLeads = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى العملاء المحتملين'
            });
        }

        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;
        const {
            status, source, assignedTo, pipelineId, search,
            convertedToClient, sortBy, sortOrder,
            page = 1, limit = 50
        } = req.query;

        const filters = {
            status,
            source,
            assignedTo,
            pipelineId,
            search,
            convertedToClient: convertedToClient === 'true' ? true : convertedToClient === 'false' ? false : undefined,
            sortBy,
            sortOrder,
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit),
            firmId // Pass firmId to filter by firm
        };

        // Use firmId-aware getLeads
        const leads = await Lead.getLeads(lawyerId, filters);

        // Build count query based on user type
        const countQuery = {};
        if (isSoloLawyer || !firmId) {
            countQuery.lawyerId = lawyerId;
        } else {
            countQuery.firmId = firmId;
        }
        const total = await Lead.countDocuments({
            ...countQuery,
            ...(status ? { status } : {}),
            ...(convertedToClient !== undefined ? { convertedToClient: filters.convertedToClient } : {})
        });

        res.json({
            success: true,
            data: leads,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error getting leads:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting leads',
            error: error.message
        });
    }
};

// Get single lead
exports.getLead = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى العملاء المحتملين'
            });
        }

        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;

        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }] };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOne(accessQuery)
        .populate('assignedTo', 'firstName lastName avatar email')
        .populate('teamMembers', 'firstName lastName avatar')
        .populate('source.referralId', 'name')
        .populate('organizationId', 'legalName tradeName type email phone')
        .populate('contactId', 'firstName lastName email phone title company')
        .populate('clientId', 'name clientId')
        .populate('caseId', 'title caseNumber')
        .lean();

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        // Get recent activities
        const activities = await CrmActivity.getEntityActivities('lead', lead._id, { limit: 10 });

        res.json({
            success: true,
            data: {
                lead,
                activities
            }
        });
    } catch (error) {
        logger.error('Error getting lead:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting lead',
            error: error.message
        });
    }
};

// Update lead
exports.updateLead = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتعديل العملاء المحتملين'
            });
        }

        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;

        // ═══════════════════════════════════════════════════════════════
        // MASS ASSIGNMENT PROTECTION - Only allow specific fields
        // ═══════════════════════════════════════════════════════════════
        const ALLOWED_LEAD_FIELDS = ['name', 'email', 'phone', 'source', 'status', 'notes', 'assignedTo'];
        let updates = pickAllowedFields(req.body, ALLOWED_LEAD_FIELDS);

        // ═══════════════════════════════════════════════════════════════
        // INPUT VALIDATION - Email and Phone
        // ═══════════════════════════════════════════════════════════════
        if (updates.email) {
            updates.email = sanitizeEmail(updates.email);
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updates.email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }
        }

        if (updates.phone) {
            updates.phone = sanitizePhone(updates.phone);
            // Validate phone has at least 7 digits after sanitization
            const digitsOnly = updates.phone.replace(/\D/g, '');
            if (digitsOnly.length < 7) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid phone number format'
                });
            }
        }

        // ═══════════════════════════════════════════════════════════════
        // IDOR PROTECTION - Verify lead belongs to user's firm
        // ═══════════════════════════════════════════════════════════════
        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }] };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOne(accessQuery);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        // Track status change
        const oldStatus = lead.status;

        // Apply only allowed updates
        Object.keys(updates).forEach(key => {
            lead[key] = updates[key];
        });

        lead.lastModifiedBy = lawyerId;
        await lead.save();

        // Log status change
        if (updates.status && updates.status !== oldStatus) {
            await CrmActivity.logActivity({
                lawyerId,
                type: 'status_change',
                entityType: 'lead',
                entityId: lead._id,
                entityName: lead.displayName,
                title: `Status changed from ${oldStatus} to ${updates.status}`,
                description: updates.statusChangeNote,
                performedBy: lawyerId
            });
        }

        res.json({
            success: true,
            message: 'Lead updated successfully',
            data: lead
        });
    } catch (error) {
        logger.error('Error updating lead:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating lead',
            error: error.message
        });
    }
};

// Delete lead
exports.deleteLead = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لحذف العملاء المحتملين'
            });
        }

        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;

        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }], convertedToClient: false };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOneAndDelete(accessQuery);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found or already converted'
            });
        }

        res.json({
            success: true,
            message: 'Lead deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting lead:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting lead',
            error: error.message
        });
    }
};

// Bulk delete leads
exports.bulkDeleteLeads = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لحذف العملاء المحتملين'
            });
        }

        const { ids } = req.body;
        const lawyerId = req.userID;
        const firmId = req.firmId;
        const isSoloLawyer = req.isSoloLawyer;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب توفير قائمة المعرفات / IDs list is required'
            });
        }

        // Build access query based on user type - only delete non-converted leads
        const accessQuery = { _id: { $in: ids }, convertedToClient: false };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const result = await Lead.deleteMany(accessQuery);

        res.json({
            success: true,
            message: `تم حذف ${result.deletedCount} عميل محتمل بنجاح / ${result.deletedCount} lead(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        logger.error('Error bulk deleting leads:', error);
        res.status(500).json({
            success: false,
            message: 'Error bulk deleting leads',
            error: error.message
        });
    }
};

// ============================================
// LEAD STATUS & PIPELINE OPERATIONS
// ============================================

// Update lead status
exports.updateStatus = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتعديل حالة العملاء المحتملين'
            });
        }

        const { id } = req.params;
        const { status, notes, lostReason } = req.body;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;

        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }] };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOne(accessQuery);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        if (status === 'lost' && lostReason) {
            lead.lostReason = lostReason;
            lead.lostNotes = notes;
        }

        await lead.updateStatus(status, lawyerId, notes);

        res.json({
            success: true,
            message: 'Lead status updated',
            data: lead
        });
    } catch (error) {
        logger.error('Error updating lead status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating lead status',
            error: error.message
        });
    }
};

// Move lead to pipeline stage
exports.moveToStage = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتعديل العملاء المحتملين'
            });
        }

        const { id } = req.params;
        const { stageId, notes } = req.body;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;

        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }] };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOne(accessQuery);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        const pipeline = await Pipeline.findById(lead.pipelineId);
        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Pipeline not found'
            });
        }

        const newStage = pipeline.getStage(stageId);
        if (!newStage) {
            return res.status(404).json({
                success: false,
                message: 'Stage not found'
            });
        }

        // Get old stage for exit automation
        const oldStageId = lead.pipelineStageId;
        const oldStage = oldStageId ? pipeline.getStage(oldStageId) : null;

        // ═══════════════════════════════════════════════════════════════
        // EXECUTE STAGE AUTOMATION
        // ═══════════════════════════════════════════════════════════════
        const PipelineAutomationService = require('../services/pipelineAutomation.service');

        // Execute "onExit" automation for old stage
        if (oldStage) {
            try {
                await PipelineAutomationService.executeOnExit(lead, oldStage, lawyerId);
            } catch (automationError) {
                logger.error('Stage exit automation error:', automationError);
                // Don't fail the stage move if automation fails
            }
        }

        // Update lead stage
        lead.pipelineStageId = stageId;
        lead.probability = newStage.probability;

        if (newStage.isWonStage) {
            lead.status = 'won';
            lead.actualCloseDate = new Date();
        } else if (newStage.isLostStage) {
            lead.status = 'lost';
            lead.actualCloseDate = new Date();
        }

        lead.lastModifiedBy = lawyerId;
        await lead.save();

        // Execute "onEnter" automation for new stage
        let automationResults = null;
        try {
            const automationResult = await PipelineAutomationService.executeOnEnter(
                lead,
                newStage,
                lawyerId,
                oldStage
            );
            automationResults = automationResult;
        } catch (automationError) {
            logger.error('Stage enter automation error:', automationError);
            // Don't fail the stage move if automation fails
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId,
            type: 'stage_change',
            entityType: 'lead',
            entityId: lead._id,
            entityName: lead.displayName,
            title: `Moved to stage: ${newStage.name}`,
            description: notes,
            performedBy: lawyerId
        });

        res.json({
            success: true,
            message: 'Lead moved to new stage',
            data: {
                lead,
                automation: automationResults
            }
        });
    } catch (error) {
        logger.error('Error moving lead to stage:', error);
        res.status(500).json({
            success: false,
            message: 'Error moving lead to stage',
            error: error.message
        });
    }
};

// ============================================
// LEAD CONVERSION
// ============================================

// Convert lead to client (with optional case creation)
exports.convertToClient = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية لتحويل العملاء المحتملين'
            });
        }

        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;
        const { createCase, caseTitle } = req.body;

        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }], convertedToClient: false };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOne(accessQuery);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found or already converted'
            });
        }

        // Convert with options for case creation
        const result = await lead.convertToClient(lawyerId, {
            createCase: createCase || false,
            caseTitle
        });

        const { client, case: createdCase } = result;

        // Log activity
        await CrmActivity.logActivity({
            lawyerId,
            type: 'lead_converted',
            entityType: 'lead',
            entityId: lead._id,
            entityName: lead.displayName,
            title: `Lead converted to client${createdCase ? ' with case' : ''}`,
            secondaryEntityType: 'client',
            secondaryEntityId: client._id,
            secondaryEntityName: client.displayName || client.companyName,
            performedBy: lawyerId
        });

        // Update pipeline stats
        if (lead.pipelineId) {
            await Pipeline.updateStats(lead.pipelineId);
        }

        res.json({
            success: true,
            message: createdCase
                ? 'تم تحويل العميل المحتمل إلى عميل مع إنشاء قضية'
                : 'تم تحويل العميل المحتمل إلى عميل بنجاح',
            data: {
                lead,
                client,
                case: createdCase
            }
        });
    } catch (error) {
        logger.error('Error converting lead:', error);
        res.status(500).json({
            success: false,
            message: 'Error converting lead to client',
            error: error.message
        });
    }
};

// Preview conversion data (shows what will be transferred)
exports.previewConversion = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;

        // ═══════════════════════════════════════════════════════════════
        // IDOR PROTECTION - Verify lead belongs to user's firm
        // ═══════════════════════════════════════════════════════════════
        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }], convertedToClient: false };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOne(accessQuery).lean();

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found or already converted'
            });
        }

        // Preview what data will be transferred
        const preview = {
            clientData: {
                clientType: lead.type === 'company' ? 'company' : 'individual',
                displayName: lead.type === 'company'
                    ? lead.companyName
                    : `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
                email: lead.email,
                phone: lead.phone,
                alternatePhone: lead.alternatePhone,
                whatsapp: lead.whatsapp,
                nationalId: lead.nationalId,
                crNumber: lead.commercialRegistration,
                address: lead.address,
                proposedBilling: lead.proposedFeeType ? {
                    type: lead.proposedFeeType,
                    amount: lead.proposedAmount
                } : null
            },
            caseData: lead.intake ? {
                canCreateCase: true,
                suggestedTitle: lead.intake.caseDescription || `قضية ${lead.displayName}`,
                caseType: lead.intake.caseType,
                urgency: lead.intake.urgency,
                estimatedValue: lead.intake.estimatedValue || lead.estimatedValue,
                opposingParty: lead.intake.opposingParty,
                court: lead.intake.courtName
            } : {
                canCreateCase: false,
                reason: 'No intake information available'
            }
        };

        res.json({
            success: true,
            data: preview
        });
    } catch (error) {
        logger.error('Error previewing conversion:', error);
        res.status(500).json({
            success: false,
            message: 'Error previewing conversion',
            error: error.message
        });
    }
};

// ============================================
// LEAD STATISTICS & REPORTS
// ============================================

// Get pipeline statistics
exports.getStats = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى العملاء المحتملين'
            });
        }

        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;
        const { startDate, endDate } = req.query;

        const stats = await Lead.getPipelineStats(lawyerId, { start: startDate, end: endDate, firmId });

        // Get leads needing follow-up
        const needsFollowUp = await Lead.getNeedingFollowUp(lawyerId, 10, firmId);

        // Build query based on user type
        const baseQuery = {};
        if (isSoloLawyer || !firmId) {
            baseQuery.lawyerId = lawyerId;
        } else {
            baseQuery.firmId = firmId;
        }

        // Get recent leads
        const recentLeads = await Lead.find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(5)
            .select('leadId displayName status createdAt estimatedValue')
            .lean();

        res.json({
            success: true,
            data: {
                stats,
                needsFollowUp,
                recentLeads
            }
        });
    } catch (error) {
        logger.error('Error getting lead stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting lead statistics',
            error: error.message
        });
    }
};

// Get leads by pipeline stage (for kanban view)
exports.getByPipeline = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const { pipelineId } = req.params;
        const mongoose = require('mongoose');

        let pipeline;
        if (pipelineId) {
            pipeline = await Pipeline.findOne({ _id: pipelineId, lawyerId });
        } else {
            pipeline = await Pipeline.getDefault(lawyerId, 'lead');
        }

        if (!pipeline) {
            return res.status(404).json({
                success: false,
                message: 'Pipeline not found'
            });
        }

        // ═══════════════════════════════════════════════════════════════
        // OPTIMIZED: Single aggregation query instead of N+1 queries
        // ═══════════════════════════════════════════════════════════════
        const leadsAggregation = await Lead.aggregate([
            // Match all leads for this pipeline
            {
                $match: {
                    lawyerId: new mongoose.Types.ObjectId(lawyerId),
                    pipelineId: pipeline._id,
                    convertedToClient: false
                }
            },
            // Sort by createdAt
            {
                $sort: { createdAt: -1 }
            },
            // Lookup assignedTo user
            {
                $lookup: {
                    from: 'users',
                    localField: 'assignedTo',
                    foreignField: '_id',
                    as: 'assignedTo'
                }
            },
            {
                $unwind: {
                    path: '$assignedTo',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Lookup organization
            {
                $lookup: {
                    from: 'organizations',
                    localField: 'organizationId',
                    foreignField: '_id',
                    as: 'organizationId'
                }
            },
            {
                $unwind: {
                    path: '$organizationId',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Lookup contact
            {
                $lookup: {
                    from: 'contacts',
                    localField: 'contactId',
                    foreignField: '_id',
                    as: 'contactId'
                }
            },
            {
                $unwind: {
                    path: '$contactId',
                    preserveNullAndEmptyArrays: true
                }
            },
            // Project only needed fields
            {
                $project: {
                    pipelineStageId: 1,
                    leadId: 1,
                    displayName: 1,
                    status: 1,
                    estimatedValue: 1,
                    probability: 1,
                    createdAt: 1,
                    'assignedTo._id': 1,
                    'assignedTo.firstName': 1,
                    'assignedTo.lastName': 1,
                    'assignedTo.avatar': 1,
                    'organizationId._id': 1,
                    'organizationId.legalName': 1,
                    'organizationId.tradeName': 1,
                    'organizationId.type': 1,
                    'contactId._id': 1,
                    'contactId.firstName': 1,
                    'contactId.lastName': 1,
                    'contactId.email': 1,
                    'contactId.phone': 1
                }
            },
            // Group by stage
            {
                $group: {
                    _id: '$pipelineStageId',
                    leads: { $push: '$$ROOT' }
                }
            },
            // Limit to 50 leads per stage
            {
                $project: {
                    _id: 1,
                    leads: { $slice: ['$leads', 50] }
                }
            }
        ]);

        // Initialize leadsByStage with empty arrays for all stages
        const leadsByStage = {};
        for (const stage of pipeline.stages) {
            leadsByStage[stage.stageId] = [];
        }

        // Populate leadsByStage with aggregation results
        for (const stageGroup of leadsAggregation) {
            if (stageGroup._id) {
                leadsByStage[stageGroup._id] = stageGroup.leads;
            }
        }

        res.json({
            success: true,
            data: {
                pipeline,
                leadsByStage
            }
        });
    } catch (error) {
        logger.error('Error getting leads by pipeline:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting leads by pipeline',
            error: error.message
        });
    }
};

// Get leads needing follow-up
exports.getNeedingFollowUp = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى العملاء المحتملين'
            });
        }

        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const { limit = 20 } = req.query;

        const leads = await Lead.getNeedingFollowUp(lawyerId, parseInt(limit), firmId);

        res.json({
            success: true,
            data: leads
        });
    } catch (error) {
        logger.error('Error getting leads needing follow-up:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting leads',
            error: error.message
        });
    }
};

// ============================================
// LEAD ACTIVITIES
// ============================================

// Log activity for a lead
exports.logActivity = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى العملاء المحتملين'
            });
        }

        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;
        const activityData = req.body;

        // ═══════════════════════════════════════════════════════════════
        // IDOR PROTECTION - Verify lead belongs to user's firm
        // ═══════════════════════════════════════════════════════════════
        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }] };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOne(accessQuery);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        const activity = await CrmActivity.create({
            lawyerId,
            entityType: 'lead',
            entityId: lead._id,
            entityName: lead.displayName,
            performedBy: lawyerId,
            ...activityData
        });

        // Update lead activity stats
        lead.lastActivityAt = new Date();
        lead.activityCount = (lead.activityCount || 0) + 1;

        if (activityData.type === 'call') {
            lead.callCount = (lead.callCount || 0) + 1;
            lead.lastContactedAt = new Date();
        } else if (activityData.type === 'email') {
            lead.emailCount = (lead.emailCount || 0) + 1;
            lead.lastContactedAt = new Date();
        } else if (activityData.type === 'meeting') {
            lead.meetingCount = (lead.meetingCount || 0) + 1;
            lead.lastContactedAt = new Date();
        }

        await lead.save();

        res.status(201).json({
            success: true,
            message: 'Activity logged successfully',
            data: activity
        });
    } catch (error) {
        logger.error('Error logging activity:', error);
        res.status(500).json({
            success: false,
            message: 'Error logging activity',
            error: error.message
        });
    }
};

// Get activities for a lead
exports.getActivities = async (req, res) => {
    try {
        const { id } = req.params;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;
        const { type, page = 1, limit = 20 } = req.query;

        // ═══════════════════════════════════════════════════════════════
        // IDOR PROTECTION - Verify lead belongs to user's firm
        // ═══════════════════════════════════════════════════════════════
        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }] };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOne(accessQuery);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        const activities = await CrmActivity.getEntityActivities('lead', lead._id, {
            type,
            limit: parseInt(limit),
            skip: (parseInt(page) - 1) * parseInt(limit)
        });

        res.json({
            success: true,
            data: activities
        });
    } catch (error) {
        logger.error('Error getting lead activities:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting activities',
            error: error.message
        });
    }
};

// Schedule follow-up
exports.scheduleFollowUp = async (req, res) => {
    try {
        // Block departed users from lead operations
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول إلى العملاء المحتملين'
            });
        }

        const { id } = req.params;
        const { date, note } = req.body;
        const lawyerId = req.userID;
        const firmId = req.firmId; // From firmFilter middleware
        const isSoloLawyer = req.isSoloLawyer;

        // ═══════════════════════════════════════════════════════════════
        // IDOR PROTECTION - Verify lead belongs to user's firm
        // ═══════════════════════════════════════════════════════════════
        // Build query based on user type
        const accessQuery = { $or: [{ _id: id }, { leadId: id }] };
        if (isSoloLawyer || !firmId) {
            accessQuery.lawyerId = lawyerId;
        } else {
            accessQuery.firmId = firmId;
        }

        const lead = await Lead.findOne(accessQuery);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        lead.nextFollowUpDate = new Date(date);
        lead.nextFollowUpNote = note;
        await lead.save();

        // Create task activity
        await CrmActivity.create({
            lawyerId,
            type: 'task',
            entityType: 'lead',
            entityId: lead._id,
            entityName: lead.displayName,
            title: `Follow-up: ${note || 'Follow up with lead'}`,
            performedBy: lawyerId,
            assignedTo: lawyerId,
            taskData: {
                dueDate: new Date(date),
                priority: 'normal',
                status: 'pending'
            },
            scheduledAt: new Date(date),
            status: 'scheduled'
        });

        res.json({
            success: true,
            message: 'Follow-up scheduled',
            data: lead
        });
    } catch (error) {
        logger.error('Error scheduling follow-up:', error);
        res.status(500).json({
            success: false,
            message: 'Error scheduling follow-up',
            error: error.message
        });
    }
};

// ============================================
// BATCH ENDPOINT: CRM OVERVIEW
// ============================================

/**
 * GET /api/crm/overview
 * Consolidated endpoint - replaces 4 separate API calls
 * Returns: leads stats, activities, pipeline, performance
 */
exports.getCrmOverview = async (req, res) => {
    try {
        const lawyerId = req.userID;
        const firmId = req.firmId;
        const isSoloLawyer = req.isSoloLawyer;
        const mongoose = require('mongoose');

        // Build match filter based on user type
        const matchFilter = {};
        if (isSoloLawyer || !firmId) {
            matchFilter.lawyerId = new mongoose.Types.ObjectId(lawyerId);
        } else {
            matchFilter.firmId = new mongoose.Types.ObjectId(firmId);
        }

        // Get date ranges
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            leadStats,
            activityStats,
            pipelineStats,
            teamPerformance,
            recentActivities,
            upcomingFollowUps
        ] = await Promise.all([
            // Lead counts
            Lead.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        new: { $sum: { $cond: [{ $gte: ['$createdAt', startOfMonth] }, 1, 0] } },
                        converted: { $sum: { $cond: ['$convertedToClient', 1, 0] } },
                        qualified: { $sum: { $cond: [{ $eq: ['$status', 'qualified'] }, 1, 0] } },
                        totalValue: { $sum: { $ifNull: ['$estimatedValue', 0] } }
                    }
                }
            ]),

            // Activity counts
            CrmActivity.aggregate([
                { $match: { lawyerId: new mongoose.Types.ObjectId(lawyerId) } },
                {
                    $facet: {
                        today: [
                            { $match: { createdAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) } } },
                            { $count: 'count' }
                        ],
                        week: [
                            { $match: { createdAt: { $gte: startOfWeek } } },
                            { $count: 'count' }
                        ],
                        upcoming: [
                            { $match: { scheduledAt: { $gte: now }, status: 'scheduled' } },
                            { $count: 'count' }
                        ]
                    }
                }
            ]),

            // Pipeline stats by stage
            Lead.aggregate([
                { $match: { ...matchFilter, convertedToClient: false } },
                {
                    $group: {
                        _id: '$pipelineStageId',
                        count: { $sum: 1 },
                        value: { $sum: { $ifNull: ['$estimatedValue', 0] } }
                    }
                }
            ]),

            // Team performance (leads by assignee)
            Lead.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$assignedTo', count: { $sum: 1 }, converted: { $sum: { $cond: ['$convertedToClient', 1, 0] } } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        count: 1,
                        converted: 1,
                        userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] }
                    }
                }
            ]),

            // Recent activities (last 10)
            CrmActivity.find({ lawyerId })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('performedBy', 'firstName lastName')
                .lean(),

            // Upcoming follow-ups
            Lead.find({
                ...matchFilter,
                nextFollowUpDate: { $gte: now },
                convertedToClient: false
            })
                .sort({ nextFollowUpDate: 1 })
                .limit(10)
                .select('leadId displayName nextFollowUpDate nextFollowUpNote status')
                .lean()
        ]);

        const leads = leadStats[0] || { total: 0, new: 0, converted: 0, qualified: 0, totalValue: 0 };
        const activities = activityStats[0] || { today: [], week: [], upcoming: [] };
        const conversionRate = leads.total > 0 ? ((leads.converted / leads.total) * 100).toFixed(1) : 0;

        res.json({
            success: true,
            data: {
                leads: {
                    total: leads.total,
                    new: leads.new,
                    converted: leads.converted,
                    qualified: leads.qualified,
                    totalValue: leads.totalValue,
                    conversionRate: parseFloat(conversionRate)
                },
                activities: {
                    today: activities.today[0]?.count || 0,
                    week: activities.week[0]?.count || 0,
                    upcoming: activities.upcoming[0]?.count || 0
                },
                pipeline: {
                    byStage: Object.fromEntries(pipelineStats.map(s => [s._id || 'unknown', { count: s.count, value: s.value }]))
                },
                performance: {
                    team: teamPerformance
                },
                recentActivities,
                upcomingFollowUps
            }
        });
    } catch (error) {
        logger.error('getCrmOverview ERROR:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting CRM overview',
            error: error.message
        });
    }
};
