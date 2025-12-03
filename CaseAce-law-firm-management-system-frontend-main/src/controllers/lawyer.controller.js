const { User } = require('../models');
const { CustomException } = require('../utils');

// Get all lawyers
const getLawyers = async (request, response) => {
    try {
        const lawyers = await User.find({
            isSeller: true,
            role: 'lawyer'
        })
            .select('firstName lastName email phone image lawyerProfile role city createdAt')
            .sort({ firstName: 1 });

        return response.send({
            error: false,
            lawyers
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single lawyer by ID
const getLawyer = async (request, response) => {
    const { _id } = request.params;
    try {
        const lawyer = await User.findOne({
            _id,
            isSeller: true
        }).select('-password');

        if (!lawyer) {
            throw CustomException('Lawyer not found!', 404);
        }

        return response.send({
            error: false,
            lawyer
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get active team members for task assignment
const getTeamMembers = async (request, response) => {
    try {
        const lawyers = await User.find({
            isSeller: true,
            role: { $in: ['lawyer', 'admin'] }
        })
            .select('firstName lastName email role image lawyerProfile.specialization')
            .sort({ firstName: 1 });

        return response.send({
            error: false,
            lawyers
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    getLawyers,
    getLawyer,
    getTeamMembers
};
