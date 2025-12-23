import { Document, Types, Model } from 'mongoose';

// ═══════════════════════════════════════════════════════════════
// MODEL TYPE STUBS
// ═══════════════════════════════════════════════════════════════
// These are placeholder type definitions for Mongoose models.
// You can gradually replace these with more detailed types as needed.

// ───────────────────────────────────────────────────────────────
// INVOICE MODEL
// ───────────────────────────────────────────────────────────────
export interface ILineItem {
  type: 'time' | 'expense' | 'flat_fee' | 'product' | 'discount' | 'subtotal' | 'comment';
  date?: Date;
  description: string;
  quantity?: number;
  unitPrice?: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  lineTotal?: number;
  taxable?: boolean;
  attorneyId?: Types.ObjectId;
  activityCode?: string;
  timeEntryId?: Types.ObjectId;
  expenseId?: Types.ObjectId;
}

export interface IInstallment {
  dueDate: Date;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
  paidAmount?: number;
}

export interface IApproval {
  approverId: Types.ObjectId;
  status: 'pending' | 'approved' | 'rejected';
  date?: Date;
  notes?: string;
}

export interface IInvoice {
  _id: Types.ObjectId;
  invoiceNumber?: string;
  firmId: Types.ObjectId;
  clientId: Types.ObjectId;
  matterId?: Types.ObjectId;
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  items: ILineItem[];
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  amountPaid?: number;
  balance?: number;
  notes?: string;
  terms?: string;
  installments?: IInstallment[];
  approvals?: IApproval[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type InvoiceDocument = Document<Types.ObjectId> & IInvoice;
export type InvoiceModel = Model<InvoiceDocument>;

// ───────────────────────────────────────────────────────────────
// BILL MODEL
// ───────────────────────────────────────────────────────────────
export interface IBill {
  _id: Types.ObjectId;
  firmId: Types.ObjectId;
  vendorId: Types.ObjectId;
  billNumber?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  issueDate: Date;
  dueDate: Date;
  total: number;
  amountPaid?: number;
  balance?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BillDocument = Document<Types.ObjectId> & IBill;
export type BillModel = Model<BillDocument>;

// ───────────────────────────────────────────────────────────────
// CLIENT MODEL
// ───────────────────────────────────────────────────────────────
export interface IClient {
  _id: Types.ObjectId;
  firmId: Types.ObjectId;
  type: 'individual' | 'company';
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export type ClientDocument = Document<Types.ObjectId> & IClient;
export type ClientModel = Model<ClientDocument>;

// ───────────────────────────────────────────────────────────────
// FIRM MODEL
// ───────────────────────────────────────────────────────────────
export interface IFirm {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  licenseNumber?: string;
  status: 'active' | 'suspended' | 'inactive';
  ownerId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type FirmDocument = Document<Types.ObjectId> & IFirm;
export type FirmModel = Model<FirmDocument>;

// ───────────────────────────────────────────────────────────────
// MATTER/CASE MODEL
// ───────────────────────────────────────────────────────────────
export interface IMatter {
  _id: Types.ObjectId;
  firmId: Types.ObjectId;
  clientId: Types.ObjectId;
  name: string;
  description?: string;
  status: 'open' | 'closed' | 'pending';
  openDate?: Date;
  closeDate?: Date;
  assignedTo?: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type MatterDocument = Document<Types.ObjectId> & IMatter;
export type MatterModel = Model<MatterDocument>;

// ───────────────────────────────────────────────────────────────
// TIME ENTRY MODEL
// ───────────────────────────────────────────────────────────────
export interface ITimeEntry {
  _id: Types.ObjectId;
  firmId: Types.ObjectId;
  userId: Types.ObjectId;
  matterId?: Types.ObjectId;
  clientId?: Types.ObjectId;
  date: Date;
  hours: number;
  description?: string;
  billable: boolean;
  billed?: boolean;
  rate?: number;
  amount?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TimeEntryDocument = Document<Types.ObjectId> & ITimeEntry;
export type TimeEntryModel = Model<TimeEntryDocument>;

// ───────────────────────────────────────────────────────────────
// EXPENSE MODEL
// ───────────────────────────────────────────────────────────────
export interface IExpense {
  _id: Types.ObjectId;
  firmId: Types.ObjectId;
  userId: Types.ObjectId;
  matterId?: Types.ObjectId;
  clientId?: Types.ObjectId;
  date: Date;
  amount: number;
  description?: string;
  category?: string;
  billable: boolean;
  billed?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ExpenseDocument = Document<Types.ObjectId> & IExpense;
export type ExpenseModel = Model<ExpenseDocument>;

// ───────────────────────────────────────────────────────────────
// PAYMENT MODEL
// ───────────────────────────────────────────────────────────────
export interface IPayment {
  _id: Types.ObjectId;
  firmId: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  clientId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod?: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  reference?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PaymentDocument = Document<Types.ObjectId> & IPayment;
export type PaymentModel = Model<PaymentDocument>;

// ───────────────────────────────────────────────────────────────
// TASK MODEL
// ───────────────────────────────────────────────────────────────
export interface ITask {
  _id: Types.ObjectId;
  firmId: Types.ObjectId;
  matterId?: Types.ObjectId;
  assignedTo?: Types.ObjectId;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type TaskDocument = Document<Types.ObjectId> & ITask;
export type TaskModel = Model<TaskDocument>;

// ───────────────────────────────────────────────────────────────
// NOTIFICATION MODEL
// ───────────────────────────────────────────────────────────────
export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  firmId?: Types.ObjectId;
  type: string;
  title: string;
  message: string;
  read: boolean;
  readAt?: Date;
  data?: any;
  createdAt?: Date;
}

export type NotificationDocument = Document<Types.ObjectId> & INotification;
export type NotificationModel = Model<NotificationDocument>;

// ───────────────────────────────────────────────────────────────
// AUDIT LOG MODEL
// ───────────────────────────────────────────────────────────────
export interface IAuditLog {
  _id: Types.ObjectId;
  userId?: Types.ObjectId;
  firmId?: Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  createdAt?: Date;
}

export type AuditLogDocument = Document<Types.ObjectId> & IAuditLog;
export type AuditLogModel = Model<AuditLogDocument>;

// ───────────────────────────────────────────────────────────────
// SESSION MODEL
// ───────────────────────────────────────────────────────────────
export interface ISession {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type SessionDocument = Document<Types.ObjectId> & ISession;
export type SessionModel = Model<SessionDocument>;

// ───────────────────────────────────────────────────────────────
// VENDOR MODEL
// ───────────────────────────────────────────────────────────────
export interface IVendor {
  _id: Types.ObjectId;
  firmId: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export type VendorDocument = Document<Types.ObjectId> & IVendor;
export type VendorModel = Model<VendorDocument>;

// Make this file a module
export {};
