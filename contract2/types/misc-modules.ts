/**
 * Miscellaneous Modules API Contracts
 * Sales, Inventory, Manufacturing, Quality, Product, Reminder, Status, Assets
 */

// ============================================================================
// SALES MODULE - 75 endpoints
// ============================================================================

export namespace SalesContract {
  // Enums
  export enum OrderStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
    RETURNED = 'returned'
  }

  export enum PaymentStatus {
    UNPAID = 'unpaid',
    PARTIAL = 'partial',
    PAID = 'paid',
    REFUNDED = 'refunded'
  }

  // Interfaces
  export interface SalesOrder {
    _id: string;
    firmId: string;
    orderNumber: string;
    clientId: string;
    salespersonId: string;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    shippingAddress?: Address;
    billingAddress?: Address;
    notes?: string;
    orderDate: Date;
    expectedDelivery?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface OrderItem {
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    tax?: number;
    total: number;
  }

  export interface Address {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  }

  // Request/Response Types
  export interface GetOrdersRequest {
    page?: number;
    limit?: number;
    status?: OrderStatus;
    clientId?: string;
    salespersonId?: string;
    startDate?: string;
    endDate?: string;
  }

  export interface GetOrdersResponse {
    success: boolean;
    data: SalesOrder[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }

  export interface CreateOrderRequest {
    clientId: string;
    salespersonId?: string;
    items: Omit<OrderItem, 'total'>[];
    shippingAddress?: Address;
    billingAddress?: Address;
    notes?: string;
    discount?: number;
  }

  export interface CreateOrderResponse {
    success: boolean;
    data: SalesOrder;
  }

  export interface GetStatisticsResponse {
    success: boolean;
    data: {
      totalOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
      byStatus: Record<OrderStatus, number>;
      topProducts: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
      topSalespersons: Array<{ userId: string; name: string; orders: number; revenue: number }>;
    };
  }

  /**
   * @endpoint GET /api/sales/orders
   * @description Get all sales orders with filters
   */
  export type GetOrders = (req: GetOrdersRequest) => Promise<GetOrdersResponse>;

  /**
   * @endpoint GET /api/sales/orders/statistics
   * @description Get sales statistics and metrics
   */
  export type GetStatistics = () => Promise<GetStatisticsResponse>;

  /**
   * @endpoint GET /api/sales/orders/by-salesperson
   * @description Get orders grouped by salesperson
   */
  export type GetBySalesperson = () => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint POST /api/sales/orders
   * @description Create new sales order
   */
  export type CreateOrder = (req: CreateOrderRequest) => Promise<CreateOrderResponse>;

  /**
   * @endpoint GET /api/sales/orders/:id
   * @description Get single sales order
   */
  export type GetOrder = (id: string) => Promise<{ success: boolean; data: SalesOrder }>;

  /**
   * @endpoint PUT /api/sales/orders/:id
   * @description Update sales order
   */
  export type UpdateOrder = (id: string, data: Partial<CreateOrderRequest>) => Promise<CreateOrderResponse>;

  /**
   * @endpoint DELETE /api/sales/orders/:id
   * @description Delete sales order
   */
  export type DeleteOrder = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/sales/orders/:id/confirm
   * @description Confirm sales order
   */
  export type ConfirmOrder = (id: string) => Promise<CreateOrderResponse>;

  /**
   * @endpoint POST /api/sales/orders/:id/ship
   * @description Mark order as shipped
   */
  export type ShipOrder = (id: string, trackingInfo?: { carrier: string; trackingNumber: string }) => Promise<CreateOrderResponse>;

  /**
   * @endpoint POST /api/sales/orders/:id/deliver
   * @description Mark order as delivered
   */
  export type DeliverOrder = (id: string) => Promise<CreateOrderResponse>;

  /**
   * @endpoint POST /api/sales/orders/:id/cancel
   * @description Cancel sales order
   */
  export type CancelOrder = (id: string, reason?: string) => Promise<CreateOrderResponse>;

  /**
   * @endpoint POST /api/sales/orders/:id/return
   * @description Process order return
   */
  export type ReturnOrder = (id: string, items: Array<{ productId: string; quantity: number; reason: string }>) => Promise<CreateOrderResponse>;

  /**
   * @endpoint POST /api/sales/orders/:id/duplicate
   * @description Duplicate existing order
   */
  export type DuplicateOrder = (id: string) => Promise<CreateOrderResponse>;

  /**
   * @endpoint GET /api/sales/orders/:id/invoice
   * @description Generate invoice from order
   */
  export type GenerateInvoice = (id: string) => Promise<{ success: boolean; data: { invoiceId: string } }>;

  /**
   * @endpoint GET /api/sales/reports/revenue
   * @description Get revenue report
   */
  export type GetRevenueReport = (params: { startDate: string; endDate: string; groupBy?: 'day' | 'week' | 'month' }) => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint GET /api/sales/reports/products
   * @description Get product performance report
   */
  export type GetProductReport = () => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint GET /api/sales/reports/salespersons
   * @description Get salesperson performance report
   */
  export type GetSalespersonReport = () => Promise<{ success: boolean; data: any[] }>;
}

// ============================================================================
// INVENTORY MODULE - 38 endpoints
// ============================================================================

export namespace InventoryContract {
  // Enums
  export enum ItemStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    DISCONTINUED = 'discontinued'
  }

  export enum MovementType {
    IN = 'in',
    OUT = 'out',
    ADJUSTMENT = 'adjustment',
    TRANSFER = 'transfer'
  }

  // Interfaces
  export interface InventoryItem {
    _id: string;
    firmId: string;
    sku: string;
    name: string;
    description?: string;
    category: string;
    unitOfMeasure: string;
    quantity: number;
    reorderLevel: number;
    reorderQuantity: number;
    costPrice: number;
    sellingPrice: number;
    location?: string;
    status: ItemStatus;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface StockMovement {
    _id: string;
    itemId: string;
    type: MovementType;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    reference?: string;
    notes?: string;
    performedBy: string;
    createdAt: Date;
  }

  // Request/Response Types
  export interface GetItemsRequest {
    page?: number;
    limit?: number;
    category?: string;
    status?: ItemStatus;
    search?: string;
    lowStock?: boolean;
  }

  export interface GetItemsResponse {
    success: boolean;
    data: InventoryItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }

  export interface CreateItemRequest {
    sku: string;
    name: string;
    description?: string;
    category: string;
    unitOfMeasure: string;
    quantity: number;
    reorderLevel: number;
    reorderQuantity: number;
    costPrice: number;
    sellingPrice: number;
    location?: string;
  }

  export interface AdjustStockRequest {
    quantity: number;
    type: 'add' | 'remove' | 'set';
    reason: string;
    reference?: string;
  }

  /**
   * @endpoint GET /api/inventory/stats
   * @description Get inventory statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalItems: number; totalValue: number; lowStockCount: number; outOfStockCount: number } }>;

  /**
   * @endpoint GET /api/inventory/reports/stock-balance
   * @description Get stock balance report
   */
  export type GetStockBalanceReport = () => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint GET /api/inventory/reports/low-stock
   * @description Get low stock items report
   */
  export type GetLowStockReport = () => Promise<{ success: boolean; data: InventoryItem[] }>;

  /**
   * @endpoint GET /api/inventory/reports/movement
   * @description Get stock movement report
   */
  export type GetMovementReport = (params: { startDate: string; endDate: string; itemId?: string }) => Promise<{ success: boolean; data: StockMovement[] }>;

  /**
   * @endpoint GET /api/inventory/reports/valuation
   * @description Get inventory valuation report
   */
  export type GetValuationReport = () => Promise<{ success: boolean; data: { totalValue: number; byCategory: any[] } }>;

  /**
   * @endpoint GET /api/inventory
   * @description Get all inventory items
   */
  export type GetItems = (req: GetItemsRequest) => Promise<GetItemsResponse>;

  /**
   * @endpoint POST /api/inventory
   * @description Create inventory item
   */
  export type CreateItem = (req: CreateItemRequest) => Promise<{ success: boolean; data: InventoryItem }>;

  /**
   * @endpoint GET /api/inventory/:id
   * @description Get single inventory item
   */
  export type GetItem = (id: string) => Promise<{ success: boolean; data: InventoryItem }>;

  /**
   * @endpoint PUT /api/inventory/:id
   * @description Update inventory item
   */
  export type UpdateItem = (id: string, data: Partial<CreateItemRequest>) => Promise<{ success: boolean; data: InventoryItem }>;

  /**
   * @endpoint DELETE /api/inventory/:id
   * @description Delete inventory item
   */
  export type DeleteItem = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/inventory/:id/adjust
   * @description Adjust stock quantity
   */
  export type AdjustStock = (id: string, req: AdjustStockRequest) => Promise<{ success: boolean; data: InventoryItem }>;

  /**
   * @endpoint GET /api/inventory/:id/movements
   * @description Get stock movements for item
   */
  export type GetMovements = (id: string) => Promise<{ success: boolean; data: StockMovement[] }>;

  /**
   * @endpoint POST /api/inventory/transfer
   * @description Transfer stock between locations
   */
  export type TransferStock = (req: { itemId: string; fromLocation: string; toLocation: string; quantity: number }) => Promise<{ success: boolean; data: InventoryItem }>;

  /**
   * @endpoint GET /api/inventory/categories
   * @description Get inventory categories
   */
  export type GetCategories = () => Promise<{ success: boolean; data: string[] }>;

  /**
   * @endpoint GET /api/inventory/locations
   * @description Get inventory locations
   */
  export type GetLocations = () => Promise<{ success: boolean; data: string[] }>;

  /**
   * @endpoint POST /api/inventory/import
   * @description Import inventory items
   */
  export type ImportItems = (items: CreateItemRequest[]) => Promise<{ success: boolean; imported: number; errors: any[] }>;

  /**
   * @endpoint GET /api/inventory/export
   * @description Export inventory data
   */
  export type ExportItems = (format: 'csv' | 'xlsx') => Promise<{ success: boolean; data: Buffer }>;
}

// ============================================================================
// MANUFACTURING MODULE - 28 endpoints
// ============================================================================

export namespace ManufacturingContract {
  // Enums
  export enum WorkOrderStatus {
    DRAFT = 'draft',
    PLANNED = 'planned',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled'
  }

  export enum BOMStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    DRAFT = 'draft'
  }

  // Interfaces
  export interface WorkOrder {
    _id: string;
    firmId: string;
    orderNumber: string;
    productId: string;
    bomId: string;
    quantity: number;
    plannedStartDate: Date;
    plannedEndDate: Date;
    actualStartDate?: Date;
    actualEndDate?: Date;
    status: WorkOrderStatus;
    operations: WorkOrderOperation[];
    materials: WorkOrderMaterial[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface WorkOrderOperation {
    operationId: string;
    name: string;
    workstation: string;
    plannedTime: number;
    actualTime?: number;
    status: 'pending' | 'in_progress' | 'completed';
  }

  export interface WorkOrderMaterial {
    itemId: string;
    name: string;
    requiredQuantity: number;
    consumedQuantity: number;
    status: 'pending' | 'issued' | 'consumed';
  }

  export interface BillOfMaterials {
    _id: string;
    firmId: string;
    name: string;
    productId: string;
    version: string;
    items: BOMItem[];
    operations: BOMOperation[];
    status: BOMStatus;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface BOMItem {
    itemId: string;
    name: string;
    quantity: number;
    unitOfMeasure: string;
    wastagePercent?: number;
  }

  export interface BOMOperation {
    sequence: number;
    name: string;
    workstation: string;
    timeInMinutes: number;
    description?: string;
  }

  /**
   * @endpoint GET /api/manufacturing/stats
   * @description Get manufacturing statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalWorkOrders: number; inProgress: number; completed: number; efficiency: number } }>;

  /**
   * @endpoint GET /api/manufacturing/settings
   * @description Get manufacturing settings
   */
  export type GetSettings = () => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint PUT /api/manufacturing/settings
   * @description Update manufacturing settings
   */
  export type UpdateSettings = (data: any) => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint GET /api/manufacturing/work-orders
   * @description Get all work orders
   */
  export type GetWorkOrders = (params?: { status?: WorkOrderStatus; page?: number; limit?: number }) => Promise<{ success: boolean; data: WorkOrder[]; pagination: any }>;

  /**
   * @endpoint POST /api/manufacturing/work-orders
   * @description Create work order
   */
  export type CreateWorkOrder = (data: Partial<WorkOrder>) => Promise<{ success: boolean; data: WorkOrder }>;

  /**
   * @endpoint GET /api/manufacturing/work-orders/:id
   * @description Get single work order
   */
  export type GetWorkOrder = (id: string) => Promise<{ success: boolean; data: WorkOrder }>;

  /**
   * @endpoint PUT /api/manufacturing/work-orders/:id
   * @description Update work order
   */
  export type UpdateWorkOrder = (id: string, data: Partial<WorkOrder>) => Promise<{ success: boolean; data: WorkOrder }>;

  /**
   * @endpoint DELETE /api/manufacturing/work-orders/:id
   * @description Delete work order
   */
  export type DeleteWorkOrder = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/manufacturing/work-orders/:id/start
   * @description Start work order
   */
  export type StartWorkOrder = (id: string) => Promise<{ success: boolean; data: WorkOrder }>;

  /**
   * @endpoint POST /api/manufacturing/work-orders/:id/complete
   * @description Complete work order
   */
  export type CompleteWorkOrder = (id: string) => Promise<{ success: boolean; data: WorkOrder }>;

  /**
   * @endpoint POST /api/manufacturing/work-orders/:id/cancel
   * @description Cancel work order
   */
  export type CancelWorkOrder = (id: string, reason?: string) => Promise<{ success: boolean; data: WorkOrder }>;

  /**
   * @endpoint GET /api/manufacturing/bom
   * @description Get all bills of materials
   */
  export type GetBOMs = () => Promise<{ success: boolean; data: BillOfMaterials[] }>;

  /**
   * @endpoint POST /api/manufacturing/bom
   * @description Create bill of materials
   */
  export type CreateBOM = (data: Partial<BillOfMaterials>) => Promise<{ success: boolean; data: BillOfMaterials }>;

  /**
   * @endpoint GET /api/manufacturing/bom/:id
   * @description Get single BOM
   */
  export type GetBOM = (id: string) => Promise<{ success: boolean; data: BillOfMaterials }>;

  /**
   * @endpoint PUT /api/manufacturing/bom/:id
   * @description Update BOM
   */
  export type UpdateBOM = (id: string, data: Partial<BillOfMaterials>) => Promise<{ success: boolean; data: BillOfMaterials }>;

  /**
   * @endpoint DELETE /api/manufacturing/bom/:id
   * @description Delete BOM
   */
  export type DeleteBOM = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/manufacturing/workstations
   * @description Get workstations
   */
  export type GetWorkstations = () => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint POST /api/manufacturing/workstations
   * @description Create workstation
   */
  export type CreateWorkstation = (data: any) => Promise<{ success: boolean; data: any }>;
}

// ============================================================================
// QUALITY MODULE - 19 endpoints
// ============================================================================

export namespace QualityContract {
  // Enums
  export enum InspectionStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    PASSED = 'passed',
    FAILED = 'failed',
    ON_HOLD = 'on_hold'
  }

  export enum NonConformanceStatus {
    OPEN = 'open',
    UNDER_REVIEW = 'under_review',
    CORRECTIVE_ACTION = 'corrective_action',
    CLOSED = 'closed'
  }

  // Interfaces
  export interface QualityInspection {
    _id: string;
    firmId: string;
    inspectionNumber: string;
    type: 'incoming' | 'in_process' | 'final';
    referenceType: 'purchase' | 'work_order' | 'sales';
    referenceId: string;
    itemId: string;
    quantity: number;
    inspectedQuantity: number;
    passedQuantity: number;
    failedQuantity: number;
    status: InspectionStatus;
    inspector: string;
    checkpoints: InspectionCheckpoint[];
    notes?: string;
    inspectionDate: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface InspectionCheckpoint {
    name: string;
    specification: string;
    actualValue: string;
    passed: boolean;
    notes?: string;
  }

  export interface NonConformance {
    _id: string;
    firmId: string;
    ncrNumber: string;
    inspectionId?: string;
    itemId: string;
    quantity: number;
    description: string;
    severity: 'minor' | 'major' | 'critical';
    status: NonConformanceStatus;
    rootCause?: string;
    correctiveAction?: string;
    reportedBy: string;
    assignedTo?: string;
    dueDate?: Date;
    closedDate?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint GET /api/quality/stats
   * @description Get quality statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalInspections: number; passRate: number; openNCRs: number; criticalNCRs: number } }>;

  /**
   * @endpoint GET /api/quality/settings
   * @description Get quality settings
   */
  export type GetSettings = () => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint PUT /api/quality/settings
   * @description Update quality settings
   */
  export type UpdateSettings = (data: any) => Promise<{ success: boolean; data: any }>;

  /**
   * @endpoint GET /api/quality/inspections
   * @description Get all inspections
   */
  export type GetInspections = (params?: { status?: InspectionStatus; type?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: QualityInspection[]; pagination: any }>;

  /**
   * @endpoint POST /api/quality/inspections
   * @description Create inspection
   */
  export type CreateInspection = (data: Partial<QualityInspection>) => Promise<{ success: boolean; data: QualityInspection }>;

  /**
   * @endpoint GET /api/quality/inspections/:id
   * @description Get single inspection
   */
  export type GetInspection = (id: string) => Promise<{ success: boolean; data: QualityInspection }>;

  /**
   * @endpoint PUT /api/quality/inspections/:id
   * @description Update inspection
   */
  export type UpdateInspection = (id: string, data: Partial<QualityInspection>) => Promise<{ success: boolean; data: QualityInspection }>;

  /**
   * @endpoint POST /api/quality/inspections/:id/complete
   * @description Complete inspection
   */
  export type CompleteInspection = (id: string, results: { checkpoints: InspectionCheckpoint[] }) => Promise<{ success: boolean; data: QualityInspection }>;

  /**
   * @endpoint GET /api/quality/ncr
   * @description Get non-conformance reports
   */
  export type GetNCRs = (params?: { status?: NonConformanceStatus; severity?: string }) => Promise<{ success: boolean; data: NonConformance[] }>;

  /**
   * @endpoint POST /api/quality/ncr
   * @description Create NCR
   */
  export type CreateNCR = (data: Partial<NonConformance>) => Promise<{ success: boolean; data: NonConformance }>;

  /**
   * @endpoint GET /api/quality/ncr/:id
   * @description Get single NCR
   */
  export type GetNCR = (id: string) => Promise<{ success: boolean; data: NonConformance }>;

  /**
   * @endpoint PUT /api/quality/ncr/:id
   * @description Update NCR
   */
  export type UpdateNCR = (id: string, data: Partial<NonConformance>) => Promise<{ success: boolean; data: NonConformance }>;

  /**
   * @endpoint POST /api/quality/ncr/:id/close
   * @description Close NCR
   */
  export type CloseNCR = (id: string, resolution: { rootCause: string; correctiveAction: string }) => Promise<{ success: boolean; data: NonConformance }>;

  /**
   * @endpoint GET /api/quality/templates
   * @description Get inspection templates
   */
  export type GetTemplates = () => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint POST /api/quality/templates
   * @description Create inspection template
   */
  export type CreateTemplate = (data: any) => Promise<{ success: boolean; data: any }>;
}

// ============================================================================
// PRODUCT MODULE - 9 endpoints
// ============================================================================

export namespace ProductContract {
  // Enums
  export enum ProductStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    DISCONTINUED = 'discontinued'
  }

  export enum ProductType {
    PHYSICAL = 'physical',
    SERVICE = 'service',
    DIGITAL = 'digital'
  }

  // Interfaces
  export interface Product {
    _id: string;
    firmId: string;
    sku: string;
    name: string;
    description?: string;
    type: ProductType;
    category: string;
    price: number;
    cost?: number;
    taxRate?: number;
    status: ProductStatus;
    images?: string[];
    attributes?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
  }

  /**
   * @endpoint GET /api/product/stats
   * @description Get product statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalProducts: number; activeProducts: number; byCategory: any[] } }>;

  /**
   * @endpoint GET /api/product/search
   * @description Search products
   */
  export type Search = (params: { q: string; category?: string; status?: ProductStatus }) => Promise<{ success: boolean; data: Product[] }>;

  /**
   * @endpoint GET /api/product/category/:category
   * @description Get products by category
   */
  export type GetByCategory = (category: string) => Promise<{ success: boolean; data: Product[] }>;

  /**
   * @endpoint GET /api/product
   * @description Get all products
   */
  export type GetProducts = (params?: { page?: number; limit?: number; status?: ProductStatus }) => Promise<{ success: boolean; data: Product[]; pagination: any }>;

  /**
   * @endpoint POST /api/product
   * @description Create product
   */
  export type CreateProduct = (data: Partial<Product>) => Promise<{ success: boolean; data: Product }>;

  /**
   * @endpoint GET /api/product/:id
   * @description Get single product
   */
  export type GetProduct = (id: string) => Promise<{ success: boolean; data: Product }>;

  /**
   * @endpoint PUT /api/product/:id
   * @description Update product
   */
  export type UpdateProduct = (id: string, data: Partial<Product>) => Promise<{ success: boolean; data: Product }>;

  /**
   * @endpoint DELETE /api/product/:id
   * @description Delete product
   */
  export type DeleteProduct = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/product/categories
   * @description Get product categories
   */
  export type GetCategories = () => Promise<{ success: boolean; data: string[] }>;
}

// ============================================================================
// REMINDER MODULE - 48 endpoints
// ============================================================================

export namespace ReminderContract {
  // Enums
  export enum ReminderType {
    ONE_TIME = 'one_time',
    RECURRING = 'recurring',
    LOCATION = 'location'
  }

  export enum ReminderStatus {
    ACTIVE = 'active',
    COMPLETED = 'completed',
    SNOOZED = 'snoozed',
    CANCELLED = 'cancelled'
  }

  export enum RecurrencePattern {
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly',
    YEARLY = 'yearly',
    CUSTOM = 'custom'
  }

  // Interfaces
  export interface Reminder {
    _id: string;
    firmId: string;
    userId: string;
    title: string;
    description?: string;
    type: ReminderType;
    status: ReminderStatus;
    dueDate: Date;
    reminderTime?: Date;
    recurrence?: {
      pattern: RecurrencePattern;
      interval: number;
      endDate?: Date;
      daysOfWeek?: number[];
    };
    location?: {
      name: string;
      latitude: number;
      longitude: number;
      radius: number;
      triggerOn: 'arrive' | 'leave';
    };
    relatedTo?: {
      type: 'case' | 'client' | 'task' | 'lead';
      id: string;
    };
    priority: 'low' | 'medium' | 'high';
    notificationChannels: ('push' | 'email' | 'sms')[];
    completedAt?: Date;
    snoozedUntil?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface LocationReminder {
    _id: string;
    firmId: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    address?: string;
    reminders: Reminder[];
    createdAt: Date;
  }

  /**
   * @endpoint GET /api/reminder/location/summary
   * @description Get location reminders summary
   */
  export type GetLocationSummary = () => Promise<{ success: boolean; data: { totalLocations: number; activeReminders: number } }>;

  /**
   * @endpoint GET /api/reminder/location/locations
   * @description Get all saved locations
   */
  export type GetLocations = () => Promise<{ success: boolean; data: LocationReminder[] }>;

  /**
   * @endpoint POST /api/reminder/location
   * @description Create location-based reminder
   */
  export type CreateLocationReminder = (data: Partial<Reminder>) => Promise<{ success: boolean; data: Reminder }>;

  /**
   * @endpoint GET /api/reminder/stats
   * @description Get reminder statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { total: number; active: number; completed: number; overdue: number; byType: any } }>;

  /**
   * @endpoint GET /api/reminder/upcoming
   * @description Get upcoming reminders
   */
  export type GetUpcoming = (days?: number) => Promise<{ success: boolean; data: Reminder[] }>;

  /**
   * @endpoint GET /api/reminder/overdue
   * @description Get overdue reminders
   */
  export type GetOverdue = () => Promise<{ success: boolean; data: Reminder[] }>;

  /**
   * @endpoint GET /api/reminder/today
   * @description Get today's reminders
   */
  export type GetToday = () => Promise<{ success: boolean; data: Reminder[] }>;

  /**
   * @endpoint GET /api/reminder
   * @description Get all reminders
   */
  export type GetReminders = (params?: { status?: ReminderStatus; type?: ReminderType; page?: number; limit?: number }) => Promise<{ success: boolean; data: Reminder[]; pagination: any }>;

  /**
   * @endpoint POST /api/reminder
   * @description Create reminder
   */
  export type CreateReminder = (data: Partial<Reminder>) => Promise<{ success: boolean; data: Reminder }>;

  /**
   * @endpoint GET /api/reminder/:id
   * @description Get single reminder
   */
  export type GetReminder = (id: string) => Promise<{ success: boolean; data: Reminder }>;

  /**
   * @endpoint PUT /api/reminder/:id
   * @description Update reminder
   */
  export type UpdateReminder = (id: string, data: Partial<Reminder>) => Promise<{ success: boolean; data: Reminder }>;

  /**
   * @endpoint DELETE /api/reminder/:id
   * @description Delete reminder
   */
  export type DeleteReminder = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/reminder/:id/complete
   * @description Mark reminder as complete
   */
  export type CompleteReminder = (id: string) => Promise<{ success: boolean; data: Reminder }>;

  /**
   * @endpoint POST /api/reminder/:id/snooze
   * @description Snooze reminder
   */
  export type SnoozeReminder = (id: string, duration: number) => Promise<{ success: boolean; data: Reminder }>;

  /**
   * @endpoint POST /api/reminder/:id/cancel
   * @description Cancel reminder
   */
  export type CancelReminder = (id: string) => Promise<{ success: boolean; data: Reminder }>;

  /**
   * @endpoint POST /api/reminder/bulk-complete
   * @description Bulk complete reminders
   */
  export type BulkComplete = (ids: string[]) => Promise<{ success: boolean; updated: number }>;

  /**
   * @endpoint POST /api/reminder/bulk-delete
   * @description Bulk delete reminders
   */
  export type BulkDelete = (ids: string[]) => Promise<{ success: boolean; deleted: number }>;

  /**
   * @endpoint GET /api/reminder/calendar
   * @description Get reminders for calendar view
   */
  export type GetCalendarView = (params: { startDate: string; endDate: string }) => Promise<{ success: boolean; data: Reminder[] }>;

  /**
   * @endpoint GET /api/reminder/entity/:type/:id
   * @description Get reminders for specific entity
   */
  export type GetByEntity = (type: string, id: string) => Promise<{ success: boolean; data: Reminder[] }>;
}

// ============================================================================
// STATUS MODULE - 22 endpoints
// ============================================================================

export namespace StatusContract {
  // Enums
  export enum ComponentStatus {
    OPERATIONAL = 'operational',
    DEGRADED = 'degraded_performance',
    PARTIAL_OUTAGE = 'partial_outage',
    MAJOR_OUTAGE = 'major_outage',
    MAINTENANCE = 'under_maintenance'
  }

  export enum IncidentStatus {
    INVESTIGATING = 'investigating',
    IDENTIFIED = 'identified',
    MONITORING = 'monitoring',
    RESOLVED = 'resolved'
  }

  export enum IncidentSeverity {
    MINOR = 'minor',
    MAJOR = 'major',
    CRITICAL = 'critical'
  }

  // Interfaces
  export interface SystemComponent {
    _id: string;
    name: string;
    description?: string;
    status: ComponentStatus;
    group?: string;
    displayOrder: number;
    showOnStatusPage: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface Incident {
    _id: string;
    title: string;
    status: IncidentStatus;
    severity: IncidentSeverity;
    affectedComponents: string[];
    updates: IncidentUpdate[];
    startedAt: Date;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface IncidentUpdate {
    status: IncidentStatus;
    message: string;
    createdBy: string;
    createdAt: Date;
  }

  export interface MaintenanceWindow {
    _id: string;
    title: string;
    description?: string;
    affectedComponents: string[];
    scheduledStart: Date;
    scheduledEnd: Date;
    status: 'scheduled' | 'in_progress' | 'completed';
    createdAt: Date;
  }

  /**
   * @endpoint GET /api/status
   * @description Get overall system status
   */
  export type GetStatus = () => Promise<{ success: boolean; data: { status: ComponentStatus; components: SystemComponent[]; activeIncidents: number } }>;

  /**
   * @endpoint GET /api/status/components
   * @description Get all components
   */
  export type GetComponents = () => Promise<{ success: boolean; data: SystemComponent[] }>;

  /**
   * @endpoint GET /api/status/components/:id
   * @description Get single component
   */
  export type GetComponent = (id: string) => Promise<{ success: boolean; data: SystemComponent }>;

  /**
   * @endpoint POST /api/status/components
   * @description Create component
   */
  export type CreateComponent = (data: Partial<SystemComponent>) => Promise<{ success: boolean; data: SystemComponent }>;

  /**
   * @endpoint PUT /api/status/components/:id
   * @description Update component
   */
  export type UpdateComponent = (id: string, data: Partial<SystemComponent>) => Promise<{ success: boolean; data: SystemComponent }>;

  /**
   * @endpoint DELETE /api/status/components/:id
   * @description Delete component
   */
  export type DeleteComponent = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/status/incidents
   * @description Get all incidents
   */
  export type GetIncidents = (params?: { status?: IncidentStatus; page?: number; limit?: number }) => Promise<{ success: boolean; data: Incident[]; pagination: any }>;

  /**
   * @endpoint POST /api/status/incidents
   * @description Create incident
   */
  export type CreateIncident = (data: Partial<Incident>) => Promise<{ success: boolean; data: Incident }>;

  /**
   * @endpoint GET /api/status/incidents/:id
   * @description Get single incident
   */
  export type GetIncident = (id: string) => Promise<{ success: boolean; data: Incident }>;

  /**
   * @endpoint PUT /api/status/incidents/:id
   * @description Update incident
   */
  export type UpdateIncident = (id: string, data: Partial<Incident>) => Promise<{ success: boolean; data: Incident }>;

  /**
   * @endpoint POST /api/status/incidents/:id/update
   * @description Add update to incident
   */
  export type AddIncidentUpdate = (id: string, update: { status: IncidentStatus; message: string }) => Promise<{ success: boolean; data: Incident }>;

  /**
   * @endpoint POST /api/status/incidents/:id/resolve
   * @description Resolve incident
   */
  export type ResolveIncident = (id: string, message?: string) => Promise<{ success: boolean; data: Incident }>;

  /**
   * @endpoint GET /api/status/maintenance
   * @description Get maintenance windows
   */
  export type GetMaintenance = () => Promise<{ success: boolean; data: MaintenanceWindow[] }>;

  /**
   * @endpoint POST /api/status/maintenance
   * @description Schedule maintenance
   */
  export type CreateMaintenance = (data: Partial<MaintenanceWindow>) => Promise<{ success: boolean; data: MaintenanceWindow }>;

  /**
   * @endpoint PUT /api/status/maintenance/:id
   * @description Update maintenance
   */
  export type UpdateMaintenance = (id: string, data: Partial<MaintenanceWindow>) => Promise<{ success: boolean; data: MaintenanceWindow }>;

  /**
   * @endpoint DELETE /api/status/maintenance/:id
   * @description Cancel maintenance
   */
  export type CancelMaintenance = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/status/history
   * @description Get status history
   */
  export type GetHistory = (days?: number) => Promise<{ success: boolean; data: { date: string; status: ComponentStatus }[] }>;

  /**
   * @endpoint GET /api/status/uptime
   * @description Get uptime metrics
   */
  export type GetUptime = (componentId?: string) => Promise<{ success: boolean; data: { last30Days: number; last90Days: number; lastYear: number } }>;

  /**
   * @endpoint POST /api/status/subscribe
   * @description Subscribe to status updates
   */
  export type Subscribe = (data: { email: string; components?: string[] }) => Promise<{ success: boolean; message: string }>;
}

// ============================================================================
// ASSETS MODULE - 21 endpoints
// ============================================================================

export namespace AssetsContract {
  // Enums
  export enum AssetStatus {
    AVAILABLE = 'available',
    IN_USE = 'in_use',
    MAINTENANCE = 'maintenance',
    RETIRED = 'retired',
    DISPOSED = 'disposed'
  }

  export enum AssetType {
    EQUIPMENT = 'equipment',
    FURNITURE = 'furniture',
    VEHICLE = 'vehicle',
    IT_EQUIPMENT = 'it_equipment',
    SOFTWARE = 'software',
    OTHER = 'other'
  }

  // Interfaces
  export interface Asset {
    _id: string;
    firmId: string;
    assetTag: string;
    name: string;
    description?: string;
    type: AssetType;
    category: string;
    status: AssetStatus;
    purchaseDate: Date;
    purchasePrice: number;
    currentValue?: number;
    depreciationRate?: number;
    warrantyExpiry?: Date;
    location?: string;
    assignedTo?: string;
    serialNumber?: string;
    manufacturer?: string;
    model?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface AssetCategory {
    _id: string;
    firmId: string;
    name: string;
    type: AssetType;
    depreciationRate?: number;
    usefulLife?: number;
  }

  export interface AssetAssignmentHistory {
    _id: string;
    assetId: string;
    assignedTo: string;
    assignedBy: string;
    assignedAt: Date;
    returnedAt?: Date;
    notes?: string;
  }

  /**
   * @endpoint GET /api/assets/stats
   * @description Get asset statistics
   */
  export type GetStats = () => Promise<{ success: boolean; data: { totalAssets: number; totalValue: number; byStatus: any; byType: any } }>;

  /**
   * @endpoint GET /api/assets/categories
   * @description Get asset categories
   */
  export type GetCategories = () => Promise<{ success: boolean; data: AssetCategory[] }>;

  /**
   * @endpoint POST /api/assets/categories
   * @description Create asset category
   */
  export type CreateCategory = (data: Partial<AssetCategory>) => Promise<{ success: boolean; data: AssetCategory }>;

  /**
   * @endpoint PUT /api/assets/categories/:id
   * @description Update category
   */
  export type UpdateCategory = (id: string, data: Partial<AssetCategory>) => Promise<{ success: boolean; data: AssetCategory }>;

  /**
   * @endpoint DELETE /api/assets/categories/:id
   * @description Delete category
   */
  export type DeleteCategory = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint GET /api/assets
   * @description Get all assets
   */
  export type GetAssets = (params?: { status?: AssetStatus; type?: AssetType; category?: string; page?: number; limit?: number }) => Promise<{ success: boolean; data: Asset[]; pagination: any }>;

  /**
   * @endpoint POST /api/assets
   * @description Create asset
   */
  export type CreateAsset = (data: Partial<Asset>) => Promise<{ success: boolean; data: Asset }>;

  /**
   * @endpoint GET /api/assets/:id
   * @description Get single asset
   */
  export type GetAsset = (id: string) => Promise<{ success: boolean; data: Asset }>;

  /**
   * @endpoint PUT /api/assets/:id
   * @description Update asset
   */
  export type UpdateAsset = (id: string, data: Partial<Asset>) => Promise<{ success: boolean; data: Asset }>;

  /**
   * @endpoint DELETE /api/assets/:id
   * @description Delete asset
   */
  export type DeleteAsset = (id: string) => Promise<{ success: boolean; message: string }>;

  /**
   * @endpoint POST /api/assets/:id/assign
   * @description Assign asset to user
   */
  export type AssignAsset = (id: string, data: { userId: string; notes?: string }) => Promise<{ success: boolean; data: Asset }>;

  /**
   * @endpoint POST /api/assets/:id/return
   * @description Return assigned asset
   */
  export type ReturnAsset = (id: string, notes?: string) => Promise<{ success: boolean; data: Asset }>;

  /**
   * @endpoint GET /api/assets/:id/history
   * @description Get asset assignment history
   */
  export type GetHistory = (id: string) => Promise<{ success: boolean; data: AssetAssignmentHistory[] }>;

  /**
   * @endpoint POST /api/assets/:id/maintenance
   * @description Log maintenance for asset
   */
  export type LogMaintenance = (id: string, data: { type: string; description: string; cost?: number; nextDate?: Date }) => Promise<{ success: boolean; data: Asset }>;

  /**
   * @endpoint POST /api/assets/:id/dispose
   * @description Dispose asset
   */
  export type DisposeAsset = (id: string, data: { reason: string; method: string; proceeds?: number }) => Promise<{ success: boolean; data: Asset }>;

  /**
   * @endpoint GET /api/assets/depreciation/report
   * @description Get depreciation report
   */
  export type GetDepreciationReport = () => Promise<{ success: boolean; data: any[] }>;

  /**
   * @endpoint GET /api/assets/warranty/expiring
   * @description Get assets with expiring warranty
   */
  export type GetExpiringWarranty = (days?: number) => Promise<{ success: boolean; data: Asset[] }>;

  /**
   * @endpoint GET /api/assets/user/:userId
   * @description Get assets assigned to user
   */
  export type GetByUser = (userId: string) => Promise<{ success: boolean; data: Asset[] }>;

  /**
   * @endpoint POST /api/assets/import
   * @description Import assets
   */
  export type ImportAssets = (assets: Partial<Asset>[]) => Promise<{ success: boolean; imported: number; errors: any[] }>;

  /**
   * @endpoint GET /api/assets/export
   * @description Export assets
   */
  export type ExportAssets = (format: 'csv' | 'xlsx') => Promise<{ success: boolean; data: Buffer }>;
}

// Export all contracts
export {
  SalesContract,
  InventoryContract,
  ManufacturingContract,
  QualityContract,
  ProductContract,
  ReminderContract,
  StatusContract,
  AssetsContract
};
