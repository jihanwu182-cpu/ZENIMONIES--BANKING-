import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface Bank {
  name: string;
  code: string;
  slug?: string;
  active?: boolean;
  country?: string;
  currency?: string;
  type?: string;
}

const Transfer: React.FC = () => {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  const [bank, setBank] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [verified, setVerified] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  /*
   * Load the current Nigerian bank list from Zenimonies backend.
   *
   * The backend obtains the bank list securely from Paystack.
   * The Paystack secret key is NEVER exposed to this frontend.
   */
  useEffect(() => {
    const loadBanks = async () => {
      setBanksLoading(true);
      setError('');

      try {
        const response = await axios.get(
          `${API_URL}/api/banks`,
          {
            timeout: 15000,
          }
        );

        if (response.data?.success) {
          const bankList = Array.isArray(
            response.data.banks
          )
            ? response.data.banks
            : [];

          setBanks(bankList);
        } else {
          setError(
            response.data?.message ||
              'Unable to load Nigerian banks.'
          );
        }
      } catch (err: any) {
        console.error(
          'Load banks error:',
          err
        );

        setError(
          err?.response?.data?.message ||
            'Unable to load Nigerian banks. Please try again.'
        );
      } finally {
        setBanksLoading(false);
      }
    };

    loadBanks();
  }, []);

  /*
   * When the user changes bank, clear the previous
   * account verification because the bank code has changed.
   */
  const handleBankChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedCode = event.target.value;

    const selectedBank = banks.find(
      (item) => item.code === selectedCode
    );

    setBank(selectedBank?.name || '');
    setBankCode(selectedBank?.code || '');

    setRecipientName('');
    setVerified(false);

    setMessage('');
    setError('');
  };

  /*
   * Verify account number through our backend.
   *
   * The backend calls Paystack's /bank/resolve endpoint.
   * The Paystack secret key remains on the backend.
   */
  const verifyAccount = async () => {
    setError('');
    setMessage('');

    if (!bank || !bankCode) {
      setError('Please select a bank.');
      return;
    }

    const cleanAccountNumber =
      accountNumber.replace(/\D/g, '');

    if (cleanAccountNumber.length !== 10) {
      setError(
        'Please enter a valid 10-digit account number.'
      );
      return;
    }

    setVerifying(true);
    setRecipientName('');
    setVerified(false);

    try {
      const response = await axios.post(
        `${API_URL}/api/banks/resolve`,
        {
          account_number: cleanAccountNumber,
          bank_code: bankCode,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (
        response.data?.success &&
        response.data?.verified &&
        response.data?.account?.account_name
      ) {
        const resolvedName =
          response.data.account.account_name;

        setRecipientName(resolvedName);
        setVerified(true);

        setMessage(
          'Account verified successfully.'
        );
      } else {
        setError(
          response.data?.message ||
            'Unable to verify this bank account.'
        );
      }
    } catch (err: any) {
      console.error(
        'Verify account error:',
        err
      );

      setError(
        err?.response?.data?.message ||
          'Unable to verify this bank account. Please check the bank and account number.'
      );
    } finally {
      setVerifying(false);
    }
  };

  /*
   * Create transfer request.
   *
   * The backend is responsible for checking the user's
   * balance and processing the transfer.
   */
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

    const cleanAccountNumber =
      accountNumber.replace(/\D/g, '');

    if (cleanAccountNumber.length !== 10) {
      setError(
        'Account number must contain exactly 10 digits.'
      );
      return;
    }

    if (!verified || !recipientName.trim()) {
      setError(
        'Please verify the recipient account before continuing.'
      );
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        'Please enter a valid transfer amount.'
      );
      return;
    }

    if (numericAmount > 100000000) {
      setError(
        'Transfer amount is too large.'
      );
      return;
    }

    const token = localStorage.getItem(
      'zenimonies_token'
    );

    if (!token) {
      setError(
        'Your session has expired. Please log in again.'
      );
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/transfers`,
        {
          recipient_name:
            recipientName.trim(),

          recipient_account_number:
            cleanAccountNumber,

          recipient_bank_name:
            bank,

          recipient_bank_code:
            bankCode,

          amount: numericAmount,

          narration:
            description.trim() || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data?.message ||
            'Transfer request created successfully.'
        );

        setBank('');
        setBankCode('');
        setAccountNumber('');
        setRecipientName('');
        setAmount('');
        setDescription('');
        setVerified(false);
      } else {
        setError(
          response.data?.message ||
            'Unable to create transfer request.'
        );
      }
    } catch (err: any) {
      console.error(
        'Create transfer error:',
        err
      );

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
                background: verified
                  ? '#ecfdf3'
                  : '#eef4ff',
                color: verified
                  ? '#027a48'
                  : '#0b5cff',
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
              value={bankCode}
              onChange={handleBankChange}
              disabled={banksLoading}
              style={{
                width: '100%',
                padding: '13px',
                marginBottom: '18px',
                border: '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff',
                fontSize: '16px',
                boxSizing: 'border-box',
              }}
            >
              <option value="">
                {banksLoading
                  ? 'Loading banks...'
                  : 'Select bank'}
              </option>

              {banks.map((item) => (
                <option
                  key={`${item.code}-${item.name}`}
                  value={item.code}
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
              onChange={(event) => {
                const value =
                  event.target.value.replace(
                    /\D/g,
                    ''
                  );

                setAccountNumber(value);

                /*
                 * Changing the account number invalidates
                 * the previous verification.
                 */
                setRecipientName('');
                setVerified(false);
                setMessage('');
                setError('');
              }}
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
                banksLoading ||
                !bankCode ||
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
                  banksLoading ||
                  !bankCode ||
                  accountNumber.length !== 10
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  verifying ||
                  banksLoading ||
                  !bankCode ||
                  accountNumber.length !== 10
                    ? 0.6
                    : 1,
              }}
            >
              {verifying
                ? 'Checking Account...'
                : 'Verify Account'}
            </button>

            {/* VERIFIED RECIPIENT */}

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

            <div
              style={{
                position: 'relative',
                marginBottom: '18px',
              }}
            >
              <input
                id="recipientName"
                type="text"
                value={recipientName}
                readOnly
                placeholder="Verify account to retrieve name"
                style={{
                  width: '100%',
                  padding: '13px',
                  paddingRight: verified
                    ? '100px'
                    : '13px',
                  border:
                    verified
                      ? '1px solid #12b76a'
                      : '1px solid #d0d5dd',
                  borderRadius: '8px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  background:
                    verified
                      ? '#f6fef9'
                      : '#ffffff',
                }}
              />

              {verified && (
                <span
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform:
                      'translateY(-50%)',
                    color: '#027a48',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  ✓ Verified
                </span>
              )}
            </div>

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
                setDescription(
                  event.target.value
                )
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
              disabled={
                loading ||
                !verified
              }
              style={{
                width: '100%',
                padding: '14px',
                border: 'none',
                borderRadius: '8px',
                background:
                  loading || !verified
                    ? '#98a2b3'
                    : '#0b5cff',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '16px',
                cursor:
                  loading || !verified
                    ? 'not-allowed'
                    : 'pointer',
                opacity:
                  loading || !verified
                    ? 0.7
                    : 1,
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
