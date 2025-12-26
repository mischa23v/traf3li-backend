/**
 * Firm Query Helper
 *
 * Use this helper in ALL controllers to ensure consistent firm isolation.
 * It automatically uses the correct filter (firmId or lawyerId) based on user context.
 *
 * Usage:
 *   const { firmQuery, addFirmContext } = require('../helpers/firmQuery.helper');
 *
 *   // In controller:
 *   const cases = await Case.find(firmQuery(req, { status: 'active' }));
 *   const newCase = await Case.create(addFirmContext(req, caseData));
 */

const mongoose = require('mongoose');

/**
 * Build a query with firm isolation
 *
 * @param {Object} req - Express request object (must have firmQuery set by middleware)
 * @param {Object} additionalQuery - Additional query conditions
 * @returns {Object} Query object with firm isolation
 * @throws {Error} If firm context is not set
 *
 * @example
 * // Get all active cases for the user's firm
 * const cases = await Case.find(firmQuery(req, { status: 'active' }));
 *
 * // Get a specific case (also validates firm access)
 * const case = await Case.findOne(firmQuery(req, { _id: caseId }));
 */
const firmQuery = (req, additionalQuery = {}) => {
    if (!req.firmQuery) {
        throw new Error(
            '[firmQuery] Firm context not set. ' +
            'Ensure globalFirmContext middleware is applied and user is authenticated.'
        );
    }

    return { ...req.firmQuery, ...additionalQuery };
};

/**
 * Add firm context to data for creating new records
 *
 * @param {Object} req - Express request object
 * @param {Object} data - Data to add firm context to
 * @returns {Object} Data with firmId or lawyerId added
 *
 * @example
 * // Create a new case with firm context
 * const newCase = await Case.create(addFirmContext(req, {
 *     title: 'New Case',
 *     status: 'open'
 * }));
 */
const addFirmContext = (req, data = {}) => {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    // Use the middleware's addFirmId helper if available
    if (req.addFirmId) {
        return req.addFirmId({ ...data });
    }

    // Fallback: manually add firm context
    if (req.firmId) {
        return { ...data, firmId: req.firmId };
    }

    if (req.isSoloLawyer && req.userID) {
        return { ...data, lawyerId: mongoose.Types.ObjectId.createFromHexString(req.userID.toString()) };
    }

    return data;
};

/**
 * Get firm query for departed users (restricted to their own items)
 *
 * @param {Object} req - Express request object
 * @param {Object} additionalQuery - Additional query conditions
 * @returns {Object} Restricted query for departed users
 *
 * @example
 * // Get cases accessible to departed user
 * const query = req.isDeparted ? departedQuery(req) : firmQuery(req);
 * const cases = await Case.find(query);
 */
const departedQuery = (req, additionalQuery = {}) => {
    if (!req.isDeparted) {
        return firmQuery(req, additionalQuery);
    }

    if (!req.departedQuery) {
        throw new Error(
            '[departedQuery] Departed context not set. ' +
            'Ensure user is properly marked as departed.'
        );
    }

    return { ...req.departedQuery, ...additionalQuery };
};

/**
 * Get the appropriate query based on user status
 * Automatically uses departedQuery for departed users
 *
 * @param {Object} req - Express request object
 * @param {Object} additionalQuery - Additional query conditions
 * @returns {Object} Appropriate query based on user status
 *
 * @example
 * // Automatically handles both normal and departed users
 * const cases = await Case.find(autoQuery(req, { status: 'active' }));
 */
const autoQuery = (req, additionalQuery = {}) => {
    if (req.isDeparted) {
        return departedQuery(req, additionalQuery);
    }
    return firmQuery(req, additionalQuery);
};

/**
 * Check if user can access a specific resource
 *
 * @param {Object} req - Express request object
 * @param {Object} resource - The resource to check access for
 * @param {string} firmIdField - The field name containing firmId (default: 'firmId')
 * @returns {boolean} True if user can access the resource
 *
 * @example
 * const case = await Case.findById(caseId);
 * if (!canAccessResource(req, case)) {
 *     return res.status(403).json({ error: 'Access denied' });
 * }
 */
const canAccessResource = (req, resource, firmIdField = 'firmId') => {
    if (!resource) return false;

    // Solo lawyer: check lawyerId
    if (req.isSoloLawyer) {
        const resourceLawyerId = resource.lawyerId?.toString();
        const userLawyerId = req.userID?.toString();
        return resourceLawyerId === userLawyerId;
    }

    // Firm member: check firmId
    if (req.firmId) {
        const resourceFirmId = resource[firmIdField]?.toString();
        const userFirmId = req.firmId?.toString();
        return resourceFirmId === userFirmId;
    }

    return false;
};

/**
 * Validate that a resource belongs to the user's firm before modification
 * Throws an error if access is denied
 *
 * @param {Object} req - Express request object
 * @param {Object} resource - The resource to validate
 * @param {string} resourceName - Name of the resource for error messages
 * @throws {Error} If access is denied
 *
 * @example
 * const case = await Case.findById(caseId);
 * validateAccess(req, case, 'Case'); // Throws if not accessible
 * // Safe to modify case here
 */
const validateAccess = (req, resource, resourceName = 'Resource') => {
    if (!resource) {
        const error = new Error(`${resourceName} not found`);
        error.status = 404;
        throw error;
    }

    if (!canAccessResource(req, resource)) {
        const error = new Error(`Access denied to ${resourceName}`);
        error.status = 403;
        throw error;
    }
};

/**
 * Build aggregation pipeline with firm isolation
 * Ensures firmId/lawyerId is in the first $match stage
 *
 * @param {Object} req - Express request object
 * @param {Array} pipeline - Aggregation pipeline stages
 * @returns {Array} Pipeline with firm isolation in first $match
 *
 * @example
 * const pipeline = firmAggregate(req, [
 *     { $match: { status: 'active' } },
 *     { $group: { _id: '$type', count: { $sum: 1 } } }
 * ]);
 * const results = await Case.aggregate(pipeline);
 */
const firmAggregate = (req, pipeline = []) => {
    if (!req.firmQuery) {
        throw new Error(
            '[firmAggregate] Firm context not set. ' +
            'Ensure globalFirmContext middleware is applied.'
        );
    }

    // If pipeline is empty, just add the firm match
    if (!pipeline.length) {
        return [{ $match: req.firmQuery }];
    }

    // If first stage is $match, merge with firm query
    if (pipeline[0].$match) {
        return [
            { $match: { ...req.firmQuery, ...pipeline[0].$match } },
            ...pipeline.slice(1)
        ];
    }

    // Otherwise, prepend firm match
    return [{ $match: req.firmQuery }, ...pipeline];
};

/**
 * Get firm ID or lawyer ID for the current user
 * Useful for logging and audit trails
 *
 * @param {Object} req - Express request object
 * @returns {Object} Object with firmId or lawyerId
 */
const getFirmContext = (req) => {
    if (req.isSoloLawyer) {
        return { lawyerId: req.userID, firmId: null, isSolo: true };
    }
    return { firmId: req.firmId, lawyerId: null, isSolo: false };
};

module.exports = {
    firmQuery,
    addFirmContext,
    departedQuery,
    autoQuery,
    canAccessResource,
    validateAccess,
    firmAggregate,
    getFirmContext
};
