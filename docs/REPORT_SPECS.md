# CRM Report Specifications

## Overview
Complete specifications for all CRM report components. Each report includes filters, metrics, visualizations, and export options.

---

## 1. Pipeline Report

**Route:** `/crm/reports/pipeline`
**Component:** `PipelineReport.jsx`
**API Endpoint:** `GET /api/analytics/pipeline`

### Filters
| Filter | Type | Default |
|--------|------|---------|
| Date Range | Date range picker | Last 30 days |
| Pipeline | Dropdown | All pipelines |
| Team | Dropdown | All teams |
| Territory | Dropdown | All territories |
| Assigned To | User picker | All users |

### Metrics Cards (Top row)
| Metric | Description | Format |
|--------|-------------|--------|
| Total Pipeline Value | Sum of all active deals | Currency |
| Weighted Pipeline | Value × probability | Currency |
| Average Deal Size | Mean of deal values | Currency |
| Total Deals | Count of active deals | Number |
| Avg Days in Pipeline | Mean age of deals | Days |

### Visualizations

**1. Pipeline by Stage (Horizontal Bar)**
- Y-axis: Stage names
- X-axis: Value (SAR)
- Bars colored by stage
- Show count labels on bars

**2. Stage Progression Funnel**
- Vertical funnel
- Show: Stage, Count, Value, Conversion %
- Highlight drop-off points

**3. Pipeline Trend Over Time (Line)**
- X-axis: Date (weekly or monthly)
- Y-axis: Value
- Lines for: Total, Weighted
- Compare to previous period option

**4. Deals Age Distribution (Histogram)**
- X-axis: Age buckets (0-7, 8-14, 15-30, 31-60, 60+ days)
- Y-axis: Deal count
- Highlight "at risk" deals

### Data Table: Stuck Deals
- Deals over X days in stage (configurable)
- Columns: Deal Name, Stage, Days in Stage, Value, Owner, Last Activity
- Sortable and filterable

### Export Options
- PDF with all charts
- Excel with raw data
- CSV of stuck deals

---

## 2. Sales Funnel Report

**Route:** `/crm/reports/funnel`
**Component:** `SalesFunnelReport.jsx`
**API Endpoint:** `GET /api/analytics/sales-funnel`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Team | Dropdown |
| Source | Dropdown |

### Funnel Visualization
**Full-width funnel chart showing:**
- Lead → Contacted → Qualified → Proposal → Negotiation → Won

**For each stage:**
- Count of deals
- Total value
- Conversion rate from previous stage
- Cumulative drop-off percentage

### Metrics
| Metric | Calculation |
|--------|-------------|
| Overall Conversion | Won / Total Leads × 100 |
| Best Converting Stage | Highest conversion % |
| Biggest Drop-off | Lowest conversion % |
| Average Funnel Time | Mean time through all stages |

### Conversion Rate Trend (Line Chart)
- Track conversion rates over time
- Identify trends

### Comparison View
- Side-by-side funnels for:
  - Different time periods
  - Different teams
  - Different sources

---

## 3. Forecast Report

**Route:** `/crm/reports/forecast`
**Component:** `ForecastReport.jsx`
**API Endpoints:**
- `GET /api/analytics/forecast`
- `GET /api/analytics/forecast-accuracy`

### View Toggles
- By Month / By Quarter
- By Sales Rep / By Team / By Territory

### Forecast Categories Table
| Column | Description |
|--------|-------------|
| Entity | Rep/Team/Territory name |
| Quota | Target amount |
| Closed Won | Actual closed |
| Commit | High probability deals |
| Best Case | Medium probability |
| Pipeline | Low probability |
| Gap | Quota - (Won + Commit) |
| Attainment % | Won / Quota × 100 |

### Visualizations

**1. Quota vs Actual (Bar Chart)**
- Grouped bars per period
- Quota, Commit, Won
- Gap highlighted

**2. Forecast Accuracy Trend (Line)**
- Historical accuracy by period
- Show improvement/decline

**3. Category Breakdown (Stacked Bar)**
- Per rep/team
- Closed, Commit, Best Case, Pipeline

### Forecast Summary Card
- Current period quota
- Predicted close amount
- Confidence level
- Gap to close

---

## 4. Activity Report

**Route:** `/crm/reports/activity`
**Component:** `ActivityReport.jsx`
**API Endpoint:** `GET /api/analytics/activity`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Activity Type | Multi-select |
| User | User picker |
| Entity Type | Dropdown |

### Metrics Cards
| Metric | Description |
|--------|-------------|
| Total Activities | Count all |
| Completed | Completed count |
| Completion Rate | % completed |
| Overdue | Past due count |
| Avg per User | Activities / Users |

### Visualizations

**1. Activity Volume Over Time (Area Chart)**
- Stacked by type
- Daily/Weekly aggregation

**2. Activity Type Breakdown (Pie/Donut)**
- Calls, Emails, Meetings, Tasks, Notes
- With percentages

**3. User Activity Comparison (Horizontal Bar)**
- Per user totals
- Colored by type

**4. Completion Trend (Line)**
- Track completion rate over time

### Activity Table
- Detailed list with all activities
- Groupable by type, user, entity
- Columns: Type, Title, Related To, Status, Due Date, Completed

---

## 5. Win/Loss Report

**Route:** `/crm/reports/win-loss`
**Component:** `WinLossReport.jsx`
**API Endpoint:** `GET /api/analytics/win-loss`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Team | Dropdown |
| Territory | Dropdown |
| Source | Dropdown |

### Summary Cards
| Metric | Description |
|--------|-------------|
| Win Rate | Won / (Won + Lost) × 100 |
| Deals Won | Count |
| Deals Lost | Count |
| Won Revenue | Value of won deals |
| Lost Revenue | Value of lost deals |

### Visualizations

**1. Win/Loss Trend (Line Chart)**
- Track win rate over time
- Show won and lost counts

**2. Lost Reasons Breakdown (Pie/Bar)**
- By reason category
- Percentage of each

**3. Competitor Analysis (Bar)**
- Losses by competitor
- Win rate against each competitor

**4. Win Rate by Source (Bar)**
- Compare sources
- Identify best performers

**5. Win Rate by Sales Rep (Horizontal Bar)**
- Ranked by win rate
- Show volume as bar width

### Lost Deals Analysis Table
- All lost deals with:
  - Deal name, Value
  - Lost reason
  - Competitor (if any)
  - Time in pipeline
  - Owner

---

## 6. Lead Source Report

**Route:** `/crm/reports/lead-sources`
**Component:** `LeadSourceReport.jsx`
**API Endpoint:** `GET /api/analytics/lead-sources`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Territory | Dropdown |

### Summary Cards
| Metric | Per Source |
|--------|------------|
| Leads | Count |
| Conversion Rate | Converted / Total |
| Revenue | From won deals |
| Avg Deal Size | Revenue / Won |
| Quality Score | Weighted metric |

### Visualizations

**1. Source Breakdown (Treemap or Pie)**
- Size by lead count
- Color by conversion rate

**2. Source Performance Comparison (Bar)**
- Grouped: Leads, Converted, Revenue
- Compare all sources

**3. Source Trend Over Time (Stacked Area)**
- Lead volume by source over time

**4. ROI by Source (Bubble Chart)**
- X: Cost per lead
- Y: Revenue per lead
- Size: Volume

### Cost Analysis Table (if cost tracking enabled)
| Source | Leads | Cost | CPL | Conversions | CPA | Revenue | ROI |
|--------|-------|------|-----|-------------|-----|---------|-----|

---

## 7. Team Performance Report

**Route:** `/crm/reports/team-performance`
**Component:** `TeamPerformanceReport.jsx`
**API Endpoint:** `GET /api/analytics/team-performance`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Team | Dropdown |

### Summary Cards (Team Totals)
| Metric | Description |
|--------|-------------|
| Revenue Closed | Sum of won deals |
| Deals Closed | Count |
| Win Rate | Overall |
| Avg Deal Size | Mean |
| Quota Attainment | % of target |

### Visualizations

**1. Team Revenue Comparison (Bar)**
- Each team's closed revenue
- vs Quota overlay

**2. Individual Leaderboard**
| Rank | Name | Revenue | Deals | Win Rate | Quota % |
|------|------|---------|-------|----------|---------|

**3. Performance Trend (Line)**
- Team performance over time
- Compare teams

**4. Activity to Revenue Correlation (Scatter)**
- X: Activities
- Y: Revenue
- Point per rep

### Individual Rep Cards
For each team member:
- Photo/Avatar
- Key metrics
- Trend arrow
- Click to see details

---

## 8. Territory Report

**Route:** `/crm/reports/territory`
**Component:** `TerritoryReport.jsx`
**API Endpoint:** `GET /api/analytics/territory`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Parent Territory | Dropdown |

### Visualizations

**1. Saudi Arabia Region Map**
- Interactive map of 13 regions
- Color intensity by revenue/leads
- Click region for details
- Tooltip with key metrics

**2. Territory Comparison (Bar)**
- Revenue by territory
- Lead count overlay

**3. Territory Hierarchy Table**
| Territory | Leads | Won | Lost | Win Rate | Revenue | Pipeline |
|-----------|-------|-----|------|----------|---------|----------|

### Regional Details (Expandable)
For each region:
- Major cities breakdown
- Assigned team/user
- YoY comparison

---

## 9. Campaign ROI Report

**Route:** `/crm/reports/campaign-roi`
**Component:** `CampaignRoiReport.jsx`
**API Endpoint:** `GET /api/analytics/campaign-roi`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Campaign Type | Dropdown |
| Channel | Dropdown |

### Summary Cards
| Metric | Description |
|--------|-------------|
| Total Spend | Sum of actual budgets |
| Total Revenue | From attributed deals |
| Overall ROI | (Revenue - Spend) / Spend × 100 |
| Cost Per Lead | Spend / Leads |
| Cost Per Acquisition | Spend / Customers |

### Visualizations

**1. Campaign Performance Table**
| Campaign | Spend | Leads | CPL | Conversions | Revenue | ROI |
|----------|-------|-------|-----|-------------|---------|-----|

**2. ROI Trend (Line)**
- Monthly ROI over time

**3. Best Performing Campaigns (Horizontal Bar)**
- Ranked by ROI
- Show spend and revenue

**4. Channel Comparison (Grouped Bar)**
- By channel
- Metrics: Leads, Conversions, ROI

### Email Campaign Stats (if applicable)
| Metric | Description |
|--------|-------------|
| Sent | Total emails |
| Delivered | % delivered |
| Opened | Open rate |
| Clicked | Click rate |
| Unsubscribed | Opt-out rate |

---

## 10. First Response Time Report

**Route:** `/crm/reports/first-response`
**Component:** `FirstResponseReport.jsx`
**API Endpoint:** `GET /api/analytics/first-response`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Team | Dropdown |
| Lead Source | Dropdown |

### Summary Cards
| Metric | Description |
|--------|-------------|
| Avg First Response | Overall average (minutes) |
| Median Response | 50th percentile |
| < 5 min | % responded under 5 min |
| < 15 min | % under 15 min SLA |
| > 60 min | % exceeding 1 hour |

### Visualizations

**1. Response Time Distribution (Histogram)**
- Buckets: 0-5, 5-15, 15-30, 30-60, 60+ minutes
- Show count per bucket

**2. Response Time by User (Horizontal Bar)**
- Ranked from fastest to slowest
- Show avg response time

**3. Response Time Trend (Line)**
- Track improvement over time

**4. Impact on Conversion (Scatter)**
- X: Response time
- Y: Conversion rate
- Show correlation

### SLA Compliance Table
| User | Total Leads | Under 5min | Under 15min | Avg Time | Compliance % |
|------|-------------|------------|-------------|----------|--------------|

---

## 11. Conversion Rates Report

**Route:** `/crm/reports/conversion`
**Component:** `ConversionReport.jsx`
**API Endpoint:** `GET /api/analytics/conversion-rates`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Group By | Source / Rep / Territory / Period |

### Conversion Funnel Metrics
| Stage Transition | Rate |
|------------------|------|
| Lead → Contacted | X% |
| Contacted → Qualified | X% |
| Qualified → Proposal | X% |
| Proposal → Negotiation | X% |
| Negotiation → Won | X% |
| **Overall** | X% |

### Visualizations

**1. Conversion Funnel (Vertical)**
- Clear visualization of drop-offs

**2. Conversion by Group (Bar/Table)**
- Based on selected grouping
- Compare rates across groups

**3. Conversion Trend (Line)**
- Monthly conversion rate trend

**4. Stage-by-Stage Comparison (Heatmap)**
- Rows: Groups (sources/reps/etc)
- Columns: Stages
- Color: Conversion rate

---

## 12. Cohort Analysis Report

**Route:** `/crm/reports/cohort`
**Component:** `CohortReport.jsx`
**API Endpoint:** `GET /api/analytics/cohort`

### Filters
| Filter | Type |
|--------|------|
| Cohort Period | Dropdown (Month/Week) |
| Number of Periods | Number input (3-12) |
| Metric | Dropdown (Conversion/Revenue/Retention) |

### Cohort Matrix Table

| Cohort | Month 0 | Month 1 | Month 2 | Month 3 | ... |
|--------|---------|---------|---------|---------|-----|
| Jan 2024 | 100% | 45% | 32% | 28% | ... |
| Feb 2024 | 100% | 48% | 35% | ... | ... |
| Mar 2024 | 100% | 42% | ... | ... | ... |

- Cell color intensity based on value
- Hover for absolute numbers
- Click cell for details

### Visualizations

**1. Cohort Trend Lines**
- Line per cohort
- X: Time since cohort
- Y: Metric value

**2. Average Cohort Curve**
- Aggregate of all cohorts
- Show variance band

### Insights Panel
- Best performing cohort
- Worst performing
- Trend direction
- Notable patterns

---

## 13. Revenue Report

**Route:** `/crm/reports/revenue`
**Component:** `RevenueReport.jsx`
**API Endpoint:** `GET /api/analytics/revenue`

### Filters
| Filter | Type |
|--------|------|
| Date Range | Date range picker |
| Group By | Product / Client / Territory / Rep |
| Revenue Type | All / One-time / Recurring |

### Summary Cards
| Metric | Description |
|--------|-------------|
| Total Revenue | Sum of closed won |
| Recurring Revenue | MRR × 12 or ARR |
| One-time Revenue | Non-recurring |
| Avg Revenue Per Deal | Mean |
| Revenue Growth | % vs previous period |

### Visualizations

**1. Revenue Trend (Bar + Line)**
- Bars: Monthly revenue
- Line: Cumulative
- Compare to previous year

**2. Revenue by Category (Pie/Treemap)**
- By product/service category
- Or by client type

**3. Recurring vs One-time (Stacked Bar)**
- Monthly breakdown
- Show split

**4. Top Revenue Sources (Horizontal Bar)**
- Top 10 clients/products/reps
- Ranked by revenue

### Revenue Table
| Entity | Revenue | Deals | Avg Deal | % of Total | Growth |
|--------|---------|-------|----------|------------|--------|

### MRR/ARR Section (if tracking recurring)
| Metric | Value |
|--------|-------|
| Current MRR | Amount |
| MRR Growth | % |
| Churn | % lost |
| Net New MRR | New - Churn |
| ARR | MRR × 12 |

---

## Common Report Features

### Export Options (All Reports)
- PDF with visualizations
- Excel with raw data
- CSV for data processing
- Scheduled email reports

### Print View
- Optimized layout for print
- Charts in print-friendly format
- Date/time stamp

### Comparison Mode
- Compare to previous period
- Compare to same period last year
- Show % change

### Data Refresh
- Auto-refresh toggle
- Manual refresh button
- Last updated timestamp

### Report Sharing
- Generate shareable link
- Email report
- Export to PDF

### Mobile Responsiveness
- Charts resize appropriately
- Tables scroll horizontally
- Filters collapse to drawer
