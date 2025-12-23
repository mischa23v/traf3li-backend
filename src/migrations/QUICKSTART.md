# Migration System - Quick Start Guide

Get up and running with the Migration Registry System in 5 minutes.

## What You Get

A complete database migration system with:
- ✅ Automatic tracking of all migrations
- ✅ Checksum validation to detect file modifications
- ✅ Rollback support (revert migrations)
- ✅ Status reporting
- ✅ Backward compatible with existing migrations

## Files Created

```
✓ src/models/migrationLog.model.js          - Migration tracking model
✓ src/services/migration.service.js         - Migration service API
✓ src/scripts/migrate.js                    - CLI tool
✓ src/models/index.js                       - Updated with MigrationLog export
✓ src/migrations/example-migration.js       - Modern pattern example
✓ src/migrations/example-add-indexes.js     - Index creation example
✓ src/migrations/example-legacy-migration.js - Legacy pattern example
✓ src/migrations/README.md                  - Full documentation
✓ src/migrations/QUICKSTART.md              - This file
```

## Quick Commands

```bash
# Show help
node src/scripts/migrate.js help

# Check status of all migrations
node src/scripts/migrate.js status

# Run all pending migrations
node src/scripts/migrate.js up

# Preview what would run (dry-run mode)
node src/scripts/migrate.js up --dry-run

# Run a specific migration
node src/scripts/migrate.js run my-migration.js

# Revert a migration
node src/scripts/migrate.js down my-migration.js

# Validate migrations (check for modifications)
node src/scripts/migrate.js validate

# View migration history
node src/scripts/migrate.js history
```

## Creating Your First Migration

### Step 1: Create a migration file

Create a new file in `src/migrations/`:

```bash
touch src/migrations/002-add-my-feature.js
```

### Step 2: Write the migration

**Modern Pattern** (Recommended - supports rollback):

```javascript
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const up = async () => {
    logger.info('Applying migration...');

    const MyModel = require('../models/myModel.model');

    // Your migration logic
    await MyModel.updateMany(
        { newField: { $exists: false } },
        { $set: { newField: 'default-value' } }
    );

    logger.info('✓ Migration completed');
};

const down = async () => {
    logger.info('Reverting migration...');

    const MyModel = require('../models/myModel.model');

    // Your revert logic
    await MyModel.updateMany(
        { newField: { $exists: true } },
        { $unset: { newField: '' } }
    );

    logger.info('✓ Revert completed');
};

module.exports = { up, down };
```

**Legacy Pattern** (For compatibility with existing migrations):

```javascript
const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('../utils/logger');

const connectDB = async () => {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
};

const migrate = async () => {
    logger.info('Running migration...');

    const MyModel = require('../models/myModel.model');

    await MyModel.updateMany(
        { newField: { $exists: false } },
        { $set: { newField: 'default-value' } }
    );

    logger.info('✓ Migration completed');
};

const run = async () => {
    try {
        await connectDB();
        await migrate();
        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
};

if (require.main === module) {
    run();
}

module.exports = { up: migrate };
```

### Step 3: Test with dry-run

```bash
node src/scripts/migrate.js up --dry-run
```

### Step 4: Run the migration

```bash
node src/scripts/migrate.js up
```

### Step 5: Verify

```bash
node src/scripts/migrate.js status
```

## Common Patterns

### Add a Field to Collection

```javascript
const up = async () => {
    const Model = require('../models/model.model');
    await Model.updateMany(
        { newField: { $exists: false } },
        { $set: { newField: 'default' } }
    );
};
```

### Create an Index

```javascript
const up = async () => {
    const db = mongoose.connection.db;
    await db.collection('mycollection').createIndex(
        { field: 1 },
        { name: 'idx_field', background: true }
    );
};
```

### Transform Data

```javascript
const up = async () => {
    const Model = require('../models/model.model');
    const docs = await Model.find({ oldField: { $exists: true } });

    for (const doc of docs) {
        doc.newField = transformFunction(doc.oldField);
        await doc.save();
    }
};
```

### Batch Processing (Large Datasets)

```javascript
const up = async () => {
    const Model = require('../models/model.model');

    const total = await Model.countDocuments({ needsUpdate: true });
    const batchSize = 100;
    let processed = 0;

    while (processed < total) {
        await Model.updateMany(
            { needsUpdate: true },
            { $set: { updated: true } },
            { limit: batchSize }
        );

        processed += batchSize;
        logger.info(`Processed ${Math.min(processed, total)}/${total}`);
    }
};
```

## Using the Service API

In your application code:

```javascript
const migrationService = require('./services/migration.service');

// Run migrations on app startup
await migrationService.runMigrations();

// Check status
const status = await migrationService.getMigrationStatus();
console.log(`Pending: ${status.summary.pending}`);

// Validate integrity
const validation = await migrationService.validateMigrations();
if (!validation.valid) {
    console.error('Migration integrity check failed!');
}
```

## Integration Examples

### Add to package.json

```json
{
  "scripts": {
    "migrate": "node src/scripts/migrate.js up",
    "migrate:status": "node src/scripts/migrate.js status",
    "migrate:validate": "node src/scripts/migrate.js validate",
    "migrate:dry-run": "node src/scripts/migrate.js up --dry-run"
  }
}
```

Then run:

```bash
npm run migrate
npm run migrate:status
```

### Deployment Script

```bash
#!/bin/bash
# deploy.sh

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Running migrations..."
node src/scripts/migrate.js up

if [ $? -eq 0 ]; then
    echo "✓ Migrations completed successfully"
    echo "Restarting application..."
    pm2 restart app
else
    echo "✗ Migrations failed. Aborting deployment."
    exit 1
fi
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    image: my-app
    command: >
      sh -c "
        node src/scripts/migrate.js up &&
        npm start
      "
    environment:
      - MONGODB_URI=mongodb://mongo:27017/mydb
```

### GitHub Actions

```yaml
- name: Run Database Migrations
  env:
    MONGODB_URI: ${{ secrets.MONGODB_URI }}
  run: |
    node src/scripts/migrate.js validate
    node src/scripts/migrate.js up
```

## Best Practices

### ✅ DO

- Name migrations clearly: `001-add-user-email.js`
- Test migrations on staging first
- Use `--dry-run` to preview changes
- Write reversible migrations (include `down` function)
- Process large datasets in batches
- Backup database before running migrations
- Track who runs migrations: `--by admin@example.com`

### ❌ DON'T

- Modify migration files after they've been applied
- Run migrations directly on production without testing
- Skip writing `down` functions for reversibility
- Process millions of records in one operation
- Forget to handle edge cases (null values, missing fields)

## Troubleshooting

### Migration failed partway through

1. Check status: `node src/scripts/migrate.js status`
2. View error in the migration log
3. Fix the migration file
4. Reset status in database:
   ```javascript
   db.migrationlogs.updateOne(
       { name: 'failed-migration.js' },
       { $set: { status: 'pending' } }
   )
   ```
5. Retry: `node src/scripts/migrate.js run failed-migration.js`

### Modified migration detected

**Never modify migrations after they're applied!** Instead:

1. Create a new migration with the changes
2. Document why in comments
3. Run the new migration

If modification was accidental:
```bash
git checkout -- src/migrations/modified-file.js
node src/scripts/migrate.js validate
```

### Check what will run

Before running migrations in production:

```bash
# Dry run
node src/scripts/migrate.js up --dry-run

# Check status
node src/scripts/migrate.js status

# Validate integrity
node src/scripts/migrate.js validate
```

## Migration Model Schema

Every migration execution is logged with:

```javascript
{
  name: 'migration-file-name.js',
  version: '1.0.0',
  status: 'applied',              // or 'failed', 'reverted', 'pending'
  appliedAt: Date,
  duration: 1234,                 // milliseconds
  checksum: 'sha256hash...',      // File integrity hash
  appliedBy: 'admin@example.com', // Who ran it
  error: null                     // Error message if failed
}
```

Query the logs:

```javascript
const MigrationLog = require('./models/migrationLog.model');

// Get all applied migrations
const applied = await MigrationLog.find({ status: 'applied' });

// Check if specific migration was applied
const isApplied = await MigrationLog.isApplied('my-migration.js');

// Get failed migrations
const failed = await MigrationLog.find({ status: 'failed' });
```

## Next Steps

1. **Read the full documentation**: See `README.md` for comprehensive guides
2. **Review examples**: Check the example migration files
3. **Test on staging**: Run migrations on non-production first
4. **Integrate with CI/CD**: Automate migration execution in your pipeline
5. **Monitor regularly**: Use `validate` command to check integrity

## Support

- 📖 Full Documentation: `src/migrations/README.md`
- 💡 Examples: See `example-*.js` files
- 🔍 Status Check: `node src/scripts/migrate.js status`
- ✅ Validation: `node src/scripts/migrate.js validate`

---

**Ready to get started?** Run your first migration:

```bash
node src/scripts/migrate.js status
```
