const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    avatar: {
        type: String,
        trim: true
    },
    role: {
        type: String,
        enum: ['lawyer', 'paralegal', 'secretary', 'accountant', 'admin', 'intern'],
        default: 'paralegal'
    },
    specialization: {
        type: String,
        enum: ['labor', 'commercial', 'civil', 'criminal', 'family', 'administrative', 'general'],
        default: 'general'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
staffSchema.index({ lawyerId: 1, status: 1 });
staffSchema.index({ lawyerId: 1, role: 1, status: 1 });
staffSchema.index({ lawyerId: 1, email: 1 }, { unique: true });

// Virtual for full name
staffSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
staffSchema.set('toJSON', { virtuals: true });
staffSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Staff', staffSchema);
