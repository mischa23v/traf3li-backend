/**
 * Discord API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/discord/auth-url
export interface DiscordListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DiscordListResponse = PaginatedResponse<Discord>;

// GET /api/discord/callback
export interface DiscordListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DiscordListResponse = PaginatedResponse<Discord>;

// POST /api/discord/complete-setup
export interface CreateDiscordRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDiscordResponse = ApiResponse<Discord>;

// GET /api/discord/status
export interface DiscordListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DiscordListResponse = PaginatedResponse<Discord>;

// POST /api/discord/disconnect
export interface CreateDiscordRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDiscordResponse = ApiResponse<Discord>;

// POST /api/discord/test
export interface CreateDiscordRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDiscordResponse = ApiResponse<Discord>;

// GET /api/discord/guilds
export interface DiscordListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DiscordListResponse = PaginatedResponse<Discord>;

// GET /api/discord/guilds/:guildId/channels
export interface DiscordListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type DiscordListResponse = PaginatedResponse<Discord>;

// PUT /api/discord/settings
export interface UpdateDiscordRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateDiscordResponse = ApiResponse<Discord>;

// POST /api/discord/message
export interface CreateDiscordRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDiscordResponse = ApiResponse<Discord>;

// POST /api/discord/webhook
export interface CreateDiscordRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateDiscordResponse = ApiResponse<Discord>;
