const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

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
