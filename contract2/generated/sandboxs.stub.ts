/**
 * Sandboxs API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/sandboxs/templates
export interface SandboxsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SandboxsListResponse = PaginatedResponse<Sandboxs>;

// GET /api/sandboxs/stats
export interface SandboxsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SandboxsListResponse = PaginatedResponse<Sandboxs>;

// POST /api/sandboxs
export interface CreateSandboxsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSandboxsResponse = ApiResponse<Sandboxs>;

// GET /api/sandboxs
export interface SandboxsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SandboxsListResponse = PaginatedResponse<Sandboxs>;

// POST /api/sandboxs/:id/reset
export interface CreateSandboxsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSandboxsResponse = ApiResponse<Sandboxs>;

// POST /api/sandboxs/:id/extend
export interface CreateSandboxsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSandboxsResponse = ApiResponse<Sandboxs>;

// POST /api/sandboxs/:id/clone
export interface CreateSandboxsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSandboxsResponse = ApiResponse<Sandboxs>;

// GET /api/sandboxs/:id/check-limit
export type GetSandboxsResponse = ApiResponse<Sandboxs>;

// DELETE /api/sandboxs/:id
export type DeleteSandboxsResponse = ApiResponse<{ deleted: boolean }>;
