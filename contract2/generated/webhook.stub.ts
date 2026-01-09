/**
 * Webhook API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/webhook/stats
export interface WebhookListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WebhookListResponse = PaginatedResponse<Webhook>;

// GET /api/webhook/events
export interface WebhookListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WebhookListResponse = PaginatedResponse<Webhook>;

// POST /api/webhook
export interface CreateWebhookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebhookResponse = ApiResponse<Webhook>;

// GET /api/webhook
export interface WebhookListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WebhookListResponse = PaginatedResponse<Webhook>;

// GET /api/webhook/:id
export type GetWebhookResponse = ApiResponse<Webhook>;

// PUT /api/webhook/:id
export interface UpdateWebhookRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateWebhookResponse = ApiResponse<Webhook>;

// PATCH /api/webhook/:id
export interface UpdateWebhookRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateWebhookResponse = ApiResponse<Webhook>;

// DELETE /api/webhook/:id
export type DeleteWebhookResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/webhook/:id/test
export interface CreateWebhookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebhookResponse = ApiResponse<Webhook>;

// POST /api/webhook/:id/enable
export interface CreateWebhookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebhookResponse = ApiResponse<Webhook>;

// POST /api/webhook/:id/disable
export interface CreateWebhookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebhookResponse = ApiResponse<Webhook>;

// GET /api/webhook/:id/secret
export type GetWebhookResponse = ApiResponse<Webhook>;

// POST /api/webhook/:id/regenerate-secret
export interface CreateWebhookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebhookResponse = ApiResponse<Webhook>;

// GET /api/webhook/:id/deliveries
export type GetWebhookResponse = ApiResponse<Webhook>;

// GET /api/webhook/:id/deliveries/:deliveryId
export type GetWebhookResponse = ApiResponse<Webhook>;

// POST /api/webhook/:id/deliveries/:deliveryId/retry
export interface CreateWebhookRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWebhookResponse = ApiResponse<Webhook>;
