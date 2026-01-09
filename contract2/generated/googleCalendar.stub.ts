/**
 * GoogleCalendar API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/googleCalendar/auth
export interface GoogleCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GoogleCalendarListResponse = PaginatedResponse<GoogleCalendar>;

// GET /api/googleCalendar/callback
export interface GoogleCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GoogleCalendarListResponse = PaginatedResponse<GoogleCalendar>;

// POST /api/googleCalendar/disconnect
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// GET /api/googleCalendar/status
export interface GoogleCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GoogleCalendarListResponse = PaginatedResponse<GoogleCalendar>;

// GET /api/googleCalendar/calendars
export interface GoogleCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GoogleCalendarListResponse = PaginatedResponse<GoogleCalendar>;

// GET /api/googleCalendar/calendars/:calendarId/events
export interface GoogleCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GoogleCalendarListResponse = PaginatedResponse<GoogleCalendar>;

// POST /api/googleCalendar/calendars/:calendarId/events
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// PUT /api/googleCalendar/calendars/:calendarId/events/:eventId
export interface UpdateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// DELETE /api/googleCalendar/calendars/:calendarId/events/:eventId
export type DeleteGoogleCalendarResponse = ApiResponse<{ deleted: boolean }>;

// PUT /api/googleCalendar/settings/calendars
export interface UpdateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// PUT /api/googleCalendar/settings/show-external-events
export interface UpdateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// POST /api/googleCalendar/watch/:calendarId
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// DELETE /api/googleCalendar/watch/:channelId
export type DeleteGoogleCalendarResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/googleCalendar/sync/import
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// POST /api/googleCalendar/import
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// POST /api/googleCalendar/sync/export/:eventId
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// POST /api/googleCalendar/export
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// POST /api/googleCalendar/sync/auto/enable
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// POST /api/googleCalendar/sync/auto/disable
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;

// GET /api/googleCalendar/sync/settings
export interface GoogleCalendarListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type GoogleCalendarListResponse = PaginatedResponse<GoogleCalendar>;

// POST /api/googleCalendar/webhook
export interface CreateGoogleCalendarRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateGoogleCalendarResponse = ApiResponse<GoogleCalendar>;
