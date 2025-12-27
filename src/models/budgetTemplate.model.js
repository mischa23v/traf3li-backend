const mongoose = require('mongoose');

const budgetTemplateSchema = new mongoose.Schema({
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false
    },
    name: {
        type: String,
        required: true
    },
    nameAr: String,
    description: String,
    type: {
        type: String,
        enum: ['fixed', 'time_based', 'phased', 'contingency', 'hybrid'],
        required: true
    },
    phases: [{
        name: String,
        nameAr: String,
        budgetPercent: Number,
        order: Number
    }],
    categories: [{
        name: String,
        nameAr: String,
        code: String,
        budgetPercent: Number
    }],
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
budgetTemplateSchema.index({ lawyerId: 1, isActive: 1 });
budgetTemplateSchema.index({ lawyerId: 1, type: 1 });
budgetTemplateSchema.index({ firmId: 1, lawyerId: 1 });

// Pre-save hook to ensure only one default
budgetTemplateSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            { lawyerId: this.lawyerId, _id: { $ne: this._id } },
            { isDefault: false }
        );
    }
    next();
});

// Static method: Create budget from template
budgetTemplateSchema.statics.createBudgetFromTemplate = async function(templateId, budgetData) {
    const template = await this.findById(templateId);
    if (!template) throw new Error('Template not found');

    const MatterBudget = mongoose.model('MatterBudget');

    const phases = template.phases.map(phase => ({
        name: phase.name,
        budgetAmount: Math.round(budgetData.totalBudget * (phase.budgetPercent / 100))
    }));

    const categories = template.categories.map(cat => ({
        name: cat.name,
        code: cat.code,
        budgetAmount: Math.round(budgetData.totalBudget * (cat.budgetPercent / 100))
    }));

    return await MatterBudget.create({
        ...budgetData,
        type: template.type,
        phases,
        categories
    });
};

module.exports = mongoose.model('BudgetTemplate', budgetTemplateSchema);
