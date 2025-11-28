const { Case, Order, User, Event, Reminder } = require('../models');
const AuditLog = require('../models/auditLog.model');
const CaseAuditLog = require('../models/caseAuditLog.model');
const CaseAuditService = require('../services/caseAuditService');
const { CustomException } = require('../utils');
const { calculateLawyerScore } = require('./score.controller');
const { getUploadPresignedUrl, getDownloadPresignedUrl, deleteFile, generateFileKey } = require('../configs/s3');
const documentExportService = require('../services/documentExport.service');

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
        laborCaseDetails,  // ✅ NEW
        caseNumber,        // ✅ NEW
        court,             // ✅ NEW
        startDate,         // ✅ NEW
        documents          // ✅ NEW
    } = request.body;
    
    try {
        // Check if user is a lawyer
        const user = await User.findById(request.userID);
        if (!user.isSeller) {
            throw CustomException('Only lawyers can create cases!', 403);
        }

        let caseData = {
            lawyerId: request.userID,
            title,
            description,
            category,
            ...(laborCaseDetails && { laborCaseDetails }),  // ✅ NEW
            ...(caseNumber && { caseNumber }),              // ✅ NEW
            ...(court && { court }),                        // ✅ NEW
            ...(startDate && { startDate }),                // ✅ NEW
            ...(documents && { documents })                 // ✅ NEW
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
                throw CustomException('Either contractId, clientId, or clientName is required!', 400);
            }
        }

        const caseDoc = await Case.create(caseData);

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
        sortOrder = 'desc'
    } = request.query;

    try {
        // Build filters
        const filters = {
            $or: [{ lawyerId: request.userID }, { clientId: request.userID }]
        };

        // Apply optional filters
        if (status) filters.status = status;
        if (outcome) filters.outcome = outcome;
        if (category) filters.category = category;
        if (priority) filters.priority = priority;

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
                .populate('contractId')
                .sort(sort)
                .skip(skip)
                .limit(limitNum),
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
        const caseDoc = await Case.findById(_id)
            .populate('lawyerId', 'username firstName lastName image email lawyerProfile')
            .populate('clientId', 'username firstName lastName image email')
            .populate('contractId')
            .populate('documents.uploadedBy', 'username firstName lastName');

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access (lawyer or client)
        const isLawyer = caseDoc.lawyerId._id.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId._id.toString() === request.userID;
        
        if (!isLawyer && !isClient) {
            throw CustomException('You do not have access to this case!', 403);
        }

        return response.send({
            error: false,
            case: caseDoc
        });
    } catch ({ message, status = 500 }) {
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
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
            throw CustomException('Only the lawyer can update case details!', 403);
        }

        const updatedCase = await Case.findByIdAndUpdate(
            _id,
            { $set: request.body },
            { new: true }
        );

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
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
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
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        const isLawyer = caseDoc.lawyerId.toString() === request.userID;
        const isClient = caseDoc.clientId && caseDoc.clientId.toString() === request.userID;

        if (!isLawyer && !isClient) {
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
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID) {
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

        caseDoc.status = status;
        if (status === 'completed') {
            caseDoc.endDate = new Date();
        }
        await caseDoc.save();

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

        caseDoc.progress = progress;
        await caseDoc.save();

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

        await Case.findByIdAndDelete(_id);

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
        // Only get cases where user is the lawyer
        const cases = await Case.find({ lawyerId: request.userID });

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
    getRichDocumentPreview
};
