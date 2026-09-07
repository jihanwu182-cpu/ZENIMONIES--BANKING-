import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface DataPlan {
  id: string;
  name: string;
  amount: number;
  validity: string;
}

const plans: Record<string, DataPlan[]> = {
  MTN: [
    { id: 'mtn-500', name: '500 MB', amount: 500, validity: '14 days' },
    { id: 'mtn-1gb', name: '1 GB', amount: 1000, validity: '30 days' },
    { id: 'mtn-2gb', name: '2 GB', amount: 2000, validity: '30 days' },
    { id: 'mtn-5gb', name: '5 GB', amount: 4000, validity: '30 days' }
  ],
  Airtel: [
    { id: 'airtel-500', name: '500 MB', amount: 500, validity: '14 days' },
    { id: 'airtel-1gb', name: '1 GB', amount: 1000, validity: '30 days' },
    { id: 'airtel-2gb', name: '2 GB', amount: 2000, validity: '30 days' },
    { id: 'airtel-5gb', name: '5 GB', amount: 4000, validity: '30 days' }
  ],
  Glo: [
    { id: 'glo-500', name: '500 MB', amount: 500, validity: '14 days' },
    { id: 'glo-1gb', name: '1 GB', amount: 1000, validity: '30 days' },
    { id: 'glo-2gb', name: '2 GB', amount: 2000, validity: '30 days' },
    { id: 'glo-5gb', name: '5 GB', amount: 4000, validity: '30 days' }
  ],
  '9mobile': [
    { id: '9mobile-500', name: '500 MB', amount: 500, validity: '14 days' },
    { id: '9mobile-1gb', name: '1 GB', amount: 1000, validity: '30 days' },
    { id: '9mobile-2gb', name: '2 GB', amount: 2000, validity: '30 days' },
    { id: '9mobile-5gb', name: '5 GB', amount: 4000, validity: '30 days' }
  ]
};

const Data: React.FC = () => {
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [planId, setPlanId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const availablePlans = network ? plans[network] || [] : [];

  const selectedPlan = availablePlans.find(
    (plan) => plan.id === planId
  );

  const handleNetworkChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setNetwork(event.target.value);
    setPlanId('');
    setError('');
    setMessage('');
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!network || !phone || !planId) {
      setError('Please complete all required fields.');
      return;
    }

    if (phone.length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }

    if (!selectedPlan) {
      setError('Please select a valid data plan.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('zenimonies_token');

      const response = await axios.post(
        `${API_URL}/api/data`,
        {
          network,
          phone: phone.trim(),
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          amount: selectedPlan.amount
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data?.message ||
            'Data purchase submitted successfully.'
        );

        setNetwork('');
        setPhone('');
        setPlanId('');
      } else {
        setError(
          response.data?.message ||
            'Unable to process data purchase.'
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Data service is not connected yet.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: '24px'
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto'
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: '#0b5cff',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '30px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)'
          }}
        >
          <h1 style={{ marginTop: 0 }}>Buy Data</h1>

          <p
            style={{
              color: '#667085',
              marginBottom: '28px'
            }}
          >
            Buy mobile data for yourself or another phone number.
          </p>

          {error && (
            <div
              style={{
                padding: '12px',
                marginBottom: '18px',
                borderRadius: '8px',
                background: '#fee4e2',
                color: '#b42318'
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                padding: '12px',
                marginBottom: '18px',
                borderRadius: '8px',
                background: '#ecfdf3',
                color: '#027a48'
              }}
            >
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="network"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600
              }}
            >
              Network
            </label>

            <select
              id="network"
              value={network}
              onChange={handleNetworkChange}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff'
              }}
            >
              <option value="">Select network</option>
              <option value="MTN">MTN</option>
              <option value="Airtel">Airtel</option>
              <option value="Glo">Glo</option>
              <option value="9mobile">9mobile</option>
            </select>

            <label
              htmlFor="phone"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600
              }}
            >
              Phone Number
            </label>

            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(event) =>
                setPhone(
                  event.target.value.replace(/[^\d+]/g, '')
                )
              }
              placeholder="Enter phone number"
              autoComplete="tel"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px'
              }}
            />

            <label
              htmlFor="plan"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600
              }}
            >
              Data Plan
            </label>

            <select
              id="plan"
              value={planId}
              onChange={(event) => setPlanId(event.target.value)}
              disabled={!network}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '24px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff'
              }}
            >
              <option value="">
                {network
                  ? 'Select data plan'
                  : 'Select network first'}
              </option>

              {availablePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — ₦
                  {plan.amount.toLocaleString()} — {plan.validity}
                </option>
              ))}
            </select>

            {selectedPlan && (
              <div
                style={{
                  padding: '14px',
                  marginBottom: '22px',
                  borderRadius: '10px',
                  background: '#f5f7fb'
                }}
              >
                <strong>{selectedPlan.name}</strong>

                <div
                  style={{
                    marginTop: '5px',
                    color: '#667085'
                  }}
                >
                  ₦{selectedPlan.amount.toLocaleString()} ·{' '}
                  {selectedPlan.validity}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                border: 'none',
                borderRadius: '8px',
                background: '#0b5cff',
                color: '#ffffff',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Processing...' : 'Buy Data'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Data;
