import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

const Transfer: React.FC = () => {
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const verifyAccount = async () => {
    setError('');
    setMessage('');

    if (!bank || !accountNumber) {
      setError('Please select a bank and enter the account number.');
      return;
    }

    if (accountNumber.length < 10) {
      setError('Please enter a valid 10-digit account number.');
      return;
    }

    /*
     * The backend currently does not have a bank-account
     * verification endpoint, so we are preparing the UI here.
     * Real verification will be connected to the approved
     * bank-transfer provider later.
     */
    setVerifying(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      setMessage(
        'Account verification service will be connected when the bank-transfer provider is configured.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleTransfer = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const numericAmount = Number(amount);

    if (!bank || !accountNumber || !amount) {
      setError('Please complete all required fields.');
      return;
    }

    if (accountNumber.length !== 10) {
      setError('Account number must contain 10 digits.');
      return;
    }

    if (!recipientName) {
      setError('Please verify the recipient account first.');
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Please enter a valid transfer amount.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('zenimonies_token');

      /*
       * The current backend does not yet expose a transfer endpoint.
       * This request is intentionally prepared for the endpoint we
       * will add to the backend next.
       */

      await axios.post(
        `${API_URL}/api/transfers/bank`,
        {
          bank,
          account_number: accountNumber,
          recipient_name: recipientName,
          amount: numericAmount,
          description: description.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage('Transfer submitted successfully.');

      setBank('');
      setAccountNumber('');
      setRecipientName('');
      setAmount('');
      setDescription('');
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Bank transfer is not available yet. The transfer backend needs to be connected.'
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
          maxWidth: '650px',
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
          <h1
            style={{
              marginTop: 0,
              marginBottom: '8px',
            }}
          >
            Bank Transfer
          </h1>

          <p
            style={{
              color: '#667085',
              marginBottom: '28px',
            }}
          >
            Transfer money to another Nigerian bank account.
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

          <form onSubmit={handleTransfer}>
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
                marginBottom: '12px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
              }}
            />

            <button
              type="button"
              onClick={verifyAccount}
              disabled={verifying}
              style={{
                width: '100%',
                padding: '11px',
                marginBottom: '18px',
                border: '1px solid #0b5cff',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#0b5cff',
                fontWeight: 600,
                cursor: verifying ? 'not-allowed' : 'pointer',
              }}
            >
              {verifying ? 'Checking...' : 'Verify Account'}
            </button>

            <label
              htmlFor="recipientName"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
              }}
            >
              Recipient Name
            </label>

            <input
              id="recipientName"
              type="text"
              value={recipientName}
              onChange={(event) =>
                setRecipientName(event.target.value)
              }
              placeholder="Verified recipient name"
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
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
              }}
            />

            <label
              htmlFor="description"
              style={{
                display: 'block',
                marginBottom: '6px',
                fontWeight: 600,
              }}
            >
              Description
            </label>

            <textarea
              id="description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Optional transfer description"
              rows={3}
              maxLength={200}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '22px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                resize: 'vertical',
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
              {loading ? 'Processing...' : 'Continue Transfer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
