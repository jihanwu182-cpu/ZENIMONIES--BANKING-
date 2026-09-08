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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDepositInformation = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('zenimonies_token');

      if (!token) {
        setError(
          'Please log in again to view your deposit account.'
        );
        return;
      }

      /*
       * The Paystack Dedicated Virtual Account will be connected
       * after Zenimonies completes the required business/provider
       * onboarding.
       *
       * For now we safely display the pending-activation state
       * instead of inventing an account number.
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
        /*
         * A 404 simply means the Paystack deposit account has
         * not been created yet.
         */
        if (accountError?.response?.status !== 404) {
          console.error(
            'Deposit account error:',
            accountError
          );
        }
      }

      /*
       * Load the customer's existing deposit history.
       */
      try {
        const depositsResponse = await axios.get(
          `${API_URL}/api/deposits/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (depositsResponse.data?.success) {
          setDeposits(
            depositsResponse.data.deposits || []
          );
        }
      } catch (historyError: any) {
        /*
         * Deposit history endpoint may not exist yet.
         * We don't want that to prevent the deposit account
         * page from loading.
         */
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

  const formatAmount = (
    amount: string | number,
    currency = 'NGN'
  ) => {
    const numericAmount = Number(amount);

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
      return new Date(date).toLocaleString('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
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
            Your dedicated Zenimonies deposit account
            will be used to fund your account.
          </p>

          {error && (
            <div
              style={{
                padding: '14px',
                marginBottom: '20px',
                borderRadius: '10px',
                background: '#fee4e2',
                color: '#b42318',
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div
              style={{
                padding: '35px 20px',
                textAlign: 'center',
                color: '#667085',
              }}
            >
              Loading deposit information...
            </div>
          ) : depositAccount?.account_number ? (
            <div
              style={{
                border: '1px solid #d0d5dd',
                borderRadius: '14px',
                padding: '22px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
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
                    background: '#ecfdf3',
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
                    {depositAccount.account_number}
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
                Transfer funds from your bank to this
                dedicated account. Your deposit will be
                processed after the payment provider
                confirms the transaction.
              </div>
            </div>
          ) : (
            <div
              style={{
                border: '1px solid #d0d5dd',
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
                  justifyContent: 'center',
                  margin: '0 auto 18px',
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
                Deposit Account Pending Activation
              </h2>

              <p
                style={{
                  color: '#667085',
                  lineHeight: 1.7,
                  marginBottom: '20px',
                }}
              >
                Your dedicated Nigerian deposit account
                has not been activated yet.
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
                <strong>What happens next?</strong>
                <br />
                Once the approved payment provider is
                connected to Zenimonies, your dedicated
                deposit account details will appear here.
              </div>

              <p
                style={{
                  color: '#98a2b3',
                  fontSize: '14px',
                  marginTop: '18px',
                }}
              >
                Please do not send money to any account
                claiming to be a Zenimonies deposit account
                until your official account details appear
                here.
              </p>
            </div>
          )}
        </div>

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
                border: '1px dashed #d0d5dd',
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
                      border: '1px solid #eaecf0',
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
