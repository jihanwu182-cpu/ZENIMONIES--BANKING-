const pool = require('../config/database');

/*
 * ============================================================
 * GET SAVED BENEFICIARIES
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
 * ============================================================
 */

const addBeneficiary = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      name,
      bank_name,
      bank_code,
      account_number,
    } = req.body;

    /*
     * Validate required fields.
     */

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message:
          'Beneficiary name is required.',
      });
    }

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

    const cleanName =
      String(name).trim();

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

    /*
     * Basic Nigerian bank account
     * number validation.
     *
     * We allow up to 30 characters because
     * the database supports other account
     * formats as well.
     */

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
     * Prevent the same beneficiary from
     * being saved repeatedly.
     *
     * Duplicate checking is limited to
     * the logged-in customer.
     */

    const existing =
      await pool.query(
        `
        SELECT
          id
        FROM beneficiaries
        WHERE user_id = $1
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
          'This beneficiary is already saved.',
        beneficiary_id:
          existing.rows[0].id,
      });
    }

    /*
     * Save beneficiary.
     */

    const result =
      await pool.query(
        `
        INSERT INTO beneficiaries (
          user_id,
          name,
          bank_name,
          bank_code,
          account_number
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5
        )
        RETURNING
          id,
          name,
          bank_name,
          bank_code,
          account_number,
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
        'Beneficiary saved successfully.',
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

    /*
     * The user_id condition is extremely
     * important.
     *
     * A customer can only delete their
     * own beneficiary.
     */

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
