const pool = require('../config/database');

const {
    getSaveWallet,
    updateSpendSaveSettings,
    getSpendSaveSettings,
    saveMoney,
    withdrawFromSaveWallet
} = require('../services/saveWalletService');


// ============================================================
// GET CUSTOMER MAIN ACCOUNT
// ============================================================

async function getCustomerAccount(userId) {
    const result = await pool.query(
        `
        SELECT
            id,
            account_number,
            account_type,
            currency,
            balance,
            status
        FROM accounts
        WHERE user_id = $1
          AND account_type = 'personal'
        ORDER BY created_at ASC
        LIMIT 1
        `,
        [userId]
    );

    if (result.rowCount === 0) {
        throw new Error('Personal account not found.');
    }

    const account = result.rows[0];

    if (account.status !== 'active') {
        throw new Error('Your account is not active.');
    }

    return account;
}


// ============================================================
// GET WALLET
// ============================================================

async function getWallet(req, res) {
    try {
        const userId = req.user.id;

        const account = await getCustomerAccount(userId);

        const wallet = await getSaveWallet(
            userId,
            account.id
        );

        return res.status(200).json({
            success: true,
            wallet: {
                id: wallet.id,
                currency: wallet.currency,
                balance: Number(wallet.balance),
                spendSaveEnabled: Boolean(
                    wallet.spend_save_enabled
                ),
                spendSaveAmount: Number(
                    wallet.spend_save_amount
                ),
                accountNumber: account.account_number
            }
        });
    } catch (error) {
        console.error(
            'Get Save Wallet error:',
            error
        );

        return res.status(400).json({
            success: false,
            message: error.message ||
                'Unable to load Save Wallet.'
        });
    }
}


// ============================================================
// GET SPEND & SAVE SETTINGS
// ============================================================

async function getSettings(req, res) {
    try {
        const userId = req.user.id;

        const account = await getCustomerAccount(userId);

        const settings = await getSpendSaveSettings(
            userId,
            account.id
        );

        return res.status(200).json({
            success: true,
            settings
        });
    } catch (error) {
        console.error(
            'Get Spend & Save settings error:',
            error
        );

        return res.status(400).json({
            success: false,
            message: error.message ||
                'Unable to load Spend & Save settings.'
        });
    }
}


// ============================================================
// UPDATE SPEND & SAVE SETTINGS
// ============================================================

async function updateSettings(req, res) {
    try {
        const userId = req.user.id;

        const {
            enabled,
            amount
        } = req.body;

        if (typeof enabled !== 'boolean') {
            return res.status(400).json({
                success: false,
                message:
                    'The enabled field must be true or false.'
            });
        }

        const account = await getCustomerAccount(userId);

        const wallet = await updateSpendSaveSettings({
            userId,
            accountId: account.id,
            enabled,
            amount
        });

        return res.status(200).json({
            success: true,
            message: enabled
                ? 'Spend & Save has been enabled.'
                : 'Spend & Save has been disabled.',
            wallet: {
                id: wallet.id,
                currency: wallet.currency,
                balance: Number(wallet.balance),
                spendSaveEnabled: Boolean(
                    wallet.spend_save_enabled
                ),
                spendSaveAmount: Number(
                    wallet.spend_save_amount
                )
            }
        });
    } catch (error) {
        console.error(
            'Update Spend & Save error:',
            error
        );

        return res.status(400).json({
            success: false,
            message: error.message ||
                'Unable to update Spend & Save.'
        });
    }
}


// ============================================================
// MANUAL SAVE
// ============================================================

async function save(req, res) {
    try {
        const userId = req.user.id;

        const {
            amount,
            description
        } = req.body;

        if (
            amount === undefined ||
            amount === null ||
            amount === ''
        ) {
            return res.status(400).json({
                success: false,
                message: 'Please enter an amount to save.'
            });
        }

        const account = await getCustomerAccount(userId);

        const result = await saveMoney({
            userId,
            accountId: account.id,
            amount,
            description:
                description ||
                'Money saved manually'
        });

        return res.status(200).json({
            success: true,
            message:
                'Money has been moved to your Save Wallet.',
            transaction: result
        });
    } catch (error) {
        console.error(
            'Save Wallet save error:',
            error
        );

        return res.status(400).json({
            success: false,
            message: error.message ||
                'Unable to save money.'
        });
    }
}


// ============================================================
// WITHDRAW FROM SAVE WALLET
// ============================================================

async function withdraw(req, res) {
    try {
        const userId = req.user.id;

        const {
            amount
        } = req.body;

        if (
            amount === undefined ||
            amount === null ||
            amount === ''
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'Please enter the amount you want to withdraw.'
            });
        }

        const account = await getCustomerAccount(userId);

        const result = await withdrawFromSaveWallet({
            userId,
            accountId: account.id,
            amount
        });

        return res.status(200).json({
            success: true,
            message:
                'Money has been returned to your main account.',
            transaction: result
        });
    } catch (error) {
        console.error(
            'Save Wallet withdrawal error:',
            error
        );

        return res.status(400).json({
            success: false,
            message: error.message ||
                'Unable to withdraw from Save Wallet.'
        });
    }
}


// ============================================================
// WALLET TRANSACTION HISTORY
// ============================================================

async function getTransactions(req, res) {
    try {
        const userId = req.user.id;

        const account = await getCustomerAccount(userId);

        const result = await pool.query(
            `
            SELECT
                id,
                type,
                direction,
                amount,
                currency,
                reference,
                description,
                balance_before,
                balance_after,
                created_at
            FROM save_wallet_transactions
            WHERE user_id = $1
              AND account_id = $2
            ORDER BY created_at DESC
            LIMIT 100
            `,
            [
                userId,
                account.id
            ]
        );

        return res.status(200).json({
            success: true,
            transactions: result.rows.map(
                transaction => ({
                    id: transaction.id,
                    type: transaction.type,
                    direction: transaction.direction,
                    amount: Number(transaction.amount),
                    currency: transaction.currency,
                    reference: transaction.reference,
                    description: transaction.description,
                    balanceBefore:
                        Number(
                            transaction.balance_before
                        ),
                    balanceAfter:
                        Number(
                            transaction.balance_after
                        ),
                    createdAt:
                        transaction.created_at
                })
            )
        });
    } catch (error) {
        console.error(
            'Get Save Wallet transactions error:',
            error
        );

        return res.status(400).json({
            success: false,
            message:
                error.message ||
                'Unable to load wallet transactions.'
        });
    }
}


module.exports = {
    getWallet,
    getSettings,
    updateSettings,
    save,
    withdraw,
    getTransactions
};
