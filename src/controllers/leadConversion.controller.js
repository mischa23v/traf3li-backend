/**
 * Lead Conversion Controller
 *
 * Handles lead-to-case conversion and CRM case management.
 */

const mongoose = require('mongoose');
const Lead = require('../models/lead.model');
const Case = require('../models/case.model');
const Client = require('../models/client.model');
const CRMSettings = require('../models/crmSettings.model');
const SalesStage = require('../models/salesStage.model');
const Competitor = require('../models/competitor.model');
const SalesPerson = require('../models/salesPerson.model');
const Territory = require('../models/territory.model');
const CrmActivity = require('../models/crmActivity.model');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// CREATE CASE FROM LEAD
// ═══════════════════════════════════════════════════════════════

/**
 * Create a case from a lead
 */
exports.createCaseFromLead = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        // Mass assignment protection - only allow specific fields
        const allowedFields = [
            'title',
            'caseType',
            'description',
            'estimatedValue',
            'salesStageId',
            'copyNotes',
            'copyDocuments'
        ];
        const conversionData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (conversionData.estimatedValue && (isNaN(conversionData.estimatedValue) || conversionData.estimatedValue < 0)) {
            return res.status(400).json({
                success: false,
                message: 'قيمة تقديرية غير صالحة / Invalid estimated value'
            });
        }

        // Sanitize ObjectId if provided
        if (conversionData.salesStageId) {
            const sanitizedStageId = sanitizeObjectId(conversionData.salesStageId);
            if (!sanitizedStageId) {
                return res.status(400).json({
                    success: false,
                    message: 'معرف مرحلة المبيعات غير صالح / Invalid sales stage ID'
                });
            }
            conversionData.salesStageId = sanitizedStageId;
        }

        // IDOR Protection - Verify lead belongs to the firm
        const lead = await Lead.findOne({ _id: id, firmId });
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'العميل المحتمل غير موجود / Lead not found'
            });
        }

        // Get CRM settings
        const settings = await CRMSettings.getOrCreate(firmId);

        // Determine sales stage
        let stageId = conversionData.salesStageId;
        if (!stageId && settings.caseSettings?.defaultSalesStage) {
            stageId = settings.caseSettings.defaultSalesStage;
        }
        if (!stageId) {
            // Get first stage
            const firstStage = await SalesStage.findOne({ firmId, enabled: true }).sort({ order: 1 });
            if (firstStage) {
                stageId = firstStage._id;
            }
        }

        // Get stage probability
        let probability = 10;
        if (stageId) {
            const stage = await SalesStage.findById(stageId);
            if (stage) {
                probability = stage.defaultProbability;
            }
        }

        // Build case data
        const caseData = {
            firmId,
            lawyerId: userId,
            leadId: lead._id,
            title: conversionData.title || `Case for ${lead.displayName}`,
            description: conversionData.description || lead.intake?.caseDescription,
            category: conversionData.caseType || lead.intake?.caseType || 'other',

            // CRM fields
            crmStatus: 'intake',
            crmPipelineStageId: stageId,
            probability,

            // Value
            estimatedValue: conversionData.estimatedValue || lead.estimatedValue || lead.intake?.estimatedValue,

            // Transfer qualification
            qualification: lead.qualification ? {
                budget: lead.qualification.budget,
                authority: lead.qualification.authority,
                need: lead.qualification.need,
                timeline: lead.qualification.timeline,
                score: lead.qualification.score
            } : undefined,

            // Conflict check
            conflictCheckStatus: lead.conflictCheckStatus || 'not_checked',
            conflictCheckNotes: lead.conflictNotes,
            conflictCheckDate: lead.conflictCheckDate,

            // Sales tracking
            salesPersonId: lead.salesPersonId,
            territoryId: lead.territoryId,

            // Contact info from lead
            clientName: lead.type === 'company' ? lead.companyName : `${lead.firstName || ''} ${lead.lastName || ''}`.trim(),
            clientPhone: lead.phone,

            // Priority from intake urgency
            priority: lead.intake?.urgency === 'urgent' ? 'critical'
                : lead.intake?.urgency === 'high' ? 'high'
                : lead.intake?.urgency === 'low' ? 'low'
                : 'medium',

            // Court info if available
            court: lead.intake?.courtName,

            // Labor case details if available
            laborCaseDetails: lead.intake?.opposingParty ? {
                company: { name: lead.intake.opposingParty }
            } : undefined,

            source: 'external',
            createdBy: userId
        };

        // Create case
        const newCase = await Case.create(caseData);

        // Update lead with case reference
        lead.cases = lead.cases || [];
        lead.cases.push(newCase._id);
        lead.activeCaseId = newCase._id;
        lead.status = lead.status === 'new' ? 'contacted' : lead.status;
        await lead.save();

        // Copy notes if requested
        if (conversionData.copyNotes && settings.conversionSettings?.copyNotesToCase) {
            // Notes would be copied here if there's a Note model
            // For now, we'll add a note to the case
            if (lead.notes) {
                newCase.notes = newCase.notes || [];
                newCase.notes.push({
                    text: `Notes from lead:\n${lead.notes}`,
                    createdBy: userId,
                    createdAt: new Date()
                });
                await newCase.save();
            }
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'case_created_from_lead',
            entityType: 'case',
            entityId: newCase._id,
            entityName: newCase.title,
            title: `Case created from lead: ${lead.displayName}`,
            description: `Lead ${lead.leadId} converted to case`,
            performedBy: userId
        });

        // Populate for response
        await newCase.populate([
            { path: 'crmPipelineStageId', select: 'name nameAr color' },
            { path: 'salesPersonId', select: 'name nameAr' }
        ]);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء القضية بنجاح / Case created successfully',
            data: {
                case: newCase,
                lead: {
                    _id: lead._id,
                    leadId: lead.leadId,
                    status: lead.status,
                    activeCaseId: lead.activeCaseId
                }
            }
        });
    } catch (error) {
        logger.error('Error creating case from lead:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في إنشاء القضية / Error creating case',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET LEAD'S CASES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all cases for a lead
 */
exports.getLeadCases = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;

        // Verify lead exists and belongs to firm
        const lead = await Lead.findOne({ _id: id, firmId });
        if (!lead) {
            return res.status(404).json({
                success: false,
                message: 'العميل المحتمل غير موجود / Lead not found'
            });
        }

        // Get cases
        const cases = await Case.find({ leadId: id, firmId })
            .populate('crmPipelineStageId', 'name nameAr color order')
            .populate('salesPersonId', 'name nameAr')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            data: {
                leadId: id,
                activeCaseId: lead.activeCaseId,
                cases
            }
        });
    } catch (error) {
        logger.error('Error getting lead cases:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب قضايا العميل / Error fetching lead cases',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// UPDATE CASE CRM STAGE
// ═══════════════════════════════════════════════════════════════

/**
 * Update the CRM pipeline stage of a case
 */
exports.updateCrmStage = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        // Mass assignment protection - only allow specific fields
        const allowedFields = ['stageId', 'probability', 'expectedCloseDate'];
        const updateData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (!updateData.stageId) {
            return res.status(400).json({
                success: false,
                message: 'معرف المرحلة مطلوب / Stage ID is required'
            });
        }

        // Sanitize ObjectId
        const sanitizedStageId = sanitizeObjectId(updateData.stageId);
        if (!sanitizedStageId) {
            return res.status(400).json({
                success: false,
                message: 'معرف مرحلة غير صالح / Invalid stage ID'
            });
        }
        updateData.stageId = sanitizedStageId;

        // Validate probability if provided
        if (updateData.probability !== undefined && (isNaN(updateData.probability) || updateData.probability < 0 || updateData.probability > 100)) {
            return res.status(400).json({
                success: false,
                message: 'احتمالية غير صالحة / Invalid probability (must be 0-100)'
            });
        }

        // IDOR Protection - Verify case belongs to the firm
        const caseDoc = await Case.findOne({ _id: id, firmId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'القضية غير موجودة / Case not found'
            });
        }

        // Get new stage - verify it belongs to the same firm (IDOR protection)
        const newStage = await SalesStage.findOne({ _id: updateData.stageId, firmId });
        if (!newStage) {
            return res.status(404).json({
                success: false,
                message: 'مرحلة المبيعات غير موجودة / Sales stage not found'
            });
        }

        // Get old stage for logging
        const oldStage = caseDoc.crmPipelineStageId
            ? await SalesStage.findById(caseDoc.crmPipelineStageId)
            : null;

        // Check for validation requirements
        if (newStage.requiresConflictCheck && caseDoc.conflictCheckStatus === 'not_checked') {
            return res.status(400).json({
                success: false,
                message: 'يتطلب فحص التعارض قبل الانتقال لهذه المرحلة / Conflict check required before this stage'
            });
        }

        if (newStage.requiresQualification && (!caseDoc.qualification || !caseDoc.qualification.score)) {
            return res.status(400).json({
                success: false,
                message: 'يتطلب التأهيل قبل الانتقال لهذه المرحلة / Qualification required before this stage'
            });
        }

        // Update case
        caseDoc.crmPipelineStageId = updateData.stageId;
        caseDoc.probability = updateData.probability !== undefined ? updateData.probability : newStage.defaultProbability;
        if (updateData.expectedCloseDate) {
            caseDoc.expectedCloseDate = new Date(updateData.expectedCloseDate);
        }

        // Update status based on stage type
        if (newStage.type === 'won') {
            caseDoc.crmStatus = 'won';
        } else if (newStage.type === 'lost') {
            caseDoc.crmStatus = 'lost';
        } else {
            // Map stage name to status
            const statusMap = {
                'intake': 'intake',
                'conflict check': 'conflict_check',
                'qualified': 'qualified',
                'proposal sent': 'proposal_sent',
                'negotiation': 'negotiation'
            };
            const normalizedName = newStage.name.toLowerCase();
            caseDoc.crmStatus = statusMap[normalizedName] || caseDoc.crmStatus;
        }

        await caseDoc.save();

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'stage_changed',
            entityType: 'case',
            entityId: caseDoc._id,
            entityName: caseDoc.title,
            title: `Stage changed: ${oldStage?.name || 'None'} → ${newStage.name}`,
            performedBy: userId,
            changes: {
                oldValues: { stage: oldStage?.name, stageId: oldStage?._id },
                newValues: { stage: newStage.name, stageId: newStage._id }
            }
        });

        await caseDoc.populate([
            { path: 'crmPipelineStageId', select: 'name nameAr color type' }
        ]);

        res.json({
            success: true,
            message: 'تم تحديث مرحلة القضية / Case stage updated',
            data: caseDoc
        });
    } catch (error) {
        logger.error('Error updating case CRM stage:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تحديث مرحلة القضية / Error updating case stage',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// MARK CASE AS WON
// ═══════════════════════════════════════════════════════════════

/**
 * Mark a case as won and optionally create a client
 */
exports.markCaseAsWon = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        // Mass assignment protection - only allow specific fields
        const allowedFields = ['wonValue', 'acceptedQuoteId', 'createClient', 'notes'];
        const wonData = pickAllowedFields(req.body, allowedFields);

        // Input validation
        if (wonData.wonValue && (isNaN(wonData.wonValue) || wonData.wonValue < 0)) {
            return res.status(400).json({
                success: false,
                message: 'قيمة الفوز غير صالحة / Invalid won value'
            });
        }

        // Sanitize ObjectId if provided
        if (wonData.acceptedQuoteId) {
            const sanitizedQuoteId = sanitizeObjectId(wonData.acceptedQuoteId);
            if (!sanitizedQuoteId) {
                return res.status(400).json({
                    success: false,
                    message: 'معرف عرض الأسعار غير صالح / Invalid quote ID'
                });
            }
            wonData.acceptedQuoteId = sanitizedQuoteId;
        }

        // IDOR Protection - Verify case belongs to the firm
        const caseDoc = await Case.findOne({ _id: id, firmId }).populate('leadId');
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'القضية غير موجودة / Case not found'
            });
        }

        const settings = await CRMSettings.getOrCreate(firmId);

        // Update case
        caseDoc.crmStatus = 'won';
        caseDoc.probability = 100;
        caseDoc.wonDate = new Date();
        caseDoc.status = 'won';
        caseDoc.outcome = 'won';
        if (wonData.wonValue) {
            caseDoc.estimatedValue = wonData.wonValue;
        }
        if (wonData.acceptedQuoteId) {
            caseDoc.acceptedQuoteId = wonData.acceptedQuoteId;
        }

        await caseDoc.save();

        // Create client if requested - Prevent unauthorized lead-to-client conversions
        let client = null;
        if (wonData.createClient && caseDoc.leadId) {
            const lead = caseDoc.leadId;

            // IDOR Protection - Verify lead belongs to the firm
            if (lead.firmId.toString() !== firmId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'غير مصرح بتحويل هذا العميل المحتمل / Unauthorized to convert this lead'
                });
            }

            // Prevent duplicate client creation
            if (lead.convertedToClient) {
                return res.status(400).json({
                    success: false,
                    message: 'تم تحويل العميل المحتمل مسبقاً / Lead already converted to client'
                });
            }

            // Mass assignment protection - only allow specific lead fields to be transferred
            const allowedLeadFields = [
                'firstName', 'lastName', 'fullNameArabic', 'email', 'phone',
                'alternatePhone', 'whatsapp', 'companyName', 'companyNameAr',
                'nationalId', 'crNumber', 'iqamaNumber', 'address', 'nationalAddress'
            ];
            const safeLeadData = pickAllowedFields(lead.toObject(), allowedLeadFields);

            const clientData = {
                firmId,
                lawyerId: userId,
                clientType: lead.type === 'company' ? 'company' : 'individual',

                // Personal info - using safe data
                firstName: safeLeadData.firstName,
                lastName: safeLeadData.lastName,
                fullNameArabic: safeLeadData.fullNameArabic,
                email: safeLeadData.email,
                phone: safeLeadData.phone,
                alternatePhone: safeLeadData.alternatePhone,
                whatsapp: safeLeadData.whatsapp,

                // Company info
                companyName: safeLeadData.companyName,
                companyNameArabic: safeLeadData.companyNameAr,

                // IDs
                nationalId: safeLeadData.nationalId,
                crNumber: safeLeadData.crNumber,
                iqamaNumber: safeLeadData.iqamaNumber,

                // Address
                address: safeLeadData.address,
                nationalAddress: safeLeadData.nationalAddress,

                // Conversion tracking
                convertedFromLeadId: lead._id,
                convertedFromCaseId: caseDoc._id,
                convertedAt: new Date(),

                // Sales tracking
                salesPersonId: caseDoc.salesPersonId,
                territoryId: caseDoc.territoryId,

                // Link case
                activeCaseIds: [caseDoc._id],

                status: 'active',
                createdBy: userId
            };

            client = await Client.create(clientData);

            // Update case with client
            caseDoc.clientId = client._id;
            await caseDoc.save();

            // Update lead
            if (lead._id) {
                await Lead.findByIdAndUpdate(lead._id, {
                    convertedToClient: true,
                    clientId: client._id,
                    convertedAt: new Date(),
                    convertedBy: userId,
                    status: 'won'
                });
            }
        }

        // Update sales person achievements
        if (settings.salesPersonSettings?.targetTrackingEnabled && caseDoc.salesPersonId) {
            const currentYear = new Date().getFullYear();
            await SalesPerson.updateAchievements(caseDoc.salesPersonId, {
                year: currentYear,
                addWonCase: true,
                addWonValue: wonData.wonValue || caseDoc.estimatedValue || 0
            });
        }

        // Update territory achievements
        if (settings.territorySettings?.enabled && caseDoc.territoryId) {
            const currentYear = new Date().getFullYear();
            await Territory.updateAchievement(
                caseDoc.territoryId,
                currentYear,
                wonData.wonValue || caseDoc.estimatedValue || 0
            );
        }

        // Update competitor stats if one was involved
        if (caseDoc.competitorId) {
            await Competitor.recordWin(caseDoc.competitorId);
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'case_won',
            entityType: 'case',
            entityId: caseDoc._id,
            entityName: caseDoc.title,
            title: `Case won: ${caseDoc.title}`,
            description: wonData.notes || `Won value: ${wonData.wonValue || caseDoc.estimatedValue}`,
            performedBy: userId
        });

        res.json({
            success: true,
            message: 'تم تسجيل الفوز بالقضية / Case marked as won',
            data: {
                case: caseDoc,
                client
            }
        });
    } catch (error) {
        logger.error('Error marking case as won:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تسجيل الفوز / Error marking case as won',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// MARK CASE AS LOST
// ═══════════════════════════════════════════════════════════════

/**
 * Mark a case as lost
 */
exports.markCaseAsLost = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;
        const userId = req.userID;

        // Mass assignment protection - only allow specific fields
        const allowedFields = ['lostReasonId', 'lostReasonDetails', 'competitorId'];
        const lostData = pickAllowedFields(req.body, allowedFields);

        // Sanitize ObjectIds if provided
        if (lostData.lostReasonId) {
            const sanitizedReasonId = sanitizeObjectId(lostData.lostReasonId);
            if (!sanitizedReasonId) {
                return res.status(400).json({
                    success: false,
                    message: 'معرف سبب الخسارة غير صالح / Invalid lost reason ID'
                });
            }
            lostData.lostReasonId = sanitizedReasonId;
        }

        if (lostData.competitorId) {
            const sanitizedCompetitorId = sanitizeObjectId(lostData.competitorId);
            if (!sanitizedCompetitorId) {
                return res.status(400).json({
                    success: false,
                    message: 'معرف المنافس غير صالح / Invalid competitor ID'
                });
            }
            lostData.competitorId = sanitizedCompetitorId;
        }

        // IDOR Protection - Verify case belongs to the firm
        const caseDoc = await Case.findOne({ _id: id, firmId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'القضية غير موجودة / Case not found'
            });
        }

        // Get current stage for tracking
        const currentStage = caseDoc.crmPipelineStageId
            ? await SalesStage.findById(caseDoc.crmPipelineStageId)
            : null;

        // Update case
        caseDoc.crmStatus = 'lost';
        caseDoc.probability = 0;
        caseDoc.lostDate = new Date();
        caseDoc.status = 'lost';
        caseDoc.outcome = 'lost';
        caseDoc.lostReasonId = lostData.lostReasonId;
        caseDoc.lostReasonDetails = lostData.lostReasonDetails;
        caseDoc.competitorId = lostData.competitorId;
        caseDoc.stageWhenLost = currentStage?.name;

        await caseDoc.save();

        // Update competitor stats
        if (lostData.competitorId) {
            await Competitor.recordLoss(lostData.competitorId);
        }

        // Update lead status
        if (caseDoc.leadId) {
            await Lead.findByIdAndUpdate(caseDoc.leadId, {
                status: 'lost',
                lostReason: 'other',
                lostNotes: lostData.lostReasonDetails
            });
        }

        // Log activity
        await CrmActivity.logActivity({
            lawyerId: userId,
            type: 'case_lost',
            entityType: 'case',
            entityId: caseDoc._id,
            entityName: caseDoc.title,
            title: `Case lost: ${caseDoc.title}`,
            description: lostData.lostReasonDetails || 'No details provided',
            performedBy: userId
        });

        await caseDoc.populate([
            { path: 'lostReasonId', select: 'reason reasonAr category' },
            { path: 'competitorId', select: 'name nameAr' }
        ]);

        res.json({
            success: true,
            message: 'تم تسجيل خسارة القضية / Case marked as lost',
            data: caseDoc
        });
    } catch (error) {
        logger.error('Error marking case as lost:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في تسجيل الخسارة / Error marking case as lost',
            error: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════════
// GET CASE QUOTES
// ═══════════════════════════════════════════════════════════════

/**
 * Get all quotes for a case
 */
exports.getCaseQuotes = async (req, res) => {
    try {
        if (req.isDeparted) {
            return res.status(403).json({
                success: false,
                message: 'ليس لديك صلاحية للوصول / Access denied'
            });
        }

        const { id } = req.params;
        const firmId = req.firmId;

        // Verify case exists
        const caseDoc = await Case.findOne({ _id: id, firmId });
        if (!caseDoc) {
            return res.status(404).json({
                success: false,
                message: 'القضية غير موجودة / Case not found'
            });
        }

        // For now, return empty array as Quote model may not exist
        // In a real implementation, you would query the Quote model
        const quotes = [];

        res.json({
            success: true,
            data: {
                caseId: id,
                acceptedQuoteId: caseDoc.acceptedQuoteId,
                quotes
            }
        });
    } catch (error) {
        logger.error('Error getting case quotes:', error);
        res.status(500).json({
            success: false,
            message: 'خطأ في جلب عروض القضية / Error fetching case quotes',
            error: error.message
        });
    }
};
