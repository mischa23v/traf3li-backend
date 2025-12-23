# Employee Offboarding Temporal Workflow

## Overview

The Employee Offboarding Temporal Workflow is a multi-phase, compliance-driven workflow that manages the complete employee offboarding process in accordance with Saudi Labor Law requirements.

## Architecture

### Workflow Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    OFFBOARDING WORKFLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: NOTIFICATION                                         │
│  ├── Notify Department                                         │
│  ├── Notify IT                                                 │
│  ├── Notify HR                                                 │
│  ├── Notify Finance                                            │
│  └── Notify Manager                                            │
│                                                                 │
│  Phase 2: KNOWLEDGE TRANSFER (Parallel with Phase 3)          │
│  ├── Initiate Handover Plan                                   │
│  ├── Assign Responsibilities                                  │
│  └── Track Transfer Progress                                  │
│                                                                 │
│  Phase 3: ACCESS REVOCATION + EQUIPMENT RETURN (Parallel)     │
│  ├── Access Revocation:                                        │
│  │   ├── Revoke System Access                                 │
│  │   ├── Archive Employee Data                                │
│  │   └── Deactivate Email                                     │
│  └── Equipment Return:                                         │
│      ├── Schedule Returns                                      │
│      └── Track Status                                          │
│                                                                 │
│  Phase 4: EXIT INTERVIEW (Conditional)                        │
│  ├── Schedule Interview                                        │
│  ├── Conduct Interview                                         │
│  └── Record Feedback                                           │
│                                                                 │
│  Phase 5: CLEARANCE                                            │
│  ├── Generate Clearance Certificate                           │
│  ├── Notify Payroll                                            │
│  └── Final Settlement                                          │
│                                                                 │
│  Phase 6: COMPLETION                                           │
│  └── Update HR Records                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### 1. Multi-Phase Processing
- **Sequential and Parallel Execution**: Optimizes workflow execution time
- **Phase Dependencies**: Ensures proper order of operations
- **Conditional Phases**: Skips unnecessary steps based on exit type

### 2. Compliance Tracking
- **Saudi Labor Law Alignment**: Articles 75, 80, 84-87, 109
- **Audit Trail**: Complete timeline of all events
- **Compliance Scoring**: Automatic calculation of compliance metrics

### 3. Signal Handlers
- `notificationPhaseComplete`: Confirms all notifications sent
- `knowledgeTransferComplete`: Confirms handover completion
- `accessRevocationComplete`: Confirms access revoked
- `equipmentReturnComplete`: Confirms equipment returned
- `exitInterviewComplete`: Confirms interview conducted
- `clearanceComplete`: Confirms all clearances obtained
- `manualOverride`: Allows manual phase completion
- `escalation`: Escalates issues to management

### 4. Error Handling
- **Automatic Retries**: Configurable retry policies
- **Escalation System**: Automatic escalation on failures
- **Non-Blocking Failures**: Non-critical failures don't stop workflow
- **Comprehensive Logging**: All events logged for debugging

## Exit Types Supported

### 1. Resignation
- Full notice period
- Exit interview required
- EOSB calculation with resignation adjustments (Article 87)
- Scheduled access revocation

### 2. Termination
- Immediate access revocation for Article 80 violations
- No EOSB for serious violations
- Optional exit interview
- Compliance documentation

### 3. Retirement
- Full EOSB entitlement
- Pension eligibility check
- GOSI retirement processing
- Recognition ceremony (optional)

### 4. Contract End
- Natural contract expiration
- Renewal option handling
- Early termination compensation

### 5. Death
- Beneficiary notification
- Skip exit interview
- Compassionate handling
- Estate settlement

### 6. Mutual Agreement
- Custom terms processing
- Negotiated settlement
- Documentation requirements

## API Endpoints

### 1. Start Offboarding
```http
POST /api/employees/:id/start-offboarding
Authorization: Bearer <token>

{
  "exitType": "resignation",
  "lastWorkingDay": "2024-12-31",
  "noticeDate": "2024-12-01",
  "exitReason": "Better opportunity",
  "managerId": "507f1f77bcf86cd799439011",
  "noticePeriodDays": 30,
  "knowledgeTransferRecipients": [
    {
      "employeeId": "507f1f77bcf86cd799439012",
      "employeeName": "Ahmed Ali",
      "role": "Senior Developer",
      "responsibilities": [
        {
          "responsibility": "Project X maintenance",
          "priority": "high"
        }
      ]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Offboarding workflow started successfully",
  "data": {
    "offboardingId": "OFF-2024-001",
    "workflowId": "offboarding-507f1f77bcf86cd799439011-1703174400000",
    "employeeId": "EMP0001",
    "employeeName": "Mohammed Ahmed",
    "exitType": "resignation",
    "lastWorkingDay": "2024-12-31T00:00:00.000Z",
    "status": "initiated"
  }
}
```

### 2. Complete Task/Phase
```http
POST /api/employees/:id/offboarding/complete-task
Authorization: Bearer <token>

{
  "phase": "knowledge_transfer",
  "notes": "All responsibilities successfully transferred",
  "completedBy": "507f1f77bcf86cd799439013"
}
```

**Response:**
```json
{
  "success": true,
  "message": "knowledge transfer phase marked as complete",
  "data": {
    "phase": "knowledge_transfer",
    "completedAt": "2024-12-15T10:30:00.000Z",
    "workflowId": "offboarding-507f1f77bcf86cd799439011-1703174400000"
  }
}
```

### 3. Get Offboarding Status
```http
GET /api/employees/:id/offboarding/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "offboardingId": "OFF-2024-001",
    "employee": {
      "id": "EMP0001",
      "name": "Mohammed Ahmed",
      "department": "Engineering",
      "jobTitle": "Senior Developer"
    },
    "exitType": "resignation",
    "status": "in_progress",
    "progress": {
      "percentage": 60,
      "completedPhases": 3,
      "totalPhases": 5,
      "phases": [
        { "name": "notification", "completed": true },
        { "name": "knowledge_transfer", "completed": true },
        { "name": "access_revocation", "completed": true },
        { "name": "equipment_return", "completed": false },
        { "name": "exit_interview", "completed": false }
      ]
    },
    "workflow": {
      "workflowId": "offboarding-507f1f77bcf86cd799439011-1703174400000",
      "status": "RUNNING",
      "startTime": "2024-12-01T08:00:00.000Z"
    }
  }
}
```

### 4. Escalate Issue / Manual Override
```http
POST /api/employees/:id/offboarding/escalate
Authorization: Bearer <token>

{
  "action": "override",
  "phase": "equipment_return",
  "reason": "Employee lost company laptop, cost deducted from settlement",
  "approvedBy": "507f1f77bcf86cd799439014"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual override applied successfully",
  "data": {
    "action": "override",
    "phase": "equipment_return",
    "approvedBy": "507f1f77bcf86cd799439014",
    "timestamp": "2024-12-20T14:30:00.000Z"
  }
}
```

### 5. Cancel Offboarding
```http
POST /api/employees/:id/offboarding/cancel
Authorization: Bearer <token>

{
  "reason": "Employee withdrew resignation"
}
```

## Activities

### Notification Activities
- `notifyDepartment`: Sends notifications to relevant departments
  - Parameters: employeeId, department, exitType, lastWorkingDay
  - Returns: Notification status and recipient count

### Knowledge Transfer Activities
- `initiateKnowledgeTransfer`: Creates handover plan
  - Parameters: employeeId, handoverTo, responsibilities
  - Returns: Handover plan with deadlines

### Access Management Activities
- `revokeSystemAccess`: Deactivates all system accounts
  - Parameters: employeeId, email, scheduleTime
  - Returns: Revocation schedule and task list

- `archiveEmployeeData`: Archives employee data
  - Parameters: employeeId, retentionYears
  - Returns: Archive location and retention date

### Equipment Activities
- `scheduleEquipmentReturn`: Creates equipment return schedule
  - Parameters: employeeId, itemsToReturn, deadline
  - Returns: Return schedule and item checklist

### Interview Activities
- `scheduleExitInterview`: Schedules exit interview
  - Parameters: employeeId, interviewMethod
  - Returns: Interview appointment details

### Clearance Activities
- `generateClearanceCertificate`: Generates final clearance
  - Parameters: employeeId, clearanceStatus
  - Returns: Certificate URL and clearance details

### Payroll Activities
- `notifyPayroll`: Initiates final settlement
  - Parameters: employeeId, serviceDuration, basicSalary
  - Returns: Settlement calculation request

### HR Activities
- `updateHRRecords`: Updates employee records
  - Parameters: employeeId, update
  - Returns: Updated fields confirmation

### Escalation Activities
- `escalateIssue`: Escalates workflow issues
  - Parameters: employeeId, phase, issue, severity
  - Returns: Escalation status

## Configuration

### Environment Variables
```bash
# Temporal Configuration
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default

# Department Email Contacts
IT_EMAIL=it@company.com
HR_EMAIL=hr@company.com
FINANCE_EMAIL=finance@company.com

# Dashboard URL
DASHBOARD_URL=https://dashboard.traf3li.com
```

### Workflow Timeouts
```javascript
// Phase timeouts
NOTIFICATION_TIMEOUT = exitType === 'termination' ? '1 day' : '2 days'
KNOWLEDGE_TRANSFER_TIMEOUT = noticePeriod || '30 days'
ACCESS_REVOCATION_TIMEOUT = '2 days'
EQUIPMENT_RETURN_TIMEOUT = '7 days'
EXIT_INTERVIEW_TIMEOUT = '5 days'
CLEARANCE_TIMEOUT = '10 days'
```

### Retry Configuration
```javascript
{
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '30s',
    backoffCoefficient: 2,
    maximumInterval: '10m',
    maximumAttempts: 3
  }
}
```

## Usage Examples

### Example 1: Standard Resignation
```javascript
const temporal = require('../temporal');

// Start offboarding workflow
const handle = await temporal.client.startOffboardingWorkflow({
  employeeId: '507f1f77bcf86cd799439011',
  offboardingData: {
    exitType: 'resignation',
    employeeName: 'Mohammed Ahmed',
    email: 'mohammed@company.com',
    department: 'Engineering',
    lastWorkingDay: new Date('2024-12-31'),
    noticePeriod: { requiredDays: 30 },
    knowledgeTransfer: {
      handoverPlan: {
        handoverTo: [
          {
            employeeId: '507f1f77bcf86cd799439012',
            employeeName: 'Ahmed Ali',
            role: 'Senior Developer'
          }
        ]
      }
    }
  }
});

// Signal phase completion
await temporal.client.signalWorkflow(
  handle.workflowId,
  'knowledgeTransferComplete'
);
```

### Example 2: Immediate Termination
```javascript
// Start immediate termination workflow
const handle = await temporal.client.startOffboardingWorkflow({
  employeeId: '507f1f77bcf86cd799439011',
  offboardingData: {
    exitType: 'termination',
    employeeName: 'Mohammed Ahmed',
    email: 'mohammed@company.com',
    lastWorkingDay: new Date(), // Immediate
    termination: {
      article80Violation: {
        applies: true,
        violationType: 'gross_negligence'
      }
    }
  }
});

// Access will be revoked immediately
// EOSB will be zero due to Article 80 violation
```

### Example 3: Retirement
```javascript
// Start retirement workflow
const handle = await temporal.client.startOffboardingWorkflow({
  employeeId: '507f1f77bcf86cd799439011',
  offboardingData: {
    exitType: 'retirement',
    employeeName: 'Ahmed Hassan',
    lastWorkingDay: new Date('2024-12-31'),
    retirement: {
      retirementType: 'voluntary',
      gosiRetirement: {
        eligible: true,
        serviceYears: 25
      }
    }
  }
});

// Full EOSB entitlement
// Exit interview conducted
// Retirement benefits processed
```

## Monitoring

### Workflow Status
```javascript
// Get workflow description
const description = await temporal.client.describeWorkflow(workflowId);

console.log({
  status: description.status.name,
  startTime: description.startTime,
  historyLength: description.historyLength
});
```

### Query Progress
```javascript
// Query workflow state
const progress = await temporal.client.queryWorkflow(
  workflowId,
  'getProgress'
);

console.log({
  currentPhase: progress.currentPhase,
  completedPhases: progress.completedPhases,
  complianceScore: progress.compliance.complianceScore
});
```

## Error Scenarios

### Scenario 1: Failed Notification
**Issue**: Department notification fails
**Handling**:
- Error logged in phase.errors
- Escalation triggered
- Workflow continues with warning

### Scenario 2: Knowledge Transfer Incomplete
**Issue**: Knowledge transfer not completed by deadline
**Handling**:
- Escalation sent to HR
- Manual override option available
- Non-blocking - workflow continues

### Scenario 3: Equipment Not Returned
**Issue**: Equipment not returned within 7 days
**Handling**:
- Escalation triggered
- Cost deducted from final settlement
- Manual override for completion

### Scenario 4: Critical Failure (Access Revocation)
**Issue**: System access revocation fails
**Handling**:
- Workflow paused
- Critical escalation to IT/Security
- Manual intervention required
- Workflow terminated if unresolved

## Compliance

### Saudi Labor Law Articles

#### Article 75 - Notice Period
- Resignation: 30-60 days notice
- Termination: 30-60 days notice or payment in lieu
- Implementation: Tracked in `noticePeriod` field

#### Article 80 - Immediate Termination
- Serious violations allow immediate termination
- No EOSB entitlement
- Implementation: `article80Violation` check

#### Articles 84-87 - End of Service Benefit (EOSB)
- First 5 years: 0.5 month salary per year
- After 5 years: 1 month salary per year
- Resignation adjustments:
  - < 2 years: 0%
  - 2-5 years: 33.33%
  - 5-10 years: 66.67%
  - 10+ years: 100%
- Implementation: `calculateEOSB()` method

#### Article 109 - Annual Leave
- Unused leave must be compensated
- Implementation: Final settlement calculation

### Audit Trail
All workflow events are logged in the `timeline` array:
```javascript
{
  eventType: 'phase_completed',
  eventDate: ISOString,
  description: string,
  performedBy: ObjectId,
  status: 'completed' | 'pending' | 'failed',
  notes: string
}
```

## Testing

### Unit Tests
```javascript
// Test activity
const { notifyDepartment } = require('./activities/offboarding.activities');

test('should notify department successfully', async () => {
  const result = await notifyDepartment({
    employeeId: 'test-emp-001',
    department: 'Engineering',
    exitType: 'resignation',
    lastWorkingDay: new Date(),
    notificationType: 'department'
  });

  expect(result.success).toBe(true);
  expect(result.recipientCount).toBeGreaterThan(0);
});
```

### Integration Tests
```javascript
// Test workflow
test('should complete full offboarding workflow', async () => {
  const handle = await startOffboardingWorkflow({...});

  // Signal completions
  await handle.signal('notificationPhaseComplete');
  await handle.signal('knowledgeTransferComplete');
  await handle.signal('accessRevocationComplete');
  await handle.signal('equipmentReturnComplete');
  await handle.signal('clearanceComplete');

  const result = await handle.result();

  expect(result.success).toBe(true);
  expect(result.status).toBe('completed');
  expect(result.complianceScore).toBeGreaterThanOrEqual(80);
});
```

## Troubleshooting

### Common Issues

1. **Workflow Not Starting**
   - Check Temporal server connection
   - Verify task queue name
   - Check employee exists in database

2. **Signal Not Received**
   - Verify correct signal name
   - Check workflow ID is correct
   - Ensure workflow is still running

3. **Activity Timeout**
   - Increase `startToCloseTimeout`
   - Check activity execution logs
   - Verify external service availability

4. **Clearance Not Completing**
   - Check all required clearances obtained
   - Verify department approvals
   - Review escalations log

## Support

For issues or questions:
- Email: hr-support@company.com
- Slack: #hr-workflows
- Documentation: https://docs.company.com/workflows/offboarding
