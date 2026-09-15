const jwt = require('jsonwebtoken');

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const {
  isoUint8Array,
} = require('@simplewebauthn/server/helpers');

const pool = require('../config/database');

// ============================================================
// CONFIGURATION
// ============================================================

const RP_NAME =
  process.env.WEBAUTHN_RP_NAME ||
  'Zenimonies';

const RP_ID =
  process.env.WEBAUTHN_RP_ID ||
  'zenimonies.com';

const ORIGIN =
  process.env.WEBAUTHN_ORIGIN ||
  'https://zenimonies.com';

const CHALLENGE_EXPIRY_MINUTES = 5;

// ============================================================
// HELPERS
// ============================================================

const getWebAuthnUserId = (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  return isoUint8Array.fromUTF8String(
    String(userId)
  );
};

const cleanupExpiredChallenges = async () => {
  await pool.query(`
    DELETE FROM webauthn_challenges
    WHERE expires_at < CURRENT_TIMESTAMP
  `);
};

const saveChallenge = async ({
  userId,
  challenge,
  challengeType,
}) => {
  await cleanupExpiredChallenges();

  // Only one active challenge of each type per user.
  await pool.query(
    `
      DELETE FROM webauthn_challenges
      WHERE user_id = $1
        AND challenge_type = $2
    `,
    [
      userId,
      challengeType,
    ]
  );

  await pool.query(
    `
      INSERT INTO webauthn_challenges (
        user_id,
        challenge,
        challenge_type,
        expires_at
      )
      VALUES (
        $1,
        $2,
        $3,
        CURRENT_TIMESTAMP +
          ($4 * INTERVAL '1 minute')
      )
    `,
    [
      userId,
      challenge,
      challengeType,
      CHALLENGE_EXPIRY_MINUTES,
    ]
  );
};

const consumeChallenge = async ({
  userId,
  challengeType,
}) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `
        SELECT
          id,
          challenge,
          expires_at
        FROM webauthn_challenges
        WHERE user_id = $1
          AND challenge_type = $2
          AND expires_at > CURRENT_TIMESTAMP
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [
        userId,
        challengeType,
      ]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const challengeRecord =
      result.rows[0];

    // Delete immediately so the challenge
    // cannot be reused.
    await client.query(
      `
        DELETE FROM webauthn_challenges
        WHERE id = $1
      `,
      [challengeRecord.id]
    );

    await client.query('COMMIT');

    return challengeRecord.challenge;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// GET USER PASSKEYS
// ============================================================

const getUserPasskeys = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        credential_id,
        public_key,
        counter,
        device_type,
        backed_up,
        transports,
        created_at,
        last_used_at
      FROM passkey_credentials
      WHERE user_id = $1
      ORDER BY created_at ASC
    `,
    [userId]
  );

  return result.rows;
};

// ============================================================
// REGISTRATION OPTIONS
// ============================================================

const createRegistrationOptions = async (
  userId
) => {
  const userResult = await pool.query(
    `
      SELECT
        id,
        full_name,
        email
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user =
    userResult.rows[0];

  const existingPasskeys =
    await getUserPasskeys(userId);

  const options =
    await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,

      userName:
        user.email ||
        `user-${user.id}`,

      userDisplayName:
        user.full_name ||
        user.email ||
        'Zenimonies User',

      userID:
        getWebAuthnUserId(user.id),

      attestationType: 'none',

      excludeCredentials:
        existingPasskeys.map(
          (passkey) => ({
            id:
              passkey.credential_id,

            transports:
              passkey.transports
                ? passkey.transports
                    .split(',')
                    .map(
                      (value) =>
                        value.trim()
                    )
                    .filter(Boolean)
                : undefined,
          })
        ),

      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },

      supportedAlgorithmIDs: [
        -7,
        -257,
      ],
    });

  await saveChallenge({
    userId,
    challenge:
      options.challenge,
    challengeType:
      'registration',
  });

  return options;
};

// ============================================================
// VERIFY REGISTRATION
// ============================================================

const verifyRegistration = async ({
  userId,
  response,
}) => {
  if (!response) {
    throw new Error(
      'WebAuthn registration response is required'
    );
  }

  const expectedChallenge =
    await consumeChallenge({
      userId,
      challengeType:
        'registration',
    });

  if (!expectedChallenge) {
    throw new Error(
      'Registration challenge is missing or expired'
    );
  }

  let verification;

  try {
    verification =
      await verifyRegistrationResponse({
        response,

        expectedChallenge,

        expectedOrigin:
          ORIGIN,

        expectedRPID:
          RP_ID,

        requireUserVerification:
          true,

        supportedAlgorithmIDs: [
          -7,
          -257,
        ],
      });
  } catch (error) {
    console.error(
      'WebAuthn registration verification error:',
      error
    );

    throw new Error(
      error.message ||
        'Passkey registration verification failed'
    );
  }

  if (!verification.verified) {
    throw new Error(
      'Passkey registration could not be verified'
    );
  }

  const registrationInfo =
    verification.registrationInfo;

  if (!registrationInfo) {
    throw new Error(
      'WebAuthn registration information is missing'
    );
  }

  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
  } = registrationInfo;

  if (!credential?.id) {
    throw new Error(
      'Passkey credential ID is missing'
    );
  }

  if (!credential?.publicKey) {
    throw new Error(
      'Passkey public key is missing'
    );
  }

  const credentialId =
    credential.id;

  const publicKeyBase64 =
    Buffer.from(
      credential.publicKey
    ).toString('base64');

  const counter =
    Number.isFinite(
      credential.counter
    )
      ? credential.counter
      : 0;

  const transports =
    response.response?.transports &&
    Array.isArray(
      response.response.transports
    )
      ? response.response.transports.join(',')
      : null;

  // Prevent duplicate credentials.
  const existing =
    await pool.query(
      `
        SELECT id
        FROM passkey_credentials
        WHERE credential_id = $1
        LIMIT 1
      `,
      [credentialId]
    );

  if (existing.rows.length > 0) {
    throw new Error(
      'This passkey is already registered'
    );
  }

  const result =
    await pool.query(
      `
        INSERT INTO passkey_credentials (
          user_id,
          credential_id,
          public_key,
          counter,
          device_type,
          backed_up,
          transports,
          created_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          CURRENT_TIMESTAMP
        )
        RETURNING
          id,
          credential_id,
          device_type,
          backed_up,
          created_at
      `,
      [
        userId,
        credentialId,
        publicKeyBase64,
        counter,
        credentialDeviceType ||
          null,
        Boolean(
          credentialBackedUp
        ),
        transports,
      ]
    );

  return {
    verified: true,
    passkey:
      result.rows[0],
  };
};

// ============================================================
// AUTHENTICATION OPTIONS
// ============================================================

const createAuthenticationOptions =
  async (userId) => {
    const passkeys =
      await getUserPasskeys(userId);

    if (passkeys.length === 0) {
      throw new Error(
        'No passkey is registered for this account'
      );
    }

    const options =
      await generateAuthenticationOptions(
        {
          rpID: RP_ID,

          allowCredentials:
            passkeys.map(
              (passkey) => ({
                id:
                  passkey.credential_id,

                transports:
                  passkey.transports
                    ? passkey.transports
                        .split(',')
                        .map(
                          (value) =>
                            value.trim()
                        )
                        .filter(
                          Boolean
                        )
                    : undefined,
              })
            ),

          userVerification:
            'required',
        }
      );

    await saveChallenge({
      userId,
      challenge:
        options.challenge,
      challengeType:
        'authentication',
    });

    return options;
  };

// ============================================================
// VERIFY AUTHENTICATION
// ============================================================

const verifyAuthentication =
  async ({
    userId,
    response,
  }) => {
    if (!response) {
      throw new Error(
        'WebAuthn authentication response is required'
      );
    }

    const expectedChallenge =
      await consumeChallenge({
        userId,
        challengeType:
          'authentication',
      });

    if (!expectedChallenge) {
      throw new Error(
        'Authentication challenge is missing or expired'
      );
    }

    const credentialId =
      response.id;

    if (!credentialId) {
      throw new Error(
        'Passkey credential ID is missing'
      );
    }

    const result =
      await pool.query(
        `
          SELECT
            id,
            user_id,
            credential_id,
            public_key,
            counter,
            device_type,
            backed_up,
            transports
          FROM passkey_credentials
          WHERE user_id = $1
            AND credential_id = $2
          LIMIT 1
        `,
        [
          userId,
          credentialId,
        ]
      );

    if (result.rows.length === 0) {
      throw new Error(
        'Registered passkey could not be found'
      );
    }

    const passkey =
      result.rows[0];

    const publicKey =
      new Uint8Array(
        Buffer.from(
          passkey.public_key,
          'base64'
        )
      );

    let verification;

    try {
      verification =
        await verifyAuthenticationResponse(
          {
            response,

            expectedChallenge,

            expectedOrigin:
              ORIGIN,

            expectedRPID:
              RP_ID,

            requireUserVerification:
              true,

            credential: {
              id:
                passkey.credential_id,

              publicKey,

              counter: Number(
                passkey.counter || 0
              ),

              transports:
                passkey.transports
                  ? passkey.transports
                      .split(',')
                      .map(
                        (value) =>
                          value.trim()
                      )
                      .filter(
                        Boolean
                      )
                  : undefined,
            },
          }
        );
    } catch (error) {
      console.error(
        'WebAuthn authentication verification error:',
        error
      );

      throw new Error(
        error.message ||
          'Passkey authentication verification failed'
      );
    }

    if (!verification.verified) {
      throw new Error(
        'Passkey authentication failed'
      );
    }

    const newCounter =
      verification
        .authenticationInfo
        ?.newCounter;

    if (
      Number.isFinite(
        newCounter
      )
    ) {
      await pool.query(
        `
          UPDATE passkey_credentials
          SET
            counter = $1,
            last_used_at =
              CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [
          newCounter,
          passkey.id,
        ]
      );
    } else {
      await pool.query(
        `
          UPDATE passkey_credentials
          SET
            last_used_at =
              CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [passkey.id]
      );
    }

    return {
      verified: true,

      passkeyId:
        passkey.id,

      credentialId:
        passkey.credential_id,

      deviceType:
        passkey.device_type,

      backedUp:
        passkey.backed_up,
    };
  };

// ============================================================
// PASSWORDLESS LOGIN
// ============================================================

const createLoginAuthenticationOptions =
  async (email) => {
    const normalizedEmail =
      String(email || '')
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      throw new Error(
        'Email address is required'
      );
    }

    const userResult =
      await pool.query(
        `
          SELECT
            id,
            full_name,
            email,
            phone,
            role,
            status,
            kyc_status,
            kyc_tier,
            bvn_verified,
            id_verified,
            tier_3_verified,
            is_verified
          FROM users
          WHERE LOWER(email) = $1
          LIMIT 1
        `,
        [normalizedEmail]
      );

    if (
      userResult.rows.length === 0
    ) {
      throw new Error(
        'No Zenimonies account was found for this email address'
      );
    }

    const user =
      userResult.rows[0];

    if (
      user.status &&
      String(user.status).toLowerCase() !==
        'active'
    ) {
      throw new Error(
        'This Zenimonies account is not active'
      );
    }

    const passkeys =
      await getUserPasskeys(
        user.id
      );

    if (passkeys.length === 0) {
      throw new Error(
        'No passkey is registered for this account'
      );
    }

    const options =
      await generateAuthenticationOptions(
        {
          rpID: RP_ID,

          allowCredentials:
            passkeys.map(
              (passkey) => ({
                id:
                  passkey.credential_id,

                transports:
                  passkey.transports
                    ? passkey.transports
                        .split(',')
                        .map(
                          (value) =>
                            value.trim()
                        )
                        .filter(
                          Boolean
                        )
                    : undefined,
              })
            ),

          userVerification:
            'required',
        }
      );

    await saveChallenge({
      userId:
        user.id,

      challenge:
        options.challenge,

      challengeType:
        'login',
    });

    return {
      options,
      userId:
        user.id,
    };
  };

// ============================================================
// VERIFY PASSWORDLESS LOGIN
// ============================================================

const verifyLoginAuthentication =
  async ({
    response,
  }) => {
    if (!response) {
      throw new Error(
        'WebAuthn authentication response is required'
      );
    }

    const credentialId =
      response.id;

    if (!credentialId) {
      throw new Error(
        'Passkey credential ID is missing'
      );
    }

    const credentialResult =
      await pool.query(
        `
          SELECT
            pc.id,
            pc.user_id,
            pc.credential_id,
            pc.public_key,
            pc.counter,
            pc.device_type,
            pc.backed_up,
            pc.transports,

            u.id AS user_id_from_users,
            u.full_name,
            u.email,
            u.phone,
            u.role,
            u.status,
            u.kyc_status,
            u.kyc_tier,
            u.bvn_verified,
            u.id_verified,
            u.tier_3_verified,
            u.is_verified
          FROM passkey_credentials pc
          INNER JOIN users u
            ON u.id = pc.user_id
          WHERE pc.credential_id = $1
          LIMIT 1
        `,
        [credentialId]
      );

    if (
      credentialResult.rows.length ===
      0
    ) {
      throw new Error(
        'This passkey is not registered with Zenimonies'
      );
    }

    const passkey =
      credentialResult.rows[0];

    if (
      passkey.status &&
      String(passkey.status).toLowerCase() !==
        'active'
    ) {
      throw new Error(
        'This Zenimonies account is not active'
      );
    }

    // The login challenge is tied to the
    // passkey's actual user account.
    const expectedChallenge =
      await consumeChallenge({
        userId:
          passkey.user_id,

        challengeType:
          'login',
      });

    if (!expectedChallenge) {
      throw new Error(
        'Passkey login challenge is missing or expired'
      );
    }

    const publicKey =
      new Uint8Array(
        Buffer.from(
          passkey.public_key,
          'base64'
        )
      );

    let verification;

    try {
      verification =
        await verifyAuthenticationResponse(
          {
            response,

            expectedChallenge,

            expectedOrigin:
              ORIGIN,

            expectedRPID:
              RP_ID,

            requireUserVerification:
              true,

            credential: {
              id:
                passkey.credential_id,

              publicKey,

              counter: Number(
                passkey.counter || 0
              ),

              transports:
                passkey.transports
                  ? passkey.transports
                      .split(',')
                      .map(
                        (value) =>
                          value.trim()
                      )
                      .filter(
                        Boolean
                      )
                  : undefined,
            },
          }
        );
    } catch (error) {
      console.error(
        'WebAuthn passwordless login verification error:',
        error
      );

      throw new Error(
        error.message ||
          'Passkey login verification failed'
      );
    }

    if (!verification.verified) {
      throw new Error(
        'Passkey login could not be verified'
      );
    }

    const newCounter =
      verification
        .authenticationInfo
        ?.newCounter;

    if (
      Number.isFinite(
        newCounter
      )
    ) {
      await pool.query(
        `
          UPDATE passkey_credentials
          SET
            counter = $1,
            last_used_at =
              CURRENT_TIMESTAMP
          WHERE id = $2
        `,
        [
          newCounter,
          passkey.id,
        ]
      );
    } else {
      await pool.query(
        `
          UPDATE passkey_credentials
          SET
            last_used_at =
              CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [passkey.id]
      );
    }

    // ========================================================
    // CREATE JWT SESSION
    // ========================================================

    if (!process.env.JWT_SECRET) {
      throw new Error(
        'JWT_SECRET is not configured'
      );
    }

    const token =
      jwt.sign(
        {
          userId:
            passkey.user_id,

          role:
            passkey.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn:
            '24h',
        }
      );

    // ========================================================
    // AUDIT LOG
    // ========================================================

    try {
      await pool.query(
        `
          INSERT INTO audit_logs (
            user_id,
            action,
            description
          )
          VALUES (
            $1,
            $2,
            $3
          )
        `,
        [
          passkey.user_id,

          'passkey_login_success',

          'User successfully authenticated with a registered Zenimonies passkey.',
        ]
      );
    } catch (auditError) {
      console.error(
        'Passkey login audit log error:',
        auditError
      );
    }

    return {
      verified: true,

      token,

      user: {
        id:
          passkey.user_id,

        full_name:
          passkey.full_name,

        email:
          passkey.email,

        phone:
          passkey.phone,

        role:
          passkey.role,

        status:
          passkey.status,

        kyc_status:
          passkey.kyc_status,

        kyc_tier:
          passkey.kyc_tier,

        bvn_verified:
          passkey.bvn_verified,

        id_verified:
          passkey.id_verified,

        tier_3_verified:
          passkey.tier_3_verified,

        is_verified:
          passkey.is_verified,
      },

      passkeyId:
        passkey.id,

      credentialId:
        passkey.credential_id,
    };
  };

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  createRegistrationOptions,
  verifyRegistration,

  createAuthenticationOptions,
  verifyAuthentication,

  createLoginAuthenticationOptions,
  verifyLoginAuthentication,

  getUserPasskeys,
};
