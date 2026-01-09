/**
 * Products API Contracts
 * Auto-generated stub - fill in request/response types
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';

// GET /api/products/stats
export interface ProductsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ProductsListResponse = PaginatedResponse<Products>;

// GET /api/products/search
export interface ProductsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ProductsListResponse = PaginatedResponse<Products>;

// GET /api/products/category/:category
export interface ProductsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ProductsListResponse = PaginatedResponse<Products>;

// PUT /api/products/bulk-prices
export interface UpdateProductsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateProductsResponse = ApiResponse<Products>;

// GET /api/products
export interface ProductsListParams {
  page?: number;
  limit?: number;
  search?: string;
  // TODO: Add filters
}
export type ProductsListResponse = PaginatedResponse<Products>;

// POST /api/products
export interface CreateProductsRequest {
  // TODO: Add fields from controller ALLOWED_FIELDS
}
export type CreateProductsResponse = ApiResponse<Products>;

// GET /api/products/:id
export type GetProductsResponse = ApiResponse<Products>;

// PUT /api/products/:id
export interface UpdateProductsRequest {
  // TODO: Add fields from controller ALLOWED_UPDATE_FIELDS
}
export type UpdateProductsResponse = ApiResponse<Products>;

// DELETE /api/products/:id
export type DeleteProductsResponse = ApiResponse<{ deleted: boolean }>;
