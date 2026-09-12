import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface DepositAccount {
  account_number?: string;
  account_name?: string;
  bank_name?: string | null;
  bank_code?: string | null;
  currency?: string;
  status?: string;
  provider?: string;
}

interface Deposit {
  id: string;
  amount: string | number;
  currency: string;
  reference: string;
  payment_method?: string;
  status: string;
  created_at: string;
}

const Deposit: React.FC = () => {
  const [depositAccount, setDepositAccount] =
    useState<DepositAccount | null>(null);

  const [deposits, setDeposits] =
    useState<Deposit[]>([]);

  const [amount, setAmount] = useState('');

  const [method, setMethod] =
    useState('paystack');

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [message, setMessage] =
    useState('');

  // ============================================================
  // TOKEN
  // ============================================================

  const getToken = (): string | null => {
    return (
      localStorage.getItem(
        'zenimonies_token'
      ) ||
      localStorage.getItem('token')
    );
  };

  // ============================================================
  // LOAD DEPOSIT INFORMATION
  // ============================================================

  const loadDepositInformation =
    async () => {
      setLoading(true);
      setError('');

      const token = getToken();

      if (!token) {
        setError(
          'Please log in again to view your deposit information.'
        );

        setLoading(false);
        return;
      }

      try {
        // ======================================================
        // LOAD REAL BANK DEPOSIT ACCOUNT
        // ======================================================

        try {
          const accountResponse =
            await axios.get(
              `${API_URL}/api/deposits/account`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (
            accountResponse.data?.success
          ) {
            setDepositAccount(
              accountResponse.data
                .deposit_account ||
                null
            );
          } else {
            setDepositAccount(null);
          }
        } catch (accountError: any) {
          if (
            accountError?.response
              ?.status === 401
          ) {
            setError(
              'Your authentication session has expired. Please log in again.'
            );
          } else {
            setDepositAccount(null);

            console.error(
              'Deposit account error:',
              accountError
            );
          }
        }

        // ======================================================
        // LOAD DEPOSIT HISTORY
        // ======================================================

        try {
          const historyResponse =
            await axios.get(
              `${API_URL}/api/deposits`,
              {
                headers: {
                  Authorization:
                    `Bearer ${token}`,
                },
              }
            );

          if (
            historyResponse.data
              ?.success
          ) {
            setDeposits(
              historyResponse.data
                .deposits || []
            );
          } else {
            setDeposits([]);
          }
        } catch (historyError: any) {
          if (
            historyError?.response
              ?.status === 401
          ) {
            setError(
              'Your authentication session has expired. Please log in again.'
            );
          } else {
            console.error(
              'Deposit history error:',
              historyError
            );
          }
        }
      } catch (err) {
        console.error(
          'Load deposit information error:',
          err
        );

        setError(
          'Unable to load deposit information. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadDepositInformation();
  }, []);

  // ============================================================
  // CREATE BANK TRANSFER DEPOSIT
  // ============================================================

  const createBankTransferDeposit =
    async (
      numericAmount: number,
      token: string
    ) => {
      const response =
        await axios.post(
          `${API_URL}/api/deposits`,
          {
            amount:
              numericAmount,

            payment_method:
              'bank_transfer',
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',
            },
          }
        );

      if (
        !response.data?.success
      ) {
        throw new Error(
          response.data?.message ||
          'Unable to create bank transfer deposit.'
        );
      }

      return response.data;
    };

  // ============================================================
  // INITIALIZE PAYSTACK PAYMENT
  // ============================================================

  const initializePaystackPayment =
    async (
      numericAmount: number,
      token: string
    ) => {
      const response =
        await axios.post(
          `${API_URL}/api/paystack/initialize`,
          {
            amount:
              numericAmount,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',
            },
          }
        );

      if (
        !response.data?.success
      ) {
        throw new Error(
          response.data?.message ||
          'Unable to initialize Paystack payment.'
        );
      }

      const authorizationUrl =
        response.data?.payment
          ?.authorization_url;

      if (
        !authorizationUrl
      ) {
        throw new Error(
          'Paystack did not return a payment checkout URL.'
        );
      }

      return response.data;
    };

  // ============================================================
  // SUBMIT DEPOSIT
  // ============================================================

  const handleCreateDeposit =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError('');
      setMessage('');

      const token = getToken();

      if (!token) {
        setError(
          'Your session has expired. Please log in again.'
        );
        return;
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount <= 0
      ) {
        setError(
          'Please enter a valid deposit amount.'
        );
        return;
      }

      if (
        numericAmount > 5000000
      ) {
        setError(
          'Deposit amount cannot exceed ₦5,000,000 per transaction.'
        );
        return;
      }

      if (
        method !== 'bank_transfer' &&
        method !== 'paystack'
      ) {
        setError(
          'Please select a valid payment method.'
        );
        return;
      }

      setSubmitting(true);

      try {
        // ======================================================
        // PAYSTACK
        // ======================================================

        if (
          method === 'paystack'
        ) {
          const response =
            await initializePaystackPayment(
              numericAmount,
              token
            );

          const authorizationUrl =
            response.payment
              ?.authorization_url;

          /*
           * IMPORTANT:
           *
           * We redirect to Paystack.
           *
           * We DO NOT change the user's balance here.
           *
           * The Paystack webhook is responsible for
           * confirming and crediting the deposit.
           */

          window.location.href =
            authorizationUrl;

          return;
        }

        // ======================================================
        // BANK TRANSFER
        // ======================================================

        if (
          method ===
          'bank_transfer'
        ) {
          if (
            !depositAccount
              ?.account_number
          ) {
            setError(
              'A dedicated bank deposit account is not available yet. Bank Transfer funding cannot be used until an official bank account is provisioned.'
            );

            return;
          }

          const response =
            await createBankTransferDeposit(
              numericAmount,
              token
            );

          setMessage(
            response.message ||
              'Bank transfer deposit request created successfully.'
          );

          setAmount('');

          if (
            response.deposit
          ) {
            setDeposits(
              previous => [
                response.deposit,
                ...previous,
              ]
            );
          }

          await loadDepositInformation();
        }
      } catch (err: any) {
        console.error(
          'Deposit payment error:',
          err
        );

        if (
          err?.response?.status ===
          401
        ) {
          setError(
            'Your authentication session has expired. Please log in again.'
          );
        } else {
          setError(
            err?.response?.data
              ?.message ||
              err?.message ||
              'Unable to process the deposit. Please try again.'
          );
        }
      } finally {
        setSubmitting(false);
      }
    };

  // ============================================================
  // FORMAT AMOUNT
  // ============================================================

  const formatAmount = (
    value: string | number,
    currency = 'NGN'
  ) => {
    const numericAmount =
      Number(value);

    if (
      !Number.isFinite(
        numericAmount
      )
    ) {
      return `${currency} 0.00`;
    }

    try {
      return new Intl.NumberFormat(
        'en-NG',
        {
          style: 'currency',
          currency,
          minimumFractionDigits: 2,
        }
      ).format(
        numericAmount
      );
    } catch {
      return `${currency} ${numericAmount.toFixed(
        2
      )}`;
    }
  };

  // ============================================================
  // FORMAT DATE
  // ============================================================

  const formatDate = (
    date: string
  ) => {
    try {
      return new Date(
        date
      ).toLocaleString(
        'en-NG',
        {
          dateStyle: 'medium',
          timeStyle: 'short',
        }
      );
    } catch {
      return date;
    }
  };

  // ============================================================
  // STATUS STYLE
  // ============================================================

  const getStatusStyle = (
    status: string
  ) => {
    const normalizedStatus =
      String(status || '')
        .toLowerCase();

    if (
      normalizedStatus ===
        'successful' ||
      normalizedStatus ===
        'completed'
    ) {
      return {
        background: '#ecfdf3',
        color: '#027a48',
      };
    }

    if (
      normalizedStatus ===
        'failed' ||
      normalizedStatus ===
        'rejected'
    ) {
      return {
        background: '#fee4e2',
        color: '#b42318',
      };
    }

    return {
      background: '#fffaeb',
      color: '#b54708',
    };
  };

  // ============================================================
  // COPY BANK ACCOUNT
  // ============================================================

  const copyAccountNumber =
    async () => {
      if (
        !depositAccount
          ?.account_number
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          depositAccount.account_number
        );

        setMessage(
          'Account number copied successfully.'
        );

        window.setTimeout(() => {
          setMessage('');
        }, 3000);
      } catch {
        setError(
          'Unable to copy account number. Please copy it manually.'
        );
      }
    };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >

        {/* BACK */}

        <Link
          to="/"
          style={{
            display:
              'inline-block',
            marginBottom:
              '20px',
            color: '#0b5cff',
            fontWeight: 600,
            textDecoration:
              'none',
          }}
        >
          ← Back to Dashboard
        </Link>

        {/* ====================================================
            MAIN CARD
        ==================================================== */}

        <div
          style={{
            background:
              '#ffffff',
            borderRadius:
              '18px',
            padding:
              '30px',
            boxShadow:
              '0 8px 30px rgba(0, 0, 0, 0.08)',
            marginBottom:
              '24px',
          }}
        >

          <h1
            style={{
              marginTop: 0,
              marginBottom:
                '8px',
            }}
          >
            Fund Your Account
          </h1>

          <p
            style={{
              color:
                '#667085',
              marginTop: 0,
              marginBottom:
                '28px',
              lineHeight:
                1.6,
            }}
          >
            Add money to your
            Zenimonies account
            securely.
          </p>

          {/* ERROR */}

          {error && (
            <div
              role="alert"
              style={{
                padding:
                  '14px',
                marginBottom:
                  '20px',
                borderRadius:
                  '10px',
                background:
                  '#fee4e2',
                color:
                  '#b42318',
                lineHeight:
                  1.5,
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {message && (
            <div
              role="status"
              style={{
                padding:
                  '14px',
                marginBottom:
                  '20px',
                borderRadius:
                  '10px',
                background:
                  '#ecfdf3',
                color:
                  '#027a48',
                lineHeight:
                  1.5,
              }}
            >
              {message}
            </div>
          )}

          {/* ==================================================
              BANK DEPOSIT ACCOUNT
          ================================================== */}

          <div
            style={{
              marginBottom:
                '30px',
              padding:
                '22px',
              borderRadius:
                '14px',
              border:
                '1px solid #d0d5dd',
              background:
                '#fafbff',
            }}
          >

            <h2
              style={{
                margin: 0,
                fontSize:
                  '20px',
              }}
            >
              Bank Deposit Account
            </h2>

            <p
              style={{
                margin:
                  '6px 0 18px 0',
                color:
                  '#667085',
                fontSize:
                  '14px',
                lineHeight:
                  1.5,
              }}
            >
              Your dedicated bank
              deposit account will
              appear here once it has
              been officially provisioned.
            </p>

            {loading ? (
              <div
                style={{
                  padding:
                    '20px 0',
                  textAlign:
                    'center',
                  color:
                    '#667085',
                }}
              >
                Checking deposit
                account status...
              </div>
            ) : depositAccount
              ?.account_number ? (
              <>
                <div
                  style={{
                    display:
                      'grid',
                    gap:
                      '16px',
                  }}
                >

                  <div>
                    <div
                      style={{
                        color:
                          '#667085',
                        fontSize:
                          '13px',
                        marginBottom:
                          '5px',
                      }}
                    >
                      Bank
                    </div>

                    <strong>
                      {depositAccount.bank_name ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <div
                      style={{
                        color:
                          '#667085',
                        fontSize:
                          '13px',
                        marginBottom:
                          '5px',
                      }}
                    >
                      Account Name
                    </div>

                    <strong>
                      {depositAccount.account_name ||
                        '—'}
                    </strong>
                  </div>

                  <div>
                    <div
                      style={{
                        color:
                          '#667085',
                        fontSize:
                          '13px',
                        marginBottom:
                          '5px',
                      }}
                    >
                      Bank Account Number
                    </div>

                    <div
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap:
                          '10px',
                        flexWrap:
                          'wrap',
                      }}
                    >

                      <strong
                        style={{
                          fontSize:
                            '24px',
                          letterSpacing:
                            '2px',
                        }}
                      >
                        {
                          depositAccount.account_number
                        }
                      </strong>

                      <button
                        type="button"
                        onClick={
                          copyAccountNumber
                        }
                        style={{
                          border:
                            'none',
                          borderRadius:
                            '8px',
                          padding:
                            '8px 12px',
                          background:
                            '#eef4ff',
                          color:
                            '#0b5cff',
                          fontWeight:
                            600,
                          cursor:
                            'pointer',
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        color:
                          '#667085',
                        fontSize:
                          '13px',
                        marginBottom:
                          '5px',
                      }}
                    >
                      Currency
                    </div>

                    <strong>
                      {depositAccount.currency ||
                        'NGN'}
                    </strong>
                  </div>

                </div>

                <div
                  style={{
                    marginTop:
                      '22px',
                    padding:
                      '15px',
                    borderRadius:
                      '10px',
                    background:
                      '#ecfdf3',
                    color:
                      '#027a48',
                    lineHeight:
                      1.6,
                  }}
                >
                  <strong>
                    Deposit account active.
                  </strong>{' '}
                  Use only the official
                  bank details shown above.
                </div>

              </>
            ) : (
              <div
                style={{
                  padding:
                    '20px',
                  borderRadius:
                    '10px',
                  background:
                    '#fffaeb',
                  color:
                    '#7a2e0b',
                  lineHeight:
                    1.6,
                }}
              >
                <strong>
                  Bank deposit account
                  not yet available.
                </strong>

                <br />

                Your Zenimonies account
                exists, but a dedicated
                bank deposit account has
                not yet been provisioned.

                <br />
                <br />

                Do not transfer money to
                an account claiming to
                belong to Zenimonies unless
                the official bank details
                appear above.
              </div>
            )}
          </div>

          {/* ==================================================
              ACCOUNT NOTICE
          ================================================== */}

          <div
            style={{
              marginBottom:
                '30px',
              padding:
                '16px',
              borderRadius:
                '10px',
              background:
                '#f8faff',
              color:
                '#475467',
              fontSize:
                '14px',
              lineHeight:
                1.6,
            }}
          >
            <strong>
              Important
            </strong>

            <br />

            Your Zenimonies balance is
            updated only after the payment
            provider confirms a successful
            payment. Starting a deposit
            request does not add money to
            your balance.
          </div>

          {/* ==================================================
              START DEPOSIT
          ================================================== */}

          <div
            style={{
              borderTop:
                '1px solid #eaecf0',
              paddingTop:
                '25px',
            }}
          >

            <h2
              style={{
                marginTop: 0,
                marginBottom:
                  '8px',
                fontSize:
                  '20px',
              }}
            >
              Start a Deposit
            </h2>

            <p
              style={{
                color:
                  '#667085',
                lineHeight:
                  1.6,
              }}
            >
              Choose how you want to
              fund your account.
            </p>

            <form
              onSubmit={
                handleCreateDeposit
              }
            >

              {/* AMOUNT */}

              <label
                htmlFor="amount"
                style={{
                  display:
                    'block',
                  marginBottom:
                    '8px',
                  fontWeight:
                    600,
                }}
              >
                Amount (NGN)
              </label>

              <input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={event =>
                  setAmount(
                    event.target.value
                  )
                }
                placeholder="Enter amount"
                disabled={
                  submitting
                }
                style={{
                  width:
                    '100%',
                  boxSizing:
                    'border-box',
                  padding:
                    '14px',
                  marginBottom:
                    '20px',
                  border:
                    '1px solid #d0d5dd',
                  borderRadius:
                    '10px',
                  fontSize:
                    '16px',
                }}
              />

              {/* METHOD */}

              <label
                htmlFor="method"
                style={{
                  display:
                    'block',
                  marginBottom:
                    '8px',
                  fontWeight:
                    600,
                }}
              >
                Payment Method
              </label>

              <select
                id="method"
                value={method}
                onChange={event =>
                  setMethod(
                    event.target.value
                  )
                }
                disabled={
                  submitting
                }
                style={{
                  width:
                    '100%',
                  boxSizing:
                    'border-box',
                  padding:
                    '14px',
                  marginBottom:
                    '20px',
                  border:
                    '1px solid #d0d5dd',
                  borderRadius:
                    '10px',
                  background:
                    '#ffffff',
                  fontSize:
                    '16px',
                }}
              >

                <option value="paystack">
                  Paystack
                </option>

                <option value="bank_transfer">
                  Bank Transfer
                </option>

              </select>

              {/* PAYSTACK INFORMATION */}

              {method ===
                'paystack' && (
                <div
                  style={{
                    marginBottom:
                      '20px',
                    padding:
                      '14px',
                    borderRadius:
                      '10px',
                    background:
                      '#eef4ff',
                    color:
                      '#344054',
                    fontSize:
                      '14px',
                    lineHeight:
                      1.6,
                  }}
                >
                  You will be securely
                  redirected to Paystack
                  Checkout to complete
                  your payment.
                </div>
              )}

              {/* BANK TRANSFER INFORMATION */}

              {method ===
                'bank_transfer' && (
                <div
                  style={{
                    marginBottom:
                      '20px',
                    padding:
                      '14px',
                    borderRadius:
                      '10px',
                    background:
                      depositAccount
                        ?.account_number
                        ? '#ecfdf3'
                        : '#fffaeb',
                    color:
                      depositAccount
                        ?.account_number
                        ? '#027a48'
                        : '#7a2e0b',
                    fontSize:
                      '14px',
                    lineHeight:
                      1.6,
                  }}
                >
                  {depositAccount
                    ?.account_number ? (
                    <>
                      Transfer the
                      money only to
                      the official bank
                      account shown
                      above.
                    </>
                  ) : (
                    <>
                      Bank Transfer is
                      currently
                      unavailable because
                      your dedicated bank
                      deposit account has
                      not been provisioned.
                    </>
                  )}
                </div>
              )}

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={
                  submitting ||
                  (
                    method ===
                      'bank_transfer' &&
                    !depositAccount
                      ?.account_number
                  )
                }
                style={{
                  width:
                    '100%',
                  padding:
                    '15px',
                  border:
                    'none',
                  borderRadius:
                    '10px',
                  background:
                    '#0b5cff',
                  color:
                    '#ffffff',
                  fontSize:
                    '16px',
                  fontWeight:
                    700,
                  cursor:
                    submitting
                      ? 'not-allowed'
                      : 'pointer',
                  opacity:
                    submitting
                      ? 0.7
                      : 1,
                }}
              >
                {submitting
                  ? 'Processing...'
                  : method ===
                      'paystack'
                    ? 'Continue to Paystack'
                    : 'Create Bank Transfer Deposit'}
              </button>

            </form>
          </div>
        </div>

        {/* ====================================================
            DEPOSIT HISTORY
        ==================================================== */}

        <div
          style={{
            background:
              '#ffffff',
            borderRadius:
              '18px',
            padding:
              '30px',
            boxShadow:
              '0 8px 30px rgba(0, 0, 0, 0.08)',
          }}
        >

          <h2
            style={{
              marginTop: 0,
              marginBottom:
                '8px',
            }}
          >
            Deposit History
          </h2>

          <p
            style={{
              color:
                '#667085',
              marginTop: 0,
              marginBottom:
                '20px',
            }}
          >
            Your recent account
            funding activity.
          </p>

          {deposits.length === 0 ? (
            <div
              style={{
                padding:
                  '25px',
                textAlign:
                  'center',
                border:
                  '1px dashed #d0d5dd',
                borderRadius:
                  '12px',
                color:
                  '#667085',
              }}
            >
              No deposits yet.
            </div>
          ) : (
            <div
              style={{
                display:
                  'grid',
                gap:
                  '12px',
              }}
            >
              {deposits.map(
                deposit => {
                  const statusStyle =
                    getStatusStyle(
                      deposit.status
                    );

                  return (
                    <div
                      key={
                        deposit.id
                      }
                      style={{
                        border:
                          '1px solid #eaecf0',
                        borderRadius:
                          '12px',
                        padding:
                          '16px',
                      }}
                    >

                      <div
                        style={{
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'center',
                          gap:
                            '12px',
                          marginBottom:
                            '8px',
                        }}
                      >

                        <strong>
                          {formatAmount(
                            deposit.amount,
                            deposit.currency
                          )}
                        </strong>

                        <span
                          style={{
                            ...statusStyle,
                            padding:
                              '5px 9px',
                            borderRadius:
                              '20px',
                            fontSize:
                              '12px',
                            fontWeight:
                              600,
                          }}
                        >
                          {deposit.status}
                        </span>

                      </div>

                      <div
                        style={{
                          color:
                            '#667085',
                          fontSize:
                            '13px',
                        }}
                      >
                        Method:{' '}
                        {deposit.payment_method ||
                          '—'}
                      </div>

                      <div
                        style={{
                          color:
                            '#667085',
                          fontSize:
                            '13px',
                          marginTop:
                            '5px',
                        }}
                      >
                        Reference:{' '}
                        {deposit.reference}
                      </div>

                      <div
                        style={{
                          color:
                            '#98a2b3',
                          fontSize:
                            '12px',
                          marginTop:
                            '5px',
                        }}
                      >
                        {formatDate(
                          deposit.created_at
                        )}
                      </div>

                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}

        <div
          style={{
            textAlign:
              'center',
            color:
              '#98a2b3',
            fontSize:
              '13px',
            marginTop:
              '24px',
          }}
        >
          Zenimonies • Secure
          account funding
        </div>

      </div>
    </div>
  );
};

export default Deposit;
