// ============================================================
// ZENIMONIES BANKING
// SUPPORT TICKET NUMBER GENERATOR
// ============================================================

function generateTicketNumber() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    now.getDate()
  ).padStart(2, '0');

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `ZEN-SUP-${year}${month}${day}-${random}`;
}

module.exports = {
  generateTicketNumber,
};
