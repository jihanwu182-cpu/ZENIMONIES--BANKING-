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

  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(
      'zenimonies_electricity_verification'
    );

    if (!saved) {
      navigate('/electricity');
      return;
    }

    try {
      const parsed: VerificationData = JSON.parse(saved);

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

  const handleConfirmPayment = async () => {
    if (!data || loading) {
      return;
    }

    const token = localStorage.getItem('zenimonies_token');

    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      /*
       * IMPORTANT:
       * The Sogo secret key is NOT used here.
       *
       * The frontend talks to our Zenimonies backend.
       * The backend securely talks to Sogo.
       */

      const response = await axios.post(
        `${API_URL}/api/bills/electricity/pay`,
        {
          provider: data.provider_code,
          meter_number: data.meter_number,
          meter_type: data.meter_type,
          amount: Number(data.amount),
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

      /*
       * Save the payment result locally so the next screen
       * can display the receipt/token.
       */
      localStorage.setItem(
        'zenimonies_electricity_payment',
        JSON.stringify({
          ...data,
          payment: paymentData,
          paid_at: new Date().toISOString(),
        })
      );

      /*
       * Go to success/receipt page.
       */
      navigate('/electricity/success');
    } catch (err: any) {
      console.error(
        'Electricity payment error:',
        err
      );

      /*
       * If the backend says the transaction is processing,
       * do NOT tell the customer to immediately pay again.
       *
       * This protects against duplicate payments.
       */
      const backendData = err?.response?.data;

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
      {/* =====================================================
          HEADER
      ====================================================== */}
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
        {/* =====================================================
            SECURITY / REVIEW NOTICE
        ====================================================== */}
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

        {/* =====================================================
            PROVIDER
        ====================================================== */}
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

        {/* =====================================================
            CUSTOMER DETAILS
        ====================================================== */}
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
            <div
              style={{
                color: '#737b78',
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 7,
              }}
            >
              CUSTOMER NAME
            </div>

            <div
              style={{
                fontSize: 21,
                fontWeight: 800,
                color: '#111827',
              }}
            >
              {data.customer_name}
            </div>
          </div>

          <div
            style={{
              padding: '18px 16px',
              borderBottom: '1px solid #eeeeee',
            }}
          >
            <div
              style={{
                color: '#737b78',
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 7,
              }}
            >
              {data.meter_type === 'prepaid'
                ? 'METER NUMBER'
                : 'METER / ACCOUNT NUMBER'}
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#111827',
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
            <div
              style={{
                color: '#737b78',
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 7,
              }}
            >
              METER TYPE
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 800,
                color: '#111827',
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
              <div
                style={{
                  color: '#737b78',
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 7,
                }}
              >
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

        {/* =====================================================
            PAYMENT AMOUNT
        ====================================================== */}
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

        {/* =====================================================
            ERROR
        ====================================================== */}
        {error && (
          <div
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

        {/* =====================================================
            CONFIRM & PAY
        ====================================================== */}
        <button
          type="button"
          onClick={handleConfirmPayment}
          disabled={loading}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 16,
            padding: '18px 16px',
            background: loading
              ? '#83ad9e'
              : '#087f5b',
            color: '#ffffff',
            fontSize: 17,
            fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading
              ? 'none'
              : '0 5px 14px rgba(8,127,91,0.20)',
          }}
        >
          {loading
            ? 'Processing Payment...'
            : 'Confirm & Pay'}
        </button>

        {/* =====================================================
            CANCEL
        ====================================================== */}
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
            padding: '16px',
            marginTop: 5,
            color: '#555f5b',
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Go Back
        </button>

        {/* =====================================================
            SECURITY NOTE
        ====================================================== */}
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

export default ElectricityPaymentConfirmation;
