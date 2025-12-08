/**
 * Backup Scheduler
 *
 * Automated backup scheduling using node-cron:
 * - Daily incremental backups at 2 AM
 * - Weekly full backups on Sunday at 3 AM
 * - Monthly backups on the 1st at 4 AM
 * - Redis backups every 6 hours
 *
 * Usage:
 *   node src/scripts/backupScheduler.js
 *   OR integrate into your main server.js
 */

require('dotenv').config();
const cron = require('node-cron');
const { exec } = require('child_process');
const { promisify } = require('util');
const backupConfig = require('../configs/backup.config');

const execAsync = promisify(exec);

class BackupScheduler {
  constructor() {
    this.config = backupConfig;
    this.jobs = [];
    this.isShuttingDown = false;
  }

  /**
   * Execute backup script
   */
  async executeBackup(type, script = 'backup.js') {
    if (this.isShuttingDown) {
      console.log('⚠️  Backup skipped - scheduler is shutting down');
      return;
    }

    const timestamp = new Date().toISOString();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${timestamp}] Starting ${type} backup...`);
    console.log('='.repeat(60));

    try {
      const scriptPath = `src/scripts/${script}`;
      const typeArg = script === 'backup.js' ? `--type=${type}` : '';
      const command = `node ${scriptPath} ${typeArg}`;

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      if (stdout) {
        console.log(stdout);
      }

      if (stderr) {
        console.error(stderr);
      }

      console.log(`✅ ${type} backup completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ ${type} backup failed:`, error.message);
      if (error.stdout) console.log(error.stdout);
      if (error.stderr) console.error(error.stderr);
      return false;
    }
  }

  /**
   * Schedule daily MongoDB backups
   */
  scheduleDailyBackup() {
    const schedule = this.config.schedule.daily;

    if (!cron.validate(schedule)) {
      console.error(`❌ Invalid cron schedule for daily backup: ${schedule}`);
      return;
    }

    const job = cron.schedule(schedule, async () => {
      await this.executeBackup('daily', 'backup.js');
    });

    this.jobs.push({ name: 'Daily MongoDB Backup', schedule, job });
    console.log(`✅ Scheduled: Daily MongoDB Backup (${schedule})`);
  }

  /**
   * Schedule weekly MongoDB backups
   */
  scheduleWeeklyBackup() {
    const schedule = this.config.schedule.weekly;

    if (!cron.validate(schedule)) {
      console.error(`❌ Invalid cron schedule for weekly backup: ${schedule}`);
      return;
    }

    const job = cron.schedule(schedule, async () => {
      await this.executeBackup('weekly', 'backup.js');
    });

    this.jobs.push({ name: 'Weekly MongoDB Backup', schedule, job });
    console.log(`✅ Scheduled: Weekly MongoDB Backup (${schedule})`);
  }

  /**
   * Schedule monthly MongoDB backups
   */
  scheduleMonthlyBackup() {
    const schedule = this.config.schedule.monthly;

    if (!cron.validate(schedule)) {
      console.error(`❌ Invalid cron schedule for monthly backup: ${schedule}`);
      return;
    }

    const job = cron.schedule(schedule, async () => {
      await this.executeBackup('monthly', 'backup.js');
    });

    this.jobs.push({ name: 'Monthly MongoDB Backup', schedule, job });
    console.log(`✅ Scheduled: Monthly MongoDB Backup (${schedule})`);
  }

  /**
   * Schedule Redis backups
   */
  scheduleRedisBackup() {
    const schedule = this.config.schedule.redis;

    if (!cron.validate(schedule)) {
      console.error(`❌ Invalid cron schedule for Redis backup: ${schedule}`);
      return;
    }

    const job = cron.schedule(schedule, async () => {
      await this.executeBackup('redis', 'backupRedis.js');
    });

    this.jobs.push({ name: 'Redis Backup', schedule, job });
    console.log(`✅ Scheduled: Redis Backup (${schedule})`);
  }

  /**
   * Schedule PITR (Point-In-Time Recovery) snapshots
   */
  schedulePITRSnapshots() {
    if (!this.config.backup.enablePITR) {
      console.log('ℹ️  PITR snapshots disabled');
      return;
    }

    const interval = this.config.backup.pitrInterval;
    const schedule = `*/${interval} * * * *`; // Every N minutes

    if (!cron.validate(schedule)) {
      console.error(`❌ Invalid PITR interval: ${interval} minutes`);
      return;
    }

    const job = cron.schedule(schedule, async () => {
      await this.executeBackup('pitr', 'backup.js');
    });

    this.jobs.push({ name: 'PITR Snapshot', schedule, job });
    console.log(`✅ Scheduled: PITR Snapshots (every ${interval} minutes)`);
  }

  /**
   * Display backup schedule summary
   */
  displaySchedule() {
    console.log('\n' + '='.repeat(60));
    console.log('  BACKUP SCHEDULE');
    console.log('='.repeat(60));
    console.log(`Environment: ${this.config.environment}`);
    console.log(`S3 Bucket: ${this.config.s3.bucket}`);
    console.log('');

    if (this.jobs.length === 0) {
      console.log('❌ No backup jobs scheduled');
      return;
    }

    console.log('Scheduled Jobs:');
    this.jobs.forEach((job, index) => {
      console.log(`  ${index + 1}. ${job.name}`);
      console.log(`     Schedule: ${job.schedule}`);
      console.log(`     Next Run: ${this.getNextRun(job.schedule)}`);
      console.log('');
    });

    console.log('Retention Policies:');
    console.log(`  Daily Backups: ${this.config.retention.dailyBackups} days`);
    console.log(`  Weekly Backups: ${this.config.retention.weeklyBackups} weeks`);
    console.log(`  Monthly Backups: ${this.config.retention.monthlyBackups} months`);
    console.log('');

    console.log('Notifications:');
    console.log(`  Enabled: ${this.config.notifications.enabled ? 'Yes' : 'No'}`);
    if (this.config.notifications.enabled) {
      console.log(`  Email: ${this.config.notifications.email}`);
      console.log(`  Notify on Success: ${this.config.notifications.notifyOnSuccess ? 'Yes' : 'No'}`);
    }
    console.log('='.repeat(60) + '\n');
  }

  /**
   * Get human-readable next run time for cron schedule
   */
  getNextRun(schedule) {
    try {
      // Simple approximation - doesn't handle all cron expressions perfectly
      const parts = schedule.split(' ');
      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

      if (dayOfMonth !== '*' && dayOfMonth !== '?') {
        return `Day ${dayOfMonth} at ${hour}:${minute.padStart(2, '0')}`;
      }

      if (dayOfWeek !== '*' && dayOfWeek !== '?') {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const day = days[parseInt(dayOfWeek)] || `Day ${dayOfWeek}`;
        return `Every ${day} at ${hour}:${minute.padStart(2, '0')}`;
      }

      if (hour !== '*') {
        return `Every day at ${hour}:${minute.padStart(2, '0')}`;
      }

      if (minute.includes('/')) {
        const interval = minute.split('/')[1];
        return `Every ${interval} minutes`;
      }

      return 'Custom schedule';
    } catch (error) {
      return 'Unable to determine';
    }
  }

  /**
   * Health check - verify backup system is operational
   */
  async healthCheck() {
    console.log('\n🏥 Running backup system health check...\n');

    const checks = [];

    // Check S3 credentials
    try {
      if (!this.config.s3.accessKeyId || !this.config.s3.secretAccessKey) {
        checks.push({ name: 'S3 Credentials', status: '❌', message: 'Not configured' });
      } else {
        checks.push({ name: 'S3 Credentials', status: '✅', message: 'Configured' });
      }
    } catch (error) {
      checks.push({ name: 'S3 Credentials', status: '❌', message: error.message });
    }

    // Check MongoDB URI
    try {
      if (!this.config.mongodb.uri) {
        checks.push({ name: 'MongoDB URI', status: '❌', message: 'Not configured' });
      } else {
        checks.push({ name: 'MongoDB URI', status: '✅', message: 'Configured' });
      }
    } catch (error) {
      checks.push({ name: 'MongoDB URI', status: '❌', message: error.message });
    }

    // Check Redis connection
    try {
      const { getRedisClient } = require('../configs/redis');
      const redisClient = getRedisClient();
      await redisClient.ping();
      checks.push({ name: 'Redis Connection', status: '✅', message: 'Connected' });
    } catch (error) {
      checks.push({ name: 'Redis Connection', status: '⚠️ ', message: 'Cannot connect' });
    }

    // Check email configuration
    try {
      if (this.config.notifications.enabled && this.config.notifications.resendApiKey) {
        checks.push({ name: 'Email Notifications', status: '✅', message: 'Configured' });
      } else {
        checks.push({ name: 'Email Notifications', status: '⚠️ ', message: 'Disabled or not configured' });
      }
    } catch (error) {
      checks.push({ name: 'Email Notifications', status: '❌', message: error.message });
    }

    // Check scheduled jobs
    checks.push({
      name: 'Scheduled Jobs',
      status: this.jobs.length > 0 ? '✅' : '❌',
      message: `${this.jobs.length} job(s)`,
    });

    // Display results
    checks.forEach(check => {
      console.log(`${check.status} ${check.name}: ${check.message}`);
    });

    const allHealthy = checks.every(check => check.status === '✅');
    console.log('\n' + (allHealthy ? '✅ All systems operational' : '⚠️  Some issues detected') + '\n');

    return allHealthy;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    console.log('\n🛑 Shutting down backup scheduler...');

    // Stop all cron jobs
    this.jobs.forEach(job => {
      job.job.stop();
      console.log(`   Stopped: ${job.name}`);
    });

    console.log('✅ Backup scheduler stopped gracefully\n');
  }

  /**
   * Start all backup schedules
   */
  start() {
    console.log('\n🚀 Starting backup scheduler...\n');

    // Schedule all backup jobs
    this.scheduleDailyBackup();
    this.scheduleWeeklyBackup();
    this.scheduleMonthlyBackup();
    this.scheduleRedisBackup();
    this.schedulePITRSnapshots();

    // Display schedule summary
    this.displaySchedule();

    // Run health check
    this.healthCheck();

    // Handle process termination
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());

    console.log('✅ Backup scheduler is running...');
    console.log('   Press Ctrl+C to stop\n');
  }

  /**
   * Run a backup immediately (for testing)
   */
  async runNow(type = 'daily') {
    console.log(`\n🔄 Running ${type} backup immediately...\n`);

    const script = type === 'redis' ? 'backupRedis.js' : 'backup.js';
    await this.executeBackup(type, script);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  const scheduler = new BackupScheduler();

  // Handle --now flag for immediate backup
  if (args.includes('--now')) {
    const typeArg = args.find(arg => arg.startsWith('--type='));
    const type = typeArg ? typeArg.split('=')[1] : 'daily';

    scheduler.runNow(type).then(() => {
      process.exit(0);
    });
  }
  // Handle --health flag
  else if (args.includes('--health')) {
    scheduler.healthCheck().then(() => {
      process.exit(0);
    });
  }
  // Start scheduler
  else {
    scheduler.start();
  }
}

module.exports = BackupScheduler;
