const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        unique: true,
        index: true
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Personal Information
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    nationalId: {
        type: String,
        trim: true
    },
    dateOfBirth: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: 'male'
    },
    nationality: {
        type: String,
        default: 'Saudi Arabia'
    },
    address: {
        street: String,
        city: String,
        postalCode: String,
        country: {
            type: String,
            default: 'Saudi Arabia'
        }
    },
    // Employment Information
    department: {
        type: String,
        enum: ['legal', 'administration', 'finance', 'hr', 'it', 'marketing', 'operations', 'other'],
        default: 'legal'
    },
    position: {
        type: String,
        required: true,
        trim: true
    },
    employmentType: {
        type: String,
        enum: ['full-time', 'part-time', 'contract', 'intern', 'consultant'],
        default: 'full-time'
    },
    hireDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    terminationDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'on-leave', 'terminated'],
        default: 'active'
    },
    // Manager/Supervisor
    managerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
    },
    // Compensation
    baseSalary: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'SAR'
    },
    payFrequency: {
        type: String,
        enum: ['monthly', 'bi-weekly', 'weekly'],
        default: 'monthly'
    },
    // Allowances
    allowances: [{
        type: {
            type: String,
            enum: ['housing', 'transportation', 'food', 'phone', 'medical', 'education', 'other']
        },
        amount: Number,
        description: String
    }],
    // Bank Information
    bankDetails: {
        bankName: String,
        accountNumber: String,
        iban: String
    },
    // Documents
    documents: [{
        type: {
            type: String,
            enum: ['contract', 'id', 'passport', 'visa', 'certificate', 'resume', 'other']
        },
        name: String,
        url: String,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    // Leave Balance
    leaveBalance: {
        annual: { type: Number, default: 21 },
        sick: { type: Number, default: 30 },
        personal: { type: Number, default: 5 },
        used: {
            annual: { type: Number, default: 0 },
            sick: { type: Number, default: 0 },
            personal: { type: Number, default: 0 }
        }
    },
    // Emergency Contact
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String
    },
    // Notes
    notes: {
        type: String,
        maxlength: 2000
    },
    // Profile Image
    profileImage: String
}, {
    versionKey: false,
    timestamps: true
});

// Indexes
employeeSchema.index({ lawyerId: 1, status: 1 });
employeeSchema.index({ lawyerId: 1, department: 1 });
employeeSchema.index({ lawyerId: 1, employmentType: 1 });
employeeSchema.index({ firstName: 'text', lastName: 'text', email: 'text' });

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure virtuals are included in JSON
employeeSchema.set('toJSON', { virtuals: true });
employeeSchema.set('toObject', { virtuals: true });

// Generate employee ID before saving
employeeSchema.pre('save', async function(next) {
    if (!this.employeeId) {
        const year = new Date().getFullYear();
        const count = await this.constructor.countDocuments({
            lawyerId: this.lawyerId,
            createdAt: {
                $gte: new Date(year, 0, 1)
            }
        });
        this.employeeId = `EMP-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

// Calculate total monthly compensation
employeeSchema.methods.calculateTotalCompensation = function() {
    const allowancesTotal = this.allowances.reduce((sum, a) => sum + (a.amount || 0), 0);
    return this.baseSalary + allowancesTotal;
};

module.exports = mongoose.model('Employee', employeeSchema);
