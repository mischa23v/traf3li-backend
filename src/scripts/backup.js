/**
 * MongoDB Backup Script
 *
 * Features:
 * - MongoDB backup using mongodump
 * - Compression with gzip
 * - Upload to S3 bucket
 * - Retention policy enforcement
 * - Email notifications
 * - Point-in-time recovery support
 * - List and manage backups
 *
 * Usage:
 *   node src/scripts/backup.js [--type=daily|weekly|monthly] [--list] [--dry-run]
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Resend } = require('resend');
const logger = require('../utils/logger');
const backupConfig = require('../configs/backup.config');

const execAsync = promisify(exec);

class BackupManager {
  constructor() {
    this.config = backupConfig;
    this.storageType = this.config.storageProvider;

    // Initialize storage client based on provider
    const storageConfig = this.config.storage;

    if (this.storageType === 'none') {
      logger.warn('⚠️  No cloud storage configured (R2 or S3). Backups will only be stored locally.');
      this.storageClient = null;
    } else {
      const clientConfig = {
        region: storageConfig.region,
        credentials: {
          accessKeyId: storageConfig.accessKeyId,
          secretAccessKey: storageConfig.secretAccessKey,
        },
      };

      // Add R2 endpoint if using R2
      if (this.storageType === 'r2' && storageConfig.endpoint) {
        clientConfig.endpoint = storageConfig.endpoint;
      }

      this.storageClient = new S3Client(clientConfig);
      logger.info(`📦 Using ${this.storageType.toUpperCase()} for backup storage`);
    }

    this.resend = this.config.notifications.resendApiKey
      ? new Resend(this.config.notifications.resendApiKey)
      : null;
    this.dryRun = process.argv.includes('--dry-run');
  }

  /**
   * Generate backup filename with timestamp
   */
  generateBackupFilename(type = 'daily') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hostname = process.env.HOSTNAME || 'production';
    return `mongodb-${type}-${hostname}-${timestamp}.archive.gz`;
  }

  /**
   * Get storage key path for backup
   */
  getStorageKey(filename, type = 'daily') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = this.config.storage.prefix;
    return `${prefix}/${type}/${year}/${month}/${filename}`;
  }

  // Backward compatibility alias
  getS3Key(filename, type = 'daily') {
    return this.getStorageKey(filename, type);
  }

  /**
   * Create local backup using mongodump
   */
  async createBackup(filename, type = 'daily') {
    logger.info(`\n📦 Starting ${type} MongoDB backup...`);

    // Ensure temp directory exists
    await fs.mkdir(this.config.backup.tempDir, { recursive: true });

    const backupPath = path.join(this.config.backup.tempDir, filename);

    if (this.dryRun) {
      logger.info(`[DRY RUN] Would create backup at: ${backupPath}`);
      return backupPath;
    }

    try {
      // Parse MongoDB URI to extract connection details
      const mongoUri = this.config.mongodb.uri;

      // Build mongodump command
      let dumpCommand = `mongodump --uri="${mongoUri}" --archive="${backupPath}" --gzip`;

      // Add excluded collections
      if (this.config.mongodb.dumpOptions.excludeCollections.length > 0) {
        const excludeArgs = this.config.mongodb.dumpOptions.excludeCollections
          .map(col => `--excludeCollection="${col}"`)
          .join(' ');
        dumpCommand += ` ${excludeArgs}`;
      }

      // Add oplog for point-in-time recovery (only for replica sets)
      if (this.config.backup.enablePITR && type === 'daily') {
        dumpCommand += ' --oplog';
        logger.info('✅ Point-in-time recovery enabled (oplog included)');
      }

      logger.info('⏳ Running mongodump...');
      const startTime = Date.now();

      const { stdout, stderr } = await execAsync(dumpCommand);

      if (stderr && !stderr.includes('writing')) {
        logger.warn('⚠️  Warning during backup:', stderr);
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Get backup file size
      const stats = await fs.stat(backupPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      logger.info(`✅ Backup created successfully`);
      logger.info(`   Size: ${sizeMB} MB`);
      logger.info(`   Duration: ${duration}s`);
      logger.info(`   Path: ${backupPath}`);

      // Check if file size exceeds maximum
      if (stats.size > this.config.backup.maxFileSize) {
        throw new Error(`Backup file size (${sizeMB}MB) exceeds maximum allowed size`);
      }

      return backupPath;
    } catch (error) {
      logger.error('❌ Backup creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Upload backup to cloud storage (R2 or S3)
   */
  async uploadToStorage(localPath, filename, type = 'daily') {
    const storageLabel = this.storageType.toUpperCase();
    logger.info(`\n☁️  Uploading backup to ${storageLabel}...`);

    if (!this.storageClient) {
      logger.warn('⚠️  No cloud storage configured, skipping upload');
      return null;
    }

    if (this.dryRun) {
      logger.info(`[DRY RUN] Would upload ${filename} to ${storageLabel}`);
      return;
    }

    try {
      const storageKey = this.getStorageKey(filename, type);
      const fileContent = await fs.readFile(localPath);
      const bucket = this.config.storage.bucket;

      const commandOptions = {
        Bucket: bucket,
        Key: storageKey,
        Body: fileContent,
        ContentType: 'application/gzip',
        Metadata: {
          'backup-type': type,
          'backup-date': new Date().toISOString(),
          'environment': this.config.environment,
          'mongodb-uri-hash': this.hashUri(this.config.mongodb.uri),
          'storage-provider': this.storageType,
        },
      };

      // S3-specific options (R2 handles encryption automatically)
      if (this.storageType === 's3') {
        commandOptions.ServerSideEncryption = 'AES256';
        commandOptions.StorageClass = type === 'monthly' ? 'STANDARD_IA' : 'STANDARD';
      }

      const command = new PutObjectCommand(commandOptions);
      await this.storageClient.send(command);

      const urlPrefix = this.storageType === 'r2' ? 'r2://' : 's3://';
      logger.info('✅ Upload successful');
      logger.info(`   Key: ${urlPrefix}${bucket}/${storageKey}`);

      return storageKey;
    } catch (error) {
      logger.error(`❌ ${storageLabel} upload failed:`, error.message);
      throw error;
    }
  }

  // Backward compatibility alias
  async uploadToS3(localPath, filename, type = 'daily') {
    return this.uploadToStorage(localPath, filename, type);
  }

  /**
   * Hash MongoDB URI for metadata (without exposing credentials)
   */
  hashUri(uri) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(uri).digest('hex').substring(0, 16);
  }

  /**
   * Clean up local backup file
   */
  async cleanupLocal(localPath) {
    if (this.dryRun) {
      logger.info(`[DRY RUN] Would delete local file: ${localPath}`);
      return;
    }

    try {
      await fs.unlink(localPath);
      logger.info('✅ Local backup file cleaned up');
    } catch (error) {
      logger.warn('⚠️  Failed to clean up local file:', error.message);
    }
  }

  /**
   * List all backups in cloud storage
   */
  async listBackups(type = null) {
    logger.info('\n📋 Listing backups...\n');

    if (!this.storageClient) {
      logger.warn('⚠️  No cloud storage configured');
      return [];
    }

    try {
      const prefix = type
        ? `${this.config.storage.prefix}/${type}/`
        : `${this.config.storage.prefix}/`;

      const command = new ListObjectsV2Command({
        Bucket: this.config.storage.bucket,
        Prefix: prefix,
      });

      const response = await this.storageClient.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        logger.info('No backups found.');
        return [];
      }

      // Sort by last modified (newest first)
      const backups = response.Contents
        .sort((a, b) => b.LastModified - a.LastModified)
        .map(item => ({
          key: item.Key,
          size: (item.Size / (1024 * 1024)).toFixed(2) + ' MB',
          lastModified: item.LastModified.toISOString(),
          age: this.getAge(item.LastModified),
        }));

      // Display backups
      logger.info(`Found ${backups.length} backup(s):\n`);
      backups.forEach((backup, index) => {
        logger.info(`${index + 1}. ${backup.key}`);
        logger.info(`   Size: ${backup.size}`);
        logger.info(`   Date: ${backup.lastModified}`);
        logger.info(`   Age: ${backup.age}`);
        logger.info('');
      });

      return backups;
    } catch (error) {
      logger.error('❌ Failed to list backups:', error.message);
      throw error;
    }
  }

  /**
   * Get human-readable age of backup
   */
  getAge(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Enforce retention policy - delete old backups
   */
  async enforceRetentionPolicy(type = 'daily') {
    logger.info(`\n🗑️  Enforcing retention policy for ${type} backups...`);

    if (!this.storageClient) {
      logger.warn('⚠️  No cloud storage configured, skipping retention policy');
      return;
    }

    if (this.dryRun) {
      logger.info(`[DRY RUN] Would enforce retention policy`);
      return;
    }

    try {
      const prefix = `${this.config.storage.prefix}/${type}/`;

      const command = new ListObjectsV2Command({
        Bucket: this.config.storage.bucket,
        Prefix: prefix,
      });

      const response = await this.storageClient.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        logger.info('No backups to clean up.');
        return;
      }

      // Sort by last modified (oldest first)
      const backups = response.Contents.sort((a, b) => a.LastModified - b.LastModified);

      // Determine retention limit based on type
      let retentionDays;
      switch (type) {
        case 'daily':
          retentionDays = this.config.retention.dailyBackups;
          break;
        case 'weekly':
          retentionDays = this.config.retention.weeklyBackups * 7;
          break;
        case 'monthly':
          retentionDays = this.config.retention.monthlyBackups * 30;
          break;
        default:
          retentionDays = this.config.retention.dailyBackups;
      }

      const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
      const cutoffDate = new Date(Date.now() - retentionMs);

      // Delete old backups
      let deletedCount = 0;
      for (const backup of backups) {
        if (backup.LastModified < cutoffDate) {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: this.config.storage.bucket,
            Key: backup.Key,
          });

          await this.storageClient.send(deleteCommand);
          logger.info(`   Deleted: ${backup.Key}`);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logger.info(`✅ Deleted ${deletedCount} old backup(s)`);
      } else {
        logger.info('✅ No backups to delete');
      }
    } catch (error) {
      logger.error('❌ Failed to enforce retention policy:', error.message);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendNotification(success, details) {
    if (!this.config.notifications.enabled || !this.resend) {
      return;
    }

    if (success && !this.config.notifications.notifyOnSuccess) {
      return;
    }

    if (this.dryRun) {
      logger.info(`[DRY RUN] Would send email notification`);
      return;
    }

    try {
      const subject = success
        ? `✅ Backup Successful - ${details.type}`
        : `❌ Backup Failed - ${details.type}`;

      const htmlContent = success
        ? this.generateSuccessEmail(details)
        : this.generateFailureEmail(details);

      await this.resend.emails.send({
        from: `${this.config.notifications.emailFromName} <${this.config.notifications.emailFrom}>`,
        to: this.config.notifications.email,
        subject,
        html: htmlContent,
      });

      logger.info('✅ Notification email sent');
    } catch (error) {
      logger.warn('⚠️  Failed to send notification:', error.message);
    }
  }

  /**
   * Generate success email HTML
   */
  generateSuccessEmail(details) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #10b981; }
          .label { font-weight: bold; color: #374151; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Backup Completed Successfully</h2>
          </div>
          <div class="content">
            <div class="info">
              <p><span class="label">Backup Type:</span> ${details.type}</p>
              <p><span class="label">Date:</span> ${new Date().toISOString()}</p>
              <p><span class="label">Size:</span> ${details.size || 'N/A'}</p>
              <p><span class="label">Duration:</span> ${details.duration || 'N/A'}</p>
              <p><span class="label">S3 Location:</span> ${details.s3Key || 'N/A'}</p>
              <p><span class="label">Environment:</span> ${this.config.environment}</p>
            </div>
            <p>Your MongoDB backup has been successfully created and uploaded to S3.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate failure email HTML
   */
  generateFailureEmail(details) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #ef4444; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 20px; }
          .info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #ef4444; }
          .error { background-color: #fee2e2; padding: 15px; margin: 10px 0; }
          .label { font-weight: bold; color: #374151; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>❌ Backup Failed</h2>
          </div>
          <div class="content">
            <div class="info">
              <p><span class="label">Backup Type:</span> ${details.type}</p>
              <p><span class="label">Date:</span> ${new Date().toISOString()}</p>
              <p><span class="label">Environment:</span> ${this.config.environment}</p>
            </div>
            <div class="error">
              <p><span class="label">Error:</span></p>
              <pre>${details.error || 'Unknown error'}</pre>
            </div>
            <p><strong>Action Required:</strong> Please investigate and resolve the backup issue immediately.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Run complete backup process
   */
  async run(type = 'daily') {
    const startTime = Date.now();
    let details = { type };

    try {
      logger.info('='.repeat(60));
      logger.info(`  MONGODB BACKUP - ${type.toUpperCase()}`);
      logger.info('='.repeat(60));

      if (this.dryRun) {
        logger.info('\n⚠️  DRY RUN MODE - No changes will be made\n');
      }

      // Step 1: Create backup
      const filename = this.generateBackupFilename(type);
      const localPath = await this.createBackup(filename, type);

      // Get file stats for notification
      if (!this.dryRun) {
        const stats = await fs.stat(localPath);
        details.size = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      }

      // Step 2: Upload to S3
      const s3Key = await this.uploadToS3(localPath, filename, type);
      details.s3Key = s3Key;

      // Step 3: Clean up local file
      await this.cleanupLocal(localPath);

      // Step 4: Enforce retention policy
      await this.enforceRetentionPolicy(type);

      // Calculate duration
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      details.duration = duration + 's';

      logger.info('\n' + '='.repeat(60));
      logger.info('✅ BACKUP COMPLETED SUCCESSFULLY');
      logger.info(`   Total Duration: ${duration}s`);
      logger.info('='.repeat(60) + '\n');

      // Send success notification
      await this.sendNotification(true, details);

      process.exit(0);
    } catch (error) {
      details.error = error.message;

      logger.error('\n' + '='.repeat(60));
      logger.error('❌ BACKUP FAILED');
      logger.error('='.repeat(60));
      logger.error(error);

      // Send failure notification
      await this.sendNotification(false, details);

      process.exit(1);
    }
  }
}

// Main execution
(async () => {
  const args = process.argv.slice(2);

  // Handle --list flag
  if (args.includes('--list')) {
    const typeArg = args.find(arg => arg.startsWith('--type='));
    const type = typeArg ? typeArg.split('=')[1] : null;

    const manager = new BackupManager();
    await manager.listBackups(type);
    process.exit(0);
  }

  // Determine backup type
  const typeArg = args.find(arg => arg.startsWith('--type='));
  const type = typeArg ? typeArg.split('=')[1] : 'daily';

  // Validate type
  if (!['daily', 'weekly', 'monthly'].includes(type)) {
    logger.error('❌ Invalid backup type. Must be: daily, weekly, or monthly');
    process.exit(1);
  }

  // Run backup
  const manager = new BackupManager();
  await manager.run(type);
})();
