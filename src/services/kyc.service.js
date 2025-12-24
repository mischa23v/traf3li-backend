/**
 * KYC/AML Service
 *
 * Handles Know Your Customer (KYC) and Anti-Money Laundering (AML) verification
 * for the Saudi Arabian market.
 *
 * Features:
 * - National ID verification via Yakeen API
 * - Business verification via Wathq API
 * - Document upload and verification
 * - AML risk scoring and screening
 * - Verification status tracking
 *
 * Compliance:
 * - Saudi Arabian Monetary Authority (SAMA) KYC requirements
 * - Anti-Money Laundering Law (AML)
 * - Combating Financing of Terrorism (CFT)
 */

const User = require('../models/user.model');
const yakeenService = require('./yakeenService');
const wathqService = require('./wathqService');
const auditLogService = require('./auditLog.service');
const logger = require('../utils/logger');

class KYCService {
  constructor() {
    // KYC expiration periods (in days)
    this.EXPIRATION_PERIODS = {
      citizen: 365 * 5,        // 5 years for Saudi citizens
      resident: 365,           // 1 year for residents (Iqama holders)
      business: 365            // 1 year for business verification
    };

    // AML risk thresholds
    this.RISK_THRESHOLDS = {
      low: 30,
      medium: 60,
      high: 100
    };
  }

  /**
   * Initiate KYC verification process for a user
   * @param {string} userId - User ID
   * @param {string} documentType - Type of document ('national_id', 'iqama', 'commercial_registration')
   * @returns {Object} Verification initiation result
   */
  async initiateVerification(userId, documentType) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorAr: 'المستخدم غير موجود'
        };
      }

      // Check if verification is already in progress
      if (user.kycStatus === 'pending') {
        return {
          success: false,
          error: 'KYC verification already in progress',
          errorAr: 'عملية التحقق من الهوية قيد التنفيذ بالفعل'
        };
      }

      // Check if already verified and not expired
      if (user.kycStatus === 'verified' && user.kycExpiresAt && new Date(user.kycExpiresAt) > new Date()) {
        return {
          success: false,
          error: 'KYC already verified and not expired',
          errorAr: 'تم التحقق من الهوية بالفعل ولم تنتهي صلاحيتها',
          data: {
            kycStatus: user.kycStatus,
            kycVerifiedAt: user.kycVerifiedAt,
            kycExpiresAt: user.kycExpiresAt
          }
        };
      }

      // Validate document type
      const validTypes = ['national_id', 'iqama', 'passport', 'commercial_registration', 'power_of_attorney'];
      if (!validTypes.includes(documentType)) {
        return {
          success: false,
          error: `Invalid document type. Must be one of: ${validTypes.join(', ')}`,
          errorAr: 'نوع المستند غير صالح'
        };
      }

      // Update user status to pending
      user.kycStatus = 'pending';
      user.kycInitiatedAt = new Date();
      user.kycRejectionReason = null;

      await user.save();

      // Log audit
      await auditLogService.log({
        userId,
        action: 'kyc_initiated',
        resourceType: 'User',
        resourceId: userId,
        details: { documentType },
        ipAddress: null,
        userAgent: null
      });

      logger.info(`KYC verification initiated for user ${userId} with document type ${documentType}`);

      return {
        success: true,
        data: {
          userId,
          kycStatus: user.kycStatus,
          kycInitiatedAt: user.kycInitiatedAt,
          documentType,
          message: 'KYC verification process initiated',
          messageAr: 'تم بدء عملية التحقق من الهوية'
        }
      };
    } catch (error) {
      logger.error('Error initiating KYC verification:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate KYC verification',
        errorAr: 'فشل بدء عملية التحقق من الهوية'
      };
    }
  }

  /**
   * Verify user identity using National ID via Yakeen API
   * @param {string} userId - User ID
   * @param {Object} documentData - Document data
   * @returns {Object} Verification result
   */
  async verifyIdentity(userId, documentData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorAr: 'المستخدم غير موجود'
        };
      }

      const { nationalId, birthDate, documentType, crNumber } = documentData;

      // Verify based on document type
      let verificationResult;

      if (documentType === 'national_id' || documentType === 'iqama') {
        // Verify identity via Yakeen API
        if (!nationalId || !birthDate) {
          return {
            success: false,
            error: 'National ID and birth date are required',
            errorAr: 'رقم الهوية وتاريخ الميلاد مطلوبان'
          };
        }

        verificationResult = await yakeenService.verifyNationalId(nationalId, birthDate);

        if (!verificationResult.verified) {
          // Verification failed
          user.kycStatus = 'rejected';
          user.kycRejectionReason = verificationResult.error || 'Identity verification failed';
          await user.save();

          // Log audit
          await auditLogService.log({
            userId,
            action: 'kyc_rejected',
            resourceType: 'User',
            resourceId: userId,
            details: { reason: user.kycRejectionReason, documentType },
            ipAddress: null,
            userAgent: null
          });

          return {
            success: false,
            error: verificationResult.error,
            errorAr: verificationResult.errorAr || 'فشل التحقق من الهوية'
          };
        }

        // Verification successful - update user
        const isCitizen = nationalId.toString().startsWith('1');
        const expirationDays = isCitizen ? this.EXPIRATION_PERIODS.citizen : this.EXPIRATION_PERIODS.resident;

        user.kycStatus = 'verified';
        user.kycVerifiedAt = new Date();
        user.kycExpiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
        user.kycRejectionReason = null;

        // Store verified identity data
        user.kycVerifiedIdentity = {
          nationalId: verificationResult.data.nationalId,
          fullNameAr: verificationResult.data.fullNameAr,
          fullNameEn: verificationResult.data.fullNameEn,
          dateOfBirth: verificationResult.data.birthDate,
          nationality: verificationResult.data.nationality,
          gender: verificationResult.data.gender,
          verificationSource: 'yakeen',
          verifiedAt: new Date()
        };

        // Add document record
        user.kycDocuments.push({
          type: documentType,
          documentId: verificationResult.data.nationalId,
          documentNumber: nationalId,
          verifiedAt: new Date(),
          expiresAt: user.kycExpiresAt,
          verificationSource: 'yakeen',
          status: 'verified',
          uploadedAt: new Date()
        });

        // Perform initial AML screening
        const amlResult = await this.performAMLScreening(user, verificationResult.data);
        user.amlRiskScore = amlResult.riskScore;
        user.amlScreening = {
          lastScreenedAt: new Date(),
          status: amlResult.status,
          flags: amlResult.flags || []
        };

      } else if (documentType === 'commercial_registration') {
        // Verify business via Wathq API
        if (!crNumber) {
          return {
            success: false,
            error: 'Commercial registration number is required',
            errorAr: 'رقم السجل التجاري مطلوب'
          };
        }

        verificationResult = await wathqService.getBasicInfo(crNumber);

        if (!verificationResult.success) {
          user.kycStatus = 'rejected';
          user.kycRejectionReason = verificationResult.error || 'Business verification failed';
          await user.save();

          await auditLogService.log({
            userId,
            action: 'kyc_rejected',
            resourceType: 'User',
            resourceId: userId,
            details: { reason: user.kycRejectionReason, documentType },
            ipAddress: null,
            userAgent: null
          });

          return {
            success: false,
            error: verificationResult.error,
            errorAr: 'فشل التحقق من السجل التجاري'
          };
        }

        // Check if CR is active
        if (!verificationResult.data.status?.isActive) {
          user.kycStatus = 'rejected';
          user.kycRejectionReason = 'Commercial registration is not active';
          await user.save();

          return {
            success: false,
            error: 'Commercial registration is not active',
            errorAr: 'السجل التجاري غير نشط'
          };
        }

        // Verification successful
        user.kycStatus = 'verified';
        user.kycVerifiedAt = new Date();
        user.kycExpiresAt = new Date(Date.now() + this.EXPIRATION_PERIODS.business * 24 * 60 * 60 * 1000);
        user.kycRejectionReason = null;

        // Store verified business data
        user.kycVerifiedBusiness = {
          crNumber: verificationResult.data.crNumber,
          companyName: verificationResult.data.companyName,
          entityType: verificationResult.data.entityType?.name,
          status: verificationResult.data.status?.name,
          isActive: verificationResult.data.status?.isActive,
          verificationSource: 'wathq',
          verifiedAt: new Date()
        };

        // Add document record
        user.kycDocuments.push({
          type: documentType,
          documentId: verificationResult.data.crNumber,
          documentNumber: crNumber,
          verifiedAt: new Date(),
          expiresAt: user.kycExpiresAt,
          verificationSource: 'wathq',
          status: 'verified',
          uploadedAt: new Date()
        });

        // Set lower AML risk for verified businesses
        user.amlRiskScore = 10;
        user.amlScreening = {
          lastScreenedAt: new Date(),
          status: 'clear',
          flags: []
        };
      } else {
        return {
          success: false,
          error: 'Document type not supported for automatic verification',
          errorAr: 'نوع المستند غير مدعوم للتحقق التلقائي'
        };
      }

      await user.save();

      // Log audit
      await auditLogService.log({
        userId,
        action: 'kyc_verified',
        resourceType: 'User',
        resourceId: userId,
        details: {
          documentType,
          verificationSource: user.kycVerifiedIdentity?.verificationSource || user.kycVerifiedBusiness?.verificationSource,
          expiresAt: user.kycExpiresAt
        },
        ipAddress: null,
        userAgent: null
      });

      logger.info(`KYC verification successful for user ${userId}`);

      return {
        success: true,
        data: {
          userId,
          kycStatus: user.kycStatus,
          kycVerifiedAt: user.kycVerifiedAt,
          kycExpiresAt: user.kycExpiresAt,
          amlRiskScore: user.amlRiskScore,
          verificationSource: user.kycVerifiedIdentity?.verificationSource || user.kycVerifiedBusiness?.verificationSource,
          message: 'KYC verification successful',
          messageAr: 'تم التحقق من الهوية بنجاح'
        }
      };
    } catch (error) {
      logger.error('Error verifying identity:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify identity',
        errorAr: 'فشل التحقق من الهوية'
      };
    }
  }

  /**
   * Check KYC verification status for a user
   * @param {string} userId - User ID
   * @returns {Object} Status information
   */
  async checkVerificationStatus(userId) {
    try {
      const user = await User.findById(userId)
        .select('kycStatus kycVerifiedAt kycExpiresAt kycInitiatedAt kycRejectionReason kycDocuments amlRiskScore amlScreening');

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorAr: 'المستخدم غير موجود'
        };
      }

      // Check if KYC has expired
      let isExpired = false;
      if (user.kycStatus === 'verified' && user.kycExpiresAt && new Date(user.kycExpiresAt) < new Date()) {
        isExpired = true;
        user.kycStatus = 'expired';
        await user.save();
      }

      return {
        success: true,
        data: {
          userId,
          kycStatus: user.kycStatus,
          kycVerifiedAt: user.kycVerifiedAt,
          kycExpiresAt: user.kycExpiresAt,
          kycInitiatedAt: user.kycInitiatedAt,
          kycRejectionReason: user.kycRejectionReason,
          isExpired,
          daysUntilExpiration: user.kycExpiresAt
            ? Math.floor((new Date(user.kycExpiresAt) - new Date()) / (1000 * 60 * 60 * 24))
            : null,
          documentsCount: user.kycDocuments?.length || 0,
          verifiedDocuments: user.kycDocuments?.filter(doc => doc.status === 'verified').length || 0,
          amlRiskScore: user.amlRiskScore,
          amlStatus: user.amlScreening?.status
        }
      };
    } catch (error) {
      logger.error('Error checking KYC status:', error);
      return {
        success: false,
        error: error.message || 'Failed to check KYC status',
        errorAr: 'فشل التحقق من حالة الهوية'
      };
    }
  }

  /**
   * Get KYC verification history for a user
   * @param {string} userId - User ID
   * @returns {Object} Verification history
   */
  async getVerificationHistory(userId) {
    try {
      const user = await User.findById(userId)
        .select('kycStatus kycVerifiedAt kycExpiresAt kycInitiatedAt kycRejectionReason kycDocuments kycVerifiedIdentity kycVerifiedBusiness amlRiskScore amlScreening kycReviewedBy kycReviewedAt kycReviewNotes')
        .populate('kycReviewedBy', 'firstName lastName email');

      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorAr: 'المستخدم غير موجود'
        };
      }

      return {
        success: true,
        data: {
          userId,
          currentStatus: {
            kycStatus: user.kycStatus,
            kycVerifiedAt: user.kycVerifiedAt,
            kycExpiresAt: user.kycExpiresAt,
            kycInitiatedAt: user.kycInitiatedAt,
            kycRejectionReason: user.kycRejectionReason,
            amlRiskScore: user.amlRiskScore,
            amlStatus: user.amlScreening?.status
          },
          documents: user.kycDocuments || [],
          verifiedIdentity: user.kycVerifiedIdentity || null,
          verifiedBusiness: user.kycVerifiedBusiness || null,
          amlScreening: user.amlScreening || null,
          review: {
            reviewedBy: user.kycReviewedBy,
            reviewedAt: user.kycReviewedAt,
            notes: user.kycReviewNotes
          }
        }
      };
    } catch (error) {
      logger.error('Error getting KYC history:', error);
      return {
        success: false,
        error: error.message || 'Failed to get KYC history',
        errorAr: 'فشل الحصول على سجل التحقق من الهوية'
      };
    }
  }

  /**
   * Perform AML screening on user data
   * @param {Object} user - User object
   * @param {Object} verifiedData - Verified data from Yakeen
   * @returns {Object} AML screening result
   */
  async performAMLScreening(user, verifiedData) {
    try {
      let riskScore = 0;
      const flags = [];

      // Check 1: New account (less than 30 days old)
      const accountAge = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24);
      if (accountAge < 30) {
        riskScore += 10;
        flags.push({
          type: 'new_account',
          description: 'Account created less than 30 days ago',
          severity: 'low',
          detectedAt: new Date()
        });
      }

      // Check 2: Nationality risk (placeholder - would integrate with sanctions lists)
      // In production, integrate with OFAC, UN, EU sanctions lists
      const highRiskNationalities = []; // Would be populated from external sources
      if (verifiedData.nationality && highRiskNationalities.includes(verifiedData.nationality)) {
        riskScore += 50;
        flags.push({
          type: 'high_risk_nationality',
          description: 'User from high-risk jurisdiction',
          severity: 'high',
          detectedAt: new Date()
        });
      }

      // Check 3: Multiple failed KYC attempts
      if (user.kycStatus === 'rejected') {
        riskScore += 20;
        flags.push({
          type: 'previous_rejection',
          description: 'Previous KYC verification was rejected',
          severity: 'medium',
          detectedAt: new Date()
        });
      }

      // Check 4: Age verification (for financial services, minimum age typically 18)
      if (verifiedData.birthDate) {
        const age = this.calculateAge(verifiedData.birthDate);
        if (age < 18) {
          riskScore += 100; // Maximum risk - underage
          flags.push({
            type: 'underage',
            description: 'User is under minimum age requirement',
            severity: 'high',
            detectedAt: new Date()
          });
        }
      }

      // Determine status based on risk score
      let status = 'clear';
      if (riskScore >= this.RISK_THRESHOLDS.high || flags.some(f => f.severity === 'high')) {
        status = 'flagged';
      } else if (riskScore >= this.RISK_THRESHOLDS.medium) {
        status = 'review';
      }

      return {
        riskScore: Math.min(riskScore, 100), // Cap at 100
        status,
        flags
      };
    } catch (error) {
      logger.error('Error performing AML screening:', error);
      return {
        riskScore: 50, // Default medium risk on error
        status: 'review',
        flags: [{
          type: 'screening_error',
          description: 'Error occurred during AML screening',
          severity: 'medium',
          detectedAt: new Date()
        }]
      };
    }
  }

  /**
   * Calculate age from birth date
   * @param {string} birthDate - Birth date string
   * @returns {number} Age in years
   */
  calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Submit document for KYC verification
   * @param {string} userId - User ID
   * @param {Object} documentData - Document data
   * @returns {Object} Submission result
   */
  async submitDocument(userId, documentData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorAr: 'المستخدم غير موجود'
        };
      }

      const { type, documentNumber, fileUrl } = documentData;

      // Validate required fields
      if (!type || !fileUrl) {
        return {
          success: false,
          error: 'Document type and file URL are required',
          errorAr: 'نوع المستند ورابط الملف مطلوبان'
        };
      }

      // Add document to user's KYC documents
      user.kycDocuments.push({
        type,
        documentNumber,
        fileUrl,
        status: 'pending',
        uploadedAt: new Date()
      });

      // Set KYC status to pending if not already set
      if (!user.kycStatus) {
        user.kycStatus = 'pending';
        user.kycInitiatedAt = new Date();
      }

      await user.save();

      // Log audit
      await auditLogService.log({
        userId,
        action: 'kyc_document_submitted',
        resourceType: 'User',
        resourceId: userId,
        details: { documentType: type },
        ipAddress: null,
        userAgent: null
      });

      logger.info(`Document submitted for KYC verification: user ${userId}, type ${type}`);

      return {
        success: true,
        data: {
          userId,
          documentType: type,
          status: 'pending',
          message: 'Document submitted successfully',
          messageAr: 'تم إرسال المستند بنجاح'
        }
      };
    } catch (error) {
      logger.error('Error submitting document:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit document',
        errorAr: 'فشل إرسال المستند'
      };
    }
  }

  /**
   * Manual review and approval/rejection of KYC
   * @param {string} userId - User ID
   * @param {string} reviewerId - Reviewer admin ID
   * @param {Object} reviewData - Review decision and notes
   * @returns {Object} Review result
   */
  async reviewKYC(userId, reviewerId, reviewData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          errorAr: 'المستخدم غير موجود'
        };
      }

      const { approved, notes, documentIndex } = reviewData;

      if (approved) {
        user.kycStatus = 'verified';
        user.kycVerifiedAt = new Date();
        user.kycExpiresAt = new Date(Date.now() + this.EXPIRATION_PERIODS.resident * 24 * 60 * 60 * 1000);
        user.kycRejectionReason = null;

        // Update specific document if index provided
        if (documentIndex !== undefined && user.kycDocuments[documentIndex]) {
          user.kycDocuments[documentIndex].status = 'verified';
          user.kycDocuments[documentIndex].verifiedAt = new Date();
          user.kycDocuments[documentIndex].verificationSource = 'manual';
        }
      } else {
        user.kycStatus = 'rejected';
        user.kycRejectionReason = notes || 'Manual review rejection';

        // Update specific document if index provided
        if (documentIndex !== undefined && user.kycDocuments[documentIndex]) {
          user.kycDocuments[documentIndex].status = 'rejected';
          user.kycDocuments[documentIndex].rejectionReason = notes;
        }
      }

      user.kycReviewedBy = reviewerId;
      user.kycReviewedAt = new Date();
      user.kycReviewNotes = notes;

      await user.save();

      // Log audit
      await auditLogService.log({
        userId: reviewerId,
        action: approved ? 'kyc_approved' : 'kyc_rejected',
        resourceType: 'User',
        resourceId: userId,
        details: { notes, approved },
        ipAddress: null,
        userAgent: null
      });

      logger.info(`KYC ${approved ? 'approved' : 'rejected'} for user ${userId} by reviewer ${reviewerId}`);

      return {
        success: true,
        data: {
          userId,
          kycStatus: user.kycStatus,
          reviewedAt: user.kycReviewedAt,
          message: approved ? 'KYC approved' : 'KYC rejected',
          messageAr: approved ? 'تمت الموافقة على التحقق' : 'تم رفض التحقق'
        }
      };
    } catch (error) {
      logger.error('Error reviewing KYC:', error);
      return {
        success: false,
        error: error.message || 'Failed to review KYC',
        errorAr: 'فشل مراجعة التحقق من الهوية'
      };
    }
  }

  /**
   * Check if user's KYC is verified and not expired
   * @param {string} userId - User ID
   * @returns {boolean} Whether KYC is valid
   */
  async isKYCValid(userId) {
    try {
      const user = await User.findById(userId).select('kycStatus kycExpiresAt');
      if (!user) {
        return false;
      }

      if (user.kycStatus !== 'verified') {
        return false;
      }

      if (user.kycExpiresAt && new Date(user.kycExpiresAt) < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error checking KYC validity:', error);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new KYCService();
