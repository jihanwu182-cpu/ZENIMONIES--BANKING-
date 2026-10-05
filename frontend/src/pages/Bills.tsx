import React, { useEffect, useState } from 'react';
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

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(prefers-color-scheme: dark)'
    );

    const updateTheme = () => {
      setIsDarkMode(mediaQuery.matches);
    };

    updateTheme();

    mediaQuery.addEventListener('change', updateTheme);

    return () => {
      mediaQuery.removeEventListener('change', updateTheme);
    };
  }, []);

  const colors = isDarkMode
    ? {
        background: '#07110d',
        header: '#0b1712',
        card: '#101d17',
        cardPressed: '#14251d',
        border: '#1d382b',
        divider: '#1b3026',
        primaryText: '#f3faf6',
        secondaryText: '#a9bbb2',
        mutedText: '#81968c',
        green: '#19a765',
        greenBright: '#25c477',
        iconBackground: '#123a29',
        iconBorder: '#1c5139',
        arrowBackground: '#183126',
        securityBackground: '#0d2a1e',
        securityBorder: '#1c4a35',
        securityText: '#a8c8b8',
      }
    : {
        background: '#f4faf7',
        header: '#ffffff',
        card: '#ffffff',
        cardPressed: '#f7fbf9',
        border: '#dcebe5',
        divider: '#e7efeb',
        primaryText: '#073b2a',
        secondaryText: '#687b74',
        mutedText: '#70827b',
        green: '#087b48',
        greenBright: '#0b8f55',
        iconBackground: '#e8f6ef',
        iconBorder: '#d5eee2',
        arrowBackground: '#f0f7f4',
        securityBackground: '#eaf7f0',
        securityBorder: '#d5eee2',
        securityText: '#356b57',
      };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.background,
        color: colors.primaryText,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        paddingBottom: 40,
        transition: 'background 0.2s ease, color 0.2s ease',
      }}
    >
      {/* =========================================================
          HEADER
      ========================================================= */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '18px 20px 16px',
          background: colors.header,
          borderBottom: `1px solid ${colors.border}`,
          transition: 'background 0.2s ease, border-color 0.2s ease',
        }}
      >
        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          style={{
            position: 'absolute',
            left: 18,
            width: 42,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: 14,
            background: isDarkMode ? '#13251d' : '#f1f7f4',
            color: colors.primaryText,
            fontSize: 32,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
            transition: 'background 0.2s ease',
          }}
        >
          ‹
        </button>

        {/* Title */}
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            letterSpacing: -0.4,
            color: colors.primaryText,
          }}
        >
          Bills
        </h1>
      </div>

      {/* =========================================================
          MAIN CONTENT
      ========================================================= */}
      <main
        style={{
          width: '100%',
          maxWidth: 680,
          margin: '0 auto',
          padding: '26px 18px',
          boxSizing: 'border-box',
        }}
      >
        {/* Intro */}
        <div
          style={{
            marginBottom: 22,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.2,
              color: colors.green,
              textTransform: 'uppercase',
              marginBottom: 7,
            }}
          >
            Payments
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.15,
              fontWeight: 850,
              letterSpacing: -0.7,
              color: colors.primaryText,
            }}
          >
            Pay Your Bills
          </h2>

          <p
            style={{
              margin: '9px 0 0',
              fontSize: 15,
              lineHeight: 1.5,
              color: colors.secondaryText,
            }}
          >
            Select a bill or service you want to pay.
          </p>
        </div>

        {/* =======================================================
            BILL OPTIONS
        ======================================================= */}
        <div
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 22,
            overflow: 'hidden',
            boxShadow: isDarkMode
              ? '0 10px 30px rgba(0, 0, 0, 0.20)'
              : '0 8px 30px rgba(7, 59, 42, 0.06)',
            transition: 'background 0.2s ease, border-color 0.2s ease',
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
                gap: 14,
                padding: '17px 16px',
                background: colors.card,
                border: 'none',
                borderBottom:
                  index === BILL_OPTIONS.length - 1
                    ? 'none'
                    : `1px solid ${colors.divider}`,
                textAlign: 'left',
                cursor: 'pointer',
                transition:
                  'background 0.15s ease, transform 0.1s ease',
              }}
              onMouseDown={(event) => {
                event.currentTarget.style.background =
                  colors.cardPressed;
              }}
              onMouseUp={(event) => {
                event.currentTarget.style.background = colors.card;
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = colors.card;
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  minWidth: 52,
                  borderRadius: 16,
                  background: colors.iconBackground,
                  border: `1px solid ${colors.iconBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 25,
                  boxSizing: 'border-box',
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
                    fontSize: 17,
                    fontWeight: 800,
                    color: colors.greenBright,
                    marginBottom: 4,
                  }}
                >
                  {bill.title}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: colors.secondaryText,
                  }}
                >
                  {bill.description}
                </div>
              </div>

              {/* Arrow */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  minWidth: 32,
                  borderRadius: '50%',
                  background: colors.arrowBackground,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.greenBright,
                  fontSize: 25,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                ›
              </div>
            </button>
          ))}
        </div>

        {/* =======================================================
            SECURITY NOTICE
        ======================================================= */}
        <div
          style={{
            marginTop: 18,
            padding: '15px 16px',
            background: colors.securityBackground,
            border: `1px solid ${colors.securityBorder}`,
            borderRadius: 17,
            color: colors.securityText,
            fontSize: 12.5,
            lineHeight: 1.5,
            transition:
              'background 0.2s ease, border-color 0.2s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 9,
            }}
          >
            <span
              style={{
                fontSize: 17,
                lineHeight: 1.2,
              }}
            >
              🔒
            </span>

            <span>
              Payments are processed securely through ZENIMONIES.
              Always verify your bill details before confirming a
              payment.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Bills;
