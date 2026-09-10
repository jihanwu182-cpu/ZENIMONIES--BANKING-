import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const VirtualCard: React.FC = () => {
  const navigate = useNavigate();

  const [cardCreated, setCardCreated] = useState(false);
  const [showNumber, setShowNumber] = useState(false);
  const [showCVV, setShowCVV] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [copied, setCopied] = useState(false);

  const cardNumber = '5399 2847 6135 2048';
  const expiry = '09/30';
  const cvv = '482';

  const copyCardNumber = async () => {
    try {
      await navigator.clipboard.writeText(
        cardNumber.replace(/\s/g, '')
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      alert('Unable to copy card number.');
    }
  };

  const displayedCardNumber = showNumber
    ? cardNumber
    : '•••• •••• •••• 2048';

  return (
    <div style={styles.page}>

      {/* ================= HEADER ================= */}

      <header style={styles.header}>

        <button
          type="button"
          style={styles.backButton}
          onClick={() => navigate('/')}
        >
          ←
        </button>

        <div style={styles.headerTitle}>
          Virtual Card
        </div>

        <div style={styles.headerSpacer} />

      </header>

      {/* ================= CONTENT ================= */}

      <main style={styles.main}>

        <div style={styles.intro}>

          <div>
            <h1 style={styles.title}>
              Your Virtual Card
            </h1>

            <p style={styles.subtitle}>
              Use your Zenimonies virtual card for
              secure online payments.
            </p>
          </div>

          <div style={styles.cardIcon}>
            💳
          </div>

        </div>

        {/* ================= CARD ================= */}

        {!cardCreated ? (

          <section style={styles.createCard}>

            <div style={styles.createIcon}>
              💳
            </div>

            <h2 style={styles.createTitle}>
              Create your Virtual Card
            </h2>

            <p style={styles.createText}>
              Create a virtual card for online
              payments and subscriptions.
            </p>

            <div style={styles.featureList}>

              <div style={styles.feature}>
                <span style={styles.featureCheck}>✓</span>
                Secure online payments
              </div>

              <div style={styles.feature}>
                <span style={styles.featureCheck}>✓</span>
                Easy to manage
              </div>

              <div style={styles.feature}>
                <span style={styles.featureCheck}>✓</span>
                Freeze or unfreeze anytime
              </div>

            </div>

            <button
              type="button"
              style={styles.primaryButton}
              onClick={() => setCardCreated(true)}
            >
              Create Virtual Card
            </button>

          </section>

        ) : (

          <>

            {/* ================= VIRTUAL CARD ================= */}

            <section
              style={{
                ...styles.virtualCard,
                opacity: frozen ? 0.65 : 1,
              }}
            >

              <div style={styles.cardTop}>

                <div>
                  <div style={styles.cardBrand}>
                    Zenimonies
                  </div>

                  <div style={styles.cardType}>
                    VIRTUAL
                  </div>
                </div>

                <div style={styles.cardChip}>
                  ▦
                </div>

              </div>

              <div style={styles.cardNumber}>
                {displayedCardNumber}
              </div>

              <div style={styles.cardBottom}>

                <div>
                  <div style={styles.cardLabel}>
                    CARD HOLDER
                  </div>

                  <div style={styles.cardValue}>
                    HARRISON
                  </div>
                </div>

                <div>
                  <div style={styles.cardLabel}>
                    EXPIRES
                  </div>

                  <div style={styles.cardValue}>
                    {expiry}
                  </div>
                </div>

                <div>
                  <div style={styles.cardLabel}>
                    CVV
                  </div>

                  <div style={styles.cardValue}>
                    {showCVV ? cvv : '•••'}
                  </div>
                </div>

                <div style={styles.cardNetwork}>
                  VISA
                </div>

              </div>

              {frozen && (
                <div style={styles.frozenOverlay}>
                  CARD FROZEN
                </div>
              )}

            </section>

            {/* ================= CARD STATUS ================= */}

            <div
              style={{
                ...styles.status,
                ...(frozen
                  ? styles.statusFrozen
                  : styles.statusActive),
              }}
            >

              <span
                style={{
                  ...styles.statusDot,
                  background: frozen
                    ? '#d92d20'
                    : '#079447',
                }}
              />

              {frozen
                ? 'Your card is frozen'
                : 'Your card is active'}

            </div>

            {/* ================= CARD ACTIONS ================= */}

            <section style={styles.actionsCard}>

              <button
                type="button"
                style={styles.actionButton}
                onClick={() =>
                  setShowNumber((previous) => !previous)
                }
              >
                <span style={styles.actionIcon}>
                  {showNumber ? '○' : '◉'}
                </span>

                <span>
                  {showNumber
                    ? 'Hide card number'
                    : 'Show card number'}
                </span>
              </button>

              <button
                type="button"
                style={styles.actionButton}
                onClick={() =>
                  setShowCVV((previous) => !previous)
                }
              >
                <span style={styles.actionIcon}>
                  🔐
                </span>

                <span>
                  {showCVV
                    ? 'Hide CVV'
                    : 'Show CVV'}
                </span>
              </button>

              <button
                type="button"
                style={styles.actionButton}
                onClick={copyCardNumber}
              >
                <span style={styles.actionIcon}>
                  📋
                </span>

                <span>
                  {copied
                    ? 'Card number copied'
                    : 'Copy card number'}
                </span>
              </button>

              <button
                type="button"
                style={styles.actionButton}
                onClick={() =>
                  setFrozen((previous) => !previous)
                }
              >
                <span style={styles.actionIcon}>
                  🔒
                </span>

                <span>
                  {frozen
                    ? 'Unfreeze card'
                    : 'Freeze card'}
                </span>
              </button>

            </section>

            {/* ================= CARD INFORMATION ================= */}

            <section style={styles.infoCard}>

              <h2 style={styles.infoTitle}>
                Card Information
              </h2>

              <div style={styles.infoRow}>
                <span>Card type</span>
                <strong>Virtual Visa</strong>
              </div>

              <div style={styles.infoRow}>
                <span>Status</span>

                <strong
                  style={{
                    color: frozen
                      ? '#d92d20'
                      : '#079447',
                  }}
                >
                  {frozen
                    ? 'Frozen'
                    : 'Active'}
                </strong>
              </div>

              <div style={styles.infoRow}>
                <span>Currency</span>
                <strong>NGN</strong>
              </div>

              <div style={styles.infoRow}>
                <span>Expiry</span>
                <strong>{expiry}</strong>
              </div>

            </section>

          </>

        )}

        {/* ================= PHYSICAL CARD ================= */}

        <section style={styles.physicalCard}>

          <div style={styles.physicalIcon}>
            💳
          </div>

          <div style={styles.physicalContent}>

            <div style={styles.comingSoon}>
              COMING SOON
            </div>

            <h2 style={styles.physicalTitle}>
              Physical Card
            </h2>

            <p style={styles.physicalText}>
              Get a physical Zenimonies card for
              ATM withdrawals and everyday
              payments.
            </p>

          </div>

        </section>

        {/* ================= SECURITY NOTICE ================= */}

        <section style={styles.securityCard}>

          <div style={styles.securityIcon}>
            🔐
          </div>

          <div>

            <h3 style={styles.securityTitle}>
              Keep your card details safe
            </h3>

            <p style={styles.securityText}>
              Never share your card number, expiry
              date or CVV with anyone you do not
              trust.
            </p>

          </div>

        </section>

      </main>

      {/* ================= BOTTOM NAV ================= */}

      <nav style={styles.bottomNav}>

        <button
          type="button"
          style={styles.navItem}
          onClick={() => navigate('/')}
        >
          <span style={styles.navIcon}>⌂</span>
          <span>Home</span>
        </button>

        <button
          type="button"
          style={styles.navItem}
          onClick={() => navigate('/transactions')}
        >
          <span style={styles.navIcon}>↕</span>
          <span>Transactions</span>
        </button>

        <button
          type="button"
          style={{
            ...styles.navItem,
            ...styles.navActive,
          }}
          onClick={() => navigate('/virtual-card')}
        >
          <span style={styles.navIcon}>▣</span>
          <span>Card</span>
          <span style={styles.activeIndicator} />
        </button>

        <button
          type="button"
          style={styles.navItem}
          onClick={() => navigate('/profile')}
        >
          <span style={styles.navIcon}>♙</span>
          <span>Profile</span>
        </button>

      </nav>

    </div>
  );
};

/* =========================================================
   STYLES
========================================================= */

const styles: Record<string, React.CSSProperties> = {

  page: {
    minHeight: '100vh',
    background: '#f6faf8',
    color: '#10251d',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 88,
  },

  header: {
    height: 68,
    background: '#ffffff',
    borderBottom: '1px solid #e5ebe8',
    display: 'flex',
    alignItems: 'center',
    padding: '0 4%',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  backButton: {
    width: 40,
    height: 40,
    border: 'none',
    borderRadius: 12,
    background: '#eef7f2',
    color: '#087c43',
    fontSize: 23,
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
    width: 'min(650px, 92%)',
    margin: '0 auto',
    paddingTop: 24,
  },

  intro: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 15,
    marginBottom: 20,
  },

  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 800,
  },

  subtitle: {
    margin: '7px 0 0',
    color: '#718079',
    fontSize: 13,
    lineHeight: 1.5,
  },

  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    background: '#e4f7ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    flexShrink: 0,
  },

  createCard: {
    background: '#ffffff',
    borderRadius: 22,
    padding: 28,
    textAlign: 'center',
    border: '1px solid #e0ebe5',
    boxShadow: '0 8px 25px rgba(26,61,47,0.05)',
  },

  createIcon: {
    width: 70,
    height: 70,
    margin: '0 auto 17px',
    borderRadius: 22,
    background: '#e4f7ed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32,
  },

  createTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 800,
  },

  createText: {
    color: '#718079',
    fontSize: 13,
    lineHeight: 1.6,
    margin: '9px auto 20px',
    maxWidth: 420,
  },

  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    textAlign: 'left',
    maxWidth: 360,
    margin: '0 auto 22px',
  },

  feature: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    fontSize: 13,
    fontWeight: 600,
  },

  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: '#dff5e9',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 800,
  },

  primaryButton: {
    width: '100%',
    height: 48,
    border: 'none',
    borderRadius: 13,
    background: '#079447',
    color: '#ffffff',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  },

  virtualCard: {
    minHeight: 220,
    borderRadius: 24,
    padding: 23,
    boxSizing: 'border-box',
    background:
      'linear-gradient(135deg, #064c31 0%, #078b4a 52%, #10a85c 100%)',
    color: '#ffffff',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 18px 35px rgba(0,100,55,0.2)',
    transition: 'opacity 0.2s ease',
  },

  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  cardBrand: {
    fontSize: 19,
    fontWeight: 800,
  },

  cardType: {
    fontSize: 8,
    letterSpacing: 2,
    marginTop: 3,
    opacity: 0.75,
  },

  cardChip: {
    width: 45,
    height: 33,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.8)',
    color: '#456',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
  },

  cardNumber: {
    fontSize: 'clamp(20px, 5vw, 27px)',
    letterSpacing: 2,
    fontWeight: 600,
    marginTop: 45,
    whiteSpace: 'nowrap',
  },

  cardBottom: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 25,
    marginTop: 22,
  },

  cardLabel: {
    fontSize: 7,
    letterSpacing: 1.3,
    opacity: 0.7,
    marginBottom: 3,
  },

  cardValue: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
  },

  cardNetwork: {
    marginLeft: 'auto',
    fontSize: 18,
    fontWeight: 900,
    fontStyle: 'italic',
  },

  frozenOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(20,30,25,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 2,
  },

  status: {
    marginTop: 12,
    borderRadius: 12,
    padding: '10px 13px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
    fontWeight: 700,
  },

  statusActive: {
    background: '#eafaf2',
    color: '#087c43',
  },

  statusFrozen: {
    background: '#fff1f0',
    color: '#b42318',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },

  actionsCard: {
    marginTop: 14,
    background: '#ffffff',
    borderRadius: 18,
    border: '1px solid #e2ebe6',
    overflow: 'hidden',
  },

  actionButton: {
    width: '100%',
    minHeight: 51,
    border: 'none',
    borderBottom: '1px solid #edf2ef',
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 16px',
    cursor: 'pointer',
    color: '#17352a',
    fontSize: 13,
    fontWeight: 650,
    textAlign: 'left',
  },

  actionIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    background: '#eaf8f1',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  infoCard: {
    marginTop: 14,
    background: '#ffffff',
    borderRadius: 18,
    border: '1px solid #e2ebe6',
    padding: 17,
  },

  infoTitle: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 800,
  },

  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 0',
    borderBottom: '1px solid #edf2ef',
    color: '#718079',
    fontSize: 12,
  },

  physicalCard: {
    marginTop: 16,
    background: '#ffffff',
    borderRadius: 18,
    border: '1px solid #e2ebe6',
    padding: 17,
    display: 'flex',
    alignItems: 'center',
    gap: 13,
  },

  physicalIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    background: '#f0f4f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    flexShrink: 0,
  },

  physicalContent: {
    minWidth: 0,
  },

  comingSoon: {
    display: 'inline-block',
    background: '#fff4d6',
    color: '#8a5a00',
    borderRadius: 6,
    padding: '4px 7px',
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  physicalTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
  },

  physicalText: {
    margin: '4px 0 0',
    color: '#718079',
    fontSize: 11.5,
    lineHeight: 1.45,
  },

  securityCard: {
    marginTop: 16,
    background: '#eef8f3',
    border: '1px solid #d5eee1',
    borderRadius: 17,
    padding: 15,
    display: 'flex',
    gap: 11,
    alignItems: 'flex-start',
  },

  securityIcon: {
    fontSize: 20,
  },

  securityTitle: {
    margin: 0,
    fontSize: 13,
    fontWeight: 800,
  },

  securityText: {
    margin: '4px 0 0',
    color: '#64746d',
    fontSize: 11,
    lineHeight: 1.5,
  },

  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    background: 'rgba(255,255,255,0.98)',
    borderTop: '1px solid #e5ebe8',
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    zIndex: 30,
    boxShadow: '0 -5px 18px rgba(25,55,43,0.05)',
  },

  navItem: {
    border: 'none',
    background: 'transparent',
    color: '#78847f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    fontSize: 10,
    fontWeight: 600,
    cursor: 'pointer',
    position: 'relative',
  },

  navActive: {
    color: '#078b4a',
  },

  navIcon: {
    fontSize: 21,
    lineHeight: 1,
  },

  activeIndicator: {
    position: 'absolute',
    bottom: 3,
    width: 40,
    height: 3,
    borderRadius: 5,
    background: '#079447',
  },
};

export default VirtualCard;
