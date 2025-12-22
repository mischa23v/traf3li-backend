# Field Tracking Utility

Odoo-style field change tracking for the chatter/message system. Automatically detect and log changes to documents with bilingual support (English/Arabic).

## Features

- 🔍 **Change Detection**: Compare document states and detect field changes
- 🌐 **Bilingual Support**: Field labels in English and Arabic
- 🎨 **Smart Formatting**: Format values based on field type (monetary, dates, booleans, etc.)
- 🔌 **Mongoose Plugin**: Automatic tracking with Mongoose plugins
- 💬 **Chatter Integration**: Create tracking messages in the ThreadMessage system
- 📝 **Type Support**: Handle all field types (char, integer, float, datetime, boolean, many2one, etc.)

## Installation

The utility is already integrated in the project. Import it from utils:

```javascript
const { trackChanges, createTrackingMessage, setupModelTracking } = require('../utils/fieldTracking');
```

## Quick Start

### 1. Manual Tracking

```javascript
const { trackChanges, createTrackingMessage } = require('../utils/fieldTracking');

// Compare two document states
const oldDoc = { status: 'draft', priority: 'low' };
const newDoc = { status: 'active', priority: 'high' };

const changes = trackChanges(oldDoc, newDoc, ['status', 'priority']);
// Returns: [{ field: 'status', old_value: 'draft', new_value: 'active', ... }]

// Create a tracking message
await createTrackingMessage(changes, 'Case', caseId, {
  userId: req.userID,
  firmId: req.firmId
});
```

### 2. Automatic Tracking (Mongoose Plugin)

```javascript
const { setupModelTracking } = require('../utils/fieldTracking');

// Add to your schema
caseSchema.plugin(setupModelTracking, {
  modelName: 'Case',
  enabled: true
});

// Now changes are tracked automatically on save
const caseDoc = await Case.findById(caseId);
caseDoc.status = 'active'; // This change will be tracked
await caseDoc.save(); // Tracking message created automatically
```

## API Reference

### `trackChanges(oldDoc, newDoc, trackedFields)`

Compare two documents and detect changes.

**Parameters:**
- `oldDoc` (Object): Previous document state
- `newDoc` (Object): New document state
- `trackedFields` (Array|String): Fields to track, or `'all'` for all fields

**Returns:** Array of change objects:
```javascript
[{
  field: 'status',
  field_desc: 'Status',
  field_desc_ar: 'الحالة',
  field_type: 'selection',
  old_value: 'draft',
  new_value: 'active',
  old_value_char: 'draft',
  new_value_char: 'active'
}]
```

**Example:**
```javascript
// Track specific fields
const changes = trackChanges(oldCase, newCase, ['status', 'priority']);

// Track all changed fields
const changes = trackChanges(oldCase, newCase, 'all');
```

---

### `getFieldDescription(modelName, fieldName)`

Get bilingual field labels.

**Parameters:**
- `modelName` (String): Model name (e.g., 'Case', 'Client')
- `fieldName` (String): Field name (e.g., 'status', 'assignedTo')

**Returns:** Object with bilingual labels:
```javascript
{ en: 'Status', ar: 'الحالة' }
```

**Example:**
```javascript
const label = getFieldDescription('Case', 'status');
console.log(label.en); // "Status"
console.log(label.ar); // "الحالة"
```

---

### `formatValue(value, fieldType, fieldConfig)`

Format a value for display based on its type.

**Parameters:**
- `value` (Any): Value to format
- `fieldType` (String): Field type (char, integer, float, datetime, boolean, monetary, many2one)
- `fieldConfig` (Object): Optional field configuration

**Returns:** Formatted string

**Example:**
```javascript
formatValue(50000, 'monetary'); // "50000.00 SAR"
formatValue(true, 'boolean'); // "Yes"
formatValue(new Date(), 'datetime'); // "2025-12-22T10:30:00.000Z"
formatValue({ firstName: 'Ahmed', lastName: 'Ali' }, 'many2one'); // "Ahmed Ali"
```

---

### `getTrackedFields(modelName)`

Get tracked fields configuration for a model.

**Parameters:**
- `modelName` (String): Model name

**Returns:** Array of field configurations:
```javascript
[
  { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
  { name: 'priority', type: 'selection', label: { en: 'Priority', ar: 'الأولوية' } }
]
```

**Example:**
```javascript
const fields = getTrackedFields('Case');
console.log(fields); // Array of tracked field configs
```

---

### `createTrackingMessage(changes, modelName, recordId, context)`

Create a tracking message in the chatter system.

**Parameters:**
- `changes` (Array): Array of changes from `trackChanges()`
- `modelName` (String): Model name
- `recordId` (String|ObjectId): Record ID
- `context` (Object): Request context with userId, firmId

**Returns:** Promise<Object|null> - Created message or null

**Example:**
```javascript
const context = {
  userId: req.userID,
  firmId: req.firmId
};

const message = await createTrackingMessage(
  changes,
  'Case',
  caseId,
  context
);
```

---

### `setupModelTracking(schema, options)`

Mongoose plugin for automatic change tracking.

**Parameters:**
- `schema` (Schema): Mongoose schema
- `options` (Object):
  - `modelName` (String): Model name (required)
  - `trackedFields` (Array): Specific fields to track (optional)
  - `enabled` (Boolean): Enable/disable tracking (default: true)

**Example:**
```javascript
caseSchema.plugin(setupModelTracking, {
  modelName: 'Case',
  // Optional: track specific fields only
  trackedFields: ['status', 'priority'],
  enabled: process.env.TRACKING_ENABLED !== 'false'
});
```

---

### `TRACKED_MODELS`

Configuration object defining tracked fields per model.

**Structure:**
```javascript
{
  Case: [
    { name: 'status', type: 'selection', label: { en: 'Status', ar: 'الحالة' } },
    { name: 'priority', type: 'selection', label: { en: 'Priority', ar: 'الأولوية' } }
  ],
  Client: [...],
  Invoice: [...]
}
```

**Supported Models:**
- Case
- Client
- Invoice
- Lead
- Task
- Expense
- Employee
- LeaveRequest
- Payment

## Field Types

The utility supports the following field types:

| Type | Description | Example |
|------|-------------|---------|
| `char` | String/Text | "Draft", "Active" |
| `text` | Long text | "This is a long description..." |
| `integer` | Whole number | 42, 100 |
| `float` | Decimal number | 3.14, 99.99 |
| `monetary` | Currency value | "50000.00 SAR" |
| `boolean` | True/False | "Yes", "No" |
| `date` | Date only | "2025-12-22" |
| `datetime` | Date and time | "2025-12-22T10:30:00.000Z" |
| `selection` | Enum/Choice | "draft", "active", "closed" |
| `many2one` | Reference to another doc | User, Client |
| `many2many` | Multiple references | Tags, Categories |
| `one2many` | One-to-many relation | Line items |

## Usage Patterns

### Pattern 1: Controller Integration

```javascript
// In your controller
const { trackChanges, createTrackingMessage } = require('../utils/fieldTracking');

async function updateCase(req, res) {
  const { caseId } = req.params;
  const updates = req.body;

  // Fetch existing document
  const caseDoc = await Case.findById(caseId);

  // Track changes
  const changes = trackChanges(
    caseDoc,
    { ...caseDoc.toObject(), ...updates },
    ['status', 'priority', 'lawyerId']
  );

  // Apply updates
  Object.assign(caseDoc, updates);
  await caseDoc.save();

  // Create tracking message
  if (changes.length > 0) {
    await createTrackingMessage(changes, 'Case', caseId, {
      userId: req.userID,
      firmId: req.firmId
    });
  }

  res.json({ success: true, data: caseDoc, changes });
}
```

### Pattern 2: Service Layer

```javascript
// In your service
class CaseService {
  async updateCase(caseId, updates, context) {
    const caseDoc = await Case.findById(caseId);

    const changes = trackChanges(caseDoc, { ...caseDoc.toObject(), ...updates });

    Object.assign(caseDoc, updates);
    await caseDoc.save();

    if (changes.length > 0) {
      await createTrackingMessage(changes, 'Case', caseId, context);
    }

    return { case: caseDoc, changes };
  }
}
```

### Pattern 3: Automatic with Plugin

```javascript
// In your model file
const { setupModelTracking } = require('../utils/fieldTracking');

const caseSchema = new mongoose.Schema({
  status: String,
  priority: String,
  // ... other fields
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm' }
});

// Add plugin for automatic tracking
caseSchema.plugin(setupModelTracking, {
  modelName: 'Case'
});

// Now all saves are tracked automatically
```

### Pattern 4: Track All Changes

```javascript
// Track all changed fields (useful for audit logs)
const changes = trackChanges(oldDoc, newDoc, 'all');

// Filter to exclude certain fields
const filteredChanges = changes.filter(change =>
  !['createdAt', 'updatedAt', '__v'].includes(change.field)
);
```

## Adding New Models

To add tracking for a new model:

1. Add configuration to `TRACKED_MODELS`:

```javascript
// In fieldTracking.js
TRACKED_MODELS.YourModel = [
  {
    name: 'fieldName',
    type: 'fieldType',
    label: { en: 'English Label', ar: 'Arabic Label' }
  }
];
```

2. Use the plugin or manual tracking in your model/controller.

## Configuration Options

### Tracked Fields Configuration

Each field configuration has the following structure:

```javascript
{
  name: 'status',           // Field name (required)
  type: 'selection',        // Field type (required)
  label: {                  // Bilingual labels (required)
    en: 'Status',
    ar: 'الحالة'
  },
  ref: 'User'              // For many2one fields (optional)
}
```

### Context Object

The context object should include:

```javascript
{
  userId: '507f1f77bcf86cd799439011',  // User making the change
  firmId: '507f1f77bcf86cd799439012',  // Firm ID (multi-tenancy)
  user: {                               // Optional: full user object
    email: 'user@example.com',
    firstName: 'Ahmed',
    lastName: 'Ali'
  }
}
```

## Best Practices

1. **Use Specific Field Lists**: Track only important fields to avoid noise
   ```javascript
   // Good
   trackChanges(oldDoc, newDoc, ['status', 'priority', 'assignedTo'])

   // Avoid unless needed
   trackChanges(oldDoc, newDoc, 'all')
   ```

2. **Set updatedBy Field**: Always set who made the change
   ```javascript
   caseDoc.updatedBy = req.userID;
   await caseDoc.save();
   ```

3. **Use Plugin for Models**: Automatic tracking is more reliable
   ```javascript
   schema.plugin(setupModelTracking, { modelName: 'Case' });
   ```

4. **Handle Errors Gracefully**: Tracking failures shouldn't break operations
   ```javascript
   try {
     await createTrackingMessage(changes, 'Case', caseId, context);
   } catch (error) {
     logger.error('Tracking failed:', error);
     // Continue with operation
   }
   ```

5. **Populate References**: For many2one fields, populate before tracking
   ```javascript
   const caseDoc = await Case.findById(caseId).populate('lawyerId');
   ```

## Troubleshooting

### Changes Not Being Tracked

- Ensure `updatedBy` or `userId` field is set in the document
- Check that `firmId` is present (for multi-tenancy)
- Verify ThreadMessageService is available
- Check model name is in `TRACKED_MODELS`

### Plugin Not Working

- Ensure plugin is added before model compilation
- Check that `modelName` option is provided
- Verify `updatedBy` field exists in schema
- Make sure you're not creating new documents (plugin only tracks updates)

### Incorrect Field Labels

- Add/update field configuration in `TRACKED_MODELS`
- Ensure bilingual labels are provided
- Check field name matches exactly

## Integration with ThreadMessage Service

The field tracking utility integrates seamlessly with the ThreadMessage service:

```javascript
// fieldTracking calls ThreadMessageService.logFieldChanges internally
await createTrackingMessage(changes, 'Case', caseId, context);

// This creates a message like:
{
  res_model: 'Case',
  res_id: caseId,
  message_type: 'notification',
  subtype: 'tracking',
  body: '<ul>
    <li><strong>Status:</strong> draft → active</li>
    <li><strong>Priority:</strong> low → high</li>
  </ul>',
  tracking_value_ids: [...],
  author_id: userId
}
```

## Performance Considerations

- **Bulk Updates**: For bulk operations, disable plugin temporarily
- **Large Documents**: Track specific fields instead of 'all'
- **High Frequency**: Consider debouncing or batching tracking messages
- **Database Load**: Tracking adds one additional query per save operation

## Future Enhancements

Potential improvements:

- [ ] Add support for many2many field tracking
- [ ] Include computed field tracking
- [ ] Add field-level permissions for tracking
- [ ] Support custom formatters per field
- [ ] Add tracking history aggregation
- [ ] Support for nested object field tracking

## Related Files

- `/src/services/threadMessage.service.js` - Chatter/message service
- `/src/models/threadMessage.model.js` - ThreadMessage model
- `/src/utils/fieldTracking.example.js` - Usage examples

## Support

For issues or questions:
1. Check the example file: `fieldTracking.example.js`
2. Review the ThreadMessage service documentation
3. Check application logs for tracking errors
4. Ensure all dependencies are properly configured
