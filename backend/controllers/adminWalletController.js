'use strict';

// ============================================================
// ZENIMONIES BANKING
// ADMIN WALLET CONTROLLER
//
// Read-only wallet endpoints.
// Deposits and withdrawals remain disabled.
// ============================================================

const adminWalletService = require('../services/adminWalletService');

function getAuthenticatedAdminId(req) {
  return (
    req.admin?.id ||
    req.user?.id ||
    null
  );
}

// ------------------------------------------------------------
// GET /api/admin/wallet/summary
// ------------------------------------------------------------

async function getWalletSummary(req, res) {
  try {
    const adminId = getAuthenticatedAdminId(req);

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Administrator authentication is required.',
      });
    }

    const summary = await adminWalletService.getWalletSummary();

    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error(
      'Admin wallet summary error:',
      error.message
    );

    return res.status(503).json({
      success: false,
      message: 'Admin Wallet is not available yet.',
    });
  }
}

// ------------------------------------------------------------
// GET /api/admin/wallet/history
// ------------------------------------------------------------

async function getWalletHistory(req, res) {
  try {
    const adminId = getAuthenticatedAdminId(req);

    if (!adminId) {
      return res.status(401).json({
        success: false,
        message: 'Administrator authentication is required.',
      });
    }

    const history = await adminWalletService.getWalletHistory({
      limit: req.query.limit,
      offset: req.query.offset,
    });

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error(
      'Admin wallet history error:',
      error.message
    );

    return res.status(503).json({
      success: false,
      message: 'Admin Wallet history is not available yet.',
    });
  }
}

module.exports = {
  getWalletSummary,
  getWalletHistory,
};
