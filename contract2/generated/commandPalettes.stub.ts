/**
 * CommandPalettes API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/commandPalettes/search
export interface CommandPalettesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CommandPalettesListResponse = PaginatedResponse<CommandPalettes>;

// GET /api/commandPalettes/commands
export interface CommandPalettesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CommandPalettesListResponse = PaginatedResponse<CommandPalettes>;

// GET /api/commandPalettes/recent
export interface CommandPalettesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CommandPalettesListResponse = PaginatedResponse<CommandPalettes>;

// POST /api/commandPalettes/track/record
export interface CreateCommandPalettesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCommandPalettesResponse = ApiResponse<CommandPalettes>;

// POST /api/commandPalettes/track/search
export interface CreateCommandPalettesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCommandPalettesResponse = ApiResponse<CommandPalettes>;

// POST /api/commandPalettes/track/command
export interface CreateCommandPalettesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCommandPalettesResponse = ApiResponse<CommandPalettes>;

// GET /api/commandPalettes/saved-searches
export interface CommandPalettesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CommandPalettesListResponse = PaginatedResponse<CommandPalettes>;

// POST /api/commandPalettes/saved-searches
export interface CreateCommandPalettesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCommandPalettesResponse = ApiResponse<CommandPalettes>;

// DELETE /api/commandPalettes/saved-searches/:name
export type DeleteCommandPalettesResponse = ApiResponse<{ deleted: boolean }>;
