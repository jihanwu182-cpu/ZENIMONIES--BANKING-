import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

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

interface TransferResponse {
  success?: boolean;
  message?: string;
  transfer?: {
    reference?: string;
    status?: string;
  };
}

const Transfer: React.FC = () => {
  const navigate = useNavigate();

  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  const [loadingBanks, setLoadingBanks] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const token = localStorage.getItem('zenimonies_token');

  useEffect(() => {
    const loadBanks = async () => {
      try {
        setLoadingBanks(true);
        setError('');

        const response = await axios.get(
          `${API_URL}/api/banks`
        );

        if (
          response.data?.success &&
          Array.isArray(response.data.banks)
        ) {
          setBanks(response.data.banks);
        } else {
          setError(
            response.data?.message ||
              'Unable to load banks.'
          );
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            'Unable to load Nigerian banks.'
        );
      } finally {
        setLoadingBanks(false);
      }
    };

    loadBanks();
  }, []);

  const selectedBank = useMemo(
    () =>
      banks.find(
        (bank) => bank.code === bankCode
      ),
    [banks, bankCode]
  );

  const verifyAccount = async () => {
    setError('');
    setSuccess('');
    setRecipientName('');

    const cleanAccountNumber =
      accountNumber.replace(/\D/g, '');

    if (!bankCode) {
      setError(
        'Please select the recipient bank.'
      );
      return;
    }

    if (cleanAccountNumber.length !== 10) {
      setError(
        'Account number must contain exactly 10 digits.'
      );
      return;
    }

    try {
      setVerifying(true);

      const response = await axios.post(
        `${API_URL}/api/banks/resolve`,
        {
          account_number: cleanAccountNumber,
          bank_code: bankCode,
        }
      );

      if (
        response.data?.success &&
        response.data?.verified
      ) {
        setRecipientName(
          response.data.account?.account_name || ''
        );

        setAccountNumber(cleanAccountNumber);

        setSuccess(
          'Bank account verified successfully.'
        );
      } else {
        setError(
          response.data?.message ||
            'Unable to verify bank account.'
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to verify this bank account.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!token) {
      navigate('/login');
      return;
    }

    const cleanAccountNumber =
      accountNumber.replace(/\D/g, '');

    const transferAmount = Number(amount);

    if (!bankCode || !selectedBank) {
      setError(
        'Please select a recipient bank.'
      );
      return;
    }

    if (cleanAccountNumber.length !== 10) {
      setError(
        'Please enter and verify a valid 10-digit account number.'
      );
      return;
    }

    if (!recipientName.trim()) {
      setError(
        'Please verify the recipient bank account first.'
      );
      return;
    }

    if (
      !Number.isFinite(transferAmount) ||
      transferAmount <= 0
    ) {
      setError(
        'Please enter a valid transfer amount.'
      );
      return;
    }

    try {
      setSending(true);

      const response =
        await axios.post<TransferResponse>(
          `${API_URL}/api/transfers`,
          {
            recipient_name:
              recipientName.trim(),

            recipient_account_number:
              cleanAccountNumber,

            recipient_bank_name:
              selectedBank.name,

            recipient_bank_code:
              selectedBank.code,

            amount: transferAmount,

            narration:
              narration.trim() || undefined,
          },
          {
            headers: {
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',
            },
          }
        );

      if (response.data?.success) {
        setSuccess(
          response.data.message ||
            'Transfer accepted for processing.'
        );

        setAmount('');
        setNarration('');
      } else {
        setError(
          response.data?.message ||
            'Transfer failed.'
        );
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem(
          'zenimonies_token'
        );

        navigate('/login');
        return;
      }

      setError(
        err?.response?.data?.message ||
          'Unable to process the transfer.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: '24px',
        boxSizing: 'border-box',
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
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '28px',
            boxShadow:
              '0 8px 30px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h1
            style={{
              marginTop: 0,
              color: '#172033',
            }}
          >
            Bank Transfer
          </h1>

          <p
            style={{
              color: '#667085',
              marginBottom: '24px',
            }}
          >
            Send money to a Nigerian bank account.
          </p>

          {error && (
            <div
              style={{
                padding: '12px',
                marginBottom: '16px',
                borderRadius: '8px',
                background: '#fee4e2',
                color: '#b42318',
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '12px',
                marginBottom: '16px',
                borderRadius: '8px',
                background: '#ecfdf3',
                color: '#027a48',
              }}
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="bank"
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              Recipient Bank
            </label>

            <select
              id="bank"
              value={bankCode}
              onChange={(event) => {
                setBankCode(
                  event.target.value
                );

                setRecipientName('');
                setSuccess('');
              }}
              disabled={
                loadingBanks ||
                sending ||
                verifying
              }
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border:
                  '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#ffffff',
                boxSizing: 'border-box',
              }}
            >
              <option value="">
                {loadingBanks
                  ? 'Loading banks...'
                  : 'Select a bank'}
              </option>

              {banks.map((bank) => (
                <option
                  key={`${bank.code}-${bank.name}`}
                  value={bank.code}
                >
                  {bank.name}
                </option>
              ))}
            </select>

            <label
              htmlFor="accountNumber"
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              Account Number
            </label>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '18px',
              }}
            >
              <input
                id="accountNumber"
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={accountNumber}
                onChange={(event) => {
                  setAccountNumber(
                    event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 10)
                  );

                  setRecipientName('');
                  setSuccess('');
                }}
                placeholder="10-digit account number"
                disabled={
                  sending ||
                  verifying
                }
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '12px',
                  border:
                    '1px solid #d0d5dd',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="button"
                onClick={verifyAccount}
                disabled={
                  verifying ||
                  sending
                }
                style={{
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0 16px',
                  background: '#172033',
                  color: '#ffffff',
                  fontWeight: 600,
                }}
              >
                {verifying
                  ? 'Checking...'
                  : 'Verify'}
              </button>
            </div>

            <label
              htmlFor="recipientName"
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              Recipient Name
            </label>

            <input
              id="recipientName"
              type="text"
              value={recipientName}
              readOnly
              placeholder="Verify account to display name"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border:
                  '1px solid #d0d5dd',
                borderRadius: '8px',
                background: '#f9fafb',
                boxSizing: 'border-box',
              }}
            />

            <label
              htmlFor="amount"
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '6px',
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
                setAmount(
                  event.target.value
                )
              }
              placeholder="Enter amount"
              disabled={sending}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '18px',
                border:
                  '1px solid #d0d5dd',
                borderRadius: '8px',
                boxSizing: 'border-box',
              }}
            />

            <label
              htmlFor="narration"
              style={{
                display: 'block',
                fontWeight: 600,
                marginBottom: '6px',
              }}
            >
              Narration (optional)
            </label>

            <input
              id="narration"
              type="text"
              value={narration}
              onChange={(event) =>
                setNarration(
                  event.target.value
                )
              }
              placeholder="What is this transfer for?"
              disabled={sending}
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '22px',
                border:
                  '1px solid #d0d5dd',
                borderRadius: '8px',
                boxSizing: 'border-box',
              }}
            />

            <button
              type="submit"
              disabled={
                sending ||
                verifying ||
                !recipientName
              }
              style={{
                width: '100%',
                padding: '13px',
                border: 'none',
                borderRadius: '8px',
                background: '#0b5cff',
                color: '#ffffff',
                fontWeight: 600,
                opacity:
                  sending ||
                  !recipientName
                    ? 0.7
                    : 1,
              }}
            >
              {sending
                ? 'Processing Transfer...'
                : 'Send Money'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
