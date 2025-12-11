const UserSettings = require('../models/userSettings.model');
const CompanySettings = require('../models/companySettings.model');
const Tax = require('../models/tax.model');
const PaymentMode = require('../models/paymentMode.model');
const FinanceSettings = require('../models/financeSettings.model');
const { CustomException } = require('../utils');

// ============ USER SETTINGS ============

// Get all user settings
const getUserSettings = async (req, res) => {
    try {
        const settings = await UserSettings.getOrCreate(req.userID, req.firmId);
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error getting user settings:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get user settings'
        });
    }
};

// Update account settings
const updateAccountSettings = async (req, res) => {
    try {
        const { name, dob, language, timezone } = req.body;
        const settings = await UserSettings.getOrCreate(req.userID, req.firmId);

        if (name !== undefined) settings.account.name = name;
        if (dob !== undefined) settings.account.dob = dob;
        if (language !== undefined) settings.account.language = language;
        if (timezone !== undefined) settings.account.timezone = timezone;

        await settings.save();

        res.json({
            success: true,
            data: settings,
            message: 'Account settings updated'
        });
    } catch (error) {
        console.error('Error updating account settings:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update account settings'
        });
    }
};

// Update appearance settings
const updateAppearanceSettings = async (req, res) => {
    try {
        const { theme, accentColor, fontSize, sidebarCollapsed } = req.body;
        const settings = await UserSettings.getOrCreate(req.userID, req.firmId);

        if (theme !== undefined) settings.appearance.theme = theme;
        if (accentColor !== undefined) settings.appearance.accentColor = accentColor;
        if (fontSize !== undefined) settings.appearance.fontSize = fontSize;
        if (sidebarCollapsed !== undefined) settings.appearance.sidebarCollapsed = sidebarCollapsed;

        await settings.save();

        res.json({
            success: true,
            data: settings,
            message: 'Appearance settings updated'
        });
    } catch (error) {
        console.error('Error updating appearance settings:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update appearance settings'
        });
    }
};

// Update display settings
const updateDisplaySettings = async (req, res) => {
    try {
        const { dateFormat, timeFormat, currency, startOfWeek, compactMode } = req.body;
        const settings = await UserSettings.getOrCreate(req.userID, req.firmId);

        if (dateFormat !== undefined) settings.display.dateFormat = dateFormat;
        if (timeFormat !== undefined) settings.display.timeFormat = timeFormat;
        if (currency !== undefined) settings.display.currency = currency;
        if (startOfWeek !== undefined) settings.display.startOfWeek = startOfWeek;
        if (compactMode !== undefined) settings.display.compactMode = compactMode;

        await settings.save();

        res.json({
            success: true,
            data: settings,
            message: 'Display settings updated'
        });
    } catch (error) {
        console.error('Error updating display settings:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update display settings'
        });
    }
};

// Update notification settings
const updateNotificationSettings = async (req, res) => {
    try {
        const { email, push, inApp } = req.body;
        const settings = await UserSettings.getOrCreate(req.userID, req.firmId);

        if (email) {
            Object.assign(settings.notifications.email, email);
        }
        if (push) {
            Object.assign(settings.notifications.push, push);
        }
        if (inApp) {
            Object.assign(settings.notifications.inApp, inApp);
        }

        await settings.save();

        res.json({
            success: true,
            data: settings,
            message: 'Notification settings updated'
        });
    } catch (error) {
        console.error('Error updating notification settings:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update notification settings'
        });
    }
};

// ============ COMPANY SETTINGS ============

// Get company settings
const getCompanySettings = async (req, res) => {
    try {
        if (!req.firmId) {
            return res.status(400).json({
                error: true,
                message: 'Firm context required'
            });
        }

        const settings = await CompanySettings.getOrCreate(req.firmId, 'My Company');
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error getting company settings:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get company settings'
        });
    }
};

// Update company settings
const updateCompanySettings = async (req, res) => {
    try {
        if (!req.firmId) {
            return res.status(400).json({
                error: true,
                message: 'Firm context required'
            });
        }

        const allowedFields = [
            'name', 'email', 'phone', 'address', 'city', 'country',
            'postalCode', 'taxNumber', 'commercialRegister',
            'bankName', 'bankAccount', 'iban'
        ];

        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const settings = await CompanySettings.findOneAndUpdate(
            { firmId: req.firmId },
            { $set: updates },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            data: settings,
            message: 'Company settings updated'
        });
    } catch (error) {
        console.error('Error updating company settings:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update company settings'
        });
    }
};

// Upload company logo
const uploadCompanyLogo = async (req, res) => {
    try {
        if (!req.firmId) {
            return res.status(400).json({
                error: true,
                message: 'Firm context required'
            });
        }

        // Handle file upload - assuming multer middleware has processed the file
        if (!req.file) {
            return res.status(400).json({
                error: true,
                message: 'No file uploaded'
            });
        }

        // In production, you would upload to S3/GCS and get the URL
        // For now, we'll assume the file path is the logo URL
        const logoUrl = `/uploads/logos/${req.file.filename}`;

        const settings = await CompanySettings.findOneAndUpdate(
            { firmId: req.firmId },
            { $set: { logo: logoUrl } },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            data: settings,
            message: 'Company logo uploaded'
        });
    } catch (error) {
        console.error('Error uploading company logo:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to upload company logo'
        });
    }
};

// ============ TAX SETTINGS ============

// Get all taxes
const getTaxes = async (req, res) => {
    try {
        if (!req.firmId) {
            return res.status(400).json({
                error: true,
                message: 'Firm context required'
            });
        }

        const taxes = await Tax.find({ firmId: req.firmId }).sort({ name: 1 });
        res.json({
            success: true,
            data: taxes
        });
    } catch (error) {
        console.error('Error getting taxes:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get taxes'
        });
    }
};

// Create tax
const createTax = async (req, res) => {
    try {
        if (!req.firmId) {
            return res.status(400).json({
                error: true,
                message: 'Firm context required'
            });
        }

        const { name, rate, isDefault } = req.body;

        if (!name || rate === undefined) {
            return res.status(400).json({
                error: true,
                message: 'Name and rate are required'
            });
        }

        const tax = await Tax.create({
            firmId: req.firmId,
            name,
            rate,
            isDefault: isDefault || false
        });

        res.status(201).json({
            success: true,
            data: tax,
            message: 'Tax created'
        });
    } catch (error) {
        console.error('Error creating tax:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create tax'
        });
    }
};

// Update tax
const updateTax = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rate, isActive } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (rate !== undefined) updates.rate = rate;
        if (isActive !== undefined) updates.isActive = isActive;

        const tax = await Tax.findOneAndUpdate(
            { _id: id, firmId: req.firmId },
            { $set: updates },
            { new: true }
        );

        if (!tax) {
            return res.status(404).json({
                error: true,
                message: 'Tax not found'
            });
        }

        res.json({
            success: true,
            data: tax,
            message: 'Tax updated'
        });
    } catch (error) {
        console.error('Error updating tax:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update tax'
        });
    }
};

// Delete tax
const deleteTax = async (req, res) => {
    try {
        const { id } = req.params;

        const tax = await Tax.findOneAndDelete({ _id: id, firmId: req.firmId });

        if (!tax) {
            return res.status(404).json({
                error: true,
                message: 'Tax not found'
            });
        }

        res.json({
            success: true,
            message: 'Tax deleted'
        });
    } catch (error) {
        console.error('Error deleting tax:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete tax'
        });
    }
};

// Set default tax
const setDefaultTax = async (req, res) => {
    try {
        const { id } = req.params;

        // Clear existing default
        await Tax.updateMany(
            { firmId: req.firmId },
            { $set: { isDefault: false } }
        );

        // Set new default
        const tax = await Tax.findOneAndUpdate(
            { _id: id, firmId: req.firmId },
            { $set: { isDefault: true } },
            { new: true }
        );

        if (!tax) {
            return res.status(404).json({
                error: true,
                message: 'Tax not found'
            });
        }

        res.json({
            success: true,
            data: tax,
            message: 'Default tax updated'
        });
    } catch (error) {
        console.error('Error setting default tax:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to set default tax'
        });
    }
};

// ============ PAYMENT MODE SETTINGS ============

// Get all payment modes
const getPaymentModes = async (req, res) => {
    try {
        if (!req.firmId) {
            return res.status(400).json({
                error: true,
                message: 'Firm context required'
            });
        }

        const modes = await PaymentMode.find({ firmId: req.firmId }).sort({ name: 1 });
        res.json({
            success: true,
            data: modes
        });
    } catch (error) {
        console.error('Error getting payment modes:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get payment modes'
        });
    }
};

// Create payment mode
const createPaymentMode = async (req, res) => {
    try {
        if (!req.firmId) {
            return res.status(400).json({
                error: true,
                message: 'Firm context required'
            });
        }

        const { name, description, isDefault } = req.body;

        if (!name) {
            return res.status(400).json({
                error: true,
                message: 'Name is required'
            });
        }

        const mode = await PaymentMode.create({
            firmId: req.firmId,
            name,
            description,
            isDefault: isDefault || false
        });

        res.status(201).json({
            success: true,
            data: mode,
            message: 'Payment mode created'
        });
    } catch (error) {
        console.error('Error creating payment mode:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to create payment mode'
        });
    }
};

// Update payment mode
const updatePaymentMode = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (isActive !== undefined) updates.isActive = isActive;

        const mode = await PaymentMode.findOneAndUpdate(
            { _id: id, firmId: req.firmId },
            { $set: updates },
            { new: true }
        );

        if (!mode) {
            return res.status(404).json({
                error: true,
                message: 'Payment mode not found'
            });
        }

        res.json({
            success: true,
            data: mode,
            message: 'Payment mode updated'
        });
    } catch (error) {
        console.error('Error updating payment mode:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update payment mode'
        });
    }
};

// Delete payment mode
const deletePaymentMode = async (req, res) => {
    try {
        const { id } = req.params;

        const mode = await PaymentMode.findOneAndDelete({ _id: id, firmId: req.firmId });

        if (!mode) {
            return res.status(404).json({
                error: true,
                message: 'Payment mode not found'
            });
        }

        res.json({
            success: true,
            message: 'Payment mode deleted'
        });
    } catch (error) {
        console.error('Error deleting payment mode:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to delete payment mode'
        });
    }
};

// Set default payment mode
const setDefaultPaymentMode = async (req, res) => {
    try {
        const { id } = req.params;

        // Clear existing default
        await PaymentMode.updateMany(
            { firmId: req.firmId },
            { $set: { isDefault: false } }
        );

        // Set new default
        const mode = await PaymentMode.findOneAndUpdate(
            { _id: id, firmId: req.firmId },
            { $set: { isDefault: true } },
            { new: true }
        );

        if (!mode) {
            return res.status(404).json({
                error: true,
                message: 'Payment mode not found'
            });
        }

        res.json({
            success: true,
            data: mode,
            message: 'Default payment mode updated'
        });
    } catch (error) {
        console.error('Error setting default payment mode:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to set default payment mode'
        });
    }
};

// ============ FINANCE SETTINGS ============

// Get finance settings
const getFinanceSettings = async (req, res) => {
    try {
        if (!req.firmId) {
            return res.status(400).json({
                error: true,
                message: 'Firm context required'
            });
        }

        const settings = await FinanceSettings.getOrCreate(req.firmId);
        res.json({
            success: true,
            data: settings
        });
    } catch (error) {
        console.error('Error getting finance settings:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to get finance settings'
        });
    }
};

// Update finance settings
const updateFinanceSettings = async (req, res) => {
    try {
        if (!req.firmId) {
            return res.status(400).json({
                error: true,
                message: 'Firm context required'
            });
        }

        const allowedFields = [
            'defaultCurrency', 'invoicePrefix', 'invoiceStartNumber',
            'quotePrefix', 'quoteStartNumber', 'paymentTerms',
            'defaultTaxId', 'defaultPaymentModeId',
            'enableLateFees', 'lateFeePercentage', 'enablePartialPayments'
        ];

        const updates = {};
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const settings = await FinanceSettings.findOneAndUpdate(
            { firmId: req.firmId },
            { $set: updates },
            { new: true, upsert: true }
        );

        res.json({
            success: true,
            data: settings,
            message: 'Finance settings updated'
        });
    } catch (error) {
        console.error('Error updating finance settings:', error);
        res.status(500).json({
            error: true,
            message: error.message || 'Failed to update finance settings'
        });
    }
};

module.exports = {
    // User settings
    getUserSettings,
    updateAccountSettings,
    updateAppearanceSettings,
    updateDisplaySettings,
    updateNotificationSettings,
    // Company settings
    getCompanySettings,
    updateCompanySettings,
    uploadCompanyLogo,
    // Tax settings
    getTaxes,
    createTax,
    updateTax,
    deleteTax,
    setDefaultTax,
    // Payment mode settings
    getPaymentModes,
    createPaymentMode,
    updatePaymentMode,
    deletePaymentMode,
    setDefaultPaymentMode,
    // Finance settings
    getFinanceSettings,
    updateFinanceSettings
};
