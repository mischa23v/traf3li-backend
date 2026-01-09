/**
 * Zoom API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/zoom/auth-url
export interface ZoomListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZoomListResponse = PaginatedResponse<Zoom>;

// GET /api/zoom/callback
export interface ZoomListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZoomListResponse = PaginatedResponse<Zoom>;

// POST /api/zoom/disconnect
export interface CreateZoomRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZoomResponse = ApiResponse<Zoom>;

// GET /api/zoom/status
export interface ZoomListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZoomListResponse = PaginatedResponse<Zoom>;

// POST /api/zoom/meetings
export interface CreateZoomRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZoomResponse = ApiResponse<Zoom>;

// GET /api/zoom/meetings
export interface ZoomListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZoomListResponse = PaginatedResponse<Zoom>;

// GET /api/zoom/meetings/:meetingId
export interface ZoomListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZoomListResponse = PaginatedResponse<Zoom>;

// PUT /api/zoom/meetings/:meetingId
export interface UpdateZoomRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateZoomResponse = ApiResponse<Zoom>;

// DELETE /api/zoom/meetings/:meetingId
export type DeleteZoomResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/zoom/recordings
export interface ZoomListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZoomListResponse = PaginatedResponse<Zoom>;

// GET /api/zoom/recordings/:meetingId
export interface ZoomListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ZoomListResponse = PaginatedResponse<Zoom>;

// PUT /api/zoom/settings
export interface UpdateZoomRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateZoomResponse = ApiResponse<Zoom>;

// POST /api/zoom/test
export interface CreateZoomRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZoomResponse = ApiResponse<Zoom>;

// POST /api/zoom/webhook
export interface CreateZoomRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateZoomResponse = ApiResponse<Zoom>;
