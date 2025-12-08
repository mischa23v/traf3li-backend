/**
 * Validators Index
 *
 * Export all validation middleware and schemas
 */

const authValidator = require('./auth.validator');

module.exports = {
    // Auth validation
    ...authValidator,

    // Re-export for convenience
    authValidator
};
