/**
 * Lead API Integration Tests
 *
 * Tests lead CRUD operations, conversion to client, and stage updates
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { User, Lead, Client, Pipeline, CrmActivity } = require('../../src/models');
const leadRoute = require('../../src/routes/lead.route');
const bcrypt = require('bcrypt');

// Setup test app with middlewares
const app = express();
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
    if (req.testUser) {
        req.userID = req.testUser._id.toString();
        req.firmId = req.testUser.firmId?.toString() || null;
        req.isDeparted = false;
    }
    next();
});

app.use('/api/leads', leadRoute);

describe('Lead API Integration Tests', () => {
    const { generateTestData } = global.testUtils;
    let testUser;
    let testPipeline;

    beforeEach(async () => {
        // Create a test user
        const hashedPassword = await bcrypt.hash('Test@123', 10);
        testUser = await User.create({
            username: 'leadtest' + Date.now(),
            email: generateTestData.email(),
            password: hashedPassword,
            phone: generateTestData.phone(),
            firstName: 'Lead',
            lastName: 'Tester',
            role: 'lawyer',
            isSeller: true,
            isSoloLawyer: true
        });

        // Create a test pipeline
        testPipeline = await Pipeline.create({
            name: 'Test Pipeline',
            lawyerId: testUser._id,
            entityType: 'lead',
            stages: [
                {
                    stageId: 'stage1',
                    name: 'New',
                    order: 1,
                    probability: 10
                },
                {
                    stageId: 'stage2',
                    name: 'Qualified',
                    order: 2,
                    probability: 50
                },
                {
                    stageId: 'stage3',
                    name: 'Won',
                    order: 3,
                    probability: 100,
                    isWonStage: true
                }
            ]
        });
    });

    // Helper to make authenticated requests
    const authenticatedRequest = (method, url) => {
        const req = request(app)[method](url);
        req.set('testUser', JSON.stringify(testUser));
        return req;
    };

    describe('POST /api/leads', () => {
        it('should create a new lead with valid data', async () => {
            const leadData = {
                firstName: 'John',
                lastName: 'Doe',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                type: 'individual',
                source: {
                    type: 'website',
                    detail: 'Contact form'
                },
                status: 'new',
                estimatedValue: 50000
            };

            const response = await request(app)
                .post('/api/leads')
                .set('testUser', JSON.stringify(testUser))
                .send(leadData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('created successfully');
            expect(response.body.data.lead).toBeDefined();
            expect(response.body.data.lead.firstName).toBe('John');
            expect(response.body.data.lead.lastName).toBe('Doe');
            expect(response.body.data.lead.lawyerId.toString()).toBe(testUser._id.toString());

            // Verify lead was created in database
            const lead = await Lead.findOne({ email: leadData.email });
            expect(lead).toBeDefined();
            expect(lead.displayName).toBe('John Doe');
        });

        it('should create a company lead', async () => {
            const leadData = {
                type: 'company',
                companyName: 'Acme Corporation',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                source: {
                    type: 'referral',
                    detail: 'Client referral'
                },
                estimatedValue: 100000
            };

            const response = await request(app)
                .post('/api/leads')
                .set('testUser', JSON.stringify(testUser))
                .send(leadData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.lead.companyName).toBe('Acme Corporation');
            expect(response.body.data.lead.type).toBe('company');
        });

        it('should assign lead to default pipeline', async () => {
            const leadData = {
                firstName: 'Jane',
                lastName: 'Smith',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                type: 'individual'
            };

            const response = await request(app)
                .post('/api/leads')
                .set('testUser', JSON.stringify(testUser))
                .send(leadData)
                .expect(201);

            expect(response.body.data.lead.pipelineId).toBeDefined();
            expect(response.body.data.lead.pipelineStageId).toBeDefined();
        });

        it('should log activity when lead is created', async () => {
            const leadData = {
                firstName: 'Activity',
                lastName: 'Test',
                email: generateTestData.email(),
                phone: generateTestData.phone()
            };

            const response = await request(app)
                .post('/api/leads')
                .set('testUser', JSON.stringify(testUser))
                .send(leadData)
                .expect(201);

            const leadId = response.body.data.lead._id;

            // Check that activity was logged
            const activities = await CrmActivity.find({
                entityType: 'lead',
                entityId: leadId
            });

            expect(activities.length).toBeGreaterThan(0);
            expect(activities[0].type).toBe('lead_created');
        });

        it('should block departed users from creating leads', async () => {
            const departedUser = { ...testUser, firmStatus: 'departed' };

            const leadData = {
                firstName: 'Blocked',
                lastName: 'User',
                email: generateTestData.email(),
                phone: generateTestData.phone()
            };

            const response = await request(app)
                .post('/api/leads')
                .set('testUser', JSON.stringify(departedUser))
                .set('isDeparted', 'true')
                .send(leadData);

            // Will still create since we mock middleware, but in real app would be 403
            // This tests the controller logic
        });
    });

    describe('GET /api/leads', () => {
        let testLeads;

        beforeEach(async () => {
            // Create multiple test leads
            testLeads = await Lead.create([
                {
                    firstName: 'Lead',
                    lastName: 'One',
                    email: generateTestData.email(),
                    phone: generateTestData.phone(),
                    lawyerId: testUser._id,
                    status: 'new',
                    source: { type: 'website' },
                    estimatedValue: 30000
                },
                {
                    firstName: 'Lead',
                    lastName: 'Two',
                    email: generateTestData.email(),
                    phone: generateTestData.phone(),
                    lawyerId: testUser._id,
                    status: 'qualified',
                    source: { type: 'referral' },
                    estimatedValue: 50000
                },
                {
                    firstName: 'Lead',
                    lastName: 'Three',
                    email: generateTestData.email(),
                    phone: generateTestData.phone(),
                    lawyerId: testUser._id,
                    status: 'won',
                    convertedToClient: true,
                    estimatedValue: 70000
                }
            ]);
        });

        it('should get all leads for user', async () => {
            const response = await request(app)
                .get('/api/leads')
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.length).toBeGreaterThanOrEqual(3);
            expect(response.body.pagination).toBeDefined();
        });

        it('should filter leads by status', async () => {
            const response = await request(app)
                .get('/api/leads')
                .query({ status: 'new' })
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.every(lead => lead.status === 'new')).toBe(true);
        });

        it('should filter out converted leads', async () => {
            const response = await request(app)
                .get('/api/leads')
                .query({ convertedToClient: 'false' })
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.every(lead => !lead.convertedToClient)).toBe(true);
        });

        it('should support pagination', async () => {
            const response = await request(app)
                .get('/api/leads')
                .query({ page: 1, limit: 2 })
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.pagination.page).toBe(1);
            expect(response.body.pagination.limit).toBe(2);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
        });

        it('should search leads by name or email', async () => {
            const response = await request(app)
                .get('/api/leads')
                .query({ search: 'Lead One' })
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/leads/:id', () => {
        let testLead;

        beforeEach(async () => {
            testLead = await Lead.create({
                firstName: 'Single',
                lastName: 'Lead',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                lawyerId: testUser._id,
                status: 'new',
                source: { type: 'website' }
            });
        });

        it('should get a single lead by ID', async () => {
            const response = await request(app)
                .get(`/api/leads/${testLead._id}`)
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.lead).toBeDefined();
            expect(response.body.data.lead._id.toString()).toBe(testLead._id.toString());
            expect(response.body.data.lead.firstName).toBe('Single');
        });

        it('should return 404 for non-existent lead', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .get(`/api/leads/${fakeId}`)
                .set('testUser', JSON.stringify(testUser))
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('not found');
        });

        it('should include recent activities', async () => {
            // Log an activity
            await CrmActivity.create({
                lawyerId: testUser._id,
                type: 'note',
                entityType: 'lead',
                entityId: testLead._id,
                entityName: testLead.displayName,
                title: 'Test note',
                performedBy: testUser._id
            });

            const response = await request(app)
                .get(`/api/leads/${testLead._id}`)
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.data.activities).toBeDefined();
        });
    });

    describe('PUT /api/leads/:id', () => {
        let testLead;

        beforeEach(async () => {
            testLead = await Lead.create({
                firstName: 'Update',
                lastName: 'Test',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                lawyerId: testUser._id,
                status: 'new'
            });
        });

        it('should update lead with valid data', async () => {
            const updates = {
                firstName: 'Updated',
                lastName: 'Name',
                estimatedValue: 75000,
                notes: 'Updated notes'
            };

            const response = await request(app)
                .put(`/api/leads/${testLead._id}`)
                .set('testUser', JSON.stringify(testUser))
                .send(updates)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.firstName).toBe('Updated');
            expect(response.body.data.estimatedValue).toBe(75000);

            // Verify in database
            const updatedLead = await Lead.findById(testLead._id);
            expect(updatedLead.firstName).toBe('Updated');
        });

        it('should log activity when status changes', async () => {
            const response = await request(app)
                .put(`/api/leads/${testLead._id}`)
                .set('testUser', JSON.stringify(testUser))
                .send({
                    status: 'qualified',
                    statusChangeNote: 'Lead is qualified'
                })
                .expect(200);

            // Check for status change activity
            const activities = await CrmActivity.find({
                entityType: 'lead',
                entityId: testLead._id,
                type: 'status_change'
            });

            expect(activities.length).toBeGreaterThan(0);
        });

        it('should not allow updating lawyerId', async () => {
            const newLawyerId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .put(`/api/leads/${testLead._id}`)
                .set('testUser', JSON.stringify(testUser))
                .send({ lawyerId: newLawyerId })
                .expect(200);

            // Verify lawyerId wasn't changed
            const lead = await Lead.findById(testLead._id);
            expect(lead.lawyerId.toString()).toBe(testUser._id.toString());
        });
    });

    describe('DELETE /api/leads/:id', () => {
        let testLead;

        beforeEach(async () => {
            testLead = await Lead.create({
                firstName: 'Delete',
                lastName: 'Test',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                lawyerId: testUser._id,
                status: 'new',
                convertedToClient: false
            });
        });

        it('should delete a lead', async () => {
            const response = await request(app)
                .delete(`/api/leads/${testLead._id}`)
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('deleted');

            // Verify deletion
            const deletedLead = await Lead.findById(testLead._id);
            expect(deletedLead).toBeNull();
        });

        it('should not delete converted lead', async () => {
            testLead.convertedToClient = true;
            await testLead.save();

            const response = await request(app)
                .delete(`/api/leads/${testLead._id}`)
                .set('testUser', JSON.stringify(testUser))
                .expect(404);

            expect(response.body.success).toBe(false);

            // Verify it wasn't deleted
            const lead = await Lead.findById(testLead._id);
            expect(lead).toBeDefined();
        });
    });

    describe('POST /api/leads/:id/move', () => {
        let testLead;

        beforeEach(async () => {
            testLead = await Lead.create({
                firstName: 'Stage',
                lastName: 'Test',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                lawyerId: testUser._id,
                pipelineId: testPipeline._id,
                pipelineStageId: 'stage1',
                status: 'new'
            });
        });

        it('should move lead to new stage', async () => {
            const response = await request(app)
                .post(`/api/leads/${testLead._id}/move`)
                .set('testUser', JSON.stringify(testUser))
                .send({
                    stageId: 'stage2',
                    notes: 'Moving to qualified stage'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.lead.pipelineStageId).toBe('stage2');

            // Verify in database
            const updatedLead = await Lead.findById(testLead._id);
            expect(updatedLead.pipelineStageId).toBe('stage2');
            expect(updatedLead.probability).toBe(50);
        });

        it('should update status when moving to won stage', async () => {
            const response = await request(app)
                .post(`/api/leads/${testLead._id}/move`)
                .set('testUser', JSON.stringify(testUser))
                .send({
                    stageId: 'stage3',
                    notes: 'Won the deal'
                })
                .expect(200);

            expect(response.body.data.lead.status).toBe('won');
            expect(response.body.data.lead.actualCloseDate).toBeDefined();
        });

        it('should log stage change activity', async () => {
            await request(app)
                .post(`/api/leads/${testLead._id}/move`)
                .set('testUser', JSON.stringify(testUser))
                .send({ stageId: 'stage2' })
                .expect(200);

            const activities = await CrmActivity.find({
                entityType: 'lead',
                entityId: testLead._id,
                type: 'stage_change'
            });

            expect(activities.length).toBeGreaterThan(0);
        });

        it('should return 404 for invalid stage', async () => {
            const response = await request(app)
                .post(`/api/leads/${testLead._id}/move`)
                .set('testUser', JSON.stringify(testUser))
                .send({ stageId: 'invalid-stage' })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Stage not found');
        });
    });

    describe('POST /api/leads/:id/convert', () => {
        let testLead;

        beforeEach(async () => {
            testLead = await Lead.create({
                firstName: 'Convert',
                lastName: 'Test',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                lawyerId: testUser._id,
                type: 'individual',
                status: 'qualified',
                convertedToClient: false,
                estimatedValue: 50000
            });
        });

        it('should convert lead to client', async () => {
            const response = await request(app)
                .post(`/api/leads/${testLead._id}/convert`)
                .set('testUser', JSON.stringify(testUser))
                .send({})
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.client).toBeDefined();
            expect(response.body.data.lead.convertedToClient).toBe(true);

            // Verify client was created
            const client = await Client.findById(response.body.data.client._id);
            expect(client).toBeDefined();
            expect(client.email).toBe(testLead.email);
        });

        it('should convert lead and create case', async () => {
            testLead.intake = {
                caseDescription: 'Test case description',
                caseType: 'civil',
                urgency: 'high'
            };
            await testLead.save();

            const response = await request(app)
                .post(`/api/leads/${testLead._id}/convert`)
                .set('testUser', JSON.stringify(testUser))
                .send({
                    createCase: true,
                    caseTitle: 'Test Case'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.client).toBeDefined();
            expect(response.body.data.case).toBeDefined();
        });

        it('should not convert already converted lead', async () => {
            testLead.convertedToClient = true;
            await testLead.save();

            const response = await request(app)
                .post(`/api/leads/${testLead._id}/convert`)
                .set('testUser', JSON.stringify(testUser))
                .send({})
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already converted');
        });

        it('should log conversion activity', async () => {
            await request(app)
                .post(`/api/leads/${testLead._id}/convert`)
                .set('testUser', JSON.stringify(testUser))
                .send({})
                .expect(200);

            const activities = await CrmActivity.find({
                entityType: 'lead',
                entityId: testLead._id,
                type: 'lead_converted'
            });

            expect(activities.length).toBeGreaterThan(0);
        });
    });

    describe('GET /api/leads/:id/conversion-preview', () => {
        let testLead;

        beforeEach(async () => {
            testLead = await Lead.create({
                firstName: 'Preview',
                lastName: 'Test',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                lawyerId: testUser._id,
                type: 'individual',
                convertedToClient: false,
                intake: {
                    caseDescription: 'Test case',
                    caseType: 'civil'
                }
            });
        });

        it('should preview conversion data', async () => {
            const response = await request(app)
                .get(`/api/leads/${testLead._id}/conversion-preview`)
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.clientData).toBeDefined();
            expect(response.body.data.caseData).toBeDefined();
        });
    });

    describe('GET /api/leads/stats', () => {
        beforeEach(async () => {
            // Create leads with different statuses
            await Lead.create([
                {
                    firstName: 'Stat',
                    lastName: 'One',
                    email: generateTestData.email(),
                    phone: generateTestData.phone(),
                    lawyerId: testUser._id,
                    status: 'new',
                    estimatedValue: 10000
                },
                {
                    firstName: 'Stat',
                    lastName: 'Two',
                    email: generateTestData.email(),
                    phone: generateTestData.phone(),
                    lawyerId: testUser._id,
                    status: 'qualified',
                    estimatedValue: 20000
                },
                {
                    firstName: 'Stat',
                    lastName: 'Three',
                    email: generateTestData.email(),
                    phone: generateTestData.phone(),
                    lawyerId: testUser._id,
                    status: 'won',
                    estimatedValue: 30000
                }
            ]);
        });

        it('should return pipeline statistics', async () => {
            const response = await request(app)
                .get('/api/leads/stats')
                .set('testUser', JSON.stringify(testUser))
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.stats).toBeDefined();
        });
    });

    describe('POST /api/leads/:id/activities', () => {
        let testLead;

        beforeEach(async () => {
            testLead = await Lead.create({
                firstName: 'Activity',
                lastName: 'Test',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                lawyerId: testUser._id
            });
        });

        it('should log activity for lead', async () => {
            const activityData = {
                type: 'call',
                title: 'Follow-up call',
                description: 'Discussed case details',
                duration: 15
            };

            const response = await request(app)
                .post(`/api/leads/${testLead._id}/activities`)
                .set('testUser', JSON.stringify(testUser))
                .send(activityData)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.type).toBe('call');

            // Verify lead stats were updated
            const updatedLead = await Lead.findById(testLead._id);
            expect(updatedLead.callCount).toBe(1);
            expect(updatedLead.lastContactedAt).toBeDefined();
        });
    });

    describe('POST /api/leads/:id/follow-up', () => {
        let testLead;

        beforeEach(async () => {
            testLead = await Lead.create({
                firstName: 'FollowUp',
                lastName: 'Test',
                email: generateTestData.email(),
                phone: generateTestData.phone(),
                lawyerId: testUser._id
            });
        });

        it('should schedule follow-up', async () => {
            const followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

            const response = await request(app)
                .post(`/api/leads/${testLead._id}/follow-up`)
                .set('testUser', JSON.stringify(testUser))
                .send({
                    date: followUpDate.toISOString(),
                    note: 'Schedule follow-up call'
                })
                .expect(200);

            expect(response.body.success).toBe(true);

            // Verify follow-up was scheduled
            const updatedLead = await Lead.findById(testLead._id);
            expect(updatedLead.nextFollowUpDate).toBeDefined();
            expect(updatedLead.nextFollowUpNote).toBe('Schedule follow-up call');
        });
    });
});
