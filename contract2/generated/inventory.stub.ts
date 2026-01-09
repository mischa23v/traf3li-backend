/**
 * Inventory API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/inventory/stats
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// GET /api/inventory/reports/stock-balance
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// GET /api/inventory/reports/low-stock
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// GET /api/inventory/reports/stock-movement
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// GET /api/inventory/item-groups
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// POST /api/inventory/item-groups
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/uom
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// POST /api/inventory/uom
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/price-lists
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// GET /api/inventory/item-prices
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// GET /api/inventory/settings
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// PUT /api/inventory/settings
export interface UpdateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/items
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// POST /api/inventory/items
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/items/:id
export type GetInventoryResponse = ApiResponse<Inventory>;

// PUT /api/inventory/items/:id
export interface UpdateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateInventoryResponse = ApiResponse<Inventory>;

// DELETE /api/inventory/items/:id
export type DeleteInventoryResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/inventory/items/:id/stock
export type GetInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/warehouses
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// POST /api/inventory/warehouses
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/warehouses/:id
export type GetInventoryResponse = ApiResponse<Inventory>;

// PUT /api/inventory/warehouses/:id
export interface UpdateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateInventoryResponse = ApiResponse<Inventory>;

// DELETE /api/inventory/warehouses/:id
export type DeleteInventoryResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/inventory/warehouses/:id/stock
export type GetInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/stock-entries
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// POST /api/inventory/stock-entries
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/stock-entries/:id
export type GetInventoryResponse = ApiResponse<Inventory>;

// POST /api/inventory/stock-entries/:id/submit
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// POST /api/inventory/stock-entries/:id/cancel
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// DELETE /api/inventory/stock-entries/:id
export type DeleteInventoryResponse = ApiResponse<{ deleted: boolean }>;

// GET /api/inventory/stock-ledger
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// GET /api/inventory/batches
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// POST /api/inventory/batches
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/serial-numbers
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// POST /api/inventory/serial-numbers
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// GET /api/inventory/reconciliations
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type InventoryListResponse = PaginatedResponse<Inventory>;

// POST /api/inventory/reconciliations
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;

// POST /api/inventory/reconciliations/:id/submit
export interface CreateInventoryRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateInventoryResponse = ApiResponse<Inventory>;
