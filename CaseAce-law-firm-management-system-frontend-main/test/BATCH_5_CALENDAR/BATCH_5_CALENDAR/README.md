# BATCH 5: Calendar & Time Tracking Installation Guide

## 📦 Files Included

### Calendar Feature:
1. `calendar-index.tsx` - Calendar page with events/hearings
2. `hooks/use-calendar.ts` - React Query hooks for calendar

### Time Tracking Feature:
3. `time-tracking-index.tsx` - Time tracking page with timer
4. `hooks/use-time-tracking.ts` - React Query hooks for time tracking

### Router:
5. `ROUTES.md` - Router configuration instructions

---

## 🚀 Installation Steps

### Step 1: Create Feature Directories

```bash
cd C:\traf3li\traf3li-dashboard\src\features

# Create calendar feature
mkdir calendar
mkdir calendar\hooks

# Create time-tracking feature
mkdir time-tracking
mkdir time-tracking\hooks
```

### Step 2: Copy Files

#### Calendar Feature:
1. Copy `calendar-index.tsx` to `src/features/calendar/index.tsx`
2. Copy `hooks/use-calendar.ts` to `src/features/calendar/hooks/use-calendar.ts`

#### Time Tracking Feature:
3. Copy `time-tracking-index.tsx` to `src/features/time-tracking/index.tsx`
4. Copy `hooks/use-time-tracking.ts` to `src/features/time-tracking/hooks/use-time-tracking.ts`

### Step 3: Create Routes

```bash
cd C:\traf3li\traf3li-dashboard\src\routes\_authenticated
mkdir calendar
mkdir time-tracking
```

Then follow instructions in `ROUTES.md` to create route files.

### Step 4: Verify Dependencies

All required dependencies should already be installed:
- `@tanstack/react-query` ✅
- `@tanstack/react-table` ✅
- `date-fns` ✅
- `lucide-react` ✅
- `sonner` ✅

**New dependency needed:**
```bash
npm install react-day-picker
```

The Calendar component from shadcn/ui uses `react-day-picker` internally.

### Step 5: Update API Routes (Backend Required)

#### Calendar Endpoints:
```
GET    /api/calendar/events              - Get all events
GET    /api/calendar/events/:id          - Get single event
POST   /api/calendar/events              - Create event
PUT    /api/calendar/events/:id          - Update event
DELETE /api/calendar/events/:id          - Delete event
GET    /api/calendar/events/upcoming     - Get upcoming events
GET    /api/calendar/events/case/:caseId - Get events by case
POST   /api/calendar/events/:id/remind   - Send reminder
```

#### Time Tracking Endpoints:
```
GET    /api/time-tracking                - Get all time entries
GET    /api/time-tracking/:id            - Get single entry
POST   /api/time-tracking                - Create entry
PUT    /api/time-tracking/:id            - Update entry
DELETE /api/time-tracking/:id            - Delete entry
GET    /api/time-tracking/stats          - Get statistics
GET    /api/time-tracking/case/:caseId   - Get entries by case
POST   /api/time-tracking/mark-billed    - Mark as billed
GET    /api/time-tracking/export         - Export to CSV
```

**⚠️ Backend Implementation Required** - See BATCH 7 for backend code

---

## 🎯 Features Included

### 📅 Calendar Feature

#### Main Calendar View:
- ✅ Month/Week/Day view toggle
- ✅ Visual calendar with Arabic date formatting
- ✅ Event indicators on dates
- ✅ Click date to see events
- ✅ Highlighted dates with events

#### Event Types:
- 🔴 **Hearing (جلسة محكمة)** - Court hearings
- 🔵 **Meeting (اجتماع)** - Client/team meetings
- 🟠 **Deadline (موعد نهائي)** - Important deadlines
- 🟢 **Consultation (استشارة)** - Client consultations

#### Event Management:
- ✅ Create/Edit/Delete events
- ✅ Link to cases
- ✅ Add location
- ✅ Set reminders
- ✅ Add attendees
- ✅ Mark as completed/cancelled
- ✅ All-day event support

#### Sidebar Features:
- ✅ Today's events quick view
- ✅ Upcoming events (next 7 days)
- ✅ Monthly statistics
- ✅ Event type breakdown

### ⏱️ Time Tracking Feature

#### Active Timer:
- ✅ Start/Stop timer with live counter
- ✅ Shows elapsed time (HH:MM:SS)
- ✅ Link to case
- ✅ Add description
- ✅ Automatically creates time entry on stop

#### Time Entries Table:
- ✅ All logged time entries
- ✅ Date, description, duration
- ✅ Case association
- ✅ Billable/Non-billable status
- ✅ Billed/Unbilled status
- ✅ Calculated amount (duration × hourly rate)
- ✅ Delete entries

#### Manual Time Entry:
- ✅ Add time manually (for past work)
- ✅ Set start/end time
- ✅ Or enter duration directly
- ✅ Set hourly rate
- ✅ Mark as billable

#### Statistics:
- ✅ Total hours (all time)
- ✅ Billable hours
- ✅ Total amount expected
- ✅ Amount already billed
- ✅ Filter by period (today/week/month)

#### Advanced Features:
- ✅ Group by case
- ✅ Group by day
- ✅ Export to CSV
- ✅ Integration with invoices
- ✅ Mark entries as billed

---

## 📊 Data Structures

### Calendar Event Object
```typescript
{
  _id: string;
  title: string;
  type: 'hearing' | 'meeting' | 'deadline' | 'consultation';
  startDate: string;              // ISO date
  endDate?: string;
  startTime: string;              // "14:30"
  endTime?: string;
  location?: string;              // "محكمة الرياض"
  caseId?: {
    _id: string;
    caseNumber: string;
    title: string;
  };
  attendees?: string[];           // ["client@example.com"]
  notes?: string;
  reminderBefore?: number;        // minutes (e.g., 60 = 1 hour before)
  isAllDay: boolean;
  status: 'scheduled' | 'completed' | 'cancelled' | 'postponed';
  createdAt: string;
  updatedAt: string;
}
```

### Time Entry Object
```typescript
{
  _id: string;
  description: string;            // "مراجعة عقد العمل"
  caseId: {
    _id: string;
    caseNumber: string;
    title: string;
  };
  date: string;                   // ISO date
  startTime: string;              // "09:00"
  endTime: string;                // "11:30"
  duration: number;               // 150 minutes
  hourlyRate: number;             // 500 SAR
  totalAmount: number;            // 1250 SAR (150/60 * 500)
  isBillable: boolean;            // Can charge client?
  isBilled: boolean;              // Already invoiced?
  invoiceId?: string;             // Link to invoice
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎨 UI Components Used

From shadcn/ui:
- `Calendar` - Month calendar view (NEW - needs installation)
- `Card` - Layout containers
- `Button` - Action buttons
- `Badge` - Status and type badges
- `Dialog` - Create/Edit modals
- `Input` - Form inputs
- `Textarea` - Notes field
- `Select` - Dropdowns
- `Tabs` - View mode switcher
- `Label` - Form labels
- `DataTable` - Time entries table

From lucide-react:
- `Calendar` - Calendar icon
- `Clock` - Time icon
- `MapPin` - Location icon
- `Users` - Attendees icon
- `FileText` - Hearing icon
- `AlertCircle` - Deadline icon
- `Play` - Start timer
- `Pause` - Pause timer
- `Square` - Stop timer
- `Plus` - Add new
- `Trash2` - Delete
- `DollarSign` - Amount icon
- `Loader2` - Loading spinner

---

## 🔗 Integration with Sidebar

The sidebar already includes both links:
```typescript
{
  title: 'التقويم',
  url: '/calendar',
  icon: Calendar,
},
{
  title: 'تسجيل الوقت',
  url: '/time-tracking',
  icon: Clock,
}
```

✅ No changes needed to sidebar!

---

## 💡 Key Features Explained

### 1. Calendar - Event Types

**Hearing (جلسة محكمة):**
- Court dates and hearings
- Most important - highlighted in red
- Automatic reminders
- Link to case file

**Meeting (اجتماع):**
- Client meetings
- Team meetings
- Consultations with other lawyers

**Deadline (موعد نهائي):**
- Filing deadlines
- Statute of limitations dates
- Response deadlines
- Critical dates

**Consultation (استشارة):**
- Initial consultations
- Follow-up appointments
- Phone/video calls

### 2. Time Tracking - Billable Hours

**Why It Matters:**
Lawyers typically bill by the hour. This system helps:
- Track actual time spent on each case
- Calculate billable amounts automatically
- Separate billable vs non-billable time
- Generate invoices from time entries
- Prove work done to clients
- Calculate profitability per case

**Workflow:**
1. Lawyer starts timer when beginning work
2. Timer runs in background (shows elapsed time)
3. Lawyer stops timer when done
4. System creates time entry with:
   - Duration
   - Amount (duration × hourly rate)
   - Case association
5. At end of month, convert unbilled time to invoice

### 3. Active Timer Persistence

The timer state is stored in `localStorage`:
- Survives page refresh
- Can close browser and come back
- Shows elapsed time since start
- Prevents accidental loss of time

---

## 🐛 Troubleshooting

### Issue: "Cannot find Calendar component"
**Solution:** Make sure you have the Calendar component installed from shadcn/ui:
```bash
npx shadcn@latest add calendar
```

### Issue: "Timer keeps resetting"
**Solution:** Check browser localStorage. Timer state should persist there.

### Issue: "Date formatting is wrong"
**Solution:** Make sure `date-fns` is installed and Arabic locale is imported:
```typescript
import { ar } from 'date-fns/locale';
```

### Issue: "Events not showing on calendar"
**Solution:** Check the `dateHasEvents` function and make sure dates are compared correctly with `isSameDay()`.

---

## ✅ Verification Checklist

### Calendar Feature:
- [ ] Files copied to correct directories
- [ ] No TypeScript errors
- [ ] Can navigate to /calendar
- [ ] Calendar renders with Arabic dates
- [ ] Can click dates
- [ ] Sidebar shows today's events
- [ ] Event type badges show with colors
- [ ] Create event button works

### Time Tracking Feature:
- [ ] Files copied to correct directories
- [ ] Can navigate to /time-tracking
- [ ] Quick timer start form shows
- [ ] Can select case and enter description
- [ ] Start timer button works
- [ ] Timer shows live counter
- [ ] Stop button works
- [ ] Statistics cards render
- [ ] Time entries table shows

---

## 🚀 Next Steps

After installing BATCH 5:

1. **Test Timer** - Start and stop timer to verify localStorage
2. **Create Events** - Add sample calendar events
3. **Test Reminders** - Set up email/SMS reminders
4. **Link to Cases** - Associate events and time with cases
5. **Backend Implementation** - See BATCH 7 for backend code

---

## 📝 Notes

### Calendar:
- **Backend Required:** Events stored in MongoDB
- **Reminders:** Requires email/SMS service (SendGrid)
- **iCal Export:** Can add feature to export to Google Calendar
- **Recurring Events:** Can add support for repeating events

### Time Tracking:
- **Timer Persistence:** Uses localStorage (survives refresh)
- **Hourly Rate:** Should come from user settings (default 500 SAR)
- **Rounding:** Can round to nearest 6 minutes (0.1 hour)
- **Invoice Integration:** Link time entries to invoices
- **Reporting:** Export detailed time reports

---

## 💰 Business Value

### Calendar Benefits:
1. Never miss court dates
2. Better time management
3. Client scheduling
4. Team coordination
5. Deadline tracking
6. Professional image

### Time Tracking Benefits:
1. Accurate billing
2. Track productivity
3. Prove work to clients
4. Calculate case profitability
5. Identify time-wasting tasks
6. Fair compensation
7. Legal requirement (some jurisdictions)

---

## 🎯 What's Working vs What Needs Backend

### ✅ Working Now (Frontend Only)
- Calendar UI renders
- Date picker works
- Event type badges show
- Timer starts/stops
- Timer persists in localStorage
- Time counter updates
- Forms validate
- Statistics cards show
- Tables render
- Arabic RTL everywhere

### ⏳ Needs Backend
- Actual event storage
- Event fetching
- Reminder system
- Time entry storage
- Statistics calculation
- CSV export
- Invoice integration
- Case data fetching

---

## 🔄 Integration Points

### Calendar ↔ Cases:
- Events linked to cases
- Show case events in case detail
- Create event from case page

### Time Tracking ↔ Cases:
- Time entries linked to cases
- Show case hours in case detail
- Calculate case profitability

### Time Tracking ↔ Invoices:
- Convert unbilled time to invoice items
- Mark time as billed when invoiced
- Show billed status in time entries

### Calendar ↔ Time Tracking:
- Start timer from calendar event
- Create calendar event from time entry
- Sync scheduled vs actual time

---

**Ready to continue with BATCH 6: Documents & Files Management?** 🚀

Or should we jump to **BATCH 7: Backend Implementation** to make everything work?
