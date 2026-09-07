import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

const Airtime: React.FC = () => {
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const numericAmount = Number(amount);

    if (!network || !phone || !amount) {
      setError('Please complete all required fields.');
      return;
    }

    if (phone.length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid airtime amount.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('zenimonies_token');

      const response = await axios.post(
        `${API_URL}/api/airtime`,
        {
          network,
          phone: phone.trim(),
          amount: numericAmount,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data?.message ||
            'Airtime purchase submitted successfully.'
        );

        setNetwork('');
        setPhone('');
        setAmount('');
      } else {
        setError(
          response.data?.message ||
            'Unable to process airtime purchase.'
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Airtime service is not connected yet.'
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
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: '#0b5cff',
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '30px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h1 style={{ marginTop: 0 }}>Buy Airtime</h1>

          <p
            style={{
              color: '#667085',
              marginBottom: '28px',
            }}
          >
            Buy airtime for your phone or another phone number.
          </p>

          {error && (
            <div
              style={{
                padding: '12px',
                marginBottom: '18px',
                borderRadius: '8px',
                background: '#fee4e2',
                color: '#b42318',
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
                color: '#027a48',
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
                fontWeight: 600,
              }}
            >
              Network
            </label>

            <select
              id="network"
              value={network}
              onChange={(event) => setNetwork(event.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff',
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
                fontWeight: 600,
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
                borderRadius: '8px',
              }}
            />

            <label
              htmlFor="amount"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
              }}
            >
              Amount (NGN)
            </label>

            <input
              id="amount"
              type="number"
              min="50"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '24px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
              }}
            />

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
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Processing...' : 'Buy Airtime'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Airtime;
