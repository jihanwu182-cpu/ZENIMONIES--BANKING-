const express = require('express');

const router = express.Router();

const authMiddleware =
  require('../middleware/authMiddleware');

const transactionPinMiddleware =
  require('../middleware/transactionPinMiddleware');

const {
  getPlans,
  getMotorOptions,
  getMotorLgas,
  getMotorModels,
  purchase,
  requery,
} = require('../controllers/insuranceController');

// ============================================================
// INSURANCE ROUTES
// ============================================================

// Get available insurance plans
router.get(
  '/plans',
  authMiddleware,
  getPlans
);

// Get motor insurance options
router.get(
  '/motor/options',
  authMiddleware,
  getMotorOptions
);

// Get LGAs for a state
router.get(
  '/motor/lga/:stateCode',
  authMiddleware,
  getMotorLgas
);

// Get vehicle models for a vehicle make
router.get(
  '/motor/models/:vehicleMakeCode',
  authMiddleware,
  getMotorModels
);

// Purchase insurance
// Transaction PIN is required
router.post(
  '/',
  authMiddleware,
  transactionPinMiddleware,
  purchase
);

// Requery pending insurance transaction
router.post(
  '/requery',
  authMiddleware,
  requery
);

module.exports = router;
