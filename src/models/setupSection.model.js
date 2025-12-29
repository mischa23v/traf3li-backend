/**
 * Setup Section Model
 *
 * Defines the main sections of the app onboarding wizard.
 * Different from HR onboarding - this is for initial app setup.
 *
 * Features:
 * - Section categorization (company, team, modules, integrations, preferences)
 * - Ordering and active/inactive states
 * - Multilingual support (Arabic/English)
 * - Required vs optional sections
 */

const mongoose = require('mongoose');

const setupSectionSchema = new mongoose.Schema({
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
     },

    // For solo lawyers (no firm) - enables row-level security
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    sectionId: {
        type: String,
        required: true,
        unique: true,
        index: true
        // e.g., 'company', 'team', 'modules', 'integrations', 'preferences'
    },
    name: {
        type: String,
        required: true
    },
    nameAr: {
        type: String,
        required: false
    },
    description: {
        type: String,
        required: false
    },
    descriptionAr: {
        type: String,
        required: false
    },
    icon: {
        type: String,
        required: false
    },
    orderIndex: {
        type: Number,
        required: true,
        index: true
    },
    isRequired: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
});

// Index for efficient querying
setupSectionSchema.index({ isActive: 1, orderIndex: 1 });
setupSectionSchema.index({ firmId: 1, createdAt: -1 });

// Static methods
setupSectionSchema.statics.getActiveSections = async function() {
    return this.find({ isActive: true })
        .sort({ orderIndex: 1 })
        .lean();
};

setupSectionSchema.statics.getRequiredSections = async function() {
    return this.find({ isActive: true, isRequired: true })
        .sort({ orderIndex: 1 })
        .lean();
};

setupSectionSchema.statics.getSectionById = async function(sectionId) {
    return this.findOne({ sectionId, isActive: true }).lean();
};

// Instance methods
setupSectionSchema.methods.activate = async function() {
    this.isActive = true;
    return this.save();
};

setupSectionSchema.methods.deactivate = async function() {
    this.isActive = false;
    return this.save();
};

module.exports = mongoose.model('SetupSection', setupSectionSchema);
