/**
 * EmailTemplates API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/emailTemplates/variables
export interface EmailTemplatesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailTemplatesListResponse = PaginatedResponse<EmailTemplates>;

// GET /api/emailTemplates/trigger/:triggerEvent
export interface EmailTemplatesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailTemplatesListResponse = PaginatedResponse<EmailTemplates>;

// GET /api/emailTemplates
export interface EmailTemplatesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailTemplatesListResponse = PaginatedResponse<EmailTemplates>;

// POST /api/emailTemplates
export interface CreateEmailTemplatesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailTemplatesResponse = ApiResponse<EmailTemplates>;

// GET /api/emailTemplates/:id
export type GetEmailTemplatesResponse = ApiResponse<EmailTemplates>;

// PUT /api/emailTemplates/:id
export interface UpdateEmailTemplatesRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmailTemplatesResponse = ApiResponse<EmailTemplates>;

// DELETE /api/emailTemplates/:id
export type DeleteEmailTemplatesResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/emailTemplates/:id/preview
export interface CreateEmailTemplatesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailTemplatesResponse = ApiResponse<EmailTemplates>;

// POST /api/emailTemplates/:id/duplicate
export interface CreateEmailTemplatesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailTemplatesResponse = ApiResponse<EmailTemplates>;

// POST /api/emailTemplates/:id/test
export interface CreateEmailTemplatesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailTemplatesResponse = ApiResponse<EmailTemplates>;
