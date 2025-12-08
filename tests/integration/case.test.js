/**
 * Case Integration Tests
 * Tests for CRUD operations, status transitions, party management, document linking, and assignment
 */

const mongoose = require('mongoose');
const Case = require('../../src/models/case.model');
const Client = require('../../src/models/client.model');
const Firm = require('../../src/models/firm.model');
const User = require('../../src/models/user.model');

describe('Case Integration Tests', () => {
    let testFirm, testLawyer, testClient, testLawyer2;

    beforeEach(async () => {
        // Create test firm
        testFirm = await Firm.create({
            name: 'Test Law Firm',
            nameArabic: 'مكتب اختبار قانوني',
            crNumber: '1234567890',
            status: 'active'
        });

        // Create test lawyers
        testLawyer = await User.create({
            firstName: 'Ahmed',
            lastName: 'Ali',
            email: 'ahmed@testfirm.com',
            phone: '+966501234567',
            password: 'hashedPassword',
            role: 'lawyer',
            firmId: testFirm._id
        });

        testLawyer2 = await User.create({
            firstName: 'Mohammed',
            lastName: 'Hassan',
            email: 'mohammed@testfirm.com',
            phone: '+966507654321',
            password: 'hashedPassword',
            role: 'lawyer',
            firmId: testFirm._id
        });

        // Create test client
        testClient = await Client.create({
            clientType: 'individual',
            firstName: 'Test',
            lastName: 'Client',
            fullNameArabic: 'عميل اختبار',
            phone: '+966501111111',
            lawyerId: testLawyer._id,
            firmId: testFirm._id
        });
    });

    // ============ CRUD OPERATIONS ============

    describe('CREATE Operations', () => {
        it('should create a case with required fields', async () => {
            const caseData = {
                title: 'Labor Dispute Case',
                description: 'Employee rights case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            };

            const newCase = await Case.create(caseData);

            expect(newCase).toBeDefined();
            expect(newCase.title).toBe('Labor Dispute Case');
            expect(newCase.category).toBe('labor');
            expect(newCase.status).toBe('active');
            expect(newCase.priority).toBe('medium');
            expect(newCase.progress).toBe(0);
        });

        it('should create case with labor case details', async () => {
            const caseData = {
                title: 'Labor Rights Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id,
                laborCaseDetails: {
                    plaintiff: {
                        name: 'Abdullah Ahmed',
                        nationalId: '1234567890',
                        phone: '+966502222222',
                        city: 'Riyadh'
                    },
                    company: {
                        name: 'Test Company LLC',
                        registrationNumber: '7010123456',
                        city: 'Riyadh'
                    }
                }
            };

            const newCase = await Case.create(caseData);

            expect(newCase.laborCaseDetails.plaintiff.name).toBe('Abdullah Ahmed');
            expect(newCase.laborCaseDetails.company.name).toBe('Test Company LLC');
        });

        it('should create case with court details', async () => {
            const caseData = {
                title: 'Court Case',
                category: 'commercial',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id,
                caseNumber: 'CC-2024-001',
                court: 'Commercial Court - Riyadh',
                judge: 'Judge Ahmed Al-Rashid',
                nextHearing: new Date('2024-12-15')
            };

            const newCase = await Case.create(caseData);

            expect(newCase.caseNumber).toBe('CC-2024-001');
            expect(newCase.court).toBe('Commercial Court - Riyadh');
            expect(newCase.judge).toBe('Judge Ahmed Al-Rashid');
            expect(newCase.nextHearing).toBeInstanceOf(Date);
        });

        it('should create case with claims', async () => {
            const caseData = {
                title: 'Multi-Claim Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id,
                claims: [
                    {
                        type: 'End of Service Benefits',
                        amount: 50000,
                        period: '2020-2024',
                        description: 'Outstanding end of service benefits'
                    },
                    {
                        type: 'Unpaid Salary',
                        amount: 15000,
                        period: 'Jan-Mar 2024',
                        description: 'Three months unpaid salary'
                    }
                ]
            };

            const newCase = await Case.create(caseData);

            expect(newCase.claims).toHaveLength(2);
            expect(newCase.claims[0].amount).toBe(50000);
            expect(newCase.claims[1].type).toBe('Unpaid Salary');
        });

        it('should create case with timeline events', async () => {
            const caseData = {
                title: 'Timeline Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id,
                timeline: [
                    {
                        event: 'Initial Consultation',
                        date: new Date('2024-01-01'),
                        type: 'general',
                        status: 'completed'
                    },
                    {
                        event: 'Filing Deadline',
                        date: new Date('2024-12-31'),
                        type: 'deadline',
                        status: 'upcoming'
                    }
                ]
            };

            const newCase = await Case.create(caseData);

            expect(newCase.timeline).toHaveLength(2);
            expect(newCase.timeline[0].status).toBe('completed');
            expect(newCase.timeline[1].type).toBe('deadline');
        });

        it('should create case with priority levels', async () => {
            const highPriorityCase = await Case.create({
                title: 'Urgent Case',
                category: 'labor',
                priority: 'critical',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            expect(highPriorityCase.priority).toBe('critical');
        });
    });

    describe('READ Operations', () => {
        it('should retrieve case by ID', async () => {
            const created = await Case.create({
                title: 'Read Test Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            const found = await Case.findById(created._id);

            expect(found).toBeDefined();
            expect(found.title).toBe('Read Test Case');
        });

        it('should retrieve cases by lawyerId', async () => {
            await Case.create({
                title: 'Case 1',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            await Case.create({
                title: 'Case 2',
                category: 'commercial',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            const cases = await Case.find({ lawyerId: testLawyer._id });

            expect(cases.length).toBeGreaterThanOrEqual(2);
        });

        it('should retrieve cases by clientId', async () => {
            await Case.create({
                title: 'Client Case 1',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            const cases = await Case.find({ clientId: testClient._id });

            expect(cases.length).toBeGreaterThan(0);
            expect(cases[0].clientId.toString()).toBe(testClient._id.toString());
        });

        it('should retrieve cases by firmId', async () => {
            await Case.create({
                title: 'Firm Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            const cases = await Case.find({ firmId: testFirm._id });

            expect(cases.length).toBeGreaterThan(0);
            expect(cases[0].firmId.toString()).toBe(testFirm._id.toString());
        });

        it('should retrieve cases by status', async () => {
            await Case.create({
                title: 'Active Case',
                category: 'labor',
                status: 'active',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            const activeCases = await Case.find({ status: 'active' });

            expect(activeCases.length).toBeGreaterThan(0);
            expect(activeCases[0].status).toBe('active');
        });

        it('should populate lawyer details', async () => {
            const caseDoc = await Case.create({
                title: 'Populate Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            const populated = await Case.findById(caseDoc._id).populate('lawyerId');

            expect(populated.lawyerId.firstName).toBe('Ahmed');
            expect(populated.lawyerId.email).toBe('ahmed@testfirm.com');
        });

        it('should populate client details', async () => {
            const caseDoc = await Case.create({
                title: 'Client Populate Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            const populated = await Case.findById(caseDoc._id).populate('clientId');

            expect(populated.clientId.firstName).toBe('Test');
            expect(populated.clientId.lastName).toBe('Client');
        });
    });

    describe('UPDATE Operations', () => {
        it('should update case title and description', async () => {
            const caseDoc = await Case.create({
                title: 'Original Title',
                description: 'Original description',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.title = 'Updated Title';
            caseDoc.description = 'Updated description';
            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.title).toBe('Updated Title');
            expect(updated.description).toBe('Updated description');
        });

        it('should update case progress', async () => {
            const caseDoc = await Case.create({
                title: 'Progress Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.progress = 50;
            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.progress).toBe(50);
        });

        it('should update claim amounts', async () => {
            const caseDoc = await Case.create({
                title: 'Amount Update Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id,
                claimAmount: 100000,
                expectedWinAmount: 80000
            });

            caseDoc.claimAmount = 120000;
            caseDoc.expectedWinAmount = 100000;
            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.claimAmount).toBe(120000);
            expect(updated.expectedWinAmount).toBe(100000);
        });

        it('should add notes to case', async () => {
            const caseDoc = await Case.create({
                title: 'Notes Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.notes.push({
                text: 'First note',
                createdBy: testLawyer._id,
                createdAt: new Date()
            });

            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.notes).toHaveLength(1);
            expect(updated.notes[0].text).toBe('First note');
        });

        it('should add timeline events', async () => {
            const caseDoc = await Case.create({
                title: 'Timeline Update Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.timeline.push({
                event: 'Court Hearing',
                date: new Date('2024-12-20'),
                type: 'court',
                status: 'upcoming'
            });

            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.timeline).toHaveLength(1);
            expect(updated.timeline[0].event).toBe('Court Hearing');
        });
    });

    describe('DELETE Operations', () => {
        it('should delete case', async () => {
            const caseDoc = await Case.create({
                title: 'Delete Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            await Case.findByIdAndDelete(caseDoc._id);

            const found = await Case.findById(caseDoc._id);
            expect(found).toBeNull();
        });

        it('should soft delete by setting status to closed', async () => {
            const caseDoc = await Case.create({
                title: 'Soft Delete Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.status = 'closed';
            caseDoc.endDate = new Date();
            await caseDoc.save();

            const found = await Case.findById(caseDoc._id);
            expect(found.status).toBe('closed');
            expect(found.endDate).toBeInstanceOf(Date);
        });
    });

    // ============ STATUS TRANSITIONS ============

    describe('Status Transitions', () => {
        it('should transition from active to closed', async () => {
            const caseDoc = await Case.create({
                title: 'Transition Case',
                category: 'labor',
                status: 'active',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.status = 'closed';
            await caseDoc.save();

            expect(caseDoc.status).toBe('closed');
        });

        it('should transition to settlement', async () => {
            const caseDoc = await Case.create({
                title: 'Settlement Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.status = 'settlement';
            caseDoc.outcome = 'settled';
            await caseDoc.save();

            expect(caseDoc.status).toBe('settlement');
            expect(caseDoc.outcome).toBe('settled');
        });

        it('should transition to on-hold', async () => {
            const caseDoc = await Case.create({
                title: 'Hold Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.status = 'on-hold';
            await caseDoc.save();

            expect(caseDoc.status).toBe('on-hold');
        });

        it('should transition to appeal', async () => {
            const caseDoc = await Case.create({
                title: 'Appeal Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.status = 'appeal';
            await caseDoc.save();

            expect(caseDoc.status).toBe('appeal');
        });

        it('should mark case as won', async () => {
            const caseDoc = await Case.create({
                title: 'Won Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.status = 'won';
            caseDoc.outcome = 'won';
            await caseDoc.save();

            expect(caseDoc.status).toBe('won');
            expect(caseDoc.outcome).toBe('won');
        });

        it('should mark case as lost', async () => {
            const caseDoc = await Case.create({
                title: 'Lost Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.status = 'lost';
            caseDoc.outcome = 'lost';
            await caseDoc.save();

            expect(caseDoc.status).toBe('lost');
            expect(caseDoc.outcome).toBe('lost');
        });

        it('should validate status enum values', async () => {
            const caseDoc = await Case.create({
                title: 'Invalid Status Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.status = 'invalid_status';
            await expect(caseDoc.save()).rejects.toThrow();
        });

        it('should validate outcome enum values', async () => {
            const caseDoc = await Case.create({
                title: 'Invalid Outcome Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.outcome = 'invalid_outcome';
            await expect(caseDoc.save()).rejects.toThrow();
        });
    });

    // ============ PARTY MANAGEMENT ============

    describe('Party Management', () => {
        it('should assign client to case', async () => {
            const caseDoc = await Case.create({
                title: 'Client Assignment',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            expect(caseDoc.clientId.toString()).toBe(testClient._id.toString());
        });

        it('should change assigned lawyer', async () => {
            const caseDoc = await Case.create({
                title: 'Lawyer Reassignment',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.lawyerId = testLawyer2._id;
            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.lawyerId.toString()).toBe(testLawyer2._id.toString());
        });

        it('should store external client information', async () => {
            const caseDoc = await Case.create({
                title: 'External Client Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                clientName: 'External Client Name',
                clientPhone: '+966509999999',
                source: 'external'
            });

            expect(caseDoc.clientName).toBe('External Client Name');
            expect(caseDoc.clientPhone).toBe('+966509999999');
            expect(caseDoc.source).toBe('external');
        });

        it('should handle labor case plaintiff details', async () => {
            const caseDoc = await Case.create({
                title: 'Plaintiff Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id,
                laborCaseDetails: {
                    plaintiff: {
                        name: 'Plaintiff Name',
                        nationalId: '1122334455',
                        phone: '+966508888888',
                        address: 'Riyadh Address',
                        city: 'Riyadh'
                    }
                }
            });

            expect(caseDoc.laborCaseDetails.plaintiff.name).toBe('Plaintiff Name');
            expect(caseDoc.laborCaseDetails.plaintiff.nationalId).toBe('1122334455');
        });

        it('should handle company details in labor cases', async () => {
            const caseDoc = await Case.create({
                title: 'Company Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id,
                laborCaseDetails: {
                    company: {
                        name: 'Defendant Company',
                        registrationNumber: '7010555555',
                        address: 'Company Address',
                        city: 'Jeddah'
                    }
                }
            });

            expect(caseDoc.laborCaseDetails.company.name).toBe('Defendant Company');
            expect(caseDoc.laborCaseDetails.company.registrationNumber).toBe('7010555555');
        });
    });

    // ============ DOCUMENT LINKING ============

    describe('Document Linking', () => {
        it('should add document to case', async () => {
            const caseDoc = await Case.create({
                title: 'Document Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.documents.push({
                filename: 'contract.pdf',
                url: 'https://s3.example.com/contract.pdf',
                fileKey: 'documents/contract.pdf',
                type: 'application/pdf',
                size: 1024000,
                uploadedBy: testLawyer._id,
                category: 'contract',
                bucket: 'general'
            });

            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.documents).toHaveLength(1);
            expect(updated.documents[0].filename).toBe('contract.pdf');
            expect(updated.documents[0].category).toBe('contract');
        });

        it('should add multiple documents with different categories', async () => {
            const caseDoc = await Case.create({
                title: 'Multi-Doc Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.documents.push(
                {
                    filename: 'evidence1.pdf',
                    url: 'https://s3.example.com/evidence1.pdf',
                    fileKey: 'documents/evidence1.pdf',
                    type: 'application/pdf',
                    size: 2048000,
                    uploadedBy: testLawyer._id,
                    category: 'evidence'
                },
                {
                    filename: 'pleading.docx',
                    url: 'https://s3.example.com/pleading.docx',
                    fileKey: 'documents/pleading.docx',
                    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    size: 512000,
                    uploadedBy: testLawyer._id,
                    category: 'pleading'
                }
            );

            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.documents).toHaveLength(2);
            expect(updated.documents[0].category).toBe('evidence');
            expect(updated.documents[1].category).toBe('pleading');
        });

        it('should add rich document (legal memo)', async () => {
            const caseDoc = await Case.create({
                title: 'Rich Doc Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.richDocuments.push({
                title: 'Legal Memorandum',
                titleAr: 'مذكرة قانونية',
                content: '<p>Legal memo content in HTML</p>',
                contentPlainText: 'Legal memo content in HTML',
                documentType: 'legal_memo',
                status: 'draft',
                language: 'ar',
                textDirection: 'rtl',
                version: 1,
                wordCount: 500,
                characterCount: 2500,
                createdBy: testLawyer._id
            });

            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.richDocuments).toHaveLength(1);
            expect(updated.richDocuments[0].documentType).toBe('legal_memo');
            expect(updated.richDocuments[0].language).toBe('ar');
        });

        it('should track document versioning', async () => {
            const caseDoc = await Case.create({
                title: 'Version Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.richDocuments.push({
                title: 'Contract Draft',
                content: '<p>Version 1</p>',
                documentType: 'contract_draft',
                status: 'draft',
                version: 1,
                createdBy: testLawyer._id,
                previousVersions: []
            });

            await caseDoc.save();

            // Update with version 2
            const updated = await Case.findById(caseDoc._id);
            updated.richDocuments[0].previousVersions.push({
                content: '<p>Version 1</p>',
                version: 1,
                editedBy: testLawyer._id,
                editedAt: new Date(),
                changeNote: 'Initial version'
            });
            updated.richDocuments[0].content = '<p>Version 2</p>';
            updated.richDocuments[0].version = 2;
            await updated.save();

            const final = await Case.findById(caseDoc._id);
            expect(final.richDocuments[0].version).toBe(2);
            expect(final.richDocuments[0].previousVersions).toHaveLength(1);
        });

        it('should add hearing records', async () => {
            const caseDoc = await Case.create({
                title: 'Hearing Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.hearings.push({
                date: new Date('2024-12-25'),
                location: 'Labor Court - Riyadh',
                notes: 'Initial hearing',
                status: 'scheduled',
                attended: false
            });

            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.hearings).toHaveLength(1);
            expect(updated.hearings[0].status).toBe('scheduled');
            expect(updated.hearings[0].attended).toBe(false);
        });

        it('should mark hearing as attended', async () => {
            const caseDoc = await Case.create({
                title: 'Attended Hearing',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id,
                hearings: [{
                    date: new Date('2024-01-01'),
                    location: 'Court',
                    status: 'scheduled',
                    attended: false
                }]
            });

            caseDoc.hearings[0].status = 'attended';
            caseDoc.hearings[0].attended = true;
            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.hearings[0].status).toBe('attended');
            expect(updated.hearings[0].attended).toBe(true);
        });
    });

    // ============ ASSIGNMENT ============

    describe('Assignment', () => {
        it('should assign case to lawyer', async () => {
            const caseDoc = await Case.create({
                title: 'Assignment Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            expect(caseDoc.lawyerId.toString()).toBe(testLawyer._id.toString());
        });

        it('should reassign case to different lawyer', async () => {
            const caseDoc = await Case.create({
                title: 'Reassignment Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.lawyerId = testLawyer2._id;
            await caseDoc.save();

            const updated = await Case.findById(caseDoc._id);
            expect(updated.lawyerId.toString()).toBe(testLawyer2._id.toString());
        });

        it('should track case source (platform vs external)', async () => {
            const platformCase = await Case.create({
                title: 'Platform Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id,
                source: 'platform'
            });

            const externalCase = await Case.create({
                title: 'External Case',
                category: 'labor',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                source: 'external'
            });

            expect(platformCase.source).toBe('platform');
            expect(externalCase.source).toBe('external');
        });
    });

    // ============ VALIDATION ============

    describe('Validation', () => {
        it('should require title', async () => {
            const caseData = {
                category: 'labor',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            };

            await expect(Case.create(caseData)).rejects.toThrow();
        });

        it('should require category', async () => {
            const caseData = {
                title: 'No Category Case',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            };

            await expect(Case.create(caseData)).rejects.toThrow();
        });

        it('should require lawyerId', async () => {
            const caseData = {
                title: 'No Lawyer Case',
                category: 'labor',
                firmId: testFirm._id
            };

            await expect(Case.create(caseData)).rejects.toThrow();
        });

        it('should validate priority enum', async () => {
            const caseDoc = await Case.create({
                title: 'Priority Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.priority = 'invalid_priority';
            await expect(caseDoc.save()).rejects.toThrow();
        });

        it('should validate progress range (0-100)', async () => {
            const caseDoc = await Case.create({
                title: 'Progress Test',
                category: 'labor',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            caseDoc.progress = 150;
            await expect(caseDoc.save()).rejects.toThrow();
        });
    });

    // ============ QUERIES AND FILTERING ============

    describe('Queries and Filtering', () => {
        beforeEach(async () => {
            await Case.create({
                title: 'Query Case 1',
                category: 'labor',
                status: 'active',
                priority: 'high',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });

            await Case.create({
                title: 'Query Case 2',
                category: 'commercial',
                status: 'closed',
                priority: 'low',
                lawyerId: testLawyer._id,
                clientId: testClient._id,
                firmId: testFirm._id
            });
        });

        it('should filter by status', async () => {
            const activeCases = await Case.find({ status: 'active' });
            expect(activeCases.length).toBeGreaterThan(0);
            expect(activeCases.every(c => c.status === 'active')).toBe(true);
        });

        it('should filter by category', async () => {
            const laborCases = await Case.find({ category: 'labor' });
            expect(laborCases.length).toBeGreaterThan(0);
            expect(laborCases.every(c => c.category === 'labor')).toBe(true);
        });

        it('should filter by priority', async () => {
            const highPriorityCases = await Case.find({ priority: 'high' });
            expect(highPriorityCases.length).toBeGreaterThan(0);
            expect(highPriorityCases.every(c => c.priority === 'high')).toBe(true);
        });

        it('should combine multiple filters', async () => {
            const filteredCases = await Case.find({
                lawyerId: testLawyer._id,
                status: 'active',
                category: 'labor'
            });

            expect(filteredCases.every(c =>
                c.lawyerId.toString() === testLawyer._id.toString() &&
                c.status === 'active' &&
                c.category === 'labor'
            )).toBe(true);
        });
    });
});
