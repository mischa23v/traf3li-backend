/**
 * Startup Validation Utilities
 * Validates all critical environment variables before server starts
 *
 * CRITICAL: This module ensures the application fails fast with clear error
 * messages if required configuration is missing, preventing runtime failures
 * and security vulnerabilities from default/fallback values.
 */

const { validateSecrets } = require('./generateToken');
const logger = require('./logger');

/**
 * Validate required environment variables
 * Throws error with helpful message if any required variable is missing
 * @throws {Error} If validation fails
 */
const validateRequiredEnvVars = () => {
  logger.info('Validating environment variables...');

  const errors = [];
  const warnings = [];

  // ============================================
  // CRITICAL SECURITY VARIABLES (REQUIRED)
  // ============================================

  // JWT Secrets
  try {
    validateSecrets();
    logger.info('JWT secrets validated');
  } catch (error) {
    errors.push(`JWT Secrets: ${error.message}`);
  }

  // Encryption Key
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    errors.push(
      'ENCRYPTION_KEY is not set. ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  } else if (encryptionKey.length !== 64) {
    errors.push(
      `ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). ` +
      `Current length: ${encryptionKey.length}. ` +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  } else if (!/^[0-9a-fA-F]{64}$/.test(encryptionKey)) {
    errors.push(
      'ENCRYPTION_KEY must contain only hexadecimal characters (0-9, a-f, A-F). ' +
      'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  } else {
    logger.info('Encryption key validated');
  }

  // MongoDB URI
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    errors.push(
      'MONGODB_URI is not set. ' +
      'Required format: mongodb://[user]:[password]@[host]:[port]/[database] or ' +
      'mongodb+srv://[user]:[password]@[cluster]/[database]'
    );
  } else if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    errors.push(
      'MONGODB_URI must start with "mongodb://" or "mongodb+srv://". ' +
      `Current value starts with: "${mongoUri.substring(0, 10)}..."`
    );
  } else {
    logger.info('MongoDB URI validated');
  }

  // ============================================
  // RECOMMENDED VARIABLES (WARNINGS ONLY)
  // ============================================

  // Sentry DSN (Error Tracking)
  const sentryDsn = process.env.SENTRY_DSN;
  if (!sentryDsn || sentryDsn.includes('your-sentry-dsn')) {
    warnings.push(
      'SENTRY_DSN is not set or using placeholder value. ' +
      'Error tracking will be disabled. Get your DSN from https://sentry.io'
    );
  } else {
    logger.info('Sentry DSN configured');
  }

  // Redis URL (Caching & Queue Management)
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    warnings.push(
      'REDIS_URL is not set. ' +
      'Caching and job queues will be disabled or use in-memory fallbacks. ' +
      'Format: redis://[host]:[port] or redis://[username]:[password]@[host]:[port]'
    );
  } else {
    logger.info('Redis URL configured');
  }

  // AWS S3 Configuration (File Storage)
  const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsRegion = process.env.AWS_REGION;
  const s3Bucket = process.env.S3_BUCKET_DOCUMENTS || process.env.AWS_S3_BUCKET;

  if (!awsAccessKey || !awsSecretKey || !awsRegion || !s3Bucket) {
    warnings.push(
      'AWS S3 is not fully configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_DOCUMENTS). ' +
      'File storage features may be limited.'
    );
  } else {
    logger.info('AWS S3 configured');
  }

  // Email Configuration (Resend)
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey || resendApiKey === 'your_resend_api_key') {
    warnings.push(
      'RESEND_API_KEY is not set or using placeholder value. ' +
      'Email notifications will be disabled. Get your API key from https://resend.com'
    );
  } else {
    logger.info('Email service configured');
  }

  // ============================================
  // SECURITY BEST PRACTICES CHECKS
  // ============================================

  // Check if secrets are using placeholder values
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (jwtSecret && (
    jwtSecret.includes('your_secret_here') ||
    jwtSecret.includes('change_this') ||
    jwtSecret === 'secret'
  )) {
    errors.push(
      'JWT_SECRET appears to be using a placeholder value. ' +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (jwtRefreshSecret && (
    jwtRefreshSecret.includes('your_secret_here') ||
    jwtRefreshSecret.includes('change_this') ||
    jwtRefreshSecret === 'secret'
  )) {
    errors.push(
      'JWT_REFRESH_SECRET appears to be using a placeholder value. ' +
      'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (encryptionKey && (
    encryptionKey.includes('your_key_here') ||
    encryptionKey.includes('change_this')
  )) {
    errors.push(
      'ENCRYPTION_KEY appears to be using a placeholder value. ' +
      'Generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  // ============================================
  // PRODUCTION ENVIRONMENT CHECKS
  // ============================================

  if (process.env.NODE_ENV === 'production') {
    logger.info('Running production environment checks...');

    // Ensure HTTPS in production
    const clientUrl = process.env.CLIENT_URL;
    const dashboardUrl = process.env.DASHBOARD_URL;

    if (clientUrl && !clientUrl.startsWith('https://')) {
      warnings.push(
        `CLIENT_URL should use HTTPS in production. Current: ${clientUrl}`
      );
    }

    if (dashboardUrl && !dashboardUrl.startsWith('https://')) {
      warnings.push(
        `DASHBOARD_URL should use HTTPS in production. Current: ${dashboardUrl}`
      );
    }

    // Check MongoDB is using SSL/TLS in production
    if (mongoUri && !mongoUri.includes('ssl=true') && !mongoUri.includes('tls=true')) {
      warnings.push(
        'MONGODB_URI should use SSL/TLS in production. ' +
        'Add "?ssl=true" or "?tls=true" to your connection string.'
      );
    }

    // Ensure Sentry is configured in production
    if (!sentryDsn || sentryDsn.includes('your-sentry-dsn')) {
      warnings.push(
        'SENTRY_DSN should be configured in production for error tracking'
      );
    }
  }

  // ============================================
  // REPORT RESULTS
  // ============================================

  // Display warnings
  if (warnings.length > 0) {
    logger.warn('\nWARNINGS:');
    warnings.forEach((warning, index) => {
      logger.warn(`   ${index + 1}. ${warning}`);
    });
    logger.warn('');
  }

  // If there are errors, fail startup
  if (errors.length > 0) {
    logger.error('\nENVIRONMENT VALIDATION FAILED\n');
    logger.error('The following required environment variables are missing or invalid:\n');

    errors.forEach((error, index) => {
      logger.error(`   ${index + 1}. ${error}`);
    });

    logger.error('\nQuick Setup Guide:');
    logger.error('   1. Copy .env.example to .env: cp .env.example .env');
    logger.error('   2. Generate JWT secrets:');
    logger.error('      node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    logger.error('   3. Generate encryption key:');
    logger.error('      node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    logger.error('   4. Set MONGODB_URI to your database connection string');
    logger.error('   5. Configure other variables as needed\n');

    throw new Error('Environment validation failed. Please fix the errors above and restart.');
  }

  logger.info('All required environment variables validated successfully\n');
  return true;
};

/**
 * Validate a specific environment variable
 * @param {string} name - Environment variable name
 * @param {object} options - Validation options
 * @param {boolean} options.required - Whether variable is required
 * @param {number} options.minLength - Minimum length requirement
 * @param {RegExp} options.pattern - Pattern to match
 * @param {string} options.errorMessage - Custom error message
 * @returns {boolean} - True if valid
 * @throws {Error} - If validation fails and required is true
 */
const validateEnvVar = (name, options = {}) => {
  const {
    required = false,
    minLength = 0,
    pattern = null,
    errorMessage = null
  } = options;

  const value = process.env[name];

  if (!value) {
    if (required) {
      throw new Error(errorMessage || `${name} is required but not set`);
    }
    return false;
  }

  if (minLength > 0 && value.length < minLength) {
    const message = errorMessage || `${name} must be at least ${minLength} characters`;
    if (required) {
      throw new Error(message);
    }
    logger.warn(`${message}`);
    return false;
  }

  if (pattern && !pattern.test(value)) {
    const message = errorMessage || `${name} does not match required pattern`;
    if (required) {
      throw new Error(message);
    }
    logger.warn(`${message}`);
    return false;
  }

  return true;
};

/**
 * Display environment configuration summary (safe for logging)
 * Masks sensitive values
 */
const displayConfigSummary = () => {
  logger.info('Configuration Summary:');
  logger.info(`   Node Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`   Server Port: ${process.env.PORT || '8080'}`);
  logger.info(`   MongoDB: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  logger.info(`   Redis: ${process.env.REDIS_URL ? 'Configured' : 'Not configured'}`);
  logger.info(`   Sentry: ${process.env.SENTRY_DSN ? 'Configured' : 'Not configured'}`);
  logger.info(`   Email: ${process.env.RESEND_API_KEY ? 'Configured' : 'Not configured'}`);
  logger.info(`   AWS S3: ${process.env.AWS_ACCESS_KEY_ID ? 'Configured' : 'Not configured'}`);
  logger.info(`   JWT Secrets: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
  logger.info(`   Encryption Key: ${process.env.ENCRYPTION_KEY ? 'Set' : 'Not set'}`);
  logger.info('');
};

module.exports = {
  validateRequiredEnvVars,
  validateEnvVar,
  displayConfigSummary,
};
