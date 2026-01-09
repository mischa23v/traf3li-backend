/**
 * Gmail API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/gmail/auth
export interface GmailListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GmailListResponse = PaginatedResponse<Gmail>;

// GET /api/gmail/callback
export interface GmailListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GmailListResponse = PaginatedResponse<Gmail>;

// POST /api/gmail/disconnect
export interface CreateGmailRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGmailResponse = ApiResponse<Gmail>;

// GET /api/gmail/status
export interface GmailListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GmailListResponse = PaginatedResponse<Gmail>;

// GET /api/gmail/messages
export interface GmailListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GmailListResponse = PaginatedResponse<Gmail>;

// GET /api/gmail/messages/:messageId
export interface GmailListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GmailListResponse = PaginatedResponse<Gmail>;

// POST /api/gmail/messages/send
export interface CreateGmailRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGmailResponse = ApiResponse<Gmail>;

// POST /api/gmail/messages/:messageId/reply
export interface CreateGmailRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGmailResponse = ApiResponse<Gmail>;

// GET /api/gmail/messages/search
export interface GmailListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GmailListResponse = PaginatedResponse<Gmail>;

// GET /api/gmail/threads/:threadId
export interface GmailListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GmailListResponse = PaginatedResponse<Gmail>;

// GET /api/gmail/drafts
export interface GmailListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GmailListResponse = PaginatedResponse<Gmail>;

// POST /api/gmail/drafts
export interface CreateGmailRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGmailResponse = ApiResponse<Gmail>;

// GET /api/gmail/labels
export interface GmailListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GmailListResponse = PaginatedResponse<Gmail>;

// POST /api/gmail/labels
export interface CreateGmailRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGmailResponse = ApiResponse<Gmail>;

// PUT /api/gmail/settings
export interface UpdateGmailRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGmailResponse = ApiResponse<Gmail>;

// POST /api/gmail/watch
export interface CreateGmailRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGmailResponse = ApiResponse<Gmail>;

// DELETE /api/gmail/watch
export type DeleteGmailResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/gmail/webhook
export interface CreateGmailRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGmailResponse = ApiResponse<Gmail>;
