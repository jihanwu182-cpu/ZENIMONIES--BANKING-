
const express = require('express');

const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');

const {
  getSmsPreferences,
  updateSmsPreferences,
} = require('../controllers/smsPreferencesController');

// All SMS preference requests require authentication.
router.use(authMiddleware);

router.get('/', getSmsPreferences);

router.put('/', updateSmsPreferences);

module.exports = router;
