const mongoose = require('mongoose');

/**
 * Cursor-Based Pagination Utilities
 *
 * Implements Relay-style cursor pagination for better performance
 * with large datasets compared to offset/limit pagination.
 *
 * Benefits:
 * - Consistent results even when data changes between pages
 * - Better performance for deep pagination (no SKIP needed)
 * - Works well with real-time updates
 */

/**
 * Encode a cursor from document fields
 *
 * @param {Object} doc - Document to encode
 * @param {Array<String>} sortFields - Fields used for sorting
 * @returns {String} - Base64 encoded cursor
 */
function encodeCursor(doc, sortFields = ['_id']) {
    const cursorData = {};

    for (const field of sortFields) {
        const value = getNestedValue(doc, field);
        if (value !== undefined) {
            // Handle ObjectId
            if (value instanceof mongoose.Types.ObjectId) {
                cursorData[field] = { $oid: value.toString() };
            }
            // Handle Date
            else if (value instanceof Date) {
                cursorData[field] = { $date: value.toISOString() };
            }
            // Handle other values
            else {
                cursorData[field] = value;
            }
        }
    }

    // Always include _id for tie-breaking
    if (!cursorData._id && doc._id) {
        cursorData._id = { $oid: doc._id.toString() };
    }

    return Buffer.from(JSON.stringify(cursorData)).toString('base64url');
}

/**
 * Decode a cursor back to field values
 *
 * @param {String} cursor - Base64 encoded cursor
 * @returns {Object} - Decoded field values
 */
function decodeCursor(cursor) {
    if (!cursor) {
        return null;
    }

    try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));

        // Convert special types back
        for (const [key, value] of Object.entries(decoded)) {
            if (value && typeof value === 'object') {
                if (value.$oid) {
                    decoded[key] = new mongoose.Types.ObjectId(value.$oid);
                } else if (value.$date) {
                    decoded[key] = new Date(value.$date);
                }
            }
        }

        return decoded;
    } catch (error) {
        throw new Error('Invalid cursor format');
    }
}

/**
 * Build MongoDB query conditions for cursor-based pagination
 *
 * @param {String} cursor - Current cursor (after/before)
 * @param {Object} sort - Sort specification { field: 1 or -1 }
 * @param {String} direction - 'forward' or 'backward'
 * @returns {Object} - MongoDB query conditions
 */
function buildCursorQuery(cursor, sort = { _id: 1 }, direction = 'forward') {
    if (!cursor) {
        return {};
    }

    const cursorValues = decodeCursor(cursor);
    if (!cursorValues) {
        return {};
    }

    const sortFields = Object.keys(sort);
    const conditions = [];

    // Build compound cursor condition for multiple sort fields
    // For (a, b, c) sorted ascending, next page is:
    // (a > cursorA) OR (a = cursorA AND b > cursorB) OR (a = cursorA AND b = cursorB AND c > cursorC)

    for (let i = 0; i < sortFields.length; i++) {
        const condition = {};
        let isValid = true;

        // Add equality conditions for all previous fields
        for (let j = 0; j < i; j++) {
            const field = sortFields[j];
            if (cursorValues[field] === undefined) {
                isValid = false;
                break;
            }
            condition[field] = cursorValues[field];
        }

        if (!isValid) continue;

        // Add inequality condition for current field
        const field = sortFields[i];
        const sortDirection = sort[field];
        const cursorValue = cursorValues[field];

        if (cursorValue === undefined) continue;

        // Determine comparison operator based on sort and pagination direction
        let operator;
        if (direction === 'forward') {
            operator = sortDirection === 1 ? '$gt' : '$lt';
        } else {
            operator = sortDirection === 1 ? '$lt' : '$gt';
        }

        condition[field] = { [operator]: cursorValue };
        conditions.push(condition);
    }

    if (conditions.length === 0) {
        return {};
    }

    if (conditions.length === 1) {
        return conditions[0];
    }

    return { $or: conditions };
}

/**
 * Apply cursor pagination to a Mongoose query
 *
 * @param {Object} model - Mongoose model
 * @param {Object} baseQuery - Base query conditions
 * @param {Object} options - Pagination options
 * @param {Number} options.first - Number of items (forward pagination)
 * @param {Number} options.last - Number of items (backward pagination)
 * @param {String} options.after - Cursor for forward pagination
 * @param {String} options.before - Cursor for backward pagination
 * @param {Object} options.sort - Sort specification
 * @returns {Promise<Object>} - { edges, pageInfo, totalCount }
 */
async function paginateWithCursor(model, baseQuery = {}, options = {}) {
    const {
        first,
        last,
        after,
        before,
        sort = { _id: -1 }, // Default: newest first
        select,
        populate
    } = options;

    // Validate input
    if (first && last) {
        throw new Error('Cannot use both "first" and "last" parameters');
    }

    if (after && before) {
        throw new Error('Cannot use both "after" and "before" parameters');
    }

    // Determine pagination direction and limit
    const isForward = !!first || !!after || (!last && !before);
    const limit = first || last || 20;
    const cursor = isForward ? after : before;

    // Build cursor query
    const cursorQuery = buildCursorQuery(cursor, sort, isForward ? 'forward' : 'backward');

    // Combine with base query
    const fullQuery = {
        ...baseQuery,
        ...cursorQuery
    };

    // For backward pagination, reverse sort temporarily
    let querySort = { ...sort };
    if (!isForward) {
        for (const key of Object.keys(querySort)) {
            querySort[key] = querySort[key] * -1;
        }
    }

    // Fetch one extra to check for more pages
    let query = model.find(fullQuery)
        .sort(querySort)
        .limit(limit + 1);

    if (select) {
        query = query.select(select);
    }

    if (populate) {
        query = query.populate(populate);
    }

    const [docs, totalCount] = await Promise.all([
        query.lean(),
        model.countDocuments(baseQuery)
    ]);

    // Check if there are more items
    const hasMore = docs.length > limit;
    if (hasMore) {
        docs.pop(); // Remove the extra item
    }

    // Reverse results for backward pagination
    if (!isForward) {
        docs.reverse();
    }

    // Build edges with cursors
    const sortFields = Object.keys(sort);
    const edges = docs.map(doc => ({
        node: doc,
        cursor: encodeCursor(doc, sortFields)
    }));

    // Build page info
    const pageInfo = {
        hasNextPage: isForward ? hasMore : !!before,
        hasPreviousPage: isForward ? !!after : hasMore,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        totalCount
    };

    return {
        edges,
        pageInfo,
        totalCount
    };
}

/**
 * Helper to get nested object value
 * @private
 */
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Convert offset pagination to cursor
 * Useful for migrating from offset to cursor pagination
 *
 * @param {Object} model - Mongoose model
 * @param {Object} query - Query conditions
 * @param {Number} offset - Offset value
 * @param {Object} sort - Sort specification
 * @returns {Promise<String>} - Cursor at offset position
 */
async function offsetToCursor(model, query, offset, sort = { _id: -1 }) {
    if (offset <= 0) {
        return null;
    }

    const doc = await model.findOne(query)
        .sort(sort)
        .skip(offset - 1)
        .lean();

    if (!doc) {
        return null;
    }

    return encodeCursor(doc, Object.keys(sort));
}

/**
 * Middleware for Express to parse cursor pagination params
 *
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function cursorPaginationMiddleware(req, res, next) {
    const { first, last, after, before, sort, sortField, sortOrder } = req.query;

    req.pagination = {
        first: first ? parseInt(first, 10) : undefined,
        last: last ? parseInt(last, 10) : undefined,
        after: after || undefined,
        before: before || undefined,
        sort: sort ? JSON.parse(sort) : (sortField ? { [sortField]: sortOrder === 'asc' ? 1 : -1 } : undefined)
    };

    next();
}

/**
 * Format cursor pagination response for API
 *
 * @param {Object} result - Result from paginateWithCursor
 * @param {String} nodeType - Name of the node type for the response
 * @returns {Object} - Formatted API response
 */
function formatPaginationResponse(result, nodeType = 'items') {
    return {
        [nodeType]: result.edges.map(edge => edge.node),
        pageInfo: {
            hasNextPage: result.pageInfo.hasNextPage,
            hasPreviousPage: result.pageInfo.hasPreviousPage,
            startCursor: result.pageInfo.startCursor,
            endCursor: result.pageInfo.endCursor
        },
        totalCount: result.totalCount,
        edges: result.edges
    };
}

module.exports = {
    encodeCursor,
    decodeCursor,
    buildCursorQuery,
    paginateWithCursor,
    offsetToCursor,
    cursorPaginationMiddleware,
    formatPaginationResponse
};
