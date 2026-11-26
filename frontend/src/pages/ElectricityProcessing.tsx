
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const ElectricityProcessing: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const submittedRef = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (submittedRef.current) return;

    const verification = location.state?.verification;
    const transactionPin = location.state?.transactionPin;
    const token = location.state?.token;

    if (!verification || !transactionPin || !token) {
      navigate('/electricity', { replace: true });
      return;
    }

    submittedRef.current = true;

    const submitPayment = async () => {
      try {
        const response = await axios.post(
          `${API_URL}/api/bills/electricity/pay`,
          {
            provider: verification.provider_code,
            meter_number: verification.meter_number,
            meter_type: verification.meter_type,
            amount: Number(verification.amount),
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

        const paymentData =
          response?.data?.data ||
          response?.data?.payment ||
          response?.data ||
          {};

        const paymentStatus = String(
          paymentData.status || ''
        ).toLowerCase();

        const reference =
          paymentData.reference ||
          paymentData.transaction_reference;

        const transaction = {
          ...paymentData,
          reference,
          transaction_reference: reference,
          type: 'electricity_payment',
          transaction_type: 'electricity_payment',
          description: `Electricity - ${verification.provider_name}`,
          amount: Number(verification.amount),
          status:
            response.status === 202 ||
            paymentStatus === 'pending' ||
            paymentStatus === 'processing'
              ? 'processing'
              : paymentStatus || 'completed',
          currency: 'NGN',
          electricity_provider: verification.provider_name,
          meter_number: verification.meter_number,
          meter_type: verification.meter_type,
          customer_name: verification.customer_name,
        };

        localStorage.setItem(
          'zenimonies_electricity_payment',
          JSON.stringify({
            ...verification,
            payment: paymentData,
            paid_at: new Date().toISOString(),
          })
        );

        navigate('/electricity/success', {
          replace: true,
          state: { transaction },
        });
      } catch (err: any) {
        console.error('Electricity payment error:', err);

        const backendData = err?.response?.data;

        const pendingData =
          backendData?.data ||
          backendData?.payment ||
          backendData;

        const backendStatus = String(
          pendingData?.status || ''
        ).toLowerCase();

        // An uncertain response must not trigger another purchase.
        if (
          backendStatus === 'processing' ||
          backendStatus === 'pending'
        ) {
          const reference =
            pendingData?.reference ||
            pendingData?.transaction_reference;

          const transaction = {
            ...pendingData,
            reference,
            transaction_reference: reference,
            type: 'electricity_payment',
            transaction_type: 'electricity_payment',
            description: `Electricity - ${verification.provider_name}`,
            amount: Number(verification.amount),
            status: 'processing',
            currency: 'NGN',
            electricity_provider: verification.provider_name,
            meter_number: verification.meter_number,
            meter_type: verification.meter_type,
            customer_name: verification.customer_name,
          };

          localStorage.setItem(
            'zenimonies_electricity_payment',
            JSON.stringify({
              ...verification,
              payment: pendingData,
              paid_at: new Date().toISOString(),
            })
          );

          navigate('/electricity/success', {
            replace: true,
            state: { transaction },
          });

          return;
        }

        setError(
          backendData?.message ||
          backendData?.error ||
          'We could not confirm the payment response. Please do not submit another payment. Contact support to verify the transaction.'
        );
      }
    };

    submitPayment();
  }, [location.state, navigate]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        minHeight: '100vh',
        minHeight: '100dvh',
        background: '#f5faf7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
        zIndex: 99999,
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      }}
    >
      <style>
        {`
          @keyframes electricitySpin {
            to { transform: rotate(360deg); }
          }

          .electricity-spinner {
            animation: electricitySpin 1.2s linear infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .electricity-spinner {
              animation: none;
            }
          }
        `}
      </style>

      <div
        style={{
          width: '100%',
          maxWidth: 440,
          background: '#ffffff',
          border: '1px solid #e2eee7',
          borderRadius: 26,
          padding: '42px 25px',
          boxSizing: 'border-box',
          textAlign: 'center',
          boxShadow: '0 15px 45px rgba(12,90,52,0.08)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 11,
            marginBottom: 42,
          }}
        >
          <div
            style={{
              width: 43,
              height: 43,
              borderRadius: 13,
              background: 'linear-gradient(135deg,#079447,#006c38)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 900,
            }}
          >
            Z
          </div>

          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                color: '#075c37',
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              ZENIMONIES
            </div>
            <div
              style={{
                color: '#91a49a',
                fontSize: 9,
                letterSpacing: 2,
              }}
            >
              DIGITAL BANKING
            </div>
          </div>
        </div>

        {error ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 20 }}>
              ⚠️
            </div>

            <h1 style={{ color: '#123d2d', fontSize: 23 }}>
              Payment response uncertain
            </h1>

            <p
              style={{
                color: '#728078',
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              {error}
            </p>

            <p
              style={{
                color: '#b42318',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              Please do not make this payment again until its
              status has been checked.
            </p>

            <button
              type="button"
              onClick={() => navigate('/transactions')}
              style={{
                width: '100%',
                padding: 15,
                marginTop: 18,
                border: 'none',
                borderRadius: 13,
                background: '#087f5b',
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              View Transactions
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                width: 116,
                height: 116,
                margin: '0 auto 32px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="electricity-spinner"
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '5px solid #e4f2e9',
                  borderTopColor: '#079447',
                  borderRightColor: '#079447',
                }}
              />

              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: '50%',
                  background: '#eaf8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 37,
                }}
              >
                ⚡
              </div>
            </div>

            <h1
              style={{
                color: '#123d2d',
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.3,
                margin: '0 0 15px',
              }}
            >
              Processing your electricity payment
            </h1>

            <p
              style={{
                color: '#728078',
                fontSize: 14,
                lineHeight: 1.7,
                marginBottom: 27,
              }}
            >
              We are securely submitting your payment and
              waiting for confirmation from the electricity
              provider.
            </p>

            <div
              style={{
                background: '#effaf4',
                border: '1px solid #d5efdf',
                borderRadius: 15,
                padding: 16,
                textAlign: 'left',
                display: 'flex',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 21 }}>🔒</span>
              <div>
                <div
                  style={{
                    color: '#075c37',
                    fontSize: 13,
                    fontWeight: 900,
                    marginBottom: 5,
                  }}
                >
                  Please do not close this page
                </div>
                <div
                  style={{
                    color: '#527264',
                    fontSize: 12,
                    lineHeight: 1.6,
                  }}
                >
                  Do not submit another payment. Your
                  transaction is being processed.
                </div>
              </div>
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 27,
            color: '#a0aaa4',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          ZENIMONIES • SECURE PAYMENTS
        </div>
      </div>
    </div>
  );
};

export default ElectricityProcessing;
