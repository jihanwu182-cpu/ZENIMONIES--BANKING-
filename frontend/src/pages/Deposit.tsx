import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL =
  'https://zenimonies-banking.onrender.com';

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

  const [amount, setAmount] =
    useState('');

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

  const getToken = (): string | null => {
    return (
      localStorage.getItem(
        'zenimonies_token'
      ) ||
      localStorage.getItem('token')
    );
  };

  const loadDepositInformation =
    async () => {
      setLoading(true);
      setError('');

      const token = getToken();

      if (!token) {
        setError(
          'Please log in again to view your funding information.'
        );

        setLoading(false);
        return;
      }

      try {
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
                ?.deposit_account ||
                null
            );
          } else {
            setDepositAccount(null);
          }
        } catch (accountError: any) {
          if (
            accountError?.response?.status ===
            401
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
            historyResponse.data?.success
          ) {
            setDeposits(
              historyResponse.data
                ?.deposits || []
            );
          } else {
            setDeposits([]);
          }
        } catch (historyError: any) {
          if (
            historyError?.response?.status ===
            401
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
          'Load funding information error:',
          err
        );

        setError(
          'Unable to load funding information. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadDepositInformation();
  }, []);

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
            'Unable to initialize payment.'
        );
      }

      const authorizationUrl =
        response.data?.payment
          ?.authorization_url;

      if (!authorizationUrl) {
        throw new Error(
          'Payment checkout URL was not returned.'
        );
      }

      return response.data;
    };

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

      setSubmitting(true);

      try {
        if (
          method === 'paystack'
        ) {
          const response =
            await initializePaystackPayment(
              numericAmount,
              token
            );

          window.location.href =
            response.payment
              ?.authorization_url;

          return;
        }

        if (
          method === 'bank_transfer'
        ) {
          if (
            !depositAccount
              ?.account_number
          ) {
            setError(
              'Your dedicated bank deposit account is not available yet.'
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
          'Funding error:',
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
              'Unable to process your funding request.'
          );
        }
      } finally {
        setSubmitting(false);
      }
    };

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
  };

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

  const getStatusStyle = (
    status: string
  ) => {
    const normalized =
      String(status || '')
        .toLowerCase();

    if (
      normalized ===
        'successful' ||
      normalized ===
        'completed'
    ) {
      return {
        background: '#eaf8ef',
        color: '#08783e',
      };
    }

    if (
      normalized ===
        'failed' ||
      normalized ===
        'rejected'
    ) {
      return {
        background: '#fff1f0',
        color: '#b42318',
      };
    }

    return {
      background: '#fff8e8',
      color: '#9a6700',
    };
  };

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
          'Account number copied.'
        );

        setTimeout(() => {
          setMessage('');
        }, 2500);
      } catch {
        setError(
          'Unable to copy the account number.'
        );
      }
    };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5faf7',
        padding:
          '20px 14px 40px',
        boxSizing:
          'border-box',
      }}
    >
      <div
        style={{
          maxWidth: 720,
          margin:
            '0 auto',
        }}
      >

        {/* HEADER */}

        <div
          style={{
            display:
              'flex',
            alignItems:
              'center',
            gap: 12,
            marginBottom:
              20,
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration:
                'none',
              color:
                '#08783e',
              fontSize:
                14,
              fontWeight:
                800,
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* MAIN */}

        <div
          style={{
            background:
              '#ffffff',
            borderRadius:
              24,
            padding:
              '24px 18px',
            border:
              '1px solid #dcebe1',
            boxShadow:
              '0 10px 30px rgba(17, 75, 42, 0.06)',
          }}
        >

          <div
            style={{
              marginBottom:
                24,
            }}
          >
            <div
              style={{
                color:
                  '#08783e',
                fontSize:
                  12,
                fontWeight:
                  800,
                letterSpacing:
                  1.5,
                textTransform:
                  'uppercase',
              }}
            >
              ZENIMONIES
            </div>

            <h1
              style={{
                margin:
                  '4px 0 6px',
                color:
                  '#163c29',
                fontSize:
                  32,
                fontWeight:
                  850,
              }}
            >
              Fund Your Account
            </h1>

            <p
              style={{
                margin: 0,
                color:
                  '#718078',
                fontSize:
                  15,
                lineHeight:
                  1.6,
              }}
            >
              Add money to your
              ZENIMONIES account
              securely.
            </p>
          </div>

          {/* MESSAGES */}

          {error && (
            <div
              style={{
                marginBottom:
                  16,
                padding:
                  14,
                borderRadius:
                  14,
                background:
                  '#fff1f0',
                border:
                  '1px solid #f3d2cf',
                color:
                  '#b42318',
                fontSize:
                  13,
                lineHeight:
                  1.5,
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                marginBottom:
                  16,
                padding:
                  14,
                borderRadius:
                  14,
                background:
                  '#eaf8ef',
                border:
                  '1px solid #ccebd6',
                color:
                  '#08783e',
                fontSize:
                  13,
                fontWeight:
                  600,
              }}
            >
              {message}
            </div>
          )}

          {/* BANK ACCOUNT */}

          <section
            style={{
              border:
                '1px solid #dcebe1',
              borderRadius:
                20,
              padding:
                18,
              background:
                '#fbfefc',
              marginBottom:
                22,
            }}
          >
            <h2
              style={{
                margin:
                  '0 0 5px',
                color:
                  '#163c29',
                fontSize:
                  20,
              }}
            >
              Bank Deposit Account
            </h2>

            <p
              style={{
                margin:
                  '0 0 16px',
                color:
                  '#718078',
                fontSize:
                  13,
                lineHeight:
                  1.55,
              }}
            >
              Your dedicated bank
              deposit account will
              appear here once it
              has been officially
              provisioned.
            </p>

            {loading ? (
              <div
                style={{
                  padding:
                    18,
                  textAlign:
                    'center',
                  color:
                    '#718078',
                }}
              >
                Checking account
                availability...
              </div>
            ) : depositAccount
              ?.account_number ? (
              <>
                <div
                  style={{
                    background:
                      '#eaf8ef',
                    borderRadius:
                      16,
                    padding:
                      16,
                    marginBottom:
                      12,
                  }}
                >
                  <div
                    style={{
                      fontSize:
                        12,
                      color:
                        '#718078',
                      marginBottom:
                        4,
                    }}
                  >
                    Bank
                  </div>

                  <strong
                    style={{
                      color:
                        '#163c29',
                    }}
                  >
                    {depositAccount.bank_name ||
                      '—'}
                  </strong>

                  <div
                    style={{
                      marginTop:
                        14,
                      fontSize:
                        12,
                      color:
                        '#718078',
                      marginBottom:
                        4,
                    }}
                  >
                    Account Name
                  </div>

                  <strong
                    style={{
                      color:
                        '#163c29',
                    }}
                  >
                    {depositAccount.account_name ||
                      '—'}
                  </strong>

                  <div
                    style={{
                      marginTop:
                        14,
                      fontSize:
                        12,
                      color:
                        '#718078',
                      marginBottom:
                        4,
                    }}
                  >
                    Account Number
                  </div>

                  <div
                    style={{
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap: 10,
                    }}
                  >
                    <strong
                      style={{
                        color:
                          '#08783e',
                        fontSize:
                          21,
                        letterSpacing:
                          1,
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
                          10,
                        background:
                          '#08783e',
                        color:
                          '#ffffff',
                        padding:
                          '8px 11px',
                        fontWeight:
                          700,
                        cursor:
                          'pointer',
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    color:
                      '#08783e',
                    fontSize:
                      13,
                    lineHeight:
                      1.5,
                  }}
                >
                  Use only the official
                  bank details displayed
                  above.
                </div>
              </>
            ) : (
              <div
                style={{
                  background:
                    '#fff8e8',
                  borderRadius:
                    16,
                  padding:
                    18,
                  color:
                    '#7a3418',
                  fontSize:
                    14,
                    lineHeight:
                      1.65,
                }}
              >
                <strong>
                  Bank deposit account
                  not yet available.
                </strong>

                <br />

                Your ZENIMONIES account
                exists, but a dedicated
                bank deposit account has
                not yet been provisioned.

                <br />
                <br />

                Do not transfer money to
                an account claiming to
                belong to ZENIMONIES
                unless the official bank
                details appear above.
              </div>
            )}
          </section>

          {/* NOTICE */}

          <div
            style={{
              background:
                '#f3f8f5',
              borderRadius:
                15,
              padding:
                15,
              color:
                '#506158',
              fontSize:
                13,
              lineHeight:
                1.6,
              marginBottom:
                24,
            }}
          >
            <strong
              style={{
                color:
                  '#163c29',
              }}
            >
              Important:
            </strong>{' '}
            Your balance is updated
            only after the payment
            provider confirms a
            successful payment.
          </div>

          {/* START DEPOSIT */}

          <section
            style={{
              borderTop:
                '1px solid #e5eee8',
              paddingTop:
                24,
            }}
          >
            <h2
              style={{
                margin:
                  '0 0 6px',
                color:
                  '#163c29',
                fontSize:
                  22,
              }}
            >
              Start a Deposit
            </h2>

            <p
              style={{
                margin:
                  '0 0 20px',
                color:
                  '#718078',
                fontSize:
                  14,
              }}
            >
              Choose how you want
              to fund your account.
            </p>

            <form
              onSubmit={
                handleCreateDeposit
              }
            >

              <label
                htmlFor="deposit-amount"
                style={{
                  display:
                    'block',
                  color:
                    '#405449',
                  fontWeight:
                    700,
                  fontSize:
                    14,
                  marginBottom:
                    8,
                }}
              >
                Amount (NGN)
              </label>

              <input
                id="deposit-amount"
                type="number"
                min="1"
                max="5000000"
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
                    '15px',
                  borderRadius:
                    13,
                  border:
                    '1px solid #d5e3da',
                  outline:
                    'none',
                  fontSize:
                    16,
                  marginBottom:
                    18,
                  color:
                    '#163c29',
                  background:
                    '#ffffff',
                }}
              />

              <label
                htmlFor="payment-method"
                style={{
                  display:
                    'block',
                  color:
                    '#405449',
                  fontWeight:
                    700,
                  fontSize:
                    14,
                  marginBottom:
                    8,
                }}
              >
                Payment Method
              </label>

              <select
                id="payment-method"
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
                    '15px',
                  borderRadius:
                    13,
                  border:
                    '1px solid #d5e3da',
                  outline:
                    'none',
                  fontSize:
                    16,
                  background:
                    '#ffffff',
                  marginBottom:
                    18,
                  color:
                    '#163c29',
                }}
              >
                <option value="paystack">
                  Paystack
                </option>

                <option value="bank_transfer">
                  Bank Transfer
                </option>
              </select>

              {method ===
                'paystack' && (
                <div
                  style={{
                    background:
                      '#eaf8ef',
                    borderRadius:
                      14,
                    padding:
                      15,
                    marginBottom:
                      18,
                    color:
                      '#176b3a',
                    fontSize:
                      13,
                    lineHeight:
                      1.55,
                  }}
                >
                  You will be securely
                  redirected to Paystack
                  Checkout to complete
                  your payment.
                </div>
              )}

              {method ===
                'bank_transfer' && (
                <div
                  style={{
                    background:
                      depositAccount
                        ?.account_number
                        ? '#eaf8ef'
                        : '#fff8e8',
                    borderRadius:
                      14,
                    padding:
                      15,
                    marginBottom:
                      18,
                    color:
                      depositAccount
                        ?.account_number
                        ? '#176b3a'
                        : '#7a3418',
                    fontSize:
                      13,
                    lineHeight:
                      1.55,
                  }}
                >
                  {depositAccount
                    ?.account_number
                    ? 'Transfer the money only to the official bank account shown above.'
                    : 'Bank Transfer is unavailable until your dedicated bank deposit account is provisioned.'}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  (method ===
                    'bank_transfer' &&
                    !depositAccount
                      ?.account_number)
                }
                style={{
                  width:
                    '100%',
                  border:
                    'none',
                  borderRadius:
                    14,
                  padding:
                    '16px',
                  background:
                    submitting
                      ? '#9bb9a7'
                      : '#159447',
                  color:
                    '#ffffff',
                  fontSize:
                    16,
                  fontWeight:
                    800,
                  cursor:
                    submitting
                      ? 'not-allowed'
                      : 'pointer',
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
          </section>
        </div>

        {/* DEPOSIT HISTORY */}

        <div
          style={{
            background:
              '#ffffff',
            borderRadius:
              22,
            padding:
              20,
            border:
              '1px solid #dcebe1',
            marginTop:
              18,
          }}
        >
          <h2
            style={{
              margin:
                '0 0 5px',
              color:
                '#163c29',
              fontSize:
                22,
            }}
          >
            Deposit History
          </h2>

          <p
            style={{
              margin:
                '0 0 18px',
              color:
                '#718078',
                fontSize:
                  14,
            }}
          >
            Your recent account
            funding activity.
          </p>

          {deposits.length === 0 ? (
            <div
              style={{
                padding:
                  20,
                textAlign:
                  'center',
                border:
                  '1px dashed #d5e3da',
                borderRadius:
                  14,
                color:
                  '#718078',
                fontSize:
                  14,
              }}
            >
              No deposits yet.
            </div>
          ) : (
            <div
              style={{
                display:
                  'flex',
                flexDirection:
                  'column',
                gap: 10,
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
                        padding:
                          15,
                        border:
                          '1px solid #e3ece6',
                        borderRadius:
                          15,
                      }}
                    >
                      <div
                        style={{
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          gap: 10,
                          alignItems:
                            'center',
                        }}
                      >
                        <strong
                          style={{
                            color:
                              '#163c29',
                            fontSize:
                              16,
                          }}
                        >
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
                              20,
                            fontSize:
                              11,
                            fontWeight:
                              700,
                          }}
                        >
                          {
                            deposit.status
                          }
                        </span>
                      </div>

                      <div
                        style={{
                          color:
                            '#718078',
                          fontSize:
                            12,
                          marginTop:
                            8,
                        }}
                      >
                        {deposit.payment_method ||
                          '—'}
                      </div>

                      <div
                        style={{
                          color:
                            '#718078',
                          fontSize:
                            12,
                          marginTop:
                            4,
                          wordBreak:
                            'break-all',
                        }}
                      >
                        Ref:{' '}
                        {
                          deposit.reference
                        }
                      </div>

                      <div
                        style={{
                          color:
                            '#98a49d',
                          fontSize:
                            11,
                          marginTop:
                            5,
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

        <div
          style={{
            textAlign:
              'center',
            marginTop:
              22,
            color:
              '#8a9990',
            fontSize:
              12,
          }}
        >
          ZENIMONIES • Secure
          Account Funding
        </div>
      </div>
    </div>
  );
};

export default Deposit;
