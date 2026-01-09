/**
 * Plugins API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/plugins/search
export interface PluginsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PluginsListResponse = PaginatedResponse<Plugins>;

// GET /api/plugins/all
export interface PluginsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PluginsListResponse = PaginatedResponse<Plugins>;

// GET /api/plugins/loader/stats
export interface PluginsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PluginsListResponse = PaginatedResponse<Plugins>;

// GET /api/plugins/available
export interface PluginsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PluginsListResponse = PaginatedResponse<Plugins>;

// GET /api/plugins/installed
export interface PluginsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PluginsListResponse = PaginatedResponse<Plugins>;

// POST /api/plugins/register
export interface CreatePluginsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePluginsResponse = ApiResponse<Plugins>;

// POST /api/plugins/hooks/execute
export interface CreatePluginsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePluginsResponse = ApiResponse<Plugins>;

// GET /api/plugins/:id
export type GetPluginsResponse = ApiResponse<Plugins>;

// GET /api/plugins/:id/stats
export type GetPluginsResponse = ApiResponse<Plugins>;

// POST /api/plugins/:id/reload
export interface CreatePluginsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePluginsResponse = ApiResponse<Plugins>;

// POST /api/plugins/:id/install
export interface CreatePluginsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePluginsResponse = ApiResponse<Plugins>;

// DELETE /api/plugins/:id/uninstall
export type DeletePluginsResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/plugins/installations/:installationId
export interface PluginsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type PluginsListResponse = PaginatedResponse<Plugins>;

// PATCH /api/plugins/installations/:installationId/settings
export interface UpdatePluginsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdatePluginsResponse = ApiResponse<Plugins>;

// POST /api/plugins/installations/:installationId/enable
export interface CreatePluginsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePluginsResponse = ApiResponse<Plugins>;

// POST /api/plugins/installations/:installationId/disable
export interface CreatePluginsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreatePluginsResponse = ApiResponse<Plugins>;
