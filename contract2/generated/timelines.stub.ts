/**
 * Timelines API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/timelines/:entityType/:entityId
export interface TimelinesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TimelinesListResponse = PaginatedResponse<Timelines>;

// GET /api/timelines/:entityType/:entityId/summary
export interface TimelinesListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TimelinesListResponse = PaginatedResponse<Timelines>;
