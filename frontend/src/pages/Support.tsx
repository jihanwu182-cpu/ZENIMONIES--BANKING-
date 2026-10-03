import React, { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type SupportType =
  | 'general'
  | 'transaction'
  | 'security'
  | 'account-access';

const supportConfig: Record<
  SupportType,
  {
    title: string;
    description: string;
    icon: string;
    subject: string;
    placeholder: string;
  }
> = {
  general: {
    title: 'Contact Support',
    description:
      'Tell us what you need help with and provide as much detail as possible.',
    icon: '💬',
    subject: 'General Support',
    placeholder:
      'Describe what you need help with...',
  },

  transaction: {
    title: 'Report a Transaction',
    description:
      'Use this form to report a problem with a transfer, payment or transaction.',
    icon: '🧾',
    subject: 'Transaction Problem',
    placeholder:
      'Tell us what happened. Include the transaction reference if you have it...',
  },

  security: {
    title: 'Suspicious Activity',
    description:
      'Report activity that you do not recognize or believe may be unauthorized.',
    icon: '🔐',
    subject: 'Suspicious Activity',
    placeholder:
      'Describe the suspicious activity and any transaction reference you recognize...',
  },

  'account-access': {
    title: 'Account Access',
    description:
      'Get help if you cannot access your ZENIMONIES account.',
    icon: '🔑',
    subject: 'Account Access Problem',
    placeholder:
      'Describe the problem you are experiencing when trying to access your account...',
  },
};

const Support: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const incomingType =
    (location.state as { supportType?: SupportType } | null)
      ?.supportType || 'general';

  const initialType: SupportType =
    supportConfig[incomingType]
      ? incomingType
      : 'general';

  const [supportType, setSupportType] =
    useState<SupportType>(initialType);

  const [subject, setSubject] = useState(
    supportConfig[initialType].subject
  );

  const [message, setMessage] = useState('');

  const [reference, setReference] =
    useState('');

  const [submitted, setSubmitted] =
    useState(false);

  const config = supportConfig[supportType];

  const handleTypeChange = (
    type: SupportType
  ) => {
    setSupportType(type);
    setSubject(supportConfig[type].subject);
    setSubmitted(false);
  };

  const handleSubmit = (
    event: FormEvent
  ) => {
    event.preventDefault();

    /*
     * The database-backed support ticket system will be
     * connected after the planned database upgrade.
     *
     * For today, we only validate the frontend form.
     */
    if (!message.trim()) {
      return;
    }

    setSubmitted(true);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* HEADER */}

        <header style={styles.header}>
          <button
            type="button"
            onClick={() => navigate('/help-center')}
            style={styles.backButton}
            aria-label="Back to Help Center"
          >
            ←
          </button>

          <div>
            <div style={styles.eyebrow}>
              ZENIMONIES
            </div>

            <h1 style={styles.title}>
              Support
            </h1>

            <p style={styles.subtitle}>
              We're here to help with your account and
              transactions.
            </p>
          </div>
        </header>

        {/* SUPPORT TYPE */}

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            What do you need help with?
          </h2>

          <div style={styles.typeGrid}>
            {(
              Object.keys(
                supportConfig
              ) as SupportType[]
            ).map((type) => {
              const item =
                supportConfig[type];

              const active =
                supportType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    handleTypeChange(type)
                  }
                  style={{
                    ...styles.typeButton,
                    ...(active
                      ? styles.typeButtonActive
                      : {}),
                  }}
                >
                  <span
                    style={{
                      ...styles.typeIcon,
                      ...(active
                        ? styles.typeIconActive
                        : {}),
                    }}
                  >
                    {item.icon}
                  </span>

                  <span
                    style={{
                      ...styles.typeText,
                      ...(active
                        ? styles.typeTextActive
                        : {}),
                    }}
                  >
                    {item.title}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* FORM */}

        {!submitted ? (
          <form
            onSubmit={handleSubmit}
            style={styles.card}
          >
            <div style={styles.formIntro}>
              <div style={styles.formIcon}>
                {config.icon}
              </div>

              <div>
                <h2 style={styles.formTitle}>
                  {config.title}
                </h2>

                <p style={styles.formDescription}>
                  {config.description}
                </p>
              </div>
            </div>

            <label style={styles.label}>
              Subject
            </label>

            <input
              type="text"
              value={subject}
              onChange={(event) =>
                setSubject(event.target.value)
              }
              style={styles.input}
              required
            />

            <label style={styles.label}>
              Transaction reference
              <span style={styles.optional}>
                Optional
              </span>
            </label>

            <input
              type="text"
              value={reference}
              onChange={(event) =>
                setReference(event.target.value)
              }
              placeholder="e.g. ZTRX-XXXXXXXX"
              style={styles.input}
            />

            <label style={styles.label}>
              Message
            </label>

            <textarea
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              placeholder={config.placeholder}
              style={styles.textarea}
              rows={6}
              required
            />

            <div style={styles.securityNotice}>
              <span style={styles.noticeIcon}>
                🔒
              </span>

              <span>
                Never include your password, transaction
                PIN, OTP or passkey in a support message.
              </span>
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitButton,
                opacity: message.trim()
                  ? 1
                  : 0.55,
              }}
              disabled={!message.trim()}
            >
              Send Support Request
            </button>

            <p style={styles.comingSoonText}>
              Support ticket submission will be connected
              to the ZENIMONIES support system after the
              database upgrade.
            </p>
          </form>
        ) : (
          <section style={styles.successCard}>
            <div style={styles.successIcon}>
              ✓
            </div>

            <h2 style={styles.successTitle}>
              Request Prepared
            </h2>

            <p style={styles.successText}>
              Your support information has been captured
              on this page.
            </p>

            <div style={styles.pendingNotice}>
              <strong>
                Ticket system coming next
              </strong>

              <span>
                The actual support ticket submission,
                reference number and Admin Dashboard
                workflow will be connected during the
                planned database upgrade.
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/help-center')
              }
              style={styles.primaryButton}
            >
              Back to Help Center
            </button>
          </section>
        )}

        {/* SECURITY */}

        <section style={styles.securityCard}>
          <div style={styles.securityIcon}>
            🔐
          </div>

          <div>
            <h3 style={styles.securityTitle}>
              Keep your account safe
            </h3>

            <p style={styles.securityText}>
              ZENIMONIES will never require you to
              disclose your password, transaction PIN,
              OTP or passkey through a support request.
            </p>
          </div>
        </section>

        <div style={styles.footer}>
          <strong>ZENIMONIES</strong>
          <span>Secure banking made simple.</span>
        </div>
      </div>
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
    color: '#14251d',
    padding: '20px 16px 50px',
  },

  container: {
    width: '100%',
    maxWidth: 760,
    margin: '0 auto',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    border: '1px solid #dcebe3',
    background: '#ffffff',
    color: '#176b45',
    fontSize: 25,
    cursor: 'pointer',
    flexShrink: 0,
  },

  eyebrow: {
    color: '#15935c',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 1.5,
    marginBottom: 4,
  },

  title: {
    margin: 0,
    fontSize: 'clamp(28px, 6vw, 38px)',
    fontWeight: 900,
    letterSpacing: -0.8,
  },

  subtitle: {
    margin: '7px 0 0',
    color: '#6d7d75',
    fontSize: 14,
    lineHeight: 1.5,
  },

  card: {
    background: '#ffffff',
    border: '1px solid #dfece5',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    boxShadow:
      '0 5px 18px rgba(26,93,61,0.04)',
  },

  sectionTitle: {
    margin: '0 0 13px',
    fontSize: 17,
    fontWeight: 850,
  },

  typeGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(2, minmax(0, 1fr))',
    gap: 9,
  },

  typeButton: {
    border: '1px solid #dfebe5',
    background: '#fbfdfc',
    borderRadius: 13,
    padding: 11,
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    cursor: 'pointer',
    textAlign: 'left',
  },

  typeButtonActive: {
    borderColor: '#15935c',
    background: '#edf8f2',
  },

  typeIcon: {
    width: 35,
    height: 35,
    borderRadius: 10,
    background: '#edf5f1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 17,
    flexShrink: 0,
  },

  typeIconActive: {
    background: '#d7f1e3',
  },

  typeText: {
    color: '#34463e',
    fontSize: 12,
    fontWeight: 750,
    lineHeight: 1.3,
  },

  typeTextActive: {
    color: '#087c48',
  },

  formIntro: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 19,
  },

  formIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    background: '#edf8f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    flexShrink: 0,
  },

  formTitle: {
    margin: 0,
    fontSize: 18,
    fontWeight: 850,
  },

  formDescription: {
    margin: '4px 0 0',
    color: '#718079',
    fontSize: 13,
    lineHeight: 1.45,
  },

  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    marginBottom: 7,
    color: '#263b32',
    fontSize: 13,
    fontWeight: 800,
  },

  optional: {
    color: '#8a9892',
    fontSize: 11,
    fontWeight: 600,
  },

  input: {
    width: '100%',
    height: 46,
    border: '1px solid #d9e8e0',
    borderRadius: 11,
    outline: 'none',
    padding: '0 13px',
    fontSize: 14,
    color: '#172c22',
    background: '#fbfdfc',
    marginBottom: 15,
    boxSizing: 'border-box',
  },

  textarea: {
    width: '100%',
    border: '1px solid #d9e8e0',
    borderRadius: 11,
    outline: 'none',
    padding: '12px 13px',
    fontSize: 14,
    lineHeight: 1.5,
    color: '#172c22',
    background: '#fbfdfc',
    resize: 'vertical',
    minHeight: 130,
    boxSizing: 'border-box',
    marginBottom: 13,
    fontFamily: 'inherit',
  },

  securityNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 11,
    background: '#f8faf9',
    border: '1px solid #e4ece8',
    color: '#68766f',
    fontSize: 11,
    lineHeight: 1.45,
    marginBottom: 15,
  },

  noticeIcon: {
    flexShrink: 0,
  },

  submitButton: {
    width: '100%',
    border: 'none',
    borderRadius: 12,
    background: '#15935c',
    color: '#ffffff',
    padding: '13px 16px',
    fontSize: 14,
    fontWeight: 850,
    cursor: 'pointer',
  },

  comingSoonText: {
    margin: '10px 0 0',
    color: '#89968f',
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 1.4,
  },

  successCard: {
    background: '#ffffff',
    border: '1px solid #dfece5',
    borderRadius: 18,
    padding: '34px 20px',
    textAlign: 'center',
    marginBottom: 14,
  },

  successIcon: {
    width: 58,
    height: 58,
    borderRadius: '50%',
    background: '#e5f7ed',
    color: '#15935c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 15px',
    fontSize: 30,
    fontWeight: 900,
  },

  successTitle: {
    margin: 0,
    fontSize: 22,
    fontWeight: 900,
  },

  successText: {
    margin: '8px 0 17px',
    color: '#718079',
    fontSize: 14,
  },

  pendingNotice: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    textAlign: 'left',
    padding: 13,
    borderRadius: 12,
    background: '#f5faf7',
    border: '1px solid #dcebe3',
    color: '#66756e',
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 17,
  },

  primaryButton: {
    border: 'none',
    borderRadius: 11,
    background: '#15935c',
    color: '#ffffff',
    padding: '12px 18px',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
  },

  securityCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 11,
    background: '#ffffff',
    border: '1px solid #dfece5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },

  securityIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    background: '#edf8f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 19,
    flexShrink: 0,
  },

  securityTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 850,
  },

  securityText: {
    margin: '4px 0 0',
    color: '#718079',
    fontSize: 11,
    lineHeight: 1.5,
  },

  footer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    color: '#15935c',
    fontSize: 12,
  },
};

export default Support;
