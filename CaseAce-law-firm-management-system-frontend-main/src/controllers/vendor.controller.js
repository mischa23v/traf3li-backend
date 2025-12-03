const { Vendor, BillingActivity } = require('../models');
const { CustomException } = require('../utils');
const asyncHandler = require('../utils/asyncHandler');

// Create vendor
const createVendor = asyncHandler(async (req, res) => {
    const {
        name,
        nameAr,
        email,
        phone,
        taxNumber,
        address,
        city,
        country,
        postalCode,
        bankName,
        bankAccountNumber,
        bankIban,
        currency,
        paymentTerms,
        defaultCategory,
        website,
        contactPerson,
        notes
    } = req.body;

    const lawyerId = req.userID;

    if (!name || name.length < 2) {
        throw CustomException('Vendor name is required (min 2 characters)', 400);
    }

    const vendor = await Vendor.create({
        name,
        nameAr,
        email,
        phone,
        taxNumber,
        address,
        city,
        country: country || 'SA',
        postalCode,
        bankName,
        bankAccountNumber,
        bankIban,
        currency: currency || 'SAR',
        paymentTerms: paymentTerms || 30,
        defaultCategory,
        website,
        contactPerson,
        notes,
        lawyerId
    });

    await BillingActivity.logActivity({
        activityType: 'vendor_created',
        userId: lawyerId,
        relatedModel: 'Vendor',
        relatedId: vendor._id,
        description: `Vendor "${name}" created`,
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
    });

    return res.status(201).json({
        success: true,
        message: 'Vendor created successfully',
        vendor
    });
});

// Get all vendors
const getVendors = asyncHandler(async (req, res) => {
    const {
        search,
        isActive,
        country,
        page = 1,
        limit = 20
    } = req.query;

    const lawyerId = req.userID;
    const filters = { lawyerId };

    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (country) filters.country = country;

    if (search) {
        filters.$or = [
            { name: { $regex: search, $options: 'i' } },
            { nameAr: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const vendors = await Vendor.find(filters)
        .sort({ name: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Vendor.countDocuments(filters);

    return res.json({
        success: true,
        vendors,
        total
    });
});

// Get single vendor
const getVendor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
        throw CustomException('Vendor not found', 404);
    }

    if (vendor.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this vendor', 403);
    }

    return res.json({
        success: true,
        vendor
    });
});

// Update vendor
const updateVendor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
        throw CustomException('Vendor not found', 404);
    }

    if (vendor.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this vendor', 403);
    }

    const updatedVendor = await Vendor.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true, runValidators: true }
    );

    return res.json({
        success: true,
        message: 'Vendor updated successfully',
        vendor: updatedVendor
    });
});

// Delete vendor
const deleteVendor = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const vendor = await Vendor.findById(id);

    if (!vendor) {
        throw CustomException('Vendor not found', 404);
    }

    if (vendor.lawyerId.toString() !== lawyerId) {
        throw CustomException('You do not have access to this vendor', 403);
    }

    // Check for existing bills
    const Bill = require('../models').Bill;
    const billCount = await Bill.countDocuments({ vendorId: id });
    if (billCount > 0) {
        throw CustomException('Cannot delete vendor with existing bills. Deactivate instead.', 400);
    }

    await Vendor.findByIdAndDelete(id);

    return res.json({
        success: true,
        message: 'Vendor deleted successfully'
    });
});

// Get vendor summary with bills
const getVendorSummary = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const lawyerId = req.userID;

    const summary = await Vendor.getVendorSummary(id, lawyerId);

    if (!summary) {
        throw CustomException('Vendor not found', 404);
    }

    return res.json({
        success: true,
        summary
    });
});

module.exports = {
    createVendor,
    getVendors,
    getVendor,
    updateVendor,
    deleteVendor,
    getVendorSummary
};
