/**
 * Backup Configuration
 *
 * Centralized configuration for database backups, S3 storage, and retention policies.
 */

module.exports = {
  // S3 Configuration
  s3: {
    bucket: process.env.BACKUP_S3_BUCKET || 'traf3li-backups',
    region: process.env.AWS_REGION || 'me-south-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    // S3 path structure: backups/{type}/{year}/{month}/{filename}
    prefix: 'backups',
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI,
    // mongodump options
    dumpOptions: {
      gzip: true,
      archive: true,
      // Exclude these collections from backup
      excludeCollections: ['sessions', 'temporarydata'],
    },
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
    // Redis RDB filename
    rdbFilename: 'dump.rdb',
    // Redis data directory (typically /var/lib/redis or /data)
    dataDir: process.env.REDIS_DATA_DIR || '/data',
  },

  // Retention Policies
  retention: {
    // Number of days to keep daily backups
    dailyBackups: parseInt(process.env.BACKUP_RETENTION_DAYS) || 7,
    // Number of weeks to keep weekly backups
    weeklyBackups: parseInt(process.env.BACKUP_RETENTION_WEEKS) || 4,
    // Number of months to keep monthly backups
    monthlyBackups: parseInt(process.env.BACKUP_RETENTION_MONTHS) || 12,
    // Number of years to keep yearly backups
    yearlyBackups: parseInt(process.env.BACKUP_RETENTION_YEARS) || 3,
  },

  // Backup Schedule (cron expressions)
  schedule: {
    // Daily incremental backup at 2 AM
    daily: process.env.BACKUP_SCHEDULE_DAILY || '0 2 * * *',
    // Weekly full backup on Sunday at 3 AM
    weekly: process.env.BACKUP_SCHEDULE_WEEKLY || '0 3 * * 0',
    // Monthly backup on the 1st at 4 AM
    monthly: process.env.BACKUP_SCHEDULE_MONTHLY || '0 4 1 * *',
    // Redis backup every 6 hours
    redis: process.env.BACKUP_SCHEDULE_REDIS || '0 */6 * * *',
  },

  // Email Notification Settings
  notifications: {
    enabled: process.env.BACKUP_NOTIFICATION_ENABLED !== 'false',
    email: process.env.BACKUP_NOTIFICATION_EMAIL || process.env.EMAIL_FROM,
    emailFrom: process.env.EMAIL_FROM || 'noreply@traf3li.com',
    emailFromName: process.env.EMAIL_FROM_NAME || 'Traf3li Backup System',
    // Notify on success
    notifyOnSuccess: process.env.BACKUP_NOTIFY_ON_SUCCESS === 'true',
    // Always notify on failure
    notifyOnFailure: true,
    // Resend API key
    resendApiKey: process.env.RESEND_API_KEY,
  },

  // Backup Settings
  backup: {
    // Temporary directory for local backup files before upload
    tempDir: process.env.BACKUP_TEMP_DIR || '/tmp/backups',
    // Maximum backup file size in bytes (500MB default)
    maxFileSize: parseInt(process.env.BACKUP_MAX_FILE_SIZE) || 500 * 1024 * 1024,
    // Compression level (1-9, where 9 is highest compression)
    compressionLevel: parseInt(process.env.BACKUP_COMPRESSION_LEVEL) || 6,
    // Enable point-in-time recovery (PITR)
    enablePITR: process.env.BACKUP_ENABLE_PITR === 'true',
    // PITR snapshot interval in minutes
    pitrInterval: parseInt(process.env.BACKUP_PITR_INTERVAL) || 15,
  },

  // Restore Settings
  restore: {
    // Temporary directory for downloaded backups
    tempDir: process.env.RESTORE_TEMP_DIR || '/tmp/restore',
    // Create a backup before restoring
    backupBeforeRestore: process.env.RESTORE_BACKUP_BEFORE !== 'false',
    // Validate backup integrity before restoring
    validateBeforeRestore: true,
  },

  // Environment
  environment: process.env.NODE_ENV || 'production',

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    // Log backup operations to a separate file
    logFile: process.env.BACKUP_LOG_FILE || '/var/log/traf3li-backups.log',
  },
};
