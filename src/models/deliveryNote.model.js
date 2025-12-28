/**
 * Delivery Note Model - Enterprise Gold Standard
 *
 * Complete delivery/shipment management with:
 * - Multi-step delivery process (pick → pack → ship → deliver)
 * - Carrier integration support (FedEx, DHL, Aramex, SMSA)
 * - Proof of delivery (signature, photos, GPS)
 * - Partial delivery tracking
 * - Route/trip management for fleet
 * - Package-level tracking
 *
 * Multi-tenant: firmId for firms, lawyerId for solo lawyers
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// ADDRESS SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const AddressSchema = new Schema({
    addressLine1: { type: String, maxlength: 500 },
    addressLine1Ar: { type: String, maxlength: 500 },
    addressLine2: { type: String, maxlength: 500 },
    city: { type: String, maxlength: 100 },
    cityAr: { type: String, maxlength: 100 },
    state: { type: String, maxlength: 100 },
    country: { type: String, default: 'Saudi Arabia', maxlength: 100 },
    countryCode: { type: String, default: 'SA', maxlength: 3 },
    postalCode: { type: String, maxlength: 20 },
    district: { type: String, maxlength: 100 },
    districtAr: { type: String, maxlength: 100 },
    buildingNumber: { type: String, maxlength: 10 },
    additionalNumber: { type: String, maxlength: 10 },
    latitude: { type: Number },
    longitude: { type: Number }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERY ITEM SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const DeliveryItemSchema = new Schema({
    lineId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    lineNumber: { type: Number, required: true },

    // Source Reference
    salesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    salesOrderNumber: { type: String, maxlength: 50 },
    salesOrderItemId: { type: String },

    // Product
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
    productCode: { type: String, maxlength: 100 },
    productName: { type: String, required: true, maxlength: 500 },
    productNameAr: { type: String, maxlength: 500 },
    description: { type: String, maxlength: 2000 },

    // Quantities
    quantityOrdered: { type: Number, default: 0, min: 0 },
    quantityToDeliver: { type: Number, required: true, min: 0 },
    quantityDelivered: { type: Number, default: 0, min: 0 },
    quantityRejected: { type: Number, default: 0, min: 0 },
    quantityDamaged: { type: Number, default: 0, min: 0 },
    unit: { type: String, default: 'unit', maxlength: 50 },

    // Warehouse
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    warehouseName: { type: String, maxlength: 200 },
    binLocation: { type: String, maxlength: 100 },

    // Serial/Batch
    serialNumbers: [{ type: String, maxlength: 100 }],
    batchNumber: { type: String, maxlength: 100 },
    expiryDate: Date,
    manufacturingDate: Date,

    // Weight & Dimensions
    weight: { type: Number, min: 0 },
    weightUnit: { type: String, enum: ['kg', 'g', 'lb', 'oz'], default: 'kg' },

    // Picking
    pickedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    pickedAt: Date,
    pickingNotes: { type: String, maxlength: 500 },

    // Packing
    packageIds: [{ type: String }], // Which packages contain this item

    // Notes
    notes: { type: String, maxlength: 1000 },

    // Item-level delivery status
    status: {
        type: String,
        enum: ['pending', 'picked', 'packed', 'shipped', 'delivered', 'partial', 'rejected'],
        default: 'pending'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// PACKAGE SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const PackageSchema = new Schema({
    packageId: {
        type: String,
        default: () => new mongoose.Types.ObjectId().toString()
    },
    packageNumber: { type: Number, required: true },
    packageType: {
        type: String,
        enum: ['box', 'pallet', 'envelope', 'crate', 'tube', 'bag', 'custom'],
        default: 'box'
    },
    description: { type: String, maxlength: 200 },

    // Dimensions
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    dimensionUnit: { type: String, enum: ['cm', 'in', 'm'], default: 'cm' },

    // Weight
    weight: { type: Number, min: 0 },
    weightUnit: { type: String, enum: ['kg', 'g', 'lb', 'oz'], default: 'kg' },

    // Contents
    itemLineIds: [{ type: String }],

    // Tracking
    trackingNumber: { type: String, maxlength: 100 },
    labelUrl: { type: String, maxlength: 500 },
    labelGeneratedAt: Date,

    // Packing
    packedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    packedAt: Date,

    // Status
    status: {
        type: String,
        enum: ['pending', 'packed', 'labeled', 'shipped', 'delivered'],
        default: 'pending'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKING EVENT SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const TrackingEventSchema = new Schema({
    eventTime: { type: Date, default: Date.now },
    status: { type: String, required: true, maxlength: 100 },
    statusCode: { type: String, maxlength: 50 },
    description: { type: String, maxlength: 500 },
    descriptionAr: { type: String, maxlength: 500 },
    location: { type: String, maxlength: 200 },
    city: { type: String, maxlength: 100 },
    country: { type: String, maxlength: 100 },
    latitude: Number,
    longitude: Number,
    signedBy: { type: String, maxlength: 200 },
    source: {
        type: String,
        enum: ['carrier_api', 'manual', 'driver_app', 'webhook'],
        default: 'manual'
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF OF DELIVERY SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const ProofOfDeliverySchema = new Schema({
    deliveredAt: { type: Date, required: true },
    receivedBy: { type: String, required: true, maxlength: 200 },
    receivedByTitle: { type: String, maxlength: 100 },
    receivedByIdNumber: { type: String, maxlength: 50 },
    receivedByPhone: { type: String, maxlength: 50 },

    // Signature
    signatureUrl: { type: String, maxlength: 500 },
    signatureType: {
        type: String,
        enum: ['digital', 'image', 'name_only'],
        default: 'digital'
    },

    // Photos
    photoUrls: [{ type: String, maxlength: 500 }],
    photoDescriptions: [{ type: String, maxlength: 200 }],

    // Location
    gpsLatitude: Number,
    gpsLongitude: Number,
    gpsAccuracy: Number, // in meters
    locationAddress: { type: String, maxlength: 500 },

    // Device Info
    deviceId: { type: String, maxlength: 100 },
    deviceType: { type: String, maxlength: 50 },
    appVersion: { type: String, maxlength: 20 },

    // Condition
    conditionOnDelivery: {
        type: String,
        enum: ['good', 'minor_damage', 'major_damage', 'refused'],
        default: 'good'
    },
    damageNotes: { type: String, maxlength: 1000 },

    // Customer Feedback
    rating: { type: Number, min: 1, max: 5 },
    feedback: { type: String, maxlength: 500 },

    // Verification
    verificationCode: { type: String, maxlength: 20 },
    verifiedAt: Date
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY ENTRY SUB-SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const HistoryEntrySchema = new Schema({
    action: { type: String, required: true, maxlength: 100 },
    timestamp: { type: Date, default: Date.now },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    performedByName: { type: String, maxlength: 200 },
    details: { type: String, maxlength: 2000 },
    oldStatus: { type: String, maxlength: 50 },
    newStatus: { type: String, maxlength: 50 },
    location: {
        latitude: Number,
        longitude: Number
    }
}, { _id: false });

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN DELIVERY NOTE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════
const deliveryNoteSchema = new Schema({
    // ═══════════════════════════════════════════════════════════════
    // MULTI-TENANCY (REQUIRED)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: Schema.Types.ObjectId,
        ref: 'Firm',
        required: true,
        index: true
    },
    lawyerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // DELIVERY IDENTIFICATION
    // ═══════════════════════════════════════════════════════════════
    deliveryNumber: {
        type: String,
        required: true,
        index: true
    },
    deliveryDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },

    // ═══════════════════════════════════════════════════════════════
    // SOURCE DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    salesOrderIds: [{ type: Schema.Types.ObjectId, ref: 'SalesOrder', index: true }],
    salesOrderNumbers: [{ type: String, maxlength: 50 }],
    primarySalesOrderId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },

    // For returns
    returnOrderId: { type: Schema.Types.ObjectId, ref: 'ReturnOrder' },
    returnOrderNumber: { type: String, maxlength: 50 },
    isReturn: { type: Boolean, default: false },

    // ═══════════════════════════════════════════════════════════════
    // CUSTOMER INFORMATION
    // ═══════════════════════════════════════════════════════════════
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
        index: true
    },
    customerName: { type: String, maxlength: 300 },
    customerNameAr: { type: String, maxlength: 300 },
    customerEmail: { type: String, maxlength: 200 },
    customerPhone: { type: String, maxlength: 50 },

    // Shipping Address
    shippingAddressId: { type: Schema.Types.ObjectId },
    shippingAddress: AddressSchema,

    // Contact Person
    contactPersonId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    contactPersonName: { type: String, maxlength: 200 },
    contactPersonPhone: { type: String, maxlength: 50 },

    // ═══════════════════════════════════════════════════════════════
    // DELIVERY STATUS
    // ═══════════════════════════════════════════════════════════════
    status: {
        type: String,
        enum: [
            'draft',
            'confirmed',
            'picking',
            'picked',
            'packing',
            'packed',
            'ready_to_ship',
            'in_transit',
            'out_for_delivery',
            'delivered',
            'partially_delivered',
            'failed',
            'returned',
            'cancelled'
        ],
        default: 'draft',
        index: true
    },

    // Billing status
    billingStatus: {
        type: String,
        enum: ['not_billed', 'billed'],
        default: 'not_billed'
    },

    // ═══════════════════════════════════════════════════════════════
    // LINE ITEMS
    // ═══════════════════════════════════════════════════════════════
    items: [DeliveryItemSchema],

    // ═══════════════════════════════════════════════════════════════
    // PACKAGES
    // ═══════════════════════════════════════════════════════════════
    packages: [PackageSchema],
    totalPackages: { type: Number, default: 1, min: 1 },

    // ═══════════════════════════════════════════════════════════════
    // SOURCE WAREHOUSE
    // ═══════════════════════════════════════════════════════════════
    warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse' },
    warehouseName: { type: String, maxlength: 200 },
    warehouseAddress: AddressSchema,

    // ═══════════════════════════════════════════════════════════════
    // SHIPPING / CARRIER
    // ═══════════════════════════════════════════════════════════════
    shippingMethod: {
        type: String,
        enum: ['own_fleet', 'third_party', 'customer_pickup', 'dropship'],
        default: 'third_party'
    },

    // Carrier Info
    carrierId: { type: Schema.Types.ObjectId, ref: 'ShippingCarrier' },
    carrierName: { type: String, maxlength: 100 },
    carrierService: { type: String, maxlength: 100 },
    carrierAccountNumber: { type: String, maxlength: 100 },

    // Tracking
    masterTrackingNumber: { type: String, maxlength: 100, index: true },
    trackingNumbers: [{ type: String, maxlength: 100 }],
    trackingUrl: { type: String, maxlength: 500 },

    // AWB (Air Waybill)
    awbNumber: { type: String, maxlength: 100 },
    awbUrl: { type: String, maxlength: 500 },

    // Shipping Cost
    shippingCost: { type: Number, default: 0, min: 0 },
    shippingCostCurrency: { type: String, default: 'SAR', maxlength: 3 },
    insuranceValue: { type: Number, default: 0, min: 0 },

    // Incoterms
    incoterms: {
        type: String,
        enum: ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'],
        maxlength: 10
    },

    // ═══════════════════════════════════════════════════════════════
    // WEIGHT & DIMENSIONS (Total)
    // ═══════════════════════════════════════════════════════════════
    totalWeight: { type: Number, min: 0 },
    weightUnit: { type: String, enum: ['kg', 'g', 'lb'], default: 'kg' },
    volumetricWeight: { type: Number, min: 0 },
    dimensions: {
        length: { type: Number, min: 0 },
        width: { type: Number, min: 0 },
        height: { type: Number, min: 0 },
        unit: { type: String, enum: ['cm', 'in', 'm'], default: 'cm' }
    },

    // ═══════════════════════════════════════════════════════════════
    // OWN FLEET / DRIVER
    // ═══════════════════════════════════════════════════════════════
    vehicleId: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
    vehiclePlate: { type: String, maxlength: 20 },
    vehicleType: { type: String, maxlength: 50 },

    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    driverName: { type: String, maxlength: 200 },
    driverPhone: { type: String, maxlength: 50 },
    driverLicense: { type: String, maxlength: 50 },

    // Delivery Trip (for route optimization)
    deliveryTripId: { type: Schema.Types.ObjectId, ref: 'DeliveryTrip' },
    stopNumber: { type: Number }, // Order in the trip

    // ═══════════════════════════════════════════════════════════════
    // DATES
    // ═══════════════════════════════════════════════════════════════
    scheduledDate: Date,
    scheduledTimeSlot: {
        start: { type: String, maxlength: 10 }, // "09:00"
        end: { type: String, maxlength: 10 }    // "12:00"
    },
    pickedAt: Date,
    packedAt: Date,
    shippedAt: Date,
    estimatedDeliveryDate: Date,
    actualDeliveryDate: Date,
    firstAttemptDate: Date,

    // Commitment
    commitmentDate: Date,
    isUrgent: { type: Boolean, default: false },
    priorityLevel: {
        type: String,
        enum: ['low', 'normal', 'high', 'critical'],
        default: 'normal'
    },

    // ═══════════════════════════════════════════════════════════════
    // TRACKING EVENTS
    // ═══════════════════════════════════════════════════════════════
    trackingEvents: [TrackingEventSchema],
    lastTrackingUpdate: Date,

    // ═══════════════════════════════════════════════════════════════
    // PROOF OF DELIVERY
    // ═══════════════════════════════════════════════════════════════
    proofOfDelivery: ProofOfDeliverySchema,

    // ═══════════════════════════════════════════════════════════════
    // DELIVERY ATTEMPTS
    // ═══════════════════════════════════════════════════════════════
    deliveryAttempts: [{
        attemptNumber: { type: Number, required: true },
        attemptDate: { type: Date, required: true },
        attemptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        result: {
            type: String,
            enum: ['delivered', 'no_one_home', 'wrong_address', 'refused', 'damaged', 'other'],
            required: true
        },
        notes: { type: String, maxlength: 500 },
        latitude: Number,
        longitude: Number,
        photoUrl: { type: String, maxlength: 500 }
    }],
    maxDeliveryAttempts: { type: Number, default: 3 },

    // ═══════════════════════════════════════════════════════════════
    // LINKED DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    invoiceNumber: { type: String, maxlength: 50 },
    packingSlipUrl: { type: String, maxlength: 500 },

    // ═══════════════════════════════════════════════════════════════
    // NOTES & INSTRUCTIONS
    // ═══════════════════════════════════════════════════════════════
    notes: { type: String, maxlength: 2000 },
    notesAr: { type: String, maxlength: 2000 },
    internalNotes: { type: String, maxlength: 2000 },
    specialInstructions: { type: String, maxlength: 1000 },
    deliveryInstructions: { type: String, maxlength: 1000 },

    // ═══════════════════════════════════════════════════════════════
    // CANCELLATION
    // ═══════════════════════════════════════════════════════════════
    cancellationReason: { type: String, maxlength: 1000 },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancelledAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // HISTORY & AUDIT
    // ═══════════════════════════════════════════════════════════════
    history: [HistoryEntrySchema],

    // ═══════════════════════════════════════════════════════════════
    // PRINT & DOCUMENTS
    // ═══════════════════════════════════════════════════════════════
    printCount: { type: Number, default: 0 },
    lastPrintedAt: Date,
    pdfUrl: { type: String, maxlength: 500 },
    pdfGeneratedAt: Date,

    // ═══════════════════════════════════════════════════════════════
    // CUSTOM FIELDS
    // ═══════════════════════════════════════════════════════════════
    customFields: { type: Map, of: Schema.Types.Mixed },
    tags: [{ type: String, trim: true, maxlength: 50 }],

    // ═══════════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════════
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confirmedAt: Date

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════════════════════
deliveryNoteSchema.index({ firmId: 1, deliveryNumber: 1 }, { unique: true });
deliveryNoteSchema.index({ firmId: 1, status: 1, deliveryDate: -1 });
deliveryNoteSchema.index({ firmId: 1, customerId: 1, deliveryDate: -1 });
deliveryNoteSchema.index({ firmId: 1, salesOrderIds: 1 });
deliveryNoteSchema.index({ firmId: 1, driverId: 1, scheduledDate: 1 });
deliveryNoteSchema.index({ firmId: 1, deliveryTripId: 1, stopNumber: 1 });
deliveryNoteSchema.index({ firmId: 1, carrierId: 1 });
deliveryNoteSchema.index({ masterTrackingNumber: 1 });
deliveryNoteSchema.index({ lawyerId: 1, status: 1 });

// ═══════════════════════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════════════════════
deliveryNoteSchema.virtual('isFullyDelivered').get(function() {
    return this.items.every(item => item.quantityDelivered >= item.quantityToDeliver);
});

deliveryNoteSchema.virtual('isPartiallyDelivered').get(function() {
    const delivered = this.items.some(item => item.quantityDelivered > 0);
    const notFull = this.items.some(item => item.quantityDelivered < item.quantityToDeliver);
    return delivered && notFull;
});

deliveryNoteSchema.virtual('deliveryProgress').get(function() {
    const totalToDeliver = this.items.reduce((sum, item) => sum + item.quantityToDeliver, 0);
    const totalDelivered = this.items.reduce((sum, item) => sum + item.quantityDelivered, 0);
    return totalToDeliver > 0 ? Math.round((totalDelivered / totalToDeliver) * 100) : 0;
});

deliveryNoteSchema.virtual('isOverdue').get(function() {
    if (!this.scheduledDate) return false;
    return !['delivered', 'cancelled', 'returned'].includes(this.status) &&
           new Date() > this.scheduledDate;
});

deliveryNoteSchema.virtual('currentAttempt').get(function() {
    return this.deliveryAttempts.length;
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════════════════════
deliveryNoteSchema.pre('save', async function(next) {
    try {
        // Generate delivery number if new
        if (this.isNew && !this.deliveryNumber) {
            const Counter = require('./counter.model');
            const year = new Date().getFullYear();
            const counterId = `deliverynote_${this.firmId}_${year}`;
            const seq = await Counter.getNextSequence(counterId);
            this.deliveryNumber = `DN-${year}-${String(seq).padStart(5, '0')}`;
        }

        // Update line numbers
        this.items.forEach((item, index) => {
            item.lineNumber = index + 1;
        });

        // Update package numbers
        this.packages.forEach((pkg, index) => {
            pkg.packageNumber = index + 1;
        });

        // Update total packages count
        this.totalPackages = this.packages.length || 1;

        // Calculate total weight
        this.totalWeight = this.items.reduce((sum, item) => sum + (item.weight || 0), 0);

        next();
    } catch (error) {
        next(error);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// INSTANCE METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add tracking event
 */
deliveryNoteSchema.methods.addTrackingEvent = function(event) {
    this.trackingEvents.push({
        eventTime: event.eventTime || new Date(),
        status: event.status,
        statusCode: event.statusCode,
        description: event.description,
        location: event.location,
        city: event.city,
        country: event.country,
        latitude: event.latitude,
        longitude: event.longitude,
        source: event.source || 'manual'
    });
    this.lastTrackingUpdate = new Date();
    return this.save();
};

/**
 * Add history entry
 */
deliveryNoteSchema.methods.addHistory = function(action, userId, userName, details, oldStatus = null, newStatus = null, location = null) {
    this.history.push({
        action,
        performedBy: userId,
        performedByName: userName,
        details,
        oldStatus,
        newStatus,
        location,
        timestamp: new Date()
    });
};

/**
 * Confirm delivery
 */
deliveryNoteSchema.methods.confirm = async function(userId, userName) {
    if (this.status !== 'draft') {
        throw new Error('Only draft delivery notes can be confirmed');
    }

    this.status = 'confirmed';
    this.confirmedAt = new Date();
    this.confirmedBy = userId;
    this.addHistory('confirmed', userId, userName, 'Delivery note confirmed', 'draft', 'confirmed');

    return this.save();
};

/**
 * Mark as shipped
 */
deliveryNoteSchema.methods.ship = async function(userId, userName, trackingNumber = null, carrier = null) {
    if (!['confirmed', 'packed', 'ready_to_ship'].includes(this.status)) {
        throw new Error('Delivery note must be confirmed, packed, or ready to ship');
    }

    this.status = 'in_transit';
    this.shippedAt = new Date();

    if (trackingNumber) {
        this.masterTrackingNumber = trackingNumber;
        this.trackingNumbers.push(trackingNumber);
    }

    if (carrier) {
        this.carrierName = carrier;
    }

    this.addHistory('shipped', userId, userName, `Shipped via ${carrier || 'carrier'}`, this.status, 'in_transit');
    this.addTrackingEvent({
        status: 'Shipped',
        statusCode: 'SHIPPED',
        description: `Package shipped via ${carrier || 'carrier'}`,
        source: 'manual'
    });

    return this.save();
};

/**
 * Record delivery
 */
deliveryNoteSchema.methods.recordDelivery = async function(pod, userId, userName) {
    this.proofOfDelivery = {
        deliveredAt: pod.deliveredAt || new Date(),
        receivedBy: pod.receivedBy,
        receivedByTitle: pod.receivedByTitle,
        receivedByIdNumber: pod.receivedByIdNumber,
        receivedByPhone: pod.receivedByPhone,
        signatureUrl: pod.signatureUrl,
        signatureType: pod.signatureType || 'digital',
        photoUrls: pod.photoUrls || [],
        gpsLatitude: pod.latitude,
        gpsLongitude: pod.longitude,
        gpsAccuracy: pod.accuracy,
        conditionOnDelivery: pod.condition || 'good',
        damageNotes: pod.damageNotes
    };

    // Update item quantities
    this.items.forEach(item => {
        item.quantityDelivered = item.quantityToDeliver;
        item.status = 'delivered';
    });

    this.status = 'delivered';
    this.actualDeliveryDate = pod.deliveredAt || new Date();

    this.addHistory('delivered', userId, userName, `Delivered to ${pod.receivedBy}`, 'in_transit', 'delivered', {
        latitude: pod.latitude,
        longitude: pod.longitude
    });

    this.addTrackingEvent({
        status: 'Delivered',
        statusCode: 'DELIVERED',
        description: `Delivered to ${pod.receivedBy}`,
        signedBy: pod.receivedBy,
        latitude: pod.latitude,
        longitude: pod.longitude,
        source: 'manual'
    });

    return this.save();
};

/**
 * Record delivery attempt
 */
deliveryNoteSchema.methods.recordAttempt = async function(attempt, userId, userName) {
    const attemptNumber = this.deliveryAttempts.length + 1;

    this.deliveryAttempts.push({
        attemptNumber,
        attemptDate: attempt.date || new Date(),
        attemptedBy: userId,
        result: attempt.result,
        notes: attempt.notes,
        latitude: attempt.latitude,
        longitude: attempt.longitude,
        photoUrl: attempt.photoUrl
    });

    if (attemptNumber >= this.maxDeliveryAttempts && attempt.result !== 'delivered') {
        this.status = 'failed';
    }

    this.addHistory('delivery_attempt', userId, userName, `Attempt ${attemptNumber}: ${attempt.result}`, null, null, {
        latitude: attempt.latitude,
        longitude: attempt.longitude
    });

    return this.save();
};

/**
 * Cancel delivery
 */
deliveryNoteSchema.methods.cancel = async function(userId, userName, reason) {
    if (['delivered', 'cancelled'].includes(this.status)) {
        throw new Error('Cannot cancel delivered or already cancelled delivery');
    }

    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelledBy = userId;
    this.cancellationReason = reason;

    this.addHistory('cancelled', userId, userName, `Cancelled: ${reason}`, this.status, 'cancelled');

    return this.save();
};

// ═══════════════════════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get delivery notes with filters
 */
deliveryNoteSchema.statics.getDeliveryNotes = async function(firmQuery, filters = {}) {
    const query = { ...firmQuery };

    if (filters.status) {
        query.status = Array.isArray(filters.status) ? { $in: filters.status } : filters.status;
    }

    if (filters.customerId) {
        query.customerId = new mongoose.Types.ObjectId(filters.customerId);
    }

    if (filters.salesOrderId) {
        query.salesOrderIds = new mongoose.Types.ObjectId(filters.salesOrderId);
    }

    if (filters.driverId) {
        query.driverId = new mongoose.Types.ObjectId(filters.driverId);
    }

    if (filters.startDate || filters.endDate) {
        query.deliveryDate = {};
        if (filters.startDate) query.deliveryDate.$gte = new Date(filters.startDate);
        if (filters.endDate) query.deliveryDate.$lte = new Date(filters.endDate);
    }

    if (filters.search) {
        const searchRegex = new RegExp(filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        query.$or = [
            { deliveryNumber: searchRegex },
            { customerName: searchRegex },
            { masterTrackingNumber: searchRegex }
        ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = Math.min(parseInt(filters.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const sortField = filters.sortBy || 'deliveryDate';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    const [deliveryNotes, total] = await Promise.all([
        this.find(query)
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit)
            .populate('customerId', 'firstName lastName companyName')
            .populate('driverId', 'firstName lastName')
            .populate('createdBy', 'firstName lastName')
            .lean(),
        this.countDocuments(query)
    ]);

    return {
        deliveryNotes,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get statistics
 */
deliveryNoteSchema.statics.getStatistics = async function(firmQuery, dateRange = {}) {
    const matchQuery = { ...firmQuery };

    if (dateRange.startDate || dateRange.endDate) {
        matchQuery.deliveryDate = {};
        if (dateRange.startDate) matchQuery.deliveryDate.$gte = new Date(dateRange.startDate);
        if (dateRange.endDate) matchQuery.deliveryDate.$lte = new Date(dateRange.endDate);
    }

    const stats = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: null,
                totalDeliveries: { $sum: 1 },
                delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
                inTransit: { $sum: { $cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0] } },
                pending: { $sum: { $cond: [{ $in: ['$status', ['draft', 'confirmed', 'picking', 'packing']] }, 1, 0] } },
                failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                avgDeliveryDays: {
                    $avg: {
                        $cond: [
                            { $and: [{ $ne: ['$actualDeliveryDate', null] }, { $ne: ['$shippedAt', null] }] },
                            { $divide: [{ $subtract: ['$actualDeliveryDate', '$shippedAt'] }, 86400000] },
                            null
                        ]
                    }
                }
            }
        }
    ]);

    return stats[0] || {
        totalDeliveries: 0,
        delivered: 0,
        inTransit: 0,
        pending: 0,
        failed: 0,
        cancelled: 0,
        avgDeliveryDays: null
    };
};

module.exports = mongoose.model('DeliveryNote', deliveryNoteSchema);
