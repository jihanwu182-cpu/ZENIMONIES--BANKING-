import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface Bank {
  name: string;
  code: string;
}

const NIGERIAN_BANKS: Bank[] = [
  { name: '9 Payment Service Bank', code: '120001' },
  { name: 'Access Bank', code: '000014' },
  { name: 'Airtel Smartcash PSB', code: '120004' },
  { name: 'ALAT by Wema', code: '035A' },
  { name: 'Carbon', code: '565' },
  { name: 'Citibank Nigeria', code: '023' },
  { name: 'Coronation Merchant Bank', code: '559' },
  { name: 'Ecobank Nigeria', code: '050' },
  { name: 'Eyowo', code: '50126' },
  { name: 'FCMB', code: '214' },
  { name: 'Fidelity Bank', code: '070' },
  { name: 'First Bank of Nigeria', code: '011' },
  { name: 'Globus Bank', code: '103' },
  { name: 'GTBank', code: '058' },
  { name: 'Heritage Bank', code: '030' },
  { name: 'Jaiz Bank', code: '301' },
  { name: 'Keystone Bank', code: '082' },
  { name: 'Kuda Microfinance Bank', code: '090267' },
  { name: 'Lotus Bank', code: '303' },
  { name: 'Moniepoint Microfinance Bank', code: '090405' },
  { name: 'Nova Bank', code: '561' },
  { name: 'OPay', code: '999992' },
  { name: 'Optimus Bank', code: '107' },
  { name: 'PalmPay', code: '999991' },
  { name: 'Parallex Bank', code: '526' },
  { name: 'Polaris Bank', code: '076' },
  { name: 'Premium Trust Bank', code: '105' },
  { name: 'Providus Bank', code: '101' },
  { name: 'Signature Bank', code: '106' },
  { name: 'Stanbic IBTC Bank', code: '221' },
  { name: 'Standard Chartered Bank Nigeria', code: '068' },
  { name: 'Sterling Bank', code: '232' },
  { name: 'SunTrust Bank', code: '100' },
  { name: 'TAJ Bank', code: '302' },
  { name: 'Tatum Bank', code: '102' },
  { name: 'Titan Trust Bank', code: '102' },
  { name: 'UBA', code: '033' },
  { name: 'Union Bank', code: '032' },
  { name: 'Unity Bank', code: '215' },
  { name: 'Wema Bank', code: '035' },
  { name: 'Zenith Bank', code: '057' },
];

const Transfer: React.FC = () => {
  const [bank, setBank] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleBankChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedBank = NIGERIAN_BANKS.find(
      (item) => item.name === event.target.value
    );

    setBank(selectedBank?.name || '');
    setBankCode(selectedBank?.code || '');

    // Clear previous verification when bank changes
    setRecipientName('');
    setMessage('');
    setError('');
  };

  const verifyAccount = async () => {
    setError('');
    setMessage('');

    if (!bank || !bankCode) {
      setError('Please select a bank.');
      return;
    }

    if (accountNumber.length !== 10) {
      setError('Please enter a valid 10-digit account number.');
      return;
    }

    setVerifying(true);

    try {
      /*
       * The actual account-name lookup will be connected
       * to the approved payment/bank-transfer provider.
       *
       * We do not invent a recipient name.
       */

      setMessage(
        'Account verification is ready for connection to the approved bank-transfer provider.'
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to verify this account.'
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

    if (!bank || !bankCode) {
      setError('Please select a bank.');
      return;
    }

    if (accountNumber.length !== 10) {
      setError('Account number must contain exactly 10 digits.');
      return;
    }

    if (!recipientName.trim()) {
      setError(
        'Please verify the recipient account before continuing.'
      );
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError('Please enter a valid transfer amount.');
      return;
    }

    if (numericAmount > 100000000) {
      setError('Transfer amount is too large.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem(
        'zenimonies_token'
      );

      const response = await axios.post(
        `${API_URL}/api/transfers`,
        {
          recipient_name: recipientName.trim(),
          recipient_account_number: accountNumber,
          recipient_bank_name: bank,
          recipient_bank_code: bankCode,
          amount: numericAmount,
          narration: description.trim() || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data?.message ||
            'Transfer request created successfully and is pending processing.'
        );

        setBank('');
        setBankCode('');
        setAccountNumber('');
        setRecipientName('');
        setAmount('');
        setDescription('');
      } else {
        setError(
          response.data?.message ||
            'Unable to create transfer request.'
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to create transfer request.'
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
            textDecoration: 'none',
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '30px',
            boxShadow:
              '0 8px 30px rgba(0, 0, 0, 0.08)',
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
              lineHeight: 1.6,
            }}
          >
            Transfer money to a Nigerian bank account securely.
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
            {/* BANK */}

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
              onChange={handleBankChange}
              style={{
                width: '100%',
                padding: '13px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff',
                fontSize: '16px',
              }}
            >
              <option value="">
                Select bank
              </option>

              {NIGERIAN_BANKS.map((item) => (
                <option
                  key={`${item.name}-${item.code}`}
                  value={item.name}
                >
                  {item.name}
                </option>
              ))}
            </select>

            {/* ACCOUNT NUMBER */}

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
                padding: '13px',
                marginBottom: '12px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            />

            {/* VERIFY */}

            <button
              type="button"
              onClick={verifyAccount}
              disabled={
                verifying ||
                !bank ||
                accountNumber.length !== 10
              }
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '20px',
                border:
                  '1px solid #0b5cff',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#0b5cff',
                fontWeight: 600,
                cursor:
                  verifying ||
                  !bank ||
                  accountNumber.length !== 10
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  verifying ||
                  !bank ||
                  accountNumber.length !== 10
                    ? 0.6
                    : 1,
              }}
            >
              {verifying
                ? 'Checking...'
                : 'Verify Account'}
            </button>

            {/* RECIPIENT */}

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
                padding: '13px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            />

            {/* AMOUNT */}

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
              onChange={(event) =>
                setAmount(event.target.value)
              }
              placeholder="Enter amount"
              style={{
                width: '100%',
                padding: '13px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            />

            {/* DESCRIPTION */}

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
                padding: '13px',
                marginBottom: '22px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                resize: 'vertical',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            />

            {/* SUBMIT */}

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
                fontSize: '16px',
                cursor: loading
                  ? 'not-allowed'
                  : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading
                ? 'Processing...'
                : 'Continue Transfer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
