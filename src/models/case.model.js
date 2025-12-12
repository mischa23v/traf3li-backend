const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════════════
    // FIRM (Multi-Tenancy)
    // ═══════════════════════════════════════════════════════════════
    firmId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Firm',
        index: true,
        required: false  // Optional for backwards compatibility
    },

    contractId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false  // Optional for external cases
    },
    lawyerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: false  // Optional for external cases
    },
    clientName: {
        type: String,
        required: false  // For external clients not on platform
    },
    clientPhone: {
        type: String,
        required: false  // For external clients
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    category: {
        type: String,
        required: true
    },
    
    // ✅ NEW: Labor case specific details
    laborCaseDetails: {
        plaintiff: {
            name: { type: String, required: false },
            nationalId: { type: String, required: false },
            phone: { type: String, required: false },
            address: { type: String, required: false },
            city: { type: String, required: false }
        },
        company: {
            name: { type: String, required: false },
            registrationNumber: { type: String, required: false },
            address: { type: String, required: false },
            city: { type: String, required: false }
        },

        // ═══════════════════════════════════════════════════════════════
        // NAJIZ LABOR CASE INTEGRATION
        // ═══════════════════════════════════════════════════════════════
        // Prerequisite checks
        laborOfficeReferral: {
            hasReferral: { type: Boolean, default: false },
            referralNumber: String,  // رقم الإحالة
            referralDate: Date,
            settlementMinutes: String,  // محضر التسوية
            settlementDate: Date,
            mediatorName: String
        },

        // Employee/Plaintiff
        employee: {
            name: String,
            nationalId: String,
            iqamaNumber: String,
            nationality: String,
            phone: String,
            jobTitle: String,
            department: String,
            employmentStartDate: Date,
            employmentEndDate: Date,
            lastSalary: Number,
            contractType: { type: String, enum: ['definite', 'indefinite', 'part_time', 'seasonal'] },
            workCity: String
        },

        // Employer/Defendant
        employer: {
            companyName: String,
            crNumber: String,
            unifiedNumber: String,
            molNumber: String,  // رقم وزارة العمل
            industry: String,
            phone: String,
            address: String,
            city: String,
            authorizedRep: {
                name: String,
                nationalId: String,
                position: String
            }
        },

        // Claim types
        claimTypes: [{
            type: { type: String, enum: [
                'wages', 'overtime', 'end_of_service', 'leave_balance', 'work_injury',
                'wrongful_termination', 'housing_allowance', 'transport_allowance',
                'medical_insurance', 'gosi_subscription', 'certificate_of_experience',
                'contract_violation', 'discrimination', 'harassment'
            ]},
            amount: Number,
            period: String,  // e.g., "6 months"
            description: String
        }],

        // GOSI (if applicable)
        gosiComplaint: {
            hasComplaint: { type: Boolean, default: false },
            complaintNumber: String,
            complaintDate: Date,
            complaintType: String,
            status: String
        },

        // Small claims flag (under SAR 50,000 = final, no appeal)
        isSmallClaim: { type: Boolean, default: false },
        totalClaimAmount: Number
    },
    
    // ✅ NEW: Case number and court
    caseNumber: {
        type: String,
        required: false
    },
    court: {
        type: String,
        required: false
    },
    judge: {
        type: String,
        required: false
    },
    nextHearing: {
        type: Date,
        required: false
    },

    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    progress: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'closed', 'appeal', 'settlement', 'on-hold', 'completed', 'won', 'lost', 'settled'],
        default: 'active'
    },
    outcome: {
        type: String,
        enum: ['won', 'lost', 'settled', 'ongoing'],
        default: 'ongoing'
    },
    claimAmount: {
        type: Number,
        default: 0
    },
    expectedWinAmount: {
        type: Number,
        default: 0
    },
    timeline: [{
        event: {
            type: String,
            required: true
        },
        date: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ['court', 'filing', 'deadline', 'general'],
            default: 'general'
        },
        status: {
            type: String,
            enum: ['upcoming', 'completed'],
            default: 'upcoming'
        }
    }],
    claims: [{
        type: {
            type: String,
            required: true
        },
        amount: {
            type: Number,
            required: true
        },
        period: String,
        description: String
    }],
    notes: [{
        text: {
            type: String,
            required: true,
            maxlength: 5000
        },
        date: {
            type: Date,
            default: Date.now
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: { type: Date, default: Date.now },
        isPrivate: {
            type: Boolean,
            default: false
        },
        // Optional: link note to a specific stage
        stageId: String,
        // Optional: attachments
        attachments: [{
            filename: String,
            url: String,
            size: Number
        }]
    }],
    documents: [{
        filename: String,
        url: String,
        fileKey: String,
        type: String,
        size: Number,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: { type: Date, default: Date.now },
        category: {
            type: String,
            enum: ['contract', 'evidence', 'correspondence', 'pleading', 'judgment', 'other'],
            default: 'other'
        },
        bucket: {
            type: String,
            enum: ['general', 'judgments'],
            default: 'general'
        },
        description: String
    }],

    // Rich text documents (editable with CKEditor, Arabic RTL support)
    richDocuments: [{
        // Basic Info
        title: {
            type: String,
            required: true
        },
        titleAr: String,  // Arabic title

        // Content (HTML from CKEditor)
        content: {
            type: String,
            default: ''
        },
        contentPlainText: String,  // For search indexing

        // Document Type
        documentType: {
            type: String,
            enum: ['legal_memo', 'contract_draft', 'pleading', 'motion', 'brief', 'letter', 'notice', 'agreement', 'report', 'notes', 'other'],
            default: 'other'
        },

        // Status
        status: {
            type: String,
            enum: ['draft', 'review', 'final', 'archived'],
            default: 'draft'
        },

        // Language & Direction
        language: {
            type: String,
            enum: ['ar', 'en', 'mixed'],
            default: 'ar'
        },
        textDirection: {
            type: String,
            enum: ['rtl', 'ltr', 'auto'],
            default: 'rtl'
        },

        // Versioning
        version: {
            type: Number,
            default: 1
        },
        previousVersions: [{
            content: String,
            version: Number,
            editedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            editedAt: Date,
            changeNote: String
        }],

        // Metadata
        wordCount: {
            type: Number,
            default: 0
        },
        characterCount: {
            type: Number,
            default: 0
        },

        // Export tracking
        lastExportedAt: Date,
        lastExportFormat: {
            type: String,
            enum: ['pdf', 'docx', 'latex', 'html', 'markdown']
        },
        exportCount: {
            type: Number,
            default: 0
        },

        // Calendar integration (optional)
        showOnCalendar: {
            type: Boolean,
            default: false
        },
        calendarDate: Date,
        calendarColor: {
            type: String,
            default: '#3b82f6'
        },

        // Audit
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        lastEditedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        updatedAt: Date
    }],
    hearings: [{
        date: Date,
        location: String,
        notes: String,
        status: {
            type: String,
            enum: ['scheduled', 'attended', 'missed'],
            default: 'scheduled'
        },
        attended: {
            type: Boolean,
            default: false
        }
    }],
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: false
    },
    source: {
        type: String,
        enum: ['platform', 'external'],
        default: 'external'  // Track where case came from
    },

    // ═══════════════════════════════════════════════════════════════
    // NAJIZ INTEGRATION - Saudi Ministry of Justice
    // ═══════════════════════════════════════════════════════════════
    najiz: {
        // Case Registration
        caseNumber: String,  // رقم القضية
        applicationNumber: String,  // رقم الطلب (before case is assigned)
        referenceNumber: String,  // رقم المرجع
        yearHijri: String,  // السنة الهجرية
        yearGregorian: Number,  // السنة الميلادية

        // Filing Date
        filingDate: Date,  // تاريخ تقديم الدعوى
        filingDateHijri: String,  // التاريخ الهجري
        registrationDate: Date,  // تاريخ قيد الدعوى

        // Classification (3-level system)
        mainClassification: {
            type: String,
            enum: ['عامة', 'جزائية', 'أحوال_شخصية', 'تجارية', 'عمالية', 'تنفيذ'],
            // English equivalents: general, criminal, personal_status, commercial, labor, enforcement
        },
        mainClassificationEn: {
            type: String,
            enum: ['general', 'criminal', 'personal_status', 'commercial', 'labor', 'enforcement']
        },
        subClassification: String,  // التصنيف الفرعي
        caseType: String,  // نوع الدعوى (e.g., إخلاء عقار, حق خاص)
        caseTypeCode: String,  // Case type code from Najiz

        // Court Information
        court: {
            type: {
                type: String,
                enum: ['supreme', 'appeal', 'general', 'criminal', 'personal_status', 'commercial', 'labor', 'enforcement']
            },
            typeAr: String,  // نوع المحكمة بالعربي
            name: String,  // اسم المحكمة
            city: String,  // المدينة
            region: String,  // المنطقة
            circuitNumber: String,  // رقم الدائرة
            circuitType: String  // نوع الدائرة (single judge, three judges, five judges)
        },

        // Judicial Panel
        judicialPanel: {
            panelNumber: String,  // رقم الهيئة القضائية
            presidingJudge: String,  // رئيس الهيئة
            judges: [String],  // أعضاء الهيئة
            clerk: String  // كاتب الجلسة
        },

        // Case Status in Najiz
        najizStatus: {
            type: String,
            enum: ['pending_registration', 'registered', 'scheduled', 'in_session', 'postponed', 'judgment_issued', 'appealed', 'final', 'enforcement', 'closed', 'archived']
        },
        statusHistory: [{
            status: String,
            date: Date,
            notes: String,
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }],

        // Sessions/Hearings
        sessions: [{
            sessionNumber: Number,
            date: Date,
            dateHijri: String,
            time: String,
            location: String,  // Hall number, building
            type: { type: String, enum: ['first_session', 'follow_up', 'judgment', 'objection', 'reconciliation'] },
            status: { type: String, enum: ['scheduled', 'held', 'postponed', 'cancelled'] },
            postponementReason: String,
            nextSessionDate: Date,
            attendees: [{
                role: String,  // plaintiff, defendant, lawyer, witness
                name: String,
                attended: Boolean
            }],
            minutes: String,  // محضر الجلسة
            decisions: [String],
            recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }],

        // Judgment
        judgment: {
            hasJudgment: { type: Boolean, default: false },
            judgmentNumber: String,
            judgmentDate: Date,
            judgmentDateHijri: String,
            judgmentType: { type: String, enum: ['in_favor', 'against', 'partial', 'dismissed', 'settled'] },
            summary: String,
            fullText: String,
            awardedAmount: Number,
            currency: { type: String, default: 'SAR' },
            executionStatus: { type: String, enum: ['pending', 'in_execution', 'executed', 'not_applicable'] },
            deedNumber: String,  // رقم الصك
            deedDate: Date
        },

        // Appeal
        appeal: {
            hasAppeal: { type: Boolean, default: false },
            appealNumber: String,
            appealDate: Date,
            appealDeadline: Date,
            appealCourt: String,
            appealStatus: { type: String, enum: ['filed', 'under_review', 'hearing_scheduled', 'decided', 'rejected', 'accepted'] },
            appealResult: String,
            supremeCourtReview: {
                requested: { type: Boolean, default: false },
                requestDate: Date,
                result: String
            }
        },

        // E-Litigation (التقاضي الإلكتروني)
        eLitigation: {
            enabled: { type: Boolean, default: true },
            virtualHearing: { type: Boolean, default: false },
            virtualHearingUrl: String,
            electronicPleadings: [{
                date: Date,
                type: String,
                content: String,
                submittedBy: String
            }],
            electronicNotifications: [{
                date: Date,
                type: String,
                message: String,
                deliveryStatus: String
            }]
        },

        // Sync Status
        lastSyncedAt: Date,
        syncStatus: { type: String, enum: ['synced', 'pending', 'error'] },
        syncErrors: [{ date: Date, error: String }]
    },

    // ═══════════════════════════════════════════════════════════════
    // PLAINTIFF INFORMATION (المدعي)
    // ═══════════════════════════════════════════════════════════════
    plaintiff: {
        type: { type: String, enum: ['individual', 'company', 'government'] },

        // Individual fields
        nationalId: String,  // رقم الهوية
        identityType: { type: String, enum: ['national_id', 'iqama', 'visitor_id', 'gcc_id', 'passport'] },
        fullNameArabic: String,  // الاسم الرباعي بالعربي
        firstName: String,
        fatherName: String,
        grandfatherName: String,
        familyName: String,
        fullNameEnglish: String,
        nationality: String,
        gender: { type: String, enum: ['male', 'female'] },

        // Company fields
        crNumber: String,  // رقم السجل التجاري
        companyName: String,
        companyNameEnglish: String,
        unifiedNumber: String,  // الرقم الموحد
        authorizedRepresentative: {
            name: String,
            nationalId: String,
            position: String,
            phone: String
        },

        // Contact
        phone: String,
        email: String,

        // National Address
        nationalAddress: {
            buildingNumber: String,  // رقم المبنى
            streetName: String,  // اسم الشارع
            district: String,  // الحي
            city: String,  // المدينة
            region: String,  // المنطقة
            postalCode: String,  // الرمز البريدي (5 digits)
            additionalNumber: String,  // الرقم الإضافي (4 digits)
            shortAddress: String  // العنوان المختصر (e.g., RHMA3184)
        },

        // POA if represented by lawyer
        powerOfAttorney: {
            hasPOA: { type: Boolean, default: false },
            poaNumber: String,
            lawyerName: String,
            lawyerLicenseNumber: String,
            lawyerPhone: String,
            issueDate: Date,
            expiryDate: Date,
            authorizations: [String]  // المرافعة, الصلح, الإقرار, etc.
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // DEFENDANT INFORMATION (المدعى عليه)
    // ═══════════════════════════════════════════════════════════════
    defendant: {
        // Same structure as plaintiff
        type: { type: String, enum: ['individual', 'company', 'government'] },

        // Individual fields
        nationalId: String,
        identityType: { type: String, enum: ['national_id', 'iqama', 'visitor_id', 'gcc_id', 'passport'] },
        fullNameArabic: String,
        firstName: String,
        fatherName: String,
        grandfatherName: String,
        familyName: String,
        fullNameEnglish: String,
        nationality: String,
        gender: { type: String, enum: ['male', 'female'] },

        // Company fields
        crNumber: String,
        companyName: String,
        companyNameEnglish: String,
        unifiedNumber: String,
        authorizedRepresentative: {
            name: String,
            nationalId: String,
            position: String,
            phone: String
        },

        // Contact
        phone: String,
        email: String,

        // National Address
        nationalAddress: {
            buildingNumber: String,
            streetName: String,
            district: String,
            city: String,
            region: String,
            postalCode: String,
            additionalNumber: String,
            shortAddress: String
        },

        // POA
        powerOfAttorney: {
            hasPOA: { type: Boolean, default: false },
            poaNumber: String,
            lawyerName: String,
            lawyerLicenseNumber: String,
            lawyerPhone: String,
            issueDate: Date,
            expiryDate: Date,
            authorizations: [String]
        },

        // Defendant response
        responseStatus: { type: String, enum: ['not_notified', 'notified', 'responded', 'no_response'] },
        responseDate: Date,
        defenseStatement: String
    },

    // ═══════════════════════════════════════════════════════════════
    // COMMERCIAL CASE SPECIFIC (القضايا التجارية)
    // ═══════════════════════════════════════════════════════════════
    commercialCaseDetails: {
        // Claim value threshold
        claimValue: Number,
        currency: { type: String, default: 'SAR' },
        isAboveThreshold: { type: Boolean, default: false },  // > 100,000 SAR

        // Contract details
        contract: {
            hasContract: { type: Boolean, default: false },
            contractNumber: String,
            contractDate: Date,
            contractType: { type: String, enum: ['sale', 'lease', 'service', 'partnership', 'agency', 'franchise', 'construction', 'other'] },
            contractValue: Number,
            partyOneName: String,
            partyTwoName: String
        },

        // Banking (if applicable)
        bankingDetails: {
            bankName: String,
            accountNumber: String,
            chequeNumber: String,
            chequeDate: Date,
            chequeAmount: Number,
            promissoryNoteNumber: String,
            promissoryNoteDate: Date,
            promissoryNoteAmount: Number
        },

        // Bankruptcy (if applicable)
        bankruptcy: {
            isBankruptcyCase: { type: Boolean, default: false },
            type: { type: String, enum: ['protective_settlement', 'financial_restructuring', 'liquidation'] },
            trusteeAppointment: {
                trusteeName: String,
                appointmentDate: Date
            },
            creditorsMeeting: [{
                date: Date,
                outcome: String
            }]
        },

        // Pre-filing notice requirement
        preLitigationNotice: {
            sent: { type: Boolean, default: false },
            sentDate: Date,
            method: String,
            proofAttached: { type: Boolean, default: false }
        },

        // Attorney requirement for appeals
        attorneyRequired: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // PERSONAL STATUS CASE SPECIFIC (قضايا الأحوال الشخصية)
    // ═══════════════════════════════════════════════════════════════
    personalStatusDetails: {
        caseCategory: {
            type: String,
            enum: ['marriage', 'divorce', 'custody', 'alimony', 'visitation', 'inheritance', 'guardianship', 'waqf', 'will']
        },

        // Marriage/Divorce
        marriageInfo: {
            marriageContractNumber: String,
            marriageDate: Date,
            marriageDateHijri: String,
            divorceDate: Date,
            divorceDateHijri: String,
            divorceType: { type: String, enum: ['talaq', 'khula', 'judicial', 'faskh'] },
            iddahEndDate: Date,  // عدة المرأة
            mahr: {
                advanced: Number,
                deferred: Number
            }
        },

        // Custody
        custodyInfo: {
            children: [{
                name: String,
                nationalId: String,
                dateOfBirth: Date,
                gender: { type: String, enum: ['male', 'female'] },
                currentCustodian: String,
                requestedCustodian: String
            }],
            visitationSchedule: String,
            travelPermission: String
        },

        // Alimony/Support
        supportInfo: {
            type: { type: String, enum: ['child_support', 'wife_support', 'parent_support'] },
            currentAmount: Number,
            requestedAmount: Number,
            frequency: { type: String, enum: ['monthly', 'yearly', 'one_time'] }
        },

        // Inheritance
        inheritanceInfo: {
            deceasedName: String,
            deceasedNationalId: String,
            deathDate: Date,
            deathCertificateNumber: String,
            heirCertificateNumber: String,  // صك حصر الورثة
            heirs: [{
                name: String,
                nationalId: String,
                relationship: String,
                share: String  // e.g., "1/4", "1/8"
            }],
            estateValue: Number,
            realEstateIncluded: { type: Boolean, default: false }
        },

        // Guardianship
        guardianshipInfo: {
            type: { type: String, enum: ['minor', 'interdiction', 'property'] },
            wardName: String,
            wardNationalId: String,
            currentGuardian: String,
            requestedGuardian: String,
            guardianshipReason: String
        },

        // Fee exemption (family cases are exempt)
        feeExempt: { type: Boolean, default: true }
    },

    // ═══════════════════════════════════════════════════════════════
    // ENFORCEMENT DETAILS (التنفيذ)
    // ═══════════════════════════════════════════════════════════════
    enforcementDetails: {
        hasEnforcementRequest: { type: Boolean, default: false },

        // Enforcement request
        enforcementRequest: {
            requestNumber: String,
            requestDate: Date,
            enforcementCourt: String,
            enforcementCircuit: String
        },

        // Enforcement document
        enforcementDocument: {
            type: { type: String, enum: ['judgment', 'judicial_decision', 'judicial_order', 'cheque', 'promissory_note', 'bill_of_exchange', 'notarized_contract', 'settlement', 'arbitration_award', 'foreign_judgment'] },
            documentNumber: String,
            documentDate: Date,
            issuingAuthority: String,
            amount: Number,
            currency: { type: String, default: 'SAR' }
        },

        // Enforcement actions
        actions: [{
            type: { type: String, enum: ['notification', 'publication', 'service_suspension', 'account_freeze', 'asset_attachment', 'travel_ban', 'id_suspension', 'property_seizure'] },
            date: Date,
            status: { type: String, enum: ['initiated', 'in_progress', 'completed', 'cancelled'] },
            details: String
        }],

        // Payment/Settlement
        paymentInfo: {
            totalDue: Number,
            amountPaid: Number,
            remainingBalance: Number,
            paymentSchedule: [{
                dueDate: Date,
                amount: Number,
                paid: { type: Boolean, default: false },
                paidDate: Date
            }],
            ibanNumber: String  // For receiving payments
        },

        // Debtor status
        debtorStatus: {
            hasAssets: Boolean,
            assetsDescription: String,
            isAbsconding: { type: Boolean, default: false },
            isInsolvent: { type: Boolean, default: false },
            insolvencyRequestDate: Date
        }
    },

    // ═══════════════════════════════════════════════════════════════
    // COSTS & FEES (التكاليف القضائية)
    // ═══════════════════════════════════════════════════════════════
    judicialCosts: {
        isExempt: { type: Boolean, default: false },
        exemptionReason: String,  // e.g., "family case", "bankruptcy", "public right"

        filingFee: {
            amount: Number,
            paidDate: Date,
            receiptNumber: String,
            paymentMethod: { type: String, enum: ['sadad', 'mada', 'credit_card'] }
        },

        additionalFees: [{
            type: String,  // e.g., "expert fees", "translation fees"
            amount: Number,
            paidDate: Date,
            receiptNumber: String
        }],

        totalPaid: Number,

        // Calculated using: https://cfee.moj.gov.sa/index.html
        calculatorUsed: { type: Boolean, default: false }
    },

    // ═══════════════════════════════════════════════════════════════
    // CASE PIPELINE FIELDS
    // ═══════════════════════════════════════════════════════════════

    // Current stage in the pipeline (e.g., 'filing', 'friendly_settlement_1', 'labor_court')
    currentStage: {
        type: String,
        default: 'filing',
        index: true
    },

    // Alias for backwards compatibility (synced with currentStage)
    pipelineStage: {
        type: String,
        default: 'filing',
        index: true
    },

    // When the case entered the current stage
    stageEnteredAt: {
        type: Date,
        default: Date.now
    },

    // Stage history for tracking progression
    stageHistory: [{
        stage: String,
        enteredAt: Date,
        exitedAt: Date,
        notes: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],

    // Case end details
    endDetails: {
        endDate: Date,
        endReason: {
            type: String,
            enum: ['final_judgment', 'settlement', 'withdrawal', 'dismissal', 'reconciliation', 'execution_complete', 'other']
        },
        finalAmount: Number,
        notes: String,
        endedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },

    // Parties (for display on pipeline cards)
    plaintiffName: String,
    defendantName: String,

    // Linked items counts (can be computed or stored)
    linkedCounts: {
        tasks: { type: Number, default: 0 },
        notionPages: { type: Number, default: 0 },
        reminders: { type: Number, default: 0 },
        events: { type: Number, default: 0 }
    }
}, {
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════════
// VIRTUAL: notionPagesCount
// Count of CaseNotion pages for this case (used by CaseNotion list page)
// ═══════════════════════════════════════════════════════════════
caseSchema.virtual('notionPagesCount', {
    ref: 'CaseNotionPage',
    localField: '_id',
    foreignField: 'caseId',
    count: true,
    match: { deletedAt: null, archivedAt: null }
});

caseSchema.index({ lawyerId: 1, status: 1 });
caseSchema.index({ clientId: 1, status: 1 });
// Compound indexes for multi-tenant dashboard queries
caseSchema.index({ firmId: 1, status: 1, createdAt: -1 });
caseSchema.index({ firmId: 1, lawyerId: 1, status: 1 });
caseSchema.index({ firmId: 1, priority: 1, status: 1 });
caseSchema.index({ 'richDocuments.showOnCalendar': 1, 'richDocuments.calendarDate': 1 });
caseSchema.index({ 'richDocuments.documentType': 1 });
caseSchema.index({ 'richDocuments.status': 1 });

// ═══════════════════════════════════════════════════════════════
// NAJIZ INTEGRATION INDEXES
// ═══════════════════════════════════════════════════════════════
caseSchema.index({ 'najiz.caseNumber': 1 });
caseSchema.index({ 'najiz.applicationNumber': 1 });
caseSchema.index({ 'najiz.mainClassification': 1 });
caseSchema.index({ 'najiz.court.city': 1 });
caseSchema.index({ 'najiz.najizStatus': 1 });
caseSchema.index({ 'plaintiff.nationalId': 1 });
caseSchema.index({ 'defendant.nationalId': 1 });
caseSchema.index({ 'laborCaseDetails.laborOfficeReferral.referralNumber': 1 });
caseSchema.index({ 'enforcementDetails.enforcementRequest.requestNumber': 1 });

// ═══════════════════════════════════════════════════════════════
// PIPELINE INDEXES
// ═══════════════════════════════════════════════════════════════
caseSchema.index({ category: 1, currentStage: 1 });
caseSchema.index({ category: 1, outcome: 1 });
caseSchema.index({ stageEnteredAt: 1 });
caseSchema.index({ firmId: 1, category: 1, currentStage: 1 });
caseSchema.index({ firmId: 1, category: 1, outcome: 1 });

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Cascade delete documents when case is deleted
 */
caseSchema.post('findOneAndDelete', async function(doc) {
    if (doc) {
        try {
            const Document = mongoose.model('Document');
            const { deleteObject, BUCKETS } = require('../configs/s3');

            // Find all documents associated with this case
            const documents = await Document.find({ caseId: doc._id });

            // Delete files from S3
            for (const document of documents) {
                try {
                    await deleteObject(BUCKETS.general, document.fileKey);
                } catch (err) {
                    console.error(`S3 delete error for document ${document._id}:`, err);
                }
            }

            // Delete document records from database
            await Document.deleteMany({ caseId: doc._id });

            console.log(`Deleted ${documents.length} documents for case ${doc._id}`);
        } catch (error) {
            console.error('Error cleaning up documents for deleted case:', error);
        }
    }
});

module.exports = mongoose.model('Case', caseSchema);
