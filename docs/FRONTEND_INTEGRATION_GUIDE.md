# Frontend Integration Guide - CRM Enhancement Features

This guide provides detailed instructions for integrating the new CRM enhancement backend features into the traf3li-dashboard frontend.

## Table of Contents

1. [New API Endpoints](#new-api-endpoints)
2. [Required Pages](#required-pages)
3. [Sidebar Configuration](#sidebar-configuration)
4. [Service Layer Updates](#service-layer-updates)
5. [Feature Integration Details](#feature-integration-details)

---

## New API Endpoints

### Base URL: `/api`

| Module | Endpoint | Methods | Purpose |
|--------|----------|---------|---------|
| SLA | `/sla` | GET, POST, PUT, DELETE | SLA configuration management |
| SLA | `/sla/:id/stats` | GET | SLA statistics |
| SLA | `/sla/instances/:id/pause` | POST | Pause SLA timer |
| SLA | `/sla/instances/:id/resume` | POST | Resume SLA timer |
| Conversations | `/conversations` | GET, POST | Omnichannel inbox |
| Conversations | `/conversations/:id/messages` | POST | Add message |
| Conversations | `/conversations/:id/assign` | POST | Assign conversation |
| Macros | `/macros` | GET, POST, PUT, DELETE | Canned responses |
| Macros | `/macros/popular` | GET | Popular macros |
| Macros | `/macros/:id/apply` | POST | Apply macro to conversation |
| Approvals | `/approvals/workflows` | GET, POST, PUT, DELETE | Approval workflow config |
| Approvals | `/approvals/initiate` | POST | Start approval process |
| Approvals | `/approvals/pending` | GET | Pending approvals for user |
| Approvals | `/approvals/:id/decide` | POST | Approve/reject |
| Views | `/views` | GET, POST, PUT, DELETE | Custom view management |
| Views | `/views/:id/render` | GET | Render view data |
| Automations | `/automations` | GET, POST, PUT, DELETE | Automation rules |
| Automations | `/automations/:id/enable` | POST | Enable automation |
| Automations | `/automations/:id/test` | POST | Test automation |
| Timeline | `/timeline/:entityType/:entityId` | GET | Unified 360° timeline |
| Timeline | `/timeline/:entityType/:entityId/summary` | GET | Timeline summary |
| Cycles | `/cycles` | GET, POST | Sprint/cycle management |
| Cycles | `/cycles/active` | GET | Get active cycle |
| Cycles | `/cycles/:id/burndown` | GET | Burndown chart data |
| Deal Rooms | `/deal-rooms/deals/:dealId/room` | GET, POST | Deal collaboration |
| Deal Rooms | `/deal-rooms/:id/pages` | POST, PUT, DELETE | Page management |
| Deal Rooms | `/deal-rooms/:id/access` | POST, DELETE | External access |
| Reports | `/reports` | GET, POST, PUT, DELETE | Report definitions |
| Reports | `/reports/:id/execute` | GET | Run report |
| Reports | `/reports/:id/export/:format` | GET | Export report |
| Deduplication | `/deduplication/contacts/:id/duplicates` | GET | Find duplicates |
| Deduplication | `/deduplication/contacts/merge` | POST | Merge contacts |
| Command Palette | `/command-palette/search` | GET | Global search |
| Command Palette | `/command-palette/recent` | GET | Recent items |
| Lifecycle | `/lifecycle/workflows` | GET, POST, PUT, DELETE | Lifecycle workflows |
| Lifecycle | `/lifecycle/initiate` | POST | Start lifecycle |
| Deal Health | `/deals/health/:id` | GET | Deal health score |
| Deal Health | `/deals/health/distribution` | GET | Health distribution |
| Deal Health | `/deals/health/stuck` | GET | Stuck deals |

---

## Required Pages

### 1. SLA Management (Admin Settings)

**Location:** `/src/routes/_authenticated/settings/sla.tsx`

**Purpose:** Configure SLA policies with response/resolution times and business hours.

**Components Needed:**
- SLA list with status indicators
- SLA form with business hours calendar picker
- SLA dashboard showing breach statistics

**Sidebar Location:** Settings → SLA Configuration

```typescript
// Route file
import { createFileRoute } from '@tanstack/react-router'
import { SLASettingsPage } from '@/pages/settings/sla'

export const Route = createFileRoute('/_authenticated/settings/sla')({
  component: SLASettingsPage
})
```

---

### 2. Omnichannel Inbox

**Location:** `/src/routes/_authenticated/dashboard.inbox.tsx`

**Purpose:** Unified inbox for all customer communications (email, WhatsApp, SMS, chat).

**Components Needed:**
- Conversation list with channel icons
- Conversation detail panel with message thread
- Quick reply with macro suggestions
- Collision indicator (shows if another agent is viewing)
- SLA timer display

**Sidebar Location:** Main Navigation → Inbox (with unread badge)

**Key Features:**
- Real-time updates via Socket.io
- Channel filtering (email, whatsapp, sms, chat)
- Status filtering (open, snoozed, closed)
- Agent assignment

```typescript
// Service methods
export const inboxService = {
  async getConversations(params: { channel?: string; status?: string }) {
    return apiClient.get('/conversations', { params })
  },
  async sendMessage(conversationId: string, data: { content: string }) {
    return apiClient.post(`/conversations/${conversationId}/messages`, data)
  },
  async assignConversation(conversationId: string, userId: string) {
    return apiClient.post(`/conversations/${conversationId}/assign`, { userId })
  }
}
```

---

### 3. Macro Library

**Location:** `/src/routes/_authenticated/settings/macros.tsx`

**Purpose:** Manage canned responses for quick replies.

**Components Needed:**
- Macro list with categories
- Macro editor with variable placeholders ({{contact.name}}, {{user.name}}, etc.)
- Keyboard shortcut configuration
- Usage statistics

**Sidebar Location:** Settings → Macros & Templates

---

### 4. Approval Workflows

**Location:** `/src/routes/_authenticated/settings/approvals.tsx`

**Purpose:** Configure multi-level approval chains for invoices, expenses, contracts.

**Components Needed:**
- Workflow designer (drag-drop levels)
- Approver configuration (specific users, roles, managers)
- Trigger conditions builder
- Approval type selection (any, all, majority)

**Additional Page:** `/src/routes/_authenticated/dashboard.approvals.tsx`
- Pending approvals list for current user
- Approval history
- Quick approve/reject actions

**Sidebar Locations:**
- Settings → Approval Workflows
- Main Navigation → Pending Approvals (with badge count)

---

### 5. Custom Views

**Location:** `/src/routes/_authenticated/dashboard.views.tsx`

**Purpose:** Create and manage custom views (Kanban, Calendar, Timeline, Gantt, etc.)

**Components Needed:**
- View type selector
- Filter builder
- Column/field selector
- Grouping configuration
- View renderers:
  - Kanban board (drag-drop cards)
  - Calendar view (FullCalendar integration)
  - Timeline view
  - Gantt chart (dhtmlx-gantt)
  - Pivot table
  - Charts (Recharts)

**Sidebar Location:** Views → Custom Views

---

### 6. Automation Rules

**Location:** `/src/routes/_authenticated/settings/automations.tsx`

**Purpose:** Create workflow automations triggered by events.

**Components Needed:**
- Automation list with status toggle
- Automation builder:
  - Trigger selection (record created, field changed, date reached, etc.)
  - Condition builder (if/and/or logic)
  - Action configuration (update field, send email, create task, etc.)
- Execution logs viewer
- Test automation modal

**Sidebar Location:** Settings → Automations

---

### 7. 360° Timeline

**Location:** Integrated into entity detail pages

**Purpose:** Unified activity timeline for contacts, leads, cases.

**Implementation:**
- Add Timeline tab to Contact Detail, Lead Detail, Case Detail pages
- Shows all activities chronologically (calls, emails, meetings, notes, tasks, etc.)
- Filterable by activity type
- Cursor-based pagination

**Components Needed:**
- Timeline item component with activity icons
- Activity type filter chips
- Load more button

```typescript
// Hook usage
const { data, isLoading, fetchNextPage } = useInfiniteQuery({
  queryKey: ['timeline', entityType, entityId],
  queryFn: ({ pageParam }) =>
    timelineService.getTimeline(entityType, entityId, { cursor: pageParam }),
  getNextPageParam: (lastPage) => lastPage.pagination.nextCursor
})
```

---

### 8. Cycles/Sprints

**Location:** `/src/routes/_authenticated/dashboard.cycles.tsx`

**Purpose:** Sprint/cycle management for tasks.

**Components Needed:**
- Cycle list with progress bars
- Active cycle dashboard
- Burndown chart
- Task assignment to cycles
- Cycle planning view

**Sidebar Location:** Tasks → Cycles

---

### 9. Deal Rooms

**Location:** `/src/routes/_authenticated/dashboard.crm.deals.$dealId.room.tsx`

**Purpose:** Collaboration space for deal stakeholders.

**Components Needed:**
- Page editor (TipTap rich text)
- Document upload/viewer
- External access management
- Activity feed
- Stakeholder list

**Access:** From Deal Detail page → "Deal Room" tab

---

### 10. Report Builder

**Location:** `/src/routes/_authenticated/dashboard.reports.builder.tsx`

**Purpose:** Self-serve report creation and scheduling.

**Components Needed:**
- Data source selector
- Field picker with aggregations
- Filter builder
- Grouping configuration
- Chart type selector
- Schedule configuration
- Export options (CSV, PDF, Excel)

**Sidebar Location:** Reports → Report Builder

---

### 11. Contact Deduplication

**Location:** `/src/routes/_authenticated/dashboard.crm.contacts.duplicates.tsx`

**Purpose:** Find and merge duplicate contacts.

**Components Needed:**
- Duplicate suggestions list with similarity scores
- Side-by-side contact comparison
- Field-level merge selector
- Bulk auto-merge option (admin only)

**Sidebar Location:** CRM → Contacts → Duplicates (or Settings → Data Quality)

---

### 12. Deal Health Dashboard

**Location:** `/src/routes/_authenticated/dashboard.crm.deals.health.tsx`

**Purpose:** Monitor deal pipeline health and stuck deals.

**Components Needed:**
- Health distribution chart (pie/donut)
- Deals needing attention list
- Stuck deals alert panel
- Deal health score card (on deal detail)

**Sidebar Location:** CRM → Deal Health

---

### 13. Lifecycle Workflows

**Location:** `/src/routes/_authenticated/settings/lifecycle.tsx`

**Purpose:** Configure employee onboarding/offboarding workflows.

**Components Needed:**
- Workflow template designer
- Stage configuration with tasks
- Progress tracker
- Instance management

**Sidebar Location:** HR → Lifecycle Workflows (or Settings → HR Workflows)

---

### 14. Command Palette

**Location:** Global component (always available)

**Purpose:** Cmd+K quick access to any record or action.

**Implementation:**
- Add `CommandPalette` component to root layout
- Listen for Cmd+K / Ctrl+K keyboard shortcut
- Use Shadcn Command component

**Components Needed:**
- Command input with search
- Recent items section
- Quick actions section
- Search results grouped by type
- Keyboard navigation

```typescript
// Hook
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  return { open, setOpen }
}
```

---

## Sidebar Configuration

Update `/src/components/layout/data/sidebar-data.ts`:

```typescript
import {
  LayoutDashboard,
  Inbox,
  CheckSquare,
  Calendar,
  Users,
  Building2,
  FileText,
  BarChart3,
  Settings,
  Workflow,
  Timer,
  MessageSquare,
  GitBranch,
  Activity,
  Target,
  Layers,
  UserCheck,
  Copy,
  Heart,
  PlayCircle
} from 'lucide-react'

export const sidebarData = {
  navGroups: [
    {
      title: 'Main',
      items: [
        {
          title: 'Dashboard',
          url: '/dashboard',
          icon: LayoutDashboard
        },
        {
          title: 'Inbox',
          url: '/dashboard/inbox',
          icon: Inbox,
          badge: '3' // Unread count from API
        },
        {
          title: 'Tasks',
          icon: CheckSquare,
          items: [
            { title: 'All Tasks', url: '/dashboard/tasks' },
            { title: 'Cycles', url: '/dashboard/cycles' },
            { title: 'Calendar', url: '/dashboard/tasks/calendar' }
          ]
        },
        {
          title: 'Pending Approvals',
          url: '/dashboard/approvals',
          icon: UserCheck,
          badge: '2' // Pending count from API
        }
      ]
    },
    {
      title: 'CRM',
      items: [
        {
          title: 'Leads',
          url: '/dashboard/crm/leads',
          icon: Target
        },
        {
          title: 'Contacts',
          icon: Users,
          items: [
            { title: 'All Contacts', url: '/dashboard/crm/contacts' },
            { title: 'Duplicates', url: '/dashboard/crm/contacts/duplicates' }
          ]
        },
        {
          title: 'Pipeline',
          url: '/dashboard/crm/pipeline',
          icon: GitBranch
        },
        {
          title: 'Deal Health',
          url: '/dashboard/crm/deals/health',
          icon: Heart
        }
      ]
    },
    {
      title: 'Views & Reports',
      items: [
        {
          title: 'Custom Views',
          url: '/dashboard/views',
          icon: Layers
        },
        {
          title: 'Report Builder',
          url: '/dashboard/reports/builder',
          icon: BarChart3
        }
      ]
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'SLA Configuration',
          url: '/settings/sla',
          icon: Timer
        },
        {
          title: 'Macros & Templates',
          url: '/settings/macros',
          icon: MessageSquare
        },
        {
          title: 'Approval Workflows',
          url: '/settings/approvals',
          icon: Workflow
        },
        {
          title: 'Automations',
          url: '/settings/automations',
          icon: PlayCircle
        },
        {
          title: 'Lifecycle Workflows',
          url: '/settings/lifecycle',
          icon: Activity
        }
      ]
    }
  ]
}
```

---

## Service Layer Updates

Create new service files in `/src/services/`:

### `/src/services/slaService.ts`
```typescript
import { apiClient } from '@/lib/api'
import { throwBilingualError } from '@/lib/bilingualErrorHandler'

export const slaService = {
  async getSLAs() {
    try {
      const response = await apiClient.get('/sla')
      return response.data.data
    } catch (error) {
      throwBilingualError(error, 'SLA_FETCH_FAILED')
    }
  },

  async createSLA(data: CreateSLADTO) {
    try {
      const response = await apiClient.post('/sla', data)
      return response.data.data
    } catch (error) {
      throwBilingualError(error, 'SLA_CREATE_FAILED')
    }
  },

  async getStats() {
    try {
      const response = await apiClient.get('/sla/stats')
      return response.data.data
    } catch (error) {
      throwBilingualError(error, 'SLA_STATS_FAILED')
    }
  }
}
```

### `/src/services/inboxService.ts`
```typescript
export const inboxService = {
  async getConversations(params?: ConversationFilters) {
    const response = await apiClient.get('/conversations', { params })
    return response.data.data
  },

  async getConversation(id: string) {
    const response = await apiClient.get(`/conversations/${id}`)
    return response.data.data
  },

  async sendMessage(conversationId: string, message: SendMessageDTO) {
    const response = await apiClient.post(
      `/conversations/${conversationId}/messages`,
      message
    )
    return response.data.data
  },

  async assignConversation(conversationId: string, userId: string) {
    const response = await apiClient.post(
      `/conversations/${conversationId}/assign`,
      { userId }
    )
    return response.data.data
  }
}
```

### `/src/services/approvalService.ts`
```typescript
export const approvalService = {
  async getWorkflows() {
    const response = await apiClient.get('/approvals/workflows')
    return response.data.data
  },

  async getPendingApprovals() {
    const response = await apiClient.get('/approvals/pending')
    return response.data.data
  },

  async recordDecision(instanceId: string, decision: ApprovalDecision) {
    const response = await apiClient.post(
      `/approvals/${instanceId}/decide`,
      decision
    )
    return response.data.data
  },

  async initiateApproval(data: InitiateApprovalDTO) {
    const response = await apiClient.post('/approvals/initiate', data)
    return response.data.data
  }
}
```

### `/src/services/viewService.ts`
```typescript
export const viewService = {
  async getViews() {
    const response = await apiClient.get('/views')
    return response.data.data
  },

  async createView(data: CreateViewDTO) {
    const response = await apiClient.post('/views', data)
    return response.data.data
  },

  async renderView(viewId: string, params?: RenderParams) {
    const response = await apiClient.get(`/views/${viewId}/render`, { params })
    return response.data.data
  }
}
```

### `/src/services/automationService.ts`
```typescript
export const automationService = {
  async getAutomations() {
    const response = await apiClient.get('/automations')
    return response.data.data
  },

  async createAutomation(data: CreateAutomationDTO) {
    const response = await apiClient.post('/automations', data)
    return response.data.data
  },

  async toggleAutomation(id: string, enabled: boolean) {
    const endpoint = enabled ? 'enable' : 'disable'
    const response = await apiClient.post(`/automations/${id}/${endpoint}`)
    return response.data.data
  },

  async testAutomation(id: string, testData: Record<string, any>) {
    const response = await apiClient.post(`/automations/${id}/test`, testData)
    return response.data.data
  }
}
```

### `/src/services/timelineService.ts`
```typescript
export const timelineService = {
  async getTimeline(
    entityType: string,
    entityId: string,
    params?: TimelineParams
  ) {
    const response = await apiClient.get(
      `/timeline/${entityType}/${entityId}`,
      { params }
    )
    return response.data.data
  },

  async getTimelineSummary(entityType: string, entityId: string) {
    const response = await apiClient.get(
      `/timeline/${entityType}/${entityId}/summary`
    )
    return response.data.data
  }
}
```

### `/src/services/cycleService.ts`
```typescript
export const cycleService = {
  async getCycles() {
    const response = await apiClient.get('/cycles')
    return response.data.data
  },

  async getActiveCycle() {
    const response = await apiClient.get('/cycles/active')
    return response.data.data
  },

  async createCycle(data: CreateCycleDTO) {
    const response = await apiClient.post('/cycles', data)
    return response.data.data
  },

  async getBurndown(cycleId: string) {
    const response = await apiClient.get(`/cycles/${cycleId}/burndown`)
    return response.data.data
  },

  async addTaskToCycle(cycleId: string, taskId: string) {
    const response = await apiClient.post(`/cycles/${cycleId}/tasks/${taskId}`)
    return response.data.data
  }
}
```

### `/src/services/reportService.ts`
```typescript
export const reportService = {
  async getReports() {
    const response = await apiClient.get('/reports')
    return response.data.data
  },

  async createReport(data: CreateReportDTO) {
    const response = await apiClient.post('/reports', data)
    return response.data.data
  },

  async executeReport(reportId: string, params?: ExecuteParams) {
    const response = await apiClient.get(`/reports/${reportId}/execute`, { params })
    return response.data.data
  },

  async exportReport(reportId: string, format: 'csv' | 'pdf' | 'xlsx') {
    const response = await apiClient.get(
      `/reports/${reportId}/export/${format}`,
      { responseType: 'blob' }
    )
    return response.data
  }
}
```

### `/src/services/deduplicationService.ts`
```typescript
export const deduplicationService = {
  async findDuplicates(contactId: string, threshold?: number) {
    const response = await apiClient.get(
      `/deduplication/contacts/${contactId}/duplicates`,
      { params: { threshold } }
    )
    return response.data.data
  },

  async getDuplicateSuggestions(limit?: number) {
    const response = await apiClient.get(
      '/deduplication/contacts/duplicate-suggestions',
      { params: { limit } }
    )
    return response.data.data
  },

  async mergeContacts(masterId: string, duplicateId: string) {
    const response = await apiClient.post('/deduplication/contacts/merge', {
      masterId,
      duplicateId
    })
    return response.data.data
  }
}
```

### `/src/services/dealHealthService.ts`
```typescript
export const dealHealthService = {
  async getDealHealth(dealId: string) {
    const response = await apiClient.get(`/deals/health/${dealId}`)
    return response.data.data
  },

  async getHealthDistribution() {
    const response = await apiClient.get('/deals/health/distribution')
    return response.data.data
  },

  async getStuckDeals() {
    const response = await apiClient.get('/deals/health/stuck')
    return response.data.data
  },

  async getDealsNeedingAttention(threshold?: number) {
    const response = await apiClient.get('/deals/health/attention', {
      params: { threshold }
    })
    return response.data.data
  }
}
```

### `/src/services/commandPaletteService.ts`
```typescript
export const commandPaletteService = {
  async search(query: string, types?: string[]) {
    const response = await apiClient.get('/command-palette/search', {
      params: { q: query, types: types?.join(',') }
    })
    return response.data.data
  },

  async getRecentItems() {
    const response = await apiClient.get('/command-palette/recent')
    return response.data.data
  },

  async getCommands() {
    const response = await apiClient.get('/command-palette/commands')
    return response.data.data
  },

  async trackRecordView(entityType: string, entityId: string, entityName: string) {
    await apiClient.post('/command-palette/track/record', {
      entityType,
      entityId,
      entityName
    })
  }
}
```

---

## Feature Integration Details

### Real-time Collision Detection

For the inbox collision detection, implement Socket.io connection:

```typescript
// /src/hooks/useTicketCollision.ts
import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth-store'

export function useTicketCollision(ticketId: string) {
  const [viewers, setViewers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const { user, token } = useAuthStore()

  useEffect(() => {
    const socket: Socket = io(process.env.VITE_WS_URL!, {
      auth: { token },
      query: { ticketId }
    })

    socket.on('viewers:updated', (data) => {
      setViewers(data.viewers.filter((v: string) => v !== user?.id))
    })

    socket.on('typing:started', (data) => {
      setTypingUsers(prev => [...prev, data.userId])
    })

    socket.on('typing:stopped', (data) => {
      setTypingUsers(prev => prev.filter(u => u !== data.userId))
    })

    // Join ticket room
    socket.emit('ticket:join', { ticketId })

    return () => {
      socket.emit('ticket:leave', { ticketId })
      socket.disconnect()
    }
  }, [ticketId, token, user?.id])

  const startTyping = () => {
    // Emit typing event
  }

  const stopTyping = () => {
    // Emit stop typing event
  }

  return {
    viewers,
    typingUsers,
    startTyping,
    stopTyping,
    isBeingViewed: viewers.length > 0
  }
}
```

### Burndown Chart Component

```typescript
// /src/components/cycles/BurndownChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useQuery } from '@tanstack/react-query'
import { cycleService } from '@/services/cycleService'

export function BurndownChart({ cycleId }: { cycleId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['cycle-burndown', cycleId],
    queryFn: () => cycleService.getBurndown(cycleId)
  })

  if (isLoading) return <Skeleton />

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data.burndownData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="ideal"
          stroke="#8884d8"
          strokeDasharray="5 5"
          name="Ideal"
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#82ca9d"
          name="Actual"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

### Deal Health Score Card

```typescript
// /src/components/deals/DealHealthCard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useQuery } from '@tanstack/react-query'
import { dealHealthService } from '@/services/dealHealthService'
import { Heart, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

export function DealHealthCard({ dealId }: { dealId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['deal-health', dealId],
    queryFn: () => dealHealthService.getDealHealth(dealId)
  })

  if (isLoading) return <Skeleton />

  const { score, category, factors, recommendations } = data

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    if (score >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Deal Health
        </CardTitle>
        <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score}%
        </span>
      </CardHeader>
      <CardContent>
        <Progress value={score} className="mb-4" />

        <div className="space-y-2">
          <h4 className="font-semibold">Health Factors</h4>
          {Object.entries(factors).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className={getScoreColor(value as number)}>{value}%</span>
            </div>
          ))}
        </div>

        {recommendations?.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Recommendations
            </h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
              {recommendations.map((rec: string, i: number) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

---

## How These Features Improve the System

### For Law Firm Staff (Lawyers, Paralegals)

1. **Inbox** - Single place to manage all client communications instead of switching between email, WhatsApp, etc.

2. **SLA Tracking** - Automatically tracks response times to client inquiries, ensuring service quality and compliance.

3. **Macros** - Quick responses for common questions, saving time and ensuring consistency.

4. **Timeline** - Complete 360° view of all interactions with a client on one screen.

5. **Deal Rooms** - Secure collaboration spaces for complex matters with document sharing.

6. **Cycles** - Sprint-based task management for managing caseloads and deadlines.

### For Management (Partners, Admins)

1. **Approval Workflows** - Multi-level approval for invoices, expenses, and contracts.

2. **Deal Health** - Dashboard showing pipeline health and stuck deals requiring attention.

3. **Report Builder** - Create custom reports without developer help.

4. **Automations** - Reduce manual work by automating repetitive tasks.

5. **Compliance Audit** - Immutable audit logs for regulatory compliance.

### For IT/Operations

1. **Custom Views** - Users can create their own views without code changes.

2. **Lifecycle Workflows** - Standardized onboarding/offboarding processes.

3. **Command Palette** - Power users can navigate faster with keyboard shortcuts.

4. **Deduplication** - Clean contact data automatically.

---

## Implementation Priority

### Phase 1 (High Priority - Core CRM)
1. Omnichannel Inbox
2. Command Palette
3. 360° Timeline (add to existing detail pages)
4. Deal Health Dashboard
5. Macros

### Phase 2 (Medium Priority - Workflows)
1. Approval Workflows
2. Automations
3. SLA Configuration
4. Contact Deduplication

### Phase 3 (Lower Priority - Advanced)
1. Custom Views (Kanban, Gantt, etc.)
2. Report Builder
3. Cycles/Sprints
4. Deal Rooms
5. Lifecycle Workflows

---

## TypeScript Types

Create `/src/types/crm-enhancement.ts`:

```typescript
// SLA Types
export interface SLA {
  _id: string
  name: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  responseTimeMinutes: number
  resolutionTimeMinutes: number
  businessHours: BusinessHours
  isActive: boolean
}

export interface BusinessHours {
  timezone: string
  schedule: DaySchedule[]
}

export interface DaySchedule {
  day: number
  isWorkingDay: boolean
  startTime: string
  endTime: string
}

// Conversation Types
export interface Conversation {
  _id: string
  channel: 'email' | 'whatsapp' | 'sms' | 'chat' | 'phone' | 'portal'
  status: 'open' | 'snoozed' | 'closed'
  subject?: string
  contactId: string
  assignedTo?: string
  messages: Message[]
  slaInstance?: SLAInstance
  lastMessageAt: Date
}

export interface Message {
  direction: 'inbound' | 'outbound'
  content: string
  contentType: 'text' | 'html' | 'attachment'
  attachments?: Attachment[]
  sentAt: Date
  readAt?: Date
}

// Macro Types
export interface Macro {
  _id: string
  name: string
  category: string
  content: string
  variables: string[]
  shortcut?: string
  usageCount: number
}

// Approval Types
export interface ApprovalWorkflow {
  _id: string
  name: string
  entityType: string
  levels: ApprovalLevel[]
  isActive: boolean
}

export interface ApprovalLevel {
  order: number
  name: string
  approvers: ApproverConfig
  approvalType: 'any' | 'all' | 'majority'
  autoEscalationHours?: number
}

export interface PendingApproval {
  _id: string
  workflowId: string
  entityType: string
  entityId: string
  currentLevel: number
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  requestedBy: string
  requestedAt: Date
}

// View Types
export interface View {
  _id: string
  name: string
  entityType: string
  viewType: 'table' | 'kanban' | 'calendar' | 'timeline' | 'gantt' | 'chart' | 'pivot'
  config: ViewConfig
  isDefault: boolean
  isShared: boolean
}

// Automation Types
export interface Automation {
  _id: string
  name: string
  entityType: string
  trigger: AutomationTrigger
  conditions: AutomationCondition[]
  actions: AutomationAction[]
  isActive: boolean
  executionCount: number
}

// Timeline Types
export interface TimelineItem {
  _id: string
  type: string
  title: string
  description?: string
  timestamp: Date
  user?: string
  metadata?: Record<string, any>
}

export interface TimelinePagination {
  hasMore: boolean
  nextCursor?: string
  total: number
}

// Cycle Types
export interface Cycle {
  _id: string
  name: string
  startDate: Date
  endDate: Date
  status: 'planning' | 'active' | 'completed' | 'cancelled'
  goals: CycleGoal[]
  metrics: CycleMetrics
}

export interface CycleMetrics {
  totalTasks: number
  completedTasks: number
  velocity: number
  burndownData: BurndownPoint[]
}

// Deal Health Types
export interface DealHealth {
  score: number
  category: 'excellent' | 'good' | 'fair' | 'at_risk' | 'critical'
  factors: HealthFactors
  recommendations: string[]
  lastCalculated: Date
}

export interface HealthFactors {
  activityRecency: number
  engagementLevel: number
  stageProgression: number
  stakeholderCoverage: number
  dealAge: number
  valueAlignment: number
}

// Report Types
export interface ReportDefinition {
  _id: string
  name: string
  description?: string
  dataSources: DataSource[]
  fields: ReportField[]
  filters: ReportFilter[]
  groupBy?: string[]
  sortBy?: SortConfig[]
  schedule?: ReportSchedule
}

// Deduplication Types
export interface DuplicateSuggestion {
  contact1: ContactSummary
  contact2: ContactSummary
  similarity: number
  matchedFields: string[]
}

export interface MergeResult {
  mergedContact: Contact
  deletedContactId: string
  mergedFields: Record<string, any>
}
```

---

This guide should provide a comprehensive roadmap for frontend integration. Start with Phase 1 features as they provide the most immediate value to users.
