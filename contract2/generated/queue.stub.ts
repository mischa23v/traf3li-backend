/**
 * Queue API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/queue
export interface QueueListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type QueueListResponse = PaginatedResponse<Queue>;

// GET /api/queue/:name
export interface QueueListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type QueueListResponse = PaginatedResponse<Queue>;

// GET /api/queue/:name/jobs
export interface QueueListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type QueueListResponse = PaginatedResponse<Queue>;

// GET /api/queue/:name/jobs/:jobId
export interface QueueListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type QueueListResponse = PaginatedResponse<Queue>;

// GET /api/queue/:name/counts
export interface QueueListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type QueueListResponse = PaginatedResponse<Queue>;

// POST /api/queue/:name/retry/:jobId
export interface CreateQueueRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQueueResponse = ApiResponse<Queue>;

// DELETE /api/queue/:name/jobs/:jobId
export type DeleteQueueResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/queue/:name/pause
export interface CreateQueueRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQueueResponse = ApiResponse<Queue>;

// POST /api/queue/:name/resume
export interface CreateQueueRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQueueResponse = ApiResponse<Queue>;

// POST /api/queue/:name/clean
export interface CreateQueueRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQueueResponse = ApiResponse<Queue>;

// POST /api/queue/:name/empty
export interface CreateQueueRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQueueResponse = ApiResponse<Queue>;

// POST /api/queue/:name/jobs
export interface CreateQueueRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQueueResponse = ApiResponse<Queue>;

// POST /api/queue/:name/jobs/bulk
export interface CreateQueueRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateQueueResponse = ApiResponse<Queue>;
