# Firm Isolation Issues Report

Generated: 2025-12-28T06:45:54.091Z

## Models Missing lawyerId Field

These models have `firmId` but are missing `lawyerId` for solo lawyer support:

- [ ] `activity.model.js`
- [ ] `activityType.model.js`
- [ ] `aiInteraction.model.js`
- [ ] `analyticsEvent.model.js`
- [ ] `apiKey.model.js`
- [ ] `appConnection.model.js`
- [ ] `appointment.model.js`
- [ ] `approvalRequest.model.js`
- [ ] `approvalRule.model.js`
- [ ] `approvalWorkflow.model.js`
- [ ] `archivedAuditLog.model.js`
- [ ] `asset.model.js`
- [ ] `assetCategory.model.js`
- [ ] `assetMovement.model.js`
- [ ] `assetRepair.model.js`
- [ ] `assetSettings.model.js`
- [ ] `auditLog.model.js`
- [ ] `automatedAction.model.js`
- [ ] `automation.model.js`
- [ ] `batch.model.js`
- [ ] `billingActivity.model.js`
- [ ] `billingInvoice.model.js`
- [ ] `bin.model.js`
- [ ] `biometricDevice.model.js`
- [ ] `biometricEnrollment.model.js`
- [ ] `biometricLog.model.js`
- [ ] `blockComment.model.js`
- [ ] `blockConnection.model.js`
- [ ] `bom.model.js`
- [ ] `broker.model.js`
- [ ] `budget.model.js`
- [ ] `calibrationSession.model.js`
- [ ] `caseAuditLog.model.js`
- [ ] `caseNotionBlock.model.js`
- [ ] `caseNotionDatabaseView.model.js`
- [ ] `caseStageProgress.model.js`
- [ ] `chatHistory.model.js`
- [ ] `chatterFollower.model.js`
- [ ] `churnEvent.model.js`
- [ ] `compensatoryLeave.model.js`
- [ ] `complianceAudit.model.js`
- [ ] `consent.model.js`
- [ ] `conversation.model.js`
- [ ] `costCenter.model.js`
- [ ] `crmSettings.model.js`
- [ ] `customField.model.js`
- [ ] `customFieldValue.model.js`
- [ ] `customerHealthScore.model.js`
- [ ] `cycle.model.js`
- [ ] `dealRoom.model.js`
- [ ] `discordIntegration.model.js`
- [ ] `documentAnalysis.model.js`
- [ ] `documentVersion.model.js`
- [ ] `docusignIntegration.model.js`
- [ ] `dunningHistory.model.js`
- [ ] `dunningPolicy.model.js`
- [ ] `emailCampaign.model.js`
- [ ] `emailEvent.model.js`
- [ ] `emailSegment.model.js`
- [ ] `emailSignature.model.js`
- [ ] `emailSubscriber.model.js`
- [ ] `emailTemplate.model.js`
- [ ] `emailTracking.model.js`
- [ ] `employeeIncentive.model.js`
- [ ] `employeePromotion.model.js`
- [ ] `employeeSkillMap.model.js`
- [ ] `employeeTransfer.model.js`
- [ ] `event.model.js`
- [ ] `exchangeRate.model.js`
- [ ] `exchangeRateRevaluation.model.js`
- [ ] `fieldHistory.model.js`
- [ ] `formulaField.model.js`
- [ ] `geofenceZone.model.js`
- [ ] `gig.model.js`
- [ ] `githubIntegration.model.js`
- [ ] `gmailIntegration.model.js`
- [ ] `googleCalendarIntegration.model.js`
- [ ] `hrSettings.model.js`
- [ ] `hrSetupWizard.model.js`
- [ ] `incident.model.js`
- [ ] `incidentExecution.model.js`
- [ ] `incomeTaxSlab.model.js`
- [ ] `inventorySettings.model.js`
- [ ] `investment.model.js`
- [ ] `investmentTransaction.model.js`
- [ ] `invoiceApproval.model.js`
- [ ] `item.model.js`
- [ ] `itemGroup.model.js`
- [ ] `itemPrice.model.js`
- [ ] `job.model.js`
- [ ] `jobCard.model.js`
- [ ] `journalEntry.model.js`
- [ ] `keyboardShortcut.model.js`
- [ ] `kycVerification.model.js`
- [ ] `ldapConfig.model.js`
- [ ] `leadScore.model.js`
- [ ] `leadScoringConfig.model.js`
- [ ] `leadSource.model.js`
- [ ] `leaveAllocation.model.js`
- [ ] `leaveEncashment.model.js`
- [ ] `leavePeriod.model.js`
- [ ] `leavePolicy.model.js`
- [ ] `leaveType.model.js`
- [ ] `legalDocument.model.js`
- [ ] `lifecycleWorkflow.model.js`
- [ ] `lockDate.model.js`
- [ ] `loginHistory.model.js`
- [ ] `lostReason.model.js`
- [ ] `macro.model.js`
- [ ] `maintenanceSchedule.model.js`
- [ ] `maintenanceWindow.model.js`
- [ ] `manufacturingSettings.model.js`
- [ ] `message.model.js`
- [ ] `notificationPreference.model.js`
- [ ] `notificationSettings.model.js`
- [ ] `omnichannelConversation.model.js`
- [ ] `order.model.js`
- [ ] `organizationTemplate.model.js`
- [ ] `pageActivity.model.js`
- [ ] `pageHistory.model.js`
- [ ] `paymentMethod.model.js`
- [ ] `paymentReceipt.model.js`
- [ ] `peerReview.model.js`
- [ ] `permission.model.js`
- [ ] `playbook.model.js`
- [ ] `pluginInstallation.model.js`
- [ ] `policyDecision.model.js`
- [ ] `policyViolation.model.js`
- [ ] `priceList.model.js`
- [ ] `product.model.js`
- [ ] `qualityAction.model.js`
- [ ] `qualityInspection.model.js`
- [ ] `qualityParameter.model.js`
- [ ] `qualitySettings.model.js`
- [ ] `qualityTemplate.model.js`
- [ ] `question.model.js`
- [ ] `relationTuple.model.js`
- [ ] `report.model.js`
- [ ] `reportDefinition.model.js`
- [ ] `retentionBonus.model.js`
- [ ] `review.model.js`
- [ ] `reviewTemplate.model.js`
- [ ] `routing.model.js`
- [ ] `salaryComponent.model.js`
- [ ] `salesPerson.model.js`
- [ ] `salesStage.model.js`
- [ ] `salesTeam.model.js`
- [ ] `sandbox.model.js`
- [ ] `savedFilter.model.js`
- [ ] `securityIncident.model.js`
- [ ] `serialNumber.model.js`
- [ ] `setupSection.model.js`
- [ ] `setupTask.model.js`
- [ ] `shiftAssignment.model.js`
- [ ] `shiftType.model.js`
- [ ] `skill.model.js`
- [ ] `sla.model.js`
- [ ] `slackIntegration.model.js`
- [ ] `slo.model.js`
- [ ] `sloMeasurement.model.js`
- [ ] `smtpConfig.model.js`
- [ ] `staffingPlan.model.js`
- [ ] `statusSubscriber.model.js`
- [ ] `stockEntry.model.js`
- [ ] `stockLedger.model.js`
- [ ] `stockReconciliation.model.js`
- [ ] `subcontractingOrder.model.js`
- [ ] `subcontractingReceipt.model.js`
- [ ] `subcontractingSettings.model.js`
- [ ] `subscription.model.js`
- [ ] `supportSLA.model.js`
- [ ] `supportSettings.model.js`
- [ ] `syncedBlock.model.js`
- [ ] `systemComponent.model.js`
- [ ] `tag.model.js`
- [ ] `taskDocumentVersion.model.js`
- [ ] `teamActivityLog.model.js`
- [ ] `telegramIntegration.model.js`
- [ ] `temporaryIPAllowance.model.js`
- [ ] `territory.model.js`
- [ ] `threadMessage.model.js`
- [ ] `ticket.model.js`
- [ ] `ticketCommunication.model.js`
- [ ] `trade.model.js`
- [ ] `tradeStats.model.js`
- [ ] `tradingAccount.model.js`
- [ ] `transaction.model.js`
- [ ] `trelloIntegration.model.js`
- [ ] `uiAccessConfig.model.js`
- [ ] `uom.model.js`
- [ ] `userActivity.model.js`
- [ ] `userLocation.model.js`
- [ ] `userSetupProgress.model.js`
- [ ] `vehicle.model.js`
- [ ] `view.model.js`
- [ ] `walkthrough.model.js`
- [ ] `warehouse.model.js`
- [ ] `webhook.model.js`
- [ ] `webhookDelivery.model.js`
- [ ] `whatsappBroadcast.model.js`
- [ ] `whatsappConversation.model.js`
- [ ] `whatsappMessage.model.js`
- [ ] `whatsappTemplate.model.js`
- [ ] `workOrder.model.js`
- [ ] `workflowInstance.model.js`
- [ ] `workflowTemplate.model.js`
- [ ] `workstation.model.js`
- [ ] `zoomIntegration.model.js`

## Controllers with Isolation Issues

These controllers build their own queries instead of using `req.firmQuery`:

### adminAudit.controller.js
- [ ] userId: adminUser._id || req.userId || req.userID,...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...

### adminCustomClaims.controller.js
- [ ] userId: adminUser._id || req.userId || req.userID,...

### adminDashboard.controller.js
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...

### adminFirms.controller.js
- [ ] userId: adminUser._id || req.userId || req.userID,...

### adminUsers.controller.js
- [ ] userId: adminUser._id || req.userId || req.userID,...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId: adminUser.firmId } : {}...

### audit.controller.js
- [ ] userId: req.userID,...

### auth.controller.js
- [ ] userId: request.userID || request.userId...

### brokers.controller.js
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId
        ? { _id: brokerId, firmId }
        : { _id: ...
- [ ] Ternary without lawyerId: firmId
        ? { _id: brokerId, firmId }
        : { _id: ...
- [ ] Ternary without lawyerId: firmId
        ? { _id: brokerId, firmId }
        : { _id: ...
- [ ] Ternary without lawyerId: firmId
        ? { _id: brokerId, firmId }
        : { _id: ...

### calendar.controller.js
- [ ] $or: [
                { assignedTo...
- [ ] $or: [
                { createdBy...

### case.controller.js
- [ ] userId: request.userID,...

### cloudStorage.controller.js
- [ ] userId: request.userID,...

### conflictCheck.controller.js
- [ ] const baseQuery = firmId ?...

### cspReport.controller.js
- [ ] userId: sanitizeForLog(req.userID),...

### discord.controller.js
- [ ] userId: request.userID,...

### event.controller.js
- [ ] $or: [
                { assignedTo...
- [ ] $or: [
                    { createdBy...
- [ ] const baseQuery = firmId
        ?...
- [ ] Ternary without lawyerId: firmId
        ? { firmId }
        : {
            $or: [
 ...
- [ ] Ternary without lawyerId: firmId
        ? { firmId }
        : {
            $or: [
 ...
- [ ] Ternary without lawyerId: firmId
        ? { firmId }
        : {
            $or: [
 ...

### fieldHistory.controller.js
- [ ] userId: req.userID,...

### gantt.controller.js
- [ ] $or: [
            { assignedTo...
- [ ] Ternary without lawyerId: firmId ? { firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId } : {}...

### investments.controller.js
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { investmentId: sanitizedId, firmId }
     ...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
            ? { investmentId: sanitizedId, firmId }
 ...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { firmId, status: 'active' }
        : { us...
- [ ] Ternary without lawyerId: firmId
        ? { firmId, status: 'active' }
        : { us...
- [ ] Ternary without lawyerId: firmId
        ? { firmId, status: 'active' }
        : { us...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { investmentId: sanitizedId, firmId }
     ...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedTransactionId, investmentId...
- [ ] Ternary without lawyerId: firmId
        ? { investmentId: sanitizedId, firmId }
     ...

### invoice.controller.js
- [ ] userId: req.userID,...

### journalEntry.controller.js
- [ ] Ternary without lawyerId: firmId ? { firmId: req.user.firmId } : {}...

### message.controller.js
- [ ] userId: request.userID,...

### notification.controller.js
- [ ] userId: sanitizeObjectId(request.userID)...

### order.controller.js
- [ ] userId: gig.userID._id,...

### permission.controller.js
- [ ] userId: req.userID,...

### preparedReport.controller.js
- [ ] userId: req.userID...

### proposal.controller.js
- [ ] userId: job.userID._id,...

### question.controller.js
- [ ] userId: request.userID,...

### smartButton.controller.js
- [ ] Ternary without lawyerId: firmId ? { firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId } : {}...
- [ ] Ternary without lawyerId: firmId ? { firmId } : {}...

### ssoConfig.controller.js
- [ ] userId: req.userID,...

### ssoRouting.controller.js
- [ ] userId: request.userID...

### staff.controller.js
- [ ] firmId
        ? { $or: [{ _id: id }, { staffId: i...

### stepUpAuth.controller.js
- [ ] userId: req.userID || req.userId...

### task.controller.js
- [ ] $or: [
                    { assignedTo...
- [ ] $or: [
            { createdBy...
- [ ] firmId
        ? { firmId: new mongoose.Types.Obje...
- [ ] const baseQuery = firmId
        ?...
- [ ] Ternary without lawyerId: firmId
        ? { firmId: new mongoose.Types.ObjectId(firmI...
- [ ] Ternary without lawyerId: firmId
        ? { firmId: new mongoose.Types.ObjectId(firmI...

### trades.controller.js
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...

### tradingAccounts.controller.js
- [ ] Ternary without lawyerId: firmId ? { _id: account._id, firmId } : { _id: account._id, ...
- [ ] Ternary without lawyerId: firmId ? { firmId } : { userId }...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...
- [ ] Ternary without lawyerId: firmId ? { _id: account._id, firmId } : { _id: account._id, ...
- [ ] Ternary without lawyerId: firmId
        ? { _id: sanitizedId, firmId }
        : { _i...

### transaction.controller.js
- [ ] userId: req.userID }, { session });...


## Services with Isolation Issues

### adminTools.service.js
- [ ] $or: [{ assignedTo...

### permissionEnforcer.service.js
- [ ] userId: req.userID,...


## How to Fix

### Models
Add `lawyerId` field to each model:
```javascript
// For solo lawyers (no firm) - enables row-level security
lawyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
},
```

### Controllers
Replace custom query building with `req.firmQuery`:
```javascript
// BEFORE (bad)
const baseQuery = firmId
    ? { firmId: new mongoose.Types.ObjectId(firmId) }
    : { $or: [{ assignedTo: userId }, { createdBy: userId }] };

// AFTER (good)
const baseQuery = req.firmQuery; // Already set by firmFilter middleware
```
