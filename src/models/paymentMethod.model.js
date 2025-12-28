const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },,


    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    type: {
        type: String,
        enum: ['card', 'bank_account', 'wallet'],
        required: true
    },

    // Card details (masked)
    card: {
        brand: String, // visa, mastercard, amex
        last4: String,
        expMonth: Number,
        expYear: Number,
        country: String,
        funding: String // credit, debit, prepaid
    },

    // Bank account details (masked)
    bankAccount: {
        bankName: String,
        last4: String,
        accountType: String, // checking, savings
        country: String
    },

    // Billing address
    billingAddress: {
        name: String,
        line1: String,
        line2: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
    },

    isDefault: { type: Boolean, default: false, index: true },

    // Stripe
    stripePaymentMethodId: String,

    // Status
    status: {
        type: String,
        enum: ['active', 'expired', 'failed'],
        default: 'active'
    },

    // Audit
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true,
    versionKey: false
});

paymentMethodSchema.index({ firmId: 1, isDefault: 1 });

// Statics
paymentMethodSchema.statics.getByFirm = async function(firmId) {
    return this.find({ firmId })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();
};

paymentMethodSchema.statics.setDefault = async function(firmId, paymentMethodId) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Verify the payment method exists and belongs to the firm
        const paymentMethod = await this.findOne({
            _id: paymentMethodId,
            firmId
        }).session(session);

        if (!paymentMethod) {
            throw new Error('Payment method not found');
        }

        // Unset all other default payment methods for this firm
        await this.updateMany(
            { firmId, isDefault: true },
            { $set: { isDefault: false } },
            { session }
        );

        // Set the new default
        await this.updateOne(
            { _id: paymentMethodId },
            { $set: { isDefault: true } },
            { session }
        );

        await session.commitTransaction();

        // Return the updated payment method
        return this.findById(paymentMethodId).lean();
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
