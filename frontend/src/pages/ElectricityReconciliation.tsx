import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

interface StorageStatus {
  localZenimonies: boolean;
  localToken: boolean;
  localAccessToken: boolean;
  sessionZenimonies: boolean;
  sessionToken: boolean;
  sessionAccessToken: boolean;
}

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
  created_at?: string;
  completed_at?: string;
}

const getStorageStatus = (): StorageStatus => ({
  localZenimonies: Boolean(
    localStorage.getItem('zenimonies_token')
  ),
  localToken: Boolean(
    localStorage.getItem('token')
  ),
  localAccessToken: Boolean(
    localStorage.getItem('access_token')
  ),
  sessionZenimonies: Boolean(
    sessionStorage.getItem('zenimonies_token')
  ),
  sessionToken: Boolean(
    sessionStorage.getItem('token')
  ),
  sessionAccessToken: Boolean(
    sessionStorage.getItem('access_token')
  ),
});

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

const ElectricityReconciliation: React.FC = () => {
  const [storage, setStorage] =
    useState<StorageStatus | null>(null);

  const [checking, setChecking] =
    useState(false);

  const [result, setResult] =
    useState('');

  const [payments, setPayments] =
    useState<ElectricityPayment[]>([]);

  const [apiCount, setApiCount] =
    useState<number | null>(null);

  const runDiagnostic = async () => {
    setChecking(true);
    setResult('');
    setPayments([]);
    setApiCount(null);

    const currentStorage =
      getStorageStatus();

    setStorage(currentStorage);

    const token = getToken();

    if (!token) {
      setResult(
        'NO TOKEN FOUND IN BROWSER STORAGE'
      );

      setChecking(false);
      return;
    }

    try {
      const response =
        await axios.get(
          `${API_URL}/api/bills/electricity/reconciliation`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
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

      const returnedCount =
        Number(
          response.data?.count ??
          returnedPayments.length
        );

      setApiCount(returnedCount);
      setPayments(returnedPayments);

      setResult(
        `TOKEN FOUND — API RESPONSE HTTP ${response.status}`
      );
    } catch (error: any) {
      console.error(
        'Reconciliation diagnostic API error:',
        error
      );

      const status =
        error?.response?.status;

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unknown error';

      if (status) {
        setResult(
          `TOKEN FOUND — API RETURNED HTTP ${status}: ${message}`
        );
      } else {
        setResult(
          `TOKEN FOUND — API REQUEST FAILED: ${message}`
        );
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const storageStatus = (
    value: boolean
  ) => value ? 'YES' : 'NO';

  const storageStyle = (
    value: boolean
  ): React.CSSProperties => ({
    fontWeight: 800,
    color: value
      ? '#087443'
      : '#b42318',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7f6',
        padding: '24px 16px 40px',
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

        <h1
          style={{
            marginTop: 0,
            color: '#172033',
          }}
        >
          Authentication Diagnostic
        </h1>

        <p
          style={{
            color: '#667085',
            lineHeight: 1.6,
          }}
        >
          This is a temporary read-only diagnostic.
          It does not make an electricity payment,
          debit your account, issue a refund, or
          change any transaction status.
        </p>

        {/* API RESULT */}

        {result && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: '#ffffff',
              border:
                '1px solid #d0d5dd',
              fontWeight: 700,
              color: '#172033',
              wordBreak: 'break-word',
            }}
          >
            {result}
          </div>
        )}

        {/* LOCAL STORAGE */}

        <div
          style={{
            marginTop: 20,
            background: '#ffffff',
            borderRadius: 14,
            padding: 20,
            boxShadow:
              '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: '#172033',
            }}
          >
            localStorage
          </h2>

          <p>
            zenimonies_token:{' '}
            <span
              style={storageStyle(
                storage?.localZenimonies ||
                  false
              )}
            >
              {storage
                ? storageStatus(
                    storage.localZenimonies
                  )
                : 'CHECKING...'}
            </span>
          </p>

          <p>
            token:{' '}
            <span
              style={storageStyle(
                storage?.localToken ||
                  false
              )}
            >
              {storage
                ? storageStatus(
                    storage.localToken
                  )
                : 'CHECKING...'}
            </span>
          </p>

          <p>
            access_token:{' '}
            <span
              style={storageStyle(
                storage?.localAccessToken ||
                  false
              )}
            >
              {storage
                ? storageStatus(
                    storage.localAccessToken
                  )
                : 'CHECKING...'}
            </span>
          </p>
        </div>

        {/* SESSION STORAGE */}

        <div
          style={{
            marginTop: 20,
            background: '#ffffff',
            borderRadius: 14,
            padding: 20,
            boxShadow:
              '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: '#172033',
            }}
          >
            sessionStorage
          </h2>

          <p>
            zenimonies_token:{' '}
            <span
              style={storageStyle(
                storage?.sessionZenimonies ||
                  false
              )}
            >
              {storage
                ? storageStatus(
                    storage.sessionZenimonies
                  )
                : 'CHECKING...'}
            </span>
          </p>

          <p>
            token:{' '}
            <span
              style={storageStyle(
                storage?.sessionToken ||
                  false
              )}
            >
              {storage
                ? storageStatus(
                    storage.sessionToken
                  )
                : 'CHECKING...'}
            </span>
          </p>

          <p>
            access_token:{' '}
            <span
              style={storageStyle(
                storage?.sessionAccessToken ||
                  false
              )}
            >
              {storage
                ? storageStatus(
                    storage.sessionAccessToken
                  )
                : 'CHECKING...'}
            </span>
          </p>
        </div>

        {/* ELECTRICITY RECONCILIATION */}

        <div
          style={{
            marginTop: 20,
            background: '#ffffff',
            borderRadius: 14,
            padding: 20,
            boxShadow:
              '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: '#172033',
            }}
          >
            Electricity reconciliation
          </h2>

          <p
            style={{
              margin: '0 0 6px',
              color: '#667085',
            }}
          >
            API records returned:{' '}
            <strong>
              {apiCount === null
                ? '—'
                : apiCount}
            </strong>
          </p>

          {payments.length === 0 ? (
            <div
              style={{
                marginTop: 16,
                padding: 16,
                borderRadius: 12,
                background: '#f8fafc',
                border:
                  '1px solid #e2e8f0',
                color: '#475467',
                lineHeight: 1.6,
              }}
            >
              The authenticated API returned no
              electricity payment records for this
              account.
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                display: 'grid',
                gap: 14,
              }}
            >
              {payments.map(
                (payment, index) => (
                  <div
                    key={
                      payment.id ||
                      payment.reference ||
                      index
                    }
                    style={{
                      border:
                        '1px solid #e4e7ec',
                      borderRadius: 14,
                      padding: 16,
                      background:
                        '#ffffff',
                    }}
                  >

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
                      <strong
                        style={{
                          color:
                            '#172033',
                        }}
                      >
                        {payment.biller_name ||
                          payment.category ||
                          'Electricity'}
                      </strong>

                      <span
                        style={{
                          padding:
                            '5px 9px',
                          borderRadius:
                            999,
                          background:
                            '#f2f4f7',
                          color:
                            '#344054',
                          fontSize: 12,
                          fontWeight: 800,
                        }}
                      >
                        {formatStatus(
                          payment.status
                        )}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: 'grid',
                        gap: 7,
                        color:
                          '#475467',
                        fontSize: 13,
                        lineHeight: 1.5,
                      }}
                    >

                      <div>
                        <strong>
                          Amount:
                        </strong>{' '}
                        {formatAmount(
                          payment.amount,
                          payment.currency
                        )}
                      </div>

                      <div>
                        <strong>
                          Meter:
                        </strong>{' '}
                        {payment.meter_number ||
                          payment.customer_reference ||
                          '—'}
                      </div>

                      <div>
                        <strong>
                          Meter type:
                        </strong>{' '}
                        {payment.meter_type ||
                          '—'}
                      </div>

                      <div>
                        <strong>
                          Reference:
                        </strong>{' '}
                        {payment.reference ||
                          '—'}
                      </div>

                      <div>
                        <strong>
                          Provider reference:
                        </strong>{' '}
                        {payment.provider_reference ||
                          '—'}
                      </div>

                      <div>
                        <strong>
                          Verification:
                        </strong>{' '}
                        {formatStatus(
                          payment.verification_status
                        )}
                      </div>

                      <div>
                        <strong>
                          Created:
                        </strong>{' '}
                        {formatDate(
                          payment.created_at
                        )}
                      </div>

                      {payment.electricity_token && (
                        <div>
                          <strong>
                            Electricity token:
                          </strong>{' '}
                          {payment.electricity_token}
                        </div>
                      )}

                      {payment.units && (
                        <div>
                          <strong>
                            Units:
                          </strong>{' '}
                          {payment.units}
                        </div>
                      )}

                      {payment.failure_reason && (
                        <div
                          style={{
                            color:
                              '#b42318',
                          }}
                        >
                          <strong>
                            Failure reason:
                          </strong>{' '}
                          {payment.failure_reason}
                        </div>
                      )}

                      {payment.provider_response_message && (
                        <div>
                          <strong>
                            Provider message:
                          </strong>{' '}
                          {payment.provider_response && (
  <Box sx={{ mt: 2 }}>
    <Typography
      variant="subtitle2"
      sx={{ fontWeight: 700, mb: 1 }}
    >
      Provider response
    </Typography>

    <Box
      component="pre"
      sx={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: '12px',
        backgroundColor: '#f5f5f5',
        padding: 2,
        borderRadius: 2,
        overflowX: 'auto',
      }}
    >
      {JSON.stringify(payment.provider_response, null, 2)}
    </Box>
  </Box>
)}
                      

                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* REFRESH */}

        <button
          type="button"
          onClick={runDiagnostic}
          disabled={checking}
          style={{
            width: '100%',
            marginTop: 24,
            height: 54,
            border: 'none',
            borderRadius: 12,
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
            ? 'Checking...'
            : 'Run Diagnostic Again'}
        </button>

        {/* SECURITY NOTE */}

        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 10,
            background:
              '#fff7ed',
            border:
              '1px solid #fed7aa',
            color:
              '#9a3412',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Security note: this page intentionally
          shows only whether a token exists and
          safe transaction details. The actual
          authentication token is never displayed.
        </div>

      </div>
    </div>
  );
};

export default ElectricityReconciliation;
