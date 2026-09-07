import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

const Deposit: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleDeposit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const numericAmount = Number(amount);

    if (!amount || !method) {
      setError('Please enter an amount and select a payment method.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('zenimonies_token');

      /*
       * The payment endpoint will be connected to the approved
       * payment provider when the deposit backend is implemented.
       */

      const response = await axios.post(
        `${API_URL}/api/deposits`,
        {
          amount: numericAmount,
          method,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data?.message || 'Deposit request created successfully.'
        );
        setAmount('');
        setMethod('');
      } else {
        setError(
          response.data?.message || 'Unable to create deposit request.'
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Deposit service is not connected yet.'
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
          <h1 style={{ marginTop: 0 }}>Fund Your Account</h1>

          <p
            style={{
              color: '#667085',
              marginBottom: '28px',
            }}
          >
            Add money to your Zenimonies account securely.
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

          <form onSubmit={handleDeposit}>
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
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '20px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
              }}
            />

            <label
              htmlFor="method"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
              }}
            >
              Payment Method
            </label>

            <select
              id="method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '24px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff',
              }}
            >
              <option value="">Select payment method</option>
              <option value="card">Debit/Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>

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
              {loading ? 'Processing...' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Deposit;
