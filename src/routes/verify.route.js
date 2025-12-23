/**
 * Saudi Government API Verification Routes
 *
 * Routes for verifying Saudi citizens, companies, and legal professionals
 * using Yakeen, Wathq, and MOJ APIs.
 */

const router = require('express').Router();
const yakeenService = require('../services/yakeenService');
const wathqService = require('../services/wathqService');
const mojService = require('../services/mojService');
const { verifyToken } = require('../middlewares/jwt');
const { sensitiveRateLimiter } = require('../middlewares/rateLimiter.middleware');

// All routes require authentication
router.use(verifyToken);

// Apply rate limiting to all verification routes (sensitive auth operations)
router.use(sensitiveRateLimiter);

// ═══════════════════════════════════════════════════════════════
// YAKEEN API ROUTES (National ID Verification)
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /verify/yakeen:
 *   post:
 *     summary: Verify Saudi National ID via Yakeen API
 *     tags: [Verification]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nationalId
 *               - birthDate
 *             properties:
 *               nationalId:
 *                 type: string
 *                 description: Saudi National ID (10 digits)
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 description: Birth date (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Verification result
 */
router.post('/yakeen', async (req, res) => {
  try {
    const { nationalId, birthDate } = req.body;

    if (!nationalId || !birthDate) {
      return res.status(400).json({
        success: false,
        message: 'National ID and birth date are required',
        messageAr: 'رقم الهوية وتاريخ الميلاد مطلوبان'
      });
    }

    const result = await yakeenService.verifyNationalId(nationalId, birthDate);

    if (result.verified) {
      return res.json({
        success: true,
        message: 'National ID verified successfully',
        messageAr: 'تم التحقق من رقم الهوية بنجاح',
        data: result.data,
        fromCache: result.fromCache || false
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error,
      messageAr: result.errorAr
    });

  } catch (error) {
    console.error('Yakeen verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

/**
 * @swagger
 * /verify/yakeen/address:
 *   post:
 *     summary: Get citizen address via Yakeen API
 *     tags: [Verification]
 */
router.post('/yakeen/address', async (req, res) => {
  try {
    const { nationalId, birthDate } = req.body;

    if (!nationalId || !birthDate) {
      return res.status(400).json({
        success: false,
        message: 'National ID and birth date are required',
        messageAr: 'رقم الهوية وتاريخ الميلاد مطلوبان'
      });
    }

    const result = await yakeenService.getCitizenAddress(nationalId, birthDate);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Address retrieved successfully',
        messageAr: 'تم جلب العنوان بنجاح',
        data: result.data,
        fromCache: result.fromCache || false
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error,
      messageAr: result.errorAr
    });

  } catch (error) {
    console.error('Yakeen address error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve address',
      messageAr: 'فشل جلب العنوان'
    });
  }
});

/**
 * @swagger
 * /verify/yakeen/status:
 *   get:
 *     summary: Check Yakeen API configuration status
 *     tags: [Verification]
 */
router.get('/yakeen/status', (req, res) => {
  const isConfigured = yakeenService.isConfigured();
  const cacheStats = yakeenService.getCacheStats();

  res.json({
    success: true,
    data: {
      service: 'Yakeen',
      serviceAr: 'يقين',
      isConfigured,
      cache: cacheStats
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// WATHQ API ROUTES (Commercial Registry Verification)
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /verify/wathq/{crNumber}:
 *   get:
 *     summary: Verify Commercial Registration via Wathq API
 *     tags: [Verification]
 *     parameters:
 *       - in: path
 *         name: crNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Commercial Registration number (10 digits)
 */
router.get('/wathq/:crNumber', async (req, res) => {
  try {
    const { crNumber } = req.params;

    if (!crNumber) {
      return res.status(400).json({
        success: false,
        message: 'Commercial Registration number is required',
        messageAr: 'رقم السجل التجاري مطلوب'
      });
    }

    const result = await wathqService.getFullInfo(crNumber);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Commercial Registration verified successfully',
        messageAr: 'تم التحقق من السجل التجاري بنجاح',
        data: result.data,
        fromCache: result.fromCache || false
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error,
      messageAr: result.error
    });

  } catch (error) {
    console.error('Wathq verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

/**
 * @swagger
 * /verify/wathq/{crNumber}/basic:
 *   get:
 *     summary: Get basic CR info via Wathq API
 *     tags: [Verification]
 */
router.get('/wathq/:crNumber/basic', async (req, res) => {
  try {
    const { crNumber } = req.params;
    const result = await wathqService.getBasicInfo(crNumber);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data,
        fromCache: result.fromCache || false
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error
    });

  } catch (error) {
    console.error('Wathq basic info error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve info'
    });
  }
});

/**
 * @swagger
 * /verify/wathq/{crNumber}/status:
 *   get:
 *     summary: Get CR status via Wathq API
 *     tags: [Verification]
 */
router.get('/wathq/:crNumber/status', async (req, res) => {
  try {
    const { crNumber } = req.params;
    const result = await wathqService.getStatus(crNumber);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error
    });

  } catch (error) {
    console.error('Wathq status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve status'
    });
  }
});

/**
 * @swagger
 * /verify/wathq/{crNumber}/managers:
 *   get:
 *     summary: Get managers/board of directors via Wathq API
 *     tags: [Verification]
 */
router.get('/wathq/:crNumber/managers', async (req, res) => {
  try {
    const { crNumber } = req.params;
    const result = await wathqService.getManagers(crNumber);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error
    });

  } catch (error) {
    console.error('Wathq managers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve managers'
    });
  }
});

/**
 * @swagger
 * /verify/wathq/{crNumber}/owners:
 *   get:
 *     summary: Get owners/partners via Wathq API
 *     tags: [Verification]
 */
router.get('/wathq/:crNumber/owners', async (req, res) => {
  try {
    const { crNumber } = req.params;
    const result = await wathqService.getOwners(crNumber);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error
    });

  } catch (error) {
    console.error('Wathq owners error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve owners'
    });
  }
});

/**
 * @swagger
 * /verify/wathq/{crNumber}/capital:
 *   get:
 *     summary: Get capital information via Wathq API
 *     tags: [Verification]
 */
router.get('/wathq/:crNumber/capital', async (req, res) => {
  try {
    const { crNumber } = req.params;
    const result = await wathqService.getCapital(crNumber);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error
    });

  } catch (error) {
    console.error('Wathq capital error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve capital info'
    });
  }
});

/**
 * @swagger
 * /verify/wathq/{crNumber}/branches:
 *   get:
 *     summary: Get company branches via Wathq API
 *     tags: [Verification]
 */
router.get('/wathq/:crNumber/branches', async (req, res) => {
  try {
    const { crNumber } = req.params;
    const result = await wathqService.getBranches(crNumber);

    if (result.success) {
      return res.json({
        success: true,
        data: result.data
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error
    });

  } catch (error) {
    console.error('Wathq branches error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve branches'
    });
  }
});

/**
 * @swagger
 * /verify/wathq/status:
 *   get:
 *     summary: Check Wathq API configuration status
 *     tags: [Verification]
 */
router.get('/wathq/config/status', (req, res) => {
  const isConfigured = wathqService.isConfigured();

  res.json({
    success: true,
    data: {
      service: 'Wathq',
      serviceAr: 'واثق',
      isConfigured
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// MOJ API ROUTES (Attorney & POA Verification)
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /verify/moj/attorney/{attorneyId}:
 *   get:
 *     summary: Verify attorney license via MOJ API
 *     tags: [Verification]
 *     parameters:
 *       - in: path
 *         name: attorneyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Attorney's National ID
 */
router.get('/moj/attorney/:attorneyId', async (req, res) => {
  try {
    const { attorneyId } = req.params;

    if (!attorneyId) {
      return res.status(400).json({
        success: false,
        message: 'Attorney ID is required',
        messageAr: 'رقم هوية المحامي مطلوب'
      });
    }

    const result = await mojService.verifyAttorney(attorneyId);

    if (result.verified) {
      return res.json({
        success: true,
        message: 'Attorney verified successfully',
        messageAr: 'تم التحقق من المحامي بنجاح',
        data: result.data,
        fromCache: result.fromCache || false
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error,
      messageAr: result.errorAr
    });

  } catch (error) {
    console.error('MOJ attorney verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

/**
 * @swagger
 * /verify/moj/attorney:
 *   post:
 *     summary: Verify attorney license (POST version)
 *     tags: [Verification]
 */
router.post('/moj/attorney', async (req, res) => {
  try {
    const { attorneyId } = req.body;

    if (!attorneyId) {
      return res.status(400).json({
        success: false,
        message: 'Attorney ID is required',
        messageAr: 'رقم هوية المحامي مطلوب'
      });
    }

    const result = await mojService.verifyAttorney(attorneyId);

    if (result.verified) {
      return res.json({
        success: true,
        message: 'Attorney verified successfully',
        messageAr: 'تم التحقق من المحامي بنجاح',
        data: result.data,
        fromCache: result.fromCache || false
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error,
      messageAr: result.errorAr
    });

  } catch (error) {
    console.error('MOJ attorney verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

/**
 * @swagger
 * /verify/moj/license/{licenseNumber}:
 *   get:
 *     summary: Verify attorney by license number
 *     tags: [Verification]
 */
router.get('/moj/license/:licenseNumber', async (req, res) => {
  try {
    const { licenseNumber } = req.params;

    if (!licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'License number is required',
        messageAr: 'رقم الرخصة مطلوب'
      });
    }

    const result = await mojService.verifyAttorneyByLicense(licenseNumber);

    if (result.verified) {
      return res.json({
        success: true,
        message: 'License verified successfully',
        messageAr: 'تم التحقق من الرخصة بنجاح',
        data: result.data,
        fromCache: result.fromCache || false
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error,
      messageAr: result.errorAr
    });

  } catch (error) {
    console.error('MOJ license verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

/**
 * @swagger
 * /verify/moj/poa/{poaNumber}:
 *   get:
 *     summary: Verify Power of Attorney via MOJ API
 *     tags: [Verification]
 *     parameters:
 *       - in: path
 *         name: poaNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Power of Attorney number
 *       - in: query
 *         name: idNumber
 *         schema:
 *           type: string
 *         description: National ID of principal or attorney (optional)
 */
router.get('/moj/poa/:poaNumber', async (req, res) => {
  try {
    const { poaNumber } = req.params;
    const { idNumber } = req.query;

    if (!poaNumber) {
      return res.status(400).json({
        success: false,
        message: 'Power of Attorney number is required',
        messageAr: 'رقم الوكالة مطلوب'
      });
    }

    const result = await mojService.verifyPowerOfAttorney(poaNumber, idNumber);

    if (result.verified) {
      return res.json({
        success: true,
        message: 'Power of Attorney verified successfully',
        messageAr: 'تم التحقق من الوكالة بنجاح',
        data: result.data,
        fromCache: result.fromCache || false
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error,
      messageAr: result.errorAr
    });

  } catch (error) {
    console.error('MOJ POA verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

/**
 * @swagger
 * /verify/moj/poa:
 *   post:
 *     summary: Verify Power of Attorney (POST version)
 *     tags: [Verification]
 */
router.post('/moj/poa', async (req, res) => {
  try {
    const { poaNumber, idNumber } = req.body;

    if (!poaNumber) {
      return res.status(400).json({
        success: false,
        message: 'Power of Attorney number is required',
        messageAr: 'رقم الوكالة مطلوب'
      });
    }

    const result = await mojService.verifyPowerOfAttorney(poaNumber, idNumber);

    if (result.verified) {
      return res.json({
        success: true,
        message: 'Power of Attorney verified successfully',
        messageAr: 'تم التحقق من الوكالة بنجاح',
        data: result.data,
        fromCache: result.fromCache || false
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error,
      messageAr: result.errorAr
    });

  } catch (error) {
    console.error('MOJ POA verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

/**
 * @swagger
 * /verify/moj/poa/list/{idNumber}:
 *   get:
 *     summary: Get list of Powers of Attorney for a person
 *     tags: [Verification]
 */
router.get('/moj/poa/list/:idNumber', async (req, res) => {
  try {
    const { idNumber } = req.params;
    const { role = 'principal' } = req.query;

    if (!idNumber) {
      return res.status(400).json({
        success: false,
        message: 'National ID is required',
        messageAr: 'رقم الهوية مطلوب'
      });
    }

    const result = await mojService.getPowerOfAttorneyList(idNumber, role);

    if (result.success) {
      return res.json({
        success: true,
        message: 'POA list retrieved successfully',
        messageAr: 'تم جلب قائمة الوكالات بنجاح',
        data: result.data
      });
    }

    return res.status(400).json({
      success: false,
      message: result.error,
      messageAr: result.errorAr
    });

  } catch (error) {
    console.error('MOJ POA list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve POA list',
      messageAr: 'فشل جلب قائمة الوكالات'
    });
  }
});

/**
 * @swagger
 * /verify/moj/status:
 *   get:
 *     summary: Check MOJ API configuration status
 *     tags: [Verification]
 */
router.get('/moj/status', (req, res) => {
  const isConfigured = mojService.isConfigured();
  const cacheStats = mojService.getCacheStats();

  res.json({
    success: true,
    data: {
      service: 'MOJ',
      serviceAr: 'وزارة العدل',
      isConfigured,
      cache: cacheStats
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SERVICE STATUS OVERVIEW
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /verify/status:
 *   get:
 *     summary: Get status of all verification services
 *     tags: [Verification]
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Verification services status',
    messageAr: 'حالة خدمات التحقق',
    data: {
      yakeen: {
        name: 'Yakeen',
        nameAr: 'يقين',
        description: 'National ID Verification',
        descriptionAr: 'التحقق من الهوية الوطنية',
        isConfigured: yakeenService.isConfigured(),
        cache: yakeenService.getCacheStats()
      },
      wathq: {
        name: 'Wathq',
        nameAr: 'واثق',
        description: 'Commercial Registry Verification',
        descriptionAr: 'التحقق من السجل التجاري',
        isConfigured: wathqService.isConfigured()
      },
      moj: {
        name: 'MOJ',
        nameAr: 'وزارة العدل',
        description: 'Attorney & POA Verification',
        descriptionAr: 'التحقق من المحامين والوكالات',
        isConfigured: mojService.isConfigured(),
        cache: mojService.getCacheStats()
      }
    }
  });
});

module.exports = router;
