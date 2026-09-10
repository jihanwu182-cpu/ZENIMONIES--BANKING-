import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://globalmarket-com.onrender.com';

const CARD_FEE = 1000;

type Step =
  | 'loading'
  | 'start'
  | 'pin'
  | 'confirm'
  | 'created';

interface VirtualCardData {
  id: string;
  card_number: string;
  card_number_last4: string;
  expiry_month: string;
  expiry_year: string;
  status: string;
  card_fee: number;
  created_at: string;
}

const VirtualCard: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('loading');

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [card, setCard] =
    useState<VirtualCardData | null>(null);

  const [cardCvv, setCardCvv] = useState('');

  /* ==========================================================
     GET AUTH TOKEN
  ========================================================== */

  const getToken = (): string | null => {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('accessToken') ||
      localStorage.getItem('authToken')
    );
  };

  /* ==========================================================
     LOAD EXISTING CARD
  ========================================================== */

  const loadVirtualCard = async () => {
    try {
      setError('');
      setStep('loading');

      const token = getToken();

      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/virtual-card`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('authToken');

        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load virtual card'
        );
      }

      /* ======================================================
         EXISTING CARD FOUND
      ====================================================== */

      if (
        data.success === true &&
        data.has_card === true &&
        data.card
      ) {
        setCard(data.card);
        setStep('created');
        return;
      }

      /* ======================================================
         NO CARD YET
      ====================================================== */

      setCard(null);
      setStep('start');
    } catch (err) {
      console.error(
        'Load virtual card error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load virtual card'
      );

      setStep('start');
    }
  };

  /* ==========================================================
     LOAD CARD WHEN PAGE OPENS
  ========================================================== */

  useEffect(() => {
    loadVirtualCard();
  }, []);

  /* ==========================================================
     START CARD CREATION
  ========================================================== */

  const handleStart = () => {
    setError('');

    if (card) {
      setStep('created');
      return;
    }

    setStep('pin');
  };

  /* ==========================================================
     FIRST PIN STEP
  ========================================================== */

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

  /* ==========================================================
     CREATE CARD
  ========================================================== */

  const handleCreateCard = async () => {
    setError('');

    if (!/^\d{4}$/.test(pin)) {
      setError(
        'Your card PIN must contain exactly 4 digits.'
      );
      setStep('pin');
      return;
    }

    if (pin !== confirmPin) {
      setError('The PINs do not match.');
      return;
    }

    const token = getToken();

    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/virtual-card`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pin,
          }),
        }
      );

      const data = await response.json();

      /* ======================================================
         ALREADY HAS CARD
      ====================================================== */

      if (response.status === 409) {
        if (data?.card) {
          setCard(data.card);
          setStep('created');
          setError('');
          return;
        }

        await loadVirtualCard();
        return;
      }

      /* ======================================================
         INSUFFICIENT BALANCE / OTHER ERROR
      ====================================================== */

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to create virtual card'
        );
      }

      /* ======================================================
         SUCCESS
      ====================================================== */

      if (
        data.success === true &&
        data.card
      ) {
        setCard(data.card);

        /*
         * CVV is returned only during card creation.
         * We keep it in component state so it can be shown
         * during this session.
         */
        if (data.card_cvv) {
          setCardCvv(String(data.card_cvv));
        }

        setStep('created');

        setPin('');
        setConfirmPin('');

        return;
      }

      throw new Error(
        'The card was not returned by the server.'
      );
    } catch (err) {
      console.error(
        'Create virtual card error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create virtual card'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ==========================================================
     GO HOME
  ========================================================== */

  const goHome = () => {
    navigate('/');
  };

  /* ==========================================================
     LOADING SCREEN
  ========================================================== */

  if (step === 'loading') {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <button
            type="button"
            style={styles.backButton}
            onClick={goHome}
          >
            ←
          </button>

          <div style={styles.headerTitle}>
            Virtual Card
          </div>

          <div style={styles.headerSpacer} />
        </header>

        <main style={styles.main}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}>
              ⟳
            </div>

            <h2 style={styles.loadingTitle}>
              Loading your card
            </h2>

            <p style={styles.loadingText}>
              Checking your Zenimonies account...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header style={styles.header}>
        <button
          type="button"
          style={styles.backButton}
          onClick={goHome}
        >
          ←
        </button>

        <div style={styles.headerTitle}>
          Virtual Card
        </div>

        <div style={styles.headerSpacer} />
      </header>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <main style={styles.main}>

        {/* ====================================================
            CREATE CARD
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
              Create a virtual card that you can use
              for supported online payments.
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
                A one-time fee of ₦1,000 will be
                deducted from your Zenimonies account
                when your virtual card is successfully
                created.
              </p>
            </div>

            <div style={styles.oneTimeNotice}>
              <span style={styles.checkCircle}>
                ✓
              </span>

              <div>
                <strong>
                  One-time card creation
                </strong>

                <p style={styles.oneTimeText}>
                  You can only create one virtual card
                  on this account.
                </p>
              </div>
            </div>

            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

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
              onClick={goHome}
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
              Choose a secure 4-digit PIN for your
              virtual card.
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
                    event.target.value.replace(
                      /\D/g,
                      ''
                    );

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
              onClick={goHome}
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
              Enter the same 4-digit PIN again to
              confirm.
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
                    event.target.value.replace(
                      /\D/g,
                      ''
                    );

                  setConfirmPin(value);
                  setError('');
                }}
                placeholder="••••"
                style={styles.pinInput}
              />

            </div>

            <div style={styles.feeCard}>
              <span>
                One-time card creation fee
              </span>

              <strong>
                ₦{CARD_FEE.toLocaleString()}
              </strong>
            </div>

            <div style={styles.warningCard}>
              <strong>
                Please confirm
              </strong>

              <p>
                Once your card is successfully
                created, ₦1,000 will be deducted
                from your account. You will not be
                charged again for creating this card.
              </p>
            </div>

            {error && (
              <div style={styles.error}>
                {error}
              </div>
            )}

            <button
              type="button"
              style={{
                ...styles.primaryButton,
                opacity: loading ? 0.7 : 1,
              }}
              onClick={handleCreateCard}
              disabled={loading}
            >
              {loading
                ? 'Creating Card...'
                : 'Create Virtual Card'}
            </button>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={() => {
                setError('');
                setStep('pin');
              }}
              disabled={loading}
            >
              Back
            </button>
          </>
        )}

        {/* ====================================================
            EXISTING / CREATED CARD
        ==================================================== */}

        {step === 'created' && card && (
          <>
            <div style={styles.successIcon}>
              ✓
            </div>

            <h1 style={styles.title}>
              Your Virtual Card
            </h1>

            <p style={styles.description}>
              Your virtual card is active and ready
              for supported online payments.
            </p>

            {/* ==================================================
                CARD
            ================================================== */}

            <div style={styles.virtualCard}>

              <div style={styles.cardGlowOne} />
              <div style={styles.cardGlowTwo} />

              <div style={styles.cardContent}>

                <div style={styles.cardTop}>

                  <div style={styles.cardBrand}>
                    ZENIMONIES
                  </div>

                  <div style={styles.cardChip}>
                    ▦
                  </div>

                </div>

                <div style={styles.cardType}>
                  VIRTUAL
                </div>

                <div style={styles.cardNumber}>
                  {card.card_number}
                </div>

                <div style={styles.cardBottom}>

                  <div>
                    <div style={styles.cardSmallLabel}>
                      VALID THRU
                    </div>

                    <div style={styles.cardValue}>
                      {card.expiry_month}/
                      {card.expiry_year}
                    </div>
                  </div>

                  <div>
                    <div style={styles.cardSmallLabel}>
                      CVV
                    </div>

                    <div style={styles.cardValue}>
                      {cardCvv || '•••'}
                    </div>
                  </div>

                  <div style={styles.activeBadge}>
                    ACTIVE
                  </div>

                </div>

              </div>
            </div>

            {/* ==================================================
                CARD DETAILS
            ================================================== */}

            <div style={styles.detailsCard}>

              <div style={styles.detailRow}>
                <span>
                  Card number
                </span>

                <strong>
                  {card.card_number}
                </strong>
              </div>

              <div style={styles.divider} />

              <div style={styles.detailRow}>
                <span>
                  Expiry
                </span>

                <strong>
                  {card.expiry_month}/
                  {card.expiry_year}
                </strong>
              </div>

              <div style={styles.divider} />

              <div style={styles.detailRow}>
                <span>
                  Status
                </span>

                <strong style={styles.activeText}>
                  {card.status}
                </strong>
              </div>

              <div style={styles.divider} />

              <div style={styles.detailRow}>
                <span>
                  Card creation fee
                </span>

                <strong>
                  ₦{Number(
                    card.card_fee || CARD_FEE
                  ).toLocaleString()}
                </strong>
              </div>

            </div>

            {/* ==================================================
                SECURITY NOTICE
            ================================================== */}

            <div style={styles.securityNotice}>
              <div style={styles.securityIcon}>
                🔒
              </div>

              <div>
                <strong>
                  Keep your card details secure
                </strong>

                <p>
                  Never share your card PIN or CVV
                  with anyone.
                </p>
              </div>
            </div>

            {cardCvv && (
              <div style={styles.cvvNotice}>
                <strong>
                  Your CVV is shown for this session
                </strong>

                <p>
                  For security, the CVV is not stored
                  as plain text by Zenimonies.
                </p>
              </div>
            )}

            <button
              type="button"
              style={styles.primaryButton}
              onClick={goHome}
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

  loadingContainer: {
    textAlign: 'center',
    paddingTop: 100,
  },

  spinner: {
    width: 60,
    height: 60,
    margin: '0 auto 20px',
    borderRadius: '50%',
    background: '#e0f5e9',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 30,
  },

  loadingTitle: {
    margin: 0,
    color: '#063b2d',
    fontSize: 21,
    fontWeight: 800,
  },

  loadingText: {
    color: '#66756e',
    fontSize: 13,
    marginTop: 8,
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

  oneTimeNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 11,
    background: '#effbf5',
    border: '1px solid #d1eddf',
    borderRadius: 15,
    padding: 15,
    marginTop: 12,
    color: '#075e38',
    fontSize: 13,
    lineHeight: 1.5,
  },

  checkCircle: {
    width: 24,
    height: 24,
    flexShrink: 0,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  oneTimeText: {
    margin: '4px 0 0',
    color: '#557064',
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
    lineHeight: 1.5,
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
    gap: 15,
    color: '#075e38',
    fontSize: 14,
  },

  warningCard: {
    marginTop: 12,
    background: '#fff9e8',
    border: '1px solid #f1dfaa',
    borderRadius: 14,
    padding: 15,
    color: '#755c18',
    fontSize: 13,
    lineHeight: 1.5,
  },

  virtualCard: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 235,
    borderRadius: 23,
    padding: 24,
    boxSizing: 'border-box',
    color: '#ffffff',
    background:
      'linear-gradient(135deg, #063b2d 0%, #087c43 55%, #09a65a 100%)',
    boxShadow:
      '0 16px 35px rgba(0,91,48,0.22)',
  },

  cardContent: {
    position: 'relative',
    zIndex: 2,
  },

  cardGlowOne: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: '50%',
    background:
      'rgba(255,255,255,0.08)',
    right: -70,
    top: -70,
  },

  cardGlowTwo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: '50%',
    background:
      'rgba(255,255,255,0.06)',
    left: -80,
    bottom: -80,
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

  cardType: {
    marginTop: 7,
    fontSize: 8,
    letterSpacing: 2,
    opacity: 0.65,
  },

  cardNumber: {
    marginTop: 42,
    fontSize:
      'clamp(17px, 5vw, 27px)',
    fontWeight: 700,
    letterSpacing: 2,
    whiteSpace: 'nowrap',
  },

  cardBottom: {
    marginTop: 25,
    display: 'flex',
    alignItems: 'flex-end',
    gap: 30,
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

  activeBadge: {
    marginLeft: 'auto',
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1,
    background:
      'rgba(255,255,255,0.16)',
    border:
      '1px solid rgba(255,255,255,0.25)',
    padding: '5px 8px',
    borderRadius: 7,
  },

  detailsCard: {
    marginTop: 15,
    background: '#ffffff',
    border: '1px solid #e1ebe6',
    borderRadius: 17,
    padding: 17,
    boxShadow:
      '0 7px 22px rgba(26,61,47,0.05)',
  },

  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
    fontSize: 13,
    color: '#66756e',
  },

  activeText: {
    color: '#078b4a',
    textTransform: 'capitalize',
  },

  securityNotice: {
    marginTop: 14,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 11,
    background: '#f5f7f6',
    border: '1px solid #e1e7e4',
    borderRadius: 15,
    padding: 15,
    color: '#344054',
    fontSize: 13,
    lineHeight: 1.5,
  },

  securityIcon: {
    fontSize: 20,
  },

  securityNoticeP: {
    margin: '4px 0 0',
  },

  cvvNotice: {
    marginTop: 12,
    background: '#effbf5',
    border: '1px solid #d1eddf',
    borderRadius: 14,
    padding: 14,
    color: '#075e38',
    fontSize: 12,
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
