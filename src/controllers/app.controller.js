const { App, UserApp } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const CustomException = require('../utils/CustomException');

/**
 * Get all apps with user connection status
 * GET /api/apps
 */
const getApps = asyncHandler(async (req, res) => {
    const userId = req.userID;
    const { category, search, connected } = req.query;

    // Build query for apps
    const appQuery = { isActive: true };

    if (category && category !== 'all') {
        appQuery.category = category;
    }

    if (search) {
        appQuery.$or = [
            { name: { $regex: search, $options: 'i' } },
            { desc: { $regex: search, $options: 'i' } }
        ];
    }

    // Get all active apps
    const apps = await App.find(appQuery).sort({ sortOrder: 1, name: 1 });

    // Get user's connected apps
    const userApps = await UserApp.find({ userId });

    // Map apps with connection status
    let appsWithStatus = apps.map(app => {
        const userApp = userApps.find(ua => ua.appId.toString() === app._id.toString());
        return {
            id: app._id,
            _id: app._id,
            name: app.name,
            iconName: app.iconName,
            desc: app.desc,
            descAr: app.descAr,
            category: app.category,
            connected: userApp?.connected || false,
            connectedAt: userApp?.connectedAt,
            lastSyncAt: userApp?.lastSyncAt,
            syncStatus: userApp?.syncStatus
        };
    });

    // Filter by connection status if requested
    if (connected === 'true') {
        appsWithStatus = appsWithStatus.filter(app => app.connected);
    } else if (connected === 'false') {
        appsWithStatus = appsWithStatus.filter(app => !app.connected);
    }

    res.status(200).json({
        success: true,
        data: appsWithStatus,
        total: appsWithStatus.length
    });
});

/**
 * Get single app details
 * GET /api/apps/:appId
 */
const getApp = asyncHandler(async (req, res) => {
    const { appId } = req.params;
    const userId = req.userID;

    const app = await App.findById(appId);

    if (!app) {
        throw new CustomException('App not found', 404);
    }

    const userApp = await UserApp.findOne({ userId, appId });

    res.status(200).json({
        success: true,
        data: {
            id: app._id,
            _id: app._id,
            name: app.name,
            iconName: app.iconName,
            desc: app.desc,
            descAr: app.descAr,
            category: app.category,
            connected: userApp?.connected || false,
            connectedAt: userApp?.connectedAt,
            lastSyncAt: userApp?.lastSyncAt,
            syncStatus: userApp?.syncStatus,
            settings: userApp?.settings
        }
    });
});

/**
 * Connect an app
 * POST /api/apps/:appId/connect
 */
const connectApp = asyncHandler(async (req, res) => {
    const { appId } = req.params;
    const userId = req.userID;
    const { credentials, settings } = req.body;

    const app = await App.findById(appId);

    if (!app) {
        throw new CustomException('App not found', 404);
    }

    // Find or create user app connection
    let userApp = await UserApp.findOne({ userId, appId });

    if (!userApp) {
        userApp = new UserApp({ userId, appId });
    }

    userApp.connected = true;
    userApp.connectedAt = new Date();

    if (credentials) {
        userApp.credentials = {
            ...userApp.credentials,
            ...credentials
        };
    }

    if (settings) {
        userApp.settings = {
            ...userApp.settings,
            ...settings
        };
    }

    await userApp.save();

    res.status(200).json({
        success: true,
        message: `${app.name} connected successfully`,
        data: {
            id: app._id,
            _id: app._id,
            name: app.name,
            iconName: app.iconName,
            desc: app.desc,
            category: app.category,
            connected: true,
            connectedAt: userApp.connectedAt
        }
    });
});

/**
 * Disconnect an app
 * POST /api/apps/:appId/disconnect
 */
const disconnectApp = asyncHandler(async (req, res) => {
    const { appId } = req.params;
    const userId = req.userID;

    const app = await App.findById(appId);

    if (!app) {
        throw new CustomException('App not found', 404);
    }

    const userApp = await UserApp.findOneAndUpdate(
        { userId, appId },
        {
            connected: false,
            credentials: null,
            syncStatus: 'idle'
        },
        { new: true }
    );

    res.status(200).json({
        success: true,
        message: `${app.name} disconnected successfully`,
        data: {
            id: app._id,
            _id: app._id,
            name: app.name,
            iconName: app.iconName,
            desc: app.desc,
            category: app.category,
            connected: false
        }
    });
});

/**
 * Update app settings
 * PUT /api/apps/:appId/settings
 */
const updateAppSettings = asyncHandler(async (req, res) => {
    const { appId } = req.params;
    const userId = req.userID;
    const { settings } = req.body;

    const app = await App.findById(appId);

    if (!app) {
        throw new CustomException('App not found', 404);
    }

    const userApp = await UserApp.findOneAndUpdate(
        { userId, appId },
        { settings },
        { new: true, upsert: true }
    );

    res.status(200).json({
        success: true,
        message: 'App settings updated',
        data: {
            id: app._id,
            name: app.name,
            settings: userApp.settings
        }
    });
});

/**
 * Get connected apps count
 * GET /api/apps/stats
 */
const getAppsStats = asyncHandler(async (req, res) => {
    const userId = req.userID;

    const totalApps = await App.countDocuments({ isActive: true });
    const connectedApps = await UserApp.countDocuments({ userId, connected: true });

    // Count by category
    const categoryStats = await UserApp.aggregate([
        { $match: { userId: userId, connected: true } },
        {
            $lookup: {
                from: 'apps',
                localField: 'appId',
                foreignField: '_id',
                as: 'app'
            }
        },
        { $unwind: '$app' },
        {
            $group: {
                _id: '$app.category',
                count: { $sum: 1 }
            }
        }
    ]);

    res.status(200).json({
        success: true,
        data: {
            total: totalApps,
            connected: connectedApps,
            disconnected: totalApps - connectedApps,
            byCategory: categoryStats.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {})
        }
    });
});

/**
 * Sync app data (trigger manual sync)
 * POST /api/apps/:appId/sync
 */
const syncApp = asyncHandler(async (req, res) => {
    const { appId } = req.params;
    const userId = req.userID;

    const userApp = await UserApp.findOne({ userId, appId, connected: true });

    if (!userApp) {
        throw new CustomException('App not connected', 400);
    }

    // Update sync status
    userApp.syncStatus = 'syncing';
    await userApp.save();

    // TODO: Implement actual sync logic per app type
    // For now, simulate a successful sync
    setTimeout(async () => {
        userApp.syncStatus = 'success';
        userApp.lastSyncAt = new Date();
        await userApp.save();
    }, 1000);

    res.status(200).json({
        success: true,
        message: 'Sync initiated',
        data: {
            syncStatus: 'syncing'
        }
    });
});

module.exports = {
    getApps,
    getApp,
    connectApp,
    disconnectApp,
    updateAppSettings,
    getAppsStats,
    syncApp
};
