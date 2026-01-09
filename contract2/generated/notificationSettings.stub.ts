/**
 * NotificationSettings API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/notificationSettings
export interface NotificationSettingsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type NotificationSettingsListResponse = PaginatedResponse<NotificationSettings>;

// PUT /api/notificationSettings
export interface UpdateNotificationSettingsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateNotificationSettingsResponse = ApiResponse<NotificationSettings>;

// PUT /api/notificationSettings/preferences/:type
export interface UpdateNotificationSettingsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateNotificationSettingsResponse = ApiResponse<NotificationSettings>;

// POST /api/notificationSettings/mute/:type
export interface CreateNotificationSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateNotificationSettingsResponse = ApiResponse<NotificationSettings>;

// POST /api/notificationSettings/unmute/:type
export interface CreateNotificationSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateNotificationSettingsResponse = ApiResponse<NotificationSettings>;

// POST /api/notificationSettings/reset
export interface CreateNotificationSettingsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateNotificationSettingsResponse = ApiResponse<NotificationSettings>;
