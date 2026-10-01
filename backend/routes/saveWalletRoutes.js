const express = require('express');

const router = express.Router();

const authMiddleware =
    require('../middleware/authMiddleware');

const {
    getWallet,
    getSettings,
    updateSettings,
    save,
    withdraw,
    getTransactions
} = require('../controllers/saveWalletController');


// ============================================================
// SAVE WALLET
// ============================================================

// Get wallet balance/settings
router.get(
    '/',
    authMiddleware,
    getWallet
);


// Get Spend & Save settings
router.get(
    '/settings',
    authMiddleware,
    getSettings
);


// Enable / disable Spend & Save
router.put(
    '/settings',
    authMiddleware,
    updateSettings
);


// Manually move money from main account to wallet
router.post(
    '/save',
    authMiddleware,
    save
);


// Return money from wallet to main account
router.post(
    '/withdraw',
    authMiddleware,
    withdraw
);


// Wallet transaction history
router.get(
    '/transactions',
    authMiddleware,
    getTransactions
);


module.exports = router;
