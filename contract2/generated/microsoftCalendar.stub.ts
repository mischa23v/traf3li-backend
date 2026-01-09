/**
 * MicrosoftCalendar API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/microsoftCalendar/auth
export interface MicrosoftCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MicrosoftCalendarListResponse = PaginatedResponse<MicrosoftCalendar>;

// GET /api/microsoftCalendar/callback
export interface MicrosoftCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MicrosoftCalendarListResponse = PaginatedResponse<MicrosoftCalendar>;

// POST /api/microsoftCalendar/refresh-token
export interface CreateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// POST /api/microsoftCalendar/disconnect
export interface CreateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// GET /api/microsoftCalendar/status
export interface MicrosoftCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MicrosoftCalendarListResponse = PaginatedResponse<MicrosoftCalendar>;

// GET /api/microsoftCalendar/calendars
export interface MicrosoftCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MicrosoftCalendarListResponse = PaginatedResponse<MicrosoftCalendar>;

// GET /api/microsoftCalendar/events
export interface MicrosoftCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MicrosoftCalendarListResponse = PaginatedResponse<MicrosoftCalendar>;

// POST /api/microsoftCalendar/events
export interface CreateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// PUT /api/microsoftCalendar/events/:eventId
export interface UpdateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// DELETE /api/microsoftCalendar/events/:eventId
export type DeleteMicrosoftCalendarResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/microsoftCalendar/sync/from-microsoft
export interface CreateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// POST /api/microsoftCalendar/import
export interface CreateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// POST /api/microsoftCalendar/sync/to-microsoft/:eventId
export interface CreateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// POST /api/microsoftCalendar/export
export interface CreateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// POST /api/microsoftCalendar/sync/enable-auto-sync
export interface CreateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// POST /api/microsoftCalendar/sync/disable-auto-sync
export interface CreateMicrosoftCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateMicrosoftCalendarResponse = ApiResponse<MicrosoftCalendar>;

// GET /api/microsoftCalendar/sync/settings
export interface MicrosoftCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type MicrosoftCalendarListResponse = PaginatedResponse<MicrosoftCalendar>;
