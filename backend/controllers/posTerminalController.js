
const crypto = require('crypto');

const pool = require('../config/database');

const {
  generateTerminalId,
  generateTerminalSecret,
  hashTerminalSecret,
  verifyTerminalSecret,
} = require('../utils/posSecurity');

// ============================================================
// ZENIMONIES POS
// TERMINAL CONTROLLER
// STAGE 1
// ============================================================

function getUserId(req) {
  return req.user?.id || req.user?.userId || null;
}

function isAdmin(req) {
  return (
    req.user &&
    String(req.user.role || '').toLowerCase() === 'admin'
  );
}

function cleanString(value, maxLength = 150) {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

// ============================================================
// REGISTER TERMINAL
//
// POST /api/pos/terminals/register
//
// Requires authenticated business owner.
// Business must be verified and active.
// Business account must belong to the owner.
// ============================================================

async function registerTerminal(req, res) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const {
    businessId,
    terminalName,
    manufacturer,
    model,
    serialNumber,
    deviceFingerprint,
  } = req.body || {};

  if (!businessId) {
    return res.status(400).json({
      success: false,
      message: 'Business ID is required.',
    });
  }

  const serial = cleanString(serialNumber, 150);

  if (!serial) {
    return res.status(400).json({
      success: false,
      message: 'POS terminal serial number is required.',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // --------------------------------------------------------
    // VERIFY BUSINESS OWNERSHIP AND ACCOUNT
    // --------------------------------------------------------

    const businessResult = await client.query(
      `
        SELECT
          b.id AS business_id,
          b.business_name,
          b.business_account_id,
          b.verification_status,
          b.status AS business_status,

          a.account_number,
          a.currency,
          a.status AS account_status,
          a.account_type

        FROM businesses b

        INNER JOIN accounts a
          ON a.id = b.business_account_id

        WHERE
          b.id = $1
          AND b.owner_user_id = $2

        FOR UPDATE OF b
      `,
      [businessId, userId]
    );

    if (!businessResult.rows.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Business account not found.',
      });
    }

    const business = businessResult.rows[0];

    if (
      business.verification_status !== 'verified' ||
      business.business_status !== 'active'
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'Your business must be verified and active before registering a POS terminal.',
      });
    }

    if (business.account_status !== 'active') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message: 'The business account is not active.',
      });
    }

    // --------------------------------------------------------
    // PREVENT DUPLICATE SERIAL NUMBERS
    // --------------------------------------------------------

    const duplicate = await client.query(
      `
        SELECT id
        FROM pos_terminals
        WHERE LOWER(serial_number) = LOWER($1)
        LIMIT 1
        FOR UPDATE
      `,
      [serial]
    );

    if (duplicate.rows.length) {
      await client.query('ROLLBACK');

      return res.status(409).json({
        success: false,
        message:
          'This POS terminal serial number is already registered.',
      });
    }

    // --------------------------------------------------------
    // GENERATE TERMINAL CREDENTIALS
    // --------------------------------------------------------

    const terminalId = generateTerminalId();

    const terminalSecret =
      generateTerminalSecret();

    const secretHash =
      await hashTerminalSecret(terminalSecret);

    const terminalFingerprint =
      cleanString(deviceFingerprint, 500);

    // --------------------------------------------------------
    // REGISTER TERMINAL
    //
    // Newly registered terminals remain pending.
    // An administrator must activate the terminal.
    // --------------------------------------------------------

    const result = await client.query(
      `
        INSERT INTO pos_terminals (
          terminal_id,
          business_id,
          business_account_id,
          terminal_name,
          manufacturer,
          model,
          serial_number,
          device_fingerprint,
          secret_hash,
          status
        )

        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, 'pending'
        )

        RETURNING
          id,
          terminal_id,
          business_id,
          business_account_id,
          terminal_name,
          manufacturer,
          model,
          serial_number,
          status,
          created_at
      `,
      [
        terminalId,
        business.id,
        business.business_account_id,
        cleanString(terminalName, 100),
        cleanString(manufacturer, 100),
        cleanString(model, 100),
        serial,
        terminalFingerprint,
        secretHash,
      ]
    );

    const terminal = result.rows[0];

    // --------------------------------------------------------
    // AUDIT LOG
    // --------------------------------------------------------

    await client.query(
      `
        INSERT INTO pos_terminal_audit (
          terminal_id,
          actor_user_id,
          action,
          details
        )

        VALUES (
          $1,
          $2,
          'terminal_registered',
          $3::jsonb
        )
      `,
      [
        terminal.id,
        userId,
        JSON.stringify({
          serialNumber: serial,
          status: 'pending',
        }),
      ]
    );

    await client.query('COMMIT');

    // The raw secret is returned only once.
    // The database stores only its bcrypt hash.
    return res.status(201).json({
      success: true,
      message:
        'POS terminal registered and awaiting activation.',

      terminal: {
        id: terminal.id,
        terminalId: terminal.terminal_id,
        businessId: terminal.business_id,
        businessAccountId:
          terminal.business_account_id,
        terminalName: terminal.terminal_name,
        manufacturer: terminal.manufacturer,
        model: terminal.model,
        serialNumber: terminal.serial_number,
        status: terminal.status,
        createdAt: terminal.created_at,
      },

      credentials: {
        terminalId: terminal.terminal_id,
        terminalSecret,
        warning:
          'Save this secret securely. It cannot be retrieved again.',
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'POS terminal registration error:',
      error.message
    );

    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message:
          'This terminal is already registered.',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Unable to register POS terminal.',
    });
  } finally {
    client.release();
  }
}

// ============================================================
// LIST BUSINESS TERMINALS
//
// GET /api/pos/terminals
//
// Business owners can see only their own terminals.
// ============================================================

async function getBusinessTerminals(req, res) {
  const userId = getUserId(req);

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  const { businessId } = req.query;

  if (!businessId) {
    return res.status(400).json({
      success: false,
      message: 'Business ID is required.',
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          t.id,
          t.terminal_id,
          t.business_id,
          t.terminal_name,
          t.manufacturer,
          t.model,
          t.serial_number,
          t.status,
          t.last_seen_at,
          t.activated_at,
          t.created_at

        FROM pos_terminals t

        INNER JOIN businesses b
          ON b.id = t.business_id

        WHERE
          b.id = $1
          AND b.owner_user_id = $2

        ORDER BY t.created_at DESC
      `,
      [businessId, userId]
    );

    return res.json({
      success: true,
      terminals: result.rows,
    });
  } catch (error) {
    console.error(
      'POS terminal listing error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to retrieve POS terminals.',
    });
  }
}

// ============================================================
// TERMINAL STATUS
//
// GET /api/pos/terminals/:terminalId/status
//
// Requires authenticated terminal credentials.
//
// Headers:
// X-Terminal-ID
// X-Terminal-Secret
// ============================================================

async function getTerminalStatus(req, res) {
  const terminalId =
    req.headers['x-terminal-id'];

  const terminalSecret =
    req.headers['x-terminal-secret'];

  if (
    typeof terminalId !== 'string' ||
    typeof terminalSecret !== 'string'
  ) {
    return res.status(401).json({
      success: false,
      message:
        'Terminal credentials are required.',
    });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          id,
          terminal_id,
          business_id,
          business_account_id,
          secret_hash,
          status

        FROM pos_terminals

        WHERE terminal_id = $1

        LIMIT 1
      `,
      [terminalId]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        success: false,
        message: 'Invalid terminal credentials.',
      });
    }

    const terminal = result.rows[0];

    const validSecret =
      await verifyTerminalSecret(
        terminalSecret,
        terminal.secret_hash
      );

    if (!validSecret) {
      return res.status(401).json({
        success: false,
        message: 'Invalid terminal credentials.',
      });
    }

    if (terminal.status !== 'active') {
      return res.status(403).json({
        success: false,
        status: terminal.status,
        message:
          'This POS terminal is not active.',
      });
    }

    await pool.query(
      `
        UPDATE pos_terminals

        SET last_seen_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP

        WHERE id = $1
      `,
      [terminal.id]
    );

    return res.json({
      success: true,
      status: terminal.status,
      terminalId: terminal.terminal_id,
      businessId: terminal.business_id,
      businessAccountId:
        terminal.business_account_id,
      message: 'Terminal is active.',
    });
  } catch (error) {
    console.error(
      'POS terminal status error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to verify terminal status.',
    });
  }
}

// ============================================================
// ACTIVATE TERMINAL
//
// POST /api/pos/admin/terminals/:id/activate
//
// Requires authenticated administrator.
// ============================================================

async function activateTerminal(req, res) {
  const adminId = getUserId(req);

  if (!adminId || !isAdmin(req)) {
    return res.status(403).json({
      success: false,
      message:
        'Administrator access is required.',
    });
  }

  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        SELECT
          t.id,
          t.status,
          t.business_id,
          b.status AS business_status,
          b.verification_status,
          a.status AS account_status

        FROM pos_terminals t

        INNER JOIN businesses b
          ON b.id = t.business_id

        INNER JOIN accounts a
          ON a.id = t.business_account_id

        WHERE t.id = $1

        FOR UPDATE OF t
      `,
      [id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Terminal not found.',
      });
    }

    const terminal = result.rows[0];

    if (
      terminal.business_status !== 'active' ||
      terminal.verification_status !== 'verified' ||
      terminal.account_status !== 'active'
    ) {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'The business and business account must be verified and active.',
      });
    }

    if (terminal.status === 'revoked') {
      await client.query('ROLLBACK');

      return res.status(403).json({
        success: false,
        message:
          'A revoked terminal cannot be reactivated.',
      });
    }

    await client.query(
      `
        UPDATE pos_terminals

        SET
          status = 'active',
          activated_at = CURRENT_TIMESTAMP,
          activated_by = $2,
          updated_at = CURRENT_TIMESTAMP

        WHERE id = $1
      `,
      [id, adminId]
    );

    await client.query(
      `
        INSERT INTO pos_terminal_audit (
          terminal_id,
          actor_user_id,
          action,
          details
        )

        VALUES (
          $1,
          $2,
          'terminal_activated',
          '{}'::jsonb
        )
      `,
      [id, adminId]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message:
        'POS terminal activated successfully.',
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'POS terminal activation error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to activate POS terminal.',
    });
  } finally {
    client.release();
  }
}

// ============================================================
// DISABLE TERMINAL
//
// POST /api/pos/admin/terminals/:id/disable
//
// Requires authenticated administrator.
// ============================================================

async function disableTerminal(req, res) {
  const adminId = getUserId(req);

  if (!adminId || !isAdmin(req)) {
    return res.status(403).json({
      success: false,
      message:
        'Administrator access is required.',
    });
  }

  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        UPDATE pos_terminals

        SET
          status = 'disabled',
          updated_at = CURRENT_TIMESTAMP

        WHERE
          id = $1
          AND status IN ('active', 'pending')

        RETURNING id, terminal_id, status
      `,
      [id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Active or pending terminal not found.',
      });
    }

    const terminal = result.rows[0];

    await client.query(
      `
        INSERT INTO pos_terminal_audit (
          terminal_id,
          actor_user_id,
          action,
          details
        )

        VALUES (
          $1,
          $2,
          'terminal_disabled',
          '{}'::jsonb
        )
      `,
      [terminal.id, adminId]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message:
        'POS terminal disabled successfully.',
      terminal,
    });
  } catch (error) {
    await client.query('ROLLBACK');

    console.error(
      'POS terminal disable error:',
      error.message
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to disable POS terminal.',
    });
  } finally {
    client.release();
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  registerTerminal,
  getBusinessTerminals,
  getTerminalStatus,
  activateTerminal,
  disableTerminal,
};
