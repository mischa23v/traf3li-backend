/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors and pass them to error middleware
 *
 * Usage:
 * const asyncHandler = require('../utils/asyncHandler');
 *
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json({ success: true, data: users });
 * }));
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
