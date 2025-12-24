# Notion & Coda Features Research

## NOTION

### 1. Block-Based Architecture

#### Foundational Concept
- Everything is a block (text, images, databases, pages)
- Tree-like data structure with parent/child relationships
- Blocks can be transformed between types
- Pages are blocks that contain other blocks

#### Block Types (500+)
- **Text**: Headings, paragraphs, lists, toggles, quotes, callouts
- **Inline**: Equations, mentions
- **Media**: Images, video, audio, files, code, bookmarks
- **Embeds**: 1,900+ domains via Iframely
- **Database**: Table, Board, Calendar, Gallery, List, Timeline
- **Advanced**: Synced blocks, buttons, columns, TOC

### 2. Real-Time Collaboration

#### Features
- Simultaneous editing without content locking
- Live cursor tracking with colored indicators
- Unlimited concurrent users
- Instant updates across all clients
- Version history with rollback

#### Comments & Mentions
- Page-level and block-level comments
- @mentions with notifications
- Threaded discussions
- Comment resolution

### 3. Databases

#### Views
- Table, Board (Kanban), Calendar, Gallery, List, Timeline
- Multiple views of same underlying data
- Filtering, sorting, grouping
- Aggregations (sum, count, average)

#### Features
- Relations between databases
- Rollups for cross-database calculations
- Linked databases (mirrors)
- Database templates

### 4. Permissions & Guest Access

#### Workspace Roles
- Owner: Full admin control
- Membership Admin: Member management (Enterprise)
- Members: Create and share content
- Guests: Page-specific access only

#### Permission Levels
- Full Access, Can Edit, Can Comment, Can View

### 5. Templates
- Built-in workspace templates
- Database templates for recurring content
- Community/expert templates
- Repeating templates on schedule

---

## CODA

### 1. Doc Structure

#### Organization
- Pages and subpages (nested hierarchy)
- Sections for vertical separation
- Doc map for navigation
- Collapsible content

### 2. Tables

#### Types
- Base Tables (original data)
- Views (connected mirrors with different formatting)

#### Features
- Filter, sort, summarize
- Custom columns with various data types
- Lookups and conditional formatting

### 3. Formulas

#### Key Differences from Excel
- Named references (no cell coordinates)
- Hundreds of built-in functions
- Available in tables, buttons, automations, controls

#### Essential Functions
- Filter(), SwitchIf(), User(), Aggregate, Lookup

### 4. Buttons

#### Capabilities
- Custom actions without code
- Canvas and table row placement
- Native actions + 600+ Pack integrations
- Trigger workflows on click

### 5. Automations

#### Components
- Triggers (time-based, event-based, manual)
- Actions (formulas, Pack actions, data updates)
- Sequential "And Then" steps
- Unlimited on free tier

### 6. Packs (Integrations)

#### Types
- Integration Packs (Slack, Gmail, Zapier)
- Data Packs (external APIs)
- Utility Packs (specialized functionality)
- Custom Packs via SDK

### 7. Embeds

#### Methods
- Canvas embeds (paste URL)
- Full-page embeds
- Formula method: =Embed()

#### Supported Content
- Google Sheets, Figma, Miro, Zoom
- Rich embeds (view/interact)
- Editable embeds (bidirectional)

---

## Comparison

| Feature | Notion | Coda |
|---------|--------|------|
| Block-based | 500+ types | Doc-based with tables |
| Databases | Native relational | Tables with views |
| Formulas | Database formulas | Full formula language |
| Automations | Limited | Unlimited (free tier) |
| Integrations | Embeds + API | 600+ Packs |
| Real-time collab | Excellent | Excellent |
| Templates | Extensive gallery | Growing library |
| Best for | Knowledge bases, wikis | Custom apps, workflows |

---

*Sources: Notion Help Center, Notion Developers, Coda Help, Coda Packs*
