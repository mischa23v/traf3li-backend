# Router Configuration Files

## File 1: Calendar Route
**Path:** `src/routes/_authenticated/calendar/index.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/calendar/')({
  component: () => <CalendarPage />,
});

import CalendarPage from '@/features/calendar';
```

## File 2: Time Tracking Route
**Path:** `src/routes/_authenticated/time-tracking/index.tsx`

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/time-tracking/')({
  component: () => <TimeTrackingPage />,
});

import TimeTrackingPage from '@/features/time-tracking';
```

---

## Installation Instructions

### Step 1: Create Route Directories
```bash
cd C:\traf3li\traf3li-dashboard\src\routes\_authenticated
mkdir calendar
mkdir time-tracking
```

### Step 2: Create Route Files
1. Create `calendar/index.tsx` with the Calendar Route code above
2. Create `time-tracking/index.tsx` with the Time Tracking Route code above
