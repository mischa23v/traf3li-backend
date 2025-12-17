const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS) || 100;

// Enable debug mode for slow query logging in non-production or when explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SLOW_QUERY_LOG === 'true') {
  mongoose.set('debug', (collectionName, method, query, doc, options) => {
    const start = Date.now();
    // Log after execution - Mongoose debug doesn't give us timing easily
    // so we just log the query details for manual analysis
    console.log(`[MongoDB] ${collectionName}.${method}`, JSON.stringify(query).slice(0, 200));
  });
}

// Profile slow queries using mongoose middleware
mongoose.plugin((schema) => {
  // Pre-hook to mark start time
  const methods = ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'aggregate', 'countDocuments'];

  methods.forEach(method => {
    schema.pre(method, function() {
      this._startTime = Date.now();
    });

    schema.post(method, function() {
      if (this._startTime) {
        const duration = Date.now() - this._startTime;
        if (duration > SLOW_QUERY_THRESHOLD_MS) {
          const queryInfo = this.getQuery ? JSON.stringify(this.getQuery()).slice(0, 300) : 'N/A';
          console.warn(`⚠️  [SLOW QUERY] ${method} took ${duration}ms - Query: ${queryInfo}`);
        }
      }
    });
  });
});

// ✅ PERFORMANCE: MongoDB connection pooling and optimizations
const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2,  // Minimum number of connections
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            family: 4 // Use IPv4, skip trying IPv6
        });

        console.log('✅ Connected to MongoDB');

        // Clean up stale indexes that may cause duplicate key errors
        // This removes old indexes from previous schema versions
        try {
            const db = mongoose.connection.db;
            const clientCollection = db.collection('clients');

            // Get all indexes on the clients collection
            const indexes = await clientCollection.indexes();
            console.log('📋 [DB] Current indexes on clients collection:', indexes.map(i => i.name));

            // Drop stale 'clientId' index if it exists (from old schema)
            const staleIndexes = ['clientId_1', 'clientId'];
            for (const indexName of staleIndexes) {
                const hasIndex = indexes.some(i => i.name === indexName);
                if (hasIndex) {
                    console.log(`🗑️  [DB] Dropping stale index: ${indexName}`);
                    await clientCollection.dropIndex(indexName);
                    console.log(`✅ [DB] Dropped stale index: ${indexName}`);
                }
            }
        } catch (indexErr) {
            console.warn('⚠️  Index cleanup warning:', indexErr.message);
            // Non-fatal: continue with startup
        }

        // Initialize counters for atomic sequence generation
        // This ensures client numbers don't collide with existing data
        try {
            const Client = require('../models/client.model');
            await Client.initializeCounter();
            console.log('✅ Counters initialized');
        } catch (counterErr) {
            console.warn('⚠️  Counter initialization warning:', counterErr.message);
            // Non-fatal: counter will auto-initialize on first use
        }

        // Monitor connection events
        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected');
        });

    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        throw error;
    }
};

module.exports = connect;
