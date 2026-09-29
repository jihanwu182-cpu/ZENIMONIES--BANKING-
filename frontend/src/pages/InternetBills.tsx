
import React, { useState } from 'react';

const InternetBills: React.FC = () => {
  const [provider, setProvider] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const providers = [
    {
      id: 'smile',
      name: 'Smile Communications',
    },
    {
      id: 'spectranet',
      name: 'Spectranet',
    },
    {
      id: 'mtn-broadband',
      name: 'MTN Broadband',
    },
    {
      id: 'ipnx',
      name: 'ipNX',
    },
    {
      id: 'fibreone',
      name: 'FibreOne',
    },
  ];

  const handleContinue = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setMessage('');

    if (!provider) {
      setMessage('Please select an internet provider.');
      return;
    }

    if (!accountNumber.trim()) {
      setMessage('Please enter your internet account number.');
      return;
    }

    setLoading(true);

    setMessage(
      'Internet subscription payments for this provider are not available yet. Please try again once the payment service is connected.'
    );

    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f8f6',
        padding: '24px 16px',
        boxSizing: 'border-box',
        fontFamily:
          "'Inter', 'Segoe UI', Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '28px',
          }}
        >
          <button
            type="button"
            onClick={() => window.history.back()}
            aria-label="Go back"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              border: '1px solid #e0e9e3',
              background: '#ffffff',
              color: '#145c39',
              fontSize: '22px',
              cursor: 'pointer',
            }}
          >
            ←
          </button>

          <div>
            <h1
              style={{
                margin: 0,
                color: '#145c39',
                fontSize: '22px',
                fontWeight: 800,
              }}
            >
              Internet Bills
            </h1>

            <p
              style={{
                margin: '5px 0 0',
                fontSize: '13px',
                color: '#748078',
              }}
            >
              Broadband and internet subscriptions
            </p>
          </div>
        </div>

        {/* Small green card */}
        <div
          style={{
            background:
              'linear-gradient(135deg, #176b43, #104d32)',
            borderRadius: '16px',
            padding: '17px 18px',
            marginBottom: '24px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              flexShrink: 0,
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '23px',
            }}
          >
            <span role="img" aria-label="Internet">
              🌐
            </span>
          </div>

          <div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 700,
                marginBottom: '4px',
              }}
            >
              Broadband Internet
            </div>

            <div
              style={{
                fontSize: '12px',
                lineHeight: 1.5,
                color: '#d9eee2',
              }}
            >
              Internet subscription services for
              your home or business.
            </div>
          </div>
        </div>

        {/* Subscription form */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '22px',
            border: '1px solid #e6eee8',
            boxShadow:
              '0 4px 18px rgba(20, 92, 57, 0.04)',
          }}
        >
          <h2
            style={{
              margin: '0 0 7px',
              fontSize: '18px',
              fontWeight: 800,
              color: '#193b2a',
            }}
          >
            Pay Internet Bill
          </h2>

          <p
            style={{
              margin: '0 0 24px',
              color: '#7b857e',
              fontSize: '13px',
              lineHeight: 1.6,
            }}
          >
            Select your internet provider and enter
            your customer account details.
          </p>

          <form onSubmit={handleContinue}>
            {/* Provider */}
            <label
              htmlFor="internet-provider"
              style={{
                display: 'block',
                marginBottom: '9px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#294635',
              }}
            >
              Internet Provider
            </label>

            <select
              id="internet-provider"
              value={provider}
              onChange={(event) => {
                setProvider(event.target.value);
                setMessage('');
              }}
              style={{
                width: '100%',
                height: '52px',
                padding: '0 14px',
                border: '1px solid #dce7df',
                borderRadius: '12px',
                background: '#ffffff',
                color: '#193b2a',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '20px',
              }}
            >
              <option value="">
                Select internet provider
              </option>

              {providers.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </select>

            {/* Account number */}
            <label
              htmlFor="internet-account"
              style={{
                display: 'block',
                marginBottom: '9px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#294635',
              }}
            >
              Customer / Account Number
            </label>

            <input
              id="internet-account"
              type="text"
              value={accountNumber}
              onChange={(event) => {
                setAccountNumber(event.target.value);
                setMessage('');
              }}
              placeholder="Enter your internet account number"
              autoComplete="off"
              style={{
                width: '100%',
                height: '52px',
                padding: '0 14px',
                border: '1px solid #dce7df',
                borderRadius: '12px',
                background: '#ffffff',
                color: '#193b2a',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '10px',
              }}
            />

            <p
              style={{
                margin: '0 0 22px',
                color: '#7b857e',
                fontSize: '12px',
                lineHeight: 1.6,
              }}
            >
              Enter the account or customer number
              registered with your internet provider.
            </p>

            {/* Plan notice */}
            <div
              style={{
                padding: '14px',
                borderRadius: '12px',
                background: '#f0f7f2',
                border: '1px solid #dcece1',
                marginBottom: '22px',
              }}
            >
              <div
                style={{
                  color: '#145c39',
                  fontSize: '13px',
                  fontWeight: 700,
                  marginBottom: '5px',
                }}
              >
                Subscription Plans
              </div>

              <div
                style={{
                  color: '#68786d',
                  fontSize: '12px',
                  lineHeight: 1.6,
                }}
              >
                Internet providers and subscription
                plans will be available once our
                payment provider is connected.
              </div>
            </div>

            {/* Message */}
            {message && (
              <div
                role="alert"
                style={{
                  background: '#fff8e8',
                  border: '1px solid #f0dfb6',
                  color: '#765a19',
                  padding: '13px',
                  borderRadius: '12px',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  marginBottom: '18px',
                }}
              >
                {message}
              </div>
            )}

            {/* Continue */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '52px',
                border: 'none',
                borderRadius: '13px',
                background: loading
                  ? '#8aab98'
                  : '#176b43',
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 800,
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',
                boxShadow:
                  '0 4px 12px rgba(23, 107, 67, 0.15)',
              }}
            >
              {loading ? 'Please wait...' : 'Continue'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '24px',
            color: '#89958d',
            fontSize: '12px',
            lineHeight: 1.6,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: '#176b43',
              marginBottom: '5px',
              letterSpacing: '1px',
            }}
          >
            ZENIMONIES
          </div>

          Secure banking for your everyday needs.
        </div>
      </div>
    </div>
  );
};

export default InternetBills;
