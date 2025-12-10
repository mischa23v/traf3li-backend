# CaseNotion Frontend Integration Guide

> **Notion-like Case Workspace for Law Firms**
>
> CaseNotion brings block-based editing, wiki-style navigation, synced blocks, multiple database views, and AI assistance to your case management system.

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [API Endpoints](#3-api-endpoints)
4. [Block Types Reference](#4-block-types-reference)
5. [React Components](#5-react-components)
6. [Database Views](#6-database-views)
7. [Synced Blocks](#7-synced-blocks)
8. [AI Features](#8-ai-features)
9. [Real-time Collaboration](#9-real-time-collaboration)
10. [Templates](#10-templates)
11. [Best Practices](#11-best-practices)

---

## 1. Overview

### What is CaseNotion?

CaseNotion is a Notion-like workspace embedded within each case, providing lawyers with:

- **Block-Based Editor**: 60+ block types including paragraphs, headings, toggles, callouts, embeds, and legal-specific blocks
- **Wiki-Style Pages**: Infinite nesting, backlinks, and [[wiki-style]] linking
- **Synced Blocks**: Edit once, update everywhere - perfect for boilerplate text
- **Multiple Database Views**: Table, Board, Timeline, Calendar, Gallery, List, Chart
- **AI Features**: Auto-fill, summarization, Q&A about case content
- **Real-time Collaboration**: Block locking, cursor tracking

### Feature Comparison with Notion

| Feature | Notion | CaseNotion | Notes |
|---------|--------|------------|-------|
| Block-based editing | ✅ 50+ types | ✅ 60+ types | Includes legal-specific blocks |
| Synced blocks | ✅ | ✅ | Edit once, sync everywhere |
| Database views | ✅ 7 views | ✅ 7 views | Table, Board, Timeline, Calendar, Gallery, List, Chart |
| Relations & Rollups | ✅ | ✅ | Cross-database calculations |
| Wiki/Backlinks | ✅ | ✅ | [[Page]] linking with backlink tracking |
| Templates | ✅ | ✅ | Page and block templates |
| AI Features | ✅ | ✅ | Uses firm's own API keys |
| Legal-specific blocks | ❌ | ✅ | Citations, court filings, deadlines, etc. |
| Case integration | ❌ | ✅ | Linked to case data, tasks, documents |

---

## 2. Architecture

### Data Model

```
Case
 └── CaseNotionPage (infinite nesting)
      ├── CaseNotionBlock[] (nested tree structure)
      ├── CaseNotionDatabaseView[] (multiple views per page)
      └── Child pages...

Firm
 └── SyncedBlock[] (reusable across all cases)
```

### Sidebar Integration

CaseNotion appears as its own section in the case sidebar:

```
📁 Case: Smith v. Jones
├── 📋 Overview
├── 📝 Tasks
├── 📅 Calendar
├── 📄 Documents
├── 💰 Billing
└── 📚 CaseNotion  ← NEW
    ├── 📄 Case Brief
    ├── 📄 Research Notes
    │   ├── 📄 Precedents
    │   └── 📄 Statutes
    ├── 📄 Meeting Notes
    └── + New Page
```

---

## 3. API Endpoints

Base URL: `/api/case-notion`

### Page Endpoints

#### Get Case Page Tree (for sidebar)

```http
GET /api/case-notion/cases/:caseId/pages
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "_id": "page1",
        "title": "Case Brief",
        "icon": { "type": "emoji", "value": "📄" },
        "parentId": null,
        "order": 1,
        "children": [
          {
            "_id": "page2",
            "title": "Research Notes",
            "icon": { "type": "emoji", "value": "🔍" },
            "parentId": "page1",
            "children": []
          }
        ]
      }
    ],
    "rootCount": 3,
    "totalCount": 12
  }
}
```

#### Create Page

```http
POST /api/case-notion/pages
Content-Type: application/json
Authorization: Bearer <token>

{
  "caseId": "case123",
  "title": "Deposition Notes",
  "parentId": "page1",
  "icon": { "type": "emoji", "value": "📝" },
  "cover": { "type": "gradient", "value": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }
}
```

#### Get Page with Blocks

```http
GET /api/case-notion/pages/:pageId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "page": {
      "_id": "page1",
      "title": "Case Brief",
      "icon": { "type": "emoji", "value": "📄" },
      "cover": { "type": "image", "value": "https://...", "position": 50 },
      "path": "/case-brief",
      "breadcrumb": [
        { "id": "page1", "title": "Case Brief" }
      ],
      "properties": {
        "fullWidth": false,
        "smallText": false,
        "locked": false
      }
    },
    "blocks": [
      {
        "_id": "block1",
        "type": "heading_1",
        "content": {
          "text": "Case Overview",
          "richText": [{ "text": "Case Overview", "annotations": {} }]
        },
        "children": [],
        "order": 1
      },
      {
        "_id": "block2",
        "type": "paragraph",
        "content": {
          "text": "This case involves...",
          "richText": [{ "text": "This case involves...", "annotations": {} }]
        },
        "children": [],
        "order": 2
      }
    ]
  }
}
```

#### Update Page

```http
PATCH /api/case-notion/pages/:pageId
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Updated Title",
  "icon": { "type": "emoji", "value": "⚖️" }
}
```

#### Delete Page (Archive)

```http
DELETE /api/case-notion/pages/:pageId
Authorization: Bearer <token>
```

#### Move Page

```http
POST /api/case-notion/pages/:pageId/move
Content-Type: application/json
Authorization: Bearer <token>

{
  "newParentId": "page3",
  "newOrder": 2.5
}
```

#### Duplicate Page

```http
POST /api/case-notion/pages/:pageId/duplicate
Authorization: Bearer <token>
```

#### Toggle Favorite

```http
POST /api/case-notion/pages/:pageId/favorite
Authorization: Bearer <token>
```

#### Search Pages

```http
GET /api/case-notion/cases/:caseId/search?q=deposition
Authorization: Bearer <token>
```

#### Get Recent Pages

```http
GET /api/case-notion/pages/recent?limit=10
Authorization: Bearer <token>
```

#### Get Backlinks

```http
GET /api/case-notion/pages/:pageId/backlinks
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "backlinks": [
      {
        "pageId": "page5",
        "pageTitle": "Meeting Notes",
        "blockId": "block123",
        "context": "...discussed in the [[Case Brief]]..."
      }
    ]
  }
}
```

---

### Block Endpoints

#### Create Block

```http
POST /api/case-notion/pages/:pageId/blocks
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "paragraph",
  "content": {
    "text": "Hello world",
    "richText": [
      { "text": "Hello ", "annotations": {} },
      { "text": "world", "annotations": { "bold": true } }
    ]
  },
  "parentId": null,
  "order": 1.5
}
```

#### Update Block

```http
PATCH /api/case-notion/blocks/:blockId
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": {
    "text": "Updated text",
    "richText": [{ "text": "Updated text", "annotations": {} }]
  }
}
```

#### Delete Block

```http
DELETE /api/case-notion/blocks/:blockId
Authorization: Bearer <token>
```

#### Move Block

```http
POST /api/case-notion/blocks/:blockId/move
Content-Type: application/json
Authorization: Bearer <token>

{
  "targetPageId": "page2",
  "targetParentId": "block5",
  "newOrder": 3.5
}
```

#### Nest Block (Make Child)

```http
POST /api/case-notion/blocks/:blockId/nest
Content-Type: application/json
Authorization: Bearer <token>

{
  "parentBlockId": "block10"
}
```

#### Unnest Block (Move Up Level)

```http
POST /api/case-notion/blocks/:blockId/unnest
Authorization: Bearer <token>
```

#### Convert Block Type

```http
POST /api/case-notion/blocks/:blockId/convert
Content-Type: application/json
Authorization: Bearer <token>

{
  "newType": "heading_2"
}
```

#### Duplicate Block

```http
POST /api/case-notion/blocks/:blockId/duplicate
Authorization: Bearer <token>
```

#### Search Blocks

```http
GET /api/case-notion/cases/:caseId/blocks/search?q=deadline
Authorization: Bearer <token>
```

---

### Synced Block Endpoints

#### Create Synced Block

```http
POST /api/case-notion/synced-blocks
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Standard Disclaimer",
  "description": "Legal disclaimer for all documents",
  "category": "legal-boilerplate",
  "content": [
    {
      "type": "callout",
      "content": {
        "text": "This document is for informational purposes only...",
        "icon": "⚠️",
        "color": "yellow"
      }
    }
  ]
}
```

#### Get Synced Blocks

```http
GET /api/case-notion/synced-blocks?category=legal-boilerplate
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncedBlocks": [
      {
        "_id": "sync1",
        "name": "Standard Disclaimer",
        "description": "Legal disclaimer for all documents",
        "category": "legal-boilerplate",
        "usageCount": 15,
        "content": [...]
      }
    ]
  }
}
```

#### Insert Synced Block

```http
POST /api/case-notion/synced-blocks/:syncedBlockId/insert
Content-Type: application/json
Authorization: Bearer <token>

{
  "pageId": "page1",
  "order": 5.5
}
```

#### Update Synced Block (Updates All Instances)

```http
PATCH /api/case-notion/synced-blocks/:syncedBlockId
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": [
    {
      "type": "callout",
      "content": {
        "text": "Updated disclaimer text...",
        "icon": "⚠️",
        "color": "yellow"
      }
    }
  ]
}
```

#### Get Synced Block Instances

```http
GET /api/case-notion/synced-blocks/:syncedBlockId/instances
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "instances": [
      {
        "pageId": "page1",
        "pageTitle": "Case Brief",
        "caseId": "case123",
        "caseName": "Smith v. Jones",
        "blockId": "block45"
      }
    ],
    "count": 15
  }
}
```

---

### Database View Endpoints

#### Create View

```http
POST /api/case-notion/pages/:pageId/views
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Tasks by Status",
  "type": "board",
  "dataSource": {
    "type": "tasks",
    "caseId": "case123"
  },
  "groupBy": {
    "field": "status",
    "hideEmpty": false
  },
  "properties": [
    { "field": "title", "visible": true, "width": 200 },
    { "field": "assignee", "visible": true, "width": 100 },
    { "field": "dueDate", "visible": true, "width": 100 }
  ],
  "filters": [
    { "field": "status", "operator": "is_not_empty" }
  ],
  "sorts": [
    { "field": "dueDate", "direction": "asc" }
  ]
}
```

#### Get Views

```http
GET /api/case-notion/pages/:pageId/views
Authorization: Bearer <token>
```

#### Execute View (Get Data)

```http
GET /api/case-notion/views/:viewId/data
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "view": {
      "_id": "view1",
      "name": "Tasks by Status",
      "type": "board"
    },
    "data": {
      "groups": [
        {
          "key": "pending",
          "label": "Pending",
          "items": [
            { "_id": "task1", "title": "Review contract", "assignee": {...}, "dueDate": "2025-12-15" }
          ],
          "count": 5
        },
        {
          "key": "in_progress",
          "label": "In Progress",
          "items": [...],
          "count": 3
        }
      ],
      "rollups": {
        "totalCount": 12,
        "completedPercent": 33
      }
    }
  }
}
```

#### Update View

```http
PATCH /api/case-notion/views/:viewId
Content-Type: application/json
Authorization: Bearer <token>

{
  "filters": [
    { "field": "assignee", "operator": "equals", "value": "user123" }
  ]
}
```

#### Set Default View

```http
POST /api/case-notion/views/:viewId/set-default
Authorization: Bearer <token>
```

---

### Template Endpoints

#### Save Page as Template

```http
POST /api/case-notion/pages/:pageId/save-as-template
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Case Brief Template",
  "category": "case-brief",
  "description": "Standard template for case briefs"
}
```

#### Get Templates

```http
GET /api/case-notion/templates?category=case-brief
Authorization: Bearer <token>
```

#### Create Page from Template

```http
POST /api/case-notion/templates/:templateId/use
Content-Type: application/json
Authorization: Bearer <token>

{
  "caseId": "case123",
  "title": "Smith Case Brief"
}
```

---

### AI Endpoints

#### AI Auto-fill Block

```http
POST /api/case-notion/blocks/:blockId/ai-autofill
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestion": "Based on the context, the next steps should include...",
    "confidence": 0.85
  }
}
```

#### AI Summarize Page

```http
POST /api/case-notion/pages/:pageId/ai-summarize
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "This page contains information about the Smith v. Jones case, including key dates, parties involved, and legal arguments...",
    "keyPoints": [
      "Contract dispute filed on January 15, 2025",
      "Defendant claims breach of warranty",
      "Key deadline: March 1, 2025"
    ]
  }
}
```

#### AI Q&A About Case

```http
POST /api/case-notion/cases/:caseId/ai-answer
Content-Type: application/json
Authorization: Bearer <token>

{
  "question": "What are the upcoming deadlines for this case?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Based on the case documents, there are 3 upcoming deadlines:\n1. Discovery deadline: January 30, 2025\n2. Motion filing: February 15, 2025\n3. Pre-trial conference: March 1, 2025",
    "sources": [
      { "pageId": "page1", "pageTitle": "Case Timeline", "blockId": "block45" }
    ]
  }
}
```

#### AI Suggest Content

```http
POST /api/case-notion/pages/:pageId/ai-suggest
Content-Type: application/json
Authorization: Bearer <token>

{
  "prompt": "Write a summary of the defendant's main arguments"
}
```

---

### Collaboration Endpoints

#### Lock Block

```http
POST /api/case-notion/blocks/:blockId/lock
Authorization: Bearer <token>
```

#### Unlock Block

```http
POST /api/case-notion/blocks/:blockId/unlock
Authorization: Bearer <token>
```

#### Get Active Locks

```http
GET /api/case-notion/pages/:pageId/locks
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "locks": [
      {
        "blockId": "block1",
        "userId": "user123",
        "userName": "John Doe",
        "lockedAt": "2025-12-10T10:30:00Z",
        "expiresAt": "2025-12-10T10:35:00Z"
      }
    ]
  }
}
```

---

### Export/Import Endpoints

#### Export Page

```http
GET /api/case-notion/pages/:pageId/export?format=markdown
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": "# Case Brief\n\n## Overview\n\nThis case involves...",
    "format": "markdown",
    "filename": "case-brief.md"
  }
}
```

#### Import Markdown

```http
POST /api/case-notion/cases/:caseId/import
Content-Type: application/json
Authorization: Bearer <token>

{
  "markdown": "# Meeting Notes\n\n## Attendees\n\n- John Doe\n- Jane Smith",
  "title": "Meeting Notes - Jan 10"
}
```

---

## 4. Block Types Reference

### Text Blocks

| Type | Description | Content Structure |
|------|-------------|-------------------|
| `paragraph` | Standard text | `{ text, richText[] }` |
| `heading_1` | Large heading | `{ text, richText[] }` |
| `heading_2` | Medium heading | `{ text, richText[] }` |
| `heading_3` | Small heading | `{ text, richText[] }` |
| `quote` | Block quote | `{ text, richText[] }` |
| `callout` | Highlighted box | `{ text, icon, color }` |

### List Blocks

| Type | Description | Content Structure |
|------|-------------|-------------------|
| `bulleted_list` | Bullet point | `{ text, richText[] }` |
| `numbered_list` | Numbered item | `{ text, richText[] }` |
| `to_do` | Checkbox item | `{ text, checked }` |
| `toggle` | Collapsible | `{ text, isOpen }` |

### Media Blocks

| Type | Description | Content Structure |
|------|-------------|-------------------|
| `image` | Image | `{ url, caption, width }` |
| `video` | Video embed | `{ url, caption }` |
| `file` | File attachment | `{ url, name, size, type }` |
| `embed` | External embed | `{ url, caption }` |
| `bookmark` | Link preview | `{ url, title, description, image }` |

### Advanced Blocks

| Type | Description | Content Structure |
|------|-------------|-------------------|
| `code` | Code block | `{ code, language }` |
| `equation` | Math equation | `{ expression }` |
| `table` | Table | `{ rows: [{ cells: [] }] }` |
| `divider` | Horizontal line | `{}` |
| `table_of_contents` | Auto TOC | `{ maxLevel }` |

### Database Blocks

| Type | Description | Content Structure |
|------|-------------|-------------------|
| `database_inline` | Embedded database | `{ viewId, dataSource }` |
| `database_linked` | Linked database | `{ databaseId, viewType }` |

### Legal-Specific Blocks

| Type | Description | Content Structure |
|------|-------------|-------------------|
| `legal_citation` | Case citation | `{ citation, court, year, pinCite }` |
| `case_reference` | Link to case | `{ caseId, caseName }` |
| `statute_reference` | Statute link | `{ code, section, title }` |
| `deadline_block` | Deadline tracker | `{ title, date, assignees[], reminderDays }` |
| `court_filing` | Filing record | `{ type, date, status, documentId }` |
| `hearing_notes` | Hearing summary | `{ date, judge, summary, rulings[] }` |
| `deposition_summary` | Deposition | `{ deponent, date, keyPoints[], exhibits[] }` |
| `exhibit_reference` | Exhibit link | `{ exhibitId, number, description }` |
| `witness_statement` | Witness info | `{ name, role, summary, credibility }` |
| `contract_clause` | Contract section | `{ clauseNumber, title, text, analysis }` |
| `task_embed` | Embedded task | `{ taskId }` |
| `document_embed` | Embedded doc | `{ documentId }` |
| `billing_entry` | Time entry | `{ description, hours, rate, total }` |
| `conflict_check` | Conflict result | `{ parties[], result, notes }` |

### Layout Blocks

| Type | Description | Content Structure |
|------|-------------|-------------------|
| `column_list` | Multi-column | `{ columns: 2 }` |
| `column` | Single column | `{}` |
| `synced_block` | Synced content | `{ syncedBlockId }` |

### Rich Text Annotations

```typescript
interface RichText {
  text: string;
  annotations: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    color?: string; // 'red', 'blue', 'green', etc.
    backgroundColor?: string;
  };
  href?: string; // For links
  mention?: {
    type: 'user' | 'page' | 'date' | 'case';
    id: string;
  };
}
```

---

## 5. React Components

### Page Sidebar Component

```tsx
import React, { useState, useEffect } from 'react';

interface PageNode {
  _id: string;
  title: string;
  icon?: { type: string; value: string };
  children: PageNode[];
  parentId: string | null;
}

interface CaseNotionSidebarProps {
  caseId: string;
  activePage?: string;
  onPageSelect: (pageId: string) => void;
}

export const CaseNotionSidebar: React.FC<CaseNotionSidebarProps> = ({
  caseId,
  activePage,
  onPageSelect
}) => {
  const [pages, setPages] = useState<PageNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPages();
  }, [caseId]);

  const fetchPages = async () => {
    try {
      const response = await fetch(`/api/case-notion/cases/${caseId}/pages`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await response.json();
      if (data.success) {
        setPages(data.data.pages);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (pageId: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId);
    } else {
      newExpanded.add(pageId);
    }
    setExpandedPages(newExpanded);
  };

  const createPage = async (parentId?: string) => {
    const title = prompt('Page title:');
    if (!title) return;

    try {
      const response = await fetch('/api/case-notion/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ caseId, title, parentId })
      });
      const data = await response.json();
      if (data.success) {
        fetchPages(); // Refresh
        onPageSelect(data.data.page._id);
      }
    } catch (error) {
      console.error('Error creating page:', error);
    }
  };

  const renderPageNode = (page: PageNode, depth: number = 0) => {
    const isActive = page._id === activePage;
    const isExpanded = expandedPages.has(page._id);
    const hasChildren = page.children && page.children.length > 0;

    return (
      <div key={page._id}>
        <div
          className={`page-item ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren && (
            <button
              className="expand-btn"
              onClick={() => toggleExpand(page._id)}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="expand-placeholder" />}

          <span className="page-icon">
            {page.icon?.value || '📄'}
          </span>

          <span
            className="page-title"
            onClick={() => onPageSelect(page._id)}
          >
            {page.title}
          </span>

          <button
            className="add-child-btn"
            onClick={() => createPage(page._id)}
            title="Add subpage"
          >
            +
          </button>
        </div>

        {isExpanded && hasChildren && (
          <div className="children">
            {page.children.map(child => renderPageNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="sidebar-loading">Loading...</div>;

  return (
    <div className="casenotion-sidebar">
      <div className="sidebar-header">
        <span>📚 CaseNotion</span>
        <button onClick={() => createPage()} title="New page">+</button>
      </div>
      <div className="page-tree">
        {pages.map(page => renderPageNode(page))}
      </div>
    </div>
  );
};
```

### Block Editor Component

```tsx
import React, { useState, useCallback } from 'react';

interface Block {
  _id: string;
  type: string;
  content: any;
  children: Block[];
  order: number;
}

interface BlockEditorProps {
  pageId: string;
  initialBlocks: Block[];
  onUpdate: () => void;
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  pageId,
  initialBlocks,
  onUpdate
}) => {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [focusedBlock, setFocusedBlock] = useState<string | null>(null);

  const updateBlock = async (blockId: string, content: any) => {
    try {
      await fetch(`/api/case-notion/blocks/${blockId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({ content })
      });
      onUpdate();
    } catch (error) {
      console.error('Error updating block:', error);
    }
  };

  const createBlock = async (type: string, afterBlockId?: string) => {
    // Calculate order
    let order = 1;
    if (afterBlockId) {
      const afterBlock = blocks.find(b => b._id === afterBlockId);
      const nextBlock = blocks.find(b => b.order > (afterBlock?.order || 0));
      order = afterBlock ? (afterBlock.order + (nextBlock?.order || afterBlock.order + 1)) / 2 : 1;
    }

    try {
      const response = await fetch(`/api/case-notion/pages/${pageId}/blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          type,
          content: { text: '', richText: [] },
          order
        })
      });
      const data = await response.json();
      if (data.success) {
        setBlocks([...blocks, data.data.block].sort((a, b) => a.order - b.order));
        setFocusedBlock(data.data.block._id);
      }
    } catch (error) {
      console.error('Error creating block:', error);
    }
  };

  const deleteBlock = async (blockId: string) => {
    try {
      await fetch(`/api/case-notion/blocks/${blockId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setBlocks(blocks.filter(b => b._id !== blockId));
    } catch (error) {
      console.error('Error deleting block:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, block: Block) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      createBlock('paragraph', block._id);
    }
    if (e.key === 'Backspace' && !block.content.text) {
      e.preventDefault();
      deleteBlock(block._id);
    }
  };

  const renderBlock = (block: Block) => {
    switch (block.type) {
      case 'heading_1':
        return (
          <h1
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block._id, {
              text: e.target.innerText,
              richText: [{ text: e.target.innerText, annotations: {} }]
            })}
            onKeyDown={(e) => handleKeyDown(e, block)}
          >
            {block.content.text}
          </h1>
        );

      case 'heading_2':
        return (
          <h2
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block._id, {
              text: e.target.innerText,
              richText: [{ text: e.target.innerText, annotations: {} }]
            })}
          >
            {block.content.text}
          </h2>
        );

      case 'paragraph':
        return (
          <p
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => updateBlock(block._id, {
              text: e.target.innerText,
              richText: [{ text: e.target.innerText, annotations: {} }]
            })}
            onKeyDown={(e) => handleKeyDown(e, block)}
          >
            {block.content.text || <span className="placeholder">Type something...</span>}
          </p>
        );

      case 'to_do':
        return (
          <div className="todo-block">
            <input
              type="checkbox"
              checked={block.content.checked}
              onChange={(e) => updateBlock(block._id, {
                ...block.content,
                checked: e.target.checked
              })}
            />
            <span
              contentEditable
              suppressContentEditableWarning
              className={block.content.checked ? 'completed' : ''}
              onBlur={(e) => updateBlock(block._id, {
                ...block.content,
                text: e.target.innerText
              })}
            >
              {block.content.text}
            </span>
          </div>
        );

      case 'toggle':
        return (
          <div className="toggle-block">
            <button
              onClick={() => updateBlock(block._id, {
                ...block.content,
                isOpen: !block.content.isOpen
              })}
            >
              {block.content.isOpen ? '▼' : '▶'}
            </button>
            <span contentEditable suppressContentEditableWarning>
              {block.content.text}
            </span>
            {block.content.isOpen && (
              <div className="toggle-content">
                {block.children?.map(child => renderBlock(child))}
              </div>
            )}
          </div>
        );

      case 'callout':
        return (
          <div
            className="callout-block"
            style={{ backgroundColor: block.content.color || '#f0f0f0' }}
          >
            <span className="callout-icon">{block.content.icon || '💡'}</span>
            <span
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateBlock(block._id, {
                ...block.content,
                text: e.target.innerText
              })}
            >
              {block.content.text}
            </span>
          </div>
        );

      case 'code':
        return (
          <pre className="code-block">
            <div className="code-language">{block.content.language || 'plain'}</div>
            <code
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => updateBlock(block._id, {
                ...block.content,
                code: e.target.innerText
              })}
            >
              {block.content.code}
            </code>
          </pre>
        );

      case 'divider':
        return <hr className="divider-block" />;

      case 'legal_citation':
        return (
          <div className="legal-citation-block">
            <span className="citation-icon">⚖️</span>
            <cite>{block.content.citation}</cite>
            {block.content.court && (
              <span className="court">({block.content.court}, {block.content.year})</span>
            )}
          </div>
        );

      case 'deadline_block':
        return (
          <div className="deadline-block">
            <span className="deadline-icon">⏰</span>
            <strong>{block.content.title}</strong>
            <span className="deadline-date">
              {new Date(block.content.date).toLocaleDateString()}
            </span>
          </div>
        );

      default:
        return (
          <div className="unknown-block">
            Unknown block type: {block.type}
          </div>
        );
    }
  };

  return (
    <div className="block-editor">
      {blocks.map(block => (
        <div
          key={block._id}
          className={`block-wrapper ${focusedBlock === block._id ? 'focused' : ''}`}
          onClick={() => setFocusedBlock(block._id)}
        >
          <div className="block-handle" draggable>⋮⋮</div>
          <div className="block-content">
            {renderBlock(block)}
          </div>
          <div className="block-actions">
            <button onClick={() => createBlock('paragraph', block._id)}>+</button>
          </div>
        </div>
      ))}

      {blocks.length === 0 && (
        <div
          className="empty-page"
          onClick={() => createBlock('paragraph')}
        >
          Click to start writing...
        </div>
      )}
    </div>
  );
};
```

### Block Type Selector

```tsx
import React from 'react';

interface BlockTypeSelectorProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

const BLOCK_TYPES = [
  { type: 'paragraph', label: 'Text', icon: '📝', shortcut: '/text' },
  { type: 'heading_1', label: 'Heading 1', icon: 'H1', shortcut: '/h1' },
  { type: 'heading_2', label: 'Heading 2', icon: 'H2', shortcut: '/h2' },
  { type: 'heading_3', label: 'Heading 3', icon: 'H3', shortcut: '/h3' },
  { type: 'to_do', label: 'To-do', icon: '☑️', shortcut: '/todo' },
  { type: 'bulleted_list', label: 'Bullet list', icon: '•', shortcut: '/bullet' },
  { type: 'numbered_list', label: 'Numbered list', icon: '1.', shortcut: '/number' },
  { type: 'toggle', label: 'Toggle', icon: '▶', shortcut: '/toggle' },
  { type: 'quote', label: 'Quote', icon: '"', shortcut: '/quote' },
  { type: 'callout', label: 'Callout', icon: '💡', shortcut: '/callout' },
  { type: 'divider', label: 'Divider', icon: '—', shortcut: '/divider' },
  { type: 'code', label: 'Code', icon: '</>', shortcut: '/code' },
  { type: 'table', label: 'Table', icon: '▦', shortcut: '/table' },
  // Legal blocks
  { type: 'legal_citation', label: 'Legal Citation', icon: '⚖️', shortcut: '/cite' },
  { type: 'deadline_block', label: 'Deadline', icon: '⏰', shortcut: '/deadline' },
  { type: 'court_filing', label: 'Court Filing', icon: '📋', shortcut: '/filing' },
  { type: 'task_embed', label: 'Embed Task', icon: '✅', shortcut: '/task' },
  { type: 'document_embed', label: 'Embed Document', icon: '📄', shortcut: '/doc' },
];

export const BlockTypeSelector: React.FC<BlockTypeSelectorProps> = ({
  onSelect,
  onClose
}) => {
  return (
    <div className="block-type-selector">
      <div className="selector-header">
        <span>Add a block</span>
        <button onClick={onClose}>×</button>
      </div>
      <div className="block-types">
        {BLOCK_TYPES.map(({ type, label, icon, shortcut }) => (
          <button
            key={type}
            className="block-type-option"
            onClick={() => onSelect(type)}
          >
            <span className="block-icon">{icon}</span>
            <span className="block-label">{label}</span>
            <span className="block-shortcut">{shortcut}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

## 6. Database Views

### View Types

#### Table View
Spreadsheet-like view with sortable columns.

```tsx
const TableView: React.FC<{ data: any[]; columns: Column[] }> = ({ data, columns }) => (
  <table className="notion-table">
    <thead>
      <tr>
        {columns.filter(c => c.visible).map(col => (
          <th key={col.field} style={{ width: col.width }}>
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.map(row => (
        <tr key={row._id}>
          {columns.filter(c => c.visible).map(col => (
            <td key={col.field}>{row[col.field]}</td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);
```

#### Board View (Kanban)
Drag-and-drop columns grouped by a field.

```tsx
const BoardView: React.FC<{ groups: Group[] }> = ({ groups }) => (
  <div className="notion-board">
    {groups.map(group => (
      <div key={group.key} className="board-column">
        <div className="column-header">
          <span>{group.label}</span>
          <span className="count">{group.count}</span>
        </div>
        <div className="column-items">
          {group.items.map(item => (
            <div key={item._id} className="board-card">
              <h4>{item.title}</h4>
              {/* Card properties */}
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);
```

#### Timeline View
Gantt-like visualization with start/end dates.

#### Calendar View
Month view with items on their dates.

#### Gallery View
Card grid with cover images.

#### List View
Compact list with expandable items.

#### Chart View
Data visualizations (bar, line, pie, donut).

---

## 7. Synced Blocks

### How Synced Blocks Work

1. **Create Master**: Create a synced block with content
2. **Insert Instances**: Insert references to the master in any page
3. **Edit Once**: Update the master, all instances update automatically

### Synced Block Component

```tsx
const SyncedBlockComponent: React.FC<{ syncedBlockId: string }> = ({ syncedBlockId }) => {
  const [content, setContent] = useState<Block[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchSyncedBlock();
  }, [syncedBlockId]);

  const fetchSyncedBlock = async () => {
    const response = await fetch(`/api/case-notion/synced-blocks/${syncedBlockId}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await response.json();
    if (data.success) {
      setContent(data.data.syncedBlock.content);
    }
  };

  return (
    <div className="synced-block">
      <div className="synced-indicator">
        <span>🔗 Synced block</span>
        {isEditing && <span className="editing-warning">Editing will update all instances</span>}
      </div>
      <div className="synced-content">
        {content.map(block => renderBlock(block))}
      </div>
    </div>
  );
};
```

---

## 8. AI Features

### AI Autofill

Automatically suggests content based on context.

```tsx
const handleAIAutofill = async (blockId: string) => {
  setLoading(true);
  try {
    const response = await fetch(`/api/case-notion/blocks/${blockId}/ai-autofill`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    const data = await response.json();
    if (data.success) {
      // Show suggestion to user
      setSuggestion(data.data.suggestion);
    }
  } finally {
    setLoading(false);
  }
};
```

### AI Page Summary

Generate a summary of page content.

### AI Q&A

Ask questions about case content and get answers with source references.

---

## 9. Real-time Collaboration

### Block Locking

Prevent conflicts when multiple users edit.

```tsx
const useLocking = (pageId: string) => {
  const [locks, setLocks] = useState<Lock[]>([]);

  useEffect(() => {
    const interval = setInterval(fetchLocks, 5000);
    return () => clearInterval(interval);
  }, [pageId]);

  const lockBlock = async (blockId: string) => {
    await fetch(`/api/case-notion/blocks/${blockId}/lock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
  };

  const unlockBlock = async (blockId: string) => {
    await fetch(`/api/case-notion/blocks/${blockId}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
  };

  return { locks, lockBlock, unlockBlock };
};
```

---

## 10. Templates

### Template Categories

- `case-brief` - Case summary templates
- `research-notes` - Legal research templates
- `meeting-notes` - Meeting documentation
- `deposition-summary` - Deposition templates
- `motion` - Motion templates
- `discovery` - Discovery request templates
- `custom` - User-created templates

### Using Templates

```tsx
const TemplateGallery: React.FC<{ caseId: string; onSelect: (pageId: string) => void }> = ({
  caseId,
  onSelect
}) => {
  const [templates, setTemplates] = useState([]);

  const createFromTemplate = async (templateId: string) => {
    const response = await fetch(`/api/case-notion/templates/${templateId}/use`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ caseId })
    });
    const data = await response.json();
    if (data.success) {
      onSelect(data.data.page._id);
    }
  };

  return (
    <div className="template-gallery">
      {templates.map(template => (
        <div
          key={template._id}
          className="template-card"
          onClick={() => createFromTemplate(template._id)}
        >
          <h4>{template.name}</h4>
          <p>{template.description}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## 11. Best Practices

### Performance

1. **Lazy load blocks**: Only load visible blocks for long pages
2. **Debounce updates**: Don't send every keystroke to the server
3. **Optimistic updates**: Update UI immediately, sync in background
4. **Cache page trees**: Don't refetch sidebar on every page change

### UX Guidelines

1. **Keyboard shortcuts**: Support `/` commands for block creation
2. **Drag and drop**: Use a library like `react-dnd` or `dnd-kit`
3. **Undo/Redo**: Implement local history stack
4. **Autosave indicator**: Show save status to users

### Security

1. **Permission checks**: Always verify user has access
2. **Sanitize content**: Prevent XSS in user-generated content
3. **Rate limiting**: Prevent API abuse

### Integration with Cases

1. **Link blocks to case data**: Use task_embed, document_embed blocks
2. **Case context in AI**: AI features automatically have case context
3. **Sidebar placement**: CaseNotion appears in case sidebar for easy access

---

## Quick Reference

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Open block type menu |
| `Enter` | Create new block |
| `Backspace` (empty) | Delete block |
| `Tab` | Indent/nest block |
| `Shift+Tab` | Unindent block |
| `Cmd/Ctrl+B` | Bold text |
| `Cmd/Ctrl+I` | Italic text |
| `Cmd/Ctrl+U` | Underline text |
| `[[` | Create page link |
| `@` | Mention user |

### API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not found |
| 409 | Conflict (locked block) |
| 500 | Server error |
