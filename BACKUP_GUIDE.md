# Traf3li Backend Backup & Recovery Guide

Complete guide for database backup automation, recovery procedures, and best practices.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Backup Operations](#backup-operations)
- [Restore Operations](#restore-operations)
- [Automated Scheduling](#automated-scheduling)
- [Testing Backup Integrity](#testing-backup-integrity)
- [Disaster Recovery](#disaster-recovery)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

The backup automation system provides:

- **MongoDB Backups**: Daily, weekly, and monthly backups with compression
- **Redis Backups**: Periodic RDB snapshots
- **S3 Storage**: Secure, encrypted cloud storage
- **Retention Policies**: Automatic cleanup of old backups
- **Email Notifications**: Success/failure alerts
- **Point-in-Time Recovery**: Restore to specific timestamps (PITR)
- **Dry-Run Mode**: Test operations without making changes

### Architecture

```
┌─────────────────┐
│   MongoDB       │──┐
│   Database      │  │
└─────────────────┘  │
                     │  mongodump
                     ├──────────► ┌──────────────┐
┌─────────────────┐  │            │  Compressed  │
│   Redis         │──┘            │  Backup File │
│   Cache         │   BGSAVE      │  (.gz)       │
└─────────────────┘  ────────────►└──────────────┘
                                          │
                                          │ Upload
                                          ▼
                                  ┌──────────────┐
                                  │  AWS S3      │
                                  │  Bucket      │
                                  └──────────────┘
                                          │
                                          │ Retention Policy
                                          ▼
                                  Delete old backups
```

---

## Prerequisites

### Required Software

1. **MongoDB Tools** (mongodump/mongorestore)
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb-org-tools

   # macOS
   brew tap mongodb/brew
   brew install mongodb-database-tools

   # Verify installation
   mongodump --version
   mongorestore --version
   ```

2. **Node.js Dependencies** (already included)
   - @aws-sdk/client-s3
   - node-cron
   - ioredis
   - resend

### AWS S3 Setup

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://traf3li-backups --region me-south-1
   ```

2. **Enable Versioning** (recommended)
   ```bash
   aws s3api put-bucket-versioning \
     --bucket traf3li-backups \
     --versioning-configuration Status=Enabled
   ```

3. **Configure Lifecycle Policy** (optional - cost optimization)
   ```json
   {
     "Rules": [
       {
         "Id": "MoveOldBackupsToGlacier",
         "Status": "Enabled",
         "Transitions": [
           {
             "Days": 90,
             "StorageClass": "GLACIER"
           }
         ]
       }
     ]
   }
   ```

4. **Set Bucket Policy** (restrict access)
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "AWS": "arn:aws:iam::ACCOUNT_ID:user/backup-user"
         },
         "Action": [
           "s3:PutObject",
           "s3:GetObject",
           "s3:ListBucket",
           "s3:DeleteObject"
         ],
         "Resource": [
           "arn:aws:s3:::traf3li-backups",
           "arn:aws:s3:::traf3li-backups/*"
         ]
       }
     ]
   }
   ```

---

## Setup Instructions

### 1. Environment Configuration

Copy `.env.example` to `.env` and configure backup settings:

```bash
cp .env.example .env
```

Update the following variables in `.env`:

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_REGION=me-south-1

# Backup Configuration
BACKUP_S3_BUCKET=traf3li-backups
BACKUP_RETENTION_DAYS=7
BACKUP_RETENTION_WEEKS=4
BACKUP_RETENTION_MONTHS=12

# Notification
BACKUP_NOTIFICATION_ENABLED=true
BACKUP_NOTIFICATION_EMAIL=admin@traf3li.com
RESEND_API_KEY=your_resend_api_key

# Database
MONGODB_URI=mongodb://localhost:27017/traf3li
REDIS_URL=redis://localhost:6379
```

### 2. Test Connection

Run the health check to verify configuration:

```bash
npm run backup:health
```

Expected output:
```
✅ S3 Credentials: Configured
✅ MongoDB URI: Configured
✅ Redis Connection: Connected
✅ Email Notifications: Configured
✅ Scheduled Jobs: 0 job(s)

✅ All systems operational
```

### 3. Create S3 Bucket (if not exists)

```bash
aws s3 mb s3://traf3li-backups --region me-south-1
```

### 4. Test Backup (Dry Run)

```bash
# Test MongoDB backup
node src/scripts/backup.js --dry-run

# Test Redis backup
node src/scripts/backupRedis.js --dry-run
```

---

## Backup Operations

### Manual Backups

#### MongoDB Backup

```bash
# Daily backup (default)
npm run backup:db

# Weekly backup
npm run backup:db:weekly

# Monthly backup
npm run backup:db:monthly

# Or specify type directly
node src/scripts/backup.js --type=daily
```

#### Redis Backup

```bash
npm run backup:redis
```

#### Run All Backups Now

```bash
npm run backup:now
```

### List Backups

```bash
# List all backups
npm run backup:list

# List specific type
node src/scripts/backup.js --list --type=daily
```

Example output:
```
Found 5 backup(s):

1. backups/daily/2024/12/mongodb-daily-production-2024-12-08T02-00-00-000Z.archive.gz
   Size: 125.45 MB
   Date: 2024-12-08T02:00:00.000Z
   Age: 6 hours ago

2. backups/daily/2024/12/mongodb-daily-production-2024-12-07T02-00-00-000Z.archive.gz
   Size: 124.82 MB
   Date: 2024-12-07T02:00:00.000Z
   Age: 1 day ago
```

### Backup File Structure

```
s3://traf3li-backups/
├── backups/
│   ├── daily/
│   │   ├── 2024/
│   │   │   ├── 12/
│   │   │   │   ├── mongodb-daily-production-2024-12-08.archive.gz
│   │   │   │   └── mongodb-daily-production-2024-12-07.archive.gz
│   ├── weekly/
│   │   ├── 2024/
│   │   │   ├── 12/
│   │   │   │   └── mongodb-weekly-production-2024-12-01.archive.gz
│   ├── monthly/
│   │   ├── 2024/
│   │   │   ├── 12/
│   │   │   │   └── mongodb-monthly-production-2024-12-01.archive.gz
│   └── redis/
│       ├── 2024/
│       │   ├── 12/
│       │   │   └── redis-production-2024-12-08.rdb.gz
```

---

## Restore Operations

### List Available Backups

```bash
npm run backup:restore -- --list
```

### Restore from Backup

**⚠️ WARNING: This will replace all existing data!**

1. **Find the backup to restore:**
   ```bash
   npm run backup:restore -- --list
   ```

2. **Restore (with confirmation prompt):**
   ```bash
   npm run backup:restore -- --backup=backups/daily/2024/12/mongodb-daily-production-2024-12-08.archive.gz
   ```

3. **Confirm the operation:**
   ```
   ⚠️  WARNING: This will restore the database from:
      backups/daily/2024/12/mongodb-daily-production-2024-12-08.archive.gz

      All current data will be replaced!
      Environment: production
      Database: mongodb-cluster.example.com/traf3li

   Are you sure you want to continue? (yes/no): yes
   ```

### Point-in-Time Recovery (PITR)

Restore to a specific timestamp using oplog:

```bash
npm run backup:restore -- \
  --backup=backups/daily/2024/12/mongodb-daily-production-2024-12-08.archive.gz \
  --oplog-limit="1638360000:1"
```

The oplog limit format is `<timestamp>:<increment>`.

### Restore Options

```bash
# Dry run (test without making changes)
npm run backup:restore -- --backup=<s3-key> --dry-run

# Skip safety backup before restore
npm run backup:restore -- --backup=<s3-key> --no-backup

# Combine options
npm run backup:restore -- --backup=<s3-key> --dry-run --no-backup
```

### Safety Features

1. **Safety Backup**: Before restoring, a safety backup is automatically created
2. **Validation**: Backup file integrity is verified before restoration
3. **Confirmation**: Interactive prompt requires explicit confirmation
4. **Post-Restore Validation**: Database connectivity and stats are verified

---

## Automated Scheduling

### Start Backup Scheduler

#### Option 1: Standalone Process

```bash
npm run backup:schedule
```

This runs as a standalone process with the following schedule:
- Daily MongoDB backup: 2:00 AM
- Weekly MongoDB backup: Sunday 3:00 AM
- Monthly MongoDB backup: 1st of month 4:00 AM
- Redis backup: Every 6 hours

#### Option 2: Integrate with Main Server

Add to your `src/server.js`:

```javascript
const BackupScheduler = require('./scripts/backupScheduler');

// After server starts
const backupScheduler = new BackupScheduler();
backupScheduler.start();

// Handle shutdown
process.on('SIGTERM', async () => {
  await backupScheduler.shutdown();
  // ... rest of shutdown logic
});
```

#### Option 3: System Service (Recommended for Production)

Create systemd service file `/etc/systemd/system/traf3li-backup.service`:

```ini
[Unit]
Description=Traf3li Backup Scheduler
After=network.target mongodb.service redis.service

[Service]
Type=simple
User=traf3li
WorkingDirectory=/home/traf3li/traf3li-backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/scripts/backupScheduler.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable traf3li-backup
sudo systemctl start traf3li-backup
sudo systemctl status traf3li-backup
```

### Custom Schedule

Modify cron expressions in `.env`:

```bash
# Every day at 3:30 AM
BACKUP_SCHEDULE_DAILY=30 3 * * *

# Every Monday at 1:00 AM
BACKUP_SCHEDULE_WEEKLY=0 1 * * 1

# Every 1st and 15th at 2:00 AM
BACKUP_SCHEDULE_MONTHLY=0 2 1,15 * *

# Every 3 hours
BACKUP_SCHEDULE_REDIS=0 */3 * * *
```

Cron format: `minute hour day-of-month month day-of-week`

---

## Testing Backup Integrity

### Regular Testing Procedure

Perform monthly restore tests to verify backup integrity:

1. **Create test environment:**
   ```bash
   # Create test database
   docker run -d --name mongo-test -p 27018:27017 mongo:7
   ```

2. **Modify restore config to point to test DB:**
   ```bash
   export MONGODB_URI=mongodb://localhost:27018/traf3li-test
   ```

3. **Perform test restore:**
   ```bash
   npm run backup:restore -- \
     --backup=<latest-backup-key>
   ```

4. **Verify data integrity:**
   ```bash
   # Connect to test database
   mongosh mongodb://localhost:27018/traf3li-test

   # Check collections
   show collections

   # Verify document counts
   db.users.countDocuments()
   db.cases.countDocuments()

   # Spot-check data
   db.users.findOne()
   ```

5. **Clean up:**
   ```bash
   docker stop mongo-test
   docker rm mongo-test
   ```

### Automated Integrity Check

Create a test script `src/scripts/testBackupIntegrity.js`:

```javascript
require('dotenv').config();
const mongoose = require('mongoose');

async function testBackupIntegrity() {
  try {
    // Connect to test database
    await mongoose.connect(process.env.TEST_MONGODB_URI);

    // Run integrity checks
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);

    // Check for data in critical collections
    const criticalCollections = ['users', 'cases', 'invoices'];
    for (const collName of criticalCollections) {
      const count = await mongoose.connection.db.collection(collName).countDocuments();
      console.log(`${collName}: ${count} documents`);

      if (count === 0) {
        throw new Error(`Critical collection ${collName} is empty`);
      }
    }

    console.log('✅ Backup integrity test passed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Backup integrity test failed:', error);
    process.exit(1);
  }
}

testBackupIntegrity();
```

---

## Disaster Recovery

### Complete System Failure

In case of complete system failure, follow these steps:

#### 1. Provision New Server

```bash
# Install Node.js, MongoDB tools
sudo apt-get update
sudo apt-get install -y nodejs npm mongodb-org-tools

# Clone repository
git clone https://github.com/yourusername/traf3li-backend.git
cd traf3li-backend

# Install dependencies
npm install
```

#### 2. Configure Environment

```bash
# Copy and configure .env
cp .env.example .env
nano .env
```

#### 3. List Available Backups

```bash
npm run backup:restore -- --list
```

#### 4. Restore Latest Backup

```bash
# MongoDB
npm run backup:restore -- --backup=<latest-mongodb-backup-key>

# Redis (if needed)
# Download and restore Redis RDB file manually
```

#### 5. Verify Data Integrity

```bash
# Start server
npm start

# Check health endpoint
curl http://localhost:5000/health

# Verify critical data
mongosh mongodb://localhost:27017/traf3li
```

#### 6. Resume Operations

```bash
# Start backup scheduler
npm run backup:schedule
```

### Recovery Time Objective (RTO)

Expected recovery times:
- **Small Database** (<1GB): 5-10 minutes
- **Medium Database** (1-10GB): 10-30 minutes
- **Large Database** (>10GB): 30-60+ minutes

### Recovery Point Objective (RPO)

Data loss scenarios:
- **Daily Backups**: Up to 24 hours of data loss
- **With PITR**: Up to 15 minutes of data loss (if enabled)

---

## Troubleshooting

### Common Issues

#### 1. mongodump not found

**Error:**
```
/bin/sh: mongodump: command not found
```

**Solution:**
```bash
# Install MongoDB tools
sudo apt-get install mongodb-org-tools

# Or download from MongoDB website
curl -O https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2004-x86_64-100.9.0.deb
sudo dpkg -i mongodb-database-tools-*.deb
```

#### 2. S3 Access Denied

**Error:**
```
AccessDenied: Access Denied
```

**Solution:**
- Verify AWS credentials in `.env`
- Check IAM user permissions
- Verify S3 bucket exists and is in correct region

```bash
# Test AWS credentials
aws sts get-caller-identity

# List buckets
aws s3 ls
```

#### 3. Redis BGSAVE Timeout

**Error:**
```
Redis BGSAVE timed out after 60 seconds
```

**Solution:**
- Check Redis disk space
- Verify Redis is not under heavy load
- Increase timeout in `backupRedis.js` (maxAttempts)

```bash
# Check Redis status
redis-cli INFO persistence
```

#### 4. Email Notifications Not Sending

**Error:**
```
Failed to send notification
```

**Solution:**
- Verify `RESEND_API_KEY` is set
- Check email address format
- Review Resend dashboard for errors

```bash
# Test Resend API
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"from":"test@yourdomain.com","to":"test@example.com","subject":"Test","html":"<p>Test</p>"}'
```

#### 5. Backup File Too Large

**Error:**
```
Backup file size (XXX MB) exceeds maximum allowed size
```

**Solution:**
- Increase `BACKUP_MAX_FILE_SIZE` in `.env`
- Clean up old data in database
- Exclude unnecessary collections

```bash
# Set to 1GB
BACKUP_MAX_FILE_SIZE=1073741824
```

---

## Best Practices

### 1. Regular Testing

- Test restores **monthly** in non-production environment
- Verify backup completeness and data integrity
- Document restore time for capacity planning

### 2. Multiple Backup Locations

Store backups in multiple locations:
- Primary: AWS S3 (hot storage)
- Secondary: AWS S3 Glacier (cold storage, cost-effective)
- Tertiary: Different AWS region or cloud provider

```bash
# Add backup replication
aws s3 sync s3://traf3li-backups s3://traf3li-backups-dr --region us-east-1
```

### 3. Encryption

- Enable S3 server-side encryption (already configured)
- Use KMS keys for enhanced security
- Encrypt backups before upload for sensitive data

```bash
# Enable KMS encryption in .env
S3_SSE_ALGORITHM=aws:kms
S3_KMS_KEY_ID=arn:aws:kms:region:account:key/key-id
```

### 4. Monitoring

Set up alerts for:
- Backup failures
- Missing scheduled backups
- Backup size anomalies
- Storage quota warnings

```bash
# Example CloudWatch alarm (AWS CLI)
aws cloudwatch put-metric-alarm \
  --alarm-name traf3li-backup-failed \
  --alarm-description "Alert on backup failure" \
  --metric-name BackupFailures \
  --namespace Traf3li \
  --statistic Sum \
  --period 3600 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold
```

### 5. Documentation

Maintain runbook documentation:
- Backup schedule
- Restore procedures
- Key contacts
- Escalation paths

### 6. Access Control

- Limit backup access to authorized personnel only
- Use separate IAM users for backups
- Enable MFA for sensitive operations
- Audit backup access logs

```bash
# S3 bucket logging
aws s3api put-bucket-logging \
  --bucket traf3li-backups \
  --bucket-logging-status file://logging.json
```

### 7. Retention Strategy

Follow the 3-2-1 rule:
- **3** copies of data
- **2** different media types
- **1** copy off-site

Retention recommendations:
- Daily: 7 days
- Weekly: 4 weeks
- Monthly: 12 months
- Yearly: 3-7 years (compliance)

### 8. Performance Optimization

- Schedule backups during low-traffic periods
- Use incremental backups when possible
- Monitor backup duration trends
- Optimize compression levels for speed vs. size trade-off

---

## Support

For issues or questions:
- Create GitHub issue
- Email: support@traf3li.com
- Slack: #infrastructure channel

## License

Copyright © 2024 Traf3li. All rights reserved.
