/**
 * Field Tracking Utility - Usage Examples
 *
 * This file demonstrates how to use the field tracking utility
 * for Odoo-style change tracking in the chatter/message system.
 */

const {
  trackChanges,
  getFieldDescription,
  formatValue,
  getTrackedFields,
  createTrackingMessage,
  setupModelTracking,
  TRACKED_MODELS
} = require('./fieldTracking');

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 1: Manual Field Tracking
// ═══════════════════════════════════════════════════════════════

async function manualTrackingExample() {
  // Simulate old and new document states
  const oldCase = {
    _id: '507f1f77bcf86cd799439011',
    status: 'draft',
    priority: 'medium',
    lawyerId: '507f1f77bcf86cd799439012',
    estimatedValue: 50000
  };

  const newCase = {
    _id: '507f1f77bcf86cd799439011',
    status: 'active',
    priority: 'high',
    lawyerId: '507f1f77bcf86cd799439013',
    estimatedValue: 75000
  };

  // Track specific fields
  const changes = trackChanges(oldCase, newCase, ['status', 'priority', 'lawyerId', 'estimatedValue']);

  console.log('Detected changes:', changes);
  // Output:
  // [
  //   {
  //     field: 'status',
  //     field_desc: 'Status',
  //     field_desc_ar: 'الحالة',
  //     field_type: 'selection',
  //     old_value: 'draft',
  //     new_value: 'active',
  //     old_value_char: 'draft',
  //     new_value_char: 'active'
  //   },
  //   ...
  // ]

  // Create a tracking message in the chatter
  const context = {
    userId: '507f1f77bcf86cd799439014',
    firmId: '507f1f77bcf86cd799439015'
  };

  const message = await createTrackingMessage(
    changes,
    'Case',
    newCase._id,
    context
  );

  console.log('Created tracking message:', message);
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 2: Track All Fields
// ═══════════════════════════════════════════════════════════════

async function trackAllFieldsExample() {
  const oldInvoice = {
    _id: '507f1f77bcf86cd799439011',
    status: 'draft',
    amount: 10000,
    dueDate: new Date('2025-01-15'),
    paid: false
  };

  const newInvoice = {
    _id: '507f1f77bcf86cd799439011',
    status: 'posted',
    amount: 10000,
    dueDate: new Date('2025-01-20'),
    paid: false
  };

  // Track all changed fields
  const changes = trackChanges(oldInvoice, newInvoice, 'all');

  console.log('All detected changes:', changes);
  // Only status and dueDate will be in the changes array
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 3: Using Mongoose Plugin for Automatic Tracking
// ═══════════════════════════════════════════════════════════════

const mongoose = require('mongoose');

// Define your schema
const caseSchema = new mongoose.Schema({
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' },
  status: { type: String, enum: ['draft', 'active', 'closed'] },
  priority: { type: String, enum: ['low', 'medium', 'high'] },
  lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: String,
  title: String,
  estimatedValue: Number,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Add the field tracking plugin
caseSchema.plugin(setupModelTracking, {
  modelName: 'Case',
  // Optional: specify which fields to track
  // trackedFields: ['status', 'priority', 'lawyerId'],
  enabled: true
});

// Now changes will be automatically tracked when you save
async function automaticTrackingExample() {
  const Case = mongoose.model('Case', caseSchema);

  // Fetch a case
  const caseDoc = await Case.findById('507f1f77bcf86cd799439011');

  // Update fields
  caseDoc.status = 'active';
  caseDoc.priority = 'high';
  caseDoc.updatedBy = '507f1f77bcf86cd799439014';

  // Save - tracking happens automatically!
  await caseDoc.save();
  // A tracking message will be created in the chatter automatically
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 4: Format Values
// ═══════════════════════════════════════════════════════════════

function formatValueExample() {
  // Format different types of values
  console.log('Monetary:', formatValue(50000, 'monetary')); // "50000.00 SAR"
  console.log('Boolean:', formatValue(true, 'boolean')); // "Yes"
  console.log('Date:', formatValue(new Date(), 'datetime')); // ISO string
  console.log('Integer:', formatValue(42, 'integer')); // "42"
  console.log('Float:', formatValue(3.14159, 'float')); // "3.14"

  // Format ObjectId reference
  const userRef = {
    _id: '507f1f77bcf86cd799439011',
    firstName: 'Ahmed',
    lastName: 'Al-Rashid'
  };
  console.log('User:', formatValue(userRef, 'many2one')); // "Ahmed Al-Rashid"
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 5: Get Field Descriptions
// ═══════════════════════════════════════════════════════════════

function fieldDescriptionExample() {
  // Get bilingual field labels
  const statusLabel = getFieldDescription('Case', 'status');
  console.log('Status label:', statusLabel); // { en: 'Status', ar: 'الحالة' }

  const priorityLabel = getFieldDescription('Case', 'priority');
  console.log('Priority label:', priorityLabel); // { en: 'Priority', ar: 'الأولوية' }

  // For unknown fields, returns humanized field name
  const unknownLabel = getFieldDescription('Case', 'someNewField');
  console.log('Unknown label:', unknownLabel); // { en: 'Some New Field', ar: 'Some New Field' }
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 6: Get Tracked Fields for a Model
// ═══════════════════════════════════════════════════════════════

function trackedFieldsExample() {
  // Get all tracked fields for Case model
  const caseFields = getTrackedFields('Case');
  console.log('Tracked fields for Case:', caseFields);
  // Returns array of field configurations with name, type, and labels

  // Get all tracked fields for Invoice model
  const invoiceFields = getTrackedFields('Invoice');
  console.log('Tracked fields for Invoice:', invoiceFields);

  // Check all available models
  console.log('All tracked models:', Object.keys(TRACKED_MODELS));
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 7: Integration in Controller/Service
// ═══════════════════════════════════════════════════════════════

async function controllerIntegrationExample(req, res) {
  const { caseId } = req.params;
  const updates = req.body;

  // Fetch the existing case
  const Case = require('../models/case.model');
  const oldCase = await Case.findById(caseId);

  if (!oldCase) {
    return res.status(404).json({ error: 'Case not found' });
  }

  // Apply updates
  Object.assign(oldCase, updates);

  // Track changes before saving
  const changes = trackChanges(
    oldCase._doc, // Original document
    { ...oldCase._doc, ...updates }, // Updated document
    ['status', 'priority', 'lawyerId', 'category']
  );

  // Save the case
  await oldCase.save();

  // Create tracking message if there are changes
  if (changes.length > 0) {
    const context = {
      userId: req.userID,
      firmId: req.firmId
    };

    await createTrackingMessage(changes, 'Case', caseId, context);
  }

  return res.json({
    success: true,
    data: oldCase,
    changes: changes
  });
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 8: Custom Field Configuration
// ═══════════════════════════════════════════════════════════════

// You can extend TRACKED_MODELS for custom models
function addCustomModelTracking() {
  const { TRACKED_MODELS } = require('./fieldTracking');

  // Add tracking for a custom model
  TRACKED_MODELS.CustomModel = [
    { name: 'customField', type: 'char', label: { en: 'Custom Field', ar: 'حقل مخصص' } },
    { name: 'customDate', type: 'datetime', label: { en: 'Custom Date', ar: 'تاريخ مخصص' } }
  ];

  // Now you can track changes on CustomModel
  const changes = trackChanges(oldDoc, newDoc, ['customField', 'customDate']);
}

// ═══════════════════════════════════════════════════════════════
// EXAMPLE 9: Mongoose Pre-save Hook (Alternative to Plugin)
// ═══════════════════════════════════════════════════════════════

function manualHookExample() {
  const mongoose = require('mongoose');

  const invoiceSchema = new mongoose.Schema({
    status: String,
    amount: Number,
    dueDate: Date,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' }
  }, { timestamps: true });

  // Manual tracking with pre/post hooks
  invoiceSchema.pre('save', async function(next) {
    if (this.isNew) {
      return next();
    }

    // Fetch original document
    const original = await this.constructor.findById(this._id);
    this._original = original;
    next();
  });

  invoiceSchema.post('save', async function(doc) {
    if (!doc._original) return;

    const { trackChanges, createTrackingMessage } = require('./fieldTracking');

    const changes = trackChanges(doc._original, doc, ['status', 'amount', 'dueDate']);

    if (changes.length > 0) {
      await createTrackingMessage(changes, 'Invoice', doc._id, {
        userId: doc.updatedBy,
        firmId: doc.firmId
      });
    }

    delete doc._original;
  });

  return mongoose.model('Invoice', invoiceSchema);
}

// ═══════════════════════════════════════════════════════════════
// Run examples (uncomment to test)
// ═══════════════════════════════════════════════════════════════

// manualTrackingExample();
// trackAllFieldsExample();
// formatValueExample();
// fieldDescriptionExample();
// trackedFieldsExample();

module.exports = {
  manualTrackingExample,
  trackAllFieldsExample,
  automaticTrackingExample,
  formatValueExample,
  fieldDescriptionExample,
  trackedFieldsExample,
  controllerIntegrationExample,
  addCustomModelTracking,
  manualHookExample
};
