# Frontend Integration Guide: New Financial Reports

This document provides instructions for frontend developers to integrate the new ERPNext-equivalent financial reporting features.

## Overview

Six new report endpoints have been added to match ERPNext's financial reporting capabilities:

| Report | Endpoint | Purpose |
|--------|----------|---------|
| Budget Variance | `/api/reports/budget-variance` | Compare budgeted vs actual amounts |
| AP Aging | `/api/reports/ap-aging` | Accounts Payable aging analysis |
| Client Statement | `/api/reports/client-statement` | Customer ledger/statement of account |
| Vendor Ledger | `/api/reports/vendor-ledger` | Supplier statement/ledger |
| Gross Profit | `/api/reports/gross-profit` | Profitability by client/case/month |
| Cost Center | `/api/reports/cost-center` | P&L by department/case |

---

## 1. Budget Variance Report

### Endpoint
```
GET /api/reports/budget-variance
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fiscalYear` | number | Yes | Fiscal year (e.g., 2024) |
| `period` | string | Yes | `year`, `quarter-1` to `quarter-4`, or `month-1` to `month-12` |
| `departmentId` | string | No | Filter by department/cost center |

### Example Request
```javascript
const response = await fetch('/api/reports/budget-variance?fiscalYear=2024&period=quarter-4', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
```

### Response Structure
```json
{
  "success": true,
  "report": "budget-variance",
  "fiscalYear": 2024,
  "period": "quarter-4",
  "periodDates": {
    "startDate": "2024-10-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.999Z"
  },
  "generatedAt": "2024-12-10T...",
  "data": {
    "income": {
      "accounts": [
        {
          "accountCode": "4000",
          "accountName": "Legal Fees Revenue",
          "accountNameAr": "إيرادات الأتعاب القانونية",
          "budgetedAmount": 500000,
          "budgetedAmountSAR": "5,000.00 SAR",
          "actualAmount": 550000,
          "actualAmountSAR": "5,500.00 SAR",
          "variance": 50000,
          "varianceSAR": "500.00 SAR",
          "variancePercent": "10.00%",
          "status": "over",
          "favorability": "favorable"
        }
      ],
      "totalBudgeted": 500000,
      "totalActual": 550000,
      "totalVariance": 50000
    },
    "expenses": {
      "accounts": [...],
      "totalBudgeted": 300000,
      "totalActual": 280000,
      "totalVariance": -20000
    },
    "summary": {
      "budgetedNetProfit": 200000,
      "budgetedNetProfitSAR": "2,000.00 SAR",
      "actualNetProfit": 270000,
      "actualNetProfitSAR": "2,700.00 SAR",
      "netProfitVariance": 70000,
      "netProfitVarianceSAR": "700.00 SAR",
      "favorability": "favorable"
    }
  }
}
```

### UI Suggestions
- **Period Selector**: Dropdown with options for Year, Q1-Q4, Month 1-12
- **Fiscal Year Picker**: Year dropdown (2020-2030)
- **Table Columns**: Account, Budgeted, Actual, Variance, Variance %, Status
- **Color Coding**:
  - Green for favorable variance
  - Red for unfavorable variance
  - Yellow for on-track (within 5%)
- **Charts**: Bar chart comparing budgeted vs actual by account category

---

## 2. AP Aging Report

### Endpoint
```
GET /api/reports/ap-aging
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `asOfDate` | string | No | Date for aging calculation (default: today) |
| `vendorId` | string | No | Filter by specific vendor |

### Example Request
```javascript
const response = await fetch('/api/reports/ap-aging?asOfDate=2024-12-31', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Response Structure
```json
{
  "success": true,
  "report": "ap-aging",
  "asOfDate": "2024-12-31T00:00:00.000Z",
  "generatedAt": "2024-12-10T...",
  "data": {
    "summary": {
      "current": { "count": 5, "amount": 50000, "amountSAR": "500.00 SAR" },
      "days1to30": { "count": 3, "amount": 30000, "amountSAR": "300.00 SAR" },
      "days31to60": { "count": 2, "amount": 20000, "amountSAR": "200.00 SAR" },
      "days61to90": { "count": 1, "amount": 10000, "amountSAR": "100.00 SAR" },
      "days90Plus": { "count": 1, "amount": 5000, "amountSAR": "50.00 SAR" },
      "total": { "amount": 115000, "amountSAR": "1,150.00 SAR" }
    },
    "byVendor": [
      {
        "vendorId": "...",
        "vendorName": "Office Supplies Co",
        "vendorNameAr": "شركة اللوازم المكتبية",
        "current": 25000,
        "currentSAR": "250.00 SAR",
        "days1to30": 15000,
        "days1to30SAR": "150.00 SAR",
        "days31to60": 10000,
        "days31to60SAR": "100.00 SAR",
        "days61to90": 5000,
        "days61to90SAR": "50.00 SAR",
        "days90Plus": 0,
        "days90PlusSAR": "0.00 SAR",
        "total": 55000,
        "totalSAR": "550.00 SAR"
      }
    ]
  }
}
```

### UI Suggestions
- **Summary Cards**: Show total for each aging bucket with color coding
- **Vendor Table**: Expandable rows showing aging breakdown per vendor
- **Color Coding**:
  - Green: Current (not overdue)
  - Yellow: 1-30 days
  - Orange: 31-60 days
  - Red: 61-90 days
  - Dark Red: 90+ days
- **Chart**: Stacked bar chart or pie chart showing aging distribution
- **Date Picker**: Allow selecting "as of" date for historical analysis

---

## 3. Client Statement of Account

### Endpoint
```
GET /api/reports/client-statement
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `clientId` | string | Yes | Client/Customer ID |
| `startDate` | string | Yes | Period start date (ISO format) |
| `endDate` | string | Yes | Period end date (ISO format) |

### Example Request
```javascript
const response = await fetch(
  `/api/reports/client-statement?clientId=${clientId}&startDate=2024-01-01&endDate=2024-12-31`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

### Response Structure
```json
{
  "success": true,
  "report": "client-statement",
  "period": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.999Z"
  },
  "generatedAt": "2024-12-10T...",
  "clientInfo": {
    "clientId": "...",
    "name": "شركة المثال التجارية",
    "email": "client@example.com"
  },
  "openingBalance": {
    "amount": 50000,
    "amountSAR": "500.00 SAR"
  },
  "transactions": [
    {
      "date": "2024-01-15T00:00:00.000Z",
      "type": "invoice",
      "reference": "INV-202401-0001",
      "description": "Invoice for CASE-001",
      "debit": 115000,
      "debitSAR": "1,150.00 SAR",
      "credit": 0,
      "creditSAR": "0.00 SAR",
      "balance": 165000,
      "balanceSAR": "1,650.00 SAR"
    },
    {
      "date": "2024-01-25T00:00:00.000Z",
      "type": "payment",
      "reference": "PAY-202401-0001",
      "description": "Payment PAY-202401-0001",
      "debit": 0,
      "debitSAR": "0.00 SAR",
      "credit": 115000,
      "creditSAR": "1,150.00 SAR",
      "balance": 50000,
      "balanceSAR": "500.00 SAR"
    }
  ],
  "closingBalance": {
    "amount": 50000,
    "amountSAR": "500.00 SAR"
  },
  "summary": {
    "totalInvoiced": 500000,
    "totalInvoicedSAR": "5,000.00 SAR",
    "totalPayments": 450000,
    "totalPaymentsSAR": "4,500.00 SAR",
    "netChange": 0,
    "netChangeSAR": "0.00 SAR",
    "transactionCount": 24
  }
}
```

### UI Suggestions
- **Client Selector**: Dropdown or search to select client
- **Date Range Picker**: Start and end date selection
- **Header Section**: Show client name, email, period, opening/closing balance
- **Transaction Table Columns**: Date, Type, Reference, Description, Debit, Credit, Balance
- **Type Icons**: Invoice icon, Payment icon for transaction types
- **Running Balance**: Show running balance after each transaction
- **Summary Footer**: Total invoiced, total payments, net change
- **Export Options**: PDF, Excel, Email to client buttons
- **Print Layout**: Formatted for printing as official statement

---

## 4. Vendor Ledger Report

### Endpoint
```
GET /api/reports/vendor-ledger
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vendorId` | string | Yes | Vendor/Supplier ID |
| `startDate` | string | No | Period start date |
| `endDate` | string | No | Period end date |

### Example Request
```javascript
const response = await fetch(
  `/api/reports/vendor-ledger?vendorId=${vendorId}&startDate=2024-01-01&endDate=2024-12-31`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

### Response Structure
```json
{
  "success": true,
  "report": "vendor-ledger",
  "vendorId": "...",
  "period": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.999Z"
  },
  "generatedAt": "2024-12-10T...",
  "vendorInfo": {
    "vendorId": "...",
    "name": "ABC Supplies",
    "nameAr": "مستلزمات ABC",
    "email": "vendor@example.com",
    "paymentTerms": 30
  },
  "ledger": {
    "openingBalance": 25000,
    "openingBalanceSAR": "250.00 SAR",
    "transactions": [
      {
        "date": "2024-01-10T00:00:00.000Z",
        "type": "bill",
        "reference": "BILL-202401-0001",
        "description": "Office supplies",
        "debit": 0,
        "debitSAR": "0.00 SAR",
        "credit": 50000,
        "creditSAR": "500.00 SAR",
        "balance": 75000,
        "balanceSAR": "750.00 SAR",
        "dueDate": "2024-02-09T00:00:00.000Z",
        "status": "paid"
      },
      {
        "date": "2024-02-05T00:00:00.000Z",
        "type": "payment",
        "reference": "BPAY-202402-0001",
        "description": "Payment BPAY-202402-0001",
        "debit": 50000,
        "debitSAR": "500.00 SAR",
        "credit": 0,
        "creditSAR": "0.00 SAR",
        "balance": 25000,
        "balanceSAR": "250.00 SAR",
        "paymentMethod": "bank_transfer"
      }
    ],
    "closingBalance": 25000,
    "closingBalanceSAR": "250.00 SAR"
  },
  "summary": {
    "totalBilled": 500000,
    "totalBilledSAR": "5,000.00 SAR",
    "totalPayments": 475000,
    "totalPaymentsSAR": "4,750.00 SAR",
    "outstandingBalance": 25000,
    "outstandingBalanceSAR": "250.00 SAR"
  }
}
```

### UI Suggestions
- **Vendor Selector**: Dropdown or search to select vendor
- **Date Range Picker**: Optional period filtering
- **Header Section**: Vendor name, email, payment terms, opening/closing balance
- **Transaction Table**: Date, Type, Reference, Description, Debit, Credit, Balance
- **Note**: For vendor ledger, Credit = we owe more, Debit = we paid
- **Summary Section**: Total billed, total paid, outstanding balance
- **Overdue Highlighting**: Highlight bills past due date

---

## 5. Gross Profit Report

### Endpoint
```
GET /api/reports/gross-profit
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | Yes | Period start date |
| `endDate` | string | Yes | Period end date |
| `groupBy` | string | No | `client`, `case`, `month` (default: `client`) |
| `marginThreshold` | number | No | Highlight items below this margin % (default: 0) |

### Example Request
```javascript
// By client
const response = await fetch(
  '/api/reports/gross-profit?startDate=2024-01-01&endDate=2024-12-31&groupBy=client&marginThreshold=30',
  { headers: { 'Authorization': `Bearer ${token}` } }
);

// By month (for trend analysis)
const response = await fetch(
  '/api/reports/gross-profit?startDate=2024-01-01&endDate=2024-12-31&groupBy=month',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

### Response Structure
```json
{
  "success": true,
  "report": "gross-profit",
  "period": { "startDate": "2024-01-01", "endDate": "2024-12-31" },
  "groupBy": "client",
  "generatedAt": "2024-12-10T...",
  "data": {
    "items": [
      {
        "itemId": "...",
        "itemName": "ABC Corporation",
        "revenue": 1000000,
        "revenueSAR": "10,000.00 SAR",
        "directCosts": 200000,
        "directCostsSAR": "2,000.00 SAR",
        "grossProfit": 800000,
        "grossProfitSAR": "8,000.00 SAR",
        "grossMarginPercent": "80.00%",
        "grossMarginValue": 80.00,
        "invoiceCount": 12,
        "belowThreshold": false
      },
      {
        "itemId": "...",
        "itemName": "XYZ Ltd",
        "revenue": 500000,
        "revenueSAR": "5,000.00 SAR",
        "directCosts": 400000,
        "directCostsSAR": "4,000.00 SAR",
        "grossProfit": 100000,
        "grossProfitSAR": "1,000.00 SAR",
        "grossMarginPercent": "20.00%",
        "grossMarginValue": 20.00,
        "invoiceCount": 5,
        "belowThreshold": true
      }
    ],
    "summary": {
      "totalRevenue": 1500000,
      "totalRevenueSAR": "15,000.00 SAR",
      "totalDirectCosts": 600000,
      "totalDirectCostsSAR": "6,000.00 SAR",
      "totalGrossProfit": 900000,
      "totalGrossProfitSAR": "9,000.00 SAR",
      "overallGrossMarginPercent": "60.00%",
      "itemCount": 2
    },
    "analysis": {
      "targetMargin": "30%",
      "itemsBelowTarget": {
        "count": 1,
        "items": ["XYZ Ltd"]
      },
      "topPerformers": [...],
      "bottomPerformers": [...]
    }
  }
}
```

### UI Suggestions
- **Group By Selector**: Toggle between Client, Case, Month views
- **Date Range Picker**: Period selection
- **Margin Threshold Input**: Number input for target margin %
- **Table Columns**: Name, Revenue, Direct Costs, Gross Profit, Margin %
- **Sorting**: Allow sorting by any column (default: margin % descending)
- **Color Coding**:
  - Green background for items above threshold
  - Red/Pink for items below threshold
- **Charts**:
  - Bar chart: Revenue vs Direct Costs vs Gross Profit by item
  - Line chart: Monthly trend (when groupBy=month)
  - Pie chart: Revenue distribution
- **Performance Cards**: Show top 3 and bottom 3 performers

---

## 6. Cost Center Report

### Endpoint
```
GET /api/reports/cost-center
```

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | string | Yes | Period start date |
| `endDate` | string | Yes | Period end date |
| `costCenterId` | string | No | Filter by specific cost center (case ID) |

### Example Request
```javascript
const response = await fetch(
  '/api/reports/cost-center?startDate=2024-01-01&endDate=2024-12-31',
  { headers: { 'Authorization': `Bearer ${token}` } }
);
```

### Response Structure
```json
{
  "success": true,
  "report": "cost-center",
  "period": { "startDate": "2024-01-01", "endDate": "2024-12-31" },
  "generatedAt": "2024-12-10T...",
  "data": {
    "costCenters": [
      {
        "costCenterId": "...",
        "costCenterName": "CASE-001 - Commercial Dispute",
        "income": 500000,
        "incomeSAR": "5,000.00 SAR",
        "expenses": 150000,
        "expensesSAR": "1,500.00 SAR",
        "netProfit": 350000,
        "netProfitSAR": "3,500.00 SAR",
        "profitMargin": "70.00%",
        "transactionCount": 45
      },
      {
        "costCenterId": "...",
        "costCenterName": "CASE-002 - Employment Matter",
        "income": 300000,
        "incomeSAR": "3,000.00 SAR",
        "expenses": 100000,
        "expensesSAR": "1,000.00 SAR",
        "netProfit": 200000,
        "netProfitSAR": "2,000.00 SAR",
        "profitMargin": "66.67%",
        "transactionCount": 28
      }
    ],
    "summary": {
      "totalCostCenters": 2,
      "totalIncome": 800000,
      "totalIncomeSAR": "8,000.00 SAR",
      "totalExpenses": 250000,
      "totalExpensesSAR": "2,500.00 SAR",
      "totalNetProfit": 550000,
      "totalNetProfitSAR": "5,500.00 SAR",
      "overallProfitMargin": "68.75%"
    }
  }
}
```

### UI Suggestions
- **Date Range Picker**: Period selection
- **Cost Center Filter**: Optional dropdown to filter by specific case
- **Table Columns**: Cost Center, Income, Expenses, Net Profit, Margin %, Transactions
- **Sorting**: Allow sorting by profit, income, or margin
- **Charts**:
  - Bar chart: Income vs Expenses per cost center
  - Pie chart: Income distribution by cost center
- **Drill-down**: Click on cost center to see detailed transactions
- **Summary Cards**: Total income, expenses, profit, count

---

## TypeScript Interfaces

```typescript
// Common types
interface SARAmount {
  amount: number;      // Amount in halalas
  amountSAR: string;   // Formatted SAR string "1,000.00 SAR"
}

// Budget Variance
interface BudgetVarianceAccount {
  accountCode: string;
  accountName: string;
  accountNameAr: string;
  budgetedAmount: number;
  budgetedAmountSAR: string;
  actualAmount: number;
  actualAmountSAR: string;
  variance: number;
  varianceSAR: string;
  variancePercent: string;
  status: 'on-track' | 'over' | 'under';
  favorability: 'favorable' | 'unfavorable';
}

interface BudgetVarianceResponse {
  success: boolean;
  report: 'budget-variance';
  fiscalYear: number;
  period: string;
  periodDates: { startDate: string; endDate: string };
  generatedAt: string;
  data: {
    income: { accounts: BudgetVarianceAccount[]; totalBudgeted: number; totalActual: number; totalVariance: number };
    expenses: { accounts: BudgetVarianceAccount[]; totalBudgeted: number; totalActual: number; totalVariance: number };
    summary: { budgetedNetProfit: number; actualNetProfit: number; netProfitVariance: number; favorability: string };
  };
}

// AP Aging
interface APAgingBucket {
  count: number;
  amount: number;
  amountSAR: string;
}

interface APAgingVendor {
  vendorId: string;
  vendorName: string;
  vendorNameAr?: string;
  current: number;
  currentSAR: string;
  days1to30: number;
  days1to30SAR: string;
  days31to60: number;
  days31to60SAR: string;
  days61to90: number;
  days61to90SAR: string;
  days90Plus: number;
  days90PlusSAR: string;
  total: number;
  totalSAR: string;
}

// Client Statement
interface StatementTransaction {
  date: string;
  type: 'invoice' | 'payment' | 'credit_note' | 'adjustment';
  reference: string;
  description: string;
  debit: number;
  debitSAR: string;
  credit: number;
  creditSAR: string;
  balance: number;
  balanceSAR: string;
}

// Gross Profit
interface GrossProfitItem {
  itemId: string;
  itemName: string;
  revenue: number;
  revenueSAR: string;
  directCosts: number;
  directCostsSAR: string;
  grossProfit: number;
  grossProfitSAR: string;
  grossMarginPercent: string;
  grossMarginValue: number;
  invoiceCount: number;
  belowThreshold: boolean;
}

// Cost Center
interface CostCenterItem {
  costCenterId: string;
  costCenterName: string;
  income: number;
  incomeSAR: string;
  expenses: number;
  expensesSAR: string;
  netProfit: number;
  netProfitSAR: string;
  profitMargin: string;
  transactionCount: number;
}
```

---

## Navigation Suggestions

Add these reports to your Reports menu:

```
Reports
├── Financial Reports
│   ├── Profit & Loss (existing)
│   ├── Balance Sheet (existing)
│   ├── Trial Balance (existing)
│   ├── Budget Variance ← NEW
│   └── Gross Profit ← NEW
├── Receivables
│   ├── AR Aging (existing)
│   └── Client Statement ← NEW
├── Payables
│   ├── AP Aging ← NEW
│   └── Vendor Ledger ← NEW
└── Analytics
    ├── Case Profitability (existing)
    └── Cost Center Analysis ← NEW
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common errors:
- `400`: Missing required parameters
- `404`: Entity not found (client, vendor, etc.)
- `401`: Unauthorized (missing/invalid token)

---

## Notes

1. **Currency**: All amounts are stored in halalas (1 SAR = 100 halalas). The `*SAR` fields contain pre-formatted strings.

2. **Arabic Support**: Most responses include Arabic name fields (`nameAr`, `accountNameAr`) for bilingual display.

3. **Date Formats**: All dates are ISO 8601 format. The frontend should format for display.

4. **Pagination**: These reports don't currently support pagination as they aggregate data. For large datasets, consider adding date range limits.

5. **Export**: Consider adding PDF/Excel export buttons that call the same endpoints and format the response for download.
