const mongoose = require('mongoose');

const supplierGroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    nameAr: {
        type: String,
        trim: true,
        maxlength: 200
    },
    parentGroup: {
        type: String,
        trim: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
supplierGroupSchema.index({ lawyerId: 1 });
supplierGroupSchema.index({ firmId: 1 });
supplierGroupSchema.index({ name: 'text', nameAr: 'text' });

module.exports = mongoose.model('SupplierGroup', supplierGroupSchema);
