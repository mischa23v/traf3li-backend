# Case Lifecycle Temporal Workflow

## Overview

The Case Lifecycle Workflow is a long-running Temporal workflow designed to manage the complete lifecycle of legal cases through configurable stage-based templates. It supports multi-month execution, automated reminders, deadline tracking, and court date management.

## Features

- **Stage-Based Progression**: Cases move through customizable stages defined in workflow templates
- **Requirement Tracking**: Track and validate completion of requirements for each stage
- **Deadline Management**: Automated reminders for upcoming deadlines (7, 3, and 1 day before)
- **Court Date Reminders**: Automatic notifications 48 and 24 hours before court dates
- **Workflow Control**: Pause/resume workflows for case holds
- **Long-Running**: Designed to run for months (typical for legal cases)
- **Real-time State Queries**: Query current stage and requirements at any time
- **Audit Trail**: Complete activity logging for compliance

## Architecture

### Components

1. **Workflow** (`caseLifecycle.workflow.js`)
   - Orchestrates the case lifecycle
   - Handles signals for stage transitions and requirement completions
   - Manages timers for reminders
   - Maintains workflow state

2. **Activities** (`caseLifecycle.activities.js`)
   - Database operations
   - External notifications (email, SMS, push)
   - Audit logging
   - Integration with case management system

3. **Routes** (`temporalCase.route.js`)
   - REST API endpoints for workflow control
   - Signal and query interfaces
   - Workflow status monitoring

## Usage

### Starting a Workflow

```javascript
// POST /api/cases/:id/start-workflow
{
  "workflowTemplateId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

This will:
1. Initialize the case stage progress in the database
2. Start a Temporal workflow with ID `case-lifecycle-{caseId}`
3. Enter the initial stage defined in the template
4. Begin monitoring for deadlines and requirements

### Completing Requirements

```javascript
// POST /api/cases/:id/workflow/complete-requirement
{
  "requirementId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "metadata": {
    "stageId": "64f1a2b3c4d5e6f7g8h9i0j2",
    "name": "Client signature obtained",
    "notes": "Signed via DocuSign on 2025-01-15"
  }
}
```

### Transitioning Stages

```javascript
// POST /api/cases/:id/workflow/transition-stage
{
  "stageId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "notes": "All documents filed with court"
}
```

### Adding Deadlines

```javascript
// POST /api/cases/:id/workflow/add-deadline
{
  "title": "File response brief",
  "date": "2025-02-15T17:00:00Z",
  "description": "Deadline to file response to defendant's motion"
}
```

### Adding Court Dates

```javascript
// POST /api/cases/:id/workflow/add-court-date
{
  "title": "First hearing",
  "date": "2025-02-20T10:00:00Z",
  "location": "Courtroom 3B, Main Courthouse",
  "notes": "Judge Johnson presiding"
}
```

### Pausing/Resuming Workflow

```javascript
// POST /api/cases/:id/workflow/pause
{}

// POST /api/cases/:id/workflow/resume
{}
```

### Checking Workflow Status

```javascript
// GET /api/cases/:id/workflow/status

// Response:
{
  "success": true,
  "status": {
    "workflowId": "case-lifecycle-64f1a2b3c4d5e6f7g8h9i0j1",
    "status": "RUNNING",
    "startTime": "2025-01-01T00:00:00Z",
    "executionTime": "720h",
    "historyLength": 245
  },
  "workflowState": {
    "caseId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "currentStage": "discovery",
    "completedRequirements": [...],
    "deadlines": [...],
    "courtDates": [...],
    "isPaused": false
  },
  "currentStage": {
    "stage": "discovery",
    "stageId": "64f1a2b3c4d5e6f7g8h9i0j2",
    "enteredAt": "2025-01-15T00:00:00Z"
  },
  "requirements": {
    "completed": [...],
    "pending": [...]
  }
}
```

## Workflow States

The workflow maintains the following state:

```javascript
{
  caseId: string,
  caseType: string,
  workflowTemplateId: string,
  currentStage: object,
  currentStageId: string,
  currentStageEnteredAt: string,
  stages: array,
  completedRequirements: array,
  deadlines: array,
  courtDates: array,
  isPaused: boolean,
  pausedAt: string,
  startedAt: string,
  completedAt: string,
  notifications: array
}
```

## Signals

Workflows respond to the following signals:

- `completeRequirement`: Mark a requirement as completed
- `transitionStage`: Move to a different stage
- `addDeadline`: Add a new deadline to track
- `addCourtDate`: Add a court date with reminders
- `pauseWorkflow`: Pause workflow execution
- `resumeWorkflow`: Resume a paused workflow

## Queries

Query the workflow state without affecting execution:

- `getWorkflowState`: Get complete workflow state
- `getCurrentStage`: Get current stage information
- `getRequirements`: Get completed and pending requirements

## Workflow Template Structure

Workflow templates define the stages and transitions for different case types:

```javascript
{
  name: "Labor Dispute Case",
  nameAr: "قضية نزاع عمالي",
  caseCategory: "labor",
  stages: [
    {
      name: "filing",
      nameAr: "التقديم",
      order: 1,
      isInitial: true,
      requirements: [
        {
          type: "document_upload",
          name: "Labor office referral",
          isRequired: true
        }
      ],
      autoTransition: false,
      notifyOnEntry: true
    },
    {
      name: "friendly_settlement_1",
      nameAr: "التسوية الودية الأولى",
      order: 2,
      durationDays: 21,
      requirements: [
        {
          type: "approval",
          name: "Settlement offer prepared",
          isRequired: true
        }
      ]
    },
    {
      name: "labor_court",
      nameAr: "المحكمة العمالية",
      order: 3,
      requirements: [
        {
          type: "document_upload",
          name: "Case filing documents",
          isRequired: true
        }
      ]
    }
  ],
  transitions: [
    {
      fromStageId: "...",
      toStageId: "...",
      name: "Proceed to court",
      requiresApproval: false
    }
  ]
}
```

## Reminder System

### Deadline Reminders

Reminders are sent at:
- 7 days before deadline
- 3 days before deadline
- 1 day before deadline
- When deadline is overdue

### Court Date Reminders

Reminders are sent:
- 48 hours before court date
- 24 hours before court date

## Error Handling

- Activities have built-in retry logic (3 attempts with exponential backoff)
- Workflow operations use retry wrappers
- Non-critical operations (notifications) log errors but don't fail the workflow
- Critical operations (database updates) will retry and eventually fail the workflow if unsuccessful

## Monitoring

Monitor workflow execution through:

1. **Temporal UI**: View workflow history, events, and state
2. **API Status Endpoint**: Query current state and progress
3. **Database**: Check CaseStageProgress model for persistent state
4. **Logs**: Activity logs are written to case notes

## Best Practices

1. **Template Design**: Create templates with clear stage progressions
2. **Requirement Validation**: Mark only essential requirements as required
3. **Deadline Management**: Add deadlines early to ensure adequate notice
4. **Monitoring**: Regularly check workflow status for long-running cases
5. **Graceful Pausing**: Use pause/resume for case holds rather than cancelling
6. **Testing**: Test workflow templates with sample cases before production use

## Troubleshooting

### Workflow Not Starting

- Verify workflow template exists and is active
- Check that case exists in database
- Ensure no existing workflow for the case
- Verify Temporal server is running

### Signals Not Being Processed

- Check workflow is running (not completed or cancelled)
- Verify signal names match exactly
- Ensure workflow ID is correct

### Reminders Not Sending

- Verify deadline/court date is in the future
- Check notification service configuration
- Review activity logs for errors

## Example: Complete Case Flow

```javascript
// 1. Create case
POST /api/cases
{
  "title": "Labor dispute - ABC Company",
  "category": "labor",
  "clientId": "...",
  "lawyerId": "..."
}

// 2. Start workflow
POST /api/cases/64f.../start-workflow
{
  "workflowTemplateId": "64f..."
}

// 3. Add court date
POST /api/cases/64f.../workflow/add-court-date
{
  "title": "First hearing",
  "date": "2025-03-15T10:00:00Z",
  "location": "Labor Court, Riyadh"
}

// 4. Complete requirements
POST /api/cases/64f.../workflow/complete-requirement
{
  "requirementId": "64f...",
  "metadata": { "name": "Documents filed" }
}

// 5. Transition stage
POST /api/cases/64f.../workflow/transition-stage
{
  "stageId": "64f...",
  "notes": "Moving to settlement phase"
}

// 6. Monitor progress
GET /api/cases/64f.../workflow/status
```

## Security

- All endpoints require authentication
- Firm isolation ensures users can only access their firm's cases
- Workflow IDs are deterministic but include case ID (already secured)
- Activities validate permissions before database operations

## Performance

- Workflows use sleep timers (1 hour default) to reduce load
- Database queries are optimized with indexes
- Caching is disabled for workflow endpoints (real-time data)
- Activities have 5-minute timeout with retries

## Future Enhancements

- [ ] Webhook notifications for external systems
- [ ] SMS/WhatsApp notifications
- [ ] Email digest summaries
- [ ] AI-powered stage prediction
- [ ] Document OCR for automatic requirement validation
- [ ] Integration with calendar systems
- [ ] Bulk operations for multiple cases
- [ ] Advanced reporting and analytics
