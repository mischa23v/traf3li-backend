/**
 * Swagger/OpenAPI 3.0 Configuration
 *
 * Comprehensive API documentation configuration for the Traf3li Legal Management System.
 * This file defines the OpenAPI specification, including servers, security schemes,
 * common response schemas, and tag definitions for all API modules.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Traf3li Legal Management System API',
            version: '1.0.0',
            description: `
# Traf3li API Documentation

A comprehensive legal practice management system API designed for law firms and legal professionals.

## Features

- **Case Management**: Complete case lifecycle management with documents, hearings, and timeline tracking
- **Client Management**: CRM for client relationships, billing, and communication
- **Financial Management**: Invoicing, payments, expenses, and accounting
- **Time Tracking**: Billable hours tracking and timesheet management
- **CRM**: Lead management, pipelines, and client acquisition
- **HR Management**: Employee management, payroll, performance reviews
- **Document Management**: Secure document storage with versioning
- **Reporting**: Comprehensive analytics and financial reports

## Authentication

All API endpoints require authentication using JWT tokens. Include the token in the Authorization header:

\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

Alternatively, for certain operations, you can use an API key:

\`\`\`
X-API-Key: <your_api_key>
\`\`\`

## Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Standard endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Payment endpoints**: 20 requests per 15 minutes per IP
- **Sensitive operations**: 10 requests per 15 minutes per IP

Rate limit information is included in response headers:
- \`X-RateLimit-Limit\`: Maximum requests allowed
- \`X-RateLimit-Remaining\`: Remaining requests in current window
- \`X-RateLimit-Reset\`: Time when the rate limit resets (Unix timestamp)

## Error Responses

All error responses follow a consistent format:

\`\`\`json
{
  "error": true,
  "message": "Error description",
  "requestId": "unique-request-id",
  "details": {} // Optional, only in development
}
\`\`\`

### HTTP Status Codes

- \`200 OK\`: Request succeeded
- \`201 Created\`: Resource created successfully
- \`400 Bad Request\`: Invalid request parameters
- \`401 Unauthorized\`: Missing or invalid authentication
- \`403 Forbidden\`: Insufficient permissions
- \`404 Not Found\`: Resource not found
- \`409 Conflict\`: Resource conflict (e.g., duplicate)
- \`422 Unprocessable Entity\`: Validation error
- \`429 Too Many Requests\`: Rate limit exceeded
- \`500 Internal Server Error\`: Server error

## Pagination

List endpoints support pagination using query parameters:

- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 10, max: 100)
- \`sort\`: Sort field (prefix with \`-\` for descending)

Response format:

\`\`\`json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
\`\`\`

## Filtering

Most list endpoints support filtering using query parameters matching the resource fields.

Example: \`GET /api/cases?status=active&priority=high\`

## CSRF Protection

State-changing operations (POST, PUT, PATCH, DELETE) require CSRF token validation.
The CSRF token is automatically provided in cookies and should be included in the \`X-CSRF-Token\` header.
            `,
            contact: {
                name: 'Traf3li Support',
                email: 'support@traf3li.com',
                url: 'https://traf3li.com/support'
            },
            license: {
                name: 'Proprietary',
                url: 'https://traf3li.com/terms'
            }
        },
        servers: [
            {
                url: 'https://api.traf3li.com',
                description: 'Production server'
            },
            {
                url: 'https://staging-api.traf3li.com',
                description: 'Staging server'
            },
            {
                url: 'http://localhost:8080',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT token obtained from login or registration'
                },
                apiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                    description: 'API key for service-to-service authentication'
                },
                csrfToken: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-CSRF-Token',
                    description: 'CSRF token for state-changing operations'
                }
            },
            responses: {
                Success: {
                    description: 'Successful operation',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Operation completed successfully'
                                    },
                                    data: {
                                        type: 'object',
                                        description: 'Response data'
                                    }
                                }
                            }
                        }
                    }
                },
                Created: {
                    description: 'Resource created successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    success: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Resource created successfully'
                                    },
                                    data: {
                                        type: 'object',
                                        description: 'Created resource data'
                                    }
                                }
                            }
                        }
                    }
                },
                BadRequest: {
                    description: 'Bad request - Invalid parameters',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Invalid request parameters'
                                    },
                                    requestId: {
                                        type: 'string',
                                        example: 'req_123456789'
                                    },
                                    details: {
                                        type: 'object',
                                        description: 'Validation error details'
                                    }
                                }
                            }
                        }
                    }
                },
                Unauthorized: {
                    description: 'Unauthorized - Missing or invalid authentication',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Authentication required'
                                    },
                                    requestId: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                Forbidden: {
                    description: 'Forbidden - Insufficient permissions',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Insufficient permissions'
                                    },
                                    requestId: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                NotFound: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Resource not found'
                                    },
                                    requestId: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                Conflict: {
                    description: 'Conflict - Resource already exists',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Resource already exists'
                                    },
                                    requestId: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Validation error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Validation failed'
                                    },
                                    requestId: {
                                        type: 'string'
                                    },
                                    details: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                field: {
                                                    type: 'string',
                                                    example: 'email'
                                                },
                                                message: {
                                                    type: 'string',
                                                    example: 'Invalid email format'
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                TooManyRequests: {
                    description: 'Too many requests - Rate limit exceeded',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Rate limit exceeded'
                                    },
                                    requestId: {
                                        type: 'string'
                                    },
                                    retryAfter: {
                                        type: 'number',
                                        example: 900,
                                        description: 'Seconds until rate limit resets'
                                    }
                                }
                            }
                        }
                    }
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'boolean',
                                        example: true
                                    },
                                    message: {
                                        type: 'string',
                                        example: 'Internal server error'
                                    },
                                    requestId: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            parameters: {
                pageParam: {
                    in: 'query',
                    name: 'page',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        default: 1
                    },
                    description: 'Page number for pagination'
                },
                limitParam: {
                    in: 'query',
                    name: 'limit',
                    schema: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 10
                    },
                    description: 'Number of items per page'
                },
                sortParam: {
                    in: 'query',
                    name: 'sort',
                    schema: {
                        type: 'string',
                        example: '-createdAt'
                    },
                    description: 'Sort field (prefix with - for descending order)'
                },
                searchParam: {
                    in: 'query',
                    name: 'search',
                    schema: {
                        type: 'string'
                    },
                    description: 'Search query'
                },
                idParam: {
                    in: 'path',
                    name: 'id',
                    required: true,
                    schema: {
                        type: 'string',
                        pattern: '^[0-9a-fA-F]{24}$'
                    },
                    description: 'MongoDB ObjectId'
                }
            }
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization endpoints'
            },
            {
                name: 'Clients',
                description: 'Client management and CRM operations'
            },
            {
                name: 'Cases',
                description: 'Legal case management including documents, hearings, and timeline'
            },
            {
                name: 'Invoices',
                description: 'Invoice creation, management, and payment processing'
            },
            {
                name: 'Payments',
                description: 'Payment processing, reconciliation, and receipts'
            },
            {
                name: 'Leads',
                description: 'CRM lead management and conversion'
            },
            {
                name: 'Tasks',
                description: 'Task management and assignment'
            },
            {
                name: 'Time Tracking',
                description: 'Billable hours and timesheet management'
            },
            {
                name: 'Expenses',
                description: 'Expense tracking and reimbursement'
            },
            {
                name: 'Documents',
                description: 'Document management with S3 storage'
            },
            {
                name: 'Calendar',
                description: 'Event and calendar management'
            },
            {
                name: 'Reports',
                description: 'Financial and operational reporting'
            },
            {
                name: 'Users',
                description: 'User management and profiles'
            },
            {
                name: 'Organizations',
                description: 'Organization and firm management'
            },
            {
                name: 'HR',
                description: 'Human resources management'
            },
            {
                name: 'Accounting',
                description: 'General ledger, accounts, and financial management'
            },
            {
                name: 'Banking',
                description: 'Bank accounts, transactions, and reconciliation'
            }
        ],
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: [
        './src/routes/*.js',
        './src/docs/schemas/*.js'
    ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
