# KYC/AML Implementation Guide

## Overview

This implementation provides comprehensive Know Your Customer (KYC) and Anti-Money Laundering (AML) verification for the Saudi Arabian market, integrated with government verification APIs (Yakeen and Wathq).

## Features

- ✅ National ID verification via Yakeen API (Saudi citizens and residents)
- ✅ Business verification via Wathq API (Commercial registrations)
- ✅ Automatic KYC status tracking with expiration
- ✅ AML risk scoring and screening
- ✅ Manual document upload and review
- ✅ Admin review and approval workflow
- ✅ Comprehensive audit trail
- ✅ Middleware for protecting sensitive operations

## Architecture

### Components

1. **User Model** (`src/models/user.model.js`)
   - Added KYC-specific fields to User schema
   - Stores verification status, documents, and AML data

2. **KYC Verification Model** (`src/models/kycVerification.model.js`)
   - Separate collection for detailed verification history
   - Complete audit trail of all verification attempts

3. **KYC Service** (`src/services/kyc.service.js`)
   - Core business logic for KYC operations
   - Integration with Yakeen and Wathq APIs
   - AML screening algorithms

4. **KYC Controller** (`src/controllers/kyc.controller.js`)
   - HTTP request handlers for KYC endpoints

5. **KYC Routes** (`src/routes/kyc.route.js`)
   - API endpoint definitions

6. **KYC Middleware** (`src/middlewares/requireKYC.middleware.js`)
   - Route protection middleware
   - Enforces KYC verification for sensitive operations

## Installation & Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Yakeen API Configuration (Saudi National ID Verification)
YAKEEN_API_URL=https://yakeen.mic.gov.sa
YAKEEN_USERNAME=your_username
YAKEEN_PASSWORD=your_password
YAKEEN_CHARGE_CODE=your_charge_code

# Wathq API Configuration (Saudi Business Verification)
WATHQ_CONSUMER_KEY=your_consumer_key
WATHQ_CONSUMER_SECRET=your_consumer_secret
WATHQ_BASE_URL=https://api.wathq.sa/sandbox  # Use production URL for live
```

### 2. Run Migration

Initialize KYC fields for existing users:

```bash
node src/migrations/add-kyc-fields.js
```

### 3. Register Routes

Add KYC routes to your main routes file (`src/routes/index.js`):

```javascript
const kycRouter = require('./kyc.route');

// Register KYC routes
app.use('/api/kyc', kycRouter);
```

### 4. Apply Middleware

Protect sensitive routes with KYC verification:

```javascript
const { requireKYC } = require('../middlewares/requireKYC.middleware');

// Example: Require KYC for payment operations
router.post('/api/payments/create', authenticate, requireKYC, paymentController.create);

// Example: Require KYC for lawyers only
const { requireKYCForRoles } = require('../middlewares/requireKYC.middleware');
router.post('/api/cases/create', authenticate, requireKYCForRoles(['lawyer']), caseController.create);
```

## API Endpoints

### User Endpoints

#### 1. Initiate KYC Verification
```http
POST /api/kyc/initiate
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentType": "national_id"  // or "iqama", "commercial_registration"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "kycStatus": "pending",
    "kycInitiatedAt": "2024-01-01T00:00:00.000Z",
    "documentType": "national_id",
    "message": "KYC verification process initiated",
    "messageAr": "تم بدء عملية التحقق من الهوية"
  }
}
```

#### 2. Verify Identity (Automatic via Yakeen)
```http
POST /api/kyc/verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentType": "national_id",
  "nationalId": "1234567890",
  "birthDate": "1990-01-01"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "kycStatus": "verified",
    "kycVerifiedAt": "2024-01-01T00:00:00.000Z",
    "kycExpiresAt": "2029-01-01T00:00:00.000Z",
    "amlRiskScore": 10,
    "verificationSource": "yakeen",
    "message": "KYC verification successful",
    "messageAr": "تم التحقق من الهوية بنجاح"
  }
}
```

#### 3. Verify Business (Automatic via Wathq)
```http
POST /api/kyc/verify
Authorization: Bearer {token}
Content-Type: application/json

{
  "documentType": "commercial_registration",
  "crNumber": "1234567890"
}
```

#### 4. Submit Document (Manual Review)
```http
POST /api/kyc/submit
Authorization: Bearer {token}
Content-Type: application/json

{
  "type": "passport",
  "documentNumber": "A12345678",
  "fileUrl": "https://s3.amazonaws.com/bucket/passport.jpg"
}
```

#### 5. Get KYC Status
```http
GET /api/kyc/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user_id",
    "kycStatus": "verified",
    "kycVerifiedAt": "2024-01-01T00:00:00.000Z",
    "kycExpiresAt": "2029-01-01T00:00:00.000Z",
    "isExpired": false,
    "daysUntilExpiration": 1825,
    "documentsCount": 2,
    "verifiedDocuments": 2,
    "amlRiskScore": 10,
    "amlStatus": "clear"
  }
}
```

#### 6. Get KYC History
```http
GET /api/kyc/history
Authorization: Bearer {token}
```

### Admin Endpoints

#### 1. Review KYC Submission
```http
POST /api/kyc/review
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "userId": "user_id",
  "approved": true,
  "notes": "All documents verified",
  "documentIndex": 0
}
```

#### 2. Get Pending Verifications
```http
GET /api/kyc/admin/pending
Authorization: Bearer {admin_token}
```

#### 3. Get KYC Statistics
```http
GET /api/kyc/admin/stats
Authorization: Bearer {admin_token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1000,
    "verifiedUsers": 750,
    "pendingUsers": 150,
    "rejectedUsers": 50,
    "expiredUsers": 50,
    "verificationRate": 75.00
  }
}
```

### Webhook Endpoint

```http
POST /api/kyc/webhook
Content-Type: application/json

{
  "source": "yakeen",
  "userId": "user_id",
  "status": "verified",
  "data": { ... }
}
```

## User Model Fields

### KYC Status Fields
```javascript
{
  kycStatus: 'pending' | 'verified' | 'rejected' | 'expired' | null,
  kycVerifiedAt: Date,
  kycExpiresAt: Date,
  kycInitiatedAt: Date,
  kycRejectionReason: String,
  kycReviewedBy: ObjectId,
  kycReviewedAt: Date,
  kycReviewNotes: String
}
```

### KYC Documents
```javascript
{
  kycDocuments: [{
    type: 'national_id' | 'iqama' | 'passport' | 'commercial_registration' | ...,
    documentId: String,
    documentNumber: String,
    fileUrl: String,
    verifiedAt: Date,
    expiresAt: Date,
    verificationSource: 'yakeen' | 'wathq' | 'manual',
    status: 'pending' | 'verified' | 'rejected',
    rejectionReason: String,
    uploadedAt: Date
  }]
}
```

### Verified Identity (from Yakeen)
```javascript
{
  kycVerifiedIdentity: {
    nationalId: String,
    fullNameAr: String,
    fullNameEn: String,
    dateOfBirth: String,
    nationality: String,
    gender: String,
    verificationSource: String,
    verifiedAt: Date
  }
}
```

### Verified Business (from Wathq)
```javascript
{
  kycVerifiedBusiness: {
    crNumber: String,
    companyName: String,
    entityType: String,
    status: String,
    isActive: Boolean,
    verificationSource: String,
    verifiedAt: Date
  }
}
```

### AML Screening
```javascript
{
  amlRiskScore: Number,  // 0-100
  amlScreening: {
    lastScreenedAt: Date,
    status: 'clear' | 'review' | 'flagged',
    flags: [{
      type: String,
      description: String,
      severity: 'low' | 'medium' | 'high',
      detectedAt: Date
    }]
  }
}
```

## Middleware Usage

### requireKYC
Blocks access if KYC is not verified:

```javascript
const { requireKYC } = require('../middlewares/requireKYC.middleware');

router.post('/sensitive-operation', authenticate, requireKYC, controller.method);
```

### checkKYC
Soft check that doesn't block access:

```javascript
const { checkKYC } = require('../middlewares/requireKYC.middleware');

router.get('/profile', authenticate, checkKYC, (req, res) => {
  // req.kycVerified will be true/false
  // req.kycStatus will contain the status
});
```

### requireKYCForRoles
Require KYC only for specific roles:

```javascript
const { requireKYCForRoles } = require('../middlewares/requireKYC.middleware');

// Only lawyers need KYC
router.post('/create-case', authenticate, requireKYCForRoles(['lawyer']), controller.create);
```

## KYC Workflow

### 1. For Saudi Citizens/Residents (National ID/Iqama)

```
User → Initiate → Submit National ID + Birth Date → Yakeen API Verification
                                                    ↓
                                              [Automatic Verification]
                                                    ↓
                                            AML Screening → Verified
                                                    ↓
                                            Expires in 5 years (citizen)
                                            or 1 year (resident)
```

### 2. For Businesses (Commercial Registration)

```
User → Initiate → Submit CR Number → Wathq API Verification
                                            ↓
                                    [Check CR Status]
                                            ↓
                                        Verified
                                            ↓
                                    Expires in 1 year
```

### 3. For Manual Verification

```
User → Initiate → Upload Documents → Pending Review
                                            ↓
                                    Admin Manual Review
                                            ↓
                                    Approved/Rejected
                                            ↓
                                    Expires in 1 year
```

## Expiration Periods

- **Saudi Citizens**: 5 years
- **Residents (Iqama holders)**: 1 year
- **Business Verification**: 1 year
- **Manual Verification**: 1 year

## AML Risk Scoring

The system performs automatic AML screening with the following checks:

1. **New Account Check** (Low Risk - +10 points)
   - Accounts less than 30 days old

2. **Age Verification** (High Risk - +100 points)
   - Users under 18 years old

3. **Nationality Risk** (High Risk - +50 points)
   - Integration with OFAC/UN/EU sanctions lists (to be configured)

4. **Previous Rejection** (Medium Risk - +20 points)
   - Previously rejected KYC attempts

**Risk Levels:**
- 0-29: Clear (Low risk)
- 30-59: Review (Medium risk)
- 60-100: Flagged (High risk)

## Error Codes

| Code | Description |
|------|-------------|
| `AUTH_REQUIRED` | User not authenticated |
| `USER_NOT_FOUND` | User ID not found |
| `KYC_NOT_INITIATED` | KYC process not started |
| `KYC_PENDING` | Verification in progress |
| `KYC_REJECTED` | Verification was rejected |
| `KYC_EXPIRED` | Verification has expired |
| `KYC_NOT_VERIFIED` | KYC not verified |
| `KYC_CHECK_FAILED` | Error checking KYC status |

## Best Practices

1. **Always use HTTPS** for KYC endpoints
2. **Log all KYC events** using auditLog.service
3. **Implement rate limiting** on verification endpoints
4. **Validate webhook signatures** from external providers
5. **Store documents securely** (use encrypted S3 buckets)
6. **Regular AML screening** for high-value transactions
7. **Monitor expiration dates** and notify users
8. **Implement retry logic** for API failures

## Compliance

This implementation helps meet the following Saudi regulations:

- **SAMA (Saudi Arabian Monetary Authority)** KYC requirements
- **Anti-Money Laundering Law** (AML)
- **Combating Financing of Terrorism** (CFT)
- **Personal Data Protection Law** (PDPL)

## Testing

### Test with Mock Data

For testing without real API credentials, the services include mock implementations:

```javascript
// In yakeenService.js and wathqService.js
if (!this.isConfigured()) {
  // Returns mock verification failed response
}
```

### Test Flow

1. Create test user
2. Initiate KYC with test document type
3. Submit test National ID (1234567890)
4. Check verification status
5. Test middleware protection

## Troubleshooting

### Issue: Yakeen API returns 401
**Solution**: Check YAKEEN_USERNAME, YAKEEN_PASSWORD, and YAKEEN_CHARGE_CODE in .env

### Issue: Wathq API returns 401
**Solution**: Check WATHQ_CONSUMER_KEY and WATHQ_CONSUMER_SECRET in .env

### Issue: KYC status not updating
**Solution**: Check audit logs and API response in KYCVerification collection

### Issue: Middleware blocking valid users
**Solution**: Verify kycExpiresAt date and kycStatus in User document

## Future Enhancements

- [ ] Integration with international sanctions lists (OFAC, UN, EU)
- [ ] Biometric verification (facial recognition)
- [ ] Document OCR for automatic data extraction
- [ ] Real-time ID verification
- [ ] Enhanced AML transaction monitoring
- [ ] Periodic re-verification workflows
- [ ] Multi-language support for error messages
- [ ] SMS verification integration

## Support

For issues or questions:
1. Check logs in audit log collection
2. Review KYCVerification documents for detailed history
3. Contact Yakeen/Wathq support for API issues
4. Review SAMA compliance guidelines

## License

This implementation is part of the Traf3li backend system and subject to the project's license terms.
