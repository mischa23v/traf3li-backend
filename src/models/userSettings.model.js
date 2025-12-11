const mongoose = require('mongoose');

const userSettingsSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true
    },
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    account: {
        name: { type: String },
        email: { type: String },
        dob: { type: Date },
        language: { type: String, default: 'ar' },
        timezone: { type: String, default: 'Asia/Riyadh' }
    },
    appearance: {
        theme: {
            type: String,
            enum: ['light', 'dark', 'system'],
            default: 'system'
        },
        accentColor: { type: String, default: '#3B82F6' },
        fontSize: {
            type: String,
            enum: ['small', 'medium', 'large'],
            default: 'medium'
        },
        sidebarCollapsed: { type: Boolean, default: false }
    },
    display: {
        dateFormat: { type: String, default: 'DD/MM/YYYY' },
        timeFormat: {
            type: String,
            enum: ['12h', '24h'],
            default: '12h'
        },
        currency: { type: String, default: 'SAR' },
        startOfWeek: {
            type: String,
            enum: ['sunday', 'monday'],
            default: 'sunday'
        },
        compactMode: { type: Boolean, default: false }
    },
    notifications: {
        email: {
            enabled: { type: Boolean, default: true },
            newMessages: { type: Boolean, default: true },
            taskReminders: { type: Boolean, default: true },
            caseUpdates: { type: Boolean, default: true },
            financialAlerts: { type: Boolean, default: true }
        },
        push: {
            enabled: { type: Boolean, default: true },
            newMessages: { type: Boolean, default: true },
            taskReminders: { type: Boolean, default: true },
            caseUpdates: { type: Boolean, default: true }
        },
        inApp: {
            enabled: { type: Boolean, default: true },
            sound: { type: Boolean, default: true },
            desktop: { type: Boolean, default: false }
        }
    }
}, {
    versionKey: false,
    timestamps: true
});

// Get or create settings for a user
userSettingsSchema.statics.getOrCreate = async function(userId, firmId = null) {
    let settings = await this.findOne({ userId });
    if (!settings) {
        settings = await this.create({ userId, firmId });
    }
    return settings;
};

module.exports = mongoose.model('UserSettings', userSettingsSchema);
