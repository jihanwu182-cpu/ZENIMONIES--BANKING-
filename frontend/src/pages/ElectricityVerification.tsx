import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type VerificationData = {
  provider_code: string;
  provider_name: string;
  provider_short_name: string;
  provider_logo: string;
  meter_type: 'prepaid' | 'postpaid';
  meter_number: string;
  customer_name: string;
  address: string;
  amount: number;
  currency: string;
  verified: boolean;
  verified_at: string;
};

const formatNaira = (amount: number) => {
  return `₦${Number(amount).toLocaleString(
    'en-NG'
  )}`;
};

const ElectricityVerification: React.FC =
  () => {
    const navigate = useNavigate();

    const [data, setData] =
      useState<VerificationData | null>(
        null
      );

    useEffect(() => {
      const saved =
        localStorage.getItem(
          'zenimonies_electricity_verification'
        );

      if (!saved) {
        navigate('/electricity', {
          replace: true,
        });
        return;
      }

      try {
        const parsed =
          JSON.parse(saved);

        if (!parsed?.verified) {
          navigate('/electricity', {
            replace: true,
          });
          return;
        }

        setData(parsed);
      } catch (error) {
        console.error(
          'Unable to read electricity verification:',
          error
        );

        navigate('/electricity', {
          replace: true,
        });
      }
    }, [navigate]);

    if (!data) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f7f9f8',
            color: '#374151',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          }}
        >
          Loading verification...
        </div>
      );
    }

    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#f7f9f8',
          color: '#111827',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        {/* HEADER */}

        <div
          style={{
            background: '#ffffff',
            borderBottom:
              '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              maxWidth: 620,
              margin: '0 auto',
              height: 64,
              padding: '0 18px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() =>
                navigate('/electricity')
              }
              style={{
                width: 42,
                height: 42,
                border: 'none',
                background:
                  'transparent',
                fontSize: 28,
                color: '#111827',
                cursor: 'pointer',
              }}
            >
              ‹
            </button>

            <h1
              style={{
                flex: 1,
                margin: 0,
                textAlign: 'center',
                paddingRight: 42,
                fontSize: 19,
                fontWeight: 800,
              }}
            >
              Verify Account
            </h1>
          </div>
        </div>

        <div
          style={{
            maxWidth: 620,
            margin: '0 auto',
            padding:
              '28px 18px 40px',
          }}
        >
          {/* SUCCESS ICON */}

          <div
            style={{
              width: 72,
              height: 72,
              margin:
                '0 auto 18px',
              borderRadius:
                '50%',
              background:
                '#dcfce7',
              color: '#159447',
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
              fontSize: 36,
              fontWeight: 900,
            }}
          >
            ✓
          </div>

          <h2
            style={{
              margin:
                '0 0 8px',
              textAlign: 'center',
              fontSize: 23,
              fontWeight: 800,
            }}
          >
            Electricity Account
            Verified
          </h2>

          <p
            style={{
              margin:
                '0 auto 25px',
              maxWidth: 440,
              textAlign: 'center',
              color: '#6b7280',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            Please confirm that
            the account details
            below belong to you
            before continuing.
          </p>

          {/* PROVIDER */}

          <div
            style={{
              background:
                '#ffffff',
              border:
                '1px solid #e5e7eb',
              borderRadius: 18,
              padding: 16,
              marginBottom: 14,
              display: 'flex',
              alignItems:
                'center',
              gap: 14,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                overflow: 'hidden',
                border:
                  '1px solid #e5e7eb',
                background:
                  '#ffffff',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                flexShrink: 0,
              }}
            >
              <img
                src={
                  data.provider_logo
                }
                alt={`${data.provider_name} logo`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit:
                    'contain',
                }}
              />
            </div>

            <div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                {data.provider_name}
              </div>

              <div
                style={{
                  marginTop: 3,
                  color: '#6b7280',
                  fontSize: 13,
                }}
              >
                {data.provider_short_name}
              </div>
            </div>
          </div>

          {/* ACCOUNT DETAILS */}

          <div
            style={{
              background:
                '#ffffff',
              border:
                '1px solid #e5e7eb',
              borderRadius: 18,
              overflow: 'hidden',
              marginBottom: 14,
            }}
          >
            <DetailRow
              label="Customer Name"
              value={
                data.customer_name ||
                'Not provided'
              }
            />

            <DetailRow
              label={
                data.meter_type ===
                'prepaid'
                  ? 'Meter Number'
                  : 'Meter / Account Number'
              }
              value={
                data.meter_number
              }
            />

            <DetailRow
              label="Meter Type"
              value={
                data.meter_type ===
                'prepaid'
                  ? 'Prepaid'
                  : 'Postpaid'
              }
            />

            {data.address ? (
              <DetailRow
                label="Address"
                value={
                  data.address
                }
                last
              />
            ) : null}
          </div>

          {/* AMOUNT */}

          <div
            style={{
              background:
                '#ecfdf3',
              border:
                '1px solid #bbf7d0',
              borderRadius: 18,
              padding: 18,
              marginBottom: 20,
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'space-between',
            }}
          >
            <div
              style={{
                color: '#166534',
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Payment Amount
            </div>

            <div
              style={{
                color: '#15803d',
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              {formatNaira(
                data.amount
              )}
            </div>
          </div>

          {/* CONFIRM */}

          <button
            type="button"
            onClick={() => {
              // We are NOT making a payment yet.
              // This only moves the verified
              // account data to the next stage.
              navigate(
                '/electricity/payment-confirmation'
              );
            }}
            style={{
              width: '100%',
              height: 56,
              border: 'none',
              borderRadius: 15,
              background: '#159447',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow:
                '0 8px 20px rgba(21,148,71,0.20)',
            }}
          >
            Confirm & Continue
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('/electricity')
            }
            style={{
              width: '100%',
              height: 50,
              marginTop: 10,
              border:
                '1px solid #d1d5db',
              borderRadius: 14,
              background:
                '#ffffff',
              color: '#374151',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

type DetailRowProps = {
  label: string;
  value: string;
  last?: boolean;
};

const DetailRow: React.FC<
  DetailRowProps
> = ({
  label,
  value,
  last = false,
}) => {
  return (
    <div
      style={{
        padding: 17,
        borderBottom: last
          ? 'none'
          : '1px solid #f0f0f0',
      }}
    >
      <div
        style={{
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 5,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: '#111827',
          fontSize: 15,
          fontWeight: 700,
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
    </div>
  );
};

export default ElectricityVerification;
