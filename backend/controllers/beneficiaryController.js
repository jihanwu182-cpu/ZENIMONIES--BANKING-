const pool = require('../config/database');

/*
 * ============================================================
 * NORMALIZE PHONE NUMBER
 * ============================================================
 */
const normalizePhone = (value) => {
  if (!value) return '';

  return String(value)
    .trim()
    .replace(/\s+/g, '');
};

/*
 * ============================================================
 * GET BENEFICIARIES
 * GET /api/beneficiaries
 * ============================================================
 */
const getBeneficiaries = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        bank_name,
        bank_code,
        account_number,
        recipient_type,
        recipient_phone,
        created_at
      FROM beneficiaries
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return res.status(200).json({
      success: true,
      beneficiaries: result.rows,
    });
  } catch (error) {
    console.error(
      'Get beneficiaries error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load beneficiaries.',
    });
  }
};

/*
 * ============================================================
 * ADD BENEFICIARY
 * POST /api/beneficiaries
 *
 * Supports:
 *
 * 1. ZENIMONIES
 *    recipient_type: "zenimonies"
 *    recipient_phone: customer's phone
 *
 * 2. OTHER BANK
 *    recipient_type: "bank"
 *    bank_name
 *    bank_code
 *    account_number
 * ============================================================
 */
const addBeneficiary = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      recipient_type,
      name,
      bank_name,
      bank_code,
      account_number,
      recipient_phone,
    } = req.body;

    const type =
      String(
        recipient_type || 'bank'
      )
        .trim()
        .toLowerCase();

    /*
     * ========================================================
     * VALID RECIPIENT TYPE
     * ========================================================
     */

    if (
      type !== 'bank' &&
      type !== 'zenimonies'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid beneficiary type.',
      });
    }

    /*
     * ========================================================
     * NAME
     * ========================================================
     */

    if (
      !name ||
      !String(name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Beneficiary name is required.',
      });
    }

    const cleanName =
      String(name).trim();

    /*
     * ========================================================
     * ZENIMONIES BENEFICIARY
     * ========================================================
     */

    if (type === 'zenimonies') {
      const cleanPhone =
        normalizePhone(
          recipient_phone
        );

      if (!cleanPhone) {
        return res.status(400).json({
          success: false,
          message:
            'Zenimonies recipient phone number is required.',
        });
      }

      /*
       * Accept Nigerian phone formats
       * while keeping the stored value consistent.
       */
      let normalizedPhone =
        cleanPhone;

      if (
        normalizedPhone.startsWith(
          '+234'
        )
      ) {
        normalizedPhone =
          '0' +
          normalizedPhone.slice(4);
      }

      if (
        !/^0\d{10}$/.test(
          normalizedPhone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Please enter a valid Nigerian phone number.',
        });
      }

      /*
       * Prevent saving the same Zenimonies
       * recipient more than once.
       */
      const existing =
        await pool.query(
          `
          SELECT id
          FROM beneficiaries
          WHERE user_id = $1
            AND recipient_type = 'zenimonies'
            AND recipient_phone = $2
          LIMIT 1
          `,
          [
            userId,
            normalizedPhone,
          ]
        );

      if (
        existing.rows.length > 0
      ) {
        return res.status(409).json({
          success: false,
          message:
            'This Zenimonies beneficiary is already saved.',
          beneficiary_id:
            existing.rows[0].id,
        });
      }

      /*
       * bank_name is kept as "Zenimonies"
       * because the existing database column
       * is required.
       */
      const result =
        await pool.query(
          `
          INSERT INTO beneficiaries (
            user_id,
            name,
            bank_name,
            bank_code,
            account_number,
            recipient_type,
            recipient_phone
          )
          VALUES (
            $1,
            $2,
            'Zenimonies',
            'ZENIMONIES',
            NULL,
            'zenimonies',
            $3
          )
          RETURNING
            id,
            name,
            bank_name,
            bank_code,
            account_number,
            recipient_type,
            recipient_phone,
            created_at
          `,
          [
            userId,
            cleanName,
            normalizedPhone,
          ]
        );

      return res.status(201).json({
        success: true,
        message:
          'Zenimonies beneficiary saved successfully.',
        beneficiary:
          result.rows[0],
      });
    }

    /*
     * ========================================================
     * OTHER BANK BENEFICIARY
     * ========================================================
     */

    if (
      !bank_name ||
      !String(bank_name).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Bank name is required.',
      });
    }

    if (
      !account_number ||
      !String(account_number).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Account number is required.',
      });
    }

    const cleanBankName =
      String(bank_name).trim();

    const cleanBankCode =
      bank_code
        ? String(bank_code).trim()
        : null;

    const cleanAccountNumber =
      String(account_number)
        .replace(/\s+/g, '')
        .trim();

    if (
      !/^\d{10}$/.test(
        cleanAccountNumber
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Please enter a valid 10-digit account number.',
      });
    }

    /*
     * Prevent duplicate bank beneficiary.
     */
    const existing =
      await pool.query(
        `
        SELECT id
        FROM beneficiaries
        WHERE user_id = $1
          AND recipient_type = 'bank'
          AND account_number = $2
          AND COALESCE(bank_code, '') =
              COALESCE($3, '')
        LIMIT 1
        `,
        [
          userId,
          cleanAccountNumber,
          cleanBankCode,
        ]
      );

    if (
      existing.rows.length > 0
    ) {
      return res.status(409).json({
        success: false,
        message:
          'This bank beneficiary is already saved.',
        beneficiary_id:
          existing.rows[0].id,
      });
    }

    const result =
      await pool.query(
        `
        INSERT INTO beneficiaries (
          user_id,
          name,
          bank_name,
          bank_code,
          account_number,
          recipient_type,
          recipient_phone
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          'bank',
          NULL
        )
        RETURNING
          id,
          name,
          bank_name,
          bank_code,
          account_number,
          recipient_type,
          recipient_phone,
          created_at
        `,
        [
          userId,
          cleanName,
          cleanBankName,
          cleanBankCode,
          cleanAccountNumber,
        ]
      );

    return res.status(201).json({
      success: true,
      message:
        'Bank beneficiary saved successfully.',
      beneficiary:
        result.rows[0],
    });
  } catch (error) {
    console.error(
      'Add beneficiary error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to save beneficiary.',
    });
  }
};

/*
 * ============================================================
 * DELETE BENEFICIARY
 * DELETE /api/beneficiaries/:id
 * ============================================================
 */
const deleteBeneficiary = async (
  req,
  res
) => {
  try {
    const userId = req.user.id;

    const beneficiaryId =
      String(
        req.params.id || ''
      ).trim();

    if (!beneficiaryId) {
      return res.status(400).json({
        success: false,
        message:
          'Beneficiary ID is required.',
      });
    }

    const result =
      await pool.query(
        `
        DELETE FROM beneficiaries
        WHERE id = $1
          AND user_id = $2
        RETURNING id
        `,
        [
          beneficiaryId,
          userId,
        ]
      );

    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Beneficiary not found.',
      });
    }

    return res.status(200).json({
      success: true,
      message:
        'Beneficiary removed successfully.',
    });
  } catch (error) {
    console.error(
      'Delete beneficiary error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to remove beneficiary.',
    });
  }
};

module.exports = {
  getBeneficiaries,
  addBeneficiary,
  deleteBeneficiary,
};
