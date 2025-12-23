/**
 * Redis Backup Script
 *
 * Features:
 * - Redis RDB snapshot backup
 * - Upload to S3 bucket
 * - Retention policy enforcement
 * - Email notifications
 * - Support for both local and remote Redis
 *
 * Usage:
 *   node src/scripts/backupRedis.js [--dry-run]
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { Resend } = require('resend');
const { getRedisClient, connectRedis } = require('../configs/redis');
const backupConfig = require('../configs/backup.config');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

class RedisBackupManager {
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
      logger.info(`📦 Using ${this.storageType.toUpperCase()} for Redis backup storage`);
    }

    this.resend = this.config.notifications.resendApiKey
      ? new Resend(this.config.notifications.resendApiKey)
      : null;
    this.dryRun = process.argv.includes('--dry-run');
  }

  /**
   * Generate backup filename with timestamp
   */
  generateBackupFilename() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const hostname = process.env.HOSTNAME || 'production';
    return `redis-${hostname}-${timestamp}.rdb.gz`;
  }

  /**
   * Get storage key path for backup
   */
  getStorageKey(filename) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${this.config.storage.prefix}/redis/${year}/${month}/${filename}`;
  }

  // Backward compatibility alias
  getS3Key(filename) {
    return this.getStorageKey(filename);
  }

  /**
   * Trigger Redis BGSAVE
   */
  async triggerRedisSave() {
    logger.info('\n💾 Triggering Redis BGSAVE...');

    if (this.dryRun) {
      logger.info('[DRY RUN] Would trigger Redis BGSAVE');
      return;
    }

    try {
      // Connect to Redis
      const redisClient = await connectRedis();

      // Get current save time
      const lastSaveTime = await redisClient.lastsave();
      logger.info(`   Last save: ${new Date(lastSaveTime * 1000).toISOString()}`);

      // Trigger background save
      logger.info('⏳ Starting background save...');
      await redisClient.bgsave();

      // Wait for save to complete
      let saveInProgress = true;
      let attempts = 0;
      const maxAttempts = 60; // Wait up to 60 seconds

      while (saveInProgress && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
          const info = await redisClient.info('persistence');

          // Check if save is in progress
          if (info.includes('rdb_bgsave_in_progress:0')) {
            saveInProgress = false;

            // Check for save errors
            if (info.includes('rdb_last_bgsave_status:ok')) {
              logger.info('✅ Redis BGSAVE completed successfully');
            } else {
              throw new Error('Redis BGSAVE reported an error');
            }
          }
        } catch (error) {
          logger.warn('⚠️  Error checking save status:', error.message);
        }

        attempts++;
      }

      if (saveInProgress) {
        throw new Error('Redis BGSAVE timed out after 60 seconds');
      }

      // Get new save time
      const newSaveTime = await redisClient.lastsave();
      logger.info(`   New save: ${new Date(newSaveTime * 1000).toISOString()}`);

      return newSaveTime;
    } catch (error) {
      logger.error('❌ Redis BGSAVE failed:', error.message);
      throw error;
    }
  }

  /**
   * Copy and compress RDB file
   */
  async copyAndCompressRDB(filename) {
    logger.info('\n📦 Copying and compressing RDB file...');

    // Ensure temp directory exists
    await fs.mkdir(this.config.backup.tempDir, { recursive: true });

    const backupPath = path.join(this.config.backup.tempDir, filename);

    if (this.dryRun) {
      logger.info(`[DRY RUN] Would copy RDB and compress to: ${backupPath}`);
      return backupPath;
    }

    try {
      // Determine RDB file location
      // Try to get it from Redis CONFIG GET
      let rdbPath;
      try {
        const redisClient = getRedisClient();
        const dir = await redisClient.config('GET', 'dir');
        const dbFilename = await redisClient.config('GET', 'dbfilename');

        if (dir && dir[1] && dbFilename && dbFilename[1]) {
          rdbPath = path.join(dir[1], dbFilename[1]);
        }
      } catch (error) {
        logger.warn('⚠️  Could not get RDB path from Redis, using default');
        rdbPath = path.join(this.config.redis.dataDir, this.config.redis.rdbFilename);
      }

      logger.info(`   Source: ${rdbPath}`);

      // Check if RDB file exists
      try {
        await fs.access(rdbPath);
      } catch (error) {
        throw new Error(`RDB file not found at: ${rdbPath}`);
      }

      // Get RDB file stats
      const rdbStats = await fs.stat(rdbPath);
      const rdbSizeMB = (rdbStats.size / (1024 * 1024)).toFixed(2);
      logger.info(`   RDB Size: ${rdbSizeMB} MB`);

      // Copy and compress RDB file
      const startTime = Date.now();
      const compressCommand = `gzip -c "${rdbPath}" > "${backupPath}"`;

      await execAsync(compressCommand);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Get compressed file stats
      const stats = await fs.stat(backupPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      const compressionRatio = ((1 - stats.size / rdbStats.size) * 100).toFixed(1);

      logger.info('✅ Compression complete');
      logger.info(`   Compressed Size: ${sizeMB} MB`);
      logger.info(`   Compression: ${compressionRatio}%`);
      logger.info(`   Duration: ${duration}s`);
      logger.info(`   Path: ${backupPath}`);

      return backupPath;
    } catch (error) {
      logger.error('❌ Copy and compression failed:', error.message);
      throw error;
    }
  }

  /**
   * Upload backup to cloud storage (R2 or S3)
   */
  async uploadToStorage(localPath, filename) {
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
      const storageKey = this.getStorageKey(filename);
      const fileContent = await fs.readFile(localPath);
      const bucket = this.config.storage.bucket;

      const commandOptions = {
        Bucket: bucket,
        Key: storageKey,
        Body: fileContent,
        ContentType: 'application/gzip',
        Metadata: {
          'backup-type': 'redis',
          'backup-date': new Date().toISOString(),
          'environment': this.config.environment,
          'storage-provider': this.storageType,
        },
      };

      // S3-specific options (R2 handles encryption automatically)
      if (this.storageType === 's3') {
        commandOptions.ServerSideEncryption = 'AES256';
        commandOptions.StorageClass = 'STANDARD';
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
  async uploadToS3(localPath, filename) {
    return this.uploadToStorage(localPath, filename);
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
   * Enforce retention policy - delete old backups
   */
  async enforceRetentionPolicy() {
    logger.info('\n🗑️  Enforcing retention policy for Redis backups...');

    if (!this.storageClient) {
      logger.warn('⚠️  No cloud storage configured, skipping retention policy');
      return;
    }

    if (this.dryRun) {
      logger.info('[DRY RUN] Would enforce retention policy');
      return;
    }

    try {
      const prefix = `${this.config.storage.prefix}/redis/`;

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

      // Redis backups use daily retention
      const retentionDays = this.config.retention.dailyBackups;
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
   * Get Redis info for notification
   */
  async getRedisInfo() {
    try {
      const redisClient = getRedisClient();
      const info = await redisClient.info('server');
      const memory = await redisClient.info('memory');

      const version = info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown';
      const usedMemory = memory.match(/used_memory_human:([^\r\n]+)/)?.[1] || 'unknown';

      return { version, usedMemory };
    } catch (error) {
      return { version: 'unknown', usedMemory: 'unknown' };
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
      logger.info('[DRY RUN] Would send email notification');
      return;
    }

    try {
      const subject = success
        ? '✅ Redis Backup Successful'
        : '❌ Redis Backup Failed';

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
            <h2>✅ Redis Backup Completed Successfully</h2>
          </div>
          <div class="content">
            <div class="info">
              <p><span class="label">Date:</span> ${new Date().toISOString()}</p>
              <p><span class="label">Size:</span> ${details.size || 'N/A'}</p>
              <p><span class="label">Duration:</span> ${details.duration || 'N/A'}</p>
              <p><span class="label">Storage Location:</span> ${details.s3Key || 'N/A'}</p>
              <p><span class="label">Redis Version:</span> ${details.redisVersion || 'N/A'}</p>
              <p><span class="label">Memory Used:</span> ${details.usedMemory || 'N/A'}</p>
              <p><span class="label">Environment:</span> ${this.config.environment}</p>
            </div>
            <p>Your Redis backup has been successfully created and uploaded to cloud storage.</p>
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
            <h2>❌ Redis Backup Failed</h2>
          </div>
          <div class="content">
            <div class="info">
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
  async run() {
    const startTime = Date.now();
    let details = {};

    try {
      logger.info('='.repeat(60));
      logger.info('  REDIS BACKUP');
      logger.info('='.repeat(60));

      if (this.dryRun) {
        logger.info('\n⚠️  DRY RUN MODE - No changes will be made\n');
      }

      // Get Redis info
      const redisInfo = await this.getRedisInfo();
      details.redisVersion = redisInfo.version;
      details.usedMemory = redisInfo.usedMemory;

      // Step 1: Trigger Redis BGSAVE
      await this.triggerRedisSave();

      // Step 2: Copy and compress RDB file
      const filename = this.generateBackupFilename();
      const localPath = await this.copyAndCompressRDB(filename);

      // Get file stats for notification
      if (!this.dryRun) {
        const stats = await fs.stat(localPath);
        details.size = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      }

      // Step 3: Upload to S3
      const s3Key = await this.uploadToS3(localPath, filename);
      details.s3Key = s3Key;

      // Step 4: Clean up local file
      await this.cleanupLocal(localPath);

      // Step 5: Enforce retention policy
      await this.enforceRetentionPolicy();

      // Calculate duration
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      details.duration = duration + 's';

      logger.info('\n' + '='.repeat(60));
      logger.info('✅ REDIS BACKUP COMPLETED SUCCESSFULLY');
      logger.info(`   Total Duration: ${duration}s`);
      logger.info('='.repeat(60) + '\n');

      // Send success notification
      await this.sendNotification(true, details);

      process.exit(0);
    } catch (error) {
      details.error = error.message;

      logger.error('\n' + '='.repeat(60));
      logger.error('❌ REDIS BACKUP FAILED');
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
  const manager = new RedisBackupManager();
  await manager.run();
})();
