# Migration Registry System

A comprehensive database migration system for MongoDB/Mongoose with tracking, validation, and rollback capabilities.

## Overview

The Migration Registry System provides:
- **Automated Migration Tracking**: All migrations are logged in the database
- **Checksum Validation**: Detects if migration files have been modified after execution
- **Rollback Support**: Revert migrations with the `down` function
- **Status Reporting**: View the state of all migrations
- **Integrity Validation**: Detect missing or modified migration files

## Files Created

```
src/
├── models/
│   ├── migrationLog.model.js       # Migration log model
│   └── index.js                     # Updated to export MigrationLog
├── services/
│   └── migration.service.js         # Migration service with business logic
├── scripts/
│   └── migrate.js                   # CLI script for running migrations
└── migrations/
    ├── README.md                    # This file
    ├── example-migration.js         # Example: Basic migration pattern
    └── example-add-indexes.js       # Example: Adding database indexes
```

## Migration Model Schema

```javascript
{
  name: String,              // Migration filename (unique)
  version: String,           // Version number
  status: String,            // 'applied', 'failed', 'reverted', 'pending'
  appliedAt: Date,           // When migration was applied
  revertedAt: Date,          // When migration was reverted
  duration: Number,          // Execution time in milliseconds
  error: String,             // Error message if failed
  checksum: String,          // SHA-256 hash of migration file
  appliedBy: String,         // User/system that ran migration
  revertedBy: String,        // User/system that reverted migration
  metadata: Object           // Additional metadata
}
```

## CLI Usage

### Run All Pending Migrations

```bash
node src/scripts/migrate.js up
```

Options:
- `--dry-run`: Preview what would happen without executing
- `--by <name>`: Specify who is running the migration

```bash
# Dry run to preview
node src/scripts/migrate.js up --dry-run

# Run migrations as a specific user
node src/scripts/migrate.js up --by "admin@example.com"
```

### Run a Specific Migration

```bash
node src/scripts/migrate.js run example-migration.js
```

### Revert a Migration

```bash
node src/scripts/migrate.js down example-migration.js
```

### Check Migration Status

```bash
node src/scripts/migrate.js status
```

Output shows:
- Total migrations
- Applied/Pending/Failed/Reverted counts
- List of all migrations with status
- Warning for modified migrations

### Validate Migrations

Check for modified or missing migration files:

```bash
node src/scripts/migrate.js validate
```

This detects:
- **Modified migrations**: Files with different checksums than when applied
- **Missing migrations**: Applied migrations whose files no longer exist

### View Migration History

```bash
node src/scripts/migrate.js history
```

### Help

```bash
node src/scripts/migrate.js help
```

## Writing Migrations

### Basic Migration Pattern

Create a new file in `src/migrations/` with a descriptive name:

```javascript
// src/migrations/001-add-user-email-index.js

const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Apply migration
 */
const up = async () => {
    logger.info('Adding email index to users');

    const User = require('../models/user.model');

    // Your migration logic here
    await User.collection.createIndex(
        { email: 1 },
        { unique: true, sparse: true }
    );

    logger.info('✓ Email index created');
};

/**
 * Revert migration
 */
const down = async () => {
    logger.info('Removing email index from users');

    const User = require('../models/user.model');

    // Your revert logic here
    await User.collection.dropIndex('email_1');

    logger.info('✓ Email index removed');
};

module.exports = { up, down };
```

### Migration Naming Convention

Recommended naming patterns:
- `001-description.js`, `002-description.js` (sequential numbers)
- `2024-01-15-description.js` (date-based)
- `v1.0.0-description.js` (version-based)
- `add-user-preferences.js` (descriptive)

Files are executed in alphabetical order, so choose a naming pattern that ensures correct ordering.

### Migration Best Practices

1. **Always export `up` and `down` functions**
   ```javascript
   module.exports = { up, down };
   ```

2. **Use async/await**
   ```javascript
   const up = async () => {
       await SomeModel.updateMany(...);
   };
   ```

3. **Log progress**
   ```javascript
   logger.info('Starting migration...');
   logger.info(`Updated ${count} records`);
   logger.info('✓ Migration completed');
   ```

4. **Handle errors appropriately**
   ```javascript
   try {
       // migration logic
   } catch (error) {
       logger.error('Migration failed:', error);
       throw error;
   }
   ```

5. **Process large datasets in batches**
   ```javascript
   const batchSize = 100;
   let processed = 0;

   while (processed < total) {
       await Model.updateMany(query, update, { limit: batchSize });
       processed += batchSize;
       logger.info(`Processed ${processed}/${total}`);
   }
   ```

6. **Make migrations idempotent**
   ```javascript
   // Check if migration already applied
   const count = await Model.countDocuments({ newField: { $exists: false } });
   if (count === 0) {
       logger.info('No documents need migration');
       return;
   }
   ```

7. **Test both up and down**
   - Ensure `down` fully reverts changes made by `up`
   - Test on a staging environment first

## Migration Examples

### Example 1: Add Field to Collection

```javascript
const up = async () => {
    const User = require('../models/user.model');

    await User.updateMany(
        { preferences: { $exists: false } },
        { $set: { preferences: { theme: 'light', language: 'en' } } }
    );
};

const down = async () => {
    const User = require('../models/user.model');

    await User.updateMany(
        { preferences: { $exists: true } },
        { $unset: { preferences: '' } }
    );
};
```

### Example 2: Data Transformation

```javascript
const up = async () => {
    const Client = require('../models/client.model');

    // Transform phoneNumber format
    const clients = await Client.find({ phoneNumber: { $exists: true } });

    for (const client of clients) {
        // Remove spaces and dashes
        const normalized = client.phoneNumber.replace(/[\s-]/g, '');
        await Client.updateOne(
            { _id: client._id },
            { $set: { phoneNumber: normalized } }
        );
    }
};

const down = async () => {
    logger.warn('Phone number transformation cannot be reverted');
    // Some migrations cannot be fully reverted
};
```

### Example 3: Add Database Index

```javascript
const up = async () => {
    const db = mongoose.connection.db;

    await db.collection('cases').createIndex(
        { firmId: 1, status: 1, createdAt: -1 },
        { name: 'idx_firm_status_created', background: true }
    );
};

const down = async () => {
    const db = mongoose.connection.db;

    await db.collection('cases').dropIndex('idx_firm_status_created');
};
```

### Example 4: Migrate to New Schema

```javascript
const up = async () => {
    const Invoice = require('../models/invoice.model');

    // Migrate from single 'address' string to 'address' object
    const invoices = await Invoice.find({
        address: { $type: 'string' }
    });

    for (const invoice of invoices) {
        await Invoice.updateOne(
            { _id: invoice._id },
            {
                $set: {
                    address: {
                        street: invoice.address,
                        city: '',
                        country: 'Saudi Arabia'
                    }
                }
            }
        );
    }
};

const down = async () => {
    const Invoice = require('../models/invoice.model');

    const invoices = await Invoice.find({
        'address.street': { $exists: true }
    });

    for (const invoice of invoices) {
        await Invoice.updateOne(
            { _id: invoice._id },
            { $set: { address: invoice.address.street } }
        );
    }
};
```

## Service API

Use the migration service programmatically:

```javascript
const migrationService = require('./services/migration.service');

// Run all pending migrations
const result = await migrationService.runMigrations({
    dryRun: false,
    appliedBy: 'system'
});

// Run specific migration
await migrationService.runMigration('add-user-fields.js', {
    appliedBy: 'admin@example.com'
});

// Revert migration
await migrationService.revertMigration('add-user-fields.js', {
    revertedBy: 'admin@example.com'
});

// Get status
const status = await migrationService.getMigrationStatus();
console.log(`Applied: ${status.summary.applied}`);
console.log(`Pending: ${status.summary.pending}`);

// Validate migrations
const validation = await migrationService.validateMigrations();
if (!validation.valid) {
    console.error('Modified migrations detected:', validation.issues.modified);
}

// Get history
const history = await migrationService.getMigrationHistory({ limit: 20 });
```

## Integration with CI/CD

### Run Migrations on Deploy

Add to your deployment script:

```bash
#!/bin/bash
# deploy.sh

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run database migrations
node src/scripts/migrate.js up

# Restart application
pm2 restart app
```

### Pre-deployment Validation

```bash
#!/bin/bash
# pre-deploy.sh

# Validate migrations before deploying
node src/scripts/migrate.js validate

if [ $? -ne 0 ]; then
    echo "Migration validation failed. Aborting deployment."
    exit 1
fi

# Show pending migrations
node src/scripts/migrate.js status
```

### GitHub Actions Example

```yaml
name: Run Migrations
on:
  push:
    branches: [ main ]

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        env:
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
        run: node src/scripts/migrate.js up
```

## Troubleshooting

### Migration Failed Partway Through

If a migration fails after partially executing:

1. Check the error in the migration log:
   ```bash
   node src/scripts/migrate.js status
   ```

2. Fix the issue in your migration file

3. The migration will be marked as 'failed' and won't run again automatically

4. To retry, first update the status in the database:
   ```javascript
   db.migrationlogs.updateOne(
       { name: 'failed-migration.js' },
       { $set: { status: 'pending' } }
   )
   ```

5. Run the migration again:
   ```bash
   node src/scripts/migrate.js run failed-migration.js
   ```

### Modified Migration Detection

If you see a "modified migration" warning:

1. **Never modify migrations after they've been applied** - this is a red flag
2. If modification was intentional (e.g., fixing a bug):
   - Create a new migration instead of modifying the old one
   - Document why in comments
3. If modification was accidental:
   - Revert the file to its original state
   - Use git to restore: `git checkout -- src/migrations/modified-file.js`

### Migration Stuck

If a migration seems stuck:

1. Check MongoDB for long-running operations:
   ```javascript
   db.currentOp({ "active": true })
   ```

2. Consider adding `background: true` option when creating indexes

3. Process large updates in smaller batches

## Security Considerations

1. **Backup Before Migrations**
   - Always backup your database before running migrations
   - Use `--dry-run` to preview changes

2. **Access Control**
   - Restrict who can run migrations (use `--by` to track)
   - Audit migration logs regularly

3. **Validation**
   - Regularly run `validate` command
   - Set up alerts for modified migrations

4. **Testing**
   - Test migrations on staging environment first
   - Ensure `down` function works correctly

## Performance Tips

1. **Use Background Indexes**
   ```javascript
   await collection.createIndex({ field: 1 }, { background: true });
   ```

2. **Batch Large Updates**
   ```javascript
   const batchSize = 100;
   // Process in batches instead of all at once
   ```

3. **Use Bulk Operations**
   ```javascript
   const bulkOps = documents.map(doc => ({
       updateOne: {
           filter: { _id: doc._id },
           update: { $set: { field: value } }
       }
   }));
   await Model.bulkWrite(bulkOps);
   ```

4. **Run During Off-Peak Hours**
   - Schedule migrations when database load is low
   - Monitor system resources during execution

## Support

For issues or questions:
1. Check migration logs: `node src/scripts/migrate.js status`
2. Validate migrations: `node src/scripts/migrate.js validate`
3. Review migration history: `node src/scripts/migrate.js history`
4. Check application logs in `logs/` directory
