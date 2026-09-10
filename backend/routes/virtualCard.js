const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const pool = require('../config/database');

const router = express.Router();

const CARD_FEE = 1000;


// ============================================================
// AUTHENTICATION HELPER
// ============================================================

const authenticateUser = async (req) => {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith('Bearer ')
  ) {
    const error = new Error(
      'Authentication token is required'
    );

    error.status = 401;

    throw error;
  }

  const token = authHeader.substring(7);

  if (!process.env.JWT_SECRET) {
    const error = new Error(
      'Authentication service is not configured'
    );

    error.status = 500;

    throw error;
  }

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );
  } catch (error) {
    const authError = new Error(
      'Invalid or expired authentication token'
    );

    authError.status = 401;

    throw authError;
  }

  if (!decoded || !decoded.userId) {
    const error = new Error(
      'Invalid authentication token'
    );

    error.status = 401;

    throw error;
  }

  return decoded.userId;
};


// ============================================================
// CARD NUMBER GENERATOR
// ============================================================

const generateCardNumber = () => {
  const part1 = String(
    crypto.randomInt(1000, 10000)
  );

  const part2 = String(
    crypto.randomInt(1000, 10000)
  );

  const part3 = String(
    crypto.randomInt(1000, 10000)
  );

  const part4 = String(
    crypto.randomInt(1000, 10000)
  );

  return `${part1} ${part2} ${part3} ${part4}`;
};


// ============================================================
// CVV GENERATOR
// ============================================================

const generateCvv = () => {
  return String(
    crypto.randomInt(100, 1000)
  );
};


// ============================================================
// PIN HASH
// ============================================================

const hashSecret = (value) => {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
};


// ============================================================
// GET VIRTUAL CARD
//
// GET /api/virtual-card
//
// Returns:
// - existing card if user already has one
// - has_card: false if user has not created one
// ============================================================

router.get('/', async (req, res) => {
  try {
    const userId = await authenticateUser(req);

    const result = await pool.query(
      `
      SELECT
        id,
        card_number,
        card_number_last4,
        expiry_month,
        expiry_year,
        status,
        card_fee,
        created_at
      FROM virtual_cards
      WHERE user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        has_card: false,
        card: null,
      });
    }

    const card = result.rows[0];

    return res.status(200).json({
      success: true,
      has_card: true,
      card,
    });

  } catch (error) {
    console.error(
      'Get virtual card error:',
      error
    );

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.status
          ? error.message
          : 'Unable to load virtual card',
    });
  }
});


// ============================================================
// CREATE VIRTUAL CARD
//
// POST /api/virtual-card
//
// Body:
//
// {
//   "pin": "1234"
// }
//
// IMPORTANT:
// - One card per user
// - ₦1,000 fee
// - Transaction and card creation happen together
// ============================================================

router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = await authenticateUser(req);

    const pin = String(
      req.body?.pin || ''
    ).trim();


    // ========================================================
    // VALIDATE PIN
    // ========================================================

    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        message:
          'Card PIN must contain exactly 4 digits',
      });
    }


    await client.query('BEGIN');


    // ========================================================
    // CHECK WHETHER CARD ALREADY EXISTS
    // ========================================================

    const existingCard = await client.query(
      `
      SELECT
        id,
        card_number,
        card_number_last4,
        expiry_month,
        expiry_year,
        status,
        card_fee,
        created_at
      FROM virtual_cards
      WHERE user_id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );


    if (existingCard.rows.length > 0) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'You already have a virtual card',
        has_card: true,
        card: existingCard.rows[0],
      });
    }


    // ========================================================
    // GET USER ACCOUNT
    // ========================================================

    const accountResult = await client.query(
      `
      SELECT
        id,
        balance,
        currency,
        status
      FROM accounts
      WHERE user_id = $1
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE
      `,
      [userId]
    );


    if (accountResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'No active account was found',
      });
    }

    const account = accountResult.rows[0];


    // ========================================================
    // CHECK ACCOUNT STATUS
    // ========================================================

    if (account.status !== 'active') {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Your account is not active',
      });
    }


    // ========================================================
    // CHECK BALANCE
    // ========================================================

    const balance = Number(account.balance);

    if (!Number.isFinite(balance)) {
      await client.query('ROLLBACK');

      return res.status(500).json({
        success: false,
        message:
          'Unable to verify account balance',
      });
    }


    if (balance < CARD_FEE) {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Insufficient balance. You need at least ₦1,000 to create a virtual card.',
        required_amount: CARD_FEE,
        available_balance: balance,
      });
    }


    // ========================================================
    // GENERATE CARD
    // ========================================================

    const cardNumber =
      generateCardNumber();

    const cardNumberLast4 =
      cardNumber.slice(-4);

    const cvv =
      generateCvv();

    const pinHash =
      hashSecret(pin);

    const cvvHash =
      hashSecret(cvv);


    // ========================================================
    // EXPIRY
    // ========================================================

    const now = new Date();

    const expiryMonth =
      String(
        now.getMonth() + 1
      ).padStart(2, '0');

    const expiryYear =
      String(
        now.getFullYear() + 3
      ).slice(-2);


    // ========================================================
    // DEBIT ACCOUNT
    // ========================================================

    const balanceBefore =
      Number(account.balance);

    const balanceAfter =
      balanceBefore - CARD_FEE;


    await client.query(
      `
      UPDATE accounts
      SET
        balance = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [
        balanceAfter,
        account.id,
      ]
    );


    // ========================================================
    // CREATE TRANSACTION
    // ========================================================

    const transactionReference =
      `CARD-${Date.now()}-${crypto
        .randomBytes(4)
        .toString('hex')
        .toUpperCase()}`;


    await client.query(
      `
      INSERT INTO transactions (
        account_id,
        type,
        amount,
        currency,
        reference,
        description,
        status,
        balance_before,
        balance_after
      )
      VALUES (
        $1,
        'virtual_card_creation',
        $2,
        $3,
        $4,
        'Virtual card creation fee',
        'completed',
        $5,
        $6
      )
      `,
      [
        account.id,
        CARD_FEE,
        account.currency || 'NGN',
        transactionReference,
        balanceBefore,
        balanceAfter,
      ]
    );


    // ========================================================
    // CREATE VIRTUAL CARD
    // ========================================================

    const cardResult = await client.query(
      `
      INSERT INTO virtual_cards (
        user_id,
        account_id,
        card_number,
        card_number_last4,
        expiry_month,
        expiry_year,
        cvv_hash,
        pin_hash,
        status,
        card_fee
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'active',
        $9
      )
      RETURNING
        id,
        card_number,
        card_number_last4,
        expiry_month,
        expiry_year,
        status,
        card_fee,
        created_at
      `,
      [
        userId,
        account.id,
        cardNumber,
        cardNumberLast4,
        expiryMonth,
        expiryYear,
        cvvHash,
        pinHash,
        CARD_FEE,
      ]
    );


    // ========================================================
    // AUDIT LOG
    // ========================================================

    await client.query(
      `
      INSERT INTO audit_logs (
        user_id,
        action,
        description,
        ip_address,
        user_agent
      )
      VALUES (
        $1,
        'virtual_card_created',
        'Virtual card created and ₦1,000 card creation fee charged',
        $2,
        $3
      )
      `,
      [
        userId,
        req.ip || null,
        req.headers['user-agent'] || null,
      ]
    );


    // ========================================================
    // COMMIT
    // ========================================================

    await client.query('COMMIT');


    const card =
      cardResult.rows[0];


    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,
      message:
        'Virtual card created successfully',
      card,
      card_cvv: cvv,
      fee_charged: CARD_FEE,
      balance_after: balanceAfter,
    });

  } catch (error) {

    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Rollback error:',
        rollbackError
      );
    }

    console.error(
      'Create virtual card error:',
      error
    );


    // ========================================================
    // UNIQUE USER PROTECTION
    // ========================================================

    if (
      error.code === '23505'
    ) {
      return res.status(409).json({
        success: false,
        message:
          'You already have a virtual card',
        has_card: true,
      });
    }


    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.status
          ? error.message
          : 'Unable to create virtual card',
    });

  } finally {
    client.release();
  }
});


// ============================================================
// EXPORT
// ============================================================

module.exports = router;
