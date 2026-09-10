import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CARD_FEE = 1000;

type Step = 'start' | 'pin' | 'confirm' | 'created';

interface SavedVirtualCard {
  cardNumber: string;
  expiry: string;
  cvv: string;
  created: boolean;
}

const STORAGE_KEY = 'zenimonies_virtual_card';

const VirtualCard: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('start');

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [error, setError] = useState('');

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const [showCardDetails, setShowCardDetails] = useState(false);

  /*
   * ============================================================
   * LOAD EXISTING CARD
   * ============================================================
   *
   * If the user has already created a card, do NOT show the
   * creation screen again.
   */

  useEffect(() => {
    try {
      const savedCard = localStorage.getItem(STORAGE_KEY);

      if (!savedCard) {
        setStep('start');
        return;
      }

      const parsedCard: SavedVirtualCard = JSON.parse(savedCard);

      if (
        parsedCard &&
        parsedCard.created &&
        parsedCard.cardNumber &&
        parsedCard.expiry &&
        parsedCard.cvv
      ) {
        setCardNumber(parsedCard.cardNumber);
        setExpiry(parsedCard.expiry);
        setCvv(parsedCard.cvv);
        setStep('created');
      }
    } catch (storageError) {
      console.error(
        'Unable to load virtual card:',
        storageError
      );

      setStep('start');
    }
  }, []);

  /*
   * ============================================================
   * START CARD CREATION
   * ============================================================
   */

  const handleStart = () => {
    setError('');
    setStep('pin');
  };

  /*
   * ============================================================
   * FIRST PIN
   * ============================================================
   */

  const handlePinContinue = () => {
    setError('');

    if (!/^\d{4}$/.test(pin)) {
      setError(
        'Your card PIN must contain exactly 4 digits.'
      );
      return;
    }

    setStep('confirm');
  };

  /*
   * ============================================================
   * CREATE CARD
   * ============================================================
   */

  const handleConfirm = () => {
    setError('');

    if (!/^\d{4}$/.test(confirmPin)) {
      setError(
        'Please enter your 4-digit card PIN again.'
      );
      return;
    }

    if (pin !== confirmPin) {
      setError('The PINs do not match.');
      return;
    }

    /*
     * IMPORTANT:
     *
     * This frontend version generates demonstration card
     * details and remembers the card in localStorage.
     *
     * The REAL ₦1,000 debit must be performed by the
     * Zenimonies backend after checking the user's balance.
     *
     * The card PIN must NEVER be stored in localStorage.
     */

    const generatedCardNumber =
      '5399 ' +
      Math.floor(1000 + Math.random() * 9000) +
      ' ' +
      Math.floor(1000 + Math.random() * 9000) +
      ' ' +
      Math.floor(1000 + Math.random() * 9000);

    const generatedCvv = String(
      Math.floor(100 + Math.random() * 900)
    );

    const today = new Date();

    const expiryMonth = String(
      today.getMonth() + 1
    ).padStart(2, '0');

    const expiryYear = String(
      today.getFullYear() + 3
    ).slice(-2);

    const generatedExpiry =
      `${expiryMonth}/${expiryYear}`;

    /*
     * Save the card so that returning to this page later
     * shows the existing card.
     */

    const savedCard: SavedVirtualCard = {
      cardNumber: generatedCardNumber,
      expiry: generatedExpiry,
      cvv: generatedCvv,
      created: true,
    };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(savedCard)
      );
    } catch (storageError) {
      console.error(
        'Unable to save virtual card:',
        storageError
      );
    }

    setCardNumber(generatedCardNumber);
    setExpiry(generatedExpiry);
    setCvv(generatedCvv);

    /*
     * Clear PIN values from React state after creation.
     */

    setPin('');
    setConfirmPin('');

    setStep('created');
  };

  /*
   * ============================================================
   * MASK CARD NUMBER
   * ============================================================
   */

  const maskedCardNumber = () => {
    if (!cardNumber) {
      return '•••• •••• •••• ••••';
    }

    const parts = cardNumber.split(' ');

    if (parts.length !== 4) {
      return '•••• •••• •••• ••••';
    }

    return (
      '•••• •••• •••• ' +
      parts[3]
    );
  };

  /*
   * ============================================================
   * MASK CVV
   * ============================================================
   */

  const displayedCvv = showCardDetails
    ? cvv
    : '•••';

  /*
   * ============================================================
   * MASK EXPIRY
   * ============================================================
   */

  const displayedExpiry = showCardDetails
    ? expiry
    : '••/••';

  return (
    <div style={styles.page}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header style={styles.header}>

        <button
          type="button"
          style={styles.backButton}
          onClick={() => navigate('/')}
          aria-label="Back"
        >
          ←
        </button>

        <div style={styles.headerTitle}>
          Virtual Card
        </div>

        <div style={styles.headerSpacer} />

      </header>

      {/* ======================================================
          MAIN
      ====================================================== */}

      <main style={styles.main}>

        {/* ====================================================
            START
        ==================================================== */}

        {step === 'start' && (
          <>

            <div style={styles.iconCircle}>
              ▣
            </div>

            <h1 style={styles.title}>
              Create your Virtual Card
            </h1>

            <p style={styles.description}>
              Create a virtual card that you can use for
              supported online payments.
            </p>

            <div style={styles.infoCard}>

              <div style={styles.infoRow}>
                <span>
                  Card type
                </span>

                <strong>
                  Virtual Card
                </strong>
              </div>

              <div style={styles.divider} />

              <div style={styles.infoRow}>
                <span>
                  Card creation fee
                </span>

                <strong>
                  ₦{CARD_FEE.toLocaleString()}
                </strong>
              </div>

            </div>

            <div style={styles.notice}>

              <strong>
                Before you continue
              </strong>

              <p style={styles.noticeText}>
                A ₦{CARD_FEE.toLocaleString()} card creation
                fee applies when your virtual card is created.
              </p>

            </div>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={handleStart}
            >
              Continue
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate('/')}
            >
              Cancel
            </button>

          </>
        )}

        {/* ====================================================
            PIN
        ==================================================== */}

        {step === 'pin' && (
          <>

            <div style={styles.iconCircle}>
              🔐
            </div>

            <h1 style={styles.title}>
              Create your Card PIN
            </h1>

            <p style={styles.description}>
              Choose a secure 4-digit PIN for your virtual card.
            </p>

            <div style={styles.formCard}>

              <label style={styles.label}>
                Card PIN
              </label>

              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={pin}
                onChange={(event) => {
                  const value =
                    event.target.value.replace(/\D/g, '');

                  setPin(value);
                  setError('');
                }}
                placeholder="••••"
                style={styles.pinInput}
              />

              <p style={styles.helperText}>
                Your PIN must contain exactly 4 digits.
              </p>

            </div>

            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

            <button
              type="button"
              style={styles.primaryButton}
              onClick={handlePinContinue}
            >
              Continue
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => navigate('/')}
            >
              Cancel
            </button>

          </>
        )}

        {/* ====================================================
            CONFIRM PIN
        ==================================================== */}

        {step === 'confirm' && (
          <>

            <div style={styles.iconCircle}>
              ✓
            </div>

            <h1 style={styles.title}>
              Confirm your Card PIN
            </h1>

            <p style={styles.description}>
              Enter the same 4-digit PIN again to confirm.
            </p>

            <div style={styles.formCard}>

              <label style={styles.label}>
                Confirm Card PIN
              </label>

              <input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={4}
                value={confirmPin}
                onChange={(event) => {
                  const value =
                    event.target.value.replace(/\D/g, '');

                  setConfirmPin(value);
                  setError('');
                }}
                placeholder="••••"
                style={styles.pinInput}
              />

            </div>

            <div style={styles.feeCard}>

              <span>
                Card creation fee
              </span>

              <strong>
                ₦{CARD_FEE.toLocaleString()}
              </strong>

            </div>

            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

            <button
              type="button"
              style={styles.primaryButton}
              onClick={handleConfirm}
            >
              Create Virtual Card
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setError('');
                setStep('pin');
              }}
            >
              Back
            </button>

          </>
        )}

        {/* ====================================================
            EXISTING / CREATED CARD
        ==================================================== */}

        {step === 'created' && (
          <>

            <div style={styles.successIcon}>
              ✓
            </div>

            <h1 style={styles.title}>
              Your Virtual Card
            </h1>

            <p style={styles.description}>
              Your virtual card is already created.
              Card creation is a one-time process.
            </p>

            {/* ==================================================
                CARD
            ================================================== */}

            <div style={styles.virtualCard}>

              <div style={styles.cardTop}>

                <div style={styles.cardBrand}>
                  ZENIMONIES
                </div>

                <div style={styles.cardChip}>
                  ▦
                </div>

              </div>

              <div style={styles.cardNumber}>
                {showCardDetails
                  ? cardNumber
                  : maskedCardNumber()}
              </div>

              <div style={styles.cardBottom}>

                <div>
                  <div style={styles.cardSmallLabel}>
                    VALID THRU
                  </div>

                  <div style={styles.cardValue}>
                    {displayedExpiry}
                  </div>
                </div>

                <div>
                  <div style={styles.cardSmallLabel}>
                    CVV
                  </div>

                  <div style={styles.cardValue}>
                    {displayedCvv}
                  </div>
                </div>

              </div>

            </div>

            {/* ==================================================
                CARD ACTIONS
            ================================================== */}

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() =>
                setShowCardDetails(
                  (previous) => !previous
                )
              }
            >
              {showCardDetails
                ? 'Hide Card Details'
                : 'Show Card Details'}
            </button>

            <div style={styles.successNotice}>

              <strong>
                Virtual card created successfully
              </strong>

              <p style={styles.noticeText}>
                Card creation fee: ₦
                {CARD_FEE.toLocaleString()}
              </p>

              <p style={styles.noticeText}>
                You can return to this page at any time
                to access your existing virtual card.
              </p>

            </div>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => navigate('/')}
            >
              Back to Dashboard
            </button>

          </>
        )}

        {/* ====================================================
            PHYSICAL CARD
        ==================================================== */}

        <div style={styles.physicalCard}>

          <div style={styles.physicalIcon}>
            ▣
          </div>

          <div>
            <strong style={styles.physicalTitle}>
              Physical Card
            </strong>

            <p style={styles.physicalText}>
              Physical cards are coming soon.
            </p>
          </div>

        </div>

      </main>

    </div>
  );
};

/* ============================================================
   STYLES
============================================================ */

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
    height: 64,
    background: '#ffffff',
    borderBottom: '1px solid #e5ebe8',
    display: 'flex',
    alignItems: 'center',
    padding: '0 4%',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },

  backButton: {
    width: 40,
    height: 40,
    border: 'none',
    background: '#eef7f2',
    color: '#087c43',
    borderRadius: 12,
    fontSize: 22,
    cursor: 'pointer',
  },

  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 800,
  },

  headerSpacer: {
    width: 40,
  },

  main: {
    width: 'min(620px, 92%)',
    margin: '0 auto',
    paddingTop: 30,
  },

  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    background: '#dff5e9',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 30,
    margin: '0 auto 18px',
  },

  successIcon: {
    width: 68,
    height: 68,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
    fontWeight: 800,
    margin: '0 auto 18px',
  },

  title: {
    margin: '0 0 9px',
    textAlign: 'center',
    fontSize: 27,
    fontWeight: 800,
    color: '#063b2d',
  },

  description: {
    margin: '0 auto 22px',
    maxWidth: 500,
    textAlign: 'center',
    color: '#66756e',
    fontSize: 14,
    lineHeight: 1.6,
  },

  infoCard: {
    background: '#ffffff',
    border: '1px solid #e1ebe6',
    borderRadius: 18,
    padding: 18,
    boxShadow:
      '0 7px 22px rgba(26,61,47,0.05)',
  },

  infoRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
    fontSize: 14,
  },

  divider: {
    height: 1,
    background: '#e7eeeb',
    margin: '15px 0',
  },

  notice: {
    background: '#fff9e8',
    border: '1px solid #f1dfaa',
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
    color: '#755c18',
    fontSize: 13,
    lineHeight: 1.5,
  },

  noticeText: {
    margin: '5px 0 0',
  },

  primaryButton: {
    width: '100%',
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 13,
    padding: '14px 18px',
    marginTop: 20,
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  },

  secondaryButton: {
    width: '100%',
    border: '1px solid #d3ded9',
    background: '#ffffff',
    color: '#344054',
    borderRadius: 13,
    padding: '13px 18px',
    marginTop: 10,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  },

  formCard: {
    background: '#ffffff',
    border: '1px solid #e1ebe6',
    borderRadius: 18,
    padding: 20,
    boxShadow:
      '0 7px 22px rgba(26,61,47,0.05)',
  },

  label: {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 8,
    color: '#344054',
  },

  pinInput: {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #cfdad5',
    borderRadius: 12,
    padding: '14px',
    fontSize: 24,
    letterSpacing: 9,
    textAlign: 'center',
    outline: 'none',
  },

  helperText: {
    margin: '8px 0 0',
    color: '#7b8782',
    fontSize: 12,
  },

  error: {
    background: '#fff0f0',
    border: '1px solid #f0caca',
    color: '#a42626',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    fontSize: 13,
  },

  feeCard: {
    marginTop: 15,
    background: '#effbf5',
    border: '1px solid #d1eddf',
    borderRadius: 14,
    padding: 15,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#075e38',
    fontSize: 14,
  },

  virtualCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 220,
    borderRadius: 23,
    padding: 24,
    boxSizing: 'border-box',
    color: '#ffffff',
    background:
      'linear-gradient(135deg, #063b2d 0%, #087c43 55%, #09a65a 100%)',
    boxShadow:
      '0 16px 35px rgba(0,91,48,0.22)',
  },

  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardBrand: {
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: 1.5,
  },

  cardChip: {
    fontSize: 28,
  },

  cardNumber: {
    marginTop: 45,
    fontSize: 'clamp(20px, 5vw, 27px)',
    fontWeight: 700,
    letterSpacing: 2,
    whiteSpace: 'nowrap',
  },

  cardBottom: {
    marginTop: 28,
    display: 'flex',
    gap: 50,
  },

  cardSmallLabel: {
    fontSize: 8,
    opacity: 0.7,
    letterSpacing: 1,
    marginBottom: 3,
  },

  cardValue: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
  },

  successNotice: {
    background: '#effbf5',
    border: '1px solid #d1eddf',
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
    color: '#075e38',
    fontSize: 13,
    lineHeight: 1.5,
  },

  physicalCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#ffffff',
    border: '1px solid #e1ebe6',
    borderRadius: 17,
    padding: 15,
    marginTop: 25,
  },

  physicalIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    background: '#f0f3f2',
    color: '#89958f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 21,
  },

  physicalTitle: {
    display: 'block',
    color: '#344054',
    fontSize: 14,
  },

  physicalText: {
    margin: '3px 0 0',
    color: '#89958f',
    fontSize: 12,
  },
};

export default VirtualCard;
