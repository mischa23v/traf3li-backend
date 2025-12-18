const { Case, Order, User, Event, Reminder, Firm } = require('../models');
const AuditLog = require('../models/auditLog.model');
const CaseAuditLog = require('../models/caseAuditLog.model');
const CaseAuditService = require('../services/caseAuditService');
const CrmActivity = require('../models/crmActivity.model');
const { CustomException } = require('../utils');
const { calculateLawyerScore } = require('./score.controller');
const { getUploadPresignedUrl, getDownloadPresignedUrl, deleteFile, generateFileKey } = require('../configs/s3');
const documentExportService = require('../services/documentExport.service');
const {
    ENTITY_TYPES,
    COURTS,
    COMMITTEES,
    ARBITRATION_CENTERS,
    REGIONS,
    getLabel
} = require('../configs/caseConstants');

/**
 * Generate internal reference for a case
 * Format: YYYY/XXXX (e.g., 2025/0001, 2025/0002)
 * @param {string} firmId - The firm ID for scoping the sequence
 * @returns {Promise<string>} - The generated internal reference
 */
const generateInternalReference = async (firmId) => {
    const year = new Date().getFullYear();
    const prefix = `${year}/`;

    // Find the last case with internal reference for this year (and optionally firm)
    const query = { internalReference: { $regex: `^${year}/` } };
    if (firmId) {
        query.firmId = firmId;
    }

    const lastCase = await Case.findOne(query)
        .sort({ internalReference: -1 })
        .select('internalReference')
        .lean();

    let sequence = 1;
    if (lastCase?.internalReference) {
        const [, lastSeq] = lastCase.internalReference.split('/');
        sequence = parseInt(lastSeq, 10) + 1;
    }

    return `${year}/${sequence.toString().padStart(4, '0')}`;
};

// Helper function to check firm access for a case
const checkCaseAccess = (caseDoc, userId, firmId, requireLawyer = false, isSoloLawyer = false) => {
    // DEBUG: Log all inputs
    console.log('=== checkCaseAccess DEBUG ===');
    console.log('Case ID:', caseDoc._id?.toString());
    console.log('User ID:', userId);
    console.log('User firmId:', firmId?.toString());
    console.log('requireLawyer:', requireLawyer);
    console.log('isSoloLawyer:', isSoloLawyer);

    // Handle both populated and non-populated lawyerId/clientId
    // When populated, lawyerId is an object with _id; when not, it's just an ObjectId
    const caseLawyerId = caseDoc.lawyerId?._id?.toString() || caseDoc.lawyerId?.toString();
    const caseClientId = caseDoc.clientId?._id?.toString() || caseDoc.clientId?.toString();

    console.log('Case lawyerId (resolved):', caseLawyerId);
    console.log('Case clientId (resolved):', caseClientId);
    console.log('Case firmId:', caseDoc.firmId?.toString());

    const isLawyer = caseLawyerId && caseLawyerId === userId;
    const isClient = caseClientId && caseClientId === userId;

    console.log('isLawyer:', isLawyer);
    console.log('isClient:', isClient);

    // Solo lawyers can only access their own cases (where they are the lawyer)
    if (isSoloLawyer) {
        const result = requireLawyer ? isLawyer : (isLawyer || isClient);
        console.log('Solo lawyer path, result:', result);
        return result;
    }

    // Check firm-level access if firmId is available
    if (firmId) {
        const caseFirmIdStr = caseDoc.firmId?.toString();
        const userFirmIdStr = firmId.toString();
        const sameFirm = caseDoc.firmId && caseFirmIdStr === userFirmIdStr;
        console.log('Firm check - caseFirmId:', caseFirmIdStr, 'userFirmId:', userFirmIdStr, 'sameFirm:', sameFirm);

        // Case belongs to the same firm - allow access for viewing
        if (sameFirm) {
            const result = requireLawyer ? isLawyer : true;
            console.log('Same firm, result:', result);
            return result;
        }

        // Case doesn't have firmId (legacy case) but user is in a firm
        // Check if user is the lawyer or client of this case
        if (!caseDoc.firmId) {
            const result = requireLawyer ? isLawyer : (isLawyer || isClient);
            console.log('Legacy case (no firmId), result:', result);
            return result;
        }

        // Case belongs to a different firm - deny unless user is lawyer/client
        const result = requireLawyer ? isLawyer : (isLawyer || isClient);
        console.log('Different firm, result:', result);
        return result;
    }

    // No firmId (legacy user or user without firm) - fall back to individual access
    const result = requireLawyer ? isLawyer : (isLawyer || isClient);
    console.log('No user firmId, result:', result);
    return result;
};

// Create case (from contract OR standalone)
const createCase = async (request, response) => {
    const {
        contractId,
        clientId,
        clientName,
        clientPhone,
        title,
        description,
        category,
        subCategory,
        laborCaseDetails,
        commercialCaseDetails,
        personalStatusDetails,
        caseNumber,
        court,
        startDate,
        documents,
        // Entity Type fields
        entityType,
        committee,
        arbitrationCenter,
        region,
        city,
        circuitNumber,
        judge,
        // Internal Reference
        internalReference,
        filingDate,
        // Case Subject
        caseSubject,
        legalBasis,
        // Power of Attorney
        poaNumber,
        poaDate,
        poaExpiry,
        poaScope,
        powerOfAttorney,
        // Plaintiff fields
        plaintiff,
        plaintiffType,
        plaintiffName,
        plaintiffNationalId,
        plaintiffPhone,
        plaintiffEmail,
        plaintiffAddress,
        plaintiffCompanyName,
        plaintiffUnifiedNumber,
        plaintiffCrNumber,
        plaintiffCompanyAddress,
        plaintiffRepresentativeName,
        plaintiffRepresentativePosition,
        plaintiffGovEntity,
        plaintiffGovRepresentative,
        // Defendant fields
        defendant,
        defendantType,
        defendantName,
        defendantNationalId,
        defendantPhone,
        defendantEmail,
        defendantAddress,
        defendantCompanyName,
        defendantUnifiedNumber,
        defendantCrNumber,
        defendantCompanyAddress,
        defendantRepresentativeName,
        defendantRepresentativePosition,
        defendantGovEntity,
        defendantGovRepresentative,
        // Claims
        claims,
        claimAmount,
        expectedWinAmount,
        // Other fields
        priority,
        status,
        nextHearing
    } = request.body;

    try {
        // Check if user is departed (read-only access)
        if (request.isDeparted) {
            throw CustomException('لم يعد لديك صلاحية إنشاء قضايا جديدة', 403);
        }

        // Check if user is a lawyer
        const user = await User.findById(request.userID);
        if (!user.isSeller) {
            throw CustomException('Only lawyers can create cases!', 403);
        }

        const firmId = request.firmId; // From firmFilter middleware

        // Build plaintiff object from flat fields if not provided as nested object
        const plaintiffData = plaintiff || {};
        if (plaintiffType) plaintiffData.type = plaintiffType;
        if (plaintiffName) plaintiffData.fullNameArabic = plaintiffName;
        if (plaintiffNationalId) plaintiffData.nationalId = plaintiffNationalId;
        if (plaintiffPhone) plaintiffData.phone = plaintiffPhone;
        if (plaintiffEmail) plaintiffData.email = plaintiffEmail;
        if (plaintiffAddress && typeof plaintiffAddress === 'string') {
            plaintiffData.nationalAddress = { ...plaintiffData.nationalAddress, streetName: plaintiffAddress };
        }
        if (plaintiffCompanyName) plaintiffData.companyName = plaintiffCompanyName;
        if (plaintiffUnifiedNumber) plaintiffData.unifiedNumber = plaintiffUnifiedNumber;
        if (plaintiffCrNumber) plaintiffData.crNumber = plaintiffCrNumber;
        if (plaintiffCompanyAddress && typeof plaintiffCompanyAddress === 'string') {
            plaintiffData.nationalAddress = { ...plaintiffData.nationalAddress, streetName: plaintiffCompanyAddress };
        }
        if (plaintiffRepresentativeName || plaintiffRepresentativePosition) {
            plaintiffData.authorizedRepresentative = {
                ...(plaintiffRepresentativeName && { name: plaintiffRepresentativeName }),
                ...(plaintiffRepresentativePosition && { position: plaintiffRepresentativePosition })
            };
        }

        // Build defendant object from flat fields if not provided as nested object
        const defendantData = defendant || {};
        if (defendantType) defendantData.type = defendantType;
        if (defendantName) defendantData.fullNameArabic = defendantName;
        if (defendantNationalId) defendantData.nationalId = defendantNationalId;
        if (defendantPhone) defendantData.phone = defendantPhone;
        if (defendantEmail) defendantData.email = defendantEmail;
        if (defendantAddress && typeof defendantAddress === 'string') {
            defendantData.nationalAddress = { ...defendantData.nationalAddress, streetName: defendantAddress };
        }
        if (defendantCompanyName) defendantData.companyName = defendantCompanyName;
        if (defendantUnifiedNumber) defendantData.unifiedNumber = defendantUnifiedNumber;
        if (defendantCrNumber) defendantData.crNumber = defendantCrNumber;
        if (defendantCompanyAddress && typeof defendantCompanyAddress === 'string') {
            defendantData.nationalAddress = { ...defendantData.nationalAddress, streetName: defendantCompanyAddress };
        }
        if (defendantRepresentativeName || defendantRepresentativePosition) {
            defendantData.authorizedRepresentative = {
                ...(defendantRepresentativeName && { name: defendantRepresentativeName }),
                ...(defendantRepresentativePosition && { position: defendantRepresentativePosition })
            };
        }

        // Build power of attorney object
        const poaData = powerOfAttorney || {};
        if (poaNumber) poaData.number = poaNumber;
        if (poaDate) poaData.date = poaDate;
        if (poaExpiry) poaData.expiry = poaExpiry;
        if (poaScope) poaData.scope = poaScope;

        let caseData = {
            lawyerId: request.userID,
            firmId,
            title,
            description,
            category,
            ...(subCategory && { subCategory }),
            ...(laborCaseDetails && { laborCaseDetails }),
            ...(commercialCaseDetails && { commercialCaseDetails }),
            ...(personalStatusDetails && { personalStatusDetails }),
            ...(caseNumber && { caseNumber }),
            ...(court && { court }),
            ...(startDate && { startDate }),
            ...(documents && { documents }),
            // Entity Type fields
            ...(entityType && { entityType }),
            ...(committee && { committee }),
            ...(arbitrationCenter && { arbitrationCenter }),
            ...(region && { region }),
            ...(city && { city }),
            ...(circuitNumber && { circuitNumber }),
            ...(judge && { judge }),
            // Internal Reference
            ...(internalReference && { internalReference }),
            ...(filingDate && { filingDate }),
            // Case Subject
            ...(caseSubject && { caseSubject }),
            ...(legalBasis && { legalBasis }),
            // Power of Attorney
            ...(Object.keys(poaData).length > 0 && { powerOfAttorney: poaData }),
            // Plaintiff and Defendant
            ...(Object.keys(plaintiffData).length > 0 && { plaintiff: plaintiffData }),
            ...(Object.keys(defendantData).length > 0 && { defendant: defendantData }),
            // Set plaintiffName and defendantName for display
            ...(plaintiffName && { plaintiffName }),
            ...(defendantName && { defendantName }),
            // Claims
            ...(claims && { claims }),
            ...(claimAmount && { claimAmount }),
            ...(expectedWinAmount && { expectedWinAmount }),
            // Other fields
            ...(priority && { priority }),
            ...(status && { status }),
            ...(nextHearing && { nextHearing })
        };

        // CASE 1: Platform case (with contract)
        if (contractId) {
            const contract = await Order.findById(contractId);
            
            if (!contract) {
                throw CustomException('Contract not found!', 404);
            }

            // Check if user is part of contract
            if (contract.sellerID.toString() !== request.userID && contract.buyerID.toString() !== request.userID) {
                throw CustomException('You are not authorized to create a case for this contract!', 403);
            }

            caseData.contractId = contractId;
            caseData.lawyerId = contract.sellerID;
            caseData.clientId = contract.buyerID;
            caseData.source = 'platform';
        } 
        // CASE 2: External case (standalone)
        else {
            if (clientId) {
                // Platform client
                caseData.clientId = clientId;
                caseData.source = 'platform';
            } else if (clientName) {
                // External client (not on platform)
                caseData.clientName = clientName;
                caseData.clientPhone = clientPhone;
                caseData.source = 'external';
            } else {
                // No client info provided - allowed for testing flexibility
                caseData.source = 'external';
            }
        }

        // Auto-generate internal reference if not provided
        if (!caseData.internalReference) {
            caseData.internalReference = await generateInternalReference(firmId);
        }

        const caseDoc = await Case.create(caseData);

        // Increment usage counter for firm
        if (firmId) {
            await Firm.findByIdAndUpdate(firmId, {
                $inc: { 'usage.cases': 1 }
            }).catch(err => console.error('Error updating case usage:', err.message));
        }

        // Log CRM activity
        try {
            await CrmActivity.logActivity({
                lawyerId: request.userID,
                type: 'case_created',
                entityType: 'case',
                entityId: caseDoc._id,
                entityName: caseDoc.title || caseDoc.caseNumber,
                title: `New case created: ${caseDoc.title || caseDoc.caseNumber}`,
                description: caseDoc.description,
                performedBy: request.userID,
                metadata: {
                    category: caseDoc.category,
                    status: caseDoc.status,
                    priority: caseDoc.priority
                }
            });
        } catch (activityError) {
            console.error('Error logging case creation activity:', activityError);
        }

        return response.status(201).send({
            error: false,
            message: 'Case created successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all cases (enhanced with advanced filtering and pagination)
const getCases = async (request, response) => {
    const {
        status,
        outcome,
        category,
        priority,
        lawyerId,
        clientId,
        dateFrom,
        dateTo,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        // New filter fields
        entityType,
        court,
        committee,
        arbitrationCenter,
        region
    } = request.query;

    try {
        const firmId = request.firmId; // From firmFilter middleware
        const isDeparted = request.isDeparted; // From firmFilter middleware

        // Build filters based on firmId or user access
        let filters;
        if (firmId) {
            if (isDeparted) {
                // Departed users can only see cases they were assigned to
                filters = {
                    firmId,
                    $or: [
                        { lawyerId: request.userID },
                        { assignedTo: request.userID },
                        { 'team.userId': request.userID }
                    ]
                };
            } else {
                // Active firm members see all firm cases
                filters = { firmId };
            }
        } else {
            // Otherwise, show cases where user is lawyer or client
            filters = {
                $or: [{ lawyerId: request.userID }, { clientId: request.userID }]
            };
        }

        // Apply optional filters
        if (status) filters.status = status;
        if (outcome) filters.outcome = outcome;
        if (category) filters.category = category;
        if (priority) filters.priority = priority;

        // Entity type filters
        if (entityType) filters.entityType = entityType;
        if (court) filters.court = court;
        if (committee) filters.committee = committee;
        if (arbitrationCenter) filters.arbitrationCenter = arbitrationCenter;
        if (region) filters.region = region;

        // Filter by specific lawyer or client
        if (lawyerId) {
            filters.lawyerId = lawyerId;
            delete filters.$or;
        }
        if (clientId) {
            filters.clientId = clientId;
            delete filters.$or;
        }

        // Date range filter
        if (dateFrom || dateTo) {
            filters.createdAt = {};
            if (dateFrom) filters.createdAt.$gte = new Date(dateFrom);
            if (dateTo) filters.createdAt.$lte = new Date(dateTo);
        }

        // Search filter (title, description, caseNumber)
        if (search) {
            filters.$and = filters.$and || [];
            filters.$and.push({
                $or: [
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { caseNumber: { $regex: search, $options: 'i' } },
                    { clientName: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Calculate pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Execute query with pagination
        const [cases, total] = await Promise.all([
            Case.find(filters)
                .populate('lawyerId', 'username firstName lastName image email')
                .populate('clientId', 'username firstName lastName image email')
                .populate('contractId', 'title totalAmount status')
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Case.countDocuments(filters)
        ]);

        return response.send({
            error: false,
            cases,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single case
const getCase = async (request, response) => {
    const { _id } = request.params;
    try {
        // DEBUG: Log all request context
        console.log('=== getCase DEBUG ===');
        console.log('Case ID requested:', _id);
        console.log('request.userID:', request.userID);
        console.log('request.firmId:', request.firmId);
        console.log('request.isSoloLawyer:', request.isSoloLawyer);
        console.log('request.user:', JSON.stringify(request.user, null, 2));

        const firmId = request.firmId;
        const isSoloLawyer = request.isSoloLawyer || false;

        const caseDoc = await Case.findById(_id)
            .populate('lawyerId', 'username firstName lastName image email lawyerProfile')
            .populate('clientId', 'username firstName lastName image email')
            .populate('contractId')
            .populate('documents.uploadedBy', 'username firstName lastName');

        if (!caseDoc) {
            console.log('Case not found!');
            throw CustomException('Case not found!', 404);
        }

        console.log('Case found - lawyerId:', caseDoc.lawyerId?._id?.toString() || caseDoc.lawyerId?.toString());
        console.log('Case found - clientId:', caseDoc.clientId?._id?.toString() || caseDoc.clientId?.toString());
        console.log('Case found - firmId:', caseDoc.firmId?.toString());

        // Check access using helper function
        const hasAccess = checkCaseAccess(caseDoc, request.userID, firmId, false, isSoloLawyer);
        console.log('checkCaseAccess returned:', hasAccess);

        if (!hasAccess) {
            console.log('ACCESS DENIED - throwing 403');
            throw CustomException('You do not have access to this case!', 403);
        }

        console.log('ACCESS GRANTED - returning case');
        return response.send({
            error: false,
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        console.log('getCase error:', message, 'status:', status);
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update case
const updateCase = async (request, response) => {
    const { _id } = request.params;
    try {
        // Block departed users from updating
        if (request.isDeparted) {
            throw CustomException('لم يعد لديك صلاحية تعديل القضايا', 403);
        }

        const firmId = request.firmId;
        const isSoloLawyer = request.isSoloLawyer || false;
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access (requires lawyer-level permissions)
        if (!checkCaseAccess(caseDoc, request.userID, firmId, true, isSoloLawyer)) {
            throw CustomException('Only the lawyer can update case details!', 403);
        }

        // Track changes for activity logging
        const changes = {};
        Object.keys(request.body).forEach(key => {
            if (request.body[key] !== caseDoc[key] && !['_id', 'createdAt', 'updatedAt'].includes(key)) {
                changes[key] = {
                    from: caseDoc[key],
                    to: request.body[key]
                };
            }
        });

        const updatedCase = await Case.findByIdAndUpdate(
            _id,
            { $set: request.body },
            { new: true }
        );

        // Log CRM activity if there were changes
        if (Object.keys(changes).length > 0) {
            try {
                // Check for assignment changes
                if (changes.assignedTo) {
                    await CrmActivity.logActivity({
                        lawyerId: request.userID,
                        type: 'assignment',
                        entityType: 'case',
                        entityId: updatedCase._id,
                        entityName: updatedCase.title || updatedCase.caseNumber,
                        title: `Case assigned to new user`,
                        performedBy: request.userID,
                        assignedTo: changes.assignedTo.to,
                        metadata: {
                            previousAssignee: changes.assignedTo.from,
                            newAssignee: changes.assignedTo.to
                        }
                    });
                }

                // Check for status changes
                if (changes.status) {
                    await CrmActivity.logActivity({
                        lawyerId: request.userID,
                        type: 'status_change',
                        entityType: 'case',
                        entityId: updatedCase._id,
                        entityName: updatedCase.title || updatedCase.caseNumber,
                        title: `Case status changed from ${changes.status.from} to ${changes.status.to}`,
                        performedBy: request.userID,
                        metadata: {
                            oldStatus: changes.status.from,
                            newStatus: changes.status.to
                        }
                    });
                }

                // Log general update for other changes
                const otherChanges = Object.keys(changes).filter(k => k !== 'assignedTo' && k !== 'status');
                if (otherChanges.length > 0) {
                    const changedFields = otherChanges.join(', ');
                    await CrmActivity.logActivity({
                        lawyerId: request.userID,
                        type: 'case_updated',
                        entityType: 'case',
                        entityId: updatedCase._id,
                        entityName: updatedCase.title || updatedCase.caseNumber,
                        title: `Case updated: ${changedFields}`,
                        description: `Updated fields: ${changedFields}`,
                        performedBy: request.userID,
                        metadata: {
                            changes: Object.fromEntries(otherChanges.map(k => [k, changes[k]]))
                        }
                    });
                }
            } catch (activityError) {
                console.error('Error logging case update activity:', activityError);
            }
        }

        return response.status(202).send({
            error: false,
            message: 'Case updated successfully!',
            case: updatedCase
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Add note to case
const addNote = async (request, response) => {
    const { _id } = request.params;
    const { text } = request.body;
    try {
        const firmId = request.firmId;
        const isSoloLawyer = request.isSoloLawyer || false;
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (!checkCaseAccess(caseDoc, request.userID, firmId, true, isSoloLawyer)) {
            throw CustomException('Only the lawyer can add notes!', 403);
        }

        caseDoc.notes.push({
            text,
            createdBy: request.userID,
            createdAt: new Date()
        });
        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: 'Note added successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Add document to case
const addDocument = async (request, response) => {
    const { _id } = request.params;
    const { name, filename, url, type, size, category } = request.body;
    try {
        const firmId = request.firmId;
        const isSoloLawyer = request.isSoloLawyer || false;
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (!checkCaseAccess(caseDoc, request.userID, firmId, false, isSoloLawyer)) {
            throw CustomException('You do not have access to this case!', 403);
        }

        caseDoc.documents.push({
            filename: filename || name,  // Support both 'filename' and 'name' fields
            url,
            type,
            size,
            category: category || 'other',
            uploadedBy: request.userID,
            uploadedAt: new Date()
        });
        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: 'Document added successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Add hearing to case
const addHearing = async (request, response) => {
    const { _id } = request.params;
    const { date, location, notes } = request.body;
    try {
        const firmId = request.firmId;
        const isSoloLawyer = request.isSoloLawyer || false;
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (!checkCaseAccess(caseDoc, request.userID, firmId, true, isSoloLawyer)) {
            throw CustomException('Only the lawyer can add hearings!', 403);
        }

        // Create the hearing
        const hearing = { date, location, notes, status: 'scheduled' };
        caseDoc.hearings.push(hearing);

        // Update nextHearing if this is the soonest upcoming hearing
        const hearingDate = new Date(date);
        if (!caseDoc.nextHearing || hearingDate < new Date(caseDoc.nextHearing)) {
            caseDoc.nextHearing = hearingDate;
        }

        await caseDoc.save();

        // Get the newly created hearing ID
        const newHearing = caseDoc.hearings[caseDoc.hearings.length - 1];

        // Auto-create Calendar Event for the hearing
        let createdEvent = null;
        let createdReminder = null;

        try {
            createdEvent = await Event.create({
                title: `جلسة محكمة - ${caseDoc.title}`,
                description: notes || `جلسة محكمة - قضية رقم ${caseDoc.caseNumber || ''}`,
                type: 'hearing',
                startDateTime: hearingDate,
                endDateTime: new Date(hearingDate.getTime() + 2 * 60 * 60 * 1000), // Default 2 hours
                allDay: false,
                timezone: 'Asia/Riyadh',
                location: location ? { type: 'physical', address: location } : undefined,
                caseId: caseDoc._id,
                organizer: request.userID,
                createdBy: request.userID,
                status: 'scheduled',
                priority: 'high',
                color: '#ef4444',
                hearingId: newHearing._id // Link to hearing
            });

            // Update hearing with event reference
            newHearing.eventId = createdEvent._id;
        } catch (eventError) {
            console.error('Error creating event for hearing:', eventError);
        }

        // Auto-create Reminder (1 day before the hearing)
        try {
            const reminderDate = new Date(hearingDate);
            reminderDate.setDate(reminderDate.getDate() - 1);
            reminderDate.setHours(9, 0, 0, 0); // Set reminder for 9 AM

            // Only create reminder if hearing is more than 1 day away
            if (reminderDate > new Date()) {
                createdReminder = await Reminder.create({
                    userId: request.userID,
                    title: `تذكير: جلسة محكمة - ${caseDoc.title}`,
                    description: `موعد الجلسة غداً في ${location || 'المحكمة'}`,
                    type: 'hearing',
                    reminderDateTime: reminderDate,
                    priority: 'high',
                    status: 'pending',
                    relatedCase: caseDoc._id,
                    relatedEvent: createdEvent ? createdEvent._id : undefined,
                    hearingId: newHearing._id, // Link to hearing
                    notification: {
                        channels: ['push', 'email'],
                        advanceNotifications: [
                            { minutes: 1440, sent: false } // 24 hours before
                        ]
                    },
                    createdBy: request.userID
                });

                // Update hearing with reminder reference
                newHearing.reminderId = createdReminder._id;
            }
        } catch (reminderError) {
            console.error('Error creating reminder for hearing:', reminderError);
        }

        // Save the case again with event/reminder references
        await caseDoc.save();

        // Log CRM activity for hearing addition
        try {
            await CrmActivity.logActivity({
                lawyerId: request.userID,
                type: 'case_updated',
                subType: 'hearing_added',
                entityType: 'case',
                entityId: caseDoc._id,
                entityName: caseDoc.title || caseDoc.caseNumber,
                title: `New hearing scheduled for ${new Date(date).toLocaleDateString()}`,
                description: notes || `Hearing scheduled at ${location}`,
                performedBy: request.userID,
                metadata: {
                    hearingDate: date,
                    location,
                    hearingId: newHearing._id
                }
            });
        } catch (activityError) {
            console.error('Error logging hearing addition activity:', activityError);
        }

        return response.status(202).send({
            error: false,
            message: 'Hearing added successfully!',
            case: caseDoc,
            event: createdEvent,
            reminder: createdReminder
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update case status
const updateStatus = async (request, response) => {
    const { _id } = request.params;
    const { status } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update case status!', 403);
        }

        const oldStatus = caseDoc.status;
        caseDoc.status = status;
        if (status === 'completed') {
            caseDoc.endDate = new Date();
        }
        await caseDoc.save();

        // Log CRM activity for status change
        try {
            await CrmActivity.logActivity({
                lawyerId: request.userID,
                type: 'status_change',
                entityType: 'case',
                entityId: caseDoc._id,
                entityName: caseDoc.title || caseDoc.caseNumber,
                title: `Case status changed from ${oldStatus} to ${status}`,
                performedBy: request.userID,
                metadata: {
                    oldStatus,
                    newStatus: status,
                    completedAt: status === 'completed' ? caseDoc.endDate : null
                }
            });
        } catch (activityError) {
            console.error('Error logging status change activity:', activityError);
        }

        return response.status(202).send({
            error: false,
            message: 'Case status updated!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Close case - specifically for KPI tracking
const closeCase = async (request, response) => {
    const { _id } = request.params;
    const { outcome, notes } = request.body;
    try {
        const firmId = request.firmId;
        const isSoloLawyer = request.isSoloLawyer || false;
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access (requires lawyer-level permissions)
        if (!checkCaseAccess(caseDoc, request.userID, firmId, true, isSoloLawyer)) {
            throw CustomException('Only the lawyer can close this case!', 403);
        }

        const oldStatus = caseDoc.status;

        // Update case
        caseDoc.status = 'closed';
        caseDoc.dateClosed = new Date();
        caseDoc.closedBy = request.userID;
        caseDoc.endDate = new Date();
        if (outcome) {
            caseDoc.outcome = outcome;
        }

        // Add to status history for tracking
        caseDoc.statusHistory.push({
            status: 'closed',
            changedAt: new Date(),
            changedBy: request.userID,
            notes
        });

        await caseDoc.save();

        // Log CRM activity for case closure
        try {
            await CrmActivity.logActivity({
                lawyerId: request.userID,
                type: 'status_change',
                subType: 'case_closed',
                entityType: 'case',
                entityId: caseDoc._id,
                entityName: caseDoc.title || caseDoc.caseNumber,
                title: `Case closed${outcome ? ` with outcome: ${outcome}` : ''}`,
                description: notes || `Case closed after ${caseDoc.daysOpen} days`,
                performedBy: request.userID,
                metadata: {
                    oldStatus,
                    newStatus: 'closed',
                    outcome,
                    daysToClose: caseDoc.daysOpen,
                    closedAt: caseDoc.dateClosed
                }
            });
        } catch (activityError) {
            console.error('Error logging case closure activity:', activityError);
        }

        return response.status(200).send({
            error: false,
            message: 'Case closed successfully!',
            case: caseDoc,
            daysToClose: caseDoc.daysOpen
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update case outcome
const updateOutcome = async (request, response) => {
    const { _id } = request.params;
    const { outcome } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update case outcome!', 403);
        }

        const oldOutcome = caseDoc.outcome;
        caseDoc.outcome = outcome;
        caseDoc.status = 'completed';
        caseDoc.endDate = new Date();
        await caseDoc.save();

        // Update lawyer stats
        await User.findByIdAndUpdate(caseDoc.lawyerId, {
            $inc: {
                'lawyerProfile.casesTotal': 1,
                ...(outcome === 'won' && { 'lawyerProfile.casesWon': 1 })
            }
        });

        // Recalculate lawyer score
        await calculateLawyerScore(caseDoc.lawyerId);

        // Log CRM activity for outcome update
        try {
            await CrmActivity.logActivity({
                lawyerId: request.userID,
                type: 'status_change',
                subType: 'outcome_updated',
                entityType: 'case',
                entityId: caseDoc._id,
                entityName: caseDoc.title || caseDoc.caseNumber,
                title: `Case outcome: ${outcome}`,
                description: `Case completed with outcome: ${outcome}`,
                performedBy: request.userID,
                metadata: {
                    oldOutcome,
                    newOutcome: outcome,
                    completedAt: caseDoc.endDate,
                    status: 'completed'
                }
            });
        } catch (activityError) {
            console.error('Error logging outcome update activity:', activityError);
        }

        return response.status(202).send({
            error: false,
            message: 'Case outcome updated!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Add timeline event to case
const addTimelineEvent = async (request, response) => {
    const { _id } = request.params;
    const { event, date, type, status } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can add timeline events!', 403);
        }

        caseDoc.timeline.push({
            event,
            date,
            type: type || 'general',
            status: status || 'upcoming'
        });
        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: 'Timeline event added successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Add claim to case
const addClaim = async (request, response) => {
    const { _id } = request.params;
    const { type, amount, period, description } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can add claims!', 403);
        }

        caseDoc.claims.push({ type, amount, period, description });

        // Update total claim amount
        caseDoc.claimAmount = caseDoc.claims.reduce((sum, claim) => sum + (claim.amount || 0), 0);

        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: 'Claim added successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update hearing
const updateHearing = async (request, response) => {
    const { _id, hearingId } = request.params;
    const { status, notes, date, location } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update hearings!', 403);
        }

        const hearing = caseDoc.hearings.id(hearingId);
        if (!hearing) {
            throw CustomException('Hearing not found!', 404);
        }

        const oldDate = hearing.date;
        if (status !== undefined) hearing.status = status;
        if (notes !== undefined) hearing.notes = notes;
        if (date !== undefined) hearing.date = date;
        if (location !== undefined) hearing.location = location;

        await caseDoc.save();

        // Sync linked Event if it exists
        if (hearing.eventId) {
            try {
                const eventUpdates = {};
                if (date !== undefined) {
                    const hearingDate = new Date(date);
                    eventUpdates.startDateTime = hearingDate;
                    eventUpdates.endDateTime = new Date(hearingDate.getTime() + 2 * 60 * 60 * 1000);
                }
                if (location !== undefined) {
                    eventUpdates.location = { type: 'physical', address: location };
                }
                if (notes !== undefined) {
                    eventUpdates.description = notes || `جلسة محكمة - قضية رقم ${caseDoc.caseNumber || ''}`;
                }
                if (status !== undefined) {
                    const eventStatusMap = {
                        'scheduled': 'scheduled',
                        'completed': 'completed',
                        'adjourned': 'postponed',
                        'cancelled': 'cancelled'
                    };
                    eventUpdates.status = eventStatusMap[status] || 'scheduled';
                }

                if (Object.keys(eventUpdates).length > 0) {
                    await Event.findByIdAndUpdate(hearing.eventId, eventUpdates);
                }
            } catch (eventError) {
                console.error('Error updating linked event:', eventError);
            }
        }

        // Sync linked Reminder if it exists and date changed
        if (hearing.reminderId && date !== undefined && oldDate.getTime() !== new Date(date).getTime()) {
            try {
                const hearingDate = new Date(date);
                const reminderDate = new Date(hearingDate);
                reminderDate.setDate(reminderDate.getDate() - 1);
                reminderDate.setHours(9, 0, 0, 0);

                const reminderUpdates = {
                    reminderDateTime: reminderDate,
                    description: `موعد الجلسة غداً في ${location || hearing.location || 'المحكمة'}`
                };

                await Reminder.findByIdAndUpdate(hearing.reminderId, reminderUpdates);
            } catch (reminderError) {
                console.error('Error updating linked reminder:', reminderError);
            }
        }

        return response.status(202).send({
            error: false,
            message: 'Hearing updated successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update progress
const updateProgress = async (request, response) => {
    const { _id } = request.params;
    const { progress } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update case progress!', 403);
        }

        if (progress < 0 || progress > 100) {
            throw CustomException('Progress must be between 0 and 100!', 400);
        }

        const oldProgress = caseDoc.progress;
        caseDoc.progress = progress;
        await caseDoc.save();

        // Log CRM activity for progress update (milestone)
        try {
            await CrmActivity.logActivity({
                lawyerId: request.userID,
                type: 'case_updated',
                subType: 'progress_updated',
                entityType: 'case',
                entityId: caseDoc._id,
                entityName: caseDoc.title || caseDoc.caseNumber,
                title: `Case progress updated to ${progress}%`,
                performedBy: request.userID,
                metadata: {
                    oldProgress,
                    newProgress: progress,
                    progressChange: progress - oldProgress
                }
            });
        } catch (activityError) {
            console.error('Error logging progress update activity:', activityError);
        }

        return response.status(202).send({
            error: false,
            message: 'Case progress updated!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete case
const deleteCase = async (request, response) => {
    const { _id } = request.params;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can delete this case!', 403);
        }

        // Store case info before deletion
        const caseTitle = caseDoc.title || caseDoc.caseNumber;
        const caseCategory = caseDoc.category;
        const caseStatus = caseDoc.status;

        await Case.findByIdAndDelete(_id);

        // Decrement usage counter for firm
        if (caseDoc.firmId) {
            await Firm.findByIdAndUpdate(caseDoc.firmId, {
                $inc: { 'usage.cases': -1 }
            }).catch(err => console.error('Error updating case usage:', err.message));
        }

        // Log CRM activity for case deletion
        try {
            await CrmActivity.logActivity({
                lawyerId: request.userID,
                type: 'case_deleted',
                entityType: 'case',
                entityId: _id,
                entityName: caseTitle,
                title: `Case deleted: ${caseTitle}`,
                performedBy: request.userID,
                metadata: {
                    category: caseCategory,
                    status: caseStatus,
                    deletedAt: new Date()
                }
            });
        } catch (activityError) {
            console.error('Error logging case deletion activity:', activityError);
        }

        return response.status(200).send({
            error: false,
            message: 'Case deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete note from case
const deleteNote = async (request, response) => {
    const { _id, noteId } = request.params;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can delete notes!', 403);
        }

        const note = caseDoc.notes.id(noteId);
        if (!note) {
            throw CustomException('Note not found!', 404);
        }

        caseDoc.notes.pull(noteId);
        await caseDoc.save();

        return response.status(200).send({
            error: false,
            message: 'Note deleted successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete hearing from case
const deleteHearing = async (request, response) => {
    const { _id, hearingId } = request.params;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can delete hearings!', 403);
        }

        const hearing = caseDoc.hearings.id(hearingId);
        if (!hearing) {
            throw CustomException('Hearing not found!', 404);
        }

        // Store references before deleting the hearing
        const eventId = hearing.eventId;
        const reminderId = hearing.reminderId;

        caseDoc.hearings.pull(hearingId);
        await caseDoc.save();

        // Delete linked Event if it exists
        if (eventId) {
            try {
                await Event.findByIdAndDelete(eventId);
            } catch (eventError) {
                console.error('Error deleting linked event:', eventError);
            }
        }

        // Delete linked Reminder if it exists
        if (reminderId) {
            try {
                await Reminder.findByIdAndDelete(reminderId);
            } catch (reminderError) {
                console.error('Error deleting linked reminder:', reminderError);
            }
        }

        return response.status(200).send({
            error: false,
            message: 'Hearing deleted successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete document from case
const deleteDocument = async (request, response) => {
    const { _id, documentId } = request.params;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can delete documents!', 403);
        }

        const doc = caseDoc.documents.id(documentId);
        if (!doc) {
            throw CustomException('Document not found!', 404);
        }

        caseDoc.documents.pull(documentId);
        await caseDoc.save();

        return response.status(200).send({
            error: false,
            message: 'Document deleted successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete claim from case
const deleteClaim = async (request, response) => {
    const { _id, claimId } = request.params;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can delete claims!', 403);
        }

        const claim = caseDoc.claims.id(claimId);
        if (!claim) {
            throw CustomException('Claim not found!', 404);
        }

        caseDoc.claims.pull(claimId);

        // Update total claim amount
        caseDoc.claimAmount = caseDoc.claims.reduce((sum, c) => sum + (c.amount || 0), 0);

        await caseDoc.save();

        return response.status(200).send({
            error: false,
            message: 'Claim deleted successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete timeline event from case
const deleteTimelineEvent = async (request, response) => {
    const { _id, eventId } = request.params;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can delete timeline events!', 403);
        }

        const event = caseDoc.timeline.id(eventId);
        if (!event) {
            throw CustomException('Timeline event not found!', 404);
        }

        caseDoc.timeline.pull(eventId);
        await caseDoc.save();

        return response.status(200).send({
            error: false,
            message: 'Timeline event deleted successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get case statistics (enhanced with byMonth and successRate)
const getStatistics = async (request, response) => {
    try {
        const firmId = request.firmId;

        // Build query based on firmId or lawyerId
        const queryFilter = firmId
            ? { firmId }
            : { lawyerId: request.userID };

        const cases = await Case.find(queryFilter);

        // Calculate won amount (from cases with outcome = 'won')
        const wonCases = cases.filter(c => c.outcome === 'won');
        const totalWonAmount = wonCases.reduce((sum, c) => sum + (c.claimAmount || 0), 0);

        // Calculate success rate
        const completedCases = cases.filter(c =>
            c.outcome === 'won' || c.outcome === 'lost' || c.outcome === 'settled'
        );
        const successRate = completedCases.length > 0
            ? Math.round((wonCases.length / completedCases.length) * 100)
            : 0;

        // Group by month (last 12 months)
        const byMonth = [];
        const now = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
            const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

            const created = cases.filter(c => {
                const createdAt = new Date(c.createdAt);
                return createdAt >= monthStart && createdAt <= monthEnd;
            }).length;

            const closed = cases.filter(c => {
                if (!c.endDate) return false;
                const endDate = new Date(c.endDate);
                return endDate >= monthStart && endDate <= monthEnd;
            }).length;

            byMonth.push({ month: monthKey, created, closed });
        }

        const statistics = {
            total: cases.length,
            active: cases.filter(c => c.status === 'active').length,
            closed: cases.filter(c => c.status === 'closed').length,
            completed: cases.filter(c => c.status === 'completed').length,
            won: wonCases.length,
            lost: cases.filter(c => c.outcome === 'lost').length,
            settled: cases.filter(c => c.outcome === 'settled').length,
            onHold: cases.filter(c => c.status === 'on-hold').length,
            appeal: cases.filter(c => c.status === 'appeal').length,
            settlement: cases.filter(c => c.status === 'settlement').length,
            highPriority: cases.filter(c => c.priority === 'high' || c.priority === 'critical').length,
            totalClaimAmount: cases.reduce((sum, c) => sum + (c.claimAmount || 0), 0),
            totalExpectedWinAmount: cases.reduce((sum, c) => sum + (c.expectedWinAmount || 0), 0),
            totalWonAmount,
            avgProgress: cases.length > 0
                ? Math.round(cases.reduce((sum, c) => sum + (c.progress || 0), 0) / cases.length)
                : 0,
            successRate,
            byCategory: {
                labor: cases.filter(c => c.category === 'labor').length,
                commercial: cases.filter(c => c.category === 'commercial').length,
                civil: cases.filter(c => c.category === 'civil').length,
                criminal: cases.filter(c => c.category === 'criminal').length,
                family: cases.filter(c => c.category === 'family').length,
                administrative: cases.filter(c => c.category === 'administrative').length
            },
            byPriority: {
                low: cases.filter(c => c.priority === 'low').length,
                medium: cases.filter(c => c.priority === 'medium').length,
                high: cases.filter(c => c.priority === 'high').length,
                critical: cases.filter(c => c.priority === 'critical').length
            },
            byMonth
        };

        return response.send({
            error: false,
            statistics
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// ==================== S3 DOCUMENT MANAGEMENT ====================

// Get presigned URL for uploading document
const getDocumentUploadUrl = async (request, response) => {
    const { _id } = request.params;
    const { filename, contentType, category } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access (lawyer or client)
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        // Determine bucket based on category
        const bucket = category === 'judgment' ? 'judgments' : 'general';

        // Generate file key
        const fileKey = generateFileKey(_id, category || 'other', filename);

        // Get presigned URL
        const uploadUrl = await getUploadPresignedUrl(fileKey, contentType, bucket);

        return response.status(200).send({
            error: false,
            uploadUrl,
            fileKey,
            bucket
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Confirm document upload and save to case
const confirmDocumentUpload = async (request, response) => {
    const { _id } = request.params;
    const { filename, fileKey, bucket, type, size, category, description } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access (lawyer or client)
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        // Add document to case
        caseDoc.documents.push({
            filename,
            fileKey,
            bucket: bucket || 'general',
            type,
            size,
            category: category || 'other',
            description,
            uploadedBy: request.userID,
            uploadedAt: new Date()
        });

        await caseDoc.save();

        return response.status(201).send({
            error: false,
            message: 'Document uploaded successfully!',
            document: caseDoc.documents[caseDoc.documents.length - 1],
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get presigned URL for downloading document
const getDocumentDownloadUrl = async (request, response) => {
    const { _id, docId } = request.params;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access (lawyer or client)
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        const doc = caseDoc.documents.id(docId);
        if (!doc) {
            throw CustomException('Document not found!', 404);
        }

        // If document has fileKey, generate presigned URL from S3
        if (doc.fileKey) {
            const downloadUrl = await getDownloadPresignedUrl(
                doc.fileKey,
                doc.bucket || 'general',
                doc.filename
            );

            return response.status(200).send({
                error: false,
                downloadUrl,
                filename: doc.filename
            });
        }

        // Fallback to stored URL (legacy documents)
        return response.status(200).send({
            error: false,
            downloadUrl: doc.url,
            filename: doc.filename
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete document from case and S3
const deleteDocumentWithS3 = async (request, response) => {
    const { _id, docId } = request.params;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can delete documents!', 403);
        }

        const doc = caseDoc.documents.id(docId);
        if (!doc) {
            throw CustomException('Document not found!', 404);
        }

        // Delete from S3 if fileKey exists
        if (doc.fileKey) {
            try {
                await deleteFile(doc.fileKey, doc.bucket || 'general');
            } catch (s3Error) {
                console.error('S3 delete error:', s3Error);
                // Continue even if S3 delete fails
            }
        }

        caseDoc.documents.pull(docId);
        await caseDoc.save();

        return response.status(200).send({
            error: false,
            message: 'Document deleted successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// ==================== NOTES CRUD ====================

// Update note
const updateNote = async (request, response) => {
    const { _id, noteId } = request.params;
    const { text } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update notes!', 403);
        }

        const note = caseDoc.notes.id(noteId);
        if (!note) {
            throw CustomException('Note not found!', 404);
        }

        if (text !== undefined) note.text = text;

        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: 'Note updated successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// ==================== CLAIMS CRUD ====================

// Update claim
const updateClaim = async (request, response) => {
    const { _id, claimId } = request.params;
    const { type, amount, period, description } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update claims!', 403);
        }

        const claim = caseDoc.claims.id(claimId);
        if (!claim) {
            throw CustomException('Claim not found!', 404);
        }

        if (type !== undefined) claim.type = type;
        if (amount !== undefined) claim.amount = amount;
        if (period !== undefined) claim.period = period;
        if (description !== undefined) claim.description = description;

        // Recalculate total claim amount
        caseDoc.claimAmount = caseDoc.claims.reduce((sum, c) => sum + (c.amount || 0), 0);

        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: 'Claim updated successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// ==================== TIMELINE CRUD ====================

// Update timeline event
const updateTimelineEvent = async (request, response) => {
    const { _id, eventId } = request.params;
    const { event, date, type, status } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update timeline events!', 403);
        }

        const timelineEvent = caseDoc.timeline.id(eventId);
        if (!timelineEvent) {
            throw CustomException('Timeline event not found!', 404);
        }

        if (event !== undefined) timelineEvent.event = event;
        if (date !== undefined) timelineEvent.date = date;
        if (type !== undefined) timelineEvent.type = type;
        if (status !== undefined) timelineEvent.status = status;

        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: 'Timeline event updated successfully!',
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// ==================== AUDIT LOG ====================

// Get case audit history
const getCaseAudit = async (request, response) => {
    const { _id } = request.params;
    const { page = 1, limit = 50, resource, action } = request.query;

    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access (only lawyer can view audit)
        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can view audit history!', 403);
        }

        // Get audit logs from the new CaseAuditLog model
        const result = await CaseAuditService.getCaseAuditHistory(_id, {
            page: parseInt(page),
            limit: parseInt(limit),
            resource,
            action
        });

        // Also get legacy logs from the old AuditLog model for backwards compatibility
        const legacyLogs = await AuditLog.find({
            resourceType: 'Case',
            resourceId: _id
        })
            .populate('userId', 'firstName lastName email')
            .sort({ timestamp: -1 })
            .limit(50);

        // Transform legacy logs to match expected format
        const formattedLegacyLogs = legacyLogs.map(log => ({
            _id: log._id,
            userId: log.userId,
            action: mapLegacyAction(log.action),
            resource: log.resourceType?.toLowerCase() || 'case',
            resourceId: log.resourceId,
            caseId: _id,
            changes: log.details || {},
            metadata: {
                ip: log.ipAddress,
                userAgent: log.userAgent
            },
            timestamp: log.timestamp,
            createdAt: log.timestamp,
            isLegacy: true
        }));

        // Combine and sort all logs
        const allLogs = [...result.logs, ...formattedLegacyLogs]
            .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
            .slice(0, parseInt(limit));

        return response.send({
            error: false,
            data: allLogs,
            pagination: result.pagination
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Helper to map legacy action names to new format
const mapLegacyAction = (action) => {
    const mapping = {
        'view_case': 'view',
        'create_case': 'create',
        'update_case': 'update',
        'delete_case': 'delete',
        'view_document': 'view',
        'upload_document': 'create',
        'download_document': 'view',
        'delete_document': 'delete'
    };
    return mapping[action] || action;
};

// ==================== RICH DOCUMENTS (Editable with CKEditor) ====================

// Helper to strip HTML tags for plain text
const stripHtml = (html) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
};

// Helper to count words
const countWords = (text) => {
    if (!text) return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
};

// Create rich document in case
const createRichDocument = async (request, response) => {
    const { _id } = request.params;
    const {
        title,
        titleAr,
        content,
        documentType,
        status,
        language,
        textDirection,
        showOnCalendar,
        calendarDate,
        calendarColor
    } = request.body;

    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can create documents!', 403);
        }

        const plainText = stripHtml(content);

        const richDoc = {
            title,
            titleAr,
            content,
            contentPlainText: plainText,
            documentType: documentType || 'other',
            status: status || 'draft',
            language: language || 'ar',
            textDirection: textDirection || 'rtl',
            version: 1,
            wordCount: countWords(plainText),
            characterCount: plainText.length,
            showOnCalendar: showOnCalendar || false,
            calendarDate,
            calendarColor: calendarColor || '#3b82f6',
            createdBy: request.userID,
            lastEditedBy: request.userID,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        caseDoc.richDocuments.push(richDoc);
        await caseDoc.save();

        const newDoc = caseDoc.richDocuments[caseDoc.richDocuments.length - 1];

        return response.status(201).send({
            error: false,
            message: 'Rich document created successfully!',
            data: {
                document: newDoc
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all rich documents for a case
const getRichDocuments = async (request, response) => {
    const { _id } = request.params;
    const { documentType, status, search } = request.query;

    try {
        const caseDoc = await Case.findById(_id)
            .populate('richDocuments.createdBy', 'firstName lastName')
            .populate('richDocuments.lastEditedBy', 'firstName lastName');

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        let documents = caseDoc.richDocuments || [];

        // Apply filters
        if (documentType) {
            documents = documents.filter(d => d.documentType === documentType);
        }
        if (status) {
            documents = documents.filter(d => d.status === status);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            documents = documents.filter(d =>
                (d.title && d.title.toLowerCase().includes(searchLower)) ||
                (d.titleAr && d.titleAr.includes(search)) ||
                (d.contentPlainText && d.contentPlainText.toLowerCase().includes(searchLower))
            );
        }

        // Sort by updatedAt desc
        documents.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

        return response.send({
            error: false,
            data: {
                documents,
                total: documents.length
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single rich document
const getRichDocument = async (request, response) => {
    const { _id, docId } = request.params;

    try {
        const caseDoc = await Case.findById(_id)
            .populate('richDocuments.createdBy', 'firstName lastName')
            .populate('richDocuments.lastEditedBy', 'firstName lastName')
            .populate('richDocuments.previousVersions.editedBy', 'firstName lastName');

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        const richDoc = caseDoc.richDocuments.id(docId);
        if (!richDoc) {
            throw CustomException('Document not found!', 404);
        }

        return response.send({
            error: false,
            data: {
                document: richDoc,
                case: {
                    _id: caseDoc._id,
                    title: caseDoc.title,
                    caseNumber: caseDoc.caseNumber
                }
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update rich document
const updateRichDocument = async (request, response) => {
    const { _id, docId } = request.params;
    const {
        title,
        titleAr,
        content,
        documentType,
        status,
        language,
        textDirection,
        showOnCalendar,
        calendarDate,
        calendarColor,
        changeNote
    } = request.body;

    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update documents!', 403);
        }

        const richDoc = caseDoc.richDocuments.id(docId);
        if (!richDoc) {
            throw CustomException('Document not found!', 404);
        }

        // Save previous version if content changed
        if (content !== undefined && content !== richDoc.content) {
            richDoc.previousVersions.push({
                content: richDoc.content,
                version: richDoc.version,
                editedBy: richDoc.lastEditedBy,
                editedAt: richDoc.updatedAt,
                changeNote: changeNote || `Version ${richDoc.version}`
            });
            richDoc.version += 1;
        }

        // Update fields
        if (title !== undefined) richDoc.title = title;
        if (titleAr !== undefined) richDoc.titleAr = titleAr;
        if (content !== undefined) {
            richDoc.content = content;
            richDoc.contentPlainText = stripHtml(content);
            richDoc.wordCount = countWords(richDoc.contentPlainText);
            richDoc.characterCount = richDoc.contentPlainText.length;
        }
        if (documentType !== undefined) richDoc.documentType = documentType;
        if (status !== undefined) richDoc.status = status;
        if (language !== undefined) richDoc.language = language;
        if (textDirection !== undefined) richDoc.textDirection = textDirection;
        if (showOnCalendar !== undefined) richDoc.showOnCalendar = showOnCalendar;
        if (calendarDate !== undefined) richDoc.calendarDate = calendarDate;
        if (calendarColor !== undefined) richDoc.calendarColor = calendarColor;

        richDoc.lastEditedBy = request.userID;
        richDoc.updatedAt = new Date();

        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: 'Document updated successfully!',
            data: {
                document: richDoc
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete rich document
const deleteRichDocument = async (request, response) => {
    const { _id, docId } = request.params;

    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can delete documents!', 403);
        }

        const richDoc = caseDoc.richDocuments.id(docId);
        if (!richDoc) {
            throw CustomException('Document not found!', 404);
        }

        caseDoc.richDocuments.pull(docId);
        await caseDoc.save();

        return response.status(200).send({
            error: false,
            message: 'Document deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get rich document version history
const getRichDocumentVersions = async (request, response) => {
    const { _id, docId } = request.params;

    try {
        const caseDoc = await Case.findById(_id)
            .populate('richDocuments.previousVersions.editedBy', 'firstName lastName');

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        const richDoc = caseDoc.richDocuments.id(docId);
        if (!richDoc) {
            throw CustomException('Document not found!', 404);
        }

        // Include current version as well
        const versions = [
            {
                version: richDoc.version,
                content: richDoc.content,
                editedBy: richDoc.lastEditedBy,
                editedAt: richDoc.updatedAt,
                changeNote: 'Current version',
                isCurrent: true
            },
            ...(richDoc.previousVersions || []).map(v => ({
                ...v.toObject(),
                isCurrent: false
            }))
        ];

        return response.send({
            error: false,
            data: {
                documentId: docId,
                title: richDoc.title,
                versions
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Restore rich document to a previous version
const restoreRichDocumentVersion = async (request, response) => {
    const { _id, docId, versionNumber } = request.params;

    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can restore document versions!', 403);
        }

        const richDoc = caseDoc.richDocuments.id(docId);
        if (!richDoc) {
            throw CustomException('Document not found!', 404);
        }

        const targetVersion = richDoc.previousVersions.find(
            v => v.version === parseInt(versionNumber)
        );

        if (!targetVersion) {
            throw CustomException('Version not found!', 404);
        }

        // Save current as previous version
        richDoc.previousVersions.push({
            content: richDoc.content,
            version: richDoc.version,
            editedBy: richDoc.lastEditedBy,
            editedAt: richDoc.updatedAt,
            changeNote: `Before restore from version ${versionNumber}`
        });

        // Restore
        richDoc.content = targetVersion.content;
        richDoc.contentPlainText = stripHtml(targetVersion.content);
        richDoc.wordCount = countWords(richDoc.contentPlainText);
        richDoc.characterCount = richDoc.contentPlainText.length;
        richDoc.version += 1;
        richDoc.lastEditedBy = request.userID;
        richDoc.updatedAt = new Date();

        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: `Document restored to version ${versionNumber}!`,
            data: {
                document: richDoc
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// ==================== RICH DOCUMENT EXPORT ====================

// Export rich document to PDF
const exportRichDocumentToPdf = async (request, response) => {
    const { _id, docId } = request.params;

    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        const richDoc = caseDoc.richDocuments.id(docId);
        if (!richDoc) {
            throw CustomException('Document not found!', 404);
        }

        // Prepare document for export
        const exportData = {
            title: richDoc.title,
            titleAr: richDoc.titleAr,
            content: richDoc.content,
            caseId: {
                caseNumber: caseDoc.caseNumber
            },
            pageType: richDoc.documentType,
            createdAt: richDoc.createdAt,
            version: richDoc.version
        };

        const direction = richDoc.textDirection || 'rtl';

        // Generate PDF
        const pdfBuffer = await documentExportService.generatePdf(exportData, { direction });

        // Upload to S3
        const fileName = `${richDoc.title || 'document'}_v${richDoc.version}.pdf`;
        const uploadResult = await documentExportService.uploadExportToS3(
            pdfBuffer,
            fileName,
            'application/pdf'
        );

        // Update export tracking
        richDoc.lastExportedAt = new Date();
        richDoc.lastExportFormat = 'pdf';
        richDoc.exportCount = (richDoc.exportCount || 0) + 1;
        await caseDoc.save();

        return response.send({
            error: false,
            message: 'PDF generated successfully!',
            data: {
                downloadUrl: uploadResult.downloadUrl,
                fileName: uploadResult.fileName
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Export rich document to LaTeX
const exportRichDocumentToLatex = async (request, response) => {
    const { _id, docId } = request.params;

    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        const richDoc = caseDoc.richDocuments.id(docId);
        if (!richDoc) {
            throw CustomException('Document not found!', 404);
        }

        const exportData = {
            title: richDoc.title,
            titleAr: richDoc.titleAr,
            content: richDoc.content,
            contentText: richDoc.contentPlainText
        };

        const direction = richDoc.textDirection || 'rtl';
        const latex = documentExportService.generateLatex(exportData, { direction });

        // Update export tracking
        richDoc.lastExportedAt = new Date();
        richDoc.lastExportFormat = 'latex';
        richDoc.exportCount = (richDoc.exportCount || 0) + 1;
        await caseDoc.save();

        return response.send({
            error: false,
            data: {
                latex,
                fileName: `${richDoc.title || 'document'}.tex`
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Export rich document to Markdown
const exportRichDocumentToMarkdown = async (request, response) => {
    const { _id, docId } = request.params;

    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        const richDoc = caseDoc.richDocuments.id(docId);
        if (!richDoc) {
            throw CustomException('Document not found!', 404);
        }

        const exportData = {
            title: richDoc.title,
            titleAr: richDoc.titleAr,
            content: richDoc.content,
            caseId: {
                caseNumber: caseDoc.caseNumber
            },
            pageType: richDoc.documentType,
            createdAt: richDoc.createdAt
        };

        const direction = richDoc.textDirection || 'rtl';
        const markdown = documentExportService.generateMarkdown(exportData, { direction });

        // Update export tracking
        richDoc.lastExportedAt = new Date();
        richDoc.lastExportFormat = 'markdown';
        richDoc.exportCount = (richDoc.exportCount || 0) + 1;
        await caseDoc.save();

        return response.send({
            error: false,
            data: {
                markdown,
                fileName: `${richDoc.title || 'document'}.md`
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get HTML preview of rich document
const getRichDocumentPreview = async (request, response) => {
    const { _id, docId } = request.params;

    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access
        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        const richDoc = caseDoc.richDocuments.id(docId);
        if (!richDoc) {
            throw CustomException('Document not found!', 404);
        }

        const exportData = {
            title: richDoc.title,
            titleAr: richDoc.titleAr,
            content: richDoc.content,
            caseId: {
                caseNumber: caseDoc.caseNumber
            },
            pageType: richDoc.documentType,
            createdAt: richDoc.createdAt,
            version: richDoc.version
        };

        const direction = richDoc.textDirection || 'rtl';
        const html = documentExportService.generateHtmlTemplate(exportData, { direction });

        return response.send({
            error: false,
            data: {
                html
            }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

/**
 * GET /api/cases/overview
 * Consolidated endpoint - replaces 4 separate API calls
 * Returns: cases list, statistics, pipeline stats, client stats
 */
const getCasesOverview = async (request, response) => {
    try {
        const userId = request.userID;
        const firmId = request.firmId;
        const isSoloLawyer = request.isSoloLawyer;
        const { page = 1, limit = 20, status, priority, category } = request.query;

        // Build filter
        const filter = {};
        if (firmId) {
            filter.firmId = firmId;
        } else if (isSoloLawyer) {
            filter.lawyerId = userId;
        }
        if (status) filter.status = status;
        if (priority) filter.priority = priority;
        if (category) filter.category = category;

        const mongoose = require('mongoose');
        const Task = require('../models/task.model');
        const Client = require('../models/client.model');

        const matchFilter = firmId
            ? { firmId: new mongoose.Types.ObjectId(firmId) }
            : { lawyerId: new mongoose.Types.ObjectId(userId) };

        const [cases, totalCount, statistics, pipelineStats, topClients] = await Promise.all([
            // Paginated cases list
            Case.find(filter)
                .populate('clientId', 'name email phone clientType')
                .populate('lawyerId', 'firstName lastName email')
                .sort({ updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .lean(),

            // Total count for pagination
            Case.countDocuments(filter),

            // Statistics by status/outcome
            Case.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        open: { $sum: { $cond: [{ $in: ['$status', ['active', 'in_progress', 'open']] }, 1, 0] } },
                        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
                        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
                        won: { $sum: { $cond: [{ $eq: ['$outcome', 'won'] }, 1, 0] } },
                        lost: { $sum: { $cond: [{ $eq: ['$outcome', 'lost'] }, 1, 0] } },
                        settled: { $sum: { $cond: [{ $eq: ['$outcome', 'settled'] }, 1, 0] } }
                    }
                }
            ]),

            // Pipeline stats by stage
            Case.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$pipelineStage',
                        count: { $sum: 1 }
                    }
                }
            ]),

            // Top clients by case count
            Case.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$clientId', caseCount: { $sum: 1 } } },
                { $sort: { caseCount: -1 } },
                { $limit: 5 },
                {
                    $lookup: {
                        from: 'clients',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'client'
                    }
                },
                { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
                {
                    $project: {
                        _id: 1,
                        caseCount: 1,
                        clientName: '$client.name',
                        clientType: '$client.clientType'
                    }
                }
            ])
        ]);

        const stats = statistics[0] || { total: 0, open: 0, pending: 0, closed: 0, won: 0, lost: 0, settled: 0 };
        const byStage = Object.fromEntries(pipelineStats.map(s => [s._id || 'unknown', s.count]));

        return response.json({
            success: true,
            data: {
                cases,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalCount,
                    pages: Math.ceil(totalCount / limit)
                },
                statistics: {
                    total: stats.total,
                    open: stats.open,
                    pending: stats.pending,
                    closed: stats.closed,
                    won: stats.won,
                    lost: stats.lost,
                    settled: stats.settled
                },
                pipelineStats: {
                    byStage
                },
                clientStats: {
                    topClients
                }
            }
        });
    } catch (error) {
        console.error('getCasesOverview ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch cases overview'
        });
    }
};

/**
 * GET /api/cases/:id/full
 * Consolidated endpoint - replaces 3 separate API calls
 * Returns: case details, audit log, related tasks, documents
 */
const getCaseFull = async (request, response) => {
    try {
        const { _id } = request.params;
        const userId = request.userID;
        const firmId = request.firmId;
        const isSoloLawyer = request.isSoloLawyer;

        const Task = require('../models/task.model');

        const [caseDoc, auditLog, relatedTasks] = await Promise.all([
            // Full case with populated fields
            Case.findById(_id)
                .populate('clientId', 'name email phone clientType nationalId crNumber address')
                .populate('lawyerId', 'firstName lastName email phone image')
                .populate('assignedLawyers', 'firstName lastName email')
                .lean(),

            // Audit log (last 50 entries)
            CaseAuditLog.find({ caseId: _id })
                .populate('userId', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .limit(50)
                .lean(),

            // Related tasks
            Task.find({ caseId: _id })
                .populate('assignedTo', 'firstName lastName email')
                .sort({ dueDate: 1 })
                .lean()
        ]);

        if (!caseDoc) {
            return response.status(404).json({
                error: true,
                message: 'Case not found'
            });
        }

        // Check access
        if (!checkCaseAccess(caseDoc, userId, firmId, false, isSoloLawyer)) {
            return response.status(403).json({
                error: true,
                message: 'You do not have access to this case'
            });
        }

        return response.json({
            success: true,
            data: {
                case: caseDoc,
                auditLog,
                relatedTasks,
                documents: caseDoc.documents || [],
                richDocuments: caseDoc.richDocuments || []
            }
        });
    } catch (error) {
        console.error('getCaseFull ERROR:', error);
        return response.status(500).json({
            error: true,
            message: error.message || 'Failed to fetch case details'
        });
    }
};

module.exports = {
    createCase,
    getCases,
    getCase,
    updateCase,
    addNote,
    addDocument,
    addHearing,
    updateStatus,
    updateOutcome,
    closeCase,
    addTimelineEvent,
    addClaim,
    updateHearing,
    updateProgress,
    deleteCase,
    deleteNote,
    deleteHearing,
    deleteDocument,
    deleteClaim,
    deleteTimelineEvent,
    getStatistics,
    // S3 Document Management
    getDocumentUploadUrl,
    confirmDocumentUpload,
    getDocumentDownloadUrl,
    deleteDocumentWithS3,
    // Notes, Claims, Timeline CRUD
    updateNote,
    updateClaim,
    updateTimelineEvent,
    // Audit
    getCaseAudit,
    // Rich Documents (CKEditor)
    createRichDocument,
    getRichDocuments,
    getRichDocument,
    updateRichDocument,
    deleteRichDocument,
    getRichDocumentVersions,
    restoreRichDocumentVersion,
    // Rich Document Export
    exportRichDocumentToPdf,
    exportRichDocumentToLatex,
    exportRichDocumentToMarkdown,
    getRichDocumentPreview,
    // Batch endpoints
    getCasesOverview,
    getCaseFull
};
