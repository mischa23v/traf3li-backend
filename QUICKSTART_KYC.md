# KYC/AML Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Configure Environment Variables

Add these to your `.env` file:

```env
# Yakeen API (Saudi National ID Verification)
YAKEEN_API_URL=https://yakeen.mic.gov.sa
YAKEEN_USERNAME=your_yakeen_username
YAKEEN_PASSWORD=your_yakeen_password
YAKEEN_CHARGE_CODE=your_charge_code

# Wathq API (Saudi Business Verification)
WATHQ_CONSUMER_KEY=your_wathq_key
WATHQ_CONSUMER_SECRET=your_wathq_secret
WATHQ_BASE_URL=https://api.wathq.sa/sandbox
```

> **Note:** For testing without real credentials, the system will return mock responses.

### Step 2: Run Migration

Initialize KYC fields in your database:

```bash
node src/migrations/add-kyc-fields.js
```

### Step 3: Start Server

The KYC routes are already registered. Just start your server:

```bash
npm start
# or
npm run dev
```

## ✅ Verify Installation

Test that KYC endpoints are working:

```bash
# Login first
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Check KYC status (should return null for new users)
curl -X GET http://localhost:5000/api/kyc/status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Expected response:
```json
{
  "success": true,
  "data": {
    "kycStatus": null,
    "documentsCount": 0,
    "verifiedDocuments": 0
  }
}
```

## 📝 Basic Usage

### User Flow: Complete KYC Verification

#### Option 1: Automatic Verification (Saudi National ID)

```javascript
// 1. Initiate KYC
POST /api/kyc/initiate
{
  "documentType": "national_id"
}

// 2. Verify with Yakeen API
POST /api/kyc/verify
{
  "documentType": "national_id",
  "nationalId": "1234567890",  // 10 digits, starts with 1 or 2
  "birthDate": "1990-01-01"    // YYYY-MM-DD format
}

// 3. Check status
GET /api/kyc/status
```

#### Option 2: Automatic Verification (Commercial Registration)

```javascript
// 1. Initiate KYC
POST /api/kyc/initiate
{
  "documentType": "commercial_registration"
}

// 2. Verify with Wathq API
POST /api/kyc/verify
{
  "documentType": "commercial_registration",
  "crNumber": "1234567890"
}

// 3. Check status
GET /api/kyc/status
```

#### Option 3: Manual Verification (Document Upload)

```javascript
// 1. Initiate KYC
POST /api/kyc/initiate
{
  "documentType": "passport"
}

// 2. Submit document
POST /api/kyc/submit
{
  "type": "passport",
  "documentNumber": "A12345678",
  "fileUrl": "https://your-s3-bucket/documents/passport.jpg"
}

// 3. Status will be 'pending' until admin reviews
GET /api/kyc/status
```

### Protect Routes with KYC

```javascript
// In your route file
const { requireKYC } = require('../middlewares/requireKYC.middleware');

// Require KYC for payment creation
router.post('/api/payments/create',
  authenticate,
  requireKYC,  // <-- Add this middleware
  paymentController.create
);
```

### Admin Actions

```javascript
// Get pending verifications
GET /api/kyc/admin/pending

// Review and approve/reject
POST /api/kyc/review
{
  "userId": "user_id",
  "approved": true,
  "notes": "All documents verified"
}

// Get statistics
GET /api/kyc/admin/stats
```

## 🔐 Security Best Practices

1. **Always use HTTPS** in production
2. **Store documents in encrypted S3** buckets
3. **Implement rate limiting** on KYC endpoints
4. **Validate webhook signatures** from Yakeen/Wathq
5. **Log all KYC events** for compliance

## 📊 KYC Status Flow

```
null → pending → verified
            ↓
        rejected

verified → expired (after expiration period)
```

## 🎯 Common Use Cases

### 1. Require KYC for High-Value Transactions

```javascript
router.post('/api/transactions/create', authenticate, async (req, res) => {
  const { amount } = req.body;

  if (amount >= 10000) {
    const kycService = require('../services/kyc.service');
    const isValid = await kycService.isKYCValid(req.userID);

    if (!isValid) {
      return res.status(403).json({
        error: 'KYC required for transactions above 10,000 SAR',
        redirectTo: '/kyc/initiate'
      });
    }
  }

  // Process transaction
});
```

### 2. Show KYC Badge in Profile

```javascript
const { checkKYC } = require('../middlewares/requireKYC.middleware');

router.get('/api/profile', authenticate, checkKYC, (req, res) => {
  res.json({
    user: req.user,
    kycVerified: req.kycVerified,
    showVerificationBadge: req.kycVerified
  });
});
```

### 3. Role-Based KYC

```javascript
const { requireKYCForRoles } = require('../middlewares/requireKYC.middleware');

// Only lawyers need KYC
router.post('/api/marketplace/register',
  authenticate,
  requireKYCForRoles(['lawyer']),
  controller.register
);
```

## 🐛 Troubleshooting

### Issue: "KYC_NOT_INITIATED" error
**Solution:** User needs to call `/api/kyc/initiate` first

### Issue: Yakeen API returns 401
**Solution:** Check YAKEEN_USERNAME, YAKEEN_PASSWORD in .env

### Issue: Verification stuck in "pending"
**Solution:**
- For automatic: Check API credentials
- For manual: Admin needs to review via `/api/kyc/review`

### Issue: KYC expired
**Solution:** User needs to re-verify by calling `/api/kyc/verify` again

## 📚 Next Steps

1. Read the full documentation: [KYC_IMPLEMENTATION_GUIDE.md](./KYC_IMPLEMENTATION_GUIDE.md)
2. Review integration examples: [src/examples/kyc-integration-example.js](./src/examples/kyc-integration-example.js)
3. Configure Yakeen/Wathq production credentials
4. Implement frontend KYC flow
5. Set up automated expiration notifications

## 🆘 Support

- API Documentation: See [KYC_IMPLEMENTATION_GUIDE.md](./KYC_IMPLEMENTATION_GUIDE.md)
- Yakeen Documentation: https://yakeen.mic.gov.sa
- Wathq Documentation: https://developer.wathq.sa
- SAMA Compliance: https://www.sama.gov.sa

## ✅ Checklist

- [ ] Environment variables configured
- [ ] Migration script executed
- [ ] Server started successfully
- [ ] Test KYC status endpoint
- [ ] Protect sensitive routes with requireKYC middleware
- [ ] Configure production API credentials
- [ ] Set up expiration monitoring
- [ ] Test full verification flow
- [ ] Configure admin review workflow
- [ ] Implement frontend KYC UI

---

**Ready to go!** Your KYC/AML verification system is now fully functional. 🎉
