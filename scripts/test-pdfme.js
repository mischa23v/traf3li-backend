/**
 * Test PDFMe Integration
 *
 * Run: node scripts/test-pdfme.js
 */

const path = require('path');

// Test PDFMe imports work
async function testImports() {
    console.log('Testing PDFMe imports...');

    try {
        const { generate } = require('@pdfme/generator');
        console.log('  ✅ @pdfme/generator imported successfully');

        const { BLANK_PDF } = require('@pdfme/common');
        console.log('  ✅ @pdfme/common imported successfully');

        const { text, image, barcodes } = require('@pdfme/schemas');
        console.log('  ✅ @pdfme/schemas imported successfully');

        return { generate, BLANK_PDF, text, image, barcodes };
    } catch (error) {
        console.error('  ❌ Import failed:', error.message);
        throw error;
    }
}

// Test basic PDF generation
async function testBasicGeneration(deps) {
    console.log('\nTesting basic PDF generation...');

    const { generate, BLANK_PDF, text } = deps;

    const template = {
        basePdf: BLANK_PDF,
        schemas: [
            [
                {
                    name: 'title',
                    type: 'text',
                    position: { x: 10, y: 10 },
                    width: 100,
                    height: 10
                },
                {
                    name: 'content',
                    type: 'text',
                    position: { x: 10, y: 30 },
                    width: 180,
                    height: 50
                }
            ]
        ]
    };

    const inputs = [
        {
            title: 'Test PDF Document',
            content: 'This is a test PDF generated using PDFMe library.'
        }
    ];

    try {
        const pdf = await generate({
            template,
            inputs,
            plugins: { text }
        });

        console.log('  ✅ PDF generated successfully');
        console.log(`  📄 PDF size: ${pdf.byteLength} bytes`);

        return pdf;
    } catch (error) {
        console.error('  ❌ Generation failed:', error.message);
        throw error;
    }
}

// Test PDFMe service
async function testPdfmeService() {
    console.log('\nTesting PDFMe service...');

    try {
        const PdfmeService = require('../src/services/pdfme.service');
        console.log('  ✅ PDFMe service imported successfully');

        // Test default invoice template
        const invoiceTemplate = PdfmeService.getDefaultInvoiceTemplate();
        console.log('  ✅ Default invoice template retrieved');
        console.log(`     Fields: ${invoiceTemplate.schemas[0].length} schema fields`);

        // Test invoice mapping
        const invoiceData = {
            invoiceNumber: 'INV-2025-001',
            date: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            client: {
                name: 'Test Client',
                email: 'client@test.com',
                phone: '+966 50 123 4567',
                address: '123 Test Street, Riyadh'
            },
            lawyer: {
                businessName: 'Test Law Firm',
                email: 'lawyer@test.com',
                phone: '+966 50 987 6543',
                address: '456 Legal Avenue, Riyadh'
            },
            items: [
                { description: 'Legal Consultation', quantity: 2, unitPrice: 500, lineTotal: 1000 },
                { description: 'Document Review', quantity: 1, unitPrice: 750, lineTotal: 750 }
            ],
            subtotal: 1750,
            taxAmount: 262.5,
            totalAmount: 2012.5,
            currency: 'SAR'
        };

        const inputs = PdfmeService.mapInvoiceToInputs(invoiceData);
        console.log('  ✅ Invoice data mapped to inputs');
        console.log(`     Invoice Number: ${inputs.invoiceNumber}`);
        console.log(`     Total: ${inputs.total}`);

        // Test PDF generation
        const pdfBuffer = await PdfmeService.generateInvoicePDF(invoiceData, null, null);
        console.log('  ✅ Invoice PDF generated');
        console.log(`     Size: ${pdfBuffer.length} bytes`);

        return true;
    } catch (error) {
        console.error('  ❌ Service test failed:', error.message);
        console.error(error.stack);
        throw error;
    }
}

// Test model
async function testModel() {
    console.log('\nTesting PDFMe model...');

    try {
        const PdfmeTemplate = require('../src/models/pdfmeTemplate.model');
        console.log('  ✅ PDFMe template model imported successfully');

        // Check schema exists
        const schema = PdfmeTemplate.schema;
        console.log(`  ✅ Model has ${Object.keys(schema.paths).length} schema paths`);

        return true;
    } catch (error) {
        console.error('  ❌ Model test failed:', error.message);
        throw error;
    }
}

// Main test runner
async function runTests() {
    console.log('========================================');
    console.log('PDFMe Integration Test');
    console.log('========================================\n');

    try {
        const deps = await testImports();
        await testBasicGeneration(deps);
        await testModel();
        await testPdfmeService();

        console.log('\n========================================');
        console.log('✅ All tests passed!');
        console.log('========================================');
        console.log('\nPDFMe integration is working correctly.');
        console.log('You can now use the following endpoints:');
        console.log('  - GET  /api/pdfme/templates');
        console.log('  - POST /api/pdfme/templates');
        console.log('  - POST /api/pdfme/generate');
        console.log('  - POST /api/pdfme/generate/invoice');
        console.log('  - POST /api/pdfme/generate/contract');
        console.log('  - POST /api/pdfme/generate/receipt');

        process.exit(0);
    } catch (error) {
        console.log('\n========================================');
        console.log('❌ Tests failed!');
        console.log('========================================');
        console.error('Error:', error.message);
        process.exit(1);
    }
}

runTests();
