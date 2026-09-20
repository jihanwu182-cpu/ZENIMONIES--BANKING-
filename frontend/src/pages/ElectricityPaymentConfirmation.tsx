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
  address?: string;
  amount: number;
  currency: string;
  verified: boolean;
};

const ElectricityPaymentConfirmation: React.FC = () => {
  const navigate = useNavigate();

  const [verification, setVerification] =
    useState<VerificationData | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        'zenimonies_electricity_verification'
      );

      if (!saved) {
        navigate('/electricity', { replace: true });
        return;
      }

      const parsed: VerificationData = JSON.parse(saved);

      if (!parsed.verified) {
        navigate('/electricity', { replace: true });
        return;
      }

      setVerification(parsed);
    } catch (error) {
      console.error(
        'Failed to load electricity verification:',
        error
      );

      navigate('/electricity', { replace: true });
    }
  }, [navigate]);

  if (!verification) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6f8f7',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Loading...
      </div>
    );
  }

  const formattedAmount = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(verification.amount));

  const handleConfirmPayment = () => {
    /*
     * IMPORTANT:
     * Payment is NOT connected yet.
     *
     * This button will later call our protected backend endpoint,
     * which will:
     * 1. Check the Zenimonies account balance
     * 2. Create an idempotency key
     * 3. Call Sogo electricity purchase
     * 4. Save the transaction
     * 5. Handle the provider response
     * 6. Show the receipt/token
     *
     * For now we keep this disabled from making a real payment.
     */

    alert(
      'Payment integration is the next step. No money has been deducted.'
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6f8f7',
        padding: '24px 18px 40px',
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        color: '#111827',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: '#ffffff',
            fontSize: 24,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          ←
        </button>

        <h1
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 24,
            fontWeight: 800,
            margin: 0,
          }}
        >
          Confirm Payment
        </h1>

        <div style={{ width: 44 }} />
      </div>

      {/* Security message */}
      <div
        style={{
          background: '#eafaf0',
          border: '1px solid #b8efcd',
          borderRadius: 18,
          padding: '18px',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            color: '#16843d',
            fontWeight: 800,
            fontSize: 17,
            marginBottom: 6,
          }}
        >
          ✓ Account verified
        </div>

        <div
          style={{
            color: '#5f6b78',
            lineHeight: 1.5,
            fontSize: 14,
          }}
        >
          Please review the payment details carefully before
          continuing.
        </div>
      </div>

      {/* Provider */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          border: '1px solid #e1e5e8',
        }}
      >
        <div
          style={{
            color: '#697586',
            fontWeight: 700,
            fontSize: 14,
            marginBottom: 14,
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
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              border: '1px solid #dfe3e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#ffffff',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {verification.provider_logo ? (
              <img
                src={verification.provider_logo}
                alt={verification.provider_name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <strong style={{ fontSize: 14 }}>
                {verification.provider_short_name}
              </strong>
            )}
          </div>

          <div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 800,
                marginBottom: 5,
              }}
            >
              {verification.provider_name}
            </div>

            <div
              style={{
                color: '#697586',
                fontSize: 15,
                fontWeight: 700,
              }}
            >
              {verification.provider_short_name}
            </div>
          </div>
        </div>
      </div>

      {/* Customer details */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid #e1e5e8',
          marginBottom: 16,
        }}
      >
        <DetailRow
          label="Customer Name"
          value={verification.customer_name}
        />

        <DetailRow
          label={
            verification.meter_type === 'prepaid'
              ? 'Meter Number'
              : 'Meter / Account Number'
          }
          value={verification.meter_number}
        />

        <DetailRow
          label="Meter Type"
          value={
            verification.meter_type === 'prepaid'
              ? 'Prepaid'
              : 'Postpaid'
          }
        />

        {verification.address ? (
          <DetailRow
            label="Address"
            value={verification.address}
          />
        ) : null}
      </div>

      {/* Amount */}
      <div
        style={{
          background: '#eafaf0',
          border: '1px solid #a9edc2',
          borderRadius: 20,
          padding: '22px 20px',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <span
          style={{
            color: '#19783d',
            fontWeight: 800,
            fontSize: 18,
          }}
        >
          Payment Amount
        </span>

        <span
          style={{
            color: '#13843d',
            fontWeight: 900,
            fontSize: 27,
          }}
        >
          {formattedAmount}
        </span>
      </div>

      {/* Payment button */}
      <button
        onClick={handleConfirmPayment}
        style={{
          width: '100%',
          height: 64,
          border: 'none',
          borderRadius: 20,
          background: '#149447',
          color: '#ffffff',
          fontSize: 19,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 8px 20px rgba(20,148,71,0.20)',
        }}
      >
        Confirm Payment
      </button>

      {/* Cancel */}
      <button
        onClick={() => navigate('/electricity')}
        style={{
          width: '100%',
          height: 58,
          marginTop: 12,
          borderRadius: 18,
          border: '1px solid #d8dde2',
          background: '#ffffff',
          color: '#4b5563',
          fontSize: 17,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Cancel
      </button>

      <div
        style={{
          textAlign: 'center',
          color: '#7b8490',
          fontSize: 13,
          lineHeight: 1.5,
          marginTop: 18,
          padding: '0 12px',
        }}
      >
        Your payment will be processed securely through
        Zenimonies.
      </div>
    </div>
  );
};

type DetailRowProps = {
  label: string;
  value: string;
};

const DetailRow: React.FC<DetailRowProps> = ({
  label,
  value,
}) => {
  return (
    <div
      style={{
        padding: '20px',
        borderBottom: '1px solid #edf0f2',
      }}
    >
      <div
        style={{
          color: '#697586',
          fontSize: 14,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: '#111827',
          fontSize: 18,
          fontWeight: 800,
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    </div>
  );
};

export default ElectricityPaymentConfirmation;
