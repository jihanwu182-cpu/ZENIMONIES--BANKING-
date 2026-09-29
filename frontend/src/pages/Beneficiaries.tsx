
import React from 'react';
import {
  Link,
  useNavigate,
} from 'react-router-dom';

import BeneficiaryTabs from '../components/BeneficiaryTabs.tsx';

// ============================================================
// ZENIMONIES BANKING
// BENEFICIARIES PAGE
// ============================================================

interface Beneficiary {
  id: string;
  name: string;
  bank_name: string;
  bank_code?: string | null;
  account_number?: string | null;
  recipient_type: 'zenimonies' | 'bank';
  recipient_phone?: string | null;
  created_at?: string;
}

const Beneficiaries: React.FC = () => {
  const navigate = useNavigate();

  // ==========================================================
  // SELECT BENEFICIARY
  // ==========================================================

  const handleBeneficiarySelect = (
    beneficiary: Beneficiary
  ) => {
    if (
      beneficiary.recipient_type ===
      'zenimonies'
    ) {
      if (!beneficiary.recipient_phone) {
        return;
      }

      navigate('/transfer', {
        state: {
          beneficiary,
          recipient_phone:
            beneficiary.recipient_phone,
        },
      });

      return;
    }

    if (
      beneficiary.recipient_type ===
      'bank'
    ) {
      navigate('/transfer', {
        state: {
          beneficiary,
        },
      });
    }
  };

  // ==========================================================
  // PAGE
  // ==========================================================

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

          {/* PAGE ICON */}

          <div style={styles.iconCircle}>
            👥
          </div>

          <h1 style={styles.title}>
            Beneficiaries
          </h1>

          <p style={styles.subtitle}>
            Manage your recent recipients
            and saved beneficiaries in one
            place. Select a recipient to
            continue with a transfer.
          </p>

          {/* BENEFICIARIES */}

          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                Your Recipients
              </h2>

              <p style={styles.sectionSubtitle}>
                Choose Recent or Saved Beneficiary.
              </p>
            </div>
          </div>

          <div style={styles.beneficiaryContainer}>
            <BeneficiaryTabs
              recipientType="zenimonies"
              onSelect={
                handleBeneficiarySelect
              }
            />
          </div>

          {/* BANK BENEFICIARIES */}

          <div style={styles.bankSection}>
            <div style={styles.bankHeader}>
              <div>
                <h2 style={styles.sectionTitle}>
                  Other Bank Beneficiaries
                </h2>

                <p style={styles.sectionSubtitle}>
                  Recipients saved for transfers
                  to other banks.
                </p>
              </div>
            </div>

            <div style={styles.beneficiaryContainer}>
              <BeneficiaryTabs
                recipientType="bank"
                onSelect={
                  handleBeneficiarySelect
                }
              />
            </div>
          </div>

          {/* SECURITY NOTE */}

          <div style={styles.securityNote}>
            <span>🔒</span>

            <span>
              Your beneficiary information is
              securely retrieved from your
              Zenimonies account.
            </span>
          </div>

          {/* TRANSFER BUTTON */}

          <button
            type="button"
            onClick={() =>
              navigate('/transfer')
            }
            style={styles.transferButton}
          >
            Make a Transfer
            <span>›</span>
          </button>

        </section>
      </main>
    </div>
  );
};

// ============================================================
// STYLES
// ============================================================

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
    minHeight: 68,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 5%',
    borderBottom: '1px solid #e3ebe7',
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
    fontSize: 27,
    marginBottom: 16,
  },

  title: {
    margin: 0,
    color: '#10251d',
    fontSize: 28,
    fontWeight: 850,
  },

  subtitle: {
    margin: '9px 0 28px',
    color: '#748079',
    fontSize: 14,
    lineHeight: 1.65,
  },

  sectionHeader: {
    marginBottom: 14,
  },

  sectionTitle: {
    margin: 0,
    color: '#17362a',
    fontSize: 17,
    fontWeight: 850,
  },

  sectionSubtitle: {
    margin: '5px 0 0',
    color: '#7a8a84',
    fontSize: 12,
    lineHeight: 1.5,
  },

  beneficiaryContainer: {
    width: '100%',
    marginTop: 12,
  },

  bankSection: {
    marginTop: 28,
    paddingTop: 24,
    borderTop: '1px solid #e3ebe7',
  },

  bankHeader: {
    marginBottom: 14,
  },

  securityNote: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
    marginTop: 25,
    padding: 14,
    background: '#f4faf6',
    border: '1px solid #e1eee6',
    borderRadius: 14,
    color: '#718078',
    fontSize: 11,
    lineHeight: 1.6,
  },

  transferButton: {
    width: '100%',
    marginTop: 20,
    border: 'none',
    borderRadius: 13,
    padding: '15px 16px',
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
};

export default Beneficiaries;
