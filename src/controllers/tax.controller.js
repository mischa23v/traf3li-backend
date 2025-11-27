const { Tax, User } = require('../models');
const { CustomException } = require('../utils');

// Create tax
const createTax = async (request, response) => {
    const { name, nameAr, value, description, descriptionAr, isEnabled, isDefault } = request.body;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can create taxes!', 403);
        }

        const tax = new Tax({
            name,
            nameAr,
            value,
            description,
            descriptionAr,
            isEnabled: isEnabled !== undefined ? isEnabled : true,
            isDefault: isDefault || false,
            organizationId: user.organizationId,
            createdBy: request.userID
        });

        await tax.save();

        return response.status(201).send({
            success: true,
            message: 'Tax created successfully!',
            data: { tax }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all taxes
const getTaxes = async (request, response) => {
    const { isEnabled } = request.query;

    try {
        const user = await User.findById(request.userID);

        const filters = {};
        if (user.organizationId) {
            filters.organizationId = user.organizationId;
        }
        if (isEnabled !== undefined) {
            filters.isEnabled = isEnabled === 'true';
        }

        const taxes = await Tax.find(filters).sort({ isDefault: -1, name: 1 });

        return response.send({
            success: true,
            data: { taxes }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single tax
const getTax = async (request, response) => {
    const { _id } = request.params;

    try {
        const tax = await Tax.findById(_id);

        if (!tax) {
            throw CustomException('Tax not found!', 404);
        }

        return response.send({
            success: true,
            data: { tax }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update tax
const updateTax = async (request, response) => {
    const { _id } = request.params;
    const updates = request.body;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can update taxes!', 403);
        }

        const tax = await Tax.findById(_id);

        if (!tax) {
            throw CustomException('Tax not found!', 404);
        }

        const updatedTax = await Tax.findByIdAndUpdate(
            _id,
            { $set: updates },
            { new: true }
        );

        return response.send({
            success: true,
            message: 'Tax updated successfully!',
            data: { tax: updatedTax }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete tax
const deleteTax = async (request, response) => {
    const { _id } = request.params;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can delete taxes!', 403);
        }

        const tax = await Tax.findById(_id);

        if (!tax) {
            throw CustomException('Tax not found!', 404);
        }

        if (tax.isDefault) {
            throw CustomException('Cannot delete the default tax!', 400);
        }

        await Tax.findByIdAndDelete(_id);

        return response.send({
            success: true,
            message: 'Tax deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Set tax as default
const setDefaultTax = async (request, response) => {
    const { _id } = request.params;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can set default tax!', 403);
        }

        const tax = await Tax.findById(_id);

        if (!tax) {
            throw CustomException('Tax not found!', 404);
        }

        tax.isDefault = true;
        await tax.save(); // Pre-save hook will unset other defaults

        return response.send({
            success: true,
            message: 'Tax set as default!',
            data: { tax }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createTax,
    getTaxes,
    getTax,
    updateTax,
    deleteTax,
    setDefaultTax
};
