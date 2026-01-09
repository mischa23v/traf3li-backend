/**
 * Invoice API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Invoice } from './models';

// Standard Response Types
export type InvoiceResponse = ApiResponse<Invoice>;
export type InvoiceListResponse = PaginatedResponse<Invoice>;

// From: invoiceItemSchema
export interface InvoiceItemRequest {
  description: string;
  quantity?: number;
  rate: number;
  taxable?: boolean;
}

// From: createInvoiceSchema
export interface CreateInvoiceRequest {
  clientId: string;
  items: InvoiceItemItem[];
  dueDate: string;
  issueDate?: string;
  notes?: string;
  vatRate?: number;
  caseId?: string;
  paymentTerms: string;
  currency?: string;
  discountValue?: number;
  discountType: string;
}

// From: updateInvoiceSchema
export interface UpdateInvoiceRequest {
  clientId: string;
  items: InvoiceItemItem[];
  dueDate: string;
  issueDate: string;
  notes?: string;
  vatRate: number;
  status: string;
  caseId?: string;
  paymentTerms: string;
  currency: string;
  discountValue: number;
  discountType: string;
}

// From: sendInvoiceSchema
export interface SendInvoiceRequest {
  email: string;
  message?: string;
  subject: string;
  ccRecipients: any[];
}

// From: recordPaymentSchema
export interface RecordPaymentRequest {
  amount: number;
  method: string;
  reference?: string;
  transactionId: string;
  paymentDate?: string;
  notes?: string;
  bankAccountId: string;
}
