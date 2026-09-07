import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

const Withdraw: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleWithdraw = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const numericAmount = Number(amount);

    if (!amount || !bank || !accountNumber || !accountName) {
      setError('Please complete all required fields.');
      return;
    }

    if (accountNumber.length !== 10) {
      setError('Account number must contain 10 digits.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid withdrawal amount.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('zenimonies_token');

      const response = await axios.post(
        `${API_URL}/api/withdrawals`,
        {
          amount: numericAmount,
          bank,
          account_number: accountNumber,
          account_name: accountName.trim(),
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
            'Withdrawal request submitted successfully.'
        );

        setAmount('');
        setBank('');
        setAccountNumber('');
        setAccountName('');
      } else {
        setError(
          response.data?.message ||
            'Unable to submit withdrawal request.'
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Withdrawal service is not connected yet.'
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
          <h1 style={{ marginTop: 0 }}>Withdraw Money</h1>

          <p
            style={{
              color: '#667085',
              marginBottom: '28px',
            }}
          >
            Withdraw funds from your Zenimonies account to a bank
            account.
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

          <form onSubmit={handleWithdraw}>
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
              placeholder="Enter withdrawal amount"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
              }}
            />

            <label
              htmlFor="bank"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
              }}
            >
              Bank
            </label>

            <select
              id="bank"
              value={bank}
              onChange={(event) => setBank(event.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff',
              }}
            >
              <option value="">Select bank</option>
              <option value="Access Bank">Access Bank</option>
              <option value="First Bank">First Bank</option>
              <option value="GTBank">GTBank</option>
              <option value="UBA">UBA</option>
              <option value="Zenith Bank">Zenith Bank</option>
              <option value="Opay">Opay</option>
              <option value="PalmPay">PalmPay</option>
              <option value="Kuda">Kuda</option>
              <option value="Moniepoint">Moniepoint</option>
              <option value="Other">Other</option>
            </select>

            <label
              htmlFor="accountNumber"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
              }}
            >
              Account Number
            </label>

            <input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              maxLength={10}
              value={accountNumber}
              onChange={(event) =>
                setAccountNumber(
                  event.target.value.replace(/\D/g, '')
                )
              }
              placeholder="Enter 10-digit account number"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
              }}
            />

            <label
              htmlFor="accountName"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
              }}
            >
              Account Name
            </label>

            <input
              id="accountName"
              type="text"
              value={accountName}
              onChange={(event) =>
                setAccountName(event.target.value)
              }
              placeholder="Enter account holder name"
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
              {loading ? 'Processing...' : 'Continue Withdrawal'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Withdraw;
