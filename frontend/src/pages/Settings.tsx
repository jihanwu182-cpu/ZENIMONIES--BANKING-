import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

type SectionId =
  | 'profile'
  | 'payments'
  | 'login'
  | 'security'
  | 'saving'
  | 'sms'
  | 'themes'
  | 'feedback'
  | 'about'
  | 'logout'
  | 'close';

type SettingItemProps = {
  icon: string;
  title: string;
  description: string;
  onClick?: () => void;
  danger?: boolean;
  badge?: string;
};

type ToggleRowProps = {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

const GREEN = '#087F43';
const GREEN_LIGHT = '#ECF8F2';
const TEXT = '#10231A';
const MUTED = '#718078';
const BORDER = '#E1ECE6';
const BG = '#F4F8F6';
const DANGER = '#D92D20';

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  description,
  onClick,
  danger = false,
  badge,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        border: `1px solid ${danger ? '#F3D8D5' : BORDER}`,
        background: '#FFFFFF',
        borderRadius: 18,
        padding: '15px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        textAlign: 'left',
        cursor: 'pointer',
        marginBottom: 10,
        boxSizing: 'border-box',
        transition: 'all .18s ease',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          borderRadius: 14,
          background: danger ? '#FFF1F0' : GREEN_LIGHT,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: danger ? DANGER : TEXT,
            }}
          >
            {title}
          </span>

          {badge && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: GREEN,
                background: GREEN_LIGHT,
                borderRadius: 999,
                padding: '4px 7px',
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <div
          style={{
            fontSize: 12,
            lineHeight: 1.45,
            color: MUTED,
          }}
        >
          {description}
        </div>
      </div>

      <div
        style={{
          color: danger ? '#B7C1BC' : '#9AA8A1',
          fontSize: 22,
          lineHeight: 1,
        }}
      >
        ›
      </div>
    </button>
  );
};

const ToggleRow: React.FC<ToggleRowProps> = ({
  title,
  description,
  checked,
  onChange,
}) => {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1px solid ${BORDER}`,
        borderRadius: 17,
        padding: 15,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 10,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: TEXT,
            fontSize: 14,
            fontWeight: 800,
            marginBottom: 4,
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: MUTED,
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          {description}
        </div>
      </div>

      <button
        type="button"
        aria-label={title}
        onClick={() => onChange(!checked)}
        style={{
          width: 50,
          height: 30,
          borderRadius: 999,
          border: 'none',
          background: checked ? GREEN : '#CBD5D0',
          padding: 3,
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all .2s ease',
        }}
      >
        <span
          style={{
            display: 'block',
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#FFFFFF',
            transform: checked ? 'translateX(20px)' : 'translateX(0)',
            transition: 'transform .2s ease',
            boxShadow: '0 2px 5px rgba(0,0,0,.14)',
          }}
        />
      </button>
    </div>
  );
};

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const [activeSection, setActiveSection] = useState<SectionId | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const [transactionSmsAlerts, setTransactionSmsAlerts] = useState(true);
  const [securitySmsAlerts, setSecuritySmsAlerts] = useState(true);
  const [promotionalSmsAlerts, setPromotionalSmsAlerts] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);

  const [passcodeExists, setPasscodeExists] = useState(false);
  const [passcodeLoading, setPasscodeLoading] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [currentPasscode, setCurrentPasscode] = useState('');

  const [transactionPinExists, setTransactionPinExists] = useState(false);
  const [transactionPinLoading, setTransactionPinLoading] = useState(false);
  const [transactionPin, setTransactionPin] = useState('');
  const [confirmTransactionPin, setConfirmTransactionPin] = useState('');
  const [currentTransactionPin, setCurrentTransactionPin] = useState('');
  const [pinFailedAttempts, setPinFailedAttempts] = useState(0);
  const [pinRemainingAttempts, setPinRemainingAttempts] = useState(0);
  const [pinLockedUntil, setPinLockedUntil] = useState<string | null>(null);

  const [spendSaveEnabled, setSpendSaveEnabled] = useState(false);
  const [spendSaveAmount, setSpendSaveAmount] = useState('');
  const [savingLoading, setSavingLoading] = useState(false);

  const [actionMessage, setActionMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const token = useMemo(
    () =>
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token') ||
      '',
    []
  );

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }),
    [token]
  );

  const showMessage = (message: string) => {
    setActionMessage(message);
    setErrorMessage('');
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setActionMessage('');
  };

  const closeModal = () => {
    setActiveSection(null);
    setActionMessage('');
    setErrorMessage('');
  };

  useEffect(() => {
    const loadSmsPreferences = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE}/sms-preferences`, {
          headers: authHeaders,
        });

        if (!response.ok) return;

        const data = await response.json();

        const preferences =
          data?.preferences ||
          data?.data ||
          data;

        if (typeof preferences?.transactionSmsAlerts === 'boolean') {
          setTransactionSmsAlerts(preferences.transactionSmsAlerts);
        }

        if (typeof preferences?.transaction_sms_alerts === 'boolean') {
          setTransactionSmsAlerts(preferences.transaction_sms_alerts);
        }

        if (typeof preferences?.securitySmsAlerts === 'boolean') {
          setSecuritySmsAlerts(preferences.securitySmsAlerts);
        }

        if (typeof preferences?.security_sms_alerts === 'boolean') {
          setSecuritySmsAlerts(preferences.security_sms_alerts);
        }

        if (typeof preferences?.promotionalSmsAlerts === 'boolean') {
          setPromotionalSmsAlerts(preferences.promotionalSmsAlerts);
        }

        if (typeof preferences?.promotional_sms_alerts === 'boolean') {
          setPromotionalSmsAlerts(preferences.promotional_sms_alerts);
        }
      } catch (error) {
        console.error('Unable to load SMS preferences:', error);
      }
    };

    loadSmsPreferences();
  }, [token, authHeaders]);

  useEffect(() => {
    const loadPasscodeStatus = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE}/passcode/status`, {
          headers: authHeaders,
        });

        if (!response.ok) return;

        const data = await response.json();

        const exists =
          data?.hasPasscode ??
          data?.passcodeSet ??
          data?.passcode_exists ??
          data?.exists ??
          false;

        setPasscodeExists(Boolean(exists));
      } catch (error) {
        console.error('Unable to load passcode status:', error);
      }
    };

    loadPasscodeStatus();
  }, [token, authHeaders]);

  useEffect(() => {
    const loadTransactionPinStatus = async () => {
      if (!token) return;

      try {
        const response = await fetch(
          `${API_BASE}/transaction-pin/status`,
          {
            headers: authHeaders,
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        const exists =
          data?.hasPin ??
          data?.pinSet ??
          data?.pin_exists ??
          data?.exists ??
          false;

        setTransactionPinExists(Boolean(exists));

        setPinFailedAttempts(
          Number(
            data?.failedAttempts ??
              data?.failed_attempts ??
              0
          )
        );

        setPinRemainingAttempts(
          Number(
            data?.remainingAttempts ??
              data?.remaining_attempts ??
              0
          )
        );

        setPinLockedUntil(
          data?.lockedUntil ??
            data?.locked_until ??
            null
        );
      } catch (error) {
        console.error('Unable to load transaction PIN status:', error);
      }
    };

    loadTransactionPinStatus();
  }, [token, authHeaders]);

  useEffect(() => {
    const loadSavingSettings = async () => {
      if (!token) return;

      try {
        const response = await fetch(`${API_BASE}/wallet/settings`, {
          headers: authHeaders,
        });

        if (!response.ok) return;

        const data = await response.json();

        const settings =
          data?.settings ||
          data?.data ||
          data;

        setSpendSaveEnabled(
          Boolean(
            settings?.enabled ??
              settings?.spendSaveEnabled ??
              settings?.spend_save_enabled ??
              false
          )
        );

        const amount =
          settings?.amount ??
          settings?.spendSaveAmount ??
          settings?.spend_save_amount ??
          '';

        setSpendSaveAmount(
          amount !== null && amount !== undefined
            ? String(amount)
            : ''
        );
      } catch (error) {
        console.error('Unable to load Save Wallet settings:', error);
      }
    };

    loadSavingSettings();
  }, [token, authHeaders]);

  const saveSmsPreferences = async () => {
    setSmsLoading(true);
    setActionMessage('');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE}/sms-preferences`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          transactionSmsAlerts,
          securitySmsAlerts,
          promotionalSmsAlerts,

          // Preserve backend-compatible snake_case names too.
          transaction_sms_alerts: transactionSmsAlerts,
          security_sms_alerts: securitySmsAlerts,
          promotional_sms_alerts: promotionalSmsAlerts,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || 'Unable to save SMS preferences.'
        );
      }

      showMessage('SMS preferences saved successfully.');
    } catch (error: any) {
      showError(
        error?.message || 'Unable to save SMS preferences.'
      );
    } finally {
      setSmsLoading(false);
    }
  };

  const setupPasscode = async () => {
    if (!/^\d{6}$/.test(passcode)) {
      showError('Your unlock passcode must contain exactly 6 digits.');
      return;
    }

    if (passcode !== confirmPasscode) {
      showError('The passcodes do not match.');
      return;
    }

    setPasscodeLoading(true);

    try {
      const response = await fetch(`${API_BASE}/passcode/setup`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          passcode,
          confirm_passcode: confirmPasscode,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || 'Unable to set your unlock passcode.'
        );
      }

      setPasscodeExists(true);
      setPasscode('');
      setConfirmPasscode('');

      showMessage('Account unlock passcode created successfully.');
    } catch (error: any) {
      showError(
        error?.message || 'Unable to set your unlock passcode.'
      );
    } finally {
      setPasscodeLoading(false);
    }
  };

  const changePasscode = async () => {
    if (!/^\d{6}$/.test(currentPasscode)) {
      showError('Enter your current 6-digit passcode.');
      return;
    }

    if (!/^\d{6}$/.test(passcode)) {
      showError('Your new passcode must contain exactly 6 digits.');
      return;
    }

    if (passcode !== confirmPasscode) {
      showError('The new passcodes do not match.');
      return;
    }

    setPasscodeLoading(true);

    try {
      const response = await fetch(`${API_BASE}/passcode/change`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          current_passcode: currentPasscode,
          new_passcode: passcode,
          confirm_passcode: confirmPasscode,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || 'Unable to change your unlock passcode.'
        );
      }

      setCurrentPasscode('');
      setPasscode('');
      setConfirmPasscode('');

      showMessage('Account unlock passcode changed successfully.');
    } catch (error: any) {
      showError(
        error?.message || 'Unable to change your unlock passcode.'
      );
    } finally {
      setPasscodeLoading(false);
    }
  };

  const setupTransactionPin = async () => {
    if (!/^\d{4}$/.test(transactionPin)) {
      showError('Your Transaction PIN must contain exactly 4 digits.');
      return;
    }

    if (transactionPin !== confirmTransactionPin) {
      showError('The Transaction PINs do not match.');
      return;
    }

    setTransactionPinLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/transaction-pin/setup`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            pin: transactionPin,
            confirmPin: confirmTransactionPin,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || 'Unable to create your Transaction PIN.'
        );
      }

      setTransactionPinExists(true);
      setTransactionPin('');
      setConfirmTransactionPin('');

      showMessage('Transaction PIN created successfully.');
    } catch (error: any) {
      showError(
        error?.message || 'Unable to create your Transaction PIN.'
      );
    } finally {
      setTransactionPinLoading(false);
    }
  };

  const changeTransactionPin = async () => {
    if (!/^\d{4}$/.test(currentTransactionPin)) {
      showError('Enter your current 4-digit Transaction PIN.');
      return;
    }

    if (!/^\d{4}$/.test(transactionPin)) {
      showError('Your new Transaction PIN must contain exactly 4 digits.');
      return;
    }

    if (transactionPin !== confirmTransactionPin) {
      showError('The new Transaction PINs do not match.');
      return;
    }

    setTransactionPinLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/transaction-pin/change`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            currentPin: currentTransactionPin,
            newPin: transactionPin,
            confirmPin: confirmTransactionPin,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || 'Unable to change your Transaction PIN.'
        );
      }

      setCurrentTransactionPin('');
      setTransactionPin('');
      setConfirmTransactionPin('');

      showMessage('Transaction PIN changed successfully.');
    } catch (error: any) {
      showError(
        error?.message || 'Unable to change your Transaction PIN.'
      );
    } finally {
      setTransactionPinLoading(false);
    }
  };

  const saveSpendSaveSettings = async () => {
    const amount = Number(spendSaveAmount);

    if (spendSaveEnabled && (!Number.isFinite(amount) || amount <= 0)) {
      showError('Enter a valid amount for Spend + Save.');
      return;
    }

    setSavingLoading(true);

    try {
      const response = await fetch(`${API_BASE}/wallet/settings`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          enabled: spendSaveEnabled,
          amount: spendSaveEnabled ? amount : 0,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.message || 'Unable to save your saving settings.'
        );
      }

      showMessage('Save Wallet settings updated successfully.');
    } catch (error: any) {
      showError(
        error?.message || 'Unable to update Save Wallet settings.'
      );
    } finally {
      setSavingLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('zenimonies_token');
    localStorage.removeItem('token');
    localStorage.removeItem('zenimonies_user');
    localStorage.removeItem('zenimonies_accounts');

    sessionStorage.removeItem('zenimonies_otp_email');
    sessionStorage.removeItem('zenimonies_otp_token');
    sessionStorage.removeItem('zenimonies_account_locked');
    sessionStorage.removeItem('zenimonies_passkey_fallback');

    navigate('/login', { replace: true });
  };

  const handleCloseAccount = () => {
    showMessage(
      'Close Account is not connected to the account-management backend yet. Your account has not been closed.'
    );
  };

  const handleFeedback = () => {
    showMessage(
      'Feedback submission will be connected to the Support system after the database upgrade.'
    );
  };

  const renderNotice = () => {
    if (!actionMessage && !errorMessage) return null;

    const success = Boolean(actionMessage);

    return (
      <div
        style={{
          marginBottom: 15,
          borderRadius: 14,
          padding: '12px 13px',
          background: success ? GREEN_LIGHT : '#FFF1F0',
          border: `1px solid ${
            success ? '#CDEADB' : '#F3D8D5'
          }`,
          color: success ? GREEN : DANGER,
          fontSize: 13,
          lineHeight: 1.45,
          fontWeight: 700,
        }}
      >
        {success ? actionMessage : errorMessage}
      </div>
    );
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 48,
    borderRadius: 13,
    border: `1px solid ${BORDER}`,
    background: '#FFFFFF',
    padding: '0 14px',
    boxSizing: 'border-box',
    color: TEXT,
    fontSize: 15,
    outline: 'none',
  };

  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    border: 'none',
    borderRadius: 14,
    background: GREEN,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    padding: '0 16px',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    border: `1px solid ${BORDER}`,
    borderRadius: 14,
    background: '#FFFFFF',
    color: TEXT,
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    padding: '0 16px',
  };

  const renderModalContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <>
            <ModalHeader
              title="My Profile"
              subtitle="View and manage your personal account details."
              onClose={closeModal}
            />

            <div
              style={{
                background: GREEN_LIGHT,
                borderRadius: 18,
                padding: 16,
                marginBottom: 15,
              }}
            >
              <div style={{ fontSize: 12, color: GREEN, fontWeight: 800 }}>
                ACCOUNT PROFILE
              </div>

              <div
                style={{
                  marginTop: 7,
                  fontSize: 13,
                  color: MUTED,
                  lineHeight: 1.5,
                }}
              >
                Your registered personal information is managed securely
                through your ZENIMONIES account.
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/profile')}
              style={primaryButtonStyle}
            >
              Open My Profile
            </button>
          </>
        );

      case 'payments':
        return (
          <>
            <ModalHeader
              title="Payment Settings"
              subtitle="Manage your payment and transaction preferences."
              onClose={closeModal}
            />

            <SettingMini
              icon="💳"
              title="Transaction PIN"
              description={
                transactionPinExists
                  ? 'Your 4-digit Transaction PIN is active.'
                  : 'Create a Transaction PIN before making protected transactions.'
              }
            />

            <button
              type="button"
              onClick={() => setActiveSection('security')}
              style={primaryButtonStyle}
            >
              Manage Transaction PIN
            </button>
          </>
        );

      case 'login':
        return (
          <>
            <ModalHeader
              title="Login & Security"
              subtitle="Protect access to your ZENIMONIES account."
              onClose={closeModal}
            />

            <SettingMini
              icon="🔐"
              title="Account Unlock Passcode"
              description={
                passcodeExists
                  ? 'Your 6-digit account unlock passcode is active.'
                  : 'Set a 6-digit passcode for account unlock fallback.'
              }
            />

            <button
              type="button"
              onClick={() => setActiveSection('security')}
              style={primaryButtonStyle}
            >
              Manage Security
            </button>
          </>
        );

      case 'security':
        return (
          <>
            <ModalHeader
              title="Security"
              subtitle="Manage your security credentials."
              onClose={closeModal}
            />

            {renderNotice()}

            <div
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 18,
                padding: 15,
                marginBottom: 14,
                background: '#FFFFFF',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 13,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: GREEN_LIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  🔓
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: TEXT,
                    }}
                  >
                    Account Unlock Passcode
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      marginTop: 2,
                    }}
                  >
                    6-digit security passcode
                  </div>
                </div>
              </div>

              {passcodeExists && (
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Current passcode"
                  value={currentPasscode}
                  onChange={(event) =>
                    setCurrentPasscode(
                      event.target.value.replace(/\D/g, '')
                    )
                  }
                  style={{ ...inputStyle, marginBottom: 9 }}
                />
              )}

              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder={
                  passcodeExists
                    ? 'New 6-digit passcode'
                    : '6-digit passcode'
                }
                value={passcode}
                onChange={(event) =>
                  setPasscode(
                    event.target.value.replace(/\D/g, '')
                  )
                }
                style={{ ...inputStyle, marginBottom: 9 }}
              />

              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                placeholder="Confirm passcode"
                value={confirmPasscode}
                onChange={(event) =>
                  setConfirmPasscode(
                    event.target.value.replace(/\D/g, '')
                  )
                }
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <button
                type="button"
                disabled={passcodeLoading}
                onClick={
                  passcodeExists
                    ? changePasscode
                    : setupPasscode
                }
                style={{
                  ...primaryButtonStyle,
                  opacity: passcodeLoading ? 0.65 : 1,
                }}
              >
                {passcodeLoading
                  ? 'Please wait...'
                  : passcodeExists
                  ? 'Change Unlock Passcode'
                  : 'Create Unlock Passcode'}
              </button>
            </div>

            <div
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 18,
                padding: 15,
                background: '#FFFFFF',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 13,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: GREEN_LIGHT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  🔢
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: TEXT,
                    }}
                  >
                    Transaction PIN
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: MUTED,
                      marginTop: 2,
                    }}
                  >
                    4-digit PIN for protected transactions
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: transactionPinExists ? GREEN : '#9A6A00',
                    background: transactionPinExists
                      ? GREEN_LIGHT
                      : '#FFF7E6',
                    padding: '5px 7px',
                    borderRadius: 999,
                  }}
                >
                  {transactionPinExists ? 'ACTIVE' : 'NOT SET'}
                </div>
              </div>

              {pinLockedUntil && (
                <div
                  style={{
                    background: '#FFF1F0',
                    color: DANGER,
                    borderRadius: 12,
                    padding: 10,
                    marginBottom: 10,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Transaction PIN access is temporarily locked.
                </div>
              )}

              {transactionPinExists && (
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Current PIN"
                  value={currentTransactionPin}
                  onChange={(event) =>
                    setCurrentTransactionPin(
                      event.target.value.replace(/\D/g, '')
                    )
                  }
                  style={{ ...inputStyle, marginBottom: 9 }}
                />
              )}

              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder={
                  transactionPinExists
                    ? 'New 4-digit PIN'
                    : '4-digit Transaction PIN'
                }
                value={transactionPin}
                onChange={(event) =>
                  setTransactionPin(
                    event.target.value.replace(/\D/g, '')
                  )
                }
                style={{ ...inputStyle, marginBottom: 9 }}
              />

              <input
                type="password"
                inputMode="numeric"
                maxLength={4}
                placeholder="Confirm PIN"
                value={confirmTransactionPin}
                onChange={(event) =>
                  setConfirmTransactionPin(
                    event.target.value.replace(/\D/g, '')
                  )
                }
                style={{ ...inputStyle, marginBottom: 10 }}
              />

              <button
                type="button"
                disabled={transactionPinLoading}
                onClick={
                  transactionPinExists
                    ? changeTransactionPin
                    : setupTransactionPin
                }
                style={{
                  ...primaryButtonStyle,
                  opacity: transactionPinLoading ? 0.65 : 1,
                }}
              >
                {transactionPinLoading
                  ? 'Please wait...'
                  : transactionPinExists
                  ? 'Change Transaction PIN'
                  : 'Create Transaction PIN'}
              </button>

              {transactionPinExists &&
                pinFailedAttempts > 0 && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 11,
                      color: MUTED,
                      textAlign: 'center',
                    }}
                  >
                    Failed attempts: {pinFailedAttempts}
                    {pinRemainingAttempts > 0
                      ? ` • ${pinRemainingAttempts} remaining`
                      : ''}
                  </div>
                )}
            </div>
          </>
        );

      case 'saving':
        return (
          <>
            <ModalHeader
              title="Save Wallet"
              subtitle="Automatically save a fixed amount when eligible transfers succeed."
              onClose={closeModal}
            />

            {renderNotice()}

            <div
              style={{
                background: GREEN_LIGHT,
                borderRadius: 18,
                padding: 16,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                  }}
                >
                  💰
                </div>

                <div>
                  <div
                    style={{
                      color: GREEN,
                      fontSize: 15,
                      fontWeight: 900,
                    }}
                  >
                    Spend + Save
                  </div>

                  <div
                    style={{
                      color: '#4F665A',
                      fontSize: 12,
                      marginTop: 3,
                    }}
                  >
                    Build your Save Wallet automatically.
                  </div>
                </div>
              </div>
            </div>

            <ToggleRow
              title="Enable Spend + Save"
              description="Automatically move your selected amount into Save Wallet after an eligible successful transfer."
              checked={spendSaveEnabled}
              onChange={setSpendSaveEnabled}
            />

            <div
              style={{
                background: '#FFFFFF',
                border: `1px solid ${BORDER}`,
                borderRadius: 17,
                padding: 15,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: TEXT,
                  marginBottom: 7,
                }}
              >
                Amount to save
              </div>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 100"
                value={spendSaveAmount}
                onChange={(event) =>
                  setSpendSaveAmount(event.target.value)
                }
                style={inputStyle}
              />

              <div
                style={{
                  marginTop: 7,
                  fontSize: 11,
                  color: MUTED,
                }}
              >
                Enter the fixed NGN amount you want saved.
              </div>
            </div>

            <button
              type="button"
              disabled={savingLoading}
              onClick={saveSpendSaveSettings}
              style={{
                ...primaryButtonStyle,
                opacity: savingLoading ? 0.65 : 1,
              }}
            >
              {savingLoading
                ? 'Saving...'
                : 'Save Wallet Settings'}
            </button>
          </>
        );

      case 'sms':
        return (
          <>
            <ModalHeader
              title="SMS Alerts"
              subtitle="Choose the SMS notifications you want to receive."
              onClose={closeModal}
            />

            {renderNotice()}

            <ToggleRow
              title="Transaction Alerts"
              description="Receive SMS alerts for important account transactions."
              checked={transactionSmsAlerts}
              onChange={setTransactionSmsAlerts}
            />

            <ToggleRow
              title="Security Alerts"
              description="Receive security-related account notifications."
              checked={securitySmsAlerts}
              onChange={setSecuritySmsAlerts}
            />

            <ToggleRow
              title="Promotional Alerts"
              description="Receive promotional and product-related messages."
              checked={promotionalSmsAlerts}
              onChange={setPromotionalSmsAlerts}
            />

            <button
              type="button"
              disabled={smsLoading}
              onClick={saveSmsPreferences}
              style={{
                ...primaryButtonStyle,
                opacity: smsLoading ? 0.65 : 1,
              }}
            >
              {smsLoading ? 'Saving...' : 'Save SMS Preferences'}
            </button>
          </>
        );

      case 'themes':
        return (
          <>
            <ModalHeader
              title="Themes"
              subtitle="Choose your preferred appearance for this settings view."
              onClose={closeModal}
            />

            <ToggleRow
              title="Dark Mode"
              description="Switch the Settings appearance to a darker theme."
              checked={darkMode}
              onChange={setDarkMode}
            />

            <div
              style={{
                marginTop: 4,
                background: '#F8FBF9',
                borderRadius: 15,
                padding: 13,
                color: MUTED,
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              Theme preference is currently stored locally on this device.
            </div>
          </>
        );

      case 'feedback':
        return (
          <>
            <ModalHeader
              title="Feedback & Suggestions"
              subtitle="Tell us how we can improve your ZENIMONIES experience."
              onClose={closeModal}
            />

            {renderNotice()}

            <button
              type="button"
              onClick={handleFeedback}
              style={primaryButtonStyle}
            >
              Continue
            </button>
          </>
        );

      case 'about':
        return (
          <>
            <ModalHeader
              title="About ZENIMONIES"
              subtitle="Secure digital banking."
              onClose={closeModal}
            />

            <div
              style={{
                textAlign: 'center',
                padding: '12px 5px 20px',
              }}
            >
              <div
                style={{
                  width: 70,
                  height: 70,
                  margin: '0 auto 13px',
                  borderRadius: 22,
                  background: GREEN,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 27,
                  fontWeight: 900,
                }}
              >
                Z
              </div>

              <div
                style={{
                  color: TEXT,
                  fontSize: 20,
                  fontWeight: 900,
                }}
              >
                ZENIMONIES
              </div>

              <div
                style={{
                  color: MUTED,
                  fontSize: 12,
                  marginTop: 5,
                }}
              >
                Secure Digital Banking
              </div>
            </div>

            <div
              style={{
                borderTop: `1px solid ${BORDER}`,
                paddingTop: 14,
                textAlign: 'center',
                color: MUTED,
                fontSize: 11,
                lineHeight: 1.6,
              }}
            >
              Your security and privacy remain a priority.
            </div>
          </>
        );

      case 'logout':
        return (
          <>
            <ModalHeader
              title="Log Out"
              subtitle="Sign out of your ZENIMONIES account on this device."
              onClose={closeModal}
            />

            <div
              style={{
                background: '#FFF7E6',
                border: '1px solid #F0E0B9',
                color: '#765B1C',
                borderRadius: 15,
                padding: 13,
                fontSize: 12,
                lineHeight: 1.5,
                marginBottom: 15,
              }}
            >
              You will need to sign in again to access your account.
            </div>

            <button
              type="button"
              onClick={logout}
              style={{
                ...primaryButtonStyle,
                background: DANGER,
              }}
            >
              Log Out
            </button>
          </>
        );

      case 'close':
        return (
          <>
            <ModalHeader
              title="Close Account"
              subtitle="Request closure of your ZENIMONIES account."
              onClose={closeModal}
            />

            {renderNotice()}

            <div
              style={{
                background: '#FFF1F0',
                border: '1px solid #F3D8D5',
                color: '#7A241D',
                borderRadius: 16,
                padding: 14,
                fontSize: 12,
                lineHeight: 1.55,
                marginBottom: 15,
              }}
            >
              Closing an account is a sensitive action. The account
              closure workflow has not yet been connected to the
              account-management backend.
            </div>

            <button
              type="button"
              onClick={handleCloseAccount}
              style={{
                ...primaryButtonStyle,
                background: DANGER,
              }}
            >
              Continue
            </button>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        color: TEXT,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 620,
          margin: '0 auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: GREEN,
            color: '#FFFFFF',
            padding: '22px 18px 24px',
            borderBottomLeftRadius: 28,
            borderBottomRightRadius: 28,
            boxShadow: '0 5px 18px rgba(8,127,67,.12)',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              border: 'none',
              background: 'rgba(255,255,255,.12)',
              color: '#FFFFFF',
              width: 38,
              height: 38,
              borderRadius: 12,
              fontSize: 22,
              cursor: 'pointer',
              marginBottom: 17,
            }}
            aria-label="Go back"
          >
            ‹
          </button>

          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '.08em',
              opacity: .78,
            }}
          >
            ZENIMONIES
          </div>

          <h1
            style={{
              margin: '6px 0 5px',
              fontSize: 28,
              lineHeight: 1.15,
              fontWeight: 900,
            }}
          >
            Account Settings
          </h1>

          <p
            style={{
              margin: 0,
              maxWidth: 500,
              fontSize: 13,
              lineHeight: 1.5,
              color: 'rgba(255,255,255,.82)',
            }}
          >
            Manage your profile, payments, security, Save Wallet and
            account preferences.
          </p>
        </div>

        <main style={{ padding: '18px 15px 0' }}>
          <SectionTitle title="Account" />

          <SettingItem
            icon="👤"
            title="My Profile"
            description="View and manage your personal account information."
            onClick={() => setActiveSection('profile')}
          />

          <SectionTitle title="Payments" />

          <SettingItem
            icon="💳"
            title="Payment Settings"
            description="Manage payment and transaction preferences."
            onClick={() => setActiveSection('payments')}
          />

          <SectionTitle title="Login & Security" />

          <SettingItem
            icon="🔐"
            title="Login & Security"
            description="Manage your account unlock passcode and Transaction PIN."
            onClick={() => setActiveSection('login')}
            badge={passcodeExists && transactionPinExists ? 'SECURED' : undefined}
          />

          <SettingItem
            icon="🛡️"
            title="Security Center"
            description="Review important security information for your account."
            onClick={() => setActiveSection('security')}
          />

          <SettingItem
            icon="❓"
            title="Security Question"
            description="Manage your account security question."
            onClick={() =>
              showMessage(
                'Security Question management is being connected to the secure account system.'
              )
            }
          />

          <SectionTitle title="Savings" />

          <SettingItem
            icon="💰"
            title="Save Wallet"
            description="Manage Spend + Save and your automatic savings amount."
            onClick={() => setActiveSection('saving')}
            badge={spendSaveEnabled ? 'ACTIVE' : undefined}
          />

          <SectionTitle title="Preferences" />

          <SettingItem
            icon="📱"
            title="SMS Alert Settings"
            description="Choose which account alerts you receive by SMS."
            onClick={() => setActiveSection('sms')}
          />

          <SettingItem
            icon="🎨"
            title="Themes"
            description="Choose your preferred appearance."
            onClick={() => setActiveSection('themes')}
          />

          <SectionTitle title="Support" />

          <SettingItem
            icon="💬"
            title="Feedback & Suggestions"
            description="Share feedback to help us improve ZENIMONIES."
            onClick={() => setActiveSection('feedback')}
          />

          <SettingItem
            icon="ℹ️"
            title="About ZENIMONIES"
            description="Learn more about ZENIMONIES Banking."
            onClick={() => setActiveSection('about')}
          />

          <SectionTitle title="Account Actions" />

          <SettingItem
            icon="↪️"
            title="Log Out"
            description="Sign out securely from this device."
            onClick={() => setActiveSection('logout')}
          />

          <SettingItem
            icon="⚠️"
            title="Close Account"
            description="Request closure of your ZENIMONIES account."
            onClick={() => setActiveSection('close')}
            danger
          />

          <div
            style={{
              textAlign: 'center',
              padding: '20px 10px 8px',
              color: MUTED,
              fontSize: 11,
            }}
          >
            ZENIMONIES • Secure Digital Banking
          </div>
        </main>
      </div>

      {/* Modal / Bottom Sheet */}
      {activeSection && (
        <div
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(16,35,26,.42)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 0,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              maxHeight: '92vh',
              overflowY: 'auto',
              background: '#F8FBF9',
              borderTopLeftRadius: 27,
              borderTopRightRadius: 27,
              padding: '10px 16px 24px',
              boxSizing: 'border-box',
              boxShadow: '0 -10px 40px rgba(0,0,0,.16)',
            }}
          >
            <div
              style={{
                width: 42,
                height: 4,
                borderRadius: 999,
                background: '#CBD7D1',
                margin: '0 auto 14px',
              }}
            />

            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
};

const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      margin: '18px 4px 10px',
      fontSize: 11,
      fontWeight: 900,
      letterSpacing: '.08em',
      color: '#718078',
      textTransform: 'uppercase',
    }}
  >
    {title}
  </div>
);

const ModalHeader: React.FC<{
  title: string;
  subtitle: string;
  onClose: () => void;
}> = ({ title, subtitle, onClose }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '2px 0 18px',
    }}
  >
    <div style={{ flex: 1 }}>
      <h2
        style={{
          margin: 0,
          color: '#10231A',
          fontSize: 21,
          fontWeight: 900,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          margin: '5px 0 0',
          color: '#718078',
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        {subtitle}
      </p>
    </div>

    <button
      type="button"
      onClick={onClose}
      style={{
        width: 38,
        height: 38,
        borderRadius: 12,
        border: '1px solid #E1ECE6',
        background: '#FFFFFF',
        color: '#10231A',
        fontSize: 21,
        cursor: 'pointer',
        flexShrink: 0,
      }}
      aria-label="Close"
    >
      ×
    </button>
  </div>
);

const SettingMini: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div
    style={{
      background: '#FFFFFF',
      border: '1px solid #E1ECE6',
      borderRadius: 17,
      padding: 14,
      display: 'flex',
      gap: 11,
      alignItems: 'center',
      marginBottom: 13,
    }}
  >
    <div
      style={{
        width: 42,
        height: 42,
        minWidth: 42,
        borderRadius: 13,
        background: '#ECF8F2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 19,
      }}
    >
      {icon}
    </div>

    <div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          color: '#10231A',
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 11,
          color: '#718078',
          lineHeight: 1.4,
          marginTop: 3,
        }}
      >
        {description}
      </div>
    </div>
  </div>
);

export default Settings;
