
import React, { useEffect } from 'react';

const ElectricityProcessing: React.FC = () => {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100vh',
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
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes electricityPulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.06);
              opacity: 0.75;
            }
          }

          @keyframes electricityDots {
            0%, 20% {
              opacity: 0.2;
            }
            50% {
              opacity: 1;
            }
            100% {
              opacity: 0.2;
            }
          }

          .electricity-processing-spinner {
            animation: electricitySpin 1.2s linear infinite;
          }

          .electricity-processing-pulse {
            animation: electricityPulse 2s ease-in-out infinite;
          }

          .electricity-processing-dot {
            animation: electricityDots 1.4s infinite;
          }

          .electricity-processing-dot:nth-child(2) {
            animation-delay: 0.2s;
          }

          .electricity-processing-dot:nth-child(3) {
            animation-delay: 0.4s;
          }

          @media (prefers-reduced-motion: reduce) {
            .electricity-processing-spinner,
            .electricity-processing-pulse,
            .electricity-processing-dot {
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
          boxShadow: '0 15px 45px rgba(12, 90, 52, 0.08)',
        }}
      >
        {/* ZENIMONIES BRAND */}

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
              background: 'linear-gradient(135deg, #079447, #006c38)',
              color: '#ffffff',
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
                letterSpacing: -0.5,
              }}
            >
              ZENIMONIES
            </div>

            <div
              style={{
                color: '#91a49a',
                fontSize: 9,
                fontWeight: 800,
                letterSpacing: 2,
                marginTop: 2,
              }}
            >
              DIGITAL BANKING
            </div>
          </div>
        </div>

        {/* ANIMATED LOADER */}

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
            className="electricity-processing-spinner"
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
            className="electricity-processing-pulse"
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

        {/* PROCESSING MESSAGE */}

        <h1
          style={{
            color: '#123d2d',
            fontSize: 24,
            fontWeight: 900,
            lineHeight: 1.3,
            margin: '0 0 12px',
          }}
        >
          Processing your electricity payment
        </h1>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 5,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              color: '#079447',
              fontSize: 14,
              fontWeight: 800,
            }}
          >
            Please wait
          </span>

          {[0, 1, 2].map((item) => (
            <span
              key={item}
              className="electricity-processing-dot"
              style={{
                color: '#079447',
                fontSize: 17,
                fontWeight: 900,
              }}
            >
              .
            </span>
          ))}
        </div>

        <p
          style={{
            color: '#728078',
            fontSize: 14,
            lineHeight: 1.7,
            margin: '0 0 27px',
          }}
        >
          We are securely processing your payment and
          waiting for confirmation from the electricity
          provider.
        </p>

        {/* IMPORTANT NOTICE */}

        <div
          style={{
            background: '#effaf4',
            border: '1px solid #d5efdf',
            borderRadius: 15,
            padding: 16,
            textAlign: 'left',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
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
              transaction is being processed. We will
              display your payment result when confirmation
              is received.
            </div>
          </div>
        </div>

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
