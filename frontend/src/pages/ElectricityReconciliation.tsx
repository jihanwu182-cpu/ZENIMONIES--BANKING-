import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

interface ElectricityPayment {
  id?: string;
  reference?: string;
  biller_name?: string;
  category?: string;
  customer_reference?: string;
  customer_name?: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  provider_reference?: string;
  provider_request_id?: string;
  failure_reason?: string;
  meter_type?: string;
  meter_number?: string;
  verification_status?: string;
  verified_customer_name?: string;
  verified_customer_address?: string;
  electricity_token?: string;
  units?: string;
  tariff_class?: string;
  provider_response_message?: string;
  provider_message?: string;
  provider_response?: unknown;
  created_at?: string;
  completed_at?: string;
}

const getToken = (): string | null => {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('zenimonies_token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('access_token')
  );
};

const formatAmount = (
  amount: string | number | undefined,
  currency = 'NGN'
) => {
  const value = Number(amount || 0);

  if (currency.toUpperCase() === 'NGN') {
    return `₦${value.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `${currency.toUpperCase()} ${value.toLocaleString(
    'en-NG',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatDate = (value?: string) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-NG', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatStatus = (status?: string) => {
  if (!status) return 'Unknown';

  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter =>
      letter.toUpperCase()
    );
};

const getStatusColor = (status?: string) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'completed') {
    return {
      background: '#e8f7ef',
      color: '#087443',
    };
  }

  if (
    normalized === 'processing' ||
    normalized === 'pending'
  ) {
    return {
      background: '#fff7e6',
      color: '#9a6700',
    };
  }

  if (
    normalized === 'failed' ||
    normalized === 'cancelled' ||
    normalized === 'refunded'
  ) {
    return {
      background: '#fef0ef',
      color: '#b42318',
    };
  }

  return {
    background: '#f2f4f7',
    color: '#344054',
  };
};

const getVerificationColor = (
  status?: string
) => {
  const normalized = String(status || '').toLowerCase();

  if (
    normalized === 'verified' ||
    normalized === 'successful' ||
    normalized === 'completed'
  ) {
    return {
      background: '#e8f7ef',
      color: '#087443',
    };
  }

  if (
    normalized === 'pending' ||
    normalized === 'not_verified'
  ) {
    return {
      background: '#fff7e6',
      color: '#9a6700',
    };
  }

  return {
    background: '#f2f4f7',
    color: '#475467',
  };
};

const ElectricityReconciliation: React.FC = () => {
  const [checking, setChecking] =
    useState(false);

  const [error, setError] =
    useState('');

  const [payments, setPayments] =
    useState<ElectricityPayment[]>([]);

  const [apiCount, setApiCount] =
    useState<number | null>(null);

  const loadPayments = async () => {
    setChecking(true);
    setError('');

    const token = getToken();

    if (!token) {
      setError(
        'Your session has expired. Please sign in again.'
      );

      setPayments([]);
      setApiCount(null);
      setChecking(false);
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/api/bills/electricity/reconciliation`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const returnedPayments =
        Array.isArray(
          response.data?.payments
        )
          ? response.data.payments
          : [];

      const returnedCount = Number(
        response.data?.count ??
          returnedPayments.length
      );

      setPayments(returnedPayments);
      setApiCount(returnedCount);
    } catch (requestError: any) {
      console.error(
        'Electricity history error:',
        requestError
      );

      const status =
        requestError?.response?.status;

      if (status === 401) {
        setError(
          'Your session has expired. Please sign in again.'
        );
      } else if (status === 403) {
        setError(
          'You are not authorized to view this history.'
        );
      } else {
        setError(
          requestError?.response?.data?.message ||
            'Unable to load electricity payment history. Please try again.'
        );
      }

      setPayments([]);
      setApiCount(null);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7f6',
        padding: '20px 16px 40px',
        boxSizing: 'border-box',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              border: '1px solid #d0d5dd',
              background: '#ffffff',
              color: '#172033',
              fontSize: 22,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Go back"
          >
            ‹
          </button>

          <div>
            <h1
              style={{
                margin: 0,
                color: '#172033',
                fontSize: 25,
                fontWeight: 800,
              }}
            >
              Electricity Payment History
            </h1>

            <p
              style={{
                margin:
                  '5px 0 0',
                color: '#667085',
                fontSize: 14,
              }}
            >
              View your electricity payment
              transactions
            </p>
          </div>
        </div>

        {/* SUMMARY */}

        <div
          style={{
            background: '#159447',
            borderRadius: 18,
            padding: 20,
            color: '#ffffff',
            marginBottom: 18,
            boxShadow:
              '0 5px 16px rgba(21,148,71,0.18)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              opacity: 0.9,
              marginBottom: 6,
            }}
          >
            ELECTRICITY PAYMENTS
          </div>

          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
            }}
          >
            {apiCount === null
              ? '—'
              : apiCount}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 14,
              opacity: 0.9,
            }}
          >
            Total records
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div
            style={{
              marginBottom: 18,
              padding: 16,
              borderRadius: 14,
              background: '#fef0ef',
              border:
                '1px solid #fecdca',
              color: '#b42318',
              lineHeight: 1.5,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* EMPTY STATE */}

        {!checking &&
          !error &&
          payments.length === 0 && (
            <div
              style={{
                background: '#ffffff',
                borderRadius: 16,
                padding: 30,
                textAlign: 'center',
                boxShadow:
                  '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  margin: '0 auto 14px',
                  borderRadius: '50%',
                  background: '#e8f7ef',
                  color: '#159447',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 27,
                  fontWeight: 800,
                }}
              >
                ₦
              </div>

              <h2
                style={{
                  margin:
                    '0 0 8px',
                  color: '#172033',
                  fontSize: 20,
                }}
              >
                No electricity payments yet
              </h2>

              <p
                style={{
                  margin: 0,
                  color: '#667085',
                  lineHeight: 1.6,
                  fontSize: 14,
                }}
              >
                Your electricity payment
                transactions will appear here
                after you make a payment.
              </p>
            </div>
          )}

        {/* PAYMENT LIST */}

        <div
          style={{
            display: 'grid',
            gap: 16,
          }}
        >
          {payments.map(
            (payment, index) => {
              const statusStyle =
                getStatusColor(
                  payment.status
                );

              const verificationStyle =
                getVerificationColor(
                  payment.verification_status
                );

              const provider =
                payment.biller_name ||
                'Electricity';

              const customerName =
                payment.verified_customer_name ||
                payment.customer_name ||
                '—';

              const customerAddress =
                payment.verified_customer_address ||
                '—';

              const providerMessage =
                payment.provider_message ||
                payment.provider_response_message ||
                '';

              return (
                <div
                  key={
                    payment.id ||
                    payment.reference ||
                    index
                  }
                  style={{
                    background: '#ffffff',
                    borderRadius: 18,
                    padding: 18,
                    boxShadow:
                      '0 2px 10px rgba(0,0,0,0.05)',
                    border:
                      '1px solid #eaecf0',
                  }}
                >
                  {/* CARD HEADER */}

                  <div
                    style={{
                      display: 'flex',
                      justifyContent:
                        'space-between',
                      alignItems:
                        'flex-start',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color:
                            '#172033',
                          fontSize: 17,
                          fontWeight: 800,
                        }}
                      >
                        {provider}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          color:
                            '#667085',
                          fontSize: 13,
                        }}
                      >
                        {formatDate(
                          payment.created_at
                        )}
                      </div>
                    </div>

                    <span
                      style={{
                        padding:
                          '6px 10px',
                        borderRadius:
                          999,
                        background:
                          statusStyle.background,
                        color:
                          statusStyle.color,
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace:
                          'nowrap',
                      }}
                    >
                      {formatStatus(
                        payment.status
                      )}
                    </span>
                  </div>

                  {/* AMOUNT */}

                  <div
                    style={{
                      marginTop: 18,
                      padding: 16,
                      borderRadius: 14,
                      background:
                        '#f5fbf7',
                      border:
                        '1px solid #d9f0e1',
                    }}
                  >
                    <div
                      style={{
                        color:
                          '#667085',
                        fontSize: 12,
                        fontWeight: 700,
                        marginBottom: 5,
                      }}
                    >
                      AMOUNT
                    </div>

                    <div
                      style={{
                        color:
                          '#087443',
                        fontSize: 25,
                        fontWeight: 800,
                      }}
                    >
                      {formatAmount(
                        payment.amount,
                        payment.currency
                      )}
                    </div>
                  </div>

                  {/* DETAILS */}

                  <div
                    style={{
                      marginTop: 18,
                      display: 'grid',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color:
                            '#98a2b3',
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Meter number
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          color:
                            '#172033',
                          fontSize: 14,
                          fontWeight: 700,
                        }}
                      >
                        {payment.meter_number ||
                          payment.customer_reference ||
                          '—'}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          color:
                            '#98a2b3',
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Meter type
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          color:
                            '#172033',
                          fontSize: 14,
                          fontWeight: 700,
                          textTransform:
                            'capitalize',
                        }}
                      >
                        {payment.meter_type ||
                          '—'}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          color:
                            '#98a2b3',
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Customer name
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          color:
                            '#172033',
                          fontSize: 14,
                        }}
                      >
                        {customerName}
                      </div>
                    </div>

                    {customerAddress !==
                      '—' && (
                      <div>
                        <div
                          style={{
                            color:
                              '#98a2b3',
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform:
                              'uppercase',
                          }}
                        >
                          Address
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            color:
                              '#172033',
                            fontSize: 14,
                            lineHeight: 1.5,
                          }}
                        >
                          {customerAddress}
                        </div>
                      </div>
                    )}

                    <div>
                      <div
                        style={{
                          color:
                            '#98a2b3',
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Verification
                      </div>

                      <div
                        style={{
                          marginTop: 5,
                        }}
                      >
                        <span
                          style={{
                            display:
                              'inline-block',
                            padding:
                              '5px 9px',
                            borderRadius:
                              999,
                            background:
                              verificationStyle.background,
                            color:
                              verificationStyle.color,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {formatStatus(
                            payment.verification_status
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* TOKEN */}

                  {payment.electricity_token && (
                    <div
                      style={{
                        marginTop: 18,
                        padding: 16,
                        borderRadius: 14,
                        background:
                          '#e8f7ef',
                        border:
                          '1px solid #b7e4c7',
                      }}
                    >
                      <div
                        style={{
                          color:
                            '#087443',
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform:
                            'uppercase',
                          marginBottom: 6,
                        }}
                      >
                        Electricity token
                      </div>

                      <div
                        style={{
                          color:
                            '#172033',
                          fontSize: 20,
                          fontWeight: 900,
                          letterSpacing:
                            1.2,
                          wordBreak:
                            'break-word',
                        }}
                      >
                        {
                          payment.electricity_token
                        }
                      </div>

                      {payment.units && (
                        <div
                          style={{
                            marginTop: 8,
                            color:
                              '#087443',
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          Units:{' '}
                          {payment.units}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PROVIDER MESSAGE */}

                  {providerMessage && (
                    <div
                      style={{
                        marginTop: 18,
                        padding: 14,
                        borderRadius: 12,
                        background:
                          '#f8fafc',
                        border:
                          '1px solid #e4e7ec',
                        color:
                          '#475467',
                        fontSize: 13,
                        lineHeight: 1.55,
                      }}
                    >
                      <strong
                        style={{
                          color:
                            '#172033',
                        }}
                      >
                        Provider message:
                      </strong>{' '}
                      {providerMessage}
                    </div>
                  )}

                  {/* FAILURE */}

                  {payment.failure_reason && (
                    <div
                      style={{
                        marginTop: 18,
                        padding: 14,
                        borderRadius: 12,
                        background:
                          '#fef0ef',
                        border:
                          '1px solid #fecdca',
                        color:
                          '#b42318',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>
                        Failure reason:
                      </strong>{' '}
                      {
                        payment.failure_reason
                      }
                    </div>
                  )}

                  {/* PROCESSING MESSAGE */}

                  {String(
                    payment.status || ''
                  ).toLowerCase() ===
                    'processing' && (
                    <div
                      style={{
                        marginTop: 18,
                        padding: 14,
                        borderRadius: 12,
                        background:
                          '#fff7e6',
                        border:
                          '1px solid #f5d78e',
                        color:
                          '#7a5200',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>
                        Payment processing:
                      </strong>{' '}
                      Please do not make another
                      payment. Your transaction will
                      be updated when the provider
                      finishes processing it.
                    </div>
                  )}

                  {/* REFERENCES */}

                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 16,
                      borderTop:
                        '1px solid #eaecf0',
                      display: 'grid',
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color:
                            '#98a2b3',
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Transaction reference
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          color:
                            '#344054',
                          fontSize: 12,
                          wordBreak:
                            'break-all',
                        }}
                      >
                        {payment.reference ||
                          '—'}
                      </div>
                    </div>

                    <div>
                      <div
                        style={{
                          color:
                            '#98a2b3',
                          fontSize: 11,
                          fontWeight: 800,
                          textTransform:
                            'uppercase',
                        }}
                      >
                        Provider reference
                      </div>

                      <div
                        style={{
                          marginTop: 3,
                          color:
                            '#344054',
                          fontSize: 12,
                          wordBreak:
                            'break-all',
                        }}
                      >
                        {payment.provider_reference ||
                          '—'}
                      </div>
                    </div>

                    {payment.completed_at && (
                      <div>
                        <div
                          style={{
                            color:
                              '#98a2b3',
                            fontSize: 11,
                            fontWeight: 800,
                            textTransform:
                              'uppercase',
                          }}
                        >
                          Completed
                        </div>

                        <div
                          style={{
                            marginTop: 3,
                            color:
                              '#344054',
                            fontSize: 13,
                          }}
                        >
                          {formatDate(
                            payment.completed_at
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            }
          )}
        </div>

        {/* REFRESH */}

        <button
          type="button"
          onClick={loadPayments}
          disabled={checking}
          style={{
            width: '100%',
            marginTop: 22,
            height: 54,
            border: 'none',
            borderRadius: 14,
            background:
              checking
                ? '#98a2b3'
                : '#159447',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 800,
            cursor:
              checking
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {checking
            ? 'Refreshing...'
            : 'Refresh History'}
        </button>
      </div>
    </div>
  );
};

export default ElectricityReconciliation;
