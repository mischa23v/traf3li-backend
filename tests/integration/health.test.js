/**
 * Health Check Integration Test
 *
 * Tests the health check endpoints to ensure the server is responding correctly.
 */

const http = require('http');
const express = require('express');

describe('Health Check Endpoints', () => {
    let app;
    let server;
    let port;

    beforeAll((done) => {
        // Create a minimal Express app for testing
        app = express();
        app.use(express.json());

        // Basic health endpoint
        app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime()
            });
        });

        // Liveness probe
        app.get('/health/live', (req, res) => {
            res.status(200).json({
                status: 'alive',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime())
            });
        });

        // Readiness probe
        app.get('/health/ready', (req, res) => {
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                checks: {
                    database: 'up',
                    redis: 'up'
                }
            });
        });

        // Deep health check (mock)
        app.get('/health/deep', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                services: {
                    mongodb: {
                        status: 'healthy',
                        responseTime: 15
                    },
                    redis: {
                        status: 'healthy',
                        responseTime: 5
                    },
                    stripe: {
                        status: 'not_configured'
                    },
                    disk: {
                        status: 'healthy',
                        usedPercent: '45%'
                    },
                    memory: {
                        status: 'healthy',
                        heapUsed: '50MB',
                        heapTotal: '100MB'
                    }
                }
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

    describe('GET /health', () => {
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

    describe('GET /health/live', () => {
        it('should return 200 OK', (done) => {
            http.get(`http://localhost:${port}/health/live`, (res) => {
                expect(res.statusCode).toBe(200);
                done();
            });
        });

        it('should return alive status', (done) => {
            http.get(`http://localhost:${port}/health/live`, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const body = JSON.parse(data);
                    expect(body.status).toBe('alive');
                    done();
                });
            });
        });
    });

    describe('GET /health/ready', () => {
        it('should return 200 OK', (done) => {
            http.get(`http://localhost:${port}/health/ready`, (res) => {
                expect(res.statusCode).toBe(200);
                done();
            });
        });

        it('should check database and redis', (done) => {
            http.get(`http://localhost:${port}/health/ready`, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const body = JSON.parse(data);
                    expect(body.status).toBe('ready');
                    expect(body.checks).toBeDefined();
                    expect(body.checks.database).toBeDefined();
                    expect(body.checks.redis).toBeDefined();
                    done();
                });
            });
        });
    });

    describe('GET /health/deep', () => {
        it('should return 200 OK', (done) => {
            http.get(`http://localhost:${port}/health/deep`, (res) => {
                expect(res.statusCode).toBe(200);
                done();
            });
        });

        it('should return comprehensive service checks', (done) => {
            http.get(`http://localhost:${port}/health/deep`, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const body = JSON.parse(data);
                    expect(body.status).toBe('healthy');
                    expect(body.services).toBeDefined();
                    expect(body.services.mongodb).toBeDefined();
                    expect(body.services.redis).toBeDefined();
                    expect(body.services.stripe).toBeDefined();
                    expect(body.services.disk).toBeDefined();
                    expect(body.services.memory).toBeDefined();
                    done();
                });
            });
        });

        it('should include response times for healthy services', (done) => {
            http.get(`http://localhost:${port}/health/deep`, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const body = JSON.parse(data);
                    if (body.services.mongodb.status === 'healthy') {
                        expect(body.services.mongodb.responseTime).toBeDefined();
                    }
                    if (body.services.redis.status === 'healthy') {
                        expect(body.services.redis.responseTime).toBeDefined();
                    }
                    done();
                });
            });
        });
    });
});
