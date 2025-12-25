/**
 * Audit Log Archive Model (Alias)
 *
 * This is an alias/re-export of the archivedAuditLog.model.js
 * for backward compatibility and naming consistency.
 *
 * The actual implementation is in archivedAuditLog.model.js
 */

const ArchivedAuditLog = require('./archivedAuditLog.model');

module.exports = ArchivedAuditLog;
