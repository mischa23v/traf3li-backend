# Case Lifecycle Workflow - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
1. Temporal server running (default: `localhost:7233`)
2. MongoDB connected
3. Node.js application running

### Start the Temporal Worker

```bash
# In a separate terminal
node src/temporal/worker.js
```

You should see:
```
Starting Temporal workers...
Started 4 Temporal workers
```

## 📋 API Quick Reference

### Base URL
```
http://localhost:3000/api/cases/:caseId
```

All endpoints require authentication token in headers:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### 1. Start Workflow
```bash
POST /api/cases/:id/start-workflow
```

**Request:**
```json
{
  "workflowTemplateId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Case lifecycle workflow started successfully",
  "workflowId": "case-lifecycle-64f1a2b3c4d5e6f7g8h9i0j1",
  "runId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### 2. Complete Requirement
```bash
POST /api/cases/:id/workflow/complete-requirement
```

**Request:**
```json
{
  "requirementId": "64f1a2b3c4d5e6f7g8h9i0j2",
  "metadata": {
    "stageId": "64f1a2b3c4d5e6f7g8h9i0j3",
    "name": "Documents filed",
    "notes": "All documents submitted via e-filing"
  }
}
```

### 3. Transition Stage
```bash
POST /api/cases/:id/workflow/transition-stage
```

**Request:**
```json
{
  "stageId": "64f1a2b3c4d5e6f7g8h9i0j3",
  "notes": "All requirements met, proceeding to next phase"
}
```

### 4. Add Deadline
```bash
POST /api/cases/:id/workflow/add-deadline
```

**Request:**
```json
{
  "title": "File response brief",
  "date": "2025-03-15T17:00:00Z",
  "description": "Deadline to respond to motion"
}
```

### 5. Add Court Date
```bash
POST /api/cases/:id/workflow/add-court-date
```

**Request:**
```json
{
  "title": "First hearing",
  "date": "2025-03-20T10:00:00Z",
  "location": "Courtroom 3B",
  "notes": "Bring all evidence"
}
```

### 6. Get Status
```bash
GET /api/cases/:id/workflow/status
```

**Response:**
```json
{
  "success": true,
  "status": {
    "workflowId": "case-lifecycle-64f...",
    "status": "RUNNING",
    "startTime": "2025-01-01T00:00:00Z"
  },
  "workflowState": {
    "currentStage": "discovery",
    "completedRequirements": [...],
    "deadlines": [...],
    "isPaused": false
  }
}
```

### 7. Pause Workflow
```bash
POST /api/cases/:id/workflow/pause
```

### 8. Resume Workflow
```bash
POST /api/cases/:id/workflow/resume
```

### 9. Cancel Workflow
```bash
POST /api/cases/:id/workflow/cancel
```

## 🔄 Complete Example Flow

```bash
# 1. Start workflow
curl -X POST http://localhost:3000/api/cases/ABC123/start-workflow \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"workflowTemplateId":"TEMPLATE_ID"}'

# 2. Add court date
curl -X POST http://localhost:3000/api/cases/ABC123/workflow/add-court-date \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "First hearing",
    "date": "2025-03-15T10:00:00Z",
    "location": "Courtroom 3B"
  }'

# 3. Complete requirement
curl -X POST http://localhost:3000/api/cases/ABC123/workflow/complete-requirement \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "requirementId": "REQ_ID",
    "metadata": {"name": "Documents filed"}
  }'

# 4. Check status
curl -X GET http://localhost:3000/api/cases/ABC123/workflow/status \
  -H "Authorization: Bearer TOKEN"
```

## 🏗️ Workflow Template Structure

Create a workflow template for your case type:

```javascript
{
  name: "Labor Dispute Case",
  nameAr: "قضية نزاع عمالي",
  caseCategory: "labor",
  isDefault: true,
  isActive: true,
  stages: [
    {
      name: "filing",
      nameAr: "التقديم",
      order: 1,
      isInitial: true,
      isFinal: false,
      color: "#3B82F6",
      durationDays: 7,
      requirements: [
        {
          type: "document_upload",
          name: "Labor office referral",
          description: "Upload labor office referral letter",
          isRequired: true,
          order: 1
        },
        {
          type: "document_upload",
          name: "Employment contract",
          description: "Upload employment contract",
          isRequired: true,
          order: 2
        }
      ],
      autoTransition: false,
      notifyOnEntry: true,
      notifyOnExit: false,
      allowedActions: ["upload_document", "add_note"]
    },
    {
      name: "settlement_attempt",
      nameAr: "محاولة التسوية",
      order: 2,
      isInitial: false,
      isFinal: false,
      color: "#F59E0B",
      durationDays: 21,
      requirements: [
        {
          type: "approval",
          name: "Settlement offer prepared",
          isRequired: true,
          order: 1
        }
      ],
      autoTransition: true,
      notifyOnEntry: true
    },
    {
      name: "court_proceedings",
      nameAr: "الإجراءات القضائية",
      order: 3,
      isInitial: false,
      isFinal: false,
      color: "#EF4444",
      requirements: [
        {
          type: "document_upload",
          name: "Case filing documents",
          isRequired: true,
          order: 1
        }
      ],
      notifyOnEntry: true
    },
    {
      name: "judgment",
      nameAr: "الحكم",
      order: 4,
      isInitial: false,
      isFinal: true,
      color: "#10B981",
      requirements: [],
      notifyOnEntry: true,
      notifyOnExit: true
    }
  ],
  transitions: [
    {
      fromStageId: "FILING_STAGE_ID",
      toStageId: "SETTLEMENT_STAGE_ID",
      name: "Proceed to settlement",
      nameAr: "المتابعة إلى التسوية",
      requiresApproval: false
    }
  ]
}
```

## 📊 Monitoring

### View in Temporal UI
```bash
# Default: http://localhost:8233
open http://localhost:8233
```

Search for your workflow:
- Workflow ID: `case-lifecycle-{caseId}`
- Task Queue: `case-lifecycle`

### Check Logs
```bash
# Application logs
tail -f logs/combined.log

# Workflow activity logs (in case notes)
# Query case notes with isPrivate=true
```

### Database Queries
```javascript
// Check workflow progress
const progress = await CaseStageProgress.findOne({ caseId });

// Check case stage history
const caseDoc = await Case.findById(caseId);
console.log(caseDoc.stageHistory);
```

## 🐛 Troubleshooting

### Workflow Not Starting
```bash
# Check Temporal server
temporal server start-dev

# Check worker is running
ps aux | grep "temporal/worker"

# Check workflow template
db.workflowtemplates.find({ isActive: true })
```

### Signals Not Working
```javascript
// Verify workflow is running
const handle = await temporalClient.getWorkflowHandle(workflowId);
const description = await handle.describe();
console.log(description.status.name); // Should be "RUNNING"
```

### No Reminders
```bash
# Check deadline is in future
# Check notification service config
# Review activity logs in case notes
```

## 💡 Tips

1. **Testing**: Use short durations in dev (hours instead of days)
2. **Monitoring**: Check Temporal UI regularly for failed activities
3. **Templates**: Create templates for each case category
4. **Requirements**: Keep requirements minimal and specific
5. **Notifications**: Configure email/SMS services early

## 📚 Additional Resources

- **Full Documentation**: `src/temporal/workflows/README.md`
- **Implementation Guide**: `CASE_LIFECYCLE_WORKFLOW_IMPLEMENTATION.md`
- **Code Examples**: `src/temporal/examples/caseLifecycleExample.js`
- **Temporal Docs**: https://docs.temporal.io

## 🆘 Support

For issues or questions:
1. Check documentation in `src/temporal/workflows/README.md`
2. Review examples in `src/temporal/examples/`
3. Check application logs
4. Inspect Temporal UI for workflow history

---

**Quick Links:**
- [Temporal UI](http://localhost:8233)
- [API Documentation](http://localhost:3000/api-docs)
- [Full README](./workflows/README.md)
