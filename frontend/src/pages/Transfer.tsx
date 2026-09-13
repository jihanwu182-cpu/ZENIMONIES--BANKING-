import React, {
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import axios from 'axios';

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

  /*
   * REAL Zenimonies account number.
   */
  account_number?: string;

  currency?: string;

  is_verified?: boolean;
}


interface LookupResponse {
  success?: boolean;
  message?: string;

  user?: Recipient;
}


interface TransferResponse {
  success?: boolean;
  message?: string;

  transfer?: {
    reference?: string;

    recipient_name?: string;

    recipient_phone?: string;

    recipient_account?: string;

    recipient_bank?: string;

    amount?: number;

    transaction_fee?: number;

    currency?: string;

    status?: string;

    balance_after?: number;
  };
}


/*
 * ============================================================
 * COMPONENT
 * ============================================================
 */

const Transfer: React.FC = () => {
  const navigate = useNavigate();

  const [phone, setPhone] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [narration, setNarration] =
    useState('');

  const [recipient, setRecipient] =
    useState<Recipient | null>(null);

  const [checking, setChecking] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [reference, setReference] =
    useState('');

  const [balanceAfter, setBalanceAfter] =
    useState<number | null>(null);

  /*
   * REAL ACCOUNT NUMBER FROM
   * THE COMPLETED TRANSFER.
   */
  const [
    recipientAccountNumber,
    setRecipientAccountNumber,
  ] = useState('');

  const token =
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem('token') ||
    localStorage.getItem(
      'access_token'
    );

  const cleanPhone = useMemo(
    () =>
      phone
        .replace(/\s+/g, '')
        .trim(),
    [phone]
  );

  const transferAmount =
    Number(amount);


  /*
   * ==========================================================
   * VERIFY RECIPIENT
   * ==========================================================
   */

  const verifyRecipient =
    async () => {
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

      if (!cleanPhone) {
        setError(
          'Please enter the recipient phone number.'
        );
        return;
      }

      if (cleanPhone.length < 10) {
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
                phone: cleanPhone,
              },

              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            }
          );

        if (
          response.data?.success &&
          response.data?.user
        ) {
          const verifiedRecipient =
            response.data.user;

          setRecipient(
            verifiedRecipient
          );

          /*
           * Store the REAL account number.
           */
          setRecipientAccountNumber(
            verifiedRecipient.account_number ||
              ''
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
        if (
          err?.response?.status === 401
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
          err?.response?.data?.message ||
            'Unable to verify this Zenimonies user.'
        );
      } finally {
        setChecking(false);
      }
    };


  /*
   * ==========================================================
   * SEND MONEY
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
      transferAmount <= 0
    ) {
      setError(
        'Please enter a valid transfer amount.'
      );
      return;
    }

    if (
      transferAmount > 100000000
    ) {
      setError(
        'Transfer amount is too large.'
      );
      return;
    }

    try {
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

      if (
        response.data?.success
      ) {
        const transfer =
          response.data.transfer;

        setSuccess(
          response.data.message ||
            'Money sent successfully.'
        );

        setReference(
          transfer?.reference || ''
        );

        /*
         * IMPORTANT:
         * Store the REAL recipient account
         * returned by the backend.
         */
        setRecipientAccountNumber(
          transfer?.recipient_account ||
            recipient.account_number ||
            ''
        );

        const newBalance =
          Number(
            transfer?.balance_after
          );

        if (
          Number.isFinite(
            newBalance
          )
        ) {
          setBalanceAfter(
            newBalance
          );
        }

        setAmount('');
        setNarration('');
      } else {
        setError(
          response.data?.message ||
            'Transfer failed.'
        );
      }
    } catch (err: any) {
      if (
        err?.response?.status === 401
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
        err?.response?.data?.message ||
          'Unable to complete the transfer.'
      );
    } finally {
      setSending(false);
    }
  };


  /*
   * ==========================================================
   * FORMAT MONEY
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
   * PAGE
   * ==========================================================
   */

  return (
    <div style={styles.page}>

      {/* HEADER */}

      <header
        style={styles.header}
      >
        <Link
          to="/"
          style={styles.brandLink}
        >
          <div
            style={styles.logo}
          >
            Z
          </div>

          <div>
            <div
              style={
                styles.brandName
              }
            >
              Zenimonies
            </div>

            <div
              style={
                styles.brandSubtitle
              }
            >
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

        <section
          style={styles.card}
        >

          <div
            style={
              styles.iconCircle
            }
          >
            ➤
          </div>

          <h1
            style={styles.title}
          >
            Send to ZENIMONIES
          </h1>

          <p
            style={
              styles.subtitle
            }
          >
            Send money instantly to
            another active Zenimonies
            account.
          </p>


          {/* ERROR */}

          {error && (
            <div
              style={
                styles.errorBox
              }
              role="alert"
            >
              {error}
            </div>
          )}


          {/* SUCCESS */}

          {success && (
            <div
              style={
                styles.successBox
              }
              role="status"
            >
              <strong>
                {success}
              </strong>

              {reference && (
                <div
                  style={
                    styles.successDetails
                  }
                >
                  Reference:{' '}
                  {reference}
                </div>
              )}

              {recipientAccountNumber && (
                <div
                  style={
                    styles.successDetails
                  }
                >
                  Recipient Account:{' '}
                  <strong>
                    {
                      recipientAccountNumber
                    }
                  </strong>
                </div>
              )}

              {balanceAfter !==
                null &&
                Number.isFinite(
                  balanceAfter
                ) && (
                  <div
                    style={
                      styles.successDetails
                    }
                  >
                    Balance after
                    transfer:{' '}
                    {formatNaira(
                      balanceAfter
                    )}
                  </div>
                )}
            </div>
          )}


          {/* FORM */}

          <form
            onSubmit={
              handleSend
            }
          >

            {/* PHONE */}

            <label
              htmlFor="phone"
              style={styles.label}
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
                onChange={(event) => {
                  setPhone(
                    event.target.value
                  );

                  setRecipient(
                    null
                  );

                  setSuccess('');
                  setError('');
                  setReference('');

                  setBalanceAfter(
                    null
                  );

                  setRecipientAccountNumber(
                    ''
                  );
                }}
                placeholder="e.g. 08012345678"
                disabled={
                  checking ||
                  sending
                }
                style={
                  styles.input
                }
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
                style={
                  styles.verifyButton
                }
              >
                {checking
                  ? 'Checking...'
                  : 'Verify'}
              </button>
            </div>


            {/* RECIPIENT */}

            {recipient && (
              <div
                style={
                  styles.recipientCard
                }
              >
                <div
                  style={
                    styles.recipientAvatar
                  }
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
                    style={
                      styles.recipientName
                    }
                  >
                    {
                      recipient.full_name
                    }
                  </div>

                  <div
                    style={
                      styles.recipientPhone
                    }
                  >
                    {
                      recipient.phone
                    }
                  </div>

                  {recipient.account_number && (
                    <div
                      style={
                        styles.recipientAccount
                      }
                    >
                      Account:{' '}
                      {
                        recipient.account_number
                      }
                    </div>
                  )}
                </div>

                <div
                  style={
                    styles.verifiedPill
                  }
                >
                  ✓ Verified
                </div>
              </div>
            )}


            {/* AMOUNT */}

            <label
              htmlFor="amount"
              style={styles.label}
            >
              Amount (NGN)
            </label>

            <div
              style={
                styles.amountWrap
              }
            >
              <span
                style={
                  styles.currency
                }
              >
                ₦
              </span>

              <input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => {
                  setAmount(
                    event.target.value
                  );

                  setSuccess('');
                  setError('');
                }}
                placeholder="0.00"
                disabled={sending}
                style={
                  styles.amountInput
                }
              />
            </div>


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
                setNarration(
                  event.target.value
                )
              }
              placeholder="What is this transfer for?"
              disabled={sending}
              style={
                styles.inputFull
              }
            />


            {/* SEND */}

            <button
              type="submit"
              disabled={
                sending ||
                checking ||
                !recipient ||
                !amount
              }
              style={{
                ...styles.sendButton,

                opacity:
                  sending ||
                  checking ||
                  !recipient ||
                  !amount
                    ? 0.55
                    : 1,
              }}
            >
              {sending
                ? 'Processing Transfer...'
                : 'Send Money'}

              <span>›</span>
            </button>

          </form>


          {/* SECURITY */}

          <div
            style={
              styles.securityNote
            }
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

const styles: Record<
  string,
  React.CSSProperties
> = {

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
    borderBottom:
      '1px solid #e8efeb',
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
    border:
      '1px solid #e3ebe7',
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
    margin:
      '7px 0 22px',
    color: '#748079',
    fontSize: 14,
    lineHeight: 1.55,
  },

  errorBox: {
    background: '#fff1ef',
    color: '#a53227',
    border:
      '1px solid #f4d1cb',
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
    border:
      '1px solid #ccebd9',
    borderRadius: 13,
    padding: 13,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 1.5,
  },

  successDetails: {
    marginTop: 4,
    color: '#4f6d60',
    fontSize: 12,
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
    border:
      '1px solid #d7e0dc',
    borderRadius: 12,
    padding:
      '13px 14px',
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

  recipientCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    background: '#f1fbf6',
    border:
      '1px solid #d4eee0',
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
    padding:
      '6px 9px',
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },

  amountWrap: {
    display: 'flex',
    alignItems: 'center',
    border:
      '1px solid #d7e0dc',
    borderRadius: 12,
    marginBottom: 17,
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
    padding:
      '13px 12px',
    fontSize: 19,
    fontWeight: 800,
    color: '#10251d',
    background: 'transparent',
  },

  inputFull: {
    width: '100%',
    border:
      '1px solid #d7e0dc',
    borderRadius: 12,
    padding:
      '13px 14px',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 20,
    background: '#ffffff',
    color: '#10251d',
  },

  sendButton: {
    width: '100%',
    border: 'none',
    borderRadius: 13,
    padding:
      '14px 16px',
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
