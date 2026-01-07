/**
 * Verification Routes
 *
 * Saudi Government API verification endpoints:
 * - Yakeen: National ID Verification
 * - Wathq: Commercial Registry Verification
 * - MOJ: Attorney & POA Verification
 *
 * SECURITY: These endpoints access sensitive government APIs
 */

const express = require('express');
const logger = require('../utils/logger');
const yakeenService = require('../services/yakeenService');
const wathqService = require('../services/wathqService');
const mojService = require('../services/mojService');

const router = express.Router();

// ═══════════════════════════════════════════════════════════════
// YAKEEN API ROUTES (National ID Verification)
// ═══════════════════════════════════════════════════════════════

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
    logger.error('Yakeen verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

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
    logger.error('Yakeen address error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve address',
      messageAr: 'فشل جلب العنوان'
    });
  }
});

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
    logger.error('Wathq verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

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
    logger.error('Wathq basic info error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve info'
    });
  }
});

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
    logger.error('Wathq status error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve status'
    });
  }
});

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
    logger.error('Wathq managers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve managers'
    });
  }
});

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
    logger.error('Wathq owners error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve owners'
    });
  }
});

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
    logger.error('Wathq capital error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve capital info'
    });
  }
});

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
    logger.error('Wathq branches error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve branches'
    });
  }
});

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
    logger.error('MOJ attorney verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

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
    logger.error('MOJ attorney verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

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
    logger.error('MOJ license verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

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
    logger.error('MOJ POA verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

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
    logger.error('MOJ POA verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Verification failed',
      messageAr: 'فشل التحقق'
    });
  }
});

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
    logger.error('MOJ POA list error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve POA list',
      messageAr: 'فشل جلب قائمة الوكالات'
    });
  }
});

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
