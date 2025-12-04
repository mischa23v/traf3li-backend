# FRONTEND INTEGRATION GUIDE - LAWYER-FRIENDLY ACCOUNTING
## TRAF3LI Law Firm Management System

---

## PHILOSOPHY: Hide Complexity, Keep Power
- **User sees**: Simple financial tracking (Invoices, Payments, Expenses)
- **System does**: Full double-entry accounting behind the scenes
- **No scary terms**: No "Debit", "Credit", "Journal Entry", "Chart of Accounts"

---

## API BASE URL
```
Production: https://api.traf3li.com/api
Development: http://localhost:8080/api
```

---

## SIMPLIFIED NAVIGATION

### المالية (Finance) - Main Section
Keep these existing pages:
- 📊 لوحة الحسابات (Dashboard/Overview)
- 📄 الفواتير (Invoices)
- 💳 المدفوعات (Payments)
- 💰 المصروفات (Expenses)
- 🔄 المعاملات (Transactions)
- ⏱️ تتبع الوقت (Time Tracking)

Add these simple items:
- 📋 التقارير (Reports) → User-friendly reports
- ⚙️ الإعدادات المالية (Financial Settings) → Hide accounts setup here
- 🔁 المعاملات المتكررة (Recurring) → For recurring bills/invoices

---

## PHASE 1: AUTOMATIC ACCOUNT CREATION

### Backend Seeds Default Accounts
Run once after deployment:
```bash
npm run seed:accounts
```

This creates 60+ accounts including:
- Bank accounts (1102: Bank Account - Main)
- Accounts Receivable (1110)
- Accounts Payable (2010)
- Service Income accounts (4100-4105)
- Expense accounts (5200-5600)

### API: Get Account Types (for dropdowns)
```
GET /api/accounts/types
```
Response:
```json
{
  "success": true,
  "data": {
    "types": ["asset", "liability", "equity", "income", "expense"],
    "subTypes": {
      "asset": ["current_asset", "fixed_asset", "bank", "cash", "receivable"],
      "liability": ["current_liability", "long_term_liability", "payable"],
      "income": ["operating_income", "other_income"],
      "expense": ["operating_expense", "administrative", "cost_of_sales"]
    }
  }
}
```

### Hidden Settings UI (Collapsed Accordion)

**File**: `src/routes/_authenticated/dashboard.settings.finance.tsx`

```tsx
// Inside Advanced Settings accordion:
<AccordionItem value="banks">
  <AccordionTrigger>البنوك (Banks)</AccordionTrigger>
  <AccordionContent>
    {/* GET /api/accounts?type=asset&subType=bank */}
  </AccordionContent>
</AccordionItem>

<AccordionItem value="income-types">
  <AccordionTrigger>أنواع الدخل (Income Types)</AccordionTrigger>
  <AccordionContent>
    {/* GET /api/accounts?type=income */}
  </AccordionContent>
</AccordionItem>

<AccordionItem value="expense-types">
  <AccordionTrigger>أنواع المصروفات (Expense Types)</AccordionTrigger>
  <AccordionContent>
    {/* GET /api/accounts?type=expense */}
  </AccordionContent>
</AccordionItem>
```

---

## PHASE 2: INVOICE FLOW (Auto GL Posting)

### Create Invoice
```
POST /api/invoices
```
Body:
```json
{
  "clientId": "...",
  "caseId": "...",
  "items": [
    { "description": "استشارة قانونية", "quantity": 2, "unitPrice": 50000 }
  ],
  "dueDate": "2024-02-15",
  "notes": "..."
}
```

### Post Invoice to GL (When status changes to 'sent')
```
POST /api/invoices/:id/post-to-gl
```
**Behind the scenes**:
- Creates GL entry: DR Accounts Receivable, CR Service Revenue
- Links GL entry to invoice
- No user action needed

### Record Payment on Invoice
```
POST /api/invoices/:id/record-payment
```
Body:
```json
{
  "amount": 50000,
  "paymentDate": "2024-01-20",
  "paymentMethod": "bank_transfer",
  "bankAccountId": "..." // Optional - uses default if not provided
}
```
**Behind the scenes**:
- Creates Payment record
- Creates GL entry: DR Bank, CR Accounts Receivable
- Updates invoice status (partial/paid)

---

## PHASE 3: EXPENSE FLOW (Auto Categorization)

### Category to Account Mapping (Built-in)
The backend automatically maps expense categories to accounts:

| Category | Arabic | Account Code |
|----------|--------|--------------|
| office_supplies | مستلزمات مكتبية | 5203 |
| travel | سفر | 5300 |
| court_fees | رسوم المحكمة | 5401 |
| professional_services | خدمات مهنية | 5400 |
| software | برامج | 5204 |
| communication | اتصالات | 5210 |
| transport | مواصلات | 5301 |
| meals | وجبات | 5303 |
| other | أخرى | 5600 |

### Create Expense
```
POST /api/expenses
```
Body:
```json
{
  "category": "court_fees",
  "description": "رسوم تقديم الدعوى",
  "amount": 150000,
  "date": "2024-01-15",
  "caseId": "...",
  "vendor": "المحكمة التجارية",
  "paymentMethod": "bank_transfer"
}
```

### Approve Expense (Posts to GL)
```
PATCH /api/expenses/:id
```
Body:
```json
{
  "status": "approved"
}
```
**Behind the scenes**:
- Creates GL entry: DR Expense Account (based on category), CR Bank/Cash
- Links GL entry to expense

---

## PHASE 4: TRANSACTION HISTORY (User-Friendly GL View)

### API Endpoint
```
GET /api/general-ledger/entries
```

Query params:
- `startDate` - Filter start date
- `endDate` - Filter end date
- `referenceModel` - Filter by type: Invoice, Payment, Expense, Bill
- `caseId` - Filter by case
- `clientId` - Filter by client
- `page` - Pagination page
- `limit` - Items per page (default 50)

### Frontend Display (Hide Accounting Terms)

**File**: `src/routes/_authenticated/dashboard.finance.transactions-history.tsx`

```tsx
// Transform GL entry for display
const formatTransaction = (entry) => ({
  date: formatDate(entry.transactionDate),
  description: entry.description, // "Invoice INV-001 from Client X"
  type: getTypeLabel(entry.referenceModel), // "فاتورة" / "دفعة" / "مصروف"
  amount: formatCurrency(entry.amount),
  case: entry.caseId?.caseNumber,
  status: entry.status
});

// Map reference model to Arabic label
const getTypeLabel = (model) => {
  const labels = {
    'Invoice': 'فاتورة',
    'Payment': 'دفعة',
    'Expense': 'مصروف',
    'Bill': 'فاتورة مورد',
    'JournalEntry': 'تسوية'
  };
  return labels[model] || model;
};
```

**DO NOT show**: Debit/Credit columns, Account codes, Entry numbers

---

## PHASE 5: USER-FRIENDLY REPORTS

### 1. Financial Summary (التقرير المالي)
Instead of "Profit & Loss"

```
GET /api/reports/profit-loss?startDate=2024-01-01&endDate=2024-12-31
```

Response:
```json
{
  "success": true,
  "data": {
    "period": { "startDate": "2024-01-01", "endDate": "2024-12-31" },
    "income": {
      "total": 15000000,
      "breakdown": [
        { "account": "رسوم استشارات قانونية", "amount": 8000000 },
        { "account": "رسوم تمثيل أمام المحاكم", "amount": 7000000 }
      ]
    },
    "expenses": {
      "total": 9000000,
      "breakdown": [
        { "account": "رواتب", "amount": 5000000 },
        { "account": "إيجار", "amount": 2000000 }
      ]
    },
    "netIncome": 6000000
  }
}
```

**Display as**:
```
الدخل (Income): 150,000 ر.س
المصروفات (Expenses): 90,000 ر.س
─────────────────────────
الربح الصافي (Net Profit): 60,000 ر.س
```

### 2. Case Profitability (ربحية القضايا)
```
GET /api/reports/case-profitability?startDate=2024-01-01&endDate=2024-12-31
```

Response:
```json
{
  "success": true,
  "data": {
    "cases": [
      {
        "caseId": "...",
        "caseNumber": "CASE-2024-001",
        "clientName": "شركة الأمل",
        "totalIncome": 5000000,
        "totalExpenses": 500000,
        "profit": 4500000,
        "profitMargin": 90
      }
    ],
    "summary": {
      "totalCases": 25,
      "totalIncome": 15000000,
      "totalExpenses": 3000000,
      "totalProfit": 12000000,
      "averageMargin": 80
    }
  }
}
```

### 3. Unpaid Invoices (الفواتير المستحقة)
Instead of "AR Aging"

```
GET /api/reports/ar-aging
```

Response:
```json
{
  "success": true,
  "data": {
    "summary": {
      "current": 5000000,
      "days1to30": 2000000,
      "days31to60": 1000000,
      "days61to90": 500000,
      "over90": 200000,
      "total": 8700000
    },
    "invoices": [...]
  }
}
```

**Display as**:
```
الفواتير الحالية (Current): 50,000 ر.س
متأخر 1-30 يوم: 20,000 ر.س
متأخر 31-60 يوم: 10,000 ر.س
متأخر أكثر من 60 يوم: 5,000 ر.س
```

### 4. Bank Summary (ملخص البنوك)
Instead of "Balance Sheet"

```
GET /api/reports/balance-sheet
```

**Display simplified version**:
```
البنوك (Banks): 80,000 ر.س
الفواتير المستحقة (Unpaid Invoices): 85,000 ر.س
```

### 5. Trial Balance (للمحاسب فقط)
Only show if "Accountant Mode" is enabled

```
GET /api/reports/trial-balance?asOfDate=2024-12-31
```

---

## PHASE 6: RECURRING TRANSACTIONS

### API Endpoints
```
GET    /api/recurring-transactions          # List all
GET    /api/recurring-transactions/upcoming # Next 30 days
POST   /api/recurring-transactions          # Create
PUT    /api/recurring-transactions/:id      # Update
POST   /api/recurring-transactions/:id/pause   # Pause
POST   /api/recurring-transactions/:id/resume  # Resume
POST   /api/recurring-transactions/:id/cancel  # Cancel
POST   /api/recurring-transactions/:id/generate # Manual trigger
POST   /api/recurring-transactions/process-due # Process all due (cron job)
```

### Create Recurring Invoice
```
POST /api/recurring-transactions
```
Body:
```json
{
  "name": "اشتراك شهري - شركة الأمل",
  "transactionType": "invoice",
  "frequency": "monthly",
  "dayOfMonth": 1,
  "startDate": "2024-02-01",
  "clientId": "...",
  "caseId": "...",
  "items": [
    { "description": "رسوم التوكيل الشهري", "quantity": 1, "unitPrice": 500000 }
  ],
  "paymentTerms": 15,
  "autoSend": true
}
```

### Frequency Options
- `daily`
- `weekly`
- `bi_weekly`
- `monthly`
- `quarterly`
- `semi_annual`
- `annual`

---

## PHASE 7: PRICE LEVELS (Client Tiers)

### API Endpoints
```
GET    /api/price-levels
GET    /api/price-levels/client-rate?clientId=...&baseRate=500&serviceType=consultation
POST   /api/price-levels
PUT    /api/price-levels/:id
DELETE /api/price-levels/:id
POST   /api/price-levels/:id/set-default
```

### Create Price Level
```
POST /api/price-levels
```
Body:
```json
{
  "code": "PREMIUM",
  "name": "العملاء المميزين",
  "nameAr": "العملاء المميزين",
  "pricingType": "percentage",
  "percentageAdjustment": -10,  // 10% discount
  "minimumRevenue": 10000000,   // 100,000 SAR lifetime revenue
  "minimumCases": 3,
  "priority": 10
}
```

### Get Effective Rate for Client
```
GET /api/price-levels/client-rate?clientId=xxx&baseRate=500&serviceType=consultation
```
Response:
```json
{
  "success": true,
  "data": {
    "baseRate": 500,
    "effectiveRate": 450,
    "priceLevel": {
      "code": "PREMIUM",
      "name": "العملاء المميزين",
      "adjustment": "-10%"
    }
  }
}
```

---

## PHASE 8: FISCAL PERIOD MANAGEMENT

### API Endpoints
```
GET    /api/fiscal-periods                    # List all
GET    /api/fiscal-periods/current            # Current open period
GET    /api/fiscal-periods/can-post?date=...  # Check if can post to date
GET    /api/fiscal-periods/years-summary      # Annual summary
POST   /api/fiscal-periods/create-year        # Create fiscal year
GET    /api/fiscal-periods/:id                # Get period details
GET    /api/fiscal-periods/:id/balances       # Calculate balances
POST   /api/fiscal-periods/:id/open           # Open period
POST   /api/fiscal-periods/:id/close          # Close period
POST   /api/fiscal-periods/:id/reopen         # Reopen period
POST   /api/fiscal-periods/:id/lock           # Lock permanently
POST   /api/fiscal-periods/:id/year-end-closing  # Perform year-end close
```

### Create Fiscal Year
```
POST /api/fiscal-periods/create-year
```
Body:
```json
{
  "fiscalYear": 2024,
  "startMonth": 1  // January (1-12)
}
```

### Check Before Posting Transaction
```
GET /api/fiscal-periods/can-post?date=2024-01-15
```
Response:
```json
{
  "success": true,
  "data": {
    "canPost": true,
    "period": {
      "id": "...",
      "name": "January 2024",
      "status": "open"
    }
  }
}
```

### Frontend Validation
```tsx
// Before saving any financial transaction:
const checkFiscalPeriod = async (date: Date) => {
  const response = await api.get(`/fiscal-periods/can-post?date=${date.toISOString()}`);

  if (!response.data.canPost) {
    toast.error('الفترة المالية مغلقة - لا يمكن إضافة معاملات');
    return false;
  }
  return true;
};
```

### Year-End Closing Wizard
```tsx
// Step 1: Review
const review = await api.get(`/fiscal-periods/${periodId}/balances`);

// Step 2: Confirm and Close
await api.post(`/fiscal-periods/${periodId}/year-end-closing`);
```

---

## PHASE 9: LEAD MANAGEMENT

### API Endpoints
```
GET    /api/leads                # List leads with filters
POST   /api/leads                # Create lead
GET    /api/leads/:id            # Get lead details
PUT    /api/leads/:id            # Update lead
DELETE /api/leads/:id            # Delete lead
POST   /api/leads/:id/convert    # Convert to client/case
PATCH  /api/leads/:id/stage      # Move in pipeline
POST   /api/leads/:id/activity   # Log activity
GET    /api/leads/stats          # Lead statistics
```

### Convert Lead to Client
```
POST /api/leads/:id/convert
```
Response:
```json
{
  "success": true,
  "message": "Lead converted to client successfully",
  "data": {
    "lead": { ... },
    "client": { ... }
  }
}
```

---

## PHASE 10: BILLS (Vendor Invoices)

### API Endpoints
```
GET    /api/bills               # List bills
POST   /api/bills               # Create bill
GET    /api/bills/:id           # Get bill
PUT    /api/bills/:id           # Update bill
DELETE /api/bills/:id           # Delete bill
POST   /api/bills/:id/approve   # Approve bill
POST   /api/bills/:id/pay       # Record payment
POST   /api/bills/:id/post-to-gl # Post to GL
```

### Create Bill with Line Items
```
POST /api/bills
```
Body:
```json
{
  "vendorId": "...",
  "billDate": "2024-01-15",
  "dueDate": "2024-02-15",
  "lines": [
    {
      "description": "خدمات استشارية",
      "quantity": 1,
      "unitCost": 500000,
      "caseId": "..."  // Optional - for job costing
    }
  ],
  "notes": "..."
}
```

---

## PHASE 11: VENDOR MANAGEMENT

### API Endpoints
```
GET    /api/vendors            # List vendors
POST   /api/vendors            # Create vendor
GET    /api/vendors/:id        # Get vendor with summary
PUT    /api/vendors/:id        # Update vendor
DELETE /api/vendors/:id        # Delete vendor
```

### Get Vendor with Balance
```
GET /api/vendors/:id
```
Response includes GL balance (what you owe them).

---

## PHASE 12: RETAINER (Trust) MANAGEMENT

### API Endpoints
```
GET    /api/retainers                    # List retainers
POST   /api/retainers                    # Create retainer
GET    /api/retainers/:id                # Get retainer
POST   /api/retainers/:id/deposit        # Add funds
POST   /api/retainers/:id/consume        # Use funds for case
GET    /api/retainers/:id/transactions   # Transaction history
```

### Deposit to Retainer
```
POST /api/retainers/:id/deposit
```
Body:
```json
{
  "amount": 1000000,
  "paymentMethod": "bank_transfer",
  "notes": "Initial retainer deposit"
}
```
**Behind the scenes**: DR Bank, CR Unearned Revenue

### Consume from Retainer
```
POST /api/retainers/:id/consume
```
Body:
```json
{
  "amount": 250000,
  "description": "Consultation - January 2024",
  "caseId": "..."
}
```
**Behind the scenes**: DR Unearned Revenue, CR Service Revenue

---

## CURRENCY HANDLING

### All amounts in Halalas
Backend stores all amounts as integers in **halalas** (1 SAR = 100 halalas).

**Frontend conversion**:
```tsx
// Display: Convert halalas to SAR
const formatCurrency = (halalas: number) => {
  const sar = halalas / 100;
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }).format(sar);
};

// Input: Convert SAR to halalas before sending
const toHalalas = (sar: number) => Math.round(sar * 100);
```

---

## ERROR HANDLING

### Fiscal Period Closed
```json
{
  "success": false,
  "message": "Cannot post to closed fiscal period",
  "error": "PERIOD_CLOSED"
}
```

### Insufficient Retainer Balance
```json
{
  "success": false,
  "message": "Insufficient retainer balance",
  "error": "INSUFFICIENT_BALANCE"
}
```

### Invoice Already Posted
```json
{
  "success": false,
  "message": "Invoice already posted to GL",
  "error": "ALREADY_POSTED"
}
```

---

## MIGRATION SCRIPTS

### For Existing Data
If you have existing invoices/bills/expenses without GL entries:

```bash
# Migrate all existing records to GL
npm run migrate:all

# Or individually:
npm run migrate:invoices
npm run migrate:bills
npm run migrate:expenses
```

---

## ACCOUNTANT MODE (Hidden)

For users who need full accounting access, add a toggle in Settings:

```tsx
// Settings > Advanced > Enable Accountant Mode
const [accountantMode, setAccountantMode] = useState(false);

// When enabled, show:
// - Journal Entries page
// - Trial Balance report
// - Full Chart of Accounts
// - GL entry details (debits/credits)
```

### Journal Entry API (Accountant Only)
```
GET    /api/journal-entries
POST   /api/journal-entries
POST   /api/journal-entries/simple    # Quick 2-line entry
GET    /api/journal-entries/:id
PUT    /api/journal-entries/:id
POST   /api/journal-entries/:id/post  # Post to GL
POST   /api/journal-entries/:id/void  # Void entry
DELETE /api/journal-entries/:id       # Delete draft
```

---

## WHAT'S NOT YET IN BACKEND (Future Phases)

These features from your instructions are NOT yet implemented:

1. **Intake Forms Model** - Custom intake form builder
2. **Workflow Automation** - Automated task creation triggers
3. **Custom Fields Model** - User-defined fields on entities
4. **Communication Hub** - Unified inbox (8x8 integration)
5. **Bank Statement Import** - CSV/OFX import
6. **Smart Categorization AI** - Auto-suggest expense categories

If you need any of these, let me know and I can implement them.

---

## QUICK REFERENCE: All Accounting Endpoints

| Feature | Endpoint | Method |
|---------|----------|--------|
| **Accounts** | `/api/accounts` | GET, POST, PUT, DELETE |
| **GL Entries** | `/api/general-ledger/entries` | GET |
| **Journal Entries** | `/api/journal-entries` | GET, POST, PUT, DELETE |
| **Fiscal Periods** | `/api/fiscal-periods` | GET, POST |
| **Recurring** | `/api/recurring-transactions` | GET, POST, PUT, DELETE |
| **Price Levels** | `/api/price-levels` | GET, POST, PUT, DELETE |
| **Reports** | `/api/reports/profit-loss` | GET |
| **Reports** | `/api/reports/balance-sheet` | GET |
| **Reports** | `/api/reports/trial-balance` | GET |
| **Reports** | `/api/reports/ar-aging` | GET |
| **Reports** | `/api/reports/case-profitability` | GET |

---

## SUMMARY

✅ **Implemented in Backend**:
- Double-entry accounting (hidden from users)
- Chart of Accounts with 60+ default accounts
- General Ledger with auto-posting
- Journal Entries for manual adjustments
- Financial Reports (P&L, Balance Sheet, Trial Balance, AR Aging, Case Profitability)
- Recurring Transactions (bills & invoices)
- Price Levels (client tiers)
- Fiscal Periods with year-end closing
- Currency handling (SAR/Halalas)
- Invoice/Payment/Bill/Expense GL integration
- Retainer trust accounting
- Lead management with conversion
- Vendor management with GL balance

🎯 **Frontend Goal**: Make it look simple while the backend does the complex accounting!
