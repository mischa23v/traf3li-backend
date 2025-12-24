# HubSpot CRM Features Research

## 1. Pipeline Views

### Customizable Pipeline Stages
- Stage concepts and default pipelines (Sales, Lead, Service)
- Custom pipeline creation with API endpoints
- Stage properties and metadata configuration
- Stage management rules (creation, movement, approval workflows)

### Deal Boards and Kanban Views
- Board view architecture and supported objects
- Card customization with up to 4 displayable properties
- Sales Workspace Kanban (Beta 2025) with AI insights
- Support for Deals, Tickets, Contacts, Companies, and custom objects

### Drag-and-Drop Functionality
- Complete backend process flow with PATCH API calls
- Stage ID resolution (internal IDs vs. labels)
- Validation and rules engine details
- Real-time update mechanisms via WebSocket

### Advanced Filtering
- Quick filters and advanced filters with AND/OR logic
- Complete filter operator reference
- Saved views functionality
- API-based filtering with search endpoint

## 2. Custom Objects/Fields

### Property Types (15+ types)
- Text (single-line, multi-line, rich text)
- Enumeration (checkboxes, dropdown, radio)
- Numbers, Dates, Datetime
- Special types: Calculation, Score, HubSpot user, File, Property sync

### Validation Rules
- Character limits, numeric-only, special character restrictions
- Number ranges, unique values, phone validation
- Regex patterns (Professional+ required)

### Calculated Fields & Formulas
- Supports arithmetic, comparison, logic operators
- Date, string, and math functions (DATEDIFF, CONCAT, IF, ROUND, etc.)
- Up to 70 nested parentheses
- Output types: Number, Boolean, String, Date, Datetime
- Same-object references only

### Field Dependencies
- Conditional Property Logic (Private Beta)
- Dependent Form Fields for cascading selects

## 3. Reporting & Analytics

### Report Builder
- Multiple Object Support: 5 data sources simultaneously
- Smart Chart Feature with auto-suggestions
- AI-Generated Reports (Breeze AI)
- Formula Fields (Data Hub Enterprise)

### Dashboards
- Real-time data interfaces
- Mobile viewing via HubSpot mobile app
- Customizable tiles and widgets
- Territory, product line, time range filtering

### Forecasting
- Forecast Categories & Deal Stages
- AI-Powered Forecasting (Breeze)
- Pipeline Tracking with weighted calculations
- Day 1, 7, 14, 21, 28 update schedule

## 4. Sales Playbooks

### Interactive Content
- Multimedia Support: Text, links, images, videos
- Question & Answer Boxes with clickable responses
- Auto-logging to contact records
- Property mapping from Q&A responses

### Templates
- Discovery calls, Qualification calls, Prospecting
- Client meetings, Follow-up emails
- Competitor comparisons

## 5. Automation (Workflows)

### Triggers
- Event-Based (form submission, email open, page visit)
- Filter Criteria (when conditions become true)
- Schedule-Based (calendar dates)
- Webhook (external third-party systems)
- AI-Powered via Breeze Assistant

### Actions
- Communications (email, SMS, social, push)
- CRM updates (create/update records, lifecycle stages)
- Marketing (lists, ads, subscriptions)
- Data operations (custom code, webhooks)
- Connected apps (Slack, Google, Zoom)

### Branching Logic
- Single Property/Value branches (up to 250)
- AND/OR Logic branches (up to 20)
- Random Split for A/B testing

## 6. Sequences

### Types
- Standard Sequences (timed email series)
- Dynamic Sequences (AI-powered with task generation)

### Task Types
- Automated email, Manual email, Call tasks
- General tasks, LinkedIn Sales Navigator tasks
- Auto-unenrollment on reply/meeting booking

---

## Subscription Tiers

| Feature | Free | Starter | Professional | Enterprise |
|---------|------|---------|--------------|------------|
| Custom Properties | Limited | Yes | Yes | Yes |
| Calculation Properties | No | No | Yes | Yes |
| Custom Objects | No | No | No | Yes |
| Workflows | No | Limited | Yes | Yes |
| Playbooks | No | No | Yes | Yes |
| Advanced Reporting | No | No | Yes | Yes |

---

*Sources: HubSpot Knowledge Base, HubSpot Developers, HubSpot Blog*
