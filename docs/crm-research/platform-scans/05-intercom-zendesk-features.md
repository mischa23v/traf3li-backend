# Intercom & Zendesk Features Research

## INTERCOM

### 1. Omnichannel Inbox

#### Supported Channels
- Email (multiple domains, custom signatures)
- Live Chat (website and app)
- SMS (45 languages)
- Social Media: Instagram, Facebook, WhatsApp, Twitter/X

#### Capabilities
- Unified dashboard across all channels
- Seamless channel switching
- AI-Powered inbox (Fin AI Agent, Copilot)
- Multi-channel assignment
- Conversation continuity

### 2. Conversation Timeline

#### Features
- Chronological message history
- Workflow events (SLA applied, assignments)
- Internal notes (agent-only)
- Status changes
- Assignment history
- System actions

### 3. SLAs

#### Core Metrics
- First Response Time (FRT)
- Next Response Time (NRT)
- Time to Close (TTC)
- Time to Resolve (TTR)

#### Features
- Workflow-based creation
- Intelligent pausing (snoozed, waiting on customer)
- Override existing SLAs
- Office hours integration
- Visual indicators (red, orange, grey)
- Performance reports

### 4. Macros

#### Characteristics
- Saved reply templates
- One-click deployment
- Integrated follow-up actions
- Auto-assign, close, apply SLAs

#### Difference from Workflows
- Macros: Manual, immediate
- Workflows: Automatic, background

### 5. Collision Detection

#### How It Works
- Task Bot posts internal note on collision
- Real-time notification to agents
- Prevents duplicate responses

#### Limitations
- Reactive, not proactive
- Manual intervention required
- Doesn't prevent cherry-picking

### 6. Team Inbox

#### Structure
- Dedicated workspace per team
- Shared visibility
- Customizable emoji avatar

#### Assignment Methods
- Manual (team members claim)
- Round Robin (sequential)
- Balanced (fewest open tickets)

### 7. Routing Rules

#### Process
1. Trigger: New message arrives
2. Conditions: Evaluate attributes
3. Action: Route to destination

#### Condition Types
- Customer attributes (location, language, tier)
- Message content (keywords, channel)
- Account status (VIP, at-risk)

---

## ZENDESK

### 1. Ticket Management

#### Core Functionality
- Multi-channel consolidation
- Automatic categorization
- Internal collaboration notes
- Bulk operations

#### Features
- Ticket properties (type, urgency, status)
- Analytics and reporting
- Knowledge base integration
- AI-powered assistance
- 3rd-party integrations

### 2. Views

#### Types
- Shared Views (up to 100, admin-created)
- Personal Views (up to 10, agent-created)

#### Filtering
- 15+ column types available
- Dynamic filtering
- Sorting and grouping
- Condition-based (All/Any)

### 3. Macros

#### Characteristics
- Prepared responses with single click
- Modify fields, add/modify tags
- Personal or shared (up to 5,000)
- Suggested macros based on similar tickets

#### Categorization
- Use double colons (::) in title
- Example: "Billing::Invoice"

### 4. Triggers

#### Definition
- Business rules executing immediately
- Condition-based on creation/update
- Not applied to closed tickets

#### Types
- Ticket Triggers (most common)
- Object Triggers (custom objects)

### 5. Automations

#### Definition
- Time-based business rules
- Run hourly on non-closed tickets
- Ongoing monitoring

#### Key Differences from Triggers
| Triggers | Automations |
|----------|-------------|
| Immediate | Time-based (hourly) |
| On creation/update | Continuous |
| Instant actions | Delayed/recurring |

### 6. SLAs

#### Metrics
- First Reply Time
- Next Reply Time
- Periodic Update Time
- Request Wait Time
- Agent Work Time
- Total Resolution Time

#### Configuration
- Priority-based (urgent, high, normal, low)
- Trigger integration for auto-priority
- Group SLAs (Enterprise) for OLAs

### 7. Satisfaction Ratings

#### CSAT
- Post-resolution surveys
- Multi-channel delivery
- 60-day rolling average
- 90-day historical data

#### NPS
- 0-10 scale
- Detractors (0-6), Passives (7-8), Promoters (9-10)
- Long-term loyalty measurement

### 8. Agent Collision

#### Features
- Real-time alerts (Plus/Enterprise)
- Agent status display (idle, viewing, editing)
- Play mode auto-assignment
- Tag merging protection

---

## Comparison

| Feature | Intercom | Zendesk |
|---------|----------|---------|
| Focus | Conversational | Ticketing |
| AI | Fin AI Agent, Copilot | Einstein AI |
| Channels | 6+ | 5+ |
| SLA Metrics | 4 | 6 |
| Automation | Workflows | Triggers + Automations |
| Collision Detection | Task Bot | Real-time alerts |
| Best for | Modern CS teams | Enterprise support |

---

*Sources: Intercom Help, Zendesk Help, Feature documentation*
