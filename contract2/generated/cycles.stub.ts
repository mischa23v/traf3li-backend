/**
 * Cycles API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/cycles/active
export interface CyclesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CyclesListResponse = PaginatedResponse<Cycles>;

// GET /api/cycles/stats
export interface CyclesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CyclesListResponse = PaginatedResponse<Cycles>;

// GET /api/cycles
export interface CyclesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type CyclesListResponse = PaginatedResponse<Cycles>;

// POST /api/cycles
export interface CreateCyclesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCyclesResponse = ApiResponse<Cycles>;

// GET /api/cycles/:id
export type GetCyclesResponse = ApiResponse<Cycles>;

// POST /api/cycles/:id/start
export interface CreateCyclesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCyclesResponse = ApiResponse<Cycles>;

// POST /api/cycles/:id/complete
export interface CreateCyclesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCyclesResponse = ApiResponse<Cycles>;

// GET /api/cycles/:id/progress
export type GetCyclesResponse = ApiResponse<Cycles>;

// GET /api/cycles/:id/burndown
export type GetCyclesResponse = ApiResponse<Cycles>;

// POST /api/cycles/:id/tasks/:taskId
export interface CreateCyclesRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateCyclesResponse = ApiResponse<Cycles>;

// DELETE /api/cycles/:id/tasks/:taskId
export type DeleteCyclesResponse = ApiResponse<{ deleted: boolean }>;
