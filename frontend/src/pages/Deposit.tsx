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
    useState('bank_transfer');

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
        // LOAD REAL DEDICATED DEPOSIT ACCOUNT
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
                accountResponse.data
                  .depositAccount ||
                null
            );
          } else {
            setDepositAccount(null);
          }

        } catch (accountError: any) {

          if (
            accountError?.response
              ?.status === 404
          ) {
            // No Paystack DVA yet.
            setDepositAccount(null);
          } else if (
            accountError?.response
              ?.status === 401
          ) {
            setError(
              'Your authentication session has expired. Please log in again.'
            );
          } else {
            console.error(
              'Deposit account error:',
              accountError
            );
          }
        }

        // ======================================================
        // LOAD DEPOSIT HISTORY
        // ======================================================
        //
        // IMPORTANT:
        //
        // Backend route:
        //
        // GET /api/deposits
        //
        // NOT:
        //
        // /api/deposits/history
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
          } else if (
            historyError?.response
              ?.status !== 404
          ) {
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
  // CREATE DEPOSIT REQUEST
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
          'Deposit amount cannot exceed ₦5,000,000 per request.'
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
        // BACKEND EXPECTS payment_method
        // ======================================================

        const response =
          await axios.post(
            `${API_URL}/api/deposits`,
            {
              amount:
                numericAmount,

              payment_method:
                method,
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
          response.data?.success
        ) {

          setMessage(
            response.data.message ||
              'Deposit request created successfully.'
          );

          setAmount('');

          if (
            response.data.deposit
          ) {
            setDeposits(
              (previous) => [
                response.data.deposit,
                ...previous,
              ]
            );
          }

          await loadDepositInformation();

        } else {

          setError(
            response.data?.message ||
              'Unable to create deposit request.'
          );
        }

      } catch (err: any) {

        console.error(
          'Create deposit error:',
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
              'Unable to create deposit request. Please try again.'
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
  // COPY DEPOSIT ACCOUNT
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
              color: '#667085',
              marginTop: 0,
              marginBottom:
                '28px',
              lineHeight: 1.6,
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

            <div
              style={{
                marginBottom:
                  '18px',
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
                    '6px 0 0 0',
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
                appear here once it
                has been provisioned.
              </p>
            </div>

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

                  {/* BANK */}

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

                  {/* ACCOUNT NAME */}

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

                  {/* ACCOUNT NUMBER */}

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

                  {/* CURRENCY */}

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
                  Use the official bank
                  details shown above when
                  making a bank transfer.
                </div>

                <div
                  style={{
                    marginTop:
                      '12px',
                    padding:
                      '15px',
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
                  Your Zenimonies balance
                  is credited only after
                  the payment provider
                  confirms the incoming
                  transaction.
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
                has been created, but a
                dedicated bank deposit
                account has not yet been
                provisioned.

                <br />
                <br />

                You should not transfer
                money to an account
                claiming to belong to
                Zenimonies unless the
                official bank details
                appear in this section.

              </div>
            )}

          </div>

          {/* ==================================================
              INTERNAL ACCOUNT NOTICE
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
              About your Zenimonies
              account
            </strong>

            <br />

            Your Zenimonies account is
            separate from a dedicated
            bank deposit account. A
            dedicated bank account will
            only be displayed here after
            it has been officially
            provisioned.
          </div>

          {/* ==================================================
              DEPOSIT REQUEST
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
              Create a deposit request.
              Your balance is not
              increased until the
              payment provider confirms
              the payment.
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
                onChange={(
                  event
                ) =>
                  setAmount(
                    event.target
                      .value
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
                  outline:
                    'none',
                }}
              />

              {/* PAYMENT METHOD */}

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
                onChange={(
                  event
                ) =>
                  setMethod(
                    event.target
                      .value
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

                <option value="bank_transfer">
                  Bank Transfer
                </option>

                <option value="paystack">
                  Paystack
                </option>

              </select>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={
                  submitting
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
                  : 'Create Deposit Request'}
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
                (deposit) => {

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
