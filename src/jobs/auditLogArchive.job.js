/**
 * Audit Log Archive Job (Alias)
 *
 * This is an alias/re-export of the auditLogArchiving.job.js
 * for backward compatibility and naming consistency.
 *
 * The actual implementation is in auditLogArchiving.job.js
 *
 * This job handles:
 * - Archiving logs older than 90 days
 * - Maintaining hash chain across archives
 * - Cleaning up old archives per retention policy (7 years for PDPL compliance)
 */

const runAuditLogArchiving = require('./auditLogArchiving.job');

module.exports = runAuditLogArchiving;
