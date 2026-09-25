
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function generateTerminalId() {
  return `ZENPOS-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
}

function generateTerminalSecret() {
  return crypto.randomBytes(32).toString('hex');
}

async function hashTerminalSecret(secret) {
  return bcrypt.hash(secret, 12);
}

async function verifyTerminalSecret(
  secret,
  secretHash
) {
  return bcrypt.compare(secret, secretHash);
}

module.exports = {
  generateTerminalId,
  generateTerminalSecret,
  hashTerminalSecret,
  verifyTerminalSecret,
};
