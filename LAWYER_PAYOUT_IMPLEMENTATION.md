# Lawyer Payout System - Stripe Connect Implementation

## Overview
This implementation adds a comprehensive lawyer payout system using Stripe Connect to the TRAF3LI backend. The platform can now collect payments from clients AND pay lawyers their earnings with automatic commission calculation.

## Features Implemented

### 1. **Stripe Connect Integration**
- Express Connect accounts for fast lawyer onboarding
- Account verification and status tracking
- Dashboard access for lawyers to manage their Stripe account

### 2. **Payout Management**
- Request payouts with automatic commission calculation
- Track payout history and status
- Retry failed payouts
- Cancel pending payouts

### 3. **Commission System**
- Configurable commission rate per lawyer (default: 10%)
- Automatic gross/net amount calculation
- Platform commission tracking

### 4. **Webhook Handling**
- Real-time account status updates
- Payout success/failure notifications
- Automatic status synchronization with Stripe

## Architecture

### Database Schema

#### User Model Extensions (`/src/models/user.model.js`)
```javascript
{
  // Stripe Connect fields
  stripeConnectAccountId: String,        // Stripe Connect account ID
  stripePayoutEnabled: Boolean,          // Can receive payouts
  stripeOnboardingComplete: Boolean,     // Onboarding status
  stripeOnboardingCompletedAt: Date,     // When onboarding completed
  stripeAccountStatus: String,           // active|pending|restricted|disabled
  platformCommissionRate: Number,        // Commission % (default: 10)
}
```

#### Payout Model (`/src/models/payout.model.js`)
```javascript
{
  // Basic Info
  payoutNumber: String,                  // Auto-generated (PAYOUT-YYYYMM-00001)
  lawyerId: ObjectId,                    // Lawyer receiving payout
  status: String,                        // pending|processing|paid|failed|cancelled

  // Amounts
  grossAmount: Number,                   // Before commission
  platformCommission: Number,            // Platform's cut
  commissionRate: Number,                // % used for calculation
  netAmount: Number,                     // What lawyer receives
  currency: String,                      // Default: SAR

  // Stripe Details
  stripeConnectAccountId: String,
  stripePayoutId: String,                // Stripe payout ID
  stripeTransferId: String,              // Stripe transfer ID

  // Dates
  requestedAt: Date,
  processedAt: Date,
  paidAt: Date,
  expectedArrivalDate: Date,

  // References
  paymentIds: [ObjectId],                // Related payments
  caseIds: [ObjectId],                   // Related cases
  invoiceIds: [ObjectId],                // Related invoices
}
```

### API Endpoints

#### Stripe Connect Onboarding

**POST** `/api/lawyers/stripe/connect`
- Start Stripe Connect onboarding
- Creates Connect account and returns onboarding URL
- **Auth Required**: Yes (Lawyer only)
- **Request Body**:
  ```json
  {
    "returnUrl": "https://app.traf3li.com/lawyer/stripe/callback",
    "refreshUrl": "https://app.traf3li.com/lawyer/stripe/refresh"
  }
  ```
- **Response**:
  ```json
  {
    "error": false,
    "message": "Connect account created. Please complete onboarding.",
    "data": {
      "accountId": "acct_xxxxx",
      "onboardingUrl": "https://connect.stripe.com/setup/...",
      "expiresAt": "2025-12-24T12:00:00.000Z"
    }
  }
  ```

**GET** `/api/lawyers/stripe/callback`
- Handle OAuth callback after onboarding
- Updates account status
- **Auth Required**: Yes

**GET** `/api/lawyers/stripe/dashboard`
- Get Stripe Express Dashboard link
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "error": false,
    "data": {
      "url": "https://connect.stripe.com/express/..."
    }
  }
  ```

**GET** `/api/lawyers/stripe/account`
- Get current Connect account status
- **Auth Required**: Yes
- **Response**:
  ```json
  {
    "error": false,
    "data": {
      "hasAccount": true,
      "accountId": "acct_xxxxx",
      "payoutsEnabled": true,
      "onboardingComplete": true,
      "accountStatus": "active",
      "commissionRate": 10,
      "stripeDetails": {
        "chargesEnabled": false,
        "payoutsEnabled": true,
        "requirements": {
          "currentlyDue": [],
          "eventuallyDue": [],
          "pastDue": []
        }
      }
    }
  }
  ```

#### Payout Management

**POST** `/api/lawyers/payouts/request`
- Request a new payout
- **Auth Required**: Yes (Lawyer only)
- **Request Body**:
  ```json
  {
    "amount": 5000,
    "currency": "SAR",
    "description": "Earnings for January 2025",
    "paymentIds": ["60d5ec49f1b2c72b8c8e4f1a"],
    "invoiceIds": ["60d5ec49f1b2c72b8c8e4f1b"],
    "caseIds": ["60d5ec49f1b2c72b8c8e4f1c"]
  }
  ```
- **Response**:
  ```json
  {
    "error": false,
    "message": "Payout requested successfully",
    "data": {
      "payoutId": "60d5ec49f1b2c72b8c8e4f1d",
      "payoutNumber": "PAYOUT-202501-00001",
      "grossAmount": 5000,
      "platformCommission": 500,
      "netAmount": 4500,
      "status": "pending",
      "requestedAt": "2025-12-24T10:00:00.000Z"
    }
  }
  ```

**GET** `/api/lawyers/payouts`
- Get payout history
- **Auth Required**: Yes
- **Query Parameters**:
  - `status`: Filter by status (pending|processing|paid|failed|cancelled)
  - `startDate`: Filter by start date (ISO 8601)
  - `endDate`: Filter by end date (ISO 8601)
  - `limit`: Results per page (default: 50, max: 100)
  - `page`: Page number (default: 1)
- **Response**:
  ```json
  {
    "error": false,
    "data": {
      "payouts": [...],
      "pagination": {
        "total": 45,
        "page": 1,
        "limit": 50,
        "pages": 1
      }
    }
  }
  ```

**GET** `/api/lawyers/payouts/:id`
- Get payout details
- **Auth Required**: Yes
- **Response**: Full payout object with populated references

**POST** `/api/lawyers/payouts/:id/cancel`
- Cancel a pending payout
- **Auth Required**: Yes
- **Request Body**:
  ```json
  {
    "reason": "Wrong amount requested"
  }
  ```

**POST** `/api/lawyers/payouts/:id/retry`
- Retry a failed payout
- **Auth Required**: Yes

**GET** `/api/lawyers/payouts/stats`
- Get payout statistics
- **Auth Required**: Yes
- **Query Parameters**:
  - `startDate`: Filter by start date
  - `endDate`: Filter by end date
- **Response**:
  ```json
  {
    "error": false,
    "data": {
      "totalPayouts": 12,
      "totalGrossAmount": 60000,
      "totalCommission": 6000,
      "totalNetAmount": 54000,
      "paidAmount": 45000,
      "pendingAmount": 9000,
      "processingAmount": 0,
      "failedCount": 0
    }
  }
  ```

### Webhook Events

The system handles the following Stripe webhook events (via `/api/billing/webhook`):

#### `account.updated`
- Triggered when Connect account is updated
- Updates lawyer's account status and payout eligibility
- Tracks onboarding completion

#### `payout.paid`
- Triggered when payout is successful
- Updates payout status to 'paid'
- Records payout date and Stripe IDs

#### `payout.failed`
- Triggered when payout fails
- Updates payout status to 'failed'
- Records failure reason and code

#### `transfer.created` / `transfer.updated`
- Logged for debugging
- Tracks transfer to connected account

## Service Layer

### PayoutService (`/src/services/payout.service.js`)

Key methods:

```javascript
// Connect Account Management
createConnectAccount(lawyerId)
createAccountLink(accountId, returnUrl, refreshUrl)
createDashboardLink(accountId)
getConnectAccount(accountId)
updateAccountStatus(accountId, accountData)

// Payout Operations
calculateCommission(amount, rate)
createPayout(params)
processPayout(payoutId)
getPayoutHistory(lawyerId, filters)
getPayoutDetails(payoutId)
cancelPayout(payoutId, userId, reason)
retryPayout(payoutId)
getLawyerStats(lawyerId, filters)
```

## Environment Variables Required

Add these to your `.env` file:

```bash
# Existing Stripe variables
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Frontend URLs for redirects
FRONTEND_URL=https://app.traf3li.com
```

## Setup Instructions

### 1. Stripe Configuration

1. **Enable Stripe Connect**:
   - Go to https://dashboard.stripe.com/settings/connect
   - Enable "Express" accounts
   - Configure branding and settings

2. **Set up Webhooks**:
   - Go to https://dashboard.stripe.com/webhooks
   - Add endpoint: `https://api.traf3li.com/api/billing/webhook`
   - Select events:
     - `account.updated`
     - `payout.paid`
     - `payout.failed`
     - `transfer.created`
     - `transfer.updated`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 2. Database Migration

Run migration to update existing user records:

```javascript
// Add this to a migration script
const User = require('./src/models/user.model');

async function migrate() {
  await User.updateMany(
    { role: 'lawyer' },
    {
      $set: {
        platformCommissionRate: 10,
        stripePayoutEnabled: false,
        stripeOnboardingComplete: false
      }
    }
  );
}
```

### 3. Testing

#### Test Onboarding Flow:

```bash
# 1. Start onboarding
curl -X POST https://api.traf3li.com/api/lawyers/stripe/connect \
  -H "Authorization: Bearer YOUR_LAWYER_TOKEN" \
  -H "Content-Type: application/json"

# 2. Visit the returned onboardingUrl and complete the form
# 3. Check account status
curl -X GET https://api.traf3li.com/api/lawyers/stripe/account \
  -H "Authorization: Bearer YOUR_LAWYER_TOKEN"
```

#### Test Payout Request:

```bash
# Request payout
curl -X POST https://api.traf3li.com/api/lawyers/payouts/request \
  -H "Authorization: Bearer YOUR_LAWYER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "currency": "SAR",
    "description": "Test payout"
  }'
```

## Commission Calculation Example

```javascript
// Lawyer requests payout
Gross Amount:     5,000 SAR
Commission (10%):   500 SAR
Net Amount:       4,500 SAR (what lawyer receives)
```

The platform keeps the commission (500 SAR) and transfers the net amount (4,500 SAR) to the lawyer's Stripe Connect account.

## Security Considerations

1. **Authentication**: All endpoints require user authentication
2. **Authorization**: Only lawyers can access payout endpoints
3. **Ownership Verification**: Users can only view/manage their own payouts
4. **Webhook Verification**: All Stripe webhooks are signature-verified
5. **Input Validation**: All inputs validated with Joi schemas
6. **Firm Isolation**: Multi-tenancy support via firmId

## Error Handling

Common errors and solutions:

### "Stripe not configured"
- Ensure `STRIPE_SECRET_KEY` is set in `.env`
- Restart server after adding environment variable

### "Lawyer does not have a Stripe Connect account"
- Lawyer must complete onboarding first
- Call `/api/lawyers/stripe/connect` to start onboarding

### "Lawyer is not eligible for payouts"
- Stripe account verification incomplete
- Check `/api/lawyers/stripe/account` for requirements
- Complete any pending verification steps

### "Payout processing failed"
- Check Stripe Dashboard for error details
- Common issues:
  - Insufficient balance in platform account
  - Invalid bank account information
  - Account restrictions

## Future Enhancements

1. **Automatic Payouts**: Schedule automatic payouts (weekly/monthly)
2. **Minimum Threshold**: Set minimum payout amount
3. **Payout Reports**: Generate detailed payout reports
4. **Multi-Currency**: Support multiple currencies
5. **Batch Payouts**: Process multiple payouts at once
6. **Tax Reporting**: Generate tax documents (1099, etc.)
7. **Dispute Management**: Handle payout disputes
8. **Analytics Dashboard**: Visual payout analytics for lawyers

## Files Modified/Created

### New Files Created:
- `/src/models/payout.model.js` - Payout model
- `/src/services/payout.service.js` - Payout service
- `/src/controllers/payout.controller.js` - Payout controller
- `/src/routes/payout.route.js` - Payout routes

### Files Modified:
- `/src/models/user.model.js` - Added Stripe Connect fields
- `/src/models/index.js` - Exported Payout model
- `/src/routes/index.js` - Registered payout routes
- `/src/controllers/billing.controller.js` - Added webhook handlers

## Support

For issues or questions:
1. Check Stripe Dashboard for payout status
2. Review server logs for error details
3. Verify webhook configuration
4. Test in Stripe test mode first

## License

Part of the TRAF3LI platform.
