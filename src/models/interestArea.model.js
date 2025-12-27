const mongoose = require('mongoose');

const interestAreaSchema = new mongoose.Schema({
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', required: true, index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    description: String,
    descriptionAr: String,

    category: {
        type: String,
        enum: ['legal_service', 'practice_area', 'industry', 'topic', 'product', 'other'],
        default: 'practice_area'
    },

    // For hierarchy
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'InterestArea' },

    color: { type: String, default: '#3B82F6' },
    icon: { type: String },

    // Usage stats
    usageCount: { type: Number, default: 0 },

    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true, versionKey: false });

interestAreaSchema.index({ firmId: 1, status: 1 });
interestAreaSchema.index({ firmId: 1, category: 1 });
interestAreaSchema.index({ parentId: 1 });
interestAreaSchema.index({ name: 'text', nameAr: 'text' });

module.exports = mongoose.model('InterestArea', interestAreaSchema);
