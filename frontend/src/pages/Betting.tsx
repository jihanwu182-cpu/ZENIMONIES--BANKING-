import React, { useState } from 'react';
import { Link } from 'react-router-dom';

type BettingProvider = {
  name: string;
  icon: string;
  description: string;
};

const bettingProviders: BettingProvider[] = [
  {
    name: 'SportyBet',
    icon: '⚽',
    description: 'Fund your SportyBet account',
  },
  {
    name: 'Bet9ja',
    icon: '🟢',
    description: 'Fund your Bet9ja account',
  },
  {
    name: 'Betway',
    icon: '🔵',
    description: 'Fund your Betway account',
  },
  {
    name: '1xBet',
    icon: '🟠',
    description: 'Fund your 1xBet account',
  },
  {
    name: 'BetKing',
    icon: '🔴',
    description: 'Fund your BetKing account',
  },
];

const Betting: React.FC = () => {
  const [selectedProvider, setSelectedProvider] =
    useState<BettingProvider | null>(null);

  const [accountIdentifier, setAccountIdentifier] =
    useState('');

  const [amount, setAmount] = useState('');

  const [error, setError] = useState('');

  const [step, setStep] = useState<
    'providers' | 'details' | 'review'
  >('providers');

  const quickAmounts = [
    '1000',
    '2000',
    '5000',
    '10000',
  ];

  const selectProvider = (
    provider: BettingProvider
  ) => {
    setSelectedProvider(provider);
    setAccountIdentifier('');
    setAmount('');
    setError('');
    setStep('details');
  };

  const handleContinue = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError('');

    if (!accountIdentifier.trim()) {
      setError(
        'Please enter your betting account ID, username or phone number.'
      );
      return;
    }

    const numericAmount = Number(amount);

    if (!amount || numericAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setStep('review');
  };

  const goBack = () => {
    setError('');

    if (step === 'review') {
      setStep('details');
      return;
    }

    if (step === 'details') {
      setStep('providers');
      setSelectedProvider(null);
      return;
    }
  };

  const resetFlow = () => {
    setSelectedProvider(null);
    setAccountIdentifier('');
    setAmount('');
    setError('');
    setStep('providers');
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <Link to="/" style={styles.brandLink}>
          <div style={styles.logo}>Z</div>

          <div>
            <div style={styles.brandName}>
              Zenimonies
            </div>

            <div style={styles.brandSubtitle}>
              DIGITAL BANKING
            </div>
          </div>
        </Link>

        <Link to="/" style={styles.homeLink}>
          Home
        </Link>
      </header>

      <main style={styles.main}>
        <Link to="/" style={styles.backLink}>
          ← Back to Dashboard
        </Link>

        {/* TITLE */}
        <section style={styles.intro}>
          <div style={styles.mainIcon}>⚽</div>

          <div>
            <div style={styles.eyebrow}>
              BETTING SERVICES
            </div>

            <h1 style={styles.title}>
              Fund Betting Account
            </h1>

            <p style={styles.description}>
              Choose your betting app and enter your
              account details to continue.
            </p>
          </div>
        </section>

        {/* STEP 1 */}
        {step === 'providers' && (
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>
              Choose Betting App
            </h2>

            <p style={styles.cardDescription}>
              Select the betting platform you want to
              fund.
            </p>

            <div style={styles.providerList}>
              {bettingProviders.map((provider) => (
                <button
                  key={provider.name}
                  type="button"
                  onClick={() =>
                    selectProvider(provider)
                  }
                  style={styles.providerButton}
                >
                  <div style={styles.providerIcon}>
                    {provider.icon}
                  </div>

                  <div style={styles.providerText}>
                    <strong
                      style={styles.providerName}
                    >
                      {provider.name}
                    </strong>

                    <span
                      style={styles.providerDescription}
                    >
                      {provider.description}
                    </span>
                  </div>

                  <span style={styles.arrow}>
                    ›
                  </span>
                </button>
              ))}
            </div>

            <div style={styles.notice}>
              <span style={styles.noticeIcon}>
                ✓
              </span>

              <div>
                <strong>
                  Secure payments
                </strong>

                <p style={styles.noticeText}>
                  Your betting account details will
                  only be used to process the requested
                  funding transaction.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* STEP 2 */}
        {step === 'details' &&
          selectedProvider && (
            <section style={styles.card}>
              <button
                type="button"
                onClick={goBack}
                style={styles.stepBack}
              >
                ← Choose another betting app
              </button>

              <div style={styles.selectedProvider}>
                <div style={styles.providerIconLarge}>
                  {selectedProvider.icon}
                </div>

                <div>
                  <div style={styles.selectedLabel}>
                    Selected betting app
                  </div>

                  <strong
                    style={styles.selectedName}
                  >
                    {selectedProvider.name}
                  </strong>
                </div>
              </div>

              <h2 style={styles.cardTitle}>
                Account Details
              </h2>

              <p style={styles.cardDescription}>
                Enter the account information used by
                your {selectedProvider.name} account.
              </p>

              <form onSubmit={handleContinue}>
                <label
                  htmlFor="accountIdentifier"
                  style={styles.label}
                >
                  Betting Account ID / Username /
                  Phone
                </label>

                <input
                  id="accountIdentifier"
                  type="text"
                  value={accountIdentifier}
                  onChange={(event) =>
                    setAccountIdentifier(
                      event.target.value
                    )
                  }
                  placeholder="Enter your betting account details"
                  style={styles.input}
                  autoComplete="off"
                />

                <label
                  htmlFor="amount"
                  style={styles.label}
                >
                  Amount
                </label>

                <div style={styles.amountBox}>
                  <span style={styles.currency}>
                    ₦
                  </span>

                  <input
                    id="amount"
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(event) =>
                      setAmount(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    style={styles.amountInput}
                  />
                </div>

                <div style={styles.quickAmounts}>
                  {quickAmounts.map(
                    (quickAmount) => (
                      <button
                        key={quickAmount}
                        type="button"
                        onClick={() =>
                          setAmount(
                            quickAmount
                          )
                        }
                        style={
                          styles.quickAmountButton
                        }
                      >
                        ₦
                        {Number(
                          quickAmount
                        ).toLocaleString()}
                      </button>
                    )
                  )}
                </div>

                {error && (
                  <div
                    role="alert"
                    style={styles.error}
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  style={styles.primaryButton}
                >
                  Review Funding
                </button>
              </form>
            </section>
          )}

        {/* STEP 3 */}
        {step === 'review' &&
          selectedProvider && (
            <section style={styles.card}>
              <button
                type="button"
                onClick={goBack}
                style={styles.stepBack}
              >
                ← Edit details
              </button>

              <div style={styles.reviewIcon}>
                ✓
              </div>

              <h2 style={styles.reviewTitle}>
                Review Funding
              </h2>

              <p style={styles.reviewDescription}>
                Please check the details before
                continuing.
              </p>

              <div style={styles.reviewBox}>
                <div style={styles.reviewRow}>
                  <span>Betting App</span>

                  <strong>
                    {selectedProvider.name}
                  </strong>
                </div>

                <div style={styles.reviewRow}>
                  <span>Account</span>

                  <strong
                    style={styles.accountValue}
                  >
                    {accountIdentifier}
                  </strong>
                </div>

                <div style={styles.reviewRow}>
                  <span>Amount</span>

                  <strong style={styles.amountValue}>
                    ₦
                    {Number(
                      amount
                    ).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div style={styles.pendingNotice}>
                <strong>
                  Ready for confirmation
                </strong>

                <p>
                  The final transaction will only be
                  marked successful after Zenimonies
                  receives confirmation from the
                  payment service.
                </p>
              </div>

              <button
                type="button"
                style={styles.primaryButton}
                onClick={() => {
                  alert(
                    'Betting funding is ready to be connected to the backend payment service.'
                  );
                }}
              >
                Confirm Funding
              </button>

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={resetFlow}
              >
                Cancel
              </button>
            </section>
          )}

        {/* INFORMATION */}
        <section style={styles.infoCard}>
          <div style={styles.infoIcon}>
            i
          </div>

          <div>
            <strong style={styles.infoTitle}>
              Important
            </strong>

            <p style={styles.infoText}>
              Make sure the betting account details
              belong to you and are correct before
              confirming a funding request.
            </p>
          </div>
        </section>
      </main>

      {/* BOTTOM NAV */}
      <nav style={styles.bottomNav}>
        <Link to="/" style={styles.navItem}>
          <span style={styles.navIcon}>⌂</span>
          Home
        </Link>

        <Link
          to="/transactions"
          style={styles.navItem}
        >
          <span style={styles.navIcon}>↕</span>
          Transactions
        </Link>

        <Link
          to="/wallet"
          style={styles.navItem}
        >
          <span style={styles.navIcon}>▱</span>
          Wallet
        </Link>

        <Link
          to="/profile"
          style={styles.navItem}
        >
          <span style={styles.navIcon}>♙</span>
          Profile
        </Link>
      </nav>
    </div>
  );
};

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
    paddingBottom: 90,
  },

  header: {
    height: 68,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4%',
    borderBottom: '1px solid #edf2ef',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  brandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    textDecoration: 'none',
  },

  logo: {
    width: 43,
    height: 43,
    borderRadius: 12,
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 800,
  },

  brandName: {
    fontSize: 19,
    fontWeight: 800,
    color: '#10251d',
  },

  brandSubtitle: {
    fontSize: 8,
    letterSpacing: 1.7,
    color: '#9aa7a1',
    marginTop: 3,
  },

  homeLink: {
    color: '#087c43',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700,
  },

  main: {
    width: 'min(700px, 92%)',
    margin: '0 auto',
    paddingTop: 25,
  },

  backLink: {
    display: 'inline-block',
    marginBottom: 20,
    color: '#66756e',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
  },

  intro: {
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    marginBottom: 17,
  },

  mainIcon: {
    width: 62,
    height: 62,
    flexShrink: 0,
    borderRadius: 18,
    background: '#e8f8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 29,
  },

  eyebrow: {
    color: '#087c43',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1.4,
    marginBottom: 4,
  },

  title: {
    margin: 0,
    color: '#063b2d',
    fontSize: 27,
    fontWeight: 800,
  },

  description: {
    margin: '6px 0 0',
    color: '#66756e',
    fontSize: 13,
    lineHeight: 1.5,
  },

  card: {
    background: '#ffffff',
    border: '1px solid #e5ebe8',
    borderRadius: 20,
    padding: 21,
    boxShadow:
      '0 7px 23px rgba(26,61,47,0.05)',
  },

  cardTitle: {
    margin: 0,
    color: '#172b22',
    fontSize: 19,
    fontWeight: 800,
  },

  cardDescription: {
    margin: '5px 0 17px',
    color: '#75827d',
    fontSize: 12.5,
    lineHeight: 1.5,
  },

  providerList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 9,
  },

  providerButton: {
    width: '100%',
    border: '1px solid #dcebe4',
    background: '#f8fcfa',
    borderRadius: 15,
    padding: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 11,
    textAlign: 'left',
    cursor: 'pointer',
  },

  providerIcon: {
    width: 45,
    height: 45,
    flexShrink: 0,
    borderRadius: 13,
    background: '#e1f6eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 21,
  },

  providerText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },

  providerName: {
    color: '#172b22',
    fontSize: 14,
  },

  providerDescription: {
    marginTop: 3,
    color: '#75827d',
    fontSize: 11.5,
  },

  arrow: {
    marginLeft: 'auto',
    color: '#078b4a',
    fontSize: 24,
  },

  notice: {
    marginTop: 16,
    padding: 13,
    borderRadius: 13,
    background: '#effbf5',
    border: '1px solid #d2eee0',
    display: 'flex',
    gap: 10,
  },

  noticeIcon: {
    width: 27,
    height: 27,
    flexShrink: 0,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 12,
  },

  noticeText: {
    margin: '3px 0 0',
    color: '#66756e',
    fontSize: 11.5,
    lineHeight: 1.45,
  },

  stepBack: {
    border: 'none',
    background: 'transparent',
    color: '#087c43',
    padding: 0,
    marginBottom: 17,
    cursor: 'pointer',
    fontSize: 12.5,
    fontWeight: 700,
  },

  selectedProvider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    marginBottom: 20,
    borderRadius: 14,
    background: '#f5fbf8',
    border: '1px solid #dcebe4',
  },

  providerIconLarge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: '#e1f6eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
  },

  selectedLabel: {
    color: '#75827d',
    fontSize: 10.5,
    marginBottom: 3,
  },

  selectedName: {
    color: '#063b2d',
    fontSize: 15,
  },

  label: {
    display: 'block',
    marginBottom: 7,
    marginTop: 14,
    color: '#344054',
    fontSize: 13,
    fontWeight: 700,
  },

  input: {
    width: '100%',
    height: 49,
    boxSizing: 'border-box',
    border: '1px solid #d8e5df',
    borderRadius: 12,
    padding: '0 13px',
    fontSize: 14,
    outline: 'none',
  },

  amountBox: {
    height: 49,
    border: '1px solid #d8e5df',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    padding: '0 13px',
    boxSizing: 'border-box',
  },

  currency: {
    color: '#087c43',
    fontWeight: 800,
    fontSize: 17,
    marginRight: 7,
  },

  amountInput: {
    width: '100%',
    height: '100%',
    border: 'none',
    outline: 'none',
    fontSize: 15,
  },

  quickAmounts: {
    display: 'flex',
    gap: 7,
    flexWrap: 'wrap',
    marginTop: 9,
  },

  quickAmountButton: {
    border: '1px solid #cfe6db',
    background: '#f5fbf8',
    color: '#087c43',
    borderRadius: 10,
    padding: '8px 11px',
    cursor: 'pointer',
    fontSize: 11.5,
    fontWeight: 700,
  },

  error: {
    marginTop: 13,
    padding: 11,
    borderRadius: 10,
    background: '#fee4e2',
    color: '#b42318',
    fontSize: 12,
  },

  primaryButton: {
    width: '100%',
    height: 48,
    marginTop: 16,
    border: 'none',
    borderRadius: 12,
    background: '#079447',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },

  secondaryButton: {
    width: '100%',
    height: 46,
    marginTop: 9,
    border: '1px solid #d0d9d5',
    borderRadius: 12,
    background: '#ffffff',
    color: '#344054',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  reviewIcon: {
    width: 58,
    height: 58,
    margin: '0 auto 12px',
    borderRadius: 17,
    background: '#e5f7ee',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 800,
  },

  reviewTitle: {
    margin: 0,
    textAlign: 'center',
    fontSize: 21,
  },

  reviewDescription: {
    margin: '7px 0 18px',
    textAlign: 'center',
    color: '#75827d',
    fontSize: 12.5,
  },

  reviewBox: {
    border: '1px solid #dcebe4',
    borderRadius: 14,
    overflow: 'hidden',
  },

  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '13px',
    borderBottom: '1px solid #edf2ef',
    fontSize: 12.5,
  },

  accountValue: {
    maxWidth: '55%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  amountValue: {
    color: '#087c43',
    fontSize: 15,
  },

  pendingNotice: {
    marginTop: 14,
    padding: 13,
    borderRadius: 12,
    background: '#fff8e8',
    border: '1px solid #f2dfad',
    color: '#7a5a00',
    fontSize: 12,
    lineHeight: 1.45,
  },

  infoCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 16,
    background: '#ffffff',
    border: '1px solid #e5ebe8',
    display: 'flex',
    gap: 10,
  },

  infoIcon: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: 10,
    background: '#e8f8f0',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  infoTitle: {
    fontSize: 12.5,
  },

  infoText: {
    margin: '4px 0 0',
    color: '#75827d',
    fontSize: 11.5,
    lineHeight: 1.45,
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
    boxShadow:
      '0 -5px 18px rgba(25,55,43,0.05)',
  },

  navItem: {
    textDecoration: 'none',
    color: '#78847f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    fontSize: 10,
    fontWeight: 600,
  },

  navIcon: {
    fontSize: 21,
    lineHeight: 1,
  },
};

export default Betting;
