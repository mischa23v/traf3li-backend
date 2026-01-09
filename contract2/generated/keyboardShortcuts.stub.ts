/**
 * KeyboardShortcuts API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/keyboardShortcuts/defaults
export interface KeyboardShortcutsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KeyboardShortcutsListResponse = PaginatedResponse<KeyboardShortcuts>;

// POST /api/keyboardShortcuts/check-conflict
export interface CreateKeyboardShortcutsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateKeyboardShortcutsResponse = ApiResponse<KeyboardShortcuts>;

// POST /api/keyboardShortcuts/reset-all
export interface CreateKeyboardShortcutsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateKeyboardShortcutsResponse = ApiResponse<KeyboardShortcuts>;

// GET /api/keyboardShortcuts
export interface KeyboardShortcutsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type KeyboardShortcutsListResponse = PaginatedResponse<KeyboardShortcuts>;

// POST /api/keyboardShortcuts
export interface CreateKeyboardShortcutsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateKeyboardShortcutsResponse = ApiResponse<KeyboardShortcuts>;

// GET /api/keyboardShortcuts/:id
export type GetKeyboardShortcutsResponse = ApiResponse<KeyboardShortcuts>;

// PUT /api/keyboardShortcuts/:id
export interface UpdateKeyboardShortcutsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateKeyboardShortcutsResponse = ApiResponse<KeyboardShortcuts>;

// DELETE /api/keyboardShortcuts/:id
export type DeleteKeyboardShortcutsResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/keyboardShortcuts/:id/reset
export interface CreateKeyboardShortcutsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateKeyboardShortcutsResponse = ApiResponse<KeyboardShortcuts>;
