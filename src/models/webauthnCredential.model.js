const mongoose = require('mongoose');

/**
 * WebAuthn Credential Model
 *
 * Stores hardware security key and biometric authentication credentials for users.
 * Supports FIDO2/WebAuthn protocol for passwordless and multi-factor authentication.
 *
 * Key fields:
 * - credentialId: Unique identifier for the credential (base64url encoded)
 * - credentialPublicKey: Public key used to verify authentication signatures
 * - counter: Signature counter to prevent replay attacks
 * - deviceType: Platform (built-in biometric) or cross-platform (USB key)
 * - transports: How the authenticator communicates (usb, nfc, ble, internal)
 * - userId: Reference to the user who owns this credential
 * - name: User-friendly name for the credential (e.g., "YubiKey 5", "Touch ID")
 *
 * Security features:
 * - Each credential is tied to a specific user
 * - Counter prevents replay attacks
 * - Last used timestamp for monitoring
 * - Support for multiple credentials per user
 */
const webauthnCredentialSchema = new mongoose.Schema({
    // Credential identifier (base64url encoded)
    credentialId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // Public key for credential (base64url encoded)
    credentialPublicKey: {
        type: String,
        required: true
    },

    // Signature counter for replay attack prevention
    counter: {
        type: Number,
        required: true,
        default: 0
    },

    // Device type: 'platform' (built-in biometric) or 'cross-platform' (external key)
    deviceType: {
        type: String,
        enum: ['platform', 'cross-platform'],
        required: true
    },

    // Transport methods (usb, nfc, ble, internal, hybrid)
    transports: {
        type: [String],
        default: [],
        enum: ['usb', 'nfc', 'ble', 'internal', 'hybrid']
    },

    // Reference to user
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // User-friendly name for the credential
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },

    // When credential was last used for authentication
    lastUsedAt: {
        type: Date,
        default: null
    },

    // AAGUID (Authenticator Attestation GUID) - identifies the authenticator model
    aaguid: {
        type: String,
        required: false
    },

    // Flag indicating if credential requires user verification
    userVerified: {
        type: Boolean,
        default: false
    },

    // Flag indicating if credential is backed up (e.g., synced across devices)
    backedUp: {
        type: Boolean,
        default: false
    },

    // Flag to mark credential as revoked/disabled
    isRevoked: {
        type: Boolean,
        default: false
    },

    // Date when credential was revoked
    revokedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true,
    versionKey: false
});

// Compound index for efficient user credential lookups
webauthnCredentialSchema.index({ userId: 1, isRevoked: 1 });

// Index for credential ID lookups during authentication
webauthnCredentialSchema.index({ credentialId: 1, isRevoked: 1 });

// Virtual for getting credential age
webauthnCredentialSchema.virtual('credentialAge').get(function() {
    return Date.now() - this.createdAt.getTime();
});

// Method to mark credential as used
webauthnCredentialSchema.methods.markAsUsed = async function() {
    this.lastUsedAt = new Date();
    return this.save();
};

// Method to revoke credential
webauthnCredentialSchema.methods.revoke = async function() {
    this.isRevoked = true;
    this.revokedAt = new Date();
    return this.save();
};

// Static method to find active credentials for a user
webauthnCredentialSchema.statics.findActiveByUserId = function(userId) {
    return this.find({
        userId,
        isRevoked: false
    }).sort({ lastUsedAt: -1, createdAt: -1 });
};

// Static method to find credential by ID
webauthnCredentialSchema.statics.findByCredentialId = function(credentialId) {
    return this.findOne({
        credentialId,
        isRevoked: false
    });
};

module.exports = mongoose.model('WebAuthnCredential', webauthnCredentialSchema);
