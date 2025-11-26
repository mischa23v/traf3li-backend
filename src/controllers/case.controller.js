const { Case, Order, User } = require('../models');
const { CustomException } = require('../utils');
const { calculateLawyerScore } = require('./score.controller');

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

// Get all cases
const getCases = async (request, response) => {
    const { status, outcome, category, priority } = request.query;
    try {
        const filters = {
            $or: [{ lawyerId: request.userID }, { clientId: request.userID }],
            ...(status && { status }),
            ...(outcome && { outcome }),
            ...(category && { category }),
            ...(priority && { priority })
        };

        const cases = await Case.find(filters)
            .populate('lawyerId', 'username firstName lastName image email')
            .populate('clientId', 'username firstName lastName image email')
            .populate('contractId')
            .sort({ updatedAt: -1 });

        return response.send({
            error: false,
            cases
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

        caseDoc.notes.push({ text, date: new Date() });
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

        caseDoc.hearings.push({ date, location, notes, attended: false });
        await caseDoc.save();

        return response.status(202).send({
            error: false,
            message: 'Hearing added successfully!',
            case: caseDoc
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
    const { attended, notes, date, location } = request.body;
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

        if (attended !== undefined) hearing.attended = attended;
        if (notes !== undefined) hearing.notes = notes;
        if (date !== undefined) hearing.date = date;
        if (location !== undefined) hearing.location = location;

        await caseDoc.save();

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

        caseDoc.hearings.pull(hearingId);
        await caseDoc.save();

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

// Get case statistics
const getStatistics = async (request, response) => {
    try {
        // Only get cases where user is the lawyer
        const cases = await Case.find({ lawyerId: request.userID });

        const statistics = {
            total: cases.length,
            active: cases.filter(c => c.status === 'active').length,
            closed: cases.filter(c => c.status === 'closed').length,
            completed: cases.filter(c => c.status === 'completed').length,
            won: cases.filter(c => c.outcome === 'won').length,
            lost: cases.filter(c => c.outcome === 'lost').length,
            settled: cases.filter(c => c.outcome === 'settled').length,
            onHold: cases.filter(c => c.status === 'on-hold').length,
            appeal: cases.filter(c => c.status === 'appeal').length,
            settlement: cases.filter(c => c.status === 'settlement').length,
            highPriority: cases.filter(c => c.priority === 'high' || c.priority === 'critical').length,
            totalClaimAmount: cases.reduce((sum, c) => sum + (c.claimAmount || 0), 0),
            totalExpectedWinAmount: cases.reduce((sum, c) => sum + (c.expectedWinAmount || 0), 0),
            avgProgress: cases.length > 0
                ? Math.round(cases.reduce((sum, c) => sum + (c.progress || 0), 0) / cases.length)
                : 0,
            byCategory: {},
            byPriority: {
                low: cases.filter(c => c.priority === 'low').length,
                medium: cases.filter(c => c.priority === 'medium').length,
                high: cases.filter(c => c.priority === 'high').length,
                critical: cases.filter(c => c.priority === 'critical').length
            }
        };

        // Group by category
        cases.forEach(c => {
            if (c.category) {
                statistics.byCategory[c.category] = (statistics.byCategory[c.category] || 0) + 1;
            }
        });

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
    getStatistics
};
