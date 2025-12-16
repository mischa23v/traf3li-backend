/**
 * Skill Model
 *
 * Defines skills that can be assigned to employees.
 * Supports skill categorization and proficiency levels.
 *
 * Features:
 * - Skill categories
 * - Proficiency levels
 * - Skill verification
 * - Training linkage
 */

const mongoose = require('mongoose');
const Counter = require('./counter.model');

const skillSchema = new mongoose.Schema({
  // Unique identifier
  skillId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic info
  name: {
    type: String,
    required: [true, 'Skill name is required'],
    trim: true
  },
  nameAr: {
    type: String,
    trim: true
  },
  description: String,

  // Category
  category: {
    type: String,
    enum: [
      'technical',
      'legal',
      'language',
      'software',
      'management',
      'communication',
      'analytical',
      'interpersonal',
      'industry_specific',
      'certification',
      'other'
    ],
    required: true,
    index: true
  },
  subcategory: String,

  // Proficiency levels for this skill
  proficiencyLevels: [{
    level: { type: Number, required: true }, // 1-5
    name: { type: String, required: true },
    nameAr: String,
    description: String
  }],

  // Is this skill verifiable (certification, test, etc.)
  isVerifiable: {
    type: Boolean,
    default: false
  },
  verificationMethod: {
    type: String,
    enum: ['certification', 'test', 'assessment', 'portfolio', 'reference', 'none'],
    default: 'none'
  },

  // Related training
  relatedTrainings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TrainingProgram'
  }],

  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Firm reference (multi-tenant)
  firmId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Firm',
    required: true,
    index: true
  },

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound indexes
skillSchema.index({ firmId: 1, name: 1 }, { unique: true });
skillSchema.index({ firmId: 1, category: 1, isActive: 1 });

// Generate skill ID before saving
skillSchema.pre('save', async function(next) {
  if (this.isNew && !this.skillId) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { model: 'Skill', firmId: this.firmId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      this.skillId = `SK-${String(counter.seq).padStart(4, '0')}`;
    } catch (error) {
      return next(error);
    }
  }

  // Set default proficiency levels if not provided
  if (this.isNew && (!this.proficiencyLevels || this.proficiencyLevels.length === 0)) {
    this.proficiencyLevels = [
      { level: 1, name: 'Beginner', nameAr: 'مبتدئ', description: 'Basic understanding' },
      { level: 2, name: 'Elementary', nameAr: 'أساسي', description: 'Limited working proficiency' },
      { level: 3, name: 'Intermediate', nameAr: 'متوسط', description: 'Professional working proficiency' },
      { level: 4, name: 'Advanced', nameAr: 'متقدم', description: 'Full professional proficiency' },
      { level: 5, name: 'Expert', nameAr: 'خبير', description: 'Native/Bilingual proficiency' }
    ];
  }

  next();
});

// Statics
skillSchema.statics.getActiveSkills = function(firmId, category = null) {
  const query = { firmId, isActive: true };
  if (category) query.category = category;

  return this.find(query).sort({ category: 1, name: 1 });
};

skillSchema.statics.getByCategory = function(firmId) {
  return this.aggregate([
    { $match: { firmId: mongoose.Types.ObjectId(firmId), isActive: true } },
    {
      $group: {
        _id: '$category',
        skills: { $push: { _id: '$_id', name: '$name', nameAr: '$nameAr' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

skillSchema.statics.searchSkills = function(firmId, searchTerm) {
  return this.find({
    firmId,
    isActive: true,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { nameAr: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } }
    ]
  }).limit(20);
};

skillSchema.set('toJSON', { virtuals: true });
skillSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Skill', skillSchema);
