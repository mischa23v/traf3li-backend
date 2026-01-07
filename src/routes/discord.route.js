const express = require('express');
const {
    getAuthUrl,
    handleCallback,
    completeSetup,
    getStatus,
    disconnect,
    testConnection,
    listGuilds,
    listChannels,
    updateSettings,
    sendMessage,
    handleWebhook
} = require('../controllers/discord.controller');
const { authenticate } = require('../middlewares');
const { authRateLimiter, publicRateLimiter } = require('../middlewares/rateLimiter.middleware');

const router = express.Router();

router.get('/auth-url', authenticate, authRateLimiter, getAuthUrl);

router.get('/callback', handleCallback);

router.post('/complete-setup', authenticate, authRateLimiter, completeSetup);

router.get('/status', authenticate, publicRateLimiter, getStatus);

router.post('/disconnect', authenticate, authRateLimiter, disconnect);

router.post('/test', authenticate, authRateLimiter, testConnection);

router.get('/guilds', authenticate, publicRateLimiter, listGuilds);

router.get('/guilds/:guildId/channels', authenticate, publicRateLimiter, listChannels);

router.put('/settings', authenticate, authRateLimiter, updateSettings);

router.post('/message', authenticate, authRateLimiter, sendMessage);

router.post('/webhook', publicRateLimiter, handleWebhook);

module.exports = router;
