const { createLoaders } = require('../services/dataLoader');
const logger = require('../utils/logger');

/**
 * DataLoader Middleware
 *
 * Attaches fresh DataLoader instances to each request for N+1 prevention.
 * Loaders are scoped to the request and automatically handle firm isolation.
 *
 * Usage:
 * ```javascript
 * // In route
 * app.use(dataLoaderMiddleware);
 *
 * // In controller
 * const clients = await req.loaders.client.loadMany(clientIds);
 * ```
 */

/**
 * Main middleware function
 * Creates fresh loaders for each request
 */
function dataLoaderMiddleware(req, res, next) {
    try {
        // Get firmId from request context
        // This should be set by auth middleware
        const firmId = req.firmId || req.firm?._id || req.user?.firmId || null;

        // Create loaders with firm isolation
        req.loaders = createLoaders(firmId);

        // Add helper method for easy population
        req.populateWith = createPopulateHelper(req.loaders);

        // Clean up loaders after response is sent
        res.on('finish', () => {
            cleanupLoaders(req.loaders);
        });

        next();
    } catch (error) {
        logger.error('Error in dataLoaderMiddleware:', error);
        next(error);
    }
}

/**
 * Create a helper function for easy relation population
 *
 * @param {Object} loaders - Loaders object
 * @returns {Function} - Population helper
 */
function createPopulateHelper(loaders) {
    /**
     * Populate a field on documents using DataLoader
     *
     * @param {Array|Object} docs - Document(s) to populate
     * @param {String} foreignKey - Field containing the foreign key
     * @param {String} loaderName - Name of loader to use (client, case, etc.)
     * @param {String} populateAs - Field name for populated data (default: foreignKey without 'Id')
     * @returns {Promise<Array|Object>} - Populated documents
     *
     * @example
     * const cases = await Case.find({});
     * await req.populateWith(cases, 'clientId', 'client');
     * // Now cases[0].client contains the full client document
     */
    return async function populateWith(docs, foreignKey, loaderName, populateAs) {
        const loader = loaders[loaderName];
        if (!loader) {
            throw new Error(`Unknown loader: ${loaderName}`);
        }

        // Determine target field name
        const targetField = populateAs || foreignKey.replace(/Id$/, '');

        // Handle single document
        if (!Array.isArray(docs)) {
            if (docs[foreignKey]) {
                docs[targetField] = await loader.load(docs[foreignKey]);
            }
            return docs;
        }

        // Handle array of documents
        if (docs.length === 0) {
            return docs;
        }

        // Get unique IDs
        const ids = [...new Set(
            docs
                .map(doc => doc[foreignKey])
                .filter(id => id !== null && id !== undefined)
                .map(id => String(id))
        )];

        if (ids.length === 0) {
            return docs;
        }

        // Load all related documents in batch
        const relatedDocs = await loader.loadMany(ids);

        // Create map
        const map = new Map();
        relatedDocs.forEach((doc, index) => {
            if (doc) {
                map.set(ids[index], doc);
            }
        });

        // Populate
        docs.forEach(doc => {
            const id = doc[foreignKey];
            if (id) {
                doc[targetField] = map.get(String(id)) || null;
            } else {
                doc[targetField] = null;
            }
        });

        return docs;
    };
}

/**
 * Clear all loader caches
 *
 * @param {Object} loaders - Loaders object
 */
function cleanupLoaders(loaders) {
    if (!loaders) return;

    Object.values(loaders).forEach(loader => {
        if (loader && typeof loader.clearAll === 'function') {
            loader.clearAll();
        }
    });
}

/**
 * Middleware to attach loaders with specific firm context
 * Use when firmId is determined differently
 *
 * @param {Function} getFirmId - Function to extract firmId: (req) => firmId
 * @returns {Function} - Middleware function
 */
function createDataLoaderMiddleware(getFirmId) {
    return function(req, res, next) {
        try {
            const firmId = typeof getFirmId === 'function'
                ? getFirmId(req)
                : getFirmId;

            req.loaders = createLoaders(firmId);
            req.populateWith = createPopulateHelper(req.loaders);

            res.on('finish', () => {
                cleanupLoaders(req.loaders);
            });

            next();
        } catch (error) {
            logger.error('Error in createDataLoaderMiddleware:', error);
            next(error);
        }
    };
}

/**
 * Express Router middleware for specific routes
 *
 * @param {Object} options - Options
 * @param {Function} options.getFirmId - Function to get firmId
 * @returns {Function} - Router middleware
 */
function dataLoaderRouter(options = {}) {
    const { getFirmId = (req) => req.firmId } = options;

    return function(req, res, next) {
        const firmId = getFirmId(req);
        req.loaders = createLoaders(firmId);
        req.populateWith = createPopulateHelper(req.loaders);

        // Cleanup on response
        const cleanup = () => {
            cleanupLoaders(req.loaders);
            res.removeListener('finish', cleanup);
            res.removeListener('close', cleanup);
        };

        res.on('finish', cleanup);
        res.on('close', cleanup);

        next();
    };
}

/**
 * Prime loaders with already-fetched data
 * Prevents redundant database calls
 *
 * @param {Object} loaders - Loaders object
 * @param {String} loaderName - Loader name
 * @param {Array|Object} docs - Documents to prime
 */
function primeLoaders(loaders, loaderName, docs) {
    const loader = loaders[loaderName];
    if (!loader) return;

    const docsArray = Array.isArray(docs) ? docs : [docs];

    docsArray.forEach(doc => {
        if (doc && doc._id) {
            loader.prime(doc._id, doc);
        }
    });
}

module.exports = dataLoaderMiddleware;
module.exports.createDataLoaderMiddleware = createDataLoaderMiddleware;
module.exports.dataLoaderRouter = dataLoaderRouter;
module.exports.primeLoaders = primeLoaders;
module.exports.cleanupLoaders = cleanupLoaders;
