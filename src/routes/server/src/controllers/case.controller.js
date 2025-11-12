const { Case, Order, User } = require('../models');
const { CustomException } = require('../utils');
const { calculateLawyerScore } = require('./score.controller');

// Create case from contract
const createCase = async (request, response) => {
    const { contractId, title, description, category } = request.body;
    try {
        const contract = await Order.findById(contractId);
        
        if (!contract) {
            throw CustomException('Contract not found!', 404);
        }

        // Check if user is part of contract
        if (contract.sellerID.toString() !== request.userID && contract.buyerID.toString() !== request.userID) {
            throw CustomException('You are not authorized to create a case for this contract!', 403);
        }

        const caseDoc = new Case({
            contractId,
            lawyerId: contract.sellerID,
            clientId: contract.buyerID,
            title,
            description,
            category
        });

        await caseDoc.save();

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
    const { status, outcome } = request.query;
    try {
        const filters = {
            $or: [{ lawyerId: request.userID }, { clientId: request.userID }],
            ...(status && { status }),
            ...(outcome && { outcome })
        };

        const cases = await Case.find(filters)
            .populate('lawyerId', 'username image email')
            .populate('clientId', 'username image email')
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
            .populate('lawyerId', 'username image email lawyerProfile')
            .populate('clientId', 'username image email')
            .populate('contractId');

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        // Check access
        if (caseDoc.lawyerId._id.toString() !== request.userID && caseDoc.clientId._id.toString() !== request.userID) {
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
    const { name, url } = request.body;
    try {
        const caseDoc = await Case.findById(_id);

        if (!caseDoc) {
            throw CustomException('Case not found!', 404);
        }

        if (caseDoc.lawyerId.toString() !== request.userID && caseDoc.clientId.toString() !== request.userID) {
            throw CustomException('You do not have access to this case!', 403);
        }

        caseDoc.documents.push({ name, url, uploadedAt: new Date() });
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

module.exports = {
    createCase,
    getCases,
    getCase,
    updateCase,
    addNote,
    addDocument,
    addHearing,
    updateStatus,
    updateOutcome
};
