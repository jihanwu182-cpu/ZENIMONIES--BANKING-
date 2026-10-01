const pool = require('../config/database');
const crypto = require('crypto');

// ============================================================
// ZENIMONIES SAVE WALLET SERVICE
// ============================================================
//
// Supports:
// - Get/create Save Wallet
// - Spend + Save settings
// - Manual Save
// - Withdraw to Main Account
// - Automatic Spend + Save after eligible successful transfer
//
// IMPORTANT:
// - Main Account money stays in accounts.balance.
// - Save Wallet money stays in save_wallets.balance.
// - Setting a Spend + Save amount NEVER moves money.
// - Automatic saving happens ONLY when applySpendSave()
//   is called by a successful eligible transfer.
// - Money-changing operations use PostgreSQL transactions
//   and row locks.
// ============================================================


// ============================================================
// HELPERS
// ============================================================

function createReference(prefix) {
    return `${prefix}-${Date.now()}-${crypto
        .randomBytes(6)
        .toString('hex')
        .toUpperCase()}`;
}


function toMoney(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
        throw new Error('Invalid amount.');
    }

    return Math.round(amount * 100) / 100;
}


function requirePositiveAmount(
    value,
    fieldName = 'Amount'
) {
    const amount = toMoney(value);

    if (amount <= 0) {
        throw new Error(
            `${fieldName} must be greater than ₦0.00.`
        );
    }

    return amount;
}


// ============================================================
// GET OR CREATE SAVE WALLET
// ============================================================

async function getOrCreateSaveWallet(
    userId,
    accountId
) {
    if (!userId || !accountId) {
        throw new Error(
            'User and account are required.'
        );
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Verify account belongs to user.
        const accountResult =
            await client.query(
                `
                SELECT
                    id,
                    user_id,
                    currency,
                    balance,
                    status
                FROM accounts
                WHERE id = $1
                  AND user_id = $2
                FOR UPDATE
                `,
                [accountId, userId]
            );

        if (accountResult.rowCount === 0) {
            throw new Error(
                'Account not found.'
            );
        }

        const account =
            accountResult.rows[0];

        if (account.currency !== 'NGN') {
            throw new Error(
                'Save Wallet currently supports NGN only.'
            );
        }

        if (account.status !== 'active') {
            throw new Error(
                'Account is not active.'
            );
        }

        let walletResult =
            await client.query(
                `
                SELECT
                    id,
                    user_id,
                    account_id,
                    currency,
                    balance,
                    spend_save_enabled,
                    spend_save_amount,
                    created_at,
                    updated_at
                FROM save_wallets
                WHERE account_id = $1
                FOR UPDATE
                `,
                [accountId]
            );

        // Create wallet if it does not exist.
        if (walletResult.rowCount === 0) {
            walletResult =
                await client.query(
                    `
                    INSERT INTO save_wallets (
                        user_id,
                        account_id,
                        currency
                    )
                    VALUES (
                        $1,
                        $2,
                        'NGN'
                    )
                    RETURNING
                        id,
                        user_id,
                        account_id,
                        currency,
                        balance,
                        spend_save_enabled,
                        spend_save_amount,
                        created_at,
                        updated_at
                    `,
                    [userId, accountId]
                );
        }

        await client.query('COMMIT');

        return walletResult.rows[0];
    } catch (error) {
        await client.query(
            'ROLLBACK'
        );

        throw error;
    } finally {
        client.release();
    }
}


// ============================================================
// GET SAVE WALLET
// ============================================================

async function getSaveWallet(
    userId,
    accountId
) {
    if (!userId || !accountId) {
        throw new Error(
            'User and account are required.'
        );
    }

    const result = await pool.query(
        `
        SELECT
            id,
            user_id,
            account_id,
            currency,
            balance,
            spend_save_enabled,
            spend_save_amount,
            created_at,
            updated_at
        FROM save_wallets
        WHERE user_id = $1
          AND account_id = $2
        `,
        [userId, accountId]
    );

    if (result.rowCount === 0) {
        return getOrCreateSaveWallet(
            userId,
            accountId
        );
    }

    return result.rows[0];
}


// ============================================================
// UPDATE SPEND + SAVE SETTINGS
// ============================================================
//
// IMPORTANT:
//
// The configured amount is independent of the ON/OFF switch.
//
// Example:
//
// Customer sets ₦2,000 while OFF:
//
// Spend + Save = OFF
// Amount = ₦2,000
// Wallet balance = unchanged
//
// Customer later turns ON:
//
// Spend + Save = ON
// Amount = ₦2,000
// Wallet balance = unchanged
//
// Only a successful eligible transfer will trigger
// applySpendSave() and actually move ₦2,000 into the wallet.
//
// Turning Spend + Save OFF does NOT erase the configured
// amount.
// ============================================================

async function updateSpendSaveSettings({
    userId,
    accountId,
    enabled,
    amount
}) {
    if (!userId || !accountId) {
        throw new Error(
            'User and account are required.'
        );
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // ----------------------------------------------------
        // Verify customer's account.
        // ----------------------------------------------------

        const accountResult =
            await client.query(
                `
                SELECT
                    id,
                    user_id,
                    currency,
                    status
                FROM accounts
                WHERE id = $1
                  AND user_id = $2
                FOR UPDATE
                `,
                [accountId, userId]
            );

        if (accountResult.rowCount === 0) {
            throw new Error(
                'Account not found.'
            );
        }

        const account =
            accountResult.rows[0];

        if (account.currency !== 'NGN') {
            throw new Error(
                'Spend & Save currently supports NGN only.'
            );
        }

        if (account.status !== 'active') {
            throw new Error(
                'Account is not active.'
            );
        }

        // ----------------------------------------------------
        // Get existing wallet.
        // ----------------------------------------------------

        const existingWalletResult =
            await client.query(
                `
                SELECT
                    id,
                    spend_save_enabled,
                    spend_save_amount
                FROM save_wallets
                WHERE account_id = $1
                  AND user_id = $2
                FOR UPDATE
                `,
                [accountId, userId]
            );

        const existingAmount =
            existingWalletResult.rowCount > 0
                ? Number(
                      existingWalletResult
                          .rows[0]
                          .spend_save_amount
                  )
                : 0;

        // ----------------------------------------------------
        // Preserve existing configured amount unless the
        // customer supplies a new positive amount.
        // ----------------------------------------------------

        let saveAmount =
            existingAmount;

        if (
            amount !== undefined &&
            amount !== null &&
            String(amount).trim() !== ''
        ) {
            const suppliedAmount =
                toMoney(amount);

            if (suppliedAmount > 0) {
                saveAmount =
                    suppliedAmount;
            } else if (enabled) {
                throw new Error(
                    'Spend & Save amount must be greater than ₦0.00.'
                );
            }
        }

        // ----------------------------------------------------
        // Cannot turn ON without an amount.
        // ----------------------------------------------------

        if (
            Boolean(enabled) &&
            saveAmount <= 0
        ) {
            throw new Error(
                'Enter the amount you want to save before turning Spend + Save on.'
            );
        }

        // ----------------------------------------------------
        // Create or update wallet.
        // ----------------------------------------------------

        const walletResult =
            await client.query(
                `
                INSERT INTO save_wallets (
                    user_id,
                    account_id,
                    currency,
                    spend_save_enabled,
                    spend_save_amount
                )
                VALUES (
                    $1,
                    $2,
                    'NGN',
                    $3,
                    $4
                )
                ON CONFLICT (account_id)
                DO UPDATE SET
                    spend_save_enabled =
                        EXCLUDED.spend_save_enabled,

                    spend_save_amount =
                        EXCLUDED.spend_save_amount,

                    updated_at =
                        CURRENT_TIMESTAMP

                RETURNING
                    id,
                    user_id,
                    account_id,
                    currency,
                    balance,
                    spend_save_enabled,
                    spend_save_amount,
                    created_at,
                    updated_at
                `,
                [
                    userId,
                    accountId,
                    Boolean(enabled),
                    saveAmount
                ]
            );

        await client.query('COMMIT');

        return walletResult.rows[0];
    } catch (error) {
        await client.query(
            'ROLLBACK'
        );

        throw error;
    } finally {
        client.release();
    }
}


// ============================================================
// MANUAL SAVE MONEY
// ============================================================
//
// Main Account
//     - amount
//
// Save Wallet
//     + amount
//
// This happens ONLY when the customer explicitly presses
// the Save button.
// ============================================================

async function saveMoney({
    userId,
    accountId,
    amount,
    description = 'Money saved manually',
    reference = null
}) {
    const saveAmount =
        requirePositiveAmount(
            amount,
            'Save amount'
        );

    const client =
        await pool.connect();

    try {
        await client.query('BEGIN');

        // ----------------------------------------------------
        // Lock main account.
        // ----------------------------------------------------

        const accountResult =
            await client.query(
                `
                SELECT
                    id,
                    user_id,
                    currency,
                    balance,
                    status
                FROM accounts
                WHERE id = $1
                  AND user_id = $2
                FOR UPDATE
                `,
                [accountId, userId]
            );

        if (accountResult.rowCount === 0) {
            throw new Error(
                'Account not found.'
            );
        }

        const account =
            accountResult.rows[0];

        if (account.status !== 'active') {
            throw new Error(
                'Account is not active.'
            );
        }

        if (account.currency !== 'NGN') {
            throw new Error(
                'Save Wallet currently supports NGN only.'
            );
        }

        const currentBalance =
            Number(account.balance);

        if (currentBalance < saveAmount) {
            throw new Error(
                'Insufficient available balance to save this amount.'
            );
        }

        // ----------------------------------------------------
        // Get/create wallet.
        // ----------------------------------------------------

        let walletResult =
            await client.query(
                `
                SELECT *
                FROM save_wallets
                WHERE account_id = $1
                FOR UPDATE
                `,
                [accountId]
            );

        if (walletResult.rowCount === 0) {
            walletResult =
                await client.query(
                    `
                    INSERT INTO save_wallets (
                        user_id,
                        account_id,
                        currency
                    )
                    VALUES (
                        $1,
                        $2,
                        'NGN'
                    )
                    RETURNING *
                    `,
                    [userId, accountId]
                );
        }

        const wallet =
            walletResult.rows[0];

        const walletBefore =
            Number(wallet.balance);

        const walletAfter =
            walletBefore + saveAmount;

        const accountAfter =
            currentBalance - saveAmount;

        // ----------------------------------------------------
        // Debit Main Account.
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE accounts
            SET
                balance = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            `,
            [
                accountAfter.toFixed(2),
                accountId
            ]
        );

        const transactionReference =
            reference ||
            createReference('ZMSAVE');

        // ----------------------------------------------------
        // Record wallet transaction.
        // ----------------------------------------------------

        await client.query(
            `
            INSERT INTO save_wallet_transactions (
                wallet_id,
                user_id,
                account_id,
                type,
                direction,
                amount,
                currency,
                reference,
                description,
                balance_before,
                balance_after
            )
            VALUES (
                $1,
                $2,
                $3,
                'manual_save',
                'credit',
                $4,
                'NGN',
                $5,
                $6,
                $7,
                $8
            )
            `,
            [
                wallet.id,
                userId,
                accountId,
                saveAmount,
                transactionReference,
                description,
                walletBefore,
                walletAfter
            ]
        );

        // ----------------------------------------------------
        // Credit Save Wallet.
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE save_wallets
            SET
                balance = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            `,
            [
                walletAfter.toFixed(2),
                wallet.id
            ]
        );

        await client.query('COMMIT');

        return {
            success: true,
            reference:
                transactionReference,
            savedAmount:
                saveAmount,
            accountBalance:
                accountAfter,
            walletBalance:
                walletAfter
        };
    } catch (error) {
        await client.query(
            'ROLLBACK'
        );

        throw error;
    } finally {
        client.release();
    }
}


// ============================================================
// WITHDRAW FROM SAVE WALLET
// ============================================================
//
// Save Wallet
//     - amount
//
// Main Account
//     + amount
//
// This is NOT a bank withdrawal.
// It returns the customer's own money to the Main Account.
// ============================================================

async function withdrawFromSaveWallet({
    userId,
    accountId,
    amount,
    description = 'Save Wallet withdrawal',
    reference = null
}) {
    const withdrawalAmount =
        requirePositiveAmount(
            amount,
            'Withdrawal amount'
        );

    const client =
        await pool.connect();

    try {
        await client.query('BEGIN');

        // ----------------------------------------------------
        // Lock main account.
        // ----------------------------------------------------

        const accountResult =
            await client.query(
                `
                SELECT
                    id,
                    user_id,
                    currency,
                    balance,
                    status
                FROM accounts
                WHERE id = $1
                  AND user_id = $2
                FOR UPDATE
                `,
                [accountId, userId]
            );

        if (accountResult.rowCount === 0) {
            throw new Error(
                'Account not found.'
            );
        }

        const account =
            accountResult.rows[0];

        if (account.status !== 'active') {
            throw new Error(
                'Account is not active.'
            );
        }

        if (account.currency !== 'NGN') {
            throw new Error(
                'Save Wallet currently supports NGN only.'
            );
        }

        // ----------------------------------------------------
        // Lock Save Wallet.
        // ----------------------------------------------------

        const walletResult =
            await client.query(
                `
                SELECT *
                FROM save_wallets
                WHERE account_id = $1
                  AND user_id = $2
                FOR UPDATE
                `,
                [accountId, userId]
            );

        if (walletResult.rowCount === 0) {
            throw new Error(
                'Save Wallet not found.'
            );
        }

        const wallet =
            walletResult.rows[0];

        const walletBefore =
            Number(wallet.balance);

        if (
            walletBefore <
            withdrawalAmount
        ) {
            throw new Error(
                'Insufficient Save Wallet balance.'
            );
        }

        const walletAfter =
            walletBefore -
            withdrawalAmount;

        const accountBefore =
            Number(account.balance);

        const accountAfter =
            accountBefore +
            withdrawalAmount;

        // ----------------------------------------------------
        // Credit Main Account.
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE accounts
            SET
                balance = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            `,
            [
                accountAfter.toFixed(2),
                accountId
            ]
        );

        const transactionReference =
            reference ||
            createReference('ZMWITH');

        // ----------------------------------------------------
        // Record withdrawal.
        // ----------------------------------------------------

        await client.query(
            `
            INSERT INTO save_wallet_transactions (
                wallet_id,
                user_id,
                account_id,
                type,
                direction,
                amount,
                currency,
                reference,
                description,
                balance_before,
                balance_after
            )
            VALUES (
                $1,
                $2,
                $3,
                'withdrawal',
                'debit',
                $4,
                'NGN',
                $5,
                $6,
                $7,
                $8
            )
            `,
            [
                wallet.id,
                userId,
                accountId,
                withdrawalAmount,
                transactionReference,
                description,
                walletBefore,
                walletAfter
            ]
        );

        // ----------------------------------------------------
        // Update Save Wallet.
        // ----------------------------------------------------

        await client.query(
            `
            UPDATE save_wallets
            SET
                balance = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            `,
            [
                walletAfter.toFixed(2),
                wallet.id
            ]
        );

        await client.query('COMMIT');

        return {
            success: true,
            reference:
                transactionReference,
            withdrawnAmount:
                withdrawalAmount,
            accountBalance:
                accountAfter,
            walletBalance:
                walletAfter
        };
    } catch (error) {
        await client.query(
            'ROLLBACK'
        );

        throw error;
    } finally {
        client.release();
    }
}


// ============================================================
// GET SPEND + SAVE SETTINGS
// ============================================================

async function getSpendSaveSettings(
    userId,
    accountId
) {
    const wallet =
        await getSaveWallet(
            userId,
            accountId
        );

    return {
        enabled:
            Boolean(
                wallet.spend_save_enabled
            ),

        amount:
            Number(
                wallet.spend_save_amount
            )
    };
}


// ============================================================
// APPLY AUTOMATIC SPEND + SAVE
// ============================================================
//
// IMPORTANT:
//
// This function MUST be called from the SAME PostgreSQL
// transaction as the successful eligible transfer.
//
// It does NOT debit accounts.balance.
//
// The transfer logic must make sure the sender has enough
// money for:
//
// transfer amount
// + Spend + Save amount
// + applicable transfer fee
//
// Example:
//
// Transfer       = ₦10,000
// Spend + Save   = ₦2,000
// Fee            = ₦56
//
// Total sender debit = ₦12,056
//
// Recipient receives = ₦10,000
// Save Wallet        = ₦2,000
//
// If the transfer fails or rolls back, the Spend + Save
// credit also rolls back.
// ============================================================

async function applySpendSave({
    client,
    userId,
    accountId,
    relatedTransactionId = null,
    transferReference
}) {
    if (!client) {
        throw new Error(
            'A PostgreSQL transaction client is required.'
        );
    }

    if (!userId || !accountId) {
        throw new Error(
            'User and account are required.'
        );
    }

    if (!transferReference) {
        throw new Error(
            'Transfer reference is required.'
        );
    }

    // --------------------------------------------------------
    // Lock Save Wallet.
    // --------------------------------------------------------

    const walletResult =
        await client.query(
            `
            SELECT *
            FROM save_wallets
            WHERE account_id = $1
              AND user_id = $2
            FOR UPDATE
            `,
            [accountId, userId]
        );

    // No wallet = Spend + Save has never been configured.
    if (walletResult.rowCount === 0) {
        return {
            applied: false,
            amount: 0
        };
    }

    const wallet =
        walletResult.rows[0];

    // Spend + Save is OFF.
    if (!wallet.spend_save_enabled) {
        return {
            applied: false,
            amount: 0
        };
    }

    const saveAmount =
        Number(
            wallet.spend_save_amount
        );

    // Invalid/empty amount.
    if (
        !Number.isFinite(saveAmount) ||
        saveAmount <= 0
    ) {
        return {
            applied: false,
            amount: 0
        };
    }

    // --------------------------------------------------------
    // Idempotency protection.
    //
    // Do not save twice for the same transfer.
    // --------------------------------------------------------

    const description =
        `Spend + Save for transfer ${transferReference}`;

    const existingResult =
        await client.query(
            `
            SELECT
                id,
                amount
            FROM save_wallet_transactions
            WHERE wallet_id = $1
              AND type = 'spend_save'
              AND description = $2
            LIMIT 1
            `,
            [
                wallet.id,
                description
            ]
        );

    if (existingResult.rowCount > 0) {
        return {
            applied: true,
            amount:
                Number(
                    existingResult.rows[0]
                        .amount
                ),
            alreadyApplied: true
        };
    }

    // --------------------------------------------------------
    // Credit Save Wallet.
    // --------------------------------------------------------

    const walletBefore =
        Number(wallet.balance);

    const walletAfter =
        walletBefore + saveAmount;

    const reference =
        createReference('ZMSPEND');

    await client.query(
        `
        INSERT INTO save_wallet_transactions (
            wallet_id,
            user_id,
            account_id,
            type,
            direction,
            amount,
            currency,
            reference,
            description,
            balance_before,
            balance_after,
            related_transaction_id
        )
        VALUES (
            $1,
            $2,
            $3,
            'spend_save',
            'credit',
            $4,
            'NGN',
            $5,
            $6,
            $7,
            $8,
            $9
        )
        `,
        [
            wallet.id,
            userId,
            accountId,
            saveAmount,
            reference,
            description,
            walletBefore,
            walletAfter,
            relatedTransactionId
        ]
    );

    await client.query(
        `
        UPDATE save_wallets
        SET
            balance = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
        [
            walletAfter.toFixed(2),
            wallet.id
        ]
    );

    return {
        applied: true,
        amount: saveAmount,
        alreadyApplied: false,
        reference
    };
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getOrCreateSaveWallet,
    getSaveWallet,
    updateSpendSaveSettings,
    getSpendSaveSettings,
    saveMoney,
    withdrawFromSaveWallet,
    applySpendSave
};
