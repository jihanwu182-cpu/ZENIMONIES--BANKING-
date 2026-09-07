const crypto = require('crypto');

function generateAccountNumber(prefix = '10') {
  const randomPart = crypto.randomInt(100000000, 1000000000);
  return `${prefix}${randomPart}`;
}

module.exports = {
  generateAccountNumber,
};
