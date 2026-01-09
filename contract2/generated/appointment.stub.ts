/**
 * Appointment API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/appointment/book/:firmId
export interface CreateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppointmentResponse = ApiResponse<Appointment>;

// GET /api/appointment/available-slots
export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppointmentListResponse = PaginatedResponse<Appointment>;

// GET /api/appointment/:id/calendar.ics
export type GetAppointmentResponse = ApiResponse<Appointment>;

// GET /api/appointment/availability
export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppointmentListResponse = PaginatedResponse<Appointment>;

// POST /api/appointment/availability
export interface CreateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppointmentResponse = ApiResponse<Appointment>;

// POST /api/appointment/availability/bulk
export interface CreateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppointmentResponse = ApiResponse<Appointment>;

// PUT /api/appointment/availability/:id
export interface UpdateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAppointmentResponse = ApiResponse<Appointment>;

// DELETE /api/appointment/availability/:id
export type DeleteAppointmentResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/appointment/blocked-times
export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppointmentListResponse = PaginatedResponse<Appointment>;

// POST /api/appointment/blocked-times
export interface CreateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppointmentResponse = ApiResponse<Appointment>;

// DELETE /api/appointment/blocked-times/:id
export type DeleteAppointmentResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/appointment/settings
export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppointmentListResponse = PaginatedResponse<Appointment>;

// PUT /api/appointment/settings
export interface UpdateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAppointmentResponse = ApiResponse<Appointment>;

// GET /api/appointment/stats
export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppointmentListResponse = PaginatedResponse<Appointment>;

// GET /api/appointment/debug
export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppointmentListResponse = PaginatedResponse<Appointment>;

// GET /api/appointment/calendar-status
export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppointmentListResponse = PaginatedResponse<Appointment>;

// GET /api/appointment/:id/calendar-links
export type GetAppointmentResponse = ApiResponse<Appointment>;

// POST /api/appointment/:id/sync-calendar
export interface CreateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppointmentResponse = ApiResponse<Appointment>;

// GET /api/appointment
export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppointmentListResponse = PaginatedResponse<Appointment>;

// GET /api/appointment/slots
export interface AppointmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type AppointmentListResponse = PaginatedResponse<Appointment>;

// GET /api/appointment/:id
export type GetAppointmentResponse = ApiResponse<Appointment>;

// POST /api/appointment
export interface CreateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppointmentResponse = ApiResponse<Appointment>;

// PUT /api/appointment/:id
export interface UpdateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAppointmentResponse = ApiResponse<Appointment>;

// PUT /api/appointment/:id/confirm
export interface UpdateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAppointmentResponse = ApiResponse<Appointment>;

// PUT /api/appointment/:id/complete
export interface UpdateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAppointmentResponse = ApiResponse<Appointment>;

// PUT /api/appointment/:id/no-show
export interface UpdateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateAppointmentResponse = ApiResponse<Appointment>;

// POST /api/appointment/:id/reschedule
export interface CreateAppointmentRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateAppointmentResponse = ApiResponse<Appointment>;

// DELETE /api/appointment/:id
export type DeleteAppointmentResponse = ApiResponse<{ deleted: boolean }>;
