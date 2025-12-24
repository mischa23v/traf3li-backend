const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Respondent Schema (person complained against)
const respondentSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: String,
    employeeNameAr: String,
    jobTitle: String,
    department: String,
    relationshipToComplainant: {
        type: String,
        enum: ['manager', 'supervisor', 'colleague', 'subordinate', 'hr', 'senior_management', 'other']
    }
}, { _id: false });

// Witness Schema
const witnessSchema = new mongoose.Schema({
    witnessId: String,
    witnessName: String,
    witnessNameAr: String,
    witnessType: {
        type: String,
        enum: ['employee', 'external', 'anonymous']
    },
    contactInfo: String,
    relationshipToIncident: String,
    statementProvided: { type: Boolean, default: false },
    statementDate: Date,
    statementUrl: String,
    willingToTestify: { type: Boolean, default: false },
    interviewed: { type: Boolean, default: false },
    interviewDate: Date,
    interviewNotes: String
}, { _id: true });

// Evidence Schema
const evidenceSchema = new mongoose.Schema({
    evidenceId: String,
    evidenceType: {
        type: String,
        enum: ['document', 'email', 'message', 'photo', 'video', 'audio', 'record', 'testimony', 'other']
    },
    evidenceDescription: String,
    evidenceUrl: String,
    dateObtained: Date,
    verified: { type: Boolean, default: false },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationDate: Date,
    admissible: { type: Boolean, default: true },
    chainOfCustody: [{
        date: Date,
        transferredFrom: String,
        transferredTo: String,
        purpose: String
    }]
}, { _id: true });

// Interview Schema
const interviewSchema = new mongoose.Schema({
    interviewId: String,
    interviewDate: Date,
    intervieweeName: String,
    intervieweeType: {
        type: String,
        enum: ['complainant', 'respondent', 'witness', 'expert', 'other']
    },
    interviewer: String,
    duration: Number,
    location: String,
    representativePresent: { type: Boolean, default: false },
    representativeName: String,
    recorded: { type: Boolean, default: false },
    recordingType: { type: String, enum: ['audio', 'video', 'written_notes'] },
    transcriptPrepared: { type: Boolean, default: false },
    transcriptUrl: String,
    summaryOfStatement: String,
    credibilityAssessment: {
        credible: Boolean,
        consistencyWithOtherEvidence: { type: String, enum: ['consistent', 'inconsistent', 'neutral'] },
        notes: String
    },
    followUpRequired: { type: Boolean, default: false },
    followUpDate: Date
}, { _id: true });

// Timeline Event Schema
const timelineEventSchema = new mongoose.Schema({
    eventId: String,
    eventType: {
        type: String,
        enum: ['filed', 'acknowledged', 'assessed', 'investigation_started', 'interview',
               'evidence_collected', 'investigation_completed', 'mediation', 'resolution',
               'appeal', 'labor_office', 'court', 'closure', 'other']
    },
    eventDate: { type: Date, default: Date.now },
    eventDescription: String,
    eventDescriptionAr: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueDate: Date,
    onTime: Boolean,
    documents: [String],
    notes: String
}, { _id: true });

// Communication Schema
const communicationSchema = new mongoose.Schema({
    communicationId: String,
    communicationType: {
        type: String,
        enum: ['email', 'letter', 'meeting', 'phone', 'portal_notification']
    },
    date: { type: Date, default: Date.now },
    from: String,
    to: String,
    purpose: {
        type: String,
        enum: ['acknowledgment', 'information_request', 'interview_invitation',
               'interim_update', 'resolution_notice', 'appeal_notification', 'reminder', 'other']
    },
    subject: String,
    message: String,
    attachments: [String],
    sent: { type: Boolean, default: false },
    delivered: { type: Boolean, default: false },
    read: { type: Boolean, default: false },
    readDate: Date,
    responseRequired: { type: Boolean, default: false },
    responseReceived: { type: Boolean, default: false },
    responseDate: Date
}, { _id: true });

// Document Schema
const grievanceDocumentSchema = new mongoose.Schema({
    documentType: {
        type: String,
        enum: ['complaint_form', 'evidence', 'witness_statement', 'interview_transcript',
               'investigation_report', 'mediation_agreement', 'settlement_agreement',
               'resolution_letter', 'appeal_notice', 'labor_office_submission',
               'court_filing', 'judgment', 'closure_document', 'other']
    },
    documentName: String,
    documentNameAr: String,
    fileUrl: String,
    fileName: String,
    fileSize: Number,
    uploadedOn: { type: Date, default: Date.now },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    confidential: { type: Boolean, default: false },
    accessLevel: {
        type: String,
        enum: ['complainant', 'respondent', 'investigators', 'management', 'legal', 'all_parties', 'restricted'],
        default: 'investigators'
    },
    expiryDate: Date
}, { _id: true });

// Interim Measure Schema
const interimMeasureSchema = new mongoose.Schema({
    measureType: {
        type: String,
        enum: ['separation', 'suspension', 'transfer', 'schedule_change',
               'supervision', 'access_restriction', 'no_contact_order', 'other']
    },
    measureDescription: String,
    appliedTo: { type: String, enum: ['complainant', 'respondent', 'both'] },
    implementationDate: Date,
    duration: { type: String, enum: ['temporary', 'until_resolution', 'indefinite'] },
    endDate: Date,
    suspension: {
        suspensionType: { type: String, enum: ['with_pay', 'without_pay'] },
        suspensionDuration: Number,
        suspensionReason: String,
        investigationSuspension: { type: Boolean, default: false },
        maxDurationCompliant: { type: Boolean, default: true },
        approvedBy: String,
        approvalDate: Date
    },
    transfer: {
        transferType: { type: String, enum: ['department', 'location', 'shift'] },
        fromLocation: String,
        toLocation: String,
        temporary: { type: Boolean, default: true },
        voluntary: { type: Boolean, default: false },
        salarySameLevel: { type: Boolean, default: true }
    },
    justification: String,
    implemented: { type: Boolean, default: false },
    implementationNotes: String
}, { _id: true });

// Mediation Session Schema
const mediationSessionSchema = new mongoose.Schema({
    sessionDate: Date,
    sessionNumber: Number,
    duration: Number,
    location: String,
    attendees: [String],
    sessionSummary: String,
    progress: { type: String, enum: ['significant', 'some', 'none', 'setback'] },
    agreementReached: { type: Boolean, default: false }
}, { _id: true });

// ═══════════════════════════════════════════════════════════════
// MAIN SCHEMA
// ═══════════════════════════════════════════════════════════════

const grievanceSchema = new mongoose.Schema({
    // ==================== IDENTIFICATION ====================
    grievanceId: { type: String, unique: true, sparse: true },
    grievanceNumber: String,

    // ==================== MULTI-TENANCY ====================
    firmId: { type: mongoose.Schema.Types.ObjectId, ref: 'Firm', index: true },
    lawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    // ==================== COMPLAINANT (Employee) ====================
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        index: true
    },
    employeeNumber: String,
    employeeName: { type: String },
    employeeNameAr: String,
    department: String,
    departmentId: String,
    jobTitle: String,
    email: String,
    phone: String,

    // ==================== GRIEVANCE DETAILS ====================
    grievanceType: {
        type: String,
        enum: ['compensation', 'benefits', 'working_conditions', 'safety', 'harassment',
               'discrimination', 'bullying', 'retaliation', 'wrongful_termination',
               'disciplinary_action', 'performance_evaluation', 'promotion', 'transfer',
               'leave', 'overtime', 'contract_violation', 'unfair_treatment',
               'whistleblower', 'other'],
        index: true
    },
    grievanceTypeAr: String,
    grievanceCategory: {
        type: String,
        enum: ['individual', 'collective', 'policy_related', 'legal_violation', 'ethical_violation'],
        default: 'individual'
    },
    grievanceSubject: { type: String },
    grievanceSubjectAr: String,
    grievanceDescription: { type: String },
    grievanceDescriptionAr: String,
    detailedDescription: String,

    // ==================== INCIDENT DETAILS ====================
    incidentDetails: {
        incidentDate: Date,
        incidentTime: String,
        incidentLocation: String,
        frequency: { type: String, enum: ['one_time', 'recurring', 'ongoing'] },
        occurrenceCount: Number,
        previouslyReported: { type: Boolean, default: false },
        previousReportDate: Date,
        previousReportOutcome: String
    },

    // ==================== RESPONDENT (Against whom) ====================
    complainedAgainst: {
        type: { type: String, enum: ['person', 'department', 'policy', 'decision', 'practice'] },
        respondent: respondentSchema,
        additionalRespondents: [respondentSchema],
        entity: {
            entityType: { type: String, enum: ['department', 'policy', 'procedure', 'decision'] },
            entityName: String,
            policyReference: String,
            decisionDate: Date
        }
    },

    // ==================== DATES ====================
    filedDate: { type: Date, index: true },
    incidentDate: Date,

    // ==================== STATUS ====================
    status: {
        type: String,
        enum: ['submitted', 'under_review', 'investigating', 'resolved', 'escalated', 'closed', 'withdrawn'],
        default: 'submitted',
        index: true
    },
    statusDate: { type: Date, default: Date.now },
    statusReason: String,

    // ==================== PRIORITY & SEVERITY ====================
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    severity: {
        type: String,
        enum: ['minor', 'moderate', 'serious', 'critical'],
        default: 'moderate'
    },
    urgency: {
        isUrgent: { type: Boolean, default: false },
        urgencyReason: String,
        immediateDangerPresent: { type: Boolean, default: false },
        requiresImmediateAction: { type: Boolean, default: false },
        recommendedAction: String
    },

    // ==================== CONFIDENTIALITY ====================
    confidential: { type: Boolean, default: false },
    confidentialityLevel: { type: String, enum: ['restricted', 'confidential', 'highly_confidential'] },
    anonymousComplaint: { type: Boolean, default: false },
    protectedDisclosure: { type: Boolean, default: false },
    whistleblowerProtectionRequested: { type: Boolean, default: false },

    // ==================== WITNESSES ====================
    witnesses: [witnessSchema],

    // ==================== EVIDENCE ====================
    evidence: [evidenceSchema],

    // ==================== DESIRED OUTCOME ====================
    desiredOutcome: {
        outcomeSought: String,
        outcomeSoughtAr: String,
        specificRequests: [{
            request: String,
            requestType: {
                type: String,
                enum: ['compensation', 'apology', 'policy_change', 'disciplinary_action',
                       'transfer', 'reinstatement', 'training', 'other']
            }
        }],
        compensationSought: {
            seekingCompensation: { type: Boolean, default: false },
            estimatedAmount: Number,
            compensationType: {
                type: String,
                enum: ['back_pay', 'damages', 'legal_fees', 'punitive', 'other']
            },
            calculationBasis: String
        }
    },

    // ==================== FILING DETAILS ====================
    filing: {
        filedTime: String,
        filingMethod: {
            type: String,
            enum: ['online_portal', 'email', 'written_letter', 'in_person', 'phone', 'anonymous_hotline', 'union']
        },
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        receivedByName: String,
        acknowledgment: {
            acknowledged: { type: Boolean, default: false },
            acknowledgmentDate: Date,
            acknowledgmentMethod: { type: String, enum: ['email', 'letter', 'portal_notification', 'in_person'] },
            acknowledgmentSent: { type: Boolean, default: false },
            acknowledgmentReference: String,
            employeeNotified: { type: Boolean, default: false },
            notificationDate: Date
        },
        supportingDocuments: [{
            documentType: String,
            documentName: String,
            fileUrl: String,
            uploadedDate: Date,
            verified: { type: Boolean, default: false }
        }],
        representation: {
            hasRepresentation: { type: Boolean, default: false },
            representativeType: { type: String, enum: ['union', 'attorney', 'colleague', 'family_member', 'other'] },
            representativeName: String,
            representativeContact: String,
            powerOfAttorney: {
                provided: { type: Boolean, default: false },
                documentUrl: String,
                verified: { type: Boolean, default: false }
            }
        }
    },

    // ==================== ASSESSMENT & TRIAGE ====================
    assessment: {
        assessed: { type: Boolean, default: false },
        assessmentDate: Date,
        assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        initialReview: {
            reviewDate: Date,
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            jurisdictionCheck: {
                withinJurisdiction: { type: Boolean, default: true },
                reason: String,
                appropriateVenue: {
                    type: String,
                    enum: ['internal_hr', 'labor_office', 'court', 'external_authority', 'other']
                }
            },
            validityCheck: {
                hasStanding: { type: Boolean, default: true },
                timely: { type: Boolean, default: true },
                timeLimit: Number,
                daysElapsed: Number,
                withinScope: { type: Boolean, default: true },
                sufficient: { type: Boolean, default: true },
                frivolous: { type: Boolean, default: false },
                malicious: { type: Boolean, default: false },
                validClaim: { type: Boolean, default: true }
            },
            riskAssessment: {
                legalRisk: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
                reputationalRisk: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
                financialRisk: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
                safetyRisk: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'none' },
                regulatoryRisk: { type: String, enum: ['none', 'low', 'medium', 'high'], default: 'none' },
                overallRisk: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },
                riskFactors: [String]
            },
            classification: {
                category: String,
                subcategory: String,
                relatedPolicies: [String],
                potentialViolations: [{
                    violationType: { type: String, enum: ['policy', 'law', 'regulation', 'contract'] },
                    reference: String,
                    description: String
                }]
            },
            recommendation: {
                recommendedAction: { type: String, enum: ['investigate', 'mediate', 'dismiss', 'escalate', 'refer'] },
                recommendedPriority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
                recommendedTimeline: String,
                specialInstructions: String
            },
            reviewNotes: String
        },
        approvalToInvestigate: {
            required: { type: Boolean, default: false },
            approved: { type: Boolean, default: false },
            approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            approvalDate: Date,
            denialReason: String
        }
    },

    // ==================== INTERIM MEASURES ====================
    interimMeasures: {
        required: { type: Boolean, default: false },
        measures: [interimMeasureSchema],
        employeeInformed: { type: Boolean, default: false },
        informedDate: Date
    },

    // ==================== INVESTIGATION ====================
    investigation: {
        investigationRequired: { type: Boolean, default: true },
        investigationStartDate: Date,
        investigationEndDate: Date,
        investigationDuration: Number,
        investigators: [{
            investigatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            investigatorName: String,
            investigatorType: {
                type: String,
                enum: ['internal_hr', 'internal_legal', 'external_investigator',
                       'external_law_firm', 'labor_inspector', 'committee']
            },
            role: { type: String, enum: ['lead', 'assistant', 'advisor', 'observer'] },
            qualifications: String,
            independentOfParties: { type: Boolean, default: true },
            conflictOfInterest: { type: Boolean, default: false },
            conflictDetails: String
        }],
        investigationPlan: {
            scope: String,
            methodology: String,
            estimatedDuration: Number,
            keyIssues: [String],
            personsToInterview: [String],
            documentsToReview: [String],
            timeline: [{
                milestone: String,
                targetDate: Date,
                completed: { type: Boolean, default: false },
                completionDate: Date
            }]
        },
        interviews: [interviewSchema],
        evidenceCollected: [{
            evidenceId: String,
            evidenceType: String,
            collectionDate: Date,
            collectedBy: String,
            sourceLocation: String,
            description: String,
            fileUrl: String,
            chainOfCustody: [{
                date: Date,
                transferredFrom: String,
                transferredTo: String,
                purpose: String
            }],
            analyzed: { type: Boolean, default: false },
            analysisDate: Date,
            analysisBy: String,
            findings: String
        }],
        documentsReviewed: [{
            documentType: String,
            documentName: String,
            reviewDate: Date,
            reviewedBy: String,
            relevance: { type: String, enum: ['high', 'medium', 'low'] },
            keyFindings: String
        }],
        externalConsultations: [{
            consultationType: { type: String, enum: ['legal', 'medical', 'technical', 'expert'] },
            consultantName: String,
            consultationDate: Date,
            purpose: String,
            findings: String,
            reportUrl: String
        }],
        findings: {
            findingsDate: Date,
            substantiated: Boolean,
            findingLevel: {
                type: String,
                enum: ['substantiated', 'unsubstantiated', 'inconclusive', 'partially_substantiated']
            },
            findingsNarrative: String,
            findingsNarrativeAr: String,
            allegationFindings: [{
                allegation: String,
                substantiated: Boolean,
                evidence: String,
                conclusion: String
            }],
            violationsFound: [{
                violationType: { type: String, enum: ['policy', 'law', 'regulation', 'contract', 'ethics'] },
                violationReference: String,
                violationDescription: String,
                violator: String,
                severity: { type: String, enum: ['minor', 'moderate', 'serious', 'severe'] },
                saudiLaborLawArticle: String
            }],
            contributingFactors: [String],
            mitigatingFactors: [String],
            aggravatingFactors: [String],
            credibilityAssessment: {
                complainantCredibility: { type: String, enum: ['high', 'medium', 'low'] },
                respondentCredibility: { type: String, enum: ['high', 'medium', 'low'] },
                notes: String
            }
        },
        investigationReport: {
            reportPrepared: { type: Boolean, default: false },
            reportDate: Date,
            preparedBy: String,
            reportUrl: String,
            executiveSummary: String,
            recommendations: [{
                recommendation: String,
                recommendationType: {
                    type: String,
                    enum: ['disciplinary', 'policy_change', 'training', 'process_improvement', 'no_action', 'other']
                },
                priority: { type: String, enum: ['immediate', 'high', 'medium', 'low'] },
                responsibleParty: String,
                targetDate: Date
            }],
            reportReviewed: { type: Boolean, default: false },
            reviewedBy: String,
            reviewDate: Date
        },
        investigationCompleted: { type: Boolean, default: false },
        completionDate: Date
    },

    // ==================== MEDIATION ====================
    mediation: {
        mediationOffered: { type: Boolean, default: false },
        mediationType: { type: String, enum: ['voluntary', 'mandatory', 'court_ordered'] },
        complainantAgreed: { type: Boolean, default: false },
        respondentAgreed: { type: Boolean, default: false },
        bothPartiesAgreed: { type: Boolean, default: false },
        mediator: {
            mediatorName: String,
            mediatorType: { type: String, enum: ['internal', 'external', 'labor_office', 'judicial'] },
            mediatorQualifications: String,
            mediatorFee: Number,
            feePaidBy: { type: String, enum: ['company', 'split', 'parties'] }
        },
        sessions: [mediationSessionSchema],
        outcome: {
            successful: Boolean,
            settlementReached: { type: Boolean, default: false },
            settlementDate: Date,
            settlementTerms: {
                termsConfidential: { type: Boolean, default: false },
                summary: String,
                monetarySettlement: {
                    amount: Number,
                    paymentSchedule: { type: String, enum: ['lump_sum', 'installments'] },
                    installments: Number,
                    taxable: { type: Boolean, default: false }
                },
                nonMonetaryTerms: [{
                    term: String,
                    termType: {
                        type: String,
                        enum: ['apology', 'policy_change', 'training', 'transfer', 'promotion',
                               'reinstatement', 'reference', 'other']
                    },
                    implementationDeadline: Date
                }],
                mutualRelease: { type: Boolean, default: false },
                nonAdmissionClause: { type: Boolean, default: false },
                confidentialityClause: { type: Boolean, default: false },
                nonDisparagement: { type: Boolean, default: false }
            },
            settlementAgreement: {
                signed: { type: Boolean, default: false },
                signedDate: Date,
                documentUrl: String,
                witnessedBy: String,
                legalReview: { type: Boolean, default: false },
                reviewedBy: String
            },
            failureReason: String
        }
    },

    // ==================== RESOLUTION ====================
    resolution: {
        resolved: { type: Boolean, default: false },
        resolutionDate: Date,
        resolutionMethod: {
            type: String,
            enum: ['investigation_findings', 'mediation_settlement', 'management_decision',
                   'labor_office_decision', 'court_judgment', 'withdrawal', 'dismissal']
        },
        decision: {
            decisionMaker: String,
            decisionMakerTitle: String,
            decisionDate: Date,
            decisionSummary: String,
            decisionSummaryAr: String,
            outcome: {
                type: String,
                enum: ['grievance_upheld', 'grievance_partially_upheld', 'grievance_denied',
                       'settlement_reached', 'withdrawn', 'dismissed']
            },
            basisOfDecision: String,
            factualFindings: String,
            legalConclusions: String,
            policyInterpretation: String
        },
        actionsTaken: [{
            actionType: { type: String, enum: ['disciplinary', 'corrective', 'remedial', 'preventive', 'compensatory'] },
            actionDescription: String,
            actionTarget: String,
            implementationDate: Date,
            completed: { type: Boolean, default: false },
            completionDate: Date,
            verifiedBy: String
        }],
        disciplinaryAction: {
            actionRequired: { type: Boolean, default: false },
            actionAgainst: String,
            disciplinaryActionType: {
                type: String,
                enum: ['verbal_warning', 'written_warning', 'suspension', 'demotion', 'salary_reduction', 'termination']
            },
            violationCode: String,
            offenseCount: Number,
            actionDate: Date,
            actionDetails: String,
            saudiLawCompliant: { type: Boolean, default: true },
            relevantArticle: String,
            employeeNotified: { type: Boolean, default: false },
            notificationDate: Date,
            appealRightInformed: { type: Boolean, default: false },
            appealDeadline: Date
        },
        remedialActions: [{
            actionType: {
                type: String,
                enum: ['compensation', 'reinstatement', 'promotion', 'transfer', 'back_pay',
                       'expungement', 'apology', 'training', 'other']
            },
            actionDescription: String,
            monetaryValue: Number,
            implementationDeadline: Date,
            implemented: { type: Boolean, default: false },
            implementationDate: Date
        }],
        systemicChanges: [{
            changeType: { type: String, enum: ['policy', 'procedure', 'training', 'structure', 'culture'] },
            changeDescription: String,
            responsibleParty: String,
            targetDate: Date,
            implemented: { type: Boolean, default: false }
        }],
        resolutionLetter: {
            issued: { type: Boolean, default: false },
            issueDate: Date,
            letterUrl: String,
            delivered: { type: Boolean, default: false },
            deliveryDate: Date,
            deliveryMethod: { type: String, enum: ['email', 'hand_delivery', 'registered_mail'] },
            acknowledged: { type: Boolean, default: false },
            acknowledgmentDate: Date
        }
    },

    // ==================== APPEAL ====================
    appeal: {
        appealAllowed: { type: Boolean, default: true },
        appealDeadline: Date,
        appealFiled: { type: Boolean, default: false },
        appealFiledDate: Date,
        appealBy: { type: String, enum: ['complainant', 'respondent', 'both'] },
        appealDetails: {
            appealGrounds: [{
                ground: {
                    type: String,
                    enum: ['procedural_error', 'new_evidence', 'incorrect_findings',
                           'excessive_penalty', 'bias', 'legal_error', 'other']
                },
                groundDescription: String
            }],
            newEvidenceProvided: { type: Boolean, default: false },
            newEvidenceUrls: [String],
            appealNarrative: String,
            reliefSought: String
        },
        appealReview: {
            reviewedBy: String,
            reviewDate: Date,
            reviewLevel: { type: String, enum: ['management', 'senior_management', 'ceo', 'board', 'external'] },
            hearingHeld: { type: Boolean, default: false },
            hearingDate: Date,
            appealDecision: { type: String, enum: ['upheld_original', 'modified', 'overturned', 'remanded'] },
            decisionDate: Date,
            decisionRationale: String,
            modifications: String,
            finalDecision: { type: Boolean, default: false }
        }
    },

    // ==================== LABOR OFFICE ESCALATION ====================
    laborOfficeEscalation: {
        escalatedToLaborOffice: { type: Boolean, default: false },
        escalationReason: {
            type: String,
            enum: ['unresolved_internally', 'employee_request', 'legal_requirement', 'serious_violation', 'mass_dispute']
        },
        escalationDate: Date,
        laborOffice: {
            officeName: String,
            officeNameAr: String,
            location: String,
            caseNumber: String,
            assignedOfficer: String,
            contactNumber: String
        },
        submission: {
            submittedBy: { type: String, enum: ['employee', 'employer', 'both'] },
            submissionDate: Date,
            submissionMethod: { type: String, enum: ['in_person', 'online', 'mail'] },
            documentsSubmitted: [{
                documentType: {
                    type: String,
                    enum: ['employment_contract', 'salary_slips', 'termination_letter',
                           'work_certificate', 'complaint_letter', 'evidence', 'other']
                },
                documentName: String,
                documentUrl: String,
                submitted: { type: Boolean, default: false }
            }],
            receiptNumber: String,
            receiptDate: Date
        },
        proceedings: [{
            proceedingDate: Date,
            proceedingType: {
                type: String,
                enum: ['conciliation', 'hearing', 'evidence_review', 'inspection', 'decision']
            },
            attendees: [String],
            summary: String,
            outcome: String
        }],
        conciliationAttempt: {
            attempted: { type: Boolean, default: false },
            attemptDate: Date,
            successful: Boolean,
            settlementReached: Boolean,
            settlementTerms: String,
            conciliationReport: String
        },
        laborOfficeDecision: {
            decisionDate: Date,
            decisionNumber: String,
            decisionSummary: String,
            decisionSummaryAr: String,
            ruling: { type: String, enum: ['in_favor_employee', 'in_favor_employer', 'partial', 'no_jurisdiction'] },
            remediesOrdered: [{
                remedyType: String,
                remedyDescription: String,
                monetaryAmount: Number,
                implementationDeadline: Date
            }],
            decisionDocument: String,
            enforceable: { type: Boolean, default: false },
            appealable: { type: Boolean, default: true },
            appealDeadline: Date
        },
        compliance: {
            complied: Boolean,
            complianceDate: Date,
            nonCompliance: {
                reason: String,
                penaltiesImposed: String,
                enforcementActions: [String]
            }
        }
    },

    // ==================== WITHDRAWAL ====================
    withdrawal: {
        withdrawn: { type: Boolean, default: false },
        withdrawalDate: Date,
        withdrawnBy: { type: String, enum: ['complainant', 'employer_request'] },
        withdrawalStage: { type: String, enum: ['initial', 'investigation', 'resolution', 'appeal', 'legal'] },
        withdrawalReason: String,
        withdrawalReasonCategory: {
            type: String,
            enum: ['settled_informally', 'resolved_satisfactorily', 'lack_of_evidence',
                   'fear_of_retaliation', 'found_other_employment', 'personal_reasons', 'other']
        },
        coerced: { type: Boolean, default: false },
        withdrawalAgreement: {
            termsAgreed: { type: Boolean, default: false },
            agreementUrl: String,
            considerationProvided: { type: Boolean, default: false },
            consideration: String,
            withPrejudice: { type: Boolean, default: false },
            signed: { type: Boolean, default: false },
            signedDate: Date
        },
        acceptedBy: String,
        acceptanceDate: Date
    },

    // ==================== RETALIATION MONITORING ====================
    retaliationMonitoring: {
        monitoringRequired: { type: Boolean, default: false },
        monitoringPeriod: Number,
        monitoringStartDate: Date,
        monitoringEndDate: Date,
        incidents: [{
            incidentDate: Date,
            incidentType: {
                type: String,
                enum: ['adverse_action', 'harassment', 'intimidation', 'isolation',
                       'demotion', 'termination', 'other']
            },
            incidentDescription: String,
            reportedBy: String,
            reportDate: Date,
            investigated: { type: Boolean, default: false },
            retaliatory: Boolean,
            actionTaken: String
        }],
        protections: [{
            protectionType: String,
            protectionDescription: String,
            implementationDate: Date,
            active: { type: Boolean, default: true }
        }]
    },

    // ==================== CLOSURE ====================
    closure: {
        closed: { type: Boolean, default: false },
        closureDate: Date,
        closureReason: {
            type: String,
            enum: ['resolved', 'settled', 'withdrawn', 'dismissed', 'referred_to_authority', 'judgment_rendered']
        },
        closureApproved: { type: Boolean, default: false },
        closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        lessonsLearned: {
            keyTakeaways: [String],
            processImprovements: [String],
            trainingNeeds: [String],
            policyChanges: [String]
        },
        fileRetention: {
            retentionPeriod: Number,
            retentionStartDate: Date,
            retentionEndDate: Date,
            archiveLocation: String,
            destructionScheduled: { type: Boolean, default: false },
            destructionDate: Date
        },
        closureDocument: String
    },

    // ==================== TIMELINE ====================
    timeline: [timelineEventSchema],

    // ==================== COMMUNICATIONS ====================
    communications: [communicationSchema],

    // ==================== DOCUMENTS ====================
    documents: [grievanceDocumentSchema],

    // ==================== NOTES ====================
    notes: {
        complainantNotes: String,
        respondentNotes: String,
        investigatorNotes: String,
        hrNotes: String,
        legalNotes: String,
        internalNotes: String,
        sensitiveInformation: String
    },

    // ==================== COMPLIANCE ====================
    compliance: {
        saudiLaborLawCompliance: {
            compliant: { type: Boolean, default: true },
            complianceChecks: [{
                requirement: String,
                article: String,
                compliant: { type: Boolean, default: true },
                notes: String
            }],
            timelyProcessing: { type: Boolean, default: true },
            fairProcedure: { type: Boolean, default: true },
            rightToDefend: { type: Boolean, default: true },
            rightToAppeal: { type: Boolean, default: true },
            writtenNotification: { type: Boolean, default: true },
            violations: [String]
        },
        confidentialityMaintained: { type: Boolean, default: true },
        breaches: [{
            breachDate: Date,
            breachType: String,
            breachBy: String,
            remedialAction: String
        }],
        processCompliance: {
            followedProcedure: { type: Boolean, default: true },
            timelinesAdhered: { type: Boolean, default: true },
            documentationComplete: { type: Boolean, default: false },
            impartialityMaintained: { type: Boolean, default: true },
            naturalJusticeProvided: { type: Boolean, default: true }
        }
    },

    // ==================== ANALYTICS ====================
    analytics: {
        totalDuration: Number,
        investigationDuration: Number,
        resolutionDuration: Number,
        favorableToComplainant: Boolean,
        totalCost: {
            investigationCost: Number,
            legalCost: Number,
            settlementCost: Number,
            otherCosts: Number,
            totalCost: Number
        },
        vsSimilarGrievances: {
            duration: { type: String, enum: ['faster', 'average', 'slower'] },
            outcome: { type: String, enum: ['similar', 'different'] },
            cost: { type: String, enum: ['lower', 'average', 'higher'] }
        }
    },

    // ==================== AUDIT ====================
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: { createdAt: 'createdOn', updatedAt: 'updatedOn' },
    versionKey: false
});

// ═══════════════════════════════════════════════════════════════
// INDEXES
// ═══════════════════════════════════════════════════════════════

grievanceSchema.index({ firmId: 1, status: 1 });
grievanceSchema.index({ lawyerId: 1, status: 1 });
grievanceSchema.index({ employeeId: 1, filedDate: -1 });
grievanceSchema.index({ grievanceType: 1 });
grievanceSchema.index({ priority: 1 });
grievanceSchema.index({ filedDate: -1 });
grievanceSchema.index({ 'complainedAgainst.respondent.employeeId': 1 });

// ═══════════════════════════════════════════════════════════════
// VIRTUALS
// ═══════════════════════════════════════════════════════════════

// Calculate days since filed
grievanceSchema.virtual('daysSinceFiled').get(function() {
    if (!this.filedDate) return null;
    const now = new Date();
    const filed = new Date(this.filedDate);
    return Math.floor((now - filed) / (1000 * 60 * 60 * 24));
});

// Check if overdue
grievanceSchema.virtual('isOverdue').get(function() {
    const daysSinceFiled = this.daysSinceFiled;
    if (!daysSinceFiled) return false;
    // Grievances should typically be resolved within 30 days
    return daysSinceFiled > 30 && !['resolved', 'closed', 'withdrawn'].includes(this.status);
});

// Check if active
grievanceSchema.virtual('isActive').get(function() {
    return ['submitted', 'under_review', 'investigating'].includes(this.status);
});

// Enable virtuals in JSON
grievanceSchema.set('toJSON', { virtuals: true });
grievanceSchema.set('toObject', { virtuals: true });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS
// ═══════════════════════════════════════════════════════════════

grievanceSchema.pre('save', async function(next) {
    // Auto-generate grievanceId
    if (!this.grievanceId) {
        const year = new Date().getFullYear();
        const query = {};
        if (this.firmId) {
            query.firmId = this.firmId;
        } else if (this.lawyerId) {
            query.lawyerId = this.lawyerId;
        }
        const count = await this.constructor.countDocuments({
            ...query,
            grievanceId: new RegExp(`^GRV-${year}-`)
        });
        this.grievanceId = `GRV-${year}-${String(count + 1).padStart(3, '0')}`;
        this.grievanceNumber = this.grievanceId;
    }

    // Calculate analytics if resolved
    if (this.resolution?.resolved && this.filedDate) {
        const filedDate = new Date(this.filedDate);
        const resolutionDate = new Date(this.resolution.resolutionDate || new Date());
        this.analytics = this.analytics || {};
        this.analytics.totalDuration = Math.floor((resolutionDate - filedDate) / (1000 * 60 * 60 * 24));

        if (this.investigation?.investigationStartDate && this.investigation?.investigationEndDate) {
            const startDate = new Date(this.investigation.investigationStartDate);
            const endDate = new Date(this.investigation.investigationEndDate);
            this.analytics.investigationDuration = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
        }
    }

    next();
});

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS
// ═══════════════════════════════════════════════════════════════

// Generate grievance number
grievanceSchema.statics.generateGrievanceNumber = async function(firmId, lawyerId) {
    const year = new Date().getFullYear();
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }
    const count = await this.countDocuments({
        ...query,
        grievanceId: new RegExp(`^GRV-${year}-`)
    });
    return `GRV-${year}-${String(count + 1).padStart(3, '0')}`;
};

// Get employee grievances
grievanceSchema.statics.getEmployeeGrievances = function(employeeId, status = null) {
    const query = { employeeId };
    if (status) query.status = status;
    return this.find(query)
        .populate('employeeId', 'employeeId personalInfo')
        .sort({ filedDate: -1 });
};

// Get active grievances
grievanceSchema.statics.getActiveGrievances = function(firmId, lawyerId) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }
    return this.find({
        ...query,
        status: { $in: ['submitted', 'under_review', 'investigating'] }
    }).sort({ priority: -1, filedDate: 1 });
};

// Get overdue grievances
grievanceSchema.statics.getOverdueGrievances = function(firmId, lawyerId, daysThreshold = 30) {
    const query = {};
    if (firmId) {
        query.firmId = firmId;
    } else if (lawyerId) {
        query.lawyerId = lawyerId;
    }
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);

    return this.find({
        ...query,
        status: { $in: ['submitted', 'under_review', 'investigating'] },
        filedDate: { $lte: thresholdDate }
    }).sort({ filedDate: 1 });
};

module.exports = mongoose.model('Grievance', grievanceSchema);
