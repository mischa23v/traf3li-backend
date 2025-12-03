# Frontend Integration Guide

Complete API documentation for:
- S3 Task Attachments (upload, download, versioning)
- TipTap Rich Text Documents
- Access Logging & Server-Side Encryption

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [S3 Attachments API](#s3-attachments-api)
3. [TipTap Documents API](#tiptap-documents-api)
4. [TypeScript Types](#typescript-types)
5. [API Service Functions](#api-service-functions)
6. [React Components](#react-components)
7. [Security Features](#security-features)
8. [Troubleshooting](#troubleshooting)

---

## Environment Variables

```bash
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=me-south-1

# S3 Buckets
S3_BUCKET_TASKS=your-tasks-bucket
S3_BUCKET_DOCUMENTS=your-documents-bucket
S3_BUCKET_JUDGMENTS=your-judgments-bucket

# Optional: Logging Buckets (for access tracking)
S3_BUCKET_TASKS_LOGS=your-tasks-logs-bucket
S3_BUCKET_DOCUMENTS_LOGS=your-documents-logs-bucket

# Server-Side Encryption (enabled by default)
S3_SSE_ENABLED=true
S3_SSE_ALGORITHM=AES256
# For SSE-KMS with Bucket Key:
# S3_SSE_ALGORITHM=aws:kms
# S3_KMS_KEY_ID=arn:aws:kms:region:account:key/key-id
# S3_BUCKET_KEY_ENABLED=true

# Presigned URL expiry (default: 1 hour)
PRESIGNED_URL_EXPIRY=3600
```

---

## S3 Attachments API

### 1. Get Download URL

**Endpoint:**
```
GET /api/tasks/:taskId/attachments/:attachmentId/download-url
GET /api/tasks/:taskId/attachments/:attachmentId/download-url?versionId=xxx
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "downloadUrl": "https://bucket.s3.region.amazonaws.com/tasks/123/file.pdf?X-Amz-Algorithm=...",
  "versionId": "abc123",
  "attachment": {
    "_id": "attachmentId",
    "fileName": "document.pdf",
    "fileType": "application/pdf",
    "fileSize": 123456
  }
}
```

**Error Responses:**
| Status | Message |
|--------|---------|
| 403 | `"You do not have access to this attachment"` |
| 404 | `"Task not found"` or `"Attachment not found"` |
| 500 | `"Error generating download URL"` |

---

### 2. List Attachment Versions

**Endpoint:**
```
GET /api/tasks/:taskId/attachments/:attachmentId/versions
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "attachment": {
    "_id": "attachmentId",
    "fileName": "document.pdf",
    "fileKey": "tasks/123/1234567890-abc123-document.pdf"
  },
  "versions": [
    {
      "versionId": "abc123xyz",
      "lastModified": "2025-12-03T10:30:00.000Z",
      "size": 123456,
      "isLatest": true,
      "etag": "\"d41d8cd98f00b204e9800998ecf8427e\""
    },
    {
      "versionId": "def456uvw",
      "lastModified": "2025-12-02T15:20:00.000Z",
      "size": 120000,
      "isLatest": false,
      "etag": "\"e99a18c428cb38d5f260853678922e03\""
    }
  ]
}
```

---

### 3. Upload Attachment

**Endpoint:**
```
POST /api/tasks/:taskId/attachments
```

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Body:**
```
file: <binary file data>
```

**Response:**
```json
{
  "success": true,
  "message": "تم رفع المرفق بنجاح",
  "attachment": {
    "_id": "newAttachmentId",
    "fileName": "document.pdf",
    "fileUrl": "https://bucket.s3.region.amazonaws.com/tasks/...",
    "fileKey": "tasks/123/1234567890-abc123-document.pdf",
    "fileType": "application/pdf",
    "fileSize": 123456,
    "storageType": "s3",
    "uploadedBy": "userId",
    "uploadedAt": "2025-12-03T10:30:00.000Z",
    "downloadUrl": "https://bucket.s3.region.amazonaws.com/tasks/...?signed"
  }
}
```

**Allowed File Types:**
- Documents: PDF, Word, Excel, PowerPoint, TXT
- Images: JPEG, PNG, GIF, WebP
- Archives: ZIP, RAR
- Audio: WebM, MP3, WAV, OGG, M4A

**Size Limits:**
- S3: 50MB
- Local storage: 10MB

---

### 4. Delete Attachment

**Endpoint:**
```
DELETE /api/tasks/:taskId/attachments/:attachmentId
```

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "تم حذف المرفق"
}
```

---

## TipTap Documents API

The frontend uses TipTap rich text editor for creating/editing documents attached to tasks. Documents store both HTML content (for rendering) and JSON content (for editing).

### TipTap Editor Features

| Feature | Icon | Shortcut |
|---------|------|----------|
| Bold | **B** | Ctrl+B |
| Italic | *I* | Ctrl+I |
| Underline | U̲ | Ctrl+U |
| Strikethrough | ~~S~~ | |
| Code | `</>` | Inline code |
| Text Color | 🎨 | 8 colors |
| Highlight | 🖍️ | 6 background colors |
| Alignment | ⬅️➡️ | Right, Center, Left, Justify |
| Headings | H1-H3 | |
| Lists | • 1. | Bullet, Numbered |
| Blockquote | ❝ | |
| Horizontal Rule | — | |
| Table | 📊 | Insert, add/delete rows/cols |
| Image | 🖼️ | |
| Link/Unlink | 🔗 | |
| Undo/Redo | ↩️↪️ | |
| Character Count | | Shows chars + words |

---

### 1. Create Document

**Endpoint:**
```
POST /api/tasks/:taskId/documents
```

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "عنوان المستند",
  "content": "<p>HTML content from TipTap</p>",
  "contentJson": { "type": "doc", "content": [...] },
  "contentFormat": "tiptap-json"
}
```

**Response (201):**
```json
{
  "document": {
    "_id": "doc_123",
    "title": "عنوان المستند",
    "fileName": "document.html",
    "content": "<p>HTML content</p>",
    "contentJson": { ... },
    "contentFormat": "tiptap-json",
    "createdAt": "2025-12-03T10:00:00Z",
    "updatedAt": "2025-12-03T10:00:00Z"
  }
}
```

---

### 2. Get Single Document

**Endpoint:**
```
GET /api/tasks/:taskId/documents/:documentId
```

**Response:**
```json
{
  "document": {
    "_id": "doc_123",
    "title": "مستند 1",
    "content": "<p>Full HTML content</p>",
    "contentJson": { "type": "doc", "content": [...] },
    "contentFormat": "tiptap-json",
    "createdAt": "2025-12-03T10:00:00Z",
    "updatedAt": "2025-12-03T10:00:00Z"
  }
}
```

---

### 3. Update Document

**Endpoint:**
```
PATCH /api/tasks/:taskId/documents/:documentId
```

**Request Body:** (all fields optional)
```json
{
  "title": "عنوان محدث",
  "content": "<p>Updated HTML</p>",
  "contentJson": { ... }
}
```

**Response:**
```json
{
  "document": { ... }
}
```

---

### TipTap JSON Structure Examples

**Simple Paragraph:**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "attrs": { "textAlign": "right" },
      "content": [
        { "type": "text", "text": "Hello world" }
      ]
    }
  ]
}
```

**With Text Formatting:**
```json
{
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        { "type": "text", "marks": [{ "type": "bold" }], "text": "Bold text" },
        { "type": "text", "text": " and " },
        { "type": "text", "marks": [{ "type": "italic" }], "text": "italic text" }
      ]
    }
  ]
}
```

**With Colors & Highlights:**
```json
{
  "type": "paragraph",
  "content": [
    {
      "type": "text",
      "marks": [
        { "type": "textStyle", "attrs": { "color": "#ef4444" } }
      ],
      "text": "Red text"
    },
    {
      "type": "text",
      "marks": [
        { "type": "highlight", "attrs": { "color": "#fef08a" } }
      ],
      "text": "Highlighted text"
    }
  ]
}
```

**Table Structure:**
```json
{
  "type": "table",
  "content": [
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableHeader",
          "attrs": { "colspan": 1, "rowspan": 1 },
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Header 1" }] }]
        },
        {
          "type": "tableHeader",
          "attrs": { "colspan": 1, "rowspan": 1 },
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Header 2" }] }]
        }
      ]
    },
    {
      "type": "tableRow",
      "content": [
        {
          "type": "tableCell",
          "attrs": { "colspan": 1, "rowspan": 1 },
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Cell 1" }] }]
        },
        {
          "type": "tableCell",
          "attrs": { "colspan": 1, "rowspan": 1 },
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "Cell 2" }] }]
        }
      ]
    }
  ]
}
```

---

## TypeScript Types

```typescript
// types/attachment.ts

export interface Attachment {
  _id: string;
  fileName: string;
  fileUrl: string;
  fileKey?: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  storageType: 'local' | 's3';
  downloadUrl?: string;
}

export interface AttachmentVersion {
  versionId: string;
  lastModified: string;
  size: number;
  isLatest: boolean;
  etag: string;
}

export interface DownloadUrlResponse {
  success: boolean;
  downloadUrl: string;
  versionId: string | null;
  attachment: {
    _id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  };
}

export interface VersionsResponse {
  success: boolean;
  attachment: {
    _id: string;
    fileName: string;
    fileKey: string;
  };
  versions: AttachmentVersion[];
  message?: string;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  attachment: Attachment;
}

// types/document.ts

export interface TaskDocument {
  _id: string;
  fileName: string;
  title?: string;
  content?: string;                              // HTML content
  contentJson?: TipTapJSON;                      // TipTap JSON structure
  contentFormat?: 'html' | 'tiptap-json' | 'markdown';
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TipTapJSON {
  type: 'doc';
  content: TipTapNode[];
}

export interface TipTapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
}

export interface TipTapMark {
  type: string;
  attrs?: Record<string, any>;
}
```

---

## API Service Functions

```typescript
// api/attachments.ts

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getAccessToken(): string {
  return localStorage.getItem('accessToken') || '';
}

/**
 * Get presigned download URL for an attachment
 */
export async function getAttachmentDownloadUrl(
  taskId: string,
  attachmentId: string,
  versionId?: string
): Promise<DownloadUrlResponse> {
  const url = new URL(
    `${API_BASE}/api/tasks/${taskId}/attachments/${attachmentId}/download-url`
  );

  if (versionId) {
    url.searchParams.set('versionId', versionId);
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Authorization': `Bearer ${getAccessToken()}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get download URL');
  }

  return response.json();
}

/**
 * Get all versions of an attachment
 */
export async function getAttachmentVersions(
  taskId: string,
  attachmentId: string
): Promise<VersionsResponse> {
  const response = await fetch(
    `${API_BASE}/api/tasks/${taskId}/attachments/${attachmentId}/versions`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get versions');
  }

  return response.json();
}

/**
 * Upload a new attachment
 */
export async function uploadAttachment(
  taskId: string,
  file: File
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE}/api/tasks/${taskId}/attachments`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      },
      body: formData
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to upload attachment');
  }

  return response.json();
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(
  taskId: string,
  attachmentId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(
    `${API_BASE}/api/tasks/${taskId}/attachments/${attachmentId}`,
    {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete attachment');
  }

  return response.json();
}

/**
 * Preview attachment in new tab
 */
export async function previewAttachment(
  taskId: string,
  attachmentId: string,
  versionId?: string
): Promise<void> {
  const { downloadUrl } = await getAttachmentDownloadUrl(
    taskId,
    attachmentId,
    versionId
  );
  window.open(downloadUrl, '_blank');
}

/**
 * Download attachment with save dialog
 */
export async function downloadAttachment(
  taskId: string,
  attachmentId: string,
  fileName: string,
  versionId?: string
): Promise<void> {
  const { downloadUrl } = await getAttachmentDownloadUrl(
    taskId,
    attachmentId,
    versionId
  );

  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

```typescript
// api/documents.ts

/**
 * Get a document by ID
 */
export async function getDocument(
  taskId: string,
  documentId: string
): Promise<{ document: TaskDocument }> {
  const response = await fetch(
    `${API_BASE}/api/tasks/${taskId}/documents/${documentId}`,
    {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get document');
  }

  return response.json();
}

/**
 * Create a new document
 */
export async function createDocument(
  taskId: string,
  data: {
    title: string;
    content: string;
    contentJson: TipTapJSON;
    contentFormat?: string;
  }
): Promise<{ document: TaskDocument }> {
  const response = await fetch(
    `${API_BASE}/api/tasks/${taskId}/documents`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data,
        contentFormat: data.contentFormat || 'tiptap-json'
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create document');
  }

  return response.json();
}

/**
 * Update a document
 */
export async function updateDocument(
  taskId: string,
  documentId: string,
  data: {
    title?: string;
    content?: string;
    contentJson?: TipTapJSON;
  }
): Promise<{ document: TaskDocument }> {
  const response = await fetch(
    `${API_BASE}/api/tasks/${taskId}/documents/${documentId}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update document');
  }

  return response.json();
}
```

---

## React Components

### Attachment List Component

```tsx
// components/AttachmentList.tsx
import { useState } from 'react';
import { Attachment } from '@/types/attachment';
import {
  previewAttachment,
  downloadAttachment,
  deleteAttachment
} from '@/api/attachments';
import { AttachmentVersions } from './AttachmentVersions';

interface Props {
  taskId: string;
  attachments: Attachment[];
  onDelete?: (attachmentId: string) => void;
}

export function AttachmentList({ taskId, attachments, onDelete }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState<string | null>(null);

  const handlePreview = async (attachment: Attachment) => {
    try {
      setLoading(attachment._id);
      await previewAttachment(taskId, attachment._id);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('فشل في فتح الملف');
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      setLoading(attachment._id);
      await downloadAttachment(taskId, attachment._id, attachment.fileName);
    } catch (error) {
      console.error('Download failed:', error);
      alert('فشل في تحميل الملف');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`هل أنت متأكد من حذف "${attachment.fileName}"؟`)) {
      return;
    }

    try {
      setLoading(attachment._id);
      await deleteAttachment(taskId, attachment._id);
      onDelete?.(attachment._id);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('فشل في حذف الملف');
    } finally {
      setLoading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('image')) return '🖼️';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('audio')) return '🎵';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📎';
  };

  if (!attachments?.length) {
    return <p className="text-gray-500">لا توجد مرفقات</p>;
  }

  return (
    <div className="space-y-2">
      {attachments.map((attachment) => (
        <div
          key={attachment._id}
          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getFileIcon(attachment.fileType)}</span>
            <div>
              <p className="font-medium">{attachment.fileName}</p>
              <p className="text-sm text-gray-500">
                {formatFileSize(attachment.fileSize)}
                {attachment.storageType === 's3' && (
                  <span className="mr-2 text-blue-500">☁️ S3</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {attachment.storageType === 's3' && (
              <button
                onClick={() => setShowVersions(
                  showVersions === attachment._id ? null : attachment._id
                )}
                className="px-2 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded"
                title="سجل النسخ"
              >
                📚
              </button>
            )}

            <button
              onClick={() => handlePreview(attachment)}
              disabled={loading === attachment._id}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
            >
              {loading === attachment._id ? '...' : 'معاينة'}
            </button>

            <button
              onClick={() => handleDownload(attachment)}
              disabled={loading === attachment._id}
              className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
            >
              {loading === attachment._id ? '...' : 'تحميل'}
            </button>

            <button
              onClick={() => handleDelete(attachment)}
              disabled={loading === attachment._id}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
            >
              حذف
            </button>
          </div>
        </div>
      ))}

      {showVersions && (
        <div className="mt-2 p-4 bg-white border rounded-lg shadow">
          <AttachmentVersions
            taskId={taskId}
            attachment={attachments.find(a => a._id === showVersions)!}
            onClose={() => setShowVersions(null)}
          />
        </div>
      )}
    </div>
  );
}
```

### Attachment Versions Component

```tsx
// components/AttachmentVersions.tsx
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  getAttachmentVersions,
  downloadAttachment
} from '@/api/attachments';
import { Attachment, AttachmentVersion } from '@/types/attachment';

interface Props {
  taskId: string;
  attachment: Attachment;
  onClose: () => void;
}

export function AttachmentVersions({ taskId, attachment, onClose }: Props) {
  const [versions, setVersions] = useState<AttachmentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    loadVersions();
  }, [taskId, attachment._id]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAttachmentVersions(taskId, attachment._id);
      setVersions(data.versions);
    } catch (err) {
      setError('فشل في تحميل سجل النسخ');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadVersion = async (versionId: string) => {
    try {
      setDownloading(versionId);
      await downloadAttachment(
        taskId,
        attachment._id,
        attachment.fileName,
        versionId
      );
    } catch (err) {
      alert('فشل في تحميل النسخة');
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">
          سجل النسخ: {attachment.fileName}
        </h4>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          ✕
        </button>
      </div>

      {loading && (
        <div className="text-center py-4 text-gray-500">جاري التحميل...</div>
      )}

      {error && (
        <div className="text-center py-4 text-red-500">
          {error}
          <button
            onClick={loadVersions}
            className="block mx-auto mt-2 text-blue-500 hover:underline"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {!loading && !error && versions.length === 0 && (
        <div className="text-center py-4 text-gray-500">لا توجد نسخ سابقة</div>
      )}

      {!loading && !error && versions.length > 0 && (
        <div className="space-y-2">
          {versions.map((version, index) => (
            <div
              key={version.versionId}
              className={`flex items-center justify-between p-3 rounded border ${
                version.isLatest
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {version.isLatest ? 'النسخة الحالية' : `نسخة ${versions.length - index}`}
                  </span>
                  {version.isLatest && (
                    <span className="px-2 py-0.5 text-xs bg-green-500 text-white rounded">
                      الأحدث
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  <span>
                    {formatDistanceToNow(new Date(version.lastModified), {
                      addSuffix: true,
                      locale: ar
                    })}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{formatFileSize(version.size)}</span>
                </div>
              </div>

              <button
                onClick={() => handleDownloadVersion(version.versionId)}
                disabled={downloading === version.versionId}
                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
              >
                {downloading === version.versionId ? 'جاري التحميل...' : 'تحميل'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File Upload Component

```tsx
// components/AttachmentUpload.tsx
import { useState, useRef } from 'react';
import { uploadAttachment } from '@/api/attachments';
import { Attachment } from '@/types/attachment';

interface Props {
  taskId: string;
  onUpload: (attachment: Attachment) => void;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/zip',
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav'
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function AttachmentUpload({ taskId, onUpload }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('نوع الملف غير مسموح');
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('حجم الملف يتجاوز الحد المسموح (50MB)');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setProgress(0);

      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await uploadAttachment(taskId, file);

      clearInterval(progressInterval);
      setProgress(100);

      onUpload(result.attachment);

      setTimeout(() => {
        setProgress(0);
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'فشل في رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
        id="attachment-upload"
      />

      <label
        htmlFor="attachment-upload"
        className={`
          flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer
          ${uploading
            ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
            : 'hover:bg-gray-50 border-gray-300 hover:border-blue-400'
          }
        `}
      >
        {uploading ? (
          <div className="w-full">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
              <span>جاري الرفع...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <span className="text-2xl">📎</span>
            <span>اختر ملفًا أو اسحبه هنا</span>
          </>
        )}
      </label>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <p className="text-xs text-gray-500">
        PDF, Word, Excel, صور, ملفات مضغوطة (حتى 50MB)
      </p>
    </div>
  );
}
```

---

## Security Features

### Server-Side Encryption
| Type | Description |
|------|-------------|
| **SSE-S3 (AES256)** | Default, free, automatic encryption |
| **SSE-KMS** | Optional, uses AWS KMS for key management |
| **Bucket Key** | Reduces KMS API costs by ~99% when enabled |

### Access Control
- JWT authentication required for all endpoints
- User must be task creator or assignee to access attachments/documents
- Presigned URLs expire after configured time (default: 1 hour)

### S3 Features Supported
- **Versioning**: Enable on bucket for version history
- **Bucket Key**: Enable for cost-effective KMS encryption
- **Access Logging**: Separate bucket for audit trail

---

## Access Logging

When `S3_BUCKET_TASKS_LOGS` is configured, every download generates a log entry:

**Log Location:** `logs/YYYY-MM-DD/timestamp-userId-action.json`

**Log Entry Format:**
```json
{
  "timestamp": "2025-12-03T10:30:00.000Z",
  "fileKey": "tasks/123/1234567890-abc-document.pdf",
  "sourceBucket": "your-tasks-bucket",
  "userId": "user123",
  "action": "download",
  "taskId": "task456",
  "attachmentId": "att789",
  "fileName": "document.pdf",
  "versionId": "abc123"
}
```

---

## Troubleshooting

### "Access Denied" Error
1. Check IAM permissions for `s3:GetObject`, `s3:PutObject`
2. Verify bucket policy allows access
3. Check if presigned URL has expired

### "S3 is not configured" Error
Verify environment variables are set:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_TASKS` or `AWS_S3_BUCKET`

### Empty Versions Array
1. Versioning must be enabled on the S3 bucket
2. File must be stored in S3 (not local storage)
3. Check bucket permissions for `s3:ListBucketVersions`

### Upload Fails
1. Check file size (max 50MB for S3)
2. Verify file type is allowed
3. Check IAM permissions for `s3:PutObject`

### Document Save Fails
1. Check `contentJson` is valid TipTap JSON structure
2. Verify task exists and user has access
3. Check for maximum content size limits
