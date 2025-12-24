# Reporting & BI Requirements Analysis

## 1. Self-Serve Report Builder

### Key Features
- Drag-and-drop interface
- Multiple data source combination
- No SQL required
- Template library
- AI-assisted creation

### Components
```javascript
reportDefinition: {
  name: String,
  type: 'table' | 'chart' | 'pivot' | 'dashboard',
  dataSources: [{
    model: String,
    alias: String,
    joins: [{
      to: String,
      on: Object
    }]
  }],
  columns: [{
    field: String,
    alias: String,
    aggregate: String, // sum, avg, count, min, max
    format: Object
  }],
  filters: [{
    field: String,
    operator: String,
    value: Any,
    dynamic: Boolean // User-supplied at runtime
  }],
  groupBy: [String],
  orderBy: [{ field: String, direction: String }],
  limit: Number
}
```

## 2. Cohort Analysis

### Purpose
Track groups of users based on shared characteristics over time.

### Metrics
- Retention rate by cohort
- Revenue by acquisition period
- Churn patterns
- Lifetime value

### Implementation
```javascript
cohortAnalysis: {
  cohortField: 'createdAt', // or any date field
  period: 'month' | 'week' | 'quarter',
  metric: 'retention' | 'revenue' | 'activity',
  segments: [{ field: String, values: [String] }]
}
```

## 3. Retention Views

### Visualizations
- Retention curves (line chart)
- Retention heatmaps
- Cohort tables
- Trend analysis

### Calculation
```javascript
retentionRate = (usersActiveInPeriod / usersInCohort) * 100
```

## 4. Funnel Analytics

### Features
- Multi-step tracking
- Drop-off identification
- Conversion rates
- Time between steps
- Segment comparison

### Implementation
```javascript
funnelDefinition: {
  name: String,
  steps: [{
    name: String,
    filter: Object, // Conditions for step completion
    orderIndex: Number
  }],
  timeWindow: Number, // Days to complete funnel
  segments: [String] // Compare by segment
}
```

## 5. Scheduled Delivery

### Options
- On-demand
- Daily, weekly, monthly
- Custom frequencies
- Event-triggered

### Delivery Channels
- Email (PDF, Excel attachment)
- Slack/Teams
- Cloud storage
- SFTP
- Dashboard embed

### Implementation
```javascript
reportSchedule: {
  reportId: ObjectId,
  frequency: String,
  dayOfWeek: Number,
  dayOfMonth: Number,
  time: String,
  timezone: String,
  recipients: [{
    type: 'email' | 'slack' | 'teams',
    target: String
  }],
  format: 'pdf' | 'excel' | 'csv',
  filters: Object, // Applied at generation
  active: Boolean
}
```

## 6. Export Formats

### Supported
- PDF (formatted)
- Excel (.xlsx)
- CSV
- JSON
- HTML
- PowerPoint

### Features
- Encryption (PDF)
- Compression (ZIP)
- Data masking
- Audit logging

---

## Traf3li Current State

### ✅ Implemented
- Report model (basic)
- AnalyticsReport model
- SavedReport model
- PreparedReport model
- Dashboard widgets
- Some HR/CRM reports

### ⚠️ Partial
- Report scheduling (via cron)
- Export (PDF, Excel)
- Basic filtering

### ❌ Missing
- Self-serve report builder UI
- Drag-and-drop interface
- Cohort analysis
- Retention views
- Funnel analytics
- AI-assisted report creation
- Multi-format scheduled delivery
- Report sharing/collaboration

---

## Recommendations

### Priority 1: Report Builder Schema
```javascript
const ReportBuilderSchema = new Schema({
  name: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['table', 'chart', 'pivot', 'funnel', 'cohort']
  },
  configuration: {
    dataSources: [{
      model: String,
      alias: String,
      joins: [Object]
    }],
    columns: [{
      field: String,
      label: String,
      aggregate: String,
      format: Object,
      sortable: Boolean
    }],
    filters: [{
      field: String,
      operator: String,
      value: Schema.Types.Mixed,
      userInput: Boolean
    }],
    groupBy: [String],
    visualization: {
      type: String,
      options: Object
    }
  },
  schedule: {
    enabled: Boolean,
    frequency: String,
    recipients: [Object],
    format: String
  },
  sharing: {
    public: Boolean,
    sharedWith: [ObjectId],
    embedToken: String
  },
  createdBy: ObjectId,
  firm: ObjectId
});
```

### Priority 2: Funnel Service
```javascript
class FunnelService {
  async analyzeFunnel(definition, dateRange) {
    const steps = [];
    for (const step of definition.steps) {
      const count = await this.countStepCompletion(step, dateRange);
      const conversionRate = this.calculateConversion(count, prevCount);
      steps.push({ ...step, count, conversionRate });
    }
    return { steps, overallConversion };
  }
}
```

### Priority 3: Cohort Service
```javascript
class CohortService {
  async generateCohortMatrix(config) {
    const cohorts = await this.groupByCohort(config);
    const matrix = [];
    for (const cohort of cohorts) {
      const retention = await this.calculateRetention(cohort, config.periods);
      matrix.push({ cohort: cohort.period, ...retention });
    }
    return matrix;
  }
}
```

### Priority 4: Scheduled Reports Job
```javascript
// Add to cron jobs
async function processScheduledReports() {
  const dueReports = await ReportSchedule.find({
    active: true,
    nextRun: { $lte: new Date() }
  });

  for (const schedule of dueReports) {
    const report = await generateReport(schedule.reportId);
    const file = await exportReport(report, schedule.format);
    await deliverReport(file, schedule.recipients);
    await updateNextRun(schedule);
  }
}
```
