/**
 * Payment API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Payment } from './models';

// Standard Response Types
export type PaymentResponse = ApiResponse<Payment>;
export type PaymentListResponse = PaginatedResponse<Payment>;

// From: createPaymentSchema
export interface CreatePaymentRequest {
  clientId: string;
  amount: number;
  paymentMethod: '...paymentMethods';
  status?: '...paymentStatuses';
  referenceNumber: string;
  paymentDate: string;
  notes: string;
  checkNumber: string;
  checkDate: string;
  bankName: string;
  invoices: any[];
  invoiceId: string;
  amount: number;
  metadata: Record<string, any>;
}

// From: updatePaymentSchema
export interface UpdatePaymentRequest {
  amount: number;
  paymentMethod: '...paymentMethods';
  status: '...paymentStatuses';
  referenceNumber: string;
  paymentDate: string;
  notes: string;
  checkNumber: string;
  checkDate: string;
  bankName: string;
  metadata: Record<string, any>;
}

// From: applyPaymentSchema
export interface ApplyPaymentRequest {
  invoices: any[];
  invoiceId: string;
  amount: number;
}

// From: createRefundSchema
export interface CreateRefundRequest {
  amount: number;
  reason: string;
  refundMethod: '...paymentMethods';
  refundDate: string;
  notes: string;
}

// From: updateCheckStatusSchema
export interface UpdateCheckStatusRequest {
  status: '...checkStatuses';
  statusDate?: string;
  notes: string;
  bounceReason: string;
}

// From: reconcilePaymentSchema
export interface ReconcilePaymentRequest {
  bankTransactionId: string;
  reconciledDate?: string;
  notes: string;
}

// From: paymentQuerySchema
export interface PaymentQueryRequest {
  clientId: string;
  method: '...paymentMethods';
  status: '...paymentStatuses';
  startDate: string;
  endDate: string;
  minAmount: number;
  maxAmount: number;
  search: string;
  page?: number;
  limit?: number;
  sortBy: string;
  sortOrder: string;
}

// From: bulkDeleteSchema
export interface BulkDeleteRequest {
  ids: any[];
}

// From: sendReceiptSchema
export interface SendReceiptRequest {
  email?: string;
  includeDetails?: boolean;
}

// From: recordInvoicePaymentSchema
export interface RecordInvoicePaymentRequest {
  amount: number;
  paymentMethod?: '...paymentMethods';
  transactionId?: string;
  notes?: string;
}
