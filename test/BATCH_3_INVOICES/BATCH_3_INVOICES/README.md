# BATCH 3: Invoices Feature Installation Guide

## 📦 Files Included

1. `index.tsx` - Main invoices page (list view)
2. `hooks/use-invoices.ts` - React Query hooks for all invoice operations
3. `route-invoices-index.tsx` - TanStack Router configuration

---

## 🚀 Installation Steps

### Step 1: Create Feature Directory

```bash
cd C:\traf3li\traf3li-dashboard\src\features
mkdir invoices
mkdir invoices\hooks
```

### Step 2: Copy Files

1. Copy `index.tsx` to `src/features/invoices/index.tsx`
2. Copy `hooks/use-invoices.ts` to `src/features/invoices/hooks/use-invoices.ts`
3. Copy `route-invoices-index.tsx` to `src/routes/_authenticated/invoices/index.tsx`

**Create directory for route:**
```bash
cd C:\traf3li\traf3li-dashboard\src\routes\_authenticated
mkdir invoices
```

Then copy `route-invoices-index.tsx` to `src/routes/_authenticated/invoices/index.tsx`

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
GET    /api/invoices              - Get all invoices (with filters)
GET    /api/invoices/:id          - Get single invoice
POST   /api/invoices              - Create invoice
PUT    /api/invoices/:id          - Update invoice
DELETE /api/invoices/:id          - Delete invoice
POST   /api/invoices/:id/send     - Send invoice to client
POST   /api/invoices/:id/mark-paid - Mark as paid
GET    /api/invoices/:id/download - Download PDF
GET    /api/invoices/stats        - Get statistics
```

**⚠️ Backend Implementation Required** - See BATCH 7 for backend code

### Step 5: Test the Feature

1. Start the dashboard:
```bash
cd C:\traf3li\traf3li-dashboard
npm run dev
```

2. Navigate to: http://localhost:5173/invoices

3. You should see:
   - Statistics cards (Total, Paid, Pending, Overdue)
   - Revenue summary
   - Invoices table with actions
   - "فاتورة جديدة" button

---

## 🎯 Features Included

### Invoices List Page
- ✅ Data table with pagination
- ✅ Status badges (Draft, Sent, Paid, Overdue, Cancelled)
- ✅ Quick actions (View, Send, Download)
- ✅ Statistics dashboard
- ✅ Revenue tracking
- ✅ Arabic RTL support

### React Query Hooks
- ✅ `useInvoices()` - Fetch all invoices with filters
- ✅ `useInvoice(id)` - Fetch single invoice
- ✅ `useCreateInvoice()` - Create new invoice
- ✅ `useUpdateInvoice(id)` - Update invoice
- ✅ `useDeleteInvoice()` - Delete invoice
- ✅ `useSendInvoice()` - Send to client
- ✅ `useMarkInvoicePaid()` - Mark as paid
- ✅ `useDownloadInvoicePDF()` - Download PDF
- ✅ `useInvoiceStats()` - Get statistics

### TypeScript Types
All types are defined and exported:
- `Invoice` - Main invoice interface
- `CreateInvoiceInput` - Create invoice payload
- `UpdateInvoiceInput` - Update invoice payload

---

## 📊 Data Structure

### Invoice Object
```typescript
{
  _id: string;
  invoiceNumber: string;           // Auto-generated (INV-001)
  caseId: {
    _id: string;
    caseNumber: string;
    title: string;
  };
  clientId: {
    _id: string;
    fullName: string;
    email: string;
  };
  amount: number;                   // Total amount
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;                  // ISO date
  issuedDate: string;               // ISO date
  items: [
    {
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }
  ];
  notes?: string;
  paymentDetails?: {
    paymentMethod: string;
    transactionId?: string;
    paidAt: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎨 UI Components Used

From shadcn/ui:
- `Card` - Layout containers
- `Button` - Action buttons
- `Badge` - Status badges
- `DataTable` - Table component (from your existing implementation)

From lucide-react:
- `Plus` - Add new invoice
- `Download` - Download PDF
- `Send` - Send invoice
- `Eye` - View details
- `Loader2` - Loading spinner

---

## 🔗 Integration with Sidebar

The sidebar already includes the invoices link:
```typescript
{
  title: 'الفواتير',
  url: '/invoices',
  icon: FileText,
}
```

✅ No changes needed to sidebar!

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@/features/invoices'"
**Solution:** Make sure you created the directory and copied the file to the correct location.

### Issue: "API call fails"
**Solution:** The backend endpoints don't exist yet. You need to implement them first (see BATCH 7).

### Issue: "Data table not showing"
**Solution:** Make sure you have the DataTable component in `src/components/data-table/`. This should already exist from your dashboard template.

### Issue: "Date formatting error"
**Solution:** Make sure `date-fns` is installed:
```bash
npm install date-fns
```

---

## ✅ Verification Checklist

- [ ] Files copied to correct directories
- [ ] No TypeScript errors
- [ ] Dashboard runs without errors
- [ ] Can navigate to /invoices
- [ ] Statistics cards render
- [ ] Table shows (even if empty)
- [ ] "فاتورة جديدة" button visible
- [ ] Arabic text displays correctly (RTL)

---

## 🚀 Next Steps

After installing BATCH 3, you can:

1. **Create Invoice Form** - Build the create/edit invoice modal
2. **Invoice Detail View** - Show full invoice with items
3. **PDF Generation** - Implement PDF export
4. **Backend Implementation** - See BATCH 7 for backend code

---

## 📝 Notes

- **Backend Required:** This frontend code requires backend endpoints to work fully
- **Authentication:** Uses existing JWT auth from your auth system
- **RTL Support:** All Arabic text is RTL by default
- **TypeScript:** Fully typed for better development experience
- **React Query:** Automatic caching and refetching

---

## 🎯 What's Working vs What Needs Backend

### ✅ Working Now (Frontend Only)
- Page renders
- UI components display
- Statistics cards show
- Table structure exists
- Buttons are clickable
- TypeScript types defined

### ⏳ Needs Backend
- Actual data fetching
- Create/update/delete operations
- Send invoice functionality
- PDF download
- Payment marking
- Statistics calculation

---

**Ready to continue with BATCH 4: Expenses Feature?** 🚀
