/**
 * MongoDB Restore Script
 *
 * Features:
 * - Download backup from S3
 * - Decompress and restore using mongorestore
 * - Validation after restore
 * - Dry-run mode
 * - Backup before restore (safety)
 * - Point-in-time recovery support
 *
 * Usage:
 *   node src/scripts/restore.js --backup=<s3-key> [--dry-run] [--no-backup] [--oplog-limit=<timestamp>]
 */

require('dotenv').config();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const { S3Client, GetObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const readline = require('readline');
const backupConfig = require('../configs/backup.config');

const execAsync = promisify(exec);

class RestoreManager {
  constructor() {
    this.config = backupConfig;
    this.s3Client = new S3Client({
      region: this.config.s3.region,
      credentials: {
        accessKeyId: this.config.s3.accessKeyId,
        secretAccessKey: this.config.s3.secretAccessKey,
      },
    });
    this.dryRun = process.argv.includes('--dry-run');
    this.skipBackup = process.argv.includes('--no-backup');
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const backupArg = args.find(arg => arg.startsWith('--backup='));
    const oplogLimitArg = args.find(arg => arg.startsWith('--oplog-limit='));

    if (!backupArg) {
      throw new Error('Missing required argument: --backup=<s3-key>');
    }

    return {
      backupKey: backupArg.split('=')[1],
      oplogLimit: oplogLimitArg ? oplogLimitArg.split('=')[1] : null,
    };
  }

  /**
   * List available backups for selection
   */
  async listAvailableBackups() {
    console.log('\n📋 Available Backups:\n');

    try {
      const command = new ListObjectsV2Command({
        Bucket: this.config.s3.bucket,
        Prefix: this.config.s3.prefix,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        console.log('No backups found.');
        return [];
      }

      // Sort by last modified (newest first)
      const backups = response.Contents
        .filter(item => item.Key.endsWith('.archive.gz'))
        .sort((a, b) => b.LastModified - a.LastModified)
        .slice(0, 20); // Show only last 20 backups

      backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.Key}`);
        console.log(`   Size: ${(backup.Size / (1024 * 1024)).toFixed(2)} MB`);
        console.log(`   Date: ${backup.LastModified.toISOString()}`);
        console.log('');
      });

      return backups.map(b => b.Key);
    } catch (error) {
      console.error('❌ Failed to list backups:', error.message);
      throw error;
    }
  }

  /**
   * Download backup from S3
   */
  async downloadFromS3(s3Key) {
    console.log('\n☁️  Downloading backup from S3...');

    // Ensure temp directory exists
    await fs.mkdir(this.config.restore.tempDir, { recursive: true });

    const filename = path.basename(s3Key);
    const localPath = path.join(this.config.restore.tempDir, filename);

    if (this.dryRun) {
      console.log(`[DRY RUN] Would download from: s3://${this.config.s3.bucket}/${s3Key}`);
      console.log(`[DRY RUN] To: ${localPath}`);
      return localPath;
    }

    try {
      console.log(`⏳ Downloading: ${s3Key}`);
      const startTime = Date.now();

      const command = new GetObjectCommand({
        Bucket: this.config.s3.bucket,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);

      // Stream to file
      const fileStream = require('fs').createWriteStream(localPath);
      await new Promise((resolve, reject) => {
        response.Body.pipe(fileStream);
        response.Body.on('error', reject);
        fileStream.on('finish', resolve);
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      // Get file size
      const stats = await fs.stat(localPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log(`✅ Download complete`);
      console.log(`   Size: ${sizeMB} MB`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Path: ${localPath}`);

      return localPath;
    } catch (error) {
      console.error('❌ Download failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate backup file
   */
  async validateBackup(localPath) {
    console.log('\n🔍 Validating backup file...');

    if (this.dryRun) {
      console.log(`[DRY RUN] Would validate: ${localPath}`);
      return true;
    }

    try {
      // Check if file exists
      await fs.access(localPath);

      // Check file size
      const stats = await fs.stat(localPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      // Test gzip integrity
      const { stdout, stderr } = await execAsync(`gzip -t "${localPath}"`);

      if (stderr && !stderr.includes('OK')) {
        console.warn('⚠️  Warning during validation:', stderr);
      }

      console.log('✅ Backup file is valid');
      return true;
    } catch (error) {
      console.error('❌ Backup validation failed:', error.message);
      return false;
    }
  }

  /**
   * Create safety backup before restore
   */
  async createSafetyBackup() {
    console.log('\n💾 Creating safety backup before restore...');

    if (this.skipBackup) {
      console.log('⚠️  Skipping safety backup (--no-backup flag)');
      return null;
    }

    if (this.dryRun) {
      console.log('[DRY RUN] Would create safety backup');
      return null;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyFilename = `safety-backup-${timestamp}.archive.gz`;
      const safetyPath = path.join(this.config.backup.tempDir, safetyFilename);

      await fs.mkdir(this.config.backup.tempDir, { recursive: true });

      const mongoUri = this.config.mongodb.uri;
      const dumpCommand = `mongodump --uri="${mongoUri}" --archive="${safetyPath}" --gzip`;

      console.log('⏳ Creating safety backup...');
      await execAsync(dumpCommand, { maxBuffer: 1024 * 1024 * 100 });

      const stats = await fs.stat(safetyPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

      console.log('✅ Safety backup created');
      console.log(`   Path: ${safetyPath}`);
      console.log(`   Size: ${sizeMB} MB`);

      return safetyPath;
    } catch (error) {
      console.error('❌ Failed to create safety backup:', error.message);
      throw new Error('Safety backup failed. Restore aborted.');
    }
  }

  /**
   * Restore database from backup
   */
  async restoreDatabase(localPath, oplogLimit = null) {
    console.log('\n🔄 Restoring database...');

    if (this.dryRun) {
      console.log(`[DRY RUN] Would restore from: ${localPath}`);
      if (oplogLimit) {
        console.log(`[DRY RUN] With oplog limit: ${oplogLimit}`);
      }
      return;
    }

    try {
      const mongoUri = this.config.mongodb.uri;

      // Build mongorestore command
      let restoreCommand = `mongorestore --uri="${mongoUri}" --archive="${localPath}" --gzip --drop`;

      // Add oplog replay for point-in-time recovery
      if (oplogLimit) {
        restoreCommand += ` --oplogReplay --oplogLimit="${oplogLimit}"`;
        console.log(`⏰ Point-in-time recovery to: ${oplogLimit}`);
      }

      console.log('⏳ Running mongorestore...');
      const startTime = Date.now();

      const { stdout, stderr } = await execAsync(restoreCommand, {
        maxBuffer: 1024 * 1024 * 100,
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (stderr && !stderr.includes('done')) {
        console.warn('⚠️  Warning during restore:', stderr);
      }

      console.log(`✅ Database restored successfully`);
      console.log(`   Duration: ${duration}s`);

      if (stdout) {
        console.log('\n📝 Restore details:');
        console.log(stdout);
      }
    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      throw error;
    }
  }

  /**
   * Validate restored database
   */
  async validateRestore() {
    console.log('\n✅ Validating restored database...');

    if (this.dryRun) {
      console.log('[DRY RUN] Would validate restored database');
      return true;
    }

    try {
      const mongoose = require('mongoose');

      // Connect to database
      await mongoose.connect(this.config.mongodb.uri, {
        maxPoolSize: 5,
        serverSelectionTimeoutMS: 5000,
      });

      // Get database stats
      const db = mongoose.connection.db;
      const stats = await db.stats();

      console.log('✅ Database is accessible');
      console.log(`   Collections: ${stats.collections}`);
      console.log(`   Data Size: ${(stats.dataSize / (1024 * 1024)).toFixed(2)} MB`);
      console.log(`   Indexes: ${stats.indexes}`);

      // List collections
      const collections = await db.listCollections().toArray();
      console.log(`\n📚 Collections (${collections.length}):`);
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });

      await mongoose.disconnect();

      return true;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(localPath, safetyBackupPath) {
    console.log('\n🧹 Cleaning up...');

    if (this.dryRun) {
      console.log('[DRY RUN] Would clean up temporary files');
      return;
    }

    try {
      // Clean up downloaded backup
      if (localPath) {
        await fs.unlink(localPath);
        console.log('✅ Downloaded backup cleaned up');
      }

      // Keep safety backup (don't delete automatically)
      if (safetyBackupPath) {
        console.log(`ℹ️  Safety backup preserved at: ${safetyBackupPath}`);
        console.log('   Delete manually after verifying restore');
      }
    } catch (error) {
      console.warn('⚠️  Cleanup warning:', error.message);
    }
  }

  /**
   * Confirm restore action
   */
  async confirmRestore(backupKey) {
    if (this.dryRun) {
      return true; // Skip confirmation in dry-run mode
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      console.log('\n⚠️  WARNING: This will restore the database from:');
      console.log(`   ${backupKey}`);
      console.log('\n   All current data will be replaced!');
      console.log(`   Environment: ${this.config.environment}`);
      console.log(`   Database: ${this.config.mongodb.uri.split('@')[1] || 'localhost'}\n`);

      rl.question('Are you sure you want to continue? (yes/no): ', answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Run complete restore process
   */
  async run() {
    const startTime = Date.now();

    try {
      console.log('='.repeat(60));
      console.log('  MONGODB RESTORE');
      console.log('='.repeat(60));

      if (this.dryRun) {
        console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
      }

      // Parse arguments
      const { backupKey, oplogLimit } = this.parseArgs();

      // Confirm restore
      const confirmed = await this.confirmRestore(backupKey);
      if (!confirmed) {
        console.log('\n❌ Restore cancelled by user');
        process.exit(0);
      }

      // Step 1: Create safety backup
      const safetyBackupPath = await this.createSafetyBackup();

      // Step 2: Download backup from S3
      const localPath = await this.downloadFromS3(backupKey);

      // Step 3: Validate backup
      const isValid = await this.validateBackup(localPath);
      if (!isValid && !this.dryRun) {
        throw new Error('Backup validation failed. Restore aborted.');
      }

      // Step 4: Restore database
      await this.restoreDatabase(localPath, oplogLimit);

      // Step 5: Validate restore
      const restoreValid = await this.validateRestore();
      if (!restoreValid && !this.dryRun) {
        throw new Error('Restore validation failed. Please check database integrity.');
      }

      // Step 6: Cleanup
      await this.cleanup(localPath, safetyBackupPath);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n' + '='.repeat(60));
      console.log('✅ RESTORE COMPLETED SUCCESSFULLY');
      console.log(`   Total Duration: ${duration}s`);
      console.log('='.repeat(60) + '\n');

      process.exit(0);
    } catch (error) {
      console.error('\n' + '='.repeat(60));
      console.error('❌ RESTORE FAILED');
      console.error('='.repeat(60));
      console.error(error);
      process.exit(1);
    }
  }
}

// Main execution
(async () => {
  const args = process.argv.slice(2);

  // Handle --list flag
  if (args.includes('--list')) {
    const manager = new RestoreManager();
    await manager.listAvailableBackups();
    console.log('\nTo restore a backup, run:');
    console.log('  node src/scripts/restore.js --backup=<s3-key>\n');
    process.exit(0);
  }

  // Handle --help flag
  if (args.includes('--help') || args.length === 0) {
    console.log(`
MongoDB Restore Script

Usage:
  node src/scripts/restore.js --backup=<s3-key> [options]

Options:
  --backup=<s3-key>          S3 key of backup to restore (required)
  --oplog-limit=<timestamp>  Restore to specific point in time (PITR)
  --dry-run                  Show what would be done without making changes
  --no-backup                Skip safety backup before restore
  --list                     List available backups
  --help                     Show this help message

Examples:
  # List available backups
  node src/scripts/restore.js --list

  # Restore from a specific backup
  node src/scripts/restore.js --backup=backups/daily/2024/12/mongodb-daily-production-2024-12-08.archive.gz

  # Restore to a specific point in time
  node src/scripts/restore.js --backup=<s3-key> --oplog-limit="1638360000:1"

  # Dry run to test without making changes
  node src/scripts/restore.js --backup=<s3-key> --dry-run
    `);
    process.exit(0);
  }

  // Run restore
  const manager = new RestoreManager();
  await manager.run();
})();
