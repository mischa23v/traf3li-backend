/**
 * Migration: Add KYC/AML Fields and Indexes
 *
 * This migration:
 * 1. Adds indexes for KYC fields to improve query performance
 * 2. Initializes KYC fields for existing users
 * 3. Sets up default values
 *
 * Run with: node src/migrations/add-kyc-fields.js
 */

const mongoose = require('mongoose');
const User = require('../models/user.model');
const logger = require('../utils/logger');

// Load environment variables
require('dotenv').config();

async function migrate() {
  try {
    logger.info('Starting KYC fields migration...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    logger.info('Connected to MongoDB');

    // Step 1: Create indexes for KYC fields
    logger.info('Step 1: Creating indexes...');
    await User.collection.createIndex({ kycStatus: 1 });
    await User.collection.createIndex({ kycVerifiedAt: 1 });
    await User.collection.createIndex({ kycExpiresAt: 1 });
    await User.collection.createIndex({ 'kycVerifiedIdentity.nationalId': 1 }, { sparse: true });
    await User.collection.createIndex({ 'kycVerifiedBusiness.crNumber': 1 }, { sparse: true });
    logger.info('Indexes created successfully');

    // Step 2: Count users that need migration
    const usersCount = await User.countDocuments({});
    logger.info(`Step 2: Found ${usersCount} users in database`);

    // Step 3: Initialize KYC fields for users that don't have them
    logger.info('Step 3: Initializing KYC fields for existing users...');

    const result = await User.updateMany(
      {
        $or: [
          { kycStatus: { $exists: false } },
          { kycStatus: null }
        ]
      },
      {
        $set: {
          kycStatus: null,
          kycVerifiedAt: null,
          kycExpiresAt: null,
          kycDocuments: [],
          kycRejectionReason: null,
          kycVerifiedIdentity: {},
          kycVerifiedBusiness: {},
          amlRiskScore: 0,
          amlScreening: {
            lastScreenedAt: null,
            status: null,
            flags: []
          },
          kycInitiatedAt: null,
          kycReviewedBy: null,
          kycReviewedAt: null,
          kycReviewNotes: null
        }
      }
    );

    logger.info(`Updated ${result.modifiedCount} users with KYC fields`);

    // Step 4: Get statistics
    logger.info('Step 4: Current KYC Statistics:');
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$kycStatus',
          count: { $sum: 1 }
        }
      }
    ]);

    logger.info('KYC Status Distribution:', { stats });
    stats.forEach(stat => {
      logger.info(`  ${stat._id || 'null'}: ${stat.count} users`);
    });

    logger.info('Migration completed successfully!');
    logger.info('Next steps:');
    logger.info('1. Update your routes/index.js to include KYC routes');
    logger.info('2. Configure Yakeen and Wathq API credentials in .env');
    logger.info('3. Apply requireKYC middleware to sensitive routes');
    logger.info('4. Test KYC verification flow');

  } catch (error) {
    logger.error('Migration failed', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
    process.exit(0);
  }
}

// Run migration
migrate();
