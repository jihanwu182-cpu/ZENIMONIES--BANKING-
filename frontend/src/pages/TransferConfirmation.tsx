import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Bank {
  name: string;
  code: string;
  slug?: string;
  active?: boolean;
  country?: string;
  currency?: string;
  type?: string;
}

interface TransferState {
  bank?: Bank;
  accountNumber?: string;
  accountName?: string;
  amount?: number;
  narration?: string;
  accountVerified?: boolean;
}

interface TransferResponse {
  success?: boolean;
  message?: string;
  transfer?: {
    id?: string | number;
    reference?: string;
    provider_reference?: string;
    recipient_name?: string;
    recipient_account_number?: string;
    recipient_bank_name?: string;
    amount?: number;
    currency?: string;
    status?: string;
    created_at?: string;
  };
}

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const TransferConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const transfer = (location.state || {}) as TransferState;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState('');
  const [status, setStatus] = useState('');

  const bankName =
    transfer.bank?.name || 'Bank';

  const bankCode =
    transfer.bank?.code || '';

  const accountNumber =
    transfer.accountNumber || '';

  const accountName =
    transfer.accountName || '';

  const amount =
    Number(transfer.amount) || 0;

  const narration =
    transfer.narration || '';

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const getToken = () => {
    return (
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      ''
    );
  };

  const handleConfirmTransfer = async () => {
    setError('');

    if (!transfer.accountVerified) {
      setError(
        'Please go back and verify the recipient account first.'
      );
      return;
    }

    if (!bankCode) {
      setError(
        'Bank information is missing. Please go back and select the bank again.'
      );
      return;
    }

    if (!accountNumber) {
      setError(
        'Recipient account number is missing.'
      );
      return;
    }

    if (!accountName) {
      setError(
        'Recipient account name is missing.'
      );
      return;
    }

    if (!amount || amount <= 0) {
      setError(
        'Please enter a valid transfer amount.'
      );
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        'Your session has expired. Please log in again.'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/transfers`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            recipient_name: accountName,
            recipient_account_number:
              accountNumber,
            recipient_bank_name: bankName,
            recipient_bank_code: bankCode,
            amount,
            narration:
              narration.trim() ||
              undefined,
          }),
        }
      );

      const data: TransferResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to process this bank transfer.'
        );
      }

      setReference(
        data.transfer?.reference || ''
      );

      setStatus(
        data.transfer?.status ||
          'processing'
      );

      setSuccess(true);

    } catch (err: any) {
      console.error(
        'Bank transfer confirmation error:',
        err
      );

      setError(
        err?.message ||
          'Unable to process the transfer. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={styles.page}>
        <main style={styles.main}>
          <div style={styles.successCard}>
            <div style={styles.successIcon}>
              ✓
            </div>

            <h1 style={styles.successTitle}>
              Transfer Processing
            </h1>

            <p style={styles.successText}>
              Your bank transfer has been
              accepted and is now being
              processed.
            </p>

            <div style={styles.successAmount}>
              ₦{formatAmount(amount)}
            </div>

            <div style={styles.recipientBox}>
              <div style={styles.detailLabel}>
                Recipient
              </div>

              <div style={styles.detailValue}>
                {accountName}
              </div>

              <div style={styles.detailSubValue}>
                {accountNumber}
              </div>

              <div
                style={{
                  ...styles.detailSubValue,
                  marginTop: '4px',
                }}
              >
                {bankName}
              </div>
            </div>

            <div style={styles.processingNotice}>
              <strong>
                Status: Processing
              </strong>

              <span>
                The final transfer status will
                be updated after the bank and
                payment provider confirm it.
              </span>
            </div>

            {reference && (
              <div style={styles.referenceBox}>
                <div style={styles.detailLabel}>
                  Transfer Reference
                </div>

                <div style={styles.reference}>
                  {reference}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() =>
                navigate('/transactions')
              }
              style={styles.primaryButton}
            >
              View Transactions
            </button>

            <button
              type="button"
              onClick={() =>
                navigate('/')
              }
              style={styles.secondaryButton}
            >
              Back to Dashboard
            </button>

            <div style={styles.securityText}>
              🔒 Your transfer is protected
              by Zenimonies security controls.
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button
            type="button"
            onClick={() =>
              navigate('/to-bank')
            }
            style={styles.backButton}
            aria-label="Back"
          >
            ←
          </button>

          <div>
            <div style={styles.headerTitle}>
              Review Transfer
            </div>

            <div style={styles.headerSubtitle}>
              Confirm the recipient and amount
            </div>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.intro}>
          <div style={styles.eyebrow}>
            BANK TRANSFER
          </div>

          <h1 style={styles.title}>
            Review your transfer
          </h1>

          <p style={styles.subtitle}>
            Please check the details carefully
            before confirming.
          </p>
        </div>

        <section style={styles.card}>
          <div style={styles.amountSection}>
            <div style={styles.amountLabel}>
              Amount
            </div>

            <div style={styles.amount}>
              ₦{formatAmount(amount)}
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.details}>
            <div style={styles.detailRow}>
              <div style={styles.detailLabel}>
                Recipient
              </div>

              <div
                style={{
                  ...styles.detailValue,
                  textAlign: 'right',
                }}
              >
                {accountName}
              </div>
            </div>

            <div style={styles.detailRow}>
              <div style={styles.detailLabel}>
                Account number
              </div>

              <div
                style={{
                  ...styles.detailValue,
                  textAlign: 'right',
                }}
              >
                {accountNumber}
              </div>
            </div>

            <div style={styles.detailRow}>
              <div style={styles.detailLabel}>
                Bank
              </div>

              <div
                style={{
                  ...styles.detailValue,
                  textAlign: 'right',
                  maxWidth: '58%',
                }}
              >
                {bankName}
              </div>
            </div>

            {narration && (
              <div style={styles.detailRow}>
                <div style={styles.detailLabel}>
                  Narration
                </div>

                <div
                  style={{
                    ...styles.detailValue,
                    textAlign: 'right',
                    maxWidth: '58%',
                  }}
                >
                  {narration}
                </div>
              </div>
            )}

            <div style={styles.detailRow}>
              <div style={styles.detailLabel}>
                Currency
              </div>

              <div
                style={{
                  ...styles.detailValue,
                  textAlign: 'right',
                }}
              >
                NGN
              </div>
            </div>
          </div>

          <div style={styles.verifiedBox}>
            <div style={styles.verifiedIcon}>
              ✓
            </div>

            <div>
              <div style={styles.verifiedTitle}>
                Account verified
              </div>

              <div style={styles.verifiedText}>
                The recipient account has been
                verified before this transfer.
              </div>
            </div>
          </div>

          {error && (
            <div style={styles.errorBox}>
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleConfirmTransfer}
            disabled={loading}
            style={{
              ...styles.primaryButton,
              opacity: loading ? 0.65 : 1,
            }}
          >
            {loading
              ? 'Processing Transfer...'
              : `Confirm Transfer • ₦${formatAmount(
                  amount
                )}`}
          </button>

          <button
            type="button"
            onClick={() =>
              navigate('/to-bank')
            }
            disabled={loading}
            style={styles.secondaryButton}
          >
            Cancel
          </button>

          <div style={styles.securityText}>
            🔒 Please make sure the recipient
            details are correct before confirming.
          </div>
        </section>
      </main>
    </div>
  );
};

const styles: {
  [key: string]: React.CSSProperties;
} = {
  page: {
    minHeight: '100vh',
    background: '#f6faf8',
    color: '#16352b',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: '40px',
  },

  header: {
    background: '#ffffff',
    borderBottom: '1px solid #e5ebe8',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  headerInner: {
    width: 'min(920px, 92%)',
    margin: '0 auto',
    minHeight: '76px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },

  backButton: {
    width: '56px',
    height: '56px',
    borderRadius: '17px',
    border: '1px solid #d9e4df',
    background: '#ffffff',
    color: '#07834a',
    fontSize: '34px',
    lineHeight: 1,
    fontWeight: 700,
    cursor: 'pointer',
  },

  headerTitle: {
    fontSize: '25px',
    fontWeight: 800,
    color: '#073c30',
  },

  headerSubtitle: {
    marginTop: '4px',
    color: '#71817b',
    fontSize: '14px',
    fontWeight: 600,
  },

  main: {
    width: 'min(700px, 92%)',
    margin: '0 auto',
    paddingTop: '28px',
  },

  intro: {
    marginBottom: '18px',
  },

  eyebrow: {
    color: '#07834a',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '1.5px',
    marginBottom: '8px',
  },

  title: {
    margin: 0,
    color: '#063b2d',
    fontSize: '29px',
    fontWeight: 850,
  },

  subtitle: {
    margin: '8px 0 0',
    color: '#71817b',
    fontSize: '15px',
    lineHeight: 1.55,
  },

  card: {
    background: '#ffffff',
    border: '1px solid #dfe9e4',
    borderRadius: '24px',
    padding: '24px',
    boxShadow:
      '0 12px 35px rgba(26, 61, 47, 0.07)',
  },

  amountSection: {
    textAlign: 'center',
    padding: '8px 0 20px',
  },

  amountLabel: {
    color: '#71817b',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '6px',
  },

  amount: {
    color: '#063b2d',
    fontSize: '36px',
    fontWeight: 850,
    letterSpacing: '-1px',
  },

  divider: {
    height: '1px',
    background: '#e8eeeb',
    margin: '0 0 18px',
  },

  details: {
    display: 'flex',
    flexDirection: 'column',
    gap: '17px',
  },

  detailRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '20px',
  },

  detailLabel: {
    color: '#7a8983',
    fontSize: '13px',
    fontWeight: 600,
  },

  detailValue: {
    color: '#18392f',
    fontSize: '14px',
    fontWeight: 750,
  },

  verifiedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '13px',
    marginTop: '24px',
    padding: '15px',
    borderRadius: '16px',
    background: '#ecfaf3',
    border: '1px solid #bcebd3',
  },

  verifiedIcon: {
    flexShrink: 0,
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 800,
  },

  verifiedTitle: {
    color: '#087c43',
    fontSize: '13px',
    fontWeight: 850,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  verifiedText: {
    marginTop: '3px',
    color: '#60736a',
    fontSize: '12px',
    lineHeight: 1.45,
  },

  errorBox: {
    marginTop: '18px',
    padding: '14px',
    borderRadius: '13px',
    background: '#fff1f1',
    border: '1px solid #f2caca',
    color: '#b42318',
    fontSize: '13px',
    fontWeight: 650,
    lineHeight: 1.5,
  },

  primaryButton: {
    width: '100%',
    minHeight: '58px',
    marginTop: '22px',
    border: 'none',
    borderRadius: '16px',
    background:
      'linear-gradient(135deg, #079447, #007a3f)',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 800,
    cursor: 'pointer',
    padding: '14px 18px',
  },

  secondaryButton: {
    width: '100%',
    minHeight: '52px',
    marginTop: '10px',
    border: '1px solid #d3ded9',
    borderRadius: '15px',
    background: '#ffffff',
    color: '#25453a',
    fontSize: '15px',
    fontWeight: 750,
    cursor: 'pointer',
    padding: '13px 18px',
  },

  securityText: {
    marginTop: '18px',
    textAlign: 'center',
    color: '#8a9892',
    fontSize: '11px',
    lineHeight: 1.5,
  },

  successCard: {
    background: '#ffffff',
    border: '1px solid #dfe9e4',
    borderRadius: '24px',
    padding: '30px 24px',
    textAlign: 'center',
    boxShadow:
      '0 12px 35px rgba(26, 61, 47, 0.07)',
  },

  successIcon: {
    width: '76px',
    height: '76px',
    margin: '0 auto 18px',
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '42px',
    fontWeight: 800,
  },

  successTitle: {
    margin: 0,
    color: '#063b2d',
    fontSize: '27px',
    fontWeight: 850,
  },

  successText: {
    margin: '10px auto 0',
    maxWidth: '480px',
    color: '#6d7d76',
    fontSize: '14px',
    lineHeight: 1.6,
  },

  successAmount: {
    marginTop: '22px',
    color: '#087c43',
    fontSize: '34px',
    fontWeight: 850,
  },

  recipientBox: {
    marginTop: '22px',
    padding: '17px',
    borderRadius: '16px',
    background: '#f6faf8',
    border: '1px solid #e0eae5',
  },

  detailSubValue: {
    marginTop: '5px',
    color: '#71817b',
    fontSize: '12px',
    fontWeight: 600,
  },

  processingNotice: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
    marginTop: '16px',
    padding: '15px',
    borderRadius: '15px',
    background: '#fff9e8',
    border: '1px solid #f2dfaa',
    color: '#795d00',
    fontSize: '12px',
    lineHeight: 1.5,
  },

  referenceBox: {
    marginTop: '15px',
    padding: '14px',
    borderRadius: '14px',
    background: '#f8faf9',
    border: '1px solid #e2e9e6',
  },

  reference: {
    marginTop: '5px',
    color: '#18392f',
    fontSize: '12px',
    fontWeight: 750,
    wordBreak: 'break-all',
  },
};

export default TransferConfirmation;
