import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import axios from 'axios';

import BeneficiaryTabs from '../components/BeneficiaryTabs.tsx';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

/*
 * ============================================================
 * TYPES
 * ============================================================
 */

interface Recipient {
  id: string;
  full_name: string;
  phone: string;
  account_number?: string;
  currency?: string;
  is_verified?: boolean;
}

interface LookupResponse {
  success?: boolean;
  message?: string;
  user?: Recipient;
}

interface RecentRecipient {
  full_name: string;
  phone: string;
  completed_at?: string;
  reference?: string;
}

interface RecentRecipientsResponse {
  success?: boolean;
  message?: string;
  recipients?: RecentRecipient[];
}

interface SavedBeneficiary {
  id: string;
  name: string;
  bank_name: string;
  bank_code?: string;
  account_number?: string;
  recipient_type: string;
  recipient_phone?: string;
  created_at?: string;
}

interface TransferRecord {
  id?: string;
  reference?: string;
  transaction_reference?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_account?: string;
  recipient_bank?: string;
  amount?: number;
  transaction_fee?: number;
  total_debit?: number;
  currency?: string;
  status?: string;
  balance_before?: number;
  balance_after?: number;
  created_at?: string;
  description?: string;
}

interface TransferResponse {
  success?: boolean;
  message?: string;
  transfer?: TransferRecord;
}

/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

const Transfer: React.FC = () => {
  const navigate = useNavigate();

  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  const [
    saveAsBeneficiary,
    setSaveAsBeneficiary,
  ] = useState(false);

  const [recipient, setRecipient] =
    useState<Recipient | null>(null);

  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);

  /*
   * ==========================================================
   * RECENT RECIPIENTS
   * ==========================================================
   */

  const [
    recentRecipients,
    setRecentRecipients,
  ] = useState<RecentRecipient[]>([]);

  const [
    loadingRecentRecipients,
    setLoadingRecentRecipients,
  ] = useState(false);

  const [
    recentRecipientsError,
    setRecentRecipientsError,
  ] = useState('');

  /*
   * Saved beneficiaries remain collapsed
   * until the user chooses to open them.
   */

  const [
    showSavedBeneficiaries,
    setShowSavedBeneficiaries,
  ] = useState(false);

  /*
   * ==========================================================
   * TRANSACTION PIN STATE
   * ==========================================================
   */

  const [
    showTransactionPin,
    setShowTransactionPin,
  ] = useState(false);

  const [
    transactionPin,
    setTransactionPin,
  ] = useState('');

  const [
    verifyingTransactionPin,
    setVerifyingTransactionPin,
  ] = useState(false);

  const [
    transactionPinError,
    setTransactionPinError,
  ] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reference, setReference] = useState('');

  const [balanceAfter, setBalanceAfter] =
    useState<number | null>(null);

  const [
    recipientAccountNumber,
    setRecipientAccountNumber,
  ] = useState('');

  /*
   * ==========================================================
   * AUTH TOKEN
   * ==========================================================
   */

  const token =
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token');

  /*
   * ==========================================================
   * CLEAN PHONE
   * ==========================================================
   */

  const cleanPhone = useMemo(
    () => phone.replace(/\s+/g, '').trim(),
    [phone]
  );

  /*
   * ==========================================================
   * TRANSFER AMOUNT
   * ==========================================================
   */

  const transferAmount = Number(amount);

  /*
   * ==========================================================
   * TRANSFER FEE PREVIEW
   * ==========================================================
   */

  const transactionFee = useMemo(() => {
    if (
      !Number.isFinite(transferAmount) ||
      transferAmount < 20
    ) {
      return 0;
    }

    if (transferAmount < 1000) {
      return 0;
    }

    if (transferAmount < 10000) {
      return 20;
    }

    if (transferAmount < 100000) {
      return 56;
    }

    return 75;
  }, [transferAmount]);

  /*
   * ==========================================================
   * TOTAL DEBIT
   * ==========================================================
   */

  const totalDebit =
    Number.isFinite(transferAmount) &&
    transferAmount >= 20
      ? transferAmount + transactionFee
      : 0;

  /*
   * ==========================================================
   * FORMAT MONEY
   * ==========================================================
   */

  const formatNaira = (value: number) =>
    `₦${Number(value || 0).toLocaleString(
      'en-NG',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;

  /*
   * ==========================================================
   * FETCH RECENT RECIPIENTS
   *
   * Backend:
   * GET /api/internal-transfers/recent
   *
   * This endpoint returns successful transfers
   * only, with the most recent recipient first.
   * ==========================================================
   */

  const loadRecentRecipients = useCallback(
    async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        setLoadingRecentRecipients(true);
        setRecentRecipientsError('');

        const response =
          await axios.get<RecentRecipientsResponse>(
            `${API_URL.replace(/\/+$/, '')}/api/internal-transfers/recent`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

        if (response.data?.success) {
          setRecentRecipients(
            Array.isArray(response.data.recipients)
              ? response.data.recipients
              : []
          );
        } else {
          setRecentRecipients([]);
          setRecentRecipientsError(
            response.data?.message ||
              'Unable to load recent recipients.'
          );
        }
      } catch (err: any) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('zenimonies_token');
          localStorage.removeItem('token');
          localStorage.removeItem('access_token');

          navigate('/login');
          return;
        }

        setRecentRecipientsError(
          err?.response?.data?.message ||
            'Unable to load recent recipients. Please try again.'
        );
      } finally {
        setLoadingRecentRecipients(false);
      }
    },
    [token, navigate]
  );

  /*
   * Load recent recipients when the page opens.
   */

  useEffect(() => {
    void loadRecentRecipients();
  }, [loadRecentRecipients]);

  /*
   * ==========================================================
   * VERIFY PHONE NUMBER
   *
   * Used by:
   * 1. Verify button
   * 2. Recent recipient selection
   * 3. Saved beneficiary selection
   * ==========================================================
   */

  const verifyPhoneNumber = async (
    phoneNumber: string
  ) => {
    setError('');
    setSuccess('');
    setRecipient(null);
    setReference('');
    setBalanceAfter(null);
    setRecipientAccountNumber('');

    if (!token) {
      navigate('/login');
      return;
    }

    const cleanedPhone = phoneNumber
      .replace(/\s+/g, '')
      .trim();

    if (!cleanedPhone) {
      setError(
        'Please enter the recipient phone number.'
      );
      return;
    }

    if (cleanedPhone.length < 10) {
      setError(
        'Please enter a valid Zenimonies phone number.'
      );
      return;
    }

    try {
      setChecking(true);

      const response =
        await axios.get<LookupResponse>(
          `${API_URL}/api/internal-transfers/user`,
          {
            params: {
              phone: cleanedPhone,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      if (
        response.data?.success &&
        response.data?.user
      ) {
        const verifiedRecipient =
          response.data.user;

        setRecipient(verifiedRecipient);

        setPhone(
          verifiedRecipient.phone || cleanedPhone
        );

        setRecipientAccountNumber(
          verifiedRecipient.account_number || ''
        );

        setSuccess(
          'Zenimonies recipient verified.'
        );
      } else {
        setError(
          response.data?.message ||
            'Unable to find this Zenimonies user.'
        );
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        localStorage.removeItem('zenimonies_token');
        localStorage.removeItem('token');
        localStorage.removeItem('access_token');

        navigate('/login');
        return;
      }

      setError(
        err?.response?.data?.message ||
          'Unable to verify this Zenimonies user.'
      );
    } finally {
      setChecking(false);
    }
  };

  /*
   * ==========================================================
   * VERIFY RECIPIENT BUTTON
   * ==========================================================
   */

  const verifyRecipient = async () => {
    await verifyPhoneNumber(cleanPhone);
  };

  /*
   * ==========================================================
   * SELECT RECENT RECIPIENT
   * ==========================================================
   */

  const selectRecentRecipient = async (
    item: RecentRecipient
  ) => {
    const selectedPhone = String(
      item.phone || ''
    )
      .replace(/\s+/g, '')
      .trim();

    if (!selectedPhone) {
      setError(
        'This recent recipient does not have a valid phone number.'
      );
      return;
    }

    /*
     * Clear previous transfer details
     * before verifying the new recipient.
     */

    setPhone(selectedPhone);
    setAmount('');
    setNarration('');
    setRecipient(null);

    setError('');
    setSuccess('');
    setReference('');
    setBalanceAfter(null);
    setRecipientAccountNumber('');

    setTransactionPin('');
    setTransactionPinError('');
    setShowTransactionPin(false);

    setSaveAsBeneficiary(false);

    setShowSavedBeneficiaries(false);

    await verifyPhoneNumber(selectedPhone);
  };

  /*
   * ==========================================================
   * SELECT SAVED BENEFICIARY
   * ==========================================================
   */

  const selectSavedBeneficiary = async (
    beneficiary: SavedBeneficiary
  ) => {
    const selectedPhone = String(
      beneficiary.recipient_phone || ''
    )
      .replace(/\s+/g, '')
      .trim();

    if (!selectedPhone) {
      setError(
        'This saved beneficiary does not have a valid Zenimonies phone number.'
      );
      return;
    }

    /*
     * Clear previous transfer details
     * before verifying the selected beneficiary.
     */

    setPhone(selectedPhone);
    setAmount('');
    setNarration('');
    setRecipient(null);

    setError('');
    setSuccess('');
    setReference('');
    setBalanceAfter(null);
    setRecipientAccountNumber('');

    setTransactionPin('');
    setTransactionPinError('');
    setShowTransactionPin(false);

    setSaveAsBeneficiary(false);

    setShowSavedBeneficiaries(false);

    await verifyPhoneNumber(selectedPhone);
  };

  /*
   * ==========================================================
   * PHONE INPUT CHANGE
   * ==========================================================
   */

  const handlePhoneChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPhone(event.target.value);

    setRecipient(null);
    setSuccess('');
    setError('');
    setReference('');
    setBalanceAfter(null);
    setRecipientAccountNumber('');
  };

  /*
   * ==========================================================
   * SAVE SUCCESSFUL RECIPIENT
   * ==========================================================
   */

  const saveSuccessfulBeneficiary =
    async () => {
      if (
        !saveAsBeneficiary ||
        !recipient ||
        !token
      ) {
        return;
      }

      try {
        await axios.post(
          `${API_URL}/api/beneficiaries`,
          {
            recipient_type: 'zenimonies',
            name: recipient.full_name,
            recipient_phone:
              recipient.phone || cleanPhone,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        setSaveAsBeneficiary(false);
      } catch (error: any) {
        /*
         * The transfer already succeeded.
         * Saving a beneficiary must not reverse
         * or mark the transfer as failed.
         */

        console.error(
          'Unable to save beneficiary:',
          error
        );

        setSaveAsBeneficiary(false);
      }
    };

  /*
   * ==========================================================
   * SEND MONEY — OPEN PIN PROMPT
   * ==========================================================
   */

  const handleSend = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');
    setReference('');
    setBalanceAfter(null);
    setTransactionPinError('');

    if (!token) {
      navigate('/login');
      return;
    }

    if (!recipient) {
      setError(
        'Please verify the recipient first.'
      );
      return;
    }

    if (
      !Number.isFinite(transferAmount) ||
      transferAmount < 20
    ) {
      setError(
        'Minimum transfer amount is ₦20.'
      );
      return;
    }

    if (
      Math.round(transferAmount * 100) !==
      transferAmount * 100
    ) {
      setError(
        'Transfer amount can have a maximum of two decimal places.'
      );
      return;
    }

    if (transferAmount > 100000000) {
      setError(
        'Transfer amount is too large.'
      );
      return;
    }

    setTransactionPin('');
    setTransactionPinError('');
    setShowTransactionPin(true);
  };

  /*
   * ==========================================================
   * VERIFY TRANSACTION PIN + SEND
   * ==========================================================
   */

  const verifyTransactionPinAndSend =
    async () => {
      setTransactionPinError('');
      setError('');
      setSuccess('');

      if (!token) {
        navigate('/login');
        return;
      }

      if (!recipient) {
        setTransactionPinError(
          'Please verify the recipient first.'
        );
        return;
      }

      if (!/^\d{4}$/.test(transactionPin)) {
        setTransactionPinError(
          'Please enter your 4-digit Transaction PIN.'
        );
        return;
      }

      try {
        setVerifyingTransactionPin(true);
        setSending(true);

        const response =
          await axios.post<TransferResponse>(
            `${API_URL}/api/internal-transfers`,
            {
              recipient_phone: cleanPhone,
              amount: transferAmount,
              narration:
                narration.trim() || undefined,
              transaction_pin: transactionPin,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

        /*
         * Clear PIN immediately.
         */

        setTransactionPin('');
        setShowTransactionPin(false);

        /*
         * ======================================================
         * SUCCESSFUL TRANSFER
         * ======================================================
         */

        if (
          response.data?.success &&
          response.data?.transfer
        ) {
          const transfer =
            response.data.transfer;

          const receiptTransaction = {
            id: transfer.id || '',

            reference:
              transfer.reference || '',

            transaction_reference:
              transfer.transaction_reference ||
              transfer.reference ||
              '',

            type: 'internal_transfer',

            transaction_type:
              'internal_transfer',

            category: 'debit',

            status:
              transfer.status || 'pending',

            amount: Number(
              transfer.amount ?? 0
            ),

            transaction_fee: Number(
              transfer.transaction_fee ?? 0
            ),

            total_debit: Number(
              transfer.total_debit ?? 0
            ),

            currency:
              transfer.currency || 'NGN',

            recipient_name:
              transfer.recipient_name ||
              recipient.full_name,

            recipient_phone:
              transfer.recipient_phone ||
              recipient.phone,

            recipient_account:
              transfer.recipient_account || '',

            recipient_bank:
              transfer.recipient_bank ||
              'Zenimonies',

            balance_after: Number(
              transfer.balance_after ?? 0
            ),

            created_at:
              transfer.created_at || '',

            description:
              transfer.description ||
              narration.trim() ||
              `Transfer to ${
                transfer.recipient_name ||
                recipient.full_name
              }`,
          };

          /*
           * Save beneficiary only after
           * the transfer has succeeded.
           */

          await saveSuccessfulBeneficiary();

          /*
           * Refresh recent recipients so the
           * next visit reflects the latest transfer.
           */

          void loadRecentRecipients();

          navigate(
            '/transaction-receipt',
            {
              state: {
                transaction:
                  receiptTransaction,
              },
            }
          );

          return;
        }

        setError(
          response.data?.message ||
            'Transfer failed.'
        );
      } catch (err: any) {
        const status =
          err?.response?.status;

        const code =
          err?.response?.data?.code;

        /*
         * TRANSACTION PIN ERRORS
         */

        if (
          code ===
            'INCORRECT_TRANSACTION_PIN' ||
          code ===
            'TRANSACTION_PIN_LOCKED' ||
          code ===
            'TRANSACTION_PIN_NOT_SET' ||
          status === 423
        ) {
          setTransactionPinError(
            err?.response?.data?.message ||
              'Transaction PIN verification failed.'
          );

          setShowTransactionPin(true);

          return;
        }

        /*
         * AUTHENTICATION EXPIRED
         */

        if (status === 401) {
          localStorage.removeItem(
            'zenimonies_token'
          );

          localStorage.removeItem('token');

          localStorage.removeItem(
            'access_token'
          );

          setTransactionPin('');
          setShowTransactionPin(false);

          navigate('/login');

          return;
        }

        /*
         * GENERAL ERROR
         */

        setError(
          err?.response?.data?.message ||
            'Unable to complete the transfer.'
        );
      } finally {
        setVerifyingTransactionPin(false);
        setSending(false);
      }
    };

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <header style={styles.header}>
        <Link
          to="/"
          style={styles.brandLink}
        >
          <div style={styles.logo}>
            Z
          </div>

          <div>
            <div style={styles.brandName}>
              Zenimonies
            </div>

            <div style={styles.brandSubtitle}>
              DIGITAL BANKING
            </div>
          </div>
        </Link>

        <Link
          to="/"
          style={styles.homeLink}
        >
          Home
        </Link>
      </header>

      {/* MAIN */}

      <main style={styles.main}>
        <Link
          to="/"
          style={styles.backLink}
        >
          ← Back to Dashboard
        </Link>

        <section style={styles.card}>
          <div style={styles.iconCircle}>
            ➤
          </div>

          <h1 style={styles.title}>
            Send to ZENIMONIES
          </h1>

          <p style={styles.subtitle}>
            Send money instantly to another
            active Zenimonies account.
          </p>

          {/* ERROR */}

          {error && (
            <div
              style={styles.errorBox}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && recipient && (
            <div
              style={styles.successBox}
              role="status"
            >
              <strong>
                {success}
              </strong>
            </div>
          )}

          {/* ==================================================
              RECENT RECIPIENTS
              ================================================== */}

          {!recipient && (
            <div style={styles.recentSection}>
              <div style={styles.recentHeader}>
                <div>
                  <h2 style={styles.recentTitle}>
                    Recent Recipients
                  </h2>

                  <p style={styles.recentSubtitle}>
                    Quickly send money to people
                    you've transferred to before.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void loadRecentRecipients();
                  }}
                  disabled={loadingRecentRecipients}
                  style={styles.refreshButton}
                  title="Refresh recent recipients"
                >
                  {loadingRecentRecipients
                    ? '...'
                    : '↻'}
                </button>
              </div>

              {loadingRecentRecipients &&
                recentRecipients.length === 0 && (
                  <div style={styles.recentEmpty}>
                    <div style={styles.loadingDot} />
                    Loading recent recipients...
                  </div>
                )}

              {recentRecipientsError && (
                <div
                  style={styles.recentError}
                  role="alert"
                >
                  <span>
                    {recentRecipientsError}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      void loadRecentRecipients();
                    }}
                    style={styles.retryButton}
                  >
                    Retry
                  </button>
                </div>
              )}

              {!loadingRecentRecipients &&
                !recentRecipientsError &&
                recentRecipients.length === 0 && (
                  <div style={styles.recentEmpty}>
                    <div style={styles.emptyIcon}>
                      ↗
                    </div>

                    <strong style={styles.emptyTitle}>
                      No recent recipients yet
                    </strong>

                    <span style={styles.emptyText}>
                      Your successful Zenimonies
                      transfers will appear here.
                    </span>
                  </div>
                )}

              {recentRecipients.length > 0 && (
                <div style={styles.recentList}>
                  {recentRecipients.map(
                    (item, index) => (
                      <button
                        key={
                          item.phone ||
                          item.reference ||
                          index
                        }
                        type="button"
                        onClick={() => {
                          void selectRecentRecipient(
                            item
                          );
                        }}
                        disabled={
                          checking || sending
                        }
                        style={styles.recentItem}
                      >
                        <div style={styles.recentAvatar}>
                          {item.full_name
                            ? item.full_name
                                .charAt(0)
                                .toUpperCase()
                            : 'Z'}
                        </div>

                        <div style={styles.recentInfo}>
                          <strong
                            style={styles.recentName}
                          >
                            {item.full_name ||
                              'Zenimonies User'}
                          </strong>

                          <span
                            style={styles.recentPhone}
                          >
                            {item.phone}
                          </span>

                          {item.completed_at && (
                            <span
                              style={styles.recentDate}
                            >
                              {new Date(
                                item.completed_at
                              ).toLocaleDateString(
                                'en-NG',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )}
                            </span>
                          )}
                        </div>

                        <span style={styles.recentArrow}>
                          ›
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}

              {/* ==================================================
                  SAVED BENEFICIARIES
                  ================================================== */}

              <div style={styles.savedSection}>
                <button
                  type="button"
                  onClick={() => {
                    setShowSavedBeneficiaries(
                      (previous) => !previous
                    );
                  }}
                  style={styles.savedToggle}
                  aria-expanded={
                    showSavedBeneficiaries
                  }
                >
                  <div style={styles.savedToggleLeft}>
                    <div style={styles.savedIcon}>
                      ♧
                    </div>

                    <div>
                      <strong style={styles.savedTitle}>
                        Saved Beneficiaries
                      </strong>

                      <span style={styles.savedSubtitle}>
                        Your saved recipients
                      </span>
                    </div>
                  </div>

                  <span style={styles.savedChevron}>
                    {showSavedBeneficiaries
                      ? '−'
                      : '+'}
                  </span>
                </button>

                {showSavedBeneficiaries && (
                  <div style={styles.savedContent}>
                    <BeneficiaryTabs
                      recipientType="zenimonies"
                      onSelect={(
                        beneficiary: SavedBeneficiary
                      ) => {
                        void selectSavedBeneficiary(
                          beneficiary
                        );
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================
              PHONE
              ================================================== */}

          <label
            htmlFor="phone"
            style={styles.label}
          >
            Recipient Phone Number
          </label>

          <div style={styles.verifyRow}>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={handlePhoneChange}
              placeholder="e.g. 08012345678"
              disabled={checking || sending}
              style={styles.input}
            />

            <button
              type="button"
              onClick={verifyRecipient}
              disabled={checking || sending}
              style={{
                ...styles.verifyButton,
                opacity:
                  checking || sending
                    ? 0.65
                    : 1,
              }}
            >
              {checking
                ? 'Checking...'
                : 'Verify'}
            </button>
          </div>

          {/* ==================================================
              VERIFIED RECIPIENT
              ================================================== */}

          {recipient && (
            <>
              <div style={styles.recipientCard}>
                <div style={styles.recipientAvatar}>
                  {recipient.full_name
                    ? recipient.full_name
                        .charAt(0)
                        .toUpperCase()
                    : 'Z'}
                </div>

                <div style={styles.recipientInfo}>
                  <div style={styles.recipientName}>
                    {recipient.full_name}
                  </div>

                  <div style={styles.recipientPhone}>
                    {recipient.phone}
                  </div>

                  {recipient.account_number && (
                    <div style={styles.recipientAccount}>
                      Account: {recipient.account_number}
                    </div>
                  )}
                </div>

                <div style={styles.verifiedPill}>
                  ✓ Verified
                </div>
              </div>

              {/* AMOUNT */}

              <label
                htmlFor="amount"
                style={styles.label}
              >
                Amount (NGN)
              </label>

              <div style={styles.amountWrap}>
                <span style={styles.currency}>
                  ₦
                </span>

                <input
                  id="amount"
                  type="number"
                  min="20"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    setSuccess('');
                    setError('');
                  }}
                  placeholder="20.00"
                  disabled={sending}
                  style={styles.amountInput}
                />
              </div>

              {/* TRANSFER FEE */}

              {Number.isFinite(transferAmount) &&
                transferAmount >= 20 && (
                  <div style={styles.feeCard}>
                    <div style={styles.feeHeader}>
                      <span>
                        Transfer Summary
                      </span>

                      <span style={styles.feeBadge}>
                        NGN
                      </span>
                    </div>

                    <div style={styles.feeRow}>
                      <span>
                        Transfer amount
                      </span>

                      <strong>
                        {formatNaira(transferAmount)}
                      </strong>
                    </div>

                    <div style={styles.feeRow}>
                      <span>
                        Transfer fee
                      </span>

                      <strong>
                        {formatNaira(transactionFee)}
                      </strong>
                    </div>

                    <div style={styles.feeDivider} />

                    <div style={styles.totalRow}>
                      <span>
                        Total to be deducted
                      </span>

                      <strong>
                        {formatNaira(totalDebit)}
                      </strong>
                    </div>
                  </div>
                )}

              {/* NARRATION */}

              <label
                htmlFor="narration"
                style={styles.label}
              >
                Narration (optional)
              </label>

              <input
                id="narration"
                type="text"
                maxLength={150}
                value={narration}
                onChange={(event) =>
                  setNarration(event.target.value)
                }
                placeholder="What is this transfer for?"
                disabled={sending}
                style={styles.inputFull}
              />

              {/* SAVE BENEFICIARY */}

              <label style={styles.beneficiaryCheckbox}>
                <input
                  type="checkbox"
                  checked={saveAsBeneficiary}
                  onChange={(event) =>
                    setSaveAsBeneficiary(
                      event.target.checked
                    )
                  }
                  disabled={sending}
                />

                <span>
                  Save as beneficiary
                </span>
              </label>

              {/* CONTINUE */}

              <button
                type="button"
                onClick={() => {
                  handleSend(
                    {
                      preventDefault: () => {},
                    } as React.FormEvent<HTMLFormElement>
                  );
                }}
                disabled={
                  sending ||
                  checking ||
                  !recipient ||
                  !amount ||
                  !Number.isFinite(transferAmount) ||
                  transferAmount < 20
                }
                style={{
                  ...styles.sendButton,
                  opacity:
                    sending ||
                    checking ||
                    !recipient ||
                    !amount ||
                    !Number.isFinite(transferAmount) ||
                    transferAmount < 20
                      ? 0.55
                      : 1,
                }}
              >
                {sending
                  ? 'Processing Transfer...'
                  : 'Continue'}

                <span>›</span>
              </button>

              {/* ==================================================
                  TRANSACTION PIN DIALOG
                  ================================================== */}

              {showTransactionPin && (
                <div
                  style={styles.pinOverlay}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="transaction-pin-title"
                >
                  <div style={styles.pinDialog}>
                    <div style={styles.pinIcon}>
                      🔐
                    </div>

                    <h2
                      id="transaction-pin-title"
                      style={styles.pinTitle}
                    >
                      Confirm Transfer
                    </h2>

                    <p style={styles.pinSubtitle}>
                      Review the transfer details
                      below, then enter your 4-digit
                      Transaction PIN to authorize it.
                    </p>

                    <div style={styles.pinSummary}>
                      <div style={styles.pinSummaryRow}>
                        <span>Recipient</span>

                        <strong>
                          {recipient?.full_name}
                        </strong>
                      </div>

                      <div style={styles.pinSummaryRow}>
                        <span>Phone</span>

                        <strong>
                          {recipient?.phone}
                        </strong>
                      </div>

                      <div style={styles.pinSummaryRow}>
                        <span>Transfer amount</span>

                        <strong>
                          {formatNaira(transferAmount)}
                        </strong>
                      </div>

                      <div style={styles.pinSummaryRow}>
                        <span>Transfer fee</span>

                        <strong>
                          {formatNaira(transactionFee)}
                        </strong>
                      </div>

                      <div
                        style={styles.pinSummaryDivider}
                      />

                      <div style={styles.pinTotalRow}>
                        <span>Total deducted</span>

                        <strong>
                          {formatNaira(totalDebit)}
                        </strong>
                      </div>
                    </div>

                    {transactionPinError && (
                      <div
                        style={styles.pinError}
                        role="alert"
                      >
                        {transactionPinError}
                      </div>
                    )}

                    <label
                      htmlFor="transaction-pin"
                      style={styles.pinLabel}
                    >
                      Transaction PIN
                    </label>

                    <input
                      id="transaction-pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      value={transactionPin}
                      onChange={(event) => {
                        const value =
                          event.target.value
                            .replace(/\D/g, '')
                            .slice(0, 4);

                        setTransactionPin(value);
                        setTransactionPinError('');
                      }}
                      placeholder="••••"
                      disabled={verifyingTransactionPin}
                      style={styles.pinInput}
                      autoFocus
                    />

                    <div style={styles.pinActions}>
                      <button
                        type="button"
                        onClick={() => {
                          setShowTransactionPin(false);
                          setTransactionPin('');
                          setTransactionPinError('');
                        }}
                        disabled={verifyingTransactionPin}
                        style={styles.cancelPinButton}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={
                          verifyTransactionPinAndSend
                        }
                        disabled={
                          verifyingTransactionPin ||
                          transactionPin.length !== 4
                        }
                        style={{
                          ...styles.confirmPinButton,
                          opacity:
                            verifyingTransactionPin ||
                            transactionPin.length !== 4
                              ? 0.55
                              : 1,
                        }}
                      >
                        {verifyingTransactionPin
                          ? 'Verifying...'
                          : 'Confirm Transfer'}
                      </button>
                    </div>

                    <div style={styles.pinSecurity}>
                      🔒 Your Transaction PIN is
                      securely verified and is never
                      stored on this device.
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY */}

              <div style={styles.securityNote}>
                <span style={styles.lock}>
                  🔒
                </span>

                <span>
                  Your transfer is processed
                  securely between Zenimonies
                  accounts.
                </span>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f6faf8',
    color: '#10251d',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 40,
  },

  header: {
    height: 68,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 5%',
    borderBottom: '1px solid #e8efeb',
    boxSizing: 'border-box',
  },

  brandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
  },

  logo: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    fontWeight: 800,
  },

  brandName: {
    color: '#10251d',
    fontSize: 18,
    fontWeight: 800,
  },

  brandSubtitle: {
    color: '#9aa7a1',
    fontSize: 8,
    letterSpacing: 1.7,
    marginTop: 2,
  },

  homeLink: {
    color: '#087c43',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 800,
  },

  main: {
    width: 'min(620px, 92%)',
    margin: '0 auto',
    paddingTop: 24,
  },

  backLink: {
    display: 'inline-block',
    marginBottom: 16,
    color: '#66756e',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700,
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e3ebe7',
    borderRadius: 24,
    padding: 24,
    boxShadow:
      '0 12px 35px rgba(22, 61, 46, 0.07)',
  },

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    background: '#e7f8ef',
    color: '#079447',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 16,
  },

  title: {
    margin: 0,
    color: '#10251d',
    fontSize: 28,
    fontWeight: 850,
  },

  subtitle: {
    margin: '7px 0 22px',
    color: '#748079',
    fontSize: 14,
    lineHeight: 1.55,
  },

  label: {
    display: 'block',
    color: '#263d33',
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 7,
  },

  verifyRow: {
    display: 'flex',
    gap: 9,
    marginBottom: 16,
  },

  input: {
    flex: 1,
    minWidth: 0,
    border: '1px solid #d7e0dc',
    borderRadius: 12,
    padding: '13px 14px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#10251d',
  },

  verifyButton: {
    border: 'none',
    borderRadius: 12,
    padding: '0 17px',
    background: '#10251d',
    color: '#ffffff',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  /*
   * RECENT RECIPIENTS
   */

  recentSection: {
    marginBottom: 24,
    padding: 15,
    background: '#fbfdfc',
    border: '1px solid #e4eee8',
    borderRadius: 17,
  },

  recentHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 13,
  },

  recentTitle: {
    margin: 0,
    color: '#10251d',
    fontSize: 16,
    fontWeight: 850,
  },

  recentSubtitle: {
    margin: '5px 0 0',
    color: '#85928b',
    fontSize: 11,
    lineHeight: 1.5,
  },

  refreshButton: {
    width: 34,
    height: 34,
    flexShrink: 0,
    border: '1px solid #dce9e1',
    borderRadius: 10,
    background: '#ffffff',
    color: '#087c43',
    fontSize: 22,
    fontWeight: 800,
    cursor: 'pointer',
  },

  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  recentItem: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    padding: '11px 12px',
    border: '1px solid #e5eee8',
    borderRadius: 13,
    background: '#ffffff',
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  },

  recentAvatar: {
    width: 39,
    height: 39,
    flexShrink: 0,
    borderRadius: '50%',
    background: '#e1f5e9',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 850,
  },

  recentInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
  },

  recentName: {
    color: '#17362a',
    fontSize: 13,
    fontWeight: 800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  recentPhone: {
    color: '#728078',
    fontSize: 11,
  },

  recentDate: {
    color: '#98a49e',
    fontSize: 10,
  },

  recentArrow: {
    color: '#079447',
    fontSize: 25,
    fontWeight: 700,
    flexShrink: 0,
  },

  recentEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: '22px 12px',
    color: '#7b8981',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 1.5,
  },

  loadingDot: {
    width: 23,
    height: 23,
    border: '3px solid #dcefe4',
    borderTop: '3px solid #079447',
    borderRadius: '50%',
    marginBottom: 5,
  },

  emptyIcon: {
    width: 42,
    height: 42,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    background: '#eaf7ef',
    color: '#079447',
    fontSize: 23,
    fontWeight: 800,
    marginBottom: 4,
  },

  emptyTitle: {
    color: '#354c40',
    fontSize: 13,
    fontWeight: 800,
  },

  emptyText: {
    color: '#87948d',
    fontSize: 11,
    maxWidth: 230,
  },

  recentError: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    background: '#fff1ef',
    border: '1px solid #f4d1cb',
    color: '#a53227',
    fontSize: 12,
    lineHeight: 1.5,
  },

  retryButton: {
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    background: '#a53227',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
  },

  /*
   * SAVED BENEFICIARIES
   */

  savedSection: {
    marginTop: 14,
    border: '1px solid #dcebe2',
    borderRadius: 13,
    background: '#ffffff',
    overflow: 'hidden',
  },

  savedToggle: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: '12px 13px',
    border: 'none',
    background: '#f4faf6',
    cursor: 'pointer',
    textAlign: 'left',
  },

  savedToggleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  savedIcon: {
    width: 35,
    height: 35,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#e1f5e9',
    color: '#087c43',
    borderRadius: 11,
    fontSize: 20,
    fontWeight: 800,
  },

  savedTitle: {
    display: 'block',
    color: '#17362a',
    fontSize: 13,
    fontWeight: 850,
  },

  savedSubtitle: {
    display: 'block',
    marginTop: 3,
    color: '#87948d',
    fontSize: 10,
  },

  savedChevron: {
    color: '#087c43',
    fontSize: 24,
    fontWeight: 700,
    flexShrink: 0,
  },

  savedContent: {
    padding: 12,
    borderTop: '1px solid #e4eee8',
    background: '#ffffff',
  },

  errorBox: {
    background: '#fff1ef',
    color: '#a53227',
    border: '1px solid #f4d1cb',
    borderRadius: 13,
    padding: 13,
    marginBottom: 16,
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.45,
  },

  successBox: {
    background: '#eaf9f1',
    color: '#087c43',
    border: '1px solid #ccebd9',
    borderRadius: 13,
    padding: 13,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 1.5,
  },

  recipientCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    background: '#f1fbf6',
    border: '1px solid #d4eee0',
    borderRadius: 15,
    padding: 12,
    marginBottom: 18,
  },

  recipientAvatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: '#d8f3e5',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 16,
    flexShrink: 0,
  },

  recipientInfo: {
    flex: 1,
    minWidth: 0,
  },

  recipientName: {
    color: '#17362a',
    fontSize: 14,
    fontWeight: 800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  recipientPhone: {
    color: '#728078',
    fontSize: 12,
    marginTop: 2,
  },

  recipientAccount: {
    color: '#087c43',
    fontSize: 12,
    fontWeight: 700,
    marginTop: 3,
  },

  verifiedPill: {
    background: '#dff5e9',
    color: '#087c43',
    borderRadius: 999,
    padding: '6px 9px',
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },

  amountWrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #d7e0dc',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    background: '#ffffff',
  },

  currency: {
    paddingLeft: 14,
    color: '#087c43',
    fontSize: 20,
    fontWeight: 800,
  },

  amountInput: {
    flex: 1,
    minWidth: 0,
    border: 'none',
    outline: 'none',
    padding: '13px 12px',
    fontSize: 19,
    fontWeight: 800,
    color: '#10251d',
    background: 'transparent',
  },

  feeCard: {
    background: '#f2faf6',
    border: '1px solid #d7ebe1',
    borderRadius: 15,
    padding: 14,
    marginBottom: 19,
  },

  feeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#15543d',
    fontSize: 13,
    fontWeight: 850,
    marginBottom: 8,
  },

  feeBadge: {
    background: '#dcefe6',
    color: '#087c43',
    borderRadius: 999,
    padding: '4px 8px',
    fontSize: 9,
    fontWeight: 850,
  },

  feeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '6px 0',
    color: '#65756d',
    fontSize: 12.5,
  },

  feeDivider: {
    height: 1,
    background: '#d9e8e1',
    margin: '5px 0',
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '7px 0 2px',
    color: '#10251d',
    fontSize: 14,
    fontWeight: 850,
  },

  inputFull: {
    width: '100%',
    border: '1px solid #d7e0dc',
    borderRadius: 12,
    padding: '13px 14px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 20,
    background: '#ffffff',
    color: '#10251d',
  },

  beneficiaryCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    color: '#344c46',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  sendButton: {
    width: '100%',
    border: 'none',
    borderRadius: 13,
    padding: '14px 16px',
    background: '#079447',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  pinOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 25, 19, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 9999,
    boxSizing: 'border-box',
  },

  pinDialog: {
    width: 'min(420px, 100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: 24,
    padding: 24,
    boxShadow: '0 25px 70px rgba(0, 0, 0, 0.22)',
    boxSizing: 'border-box',
  },

  pinIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    background: '#e7f8ef',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    marginBottom: 15,
  },

  pinTitle: {
    margin: 0,
    color: '#10251d',
    fontSize: 23,
    fontWeight: 850,
  },

  pinSubtitle: {
    margin: '7px 0 18px',
    color: '#748079',
    fontSize: 13,
    lineHeight: 1.5,
  },

  pinSummary: {
    background: '#f5faf7',
    border: '1px solid #e0ebe5',
    borderRadius: 14,
    padding: 13,
    marginBottom: 17,
  },

  pinSummaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '5px 0',
    color: '#6d7c75',
    fontSize: 12,
  },

  pinSummaryDivider: {
    height: 1,
    background: '#d9e5df',
    margin: '7px 0',
  },

  pinTotalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '5px 0 2px',
    color: '#10251d',
    fontSize: 14,
    fontWeight: 850,
  },

  pinLabel: {
    display: 'block',
    color: '#263d33',
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 7,
  },

  pinInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cfdcd5',
    borderRadius: 13,
    padding: '14px',
    textAlign: 'center',
    letterSpacing: 9,
    fontSize: 24,
    fontWeight: 800,
    outline: 'none',
    color: '#10251d',
    background: '#ffffff',
    marginBottom: 12,
  },

  pinError: {
    background: '#fff1ef',
    color: '#a53227',
    border: '1px solid #f4d1cb',
    borderRadius: 12,
    padding: 11,
    marginBottom: 14,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1.4,
  },

  pinActions: {
    display: 'flex',
    gap: 9,
    marginTop: 4,
  },

  cancelPinButton: {
    flex: 1,
    border: '1px solid #d7e0dc',
    borderRadius: 12,
    padding: '13px 10px',
    background: '#ffffff',
    color: '#52625a',
    fontWeight: 800,
    cursor: 'pointer',
  },

  confirmPinButton: {
    flex: 1.5,
    border: 'none',
    borderRadius: 12,
    padding: '13px 10px',
    background: '#079447',
    color: '#ffffff',
    fontWeight: 800,
    cursor: 'pointer',
  },

  pinSecurity: {
    marginTop: 14,
    color: '#7a8781',
    fontSize: 10,
    lineHeight: 1.45,
    textAlign: 'center',
  },

  securityNote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 17,
    color: '#7a8781',
    fontSize: 11,
    lineHeight: 1.5,
    textAlign: 'center',
    justifyContent: 'center',
  },

  lock: {
    flexShrink: 0,
  },
};

export default Transfer;
