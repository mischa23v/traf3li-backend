/**
 * AiChat API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/aiChat/providers
export interface AiChatListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiChatListResponse = PaginatedResponse<AiChat>;

// POST /api/aiChat
export interface CreateAiChatRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiChatResponse = ApiResponse<AiChat>;

// POST /api/aiChat/stream
export interface CreateAiChatRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAiChatResponse = ApiResponse<AiChat>;

// GET /api/aiChat/conversations
export interface AiChatListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiChatListResponse = PaginatedResponse<AiChat>;

// GET /api/aiChat/conversations/:conversationId
export interface AiChatListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AiChatListResponse = PaginatedResponse<AiChat>;

// PATCH /api/aiChat/conversations/:conversationId
export interface UpdateAiChatRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAiChatResponse = ApiResponse<AiChat>;

// DELETE /api/aiChat/conversations/:conversationId
export type DeleteAiChatResponse = ApiResponse<{ deleted: boolean }>;
