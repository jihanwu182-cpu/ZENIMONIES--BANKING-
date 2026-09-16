import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL =
  'https://zenimonies-banking.onrender.com/api';

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

  const [activeSection, setActiveSection] =
    useState<string | null>(null);

  const [showCloseConfirmation, setShowCloseConfirmation] =
    useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const [smsAlerts, setSmsAlerts] = useState(true);

  // ==========================================================
  // ACCOUNT UNLOCK PASSCODE STATE
  // ==========================================================

  const [passcodeExists, setPasscodeExists] =
    useState(false);

  const [passcodeLoading, setPasscodeLoading] =
    useState(false);

  const [passcodeSaving, setPasscodeSaving] =
    useState(false);

  const [passcodeMessage, setPasscodeMessage] =
    useState('');

  const [passcodeError, setPasscodeError] =
    useState('');

  const [newPasscode, setNewPasscode] =
    useState('');

  const [confirmPasscode, setConfirmPasscode] =
    useState('');

  const [currentPasscode, setCurrentPasscode] =
    useState('');

  const [replacementPasscode, setReplacementPasscode] =
    useState('');

  const [
    confirmReplacementPasscode,
    setConfirmReplacementPasscode,
  ] = useState('');

  // ==========================================================
  // TRANSACTION PIN STATE
  // ==========================================================

  const [transactionPinExists, setTransactionPinExists] =
    useState(false);

  const [transactionPinLocked, setTransactionPinLocked] =
    useState(false);

  const [transactionPinLoading, setTransactionPinLoading] =
    useState(false);

  const [transactionPinSaving, setTransactionPinSaving] =
    useState(false);

  const [transactionPinMessage, setTransactionPinMessage] =
    useState('');

  const [transactionPinError, setTransactionPinError] =
    useState('');

  const [newTransactionPin, setNewTransactionPin] =
    useState('');

  const [
    confirmTransactionPin,
    setConfirmTransactionPin,
  ] = useState('');

  const [currentTransactionPin, setCurrentTransactionPin] =
    useState('');

  const [replacementTransactionPin, setReplacementTransactionPin] =
    useState('');

  const [
    confirmReplacementTransactionPin,
    setConfirmReplacementTransactionPin,
  ] = useState('');

  const [
    transactionPinFailedAttempts,
    setTransactionPinFailedAttempts,
  ] = useState(0);

  const [
    transactionPinRemainingAttempts,
    setTransactionPinRemainingAttempts,
  ] = useState(3);

  const [
    transactionPinLockedUntil,
    setTransactionPinLockedUntil,
  ] = useState<string | null>(null);

  // ==========================================================
  // TOKEN
  // ==========================================================

  const getToken = () => {
    return (
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token') ||
      ''
    );
  };

  // ==========================================================
  // LOAD ACCOUNT PASSCODE STATUS
  // ==========================================================

  const loadPasscodeStatus = async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    setPasscodeLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/passcode/status`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load Passcode status.'
        );
      }

      setPasscodeExists(
        data?.passcode?.exists === true
      );
    } catch (error) {
      console.error(
        'Passcode status error:',
        error
      );
    } finally {
      setPasscodeLoading(false);
    }
  };

  // ==========================================================
  // LOAD TRANSACTION PIN STATUS
  // ==========================================================

  const loadTransactionPinStatus = async () => {
    const token = getToken();

    if (!token) {
      return;
    }

    setTransactionPinLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/transaction-pin/status`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to load Transaction PIN status.'
        );
      }

      setTransactionPinExists(
        data?.exists === true
      );

      setTransactionPinLocked(
        data?.locked === true
      );

      setTransactionPinFailedAttempts(
        Number(
          data?.failedAttempts || 0
        )
      );

      setTransactionPinRemainingAttempts(
        Math.max(
          Number(
            data?.maxFailedAttempts || 3
          ) -
            Number(
              data?.failedAttempts || 0
            ),
          0
        )
      );

      setTransactionPinLockedUntil(
        data?.lockedUntil || null
      );
    } catch (error) {
      console.error(
        'Transaction PIN status error:',
        error
      );
    } finally {
      setTransactionPinLoading(false);
    }
  };

  useEffect(() => {
    loadPasscodeStatus();
    loadTransactionPinStatus();
  }, []);

  // ==========================================================
  // OPEN SECTION
  // ==========================================================

  const openSection = (section: string) => {
    setActiveSection(section);

    if (section === 'Login Settings') {
      loadPasscodeStatus();
    }

    if (
      section === 'Payment Settings' ||
      section === 'Security Center'
    ) {
      loadTransactionPinStatus();
    }
  };

  // ==========================================================
  // CLOSE SECTION
  // ==========================================================

  const closeSection = () => {
    setActiveSection(null);

    // Account Passcode
    setPasscodeMessage('');
    setPasscodeError('');

    setNewPasscode('');
    setConfirmPasscode('');

    setCurrentPasscode('');
    setReplacementPasscode('');
    setConfirmReplacementPasscode('');

    // Transaction PIN
    setTransactionPinMessage('');
    setTransactionPinError('');

    setNewTransactionPin('');
    setConfirmTransactionPin('');

    setCurrentTransactionPin('');
    setReplacementTransactionPin('');
    setConfirmReplacementTransactionPin('');
  };

  // ==========================================================
  // CREATE ACCOUNT PASSCODE
  // ==========================================================

  const handleCreatePasscode = async () => {
    setPasscodeMessage('');
    setPasscodeError('');

    if (!/^\d{6}$/.test(newPasscode)) {
      setPasscodeError(
        'Your Account Passcode must be exactly 6 digits.'
      );
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setPasscodeError(
        'Passcodes do not match.'
      );
      return;
    }

    const token = getToken();

    if (!token) {
      setPasscodeError(
        'Your session has expired. Please log in again.'
      );
      return;
    }

    setPasscodeSaving(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/passcode/setup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            passcode: newPasscode,
            confirm_passcode:
              confirmPasscode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to create Account Passcode.'
        );
      }

      setPasscodeExists(true);

      setNewPasscode('');
      setConfirmPasscode('');

      setPasscodeMessage(
        'Your 6-digit Account Unlock Passcode has been created successfully.'
      );
    } catch (error) {
      setPasscodeError(
        error instanceof Error
          ? error.message
          : 'Unable to create Account Passcode.'
      );
    } finally {
      setPasscodeSaving(false);
    }
  };

  // ==========================================================
  // CHANGE ACCOUNT PASSCODE
  // ==========================================================

  const handleChangePasscode = async () => {
    setPasscodeMessage('');
    setPasscodeError('');

    if (!/^\d{6}$/.test(currentPasscode)) {
      setPasscodeError(
        'Current Passcode must be exactly 6 digits.'
      );
      return;
    }

    if (!/^\d{6}$/.test(replacementPasscode)) {
      setPasscodeError(
        'New Passcode must be exactly 6 digits.'
      );
      return;
    }

    if (
      replacementPasscode !==
      confirmReplacementPasscode
    ) {
      setPasscodeError(
        'New Passcodes do not match.'
      );
      return;
    }

    if (
      currentPasscode ===
      replacementPasscode
    ) {
      setPasscodeError(
        'Your new Passcode must be different from your current Passcode.'
      );
      return;
    }

    const token = getToken();

    if (!token) {
      setPasscodeError(
        'Your session has expired. Please log in again.'
      );
      return;
    }

    setPasscodeSaving(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/passcode/change`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_passcode:
              currentPasscode,

            new_passcode:
              replacementPasscode,

            confirm_passcode:
              confirmReplacementPasscode,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            'Unable to change Account Passcode.'
        );
      }

      setCurrentPasscode('');
      setReplacementPasscode('');
      setConfirmReplacementPasscode('');

      setPasscodeMessage(
        'Your Account Unlock Passcode has been changed successfully.'
      );
    } catch (error) {
      setPasscodeError(
        error instanceof Error
          ? error.message
          : 'Unable to change Account Passcode.'
      );
    } finally {
      setPasscodeSaving(false);
    }
  };

  // ==========================================================
  // CREATE TRANSACTION PIN
  // ==========================================================

  const handleCreateTransactionPin =
    async () => {
      setTransactionPinMessage('');
      setTransactionPinError('');

      if (
        !/^\d{4}$/.test(
          newTransactionPin
        )
      ) {
        setTransactionPinError(
          'Your Transaction PIN must be exactly 4 digits.'
        );
        return;
      }

      if (
        newTransactionPin !==
        confirmTransactionPin
      ) {
        setTransactionPinError(
          'Transaction PINs do not match.'
        );
        return;
      }

      const token = getToken();

      if (!token) {
        setTransactionPinError(
          'Your session has expired. Please log in again.'
        );
        return;
      }

      setTransactionPinSaving(true);

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/transaction-pin/setup`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                pin: newTransactionPin,
                confirmPin:
                  confirmTransactionPin,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.message ||
              'Unable to create Transaction PIN.'
          );
        }

        setTransactionPinExists(
          true
        );

        setTransactionPinLocked(
          false
        );

        setTransactionPinFailedAttempts(
          0
        );

        setTransactionPinRemainingAttempts(
          3
        );

        setNewTransactionPin('');
        setConfirmTransactionPin('');

        setTransactionPinMessage(
          'Your 4-digit Transaction PIN has been created successfully.'
        );
      } catch (error) {
        setTransactionPinError(
          error instanceof Error
            ? error.message
            : 'Unable to create Transaction PIN.'
        );
      } finally {
        setTransactionPinSaving(false);
      }
    };

  // ==========================================================
  // CHANGE TRANSACTION PIN
  // ==========================================================

  const handleChangeTransactionPin =
    async () => {
      setTransactionPinMessage('');
      setTransactionPinError('');

      if (
        !/^\d{4}$/.test(
          currentTransactionPin
        )
      ) {
        setTransactionPinError(
          'Current Transaction PIN must be exactly 4 digits.'
        );
        return;
      }

      if (
        !/^\d{4}$/.test(
          replacementTransactionPin
        )
      ) {
        setTransactionPinError(
          'New Transaction PIN must be exactly 4 digits.'
        );
        return;
      }

      if (
        replacementTransactionPin !==
        confirmReplacementTransactionPin
      ) {
        setTransactionPinError(
          'New Transaction PINs do not match.'
        );
        return;
      }

      if (
        currentTransactionPin ===
        replacementTransactionPin
      ) {
        setTransactionPinError(
          'Your new Transaction PIN must be different from your current PIN.'
        );
        return;
      }

      if (transactionPinLocked) {
        setTransactionPinError(
          'Your Transaction PIN is temporarily locked. Please try again after the lock period.'
        );
        return;
      }

      const token = getToken();

      if (!token) {
        setTransactionPinError(
          'Your session has expired. Please log in again.'
        );
        return;
      }

      setTransactionPinSaving(true);

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/transaction-pin/change`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                currentPin:
                  currentTransactionPin,

                newPin:
                  replacementTransactionPin,

                confirmPin:
                  confirmReplacementTransactionPin,
              }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (
            data?.failedAttempts !==
            undefined
          ) {
            setTransactionPinFailedAttempts(
              Number(
                data.failedAttempts
              )
            );
          }

          if (
            data?.remainingAttempts !==
            undefined
          ) {
            setTransactionPinRemainingAttempts(
              Number(
                data.remainingAttempts
              )
            );
          }

          if (
            data?.lockedUntil
          ) {
            setTransactionPinLocked(
              true
            );

            setTransactionPinLockedUntil(
              data.lockedUntil
            );
          }

          throw new Error(
            data?.message ||
              'Unable to change Transaction PIN.'
          );
        }

        setCurrentTransactionPin('');
        setReplacementTransactionPin('');
        setConfirmReplacementTransactionPin('');

        setTransactionPinLocked(
          false
        );

        setTransactionPinFailedAttempts(
          0
        );

        setTransactionPinRemainingAttempts(
          3
        );

        setTransactionPinLockedUntil(
          null
        );

        setTransactionPinMessage(
          'Your Transaction PIN has been changed successfully.'
        );
      } catch (error) {
        setTransactionPinError(
          error instanceof Error
            ? error.message
            : 'Unable to change Transaction PIN.'
        );
      } finally {
        setTransactionPinSaving(false);
      }
    };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = () => {
    localStorage.removeItem(
      'zenimonies_token'
    );

    localStorage.removeItem(
      'token'
    );

    localStorage.removeItem(
      'zenimonies_user'
    );

    localStorage.removeItem(
      'zenimonies_accounts'
    );

    sessionStorage.removeItem(
      'zenimonies_otp_email'
    );

    sessionStorage.removeItem(
      'zenimonies_otp_token'
    );

    sessionStorage.removeItem(
      'zenimonies_account_locked'
    );

    sessionStorage.removeItem(
      'zenimonies_passkey_fallback'
    );

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
          borderBottom:
            '1px solid #e8efeb',
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
            onClick={() =>
              navigate('/')
            }
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
        {/* ================= INTRO ================= */}

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

        <SectionTitle title="ACCOUNT" />

        <section
          style={styles.sectionCard}
        >
          <SettingItem
            icon="♙"
            title="My Profile"
            description="Manage your personal and contact information."
            onClick={() =>
              navigate('/profile')
            }
          />
        </section>

        {/* ================= PAYMENTS ================= */}

        <SectionTitle title="PAYMENTS" />

        <section
          style={styles.sectionCard}
        >
          <SettingItem
            icon="₦"
            title="Payment Settings"
            description="Manage your Transaction PIN and payment security."
            onClick={() =>
              openSection(
                'Payment Settings'
              )
            }
          />
        </section>

        {/* ================= LOGIN & SECURITY ================= */}

        <SectionTitle title="LOGIN & SECURITY" />

        <section
          style={styles.sectionCard}
        >
          <SettingItem
            icon="🔐"
            title="Login Settings"
            description="Manage your password and Account Unlock Passcode."
            onClick={() =>
              openSection(
                'Login Settings'
              )
            }
          />

          <SettingItem
            icon="?"
            title="Security Question"
            description="Set or change your account security question."
            onClick={() =>
              openSection(
                'Security Question'
              )
            }
          />

          <SettingItem
            icon="🛡"
            title="Security Center"
            description="Review your account security and protection."
            onClick={() =>
              openSection(
                'Security Center'
              )
            }
          />
        </section>

        {/* ================= SAVINGS ================= */}

        <SectionTitle title="SAVINGS" />

        <section
          style={styles.sectionCard}
        >
          <SettingItem
            icon="▣"
            title="Saving Settings"
            description="Set the amount and frequency for your SafeBox."
            onClick={() =>
              openSection(
                'Saving Settings'
              )
            }
          />
        </section>

        {/* ================= PREFERENCES ================= */}

        <SectionTitle title="PREFERENCES" />

        <section
          style={styles.sectionCard}
        >
          <SettingItem
            icon="SMS"
            title="SMS Alert Settings"
            description="Control transaction and security SMS alerts."
            onClick={() =>
              openSection(
                'SMS Alert Settings'
              )
            }
          />

          <SettingItem
            icon="☼"
            title="Themes"
            description="Choose your preferred app appearance."
            onClick={() =>
              openSection('Themes')
            }
          />
        </section>

        {/* ================= SUPPORT ================= */}

        <SectionTitle title="SUPPORT" />

        <section
          style={styles.sectionCard}
        >
          <SettingItem
            icon="✉"
            title="Feedback and Suggestions"
            description="Tell us how we can improve Zenimonies."
            onClick={() =>
              openSection(
                'Feedback and Suggestions'
              )
            }
          />

          <SettingItem
            icon="ⓘ"
            title="About"
            description="Learn more about Zenimonies and this app."
            onClick={() =>
              openSection('About')
            }
          />
        </section>

        {/* ================= ACCOUNT ACTIONS ================= */}

        <SectionTitle title="ACCOUNT ACTIONS" />

        <section
          style={styles.sectionCard}
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
            onClick={() =>
              setShowCloseConfirmation(
                true
              )
            }
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
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div
              style={
                styles.modalHeader
              }
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
                style={
                  styles.closeButton
                }
              >
                ×
              </button>
            </div>

            {/* =================================================
                PAYMENT SETTINGS
            ================================================= */}

            {activeSection ===
              'Payment Settings' && (
              <div
                style={{
                  marginTop: 20,
                }}
              >
                <div
                  style={
                    styles.infoBox
                  }
                >
                  <strong>
                    Transaction PIN
                  </strong>

                  <p
                    style={
                      styles.infoText
                    }
                  >
                    Your Transaction PIN is exactly
                    4 digits and is used to authorize
                    transfers, payments and other
                    money-moving actions.
                  </p>

                  <p
                    style={
                      styles.infoText
                    }
                  >
                    Your Transaction PIN is completely
                    separate from your Account Unlock
                    Passcode.
                  </p>
                </div>

                {/* STATUS */}

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: 13,
                    borderRadius: 13,
                    marginTop: 15,
                    background:
                      transactionPinLocked
                        ? '#fff1f1'
                        : transactionPinExists
                        ? '#effbf5'
                        : '#fff9ed',
                    border:
                      transactionPinLocked
                        ? '1px solid #f3d3d0'
                        : transactionPinExists
                        ? '1px solid #d9eee3'
                        : '1px solid #f0e2c4',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background:
                        transactionPinLocked
                          ? '#d92d20'
                          : transactionPinExists
                          ? '#079447'
                          : '#e6a21a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent:
                        'center',
                      fontWeight: 800,
                    }}
                  >
                    {transactionPinLocked
                      ? '!'
                      : transactionPinExists
                      ? '✓'
                      : '!'}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: '#34443c',
                      }}
                    >
                      {transactionPinLoading
                        ? 'Checking status…'
                        : transactionPinLocked
                        ? 'Transaction PIN Locked'
                        : transactionPinExists
                        ? 'Transaction PIN Active'
                        : 'Transaction PIN Not Set'}
                    </div>

                    <div
                      style={{
                        color: '#7b8982',
                        fontSize: 11,
                        marginTop: 2,
                      }}
                    >
                      {transactionPinLocked
                        ? 'Your PIN is temporarily locked after multiple incorrect attempts.'
                        : transactionPinExists
                        ? 'Your 4-digit Transaction PIN is protected.'
                        : 'Create a 4-digit Transaction PIN to authorize payments and transfers.'}
                    </div>
                  </div>
                </div>

                {/* LOCK MESSAGE */}

                {transactionPinLocked && (
                  <div
                    style={{
                      marginTop: 13,
                      background:
                        '#fff1f1',
                      border:
                        '1px solid #f3d3d0',
                      color: '#b42318',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>
                      Transaction PIN temporarily locked.
                    </strong>
                    <br />
                    Please wait until the security
                    lock expires before trying again.
                    {transactionPinLockedUntil && (
                      <>
                        <br />
                        Lock expires:{' '}
                        {new Date(
                          transactionPinLockedUntil
                        ).toLocaleString()}
                      </>
                    )}
                  </div>
                )}

                {/* SUCCESS */}

                {transactionPinMessage && (
                  <div
                    style={{
                      marginTop: 13,
                      background:
                        '#effbf5',
                      border:
                        '1px solid #d9eee3',
                      color: '#12633f',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    {transactionPinMessage}
                  </div>
                )}

                {/* ERROR */}

                {transactionPinError && (
                  <div
                    style={{
                      marginTop: 13,
                      background:
                        '#fff1f1',
                      border:
                        '1px solid #f3d3d0',
                      color: '#b42318',
                      borderRadius: 12,
                      padding: 12,
                      fontSize: 12,
                      lineHeight: 1.5,
                    }}
                  >
                    {transactionPinError}
                  </div>
                )}

                {/* CREATE */}

                {!transactionPinExists &&
                  !transactionPinLocked && (
                    <div
                      style={{
                        marginTop: 18,
                      }}
                    >
                      <label
                        style={
                          styles.label
                        }
                      >
                        Create 4-Digit Transaction PIN
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={4}
                        pattern="[0-9]*"
                        placeholder="Enter 4 digits"
                        value={
                          newTransactionPin
                        }
                        onChange={(
                          event
                        ) =>
                          setNewTransactionPin(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                4
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      <label
                        style={
                          styles.label
                        }
                      >
                        Confirm Transaction PIN
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={4}
                        pattern="[0-9]*"
                        placeholder="Confirm 4 digits"
                        value={
                          confirmTransactionPin
                        }
                        onChange={(
                          event
                        ) =>
                          setConfirmTransactionPin(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                4
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      <button
                        type="button"
                        style={{
                          ...styles.primaryButton,
                          opacity:
                            transactionPinSaving
                              ? 0.65
                              : 1,
                        }}
                        disabled={
                          transactionPinSaving
                        }
                        onClick={
                          handleCreateTransactionPin
                        }
                      >
                        {transactionPinSaving
                          ? 'Creating Transaction PIN…'
                          : 'Create Transaction PIN'}
                      </button>
                    </div>
                  )}

                {/* CHANGE */}

                {transactionPinExists &&
                  !transactionPinLocked && (
                    <div
                      style={{
                        marginTop: 20,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: '#34443c',
                          marginBottom: 4,
                        }}
                      >
                        Change Transaction PIN
                      </div>

                      <p
                        style={{
                          color: '#7b8982',
                          fontSize: 12,
                          lineHeight: 1.5,
                          margin:
                            '0 0 12px',
                        }}
                      >
                        Your current 4-digit Transaction
                        PIN is required before a new PIN
                        can be created.
                      </p>

                      <label
                        style={
                          styles.label
                        }
                      >
                        Current Transaction PIN
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="current-password"
                        maxLength={4}
                        pattern="[0-9]*"
                        placeholder="Enter current 4 digits"
                        value={
                          currentTransactionPin
                        }
                        onChange={(
                          event
                        ) =>
                          setCurrentTransactionPin(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                4
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      <label
                        style={
                          styles.label
                        }
                      >
                        New Transaction PIN
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={4}
                        pattern="[0-9]*"
                        placeholder="Enter new 4 digits"
                        value={
                          replacementTransactionPin
                        }
                        onChange={(
                          event
                        ) =>
                          setReplacementTransactionPin(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                4
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      <label
                        style={
                          styles.label
                        }
                      >
                        Confirm New Transaction PIN
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={4}
                        pattern="[0-9]*"
                        placeholder="Confirm new 4 digits"
                        value={
                          confirmReplacementTransactionPin
                        }
                        onChange={(
                          event
                        ) =>
                          setConfirmReplacementTransactionPin(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                4
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      {transactionPinFailedAttempts >
                        0 && (
                        <div
                          style={{
                            marginTop: 12,
                            color: '#8a5a00',
                            background:
                              '#fff9ed',
                            border:
                              '1px solid #f0e2c4',
                            borderRadius: 11,
                            padding: 10,
                            fontSize: 11,
                          }}
                        >
                          Incorrect attempts:{' '}
                          {
                            transactionPinFailedAttempts
                          }
                          . Remaining attempts:{' '}
                          {
                            transactionPinRemainingAttempts
                          }
                          .
                        </div>
                      )}

                      <button
                        type="button"
                        style={{
                          ...styles.primaryButton,
                          opacity:
                            transactionPinSaving
                              ? 0.65
                              : 1,
                        }}
                        disabled={
                          transactionPinSaving
                        }
                        onClick={
                          handleChangeTransactionPin
                        }
                      >
                        {transactionPinSaving
                          ? 'Changing Transaction PIN…'
                          : 'Change Transaction PIN'}
                      </button>
                    </div>
                  )}

                <div
                  style={{
                    marginTop: 18,
                    padding: 13,
                    background:
                      '#f7faf8',
                    borderRadius: 12,
                    color: '#6f7d76',
                    fontSize: 11,
                    lineHeight: 1.55,
                  }}
                >
                  <strong
                    style={{
                      color: '#34443c',
                    }}
                  >
                    Payment Security
                  </strong>
                  <br />
                  Your Transaction PIN is stored securely
                  as a cryptographic hash. Zenimonies does
                  not store or display your actual 4-digit
                  PIN.
                  <br />
                  <br />
                  This PIN is separate from your Account
                  Unlock Passcode and will be used for
                  transaction authorization.
                </div>
              </div>
            )}

            {/* =================================================
                LOGIN SETTINGS
            ================================================= */}

            {activeSection ===
              'Login Settings' && (
              <div
                style={{
                  marginTop: 20,
                }}
              >
                {/* PASSWORD */}

                <div
                  style={
                    styles.infoBox
                  }
                >
                  <strong>
                    Login Password
                  </strong>

                  <p
                    style={
                      styles.infoText
                    }
                  >
                    Your password remains your primary
                    account recovery credential.
                  </p>
                </div>

                <div
                  style={{
                    marginTop: 18,
                    padding: 15,
                    borderRadius: 14,
                    background:
                      '#f7faf8',
                    border:
                      '1px solid #e5eee9',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 750,
                      color: '#34443c',
                    }}
                  >
                    Password reset
                  </div>

                  <div
                    style={{
                      color: '#7b8982',
                      fontSize: 12,
                      lineHeight: 1.5,
                      marginTop: 5,
                    }}
                  >
                    If you need to change your password,
                    use the secure password recovery process
                    from the login screen.
                  </div>

                  <button
                    type="button"
                    style={
                      styles.secondaryButton
                    }
                    onClick={() => {
                      closeSection();
                      navigate(
                        '/forgot-password'
                      );
                    }}
                  >
                    Reset Password
                  </button>
                </div>

                {/* ACCOUNT UNLOCK PASSCODE */}

                <div
                  style={{
                    height: 1,
                    background:
                      '#edf2ef',
                    margin: '25px 0',
                  }}
                />

                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 17,
                      fontWeight: 800,
                      color: '#14251e',
                    }}
                  >
                    Account Unlock Passcode
                  </h3>

                  <p
                    style={{
                      color: '#7b8982',
                      fontSize: 13,
                      lineHeight: 1.55,
                      margin:
                        '7px 0 0',
                    }}
                  >
                    Your Account Unlock Passcode is exactly
                    6 digits. It is used only to unlock your
                    Zenimonies account after Passkey or
                    biometric authentication fallback.
                  </p>

                  {/* STATUS */}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: 13,
                      borderRadius: 13,
                      marginTop: 15,
                      background:
                        passcodeExists
                          ? '#effbf5'
                          : '#fff9ed',
                      border:
                        passcodeExists
                          ? '1px solid #d9eee3'
                          : '1px solid #f0e2c4',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius:
                          '50%',
                        background:
                          passcodeExists
                            ? '#079447'
                            : '#e6a21a',
                        color:
                          '#ffffff',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        fontWeight: 800,
                      }}
                    >
                      {passcodeExists
                        ? '✓'
                        : '!'}
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: '#34443c',
                        }}
                      >
                        {passcodeLoading
                          ? 'Checking status…'
                          : passcodeExists
                          ? 'Passcode Active'
                          : 'Passcode Not Set'}
                      </div>

                      <div
                        style={{
                          color: '#7b8982',
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {passcodeExists
                          ? 'Your 6-digit Account Unlock Passcode is protected.'
                          : 'Create your 6-digit Account Unlock Passcode to use it as an unlock fallback.'}
                      </div>
                    </div>
                  </div>

                  {/* SUCCESS */}

                  {passcodeMessage && (
                    <div
                      style={{
                        marginTop: 13,
                        background:
                          '#effbf5',
                        border:
                          '1px solid #d9eee3',
                        color: '#12633f',
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {passcodeMessage}
                    </div>
                  )}

                  {/* ERROR */}

                  {passcodeError && (
                    <div
                      style={{
                        marginTop: 13,
                        background:
                          '#fff1f1',
                        border:
                          '1px solid #f3d3d0',
                        color: '#b42318',
                        borderRadius: 12,
                        padding: 12,
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      {passcodeError}
                    </div>
                  )}

                  {/* CREATE */}

                  {!passcodeExists && (
                    <div
                      style={{
                        marginTop: 18,
                      }}
                    >
                      <label
                        style={
                          styles.label
                        }
                      >
                        Create 6-Digit Passcode
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={6}
                        placeholder="Enter 6 digits"
                        value={
                          newPasscode
                        }
                        onChange={(
                          event
                        ) =>
                          setNewPasscode(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                6
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      <label
                        style={
                          styles.label
                        }
                      >
                        Confirm 6-Digit Passcode
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={6}
                        placeholder="Confirm 6 digits"
                        value={
                          confirmPasscode
                        }
                        onChange={(
                          event
                        ) =>
                          setConfirmPasscode(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                6
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      <button
                        type="button"
                        style={{
                          ...styles.primaryButton,
                          opacity:
                            passcodeSaving
                              ? 0.65
                              : 1,
                        }}
                        disabled={
                          passcodeSaving
                        }
                        onClick={
                          handleCreatePasscode
                        }
                      >
                        {passcodeSaving
                          ? 'Creating Passcode…'
                          : 'Create Account Passcode'}
                      </button>
                    </div>
                  )}

                  {/* CHANGE */}

                  {passcodeExists && (
                    <div
                      style={{
                        marginTop: 20,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: '#34443c',
                          marginBottom: 4,
                        }}
                      >
                        Change Passcode
                      </div>

                      <p
                        style={{
                          color: '#7b8982',
                          fontSize: 12,
                          lineHeight: 1.5,
                          margin:
                            '0 0 12px',
                        }}
                      >
                        Your current Passcode is required
                        before a new one can be created.
                      </p>

                      <label
                        style={
                          styles.label
                        }
                      >
                        Current Passcode
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="current-password"
                        maxLength={6}
                        placeholder="Enter current 6 digits"
                        value={
                          currentPasscode
                        }
                        onChange={(
                          event
                        ) =>
                          setCurrentPasscode(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                6
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      <label
                        style={
                          styles.label
                        }
                      >
                        New Passcode
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={6}
                        placeholder="Enter new 6 digits"
                        value={
                          replacementPasscode
                        }
                        onChange={(
                          event
                        ) =>
                          setReplacementPasscode(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                6
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      <label
                        style={
                          styles.label
                        }
                      >
                        Confirm New Passcode
                      </label>

                      <input
                        type="password"
                        inputMode="numeric"
                        autoComplete="new-password"
                        maxLength={6}
                        placeholder="Confirm new 6 digits"
                        value={
                          confirmReplacementPasscode
                        }
                        onChange={(
                          event
                        ) =>
                          setConfirmReplacementPasscode(
                            event.target.value
                              .replace(
                                /\D/g,
                                ''
                              )
                              .slice(
                                0,
                                6
                              )
                          )
                        }
                        style={
                          styles.input
                        }
                      />

                      <button
                        type="button"
                        style={{
                          ...styles.primaryButton,
                          opacity:
                            passcodeSaving
                              ? 0.65
                              : 1,
                        }}
                        disabled={
                          passcodeSaving
                        }
                        onClick={
                          handleChangePasscode
                        }
                      >
                        {passcodeSaving
                          ? 'Changing Passcode…'
                          : 'Change Account Passcode'}
                      </button>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 18,
                      padding: 13,
                      background:
                        '#f7faf8',
                      borderRadius: 12,
                      color: '#6f7d76',
                      fontSize: 11,
                      lineHeight: 1.55,
                    }}
                  >
                    <strong
                      style={{
                        color: '#34443c',
                      }}
                    >
                      Security
                    </strong>
                    <br />
                    Zenimonies never stores your actual
                    6-digit Passcode. The backend stores only
                    a secure cryptographic hash and enforces
                    failed-attempt protection.
                  </div>
                </div>
              </div>
            )}

            {/* =================================================
                SAVING SETTINGS
            ================================================= */}

            {activeSection ===
              'Saving Settings' && (
              <div
                style={{
                  marginTop: 20,
                }}
              >
                <div
                  style={
                    styles.infoBox
                  }
                >
                  <strong>
                    SafeBox
                  </strong>

                  <p
                    style={
                      styles.infoText
                    }
                  >
                    Set an amount you want to save regularly
                    in your Zenimonies SafeBox.
                  </p>
                </div>

                <label
                  style={styles.label}
                >
                  Saving Amount
                </label>

                <input
                  type="number"
                  min="0"
                  placeholder="₦0.00"
                  style={styles.input}
                />

                <label
                  style={styles.label}
                >
                  Saving Frequency
                </label>

                <select
                  style={styles.input}
                >
                  <option value="daily">
                    Daily
                  </option>

                  <option value="weekly">
                    Weekly
                  </option>

                  <option value="monthly">
                    Monthly
                  </option>
                </select>

                <button
                  type="button"
                  style={
                    styles.primaryButton
                  }
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

            {/* =================================================
                SECURITY QUESTION
            ================================================= */}

            {activeSection ===
              'Security Question' && (
              <div
                style={{
                  marginTop: 20,
                }}
              >
                <label
                  style={styles.label}
                >
                  Security Question
                </label>

                <select
                  style={styles.input}
                >
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

                <label
                  style={styles.label}
                >
                  Your Answer
                </label>

                <input
                  type="text"
                  placeholder="Enter your answer"
                  style={styles.input}
                />

                <button
                  type="button"
                  style={
                    styles.primaryButton
                  }
                  onClick={() =>
                    alert(
                      'Security question will be securely connected to the backend.'
                    )
                  }
                >
                  Save Security Question
                </button>
              </div>
            )}

            {/* =================================================
                SMS
            ================================================= */}

            {activeSection ===
              'SMS Alert Settings' && (
              <div
                style={{
                  marginTop: 20,
                }}
              >
                <ToggleRow
                  title="SMS Alerts"
                  description="Receive important account notifications by SMS."
                  enabled={smsAlerts}
                  onChange={
                    setSmsAlerts
                  }
                />

                <ToggleRow
                  title="Transaction Alerts"
                  description="Receive alerts when money is sent or received."
                  enabled={smsAlerts}
                  onChange={
                    setSmsAlerts
                  }
                />

                <ToggleRow
                  title="Security Alerts"
                  description="Receive alerts for important security events."
                  enabled={smsAlerts}
                  onChange={
                    setSmsAlerts
                  }
                />

                <button
                  type="button"
                  style={
                    styles.primaryButton
                  }
                  onClick={() =>
                    alert(
                      'SMS alert preferences saved.'
                    )
                  }
                >
                  Save Alert Settings
                </button>
              </div>
            )}

            {/* =================================================
                THEMES
            ================================================= */}

            {activeSection ===
              'Themes' && (
              <div
                style={{
                  marginTop: 20,
                }}
              >
                <ToggleRow
                  title="Dark Theme"
                  description="Use a darker appearance throughout the app."
                  enabled={darkMode}
                  onChange={
                    setDarkMode
                  }
                />

                <div
                  style={
                    styles.infoBox
                  }
                >
                  <strong>
                    Current theme:{' '}
                    {darkMode
                      ? 'Dark'
                      : 'Light'}
                  </strong>

                  <p
                    style={
                      styles.infoText
                    }
                  >
                    Theme preferences can later be
                    synchronized with your account.
                  </p>
                </div>
              </div>
            )}

            {/* =================================================
                SECURITY CENTER
            ================================================= */}

            {activeSection ===
              'Security Center' && (
              <div
                style={{
                  marginTop: 20,
                }}
              >
                <div
                  style={
                    styles.securityStatus
                  }
                >
                  <div
                    style={
                      styles.securityCheck
                    }
                  >
                    ✓
                  </div>

                  <div>
                    <strong>
                      Account Security
                    </strong>

                    <p
                      style={
                        styles.infoText
                      }
                    >
                      Your account security center is ready.
                    </p>
                  </div>
                </div>

                <div
                  style={
                    styles.securityRow
                  }
                >
                  <span>
                    Password
                  </span>

                  <strong>
                    Protected
                  </strong>
                </div>

                <div
                  style={
                    styles.securityRow
                  }
                >
                  <span>
                    Account Unlock Passcode
                  </span>

                  <strong>
                    {passcodeExists
                      ? 'Active'
                      : 'Not Set'}
                  </strong>
                </div>

                <div
                  style={
                    styles.securityRow
                  }
                >
                  <span>
                    Transaction PIN
                  </span>

                  <strong
                    style={{
                      color:
                        transactionPinLocked
                          ? '#d92d20'
                          : transactionPinExists
                          ? '#078b4a'
                          : '#b77900',
                    }}
                  >
                    {transactionPinLoading
                      ? 'Checking…'
                      : transactionPinLocked
                      ? 'Temporarily Locked'
                      : transactionPinExists
                      ? 'Active'
                      : 'Not Set'}
                  </strong>
                </div>

                <div
                  style={
                    styles.securityRow
                  }
                >
                  <span>
                    Passkey
                  </span>

                  <strong>
                    Available
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    background:
                      '#f7faf8',
                    border:
                      '1px solid #e5eee9',
                    borderRadius: 13,
                    padding: 13,
                    color: '#6f7d76',
                    fontSize: 11,
                    lineHeight: 1.55,
                  }}
                >
                  <strong
                    style={{
                      color: '#34443c',
                    }}
                  >
                    Credential separation
                  </strong>
                  <br />
                  Account Unlock Passcode and Transaction
                  PIN are separate security credentials.
                  The Account Unlock Passcode is used for
                  account unlocking, while the Transaction PIN
                  is reserved for transaction authorization.
                </div>
              </div>
            )}

            {/* =================================================
                FEEDBACK
            ================================================= */}

            {activeSection ===
              'Feedback and Suggestions' && (
              <div
                style={{
                  marginTop: 20,
                }}
              >
                <label
                  style={styles.label}
                >
                  Your feedback
                </label>

                <textarea
                  placeholder="Tell us what you think..."
                  rows={6}
                  style={{
                    ...styles.input,
                    resize: 'vertical',
                    height: 'auto',
                    paddingTop: 12,
                    paddingBottom: 12,
                  }}
                />

                <button
                  type="button"
                  style={
                    styles.primaryButton
                  }
                  onClick={() =>
                    alert(
                      'Thank you for your feedback.'
                    )
                  }
                >
                  Send Feedback
                </button>
              </div>
            )}

            {/* =================================================
                ABOUT
            ================================================= */}

            {activeSection ===
              'About' && (
              <div
                style={{
                  marginTop: 20,
                }}
              >
                <div
                  style={{
                    textAlign:
                      'center',
                    padding:
                      '15px 0 25px',
                  }}
                >
                  <div
                    style={
                      styles.aboutLogo
                    }
                  >
                    Z
                  </div>

                  <h3
                    style={{
                      margin:
                        '12px 0 4px',
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

                <div
                  style={
                    styles.securityRow
                  }
                >
                  <span>
                    Application
                  </span>

                  <strong>
                    Zenimonies
                  </strong>
                </div>

                <div
                  style={
                    styles.securityRow
                  }
                >
                  <span>
                    Version
                  </span>

                  <strong>
                    1.0.0
                  </strong>
                </div>

                <div
                  style={
                    styles.securityRow
                  }
                >
                  <span>
                    Platform
                  </span>

                  <strong>
                    Digital Banking
                  </strong>
                </div>
              </div>
            )}

            {/* =================================================
                DEFAULT
            ================================================= */}

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
            ].includes(
              activeSection
            ) && (
              <div
                style={{
                  marginTop: 20,
                  background:
                    '#f6faf8',
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
          CLOSE ACCOUNT
      ===================================================== */}

      {showCloseConfirmation && (
        <div
          style={
            styles.closeOverlay
          }
        >
          <div
            style={
              styles.closeModal
            }
          >
            <div
              style={
                styles.warningIcon
              }
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
                margin:
                  '10px 0 22px',
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
                  setShowCloseConfirmation(
                    false
                  )
                }
                style={
                  styles.cancelButton
                }
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
                style={
                  styles.dangerButton
                }
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
   SECTION TITLE
============================================================ */

const SectionTitle: React.FC<{
  title: string;
}> = ({ title }) => {
  return (
    <div
      style={{
        color: '#6f7d76',
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 1,
        margin: '20px 5px 8px',
      }}
    >
      {title}
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
        borderBottom:
          '1px solid #edf2ef',
      }}
    >
      <div
        style={{
          flex: 1,
        }}
      >
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
        onClick={() =>
          onChange(!enabled)
        }
        aria-label={title}
        style={{
          width: 48,
          height: 28,
          border: 'none',
          borderRadius: 99,
          background: enabled
            ? '#079447'
            : '#cbd5cf',
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
            transition:
              'transform 0.15s ease',
          }}
        />
      </button>
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
  sectionCard: {
    background: '#ffffff',
    borderRadius: 17,
    overflow: 'hidden',
    border: '1px solid #e7eee9',
    boxShadow:
      '0 5px 18px rgba(26, 61, 47, 0.04)',
  },

  overlay: {
    position: 'fixed',
    inset: 0,
    background:
      'rgba(10, 30, 22, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    zIndex: 100,
  },

  modal: {
    width: 'min(440px, 100%)',
    maxHeight: '90vh',
    overflowY: 'auto',
    background: '#ffffff',
    borderRadius: 22,
    padding: 23,
    boxShadow:
      '0 25px 70px rgba(0,0,0,0.2)',
  },

  modalHeader: {
    display: 'flex',
    justifyContent:
      'space-between',
    alignItems: 'center',
    gap: 15,
  },

  closeButton: {
    width: 34,
    height: 34,
    border: 'none',
    borderRadius: '50%',
    background: '#f1f5f3',
    cursor: 'pointer',
    fontSize: 20,
  },

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
    border:
      '1px solid #d8e2dc',
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

  secondaryButton: {
    height: 43,
    border:
      '1px solid #d8e2dc',
    borderRadius: 11,
    background: '#ffffff',
    color: '#078b4a',
    fontSize: 13,
    fontWeight: 750,
    cursor: 'pointer',
    padding: '0 16px',
    marginTop: 13,
  },

  infoBox: {
    background: '#effbf5',
    border:
      '1px solid #dcefe5',
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
    border:
      '1px solid #dcefe5',
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
    justifyContent:
      'space-between',
    alignItems: 'center',
    gap: 15,
    padding: '14px 0',
    borderBottom:
      '1px solid #edf2ef',
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

  closeOverlay: {
    position: 'fixed',
    inset: 0,
    background:
      'rgba(10, 20, 16, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 200,
  },

  closeModal: {
    width: 'min(420px, 100%)',
    background: '#ffffff',
    borderRadius: 22,
    padding: 24,
    textAlign: 'center',
  },

  warningIcon: {
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
  },

  cancelButton: {
    flex: 1,
    height: 48,
    border:
      '1px solid #d8e1dc',
    borderRadius: 13,
    background: '#ffffff',
    color: '#34443c',
    fontWeight: 700,
    cursor: 'pointer',
  },

  dangerButton: {
    flex: 1,
    height: 48,
    border: 'none',
    borderRadius: 13,
    background: '#d92d20',
    color: '#ffffff',
    fontWeight: 700,
    cursor: 'pointer',
  },
};

export default Settings;
