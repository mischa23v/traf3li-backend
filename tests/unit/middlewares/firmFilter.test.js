/**
 * Firm Filter Middleware Tests - Enterprise Security Tests
 *
 * Tests for the firmFilter middleware including:
 * 1. Stateless JWT-based tenant verification
 * 2. Database fallback for legacy tokens
 * 3. Solo lawyer handling
 * 4. Firm member permissions
 * 5. Departed user restrictions
 */

const mongoose = require('mongoose');

// Mock the models
jest.mock('../../../src/models', () => ({
    User: {
        findById: jest.fn()
    },
    Firm: {
        findById: jest.fn()
    }
}));

// Mock permissions config
jest.mock('../../../src/config/permissions.config', () => ({
    ROLE_PERMISSIONS: {
        departed: {
            modules: {
                cases: 'view',
                clients: 'none'
            }
        }
    },
    LEVEL_VALUES: { none: 0, view: 1, edit: 2, full: 3 },
    WORK_MODES: { SOLO: 'solo', FIRM: 'firm' },
    getDefaultPermissions: jest.fn((role) => {
        const defaults = {
            owner: { cases: 'full', clients: 'full', invoices: 'full' },
            admin: { cases: 'full', clients: 'full', invoices: 'full' },
            lawyer: { cases: 'edit', clients: 'edit', invoices: 'view' },
            secretary: { cases: 'view', clients: 'view', invoices: 'none' }
        };
        return defaults[role] || {};
    }),
    getSoloLawyerPermissions: jest.fn(() => ({
        cases: 'full',
        clients: 'full',
        invoices: 'full',
        special: { canApproveInvoices: true }
    })),
    isSoloLawyer: jest.fn((user) => user.isSoloLawyer || (!user.firmId && user.role === 'lawyer')),
    resolveUserPermissions: jest.fn(),
    meetsPermissionLevel: jest.fn((userLevel, required) => {
        const levels = { none: 0, view: 1, edit: 2, full: 3 };
        return levels[userLevel] >= levels[required];
    }),
    roleHasPermission: jest.fn(),
    hasSpecialPermission: jest.fn(),
    getDepartedRestrictions: jest.fn(() => ({ canEdit: false, canDelete: false })),
    getRequiredLevelForAction: jest.fn(),
    enforce: jest.fn(() => true),
    enforceSpecial: jest.fn(() => true),
    buildSubject: jest.fn((user, member) => ({
        userId: user._id,
        firmId: user.firmId,
        firmRole: user.firmRole,
        isSoloLawyer: user.isSoloLawyer
    })),
    methodToAction: jest.fn()
}));

const { User, Firm } = require('../../../src/models');
const { firmFilter } = require('../../../src/middlewares/firmFilter.middleware');
const {
    getDefaultPermissions,
    getSoloLawyerPermissions,
    meetsPermissionLevel
} = require('../../../src/config/permissions.config');

describe('Firm Filter Middleware', () => {
    let req, res, next;

    const firmId1 = new mongoose.Types.ObjectId();
    const userId1 = new mongoose.Types.ObjectId();
    const lawyerId1 = new mongoose.Types.ObjectId();

    beforeEach(() => {
        req = {
            userID: userId1.toString(),
            userId: userId1.toString(),
            headers: {},
            cookies: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('Stateless JWT-based Verification', () => {
        it('should use JWT claims when available for firm members', async () => {
            req.jwtClaims = {
                firmId: firmId1.toString(),
                firmRole: 'lawyer',
                firmStatus: 'active',
                isSoloLawyer: false,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.firmId).toBe(firmId1.toString());
            expect(req.firmRole).toBe('lawyer');
            expect(req.firmQuery).toEqual({ firmId: firmId1.toString() });
            // Should not query database
            expect(User.findById).not.toHaveBeenCalled();
        });

        it('should use JWT claims for solo lawyers', async () => {
            req.jwtClaims = {
                firmId: null,
                firmRole: null,
                firmStatus: null,
                isSoloLawyer: true,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.isSoloLawyer).toBe(true);
            expect(req.firmQuery).toEqual({ lawyerId: userId1.toString() });
            expect(User.findById).not.toHaveBeenCalled();
        });

        it('should handle departed users via JWT claims', async () => {
            req.jwtClaims = {
                firmId: firmId1.toString(),
                firmRole: 'departed',
                firmStatus: 'active',
                isSoloLawyer: false,
                isDeparted: true,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.isDeparted).toBe(true);
            expect(req.departedQuery).toBeDefined();
        });

        it('should fall back to database when JWT claims are missing', async () => {
            // No jwtClaims
            req.jwtClaims = undefined;

            const mockUser = {
                _id: userId1,
                firmId: firmId1,
                firmRole: 'lawyer',
                firmStatus: 'active',
                isSoloLawyer: false,
                role: 'lawyer'
            };

            User.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockUser)
                })
            });

            Firm.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({
                        _id: firmId1,
                        members: [{ userId: userId1, permissions: {} }]
                    })
                })
            });

            await firmFilter(req, res, next);

            expect(User.findById).toHaveBeenCalledWith(userId1.toString());
            expect(next).toHaveBeenCalled();
        });

        it('should fall back to database when X-Force-DB-Validation header is set', async () => {
            req.headers['x-force-db-validation'] = 'true';
            req.jwtClaims = {
                firmId: firmId1.toString(),
                firmRole: 'lawyer',
                firmStatus: 'active',
                isSoloLawyer: false,
                role: 'lawyer'
            };

            const mockUser = {
                _id: userId1,
                firmId: firmId1,
                firmRole: 'lawyer',
                firmStatus: 'active',
                isSoloLawyer: false,
                role: 'lawyer'
            };

            User.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockUser)
                })
            });

            Firm.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({
                        _id: firmId1,
                        members: [{ userId: userId1, permissions: {} }]
                    })
                })
            });

            await firmFilter(req, res, next);

            expect(User.findById).toHaveBeenCalled();
        });
    });

    describe('Permission Helpers', () => {
        it('should provide hasPermission helper for firm members', async () => {
            req.jwtClaims = {
                firmId: firmId1.toString(),
                firmRole: 'owner',
                firmStatus: 'active',
                isSoloLawyer: false,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            expect(req.hasPermission).toBeDefined();
            expect(req.hasPermission('cases', 'full')).toBe(true);
        });

        it('should provide hasSpecialPermission helper', async () => {
            req.jwtClaims = {
                firmId: firmId1.toString(),
                firmRole: 'admin',
                firmStatus: 'active',
                isSoloLawyer: false,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            expect(req.hasSpecialPermission).toBeDefined();
            expect(req.hasSpecialPermission('canApproveInvoices')).toBe(true);
        });

        it('should restrict departed users from special permissions', async () => {
            req.jwtClaims = {
                firmId: firmId1.toString(),
                firmRole: 'departed',
                firmStatus: 'active',
                isSoloLawyer: false,
                isDeparted: true,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            expect(req.hasSpecialPermission('canApproveInvoices')).toBe(false);
        });

        it('should provide addFirmId helper for firm members', async () => {
            req.jwtClaims = {
                firmId: firmId1.toString(),
                firmRole: 'lawyer',
                firmStatus: 'active',
                isSoloLawyer: false,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            const data = { name: 'test' };
            req.addFirmId(data);
            expect(data.firmId).toBe(firmId1.toString());
        });

        it('should provide addFirmId helper that adds lawyerId for solo lawyers', async () => {
            req.jwtClaims = {
                firmId: null,
                firmRole: null,
                firmStatus: null,
                isSoloLawyer: true,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            const data = { name: 'test' };
            req.addFirmId(data);
            expect(data.lawyerId).toBe(userId1.toString());
        });
    });

    describe('Error Handling', () => {
        it('should return 401 when user is not authenticated', async () => {
            req.userID = null;

            await firmFilter(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'User not authenticated'
                })
            );
            expect(next).not.toHaveBeenCalled();
        });

        it('should return 404 when user not found in database', async () => {
            req.jwtClaims = undefined;

            User.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null)
                })
            });

            await firmFilter(req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    message: 'User not found'
                })
            );
        });
    });

    describe('Lazy Firm Loading', () => {
        it('should provide getFirm helper that lazily loads firm data', async () => {
            const mockFirm = {
                _id: firmId1,
                name: 'Test Firm'
            };

            Firm.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockFirm)
            });

            req.jwtClaims = {
                firmId: firmId1.toString(),
                firmRole: 'lawyer',
                firmStatus: 'active',
                isSoloLawyer: false,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            // First call should query database
            const firm1 = await req.getFirm();
            expect(firm1).toEqual(mockFirm);
            expect(Firm.findById).toHaveBeenCalledTimes(1);

            // Second call should use cache
            const firm2 = await req.getFirm();
            expect(firm2).toEqual(mockFirm);
            expect(Firm.findById).toHaveBeenCalledTimes(1); // Still only 1 call
        });

        it('should return null for getFirm when solo lawyer', async () => {
            req.jwtClaims = {
                firmId: null,
                firmRole: null,
                firmStatus: null,
                isSoloLawyer: true,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            const firm = await req.getFirm();
            expect(firm).toBeNull();
            expect(Firm.findById).not.toHaveBeenCalled();
        });
    });

    describe('Subject Building for Casbin-style Enforcement', () => {
        it('should build subject for firm members', async () => {
            req.jwtClaims = {
                firmId: firmId1.toString(),
                firmRole: 'lawyer',
                firmStatus: 'active',
                isSoloLawyer: false,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            expect(req.subject).toBeDefined();
            expect(req.enforce).toBeDefined();
        });

        it('should build subject for solo lawyers', async () => {
            req.jwtClaims = {
                firmId: null,
                firmRole: null,
                firmStatus: null,
                isSoloLawyer: true,
                role: 'lawyer'
            };

            await firmFilter(req, res, next);

            expect(req.subject).toBeDefined();
            expect(req.enforce).toBeDefined();
        });
    });
});
