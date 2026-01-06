# Frontend API Contract - File Storage & Security

**Version**: 2.0.0
**Last Updated**: 2026-01-06
**Storage Provider**: Cloudflare R2 (S3-compatible)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [File Upload Flow](#file-upload-flow)
4. [API Endpoints](#api-endpoints)
5. [Response Schemas](#response-schemas)
6. [Error Codes](#error-codes)
7. [Enums & Constants](#enums--constants)
8. [Security Features](#security-features)

---

## Overview

All file operations use **presigned URLs** for secure, direct uploads/downloads to Cloudflare R2 storage. Files are **never** sent through the backend server - only metadata is exchanged.

### Key Changes from Previous Version
- Storage migrated from AWS S3 to **Cloudflare R2**
- All uploads now include **malware scanning**
- All file access is **audit logged**
- Presigned URLs expire after **15 minutes** (download) / **30 minutes** (upload)

---

## Authentication

All endpoints require JWT Bearer token in header:

```
Authorization: Bearer <jwt_token>
```

---

## File Upload Flow

### Step 1: Request Presigned URL
```
POST /api/cases/:caseId/documents/upload-url
```

### Step 2: Upload Directly to R2
```
PUT <presigned_url>
Content-Type: <file_mimetype>
Body: <file_binary>
```

### Step 3: Confirm Upload
```
POST /api/cases/:caseId/documents/confirm-upload
```

---

## API Endpoints

### Cases - Document Management

#### Get Upload URL
```http
POST /api/cases/:caseId/documents/upload-url
```

**Request Body:**
```json
{
  "filename": "contract.pdf",
  "contentType": "application/pdf",
  "fileSize": 1048576,
  "category": "contract"
}
```

**Response:**
```json
{
  "success": true,
  "uploadUrl": "https://xxx.r2.cloudflarestorage.com/...",
  "fileKey": "firms/abc123/cases/def456/documents/1704567890-contract.pdf",
  "expiresIn": 1800
}
```

#### Confirm Upload
```http
POST /api/cases/:caseId/documents/confirm-upload
```

**Request Body:**
```json
{
  "fileKey": "firms/abc123/cases/def456/documents/1704567890-contract.pdf",
  "filename": "contract.pdf",
  "contentType": "application/pdf",
  "size": 1048576,
  "category": "contract",
  "description": "Main service contract"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم رفع المستند بنجاح",
  "document": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "contract.pdf",
    "fileKey": "firms/abc123/cases/def456/documents/1704567890-contract.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "category": "contract",
    "uploadedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "firstName": "Ahmed",
      "lastName": "Mohammed"
    },
    "uploadedAt": "2026-01-06T10:30:00.000Z"
  }
}
```

#### Get Download URL
```http
GET /api/cases/:caseId/documents/:documentId/download-url
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `disposition` | string | `attachment` | `attachment` for download, `inline` for preview |

**Response:**
```json
{
  "success": true,
  "downloadUrl": "https://xxx.r2.cloudflarestorage.com/...",
  "document": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "contract.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576
  }
}
```

#### Delete Document
```http
DELETE /api/cases/:caseId/documents/:documentId
```

**Response:**
```json
{
  "success": true,
  "message": "تم حذف المستند بنجاح"
}
```

---

### Tasks - Attachments

#### Add Attachment (Multipart)
```http
POST /api/tasks/:taskId/attachments
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | The file to upload |

**Response:**
```json
{
  "success": true,
  "message": "تم رفع المرفق بنجاح",
  "attachment": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "document.pdf",
    "fileKey": "tasks/abc123/1704567890-document.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "storageType": "s3",
    "uploadedBy": "507f1f77bcf86cd799439012",
    "uploadedAt": "2026-01-06T10:30:00.000Z",
    "downloadUrl": "https://xxx.r2.cloudflarestorage.com/..."
  }
}
```

#### Get Download URL
```http
GET /api/tasks/:taskId/attachments/:attachmentId/download-url
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `disposition` | string | `attachment` | `attachment` or `inline` |
| `versionId` | string | null | Specific version ID (if versioning enabled) |

**Response:**
```json
{
  "success": true,
  "downloadUrl": "https://xxx.r2.cloudflarestorage.com/...",
  "versionId": null,
  "disposition": "attachment",
  "attachment": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "document.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576
  }
}
```

#### Delete Attachment
```http
DELETE /api/tasks/:taskId/attachments/:attachmentId
```

**Response:**
```json
{
  "success": true,
  "message": "تم حذف المرفق"
}
```

#### Get Attachment Versions
```http
GET /api/tasks/:taskId/attachments/:attachmentId/versions
```

**Response:**
```json
{
  "success": true,
  "attachment": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "document.pdf",
    "fileKey": "tasks/abc123/document.pdf"
  },
  "versions": [
    {
      "versionId": "abc123",
      "lastModified": "2026-01-06T10:30:00.000Z",
      "size": 1048576,
      "isLatest": true
    }
  ]
}
```

---

### Tasks - TipTap Documents

#### Create Document
```http
POST /api/tasks/:taskId/documents
```

**Request Body:**
```json
{
  "title": "Meeting Notes",
  "content": "<p>HTML content here</p>",
  "contentJson": { "type": "doc", "content": [] },
  "contentFormat": "tiptap-json"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم إنشاء المستند بنجاح",
  "document": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "Meeting Notes.html",
    "fileType": "text/html",
    "fileSize": 256,
    "contentFormat": "tiptap-json",
    "isEditable": true,
    "uploadedBy": "507f1f77bcf86cd799439012",
    "uploadedAt": "2026-01-06T10:30:00.000Z"
  }
}
```

#### Get Document
```http
GET /api/tasks/:taskId/documents/:documentId
```

**Response (Editable Document):**
```json
{
  "success": true,
  "document": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "Meeting Notes.html",
    "fileType": "text/html",
    "fileSize": 256,
    "content": "<p>HTML content here</p>",
    "contentJson": { "type": "doc", "content": [] },
    "contentFormat": "tiptap-json",
    "isEditable": true,
    "uploadedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "firstName": "Ahmed",
      "lastName": "Mohammed"
    },
    "uploadedAt": "2026-01-06T10:30:00.000Z",
    "lastEditedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "firstName": "Ahmed",
      "lastName": "Mohammed"
    },
    "lastEditedAt": "2026-01-06T11:00:00.000Z"
  }
}
```

**Response (File Attachment):**
```json
{
  "success": true,
  "document": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "contract.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "downloadUrl": "https://xxx.r2.cloudflarestorage.com/...",
    "isEditable": false,
    "isVoiceMemo": false,
    "uploadedBy": {
      "_id": "507f1f77bcf86cd799439012",
      "firstName": "Ahmed",
      "lastName": "Mohammed"
    },
    "uploadedAt": "2026-01-06T10:30:00.000Z"
  }
}
```

#### Update Document
```http
PATCH /api/tasks/:taskId/documents/:documentId
```

**Request Body:**
```json
{
  "title": "Updated Meeting Notes",
  "content": "<p>Updated HTML content</p>",
  "contentJson": { "type": "doc", "content": [] },
  "contentFormat": "tiptap-json",
  "changeNote": "Added action items"
}
```

**Response:**
```json
{
  "success": true,
  "message": "تم تحديث المستند بنجاح",
  "document": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "Updated Meeting Notes.html",
    "documentContent": "<p>Updated HTML content</p>",
    "documentJson": { "type": "doc", "content": [] },
    "contentFormat": "tiptap-json",
    "lastEditedBy": "507f1f77bcf86cd799439012",
    "lastEditedAt": "2026-01-06T11:00:00.000Z"
  },
  "version": 2
}
```

#### Get Document Versions
```http
GET /api/tasks/:taskId/documents/:documentId/versions
```

**Response:**
```json
{
  "success": true,
  "document": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "Meeting Notes.html",
    "isEditable": true
  },
  "versions": [
    {
      "_id": "current",
      "version": 3,
      "title": "Meeting Notes.html",
      "fileSize": 512,
      "contentFormat": "tiptap-json",
      "editedBy": "507f1f77bcf86cd799439012",
      "createdAt": "2026-01-06T11:00:00.000Z",
      "isCurrent": true
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "version": 2,
      "title": "Meeting Notes.html",
      "fileSize": 256,
      "contentFormat": "tiptap-json",
      "changeNote": "Added action items",
      "editedBy": {
        "_id": "507f1f77bcf86cd799439012",
        "firstName": "Ahmed",
        "lastName": "Mohammed"
      },
      "createdAt": "2026-01-06T10:45:00.000Z"
    }
  ]
}
```

#### Restore Document Version
```http
POST /api/tasks/:taskId/documents/:documentId/versions/:versionId/restore
```

**Response:**
```json
{
  "success": true,
  "message": "تم استعادة النسخة 2 بنجاح",
  "document": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "Meeting Notes.html",
    "documentContent": "<p>Previous content</p>",
    "documentJson": { "type": "doc", "content": [] }
  },
  "restoredFromVersion": 2,
  "currentVersion": 4
}
```

---

### Tasks - Voice Memos

#### Add Voice Memo
```http
POST /api/tasks/:taskId/voice-memos
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | Audio file (webm, mp3, m4a, wav, ogg) |
| `duration` | number | No | Duration in seconds |

**Response:**
```json
{
  "success": true,
  "message": "تم إضافة المذكرة الصوتية بنجاح",
  "voiceMemo": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "voice-memo-1704567890.webm",
    "fileKey": "tasks/abc123/voice-1704567890.webm",
    "fileType": "audio/webm",
    "fileSize": 524288,
    "duration": 45,
    "isVoiceMemo": true,
    "uploadedBy": "507f1f77bcf86cd799439012",
    "uploadedAt": "2026-01-06T10:30:00.000Z",
    "downloadUrl": "https://xxx.r2.cloudflarestorage.com/..."
  }
}
```

---

### Clients - Attachments

#### Upload Attachments
```http
POST /api/clients/:clientId/attachments
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `files` | File[] | Yes | Up to 10 files |

**Response:**
```json
{
  "success": true,
  "message": "تم رفع المرفقات بنجاح",
  "attachments": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "fileName": "id-card.pdf",
      "fileType": "application/pdf",
      "fileSize": 524288,
      "uploadedAt": "2026-01-06T10:30:00.000Z"
    }
  ]
}
```

#### Delete Attachment
```http
DELETE /api/clients/:clientId/attachments/:attachmentId
```

---

### HR - Employee Documents

#### Upload Document
```http
POST /api/hr/employees/:employeeId/documents
```

**Request Body:**
```json
{
  "fileKey": "hr/employees/abc123/1704567890-contract.pdf",
  "fileName": "employment-contract.pdf",
  "fileSize": 1048576,
  "fileType": "application/pdf",
  "documentType": "contract",
  "bucket": "documents"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded successfully | تم رفع المستند بنجاح",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "fileName": "employment-contract.pdf",
    "fileKey": "hr/employees/abc123/1704567890-contract.pdf",
    "fileType": "application/pdf",
    "fileSize": 1048576,
    "documentType": "contract",
    "createdAt": "2026-01-06T10:30:00.000Z"
  }
}
```

#### Delete Document
```http
DELETE /api/hr/employees/:employeeId/documents/:docId
```

---

### Bank Reconciliation - Import Files

#### Import CSV
```http
POST /api/bank-reconciliation/import/csv
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | CSV file (max 5MB) |

**Note:** Files are scanned for malware before processing.

#### Import OFX
```http
POST /api/bank-reconciliation/import/ofx
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | OFX file (max 5MB) |

---

### Bank Transactions - Import

#### Import Transactions
```http
POST /api/bank-transactions/import/:accountId
Content-Type: multipart/form-data
```

**Form Data:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | File | Yes | CSV, OFX, or QIF file (max 10MB) |

**Allowed File Types:**
- `.csv` (text/csv)
- `.ofx` (application/x-ofx)
- `.qif` (application/x-qif)

---

## Response Schemas

### Document Schema
```typescript
interface Document {
  _id: string;
  fileName: string;
  fileKey?: string;
  fileUrl?: string;
  fileType: string;
  fileSize: number;
  category?: DocumentCategory;
  description?: string;
  storageType: 'local' | 's3';
  isEditable?: boolean;
  isVoiceMemo?: boolean;

  // For editable documents (TipTap)
  documentContent?: string;
  documentJson?: object;
  contentFormat?: 'html' | 'tiptap-json';

  // For voice memos
  duration?: number;
  transcription?: string;

  // Metadata
  uploadedBy: string | User;
  uploadedAt: string; // ISO 8601
  lastEditedBy?: string | User;
  lastEditedAt?: string; // ISO 8601
}
```

### User Reference Schema
```typescript
interface UserRef {
  _id: string;
  firstName: string;
  lastName: string;
}
```

### Version Schema
```typescript
interface DocumentVersion {
  _id: string;
  version: number;
  title: string;
  documentContent?: string;
  documentJson?: object;
  contentFormat: 'html' | 'tiptap-json';
  fileSize: number;
  changeNote?: string;
  editedBy: string | UserRef;
  createdAt: string; // ISO 8601
  isCurrent?: boolean;
}
```

---

## Error Codes

### Standard Errors
| Code | HTTP Status | Message | Description |
|------|-------------|---------|-------------|
| `VALIDATION_ERROR` | 400 | Various | Invalid input data |
| `UNAUTHORIZED` | 401 | Unauthorized | Missing or invalid token |
| `FORBIDDEN` | 403 | Permission denied | User lacks required permissions |
| `NOT_FOUND` | 404 | Resource not found | Document/task/case doesn't exist |
| `INTERNAL_ERROR` | 500 | Internal server error | Server-side error |

### Malware Scanning Errors
| Code | HTTP Status | Message (Arabic) | Description |
|------|-------------|------------------|-------------|
| `MALWARE_DETECTED` | 400 | ملف مرفوض: تم اكتشاف محتوى ضار | File contains malware |
| `SCAN_FAILED` | 500 | فشل التحقق من سلامة الملف | Malware scan service unavailable |

**Malware Error Response:**
```json
{
  "success": false,
  "error": true,
  "message": "ملف مرفوض: تم اكتشاف محتوى ضار",
  "code": "MALWARE_DETECTED",
  "details": {
    "fileName": "infected.exe",
    "virus": "Trojan.Generic",
    "blocked": false
  }
}
```

### File Upload Errors
| Code | HTTP Status | Message | Description |
|------|-------------|---------|-------------|
| `FILE_TOO_LARGE` | 400 | File too large | Exceeds max file size |
| `INVALID_FILE_TYPE` | 400 | Invalid file type | File type not allowed |
| `UPLOAD_FAILED` | 500 | Upload failed | R2 storage error |

---

## Enums & Constants

### Document Categories
```typescript
type DocumentCategory =
  | 'contract'
  | 'pleading'
  | 'evidence'
  | 'correspondence'
  | 'court_document'
  | 'financial'
  | 'identification'
  | 'other';
```

### Content Formats
```typescript
type ContentFormat = 'html' | 'tiptap-json';
```

### Storage Types
```typescript
type StorageType = 'local' | 's3'; // 's3' means R2 (S3-compatible)
```

### File Size Limits
| Endpoint | Max Size |
|----------|----------|
| Task attachments | 50 MB |
| Case documents | 50 MB |
| Client attachments | 50 MB |
| Bank imports | 10 MB |
| HR documents | 50 MB |
| Voice memos | 25 MB |

### Allowed MIME Types

**Documents:**
- `application/pdf`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- `text/plain`
- `text/csv`

**Images:**
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

**Audio (Voice Memos):**
- `audio/webm`
- `audio/mp3`
- `audio/mpeg`
- `audio/m4a`
- `audio/wav`
- `audio/ogg`

**Bank Imports:**
- `text/csv`
- `application/csv`
- `application/x-ofx`
- `application/x-qif`

---

## Security Features

### Presigned URLs
- **Download URLs**: Expire in 15 minutes (900 seconds)
- **Upload URLs**: Expire in 30 minutes (1800 seconds)
- URLs are single-use and tied to specific file operations

### Malware Scanning
All file uploads are scanned for malware before storage:
- Uses ClamAV antivirus engine
- Infected files are immediately rejected
- Scan results are logged for audit

### File Access Logging
All file operations are audit logged:
- Upload events
- Download events
- Delete events
- Preview events

**Logged Information:**
- User ID
- File key/name
- Operation type
- IP address
- User agent
- Timestamp
- Firm ID (for multi-tenancy)

### Data Residency
- Files are stored in Cloudflare R2 (global edge network)
- Geographic access restrictions can be configured per firm
- PDPL and NCA-ECC compliance frameworks supported

---

## Frontend Implementation Notes

### Direct Upload to R2

```javascript
async function uploadFile(file, caseId) {
  // Step 1: Get presigned URL
  const { uploadUrl, fileKey } = await api.post(
    `/cases/${caseId}/documents/upload-url`,
    {
      filename: file.name,
      contentType: file.type,
      fileSize: file.size
    }
  );

  // Step 2: Upload directly to R2
  await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });

  // Step 3: Confirm upload
  const { document } = await api.post(
    `/cases/${caseId}/documents/confirm-upload`,
    {
      fileKey,
      filename: file.name,
      contentType: file.type,
      size: file.size
    }
  );

  return document;
}
```

### Handling Malware Errors

```javascript
try {
  await uploadFile(file);
} catch (error) {
  if (error.code === 'MALWARE_DETECTED') {
    // Show warning to user
    alert(`ملف مرفوض: ${error.details.virus}`);
  } else if (error.code === 'SCAN_FAILED') {
    // Retry or show error
    alert('فشل التحقق من سلامة الملف. يرجى المحاولة مرة أخرى.');
  }
}
```

### Preview vs Download

```javascript
// For preview (opens in browser)
const { downloadUrl } = await api.get(
  `/tasks/${taskId}/attachments/${attachmentId}/download-url?disposition=inline`
);
window.open(downloadUrl, '_blank');

// For download (triggers save dialog)
const { downloadUrl } = await api.get(
  `/tasks/${taskId}/attachments/${attachmentId}/download-url?disposition=attachment`
);
window.location.href = downloadUrl;
```

---

## Migration Notes

### Breaking Changes from v1
1. **Storage URLs**: File URLs are now presigned and temporary (15 min expiry)
2. **Direct file access removed**: Cannot access files via static URLs
3. **Malware scanning**: Uploads may be rejected with `MALWARE_DETECTED`

### Deprecated
- `fileUrl` field now contains presigned URL (temporary) instead of permanent URL
- Direct S3 bucket URLs are no longer supported

---

## Support

For API issues, contact the backend team with:
- Request/response logs
- Endpoint URL
- User ID and Firm ID
- Timestamp of the issue
