/**
 * Integrations API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/integrations/quickbooks/auth
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// GET /api/integrations/quickbooks/callback
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// POST /api/integrations/quickbooks/disconnect
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/quickbooks/status
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// POST /api/integrations/quickbooks/refresh-token
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/quickbooks/sync/all
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/quickbooks/sync/invoices
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/quickbooks/sync/customers
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/quickbooks/sync/vendors
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/quickbooks/sync/accounts
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/quickbooks/sync/payments
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/quickbooks/sync/expenses
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/quickbooks/sync/history
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// GET /api/integrations/quickbooks/mappings/fields
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// PUT /api/integrations/quickbooks/mappings/fields
export interface UpdateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/quickbooks/mappings/accounts
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// PUT /api/integrations/quickbooks/mappings/accounts
export interface UpdateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/quickbooks/conflicts
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// POST /api/integrations/quickbooks/conflicts/:conflictId/resolve
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/quickbooks/conflicts/bulk-resolve
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/xero/auth
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// GET /api/integrations/xero/callback
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// POST /api/integrations/xero/disconnect
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/xero/status
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// POST /api/integrations/xero/refresh-token
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/xero/sync/all
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/xero/sync/invoices
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/xero/sync/contacts
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/xero/sync/accounts
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/xero/sync/payments
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/xero/sync/expenses
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/xero/sync/history
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// POST /api/integrations/xero/webhook
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/xero/webhook/status
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// GET /api/integrations/discord/auth-url
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// GET /api/integrations/discord/callback
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// POST /api/integrations/discord/complete-setup
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/discord/status
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// POST /api/integrations/discord/disconnect
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/discord/test
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// GET /api/integrations/discord/guilds
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// GET /api/integrations/discord/guilds/:guildId/channels
export interface IntegrationsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type IntegrationsListResponse = PaginatedResponse<Integrations>;

// PUT /api/integrations/discord/settings
export interface UpdateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/discord/message
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;

// POST /api/integrations/discord/webhook
export interface CreateIntegrationsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateIntegrationsResponse = ApiResponse<Integrations>;
