const { Firm, User } = require('../models');
const { CustomException } = require('../utils');

// Create firm
const createFirm = async (request, response) => {
    const { name, description, address, city, website, logo, practiceAreas, awards } = request.body;
    try {
        const firm = new Firm({
            name,
            description,
            address,
            city,
            website,
            logo,
            practiceAreas,
            awards,
            lawyers: [request.userID]
        });

        await firm.save();

        return response.status(201).send({
            error: false,
            message: 'Firm created successfully!',
            firm
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all firms
const getFirms = async (request, response) => {
    const { search, city, practiceArea } = request.query;
    try {
        const filters = {
            ...(search && { $text: { $search: search } }),
            ...(city && { city: { $regex: city, $options: 'i' } }),
            ...(practiceArea && { practiceAreas: practiceArea })
        };

        const firms = await Firm.find(filters)
            .populate('lawyers', 'username image lawyerProfile.specialization lawyerProfile.rating')
            .sort({ verified: -1, createdAt: -1 });

        return response.send({
            error: false,
            firms
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single firm
const getFirm = async (request, response) => {
    const { _id } = request.params;
    try {
        const firm = await Firm.findById(_id)
            .populate('lawyers', 'username image email lawyerProfile');

        if (!firm) {
            throw CustomException('Firm not found!', 404);
        }

        return response.send({
            error: false,
            firm
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update firm
const updateFirm = async (request, response) => {
    const { _id } = request.params;
    try {
        const firm = await Firm.findById(_id);
        
        if (!firm) {
            throw CustomException('Firm not found!', 404);
        }

        // Check if user is part of firm
        if (!firm.lawyers.includes(request.userID)) {
            throw CustomException('You are not authorized to update this firm!', 403);
        }

        const updatedFirm = await Firm.findByIdAndUpdate(
            _id,
            { $set: request.body },
            { new: true }
        );

        return response.status(202).send({
            error: false,
            message: 'Firm updated successfully!',
            firm: updatedFirm
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Add lawyer to firm
const addLawyer = async (request, response) => {
    const { firmId, lawyerId } = request.body;
    try {
        const firm = await Firm.findByIdAndUpdate(
            firmId,
            { $addToSet: { lawyers: lawyerId } },
            { new: true }
        );

        // Update lawyer profile with firm reference
        await User.findByIdAndUpdate(lawyerId, {
            'lawyerProfile.firmID': firmId
        });

        return response.status(202).send({
            error: false,
            message: 'Lawyer added to firm!',
            firm
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Remove lawyer from firm
const removeLawyer = async (request, response) => {
    const { firmId, lawyerId } = request.body;
    try {
        const firm = await Firm.findByIdAndUpdate(
            firmId,
            { $pull: { lawyers: lawyerId } },
            { new: true }
        );

        // Remove firm reference from lawyer profile
        await User.findByIdAndUpdate(lawyerId, {
            'lawyerProfile.firmID': null
        });

        return response.status(202).send({
            error: false,
            message: 'Lawyer removed from firm!',
            firm
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createFirm,
    getFirms,
    getFirm,
    updateFirm,
    addLawyer,
    removeLawyer
};
