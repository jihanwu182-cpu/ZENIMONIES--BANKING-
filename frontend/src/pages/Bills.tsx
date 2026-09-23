import React from 'react';
import { useNavigate } from 'react-router-dom';

type BillOption = {
  title: string;
  description: string;
  icon: string;
  path: string;
};

const BILL_OPTIONS: BillOption[] = [
  {
    title: 'Electricity',
    description: 'Pay prepaid and postpaid electricity bills',
    icon: '⚡',
    path: '/electricity',
  },
  {
    title: 'TV Subscription',
    description: 'Pay your cable and TV subscriptions',
    icon: '📺',
    path: '/bills/tv',
  },
  {
    title: 'Internet',
    description: 'Pay internet and broadband bills',
    icon: '🌐',
    path: '/bills/internet',
  },
  {
    title: 'Other Bills',
    description: 'Pay other supported bills and services',
    icon: '🧾',
    path: '/bills/other',
  },
];

const Bills: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f4faf7',
        color: '#073b2a',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '22px 20px 18px',
          background: '#ffffff',
          borderBottom: '1px solid #e3eee9',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            position: 'absolute',
            left: 20,
            border: 'none',
            background: 'transparent',
            color: '#073b2a',
            fontSize: 36,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
          }}
          aria-label="Go back"
        >
          ‹
        </button>

        {/* Title */}
        <h1
          style={{
            margin: 0,
            fontSize: 28,
            fontWeight: 800,
            color: '#073b2a',
          }}
        >
          Bills
        </h1>
      </div>

      {/* Main content */}
      <main
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '28px 18px',
        }}
      >
        <div
          style={{
            marginBottom: 22,
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 1,
              color: '#6d8078',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Payments
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.15,
              fontWeight: 850,
              color: '#073b2a',
            }}
          >
            Pay Your Bills
          </h2>

          <p
            style={{
              margin: '10px 0 0',
              fontSize: 16,
              lineHeight: 1.5,
              color: '#687b74',
            }}
          >
            Select a bill or service you want to pay.
          </p>
        </div>

        {/* Bill options */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #dcebe5',
            borderRadius: 28,
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(7, 59, 42, 0.06)',
          }}
        >
          {BILL_OPTIONS.map((bill, index) => (
            <button
              key={bill.title}
              type="button"
              onClick={() => navigate(bill.path)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '20px 18px',
                background: '#ffffff',
                border: 'none',
                borderBottom:
                  index === BILL_OPTIONS.length - 1
                    ? 'none'
                    : '1px solid #e7efeb',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 58,
                  height: 58,
                  minWidth: 58,
                  borderRadius: 18,
                  background: '#e8f6ef',
                  border: '1px solid #d5eee2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                }}
              >
                {bill.icon}
              </div>

              {/* Text */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: '#087b48',
                    marginBottom: 5,
                  }}
                >
                  {bill.title}
                </div>

                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.4,
                    color: '#70827b',
                  }}
                >
                  {bill.description}
                </div>
              </div>

              {/* Arrow */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  minWidth: 34,
                  borderRadius: '50%',
                  background: '#f0f7f4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#087b48',
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                ›
              </div>
            </button>
          ))}
        </div>

        {/* Security notice */}
        <div
          style={{
            marginTop: 20,
            padding: '16px 18px',
            background: '#eaf7f0',
            border: '1px solid #d5eee2',
            borderRadius: 18,
            color: '#356b57',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          🔒 Payments are processed securely through Zenimonies. Always verify
          your bill details before confirming a payment.
        </div>
      </main>
    </div>
  );
};

export default Bills;
