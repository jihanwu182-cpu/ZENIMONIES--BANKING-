
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

type VerificationData = {
  provider_code: string;
  provider_name: string;
  shortName: string;
  logo: string;
  meter_type: 'prepaid' | 'postpaid';
  meter_number: string;
  customer_name: string;
  address?: string;
  amount: number;
  currency: string;
  verified: boolean;
};

type PaymentResponse = {
  reference?: string;
  provider_reference?: string;
  status?: string;
  type?: string;
  amount?: number;
  fee?: number;
  total?: number;
  token?: string;
  electricity_token?: string;
  units?: string;
  message?: string;
  [key: string]: any;
};

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const ElectricityPaymentConfirmation: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] =
    useState<VerificationData | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const [transactionPin, setTransactionPin] =
    useState('');

  const [showPin, setShowPin] =
    useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(
      'zenimonies_electricity_verification'
    );

    if (!saved) {
      navigate('/electricity');
      return;
    }

    try {
      const parsed: VerificationData =
        JSON.parse(saved);

      if (!parsed.verified) {
        navigate('/electricity');
        return;
      }

      setData(parsed);
    } catch (err) {
      console.error(
        'Unable to read electricity verification:',
        err
      );

      localStorage.removeItem(
        'zenimonies_electricity_verification'
      );

      navigate('/electricity');
    }
  }, [navigate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // ==========================================================
  // CONFIRM ELECTRICITY PAYMENT
  // ==========================================================

  const handleConfirmPayment = async () => {
    if (!data || loading) {
      return;
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      setError(
        'Enter your complete 4-digit Transaction PIN.'
      );
      return;
    }

    const token = localStorage.getItem(
      'zenimonies_token'
    );

    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_URL}/api/bills/electricity/pay`,
        {
          provider: data.provider_code,
          meter_number: data.meter_number,
          meter_type: data.meter_type,
          amount: Number(data.amount),

          // Required by transactionPinMiddleware
          transaction_pin: transactionPin,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      console.log(
        'Electricity payment response:',
        response.data
      );

      const paymentData: PaymentResponse =
        response?.data?.data ||
        response?.data?.payment ||
        response?.data ||
        {};

      // Handle pending transactions safely.
      if (
  response.status === 202 ||
  paymentData.status === 'processing' ||
  paymentData.status === 'pending'
) {
  setTransactionPin('');

  localStorage.setItem(
    'zenimonies_electricity_payment',
    JSON.stringify({
      ...data,
      payment: paymentData,
      paid_at: new Date().toISOString(),
    })
  );

  navigate('/electricity/success', {
    state: {
      transaction: {
        ...paymentData,
        reference: paymentData.reference,
        transaction_reference: paymentData.reference,
        type: 'electricity_payment',
        transaction_type: 'electricity_payment',
        description: `Electricity - ${data.provider_name}`,
        amount: Number(data.amount),
        status: 'processing',
        currency: 'NGN',
        electricity_provider: data.provider_name,
        meter_number: data.meter_number,
        meter_type: data.meter_type,
        customer_name: data.customer_name,
      },
    },
  });

  return;
}
        localStorage.setItem(
          'zenimonies_electricity_payment',
          JSON.stringify({
            ...data,
            payment: paymentData,
            paid_at: new Date().toISOString(),
          })
        );

        setError(
          'Your electricity payment is being processed. Please do not submit another payment.'
        );

        return;
      }

      localStorage.setItem(
        'zenimonies_electricity_payment',
        JSON.stringify({
          ...data,
          payment: paymentData,
          paid_at: new Date().toISOString(),
        })
      );

      // Clear PIN from component state after submission.
      setTransactionPin('');

      navigate('/electricity/success');

    } catch (err: any) {
      console.error(
        'Electricity payment error:',
        err
      );

      const backendData =
        err?.response?.data;

      const backendStatus =
        backendData?.data?.status ||
        backendData?.payment?.status ||
        backendData?.status;

      if (
        backendStatus === 'processing' ||
        backendStatus === 'pending'
      ) {
        setError(
          'Your electricity payment is being processed. Please do not submit the payment again.'
        );

        return;
      }

      // Transaction PIN errors from backend.
      const backendCode =
        backendData?.code;

      if (
        backendCode === 'INCORRECT_TRANSACTION_PIN'
      ) {
        setError(
          backendData?.message ||
          'Incorrect Transaction PIN. Please try again.'
        );

        setTransactionPin('');
        return;
      }

      if (
        backendCode === 'TRANSACTION_PIN_LOCKED'
      ) {
        setError(
          backendData?.message ||
          'Your Transaction PIN is temporarily locked. Please try again after 10 minutes.'
        );

        setTransactionPin('');
        return;
      }

      if (
        backendCode === 'TRANSACTION_PIN_NOT_SET'
      ) {
        setError(
          'You have not created a Transaction PIN. Please set up your Transaction PIN before making payments.'
        );

        setTransactionPin('');
        return;
      }

      if (
        backendCode === 'INVALID_TRANSACTION_PIN'
      ) {
        setError(
          backendData?.message ||
          'Enter a valid 4-digit Transaction PIN.'
        );

        setTransactionPin('');
        return;
      }

      const message =
        backendData?.message ||
        backendData?.error ||
        'Electricity payment could not be completed. Please try again.';

      setError(message);

    } finally {
      setLoading(false);
    }
  };

  if (!data) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f6f8f7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: '#555',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f8f7',
        paddingBottom: 40,
      }}
    >
      {/* HEADER */}

      <div
        style={{
          background: '#ffffff',
          padding: '18px 16px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #eeeeee',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={() =>
            navigate('/electricity/verification')
          }
          disabled={loading}
          style={{
            width: 42,
            height: 42,
            border: 'none',
            borderRadius: '50%',
            background: '#f2f4f3',
            fontSize: 25,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#111827',
          }}
        >
          ←
        </button>

        <h1
          style={{
            margin: '0 0 0 14px',
            fontSize: 21,
            fontWeight: 800,
            color: '#111827',
          }}
        >
          Confirm Payment
        </h1>
      </div>

      <div
        style={{
          padding: 16,
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        {/* VERIFIED NOTICE */}

        <div
          style={{
            background: '#eaf8f2',
            border: '1px solid #b8e4cf',
            borderRadius: 16,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#087f5b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              ✓
            </div>

            <div>
              <div
                style={{
                  color: '#075c43',
                  fontWeight: 800,
                  fontSize: 15,
                }}
              >
                Account Verified
              </div>

              <div
                style={{
                  color: '#39735f',
                  fontSize: 13,
                  marginTop: 3,
                  lineHeight: 1.4,
                }}
              >
                Review the payment details before confirming.
              </div>
            </div>
          </div>
        </div>

        {/* PROVIDER */}

        <div
          style={{
            background: '#ffffff',
            borderRadius: 18,
            padding: 18,
            marginBottom: 16,
            border: '1px solid #e7e9e8',
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: '#737b78',
              fontWeight: 800,
              letterSpacing: 0.5,
              marginBottom: 13,
            }}
          >
            ELECTRICITY PROVIDER
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 62,
                height: 62,
                borderRadius: 14,
                background: '#f4f6f5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              <img
                src={data.logo}
                alt={data.provider_name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  padding: 6,
                }}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: '#111827',
                }}
              >
                {data.provider_name}
              </div>

              <div
                style={{
                  marginTop: 5,
                  fontSize: 14,
                  color: '#6b7280',
                  fontWeight: 700,
                }}
              >
                {data.shortName}
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOMER DETAILS */}

        <div
          style={{
            background: '#ffffff',
            borderRadius: 18,
            overflow: 'hidden',
            marginBottom: 16,
            border: '1px solid #e7e9e8',
          }}
        >
          <div
            style={{
              padding: '18px 16px',
              borderBottom: '1px solid #eeeeee',
            }}
          >
            <div style={detailLabel}>
              CUSTOMER NAME
            </div>

            <div style={detailValue}>
              {data.customer_name}
            </div>
          </div>

          <div
            style={{
              padding: '18px 16px',
              borderBottom: '1px solid #eeeeee',
            }}
          >
            <div style={detailLabel}>
              {data.meter_type === 'prepaid'
                ? 'METER NUMBER'
                : 'METER / ACCOUNT NUMBER'}
            </div>

            <div
              style={{
                ...detailValue,
                letterSpacing: 0.4,
              }}
            >
              {data.meter_number}
            </div>
          </div>

          <div
            style={{
              padding: '18px 16px',
              borderBottom: data.address
                ? '1px solid #eeeeee'
                : 'none',
            }}
          >
            <div style={detailLabel}>
              METER TYPE
            </div>

            <div
              style={{
                ...detailValue,
                fontSize: 17,
                textTransform: 'capitalize',
              }}
            >
              {data.meter_type}
            </div>
          </div>

          {data.address && (
            <div
              style={{
                padding: '18px 16px',
              }}
            >
              <div style={detailLabel}>
                ADDRESS
              </div>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#374151',
                  lineHeight: 1.5,
                }}
              >
                {data.address}
              </div>
            </div>
          )}
        </div>

        {/* PAYMENT AMOUNT */}

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #66b991',
            borderRadius: 18,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              color: '#087f5b',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
          >
            PAYMENT AMOUNT
          </div>

          <div
            style={{
              color: '#087f5b',
              fontSize: 34,
              fontWeight: 900,
              marginTop: 6,
            }}
          >
            {formatCurrency(Number(data.amount))}
          </div>
        </div>

        {/* TRANSACTION PIN */}

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dce9e2',
            borderRadius: 18,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: '#e8f7ef',
                color: '#087f5b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              🔒
            </div>

            <div>
              <div
                style={{
                  color: '#123d2d',
                  fontSize: 16,
                  fontWeight: 850,
                }}
              >
                Transaction PIN
              </div>

              <div
                style={{
                  color: '#7b8982',
                  fontSize: 12,
                  marginTop: 3,
                }}
              >
                Enter your 4-digit PIN to authorize payment.
              </div>
            </div>
          </div>

          <label
            htmlFor="electricity-transaction-pin"
            style={{
              display: 'block',
              marginTop: 18,
              marginBottom: 9,
              color: '#344b40',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            ENTER TRANSACTION PIN
          </label>

          <div
            style={{
              position: 'relative',
            }}
          >
            <input
              id="electricity-transaction-pin"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={transactionPin}
              disabled={loading}
              placeholder="••••"
              onChange={(event) => {
                const digits =
                  event.target.value
                    .replace(/\D/g, '')
                    .slice(0, 4);

                setTransactionPin(digits);
                setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();

                  if (transactionPin.length === 4) {
                    handleConfirmPayment();
                  }
                }
              }}
              style={{
                boxSizing: 'border-box',
                width: '100%',
                height: 62,
                border: '1.5px solid #b8d9c8',
                borderRadius: 13,
                background: '#fbfefc',
                color: '#123d2d',
                fontSize: 25,
                fontWeight: 800,
                letterSpacing: 15,
                textAlign: 'center',
                outline: 'none',
                padding: '0 55px 0 15px',
              }}
            />

            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              disabled={loading}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                height: 38,
                padding: '0 10px',
                border: 'none',
                background: 'transparent',
                color: '#087f5b',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {showPin ? 'HIDE' : 'SHOW'}
            </button>
          </div>

          <div
            style={{
              marginTop: 10,
              color: '#829087',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            Your PIN is securely verified by Zenimonies.
            It is not saved on this device.
          </div>

          <div
            style={{
              display: 'flex',
              gap: 7,
              marginTop: 14,
            }}
          >
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 10,
                  background:
                    transactionPin.length > index
                      ? '#078b50'
                      : '#e6eee9',
                }}
              />
            ))}
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            style={{
              background: '#fff1f1',
              border: '1px solid #f2b8b8',
              color: '#b42318',
              borderRadius: 14,
              padding: 15,
              marginBottom: 16,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* CONFIRM & PAY */}

        <button
          type="button"
          onClick={handleConfirmPayment}
          disabled={
            loading ||
            transactionPin.length !== 4
          }
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 16,
            padding: '18px 16px',
            background:
              loading ||
              transactionPin.length !== 4
                ? '#9bb9aa'
                : '#087f5b',
            color: '#ffffff',
            fontSize: 17,
            fontWeight: 800,
            cursor:
              loading ||
              transactionPin.length !== 4
                ? 'not-allowed'
                : 'pointer',
            boxShadow:
              loading ||
              transactionPin.length !== 4
                ? 'none'
                : '0 5px 14px rgba(8,127,91,0.20)',
          }}
        >
          {loading
            ? 'Processing Payment...'
            : 'Confirm & Pay'}
        </button>

        {/* CANCEL */}

        <button
          type="button"
          onClick={() =>
            navigate('/electricity/verification')
          }
          disabled={loading}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            padding: 16,
            marginTop: 5,
            color: '#555f5b',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Go Back
        </button>

        {/* SECURITY NOTE */}

        <div
          style={{
            textAlign: 'center',
            color: '#8a938f',
            fontSize: 12,
            lineHeight: 1.5,
            marginTop: 12,
            padding: '0 15px',
          }}
        >
          Your payment is processed securely through
          Zenimonies. Do not close the page while your
          payment is being processed.
        </div>
      </div>
    </div>
  );
};

const detailLabel: React.CSSProperties = {
  color: '#737b78',
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 7,
};

const detailValue: React.CSSProperties = {
  fontSize: 21,
  fontWeight: 800,
  color: '#111827',
};

export default ElectricityPaymentConfirmation;
