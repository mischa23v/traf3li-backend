/**
 * Macros API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/macros/popular
export interface MacrosListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MacrosListResponse = PaginatedResponse<Macros>;

// GET /api/macros/shortcut/:shortcut
export interface MacrosListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MacrosListResponse = PaginatedResponse<Macros>;

// GET /api/macros/suggest/:conversationId
export interface MacrosListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MacrosListResponse = PaginatedResponse<Macros>;

// GET /api/macros
export interface MacrosListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MacrosListResponse = PaginatedResponse<Macros>;

// POST /api/macros
export interface CreateMacrosRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMacrosResponse = ApiResponse<Macros>;

// GET /api/macros/:id
export type GetMacrosResponse = ApiResponse<Macros>;

// PUT /api/macros/:id
export interface UpdateMacrosRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateMacrosResponse = ApiResponse<Macros>;

// DELETE /api/macros/:id
export type DeleteMacrosResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/macros/:id/apply/:conversationId
export interface CreateMacrosRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMacrosResponse = ApiResponse<Macros>;
