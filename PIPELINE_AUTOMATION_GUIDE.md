# Pipeline Stage Automation Guide

## Overview

Pipeline Stage Automation allows you to automatically execute actions when leads/deals move between stages in your sales pipelines. This feature helps automate repetitive tasks, ensure follow-ups, and maintain consistency in your sales process.

## Features

### Supported Triggers

1. **onEnter (enter)** - Execute when an entity enters a stage
2. **onExit (exit)** - Execute when an entity exits a stage
3. **afterDays (time_in_stage)** - Execute after entity has been in stage for specified duration

### Supported Actions

1. **send_email** - Send email notification to user/team
2. **create_task** - Automatically create a task
3. **notify_user** - Send in-app notification
4. **update_field** - Update entity field value

## Configuration

### Pipeline Stage Schema

Each stage in a pipeline can have multiple automation rules defined in the `autoActions` array:

```javascript
{
  stageId: "stage_123",
  name: "Qualified",
  autoActions: [
    {
      trigger: "enter",           // When triggered
      action: "create_task",       // What to do
      config: { ... },            // Action configuration
      delayHours: 0               // Optional delay (hours)
    }
  ]
}
```

## Action Configurations

### 1. Send Email Action

Send automated emails when leads enter or exit stages.

**Config Options:**
```javascript
{
  trigger: "enter",
  action: "send_email",
  config: {
    to: "assigned_user",              // or "lead_owner", or specific recipientId
    recipientId: "userId",            // Optional: specific user ID
    subject: "Lead moved to {{stageName}}", // Template subject
    message: "{{userName}}, {{entityName}} is now in {{stageName}} stage",
    link: "/leads/{{entityId}}"       // Optional link
  },
  delayHours: 0  // Send immediately (0) or delay
}
```

**Available Variables:**
- `{{entityName}}` - Lead/Deal name
- `{{stageName}}` - Current stage name
- `{{userName}}` - Recipient's name
- `{{entityType}}` - "Lead" or "Deal"

**Example - Welcome Email on New Lead:**
```javascript
{
  trigger: "enter",
  action: "send_email",
  config: {
    to: "lead_owner",
    subject: "New Lead: {{entityName}}",
    message: "A new lead {{entityName}} has been added to your pipeline.",
    link: "/leads"
  }
}
```

**Example - Follow-up Reminder:**
```javascript
{
  trigger: "enter",
  action: "send_email",
  config: {
    to: "assigned_user",
    subject: "Follow up with {{entityName}}",
    message: "{{userName}}, please follow up with {{entityName}} who is now in {{stageName}} stage."
  },
  delayHours: 24  // Send after 24 hours
}
```

### 2. Create Task Action

Automatically create tasks when leads move through stages.

**Config Options:**
```javascript
{
  trigger: "enter",
  action: "create_task",
  config: {
    title: "Follow up: {{entityName}}",
    description: "Contact {{entityName}} regarding their interest",
    assignedTo: "assigned_user",      // or "lead_owner", or assignToUserId
    assignToUserId: "userId",         // Optional: specific user ID
    dueInDays: 3,                     // Due date (days from now)
    priority: "high",                 // low, medium, high, critical
    taskType: "client_meeting"        // Task type
  }
}
```

**Example - Create Follow-up Task:**
```javascript
{
  trigger: "enter",
  action: "create_task",
  config: {
    title: "Send proposal to {{entityName}}",
    description: "Prepare and send proposal for {{entityName}}",
    assignedTo: "assigned_user",
    dueInDays: 2,
    priority: "high",
    taskType: "general"
  }
}
```

**Example - Schedule Meeting Task:**
```javascript
{
  trigger: "enter",
  action: "create_task",
  config: {
    title: "Schedule meeting with {{entityName}}",
    description: "Book a discovery call with {{entityName}}",
    assignedTo: "lead_owner",
    dueInDays: 1,
    priority: "critical",
    taskType: "client_meeting"
  }
}
```

### 3. Notify User Action

Send in-app notifications to users.

**Config Options:**
```javascript
{
  trigger: "enter",
  action: "notify_user",
  config: {
    userId: "assigned_user",          // or "lead_owner", or recipientId
    recipientId: "userId",            // Optional: specific user ID
    title: "{{entityName}} moved to {{stageName}}",
    message: "Take action on {{entityName}}",
    priority: "medium",               // low, medium, high, urgent
    icon: "🔔",                       // Emoji icon
    link: "/leads/{{entityId}}"       // Navigation link
  }
}
```

**Example - Urgent Notification:**
```javascript
{
  trigger: "enter",
  action: "notify_user",
  config: {
    userId: "assigned_user",
    title: "Hot Lead: {{entityName}}",
    message: "{{entityName}} is highly qualified and ready to close!",
    priority: "urgent",
    icon: "🔥"
  }
}
```

### 4. Update Field Action

Automatically update lead/deal fields.

**Config Options:**
```javascript
{
  trigger: "enter",
  action: "update_field",
  config: {
    field: "priority",                // Field name
    value: "high",                    // New value
    operation: "set"                  // set, increment, decrement, append
  }
}
```

**Operations:**
- `set` - Set field to specific value
- `increment` - Increase numeric field
- `decrement` - Decrease numeric field
- `append` - Add to array field

**Example - Mark as High Priority:**
```javascript
{
  trigger: "enter",
  action: "update_field",
  config: {
    field: "tags",
    value: "hot-lead",
    operation: "append"
  }
}
```

## Complete Example Pipelines

### Example 1: Sales Pipeline with Full Automation

```javascript
{
  name: "Sales Pipeline",
  type: "lead",
  stages: [
    {
      name: "New",
      order: 0,
      color: "#94a3b8",
      probability: 10,
      autoActions: [
        {
          // Send welcome email immediately
          trigger: "enter",
          action: "send_email",
          config: {
            to: "lead_owner",
            subject: "New Lead: {{entityName}}",
            message: "You have a new lead: {{entityName}}"
          }
        },
        {
          // Create initial contact task
          trigger: "enter",
          action: "create_task",
          config: {
            title: "Initial contact with {{entityName}}",
            assignedTo: "lead_owner",
            dueInDays: 1,
            priority: "high"
          }
        }
      ]
    },
    {
      name: "Contacted",
      order: 1,
      color: "#60a5fa",
      probability: 20,
      autoActions: [
        {
          // Notify when lead is contacted
          trigger: "enter",
          action: "notify_user",
          config: {
            userId: "lead_owner",
            title: "Lead contacted: {{entityName}}",
            message: "Next step: Qualify the lead",
            priority: "medium"
          }
        }
      ]
    },
    {
      name: "Qualified",
      order: 2,
      color: "#a78bfa",
      probability: 40,
      autoActions: [
        {
          // Create proposal task
          trigger: "enter",
          action: "create_task",
          config: {
            title: "Prepare proposal for {{entityName}}",
            assignedTo: "assigned_user",
            dueInDays: 3,
            priority: "high",
            taskType: "general"
          }
        },
        {
          // Update priority field
          trigger: "enter",
          action: "update_field",
          config: {
            field: "tags",
            value: "qualified",
            operation: "append"
          }
        }
      ]
    },
    {
      name: "Proposal Sent",
      order: 3,
      color: "#f59e0b",
      probability: 60,
      autoActions: [
        {
          // Follow-up reminder after 48 hours
          trigger: "enter",
          action: "send_email",
          config: {
            to: "assigned_user",
            subject: "Follow up on proposal: {{entityName}}",
            message: "Check if {{entityName}} has reviewed the proposal"
          },
          delayHours: 48
        },
        {
          // Create follow-up task
          trigger: "enter",
          action: "create_task",
          config: {
            title: "Follow up on proposal with {{entityName}}",
            assignedTo: "assigned_user",
            dueInDays: 3,
            priority: "medium"
          }
        }
      ]
    },
    {
      name: "Won",
      order: 4,
      color: "#22c55e",
      probability: 100,
      isWonStage: true,
      autoActions: [
        {
          // Celebrate the win!
          trigger: "enter",
          action: "notify_user",
          config: {
            userId: "lead_owner",
            title: "🎉 Lead Won: {{entityName}}",
            message: "Congratulations! {{entityName}} is now a client!",
            priority: "high",
            icon: "🎉"
          }
        },
        {
          // Create onboarding task
          trigger: "enter",
          action: "create_task",
          config: {
            title: "Onboard new client: {{entityName}}",
            assignedTo: "lead_owner",
            dueInDays: 1,
            priority: "critical",
            taskType: "client_meeting"
          }
        }
      ]
    }
  ]
}
```

### Example 2: Legal Case Pipeline

```javascript
{
  name: "Case Management Pipeline",
  type: "case",
  stages: [
    {
      name: "Intake",
      order: 0,
      autoActions: [
        {
          trigger: "enter",
          action: "create_task",
          config: {
            title: "Initial consultation: {{entityName}}",
            description: "Conduct initial case assessment",
            assignedTo: "lead_owner",
            dueInDays: 2,
            priority: "high",
            taskType: "client_meeting"
          }
        }
      ]
    },
    {
      name: "Document Collection",
      order: 1,
      autoActions: [
        {
          trigger: "enter",
          action: "send_email",
          config: {
            to: "assigned_user",
            subject: "Document checklist for {{entityName}}",
            message: "Please collect required documents from {{entityName}}"
          }
        },
        {
          trigger: "enter",
          action: "create_task",
          config: {
            title: "Collect documents from {{entityName}}",
            dueInDays: 5,
            priority: "high",
            taskType: "document_review"
          }
        }
      ]
    },
    {
      name: "Filed",
      order: 2,
      autoActions: [
        {
          trigger: "enter",
          action: "notify_user",
          config: {
            userId: "assigned_user",
            title: "Case filed: {{entityName}}",
            message: "Monitor deadlines and prepare for hearing",
            priority: "high"
          }
        }
      ]
    }
  ]
}
```

## API Usage

### Creating a Pipeline with Automation

```javascript
POST /api/pipelines

{
  "name": "My Sales Pipeline",
  "type": "lead",
  "stages": [
    {
      "name": "New Lead",
      "color": "#60a5fa",
      "order": 0,
      "probability": 10,
      "autoActions": [
        {
          "trigger": "enter",
          "action": "create_task",
          "config": {
            "title": "Contact {{entityName}}",
            "assignedTo": "lead_owner",
            "dueInDays": 1,
            "priority": "high"
          }
        }
      ]
    }
  ]
}
```

### Updating Stage Automation

```javascript
PUT /api/pipelines/:pipelineId/stages/:stageId

{
  "autoActions": [
    {
      "trigger": "enter",
      "action": "send_email",
      "config": {
        "to": "assigned_user",
        "subject": "New lead in {{stageName}}",
        "message": "Take action on {{entityName}}"
      }
    }
  ]
}
```

## Execution Flow

### When Moving Stages

1. **User moves lead to new stage** via `PUT /api/leads/:id/stage`
2. **Exit automation executes** for old stage (if configured)
3. **Lead stage is updated** in database
4. **Enter automation executes** for new stage
5. **Activity is logged** for tracking
6. **Response returned** with automation results

### When Creating Leads

1. **Lead is created** via `POST /api/leads`
2. **Default pipeline assigned** (if not specified)
3. **Lead placed in first stage**
4. **Enter automation executes** for initial stage
5. **Lead created** with automation results

## Troubleshooting

### Automation Not Executing

**Check:**
1. Stage has `autoActions` defined
2. Trigger type matches the event ('enter', 'exit')
3. Config is properly formatted
4. Required services are running (email, task creation)

### Email Not Sending

**Check:**
1. RESEND_API_KEY is configured
2. Recipient has valid email address
3. Email rate limiting (1 per hour per user)
4. Check server logs for errors

### Task Not Created

**Check:**
1. Task model and controller are working
2. `assignedTo` user ID is valid
3. Required task fields are provided
4. Check server logs for errors

## Best Practices

1. **Keep it Simple** - Don't over-automate; too many actions can overwhelm users
2. **Use Delays Wisely** - Space out automated actions to avoid spam
3. **Test Thoroughly** - Test automation in staging before production
4. **Monitor Results** - Check automation execution logs regularly
5. **Provide Escape Valves** - Allow users to disable automation if needed
6. **Use Clear Titles** - Make automated tasks/emails clear they're automated

## Time-Based Automation (Future Enhancement)

Time-based automation (`time_in_stage`) is partially implemented and requires a job scheduler:

```javascript
{
  trigger: "time_in_stage",
  action: "send_email",
  config: {
    hoursInStage: 48,  // Execute after 48 hours in stage
    to: "assigned_user",
    subject: "Lead {{entityName}} needs attention",
    message: "{{entityName}} has been in {{stageName}} for 48 hours"
  }
}
```

**To fully implement:**
1. Set up Bull Queue or Agenda.js for job scheduling
2. Create cron job to check time-based automations
3. Track execution to prevent duplicate triggers

## Rate Limiting

**Email Automation:**
- 1 email per user per hour (to prevent spam)
- OTP/authentication emails bypass this limit
- Rate limit enforced by NotificationDeliveryService

**Recommendations:**
- Use delays between automated emails
- Prefer in-app notifications for frequent updates
- Batch notifications when possible

## Security Considerations

1. **Validate Recipients** - Ensure users have permission to receive notifications
2. **Sanitize Inputs** - Clean variables before inserting into templates
3. **Limit Actions** - Restrict automation to authorized users
4. **Audit Logs** - Track all automation executions
5. **Rate Limiting** - Prevent automation abuse

## Support

For issues or questions:
- Check server logs for automation errors
- Review this guide for configuration examples
- Test automation with simple actions first
- Contact development team if issues persist

---

**Last Updated:** 2025-12-08
**Version:** 1.0.0
