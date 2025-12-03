const mongoose = require('mongoose');

const firmSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: false
    },
    address: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: false
    },
    country: {
        type: String,
        default: 'Saudi Arabia'
    },
    website: {
        type: String,
        required: false
    },
    logo: {
        type: String,
        required: false
    },
    practiceAreas: {
        type: [String],
        default: []
    },
    lawyers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    awards: {
        type: [String],
        default: []
    },
    verified: {
        type: Boolean,
        default: false
    }
}, {
    versionKey: false,
    timestamps: true
});

firmSchema.index({ name: 'text', city: 'text', practiceAreas: 'text' });

module.exports = mongoose.model('Firm', firmSchema);
