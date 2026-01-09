/**
 * EmailSettings API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/emailSettings/smtp
export interface EmailSettingsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailSettingsListResponse = PaginatedResponse<EmailSettings>;

// PUT /api/emailSettings/smtp
export interface UpdateEmailSettingsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmailSettingsResponse = ApiResponse<EmailSettings>;

// POST /api/emailSettings/smtp/test
export interface CreateEmailSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailSettingsResponse = ApiResponse<EmailSettings>;

// GET /api/emailSettings/templates
export interface EmailSettingsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailSettingsListResponse = PaginatedResponse<EmailSettings>;

// GET /api/emailSettings/templates/:id
export type GetEmailSettingsResponse = ApiResponse<EmailSettings>;

// POST /api/emailSettings/templates
export interface CreateEmailSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailSettingsResponse = ApiResponse<EmailSettings>;

// PUT /api/emailSettings/templates/:id
export interface UpdateEmailSettingsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmailSettingsResponse = ApiResponse<EmailSettings>;

// DELETE /api/emailSettings/templates/:id
export type DeleteEmailSettingsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/emailSettings/templates/:id/preview
export interface CreateEmailSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailSettingsResponse = ApiResponse<EmailSettings>;

// GET /api/emailSettings/signatures
export interface EmailSettingsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailSettingsListResponse = PaginatedResponse<EmailSettings>;

// POST /api/emailSettings/signatures
export interface CreateEmailSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailSettingsResponse = ApiResponse<EmailSettings>;

// PUT /api/emailSettings/signatures/:id
export interface UpdateEmailSettingsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmailSettingsResponse = ApiResponse<EmailSettings>;

// DELETE /api/emailSettings/signatures/:id
export type DeleteEmailSettingsResponse = ApiResponse<{ deleted: boolean }>;

// PUT /api/emailSettings/signatures/:id/default
export interface UpdateEmailSettingsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmailSettingsResponse = ApiResponse<EmailSettings>;
