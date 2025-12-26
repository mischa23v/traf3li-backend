# SaaS RBAC Research Findings

## Executive Summary

This document contains comprehensive research findings on the traf3li-backend RBAC (Role-Based Access Control) system, including analysis of external SaaS boilerplates and identification of critical security gaps.

## Critical Findings

### 1. Firm Isolation Gaps

**188 models have `firmId` field but NO `firmIsolation` plugin applied**

This means these models:
- Do NOT enforce firm-level data isolation automatically
- Do NOT validate firmId on queries
- Have potential data leakage risk in multi-tenant scenarios
- Require manual firmId filtering in queries (error-prone)

#### Protected Models (70 total - WITH firmIsolation)
```
approvalWorkflow, asset, assetCategory, assetMovement, assetRepair,
assetSettings, automation, batch, bin, bom, case, client,
complianceAudit, customField, customFieldValue, cycle, dealRoom,
dispute, document, dunningHistory, dunningPolicy, expense, formulaField,
githubIntegration, importJob, inventorySettings, invoice, item, itemGroup,
itemPrice, jobCard, lifecycleWorkflow, macro, maintenanceSchedule,
manufacturingSettings, omnichannelConversation, payment, payout,
policyViolation, priceList, qualityAction, qualityInspection,
qualityParameter, qualitySettings, qualityTemplate, refund,
reportDefinition, routing, savedFilter, serialNumber, sla, stockEntry,
stockLedger, stockReconciliation, subcontractingOrder, subcontractingReceipt,
supportSLA, supportSettings, task, ticket, ticketCommunication, uom,
user, userActivity, view, warehouse, workOrder, workflowInstance,
workflowTemplate, workstation
```

#### Vulnerable Models (188 total - WITH firmId but NO plugin)
```
activity, activityType, aiInteraction, analyticsEvent, analyticsReport,
apiKey, appConnection, applicant, appointment, approvalRequest,
approvalRule, archivedAuditLog, assetAssignment, attendanceRecord,
auditLog, automatedAction, bankFeed, bankMatchRule, bankTransactionMatch,
bill, billPayment, billingInvoice, biometricDevice, biometricEnrollment,
biometricLog, broker, budget, buyingSettings, calibrationSession,
caseNotionDatabaseView, caseNotionPage, chatHistory, chatterFollower,
churnEvent, compensationReward, compensatoryLeave, competitor, consent,
contact, corporateCard, costCenter, creditNote, crmSettings,
customerHealthScore, debitNote, discordIntegration, documentAnalysis,
docusignIntegration, emailCampaign, emailEvent, emailSegment,
emailSignature, emailSubscriber, emailTemplate, employee, employeeAdvance,
employeeBenefit, employeeIncentive, employeeLoan, employeePromotion,
employeeSkillMap, employeeTransfer, event, exchangeRate,
exchangeRateRevaluation, expenseClaim, expensePolicy, fieldHistory,
financeSetup, firm, firmInvitation, generalLedger, geofenceZone,
gmailIntegration, googleCalendarIntegration, grievance, hrAnalyticsSnapshot,
hrSettings, hrSetupWizard, incident, incidentExecution, incomeTaxSlab,
interCompanyBalance, investment, investmentTransaction, invoiceApproval,
jobPosition, jobPosting, journalEntry, keyboardShortcut, ldapConfig,
lead, leadScore, leadScoringConfig, leadSource, leaveAllocation,
leaveBalance, leaveEncashment, leavePeriod, leavePolicy, leaveRequest,
leaveType, legalContract, lockDate, loginHistory, lostReason,
maintenanceWindow, materialRequest, notification, notificationPreference,
notificationSettings, offboarding, onboarding, organization,
organizationalUnit, pageTemplate, paymentMethod, paymentReceipt,
paymentTerms, payrollRun, pdfmeTemplate, performanceReview, permission,
playbook, pluginInstallation, policyDecision, preparedReport,
purchaseInvoice, purchaseOrder, purchaseReceipt, recurringInvoice,
recurringTransaction, referral, refreshToken, relationTuple,
retentionBonus, reviewTemplate, revokedToken, rfq, salaryComponent,
salarySlip, salesPerson, salesStage, sandbox, securityIncident, session,
shiftAssignment, shiftType, skill, slackIntegration, slo, smtpConfig,
ssoProvider, ssoUserLink, staff, staffingPlan, statusSubscriber,
subcontractingSettings, subscription, successionPlan, supplier,
supplierGroup, supplierQuotation, systemComponent, teamActivityLog,
telegramIntegration, temporaryIPAllowance, territory, threadMessage,
timeEntry, trade, tradeStats, tradingAccount, training, trelloIntegration,
uiAccessConfig, userLocation, userSetupProgress, vehicle, vendor,
walkthrough, webhook, webhookDelivery, whatsappBroadcast,
whatsappConversation, whatsappMessage, whatsappTemplate, zoomIntegration
```

### 2. Route Permission Gaps

**66 routes use `userMiddleware` but NOT `firmFilter`**

These routes have broken firm isolation because `req.firmId` is never set:

| Route | Issue | Risk Level |
|-------|-------|------------|
| calendar.route.js | No firmFilter, events visible across firms | CRITICAL |
| document.route.js | Uses req.firmId but it's undefined | CRITICAL |
| account.route.js | Returns ALL accounts from ALL firms | CRITICAL |
| activity.route.js | Uses lawyerId not firmId | HIGH |
| auditLog.route.js | Cross-firm audit trail access | CRITICAL |
| conversation.route.js | Mixed marketplace + CRM | HIGH |
| appointment.route.js | No firm filtering | HIGH |
| bankAccount.route.js | 21 missing firmId refs | HIGH |
| bill.route.js | Financial data exposed | HIGH |
| (61 more routes...) | Various issues | MEDIUM-HIGH |

### 3. OAuth vs Normal Login Differences

| Aspect | Normal Login | OAuth |
|--------|--------------|-------|
| User identification | Username/email + password | External provider ID + email matching |
| SSO Link tracking | None | Creates/updates SsoUserLink |
| bypassFirmFilter | ✅ Used for solo users | ✅ Used (fixed in commit f56a3ad) |
| Tenant context | Full tenant object with subscription | Missing (needs fix) |
| MFA | Built-in TOTP/backup codes | Delegated to provider |
| Session creation | In auth controller | In OAuth callback |
| CSRF token | Generated and set | Missing |
| Response fields | Full user + firm context | Fixed in commit acd27bc |

**Why OAuth causes errors:**
1. Solo lawyers have NO firmId - they work independently
2. OAuth users might not have firmId yet if auto-provisioned
3. Models query without bypassFirmFilter - they assume firmId exists
4. Fix applied (commit 4dd7b98): RLS plugin now accepts lawyerId as alternative

## Permission System Architecture

### Solo Lawyer Permissions
```javascript
solo_lawyer: {
    modules: {
        clients: 'full',
        cases: 'full',
        leads: 'full',
        invoices: 'full',
        payments: 'full',
        expenses: 'full',
        documents: 'full',
        tasks: 'full',
        events: 'full',
        timeTracking: 'full',
        reports: 'full',
        settings: 'full',
        team: 'none',        // No team management
        hr: 'none'           // No HR access
    },
    special: {
        canApproveInvoices: true,
        canManageRetainers: true,
        canExportData: true,
        canDeleteRecords: true,
        canViewFinance: true,
        canManageTeam: false,
        canCreateFirm: true,
        canJoinFirm: true
    },
    workMode: {
        isSolo: true,
        hasNoTenant: true,
        dataFilterBy: 'lawyerId'  // NOT firmId
    }
}
```

### Firm Member Permissions

Permissions stored in `firm.members[].permissions`:
- Role-based defaults: owner > admin > partner > lawyer > paralegal > secretary
- Custom overrides possible per member
- Data filtered by `firmId`

### Permission Levels
- `none` (0): No access
- `view` (1): Read-only
- `edit` (2): Create and update
- `full` (3): Create, update, and delete

### Role Hierarchy
```
OWNER (Level 7) → ADMIN (6) → PARTNER (5) → LAWYER (4)
→ ACCOUNTANT (3) → PARALEGAL (2) → SECRETARY (1) → DEPARTED (0)
```

## Invitation System

### Flow
1. **Create** (`POST /api/firms/:firmId/invitations`) - Owner/admin only
2. **Validate** (`GET /api/invitations/:code`) - Public endpoint
3. **Accept** (`POST /api/invitations/:code/accept`) - Authenticated user

### Invitation Model
```javascript
{
    code: 'INV-XXXXXXXXX',  // Unique 9-char code
    firmId: ObjectId,
    email: String,
    role: 'admin|partner|lawyer|paralegal|secretary|accountant',
    permissions: {},        // Optional custom permissions
    status: 'pending|accepted|expired|cancelled|declined',
    expiresAt: Date,        // Default: 7 days
    invitedBy: ObjectId
}
```

## User Removal

### Two Methods

| Aspect | Complete Removal | Graceful Departure |
|--------|------------------|-------------------|
| Endpoint | DELETE /members/:id | POST /members/:id/depart |
| Member Array | REMOVED | Status → 'departed' |
| User.firmId | UNSET | KEPT |
| Data Access | NONE | Read-only to assigned cases |
| Reinstatement | No | Yes |

### Departed Permissions
```javascript
departed: {
    modules: {
        clients: 'none',
        cases: 'view',      // Read-only to assigned cases
        leads: 'none',
        invoices: 'none',
        documents: 'view',
        tasks: 'view',
        // ... all others: 'none'
    },
    restrictions: {
        onlyOwnItems: true,
        readOnly: true,
        cannotCreate: true,
        cannotUpdate: true
    }
}
```

## Approval Workflows

### Multi-Level Chain Support
```
Level 1: Manager → Level 2: Dept Head → Level 3: Finance Director
```

### Approver Types
1. `specific` - Hardcoded user IDs
2. `role` - All users with specified role
3. `manager` - Requester's direct manager
4. `dynamic` - Fetched from entity field path

### Approval Types per Level
- `any` - Any one approver passes the level
- `all` - All approvers must approve
- `majority` - Majority must approve

### Features
- Escalation after timeout
- Delegation to colleagues
- Skip conditions based on criteria
- Complete audit trail

## Recommended Fixes

### P0 - Critical (This Week)
1. Add `firmFilter` middleware to: calendar, document, account, activity routes
2. Add firmIsolation plugin to: lead, contact, employee, auditLog, securityIncident models
3. Fix account.controller.js to use `req.firmQuery` in all queries
4. Fix calendar.controller.js to filter by firmId

### P1 - High Priority (Next Sprint)
5. Add firmIsolation plugin to remaining 180+ models with firmId
6. Add tenant context to OAuth response
7. Standardize middleware usage across all 66 problematic routes
8. Fix document.route.js to ensure req.firmId is set

### P2 - Medium Priority
9. Create linting rules to detect queries missing firmId
10. Add integration tests verifying firmId enforcement
11. Document RLS system in architecture documentation
12. Audit remaining routes without firmFilter

## External SaaS RBAC References

### next-saas-rbac
- Uses CASL for ability-based permissions
- Organization-level isolation
- Role-based with custom abilities per role

### boxyhq/saas-starter-kit
- Team-based multi-tenancy
- SAML/SSO support
- Directory sync for enterprise

### nestjs-saas-rbac
- NestJS-based similar architecture
- Casbin-style policy enforcement
- Multi-tenant with workspace isolation

### next-14-saas-boilerplate
- Next.js 14 with server components
- Organization-based isolation
- Stripe subscription integration

## File References

- Firm Isolation Plugin: `/src/models/plugins/firmIsolation.plugin.js`
- Permissions Config: `/src/config/permissions.config.js`
- Firm Filter Middleware: `/src/middlewares/firmFilter.middleware.js`
- Firm Context Middleware: `/src/middlewares/firmContext.middleware.js`
- OAuth Service: `/src/services/oauth.service.js`
- Auth Controller: `/src/controllers/auth.controller.js`
- Firm Controller: `/src/controllers/firm.controller.js`
- Approval Workflow Model: `/src/models/approvalWorkflow.model.js`
- Approval Service: `/src/services/approval.service.js`
