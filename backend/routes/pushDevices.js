
const express = require('express');

const authMiddleware = require('../middleware/authMiddleware');

const {
  registerPushDevice,
  unregisterPushDevice,
} = require('../controllers/pushDeviceController');

const router = express.Router();

// All push-device operations require an authenticated,
// active customer session.

router.post(
  '/register',
  authMiddleware,
  registerPushDevice
);

router.delete(
  '/',
  authMiddleware,
  unregisterPushDevice
);

module.exports = router;
