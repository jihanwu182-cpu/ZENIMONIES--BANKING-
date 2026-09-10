import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const CARD_FEE = 1000;

const VirtualCard: React.FC = () => {
  const [hasCard, setHasCard] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [balance, setBalance] = useState(0);

  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const createVirtualCard = async () => {
    if (balance < CARD_FEE) {
      alert(
        'Insufficient balance. You need at least ₦1,000 to create a virtual card.'
      );
      return;
    }

    const confirmed = window.confirm(
      'Create your virtual card for ₦1,000?\n\n₦1,000 will be deducted from your Zenimonies account.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      /*
       * IMPORTANT:
       * The real implementation must call your backend.
       *
       * Example:
       *
       * const token = localStorage.getItem('token');
       *
       * const response = await fetch(
       *   '/api/cards/virtual/create',
       *   {
       *     method: 'POST',
       *     headers: {
       *       'Content-Type': 'application/json',
       *       Authorization: `Bearer ${token}`,
       *     },
       *   }
       * );
       *
       * const data = await response.json();
       *
       * if (!response.ok) {
       *   throw new Error(data.message || 'Unable to create card');
       * }
       *
       * setBalance(data.balance);
       * setCardNumber(data.card.number);
       * setExpiry(data.card.expiry);
       * setCvv(data.card.cvv);
       * setHasCard(true);
       */

      /*
       * TEMPORARY FRONTEND DEMO
       *
       * Remove this section once the backend endpoint
       * is connected.
       */
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setBalance((previous) => previous - CARD_FEE);

      setCardNumber('5399 8421 7356 4821');
      setExpiry('09/29');
      setCvv('•••');

      setHasCard(true);
      setShowDetails(false);

      alert('Virtual card created successfully.');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to create virtual card.';

      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const copyCardNumber = async () => {
    if (!cardNumber) {
      return;
    }

    try {
      await navigator.clipboard.writeText(cardNumber);
      alert('Card number copied.');
    } catch {
      alert('Unable to copy card number.');
    }
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}

      <header style={styles.header}>
        <Link to="/" style={styles.backButton}>
          ←
        </Link>

        <div style={styles.headerTitle}>
          Virtual Card
        </div>

        <div style={{ width: 40 }} />
      </header>

      <main style={styles.main}>
        {!hasCard ? (
          <>
            {/* CREATE CARD */}

            <section style={styles.intro}>
              <div style={styles.cardIcon}>
                ▣
              </div>

              <h1 style={styles.title}>
                Create your Virtual Card
              </h1>

              <p style={styles.description}>
                Create a virtual card for online payments and
                supported digital purchases.
              </p>
            </section>

            {/* FEE CARD */}

            <section style={styles.infoCard}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>
                  Card creation fee
                </span>

                <strong style={styles.fee}>
                  ₦1,000
                </strong>
              </div>

              <div style={styles.divider} />

              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>
                  Your balance
                </span>

                <strong style={styles.balance}>
                  ₦{balance.toLocaleString()}
                </strong>
              </div>
            </section>

            {/* WARNING */}

            <div style={styles.warning}>
              <div style={styles.warningIcon}>
                !
              </div>

              <div>
                <strong style={styles.warningTitle}>
                  Before you continue
                </strong>

                <p style={styles.warningText}>
                  ₦1,000 will be deducted from your account
                  when you create the virtual card.
                </p>
              </div>
            </div>

            {/* CREATE BUTTON */}

            <button
              type="button"
              onClick={createVirtualCard}
              disabled={loading}
              style={{
                ...styles.createButton,
                opacity: loading ? 0.65 : 1,
              }}
            >
              {loading
                ? 'Creating Card...'
                : 'Create Virtual Card — ₦1,000'}
            </button>

            {/* PHYSICAL CARD */}

            <section style={styles.comingSoon}>
              <div style={styles.physicalIcon}>
                ▭
              </div>

              <div style={{ flex: 1 }}>
                <strong style={styles.comingTitle}>
                  Physical Card
                </strong>

                <p style={styles.comingText}>
                  Physical cards are coming soon.
                </p>
              </div>

              <span style={styles.comingBadge}>
                Coming Soon
              </span>
            </section>
          </>
        ) : (
          <>
            {/* CARD CREATED */}

            <div style={styles.successMessage}>
              <div style={styles.successIcon}>
                ✓
              </div>

              <div>
                <strong>
                  Virtual Card Ready
                </strong>

                <p>
                  Your virtual card has been created.
                </p>
              </div>
            </div>

            {/* VIRTUAL CARD */}

            <section
              style={{
                ...styles.virtualCard,
                opacity: frozen ? 0.65 : 1,
              }}
            >
              <div style={styles.cardTop}>
                <strong style={styles.cardBrand}>
                  ZENIMONIES
                </strong>

                <div style={styles.cardChip}>
                  ▣
                </div>
              </div>

              <div style={styles.cardNumber}>
                {showDetails
                  ? cardNumber
                  : '•••• •••• •••• ••••'}
              </div>

              <div style={styles.cardBottom}>
                <div>
                  <span style={styles.cardLabel}>
                    CARD HOLDER
                  </span>

                  <strong style={styles.cardValue}>
                    HARRISON
                  </strong>
                </div>

                <div>
                  <span style={styles.cardLabel}>
                    EXPIRES
                  </span>

                  <strong style={styles.cardValue}>
                    {showDetails ? expiry : '••/••'}
                  </strong>
                </div>

                <div>
                  <span style={styles.cardLabel}>
                    CVV
                  </span>

                  <strong style={styles.cardValue}>
                    {showDetails ? cvv : '•••'}
                  </strong>
                </div>
              </div>

              <div style={styles.cardFooter}>
                <span>
                  VIRTUAL CARD
                </span>

                <span>
                  {frozen ? 'FROZEN' : 'ACTIVE'}
                </span>
              </div>
            </section>

            {/* DETAILS BUTTONS */}

            <div style={styles.actionRow}>
              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() =>
                  setShowDetails((previous) => !previous)
                }
              >
                {showDetails
                  ? 'Hide Details'
                  : 'Show Details'}
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={copyCardNumber}
              >
                Copy Number
              </button>
            </div>

            {/* FREEZE */}

            <button
              type="button"
              style={{
                ...styles.freezeButton,
                color: frozen ? '#087c43' : '#c62828',
                borderColor: frozen
                  ? '#bfe5d2'
                  : '#f0caca',
              }}
              onClick={() =>
                setFrozen((previous) => !previous)
              }
            >
              {frozen
                ? 'Unfreeze Card'
                : 'Freeze Card'}
            </button>

            {/* MANAGEMENT */}

            <Link
              to="/"
              style={styles.manageButton}
            >
              ← Back to Dashboard
            </Link>
          </>
        )}
      </main>
    </div>
  );
};

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
    borderBottom: '1px solid #e5ebe8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 5%',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: '#eef7f2',
    color: '#087c43',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 700,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
  },

  main: {
    width: 'min(560px, 92%)',
    margin: '0 auto',
    paddingTop: 28,
  },

  intro: {
    textAlign: 'center',
    marginBottom: 24,
  },

  cardIcon: {
    width: 62,
    height: 62,
    margin: '0 auto 15px',
    borderRadius: 18,
    background: '#dff5e9',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
  },

  title: {
    margin: '0 0 8px',
    fontSize: 27,
    fontWeight: 800,
  },

  description: {
    margin: 0,
    color: '#718078',
    fontSize: 14,
    lineHeight: 1.6,
  },

  infoCard: {
    background: '#ffffff',
    border: '1px solid #e0ebe5',
    borderRadius: 18,
    padding: 18,
    boxShadow: '0 6px 20px rgba(26,61,47,0.05)',
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
  },

  infoLabel: {
    color: '#68766f',
    fontSize: 14,
  },

  fee: {
    color: '#c62828',
    fontSize: 17,
  },

  balance: {
    color: '#087c43',
    fontSize: 17,
  },

  divider: {
    height: 1,
    background: '#edf2ef',
    margin: '16px 0',
  },

  warning: {
    marginTop: 14,
    padding: 14,
    borderRadius: 15,
    background: '#fff9ed',
    border: '1px solid #f4dfad',
    display: 'flex',
    gap: 11,
    alignItems: 'flex-start',
  },

  warningIcon: {
    width: 25,
    height: 25,
    borderRadius: '50%',
    background: '#f2b233',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    flexShrink: 0,
  },

  warningTitle: {
    fontSize: 13,
  },

  warningText: {
    margin: '4px 0 0',
    color: '#776d59',
    fontSize: 12,
    lineHeight: 1.5,
  },

  createButton: {
    width: '100%',
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 13,
    padding: '14px 16px',
    marginTop: 18,
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },

  comingSoon: {
    marginTop: 20,
    padding: 16,
    borderRadius: 17,
    background: '#ffffff',
    border: '1px solid #e2ebe7',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },

  physicalIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    background: '#f1f4f3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    color: '#6f7b76',
  },

  comingTitle: {
    fontSize: 14,
  },

  comingText: {
    margin: '4px 0 0',
    color: '#7a8781',
    fontSize: 11,
  },

  comingBadge: {
    fontSize: 10,
    fontWeight: 800,
    color: '#6e7974',
    background: '#f0f3f2',
    padding: '6px 8px',
    borderRadius: 8,
    whiteSpace: 'nowrap',
  },

  successMessage: {
    background: '#eaf9f1',
    border: '1px solid #ccebd9',
    borderRadius: 15,
    padding: 13,
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    marginBottom: 17,
    color: '#075f37',
  },

  successIcon: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  virtualCard: {
    minHeight: 245,
    borderRadius: 23,
    padding: 23,
    boxSizing: 'border-box',
    background:
      'linear-gradient(135deg, #007a3f 0%, #079b52 55%, #04ad60 100%)',
    color: '#ffffff',
    boxShadow: '0 15px 35px rgba(0,112,58,0.18)',
  },

  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  cardBrand: {
    fontSize: 18,
    letterSpacing: 1,
  },

  cardChip: {
    width: 43,
    height: 32,
    borderRadius: 8,
    background: '#e6bd54',
    color: '#80651f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardNumber: {
    marginTop: 42,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: 2,
  },

  cardBottom: {
    marginTop: 28,
    display: 'flex',
    gap: 28,
  },

  cardLabel: {
    display: 'block',
    fontSize: 8,
    opacity: 0.7,
    letterSpacing: 1,
    marginBottom: 4,
  },

  cardValue: {
    display: 'block',
    fontSize: 12,
  },

  cardFooter: {
    marginTop: 20,
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 9,
    letterSpacing: 1,
    opacity: 0.8,
  },

  actionRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 10,
    marginTop: 13,
  },

  secondaryButton: {
    border: '1px solid #d6e2dc',
    background: '#ffffff',
    color: '#087c43',
    borderRadius: 12,
    padding: '12px',
    fontWeight: 700,
    cursor: 'pointer',
  },

  freezeButton: {
    width: '100%',
    background: '#ffffff',
    border: '1px solid',
    borderRadius: 12,
    padding: '12px',
    marginTop: 10,
    fontWeight: 800,
    cursor: 'pointer',
  },

  manageButton: {
    display: 'block',
    textAlign: 'center',
    marginTop: 15,
    color: '#087c43',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700,
  },
};

export default VirtualCard;
