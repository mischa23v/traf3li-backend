const mongoose = require('mongoose');

/**
 * Counter Model - Atomic Sequence Generator
 *
 * Used for generating unique sequential numbers (e.g., clientNumber, invoiceNumber)
 * in a race-condition-safe manner using MongoDB's findOneAndUpdate with $inc.
 *
 * Usage:
 *   const Counter = require('./counter.model');
 *   const nextClientNumber = await Counter.getNextSequence('client');
 *   // Returns: 1, 2, 3, etc.
 */
const counterSchema = new mongoose.Schema({
    // Unique identifier for the counter (e.g., 'client', 'invoice', 'case')
    _id: {
        type: String,
        required: true
    },
    // Current sequence value
    seq: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    versionKey: false
});

/**
 * Get the next sequence number atomically
 * @param {String} counterId - The counter identifier (e.g., 'client', 'invoice')
 * @returns {Promise<Number>} - The next sequence number
 */
counterSchema.statics.getNextSequence = async function(counterId) {
    const counter = await this.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        {
            new: true,      // Return the updated document
            upsert: true,   // Create if doesn't exist
            setDefaultsOnInsert: true
        }
    );
    return counter.seq;
};

/**
 * Get the next sequence number with a prefix
 * @param {String} counterId - The counter identifier
 * @param {String} prefix - Prefix for the sequence (e.g., 'CLT-')
 * @param {Number} padding - Number of digits to pad (default: 5)
 * @returns {Promise<String>} - Formatted sequence (e.g., 'CLT-00001')
 */
counterSchema.statics.getNextFormattedSequence = async function(counterId, prefix = '', padding = 5) {
    const seq = await this.getNextSequence(counterId);
    return `${prefix}${String(seq).padStart(padding, '0')}`;
};

/**
 * Initialize counter with a specific starting value
 * Useful for migrating existing data
 * @param {String} counterId - The counter identifier
 * @param {Number} startValue - Starting value for the sequence
 */
counterSchema.statics.initializeCounter = async function(counterId, startValue) {
    await this.findOneAndUpdate(
        { _id: counterId },
        { $set: { seq: startValue } },
        { upsert: true }
    );
};

/**
 * Get current value without incrementing
 * @param {String} counterId - The counter identifier
 * @returns {Promise<Number>} - Current sequence value
 */
counterSchema.statics.getCurrentValue = async function(counterId) {
    const counter = await this.findById(counterId);
    return counter ? counter.seq : 0;
};

module.exports = mongoose.model('Counter', counterSchema);
