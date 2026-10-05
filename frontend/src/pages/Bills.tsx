import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/Theme.tsx';

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

  // ============================================================
  // GLOBAL ZENIMONIES THEME
  // ============================================================
  const { darkMode: isDarkMode } = useTheme();

  const [pressedIndex, setPressedIndex] =
    useState<number | null>(null);

  // ============================================================
  // ZENIMONIES COLORS
  // ============================================================
  const colors = isDarkMode
    ? {
        background: '#0d1712',
        header: '#101c16',
        card: '#101c16',
        cardPressed: '#15231c',
        border: '#294238',
        divider: '#22372d',

        primaryText: '#f3f8f5',
        secondaryText: '#a9b8b0',
        mutedText: '#82958b',

        green: '#19a765',
        greenBright: '#25c477',
        greenDark: '#168c56',

        iconBackground: '#123a29',
        iconBorder: '#1c5139',

        arrowBackground: '#183126',

        securityBackground: '#0d2a1e',
        securityBorder: '#1c4a35',
        securityText: '#a8c8b8',
      }
    : {
        background: '#f6faf8',
        header: '#ffffff',
        card: '#ffffff',
        cardPressed: '#f7faf8',
        border: '#e7eee9',
        divider: '#e6efea',

        primaryText: '#14251e',
        secondaryText: '#7b8982',
        mutedText: '#98a49f',

        green: '#079447',
        greenBright: '#0b995b',
        greenDark: '#006d3b',

        iconBackground: '#e9f8f1',
        iconBorder: '#d4eee1',

        arrowBackground: '#f0f7f4',

        securityBackground: '#e9f8f1',
        securityBorder: '#d4eee1',
        securityText: '#356b57',
      };

  return (
    <div
      className="zenimonies-page"
      style={{
        minHeight: '100vh',
        background: colors.background,
        color: colors.primaryText,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        paddingBottom: 40,
        transition:
          'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      {/* ========================================================
          HEADER
      ======================================================== */}
      <header
        className="zenimonies-surface"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 74,
          padding: '0 20px',
          background: colors.header,
          borderBottom: `1px solid ${colors.border}`,
          boxSizing: 'border-box',
          transition:
            'background-color 0.2s ease, border-color 0.2s ease',
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
            background: isDarkMode
              ? '#15231c'
              : '#f1f7f4',
            color: colors.primaryText,
            fontSize: 31,
            fontWeight: 400,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
            transition:
              'background-color 0.2s ease, transform 0.1s ease',
          }}
          onMouseDown={(event) => {
            event.currentTarget.style.transform =
              'scale(0.94)';
          }}
          onMouseUp={(event) => {
            event.currentTarget.style.transform =
              'scale(1)';
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.transform =
              'scale(1)';
          }}
          onTouchStart={(event) => {
            event.currentTarget.style.transform =
              'scale(0.94)';
          }}
          onTouchEnd={(event) => {
            event.currentTarget.style.transform =
              'scale(1)';
          }}
        >
          ‹
        </button>

        {/* Title */}
        <h1
          style={{
            margin: 0,
            fontSize: 23,
            fontWeight: 800,
            letterSpacing: -0.4,
            color: colors.primaryText,
          }}
        >
          Bills
        </h1>
      </header>

      {/* ========================================================
          MAIN
      ======================================================== */}
      <main
        style={{
          width: '100%',
          maxWidth: 680,
          margin: '0 auto',
          padding: '27px 18px 0',
          boxSizing: 'border-box',
        }}
      >
        {/* ======================================================
            INTRO
        ====================================================== */}
        <section
          style={{
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 10px',
              borderRadius: 999,
              background: isDarkMode
                ? '#0d2a1e'
                : '#e9f8f1',
              color: colors.greenBright,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 11,
              border: `1px solid ${colors.securityBorder}`,
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
              letterSpacing: -0.8,
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
              maxWidth: 520,
            }}
          >
            Select a bill or service you want to pay.
          </p>
        </section>

        {/* ======================================================
            BILL OPTIONS
        ====================================================== */}
        <section
          aria-label="Bill payment options"
          className="zenimonies-surface"
          style={{
            background: colors.card,
            border: `1px solid ${colors.border}`,
            borderRadius: 22,
            overflow: 'hidden',
            boxShadow: isDarkMode
              ? '0 12px 32px rgba(0, 0, 0, 0.22)'
              : '0 8px 30px rgba(7, 59, 42, 0.06)',
            transition:
              'background-color 0.2s ease, border-color 0.2s ease',
          }}
        >
          {BILL_OPTIONS.map((bill, index) => {
            const isPressed =
              pressedIndex === index;

            return (
              <button
                key={bill.title}
                type="button"
                onClick={() => navigate(bill.path)}
                onMouseDown={() =>
                  setPressedIndex(index)
                }
                onMouseUp={() =>
                  setPressedIndex(null)
                }
                onMouseLeave={() =>
                  setPressedIndex(null)
                }
                onTouchStart={() =>
                  setPressedIndex(index)
                }
                onTouchEnd={() =>
                  setPressedIndex(null)
                }
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '17px 16px',
                  background: isPressed
                    ? colors.cardPressed
                    : colors.card,
                  border: 'none',
                  borderBottom:
                    index ===
                    BILL_OPTIONS.length - 1
                      ? 'none'
                      : `1px solid ${colors.divider}`,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition:
                    'background-color 0.15s ease, transform 0.1s ease',
                  transform: isPressed
                    ? 'scale(0.995)'
                    : 'scale(1)',
                  boxSizing: 'border-box',
                  WebkitTapHighlightColor:
                    'transparent',
                }}
              >
                {/* ==================================================
                    ICON
                ================================================== */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    minWidth: 52,
                    borderRadius: 16,
                    background:
                      colors.iconBackground,
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

                {/* ==================================================
                    TEXT
                ================================================== */}
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
                      letterSpacing: -0.15,
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

                {/* ==================================================
                    ARROW
                ================================================== */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    minWidth: 32,
                    borderRadius: '50%',
                    background:
                      colors.arrowBackground,
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
            );
          })}
        </section>

        {/* ======================================================
            SECURITY NOTICE
        ====================================================== */}
        <div
          style={{
            marginTop: 18,
            padding: '15px 16px',
            background:
              colors.securityBackground,
            border: `1px solid ${colors.securityBorder}`,
            borderRadius: 17,
            color: colors.securityText,
            fontSize: 12.5,
            lineHeight: 1.5,
            transition:
              'background-color 0.2s ease, border-color 0.2s ease',
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
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              🔒
            </span>

            <span>
              Payments are processed securely
              through ZENIMONIES. Always verify
              your bill details before confirming
              a payment.
            </span>
          </div>
        </div>

        {/* ======================================================
            FOOTER
        ====================================================== */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 11,
            color: colors.mutedText,
          }}
        >
          ZENIMONIES • Secure Bill Payments
        </div>
      </main>
    </div>
  );
};

export default Bills;
