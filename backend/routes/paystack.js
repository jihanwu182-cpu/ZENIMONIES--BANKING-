const express = require('express');
const router = express.Router();

const axios = require('axios');

const pool = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// ============================================================
// PAYSTACK HEADERS
// ============================================================

const getPaystackHeaders = () => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error(
      'PAYSTACK_SECRET_KEY is not configured'
    );
  }

  return {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  };
};

// ============================================================
// INITIALIZE PAYSTACK DEPOSIT
// POST /api/paystack/initialize
// ============================================================
//
// This creates a Paystack Checkout transaction.
//
// IMPORTANT:
// This endpoint does NOT credit the user's balance.
//
// Balance is credited only after Paystack sends a valid
// charge.success webhook.
// ============================================================

router.post(
  '/initialize',
  authMiddleware,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const userId = req.user.id;

      const {
        amount,
      } = req.body || {};

      // --------------------------------------------------------
      // VALIDATE AMOUNT
      // --------------------------------------------------------

      const depositAmount =
        Number(amount);

      if (
        !Number.isFinite(depositAmount) ||
        depositAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'A valid deposit amount is required.',
        });
      }

      // --------------------------------------------------------
      // MAXIMUM SINGLE PAYMENT
      // --------------------------------------------------------

      if (
        depositAmount > 5000000
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Deposit amount cannot exceed ₦5,000,000 per transaction.',
        });
      }

      // --------------------------------------------------------
      // LOCK USER + ACCOUNT
      // --------------------------------------------------------

      await client.query(
        'BEGIN'
      );

      const userResult =
        await client.query(
          `
          SELECT
            id,
            full_name,
            email,
            kyc_status,
            kyc_tier
          FROM users
          WHERE id = $1
          FOR UPDATE
          `,
          [userId]
        );

      if (
        userResult.rows.length === 0
      ) {
        await client.query(
          'ROLLBACK'
        );

        return res.status(404).json({
          success: false,
          message:
            'User not found.',
        });
      }

      const user =
        userResult.rows[0];

      const accountResult =
        await client.query(
          `
          SELECT
            id,
            balance,
            currency,
            status
          FROM accounts
          WHERE user_id = $1
            AND status = 'active'
          ORDER BY created_at ASC
          LIMIT 1
          FOR UPDATE
          `,
          [userId]
        );

      if (
        accountResult.rows.length === 0
      ) {
        await client.query(
          'ROLLBACK'
        );

        return res.status(404).json({
          success: false,
          message:
            'Active Zenimonies account not found.',
        });
      }

      const account =
        accountResult.rows[0];

      // --------------------------------------------------------
      // ONLY NGN FOR THIS CHECKOUT
      // --------------------------------------------------------

      const currency =
        String(
          account.currency || 'NGN'
        ).toUpperCase();

      if (
        currency !== 'NGN'
      ) {
        await client.query(
          'ROLLBACK'
        );

        return res.status(400).json({
          success: false,
          message:
            'Paystack deposits currently support NGN accounts only.',
        });
      }

      // --------------------------------------------------------
      // ACCOUNT BALANCE LIMIT
      // --------------------------------------------------------

      const status =
        String(
          user.kyc_status || ''
        ).toLowerCase();

      const tier =
        Number(
          user.kyc_tier || 0
        );

      const verified =
        status === 'verified' ||
        status === 'approved' ||
        status === 'completed';

      let accountLimit = 50000;

      if (verified) {
        if (tier >= 3) {
          accountLimit = null;
        } else if (tier === 2) {
          accountLimit = 500000;
        } else if (tier === 1) {
          accountLimit = 200000;
        }
      }

      const currentBalance =
        Number(
          account.balance || 0
        );

      if (
        accountLimit !== null &&
        currentBalance +
          depositAmount >
          accountLimit
      ) {
        const remaining =
          Math.max(
            accountLimit -
              currentBalance,
            0
          );

        await client.query(
          'ROLLBACK'
        );

        return res.status(403).json({
          success: false,
          code:
            'ACCOUNT_BALANCE_LIMIT_EXCEEDED',
          message:
            `This payment would exceed your account balance limit of ₦${accountLimit.toLocaleString()}.`,
          current_balance:
            currentBalance,
          account_limit:
            accountLimit,
          remaining_deposit_limit:
            remaining,
        });
      }

      // --------------------------------------------------------
      // GENERATE UNIQUE ZENIMONIES REFERENCE
      // --------------------------------------------------------

      const reference =
        `ZEN-DEP-${Date.now()}-${require('crypto')
          .randomBytes(4)
          .toString('hex')
          .toUpperCase()}`;

      // --------------------------------------------------------
      // CREATE PENDING DEPOSIT
      // --------------------------------------------------------

      const depositResult =
        await client.query(
          `
          INSERT INTO deposits (
            account_id,
            amount,
            currency,
            reference,
            payment_method,
            status
          )
          VALUES (
            $1,
            $2,
            'NGN',
            $3,
            'paystack',
            'pending'
          )
          RETURNING
            id,
            account_id,
            amount,
            currency,
            reference,
            payment_method,
            status,
            created_at
          `,
          [
            account.id,
            depositAmount,
            reference,
          ]
        );

      await client.query(
        'COMMIT'
      );

      // --------------------------------------------------------
      // INITIALIZE PAYSTACK
      // --------------------------------------------------------

      const amountInKobo =
        Math.round(
          depositAmount * 100
        );

      const callbackUrl =
        process.env.PAYSTACK_CALLBACK_URL ||
        null;

      const payload = {
        email: user.email,
        amount: amountInKobo,
        currency: 'NGN',
        reference,
        metadata: {
          zenimonies_user_id:
            user.id,
          zenimonies_account_id:
            account.id,
          zenimonies_deposit_id:
            depositResult.rows[0].id,
          zenimonies_reference:
            reference,
        },
      };

      if (callbackUrl) {
        payload.callback_url =
          callbackUrl;
      }

      const response =
        await axios.post(
          `${PAYSTACK_BASE_URL}/transaction/initialize`,
          payload,
          {
            headers:
              getPaystackHeaders(),
          },
        );

      // --------------------------------------------------------
      // PAYSTACK INITIALIZATION FAILED
      // --------------------------------------------------------

      if (
        !response.data ||
        !response.data.status ||
        !response.data.data
      ) {
        throw new Error(
          response.data?.message ||
          'Paystack transaction initialization failed'
        );
      }

      const authorizationUrl =
        response.data.data.authorization_url;

      const accessCode =
        response.data.data.access_code;

      if (
        !authorizationUrl ||
        !accessCode
      ) {
        throw new Error(
          'Paystack did not return a valid checkout session'
        );
      }

      // --------------------------------------------------------
      // SAVE PAYSTACK ACCESS CODE
      // --------------------------------------------------------

      await pool.query(
        `
        UPDATE deposits
        SET
          provider_reference = $1
        WHERE id = $2
        `,
        [
          reference,
          depositResult.rows[0].id,
        ]
      );

      return res.status(201).json({
        success: true,
        message:
          'Paystack payment initialized successfully.',
        deposit:
          depositResult.rows[0],
        payment: {
          authorization_url:
            authorizationUrl,
          access_code:
            accessCode,
          reference,
        },
      });

    } catch (error) {
      try {
        await client.query(
          'ROLLBACK'
        );
      } catch {}

      console.error(
        'PAYSTACK INITIALIZE ERROR:',
        error.response?.data ||
          error.message
      );

      return res.status(500).json({
        success: false,
        message:
          error.response?.data?.message ||
          error.message ||
          'Unable to initialize Paystack payment.',
      });

    } finally {
      client.release();
    }
  }
);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;
