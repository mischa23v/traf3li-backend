/**
 * Common API Types
 * Auto-generated - shared across all modules
 * Generated: 2026-01-09
 */

// ═══════════════════════════════════════════════════════════════
// STANDARD API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

export interface ApiResponse<T = any> {
  success: boolean;
  error?: boolean;
  message?: string;
  messageEn?: string;
  messageAr?: string;
  data?: T;
  code?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ErrorResponse {
  error: boolean;
  success: false;
  message: string;
  messageEn?: string;
  messageAr?: string;
  code?: string;
  details?: any[];
  errors?: string[];
}

// ═══════════════════════════════════════════════════════════════
// COMMON REQUEST TYPES
// ═══════════════════════════════════════════════════════════════

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  search?: string;
  q?: string;
}

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
}

export interface IdParam {
  id: string;
}

// ═══════════════════════════════════════════════════════════════
// COMMON FIELD TYPES
// ═══════════════════════════════════════════════════════════════

export type ObjectId = string;
export type ISODateString = string;
export type Currency = 'SAR' | 'USD' | 'EUR' | 'GBP' | 'AED';

// ═══════════════════════════════════════════════════════════════
// AUDIT FIELDS (included in most entities)
// ═══════════════════════════════════════════════════════════════

export interface AuditFields {
  createdAt: ISODateString;
  updatedAt: ISODateString;
  createdBy?: ObjectId;
  updatedBy?: ObjectId;
}

export interface SoftDeleteFields {
  isDeleted?: boolean;
  deletedAt?: ISODateString;
  deletedBy?: ObjectId;
}

// ═══════════════════════════════════════════════════════════════
// STATUS ENUMS (commonly used across modules)
// ═══════════════════════════════════════════════════════════════

export type CommonStatus = 'active' | 'inactive' | 'pending' | 'archived';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded';

// ═══════════════════════════════════════════════════════════════
// BULK OPERATION TYPES
// ═══════════════════════════════════════════════════════════════

export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkUpdateRequest<T> {
  ids: string[];
  data: Partial<T>;
}

export interface BulkOperationResponse {
  success: boolean;
  processed: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
