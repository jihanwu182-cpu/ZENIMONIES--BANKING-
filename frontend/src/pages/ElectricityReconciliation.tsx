import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

interface ElectricityPayment {
  id: string;
  reference: string;
  biller_name: string;
  category: string;
  customer_reference: string;
  customer_name?: string;
  amount: string | number;
  currency: string;
  status: string;
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
  provider_response?: unknown;
  created_at?: string;
  completed_at?: string;
}

/* ============================================================
   TOKEN
   ============================================================ */

const getToken = (): string | null => {
  return (
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem(
      'token'
    ) ||
    localStorage.getItem(
      'access_token'
    ) ||
    sessionStorage.getItem(
      'zenimonies_token'
    ) ||
    sessionStorage.getItem(
      'token'
    ) ||
    sessionStorage.getItem(
      'access_token'
    )
  );
};

/* ============================================================
   ELECTRICITY RECONCILIATION
   ============================================================ */

const ElectricityReconciliation: React.FC =
  () => {
    const [
      payments,
      setPayments,
    ] = useState<ElectricityPayment[]>(
      []
    );

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      error,
      setError,
    ] = useState('');

    /* ========================================================
       LOAD PAYMENTS
    ======================================================== */

    const loadPayments =
      useCallback(async () => {
        setLoading(true);
        setError('');

        try {
          /*
           * Use EXACTLY the same token
           * storage order as Dashboard.
           */
          const token =
            getToken();

          if (!token) {
            console.error(
              'ZENIMONIES RECONCILIATION: token not found'
            );

            setError(
              'Your secure login session could not be found. Please sign in again.'
            );

            return;
          }

          console.log(
            'ZENIMONIES RECONCILIATION: token found'
          );

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

          /*
           * Successful response.
           */
          if (
            response.data?.success ===
            true
          ) {
            setPayments(
              response.data.payments ||
                []
            );

            return;
          }

          setError(
            response.data?.message ||
              'Unable to load electricity reconciliation data.'
          );
        } catch (err: any) {
          console.error(
            'ZENIMONIES RECONCILIATION ERROR:',
            err
          );

          /*
           * Authentication error.
           */
          if (
            err?.response?.status ===
            401
          ) {
            const code =
              err?.response?.data?.code;

            if (
              code ===
              'SESSION_EXPIRED'
            ) {
              setError(
                'Your account session has expired. Please unlock your account to continue.'
              );

              return;
            }

            setError(
              err?.response?.data?.message ||
                'Your secure login session is no longer valid. Please sign in again.'
            );

            return;
          }

          /*
           * Server error.
           */
          if (
            err?.response
          ) {
            setError(
              err?.response?.data?.message ||
                `Server error: HTTP ${err.response.status}`
            );

            return;
          }

          /*
           * Network error.
           */
          setError(
            'Unable to reach the Zenimonies server. Please try again.'
          );
        } finally {
          setLoading(false);
        }
      }, []);

    /* ========================================================
       INITIAL LOAD
    ======================================================== */

    useEffect(() => {
      loadPayments();
    }, [
      loadPayments,
    ]);

    /* ========================================================
       FORMAT AMOUNT
    ======================================================== */

    const formatAmount =
      (
        amount: string | number,
        currency: string
      ) => {
        try {
          return new Intl.NumberFormat(
            'en-NG',
            {
              style:
                'currency',
              currency:
                currency ||
                'NGN',
            }
          ).format(
            Number(amount)
          );
        } catch {
          return `₦${Number(
            amount
          ).toLocaleString(
            'en-NG'
          )}`;
        }
      };

    /* ========================================================
       FORMAT DATE
    ======================================================== */

    const formatDate =
      (
        value?: string
      ) => {
        if (!value) {
          return '—';
        }

        const date =
          new Date(value);

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return '—';
        }

        return date.toLocaleString(
          'en-NG'
        );
      };

    /* ========================================================
       FORMAT PROVIDER RESPONSE
    ======================================================== */

    const formatJson =
      (
        value: unknown
      ) => {
        if (
          value ===
            null ||
          value ===
            undefined
        ) {
          return 'No provider response stored.';
        }

        try {
          return JSON.stringify(
            value,
            null,
            2
          );
        } catch {
          return String(value);
        }
      };

    /* ========================================================
       RENDER
    ======================================================== */

    return (
      <div
        style={{
          minHeight:
            '100vh',
          background:
            '#f5f5f5',
          padding:
            '20px',
          boxSizing:
            'border-box',
        }}
      >
        <div
          style={{
            maxWidth:
              '900px',
            margin:
              '0 auto',
          }}
        >
          <h1>
            Electricity Reconciliation
          </h1>

          <p>
            Read-only diagnostic
            screen. No payment,
            debit, refund, or
            status change is
            performed here.
          </p>

          <button
            type="button"
            onClick={
              loadPayments
            }
            disabled={
              loading
            }
            style={{
              padding:
                '10px 16px',
              marginBottom:
                '20px',
              cursor:
                loading
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {loading
              ? 'Loading...'
              : 'Refresh'}
          </button>

          {error && (
            <div
              style={{
                background:
                  '#ffebee',
                border:
                  '1px solid #ef9a9a',
                padding:
                  '15px',
                marginBottom:
                  '20px',
                borderRadius:
                  '8px',
                color:
                  '#b71c1c',
              }}
            >
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            payments.length ===
              0 && (
              <div
                style={{
                  background:
                    '#fff',
                  padding:
                    '20px',
                  borderRadius:
                    '8px',
                }}
              >
                No electricity
                payments were
                found.
              </div>
            )}

          {payments.map(
            (
              payment
            ) => (
              <div
                key={
                  payment.id
                }
                style={{
                  background:
                    '#fff',
                  borderRadius:
                    '10px',
                  padding:
                    '20px',
                  marginBottom:
                    '20px',
                  boxShadow:
                    '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                <h2>
                  {
                    payment.biller_name
                  }
                </h2>

                <p>
                  <strong>
                    Reference:
                  </strong>{' '}
                  {
                    payment.reference
                  }
                </p>

                <p>
                  <strong>
                    Amount:
                  </strong>{' '}
                  {formatAmount(
                    payment.amount,
                    payment.currency
                  )}
                </p>

                <p>
                  <strong>
                    Status:
                  </strong>{' '}
                  {
                    payment.status
                  }
                </p>

                <p>
                  <strong>
                    Meter type:
                  </strong>{' '}
                  {
                    payment.meter_type ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Meter number:
                  </strong>{' '}
                  {
                    payment.meter_number ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Provider reference:
                  </strong>{' '}
                  {
                    payment.provider_reference ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Sogo request ID:
                  </strong>{' '}
                  {
                    payment.provider_request_id ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Verification
                    status:
                  </strong>{' '}
                  {
                    payment.verification_status ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Customer:
                  </strong>{' '}
                  {
                    payment.verified_customer_name ||
                    payment.customer_name ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Address:
                  </strong>{' '}
                  {
                    payment.verified_customer_address ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Units:
                  </strong>{' '}
                  {
                    payment.units ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Tariff class:
                  </strong>{' '}
                  {
                    payment.tariff_class ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Electricity token:
                  </strong>{' '}
                  {
                    payment.electricity_token ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Provider message:
                  </strong>{' '}
                  {
                    payment.provider_response_message ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Failure reason:
                  </strong>{' '}
                  {
                    payment.failure_reason ||
                    '—'
                  }
                </p>

                <p>
                  <strong>
                    Created:
                  </strong>{' '}
                  {formatDate(
                    payment.created_at
                  )}
                </p>

                <p>
                  <strong>
                    Completed:
                  </strong>{' '}
                  {formatDate(
                    payment.completed_at
                  )}
                </p>

                <h3>
                  Stored Sogo
                  Response
                </h3>

                <pre
                  style={{
                    background:
                      '#111',
                    color:
                      '#fff',
                    padding:
                      '15px',
                    borderRadius:
                      '8px',
                    overflowX:
                      'auto',
                    whiteSpace:
                      'pre-wrap',
                    wordBreak:
                      'break-word',
                  }}
                >
                  {formatJson(
                    payment.provider_response
                  )}
                </pre>
              </div>
            )
          )}
        </div>
      </div>
    );
  };

export default ElectricityReconciliation;
