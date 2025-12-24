# Linear & Jira Features Research

## LINEAR

### 1. Keyboard-First UX

#### Core Principles
- Deep keyboard shortcut integration
- Visual indicators for available shortcuts
- Progressive revelation of shortcuts

#### Key Shortcuts
- `Cmd/Ctrl + K`: Command Palette
- `?`: Searchable keyboard shortcuts help
- `G + I`: Go to Inbox
- `G + D`: Go to Dashboard
- Navigation pattern similar to Superhuman

### 2. Command Palette

#### Design Philosophy
- Single shortcut (`Cmd+K`) to access any command
- Fuzzy search for quick access
- Displays associated keyboard shortcuts
- Progressive learning tool

### 3. Offline Support

#### Capabilities
- Full functionality without internet
- Changes stored locally via IndexedDB
- "Syncing [count]" status indicator
- Automatic retry on connectivity restore

#### Limitations
- Designed as failsafe, not full-fledged feature
- No creation date checking for conflict resolution
- Risk with simultaneous offline edits

### 4. Background Sync

#### Architecture
- Proprietary WebSocket sync framework
- React + MobX + TypeScript stack
- Observable properties for automatic UI updates
- Object pool pattern with UUID indexing

#### Performance
- Millisecond-level latency
- No spinners (optimistic updates)
- Pre-warmed client optimization
- Lazy loading for less-used data

### 5. Cycles (Sprints)

#### Configuration
- 1-8 week duration (2 weeks most common)
- Auto-generation on schedule
- Automatic rollover of unfinished work
- Optional cooldown periods

#### Key Difference
- Cycles NOT tied to releases
- Multiple cycles can contribute to single release

### 6. Projects

#### Structure
- Clear outcomes with planned completion dates
- Issues + Documents (markdown, real-time editing)
- Milestones for progress markers
- Cross-team collaboration support

### 7. Roadmaps (Initiatives)

#### Hierarchy
1. Initiatives (strategic efforts)
2. Projects (specific features)
3. Cycles (time-boxed execution)

#### Purpose
- Strategic alignment
- Cross-functional visibility
- Long-term planning
- Resource allocation

### 8. Performance Optimizations

#### Strategies
- Full-stack TypeScript
- Web-first architecture
- IndexedDB caching
- Code splitting and virtualization
- MobX observables for efficient rendering

---

## JIRA (Team-Managed Projects)

### 1. Overview

#### Terminology
- Previously: Next-Gen projects
- Current: Team-managed projects
- Self-service setup without Jira admin

### 2. Simplified Boards

#### Default Features
- Single board per project
- Columns = workflow statuses
- Drag-and-drop transitions
- Field visibility customization

#### Limitations
- Multiple boards not supported
- Cannot share workflows across projects

### 3. Roadmaps

#### Basic Roadmaps
- Built-in epic/story timeline
- Start and due date visualization
- Available all plans

#### Advanced Roadmaps (Plans)
- Premium/Enterprise only
- Cross-project visibility
- Team field assignments
- Target dates

### 4. Automation Rules

#### Capabilities
- Auto-assign based on conditions
- Field updates on transitions
- Trigger on creation/update
- Global or project-specific

#### Limitations
- People custom fields not supported
- Flagged field automation not supported
- Advanced Roadmaps field updates not supported

### 5. Custom Fields

#### Capacity
- Maximum 50 per team-managed space
- No sharing between spaces
- User-specific view settings

### 6. Backlog Management

#### Types
- Kanban backlog (continuous flow)
- Scrum backlog (sprint-based)

#### Features
- Epic and version panels
- Quick filters
- Field visibility controls
- Insights on backlog health

---

## Comparison: Team-Managed vs Company-Managed

| Feature | Team-Managed | Company-Managed |
|---------|--------------|-----------------|
| Setup | Self-service | Admin required |
| Boards | Single | Multiple |
| Workflows | Simple | Advanced |
| Shared Workflows | No | Yes |
| Custom Fields | 50 max, isolated | Shared |
| Reports | Basic | 17+ advanced |
| Learning Curve | Minimal | Moderate |

---

## Linear vs Jira Comparison

| Aspect | Linear | Jira |
|--------|--------|------|
| UX Rating (2024) | 4.6/5 | 3.2/5 |
| Performance | Optimized | Variable |
| Keyboard-first | Core philosophy | Available |
| Offline | Full support | Limited |
| Sync | Millisecond | Seconds |
| Best for | Dev teams, speed | Enterprise, flexibility |

---

*Sources: Linear Docs, Atlassian Documentation, Trailhead, Salesforce Ben*
