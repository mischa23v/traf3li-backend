/**
 * Territory Routes - Territory Management API
 *
 * All routes require authentication and firm filtering.
 * Handles hierarchical territory structure for sales and service management.
 */

const express = require('express');
const router = express.Router();
const territoryController = require('../controllers/territory.controller');
const { userMiddleware } = require('../middlewares');

// Apply authentication to all routes
router.use(userMiddleware);

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
// BASIC CRUD ROUTES
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

// POST /api/territories - Create new territory
router.post('/', territoryController.createTerritory);

// GET /api/territories - List all territories with filters
router.get('/', territoryController.getTerritories);

// GET /api/territories/:id - Get specific territory
router.get('/:id', territoryController.getTerritoryById);

// PUT /api/territories/:id - Update territory
router.put('/:id', territoryController.updateTerritory);

// DELETE /api/territories/:id - Delete territory
router.delete('/:id', territoryController.deleteTerritory);

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
// HIERARCHY ROUTES
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

// GET /api/territories/:id/tree - Get full hierarchy tree
router.get('/:id/tree', territoryController.getTree);

// GET /api/territories/:id/children - Get direct children
router.get('/:id/children', territoryController.getChildren);

// PUT /api/territories/:id/move - Move territory to new parent
router.put('/:id/move', territoryController.moveTerritory);

// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
// STATISTICS ROUTES
// PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP

// GET /api/territories/:id/stats - Get territory statistics
router.get('/:id/stats', territoryController.getTerritoryStats);

module.exports = router;
