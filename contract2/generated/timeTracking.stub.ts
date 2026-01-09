/**
 * TimeTracking API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/timeTracking/timer/start
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/timer/pause
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/timer/resume
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/timer/stop
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// GET /api/timeTracking/timer/status
export interface TimeTrackingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TimeTrackingListResponse = PaginatedResponse<TimeTracking>;

// GET /api/timeTracking/weekly
export interface TimeTrackingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TimeTrackingListResponse = PaginatedResponse<TimeTracking>;

// GET /api/timeTracking/stats
export interface TimeTrackingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TimeTrackingListResponse = PaginatedResponse<TimeTracking>;

// GET /api/timeTracking/unbilled
export interface TimeTrackingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TimeTrackingListResponse = PaginatedResponse<TimeTracking>;

// GET /api/timeTracking/activity-codes
export interface TimeTrackingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TimeTrackingListResponse = PaginatedResponse<TimeTracking>;

// DELETE /api/timeTracking/entries/bulk
export type DeleteTimeTrackingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/timeTracking/entries/bulk-approve
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/bulk-reject
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/bulk-submit
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/bulk-lock
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// GET /api/timeTracking/entries/pending-approval
export interface TimeTrackingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TimeTrackingListResponse = PaginatedResponse<TimeTracking>;

// POST /api/timeTracking/entries
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// GET /api/timeTracking/entries
export interface TimeTrackingListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type TimeTrackingListResponse = PaginatedResponse<TimeTracking>;

// GET /api/timeTracking/entries/:id
export type GetTimeTrackingResponse = ApiResponse<TimeTracking>;

// PATCH /api/timeTracking/entries/:id
export interface UpdateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTimeTrackingResponse = ApiResponse<TimeTracking>;

// PUT /api/timeTracking/entries/:id
export interface UpdateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateTimeTrackingResponse = ApiResponse<TimeTracking>;

// DELETE /api/timeTracking/entries/:id
export type DeleteTimeTrackingResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/timeTracking/entries/:id/write-off
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/:id/write-down
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/:id/submit
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/:id/request-changes
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/:id/approve
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/:id/reject
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/:id/lock
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;

// POST /api/timeTracking/entries/:id/unlock
export interface CreateTimeTrackingRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateTimeTrackingResponse = ApiResponse<TimeTracking>;
