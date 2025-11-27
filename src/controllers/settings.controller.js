const { CompanySettings, FinanceSettings, User } = require('../models');
const { CustomException } = require('../utils');
const path = require('path');
const fs = require('fs');

// ============ COMPANY SETTINGS ============

// Get company settings
const getCompanySettings = async (request, response) => {
    try {
        const user = await User.findById(request.userID);

        if (!user.organizationId) {
            throw CustomException('Organization not found!', 404);
        }

        const settings = await CompanySettings.getOrCreate(user.organizationId);

        return response.send({
            success: true,
            data: { settings }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update company settings
const updateCompanySettings = async (request, response) => {
    const updates = request.body;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can update company settings!', 403);
        }

        if (!user.organizationId) {
            throw CustomException('Organization not found!', 404);
        }

        let settings = await CompanySettings.findOne({ organizationId: user.organizationId });

        if (!settings) {
            settings = new CompanySettings({
                organizationId: user.organizationId,
                ...updates
            });
            await settings.save();
        } else {
            settings = await CompanySettings.findOneAndUpdate(
                { organizationId: user.organizationId },
                { $set: updates },
                { new: true }
            );
        }

        return response.send({
            success: true,
            message: 'Company settings updated successfully!',
            data: { settings }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Upload company logo
const uploadCompanyLogo = async (request, response) => {
    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can upload company logo!', 403);
        }

        if (!request.file) {
            throw CustomException('No file uploaded!', 400);
        }

        const logoPath = `/uploads/company/${request.file.filename}`;

        const settings = await CompanySettings.findOneAndUpdate(
            { organizationId: user.organizationId },
            { $set: { logo: logoPath } },
            { new: true, upsert: true }
        );

        return response.send({
            success: true,
            message: 'Logo uploaded successfully!',
            data: { logo: logoPath, settings }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete company logo
const deleteCompanyLogo = async (request, response) => {
    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can delete company logo!', 403);
        }

        const settings = await CompanySettings.findOne({ organizationId: user.organizationId });

        if (settings && settings.logo) {
            // Delete file from filesystem
            const filePath = path.join(process.cwd(), settings.logo);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            settings.logo = null;
            await settings.save();
        }

        return response.send({
            success: true,
            message: 'Logo deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// ============ FINANCE SETTINGS ============

// Get finance settings
const getFinanceSettings = async (request, response) => {
    try {
        const user = await User.findById(request.userID);

        if (!user.organizationId) {
            throw CustomException('Organization not found!', 404);
        }

        const settings = await FinanceSettings.getOrCreate(user.organizationId);

        return response.send({
            success: true,
            data: { settings }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update finance settings
const updateFinanceSettings = async (request, response) => {
    const updates = request.body;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can update finance settings!', 403);
        }

        if (!user.organizationId) {
            throw CustomException('Organization not found!', 404);
        }

        let settings = await FinanceSettings.findOne({ organizationId: user.organizationId });

        if (!settings) {
            settings = new FinanceSettings({
                organizationId: user.organizationId,
                ...updates
            });
            await settings.save();
        } else {
            settings = await FinanceSettings.findOneAndUpdate(
                { organizationId: user.organizationId },
                { $set: updates },
                { new: true }
            );
        }

        return response.send({
            success: true,
            message: 'Finance settings updated successfully!',
            data: { settings }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get next document number
const getNextNumber = async (request, response) => {
    const { type } = request.body;

    try {
        const user = await User.findById(request.userID);

        if (!user.organizationId) {
            throw CustomException('Organization not found!', 404);
        }

        const settings = await FinanceSettings.getOrCreate(user.organizationId);

        let number;
        switch (type) {
            case 'invoice':
                number = await settings.getNextInvoiceNumber();
                break;
            case 'quote':
                number = await settings.getNextQuoteNumber();
                break;
            case 'payment':
                number = await settings.getNextPaymentNumber();
                break;
            default:
                throw CustomException('Invalid type! Must be invoice, quote, or payment.', 400);
        }

        return response.send({
            success: true,
            data: { number }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    // Company Settings
    getCompanySettings,
    updateCompanySettings,
    uploadCompanyLogo,
    deleteCompanyLogo,

    // Finance Settings
    getFinanceSettings,
    updateFinanceSettings,
    getNextNumber
};
