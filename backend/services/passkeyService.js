const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  isoUint8Array,
} = require('@simplewebauthn/server');

const pool = require('../config/database');
const { createAuthSession } = require('./sessionService');

// ============================================================
// WEBAUTHN CONFIGURATION
// ============================================================

const RP_NAME =
  process.env.WEBAUTHN_RP_NAME ||
  'Zenimonies';

const RP_ID =
  process.env.WEBAUTHN_RP_ID ||
  'zenimonies-banking-1.onrender.com';

const ORIGIN =
  process.env.WEBAUTHN_ORIGIN ||
  'https://zenimonies-banking-1.onrender.com';

// ============================================================
// SECURITY SETTINGS
// ============================================================

const CHALLENGE_EXPIRY_MINUTES = 5;

const MAX_FAILED_PASSKEY_ATTEMPTS = 3;

const PASSKEY_LOCK_MINUTES = 10;

// ============================================================
// HELPERS
// ============================================================

const getWebAuthnUserId = (userId) => {
  return isoUint8Array.fromUTF8String(
    String(userId)
  );
};

/**
 * Safely normalize authenticator transports.
 *
 * Supports:
 *
 * ["internal","hybrid"]
 *
 * and:
 *
 * internal,hybrid
 */
const parseTransports = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return undefined;
  }

  const normalized =
    String(value).trim();

  if (!normalized) {
    return undefined;
  }

  // ----------------------------------------------------------
  // JSON ARRAY FORMAT
  // ----------------------------------------------------------

  if (
    normalized.startsWith('[')
  ) {
    try {
      const parsed =
        JSON.parse(normalized);

      if (
        Array.isArray(parsed)
      ) {
        return parsed
          .map((item) =>
            String(item).trim()
          )
          .filter(Boolean);
      }
    } catch (error) {
      console.warn(
        'Unable to parse Passkey transports JSON:',
        error.message
      );

      return undefined;
    }
  }

  // ----------------------------------------------------------
  // COMMA-SEPARATED FORMAT
  // ----------------------------------------------------------

  return normalized
    .split(',')
    .map((item) =>
      item.trim()
    )
    .filter(Boolean);
};

// ============================================================
// CLEANUP EXPIRED CHALLENGES
// ============================================================

const cleanupExpiredChallenges = async () => {
  await pool.query(
    `
      DELETE FROM webauthn_challenges
      WHERE expires_at <= CURRENT_TIMESTAMP
    `
  );
};

// ============================================================
// SAVE CHALLENGE
// ============================================================

const saveChallenge = async ({
  userId,
  challenge,
  challengeType,
}) => {
  await cleanupExpiredChallenges();

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

  const expiresAt =
    new Date(
      Date.now() +
        CHALLENGE_EXPIRY_MINUTES *
          60 *
          1000
    );

  await pool.query(
    `
      INSERT INTO webauthn_challenges (
        user_id,
        challenge,
        challenge_type,
        expires_at
      )
      VALUES ($1, $2, $3, $4)
    `,
    [
      userId,
      challenge,
      challengeType,
      expiresAt,
    ]
  );

  return expiresAt;
};

// ============================================================
// CONSUME CHALLENGE
// ============================================================

const consumeChallenge = async ({
  userId,
  challengeType,
}) => {
  const client =
    await pool.connect();

  try {
    await client.query(
      'BEGIN'
    );

    const result =
      await client.query(
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

    if (
      result.rowCount === 0
    ) {
      await client.query(
        'ROLLBACK'
      );

      return null;
    }

    const challengeRecord =
      result.rows[0];

    await client.query(
      `
        DELETE FROM webauthn_challenges
        WHERE id = $1
      `,
      [
        challengeRecord.id,
      ]
    );

    await client.query(
      'COMMIT'
    );

    return challengeRecord.challenge;
  } catch (error) {
    await client.query(
      'ROLLBACK'
    );

    throw error;
  } finally {
    client.release();
  }
};

// ============================================================
// PASSKEY ATTEMPT TRACKING
// ============================================================

const getAttemptRecord = async ({
  userId,
  email,
}) => {
  const result =
    await pool.query(
      `
        SELECT
          id,
          user_id,
          email,
          attempt_type,
          failed_attempts,
          locked_until,
          last_failed_at
        FROM passkey_auth_attempts
        WHERE attempt_type = 'login'
          AND (
            (
              $1::uuid IS NOT NULL
              AND user_id = $1
            )
            OR
            (
              $2::varchar IS NOT NULL
              AND LOWER(email) = LOWER($2)
            )
          )
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [
        userId || null,
        email || null,
      ]
    );

  return (
    result.rows[0] ||
    null
  );
};

// ============================================================
// CHECK TEMPORARY PASSKEY LOCK
// ============================================================

const isPasskeyTemporarilyLocked =
  async ({
    userId,
    email,
  }) => {
    const record =
      await getAttemptRecord({
        userId,
        email,
      });

    if (!record) {
      return {
        locked: false,
        failedAttempts: 0,
        lockedUntil: null,
      };
    }

    // --------------------------------------------------------
    // CURRENTLY LOCKED
    // --------------------------------------------------------

    if (
      record.locked_until &&
      new Date(
        record.locked_until
      ) > new Date()
    ) {
      return {
        locked: true,

        failedAttempts:
          Number(
            record.failed_attempts
          ) || 0,

        lockedUntil:
          record.locked_until,
      };
    }

    // --------------------------------------------------------
    // LOCK EXPIRED
    // --------------------------------------------------------

    if (
      record.locked_until &&
      new Date(
        record.locked_until
      ) <= new Date()
    ) {
      await pool.query(
        `
          UPDATE passkey_auth_attempts
          SET
            failed_attempts = 0,
            locked_until = NULL,
            last_failed_at = NULL,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
        [
          record.id,
        ]
      );

      return {
        locked: false,
        failedAttempts: 0,
        lockedUntil: null,
      };
    }

    return {
      locked: false,

      failedAttempts:
        Number(
          record.failed_attempts
        ) || 0,

      lockedUntil: null,
    };
  };

// ============================================================
// RECORD FAILED PASSKEY ATTEMPT
// ============================================================

const recordFailedPasskeyAttempt =
  async ({
    userId,
    email,
  }) => {
    const normalizedEmail =
      email
        ? String(email)
            .trim()
            .toLowerCase()
        : null;

    const existing =
      await getAttemptRecord({
        userId,
        email:
          normalizedEmail,
      });

    const now =
      new Date();

    // --------------------------------------------------------
    // FIRST FAILED ATTEMPT
    // --------------------------------------------------------

    if (!existing) {
      const failedAttempts = 1;

      await pool.query(
        `
          INSERT INTO passkey_auth_attempts (
            user_id,
            email,
            attempt_type,
            failed_attempts,
            last_failed_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            'login',
            $3,
            $4,
            CURRENT_TIMESTAMP
          )
        `,
        [
          userId || null,
          normalizedEmail,
          failedAttempts,
          now,
        ]
      );

      return {
        failedAttempts,
        fallbackRequired: false,
        lockedUntil: null,
      };
    }

    // --------------------------------------------------------
    // INCREMENT FAILED ATTEMPTS
    // --------------------------------------------------------

    const nextFailedAttempts =
      Number(
        existing.failed_attempts || 0
      ) + 1;

    let lockedUntil =
      null;

    if (
      nextFailedAttempts >=
      MAX_FAILED_PASSKEY_ATTEMPTS
    ) {
      lockedUntil =
        new Date(
          Date.now() +
            PASSKEY_LOCK_MINUTES *
              60 *
              1000
        );
    }

    await pool.query(
      `
        UPDATE passkey_auth_attempts
        SET
          failed_attempts = $1,
          locked_until = $2,
          last_failed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [
        nextFailedAttempts,
        lockedUntil,
        existing.id,
      ]
    );

    return {
      failedAttempts:
        nextFailedAttempts,

      fallbackRequired:
        nextFailedAttempts >=
        MAX_FAILED_PASSKEY_ATTEMPTS,

      lockedUntil,
    };
  };

// ============================================================
// CLEAR FAILED PASSKEY ATTEMPTS
// ============================================================

const clearFailedPasskeyAttempts =
  async ({
    userId,
    email,
  }) => {
    const existing =
      await getAttemptRecord({
        userId,
        email,
      });

    if (!existing) {
      return;
    }

    await pool.query(
      `
        UPDATE passkey_auth_attempts
        SET
          failed_attempts = 0,
          locked_until = NULL,
          last_failed_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `,
      [
        existing.id,
      ]
    );
  };

// ============================================================
// GET USER PASSKEYS
// ============================================================

const getUserPasskeys = async (
  userId
) => {
  const result =
    await pool.query(
      `
        SELECT
          id,
          credential_id,
          device_type,
          backed_up,
          transports,
          created_at,
          last_used_at
        FROM passkey_credentials
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [
        userId,
      ]
    );

  return result.rows;
};

// ============================================================
// REGISTRATION OPTIONS
// ============================================================

const createRegistrationOptions =
  async ({
    userId,
    userName,
    userDisplayName,
  }) => {
    const existingCredentials =
      await pool.query(
        `
          SELECT
            credential_id
          FROM passkey_credentials
          WHERE user_id = $1
        `,
        [
          userId,
        ]
      );

    const options =
      await generateRegistrationOptions({
        rpName:
          RP_NAME,

        rpID:
          RP_ID,

        userName:
          userName ||
          `user-${userId}`,

        userDisplayName:
          userDisplayName ||
          userName ||
          'Zenimonies User',

        userID:
          getWebAuthnUserId(
            userId
          ),

        attestationType:
          'none',

        excludeCredentials:
          existingCredentials.rows.map(
            (credential) => ({
              id:
                credential.credential_id,
            })
          ),

        authenticatorSelection: {
          residentKey:
            'required',

          requireResidentKey:
            true,

          userVerification:
            'required',
        },

        timeout:
          60000,
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

const verifyRegistration =
  async ({
    userId,
    response,
  }) => {
    if (!response) {
      throw new Error(
        'Passkey registration response is required.'
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
        'Passkey registration challenge expired or was not found.'
      );
    }

    const verification =
      await verifyRegistrationResponse({
        response,

        expectedChallenge,

        expectedOrigin:
          ORIGIN,

        expectedRPID:
          RP_ID,

        requireUserVerification:
          true,
      });

    if (
      !verification.verified
    ) {
      throw new Error(
        'Passkey registration could not be verified.'
      );
    }

    const registrationInfo =
      verification.registrationInfo;

    if (!registrationInfo) {
      throw new Error(
        'Passkey registration information was not returned.'
      );
    }

    const {
      credential,
      credentialDeviceType,
      credentialBackedUp,
    } = registrationInfo;

    const credentialId =
      credential.id;

    const publicKey =
      Buffer.from(
        credential.publicKey
      ).toString(
        'base64'
      );

    const counter =
      Number(
        credential.counter || 0
      );

    const transports =
      response.response?.transports
        ? JSON.stringify(
            response.response
              .transports
          )
        : null;

    const existingCredential =
      await pool.query(
        `
          SELECT
            id
          FROM passkey_credentials
          WHERE credential_id = $1
        `,
        [
          credentialId,
        ]
      );

    if (
      existingCredential.rowCount >
      0
    ) {
      throw new Error(
        'This Passkey is already registered.'
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
            transports
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7
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

          publicKey,

          counter,

          credentialDeviceType ||
            null,

          Boolean(
            credentialBackedUp
          ),

          transports,
        ]
      );

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
        userId,

        'passkey_registration_success',

        'A new Passkey was successfully registered.',
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
  async ({
    userId,
  }) => {
    const credentials =
      await pool.query(
        `
          SELECT
            credential_id,
            transports
          FROM passkey_credentials
          WHERE user_id = $1
        `,
        [
          userId,
        ]
      );

    if (
      credentials.rowCount === 0
    ) {
      throw new Error(
        'No Passkey is registered for this account.'
      );
    }

    const options =
      await generateAuthenticationOptions({
        rpID:
          RP_ID,

        allowCredentials:
          credentials.rows.map(
            (credential) => ({
              id:
                credential.credential_id,

              transports:
                parseTransports(
                  credential.transports
                ),
            })
          ),

        userVerification:
          'required',

        timeout:
          60000,
      });

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
// VERIFY AUTHENTICATED PASSKEY
// ============================================================

const verifyAuthentication =
  async ({
    userId,
    response,
  }) => {
    if (!response) {
      throw new Error(
        'Passkey authentication response is required.'
      );
    }

    const credentialResult =
      await pool.query(
        `
          SELECT
            id,
            credential_id,
            public_key,
            counter,
            transports
          FROM passkey_credentials
          WHERE user_id = $1
            AND credential_id = $2
          LIMIT 1
        `,
        [
          userId,

          response.id,
        ]
      );

    if (
      credentialResult.rowCount === 0
    ) {
      throw new Error(
        'This Passkey is not registered for this account.'
      );
    }

    const credential =
      credentialResult.rows[0];

    const expectedChallenge =
      await consumeChallenge({
        userId,

        challengeType:
          'authentication',
      });

    if (!expectedChallenge) {
      throw new Error(
        'Passkey authentication challenge expired or was not found.'
      );
    }

    const verification =
      await verifyAuthenticationResponse({
        response,

        expectedChallenge,

        expectedOrigin:
          ORIGIN,

        expectedRPID:
          RP_ID,

        credential: {
          id:
            credential.credential_id,

          publicKey:
            Buffer.from(
              credential.public_key,
              'base64'
            ),

          counter:
            Number(
              credential.counter || 0
            ),

          transports:
            parseTransports(
              credential.transports
            ),
        },

        requireUserVerification:
          true,
      });

    if (
      !verification.verified
    ) {
      throw new Error(
        'Passkey authentication could not be verified.'
      );
    }

    const newCounter =
      Number(
        verification.authenticationInfo
          ?.newCounter ??
          credential.counter ??
          0
      );

    await pool.query(
      `
        UPDATE passkey_credentials
        SET
          counter = $1,
          last_used_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [
        newCounter,

        credential.id,
      ]
    );

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
        userId,

        'passkey_authentication_success',

        'A registered Passkey successfully authenticated the user.',
      ]
    );

    return {
      verified: true,

      passkeyId:
        credential.id,

      credentialId:
        credential.credential_id,

      counter:
        newCounter,
    };
  };

// ============================================================
// PASSWORDLESS LOGIN OPTIONS
// ============================================================

const createLoginAuthenticationOptions =
  async ({
    email,
  }) => {
    const normalizedEmail =
      String(
        email || ''
      )
        .trim()
        .toLowerCase();

    if (!normalizedEmail) {
      throw new Error(
        'Email address is required.'
      );
    }

    const userResult =
      await pool.query(
        `
          SELECT
            id,
            email,
            role,
            status
          FROM users
          WHERE LOWER(email) = LOWER($1)
          LIMIT 1
        `,
        [
          normalizedEmail,
        ]
      );

    if (
      userResult.rowCount === 0
    ) {
      throw new Error(
        'Unable to start Passkey authentication.'
      );
    }

    const user =
      userResult.rows[0];

    if (
      user.status !== 'active'
    ) {
      throw new Error(
        'This account is currently unavailable.'
      );
    }

    const lock =
      await isPasskeyTemporarilyLocked({
        userId:
          user.id,

        email:
          normalizedEmail,
      });

    if (lock.locked) {
      const error =
        new Error(
          'Passkey authentication is temporarily locked. Please use your password.'
        );

      error.code =
        'PASSKEY_FALLBACK_REQUIRED';

      error.failedAttempts =
        lock.failedAttempts;

      error.lockedUntil =
        lock.lockedUntil;

      throw error;
    }

    const credentials =
      await pool.query(
        `
          SELECT
            credential_id,
            transports
          FROM passkey_credentials
          WHERE user_id = $1
        `,
        [
          user.id,
        ]
      );

    if (
      credentials.rowCount === 0
    ) {
      throw new Error(
        'No Passkey is registered for this account.'
      );
    }

    const options =
      await generateAuthenticationOptions({
        rpID:
          RP_ID,

        allowCredentials:
          credentials.rows.map(
            (credential) => ({
              id:
                credential.credential_id,

              transports:
                parseTransports(
                  credential.transports
                ),
            })
          ),

        userVerification:
          'required',

        timeout:
          60000,
      });

    await saveChallenge({
      userId:
        user.id,

      challenge:
        options.challenge,

      challengeType:
        'login',
    });

    return {
      user,

      options,
    };
  };

// ============================================================
// VERIFY PASSWORDLESS LOGIN
// ============================================================

const verifyLoginAuthentication =
  async ({
    response,
  }) => {
    if (!response?.id) {
      throw new Error(
        'Passkey authentication response is required.'
      );
    }

    // ----------------------------------------------------------
    // FIND CREDENTIAL + USER
    // ----------------------------------------------------------

    const credentialResult =
      await pool.query(
        `
          SELECT
            pc.id,
            pc.user_id,
            pc.credential_id,
            pc.public_key,
            pc.counter,
            pc.transports,

            u.email,
            u.role,
            u.status,
            u.full_name,
            u.phone,
            u.kyc_status,
            u.kyc_tier,
            u.is_verified
          FROM passkey_credentials pc
          INNER JOIN users u
            ON u.id = pc.user_id
          WHERE pc.credential_id = $1
          LIMIT 1
        `,
        [
          response.id,
        ]
      );

    if (
      credentialResult.rowCount === 0
    ) {
      throw new Error(
        'This Passkey is not registered.'
      );
    }

    const credential =
      credentialResult.rows[0];

    const userId =
      credential.user_id;

    const email =
      credential.email;

    if (
      credential.status !== 'active'
    ) {
      throw new Error(
        'This account is currently unavailable.'
      );
    }

    // ----------------------------------------------------------
    // CHECK PASSKEY LOCK
    // ----------------------------------------------------------

    const lock =
      await isPasskeyTemporarilyLocked({
        userId,

        email,
      });

    if (lock.locked) {
      const error =
        new Error(
          'Passkey authentication is temporarily locked. Please use your password.'
        );

      error.code =
        'PASSKEY_FALLBACK_REQUIRED';

      error.failedAttempts =
        lock.failedAttempts;

      error.lockedUntil =
        lock.lockedUntil;

      throw error;
    }

    // ----------------------------------------------------------
    // CONSUME LOGIN CHALLENGE
    // ----------------------------------------------------------

    const expectedChallenge =
      await consumeChallenge({
        userId,

        challengeType:
          'login',
      });

    if (!expectedChallenge) {
      const failure =
        await recordFailedPasskeyAttempt({
          userId,

          email,
        });

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
          userId,

          'passkey_login_failed',

          'Passkey login failed because the authentication challenge was missing or expired.',
        ]
      );

      const error =
        new Error(
          failure.fallbackRequired
            ? 'Passkey authentication failed three times. Please use your password.'
            : 'Passkey authentication challenge expired or was not found.'
        );

      error.code =
        failure.fallbackRequired
          ? 'PASSKEY_FALLBACK_REQUIRED'
          : 'PASSKEY_AUTH_FAILED';

      error.failedAttempts =
        failure.failedAttempts;

      error.lockedUntil =
        failure.lockedUntil;

      throw error;
    }

    // ----------------------------------------------------------
    // VERIFY CRYPTOGRAPHIC ASSERTION
    // ----------------------------------------------------------

    let verification;

    try {
      verification =
        await verifyAuthenticationResponse({
          response,

          expectedChallenge,

          expectedOrigin:
            ORIGIN,

          expectedRPID:
            RP_ID,

          credential: {
            id:
              credential.credential_id,

            publicKey:
              Buffer.from(
                credential.public_key,
                'base64'
              ),

            counter:
              Number(
                credential.counter || 0
              ),

            transports:
              parseTransports(
                credential.transports
              ),
          },

          requireUserVerification:
            true,
        });
    } catch (error) {
      const failure =
        await recordFailedPasskeyAttempt({
          userId,

          email,
        });

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
          userId,

          'passkey_login_failed',

          'Passkey cryptographic verification failed.',
        ]
      );

      const fallbackRequired =
        failure.fallbackRequired;

      const authError =
        new Error(
          fallbackRequired
            ? 'Passkey authentication failed three times. Please use your password.'
            : 'Passkey authentication failed.'
        );

      authError.code =
        fallbackRequired
          ? 'PASSKEY_FALLBACK_REQUIRED'
          : 'PASSKEY_AUTH_FAILED';

      authError.failedAttempts =
        failure.failedAttempts;

      authError.lockedUntil =
        failure.lockedUntil;

      throw authError;
    }

    // ----------------------------------------------------------
    // VERIFICATION RESULT
    // ----------------------------------------------------------

    if (
      !verification.verified
    ) {
      const failure =
        await recordFailedPasskeyAttempt({
          userId,

          email,
        });

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
          userId,

          'passkey_login_failed',

          'Passkey assertion was not verified.',
        ]
      );

      const fallbackRequired =
        failure.fallbackRequired;

      const authError =
        new Error(
          fallbackRequired
            ? 'Passkey authentication failed three times. Please use your password.'
            : 'Passkey authentication failed.'
        );

      authError.code =
        fallbackRequired
          ? 'PASSKEY_FALLBACK_REQUIRED'
          : 'PASSKEY_AUTH_FAILED';

      authError.failedAttempts =
        failure.failedAttempts;

      authError.lockedUntil =
        failure.lockedUntil;

      throw authError;
    }

    // ----------------------------------------------------------
    // UPDATE PASSKEY COUNTER
    // ----------------------------------------------------------

    const newCounter =
      Number(
        verification.authenticationInfo
          ?.newCounter ??
          credential.counter ??
          0
      );

    await pool.query(
      `
        UPDATE passkey_credentials
        SET
          counter = $1,
          last_used_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `,
      [
        newCounter,

        credential.id,
      ]
    );

    // ----------------------------------------------------------
    // CLEAR FAILED ATTEMPTS
    // ----------------------------------------------------------

    await clearFailedPasskeyAttempts({
      userId,

      email,
    });

    // ----------------------------------------------------------
    // CREATE AUTH SESSION
    // ----------------------------------------------------------

    const session =
      await createAuthSession({
        id:
          userId,

        role:
          credential.role,
      });

    // ----------------------------------------------------------
    // AUDIT SUCCESS
    // ----------------------------------------------------------

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
        userId,

        'passkey_login_success',

        'User successfully signed in using a registered Passkey.',
      ]
    );

    // ----------------------------------------------------------
    // RETURN LOGIN RESULT
    // ----------------------------------------------------------

    return {
      verified: true,

      token:
        session.token,

      sessionId:
        session.sessionId,

      sessionExpiresAt:
        session.expiresAt,

      user: {
        id:
          userId,

        email:
          credential.email,

        role:
          credential.role,

        full_name:
          credential.full_name,

        phone:
          credential.phone,

        kyc_status:
          credential.kyc_status,

        kyc_tier:
          credential.kyc_tier,

        is_verified:
          credential.is_verified,
      },

      passkeyId:
        credential.id,

      credentialId:
        credential.credential_id,

      failedAttempts:
        0,

      fallbackRequired:
        false,

      lockedUntil:
        null,
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

  isPasskeyTemporarilyLocked,

  recordFailedPasskeyAttempt,

  clearFailedPasskeyAttempts,

  parseTransports,
};
