/**
 * Whatsapp API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// POST /api/whatsapp/send/template
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/send/text
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/send/media
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/send/location
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/messages/send
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// GET /api/whatsapp/conversations/:id/messages
export type GetWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/conversations/:id/read
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// PUT /api/whatsapp/conversations/:id/assign
export interface UpdateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/conversations/:id/link-lead
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/conversations/:id/create-lead
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/templates/:id/submit
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// GET /api/whatsapp/analytics
export interface WhatsappListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WhatsappListResponse = PaginatedResponse<Whatsapp>;

// GET /api/whatsapp/stats
export interface WhatsappListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WhatsappListResponse = PaginatedResponse<Whatsapp>;

// GET /api/whatsapp/broadcasts/stats
export interface WhatsappListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type WhatsappListResponse = PaginatedResponse<Whatsapp>;

// POST /api/whatsapp/broadcasts/:id/duplicate
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/broadcasts/:id/recipients
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// DELETE /api/whatsapp/broadcasts/:id/recipients
export type DeleteWhatsappResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/whatsapp/broadcasts/:id/schedule
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/broadcasts/:id/send
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/broadcasts/:id/pause
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/broadcasts/:id/resume
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/broadcasts/:id/cancel
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;

// GET /api/whatsapp/broadcasts/:id/analytics
export type GetWhatsappResponse = ApiResponse<Whatsapp>;

// POST /api/whatsapp/broadcasts/:id/test
export interface CreateWhatsappRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateWhatsappResponse = ApiResponse<Whatsapp>;
