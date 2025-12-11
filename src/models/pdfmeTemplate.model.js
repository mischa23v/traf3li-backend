/**
 * PDFMe Template Model
 *
 * Stores JSON-based templates for PDFMe PDF generation.
 * Templates contain a basePdf (fixed content) and schemas (variable fields).
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ============ SCHEMA FIELD DEFINITION ============
const SchemaFieldSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'image', 'qrcode', 'barcode', 'line', 'rectangle', 'ellipse', 'svg', 'table', 'multiVariableText'],
        required: true
    },
    position: {
        x: { type: Number, required: true },
        y: { type: Number, required: true }
    },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    // Text-specific options
    fontSize: { type: Number, default: 12 },
    fontName: { type: String, default: 'Helvetica' },
    fontColor: { type: String, default: '#000000' },
    alignment: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    verticalAlignment: { type: String, enum: ['top', 'middle', 'bottom'], default: 'top' },
    lineHeight: { type: Number, default: 1.2 },
    characterSpacing: { type: Number, default: 0 },
    // Background
    backgroundColor: { type: String },
    // Border
    borderColor: { type: String },
    borderWidth: { type: Number },
    // Barcode/QR specific
    barcodeFormat: { type: String },
    // Image specific
    objectFit: { type: String, enum: ['contain', 'cover', 'fill'], default: 'contain' },
    // Table specific
    tableStyles: { type: Schema.Types.Mixed },
    // Rotation
    rotate: { type: Number, default: 0 },
    // Read-only (static value)
    readOnly: { type: Boolean, default: false },
    // Default value for the field
    defaultValue: { type: String }
}, { _id: false });

// ============ MAIN PDFME TEMPLATE SCHEMA ============
const pdfmeTemplateSchema = new Schema({
    // Multi-tenancy
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Template identification
    name: {
        type: String,
        required: true,
        trim: true
    },
    nameAr: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    descriptionAr: {
        type: String,
        trim: true
    },

    // Template categorization
    category: {
        type: String,
        enum: ['invoice', 'contract', 'receipt', 'report', 'statement', 'letter', 'certificate', 'custom'],
        default: 'custom',
        index: true
    },
    type: {
        type: String,
        enum: ['standard', 'detailed', 'summary', 'minimal', 'custom'],
        default: 'standard'
    },

    // Template flags
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isSystem: {
        type: Boolean,
        default: false
    },

    // PDFMe template structure
    basePdf: {
        // Can be 'BLANK_PDF' for A4 blank or base64 encoded PDF
        type: String,
        default: 'BLANK_PDF'
    },

    // Page configuration
    pageSize: {
        width: { type: Number, default: 210 }, // A4 width in mm
        height: { type: Number, default: 297 } // A4 height in mm
    },
    pageOrientation: {
        type: String,
        enum: ['portrait', 'landscape'],
        default: 'portrait'
    },

    // Template schemas (variable fields) - Array of pages
    schemas: [[SchemaFieldSchema]],

    // Font configuration
    fonts: [{
        name: { type: String, required: true },
        data: { type: String }, // Base64 encoded font data or URL
        fallback: { type: Boolean, default: false },
        subset: { type: Boolean, default: true }
    }],

    // Default fonts to use
    defaultFont: {
        type: String,
        default: 'Helvetica'
    },

    // Styling presets
    styling: {
        primaryColor: { type: String, default: '#1E40AF' },
        secondaryColor: { type: String, default: '#3B82F6' },
        textColor: { type: String, default: '#1F2937' },
        backgroundColor: { type: String, default: '#FFFFFF' },
        headerFontSize: { type: Number, default: 18 },
        bodyFontSize: { type: Number, default: 10 },
        tableFontSize: { type: Number, default: 9 }
    },

    // Language/RTL support
    language: {
        type: String,
        enum: ['en', 'ar', 'both'],
        default: 'en'
    },
    isRTL: {
        type: Boolean,
        default: false
    },

    // Sample data for preview
    sampleInputs: {
        type: Schema.Types.Mixed,
        default: {}
    },

    // Version tracking
    version: {
        type: Number,
        default: 1
    },

    // Thumbnail/preview
    thumbnail: {
        type: String // Base64 or S3 URL
    },

    // Usage tracking
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsedAt: {
        type: Date
    },

    // Creator
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true,
    versionKey: false
});

// ============ INDEXES ============
pdfmeTemplateSchema.index({ lawyerId: 1, category: 1, isActive: 1 });
pdfmeTemplateSchema.index({ lawyerId: 1, isDefault: 1, category: 1 });
pdfmeTemplateSchema.index({ firmId: 1, category: 1, isActive: 1 });
pdfmeTemplateSchema.index({ name: 'text', description: 'text' });

// ============ PRE-SAVE HOOK ============
// Ensure only one default per category per lawyer
pdfmeTemplateSchema.pre('save', async function(next) {
    if (this.isDefault && this.isModified('isDefault')) {
        await this.constructor.updateMany(
            {
                lawyerId: this.lawyerId,
                category: this.category,
                _id: { $ne: this._id }
            },
            { isDefault: false }
        );
    }
    next();
});

// ============ STATIC METHODS ============

/**
 * Get default template for a category
 */
pdfmeTemplateSchema.statics.getDefault = async function(lawyerId, category) {
    return await this.findOne({
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        category,
        isDefault: true,
        isActive: true
    });
};

/**
 * Get all templates for a lawyer by category
 */
pdfmeTemplateSchema.statics.getByCategory = async function(lawyerId, category, options = {}) {
    const query = {
        lawyerId: new mongoose.Types.ObjectId(lawyerId),
        category,
        isActive: true
    };

    const { limit = 50, skip = 0, sort = { createdAt: -1 } } = options;

    return await this.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-schemas -basePdf -fonts'); // Exclude heavy fields for listing
};

/**
 * Get template for PDFMe generation (with full data)
 */
pdfmeTemplateSchema.statics.getForGeneration = async function(templateId) {
    const template = await this.findById(templateId);
    if (!template) {
        throw new Error('Template not found');
    }

    // Increment usage count
    await this.findByIdAndUpdate(templateId, {
        $inc: { usageCount: 1 },
        lastUsedAt: new Date()
    });

    return template;
};

/**
 * Convert to PDFMe format
 */
pdfmeTemplateSchema.methods.toPdfmeFormat = function() {
    return {
        basePdf: this.basePdf,
        schemas: this.schemas,
        ...(this.fonts && this.fonts.length > 0 && {
            options: {
                font: this.fonts.reduce((acc, font) => {
                    acc[font.name] = {
                        data: font.data,
                        fallback: font.fallback,
                        subset: font.subset
                    };
                    return acc;
                }, {})
            }
        })
    };
};

/**
 * Clone template
 */
pdfmeTemplateSchema.methods.clone = async function(newName, lawyerId) {
    const clonedData = this.toObject();
    delete clonedData._id;
    delete clonedData.createdAt;
    delete clonedData.updatedAt;

    clonedData.name = newName || `${this.name} (Copy)`;
    clonedData.nameAr = this.nameAr ? `${this.nameAr} (نسخة)` : undefined;
    clonedData.lawyerId = lawyerId || this.lawyerId;
    clonedData.isDefault = false;
    clonedData.isSystem = false;
    clonedData.usageCount = 0;
    clonedData.version = 1;

    const PdfmeTemplate = mongoose.model('PdfmeTemplate');
    return await PdfmeTemplate.create(clonedData);
};

module.exports = mongoose.model('PdfmeTemplate', pdfmeTemplateSchema);
