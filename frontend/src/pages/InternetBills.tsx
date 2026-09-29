
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type InternetProvider = 'smile' | 'spectranet';

const InternetBills: React.FC = () => {
  const navigate = useNavigate();

  const [provider, setProvider] =
    useState<InternetProvider | ''>('');

  const [customerId, setCustomerId] = useState('');
  const [plan, setPlan] = useState('');
  const [amount, setAmount] = useState('');

  const [error, setError] = useState('');

  const handleContinue = () => {
    setError('');

    if (!provider) {
      setError('Please select an internet provider.');
      return;
    }

    if (!customerId.trim()) {
      setError('Please enter your customer or account number.');
      return;
    }

    if (!plan) {
      setError('Please select an internet subscription plan.');
      return;
    }

    setError(
      'Provider verification and available plans will be connected to VTPass in the next stage.'
    );
  };

  const providers = [
    {
      id: 'smile' as const,
      name: 'Smile',
      description: 'Smile internet subscription',
      icon: '📶',
    },
    {
      id: 'spectranet' as const,
      name: 'Spectranet',
      description: 'Spectranet broadband subscription',
      icon: '🌐',
    },
  ];

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
      <header
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
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
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
        >
          ‹
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 800,
            color: '#073b2a',
          }}
        >
          Internet Bills
        </h1>
      </header>

      <main
        style={{
          maxWidth: 620,
          margin: '0 auto',
          padding: '26px 18px',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              color: '#6d8078',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Internet payments
          </div>

          <h2
            style={{
              margin: 0,
              fontSize: 30,
              fontWeight: 850,
              lineHeight: 1.2,
              color: '#073b2a',
            }}
          >
            Stay Connected
          </h2>

          <p
            style={{
              margin: '10px 0 0',
              fontSize: 15,
              lineHeight: 1.6,
              color: '#687b74',
            }}
          >
            Choose your internet provider and enter your
            subscription details.
          </p>
        </div>

        {/* Provider selection */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #dcebe5',
            borderRadius: 24,
            padding: 20,
            boxShadow: '0 8px 30px rgba(7, 59, 42, 0.05)',
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              margin: '0 0 16px',
              fontSize: 18,
              fontWeight: 800,
              color: '#073b2a',
            }}
          >
            Select Provider
          </h3>

          <div style={{ display: 'grid', gap: 12 }}>
            {providers.map((item) => {
              const selected = provider === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setProvider(item.id);
                    setPlan('');
                    setAmount('');
                    setError('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    width: '100%',
                    padding: 16,
                    borderRadius: 18,
                    border: selected
                      ? '2px solid #087b48'
                      : '1px solid #dcebe5',
                    background: selected
                      ? '#eaf7f0'
                      : '#ffffff',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      minWidth: 52,
                      borderRadius: 16,
                      background: '#e8f6ef',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 26,
                    }}
                  >
                    {item.icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: '#087b48',
                        marginBottom: 4,
                      }}
                    >
                      {item.name}
                    </div>

                    <div
                      style={{
                        fontSize: 13,
                        color: '#70827b',
                      }}
                    >
                      {item.description}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: selected
                        ? '6px solid #087b48'
                        : '2px solid #b9ccc3',
                      boxSizing: 'border-box',
                    }}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* Subscription details */}
        <section
          style={{
            background: '#ffffff',
            border: '1px solid #dcebe5',
            borderRadius: 24,
            padding: 20,
            boxShadow: '0 8px 30px rgba(7, 59, 42, 0.05)',
          }}
        >
          <h3
            style={{
              margin: '0 0 18px',
              fontSize: 18,
              fontWeight: 800,
              color: '#073b2a',
            }}
          >
            Subscription Details
          </h3>

          <label
            htmlFor="internet-customer-id"
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 8,
              color: '#356b57',
            }}
          >
            Customer / Account Number
          </label>

          <input
            id="internet-customer-id"
            type="text"
            value={customerId}
            onChange={(event) => {
              setCustomerId(event.target.value);
              setError('');
            }}
            placeholder="Enter your customer number"
            autoComplete="off"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '15px 16px',
              borderRadius: 14,
              border: '1px solid #dcebe5',
              background: '#fbfdfc',
              fontSize: 16,
              outlineColor: '#087b48',
              marginBottom: 18,
            }}
          />

          <label
            htmlFor="internet-plan"
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 8,
              color: '#356b57',
            }}
          >
            Subscription Plan
          </label>

          <select
            id="internet-plan"
            value={plan}
            onChange={(event) => {
              setPlan(event.target.value);
              setAmount('');
              setError('');
            }}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '15px 16px',
              borderRadius: 14,
              border: '1px solid #dcebe5',
              background: '#fbfdfc',
              fontSize: 16,
              color: plan ? '#073b2a' : '#70827b',
              marginBottom: 18,
            }}
          >
            <option value="">
              Select a plan
            </option>
            <option value="pending">
              Plans will load from VTPass
            </option>
          </select>

          <label
            htmlFor="internet-amount"
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 8,
              color: '#356b57',
            }}
          >
            Amount (₦)
          </label>

          <input
            id="internet-amount"
            type="number"
            min="0"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError('');
            }}
            placeholder="Available plan price"
            disabled
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '15px 16px',
              borderRadius: 14,
              border: '1px solid #dcebe5',
              background: '#f1f5f3',
              fontSize: 16,
              color: '#70827b',
            }}
          />

          <p
            style={{
              margin: '10px 0 0',
              fontSize: 12,
              lineHeight: 1.5,
              color: '#70827b',
            }}
          >
            Available plans and prices will be retrieved
            from the connected VTPass service.
          </p>

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 12,
                background: '#fff5e8',
                border: '1px solid #f3d7b1',
                color: '#8a4b08',
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleContinue}
            style={{
              width: '100%',
              marginTop: 22,
              padding: '16px 20px',
              border: 'none',
              borderRadius: 16,
              background: '#087b48',
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Continue
          </button>
        </section>

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
          🔒 Always verify your provider and subscription
          details before confirming a payment.
        </div>
      </main>
    </div>
  );
};

export default InternetBills;
