/**
 * Conversations API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/conversations/stats
export interface ConversationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConversationsListResponse = PaginatedResponse<Conversations>;

// GET /api/conversations
export interface ConversationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ConversationsListResponse = PaginatedResponse<Conversations>;

// GET /api/conversations/:id
export type GetConversationsResponse = ApiResponse<Conversations>;

// POST /api/conversations/:id/messages
export interface CreateConversationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateConversationsResponse = ApiResponse<Conversations>;

// POST /api/conversations/:id/assign
export interface CreateConversationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateConversationsResponse = ApiResponse<Conversations>;

// POST /api/conversations/:id/snooze
export interface CreateConversationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateConversationsResponse = ApiResponse<Conversations>;

// POST /api/conversations/:id/close
export interface CreateConversationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateConversationsResponse = ApiResponse<Conversations>;

// POST /api/conversations/:id/reopen
export interface CreateConversationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateConversationsResponse = ApiResponse<Conversations>;

// PUT /api/conversations/:id/tags
export interface UpdateConversationsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateConversationsResponse = ApiResponse<Conversations>;

// PUT /api/conversations/:id/priority
export interface UpdateConversationsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateConversationsResponse = ApiResponse<Conversations>;
