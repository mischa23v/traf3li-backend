const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: false,
    },
    country: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    isSeller: {
        type: Boolean,
        default: false,
        required: false,
    },
    role: {
        type: String,
        enum: ['client', 'lawyer', 'admin'],
        default: 'client',
        required: false
    },
    lawyerProfile: {
        specialization: {
            type: [String],
            default: []
        },
        licenseNumber: {
            type: String,
            required: false
        },
        barAssociation: {
            type: String,
            required: false
        },
        yearsExperience: {
            type: Number,
            default: 0
        },
        verified: {
            type: Boolean,
            default: false
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        totalReviews: {
            type: Number,
            default: 0
        },
        casesWon: {
            type: Number,
            default: 0
        },
        casesTotal: {
            type: Number,
            default: 0
        },
        languages: {
            type: [String],
            default: ['arabic']
        },
        firmID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Firm',
            required: false
        }
    }
}, {
    versionKey: false,
    timestamps: true
});

userSchema.index({ role: 1, 'lawyerProfile.specialization': 1, 'lawyerProfile.rating': -1 });

module.exports = mongoose.model('User', userSchema);
