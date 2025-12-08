/**
 * Validators Index
 *
 * Export all validation middleware and schemas
 */

const authValidator = require('./auth.validator');
const clientValidator = require('./client.validator');
const invoiceValidator = require('./invoice.validator');
const paymentValidator = require('./payment.validator');

module.exports = {
    // Auth validation
    ...authValidator,

    // Client validation
    ...clientValidator,

    // Invoice validation
    ...invoiceValidator,

    // Payment validation
    ...paymentValidator,

    // Re-export for convenience
    authValidator,
    clientValidator,
    invoiceValidator,
    paymentValidator
};
