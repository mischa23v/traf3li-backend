# Wiki Frontend Troubleshooting Guide

This guide helps frontend developers troubleshoot common issues when integrating with the Wiki API.

## Table of Contents
1. [Quick Reference - API Endpoints](#quick-reference---api-endpoints)
2. [Common Issues & Solutions](#common-issues--solutions)
3. [Request/Response Formats](#requestresponse-formats)
4. [File Upload Flow](#file-upload-flow)
5. [Error Codes Reference](#error-codes-reference)
6. [State Management Tips](#state-management-tips)
7. [Debugging Checklist](#debugging-checklist)

---

## Quick Reference - API Endpoints

### Base URL Structure
```
/api/cases/:caseId/wiki       - Case-scoped operations
/api/wiki/:pageId             - Page-specific operations
/api/wiki/collections/:id     - Collection operations
/api/wiki/comments/:id        - Comment operations
```

### Most Used Endpoints

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List pages | GET | `/cases/:caseId/wiki` |
| Create page | POST | `/cases/:caseId/wiki` |
| Get page | GET | `/wiki/:pageId` |
| Update page | PUT | `/wiki/:pageId` |
| Delete page | DELETE | `/wiki/:pageId` |
| Get page tree | GET | `/cases/:caseId/wiki/tree` |
| Search | GET | `/cases/:caseId/wiki/search?search=query` |

---

## Common Issues & Solutions

### Issue 1: "Case not found" (404)

**Symptoms:**
- API returns 404 when accessing wiki endpoints
- Cannot create or list wiki pages

**Causes:**
- Invalid `caseId` in the URL
- User doesn't have access to the case
- Case was deleted

**Solution:**
```javascript
// Always verify caseId exists before wiki operations
try {
  const response = await api.get(`/cases/${caseId}/wiki`);
} catch (error) {
  if (error.response?.status === 404) {
    // Redirect to cases list or show error
    navigate('/cases');
    toast.error('Case not found or you do not have access');
  }
}
```

---

### Issue 2: "Page not found" (404)

**Symptoms:**
- Cannot access a specific wiki page
- Page was accessible before but now returns 404

**Causes:**
- Page was deleted (soft or permanent)
- Invalid `pageId`
- Page belongs to a different case

**Solution:**
```javascript
// Handle 404 gracefully
const fetchPage = async (pageId) => {
  try {
    const response = await api.get(`/wiki/${pageId}`);
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 404) {
      // Page may have been deleted, refresh the page list
      await refreshPageList();
      toast.error('Page not found. It may have been deleted.');
      return null;
    }
    throw error;
  }
};
```

---

### Issue 3: "Page is sealed" (403)

**Symptoms:**
- Cannot edit, delete, or modify a page
- API returns 403 with "sealed" message

**Causes:**
- Page has been sealed for legal compliance
- Sealed pages are immutable

**Solution:**
```javascript
// Check if page is sealed before showing edit UI
const PageEditor = ({ page }) => {
  if (page.isSealed) {
    return (
      <div className="sealed-notice">
        <LockIcon />
        <p>This page is sealed and cannot be modified.</p>
        <p>Sealed on: {formatDate(page.sealedAt)}</p>
        <p>Reason: {page.sealReason}</p>
      </div>
    );
  }

  return <Editor page={page} />;
};
```

---

### Issue 4: "Only the owner can delete this page" (403)

**Symptoms:**
- Delete button doesn't work
- 403 error on delete attempt

**Causes:**
- Only the page owner (lawyerId) or creator can delete

**Solution:**
```javascript
// Only show delete option to owner
const canDelete = (page, currentUserId) => {
  return page.lawyerId === currentUserId ||
         page.createdBy === currentUserId;
};

// In your component
{canDelete(page, user.id) && !page.isSealed && (
  <DeleteButton onClick={handleDelete} />
)}
```

---

### Issue 5: File Upload Fails

**Symptoms:**
- Upload appears to work but file doesn't save
- "Attachment not found" after upload
- Presigned URL expired

**The Correct Upload Flow:**

```javascript
// Step 1: Get presigned URL from backend
const getUploadUrl = async (pageId, file) => {
  const response = await api.post(`/wiki/${pageId}/attachments/upload`, {
    fileName: file.name,
    fileType: file.type,
    documentCategory: 'evidence', // or other category
    isConfidential: false
  });
  return response.data.data; // { uploadUrl, fileKey, expiresIn }
};

// Step 2: Upload directly to S3 (NOT to backend!)
const uploadToS3 = async (uploadUrl, file) => {
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
};

// Step 3: Confirm upload with backend (CRITICAL!)
const confirmUpload = async (pageId, fileData) => {
  const response = await api.post(`/wiki/${pageId}/attachments/confirm`, {
    fileName: fileData.fileName,
    fileKey: fileData.fileKey,
    fileUrl: fileData.fileUrl, // The S3 URL
    fileType: fileData.fileType,
    fileSize: fileData.fileSize,
    documentCategory: fileData.documentCategory
  });
  return response.data.data;
};

// Complete upload function
const uploadAttachment = async (pageId, file) => {
  try {
    // Step 1
    const { uploadUrl, fileKey } = await getUploadUrl(pageId, file);

    // Step 2
    await uploadToS3(uploadUrl, file);

    // Step 3 - DON'T SKIP THIS!
    const result = await confirmUpload(pageId, {
      fileName: file.name,
      fileKey: fileKey,
      fileUrl: `https://your-bucket.s3.amazonaws.com/${fileKey}`,
      fileType: file.type,
      fileSize: file.size,
      documentCategory: 'evidence'
    });

    return result;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

**Common Upload Mistakes:**
1. Skipping Step 3 (confirm) - File uploads to S3 but isn't saved to DB
2. Uploading to backend instead of S3 URL
3. Not handling expired presigned URLs (valid for 1 hour)

---

### Issue 6: Comments Not Showing

**Symptoms:**
- Comments array is empty
- Inline comments not appearing

**Causes:**
- Not fetching comments separately
- Wrong query parameters

**Solution:**
```javascript
// Fetch regular comments
const getComments = async (pageId) => {
  const response = await api.get(`/wiki/${pageId}/comments`);
  return response.data.data;
};

// Fetch inline comments (for annotations)
const getInlineComments = async (pageId) => {
  const response = await api.get(`/wiki/${pageId}/comments?isInline=true`);
  return response.data.data;
};

// Fetch both
const loadAllComments = async (pageId) => {
  const [regular, inline] = await Promise.all([
    api.get(`/wiki/${pageId}/comments?isInline=false`),
    api.get(`/wiki/${pageId}/comments?isInline=true`)
  ]);

  return {
    regularComments: regular.data.data,
    inlineComments: inline.data.data
  };
};
```

---

### Issue 7: Version Diff Not Working

**Symptoms:**
- 400 error when comparing versions
- Empty diff response

**Causes:**
- Missing v1 or v2 query parameters
- Invalid version numbers

**Solution:**
```javascript
// Both v1 and v2 are REQUIRED
const getDiff = async (pageId, version1, version2) => {
  if (!version1 || !version2) {
    throw new Error('Both versions are required');
  }

  const response = await api.get(
    `/wiki/${pageId}/diff?v1=${version1}&v2=${version2}`
  );
  return response.data.data;
};

// Example usage
const showDiff = async () => {
  const diff = await getDiff(pageId, 1, 3); // Compare v1 with v3
  // diff.before, diff.after, diff.versionDiff
};
```

---

### Issue 8: Collections Not Initializing

**Symptoms:**
- No default collections for new case
- Empty collection list

**Solution:**
```javascript
// Initialize default collections when setting up a case
const initializeWikiForCase = async (caseId) => {
  try {
    const response = await api.post(
      `/cases/${caseId}/wiki/init-collections`
    );
    return response.data.data;
  } catch (error) {
    if (error.response?.status === 400) {
      // Collections already exist
      return await api.get(`/cases/${caseId}/wiki/collections`);
    }
    throw error;
  }
};
```

**Default Collections Created:**
- Pleadings
- Evidence
- Research
- Correspondence
- Notes
- Timeline
- Witnesses
- Court Documents

---

### Issue 9: Link Parsing Not Working

**Symptoms:**
- Wiki links not rendering
- Backlinks not appearing

**Wiki Link Format:**
```
[[pageId|Display Text]]  - Link with custom display text
[[Page Title]]           - Link by title (auto-resolved)
```

**Frontend Link Parser:**
```javascript
const WIKI_LINK_REGEX = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

const parseWikiLinks = (content, pages) => {
  return content.replace(WIKI_LINK_REGEX, (match, target, displayText) => {
    // Find the target page
    const targetPage = pages.find(p =>
      p._id === target ||
      p.pageId === target ||
      p.title === target ||
      p.urlSlug === target
    );

    if (targetPage) {
      const text = displayText || targetPage.title;
      return `<a href="/wiki/${targetPage._id}">${text}</a>`;
    }

    // Broken link
    return `<span class="broken-link">${displayText || target}</span>`;
  });
};
```

---

### Issue 10: Page Tree Not Loading

**Symptoms:**
- Sidebar tree is empty
- Nested pages not showing

**Solution:**
```javascript
// Use the tree endpoint for hierarchical view
const getPageTree = async (caseId) => {
  const response = await api.get(`/cases/${caseId}/wiki/tree`);
  return response.data.data; // { pages: [...], collections: [...] }
};

// Build tree structure
const buildTree = (pages) => {
  const map = new Map();
  const roots = [];

  // First pass: create map
  pages.forEach(page => {
    map.set(page._id, { ...page, children: [] });
  });

  // Second pass: build hierarchy
  pages.forEach(page => {
    const node = map.get(page._id);
    if (page.parentPageId && map.has(page.parentPageId)) {
      map.get(page.parentPageId).children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
};
```

---

## Request/Response Formats

### Standard Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Detailed error info"
}
```

### Create Page Request
```javascript
POST /cases/:caseId/wiki
{
  "title": "Page Title",           // Required
  "titleAr": "Arabic Title",       // Optional
  "content": { ... },              // Editor content (JSON)
  "contentText": "Plain text",     // For search indexing
  "summary": "Brief summary",
  "pageType": "note",              // See page types below
  "collectionId": "...",           // Optional
  "parentPageId": "...",           // For nesting
  "tags": ["tag1", "tag2"],
  "visibility": "case_team",       // private, case_team, firm_wide, client
  "isConfidential": false
}
```

### Page Types
```javascript
const PAGE_TYPES = [
  'note', 'general', 'pleading', 'motion', 'brief', 'petition',
  'timeline', 'evidence_log', 'witness_notes', 'interview_notes',
  'deposition', 'legal_research', 'precedent', 'case_analysis',
  'strategy', 'correspondence', 'client_memo', 'internal_memo',
  'meeting_notes', 'court_documents', 'hearing_notes',
  'judgment_analysis', 'template'
];
```

### Document Categories (for attachments)
```javascript
const DOCUMENT_CATEGORIES = [
  'pleading', 'evidence', 'exhibit', 'contract',
  'correspondence', 'research', 'judgment', 'other'
];
```

---

## File Upload Flow

### Complete Attachment Upload Example

```javascript
import { useState } from 'react';

const useFileUpload = (pageId) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const upload = async (file, options = {}) => {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get presigned URL
      setProgress(10);
      const { data: uploadData } = await api.post(
        `/wiki/${pageId}/attachments/upload`,
        {
          fileName: file.name,
          fileType: file.type,
          documentCategory: options.category || 'other',
          isConfidential: options.isConfidential || false
        }
      );

      const { uploadUrl, fileKey } = uploadData.data;

      // Step 2: Upload to S3
      setProgress(30);
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      // Step 3: Confirm upload
      setProgress(80);
      const { data: confirmData } = await api.post(
        `/wiki/${pageId}/attachments/confirm`,
        {
          fileName: file.name,
          fileKey: fileKey,
          fileUrl: uploadUrl.split('?')[0], // Remove query params
          fileType: file.type,
          fileSize: file.size,
          documentCategory: options.category || 'other'
        }
      );

      setProgress(100);
      return confirmData.data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress, error };
};
```

### Voice Memo Upload

```javascript
const uploadVoiceMemo = async (pageId, audioBlob, duration) => {
  // Allowed formats: mp3, webm, ogg, wav
  const fileName = `memo-${Date.now()}.webm`;

  // Step 1: Get upload URL
  const { data } = await api.post(`/wiki/${pageId}/voice-memos/upload`, {
    fileName,
    fileType: 'audio/webm',
    duration: Math.round(duration) // in seconds
  });

  const { uploadUrl, fileKey } = data.data;

  // Step 2: Upload to S3
  await fetch(uploadUrl, {
    method: 'PUT',
    body: audioBlob,
    headers: { 'Content-Type': 'audio/webm' }
  });

  // Step 3: Confirm
  const result = await api.post(`/wiki/${pageId}/voice-memos/confirm`, {
    title: 'Voice Memo',
    fileKey,
    fileUrl: uploadUrl.split('?')[0],
    fileType: 'audio/webm',
    fileSize: audioBlob.size,
    duration: Math.round(duration)
  });

  return result.data.data;
};
```

---

## Error Codes Reference

### 400 Bad Request

| Message | Cause | Fix |
|---------|-------|-----|
| "fileName and fileType are required" | Missing upload params | Include both in request |
| "Both v1 and v2 query parameters are required" | Missing diff params | Include both versions |
| "Invalid file type. Allowed: mp3, webm, ogg, wav" | Wrong audio format | Convert to supported format |
| "Maximum reply depth (3) reached" | Too deep comment thread | Prevent nested replies past 3 |
| "Comments are disabled for this page" | allowComments = false | Check page settings |

### 403 Forbidden

| Message | Cause | Fix |
|---------|-------|-----|
| "Access denied" | No permission | Check user permissions |
| "Only the owner can delete this page" | Not owner | Only allow owner to delete |
| "Page is sealed and cannot be modified" | Sealed page | Show read-only mode |
| "Cannot add attachments to sealed pages" | Sealed page | Disable upload UI |
| "You can only edit your own comments" | Not comment author | Only show edit for own comments |
| "Cannot lock a sealed page" | Sealed page | Don't attempt locks |

### 404 Not Found

| Message | Cause | Fix |
|---------|-------|-----|
| "Case not found" | Invalid caseId | Verify case exists |
| "Page not found" | Invalid pageId or deleted | Refresh page list |
| "Attachment not found" | Invalid attachmentId | Refresh attachments |
| "Collection not found" | Invalid collectionId | Refresh collections |
| "Revision not found" | Invalid version | Check available versions |

---

## State Management Tips

### Handling Sealed Pages

```javascript
// In your state/store
const pageStore = {
  currentPage: null,

  get isEditable() {
    const page = this.currentPage;
    return page &&
           !page.isSealed &&
           !page.isLocked &&
           page.status !== 'archived';
  },

  get canDelete() {
    const page = this.currentPage;
    return page &&
           !page.isSealed &&
           (page.lawyerId === currentUserId ||
            page.createdBy === currentUserId);
  }
};
```

### Handling Lock Expiry

```javascript
// Lock expires after 30 minutes
const checkLockStatus = (page) => {
  if (page.isLocked && page.lockExpiresAt) {
    const expiresAt = new Date(page.lockExpiresAt);
    if (expiresAt < new Date()) {
      // Lock expired, can edit
      return false;
    }
    return true; // Still locked
  }
  return false;
};
```

### Optimistic Updates

```javascript
// Update UI immediately, revert on error
const updatePage = async (pageId, updates) => {
  const previousPage = { ...currentPage };

  // Optimistic update
  setCurrentPage({ ...currentPage, ...updates });

  try {
    const response = await api.put(`/wiki/${pageId}`, updates);
    setCurrentPage(response.data.data);
  } catch (error) {
    // Revert on failure
    setCurrentPage(previousPage);
    throw error;
  }
};
```

---

## Debugging Checklist

### When API Calls Fail

1. **Check Authentication**
   - Is the JWT token valid and not expired?
   - Is the token included in request headers?

2. **Check URL Parameters**
   - Is `caseId` a valid MongoDB ObjectId?
   - Is `pageId` a valid MongoDB ObjectId?
   - Are all required query params included?

3. **Check Request Body**
   - Is Content-Type set to `application/json`?
   - Are all required fields present?
   - Are field names correct (check for typos)?

4. **Check Response**
   - What's the exact error message?
   - Is `success: false` in the response?
   - What HTTP status code is returned?

### Network Issues

```javascript
// Add request/response interceptors for debugging
api.interceptors.request.use(config => {
  console.log('Request:', config.method, config.url, config.data);
  return config;
});

api.interceptors.response.use(
  response => {
    console.log('Response:', response.status, response.data);
    return response;
  },
  error => {
    console.error('Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);
```

### Common Field Name Mistakes

| Wrong | Correct |
|-------|---------|
| `pageID` | `pageId` |
| `case_id` | `caseId` |
| `collection_id` | `collectionId` |
| `file_name` | `fileName` |
| `content_text` | `contentText` |

---

## Quick Fixes

### Reset to Clean State

```javascript
const refreshWikiState = async (caseId) => {
  // Clear local state
  setPages([]);
  setCollections([]);
  setCurrentPage(null);

  // Fetch fresh data
  const [pagesRes, collectionsRes, treeRes] = await Promise.all([
    api.get(`/cases/${caseId}/wiki`),
    api.get(`/cases/${caseId}/wiki/collections`),
    api.get(`/cases/${caseId}/wiki/tree`)
  ]);

  setPages(pagesRes.data.data);
  setCollections(collectionsRes.data.data);
  setTree(treeRes.data.data);
};
```

### Handle Session Timeout

```javascript
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Session expired, redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

## Need More Help?

1. Check the API logs for detailed error messages
2. Verify your request matches the expected format
3. Test endpoints using Postman or curl first
4. Check if the page/resource is sealed or archived
5. Verify user has correct permissions

For backend issues, contact the backend team with:
- Exact endpoint being called
- Request body/params
- Response received
- User ID and Case ID involved
