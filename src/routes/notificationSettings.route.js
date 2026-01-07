const express = require('express');
const router = express.Router();
const NotificationSettings = require('../models/notificationSettings.model');
const asyncHandler = require('../utils/asyncHandler');
const { authenticate } = require('../middlewares');

// Apply authentication to all routes
router.use(authenticate);

router.get('/', asyncHandler(async (req, res) => {
    const settings = await NotificationSettings.getOrCreate(req.userID, req.firmId);

    res.status(200).json({
        success: true,
        data: settings
    });
}));

router.put('/', asyncHandler(async (req, res) => {
    const {
        emailEnabled,
        smsEnabled,
        pushEnabled,
        inAppEnabled,
        emailAddress,
        emailDigest,
        emailDigestTime,
        phoneNumber,
        smsUrgentOnly,
        quietHoursEnabled,
        quietHoursStart,
        quietHoursEnd,
        quietHoursExceptions,
        mutedTypes,
        preferredLanguage,
        soundEnabled,
        soundName,
        badgeEnabled
    } = req.body;

    const settings = await NotificationSettings.findOneAndUpdate(
        { userId: req.userID },
        {
            $set: {
                firmId: req.firmId,
                emailEnabled,
                smsEnabled,
                pushEnabled,
                inAppEnabled,
                emailAddress,
                emailDigest,
                emailDigestTime,
                phoneNumber,
                smsUrgentOnly,
                quietHoursEnabled,
                quietHoursStart,
                quietHoursEnd,
                quietHoursExceptions,
                mutedTypes,
                preferredLanguage,
                soundEnabled,
                soundName,
                badgeEnabled
            }
        },
        { new: true, upsert: true }
    );

    res.status(200).json({
        success: true,
        message: 'Notification settings updated',
        messageAr: 'تم تحديث إعدادات الإشعارات',
        data: settings
    });
}));

router.put('/preferences/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;
    const { email, sms, push, inApp } = req.body;

    const settings = await NotificationSettings.getOrCreate(req.userID, req.firmId);
    await settings.updatePreference(type, { email, sms, push, inApp });

    res.status(200).json({
        success: true,
        message: 'Preference updated',
        messageAr: 'تم تحديث التفضيل',
        data: settings
    });
}));

router.post('/mute/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;

    const settings = await NotificationSettings.getOrCreate(req.userID, req.firmId);
    await settings.muteType(type);

    res.status(200).json({
        success: true,
        message: `${type} notifications muted`,
        messageAr: `تم كتم إشعارات ${type}`,
        data: settings
    });
}));

router.post('/unmute/:type', asyncHandler(async (req, res) => {
    const { type } = req.params;

    const settings = await NotificationSettings.getOrCreate(req.userID, req.firmId);
    await settings.unmuteType(type);

    res.status(200).json({
        success: true,
        message: `${type} notifications unmuted`,
        messageAr: `تم إلغاء كتم إشعارات ${type}`,
        data: settings
    });
}));

router.post('/reset', asyncHandler(async (req, res) => {
    const defaultPrefs = NotificationSettings.getDefaultPreferences();

    const settings = await NotificationSettings.findOneAndUpdate(
        { userId: req.userID },
        {
            $set: {
                emailEnabled: true,
                smsEnabled: false,
                pushEnabled: true,
                inAppEnabled: true,
                emailDigest: 'immediate',
                smsUrgentOnly: true,
                quietHoursEnabled: false,
                mutedTypes: [],
                preferredLanguage: 'both',
                soundEnabled: true,
                badgeEnabled: true,
                preferences: defaultPrefs
            }
        },
        { new: true, upsert: true }
    );

    res.status(200).json({
        success: true,
        message: 'Settings reset to defaults',
        messageAr: 'تمت إعادة الإعدادات إلى الافتراضية',
        data: settings
    });
}));

module.exports = router;
