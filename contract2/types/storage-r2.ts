/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLOUDFLARE R2 STORAGE API CONTRACT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This document defines the complete API contract for Cloudflare R2 storage
 * operations in the Traf3li backend.
 *
 * Storage Priority: Cloudflare R2 (primary) > AWS S3 (disabled) > Local (fallback)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Storage bucket types - maps to R2 buckets
 */
export type StorageBucket =
  | 'documents'    // traf3li-documents - General documents
  | 'judgments'    // traf3li-judgments - Court judgments
  | 'crm'          // traf3li-crm - CRM attachments
  | 'finance'      // traf3li-finance - Financial documents
  | 'hr'           // traf3li-hr - HR documents
  | 'tasks'        // traf3li-documents - Task attachments (alias)
  | 'general';     // traf3li-documents - General (alias)

/**
 * Document categories
 */
export type DocumentCategory =
  | 'contract'
  | 'judgment'
  | 'evidence'
  | 'correspondence'
  | 'pleading'
  | 'other';

/**
 * Module types for bucket routing
 */
export type StorageModule =
  | 'crm'
  | 'finance'
  | 'hr'
  | 'documents'
  | 'tasks'
  | 'judgments'
  | 'general';

/**
 * Storage type indicator
 */
export type StorageType = 'r2' | 'local';

/**
 * Content disposition for downloads
 */
export type ContentDisposition = 'inline' | 'attachment';

/**
 * Allowed MIME types for uploads
 */
export const ALLOWED_MIME_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  // Audio (voice memos)
  'audio/webm',
  'audio/mp3',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/x-m4a',
  // JSON
  'application/json'
] as const;

/**
 * Maximum file size: 100MB for cloud, 10MB for local
 */
export const MAX_FILE_SIZE_CLOUD = 100 * 1024 * 1024; // 100 MB
export const MAX_FILE_SIZE_LOCAL = 10 * 1024 * 1024;  // 10 MB

/**
 * Presigned URL expiry time in seconds
 */
export const PRESIGNED_URL_EXPIRY = 3600; // 1 hour

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Document stored in MongoDB with R2 file reference
 */
export interface Document {
  _id: string;
  firmId?: string;
  lawyerId: string;
  fileName: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  url: string;
  fileKey: string;           // R2 object key: "documents/{userId}/{year}/{month}/{uniqueId}-{filename}"
  bucket?: string;           // R2 bucket name
  module?: StorageModule;    // Module for routing
  category: DocumentCategory;
  caseId?: string;
  clientId?: string;
  description?: string;
  tags?: string[];
  isConfidential?: boolean;
  isEncrypted?: boolean;
  uploadedBy: string;
  version?: number;
  versions?: DocumentVersion[];
  shareToken?: string;
  shareExpiresAt?: Date;
  accessCount?: number;
  lastAccessedAt?: Date;
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    pageCount?: number;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Document version for version history
 */
export interface DocumentVersion {
  version: number;
  fileName: string;
  originalName: string;
  fileSize: number;
  url: string;
  fileKey: string;
  uploadedBy: string;
  changeNote?: string;
  createdAt: string;
}

/**
 * Task attachment stored in task.attachments array
 */
export interface TaskAttachment {
  _id: string;
  fileName: string;
  fileUrl: string;           // Full URL or local path
  fileKey?: string;          // R2 object key (only for cloud storage)
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  storageType: StorageType;  // 'r2' or 'local'
}

/**
 * R2 file version (for versioned buckets)
 */
export interface FileVersion {
  versionId: string;
  lastModified: string;
  size: number;
  isLatest: boolean;
  etag: string;
}

/**
 * File metadata from R2
 */
export interface FileMetadata {
  contentType: string;
  contentLength: number;
  lastModified: string;
  versionId?: string;
  etag: string;
  metadata?: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ DOCUMENT ENDPOINTS - /api/v1/documents                                      │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/documents/upload
// Get presigned URL for uploading to R2
// ─────────────────────────────────────────────────────────────────────────────

export interface GetUploadUrlRequest {
  fileName: string;          // Required: "contract.pdf"
  fileType: string;          // Required: MIME type "application/pdf"
  category: DocumentCategory; // Required: "contract" | "judgment" | etc.
  caseId?: string;           // Optional: Link to case
  clientId?: string;         // Optional: Link to client
  description?: string;      // Optional: Document description
  isConfidential?: boolean;  // Optional: Mark as confidential
  module?: StorageModule;    // Optional: "documents" | "crm" | "finance" | "hr" | "judgments"
}

export interface GetUploadUrlResponse {
  success: true;
  data: {
    uploadUrl: string;       // Presigned URL for PUT request
    fileKey: string;         // R2 object key to save
    bucket: string;          // Bucket name
    module: string;          // Module used
    expiresIn: number;       // URL expiry in seconds (3600)
  };
}

/**
 * Frontend Usage Example:
 *
 * ```typescript
 * // Step 1: Get presigned URL
 * const { data } = await api.post('/documents/upload', {
 *   fileName: 'contract.pdf',
 *   fileType: 'application/pdf',
 *   category: 'contract',
 *   caseId: '507f1f77bcf86cd799439011',
 *   module: 'documents'
 * });
 *
 * // Step 2: Upload file directly to R2 using presigned URL
 * await fetch(data.uploadUrl, {
 *   method: 'PUT',
 *   body: file,
 *   headers: {
 *     'Content-Type': file.type
 *   }
 * });
 *
 * // Step 3: Confirm upload
 * await api.post('/documents/confirm', {
 *   fileName: file.name,
 *   originalName: file.name,
 *   fileType: file.type,
 *   fileSize: file.size,
 *   fileKey: data.fileKey,
 *   bucket: data.bucket,
 *   category: 'contract',
 *   caseId: '507f1f77bcf86cd799439011'
 * });
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/documents/confirm
// Confirm upload and save document metadata to MongoDB
// ─────────────────────────────────────────────────────────────────────────────

export interface ConfirmUploadRequest {
  fileName: string;          // Required
  originalName?: string;     // Optional (defaults to fileName)
  fileType: string;          // Required: MIME type
  fileSize: number;          // Required: Size in bytes
  fileKey: string;           // Required: R2 object key from upload step
  url?: string;              // Optional: Full URL (auto-generated if not provided)
  bucket?: string;           // Optional: Bucket name
  module?: StorageModule;    // Optional: Module type
  category: DocumentCategory; // Required
  caseId?: string;           // Optional
  clientId?: string;         // Optional
  description?: string;      // Optional
  isConfidential?: boolean;  // Optional
  tags?: string[];           // Optional
}

export interface ConfirmUploadResponse {
  success: true;
  message: string;
  messageAr: string;
  data: Document;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/documents
// List documents with filters
// ─────────────────────────────────────────────────────────────────────────────

export interface GetDocumentsRequest {
  page?: number;             // Default: 1
  limit?: number;            // Default: 20, Max: 100
  category?: DocumentCategory;
  caseId?: string;
  clientId?: string;
  search?: string;           // Search in fileName, originalName, description
  sortBy?: 'createdAt' | 'updatedAt' | 'fileName' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

export interface GetDocumentsResponse {
  success: true;
  data: Document[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/documents/:id
// Get single document with download URL
// ─────────────────────────────────────────────────────────────────────────────

export interface GetDocumentResponse {
  success: true;
  data: Document & {
    downloadUrl?: string;    // Presigned download URL
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/documents/:id/download
// Get presigned download URL
// ─────────────────────────────────────────────────────────────────────────────

export interface DownloadDocumentRequest {
  disposition?: ContentDisposition; // 'inline' for preview, 'attachment' for download
  versionId?: string;               // Optional: Specific version
}

export interface DownloadDocumentResponse {
  success: true;
  downloadUrl: string;       // Presigned URL (1 hour expiry)
  fileName: string;
  fileType: string;
  fileSize: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/documents/:id/versions
// Get version history
// ─────────────────────────────────────────────────────────────────────────────

export interface GetVersionHistoryResponse {
  success: true;
  data: {
    current: Document;
    versions: DocumentVersion[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/documents/:id/share
// Generate shareable link
// ─────────────────────────────────────────────────────────────────────────────

export interface ShareDocumentRequest {
  expiresIn?: number;        // Expiry in hours (default: 24, max: 720)
}

export interface ShareDocumentResponse {
  success: true;
  data: {
    shareUrl: string;        // Public shareable URL
    shareToken: string;      // Token for revocation
    expiresAt: string;       // ISO date
  };
}

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ TASK ATTACHMENT ENDPOINTS - /api/v1/tasks/:id/attachments                   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/tasks/:id/attachments
// Upload attachment to task (multipart/form-data)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request: multipart/form-data with 'file' field
 * Max size: 50MB for cloud, 10MB for local
 */
export interface AddTaskAttachmentResponse {
  success: true;
  message: string;
  attachment: TaskAttachment & {
    downloadUrl?: string;    // Presigned URL for immediate access
  };
}

/**
 * Frontend Usage Example:
 *
 * ```typescript
 * const formData = new FormData();
 * formData.append('file', file);
 *
 * const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
 *   headers: { 'Content-Type': 'multipart/form-data' }
 * });
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/tasks/:id/attachments/:attachmentId/download-url
// Get presigned download URL for attachment
// ─────────────────────────────────────────────────────────────────────────────

export interface GetAttachmentDownloadUrlRequest {
  disposition?: ContentDisposition; // 'inline' for preview, 'attachment' for download
  versionId?: string;               // Optional: Specific version
}

export interface GetAttachmentDownloadUrlResponse {
  success: true;
  downloadUrl: string;
  versionId?: string;
  disposition: ContentDisposition;
  attachment: {
    _id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/tasks/:id/attachments/:attachmentId/versions
// Get all versions of attachment (versioned buckets only)
// ─────────────────────────────────────────────────────────────────────────────

export interface GetAttachmentVersionsResponse {
  success: true;
  attachment: {
    _id: string;
    fileName: string;
    fileKey: string;
  };
  versions: FileVersion[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/tasks/:id/attachments/:attachmentId
// Delete attachment from task and R2
// ─────────────────────────────────────────────────────────────────────────────

export interface DeleteAttachmentResponse {
  success: true;
  message: string;
}

/**
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EXTERNAL CLOUD STORAGE - /api/v1/storage                                    │
 * │ (Google Drive, Dropbox, OneDrive integration)                               │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

export type ExternalStorageProvider = 'google-drive' | 'dropbox' | 'onedrive';

// GET /api/v1/storage/providers
export interface GetProvidersResponse {
  error: false;
  message: string;
  providers: Array<{
    id: ExternalStorageProvider;
    name: string;
    icon: string;
    connected: boolean;
  }>;
}

// GET /api/v1/storage/:provider/auth
export interface GetAuthUrlResponse {
  error: false;
  authUrl: string;
  provider: ExternalStorageProvider;
}

// GET /api/v1/storage/:provider/files
export interface ListExternalFilesRequest {
  path?: string;
  pageSize?: number;
  pageToken?: string;
  query?: string;
}

export interface ExternalFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  downloadUrl?: string;
  isFolder: boolean;
  path?: string;
}

export interface ListExternalFilesResponse {
  error: false;
  data: {
    files: ExternalFile[];
    nextPageToken?: string;
    hasMore: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENVIRONMENT VARIABLES (Required for R2)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Required environment variables for Cloudflare R2:
 *
 * ```env
 * # Cloudflare R2 Configuration
 * R2_ACCESS_KEY_ID=your_r2_access_key_id
 * R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
 * R2_ENDPOINT=https://{account_id}.r2.cloudflarestorage.com
 * R2_ACCOUNT_ID=your_account_id
 *
 * # R2 Bucket Names
 * R2_BUCKET_DOCUMENTS=traf3li-documents
 * R2_BUCKET_CRM=traf3li-crm
 * R2_BUCKET_FINANCE=traf3li-finance
 * R2_BUCKET_HR=traf3li-hr
 * R2_BUCKET_JUDGMENTS=traf3li-judgments
 *
 * # Optional: Logging Buckets
 * R2_BUCKET_DOCUMENTS_LOGS=traf3li-documents-logs
 * R2_BUCKET_CRM_LOGS=traf3li-crm-logs
 * R2_BUCKET_FINANCE_LOGS=traf3li-finance-logs
 * R2_BUCKET_HR_LOGS=traf3li-hr-logs
 *
 * # Optional: Presigned URL expiry (default: 3600 seconds)
 * PRESIGNED_URL_EXPIRY=3600
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// R2 BUCKET STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * File Key Format:
 *
 * Documents:  documents/{userId}/{year}/{month}/{uniqueId}-{filename}
 * Tasks:      tasks/{taskId}/{timestamp}-{random}-{filename}
 * CRM:        crm/{userId}/{year}/{month}/{uniqueId}-{filename}
 * Finance:    finance/{userId}/{year}/{month}/{uniqueId}-{filename}
 * HR:         hr/{userId}/{year}/{month}/{uniqueId}-{filename}
 * Judgments:  judgments/{caseId}/{timestamp}-{filename}
 *
 * Examples:
 * - documents/507f1f77bcf86cd799439011/2026/01/a1b2c3d4e5f6-contract.pdf
 * - tasks/507f1f77bcf86cd799439012/1704067200000-xyz123-notes.docx
 * - judgments/507f1f77bcf86cd799439013/1704067200000-final-ruling.pdf
 */

// ═══════════════════════════════════════════════════════════════════════════════
// FRONTEND SERVICE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Example storageService.ts for frontend:
 *
 * ```typescript
 * import api from './api';
 *
 * export const storageService = {
 *   // Upload document with presigned URL flow
 *   async uploadDocument(
 *     file: File,
 *     options: {
 *       category: DocumentCategory;
 *       caseId?: string;
 *       clientId?: string;
 *       module?: StorageModule;
 *     }
 *   ): Promise<Document> {
 *     // Step 1: Get presigned URL
 *     const { data: uploadData } = await api.post<GetUploadUrlResponse>(
 *       '/documents/upload',
 *       {
 *         fileName: file.name,
 *         fileType: file.type,
 *         ...options
 *       }
 *     );
 *
 *     // Step 2: Upload to R2 directly
 *     await fetch(uploadData.data.uploadUrl, {
 *       method: 'PUT',
 *       body: file,
 *       headers: { 'Content-Type': file.type }
 *     });
 *
 *     // Step 3: Confirm upload
 *     const { data: confirmData } = await api.post<ConfirmUploadResponse>(
 *       '/documents/confirm',
 *       {
 *         fileName: file.name,
 *         originalName: file.name,
 *         fileType: file.type,
 *         fileSize: file.size,
 *         fileKey: uploadData.data.fileKey,
 *         bucket: uploadData.data.bucket,
 *         ...options
 *       }
 *     );
 *
 *     return confirmData.data;
 *   },
 *
 *   // Upload task attachment (multipart)
 *   async uploadTaskAttachment(taskId: string, file: File): Promise<TaskAttachment> {
 *     const formData = new FormData();
 *     formData.append('file', file);
 *
 *     const { data } = await api.post<AddTaskAttachmentResponse>(
 *       `/tasks/${taskId}/attachments`,
 *       formData,
 *       { headers: { 'Content-Type': 'multipart/form-data' } }
 *     );
 *
 *     return data.attachment;
 *   },
 *
 *   // Get download URL
 *   async getDownloadUrl(
 *     documentId: string,
 *     options?: { disposition?: ContentDisposition }
 *   ): Promise<string> {
 *     const { data } = await api.get<DownloadDocumentResponse>(
 *       `/documents/${documentId}/download`,
 *       { params: options }
 *     );
 *     return data.downloadUrl;
 *   },
 *
 *   // Get task attachment download URL
 *   async getAttachmentUrl(
 *     taskId: string,
 *     attachmentId: string,
 *     options?: { disposition?: ContentDisposition }
 *   ): Promise<string> {
 *     const { data } = await api.get<GetAttachmentDownloadUrlResponse>(
 *       `/tasks/${taskId}/attachments/${attachmentId}/download-url`,
 *       { params: options }
 *     );
 *     return data.downloadUrl;
 *   }
 * };
 * ```
 */

export {};
