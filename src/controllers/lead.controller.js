const Lead = require('../models/lead.model');
const Pipeline = require('../models/pipeline.model');
const CrmActivity = require('../models/crmActivity.model');
const Client = require('../models/client.model');

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
        const leadData = {
            ...req.body,
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
                    console.error('Initial stage automation error:', automationError);
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
        console.error('Error creating lead:', error);
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

        // Build count query - firmId first, then lawyerId fallback
        const countQuery = firmId ? { firmId } : { lawyerId };
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
        console.error('Error getting leads:', error);
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

        // Build query - firmId first, then lawyerId fallback
        const accessQuery = firmId
            ? { $or: [{ _id: id }, { leadId: id }], firmId }
            : { $or: [{ _id: id }, { leadId: id }], lawyerId };

        const lead = await Lead.findOne(accessQuery)
        .populate('assignedTo', 'firstName lastName avatar email')
        .populate('teamMembers', 'firstName lastName avatar')
        .populate('source.referralId', 'name')
        .populate('organizationId', 'legalName tradeName type email phone')
        .populate('contactId', 'firstName lastName email phone title company')
        .populate('clientId', 'name clientId')
        .populate('caseId', 'title caseNumber');

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
        console.error('Error getting lead:', error);
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
        const updates = req.body;

        // Build query - firmId first, then lawyerId fallback
        const accessQuery = firmId
            ? { $or: [{ _id: id }, { leadId: id }], firmId }
            : { $or: [{ _id: id }, { leadId: id }], lawyerId };

        const lead = await Lead.findOne(accessQuery);

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'Lead not found'
            });
        }

        // Track status change
        const oldStatus = lead.status;

        // Apply updates
        Object.keys(updates).forEach(key => {
            if (key !== 'lawyerId' && key !== 'leadId' && key !== '_id') {
                lead[key] = updates[key];
            }
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
        console.error('Error updating lead:', error);
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

        // Build query - firmId first, then lawyerId fallback
        const accessQuery = firmId
            ? { $or: [{ _id: id }, { leadId: id }], firmId, convertedToClient: false }
            : { $or: [{ _id: id }, { leadId: id }], lawyerId, convertedToClient: false };

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
        console.error('Error deleting lead:', error);
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

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'يجب توفير قائمة المعرفات / IDs list is required'
            });
        }

        // Build access query - only delete non-converted leads
        const accessQuery = firmId
            ? { _id: { $in: ids }, firmId, convertedToClient: false }
            : { _id: { $in: ids }, lawyerId, convertedToClient: false };

        const result = await Lead.deleteMany(accessQuery);

        res.json({
            success: true,
            message: `تم حذف ${result.deletedCount} عميل محتمل بنجاح / ${result.deletedCount} lead(s) deleted successfully`,
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Error bulk deleting leads:', error);
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

        // Build query - firmId first, then lawyerId fallback
        const accessQuery = firmId
            ? { $or: [{ _id: id }, { leadId: id }], firmId }
            : { $or: [{ _id: id }, { leadId: id }], lawyerId };

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
        console.error('Error updating lead status:', error);
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

        // Build query - firmId first, then lawyerId fallback
        const accessQuery = firmId
            ? { $or: [{ _id: id }, { leadId: id }], firmId }
            : { $or: [{ _id: id }, { leadId: id }], lawyerId };

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
                console.error('Stage exit automation error:', automationError);
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
            console.error('Stage enter automation error:', automationError);
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
        console.error('Error moving lead to stage:', error);
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
        const { createCase, caseTitle } = req.body;

        // Build query - firmId first, then lawyerId fallback
        const accessQuery = firmId
            ? { $or: [{ _id: id }, { leadId: id }], firmId, convertedToClient: false }
            : { $or: [{ _id: id }, { leadId: id }], lawyerId, convertedToClient: false };

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
        console.error('Error converting lead:', error);
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

        const lead = await Lead.findOne({
            $or: [{ _id: id }, { leadId: id }],
            lawyerId,
            convertedToClient: false
        });

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
        console.error('Error previewing conversion:', error);
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
        const { startDate, endDate } = req.query;

        const stats = await Lead.getPipelineStats(lawyerId, { start: startDate, end: endDate, firmId });

        // Get leads needing follow-up
        const needsFollowUp = await Lead.getNeedingFollowUp(lawyerId, 10, firmId);

        // Build query - firmId first, then lawyerId fallback
        const baseQuery = firmId ? { firmId } : { lawyerId };

        // Get recent leads
        const recentLeads = await Lead.find(baseQuery)
            .sort({ createdAt: -1 })
            .limit(5)
            .select('leadId displayName status createdAt estimatedValue');

        res.json({
            success: true,
            data: {
                stats,
                needsFollowUp,
                recentLeads
            }
        });
    } catch (error) {
        console.error('Error getting lead stats:', error);
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

        // Get leads grouped by stage
        const leadsByStage = {};
        for (const stage of pipeline.stages) {
            leadsByStage[stage.stageId] = await Lead.find({
                lawyerId,
                pipelineId: pipeline._id,
                pipelineStageId: stage.stageId,
                convertedToClient: false
            })
            .populate('assignedTo', 'firstName lastName avatar')
            .populate('organizationId', 'legalName tradeName type')
            .populate('contactId', 'firstName lastName email phone')
            .sort({ createdAt: -1 })
            .limit(50);
        }

        res.json({
            success: true,
            data: {
                pipeline,
                leadsByStage
            }
        });
    } catch (error) {
        console.error('Error getting leads by pipeline:', error);
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
        console.error('Error getting leads needing follow-up:', error);
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
        const activityData = req.body;

        const lead = await Lead.findOne({
            $or: [{ _id: id }, { leadId: id }],
            lawyerId
        });

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
        console.error('Error logging activity:', error);
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
        const { type, page = 1, limit = 20 } = req.query;

        const lead = await Lead.findOne({
            $or: [{ _id: id }, { leadId: id }],
            lawyerId
        });

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
        console.error('Error getting lead activities:', error);
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

        const lead = await Lead.findOne({
            $or: [{ _id: id }, { leadId: id }],
            lawyerId
        });

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
        console.error('Error scheduling follow-up:', error);
        res.status(500).json({
            success: false,
            message: 'Error scheduling follow-up',
            error: error.message
        });
    }
};
