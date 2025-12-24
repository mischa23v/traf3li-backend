# Salesforce CRM Features Research

## 1. Pipeline Views

### Opportunity Boards
- Default views: "My Pipeline", "My Important Opportunities"
- Custom views with quick filters (close date, rep, team, territory)
- Field summarization by configured metrics
- Pipeline charts by Account or Stage

### Sales Path
- Visual representation of sales stages
- Next Best Action guidance
- Process transparency for collaboration
- Admin-configurable stage definitions

### Kanban View
- Drag-and-drop stage transitions
- Grouping and summarization options
- Smart alerts for deal movement
- Multi-object support (Deals, Tickets, Contacts)

### Pipeline Inspection (AI-Powered)
- Consolidated pipeline metrics
- Week-to-week change tracking with color coding
- Einstein Deal Insights and predictions
- Close date predictions
- Available: Enterprise, Performance, Unlimited editions

## 2. Custom Objects/Fields

### Field Types (20+)
- Text (single, long, rich text, email, URL, phone)
- Numeric (number, currency, percent)
- Date & Time (date, datetime, time)
- Selection (picklist, multi-select, checkbox)
- Relationship (lookup, master-detail)
- Formula and Roll-up Summary

### Validation Rules
- Formula-based validation returning TRUE/FALSE
- Cross-field validation
- Error location (top of page or specific field)
- Common functions: AND, OR, NOT, ISBLANK, ISPICKVAL, LEN

### Formula Fields
- Read-only calculated values
- 3,900 character limit
- Return types: Checkbox, Date, DateTime, Number, Currency, Percent, Text, Time
- Cross-object references supported
- IMAGE() function for visual indicators

### Roll-Up Summary Fields
- COUNT, SUM, MAX, MIN, AVG calculations
- Master-Detail relationships only
- Up to 25 per object
- Alternative: DLRS for lookup relationships

## 3. Relationships

### Lookup Relationships
- Optional associations
- No cascading deletes
- Unlimited per object
- Independent ownership/sharing

### Master-Detail Relationships
- Mandatory parent-child
- Cascading deletes
- Maximum 2 per object
- Inherited ownership/sharing
- Roll-up summary support

## 4. Reporting

### Report Builder
- Tabular, Summary, Matrix, Joined reports
- Up to 5 report blocks in joined reports
- Cross filters for exception reporting
- Stacked Summaries for data consolidation

### Dashboards
- 11 chart types (bar, pie, line, donut, area, scatter, etc.)
- Gauges with color-coded ranges
- Metrics with dynamic goals
- Up to 25 components per dashboard
- Dynamic dashboards by user role

### Einstein Analytics
- Machine learning analysis
- Prediction Builder for custom models
- Lead and Opportunity Scoring
- Account Insights
- Next Best Action recommendations

## 5. Forecasting

### Standard Categories
- Pipeline, Best Case, Commit, Omitted, Closed, Most Likely

### Collaborative Forecasting
- Team collaboration and alignment
- Quota management via Revenue Insights
- Real-time updates
- Single vs. Cumulative rollups

### AI Predictions
- Analyzes historical opportunities
- Reviews win rates and activities
- Provides confidence ranges
- Identifies at-risk opportunities

## 6. Automation

### Flow Builder (Primary Tool)
- Screen Flows (interactive)
- Record-Triggered Flows
- Autolaunched Flows
- Scheduled Flows
- Platform Event-Triggered Flows

### 2025 Enhancements
- Einstein Flow Generation (AI-powered)
- Flow Analysis with natural language
- Time Data Type support
- AI-Powered Decision elements

### Apex Triggers
- Before/After triggers
- Insert, Update, Delete, Undelete events
- Bulk processing (200 records)
- Handler class pattern recommended

### Approval Processes
- Multi-level approval chains
- Parallel or serial approvers
- Actions: Tasks, Email Alerts, Field Updates
- Flow Approval Orchestration (Spring '25+)

---

## Edition Comparison

| Feature | Essentials | Professional | Enterprise | Unlimited |
|---------|------------|--------------|------------|-----------|
| Custom Objects | 10 | 50 | 200 | 200 |
| Validation Rules | Yes | Yes | Yes | Yes |
| Formula Fields | Yes | Yes | Yes | Yes |
| Flow Builder | Limited | Yes | Yes | Yes |
| Pipeline Inspection | No | No | Yes | Yes |
| Einstein Analytics | No | No | Add-on | Yes |

---

*Sources: Salesforce Help, Trailhead, Salesforce Ben, Salesforce Developers*
