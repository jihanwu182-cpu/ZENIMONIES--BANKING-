import React, {
  useMemo,
  useState,
} from 'react';

import BeneficiaryTabs from '../components/BeneficiaryTabs.tsx';

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
  account_number?: string;
  currency?: string;
  is_verified?: boolean;
}

interface LookupResponse {
  success?: boolean;
  message?: string;
  user?: Recipient;
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

  const [recipient, setRecipient] =
    useState<Recipient | null>(null);

  const [checking, setChecking] =
    useState(false);

  const [sending, setSending] =
    useState(false);

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
   * TRANSFER FEE PREVIEW
   * ==========================================================
   */

  const transactionFee =
    useMemo(() => {
      if (
        !Number.isFinite(
          transferAmount
        ) ||
        transferAmount < 20
      ) {
        return 0;
      }

      if (
        transferAmount < 1000
      ) {
        return 0;
      }

      if (
        transferAmount < 10000
      ) {
        return 20;
      }

      if (
        transferAmount < 100000
      ) {
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
   * VERIFY PHONE NUMBER
   *
   * This function is used by both:
   *
   * 1. The Verify button
   * 2. Recent/Saved beneficiary selection
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
      setRecipientAccountNumber('');

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

      if (
        cleanedPhone.length < 10
      ) {
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

          setPhone(
            verifiedRecipient.phone ||
              cleanedPhone
          );

          setRecipientAccountNumber(
            verifiedRecipient.account_number ||
              ''
          );

          setSuccess(
            'Zenimonies recipient verified.'
          );

          /*
           * Once verified, the page automatically
           * moves the beneficiary tabs to the bottom.
           */
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
   * VERIFY RECIPIENT BUTTON
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
   * SELECT RECENT / SAVED BENEFICIARY
   * ==========================================================
   */

  const handleBeneficiarySelect = async (
    beneficiary: any
  ) => {
    if (
      beneficiary.recipient_type !==
      'zenimonies'
    ) {
      return;
    }

    if (
      !beneficiary.recipient_phone
    ) {
      return;
    }

    const beneficiaryPhone =
      beneficiary.recipient_phone;

    /*
     * Put the beneficiary phone
     * into the input immediately.
     */

    setPhone(
      beneficiaryPhone
    );

    setAmount('');
    setNarration('');

    setSuccess('');
    setError('');
    setReference('');
    setBalanceAfter(null);
    setRecipientAccountNumber('');

    /*
     * Verify the beneficiary again
     * through the backend.
     *
     * This keeps the recipient
     * verification authoritative.
     */

    await verifyPhoneNumber(
      beneficiaryPhone
    );
  };

  /*
   * ==========================================================
   * PHONE INPUT CHANGE
   * ==========================================================
   */

  const handlePhoneChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPhone(
      event.target.value
    );

    /*
     * Changing the phone number
     * invalidates the current recipient.
     */

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
              Authorization:
                `Bearer ${token}`,

              'Content-Type':
                'application/json',
            },
          }
        );

        setSaveAsBeneficiary(false);
      } catch (error: any) {
        /*
         * The transfer already succeeded.
         *
         * A beneficiary-saving problem
         * must not make the transfer fail.
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
      transferAmount > 100000000
    ) {
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
                Authorization:
                  `Bearer ${token}`,

                'Content-Type':
                  'application/json',
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
            id:
              transfer.id || '',

            reference:
              transfer.reference || '',

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

            amount:
              Number(
                transfer.amount ?? 0
              ),

            transaction_fee:
              Number(
                transfer.transaction_fee ?? 0
              ),

            total_debit:
              Number(
                transfer.total_debit ?? 0
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
                transfer.balance_after ?? 0
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

          /*
           * Save beneficiary only after
           * the transfer has succeeded.
           */

          await saveSuccessfulBeneficiary();

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
        setVerifyingTransactionPin(
          false
        );

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

      {/* ======================================================
          HEADER
          ====================================================== */}

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
              style={styles.brandName}
            >
              Zenimonies
            </div>

            <div
              style={styles.brandSubtitle}
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

      {/* ======================================================
          MAIN
          ====================================================== */}

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
            style={styles.iconCircle}
          >
            ➤
          </div>

          <h1
            style={styles.title}
          >
            Send to ZENIMONIES
          </h1>

          <p
            style={styles.subtitle}
          >
            Send money instantly to
            another active Zenimonies
            account.
          </p>

          {/* ==================================================
              ERROR
              ================================================== */}

          {error && (
            <div
              style={styles.errorBox}
              role="alert"
            >
              {error}
            </div>
          )}

          {/* ==================================================
              SUCCESS
              ================================================== */}

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
              PHONE
              ================================================== */}

          <label
            htmlFor="phone"
            style={styles.label}
          >
            Recipient Phone Number
          </label>

          <div
            style={styles.verifyRow}
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
              style={styles.input}
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

          {/* ==================================================
              BEFORE VERIFICATION
              
              Recent/Saved appears immediately
              after the phone verification field.
              ================================================== */}

          {!recipient && (
            <div
              style={
                styles.beneficiaryArea
              }
            >
              <BeneficiaryTabs
                recipientType="zenimonies"
                onSelect={
                  handleBeneficiarySelect
                }
              />
            </div>
          )}

          {/* ==================================================
              VERIFIED RECIPIENT
              ================================================== */}

          {recipient && (
            <>
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

              {/* ==================================================
                  AMOUNT
                  ================================================== */}

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
                  min="20"
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
                  placeholder="20.00"
                  disabled={sending}
                  style={
                    styles.amountInput
                  }
                />
              </div>

              {/* ==================================================
                  TRANSFER FEE
                  ================================================== */}

              {Number.isFinite(
                transferAmount
              ) &&
                transferAmount >= 20 && (
                  <div
                    style={
                      styles.feeCard
                    }
                  >
                    <div
                      style={
                        styles.feeHeader
                      }
                    >
                      <span>
                        Transfer Summary
                      </span>

                      <span
                        style={
                          styles.feeBadge
                        }
                      >
                        NGN
                      </span>
                    </div>

                    <div
                      style={
                        styles.feeRow
                      }
                    >
                      <span>
                        Transfer amount
                      </span>

                      <strong>
                        {formatNaira(
                          transferAmount
                        )}
                      </strong>
                    </div>

                    <div
                      style={
                        styles.feeRow
                      }
                    >
                      <span>
                        Transfer fee
                      </span>

                      <strong>
                        {formatNaira(
                          transactionFee
                        )}
                      </strong>
                    </div>

                    <div
                      style={
                        styles.feeDivider
                      }
                    />

                    <div
                      style={
                        styles.totalRow
                      }
                    >
                      <span>
                        Total to be deducted
                      </span>

                      <strong>
                        {formatNaira(
                          totalDebit
                        )}
                      </strong>
                    </div>
                  </div>
                )}

              {/* ==================================================
                  NARRATION
                  ================================================== */}

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

              {/* ==================================================
                  SAVE BENEFICIARY
                  ================================================== */}

              <label
                style={
                  styles.beneficiaryCheckbox
                }
              >
                <input
                  type="checkbox"
                  checked={
                    saveAsBeneficiary
                  }
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

              {/* ==================================================
                  CONTINUE
                  ================================================== */}

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
                  transferAmount < 20
                }
                style={{
                  ...styles.sendButton,

                  opacity:
                    sending ||
                    checking ||
                    !recipient ||
                    !amount ||
                    !Number.isFinite(
                      transferAmount
                    ) ||
                    transferAmount < 20
                      ? 0.55
                      : 1,
                }}
              >
                {sending
                  ? 'Processing Transfer...'
                  : 'Continue'}

                <span>
                  ›
                </span>
              </button>

              {/* ==================================================
                  RECENT / SAVED
                  
                  AFTER VERIFICATION THIS MOVES
                  TO THE BOTTOM.
                  ================================================== */}

              <div
                style={
                  styles.bottomBeneficiaryArea
                }
              >
                <BeneficiaryTabs
                  recipientType="zenimonies"
                  onSelect={
                    handleBeneficiarySelect
                  }
                />
              </div>
            </>
          )}

          {/* ==================================================
              TRANSACTION PIN DIALOG
              ================================================== */}

          {showTransactionPin && (
            <div
              style={
                styles.pinOverlay
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby="transaction-pin-title"
            >
              <div
                style={
                  styles.pinDialog
                }
              >

                <div
                  style={
                    styles.pinIcon
                  }
                >
                  🔐
                </div>

                <h2
                  id="transaction-pin-title"
                  style={
                    styles.pinTitle
                  }
                >
                  Confirm Transfer
                </h2>

                <p
                  style={
                    styles.pinSubtitle
                  }
                >
                  Review the transfer
                  details below, then enter
                  your 4-digit Transaction PIN
                  to authorize it.
                </p>

                <div
                  style={
                    styles.pinSummary
                  }
                >

                  <div
                    style={
                      styles.pinSummaryRow
                    }
                  >
                    <span>
                      Recipient
                    </span>

                    <strong>
                      {recipient?.full_name}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.pinSummaryRow
                    }
                  >
                    <span>
                      Phone
                    </span>

                    <strong>
                      {recipient?.phone}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.pinSummaryRow
                    }
                  >
                    <span>
                      Transfer amount
                    </span>

                    <strong>
                      {formatNaira(
                        transferAmount
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.pinSummaryRow
                    }
                  >
                    <span>
                      Transfer fee
                    </span>

                    <strong>
                      {formatNaira(
                        transactionFee
                      )}
                    </strong>
                  </div>

                  <div
                    style={
                      styles.pinSummaryDivider
                    }
                  />

                  <div
                    style={
                      styles.pinTotalRow
                    }
                  >
                    <span>
                      Total deducted
                    </span>

                    <strong>
                      {formatNaira(
                        totalDebit
                      )}
                    </strong>
                  </div>

                </div>

                {transactionPinError && (
                  <div
                    style={
                      styles.pinError
                    }
                    role="alert"
                  >
                    {transactionPinError}
                  </div>
                )}

                <label
                  htmlFor="transaction-pin"
                  style={
                    styles.pinLabel
                  }
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
                  onChange={(event) => {
                    const value =
                      event.target.value
                        .replace(
                          /\D/g,
                          ''
                        )
                        .slice(0, 4);

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
                  style={
                    styles.pinInput
                  }
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
                    style={
                      styles.cancelPinButton
                    }
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
                  style={
                    styles.pinSecurity
                  }
                >
                  🔒 Your Transaction PIN
                  is securely verified and
                  is never stored on this
                  device.
                </div>

              </div>
            </div>
          )}

          {/* ======================================================
              SECURITY
              ====================================================== */}

          {recipient && (
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

  beneficiaryArea: {
    marginTop: 2,
    marginBottom: 22,
  },

  bottomBeneficiaryArea: {
    marginTop: 28,
    marginBottom: 4,
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
    padding:
      '13px 12px',
    fontSize: 19,
    fontWeight: 800,
    color: '#10251d',
    background: 'transparent',
  },

  feeCard: {
    background: '#f2faf6',
    border:
      '1px solid #d7ebe1',
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
    padding:
      '4px 8px',
    fontSize: 9,
    fontWeight: 850,
  },

  feeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding:
      '6px 0',
    color: '#65756d',
    fontSize: 12.5,
  },

  feeDivider: {
    height: 1,
    background: '#d9e8e1',
    margin:
      '5px 0',
  },

  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding:
      '7px 0 2px',
    color: '#10251d',
    fontSize: 14,
    fontWeight: 850,
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

  pinOverlay: {
    position: 'fixed',
    inset: 0,
    background:
      'rgba(10, 25, 19, 0.55)',
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
    boxShadow:
      '0 25px 70px rgba(0, 0, 0, 0.22)',
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
    margin:
      '7px 0 18px',
    color: '#748079',
    fontSize: 13,
    lineHeight: 1.5,
  },

  pinSummary: {
    background: '#f5faf7',
    border:
      '1px solid #e0ebe5',
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
    margin:
      '7px 0',
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
    border:
      '1px solid #cfdcd5',
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
    border:
      '1px solid #f4d1cb',
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
    border:
      '1px solid #d7e0dc',
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
