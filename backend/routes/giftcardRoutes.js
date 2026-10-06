// ============================================================
// ZENIMONIES BANKING
// GIFT CARD ROUTES
// ============================================================

const express = require('express');

const router = express.Router();

const {
  getBuyConfig,
  calculateBuyPayment,
} = require('../services/giftcard/prestmitService');

// ============================================================
// GET GIFT CARD BUY CONFIGURATION
// ============================================================

router.get('/buy/config', async (req, res) => {
  try {
    const data = await getBuyConfig();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      'Gift card buy configuration error:',
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        'Unable to retrieve gift card configuration.',
    });
  }
});

// ============================================================
// CALCULATE BUY PRICE
// ============================================================

router.post('/buy/calculate', async (req, res) => {
  try {
    const payload = req.body || {};

    if (!Object.keys(payload).length) {
      return res.status(400).json({
        success: false,
        message: 'Gift card purchase details are required.',
      });
    }

    const data = await calculateBuyPayment(payload);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      'Gift card buy calculation error:',
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        'Unable to calculate gift card price.',
    });
  }
});

// ============================================================
// SERVICE STATUS
// ============================================================

router.get('/status', (req, res) => {
  return res.status(200).json({
    success: true,
    service: 'gift-cards',
    provider: 'prestmit',
    environment:
      process.env.PRESTMIT_API_URL ||
      'sandbox',
  });
});

module.exports = router;
