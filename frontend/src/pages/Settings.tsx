import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type SettingItemProps = {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
  danger?: boolean;
};

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  description,
  onClick,
  danger = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        border: 'none',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '15px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        borderBottom: '1px solid #edf2ef',
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          flexShrink: 0,
          borderRadius: 12,
          background: danger ? '#fff1f1' : '#e9f8f1',
          color: danger ? '#d92d20' : '#078b4a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 19,
          fontWeight: 700,
        }}
      >
        {icon}
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
        }}
      >
        <div
          style={{
            color: danger ? '#d92d20' : '#14251e',
            fontSize: 14,
            fontWeight: 750,
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: '#7b8982',
            fontSize: 12,
            marginTop: 3,
            lineHeight: 1.4,
          }}
        >
          {description}
        </div>
      </div>

      <span
        style={{
          color: '#98a49f',
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        ›
      </span>
    </button>
  );
};

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showCloseConfirmation, setShowCloseConfirmation] =
    useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);

  const openSection = (section: string) => {
    setActiveSection(section);
  };

  const closeSection = () => {
    setActiveSection(null);
  };

  const logout = () => {
    localStorage.removeItem('zenimonies_token');
    localStorage.removeItem('token');
    localStorage.removeItem('zenimonies_user');
    localStorage.removeItem('zenimonies_accounts');

    sessionStorage.removeItem('zenimonies_otp_email');
    sessionStorage.removeItem('zenimonies_otp_token');

    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6faf8',
        color: '#14251e',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        paddingBottom: 35,
      }}
    >
      {/* ================= HEADER ================= */}

      <header
        style={{
          height: 68,
          background: '#ffffff',
          borderBottom: '1px solid #e8efeb',
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 'min(760px, 92%)',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              width: 38,
              height: 38,
              border: 'none',
              borderRadius: 11,
              background: '#edf8f2',
              color: '#078b4a',
              cursor: 'pointer',
              fontSize: 22,
              fontWeight: 700,
            }}
            aria-label="Back to dashboard"
          >
            ‹
          </button>

          <div>
            <div
              style={{
                fontSize: 19,
                fontWeight: 800,
              }}
            >
              Settings
            </div>

            <div
              style={{
                color: '#8a9690',
                fontSize: 11,
                marginTop: 1,
              }}
            >
              Manage your Zenimonies account
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN ================= */}

      <main
        style={{
          width: 'min(760px, 92%)',
          margin: '0 auto',
          paddingTop: 24,
        }}
      >
        {/* ================= SETTINGS INTRO ================= */}

        <section
          style={{
            background:
              'linear-gradient(135deg, #006d3b 0%, #079447 100%)',
            color: '#ffffff',
            borderRadius: 20,
            padding: '22px 20px',
            marginBottom: 18,
            boxShadow:
              '0 12px 30px rgba(0, 110, 59, 0.15)',
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.78,
              marginBottom: 5,
            }}
          >
            ZENIMONIES
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: 25,
              fontWeight: 800,
            }}
          >
            Account Settings
          </h1>

          <p
            style={{
              margin: '7px 0 0',
              fontSize: 13,
              lineHeight: 1.5,
              opacity: 0.82,
            }}
          >
            Manage your profile, payments, login security,
            savings and account preferences.
          </p>
        </section>

        {/* ================= ACCOUNT ================= */}

        <div
          style={{
            color: '#6f7d76',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            margin: '20px 5px 8px',
          }}
        >
          ACCOUNT
        </div>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 17,
            overflow: 'hidden',
            border: '1px solid #e7eee9',
            boxShadow: '0 5px 18px rgba(26, 61, 47, 0.04)',
          }}
        >
          <SettingItem
            icon="♙"
            title="My Profile"
            description="Manage your personal and contact information."
            onClick={() => navigate('/profile')}
          />
        </section>

        {/* ================= PAYMENTS ================= */}

        <div
          style={{
            color: '#6f7d76',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            margin: '20px 5px 8px',
          }}
        >
          PAYMENTS
        </div>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 17,
            overflow: 'hidden',
            border: '1px solid #e7eee9',
            boxShadow: '0 5px 18px rgba(26, 61, 47, 0.04)',
          }}
        >
          <SettingItem
            icon="₦"
            title="Payment Settings"
            description="Manage your 6-digit Transfer PIN and payment security."
            onClick={() => openSection('Payment Settings')}
          />
        </section>

        {/* ================= LOGIN & SECURITY ================= */}

        <div
          style={{
            color: '#6f7d76',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            margin: '20px 5px 8px',
          }}
        >
          LOGIN & SECURITY
        </div>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 17,
            overflow: 'hidden',
            border: '1px solid #e7eee9',
            boxShadow: '0 5px 18px rgba(26, 61, 47, 0.04)',
          }}
        >
          <SettingItem
            icon="🔐"
            title="Login Settings"
            description="Change your password and 6-digit Login Code."
            onClick={() => openSection('Login Settings')}
          />

          <SettingItem
            icon="?"
            title="Security Question"
            description="Set or change your account security question."
            onClick={() => openSection('Security Question')}
          />

          <SettingItem
            icon="🛡"
            title="Security Center"
            description="Review your account security and protection."
            onClick={() => openSection('Security Center')}
          />
        </section>

        {/* ================= SAVINGS ================= */}

        <div
          style={{
            color: '#6f7d76',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            margin: '20px 5px 8px',
          }}
        >
          SAVINGS
        </div>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 17,
            overflow: 'hidden',
            border: '1px solid #e7eee9',
            boxShadow: '0 5px 18px rgba(26, 61, 47, 0.04)',
          }}
        >
          <SettingItem
            icon="▣"
            title="Saving Settings"
            description="Set the amount and frequency for your SafeBox."
            onClick={() => openSection('Saving Settings')}
          />
        </section>

        {/* ================= ALERTS & APPEARANCE ================= */}

        <div
          style={{
            color: '#6f7d76',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            margin: '20px 5px 8px',
          }}
        >
          PREFERENCES
        </div>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 17,
            overflow: 'hidden',
            border: '1px solid #e7eee9',
            boxShadow: '0 5px 18px rgba(26, 61, 47, 0.04)',
          }}
        >
          <SettingItem
            icon="SMS"
            title="SMS Alert Settings"
            description="Control transaction and security SMS alerts."
            onClick={() => openSection('SMS Alert Settings')}
          />

          <SettingItem
            icon="☼"
            title="Themes"
            description="Choose your preferred app appearance."
            onClick={() => openSection('Themes')}
          />
        </section>

        {/* ================= SUPPORT ================= */}

        <div
          style={{
            color: '#6f7d76',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            margin: '20px 5px 8px',
          }}
        >
          SUPPORT
        </div>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 17,
            overflow: 'hidden',
            border: '1px solid #e7eee9',
            boxShadow: '0 5px 18px rgba(26, 61, 47, 0.04)',
          }}
        >
          <SettingItem
            icon="✉"
            title="Feedback and Suggestions"
            description="Tell us how we can improve Zenimonies."
            onClick={() =>
              openSection('Feedback and Suggestions')
            }
          />

          <SettingItem
            icon="ⓘ"
            title="About"
            description="Learn more about Zenimonies and this app."
            onClick={() => openSection('About')}
          />
        </section>

        {/* ================= ACCOUNT ACTIONS ================= */}

        <div
          style={{
            color: '#6f7d76',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1,
            margin: '20px 5px 8px',
          }}
        >
          ACCOUNT ACTIONS
        </div>

        <section
          style={{
            background: '#ffffff',
            borderRadius: 17,
            overflow: 'hidden',
            border: '1px solid #e7eee9',
            boxShadow: '0 5px 18px rgba(26, 61, 47, 0.04)',
          }}
        >
          <SettingItem
            icon="↪"
            title="Log Out"
            description="Sign out of your Zenimonies account."
            onClick={logout}
          />

          <SettingItem
            icon="×"
            title="Close Account"
            description="Permanently close your Zenimonies account."
            danger
            onClick={() => setShowCloseConfirmation(true)}
          />
        </section>

        <div
          style={{
            textAlign: 'center',
            color: '#9aa59f',
            fontSize: 11,
            margin: '25px 0',
          }}
        >
          Zenimonies • Secure Digital Banking
        </div>
      </main>

      {/* =====================================================
          SECTION MODAL
      ===================================================== */}

      {activeSection && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 30, 22, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: 'min(440px, 100%)',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: 22,
              padding: 23,
              boxShadow:
                '0 25px 70px rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 15,
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 21,
                }}
              >
                {activeSection}
              </h2>

              <button
                type="button"
                onClick={closeSection}
                style={{
                  width: 34,
                  height: 34,
                  border: 'none',
                  borderRadius: '50%',
                  background: '#f1f5f3',
                  cursor: 'pointer',
                  fontSize: 20,
                }}
              >
                ×
              </button>
            </div>

            {/* ================= PAYMENT SETTINGS ================= */}

            {activeSection === 'Payment Settings' && (
              <div style={{ marginTop: 20 }}>
                <div style={styles.infoBox}>
                  <strong>Transfer PIN</strong>
                  <p style={styles.infoText}>
                    Your 6-digit Transfer PIN will be used to
                    authorize transfers and payments.
                  </p>
                </div>

                <label style={styles.label}>
                  Current Transfer PIN
                </label>

                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter current PIN"
                  style={styles.input}
                />

                <label style={styles.label}>
                  New Transfer PIN
                </label>

                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit PIN"
                  style={styles.input}
                />

                <label style={styles.label}>
                  Confirm Transfer PIN
                </label>

                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Confirm 6-digit PIN"
                  style={styles.input}
                />

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() =>
                    alert(
                      'Transfer PIN will be securely connected to the backend next.'
                    )
                  }
                >
                  Save Transfer PIN
                </button>
              </div>
            )}

            {/* ================= LOGIN SETTINGS ================= */}

            {activeSection === 'Login Settings' && (
              <div style={{ marginTop: 20 }}>
                <div style={styles.infoBox}>
                  <strong>Login Password</strong>
                  <p style={styles.infoText}>
                    Your password and Login Code are separate
                    security credentials.
                  </p>
                </div>

                <label style={styles.label}>
                  Current Password
                </label>

                <input
                  type="password"
                  placeholder="Enter current password"
                  style={styles.input}
                />

                <label style={styles.label}>
                  New Password
                </label>

                <input
                  type="password"
                  placeholder="Enter new password"
                  style={styles.input}
                />

                <label style={styles.label}>
                  Confirm New Password
                </label>

                <input
                  type="password"
                  placeholder="Confirm new password"
                  style={styles.input}
                />

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() =>
                    alert(
                      'Password change will be securely connected to the backend next.'
                    )
                  }
                >
                  Change Password
                </button>

                <div
                  style={{
                    height: 1,
                    background: '#edf2ef',
                    margin: '24px 0',
                  }}
                />

                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                  }}
                >
                  6-Digit Login Code
                </h3>

                <p
                  style={{
                    color: '#7b8982',
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  Create a separate 6-digit code for quick
                  login. This is different from your password
                  and Transfer PIN.
                </p>

                <label style={styles.label}>
                  New Login Code
                </label>

                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  style={styles.input}
                />

                <label style={styles.label}>
                  Confirm Login Code
                </label>

                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Confirm 6-digit code"
                  style={styles.input}
                />

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() =>
                    alert(
                      'Login Code will be securely connected to the backend next.'
                    )
                  }
                >
                  Save Login Code
                </button>
              </div>
            )}

            {/* ================= SAVING SETTINGS ================= */}

            {activeSection === 'Saving Settings' && (
              <div style={{ marginTop: 20 }}>
                <div style={styles.infoBox}>
                  <strong>SafeBox</strong>
                  <p style={styles.infoText}>
                    Set an amount you want to save regularly
                    in your Zenimonies SafeBox.
                  </p>
                </div>

                <label style={styles.label}>
                  Saving Amount
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="₦0.00"
                  style={styles.input}
                />

                <label style={styles.label}>
                  Saving Frequency
                </label>

                <select style={styles.input}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() =>
                    alert(
                      'SafeBox saving settings will be connected to the backend next.'
                    )
                  }
                >
                  Save Settings
                </button>
              </div>
            )}

            {/* ================= SECURITY QUESTION ================= */}

            {activeSection === 'Security Question' && (
              <div style={{ marginTop: 20 }}>
                <label style={styles.label}>
                  Security Question
                </label>

                <select style={styles.input}>
                  <option>
                    Select a security question
                  </option>
                  <option>
                    What was the name of your first school?
                  </option>
                  <option>
                    What is your childhood nickname?
                  </option>
                  <option>
                    What was the name of your first pet?
                  </option>
                </select>

                <label style={styles.label}>
                  Your Answer
                </label>

                <input
                  type="text"
                  placeholder="Enter your answer"
                  style={styles.input}
                />

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() =>
                    alert(
                      'Security question will be securely connected to the backend next.'
                    )
                  }
                >
                  Save Security Question
                </button>
              </div>
            )}

            {/* ================= SMS ================= */}

            {activeSection === 'SMS Alert Settings' && (
              <div style={{ marginTop: 20 }}>
                <ToggleRow
                  title="SMS Alerts"
                  description="Receive important account notifications by SMS."
                  enabled={smsAlerts}
                  onChange={setSmsAlerts}
                />

                <ToggleRow
                  title="Transaction Alerts"
                  description="Receive alerts when money is sent or received."
                  enabled={smsAlerts}
                  onChange={setSmsAlerts}
                />

                <ToggleRow
                  title="Security Alerts"
                  description="Receive alerts for important security events."
                  enabled={smsAlerts}
                  onChange={setSmsAlerts}
                />

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() =>
                    alert('SMS alert preferences saved.')
                  }
                >
                  Save Alert Settings
                </button>
              </div>
            )}

            {/* ================= THEMES ================= */}

            {activeSection === 'Themes' && (
              <div style={{ marginTop: 20 }}>
                <ToggleRow
                  title="Dark Theme"
                  description="Use a darker appearance throughout the app."
                  enabled={darkMode}
                  onChange={setDarkMode}
                />

                <div style={styles.infoBox}>
                  <strong>
                    Current theme: {darkMode ? 'Dark' : 'Light'}
                  </strong>

                  <p style={styles.infoText}>
                    Theme preferences can later be synchronized
                    with your account.
                  </p>
                </div>
              </div>
            )}

            {/* ================= SECURITY CENTER ================= */}

            {activeSection === 'Security Center' && (
              <div style={{ marginTop: 20 }}>
                <div style={styles.securityStatus}>
                  <div style={styles.securityCheck}>✓</div>

                  <div>
                    <strong>Account Security</strong>
                    <p style={styles.infoText}>
                      Your account security center is ready.
                    </p>
                  </div>
                </div>

                <div style={styles.securityRow}>
                  <span>Password</span>
                  <strong>Protected</strong>
                </div>

                <div style={styles.securityRow}>
                  <span>Transfer PIN</span>
                  <strong>Protected</strong>
                </div>

                <div style={styles.securityRow}>
                  <span>Login Code</span>
                  <strong>Available</strong>
                </div>
              </div>
            )}

            {/* ================= FEEDBACK ================= */}

            {activeSection === 'Feedback and Suggestions' && (
              <div style={{ marginTop: 20 }}>
                <label style={styles.label}>
                  Your feedback
                </label>

                <textarea
                  placeholder="Tell us what you think..."
                  rows={6}
                  style={{
                    ...styles.input,
                    resize: 'vertical',
                  }}
                />

                <button
                  type="button"
                  style={styles.primaryButton}
                  onClick={() =>
                    alert('Thank you for your feedback.')
                  }
                >
                  Send Feedback
                </button>
              </div>
            )}

            {/* ================= ABOUT ================= */}

            {activeSection === 'About' && (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    textAlign: 'center',
                    padding: '15px 0 25px',
                  }}
                >
                  <div style={styles.aboutLogo}>Z</div>

                  <h3
                    style={{
                      margin: '12px 0 4px',
                    }}
                  >
                    Zenimonies
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: '#7b8982',
                      fontSize: 13,
                    }}
                  >
                    Digital Banking
                  </p>
                </div>

                <div style={styles.securityRow}>
                  <span>Application</span>
                  <strong>Zenimonies</strong>
                </div>

                <div style={styles.securityRow}>
                  <span>Version</span>
                  <strong>1.0.0</strong>
                </div>

                <div style={styles.securityRow}>
                  <span>Platform</span>
                  <strong>Digital Banking</strong>
                </div>
              </div>
            )}

            {/* ================= DEFAULT ================= */}

            {![
              'Payment Settings',
              'Login Settings',
              'Saving Settings',
              'Security Question',
              'SMS Alert Settings',
              'Themes',
              'Security Center',
              'Feedback and Suggestions',
              'About',
            ].includes(activeSection) && (
              <div
                style={{
                  marginTop: 20,
                  background: '#f6faf8',
                  borderRadius: 14,
                  padding: 16,
                  color: '#68766f',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                This section is ready for its full feature
                implementation.
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          CLOSE ACCOUNT CONFIRMATION
      ===================================================== */}

      {showCloseConfirmation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 20, 16, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            zIndex: 200,
          }}
        >
          <div
            style={{
              width: 'min(420px, 100%)',
              background: '#ffffff',
              borderRadius: 22,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: '#fff1f1',
                color: '#d92d20',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 15px',
                fontSize: 28,
                fontWeight: 800,
              }}
            >
              !
            </div>

            <h2
              style={{
                margin: 0,
                fontSize: 21,
              }}
            >
              Close your account?
            </h2>

            <p
              style={{
                color: '#66756e',
                fontSize: 13,
                lineHeight: 1.6,
                margin: '10px 0 22px',
              }}
            >
              Closing your account is a serious action. Your
              identity and account information may need to be
              verified before the account can be closed.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowCloseConfirmation(false)
                }
                style={{
                  flex: 1,
                  height: 48,
                  border: '1px solid #d8e1dc',
                  borderRadius: 13,
                  background: '#ffffff',
                  color: '#34443c',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  alert(
                    'Account closure will be securely connected to the backend.'
                  )
                }
                style={{
                  flex: 1,
                  height: 48,
                  border: 'none',
                  borderRadius: 13,
                  background: '#d92d20',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   TOGGLE
============================================================ */

interface ToggleRowProps {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  title,
  description,
  enabled,
  onChange,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid #edf2ef',
      }}
    >
      <div style={{ flex: 1 }}>
        <strong
          style={{
            display: 'block',
            fontSize: 14,
          }}
        >
          {title}
        </strong>

        <span
          style={{
            display: 'block',
            color: '#7b8982',
            fontSize: 12,
            lineHeight: 1.4,
            marginTop: 3,
          }}
        >
          {description}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-label={title}
        style={{
          width: 48,
          height: 28,
          border: 'none',
          borderRadius: 99,
          background: enabled ? '#079447' : '#cbd5cf',
          padding: 3,
          cursor: 'pointer',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: 'block',
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#ffffff',
            transform: enabled
              ? 'translateX(20px)'
              : 'translateX(0)',
            transition: 'transform 0.15s ease',
          }}
        />
      </button>
    </div>
  );
};

/* ============================================================
   STYLES
============================================================ */

const styles: Record<string, React.CSSProperties> = {
  label: {
    display: 'block',
    color: '#34443c',
    fontSize: 12,
    fontWeight: 700,
    margin: '16px 0 7px',
  },

  input: {
    width: '100%',
    boxSizing: 'border-box',
    height: 47,
    border: '1px solid #d8e2dc',
    borderRadius: 12,
    padding: '0 13px',
    outline: 'none',
    fontSize: 14,
    color: '#14251e',
    background: '#ffffff',
  },

  primaryButton: {
    width: '100%',
    height: 49,
    border: 'none',
    borderRadius: 13,
    background: '#079447',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 750,
    cursor: 'pointer',
    marginTop: 20,
  },

  infoBox: {
    background: '#effbf5',
    border: '1px solid #dcefe5',
    borderRadius: 13,
    padding: 13,
    color: '#12633f',
    fontSize: 13,
    lineHeight: 1.5,
  },

  infoText: {
    color: '#718078',
    fontSize: 12,
    lineHeight: 1.5,
    margin: '5px 0 0',
  },

  securityStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#effbf5',
    border: '1px solid #dcefe5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 15,
  },

  securityCheck: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  securityRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 15,
    padding: '14px 0',
    borderBottom: '1px solid #edf2ef',
    fontSize: 13,
  },

  aboutLogo: {
    width: 58,
    height: 58,
    borderRadius: 17,
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    fontSize: 30,
    fontWeight: 800,
  },
};

export default Settings;
