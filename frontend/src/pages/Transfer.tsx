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
import { useTheme } from '../theme/Theme.tsx';

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

  /*
   * ==========================================================
   * GLOBAL ZENIMONIES THEME
   * ==========================================================
   */

  const { darkMode: isDarkMode } =
    useTheme();

  /*
   * ==========================================================
   * FORM STATE
   * ==========================================================
   */

  const [phone, setPhone] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [narration, setNarration] =
    useState('');

  const [
    saveAsBeneficiary,
    setSaveAsBeneficiary,
  ] = useState(false);

  const [
    recipient,
    setRecipient,
  ] = useState<Recipient | null>(null);

  const [checking, setChecking] =
    useState(false);

  const [sending, setSending] =
    useState(false);

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

  const [
    showSavedBeneficiaries,
    setShowSavedBeneficiaries,
  ] = useState(false);

  /*
   * ==========================================================
   * TRANSACTION PIN
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

  /*
   * ==========================================================
   * GENERAL STATUS
   * ==========================================================
   */

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [reference, setReference] =
    useState('');

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
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem('token') ||
    localStorage.getItem(
      'access_token'
    );

  /*
   * ==========================================================
   * CLEAN PHONE
   * ==========================================================
   */

  const cleanPhone = useMemo(
    () =>
      phone
        .replace(/\s+/g, '')
        .trim(),
    [phone]
  );

  /*
   * ==========================================================
   * TRANSFER AMOUNT
   * ==========================================================
   */

  const transferAmount =
    Number(amount);

  /*
   * ==========================================================
   * TRANSFER FEE
   * ==========================================================
   */

  const transactionFee = useMemo(() => {
    if (
      !Number.isFinite(
        transferAmount
      ) ||
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
    Number.isFinite(
      transferAmount
    ) &&
    transferAmount >= 20
      ? transferAmount +
        transactionFee
      : 0;

  /*
   * ==========================================================
   * FORMAT NAIRA
   * ==========================================================
   */

  const formatNaira = (
    value: number
  ) =>
    `₦${Number(
      value || 0
    ).toLocaleString(
      'en-NG',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;

  /*
   * ==========================================================
   * LOAD RECENT RECIPIENTS
   * ==========================================================
   */

  const loadRecentRecipients =
    useCallback(
      async () => {
        if (!token) {
          navigate('/login');
          return;
        }

        try {
          setLoadingRecentRecipients(
            true
          );

          setRecentRecipientsError(
            ''
          );

          const response =
            await axios.get<RecentRecipientsResponse>(
              `${API_URL.replace(
                /\/+$/,
                ''
              )}/api/internal-transfers/recent`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

          if (
            response.data?.success
          ) {
            setRecentRecipients(
              Array.isArray(
                response.data
                  .recipients
              )
                ? response.data
                    .recipients
                : []
            );
          } else {
            setRecentRecipients(
              []
            );

            setRecentRecipientsError(
              response.data
                ?.message ||
                'Unable to load recent recipients.'
            );
          }
        } catch (err: any) {
          if (
            err?.response
              ?.status === 401
          ) {
            localStorage.removeItem(
              'zenimonies_token'
            );

            localStorage.removeItem(
              'token'
            );

            localStorage.removeItem(
              'access_token'
            );

            navigate('/login');
            return;
          }

          setRecentRecipientsError(
            err?.response
              ?.data?.message ||
              'Unable to load recent recipients. Please try again.'
          );
        } finally {
          setLoadingRecentRecipients(
            false
          );
        }
      },
      [token, navigate]
    );

  /*
   * ==========================================================
   * INITIAL LOAD
   * ==========================================================
   */

  useEffect(() => {
    void loadRecentRecipients();
  }, [loadRecentRecipients]);

  /*
   * ==========================================================
   * VERIFY PHONE
   * ==========================================================
   */

  const verifyPhoneNumber =
    async (
      phoneNumber: string
    ) => {
      setError('');
      setSuccess('');
      setRecipient(null);
      setReference('');
      setBalanceAfter(null);
      setRecipientAccountNumber(
        ''
      );

      if (!token) {
        navigate('/login');
        return;
      }

      const cleanedPhone =
        phoneNumber
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
          response.data
            ?.success &&
          response.data?.user
        ) {
          const verifiedRecipient =
            response.data.user;

          setRecipient(
            verifiedRecipient
          );

          setPhone(
            verifiedRecipient.phone ||
              cleanedPhone
          );

          setRecipientAccountNumber(
            verifiedRecipient
              .account_number ||
              ''
          );

          setSuccess(
            'Zenimonies recipient verified.'
          );
        } else {
          setError(
            response.data
              ?.message ||
              'Unable to find this Zenimonies user.'
          );
        }
      } catch (err: any) {
        if (
          err?.response
            ?.status === 401
        ) {
          localStorage.removeItem(
            'zenimonies_token'
          );

          localStorage.removeItem(
            'token'
          );

          localStorage.removeItem(
            'access_token'
          );

          navigate('/login');
          return;
        }

        setError(
          err?.response
            ?.data?.message ||
            'Unable to verify this Zenimonies user.'
        );
      } finally {
        setChecking(false);
      }
    };

  /*
   * ==========================================================
   * VERIFY BUTTON
   * ==========================================================
   */

  const verifyRecipient =
    async () => {
      await verifyPhoneNumber(
        cleanPhone
      );
    };

  /*
   * ==========================================================
   * RECENT RECIPIENT
   * ==========================================================
   */

  const selectRecentRecipient =
    async (
      item: RecentRecipient
    ) => {
      const selectedPhone =
        String(item.phone || '')
          .replace(/\s+/g, '')
          .trim();

      if (!selectedPhone) {
        setError(
          'This recent recipient does not have a valid phone number.'
        );
        return;
      }

      setPhone(selectedPhone);
      setAmount('');
      setNarration('');
      setRecipient(null);

      setError('');
      setSuccess('');
      setReference('');
      setBalanceAfter(null);
      setRecipientAccountNumber(
        ''
      );

      setTransactionPin('');
      setTransactionPinError('');
      setShowTransactionPin(
        false
      );

      setSaveAsBeneficiary(false);

      setShowSavedBeneficiaries(
        false
      );

      await verifyPhoneNumber(
        selectedPhone
      );
    };

  /*
   * ==========================================================
   * SAVED BENEFICIARY
   * ==========================================================
   */

  const selectSavedBeneficiary =
    async (
      beneficiary: SavedBeneficiary
    ) => {
      const selectedPhone =
        String(
          beneficiary
            .recipient_phone ||
            ''
        )
          .replace(/\s+/g, '')
          .trim();

      if (!selectedPhone) {
        setError(
          'This saved beneficiary does not have a valid Zenimonies phone number.'
        );
        return;
      }

      setPhone(selectedPhone);
      setAmount('');
      setNarration('');
      setRecipient(null);

      setError('');
      setSuccess('');
      setReference('');
      setBalanceAfter(null);
      setRecipientAccountNumber(
        ''
      );

      setTransactionPin('');
      setTransactionPinError('');
      setShowTransactionPin(
        false
      );

      setSaveAsBeneficiary(false);

      setShowSavedBeneficiaries(
        false
      );

      await verifyPhoneNumber(
        selectedPhone
      );
    };

  /*
   * ==========================================================
   * PHONE CHANGE
   * ==========================================================
   */

  const handlePhoneChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPhone(
      event.target.value
    );

    setRecipient(null);
    setSuccess('');
    setError('');
    setReference('');
    setBalanceAfter(null);
    setRecipientAccountNumber(
      ''
    );
  };

  /*
   * ==========================================================
   * SAVE BENEFICIARY AFTER SUCCESS
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
            recipient_type:
              'zenimonies',

            name:
              recipient.full_name,

            recipient_phone:
              recipient.phone ||
              cleanPhone,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type':
                'application/json',
            },
          }
        );

        setSaveAsBeneficiary(
          false
        );
      } catch (error: any) {
        console.error(
          'Unable to save beneficiary:',
          error
        );

        setSaveAsBeneficiary(
          false
        );
      }
    };

  /*
   * ==========================================================
   * OPEN TRANSACTION PIN
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
    setTransactionPinError(
      ''
    );

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
      !Number.isFinite(
        transferAmount
      ) ||
      transferAmount < 20
    ) {
      setError(
        'Minimum transfer amount is ₦20.'
      );
      return;
    }

    if (
      Math.round(
        transferAmount * 100
      ) !==
      transferAmount * 100
    ) {
      setError(
        'Transfer amount can have a maximum of two decimal places.'
      );
      return;
    }

    if (
      transferAmount >
      100000000
    ) {
      setError(
        'Transfer amount is too large.'
      );
      return;
    }

    setTransactionPin('');
    setTransactionPinError(
      ''
    );

    setShowTransactionPin(
      true
    );
  };

  /*
   * ==========================================================
   * VERIFY PIN + SEND
   * ==========================================================
   */

  const verifyTransactionPinAndSend =
    async () => {
      setTransactionPinError(
        ''
      );

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

      if (
        !/^\d{4}$/.test(
          transactionPin
        )
      ) {
        setTransactionPinError(
          'Please enter your 4-digit Transaction PIN.'
        );
        return;
      }

      try {
        setVerifyingTransactionPin(
          true
        );

        setSending(true);

        const response =
          await axios.post<TransferResponse>(
            `${API_URL}/api/internal-transfers`,
            {
              recipient_phone:
                cleanPhone,

              amount:
                transferAmount,

              narration:
                narration.trim() ||
                undefined,

              transaction_pin:
                transactionPin,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type':
                  'application/json',
              },
            }
          );

        setTransactionPin('');
        setShowTransactionPin(
          false
        );

        if (
          response.data
            ?.success &&
          response.data
            ?.transfer
        ) {
          const transfer =
            response.data.transfer;

          const receiptTransaction =
            {
              id:
                transfer.id ||
                '',

              reference:
                transfer.reference ||
                '',

              transaction_reference:
                transfer.transaction_reference ||
                transfer.reference ||
                '',

              type:
                'internal_transfer',

              transaction_type:
                'internal_transfer',

              category:
                'debit',

              status:
                transfer.status ||
                'pending',

              amount: Number(
                transfer.amount ??
                  0
              ),

              transaction_fee:
                Number(
                  transfer.transaction_fee ??
                    0
                ),

              total_debit:
                Number(
                  transfer.total_debit ??
                    0
                ),

              currency:
                transfer.currency ||
                'NGN',

              recipient_name:
                transfer.recipient_name ||
                recipient.full_name,

              recipient_phone:
                transfer.recipient_phone ||
                recipient.phone,

              recipient_account:
                transfer.recipient_account ||
                '',

              recipient_bank:
                transfer.recipient_bank ||
                'Zenimonies',

              balance_after:
                Number(
                  transfer.balance_after ??
                    0
                ),

              created_at:
                transfer.created_at ||
                '',

              description:
                transfer.description ||
                narration.trim() ||
                `Transfer to ${
                  transfer.recipient_name ||
                  recipient.full_name
                }`,
            };

          await saveSuccessfulBeneficiary();

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
          response.data
            ?.message ||
            'Transfer failed.'
        );
      } catch (err: any) {
        const status =
          err?.response?.status;

        const code =
          err?.response?.data?.code;

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
            err?.response
              ?.data?.message ||
              'Transaction PIN verification failed.'
          );

          setShowTransactionPin(
            true
          );

          return;
        }

        if (
          status === 401
        ) {
          localStorage.removeItem(
            'zenimonies_token'
          );

          localStorage.removeItem(
            'token'
          );

          localStorage.removeItem(
            'access_token'
          );

          setTransactionPin('');
          setShowTransactionPin(
            false
          );

          navigate('/login');

          return;
        }

        setError(
          err?.response
            ?.data?.message ||
            'Unable to complete the transfer.'
        );
      } finally {
        setVerifyingTransactionPin(
          false
        );

        setSending(false);
      }
    };

  /*
   * ==========================================================
   * THEME COLORS
   * ==========================================================
   */

  const colors = isDarkMode
    ? {
        page: '#0d1712',
        header: '#101c16',
        card: '#101c16',
        surface: '#15231c',
        surfaceSoft: '#15231c',
        surfacePressed: '#1a2d23',

        border: '#294238',
        divider: '#22372d',

        text: '#f3f8f5',
        textSecondary: '#a9b8b0',
        textMuted: '#82958b',

        green: '#079447',
        greenBright: '#25c477',
        greenDark: '#168c56',

        greenSoft: '#123a29',
        greenBorder: '#1c5139',

        successBg: '#0d2a1e',
        successBorder: '#1c4a35',
        successText: '#8de0ba',

        errorBg: '#2a1517',
        errorBorder: '#5b292d',
        errorText: '#ffb4aa',

        input: '#15231c',
        inputBorder: '#294238',

        shadow:
          '0 14px 40px rgba(0, 0, 0, 0.28)',
      }
    : {
        page: '#f6faf8',
        header: '#ffffff',
        card: '#ffffff',
        surface: '#ffffff',
        surfaceSoft: '#f7faf8',
        surfacePressed: '#eef8f3',

        border: '#e7eee9',
        divider: '#e6efea',

        text: '#14251e',
        textSecondary: '#7b8982',
        textMuted: '#98a49f',

        green: '#079447',
        greenBright: '#0b995b',
        greenDark: '#006d3b',

        greenSoft: '#e9f8f1',
        greenBorder: '#d4eee1',

        successBg: '#e9f8f1',
        successBorder: '#d4eee1',
        successText: '#087c43',

        errorBg: '#fff4f4',
        errorBorder: '#f0cccc',
        errorText: '#b42318',

        input: '#ffffff',
        inputBorder: '#d7e0dc',

        shadow:
          '0 12px 35px rgba(7, 59, 42, 0.07)',
      };

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <div
      className="zenimonies-page"
      style={{
        ...styles.page,
        background:
          colors.page,
        color:
          colors.text,
      }}
    >
      {/* ======================================================
          HEADER
          ====================================================== */}

      <header
        className="zenimonies-surface"
        style={{
          ...styles.header,
          background:
            colors.header,
          borderBottom:
            `1px solid ${colors.border}`,
        }}
      >
        <Link
          to="/"
          style={{
            ...styles.brandLink,
          }}
        >
          <div
            style={{
              ...styles.logo,
              background:
                colors.green,
            }}
          >
            Z
          </div>

          <div>
            <div
              style={{
                ...styles.brandName,
                color:
                  colors.text,
              }}
            >
              Zenimonies
            </div>

            <div
              style={{
                ...styles.brandSubtitle,
                color:
                  colors.textMuted,
              }}
            >
              DIGITAL BANKING
            </div>
          </div>
        </Link>

        <Link
          to="/"
          style={{
            ...styles.homeLink,
            color:
              colors.greenBright,
          }}
        >
          Home
        </Link>
      </header>

      {/* ======================================================
          MAIN
          ====================================================== */}

      <main style={styles.main}>
        <Link
          to="/"
          style={{
            ...styles.backLink,
            color:
              colors.textSecondary,
          }}
        >
          ← Back to Dashboard
        </Link>

        <section
          className="zenimonies-surface"
          style={{
            ...styles.card,
            background:
              colors.card,
            borderColor:
              colors.border,
            boxShadow:
              colors.shadow,
          }}
        >
          {/* ICON */}

          <div
            style={{
              ...styles.iconCircle,
              background:
                colors.greenSoft,
              color:
                colors.greenBright,
              border:
                `1px solid ${colors.greenBorder}`,
            }}
          >
            ➤
          </div>

          <h1
            style={{
              ...styles.title,
              color:
                colors.text,
            }}
          >
            Send to ZENIMONIES
          </h1>

          <p
            style={{
              ...styles.subtitle,
              color:
                colors.textSecondary,
            }}
          >
            Send money instantly to another
            active Zenimonies account.
          </p>

          {/* ERROR */}

          {error && (
            <div
              style={{
                ...styles.errorBox,
                background:
                  colors.errorBg,
                borderColor:
                  colors.errorBorder,
                color:
                  colors.errorText,
              }}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success &&
            recipient && (
              <div
                style={{
                  ...styles.successBox,
                  background:
                    colors.successBg,
                  borderColor:
                    colors.successBorder,
                  color:
                    colors.successText,
                }}
                role="status"
              >
                <strong>
                  {success}
                </strong>
              </div>
            )}

          {/* PHONE */}

          <label
            htmlFor="phone"
            style={{
              ...styles.label,
              color:
                colors.text,
            }}
          >
            Recipient Phone Number
          </label>

          <div
            style={
              styles.verifyRow
            }
          >
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={
                handlePhoneChange
              }
              placeholder="e.g. 08012345678"
              disabled={
                checking ||
                sending
              }
              style={{
                ...styles.input,
                background:
                  colors.input,
                borderColor:
                  colors.inputBorder,
                color:
                  colors.text,
              }}
            />

            <button
              type="button"
              onClick={
                verifyRecipient
              }
              disabled={
                checking ||
                sending
              }
              style={{
                ...styles.verifyButton,
                background:
                  isDarkMode
                    ? '#17372d'
                    : '#102a25',
                opacity:
                  checking ||
                  sending
                    ? 0.65
                    : 1,
              }}
            >
              {checking
                ? 'Checking...'
                : 'Verify'}
            </button>
          </div>

          {/* VERIFIED RECIPIENT */}

          {recipient && (
            <>
              <div
                style={{
                  ...styles.recipientCard,
                  background:
                    colors.greenSoft,
                  borderColor:
                    colors.greenBorder,
                }}
              >
                <div
                  style={{
                    ...styles.recipientAvatar,
                    background:
                      isDarkMode
                        ? '#174b38'
                        : '#d8f3e5',
                    color:
                      colors.greenBright,
                  }}
                >
                  {recipient.full_name
                    ? recipient.full_name
                        .charAt(0)
                        .toUpperCase()
                    : 'Z'}
                </div>

                <div
                  style={
                    styles.recipientInfo
                  }
                >
                  <div
                    style={{
                      ...styles.recipientName,
                      color:
                        colors.text,
                    }}
                  >
                    {
                      recipient.full_name
                    }
                  </div>

                  <div
                    style={{
                      ...styles.recipientPhone,
                      color:
                        colors.textSecondary,
                    }}
                  >
                    {
                      recipient.phone
                    }
                  </div>

                  {recipient.account_number && (
                    <div
                      style={{
                        ...styles.recipientAccount,
                        color:
                          colors.greenBright,
                      }}
                    >
                      Account:{' '}
                      {
                        recipient.account_number
                      }
                    </div>
                  )}
                </div>

                <div
                  style={{
                    ...styles.verifiedPill,
                    background:
                      isDarkMode
                        ? '#174b38'
                        : '#dff5e9',
                    color:
                      colors.successText,
                  }}
                >
                  ✓ Verified
                </div>
              </div>

              {/* AMOUNT */}

              <label
                htmlFor="amount"
                style={{
                  ...styles.label,
                  color:
                    colors.text,
                }}
              >
                Amount (NGN)
              </label>

              <div
                style={{
                  ...styles.amountWrap,
                  background:
                    colors.input,
                  borderColor:
                    colors.inputBorder,
                }}
              >
                <span
                  style={{
                    ...styles.currency,
                    color:
                      colors.greenBright,
                  }}
                >
                  ₦
                </span>

                <input
                  id="amount"
                  type="number"
                  min="20"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(
                    event
                  ) => {
                    setAmount(
                      event.target
                        .value
                    );

                    setSuccess('');
                    setError('');
                  }}
                  placeholder="20.00"
                  disabled={sending}
                  style={{
                    ...styles.amountInput,
                    color:
                      colors.text,
                  }}
                />
              </div>

              {/* TRANSFER FEE */}

              {Number.isFinite(
                transferAmount
              ) &&
                transferAmount >=
                  20 && (
                  <div
                    style={{
                      ...styles.feeCard,
                      background:
                        colors.surfaceSoft,
                      borderColor:
                        colors.border,
                    }}
                  >
                    <div
                      style={{
                        ...styles.feeHeader,
                        color:
                          colors.text,
                      }}
                    >
                      <span>
                        Transfer Summary
                      </span>

                      <span
                        style={{
                          ...styles.feeBadge,
                          background:
                            colors.greenSoft,
                          color:
                            colors.greenBright,
                        }}
                      >
                        NGN
                      </span>
                    </div>

                    <div
                      style={{
                        ...styles.feeRow,
                        color:
                          colors.textSecondary,
                      }}
                    >
                      <span>
                        Transfer amount
                      </span>

                      <strong
                        style={{
                          color:
                            colors.text,
                        }}
                      >
                        {formatNaira(
                          transferAmount
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        ...styles.feeRow,
                        color:
                          colors.textSecondary,
                      }}
                    >
                      <span>
                        Transfer fee
                      </span>

                      <strong
                        style={{
                          color:
                            colors.text,
                        }}
                      >
                        {formatNaira(
                          transactionFee
                        )}
                      </strong>
                    </div>

                    <div
                      style={{
                        ...styles.feeDivider,
                        background:
                          colors.divider,
                      }}
                    />

                    <div
                      style={{
                        ...styles.totalRow,
                        color:
                          colors.text,
                      }}
                    >
                      <span>
                        Total to be deducted
                      </span>

                      <strong
                        style={{
                          color:
                            colors.greenBright,
                        }}
                      >
                        {formatNaira(
                          totalDebit
                        )}
                      </strong>
                    </div>
                  </div>
                )}

              {/* NARRATION */}

              <label
                htmlFor="narration"
                style={{
                  ...styles.label,
                  color:
                    colors.text,
                }}
              >
                Narration (optional)
              </label>

              <input
                id="narration"
                type="text"
                maxLength={150}
                value={narration}
                onChange={(event) =>
                  setNarration(
                    event.target.value
                  )
                }
                placeholder="What is this transfer for?"
                disabled={sending}
                style={{
                  ...styles.inputFull,
                  background:
                    colors.input,
                  borderColor:
                    colors.inputBorder,
                  color:
                    colors.text,
                }}
              />

              {/* BENEFICIARY */}

              <label
                style={{
                  ...styles.beneficiaryCheckbox,
                  color:
                    colors.text,
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    saveAsBeneficiary
                  }
                  onChange={(
                    event
                  ) =>
                    setSaveAsBeneficiary(
                      event.target
                        .checked
                    )
                  }
                  disabled={sending}
                />

                <span>
                  Save as beneficiary
                </span>
              </label>

              {/* ERROR */}

              {error && (
                <div
                  style={{
                    ...styles.errorBox,
                    background:
                      colors.errorBg,
                    borderColor:
                      colors.errorBorder,
                    color:
                      colors.errorText,
                  }}
                  role="alert"
                >
                  {error}
                </div>
              )}

              {/* CONTINUE */}

              <button
                type="button"
                onClick={() => {
                  handleSend(
                    {
                      preventDefault:
                        () => {},
                    } as React.FormEvent<HTMLFormElement>
                  );
                }}
                disabled={
                  sending ||
                  checking ||
                  !recipient ||
                  !amount ||
                  !Number.isFinite(
                    transferAmount
                  ) ||
                  transferAmount <
                    20
                }
                style={{
                  ...styles.sendButton,
                  background:
                    `linear-gradient(135deg, ${colors.green}, ${colors.greenBright})`,
                  opacity:
                    sending ||
                    checking ||
                    !recipient ||
                    !amount ||
                    !Number.isFinite(
                      transferAmount
                    ) ||
                    transferAmount <
                      20
                      ? 0.55
                      : 1,
                  boxShadow:
                    isDarkMode
                      ? '0 8px 22px rgba(37, 196, 119, 0.12)'
                      : '0 8px 20px rgba(8, 127, 91, 0.18)',
                }}
              >
                {sending
                  ? 'Processing Transfer...'
                  : 'Continue'}

                <span>›</span>
              </button>

              {/* ==================================================
                  TRANSACTION PIN
                  ================================================== */}

              {showTransactionPin && (
                <div
                  style={{
                    ...styles.pinOverlay,
                    background:
                      isDarkMode
                        ? 'rgba(0, 0, 0, 0.68)'
                        : 'rgba(10, 25, 19, 0.55)',
                  }}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="transaction-pin-title"
                >
                  <div
                    style={{
                      ...styles.pinDialog,
                      background:
                        colors.card,
                      border:
                        `1px solid ${colors.border}`,
                      boxShadow:
                        isDarkMode
                          ? '0 25px 70px rgba(0, 0, 0, 0.55)'
                          : '0 25px 70px rgba(0, 0, 0, 0.22)',
                    }}
                  >
                    <div
                      style={{
                        ...styles.pinIcon,
                        background:
                          colors.greenSoft,
                        border:
                          `1px solid ${colors.greenBorder}`,
                      }}
                    >
                      🔐
                    </div>

                    <h2
                      id="transaction-pin-title"
                      style={{
                        ...styles.pinTitle,
                        color:
                          colors.text,
                      }}
                    >
                      Confirm Transfer
                    </h2>

                    <p
                      style={{
                        ...styles.pinSubtitle,
                        color:
                          colors.textSecondary,
                      }}
                    >
                      Review the transfer
                      details below, then
                      enter your 4-digit
                      Transaction PIN to
                      authorize it.
                    </p>

                    <div
                      style={{
                        ...styles.pinSummary,
                        background:
                          colors.surfaceSoft,
                        borderColor:
                          colors.border,
                      }}
                    >
                      <div
                        style={{
                          ...styles.pinSummaryRow,
                          color:
                            colors.textSecondary,
                        }}
                      >
                        <span>
                          Recipient
                        </span>

                        <strong
                          style={{
                            color:
                              colors.text,
                          }}
                        >
                          {
                            recipient?.full_name
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          ...styles.pinSummaryRow,
                          color:
                            colors.textSecondary,
                        }}
                      >
                        <span>
                          Phone
                        </span>

                        <strong
                          style={{
                            color:
                              colors.text,
                          }}
                        >
                          {
                            recipient?.phone
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          ...styles.pinSummaryRow,
                          color:
                            colors.textSecondary,
                        }}
                      >
                        <span>
                          Transfer amount
                        </span>

                        <strong
                          style={{
                            color:
                              colors.text,
                          }}
                        >
                          {formatNaira(
                            transferAmount
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          ...styles.pinSummaryRow,
                          color:
                            colors.textSecondary,
                        }}
                      >
                        <span>
                          Transfer fee
                        </span>

                        <strong
                          style={{
                            color:
                              colors.text,
                          }}
                        >
                          {formatNaira(
                            transactionFee
                          )}
                        </strong>
                      </div>

                      <div
                        style={{
                          ...styles.pinSummaryDivider,
                          background:
                            colors.divider,
                        }}
                      />

                      <div
                        style={{
                          ...styles.pinTotalRow,
                          color:
                            colors.text,
                        }}
                      >
                        <span>
                          Total deducted
                        </span>

                        <strong
                          style={{
                            color:
                              colors.greenBright,
                          }}
                        >
                          {formatNaira(
                            totalDebit
                          )}
                        </strong>
                      </div>
                    </div>

                    {transactionPinError && (
                      <div
                        style={{
                          ...styles.pinError,
                          background:
                            colors.errorBg,
                          borderColor:
                            colors.errorBorder,
                          color:
                            colors.errorText,
                        }}
                        role="alert"
                      >
                        {
                          transactionPinError
                        }
                      </div>
                    )}

                    <label
                      htmlFor="transaction-pin"
                      style={{
                        ...styles.pinLabel,
                        color:
                          colors.text,
                      }}
                    >
                      Transaction PIN
                    </label>

                    <input
                      id="transaction-pin"
                      type="password"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      value={
                        transactionPin
                      }
                      onChange={(
                        event
                      ) => {
                        const value =
                          event.target.value
                            .replace(
                              /\D/g,
                              ''
                            )
                            .slice(
                              0,
                              4
                            );

                        setTransactionPin(
                          value
                        );

                        setTransactionPinError(
                          ''
                        );
                      }}
                      placeholder="••••"
                      disabled={
                        verifyingTransactionPin
                      }
                      style={{
                        ...styles.pinInput,
                        color:
                          colors.text,
                        background:
                          colors.input,
                        borderColor:
                          colors.inputBorder,
                      }}
                      autoFocus
                    />

                    <div
                      style={
                        styles.pinActions
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowTransactionPin(
                            false
                          );

                          setTransactionPin(
                            ''
                          );

                          setTransactionPinError(
                            ''
                          );
                        }}
                        disabled={
                          verifyingTransactionPin
                        }
                        style={{
                          ...styles.cancelPinButton,
                          background:
                            colors.surfaceSoft,
                          borderColor:
                            colors.border,
                          color:
                            colors.textSecondary,
                        }}
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
                          transactionPin.length !==
                            4
                        }
                        style={{
                          ...styles.confirmPinButton,
                          background:
                            `linear-gradient(135deg, ${colors.green}, ${colors.greenBright})`,
                          opacity:
                            verifyingTransactionPin ||
                            transactionPin.length !==
                              4
                              ? 0.55
                              : 1,
                        }}
                      >
                        {verifyingTransactionPin
                          ? 'Verifying...'
                          : 'Confirm Transfer'}
                      </button>
                    </div>

                    <div
                      style={{
                        ...styles.pinSecurity,
                        color:
                          colors.textMuted,
                      }}
                    >
                      🔒 Your Transaction PIN
                      is securely verified
                      and is never stored on
                      this device.
                    </div>
                  </div>
                </div>
              )}

              {/* SECURITY */}

              <div
                style={{
                  ...styles.securityNote,
                  color:
                    colors.textMuted,
                }}
              >
                <span
                  style={styles.lock}
                >
                  🔒
                </span>

                <span>
                  Your transfer is
                  processed securely
                  between Zenimonies
                  accounts.
                </span>
              </div>
            </>
          )}

          {/* ==================================================
              RECENT RECIPIENTS
              ================================================== */}

          <div
            style={{
              ...styles.recentSection,
              background:
                colors.surfaceSoft,
              borderColor:
                colors.border,
            }}
          >
            <div
              style={
                styles.recentHeader
              }
            >
              <div>
                <h2
                  style={{
                    ...styles.recentTitle,
                    color:
                      colors.text,
                  }}
                >
                  Recent Recipients
                </h2>

                <p
                  style={{
                    ...styles.recentSubtitle,
                    color:
                      colors.textMuted,
                  }}
                >
                  Quickly send money to
                  people you've transferred
                  to before.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void loadRecentRecipients();
                }}
                disabled={
                  loadingRecentRecipients
                }
                style={{
                  ...styles.refreshButton,
                  background:
                    colors.input,
                  borderColor:
                    colors.border,
                  color:
                    colors.greenBright,
                }}
                title="Refresh recent recipients"
              >
                {loadingRecentRecipients
                  ? '...'
                  : '↻'}
              </button>
            </div>

            {loadingRecentRecipients &&
              recentRecipients.length ===
                0 && (
                <div
                  style={{
                    ...styles.recentEmpty,
                    color:
                      colors.textMuted,
                  }}
                >
                  <div
                    style={{
                      ...styles.loadingDot,
                      border:
                        `3px solid ${colors.border}`,
                      borderTop:
                        `3px solid ${colors.greenBright}`,
                    }}
                  />

                  Loading recent recipients...
                </div>
              )}

            {recentRecipientsError && (
              <div
                style={{
                  ...styles.recentError,
                  background:
                    colors.errorBg,
                  borderColor:
                    colors.errorBorder,
                  color:
                    colors.errorText,
                }}
                role="alert"
              >
                <span>
                  {
                    recentRecipientsError
                  }
                </span>

                <button
                  type="button"
                  onClick={() => {
                    void loadRecentRecipients();
                  }}
                  style={{
                    ...styles.retryButton,
                    background:
                      colors.errorText,
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {!loadingRecentRecipients &&
              !recentRecipientsError &&
              recentRecipients.length ===
                0 && (
                <div
                  style={{
                    ...styles.recentEmpty,
                    color:
                      colors.textMuted,
                  }}
                >
                  <div
                    style={{
                      ...styles.emptyIcon,
                      background:
                        colors.greenSoft,
                      color:
                        colors.greenBright,
                    }}
                  >
                    ↗
                  </div>

                  <strong
                    style={{
                      ...styles.emptyTitle,
                      color:
                        colors.text,
                    }}
                  >
                    No recent recipients yet
                  </strong>

                  <span
                    style={{
                      ...styles.emptyText,
                      color:
                        colors.textMuted,
                    }}
                  >
                    Your successful
                    Zenimonies transfers
                    will appear here.
                  </span>
                </div>
              )}

            {recentRecipients.length >
              0 && (
              <div
                style={
                  styles.recentList
                }
              >
                {recentRecipients.map(
                  (
                    item,
                    index
                  ) => (
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
                        checking ||
                        sending
                      }
                      style={{
                        ...styles.recentItem,
                        background:
                          colors.card,
                        borderColor:
                          colors.border,
                      }}
                    >
                      <div
                        style={{
                          ...styles.recentAvatar,
                          background:
                            isDarkMode
                              ? '#174b38'
                              : '#e1f5e9',
                          color:
                            colors.greenBright,
                        }}
                      >
                        {item.full_name
                          ? item.full_name
                              .charAt(
                                0
                              )
                              .toUpperCase()
                          : 'Z'}
                      </div>

                      <div
                        style={
                          styles.recentInfo
                        }
                      >
                        <strong
                          style={{
                            ...styles.recentName,
                            color:
                              colors.text,
                          }}
                        >
                          {item.full_name ||
                            'Zenimonies User'}
                        </strong>

                        <span
                          style={{
                            ...styles.recentPhone,
                            color:
                              colors.textSecondary,
                          }}
                        >
                          {
                            item.phone
                          }
                        </span>

                        {item.completed_at && (
                          <span
                            style={{
                              ...styles.recentDate,
                              color:
                                colors.textMuted,
                            }}
                          >
                            {new Date(
                              item.completed_at
                            ).toLocaleDateString(
                              'en-NG',
                              {
                                day: 'numeric',
                                month:
                                  'short',
                                year:
                                  'numeric',
                              }
                            )}
                          </span>
                        )}
                      </div>

                      <span
                        style={{
                          ...styles.recentArrow,
                          color:
                            colors.greenBright,
                        }}
                      >
                        ›
                      </span>
                    </button>
                  )
                )}
              </div>
            )}

            {/* SAVED BENEFICIARIES */}

            <div
              style={{
                ...styles.savedSection,
                background:
                  colors.card,
                borderColor:
                  colors.border,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowSavedBeneficiaries(
                    (previous) =>
                      !previous
                  );
                }}
                style={{
                  ...styles.savedToggle,
                  background:
                    colors.surfaceSoft,
                }}
                aria-expanded={
                  showSavedBeneficiaries
                }
              >
                <div
                  style={
                    styles.savedToggleLeft
                  }
                >
                  <div
                    style={{
                      ...styles.savedIcon,
                      background:
                        colors.greenSoft,
                      color:
                        colors.greenBright,
                    }}
                  >
                    ♧
                  </div>

                  <div>
                    <strong
                      style={{
                        ...styles.savedTitle,
                        color:
                          colors.text,
                      }}
                    >
                      Saved Beneficiaries
                    </strong>

                    <span
                      style={{
                        ...styles.savedSubtitle,
                        color:
                          colors.textMuted,
                      }}
                    >
                      Your saved recipients
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    ...styles.savedChevron,
                    color:
                      colors.greenBright,
                  }}
                >
                  {showSavedBeneficiaries
                    ? '−'
                    : '+'}
                </span>
              </button>

              {showSavedBeneficiaries && (
                <div
                  style={{
                    ...styles.savedContent,
                    borderTopColor:
                      colors.border,
                    background:
                      colors.card,
                  }}
                >
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
        </section>
      </main>

      {/* ======================================================
          GLOBAL PAGE HELPERS
          ====================================================== */}

      <style>
        {`
          .zenimonies-page input::placeholder {
            color: ${
              isDarkMode
                ? '#71857b'
                : '#98a49f'
            };
            opacity: 1;
          }

          .zenimonies-page input,
          .zenimonies-page select {
            color-scheme: ${
              isDarkMode
                ? 'dark'
                : 'light'
            };
          }

          .zenimonies-page button {
            -webkit-tap-highlight-color: transparent;
          }
        `}
      </style>
    </div>
  );
};

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: '100vh',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 40,
    transition:
      'background-color 0.2s ease, color 0.2s ease',
  },

  header: {
    height: 68,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 5%',
    boxSizing: 'border-box',
    transition:
      'background-color 0.2s ease, border-color 0.2s ease',
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
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    fontWeight: 800,
  },

  brandName: {
    fontSize: 18,
    fontWeight: 800,
  },

  brandSubtitle: {
    fontSize: 8,
    letterSpacing: 1.7,
    marginTop: 2,
  },

  homeLink: {
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
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700,
  },

  card: {
    borderRadius: 24,
    padding: 24,
    border: '1px solid',
    transition:
      'background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
  },

  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 800,
    marginBottom: 16,
    boxSizing: 'border-box',
  },

  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 850,
  },

  subtitle: {
    margin: '7px 0 22px',
    fontSize: 14,
    lineHeight: 1.55,
  },

  label: {
    display: 'block',
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
    border: '1px solid',
    borderRadius: 12,
    padding: '13px 14px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  },

  verifyButton: {
    border: 'none',
    borderRadius: 12,
    padding: '0 17px',
    color: '#ffffff',
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  recipientCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    borderRadius: 15,
    padding: 12,
    marginBottom: 18,
    border: '1px solid',
  },

  recipientAvatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
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
    fontSize: 14,
    fontWeight: 800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  recipientPhone: {
    fontSize: 12,
    marginTop: 2,
  },

  recipientAccount: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 3,
  },

  verifiedPill: {
    borderRadius: 999,
    padding: '6px 9px',
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },

  amountWrap: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
  },

  currency: {
    paddingLeft: 14,
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
    background: 'transparent',
  },

  feeCard: {
    border: '1px solid',
    borderRadius: 15,
    padding: 14,
    marginBottom: 19,
  },

  feeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 13,
    fontWeight: 850,
    marginBottom: 8,
  },

  feeBadge: {
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
    fontSize: 12.5,
  },

  feeDivider: {
    height: 1,
    margin: '5px 0',
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '7px 0 2px',
    fontSize: 14,
    fontWeight: 850,
  },

  inputFull: {
    width: '100%',
    border: '1px solid',
    borderRadius: 12,
    padding: '13px 14px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 20,
  },

  beneficiaryCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  sendButton: {
    width: '100%',
    border: 'none',
    borderRadius: 13,
    padding: '14px 16px',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 800,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  errorBox: {
    borderRadius: 13,
    padding: 13,
    marginBottom: 16,
    border: '1px solid',
    fontSize: 13,
    fontWeight: 700,
    lineHeight: 1.45,
  },

  successBox: {
    borderRadius: 13,
    padding: 13,
    marginBottom: 16,
    border: '1px solid',
    fontSize: 13,
    lineHeight: 1.5,
  },

  /*
   * ==========================================================
   * PIN
   * ==========================================================
   */

  pinOverlay: {
    position: 'fixed',
    inset: 0,
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
    borderRadius: 24,
    padding: 24,
    boxSizing: 'border-box',
    transition:
      'background-color 0.2s ease, border-color 0.2s ease',
  },

  pinIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    marginBottom: 15,
    boxSizing: 'border-box',
  },

  pinTitle: {
    margin: 0,
    fontSize: 23,
    fontWeight: 850,
  },

  pinSubtitle: {
    margin: '7px 0 18px',
    fontSize: 13,
    lineHeight: 1.5,
  },

  pinSummary: {
    borderRadius: 14,
    padding: 13,
    marginBottom: 17,
    border: '1px solid',
  },

  pinSummaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '5px 0',
    fontSize: 12,
  },

  pinSummaryDivider: {
    height: 1,
    margin: '7px 0',
  },

  pinTotalRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '5px 0 2px',
    fontSize: 14,
    fontWeight: 850,
  },

  pinLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 7,
  },

  pinInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid',
    borderRadius: 13,
    padding: 14,
    textAlign: 'center',
    letterSpacing: 9,
    fontSize: 24,
    fontWeight: 800,
    outline: 'none',
    marginBottom: 12,
  },

  pinError: {
    borderRadius: 12,
    padding: 11,
    marginBottom: 14,
    border: '1px solid',
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
    border: '1px solid',
    borderRadius: 12,
    padding: '13px 10px',
    fontWeight: 800,
    cursor: 'pointer',
  },

  confirmPinButton: {
    flex: 1.5,
    border: 'none',
    borderRadius: 12,
    padding: '13px 10px',
    color: '#ffffff',
    fontWeight: 800,
    cursor: 'pointer',
  },

  pinSecurity: {
    marginTop: 14,
    fontSize: 10,
    lineHeight: 1.45,
    textAlign: 'center',
  },

  /*
   * ==========================================================
   * RECENT RECIPIENTS
   * ==========================================================
   */

  recentSection: {
    marginTop: 24,
    marginBottom: 24,
    padding: 15,
    border: '1px solid',
    borderRadius: 17,
    transition:
      'background-color 0.2s ease, border-color 0.2s ease',
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
    fontSize: 16,
    fontWeight: 850,
  },

  recentSubtitle: {
    margin: '5px 0 0',
    fontSize: 11,
    lineHeight: 1.5,
  },

  refreshButton: {
    width: 34,
    height: 34,
    flexShrink: 0,
    border: '1px solid',
    borderRadius: 10,
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
    border: '1px solid',
    borderRadius: 13,
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  },

  recentAvatar: {
    width: 39,
    height: 39,
    flexShrink: 0,
    borderRadius: '50%',
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
    fontSize: 13,
    fontWeight: 800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  recentPhone: {
    fontSize: 11,
  },

  recentDate: {
    fontSize: 10,
  },

  recentArrow: {
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
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 1.5,
  },

  loadingDot: {
    width: 23,
    height: 23,
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
    fontSize: 23,
    fontWeight: 800,
    marginBottom: 4,
  },

  emptyTitle: {
    fontSize: 13,
    fontWeight: 800,
  },

  emptyText: {
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
    border: '1px solid',
    fontSize: 12,
    lineHeight: 1.5,
  },

  retryButton: {
    border: 'none',
    borderRadius: 8,
    padding: '7px 12px',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 800,
    cursor: 'pointer',
  },

  /*
   * ==========================================================
   * SAVED BENEFICIARIES
   * ==========================================================
   */

  savedSection: {
    marginTop: 14,
    border: '1px solid',
    borderRadius: 13,
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
    borderRadius: 11,
    fontSize: 20,
    fontWeight: 800,
  },

  savedTitle: {
    display: 'block',
    fontSize: 13,
    fontWeight: 850,
  },

  savedSubtitle: {
    display: 'block',
    marginTop: 3,
    fontSize: 10,
  },

  savedChevron: {
    fontSize: 24,
    fontWeight: 700,
    flexShrink: 0,
  },

  savedContent: {
    padding: 12,
    borderTop: '1px solid',
  },

  securityNote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 17,
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
