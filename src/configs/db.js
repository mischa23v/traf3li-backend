const mongoose = require('mongoose');
const logger = require('../utils/contextLogger').child({ module: 'Database' });

mongoose.set('strictQuery', true);

// Slow query threshold in milliseconds
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS) || 100;

// ═══════════════════════════════════════════════════════════════
// AGGRESSIVE PERFORMANCE OPTIMIZATIONS
// ═══════════════════════════════════════════════════════════════

// Disable Mongoose buffering for faster startup - queries fail fast if not connected
mongoose.set('bufferCommands', false);

// Enable lean queries globally where possible
mongoose.set('toJSON', { virtuals: true, versionKey: false });
mongoose.set('toObject', { virtuals: true, versionKey: false });

// Enable debug mode for slow query logging in non-production or when explicitly enabled
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SLOW_QUERY_LOG === 'true') {
  mongoose.set('debug', (collectionName, method, query, doc, options) => {
    const queryStr = JSON.stringify(query).slice(0, 200);
    logger.debug('MongoDB query', { collection: collectionName, method, query: queryStr });
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
          logger.db.slowQuery(method, this.constructor.modelName, queryInfo, duration);
        }
      }
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// AGGRESSIVE CONNECTION WARMUP
// ═══════════════════════════════════════════════════════════════
// Pre-warm MongoDB connections to avoid cold start latency
const warmupConnections = async () => {
    const startTime = Date.now();
    logger.info('Warming up MongoDB connections');

    try {
        const db = mongoose.connection.db;

        // Run parallel warmup queries to prime all connection pool slots
        const warmupPromises = [
            // Warmup users collection (critical for auth)
            db.collection('users').findOne({}, { projection: { _id: 1 } }),
            // Warmup counters collection
            db.collection('counters').findOne({ _id: 'client' }, { projection: { _id: 1, seq: 1 } }),
            // Warmup reminders collection (cron jobs)
            db.collection('reminders').findOne({ status: 'pending' }, { projection: { _id: 1 } }),
            // Warmup clients collection
            db.collection('clients').findOne({}, { projection: { _id: 1 } }),
            // Run a ping to ensure connection is alive
            db.admin().ping()
        ];

        await Promise.all(warmupPromises);

        const duration = Date.now() - startTime;
        logger.info('Connection warmup completed', { durationMs: duration });
    } catch (err) {
        logger.warn('Warmup warning (non-fatal)', { error: err.message });
    }
};

// ✅ PERFORMANCE: MongoDB connection pooling and optimizations
const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            // ═══════════════════════════════════════════════════════════════
            // AGGRESSIVE CONNECTION POOL SETTINGS
            // ═══════════════════════════════════════════════════════════════
            maxPoolSize: 20,           // Increased from 10 - more concurrent queries
            minPoolSize: 5,            // Increased from 2 - keep more connections warm
            maxIdleTimeMS: 60000,      // Close idle connections after 60s
            serverSelectionTimeoutMS: 5000,  // Timeout after 5s instead of 30s
            socketTimeoutMS: 30000,    // Reduced from 45s - fail fast
            connectTimeoutMS: 10000,   // Connection timeout 10s
            heartbeatFrequencyMS: 10000,     // Check server health every 10s
            family: 4,                 // Use IPv4, skip trying IPv6
            // Aggressive read preferences for better performance
            readPreference: 'primaryPreferred',
            // Compression for faster data transfer
            compressors: ['zstd', 'snappy', 'zlib'],
            // Retryable writes/reads for reliability
            retryWrites: true,
            retryReads: true,
            // Write concern for performance (w:1 is faster than w:majority)
            w: 1
        });

        logger.info('Connected to MongoDB');

        // Immediately warm up connections
        await warmupConnections();

        // Clean up stale indexes that may cause duplicate key errors
        // This removes old indexes from previous schema versions
        try {
            const db = mongoose.connection.db;
            const clientCollection = db.collection('clients');

            // Get all indexes on the clients collection
            const indexes = await clientCollection.indexes();
            logger.debug('Current indexes on clients collection', {
                indexes: indexes.map(i => i.name)
            });

            // Drop stale 'clientId' index if it exists (from old schema)
            const staleIndexes = ['clientId_1', 'clientId'];
            for (const indexName of staleIndexes) {
                const hasIndex = indexes.some(i => i.name === indexName);
                if (hasIndex) {
                    logger.info('Dropping stale index', { indexName });
                    await clientCollection.dropIndex(indexName);
                    logger.info('Dropped stale index', { indexName });
                }
            }
        } catch (indexErr) {
            logger.warn('Index cleanup warning', { error: indexErr.message });
            // Non-fatal: continue with startup
        }

        // Initialize counters for atomic sequence generation
        // This ensures client numbers don't collide with existing data
        // Run in background to not block startup
        setImmediate(async () => {
            try {
                const Client = require('../models/client.model');
                await Client.initializeCounter();
                logger.info('Counters initialized');
            } catch (counterErr) {
                logger.warn('Counter initialization warning', { error: counterErr.message });
                // Non-fatal: counter will auto-initialize on first use
            }
        });

        // Monitor connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error', { error: err.message });
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected - Attempting to reconnect');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

    } catch (error) {
        logger.error('MongoDB connection failed', { error: error.message, stack: error.stack });
        throw error;
    }
};

module.exports = connect;
