const mongoose = require('mongoose');

const legalDocumentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: false
    },
    category: {
        type: String,
        enum: ['labor', 'commercial', 'family', 'criminal', 'real-estate', 'corporate', 'immigration', 'tax', 'intellectual-property', 'general'],
        required: true
    },
    type: {
        type: String,
        enum: ['law', 'regulation', 'case', 'template', 'guide', 'article'],
        required: true
    },
    keywords: {
        type: [String],
        default: []
    },
    fileUrl: {
        type: String,
        required: false
    },
    author: {
        type: String,
        required: false
    },
    publicationDate: {
        type: Date,
        required: false
    },
    views: {
        type: Number,
        default: 0
    },
    downloads: {
        type: Number,
        default: 0
    },
    accessLevel: {
        type: String,
        enum: ['public', 'lawyers-only', 'admin-only'],
        default: 'public'
    }
}, {
    versionKey: false,
    timestamps: true
});

legalDocumentSchema.index({ title: 'text', summary: 'text', keywords: 1 });
legalDocumentSchema.index({ category: 1, type: 1 });

module.exports = mongoose.model('LegalDocument', legalDocumentSchema);
