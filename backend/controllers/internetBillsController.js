
const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// INTERNET BILLS CONTROLLER
// ============================================================
//
// Temporary safe controller.
//
// Actual Internet provider integration has not been connected.
// No wallet debit, transaction creation, or provider purchase
// is performed by this temporary controller.
//
// Replace these handlers when the provider integration
// and supported service catalogue have been confirmed.
// ============================================================


// ============================================================
// INTERNET PROVIDERS
// ============================================================

const INTERNET_PROVIDERS = [
  {
    id: 'smile',
    name: 'Smile',
    status: 'unavailable',
  },
  {
    id: 'spectranet',
    name: 'Spectranet',
    status: 'unavailable',
  },
];


// ============================================================
// GET INTERNET PROVIDERS
// GET /api/internet-bills/providers
// ============================================================

const getInternetProviders = async (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      'Internet provider integration is being configured.',
    providers: INTERNET_PROVIDERS,
  });
};


// ============================================================
// GET INTERNET PLANS
// GET /api/internet-bills/plans/:provider
// ============================================================

const getInternetPlans = async (req, res) => {
  return res.status(503).json({
    success: false,
    message:
      'Internet subscription plans are not available yet. Please try again later.',
  });
};


// ============================================================
// VERIFY INTERNET ACCOUNT
// POST /api/internet-bills/verify
// ============================================================

const verifyInternetAccount = async (req, res) => {
  return res.status(503).json({
    success: false,
    message:
      'Internet account verification is not available yet.',
  });
};


// ============================================================
// PURCHASE INTERNET SUBSCRIPTION
// POST /api/internet-bills/pay
// ============================================================

const purchaseInternet = async (req, res) => {
  return res.status(503).json({
    success: false,
    message:
      'Internet payments are temporarily unavailable. Your wallet has not been debited.',
  });
};


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getInternetProviders,
  getInternetPlans,
  verifyInternetAccount,
  purchaseInternet,
};
