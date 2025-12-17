/**
 * Audit Log Integrity Service
 *
 * NCA ECC-2:2024 Compliance: Section 2-12 (Logging & Monitoring)
 * Implements hash chain for audit log integrity verification.
 *
 * Features:
 * - SHA-256 hash chain linking each log to the previous
 * - HMAC digital signatures for tamper detection
 * - Verification functions to validate log integrity
 * - Batch verification for compliance audits
 */

const crypto = require('crypto');
const AuditLog = require('../models/auditLog.model');

// Secret key for HMAC signatures (should be in env)
const AUDIT_SECRET = process.env.AUDIT_INTEGRITY_SECRET || process.env.JWT_SECRET;

/**
 * Generate SHA-256 hash of data
 * @param {string} data - Data to hash
 * @returns {string} - Hex encoded hash
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate HMAC signature
 * @param {string} data - Data to sign
 * @returns {string} - Hex encoded signature
 */
function hmacSign(data) {
  return crypto.createHmac('sha256', AUDIT_SECRET).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @returns {boolean} - Whether signature is valid
 */
function verifySignature(data, signature) {
  const expectedSignature = hmacSign(data);
  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    return false;
  }
}

/**
 * Get the last audit log for hash chain
 * @param {string} firmId - Optional firm ID for scoping
 * @returns {Object|null} - Last audit log with hash
 */
async function getLastAuditLog(firmId = null) {
  const query = firmId ? { firmId, 'integrity.hash': { $exists: true } } : { 'integrity.hash': { $exists: true } };

  return AuditLog.findOne(query)
    .sort({ timestamp: -1 })
    .select('integrity')
    .lean();
}

/**
 * Generate integrity data for a new audit log
 * @param {Object} logData - Audit log data
 * @param {string} firmId - Firm ID for hash chain scoping
 * @returns {Object} - Integrity data (previousHash, hash, signature)
 */
async function generateIntegrity(logData, firmId = null) {
  // Get previous log's hash
  const previousLog = await getLastAuditLog(firmId);
  const previousHash = previousLog?.integrity?.hash || '0'.repeat(64);

  // Create canonical representation of log data for hashing
  const canonicalData = JSON.stringify({
    action: logData.action,
    userId: logData.userId?.toString(),
    entityType: logData.entityType || logData.resourceType,
    entityId: logData.entityId?.toString() || logData.resourceId?.toString(),
    timestamp: logData.timestamp || new Date().toISOString(),
    previousHash,
  });

  // Generate hash
  const hash = sha256(canonicalData);

  // Generate signature
  const signature = hmacSign(hash);

  return {
    previousHash,
    hash,
    signature,
    algorithm: 'sha256',
    version: '1.0',
  };
}

/**
 * Enhanced log function that includes integrity data
 * @param {Object} logData - Audit log data
 * @returns {Object} - Created audit log with integrity
 */
async function logWithIntegrity(logData) {
  try {
    // Generate integrity data
    const integrity = await generateIntegrity(logData, logData.firmId);

    // Add integrity to log data
    logData.integrity = integrity;

    // Create the log
    const log = await AuditLog.log(logData);
    return log;
  } catch (error) {
    console.error('Audit integrity log error:', error.message);
    // Fall back to regular logging if integrity fails
    return AuditLog.log(logData);
  }
}

/**
 * Verify integrity of a single audit log
 * @param {Object} log - Audit log to verify
 * @returns {Object} - Verification result
 */
function verifyLogIntegrity(log) {
  if (!log.integrity) {
    return {
      valid: false,
      reason: 'no_integrity_data',
    };
  }

  const { hash, signature, previousHash } = log.integrity;

  // Recreate canonical data
  const canonicalData = JSON.stringify({
    action: log.action,
    userId: log.userId?.toString(),
    entityType: log.entityType || log.resourceType,
    entityId: log.entityId?.toString() || log.resourceId?.toString(),
    timestamp: log.timestamp?.toISOString ? log.timestamp.toISOString() : log.timestamp,
    previousHash,
  });

  // Verify hash
  const expectedHash = sha256(canonicalData);
  if (hash !== expectedHash) {
    return {
      valid: false,
      reason: 'hash_mismatch',
      expected: expectedHash,
      actual: hash,
    };
  }

  // Verify signature
  if (!verifySignature(hash, signature)) {
    return {
      valid: false,
      reason: 'signature_invalid',
    };
  }

  return {
    valid: true,
    reason: 'verified',
  };
}

/**
 * Verify hash chain integrity for a range of logs
 * @param {Object} options - Query options (firmId, startDate, endDate)
 * @returns {Object} - Chain verification result
 */
async function verifyHashChain(options = {}) {
  const { firmId, startDate, endDate, limit = 1000 } = options;

  const query = {};
  if (firmId) query.firmId = firmId;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  // Get logs with integrity data
  const logs = await AuditLog.find({
    ...query,
    'integrity.hash': { $exists: true },
  })
    .sort({ timestamp: 1 })
    .limit(limit)
    .lean();

  if (logs.length === 0) {
    return {
      valid: true,
      reason: 'no_logs_to_verify',
      count: 0,
    };
  }

  let previousHash = '0'.repeat(64);
  const errors = [];

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];

    // Verify individual log integrity
    const logResult = verifyLogIntegrity(log);
    if (!logResult.valid) {
      errors.push({
        index: i,
        logId: log._id,
        timestamp: log.timestamp,
        error: logResult.reason,
      });
      continue;
    }

    // Verify chain link (previousHash matches)
    if (i > 0 && log.integrity.previousHash !== previousHash) {
      errors.push({
        index: i,
        logId: log._id,
        timestamp: log.timestamp,
        error: 'chain_broken',
        expected: previousHash,
        actual: log.integrity.previousHash,
      });
    }

    previousHash = log.integrity.hash;
  }

  return {
    valid: errors.length === 0,
    count: logs.length,
    errors,
    firstLog: logs[0]?.timestamp,
    lastLog: logs[logs.length - 1]?.timestamp,
  };
}

/**
 * Generate compliance report for audit log integrity
 * @param {Object} options - Report options
 * @returns {Object} - Compliance report
 */
async function generateIntegrityReport(options = {}) {
  const { firmId, startDate, endDate } = options;

  const query = {};
  if (firmId) query.firmId = firmId;
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const [totalLogs, logsWithIntegrity, chainVerification] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.countDocuments({ ...query, 'integrity.hash': { $exists: true } }),
    verifyHashChain(options),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    period: {
      start: startDate || 'beginning',
      end: endDate || 'now',
    },
    statistics: {
      totalLogs,
      logsWithIntegrity,
      coveragePercent: totalLogs > 0 ? ((logsWithIntegrity / totalLogs) * 100).toFixed(2) : 0,
    },
    chainIntegrity: chainVerification,
    compliance: {
      ncaEcc: chainVerification.valid && logsWithIntegrity > 0,
      recommendation: logsWithIntegrity === 0
        ? 'Enable audit log integrity for compliance'
        : chainVerification.valid
          ? 'Audit log integrity verified'
          : 'Audit log integrity issues detected - investigate errors',
    },
  };
}

module.exports = {
  sha256,
  hmacSign,
  verifySignature,
  generateIntegrity,
  logWithIntegrity,
  verifyLogIntegrity,
  verifyHashChain,
  generateIntegrityReport,
};
