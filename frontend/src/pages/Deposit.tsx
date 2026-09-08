import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface DepositAccount {
  account_number?: string;
  account_name?: string;
  bank_name?: string;
  currency?: string;
  status?: string;
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

  const [deposits, setDeposits] = useState<Deposit[]>([]);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('bank_transfer');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDepositInformation = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('zenimonies_token');

      if (!token) {
        setError(
          'Please log in again to view your deposit information.'
        );
        return;
      }

      /*
       * Try to load the dedicated deposit account.
       *
       * This endpoint will become active when the payment
       * provider integration is connected.
       */
      try {
        const accountResponse = await axios.get(
          `${API_URL}/api/deposits/account`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (accountResponse.data?.success) {
          setDepositAccount(
            accountResponse.data.depositAccount || null
          );
        }
      } catch (accountError: any) {
        if (accountError?.response?.status !== 404) {
          console.error(
            'Deposit account error:',
            accountError
          );
        }
      }

      /*
       * Load deposit history.
       */
      try {
        const historyResponse = await axios.get(
          `${API_URL}/api/deposits/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (historyResponse.data?.success) {
          setDeposits(
            historyResponse.data.deposits || []
          );
        }
      } catch (historyError: any) {
        if (historyError?.response?.status !== 404) {
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

  useEffect(() => {
    loadDepositInformation();
  }, []);

  const handleCreateDeposit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const token = localStorage.getItem('zenimonies_token');

    if (!token) {
      setError(
        'Your session has expired. Please log in again.'
      );
      return;
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        'Please enter a valid deposit amount.'
      );
      return;
    }

    if (numericAmount > 100000000) {
      setError(
        'Deposit amount is too large.'
      );
      return;
    }

    if (
      method !== 'bank_transfer' &&
      method !== 'card'
    ) {
      setError(
        'Please select a valid payment method.'
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/deposits`,
        {
          amount: numericAmount,
          method,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data.message ||
            'Deposit request created successfully.'
        );

        setAmount('');

        /*
         * Add the newly created deposit to the top
         * of the displayed history immediately.
         */
        if (response.data.deposit) {
          setDeposits((previous) => [
            response.data.deposit,
            ...previous,
          ]);
        }
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

      setError(
        err?.response?.data?.message ||
          'Unable to create deposit request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatAmount = (
    value: string | number,
    currency = 'NGN'
  ) => {
    const numericAmount = Number(value);

    if (!Number.isFinite(numericAmount)) {
      return `${currency} 0.00`;
    }

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(numericAmount);
  };

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleString(
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

  const getStatusStyle = (status: string) => {
    const normalizedStatus =
      status.toLowerCase();

    if (
      normalizedStatus === 'successful' ||
      normalizedStatus === 'completed'
    ) {
      return {
        background: '#ecfdf3',
        color: '#027a48',
      };
    }

    if (normalizedStatus === 'failed') {
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
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: '#0b5cff',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          ← Back to Dashboard
        </Link>

        {/* MAIN DEPOSIT CARD */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '30px',
            boxShadow:
              '0 8px 30px rgba(0, 0, 0, 0.08)',
            marginBottom: '24px',
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: '8px',
            }}
          >
            Fund Your Account
          </h1>

          <p
            style={{
              color: '#667085',
              marginTop: 0,
              marginBottom: '28px',
            }}
          >
            Add money to your Zenimonies account
            securely.
          </p>

          {/* ERROR */}
          {error && (
            <div
              style={{
                padding: '14px',
                marginBottom: '20px',
                borderRadius: '10px',
                background: '#fee4e2',
                color: '#b42318',
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}
          {message && (
            <div
              style={{
                padding: '14px',
                marginBottom: '20px',
                borderRadius: '10px',
                background: '#ecfdf3',
                color: '#027a48',
                lineHeight: 1.5,
              }}
            >
              {message}
            </div>
          )}

          {/* DEPOSIT REQUEST FORM */}
          <form onSubmit={handleCreateDeposit}>
            <label
              htmlFor="amount"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
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
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="Enter amount"
              disabled={submitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px',
                marginBottom: '20px',
                border: '1px solid #d0d5dd',
                borderRadius: '10px',
                fontSize: '16px',
                outline: 'none',
              }}
            />

            <label
              htmlFor="method"
              style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              Payment Method
            </label>

            <select
              id="method"
              value={method}
              onChange={(event) =>
                setMethod(event.target.value)
              }
              disabled={submitting}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px',
                marginBottom: '20px',
                border: '1px solid #d0d5dd',
                borderRadius: '10px',
                background: '#ffffff',
                fontSize: '16px',
              }}
            >
              <option value="bank_transfer">
                Bank Transfer
              </option>

              <option value="card">
                Card
              </option>
            </select>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '15px',
                border: 'none',
                borderRadius: '10px',
                background: '#0b5cff',
                color: '#ffffff',
                fontSize: '16px',
                fontWeight: 700,
                cursor: submitting
                  ? 'not-allowed'
                  : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting
                ? 'Processing...'
                : 'Continue'}
            </button>
          </form>

          {/* DEDICATED ACCOUNT */}
          <div
            style={{
              marginTop: '30px',
              paddingTop: '25px',
              borderTop:
                '1px solid #eaecf0',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: '25px 10px',
                  textAlign: 'center',
                  color: '#667085',
                }}
              >
                Loading deposit account...
              </div>
            ) : depositAccount?.account_number ? (
              <div
                style={{
                  border:
                    '1px solid #d0d5dd',
                  borderRadius: '14px',
                  padding: '22px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '20px',
                  }}
                >
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '20px',
                    }}
                  >
                    Your Deposit Account
                  </h2>

                  <span
                    style={{
                      padding: '6px 10px',
                      borderRadius: '20px',
                      background:
                        '#ecfdf3',
                      color: '#027a48',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    Active
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: '16px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: '#667085',
                        fontSize: '13px',
                        marginBottom: '5px',
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
                        color: '#667085',
                        fontSize: '13px',
                        marginBottom: '5px',
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
                        color: '#667085',
                        fontSize: '13px',
                        marginBottom: '5px',
                      }}
                    >
                      Account Number
                    </div>

                    <strong
                      style={{
                        fontSize: '22px',
                        letterSpacing: '1px',
                      }}
                    >
                      {
                        depositAccount.account_number
                      }
                    </strong>
                  </div>

                  <div>
                    <div
                      style={{
                        color: '#667085',
                        fontSize: '13px',
                        marginBottom: '5px',
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
                    marginTop: '22px',
                    padding: '14px',
                    borderRadius: '10px',
                    background: '#f5f7fb',
                    color: '#475467',
                    lineHeight: 1.6,
                  }}
                >
                  Transfer funds from your bank to
                  this dedicated account. Your
                  Zenimonies balance will only be
                  credited after the payment provider
                  confirms the transaction.
                </div>
              </div>
            ) : (
              <div
                style={{
                  border:
                    '1px solid #d0d5dd',
                  borderRadius: '14px',
                  padding: '28px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '58px',
                    height: '58px',
                    borderRadius: '50%',
                    background: '#eef4ff',
                    color: '#0b5cff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'center',
                    margin:
                      '0 auto 18px',
                    fontSize: '28px',
                  }}
                >
                  ₦
                </div>

                <h2
                  style={{
                    marginTop: 0,
                    marginBottom: '10px',
                  }}
                >
                  Deposit Account Pending
                </h2>

                <p
                  style={{
                    color: '#667085',
                    lineHeight: 1.7,
                    marginBottom: '20px',
                  }}
                >
                  Your dedicated Nigerian deposit
                  account has not been activated yet.
                </p>

                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    background: '#fffaeb',
                    color: '#7a2e0b',
                    textAlign: 'left',
                    lineHeight: 1.6,
                  }}
                >
                  <strong>
                    What happens next?
                  </strong>
                  <br />

                  Once the approved payment provider
                  is connected to Zenimonies, your
                  dedicated deposit account details
                  will appear here.
                </div>

                <p
                  style={{
                    color: '#98a2b3',
                    fontSize: '14px',
                    marginTop: '18px',
                  }}
                >
                  Please do not send money to any
                  account claiming to be a Zenimonies
                  deposit account until your official
                  account details appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* DEPOSIT HISTORY */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '30px',
            boxShadow:
              '0 8px 30px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: '8px',
            }}
          >
            Deposit History
          </h2>

          <p
            style={{
              color: '#667085',
              marginTop: 0,
              marginBottom: '20px',
            }}
          >
            Your recent account funding activity.
          </p>

          {deposits.length === 0 ? (
            <div
              style={{
                padding: '25px',
                textAlign: 'center',
                border:
                  '1px dashed #d0d5dd',
                borderRadius: '12px',
                color: '#667085',
              }}
            >
              No deposits yet.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '12px',
              }}
            >
              {deposits.map((deposit) => {
                const statusStyle =
                  getStatusStyle(
                    deposit.status
                  );

                return (
                  <div
                    key={deposit.id}
                    style={{
                      border:
                        '1px solid #eaecf0',
                      borderRadius: '12px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
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
                          fontWeight: 600,
                        }}
                      >
                        {deposit.status}
                      </span>
                    </div>

                    <div
                      style={{
                        color: '#667085',
                        fontSize: '13px',
                      }}
                    >
                      Method:{' '}
                      {deposit.payment_method ||
                        '—'}
                    </div>

                    <div
                      style={{
                        color: '#667085',
                        fontSize: '13px',
                        marginTop: '5px',
                      }}
                    >
                      Reference:{' '}
                      {deposit.reference}
                    </div>

                    <div
                      style={{
                        color: '#98a2b3',
                        fontSize: '12px',
                        marginTop: '5px',
                      }}
                    >
                      {formatDate(
                        deposit.created_at
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: 'center',
            color: '#98a2b3',
            fontSize: '13px',
            marginTop: '24px',
          }}
        >
          Zenimonies • Secure account funding
        </div>
      </div>
    </div>
  );
};

export default Deposit;
