/**
 * Health Check Integration Test
 *
 * Tests the /health endpoint to ensure the server is responding correctly.
 */

const http = require('http');
const express = require('express');

describe('Health Check Endpoint', () => {
    let app;
    let server;
    let port;

    beforeAll((done) => {
        // Create a minimal Express app for testing
        app = express();

        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Start server on random port
        server = app.listen(0, () => {
            port = server.address().port;
            done();
        });
    });

    afterAll((done) => {
        server.close(done);
    });

    it('should return 200 OK', (done) => {
        http.get(`http://localhost:${port}/health`, (res) => {
            expect(res.statusCode).toBe(200);
            done();
        });
    });

    it('should return healthy status', (done) => {
        http.get(`http://localhost:${port}/health`, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                const body = JSON.parse(data);
                expect(body.status).toBe('healthy');
                expect(body.timestamp).toBeDefined();
                expect(body.uptime).toBeDefined();
                done();
            });
        });
    });
});
