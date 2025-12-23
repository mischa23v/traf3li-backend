/**
 * DataLoader Service - Batch and cache database queries
 *
 * Prevents N+1 query problems by batching multiple individual ID lookups
 * into single database queries and caching results within a request.
 *
 * Based on Facebook's DataLoader pattern but adapted for MongoDB/Mongoose.
 *
 * @example
 * // Without DataLoader (N+1 problem):
 * const cases = await Case.find({});
 * for (const c of cases) {
 *   c.client = await Client.findById(c.clientId); // N queries!
 * }
 *
 * // With DataLoader:
 * const cases = await Case.find({});
 * const clientIds = cases.map(c => c.clientId);
 * const clients = await req.loaders.client.loadMany(clientIds);
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Generic DataLoader class for batching and caching
 *
 * @template T - The type of entity being loaded
 */
class DataLoader {
    /**
     * @param {Function} batchLoadFn - Function that loads multiple items: (ids) => Promise<items[]>
     * @param {Object} options - Configuration options
     * @param {number} options.maxBatchSize - Maximum batch size (default: 100)
     * @param {boolean} options.cache - Enable caching (default: true)
     * @param {string} options.cacheKeyFn - Function to generate cache key from id
     */
    constructor(batchLoadFn, options = {}) {
        if (typeof batchLoadFn !== 'function') {
            throw new TypeError('DataLoader must be constructed with a batch loading function');
        }

        this._batchLoadFn = batchLoadFn;
        this._options = {
            maxBatchSize: options.maxBatchSize || 100,
            cache: options.cache !== false,
            cacheKeyFn: options.cacheKeyFn || ((key) => String(key))
        };

        // Cache: Map<cacheKey, Promise<value>>
        this._promiseCache = new Map();

        // Current batch queue
        this._queue = [];

        // Batch scheduling
        this._batchScheduled = false;
    }

    /**
     * Load a single item by ID
     *
     * @param {string|ObjectId} key - The ID to load
     * @returns {Promise<T>} The loaded item
     */
    load(key) {
        if (key === null || key === undefined) {
            return Promise.resolve(null);
        }

        const cacheKey = this._options.cacheKeyFn(key);

        // Check cache first
        if (this._options.cache) {
            const cachedPromise = this._promiseCache.get(cacheKey);
            if (cachedPromise) {
                return cachedPromise;
            }
        }

        // Create a promise that will be resolved when the batch loads
        const promise = new Promise((resolve, reject) => {
            this._queue.push({
                key,
                cacheKey,
                resolve,
                reject
            });
        });

        // Cache the promise
        if (this._options.cache) {
            this._promiseCache.set(cacheKey, promise);
        }

        // Schedule batch execution
        if (!this._batchScheduled) {
            this._batchScheduled = true;
            process.nextTick(() => this._dispatchBatch());
        }

        return promise;
    }

    /**
     * Load multiple items by IDs
     *
     * @param {Array<string|ObjectId>} keys - Array of IDs to load
     * @returns {Promise<Array<T>>} Array of loaded items in same order as keys
     */
    async loadMany(keys) {
        if (!Array.isArray(keys)) {
            throw new TypeError('loadMany must be called with an array of keys');
        }

        return Promise.all(keys.map(key => this.load(key)));
    }

    /**
     * Clear the cache
     */
    clearAll() {
        this._promiseCache.clear();
    }

    /**
     * Clear a specific item from cache
     *
     * @param {string|ObjectId} key - The ID to clear from cache
     */
    clear(key) {
        const cacheKey = this._options.cacheKeyFn(key);
        this._promiseCache.delete(cacheKey);
    }

    /**
     * Prime the cache with a known value
     * Useful when you already have the entity and want to prevent a future load
     *
     * @param {string|ObjectId} key - The ID
     * @param {T} value - The value to cache
     */
    prime(key, value) {
        const cacheKey = this._options.cacheKeyFn(key);
        this._promiseCache.set(cacheKey, Promise.resolve(value));
    }

    /**
     * Execute the batch load
     * @private
     */
    async _dispatchBatch() {
        this._batchScheduled = false;

        const queue = this._queue;
        this._queue = [];

        if (queue.length === 0) {
            return;
        }

        // Split into batches if needed
        const batches = [];
        for (let i = 0; i < queue.length; i += this._options.maxBatchSize) {
            batches.push(queue.slice(i, i + this._options.maxBatchSize));
        }

        // Process each batch
        for (const batch of batches) {
            const keys = batch.map(item => item.key);

            try {
                const values = await this._batchLoadFn(keys);

                if (!Array.isArray(values)) {
                    throw new TypeError('Batch load function must return an array');
                }

                if (values.length !== keys.length) {
                    throw new TypeError(
                        `Batch load function must return array of same length as keys. ` +
                        `Expected ${keys.length}, got ${values.length}`
                    );
                }

                // Resolve each promise with its corresponding value
                batch.forEach((item, index) => {
                    item.resolve(values[index]);
                });
            } catch (error) {
                // If batch fails, reject all promises in batch
                batch.forEach(item => {
                    item.reject(error);
                    // Remove from cache on error
                    if (this._options.cache) {
                        this._promiseCache.delete(item.cacheKey);
                    }
                });

                logger.error('DataLoader batch load error:', error);
            }
        }
    }
}

/**
 * Create a DataLoader for Client model
 *
 * @param {string|null} firmId - Filter by firmId for multi-tenancy
 * @returns {DataLoader}
 */
function createClientLoader(firmId = null) {
    return new DataLoader(async (ids) => {
        const Client = require('../models/client.model');

        const query = {
            _id: { $in: ids.map(id => mongoose.Types.ObjectId.createFromHexString(String(id))) }
        };

        // Apply firmId filter for multi-tenancy isolation
        if (firmId) {
            query.firmId = mongoose.Types.ObjectId.createFromHexString(String(firmId));
        }

        const clients = await Client.find(query).lean();

        // Create a map for O(1) lookup
        const clientMap = new Map();
        clients.forEach(client => {
            clientMap.set(String(client._id), client);
        });

        // Return in same order as input IDs, null for missing
        return ids.map(id => clientMap.get(String(id)) || null);
    });
}

/**
 * Create a DataLoader for User model (for lawyers/team members)
 *
 * @param {string|null} firmId - Filter by firmId for multi-tenancy
 * @returns {DataLoader}
 */
function createLawyerLoader(firmId = null) {
    return new DataLoader(async (ids) => {
        const User = require('../models/user.model');

        const query = {
            _id: { $in: ids.map(id => mongoose.Types.ObjectId.createFromHexString(String(id))) }
        };

        // Apply firmId filter for multi-tenancy isolation
        if (firmId) {
            query.firmId = mongoose.Types.ObjectId.createFromHexString(String(firmId));
        }

        const users = await User.find(query)
            .select('firstName lastName email role firmRole')
            .lean();

        const userMap = new Map();
        users.forEach(user => {
            userMap.set(String(user._id), user);
        });

        return ids.map(id => userMap.get(String(id)) || null);
    });
}

/**
 * Create a DataLoader for Case model
 *
 * @param {string|null} firmId - Filter by firmId for multi-tenancy
 * @returns {DataLoader}
 */
function createCaseLoader(firmId = null) {
    return new DataLoader(async (ids) => {
        const Case = require('../models/case.model');

        const query = {
            _id: { $in: ids.map(id => mongoose.Types.ObjectId.createFromHexString(String(id))) }
        };

        // Apply firmId filter for multi-tenancy isolation
        if (firmId) {
            query.firmId = mongoose.Types.ObjectId.createFromHexString(String(firmId));
        }

        const cases = await Case.find(query).lean();

        const caseMap = new Map();
        cases.forEach(caseDoc => {
            caseMap.set(String(caseDoc._id), caseDoc);
        });

        return ids.map(id => caseMap.get(String(id)) || null);
    });
}

/**
 * Create a DataLoader for Firm model
 * No firmId filtering needed as firms are top-level entities
 *
 * @returns {DataLoader}
 */
function createFirmLoader() {
    return new DataLoader(async (ids) => {
        const Firm = require('../models/firm.model');

        const firms = await Firm.find({
            _id: { $in: ids.map(id => mongoose.Types.ObjectId.createFromHexString(String(id))) }
        }).lean();

        const firmMap = new Map();
        firms.forEach(firm => {
            firmMap.set(String(firm._id), firm);
        });

        return ids.map(id => firmMap.get(String(id)) || null);
    });
}

/**
 * Create a DataLoader for Account model (Chart of Accounts)
 * Accounts are global (no firmId isolation)
 *
 * @returns {DataLoader}
 */
function createAccountLoader() {
    return new DataLoader(async (ids) => {
        const Account = require('../models/account.model');

        const accounts = await Account.find({
            _id: { $in: ids.map(id => mongoose.Types.ObjectId.createFromHexString(String(id))) }
        }).lean();

        const accountMap = new Map();
        accounts.forEach(account => {
            accountMap.set(String(account._id), account);
        });

        return ids.map(id => accountMap.get(String(id)) || null);
    });
}

/**
 * Create a DataLoader for Invoice model
 *
 * @param {string|null} firmId - Filter by firmId for multi-tenancy
 * @returns {DataLoader}
 */
function createInvoiceLoader(firmId = null) {
    return new DataLoader(async (ids) => {
        const Invoice = require('../models/invoice.model');

        const query = {
            _id: { $in: ids.map(id => mongoose.Types.ObjectId.createFromHexString(String(id))) }
        };

        if (firmId) {
            query.firmId = mongoose.Types.ObjectId.createFromHexString(String(firmId));
        }

        const invoices = await Invoice.find(query).lean();

        const invoiceMap = new Map();
        invoices.forEach(invoice => {
            invoiceMap.set(String(invoice._id), invoice);
        });

        return ids.map(id => invoiceMap.get(String(id)) || null);
    });
}

/**
 * Create a DataLoader for Payment model
 *
 * @param {string|null} firmId - Filter by firmId for multi-tenancy
 * @returns {DataLoader}
 */
function createPaymentLoader(firmId = null) {
    return new DataLoader(async (ids) => {
        const Payment = require('../models/payment.model');

        const query = {
            _id: { $in: ids.map(id => mongoose.Types.ObjectId.createFromHexString(String(id))) }
        };

        if (firmId) {
            query.firmId = mongoose.Types.ObjectId.createFromHexString(String(firmId));
        }

        const payments = await Payment.find(query).lean();

        const paymentMap = new Map();
        payments.forEach(payment => {
            paymentMap.set(String(payment._id), payment);
        });

        return ids.map(id => paymentMap.get(String(id)) || null);
    });
}

/**
 * Create all loaders for a request
 *
 * @param {string|null} firmId - The firm ID for multi-tenancy isolation
 * @returns {Object} Object containing all loaders
 */
function createLoaders(firmId = null) {
    return {
        client: createClientLoader(firmId),
        lawyer: createLawyerLoader(firmId),
        user: createLawyerLoader(firmId), // Alias for lawyer loader
        case: createCaseLoader(firmId),
        firm: createFirmLoader(), // No firmId filter for firms
        account: createAccountLoader(), // No firmId filter for accounts
        invoice: createInvoiceLoader(firmId),
        payment: createPaymentLoader(firmId)
    };
}

/**
 * Helper function to load a relation from a document
 *
 * @param {Object} doc - The source document
 * @param {string} field - The field name containing the foreign key
 * @param {DataLoader} loader - The DataLoader to use
 * @returns {Promise<Object|null>} The loaded related document
 *
 * @example
 * const case = await Case.findById(caseId);
 * case.client = await loadRelation(case, 'clientId', req.loaders.client);
 */
async function loadRelation(doc, field, loader) {
    if (!doc || !doc[field]) {
        return null;
    }
    return loader.load(doc[field]);
}

/**
 * Helper function to load multiple relations from an array of documents
 *
 * @param {Array<Object>} docs - Array of source documents
 * @param {string} field - The field name containing the foreign key
 * @param {DataLoader} loader - The DataLoader to use
 * @returns {Promise<Map>} Map of id -> loaded document
 *
 * @example
 * const cases = await Case.find({});
 * const clientMap = await loadRelations(cases, 'clientId', req.loaders.client);
 * cases.forEach(c => c.client = clientMap.get(String(c.clientId)));
 */
async function loadRelations(docs, field, loader) {
    if (!Array.isArray(docs) || docs.length === 0) {
        return new Map();
    }

    // Get unique IDs
    const ids = [...new Set(
        docs
            .map(doc => doc[field])
            .filter(id => id !== null && id !== undefined)
            .map(id => String(id))
    )];

    if (ids.length === 0) {
        return new Map();
    }

    // Load all related documents
    const relatedDocs = await loader.loadMany(ids);

    // Create map of id -> document
    const map = new Map();
    relatedDocs.forEach((doc, index) => {
        if (doc) {
            map.set(ids[index], doc);
        }
    });

    return map;
}

/**
 * Helper function to populate a field on an array of documents
 * Modifies documents in place
 *
 * @param {Array<Object>} docs - Array of documents to populate
 * @param {string} foreignKey - The field containing the foreign key ID
 * @param {string} populateAs - The field name to store the populated data
 * @param {DataLoader} loader - The DataLoader to use
 * @returns {Promise<Array>} The modified documents array
 *
 * @example
 * const cases = await Case.find({});
 * await populateField(cases, 'clientId', 'client', req.loaders.client);
 * // Now cases[0].client contains the full client document
 */
async function populateField(docs, foreignKey, populateAs, loader) {
    if (!Array.isArray(docs) || docs.length === 0) {
        return docs;
    }

    const relatedMap = await loadRelations(docs, foreignKey, loader);

    docs.forEach(doc => {
        const id = doc[foreignKey];
        if (id) {
            doc[populateAs] = relatedMap.get(String(id)) || null;
        } else {
            doc[populateAs] = null;
        }
    });

    return docs;
}

module.exports = {
    DataLoader,
    createLoaders,
    createClientLoader,
    createLawyerLoader,
    createCaseLoader,
    createFirmLoader,
    createAccountLoader,
    createInvoiceLoader,
    createPaymentLoader,
    loadRelation,
    loadRelations,
    populateField
};
