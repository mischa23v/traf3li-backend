/**
 * Saless API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/saless/orders
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/orders/statistics
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/orders/by-salesperson
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/orders/top-customers
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/orders/:id
export type GetSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/from-quote
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/from-lead
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/:id/confirm
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/:id/cancel
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/:id/complete
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/:id/items
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// PUT /api/saless/orders/:id/items/:itemId
export interface UpdateSalessRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalessResponse = ApiResponse<Saless>;

// DELETE /api/saless/orders/:id/items/:itemId
export type DeleteSalessResponse = ApiResponse<{ deleted: boolean }>;

// POST /api/saless/orders/:id/apply-pricing
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/:id/discount
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/:id/delivery
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/:id/invoice
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/orders/:id/payment
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// GET /api/saless/deliveries
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/deliveries/pending
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/deliveries/in-transit
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/deliveries/statistics
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/deliveries/by-carrier
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/deliveries/:id
export type GetSalessResponse = ApiResponse<Saless>;

// GET /api/saless/deliveries/:id/tracking
export type GetSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// PUT /api/saless/deliveries/:id
export interface UpdateSalessRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries/:id/start-picking
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries/:id/complete-picking
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries/:id/complete-packing
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries/:id/ship
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries/:id/tracking
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries/:id/deliver
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries/:id/failed-attempt
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries/:id/cancel
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/deliveries/:id/return-pickup
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// GET /api/saless/returns
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/returns/pending
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/returns/requiring-inspection
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/returns/statistics
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/returns/rate
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/returns/:id
export type GetSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/from-order
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/from-delivery
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/:id/submit
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/:id/approve
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/:id/reject
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/:id/receive
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/:id/inspect
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/:id/process
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/:id/complete
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/:id/schedule-pickup
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/returns/:id/return-label
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// GET /api/saless/commissions/plans
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/commissions/plans/:id
export type GetSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/plans
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// PUT /api/saless/commissions/plans/:id
export interface UpdateSalessRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/plans/:id/assign
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/calculate
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/calculate-period
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// GET /api/saless/commissions/settlements
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/commissions/settlements/pending
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/commissions/settlements/pending-payments
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/commissions/settlements/:id
export type GetSalessResponse = ApiResponse<Saless>;

// GET /api/saless/commissions/settlements/:id/statement
export type GetSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/settlements
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/settlements/:id/submit
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/settlements/:id/approve
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/settlements/:id/reject
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/settlements/:id/schedule-payment
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/settlements/:id/record-payment
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// POST /api/saless/commissions/settlements/:id/clawback
export interface CreateSalessRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateSalessResponse = ApiResponse<Saless>;

// GET /api/saless/commissions/by-salesperson
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;

// GET /api/saless/commissions/monthly-trend
export interface SalessListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type SalessListResponse = PaginatedResponse<Saless>;
