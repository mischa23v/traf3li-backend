# BATCH 4: Expenses Feature Installation Guide

## 📦 Files Included

1. `index.tsx` - Main expenses page (list view + create dialog)
2. `hooks/use-expenses.ts` - React Query hooks for all expense operations
3. `route-expenses-index.tsx` - TanStack Router configuration

---

## 🚀 Installation Steps

### Step 1: Create Feature Directory

```bash
cd C:\traf3li\traf3li-dashboard\src\features
mkdir expenses
mkdir expenses\hooks
```

### Step 2: Copy Files

1. Copy `index.tsx` to `src/features/expenses/index.tsx`
2. Copy `hooks/use-expenses.ts` to `src/features/expenses/hooks/use-expenses.ts`
3. Copy `route-expenses-index.tsx` to `src/routes/_authenticated/expenses/index.tsx`

**Create directory for route:**
```bash
cd C:\traf3li\traf3li-dashboard\src\routes\_authenticated
mkdir expenses
```

Then copy `route-expenses-index.tsx` to `src/routes/_authenticated/expenses/index.tsx`

### Step 3: Verify Dependencies

All required dependencies should already be installed:
- `@tanstack/react-query` ✅
- `@tanstack/react-table` ✅
- `date-fns` ✅
- `lucide-react` ✅
- `sonner` ✅

If any are missing:
```bash
npm install @tanstack/react-query @tanstack/react-table date-fns lucide-react sonner
```

### Step 4: Update API Routes (Backend Required)

The frontend expects these backend endpoints:

```
GET    /api/expenses              - Get all expenses (with filters)
GET    /api/expenses/:id          - Get single expense
POST   /api/expenses              - Create expense
PUT    /api/expenses/:id          - Update expense
DELETE /api/expenses/:id          - Delete expense
POST   /api/expenses/:id/reimburse - Mark as reimbursed
POST   /api/expenses/:id/upload-receipt - Upload receipt
GET    /api/expenses/stats        - Get statistics
GET    /api/expenses/case/:caseId - Get expenses by case
GET    /api/expenses/export       - Export to CSV
```

**⚠️ Backend Implementation Required** - See BATCH 7 for backend code

### Step 5: Test the Feature

1. Start the dashboard:
```bash
cd C:\traf3li\traf3li-dashboard
npm run dev
```

2. Navigate to: http://localhost:5173/expenses

3. You should see:
   - Statistics cards (Total, Billable, Non-Billable, Reimbursed)
   - Category breakdown chart
   - Expenses table with actions
   - "مصروف جديد" button
   - Category filter dropdown

---

## 🎯 Features Included

### Expenses List Page
- ✅ Data table with pagination
- ✅ Category badges with colors
- ✅ Billable/Reimbursed status
- ✅ Quick actions (View receipt, Delete)
- ✅ Statistics dashboard
- ✅ Category breakdown
- ✅ Filter by category
- ✅ Arabic RTL support

### Create Expense Dialog
- ✅ Description input
- ✅ Amount input
- ✅ Date picker
- ✅ Category dropdown
- ✅ Notes textarea
- ✅ Billable checkbox
- ✅ Form validation

### React Query Hooks
- ✅ `useExpenses()` - Fetch all expenses with filters
- ✅ `useExpense(id)` - Fetch single expense
- ✅ `useCreateExpense()` - Create new expense
- ✅ `useUpdateExpense(id)` - Update expense
- ✅ `useDeleteExpense()` - Delete expense
- ✅ `useMarkExpenseReimbursed()` - Mark as reimbursed
- ✅ `useUploadReceipt()` - Upload receipt file
- ✅ `useExpenseStats()` - Get statistics
- ✅ `useExpensesByCase(caseId)` - Get expenses by case
- ✅ `useBillableExpenses()` - Get billable expenses
- ✅ `useExportExpenses()` - Export to CSV

### TypeScript Types
All types are defined and exported:
- `Expense` - Main expense interface
- `CreateExpenseInput` - Create expense payload
- `UpdateExpenseInput` - Update expense payload
- `ExpenseStats` - Statistics interface

---

## 📊 Data Structure

### Expense Object
```typescript
{
  _id: string;
  description: string;              // "رسوم محكمة"
  amount: number;                   // 5000
  category: 'court_fees' | 'travel' | 'consultation' | 'documents' | 'research' | 'other';
  caseId?: {
    _id: string;
    caseNumber: string;
    title: string;
  };
  date: string;                     // ISO date
  receiptUrl?: string;              // Cloudinary/S3 URL
  notes?: string;
  isBillable: boolean;              // Can charge to client?
  isReimbursed: boolean;            // Got reimbursed?
  createdAt: string;
  updatedAt: string;
}
```

### Expense Categories
```typescript
const categories = [
  { value: 'court_fees', label: 'رسوم المحكمة', color: 'bg-blue-500' },
  { value: 'travel', label: 'السفر والتنقل', color: 'bg-green-500' },
  { value: 'consultation', label: 'استشارات', color: 'bg-purple-500' },
  { value: 'documents', label: 'مستندات', color: 'bg-yellow-500' },
  { value: 'research', label: 'بحث قانوني', color: 'bg-orange-500' },
  { value: 'other', label: 'أخرى', color: 'bg-gray-500' },
];
```

---

## 🎨 UI Components Used

From shadcn/ui:
- `Card` - Layout containers
- `Button` - Action buttons
- `Badge` - Category and status badges
- `Dialog` - Create expense modal
- `Input` - Form inputs
- `Textarea` - Notes field
- `Select` - Category dropdown
- `Label` - Form labels
- `DataTable` - Table component

From lucide-react:
- `Plus` - Add new expense
- `Receipt` - View receipt
- `Trash2` - Delete expense
- `Eye` - View details
- `Download` - Export CSV
- `Loader2` - Loading spinner

---

## 🔗 Integration with Sidebar

The sidebar already includes the expenses link:
```typescript
{
  title: 'المصروفات',
  url: '/expenses',
  icon: DollarSign,
}
```

✅ No changes needed to sidebar!

---

## 💡 Key Features Explained

### 1. Category-Based Tracking
Expenses are organized into 6 categories:
- Court fees (رسوم المحكمة)
- Travel & transportation (السفر والتنقل)
- Consultations (استشارات)
- Documents (مستندات)
- Legal research (بحث قانوني)
- Other (أخرى)

Each category has a color for easy visual identification.

### 2. Billable vs Non-Billable
- **Billable:** Can be charged to the client (shows in invoices)
- **Non-Billable:** Internal costs (overhead)

This helps lawyers track which expenses they can recover.

### 3. Reimbursement Tracking
Track which expenses have been reimbursed by clients or the firm.

### 4. Receipt Management
Upload receipts for each expense (images/PDFs) for record-keeping.

### 5. Case Association
Link expenses to specific cases for accurate billing and reporting.

### 6. Statistics Dashboard
Real-time statistics showing:
- Total expenses
- Billable amount
- Non-billable amount
- Reimbursed amount
- Breakdown by category
- Breakdown by month

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@/features/expenses'"
**Solution:** Make sure you created the directory and copied the file to the correct location.

### Issue: "API call fails"
**Solution:** The backend endpoints don't exist yet. You need to implement them first (see BATCH 7).

### Issue: "Category colors not showing"
**Solution:** Make sure Tailwind CSS is configured properly and the colors are included in your theme.

### Issue: "Date picker not working"
**Solution:** Make sure `date-fns` is installed and the date format is correct.

---

## ✅ Verification Checklist

- [ ] Files copied to correct directories
- [ ] No TypeScript errors
- [ ] Dashboard runs without errors
- [ ] Can navigate to /expenses
- [ ] Statistics cards render
- [ ] Category filter works
- [ ] "مصروف جديد" button opens dialog
- [ ] Table shows (even if empty)
- [ ] Category badges show with colors
- [ ] Arabic text displays correctly (RTL)

---

## 🚀 Next Steps

After installing BATCH 4, you can:

1. **Add Receipt Upload** - Implement file upload for receipts
2. **Export Functionality** - Generate CSV reports
3. **Charts & Graphs** - Visualize expense trends
4. **Backend Implementation** - See BATCH 7 for backend code

---

## 📝 Notes

- **Backend Required:** This frontend code requires backend endpoints to work fully
- **Authentication:** Uses existing JWT auth from your auth system
- **RTL Support:** All Arabic text is RTL by default
- **TypeScript:** Fully typed for better development experience
- **React Query:** Automatic caching and refetching
- **File Upload:** Uses Cloudinary for receipt storage (configure in backend)

---

## 🎯 What's Working vs What Needs Backend

### ✅ Working Now (Frontend Only)
- Page renders
- UI components display
- Statistics cards show
- Category filter works
- Table structure exists
- Create dialog opens
- Buttons are clickable
- TypeScript types defined
- Category breakdown UI

### ⏳ Needs Backend
- Actual data fetching
- Create/update/delete operations
- Receipt upload
- Statistics calculation
- CSV export
- Reimbursement marking
- Case association

---

## 💰 Business Value

This feature helps lawyers:
1. Track all professional expenses
2. Identify billable vs overhead costs
3. Improve billing accuracy
4. Monitor spending by category
5. Keep receipts organized
6. Generate expense reports
7. Track reimbursements
8. Calculate true case profitability

---

**Ready to continue with BATCH 5: Calendar & Time Tracking?** 🚀
