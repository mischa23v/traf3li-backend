/**
 * Telegram API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/telegram/webhook/:firmId
export interface CreateTelegramRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTelegramResponse = ApiResponse<Telegram>;

// POST /api/telegram/connect
export interface CreateTelegramRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTelegramResponse = ApiResponse<Telegram>;

// POST /api/telegram/disconnect
export interface CreateTelegramRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTelegramResponse = ApiResponse<Telegram>;

// GET /api/telegram/status
export interface TelegramListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TelegramListResponse = PaginatedResponse<Telegram>;

// POST /api/telegram/test
export interface CreateTelegramRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTelegramResponse = ApiResponse<Telegram>;

// PUT /api/telegram/settings
export interface UpdateTelegramRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTelegramResponse = ApiResponse<Telegram>;

// PATCH /api/telegram/settings
export interface UpdateTelegramRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTelegramResponse = ApiResponse<Telegram>;

// GET /api/telegram/chats
export interface TelegramListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TelegramListResponse = PaginatedResponse<Telegram>;

// POST /api/telegram/message
export interface CreateTelegramRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTelegramResponse = ApiResponse<Telegram>;

// POST /api/telegram/photo
export interface CreateTelegramRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTelegramResponse = ApiResponse<Telegram>;

// POST /api/telegram/document
export interface CreateTelegramRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTelegramResponse = ApiResponse<Telegram>;
