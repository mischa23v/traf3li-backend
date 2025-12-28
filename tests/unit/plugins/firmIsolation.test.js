/**
 * Firm Isolation Plugin Tests - Enterprise Security Tests
 *
 * These tests verify that the globalFirmIsolation plugin properly enforces
 * multi-tenant data isolation. They cover:
 * 1. Cross-tenant access prevention
 * 2. Query hook enforcement
 * 3. Aggregation pipeline protection
 * 4. bulkWrite operation protection
 * 5. Bypass method functionality
 */

const mongoose = require('mongoose');
const {
    createGlobalFirmIsolationPlugin,
    hasIsolationFilter,
    hasAggregationFilter,
    validateBulkWriteOperations,
    SKIP_MODELS
} = require('../../../src/plugins/globalFirmIsolation.plugin');

// Create a test schema with firmId (like a tenant model)
const createTestSchema = () => {
    const schema = new mongoose.Schema({
        name: String,
        data: String,
        firmId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Firm',
            index: true
        },
        lawyerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            index: true
        }
    });

    // Apply the firm isolation plugin
    schema.plugin(createGlobalFirmIsolationPlugin());

    return schema;
};

// Create a test schema without firmId (like a system model)
const createSystemSchema = () => {
    return new mongoose.Schema({
        name: String,
        data: String
    });
};

describe('Firm Isolation Plugin', () => {
    let TestModel;
    let SystemModel;
    const firmId1 = new mongoose.Types.ObjectId();
    const firmId2 = new mongoose.Types.ObjectId();
    const lawyerId1 = new mongoose.Types.ObjectId();
    const lawyerId2 = new mongoose.Types.ObjectId();

    beforeAll(() => {
        // Create test models
        const testSchema = createTestSchema();
        const systemSchema = createSystemSchema();

        // Use unique model names to avoid conflicts
        const modelName = `TestIsolation_${Date.now()}`;
        const systemModelName = `SystemModel_${Date.now()}`;

        TestModel = mongoose.model(modelName, testSchema);
        SystemModel = mongoose.model(systemModelName, systemSchema);
    });

    beforeEach(async () => {
        // Clear test collections
        await TestModel.deleteMany({}).setOptions({ bypassFirmFilter: true });
        await SystemModel.deleteMany({});
    });

    describe('hasIsolationFilter', () => {
        it('should return true when firmId is present', () => {
            const mockQuery = {
                getQuery: () => ({ firmId: firmId1 })
            };
            expect(hasIsolationFilter(mockQuery)).toBe(true);
        });

        it('should return true when lawyerId is present', () => {
            const mockQuery = {
                getQuery: () => ({ lawyerId: lawyerId1 })
            };
            expect(hasIsolationFilter(mockQuery)).toBe(true);
        });

        it('should return false when only _id is present', () => {
            const mockQuery = {
                getQuery: () => ({ _id: new mongoose.Types.ObjectId() })
            };
            expect(hasIsolationFilter(mockQuery)).toBe(false);
        });

        it('should return false for empty query', () => {
            const mockQuery = {
                getQuery: () => ({})
            };
            expect(hasIsolationFilter(mockQuery)).toBe(false);
        });
    });

    describe('hasAggregationFilter', () => {
        it('should return true when first $match has firmId', () => {
            const pipeline = [{ $match: { firmId: firmId1 } }];
            expect(hasAggregationFilter(pipeline)).toBe(true);
        });

        it('should return true when first $match has lawyerId', () => {
            const pipeline = [{ $match: { lawyerId: lawyerId1 } }];
            expect(hasAggregationFilter(pipeline)).toBe(true);
        });

        it('should return false when first stage is not $match', () => {
            const pipeline = [{ $group: { _id: '$status' } }];
            expect(hasAggregationFilter(pipeline)).toBe(false);
        });

        it('should return false when $match lacks isolation filter', () => {
            const pipeline = [{ $match: { status: 'active' } }];
            expect(hasAggregationFilter(pipeline)).toBe(false);
        });

        it('should return false for empty pipeline', () => {
            expect(hasAggregationFilter([])).toBe(false);
            expect(hasAggregationFilter(null)).toBe(false);
        });
    });

    describe('validateBulkWriteOperations', () => {
        it('should pass when all operations have firmId', () => {
            const operations = [
                { insertOne: { document: { name: 'test', firmId: firmId1 } } },
                { updateOne: { filter: { firmId: firmId1 }, update: { $set: { name: 'updated' } } } },
                { deleteOne: { filter: { firmId: firmId1 } } }
            ];
            const result = validateBulkWriteOperations(operations);
            expect(result.valid).toBe(true);
            expect(result.issues).toHaveLength(0);
        });

        it('should fail when insertOne lacks firmId', () => {
            const operations = [
                { insertOne: { document: { name: 'test' } } }
            ];
            const result = validateBulkWriteOperations(operations);
            expect(result.valid).toBe(false);
            expect(result.issues[0]).toContain('insertOne');
        });

        it('should fail when updateOne filter lacks firmId', () => {
            const operations = [
                { updateOne: { filter: { _id: new mongoose.Types.ObjectId() }, update: { $set: { name: 'test' } } } }
            ];
            const result = validateBulkWriteOperations(operations);
            expect(result.valid).toBe(false);
            expect(result.issues[0]).toContain('updateOne');
        });

        it('should fail when deleteMany filter lacks firmId', () => {
            const operations = [
                { deleteMany: { filter: { status: 'inactive' } } }
            ];
            const result = validateBulkWriteOperations(operations);
            expect(result.valid).toBe(false);
            expect(result.issues[0]).toContain('deleteMany');
        });

        it('should pass with lawyerId instead of firmId', () => {
            const operations = [
                { insertOne: { document: { name: 'test', lawyerId: lawyerId1 } } },
                { updateOne: { filter: { lawyerId: lawyerId1 }, update: { $set: { name: 'updated' } } } }
            ];
            const result = validateBulkWriteOperations(operations);
            expect(result.valid).toBe(true);
        });
    });

    describe('Query Enforcement', () => {
        beforeEach(async () => {
            // Create test data for two firms
            await TestModel.create([
                { name: 'Firm1 Doc1', data: 'data1', firmId: firmId1 },
                { name: 'Firm1 Doc2', data: 'data2', firmId: firmId1 },
                { name: 'Firm2 Doc1', data: 'data3', firmId: firmId2 }
            ]).catch(() => {});
        });

        it('should allow find with firmId', async () => {
            const docs = await TestModel.find({ firmId: firmId1 });
            expect(docs.length).toBe(2);
            docs.forEach(doc => {
                expect(doc.firmId.toString()).toBe(firmId1.toString());
            });
        });

        it('should allow find with lawyerId', async () => {
            // Create docs with lawyerId
            await TestModel.create({ name: 'Lawyer Doc', lawyerId: lawyerId1 });
            const docs = await TestModel.find({ lawyerId: lawyerId1 });
            expect(docs.length).toBe(1);
        });

        it('should throw FIRM_ISOLATION_VIOLATION for find without firmId', async () => {
            await expect(TestModel.find({ name: 'test' }))
                .rejects
                .toThrow('FIRM_ISOLATION_VIOLATION');
        });

        it('should throw FIRM_ISOLATION_VIOLATION for findOne without firmId', async () => {
            await expect(TestModel.findOne({ name: 'test' }))
                .rejects
                .toThrow('FIRM_ISOLATION_VIOLATION');
        });

        it('should throw FIRM_ISOLATION_VIOLATION for updateOne without firmId', async () => {
            await expect(TestModel.updateOne(
                { name: 'test' },
                { $set: { data: 'updated' } }
            )).rejects.toThrow('FIRM_ISOLATION_VIOLATION');
        });

        it('should throw FIRM_ISOLATION_VIOLATION for deleteOne without firmId', async () => {
            await expect(TestModel.deleteOne({ name: 'test' }))
                .rejects
                .toThrow('FIRM_ISOLATION_VIOLATION');
        });
    });

    describe('Cross-Tenant Prevention', () => {
        beforeEach(async () => {
            // Create test data for two firms
            await TestModel.create([
                { name: 'Secret Firm1 Data', data: 'confidential1', firmId: firmId1 },
                { name: 'Secret Firm2 Data', data: 'confidential2', firmId: firmId2 }
            ]).catch(() => {});
        });

        it('should only return data from the queried firm', async () => {
            // Query for firm1
            const firm1Docs = await TestModel.find({ firmId: firmId1 });
            expect(firm1Docs.length).toBe(1);
            expect(firm1Docs[0].name).toBe('Secret Firm1 Data');
            expect(firm1Docs[0].firmId.toString()).toBe(firmId1.toString());

            // Query for firm2
            const firm2Docs = await TestModel.find({ firmId: firmId2 });
            expect(firm2Docs.length).toBe(1);
            expect(firm2Docs[0].name).toBe('Secret Firm2 Data');
            expect(firm2Docs[0].firmId.toString()).toBe(firmId2.toString());
        });

        it('should not allow updating another firm\'s document', async () => {
            // Try to update firm2's document with firm1's query
            const result = await TestModel.updateOne(
                { firmId: firmId1, name: 'Secret Firm2 Data' },
                { $set: { data: 'hacked' } }
            );
            expect(result.matchedCount).toBe(0);

            // Verify firm2's data is unchanged
            const firm2Doc = await TestModel.findOne({ firmId: firmId2 });
            expect(firm2Doc.data).toBe('confidential2');
        });

        it('should not allow deleting another firm\'s document', async () => {
            // Try to delete firm2's document with firm1's query
            const result = await TestModel.deleteOne(
                { firmId: firmId1, name: 'Secret Firm2 Data' }
            );
            expect(result.deletedCount).toBe(0);

            // Verify firm2's document still exists
            const firm2Doc = await TestModel.findOne({ firmId: firmId2 });
            expect(firm2Doc).not.toBeNull();
        });
    });

    describe('Bypass Methods', () => {
        beforeEach(async () => {
            await TestModel.create([
                { name: 'Doc1', firmId: firmId1 },
                { name: 'Doc2', firmId: firmId2 }
            ]).catch(() => {});
        });

        it('findWithoutFirmFilter should bypass isolation', async () => {
            const docs = await TestModel.findWithoutFirmFilter({ name: 'Doc1' });
            expect(docs.length).toBe(1);
        });

        it('findOneWithoutFirmFilter should bypass isolation', async () => {
            const doc = await TestModel.findOneWithoutFirmFilter({ name: 'Doc2' });
            expect(doc).not.toBeNull();
            expect(doc.name).toBe('Doc2');
        });

        it('countWithoutFirmFilter should bypass isolation', async () => {
            const count = await TestModel.countWithoutFirmFilter({});
            expect(count).toBe(2);
        });

        it('updateOneWithoutFirmFilter should bypass isolation', async () => {
            await TestModel.updateOneWithoutFirmFilter(
                { name: 'Doc1' },
                { $set: { data: 'updated' } }
            );
            const doc = await TestModel.findOneWithoutFirmFilter({ name: 'Doc1' });
            expect(doc.data).toBe('updated');
        });

        it('deleteOneWithoutFirmFilter should bypass isolation', async () => {
            await TestModel.deleteOneWithoutFirmFilter({ name: 'Doc1' });
            const count = await TestModel.countWithoutFirmFilter({});
            expect(count).toBe(1);
        });

        it('setOptions({ bypassFirmFilter: true }) should bypass isolation', async () => {
            const docs = await TestModel.find({ name: 'Doc1' })
                .setOptions({ bypassFirmFilter: true });
            expect(docs.length).toBe(1);
        });
    });

    describe('Aggregation Protection', () => {
        beforeEach(async () => {
            await TestModel.create([
                { name: 'Doc1', data: 'type-a', firmId: firmId1 },
                { name: 'Doc2', data: 'type-a', firmId: firmId1 },
                { name: 'Doc3', data: 'type-b', firmId: firmId2 }
            ]).catch(() => {});
        });

        it('should allow aggregation with firmId in first $match', async () => {
            const result = await TestModel.aggregate([
                { $match: { firmId: firmId1 } },
                { $group: { _id: '$data', count: { $sum: 1 } } }
            ]);
            expect(result.length).toBe(1);
            expect(result[0]._id).toBe('type-a');
            expect(result[0].count).toBe(2);
        });

        it('should throw for aggregation without $match first', async () => {
            await expect(TestModel.aggregate([
                { $group: { _id: '$data', count: { $sum: 1 } } }
            ])).rejects.toThrow('FIRM_ISOLATION_VIOLATION');
        });

        it('should throw for aggregation with $match lacking firmId', async () => {
            await expect(TestModel.aggregate([
                { $match: { data: 'type-a' } }
            ])).rejects.toThrow('FIRM_ISOLATION_VIOLATION');
        });

        it('aggregateWithoutFirmFilter should bypass protection', async () => {
            const result = await TestModel.aggregateWithoutFirmFilter([
                { $group: { _id: '$data', count: { $sum: 1 } } }
            ]);
            expect(result.length).toBe(2); // Two data types across all firms
        });
    });

    describe('Enterprise Methods - findByIdWithFirm', () => {
        let testDocId;

        beforeEach(async () => {
            const doc = await TestModel.create({ name: 'Test', firmId: firmId1 });
            testDocId = doc._id;
        });

        it('should find document with matching firmId', async () => {
            const doc = await TestModel.findByIdWithFirm(testDocId, { firmId: firmId1 });
            expect(doc).not.toBeNull();
            expect(doc.name).toBe('Test');
        });

        it('should not find document with wrong firmId', async () => {
            const doc = await TestModel.findByIdWithFirm(testDocId, { firmId: firmId2 });
            expect(doc).toBeNull();
        });

        it('should throw if firmQuery is missing', () => {
            expect(() => TestModel.findByIdWithFirm(testDocId))
                .toThrow('FIRM_ISOLATION_VIOLATION');
        });

        it('should throw if firmQuery lacks firmId or lawyerId', () => {
            expect(() => TestModel.findByIdWithFirm(testDocId, { status: 'active' }))
                .toThrow('FIRM_ISOLATION_VIOLATION');
        });
    });

    describe('SKIP_MODELS Configuration', () => {
        it('should include User in skip list', () => {
            expect(SKIP_MODELS.has('User')).toBe(true);
        });

        it('should include Firm in skip list', () => {
            expect(SKIP_MODELS.has('Firm')).toBe(true);
        });

        it('should include Session in skip list', () => {
            expect(SKIP_MODELS.has('Session')).toBe(true);
        });

        it('should include SsoProvider in skip list', () => {
            expect(SKIP_MODELS.has('SsoProvider')).toBe(true);
        });

        it('should not include Client in skip list', () => {
            expect(SKIP_MODELS.has('Client')).toBe(false);
        });

        it('should not include Case in skip list', () => {
            expect(SKIP_MODELS.has('Case')).toBe(false);
        });
    });
});
