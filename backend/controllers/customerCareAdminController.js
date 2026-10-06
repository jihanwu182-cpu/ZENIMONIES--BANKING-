const pool = require('../config/database');

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE STAFF PROVISIONING
// ============================================================
//
// IMPORTANT:
//
// This controller is ONLY for administrators.
//
// It allows an administrator to assign the Customer Care role
// to an existing user account.
//
// It does NOT create public Customer Care registrations.
//
// Customer Care:
//     role = customer_care
//
// Administrator:
//     role = admin
//
// These roles remain separate.
// ============================================================


// ============================================================
// LIST CUSTOMER CARE AGENTS
// GET /api/admin/customer-care/agents
// ============================================================

async function listCustomerCareAgents(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        id,
        full_name,
        email,
        phone,
        role,
        status,
        created_at,
        updated_at
      FROM users
      WHERE role = 'customer_care'
      ORDER BY full_name ASC
    `);

    return res.status(200).json({
      success: true,
      agents: result.rows,
    });
  } catch (error) {
    console.error(
      'List Customer Care agents error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to load Customer Care agents.',
    });
  }
}


// ============================================================
// ASSIGN CUSTOMER CARE ROLE
// PATCH /api/admin/customer-care/agents/:id
// ============================================================

async function assignCustomerCareRole(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          'User ID is required.',
      });
    }

    // --------------------------------------------------------
    // Prevent administrator from modifying their own role.
    // --------------------------------------------------------

    if (
      req.user?.id &&
      req.user.id === id
    ) {
      return res.status(400).json({
        success: false,
        message:
          'You cannot change your own administrator role.',
      });
    }

    await client.query('BEGIN');

    // --------------------------------------------------------
    // Lock target user.
    // --------------------------------------------------------

    const userResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          email,
          phone,
          role,
          status
        FROM users
        WHERE id = $1
        FOR UPDATE
        `,
        [id]
      );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'User not found.',
      });
    }

    const user =
      userResult.rows[0];

    // --------------------------------------------------------
    // Do not allow changing another administrator into
    // Customer Care.
    // --------------------------------------------------------

    if (user.role === 'admin') {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'An administrator account cannot be converted into a Customer Care account.',
      });
    }

    // --------------------------------------------------------
    // Only active accounts can become Customer Care agents.
    // --------------------------------------------------------

    if (user.status !== 'active') {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'Only an active user account can be assigned to Customer Care.',
      });
    }

    // --------------------------------------------------------
    // Assign role.
    // --------------------------------------------------------

    const updateResult =
      await client.query(
        `
        UPDATE users
        SET
          role = 'customer_care',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1

        RETURNING
          id,
          full_name,
          email,
          phone,
          role,
          status,
          updated_at
        `,
        [id]
      );

    // --------------------------------------------------------
    // Audit.
    // --------------------------------------------------------

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
        'admin_customer_care_role_assigned',
        $2,
        $3,
        $4
      )
      `,
      [
        id,
        `Customer Care role assigned to ${user.full_name} by administrator.`,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Customer Care role assigned successfully.',
      agent:
        updateResult.rows[0],
    });

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Customer Care role rollback error:',
        rollbackError
      );
    }

    console.error(
      'Assign Customer Care role error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to assign Customer Care role.',
    });
  } finally {
    client.release();
  }
}


// ============================================================
// REMOVE CUSTOMER CARE ROLE
// PATCH /api/admin/customer-care/agents/:id/remove
// ============================================================

async function removeCustomerCareRole(req, res) {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          'User ID is required.',
      });
    }

    await client.query('BEGIN');

    const userResult =
      await client.query(
        `
        SELECT
          id,
          full_name,
          email,
          role,
          status
        FROM users
        WHERE id = $1
        FOR UPDATE
        `,
        [id]
      );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message:
          'Customer Care agent not found.',
      });
    }

    const user =
      userResult.rows[0];

    if (user.role !== 'customer_care') {
      await client.query('ROLLBACK');

      return res.status(400).json({
        success: false,
        message:
          'This user is not a Customer Care agent.',
      });
    }

    // --------------------------------------------------------
    // Do NOT silently turn the account into an admin.
    // Return it to the normal customer role.
    // --------------------------------------------------------

    const updateResult =
      await client.query(
        `
        UPDATE users
        SET
          role = 'user',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1

        RETURNING
          id,
          full_name,
          email,
          phone,
          role,
          status,
          updated_at
        `,
        [id]
      );

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
        'admin_customer_care_role_removed',
        $2,
        $3,
        $4
      )
      `,
      [
        id,
        `Customer Care role removed from ${user.full_name} by administrator.`,
        req.ip || null,
        req.get('user-agent') || null,
      ]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      success: true,
      message:
        'Customer Care role removed successfully.',
      user:
        updateResult.rows[0],
    });

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(
        'Remove Customer Care role rollback error:',
        rollbackError
      );
    }

    console.error(
      'Remove Customer Care role error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to remove Customer Care role.',
    });
  } finally {
    client.release();
  }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  listCustomerCareAgents,
  assignCustomerCareRole,
  removeCustomerCareRole,
};
