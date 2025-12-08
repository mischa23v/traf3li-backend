# Bank Reconciliation & Multi-Currency Setup Guide

## Overview
This document provides setup instructions for the Bank Reconciliation and Multi-Currency features implemented for TRAF3LI backend.

## New Dependencies Required

Install the following packages:

```bash
npm install csv-parse string-similarity ofx-js
```

### Package Details:
- **csv-parse**: ^5.5.0 - CSV file parsing for transaction imports
- **string-similarity**: ^4.0.4 - Fuzzy matching for transaction descriptions
- **ofx-js**: ^0.4.0 - OFX (Open Financial Exchange) file parsing

## Files Created/Updated

### Models (New)
1. `/src/models/bankFeed.model.js` - Bank feed connections and import settings
2. `/src/models/bankMatchRule.model.js` - Auto-matching rules configuration
3. `/src/models/bankTransactionMatch.model.js` - Transaction match records
4. `/src/models/exchangeRate.model.js` - Multi-currency exchange rates

### Services (New)
1. `/src/services/bankReconciliation.service.js` - Core reconciliation logic
   - CSV/OFX import and parsing
   - Auto-matching engine
   - Fuzzy matching algorithms
   - Match scoring and suggestions

2. `/src/services/currency.service.js` - Currency conversion service
   - Exchange rate management
   - Multi-currency support (SAR, USD, EUR, GBP, AED, etc.)
   - API integration for live rates
   - Manual rate setting

### Controllers (Updated)
1. `/src/controllers/bankReconciliation.controller.js` - Extended with 20+ new endpoints

### Routes (Updated/New)
1. `/src/routes/bankReconciliation.route.js` - Updated with all new routes
2. `/src/routes/currency.route.js` - New dedicated currency routes

## API Endpoints

### Import Endpoints
- `POST /api/bank-reconciliation/import/csv` - Import CSV file
- `POST /api/bank-reconciliation/import/ofx` - Import OFX file
- `GET /api/bank-reconciliation/import/template` - Download CSV template

### Matching Endpoints
- `GET /api/bank-reconciliation/suggestions/:accountId` - Get match suggestions
- `POST /api/bank-reconciliation/auto-match/:accountId` - Run auto-match
- `POST /api/bank-reconciliation/match/confirm/:id` - Confirm match
- `POST /api/bank-reconciliation/match/reject/:id` - Reject match
- `POST /api/bank-reconciliation/match/split` - Create split match
- `DELETE /api/bank-reconciliation/match/:id` - Unmatch transaction

### Match Rules Endpoints
- `POST /api/bank-reconciliation/rules` - Create rule
- `GET /api/bank-reconciliation/rules` - List rules
- `PUT /api/bank-reconciliation/rules/:id` - Update rule
- `DELETE /api/bank-reconciliation/rules/:id` - Delete rule

### Reconciliation Endpoints (Existing + Enhanced)
- `POST /api/bank-reconciliation/` - Start reconciliation
- `GET /api/bank-reconciliation/` - List reconciliations
- `GET /api/bank-reconciliation/:id` - Get reconciliation details
- `POST /api/bank-reconciliation/:id/clear` - Clear transaction
- `POST /api/bank-reconciliation/:id/unclear` - Unclear transaction
- `POST /api/bank-reconciliation/:id/complete` - Complete reconciliation
- `POST /api/bank-reconciliation/:id/cancel` - Cancel reconciliation
- `GET /api/bank-reconciliation/status/:accountId` - Get account status
- `GET /api/bank-reconciliation/unmatched/:accountId` - Get unmatched transactions
- `GET /api/bank-reconciliation/statistics/matches` - Match statistics
- `GET /api/bank-reconciliation/statistics/rules` - Rule statistics

### Currency Endpoints
- `GET /api/currency/rates` - Get current rates
- `POST /api/currency/convert` - Convert amount
- `POST /api/currency/rates` - Set manual rate
- `GET /api/currency/supported` - List supported currencies
- `POST /api/currency/update` - Update rates from API

## Environment Variables

Add these to your `.env` file:

```env
# Exchange Rate API Keys (Optional - uses fallback rates if not provided)
EXCHANGE_RATE_API_KEY=your_api_key_here
OPEN_EXCHANGE_RATES_KEY=your_api_key_here

# Bank Feed Encryption Key (Required)
FEED_ENCRYPTION_KEY=your-32-character-encryption-key-here
```

## Supported Currencies

Default supported currencies:
- SAR (Saudi Riyal) - Base currency
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- AED (UAE Dirham)
- QAR (Qatari Riyal)
- KWD (Kuwaiti Dinar)
- BHD (Bahraini Dinar)
- OMR (Omani Rial)
- JOD (Jordanian Dinar)
- EGP (Egyptian Pound)
- TRY (Turkish Lira)
- JPY (Japanese Yen)
- CNY (Chinese Yuan)
- INR (Indian Rupee)
- PKR (Pakistani Rupee)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)

## Database Initialization

Run these commands to initialize default exchange rates:

```javascript
// In your MongoDB shell or initialization script
const currencyService = require('./src/services/currency.service');

// Initialize default rates
await currencyService.initializeDefaultRates();

// Update from API (optional)
await currencyService.updateRatesScheduled();
```

## CSV Import Format

### Standard Format
```csv
Date,Description,Amount,Type,Reference,Balance
2024-01-15,Payment from client,5000.00,credit,INV-001,25000.00
2024-01-16,Office rent,2000.00,debit,RENT-JAN,23000.00
```

### Alternative Format (Separate Debit/Credit Columns)
```csv
Date,Description,Debit,Credit,Reference,Balance
2024-01-15,Payment from client,,5000.00,INV-001,25000.00
2024-01-16,Office rent,2000.00,,RENT-JAN,23000.00
```

### Supported Date Formats
- YYYY-MM-DD (2024-01-15)
- DD/MM/YYYY (15/01/2024)
- MM/DD/YYYY (01/15/2024)

### CSV Import Options
- Custom delimiter (comma, semicolon, tab)
- Skip rows (for headers)
- Column mapping (flexible field names)
- Encoding (UTF-8, Latin-1, etc.)

## OFX Import

Supports standard OFX format from most banks:
- OFX 1.x (SGML)
- OFX 2.x (XML)

## Auto-Matching Features

### Match Scoring Algorithm
- Amount Match (40% weight)
- Date Match (30% weight)
- Description Match (30% weight)

### Match Confidence Levels
- **Exact** (95-100%): Identical match
- **High** (80-94%): Very likely match
- **Medium** (60-79%): Possible match
- **Low** (0-59%): Unlikely match

### Match Methods
- **Manual**: User confirmed
- **Rule-based**: Matched by defined rules
- **AI Suggested**: Algorithm suggested
- **Reference**: Matched by reference number
- **Auto**: Auto-confirmed (95%+ score)

## Match Rules Configuration

### Rule Criteria
1. **Amount Match**
   - Exact: Must match precisely
   - Range: Within tolerance percentage
   - Percentage: Within X% of amount

2. **Date Match**
   - Exact: Same day
   - Range: Within X days

3. **Description Match**
   - Contains: Description contains text
   - Exact: Exact match
   - Regex: Regular expression
   - Fuzzy: Similarity threshold
   - Starts with: Begins with text
   - Ends with: Ends with text

4. **Other Criteria**
   - Reference match
   - Vendor match
   - Client match
   - Category match
   - Amount range

### Rule Actions
- Auto-match transactions
- Auto-reconcile
- Set category
- Set account code
- Add tags
- Set payee

## Testing

### Test CSV Import
```bash
curl -X POST http://localhost:3000/api/bank-reconciliation/import/csv \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@transactions.csv" \
  -F "bankAccountId=ACCOUNT_ID" \
  -F "dateFormat=YYYY-MM-DD"
```

### Test Auto-Match
```bash
curl -X POST http://localhost:3000/api/bank-reconciliation/auto-match/ACCOUNT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Currency Conversion
```bash
curl -X POST http://localhost:3000/api/currency/convert \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "from": "SAR",
    "to": "USD"
  }'
```

## Performance Considerations

1. **Large CSV Files**: Files are processed in chunks to prevent memory issues
2. **Duplicate Detection**: Optimized queries with indexed fields
3. **Auto-Matching**: Limited to 100 transactions per request by default
4. **Exchange Rates**: Cached for 24 hours (API rates)

## Security Features

1. **File Upload Validation**: 5MB limit, allowed formats only
2. **Credential Encryption**: Bank feed credentials encrypted using AES-256
3. **Access Control**: All endpoints protected by authentication middleware
4. **Input Sanitization**: All user inputs validated and sanitized

## Monitoring & Logging

All operations are logged via BillingActivity:
- Transaction imports
- Auto-match operations
- Exchange rate updates
- Match confirmations/rejections

## Troubleshooting

### CSV Import Fails
- Check file encoding (UTF-8 recommended)
- Verify date format matches specification
- Ensure amount values are numeric
- Check for required columns

### Auto-Match Not Working
- Verify match rules are active
- Check transaction date ranges
- Ensure candidate records exist (invoices, expenses)
- Review match score thresholds

### Currency Conversion Errors
- Check exchange rates are initialized
- Verify currency codes are valid (3-letter ISO codes)
- Update rates from API if stale

## Scheduled Tasks (Optional)

Add to your cron jobs:

```javascript
// Update exchange rates daily
const cron = require('node-cron');
const currencyService = require('./src/services/currency.service');

cron.schedule('0 2 * * *', async () => {
  console.log('Updating exchange rates...');
  await currencyService.updateRatesScheduled();
});
```

## Future Enhancements

1. **Bank API Integration**: Direct connection to banks (Plaid, Open Banking)
2. **Machine Learning**: Improved matching with ML models
3. **Bulk Operations**: Bulk confirm/reject matches
4. **Advanced Reports**: Detailed reconciliation analytics
5. **Mobile Support**: Mobile-optimized endpoints
6. **Real-time Sync**: WebSocket notifications for imports

## Support

For issues or questions:
1. Check logs in `/logs` directory
2. Review error messages in API responses
3. Verify database indexes are created
4. Check environment variables are set correctly

## Version History

- **v1.0.0** (2024-12-08): Initial implementation
  - CSV/OFX import
  - Auto-matching engine
  - Multi-currency support
  - Match rules
  - Reconciliation enhancements
