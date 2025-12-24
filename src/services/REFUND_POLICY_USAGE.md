# Refund Policy Automation Engine

## Overview

The Refund Policy Automation Engine provides automated refund processing based on configurable policies. It eliminates manual refund handling by automatically calculating eligibility, processing refunds, and integrating with payment gateways.

## Features

- **Automated Policy Evaluation**: Automatically determines refund eligibility based on configurable rules
- **Service Completion Tracking**: Tracks case progress to determine appropriate refund percentage
- **Multi-Gateway Support**: Integrates with Stripe and supports manual refunds
- **Approval Workflow**: Built-in approval system for refunds requiring manual review
- **Comprehensive Audit Trail**: Complete history of all refund requests and approvals
- **Time-Based Policies**: Automatic refund percentages based on time since purchase

## Refund Policies

### Policy Rules (Priority Order)

1. **FULL_REFUND (100%)**
   - Service not started
   - Within 24 hours of purchase
   - Auto-approved

2. **PARTIAL_75 (75%)**
   - Service not started
   - Within 7 days of purchase
   - Requires approval

3. **PARTIAL_50 (50%)**
   - Less than 25% service completed
   - Requires approval

4. **PARTIAL_25 (25%)**
   - Less than 50% service completed
   - Requires approval

5. **NO_REFUND (0%)**
   - More than 50% service completed
   - Auto-rejected

## API Reference

### Core Methods

#### getRefundEligibility(paymentId)

Check if a payment is eligible for refund and calculate the amount.

```javascript
const refundPolicyService = require('./services/refundPolicy.service');

const eligibility = await refundPolicyService.getRefundEligibility(paymentId);

console.log(eligibility);
// {
//   eligible: true,
//   reason: 'Full refund - Service not started within 24 hours',
//   policy: 'FULL_REFUND',
//   refundPercent: 100,
//   refundAmount: 1000,
//   originalAmount: 1000,
//   currency: 'SAR',
//   requiresApproval: false,
//   serviceTracking: {
//     serviceStarted: false,
//     serviceCompletionPercent: 0,
//     timeSincePurchase: 3600000
//   },
//   payment: { ... }
// }
```

#### calculateRefundAmount(paymentId, reason)

Calculate the refund amount based on policy.

```javascript
const result = await refundPolicyService.calculateRefundAmount(
  paymentId,
  'policy_based'
);

console.log(result);
// {
//   success: true,
//   eligible: true,
//   refundAmount: 750,
//   refundPercent: 75,
//   originalAmount: 1000,
//   currency: 'SAR',
//   policy: 'PARTIAL_75',
//   requiresApproval: true
// }
```

#### processRefund(paymentId, amount, reason, requestedBy, options)

Create and process a refund request.

```javascript
const result = await refundPolicyService.processRefund(
  paymentId,
  null,  // Use policy-calculated amount
  'service_cancelled',
  userId,
  {
    reasonDetails: 'Client cancelled within 24 hours',
    refundMethod: 'original',
    processImmediately: true,  // Process if auto-approved
    autoApprove: false,        // Override approval requirement
    internalNotes: 'VIP client - expedite refund',
    customerNotes: 'Your refund will be processed within 5-7 business days'
  }
);

console.log(result);
// {
//   success: true,
//   refund: {
//     _id: '...',
//     refundNumber: 'RFD-202401-0001',
//     status: 'pending',
//     requestedAmount: 1000,
//     ...
//   }
// }
```

#### getRefundHistory(userId, options)

Get refund history for a customer.

```javascript
const history = await refundPolicyService.getRefundHistory(
  customerId,
  {
    limit: 10,
    skip: 0,
    status: 'completed',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    firmId: firmId
  }
);

console.log(history);
// {
//   refunds: [...],
//   total: 5,
//   limit: 10,
//   skip: 0,
//   hasMore: false
// }
```

### Approval & Processing Methods

#### approveRefund(refundId, approverId, approvedAmount, notes)

Approve a pending refund request.

```javascript
const refund = await refundPolicyService.approveRefund(
  refundId,
  approverId,
  750,  // Can adjust amount
  'Approved with 75% refund due to partial service'
);

console.log(refund.status); // 'approved'
```

#### rejectRefund(refundId, rejectorId, reason)

Reject a refund request.

```javascript
const refund = await refundPolicyService.rejectRefund(
  refundId,
  managerId,
  'Service already 60% completed - beyond refund policy threshold'
);

console.log(refund.status); // 'rejected'
```

#### executeRefund(refundId, processedBy)

Execute an approved refund (process the actual refund).

```javascript
const refund = await refundPolicyService.executeRefund(
  refundId,
  adminUserId
);

console.log(refund.status); // 'completed'
console.log(refund.processingDetails.gatewayRefundId); // Stripe refund ID
```

### Statistics & Reporting

#### getRefundStatistics(filters)

Get refund statistics for reporting.

```javascript
const stats = await refundPolicyService.getRefundStatistics({
  firmId: firmId,
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});

console.log(stats);
// {
//   overview: {
//     totalRefunds: 45,
//     totalRequested: 45000,
//     totalApproved: 42000,
//     totalProcessed: 40000,
//     pendingCount: 3,
//     completedCount: 40,
//     rejectedCount: 2
//   },
//   byPolicy: [
//     { _id: 'FULL_REFUND', count: 20, totalAmount: 20000, avgRefundPercent: 100 },
//     { _id: 'PARTIAL_75', count: 15, totalAmount: 15000, avgRefundPercent: 75 },
//     ...
//   ],
//   averageRefundPercent: 82.5
// }
```

#### getPendingRefunds(firmId, options)

Get all pending refund requests for approval.

```javascript
const pending = await refundPolicyService.getPendingRefunds(
  firmId,
  { limit: 20, skip: 0 }
);

console.log(pending);
// {
//   refunds: [...],
//   total: 3,
//   hasMore: false
// }
```

## Usage Examples

### Example 1: Customer Self-Service Refund

```javascript
// In your customer portal API
router.post('/api/refunds/request', async (req, res) => {
  try {
    const { paymentId, reason, reasonDetails } = req.body;
    const customerId = req.user.id;

    // Check eligibility
    const eligibility = await refundPolicyService.getRefundEligibility(paymentId);

    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibility.reason
      });
    }

    // Process refund
    const result = await refundPolicyService.processRefund(
      paymentId,
      null,  // Use policy amount
      reason,
      customerId,
      {
        reasonDetails,
        processImmediately: !eligibility.requiresApproval
      }
    );

    res.json({
      success: true,
      refund: result.refund,
      message: eligibility.requiresApproval
        ? 'Refund request submitted for approval'
        : 'Refund processed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
```

### Example 2: Admin Approval Dashboard

```javascript
// Get pending refunds for admin dashboard
router.get('/api/admin/refunds/pending', async (req, res) => {
  try {
    const firmId = req.user.firmId;

    const pending = await refundPolicyService.getPendingRefunds(firmId, {
      limit: 50
    });

    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve refund
router.post('/api/admin/refunds/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;
    const adminId = req.user.id;

    const refund = await refundPolicyService.approveRefund(
      id,
      adminId,
      amount,
      notes
    );

    // Execute immediately after approval
    await refundPolicyService.executeRefund(id, adminId);

    res.json({
      success: true,
      refund
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Example 3: Scheduled Refund Processing

```javascript
// Process all approved refunds (can be run as a cron job)
async function processApprovedRefunds() {
  const approvedRefunds = await Refund.find({ status: 'approved' })
    .limit(100);

  for (const refund of approvedRefunds) {
    try {
      await refundPolicyService.executeRefund(
        refund._id,
        'system'  // System user ID
      );

      logger.info('Refund processed', {
        refundNumber: refund.refundNumber,
        amount: refund.approvedAmount
      });
    } catch (error) {
      logger.error('Failed to process refund', {
        refundNumber: refund.refundNumber,
        error: error.message
      });
    }
  }
}

// Run every hour
setInterval(processApprovedRefunds, 60 * 60 * 1000);
```

### Example 4: Custom Refund with Manual Review

```javascript
// Force a custom refund amount (override policy)
const result = await refundPolicyService.processRefund(
  paymentId,
  500,  // Custom amount (50% of $1000)
  'client_request',
  userId,
  {
    forceProcess: true,  // Override eligibility check
    reasonDetails: 'VIP client - goodwill gesture',
    internalNotes: 'Approved by CEO for customer retention',
    refundMethod: 'bank_transfer'
  }
);
```

### Example 5: Webhook Integration (Stripe)

```javascript
// Handle Stripe refund webhook
router.post('/api/webhooks/stripe', async (req, res) => {
  const event = stripeService.verifyWebhookSignature(
    req.rawBody,
    req.headers['stripe-signature']
  );

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;

    // Find refund by gateway refund ID
    const refund = await Refund.findOne({
      'processingDetails.gatewayRefundId': charge.refunds.data[0].id
    });

    if (refund && refund.status === 'processing') {
      await refund.complete(
        charge.refunds.data[0].id,
        charge.refunds.data[0]
      );

      logger.info('Refund completed via webhook', {
        refundNumber: refund.refundNumber
      });
    }
  }

  res.json({ received: true });
});
```

## Service Completion Tracking

The refund policy engine tracks service completion through:

1. **Case Status**: Maps case status to completion percentage
   - `new`, `pending`: 0%
   - `active`: 25%
   - `in_progress`: 40%
   - `hearing_scheduled`: 50%
   - `verdict_pending`: 75%
   - `completed`, `closed`, `won`, `lost`: 100%

2. **Case Progress Field**: Uses explicit progress value if set

3. **Invoice Line Items**: Checks for time entries or expenses as indicators of work started

## Integration with Existing Systems

### Payment Model
- Updates payment status to 'refunded'
- Tracks refund details in payment record
- Maintains referential integrity

### Stripe Service
- Automatically processes Stripe refunds
- Handles webhook confirmations
- Supports partial refunds

### Case Model
- Tracks service completion percentage
- Determines refund eligibility based on case progress

### Invoice Model
- Checks for billable work (time/expenses)
- Helps determine if service has started

## Best Practices

1. **Always check eligibility first**
   ```javascript
   const eligibility = await refundPolicyService.getRefundEligibility(paymentId);
   if (!eligibility.eligible) {
     // Show error to user
   }
   ```

2. **Use policy-calculated amounts**
   ```javascript
   // Let the policy determine the amount
   await refundPolicyService.processRefund(paymentId, null, reason, userId);
   ```

3. **Provide detailed notes**
   ```javascript
   await refundPolicyService.processRefund(paymentId, null, reason, userId, {
     reasonDetails: 'Specific reason for refund',
     internalNotes: 'Internal context for approval',
     customerNotes: 'Customer-facing message'
   });
   ```

4. **Handle errors gracefully**
   ```javascript
   try {
     await refundPolicyService.executeRefund(refundId, userId);
   } catch (error) {
     // Refund is automatically marked as failed
     // Notify admin for manual intervention
   }
   ```

5. **Monitor refund statistics**
   ```javascript
   // Weekly refund report
   const stats = await refundPolicyService.getRefundStatistics({
     firmId,
     startDate: lastWeek,
     endDate: now
   });
   ```

## Error Handling

The service throws descriptive errors:

- `Payment not found`
- `Payment already refunded`
- `Payment not completed yet`
- `Refund not eligible: [reason]`
- `Only pending refunds can be approved`
- `Only approved refunds can be executed`
- `Refund amount cannot exceed original payment amount`

Always wrap calls in try-catch blocks and handle errors appropriately.

## Database Schema

### Refund Model Fields

- **Status**: `pending`, `approved`, `processing`, `completed`, `failed`, `rejected`, `cancelled`
- **Type**: `full`, `partial`, `custom`
- **Method**: `original`, `bank_transfer`, `cash`, `credit_note`
- **Tracking**: Service completion, purchase date, time elapsed
- **Approval**: History, approver, dates, notes
- **Processing**: Gateway details, transaction IDs, completion dates
- **Audit**: Created by, updated by, timestamps

## Configuration

### Custom Policies

You can modify policies in `/src/services/refundPolicy.service.js`:

```javascript
const REFUND_POLICIES = {
  CUSTOM_POLICY: {
    priority: 6,
    conditions: {
      serviceCompletionPercent: { max: 10 },
      timeSincePurchase: { max: 48 * 60 * 60 * 1000 }  // 48 hours
    },
    refundPercent: 90,
    requiresApproval: true,
    description: 'Custom 90% refund policy'
  }
};
```

### Policy Priority

Lower priority numbers are evaluated first. First matching policy wins.

## Testing

```javascript
// Test refund eligibility
const testEligibility = async () => {
  const result = await refundPolicyService.getRefundEligibility(paymentId);
  console.log('Eligibility:', result);
};

// Test full workflow
const testFullWorkflow = async () => {
  // 1. Check eligibility
  const eligibility = await refundPolicyService.getRefundEligibility(paymentId);

  // 2. Create refund
  const result = await refundPolicyService.processRefund(
    paymentId, null, 'test', userId
  );

  // 3. Approve
  await refundPolicyService.approveRefund(result.refund._id, approverId);

  // 4. Execute
  await refundPolicyService.executeRefund(result.refund._id, adminId);

  console.log('Workflow complete');
};
```

## Support

For questions or issues, contact the development team or refer to the main documentation.
