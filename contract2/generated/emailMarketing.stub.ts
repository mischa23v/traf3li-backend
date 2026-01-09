/**
 * EmailMarketing API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/emailMarketing/campaigns
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// GET /api/emailMarketing/campaigns
export interface EmailMarketingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailMarketingListResponse = PaginatedResponse<EmailMarketing>;

// GET /api/emailMarketing/campaigns/:id
export type GetEmailMarketingResponse = ApiResponse<EmailMarketing>;

// PUT /api/emailMarketing/campaigns/:id
export interface UpdateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// DELETE /api/emailMarketing/campaigns/:id
export type DeleteEmailMarketingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/emailMarketing/campaigns/:id/duplicate
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/campaigns/:id/schedule
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/campaigns/:id/send
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/campaigns/:id/pause
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/campaigns/:id/resume
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/campaigns/:id/cancel
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/campaigns/:id/test
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// GET /api/emailMarketing/campaigns/:id/analytics
export type GetEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/templates
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// GET /api/emailMarketing/templates
export interface EmailMarketingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailMarketingListResponse = PaginatedResponse<EmailMarketing>;

// GET /api/emailMarketing/templates/public
export interface EmailMarketingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailMarketingListResponse = PaginatedResponse<EmailMarketing>;

// GET /api/emailMarketing/templates/:id
export type GetEmailMarketingResponse = ApiResponse<EmailMarketing>;

// PUT /api/emailMarketing/templates/:id
export interface UpdateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// DELETE /api/emailMarketing/templates/:id
export type DeleteEmailMarketingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/emailMarketing/templates/:id/preview
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/subscribers
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// GET /api/emailMarketing/subscribers
export interface EmailMarketingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailMarketingListResponse = PaginatedResponse<EmailMarketing>;

// PUT /api/emailMarketing/subscribers/:id
export interface UpdateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// DELETE /api/emailMarketing/subscribers/:id
export type DeleteEmailMarketingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/emailMarketing/subscribers/import
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/subscribers/export
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/subscribers/:id/unsubscribe
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/segments
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// GET /api/emailMarketing/segments
export interface EmailMarketingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailMarketingListResponse = PaginatedResponse<EmailMarketing>;

// GET /api/emailMarketing/segments/:id
export type GetEmailMarketingResponse = ApiResponse<EmailMarketing>;

// PUT /api/emailMarketing/segments/:id
export interface UpdateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// DELETE /api/emailMarketing/segments/:id
export type DeleteEmailMarketingResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/emailMarketing/segments/:id/subscribers
export type GetEmailMarketingResponse = ApiResponse<EmailMarketing>;

// POST /api/emailMarketing/segments/:id/refresh
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// GET /api/emailMarketing/analytics/overview
export interface EmailMarketingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailMarketingListResponse = PaginatedResponse<EmailMarketing>;

// GET /api/emailMarketing/analytics/trends
export interface EmailMarketingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailMarketingListResponse = PaginatedResponse<EmailMarketing>;

// POST /api/emailMarketing/webhooks/email/resend
export interface CreateEmailMarketingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateEmailMarketingResponse = ApiResponse<EmailMarketing>;

// GET /api/emailMarketing/webhooks/email/track/open/:trackingId
export interface EmailMarketingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailMarketingListResponse = PaginatedResponse<EmailMarketing>;

// GET /api/emailMarketing/webhooks/email/unsubscribe/:email
export interface EmailMarketingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type EmailMarketingListResponse = PaginatedResponse<EmailMarketing>;
