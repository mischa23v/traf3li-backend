const { PaymentMode, User } = require('../models');
const { CustomException } = require('../utils');

// Create payment mode
const createPaymentMode = async (request, response) => {
    const { name, nameAr, description, descriptionAr, ref, icon, isEnabled, isDefault, gatewayProvider, gatewayConfig } = request.body;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can create payment modes!', 403);
        }

        const paymentMode = new PaymentMode({
            name,
            nameAr,
            description,
            descriptionAr,
            ref,
            icon: icon || 'credit-card',
            isEnabled: isEnabled !== undefined ? isEnabled : true,
            isDefault: isDefault || false,
            gatewayProvider: gatewayProvider || 'none',
            gatewayConfig: gatewayConfig || {},
            organizationId: user.organizationId,
            createdBy: request.userID
        });

        await paymentMode.save();

        return response.status(201).send({
            success: true,
            message: 'Payment mode created successfully!',
            data: { paymentMode }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get all payment modes
const getPaymentModes = async (request, response) => {
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

        const paymentModes = await PaymentMode.find(filters).sort({ isDefault: -1, name: 1 });

        return response.send({
            success: true,
            data: { paymentModes }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Get single payment mode
const getPaymentMode = async (request, response) => {
    const { _id } = request.params;

    try {
        const paymentMode = await PaymentMode.findById(_id);

        if (!paymentMode) {
            throw CustomException('Payment mode not found!', 404);
        }

        return response.send({
            success: true,
            data: { paymentMode }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Update payment mode
const updatePaymentMode = async (request, response) => {
    const { _id } = request.params;
    const updates = request.body;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can update payment modes!', 403);
        }

        const paymentMode = await PaymentMode.findById(_id);

        if (!paymentMode) {
            throw CustomException('Payment mode not found!', 404);
        }

        const updatedPaymentMode = await PaymentMode.findByIdAndUpdate(
            _id,
            { $set: updates },
            { new: true }
        );

        return response.send({
            success: true,
            message: 'Payment mode updated successfully!',
            data: { paymentMode: updatedPaymentMode }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Delete payment mode
const deletePaymentMode = async (request, response) => {
    const { _id } = request.params;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can delete payment modes!', 403);
        }

        const paymentMode = await PaymentMode.findById(_id);

        if (!paymentMode) {
            throw CustomException('Payment mode not found!', 404);
        }

        if (paymentMode.isDefault) {
            throw CustomException('Cannot delete the default payment mode!', 400);
        }

        await PaymentMode.findByIdAndDelete(_id);

        return response.send({
            success: true,
            message: 'Payment mode deleted successfully!'
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

// Set payment mode as default
const setDefaultPaymentMode = async (request, response) => {
    const { _id } = request.params;

    try {
        const user = await User.findById(request.userID);
        if (!user || (user.role !== 'lawyer' && user.role !== 'admin')) {
            throw CustomException('Only lawyers or admins can set default payment mode!', 403);
        }

        const paymentMode = await PaymentMode.findById(_id);

        if (!paymentMode) {
            throw CustomException('Payment mode not found!', 404);
        }

        paymentMode.isDefault = true;
        await paymentMode.save(); // Pre-save hook will unset other defaults

        return response.send({
            success: true,
            message: 'Payment mode set as default!',
            data: { paymentMode }
        });
    } catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        });
    }
};

module.exports = {
    createPaymentMode,
    getPaymentModes,
    getPaymentMode,
    updatePaymentMode,
    deletePaymentMode,
    setDefaultPaymentMode
};
