/**
 * Pdfme API Contracts
 * Auto-generated from Joi validators
 * Generated: 2026-01-09
 */

import { ApiResponse, PaginatedResponse } from './common';
import { Pdfme } from './models';

// Standard Response Types
export type PdfmeResponse = ApiResponse<Pdfme>;
export type PdfmeListResponse = PaginatedResponse<Pdfme>;

// From: schemaFieldSchema
export interface SchemaFieldRequest {
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontColor: string;
  alignment: string;
  readOnly: boolean;
  content?: string;
  lineHeight: number;
  color: string;
}

// From: fontSchema
export interface FontRequest {
  name: string;
  data: string;
  fallback?: boolean;
  subset?: boolean;
}

// From: createTemplateSchema
export interface CreateTemplateRequest {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  category: '...VALID_CATEGORIES';
  type?: '...VALID_TYPES';
  basePdf?: string;
  schemas?: SchemaFieldItem[];
  fonts: FontItem[];
  isDefault?: boolean;
  isActive?: boolean;
  sampleInputs?: Record<string, any>;
}

// From: updateTemplateSchema
export interface UpdateTemplateRequest {
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  category: '...VALID_CATEGORIES';
  type: '...VALID_TYPES';
  basePdf: string;
  schemas: SchemaFieldItem[];
  fonts: FontItem[];
  isDefault: boolean;
  isActive: boolean;
  sampleInputs?: Record<string, any>;
}

// From: cloneTemplateSchema
export interface CloneTemplateRequest {
  name: string;
  nameAr?: string;
}

// From: generatePdfSchema
export interface GeneratePdfRequest {
  basePdf: string;
  schemas: SchemaFieldItem[];
  inputs: any;
  type?: string;
}

// From: generatePdfAsyncSchema
export interface GeneratePdfAsyncRequest {
  basePdf: string;
  schemas: SchemaFieldItem[];
  inputs: any;
  type?: string;
  priority?: number;
}

// From: invoiceDataSchema
export interface InvoiceDataRequest {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  name: string;
  fullName: string;
  address: string;
  phone: string;
  email: string;
  vatNumber: string;
  lawyer: Record<string, any>;
  firm: Record<string, any>;
  items: any[];
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency?: string;
  notes?: string;
  paymentTerms?: string;
  bankDetails?: string;
}

// From: generateInvoicePdfSchema
export interface GenerateInvoicePdfRequest {
  includeQR?: boolean;
  qrData: string;
  then: string;
  otherwise?: string;
}

// From: contractDataSchema
export interface ContractDataRequest {
  contractNumber: string;
  title: string;
  date: string;
  effectiveDate: string;
  expiryDate: string;
  parties: any[];
  name: string;
  role: string;
  content: string;
  terms: string;
  signatures: any[];
}

// From: receiptDataSchema
export interface ReceiptDataRequest {
  receiptNumber: string;
  date: string;
  name: string;
  name: string;
  amount: number;
  currency?: string;
  paymentMethod: string;
  description?: string;
  invoiceRef?: string;
}

// From: previewTemplateSchema
export interface PreviewTemplateRequest {
  inputs?: Record<string, any>;
}

// From: listTemplatesQuerySchema
export interface ListTemplatesQueryRequest {
  category: '...VALID_CATEGORIES';
  type: '...VALID_TYPES';
  isActive: string;
  limit?: number;
  skip?: number;
  sort: string;
  order: string;
}
