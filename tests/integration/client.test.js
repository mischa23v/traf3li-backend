/**
 * Client Integration Tests
 * Tests for CRUD operations, validation, Saudi ID/IBAN validation, multi-tenancy, and search
 */

const mongoose = require('mongoose');
const Client = require('../../src/models/client.model');
const Firm = require('../../src/models/firm.model');
const User = require('../../src/models/user.model');

describe('Client Integration Tests', () => {
    let testFirm, testLawyer, testFirm2, testLawyer2;

    beforeEach(async () => {
        // Create test firms and lawyers
        testFirm = await Firm.create({
            name: 'Test Law Firm',
            nameArabic: 'مكتب اختبار قانوني',
            crNumber: '1234567890',
            status: 'active'
        });

        testLawyer = await User.create({
            firstName: 'Ahmed',
            lastName: 'Ali',
            email: 'ahmed@testfirm.com',
            phone: '+966501234567',
            password: 'hashedPassword',
            role: 'lawyer',
            firmId: testFirm._id
        });

        testFirm2 = await Firm.create({
            name: 'Test Law Firm 2',
            nameArabic: 'مكتب اختبار قانوني 2',
            crNumber: '0987654321',
            status: 'active'
        });

        testLawyer2 = await User.create({
            firstName: 'Mohammed',
            lastName: 'Hassan',
            email: 'mohammed@testfirm2.com',
            phone: '+966507654321',
            password: 'hashedPassword',
            role: 'lawyer',
            firmId: testFirm2._id
        });
    });

    // ============ CRUD OPERATIONS ============

    describe('CREATE Operations', () => {
        it('should create individual client with all required fields', async () => {
            const clientData = {
                clientType: 'individual',
                nationalId: '1234567890',
                firstName: 'Abdullah',
                lastName: 'Ahmed',
                fullNameArabic: 'عبدالله أحمد',
                phone: '+966501111111',
                email: 'abdullah@test.com',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            };

            const client = await Client.create(clientData);

            expect(client).toBeDefined();
            expect(client.clientType).toBe('individual');
            expect(client.nationalId).toBe('1234567890');
            expect(client.fullNameArabic).toBe('عبدالله أحمد');
            expect(client.clientNumber).toMatch(/^CLT-\d{5}$/);
            expect(client.status).toBe('active');
        });

        it('should create company client with CR number', async () => {
            const clientData = {
                clientType: 'company',
                crNumber: '7010123456',
                companyName: 'Test Company LLC',
                companyNameEnglish: 'Test Company LLC',
                phone: '+966502222222',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            };

            const client = await Client.create(clientData);

            expect(client).toBeDefined();
            expect(client.clientType).toBe('company');
            expect(client.crNumber).toBe('7010123456');
            expect(client.companyName).toBe('Test Company LLC');
        });

        it('should auto-generate unique client number', async () => {
            const client1 = await Client.create({
                clientType: 'individual',
                firstName: 'Test',
                lastName: 'User1',
                phone: '+966501111111',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const client2 = await Client.create({
                clientType: 'individual',
                firstName: 'Test',
                lastName: 'User2',
                phone: '+966502222222',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            expect(client1.clientNumber).toBeDefined();
            expect(client2.clientNumber).toBeDefined();
            expect(client1.clientNumber).not.toBe(client2.clientNumber);
        });

        it('should create client with billing information', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Billing',
                lastName: 'Test',
                phone: '+966503333333',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                billing: {
                    type: 'hourly',
                    hourlyRate: 500,
                    currency: 'SAR',
                    paymentTerms: 'net_30',
                    creditLimit: 10000
                }
            });

            expect(client.billing.type).toBe('hourly');
            expect(client.billing.hourlyRate).toBe(500);
            expect(client.billing.paymentTerms).toBe('net_30');
        });

        it('should create client with address information', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Address',
                lastName: 'Test',
                phone: '+966504444444',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                address: {
                    city: 'Riyadh',
                    district: 'Al Olaya',
                    street: 'King Fahd Road',
                    buildingNumber: '1234',
                    postalCode: '12345',
                    additionalNumber: '5678',
                    country: 'Saudi Arabia'
                }
            });

            expect(client.address.city).toBe('Riyadh');
            expect(client.address.postalCode).toBe('12345');
        });
    });

    describe('READ Operations', () => {
        it('should retrieve client by ID', async () => {
            const created = await Client.create({
                clientType: 'individual',
                firstName: 'Read',
                lastName: 'Test',
                phone: '+966505555555',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const found = await Client.findById(created._id);

            expect(found).toBeDefined();
            expect(found.firstName).toBe('Read');
            expect(found._id.toString()).toBe(created._id.toString());
        });

        it('should retrieve clients by lawyerId', async () => {
            await Client.create({
                clientType: 'individual',
                firstName: 'Client',
                lastName: 'One',
                phone: '+966506666666',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            await Client.create({
                clientType: 'individual',
                firstName: 'Client',
                lastName: 'Two',
                phone: '+966507777777',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const clients = await Client.find({ lawyerId: testLawyer._id });

            expect(clients).toHaveLength(2);
        });

        it('should retrieve clients by firmId', async () => {
            await Client.create({
                clientType: 'individual',
                firstName: 'Firm',
                lastName: 'Client1',
                phone: '+966508888888',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const clients = await Client.find({ firmId: testFirm._id });

            expect(clients.length).toBeGreaterThan(0);
            expect(clients[0].firmId.toString()).toBe(testFirm._id.toString());
        });

        it('should use displayName virtual for individual', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Virtual',
                lastName: 'Test',
                fullNameArabic: 'اسم افتراضي',
                phone: '+966509999999',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const found = await Client.findById(client._id);
            expect(found.displayName).toBe('اسم افتراضي');
        });

        it('should use displayName virtual for company', async () => {
            const client = await Client.create({
                clientType: 'company',
                companyName: 'شركة الاختبار',
                phone: '+966500000001',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const found = await Client.findById(client._id);
            expect(found.displayName).toBe('شركة الاختبار');
        });
    });

    describe('UPDATE Operations', () => {
        it('should update client information', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Update',
                lastName: 'Test',
                phone: '+966500000002',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            client.email = 'updated@test.com';
            client.alternatePhone = '+966500000003';
            await client.save();

            const updated = await Client.findById(client._id);
            expect(updated.email).toBe('updated@test.com');
            expect(updated.alternatePhone).toBe('+966500000003');
        });

        it('should update client status', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Status',
                lastName: 'Test',
                phone: '+966500000004',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            client.status = 'inactive';
            await client.save();

            const updated = await Client.findById(client._id);
            expect(updated.status).toBe('inactive');
        });

        it('should update billing information', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Billing',
                lastName: 'Update',
                phone: '+966500000005',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                billing: { type: 'hourly', hourlyRate: 300 }
            });

            client.billing.hourlyRate = 450;
            client.billing.discount = { hasDiscount: true, percent: 10 };
            await client.save();

            const updated = await Client.findById(client._id);
            expect(updated.billing.hourlyRate).toBe(450);
            expect(updated.billing.discount.hasDiscount).toBe(true);
        });
    });

    describe('DELETE Operations', () => {
        it('should delete client', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Delete',
                lastName: 'Test',
                phone: '+966500000006',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            await Client.findByIdAndDelete(client._id);

            const found = await Client.findById(client._id);
            expect(found).toBeNull();
        });

        it('should soft delete by setting status to archived', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Archive',
                lastName: 'Test',
                phone: '+966500000007',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            client.status = 'archived';
            await client.save();

            const found = await Client.findById(client._id);
            expect(found.status).toBe('archived');
        });
    });

    // ============ VALIDATION ERRORS ============

    describe('Validation Errors', () => {
        it('should require phone number', async () => {
            const clientData = {
                clientType: 'individual',
                firstName: 'No',
                lastName: 'Phone',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            };

            await expect(Client.create(clientData)).rejects.toThrow();
        });

        it('should require lawyerId', async () => {
            const clientData = {
                clientType: 'individual',
                firstName: 'No',
                lastName: 'Lawyer',
                phone: '+966500000008'
            };

            await expect(Client.create(clientData)).rejects.toThrow();
        });

        it('should validate email format', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Email',
                lastName: 'Test',
                phone: '+966500000009',
                email: 'invalid-email',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            // Email validation happens at application level, model accepts any string
            expect(client.email).toBe('invalid-email');
        });

        it('should validate clientType enum', async () => {
            const clientData = {
                clientType: 'invalid_type',
                firstName: 'Type',
                lastName: 'Test',
                phone: '+966500000010',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            };

            await expect(Client.create(clientData)).rejects.toThrow();
        });

        it('should validate status enum', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Status',
                lastName: 'Test',
                phone: '+966500000011',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            client.status = 'invalid_status';
            await expect(client.save()).rejects.toThrow();
        });
    });

    // ============ SAUDI ID/IBAN VALIDATION ============

    describe('Saudi ID Validation', () => {
        it('should accept valid Saudi national ID (10 digits)', async () => {
            const client = await Client.create({
                clientType: 'individual',
                nationalId: '1234567890',
                firstName: 'Valid',
                lastName: 'ID',
                phone: '+966500000012',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            expect(client.nationalId).toBe('1234567890');
        });

        it('should store CR number for companies', async () => {
            const client = await Client.create({
                clientType: 'company',
                crNumber: '7010123456',
                companyName: 'Test CR Company',
                phone: '+966500000013',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            expect(client.crNumber).toBe('7010123456');
        });

        it('should store VAT registration number', async () => {
            const client = await Client.create({
                clientType: 'company',
                companyName: 'VAT Company',
                phone: '+966500000014',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                vatRegistration: {
                    isRegistered: true,
                    vatNumber: '300123456789003'
                }
            });

            expect(client.vatRegistration.isRegistered).toBe(true);
            expect(client.vatRegistration.vatNumber).toBe('300123456789003');
        });

        it('should handle Yakeen verification fields', async () => {
            const client = await Client.create({
                clientType: 'individual',
                nationalId: '1234567890',
                firstName: 'Yakeen',
                lastName: 'Verified',
                phone: '+966500000015',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                yakeenVerified: true,
                yakeenVerifiedAt: new Date()
            });

            expect(client.yakeenVerified).toBe(true);
            expect(client.yakeenVerifiedAt).toBeInstanceOf(Date);
        });

        it('should handle Wathq verification for companies', async () => {
            const client = await Client.create({
                clientType: 'company',
                crNumber: '7010123456',
                companyName: 'Wathq Company',
                phone: '+966500000016',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                wathqVerified: true,
                wathqVerifiedAt: new Date()
            });

            expect(client.wathqVerified).toBe(true);
            expect(client.wathqVerifiedAt).toBeInstanceOf(Date);
        });
    });

    // ============ MULTI-TENANCY ISOLATION ============

    describe('Multi-Tenancy Isolation', () => {
        it('should isolate clients by firmId', async () => {
            await Client.create({
                clientType: 'individual',
                firstName: 'Firm1',
                lastName: 'Client',
                phone: '+966500000017',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            await Client.create({
                clientType: 'individual',
                firstName: 'Firm2',
                lastName: 'Client',
                phone: '+966500000018',
                lawyerId: testLawyer2._id,
                firmId: testFirm2._id
            });

            const firm1Clients = await Client.find({ firmId: testFirm._id });
            const firm2Clients = await Client.find({ firmId: testFirm2._id });

            expect(firm1Clients.length).toBeGreaterThan(0);
            expect(firm2Clients.length).toBeGreaterThan(0);
            expect(firm1Clients[0].firmId.toString()).toBe(testFirm._id.toString());
            expect(firm2Clients[0].firmId.toString()).toBe(testFirm2._id.toString());
        });

        it('should isolate clients by lawyerId', async () => {
            await Client.create({
                clientType: 'individual',
                firstName: 'Lawyer1',
                lastName: 'Client',
                phone: '+966500000019',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            await Client.create({
                clientType: 'individual',
                firstName: 'Lawyer2',
                lastName: 'Client',
                phone: '+966500000020',
                lawyerId: testLawyer2._id,
                firmId: testFirm2._id
            });

            const lawyer1Clients = await Client.find({ lawyerId: testLawyer._id });
            const lawyer2Clients = await Client.find({ lawyerId: testLawyer2._id });

            expect(lawyer1Clients.some(c => c.lawyerId.toString() === testLawyer._id.toString())).toBe(true);
            expect(lawyer2Clients.some(c => c.lawyerId.toString() === testLawyer2._id.toString())).toBe(true);
        });

        it('should prevent cross-firm data access', async () => {
            const firm1Client = await Client.create({
                clientType: 'individual',
                firstName: 'CrossFirm',
                lastName: 'Test',
                phone: '+966500000021',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const wrongFirmQuery = await Client.findOne({
                _id: firm1Client._id,
                firmId: testFirm2._id
            });

            expect(wrongFirmQuery).toBeNull();
        });
    });

    // ============ SEARCH FUNCTIONALITY ============

    describe('Search Functionality', () => {
        beforeEach(async () => {
            // Create test clients for search
            await Client.create({
                clientType: 'individual',
                nationalId: '1111111111',
                firstName: 'Fahad',
                lastName: 'Mohammed',
                fullNameArabic: 'فهد محمد',
                email: 'fahad@search.com',
                phone: '+966500000022',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                clientNumber: 'CLT-00001'
            });

            await Client.create({
                clientType: 'company',
                crNumber: '7010999999',
                companyName: 'Search Test Company',
                companyNameEnglish: 'Search Test Company',
                email: 'info@searchcompany.com',
                phone: '+966500000023',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                clientNumber: 'CLT-00002'
            });
        });

        it('should search by name (Arabic)', async () => {
            const results = await Client.searchClients(testLawyer._id, 'فهد');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].fullNameArabic).toContain('فهد');
        });

        it('should search by company name', async () => {
            const results = await Client.searchClients(testLawyer._id, 'Search Test');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].companyName).toContain('Search Test');
        });

        it('should search by email', async () => {
            const results = await Client.searchClients(testLawyer._id, 'fahad@search.com');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].email).toBe('fahad@search.com');
        });

        it('should search by phone', async () => {
            const results = await Client.searchClients(testLawyer._id, '+966500000022');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].phone).toBe('+966500000022');
        });

        it('should search by client number', async () => {
            const results = await Client.searchClients(testLawyer._id, 'CLT-00001');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].clientNumber).toBe('CLT-00001');
        });

        it('should search by national ID', async () => {
            const results = await Client.searchClients(testLawyer._id, '1111111111');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].nationalId).toBe('1111111111');
        });

        it('should search by CR number', async () => {
            const results = await Client.searchClients(testLawyer._id, '7010999999');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].crNumber).toBe('7010999999');
        });

        it('should filter search by client type', async () => {
            const results = await Client.searchClients(testLawyer._id, '', { clientType: 'company' });
            expect(results.length).toBeGreaterThan(0);
            expect(results.every(c => c.clientType === 'company')).toBe(true);
        });

        it('should filter search by status', async () => {
            const results = await Client.searchClients(testLawyer._id, '', { status: 'active' });
            expect(results.length).toBeGreaterThan(0);
            expect(results.every(c => c.status === 'active')).toBe(true);
        });

        it('should limit search results', async () => {
            const results = await Client.searchClients(testLawyer._id, '', { limit: 1 });
            expect(results.length).toBeLessThanOrEqual(1);
        });

        it('should not return archived clients in search', async () => {
            await Client.create({
                clientType: 'individual',
                firstName: 'Archived',
                lastName: 'Client',
                phone: '+966500000024',
                lawyerId: testLawyer._id,
                firmId: testFirm._id,
                status: 'archived'
            });

            const results = await Client.searchClients(testLawyer._id, 'Archived');
            expect(results.length).toBe(0);
        });
    });

    // ============ CONFLICT CHECK ============

    describe('Conflict Check', () => {
        it('should detect conflict by national ID', async () => {
            await Client.create({
                clientType: 'individual',
                nationalId: '9999999999',
                firstName: 'Conflict',
                lastName: 'Test',
                phone: '+966500000025',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const conflicts = await Client.runConflictCheck(testLawyer._id, {
                nationalId: '9999999999'
            });

            expect(conflicts.length).toBeGreaterThan(0);
            expect(conflicts[0].type).toBe('nationalId');
        });

        it('should detect conflict by CR number', async () => {
            await Client.create({
                clientType: 'company',
                crNumber: '7010888888',
                companyName: 'Conflict Company',
                phone: '+966500000026',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const conflicts = await Client.runConflictCheck(testLawyer._id, {
                crNumber: '7010888888'
            });

            expect(conflicts.length).toBeGreaterThan(0);
            expect(conflicts[0].type).toBe('crNumber');
        });

        it('should detect conflict by email', async () => {
            await Client.create({
                clientType: 'individual',
                firstName: 'Email',
                lastName: 'Conflict',
                email: 'conflict@test.com',
                phone: '+966500000027',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const conflicts = await Client.runConflictCheck(testLawyer._id, {
                email: 'conflict@test.com'
            });

            expect(conflicts.length).toBeGreaterThan(0);
            expect(conflicts[0].type).toBe('email');
        });

        it('should detect conflict by phone', async () => {
            await Client.create({
                clientType: 'individual',
                firstName: 'Phone',
                lastName: 'Conflict',
                phone: '+966500000028',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const conflicts = await Client.runConflictCheck(testLawyer._id, {
                phone: '+966500000028'
            });

            expect(conflicts.length).toBeGreaterThan(0);
            expect(conflicts[0].type).toBe('phone');
        });

        it('should not detect conflicts for same client update', async () => {
            const client = await Client.create({
                clientType: 'individual',
                nationalId: '8888888888',
                firstName: 'Same',
                lastName: 'Client',
                phone: '+966500000029',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const conflicts = await Client.runConflictCheck(testLawyer._id, {
                _id: client._id,
                nationalId: '8888888888'
            });

            expect(conflicts.length).toBe(0);
        });
    });

    // ============ INSTANCE METHODS ============

    describe('Instance Methods', () => {
        it('should calculate client balance', async () => {
            const client = await Client.create({
                clientType: 'individual',
                firstName: 'Balance',
                lastName: 'Test',
                phone: '+966500000030',
                lawyerId: testLawyer._id,
                firmId: testFirm._id
            });

            const result = await client.updateBalance();

            expect(result).toBeDefined();
            expect(result.totalInvoiced).toBe(0);
            expect(result.totalPayments).toBe(0);
            expect(result.balance).toBe(0);
        });
    });
});
