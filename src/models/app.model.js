const mongoose = require('mongoose');

const appSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    iconName: {
        type: String,
        required: true,
        trim: true
    },
    desc: {
        type: String,
        trim: true
    },
    descAr: {
        type: String,
        trim: true
    },
    category: {
        type: String,
        enum: ['communication', 'productivity', 'finance', 'storage', 'development', 'other'],
        default: 'other'
    },
    // OAuth/API configuration (admin-level)
    oauthConfig: {
        clientId: String,
        clientSecret: String,
        authUrl: String,
        tokenUrl: String,
        scopes: [String],
        redirectUri: String
    },
    apiConfig: {
        baseUrl: String,
        apiVersion: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    versionKey: false
});

// Index for faster queries
appSchema.index({ category: 1 });
appSchema.index({ isActive: 1 });
appSchema.index({ name: 'text' });

module.exports = mongoose.model('App', appSchema);
