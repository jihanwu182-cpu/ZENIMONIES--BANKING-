import React, { useEffect, useState } from 'react';
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

const ElectricityVerification: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<VerificationData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(
      'zenimonies_electricity_verification'
    );

    if (!saved) {
      navigate('/electricity');
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      if (!parsed.verified) {
        navigate('/electricity');
        return;
      }

      setData(parsed);
    } catch (error) {
      console.error('Invalid verification data:', error);
      navigate('/electricity');
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
          background: '#f6f8f7',
        }}
      >
        Loading...
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: data.currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f8f7',
        paddingBottom: 40,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: '#ffffff',
          padding: '18px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid #eeeeee',
        }}
      >
        <button
          onClick={() => navigate('/electricity')}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: 26,
            cursor: 'pointer',
            marginRight: 12,
          }}
        >
          ←
        </button>

        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Electricity Verification
        </h2>
      </div>

      <div style={{ padding: 16 }}>
        {/* Success message */}
        <div
          style={{
            background: '#e9f8f1',
            border: '1px solid #a8dfc5',
            borderRadius: 16,
            padding: 20,
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: '#087f5b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              margin: '0 auto 12px',
            }}
          >
            ✓
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: '#087f5b',
            }}
          >
            Electricity Account Verified
          </div>

          <div
            style={{
              marginTop: 7,
              color: '#4f635b',
              fontSize: 14,
            }}
          >
            Please review the details before making payment.
          </div>
        </div>

        {/* Provider */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: 18,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              color: '#777',
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            SERVICE PROVIDER
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <img
              src={data.logo}
              alt={data.provider_name}
              style={{
                width: 58,
                height: 58,
                objectFit: 'contain',
                borderRadius: 10,
              }}
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />

            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                }}
              >
                {data.provider_name}
              </div>

              <div
                style={{
                  marginTop: 4,
                  color: '#6b7280',
                  fontWeight: 600,
                }}
              >
                {data.shortName}
              </div>
            </div>
          </div>
        </div>

        {/* Customer details */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            overflow: 'hidden',
            marginBottom: 16,
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
                color: '#697386',
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Customer Name
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
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
                color: '#697386',
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              {data.meter_type === 'prepaid'
                ? 'Meter Number'
                : 'Meter / Account Number'}
            </div>

            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: 0.5,
              }}
            >
              {data.meter_number}
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
                color: '#697386',
                fontSize: 14,
                fontWeight: 700,
                marginBottom: 10,
              }}
            >
              Meter Type
            </div>

            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
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
                  color: '#697386',
                  fontSize: 14,
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                Address
              </div>

              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                {data.address}
              </div>
            </div>
          )}
        </div>

        {/* Amount */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #63b88f',
            borderRadius: 16,
            padding: 20,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              color: '#087f5b',
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            PAYMENT AMOUNT
          </div>

          <div
            style={{
              marginTop: 8,
              color: '#087f5b',
              fontSize: 32,
              fontWeight: 900,
            }}
          >
            {formatCurrency(data.amount)}
          </div>
        </div>

        {/* Confirm payment */}
        <button
          onClick={() =>
            navigate('/electricity/payment-confirmation')
          }
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 16,
            padding: '17px',
            background: '#087f5b',
            color: '#ffffff',
            fontSize: 17,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Confirm Payment
        </button>

        {/* Cancel */}
        <button
          onClick={() => navigate('/electricity')}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            padding: '16px',
            marginTop: 6,
            color: '#555',
            fontSize: 15,
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

export default ElectricityVerification;
