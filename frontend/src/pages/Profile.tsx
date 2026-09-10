import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id?: number | string;
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  dob?: string;
  address?: string;
  residential_address?: string;
  city?: string;
  state?: string;
  country?: string;
  role?: string;
  status?: string;

  /*
   * KYC fields
   *
   * IMPORTANT:
   * kyc_tier alone does NOT mean the user is verified.
   * Actual verification comes from kyc_status.
   */
  kyc_status?: string;
  kyc_tier?: number;
  tier?: number;

  /*
   * This is separate from KYC.
   * It may represent phone/email/account verification.
   */
  is_verified?: boolean;

  bvn_verified?: boolean;
  id_verified?: boolean;
  tier_3_verified?: boolean;
  tier_3_method?: string;

  account_limit?: number;
  daily_transfer_limit?: number;
  daily_transfer_used?: number;
  daily_transfer_reset_at?: string;
  created_at?: string;

  profile_photo?: string;
  avatar?: string;
}

interface Account {
  account_number?: string;
  account_name?: string;
  account_type?: string;
  currency?: string;
  status?: string;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem('zenimonies_user') || 'null'
      );

      const savedAccounts = JSON.parse(
        localStorage.getItem('zenimonies_accounts') || '[]'
      );

      if (!savedUser) {
        navigate('/login');
        return;
      }

      setUser(savedUser);

      setForm({
        email: savedUser.email || '',
        phone: savedUser.phone || '',
        dateOfBirth:
          savedUser.date_of_birth ||
          savedUser.dob ||
          '',
        address:
          savedUser.address ||
          savedUser.residential_address ||
          '',
        city: savedUser.city || '',
        state: savedUser.state || '',
        country: savedUser.country || 'Nigeria',
      });

      if (
        Array.isArray(savedAccounts) &&
        savedAccounts.length > 0
      ) {
        setAccount(savedAccounts[0]);
      }
    } catch (err) {
      console.error('Profile loading error:', err);
      setError('Unable to load your profile.');
    }
  };

  // ============================================================
  // DISPLAY NAME
  // ============================================================

  const displayName = useMemo(() => {
    return (
      user?.full_name ||
      user?.name ||
      `${user?.first_name || ''} ${
        user?.last_name || ''
      }`.trim() ||
      'Zenimonies User'
    );
  }, [user]);

  // ============================================================
  // INITIALS
  // ============================================================

  const initials = useMemo(() => {
    const parts = displayName
      .split(' ')
      .filter(Boolean);

    if (parts.length >= 2) {
      return (
        parts[0][0] +
        parts[parts.length - 1][0]
      ).toUpperCase();
    }

    return displayName
      .slice(0, 2)
      .toUpperCase();
  }, [displayName]);

  // ============================================================
  // KYC VERIFICATION
  //
  // IMPORTANT:
  //
  // kyc_tier DOES NOT automatically mean verified.
  //
  // Tier 1 may simply mean the account is currently at
  // the Tier 1 level or eligible for Tier 1.
  //
  // Actual KYC verification requires the backend to return
  // an approved/verified/completed KYC status.
  //
  // is_verified is deliberately NOT used here because
  // it is separate from KYC verification.
  // ============================================================

  const kycVerified = useMemo(() => {
    const status =
      String(user?.kyc_status || '')
        .toLowerCase()
        .trim();

    return (
      status === 'verified' ||
      status === 'approved' ||
      status === 'completed'
    );
  }, [user]);

  // ============================================================
  // CURRENT KYC TIER
  // ============================================================

  const currentTier = useMemo(() => {
    const tier = Number(
      user?.kyc_tier ??
        user?.tier ??
        0
    );

    if (tier >= 3) return 3;
    if (tier === 2) return 2;
    if (tier === 1) return 1;

    return 0;
  }, [user]);

  // ============================================================
  // KYC STATUS
  // ============================================================

  const normalizedKycStatus = useMemo(() => {
    return String(
      user?.kyc_status || ''
    )
      .toLowerCase()
      .trim();
  }, [user]);

  // ============================================================
  // KYC DISPLAY TEXT
  // ============================================================

  const getKycText = () => {
    /*
     * If the backend has explicitly verified KYC,
     * show the appropriate verified tier.
     */

    if (kycVerified) {
      if (currentTier >= 3) {
        return 'Tier 3 Verified';
      }

      if (currentTier === 2) {
        return 'Tier 2 Verified';
      }

      if (currentTier === 1) {
        return 'Tier 1 Verified';
      }

      return 'KYC Verified';
    }

    /*
     * If KYC has not been verified yet,
     * never display "Verified".
     */

    if (
      normalizedKycStatus === 'pending' ||
      normalizedKycStatus === 'submitted' ||
      normalizedKycStatus === 'processing' ||
      normalizedKycStatus === 'under_review' ||
      normalizedKycStatus === 'review'
    ) {
      if (currentTier >= 1) {
        return `Tier ${currentTier} — KYC Pending`;
      }

      return 'KYC Verification Pending';
    }

    if (
      normalizedKycStatus === 'rejected' ||
      normalizedKycStatus === 'failed'
    ) {
      return 'KYC Verification Failed';
    }

    if (currentTier >= 1) {
      return `Tier ${currentTier} — KYC Not Verified`;
    }

    return 'KYC Verification Required';
  };

  // ============================================================
  // UPDATE FORM FIELD
  // ============================================================

  const updateField = (
    field: keyof typeof form,
    value: string
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ============================================================
  // SAVE PROFILE
  // ============================================================

  const saveProfile = async () => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      /*
       * For now, profile information is stored locally.
       *
       * IMPORTANT:
       * The legal name is deliberately NOT editable here.
       * Once KYC is completed, the verified legal name remains
       * protected from normal profile editing.
       */

      const updatedUser: User = {
        ...(user || {}),
        email: form.email,
        phone: form.phone,
        date_of_birth: form.dateOfBirth,
        address: form.address,
        residential_address: form.address,
        city: form.city,
        state: form.state,
        country: form.country,
      };

      localStorage.setItem(
        'zenimonies_user',
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);
      setEditing(false);

      setMessage(
        'Profile updated successfully.'
      );

      setTimeout(() => {
        setMessage('');
      }, 3500);
    } catch (err) {
      console.error(
        'Profile save error:',
        err
      );

      setError(
        'Unable to save your profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // CANCEL EDITING
  // ============================================================

  const cancelEditing = () => {
    if (!user) return;

    setForm({
      email: user.email || '',
      phone: user.phone || '',
      dateOfBirth:
        user.date_of_birth ||
        user.dob ||
        '',
      address:
        user.address ||
        user.residential_address ||
        '',
      city: user.city || '',
      state: user.state || '',
      country: user.country || 'Nigeria',
    });

    setEditing(false);
    setError('');
    setMessage('');
  };

  // ============================================================
  // MASK ACCOUNT NUMBER
  // ============================================================

  const maskAccountNumber = (
    accountNumber?: string
  ) => {
    if (!accountNumber) {
      return 'Not available';
    }

    if (accountNumber.length <= 4) {
      return accountNumber;
    }

    return `•••• ${accountNumber.slice(-4)}`;
  };

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
        >
          ←
        </button>

        <div style={styles.headerTitle}>
          My Profile
        </div>

        <button
          type="button"
          style={styles.headerHome}
          onClick={() => navigate('/')}
        >
          Home
        </button>

      </header>

      <main style={styles.main}>

        {/* ====================================================
            PROFILE HEADER
        ==================================================== */}

        <section style={styles.profileCard}>

          <div style={styles.avatar}>

            {user?.profile_photo ||
            user?.avatar ? (

              <img
                src={
                  user.profile_photo ||
                  user.avatar
                }
                alt="Profile"
                style={styles.avatarImage}
              />

            ) : (

              initials

            )}

          </div>

          <div style={styles.profileMain}>

            <h1 style={styles.profileName}>
              {displayName}
            </h1>

            <p style={styles.profileEmail}>
              {user?.email ||
                'Email not available'}
            </p>

            <div style={styles.statusRow}>

              <span
                style={{
                  ...styles.statusBadge,

                  ...(kycVerified
                    ? styles.verifiedBadge
                    : styles.pendingBadge),
                }}
              >

                <span>
                  {kycVerified ? '✓' : '!'}
                </span>

                {getKycText()}

              </span>

              {account?.account_number && (
                <span
                  style={styles.accountBadge}
                >
                  Personal Account
                </span>
              )}

            </div>

          </div>

          {!editing && (
            <button
              type="button"
              style={styles.editButton}
              onClick={() => {
                setEditing(true);
                setMessage('');
                setError('');
              }}
            >
              Edit Profile
            </button>
          )}

        </section>

        {/* ====================================================
            MESSAGES
        ==================================================== */}

        {message && (
          <div style={styles.successMessage}>
            ✓ {message}
          </div>
        )}

        {error && (
          <div style={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* ====================================================
            PERSONAL INFORMATION
        ==================================================== */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>

            <div>

              <h2 style={styles.sectionTitle}>
                Personal Information
              </h2>

              <p
                style={styles.sectionDescription}
              >
                Your basic personal information.
              </p>

            </div>

          </div>

          <div style={styles.fieldsGrid}>

            {/* FULL NAME */}

            <div style={styles.field}>

              <label style={styles.label}>
                Full Legal Name
              </label>

              <div
                style={{
                  ...styles.lockedField,

                  ...(kycVerified
                    ? styles.lockedVerified
                    : {}),
                }}
              >

                <span>
                  {displayName}
                </span>

                {kycVerified && (
                  <span
                    style={styles.lockIcon}
                    title="Name locked after KYC verification"
                  >
                    🔒
                  </span>
                )}

              </div>

              {kycVerified && (
                <div style={styles.helperText}>
                  Your legal name is locked because
                  your KYC verification has been
                  completed.
                </div>
              )}

            </div>

            {/* DATE OF BIRTH */}

            <div style={styles.field}>

              <label style={styles.label}>
                Date of Birth
              </label>

              <input
                type="date"
                value={form.dateOfBirth}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'dateOfBirth',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,

                  ...(editing
                    ? styles.inputEditable
                    : styles.inputDisabled),
                }}
              />

            </div>

            {/* EMAIL */}

            <div style={styles.field}>

              <label style={styles.label}>
                Email Address
              </label>

              <input
                type="email"
                value={form.email}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'email',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,

                  ...(editing
                    ? styles.inputEditable
                    : styles.inputDisabled),
                }}
              />

            </div>

            {/* PHONE */}

            <div style={styles.field}>

              <label style={styles.label}>
                Phone Number
              </label>

              <input
                type="tel"
                value={form.phone}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'phone',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,

                  ...(editing
                    ? styles.inputEditable
                    : styles.inputDisabled),
                }}
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            ADDRESS
        ==================================================== */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>

            <div>

              <h2 style={styles.sectionTitle}>
                Residential Address
              </h2>

              <p
                style={styles.sectionDescription}
              >
                Keep your residential information
                up to date.
              </p>

            </div>

          </div>

          <div style={styles.fieldsGrid}>

            <div
              style={{
                ...styles.field,
                gridColumn: '1 / -1',
              }}
            >

              <label style={styles.label}>
                Address
              </label>

              <textarea
                value={form.address}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'address',
                    event.target.value
                  )
                }
                rows={3}
                style={{
                  ...styles.textarea,

                  ...(editing
                    ? styles.inputEditable
                    : styles.inputDisabled),
                }}
              />

            </div>

            {/* CITY */}

            <div style={styles.field}>

              <label style={styles.label}>
                City
              </label>

              <input
                type="text"
                value={form.city}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'city',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,

                  ...(editing
                    ? styles.inputEditable
                    : styles.inputDisabled),
                }}
              />

            </div>

            {/* STATE */}

            <div style={styles.field}>

              <label style={styles.label}>
                State
              </label>

              <input
                type="text"
                value={form.state}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'state',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,

                  ...(editing
                    ? styles.inputEditable
                    : styles.inputDisabled),
                }}
              />

            </div>

            {/* COUNTRY */}

            <div style={styles.field}>

              <label style={styles.label}>
                Country
              </label>

              <input
                type="text"
                value={form.country}
                disabled={!editing}
                onChange={(event) =>
                  updateField(
                    'country',
                    event.target.value
                  )
                }
                style={{
                  ...styles.input,

                  ...(editing
                    ? styles.inputEditable
                    : styles.inputDisabled),
                }}
              />

            </div>

          </div>

        </section>

        {/* ====================================================
            BANK ACCOUNT
        ==================================================== */}

        <section style={styles.section}>

          <div style={styles.sectionHeader}>

            <div>

              <h2 style={styles.sectionTitle}>
                Account Information
              </h2>

              <p
                style={styles.sectionDescription}
              >
                Your Zenimonies account details.
              </p>

            </div>

          </div>

          <div style={styles.accountGrid}>

            <div style={styles.accountItem}>

              <span style={styles.accountLabel}>
                Account Number
              </span>

              <strong style={styles.accountValue}>
                {maskAccountNumber(
                  account?.account_number
                )}
              </strong>

            </div>

            <div style={styles.accountItem}>

              <span style={styles.accountLabel}>
                Account Name
              </span>

              <strong style={styles.accountValue}>
                {account?.account_name ||
                  displayName}
              </strong>

            </div>

            <div style={styles.accountItem}>

              <span style={styles.accountLabel}>
                Account Type
              </span>

              <strong style={styles.accountValue}>
                {account?.account_type ||
                  'Personal Account'}
              </strong>

            </div>

            <div style={styles.accountItem}>

              <span style={styles.accountLabel}>
                Currency
              </span>

              <strong style={styles.accountValue}>
                {account?.currency || 'NGN'}
              </strong>

            </div>

          </div>

        </section>

        {/* ====================================================
            KYC
        ==================================================== */}

        <section
          style={{
            ...styles.kycCard,

            ...(kycVerified
              ? styles.kycVerifiedCard
              : styles.kycPendingCard),
          }}
        >

          <div
            style={{
              ...styles.kycIcon,

              ...(kycVerified
                ? styles.kycVerifiedIcon
                : styles.kycPendingIcon),
            }}
          >
            {kycVerified ? '✓' : '!'}
          </div>

          <div style={styles.kycContent}>

            <h2 style={styles.kycTitle}>
              KYC Verification
            </h2>

            <p style={styles.kycDescription}>

              {kycVerified
                ? `Your account is ${getKycText()}. Your verified legal name is protected from normal profile changes.`
                : currentTier >= 1
                ? `Your account is currently at Tier ${currentTier}, but KYC verification has not been completed. Complete verification to unlock higher account limits and additional services.`
                : 'Complete your KYC verification to unlock higher account limits and additional services.'}

            </p>

          </div>

          <button
            type="button"
            style={styles.kycButton}
            onClick={() => navigate('/kyc')}
          >

            {kycVerified
              ? 'View KYC'
              : 'Verify Now'}

            <span>›</span>

          </button>

        </section>

        {/* ====================================================
            SECURITY NOTICE
        ==================================================== */}

        <section style={styles.securityNotice}>

          <div style={styles.securityIcon}>
            🔒
          </div>

          <div>

            <strong
              style={styles.securityTitle}
            >
              Your information is protected
            </strong>

            <p style={styles.securityText}>
              Passwords, your 6-digit login code,
              transfer PIN and SafeBox settings are
              managed separately under Settings.
            </p>

            <button
              type="button"
              style={styles.settingsLink}
              onClick={() =>
                navigate('/settings')
              }
            >
              Open Settings →
            </button>

          </div>

        </section>

        {/* ====================================================
            EDIT ACTIONS
        ==================================================== */}

        {editing && (

          <div style={styles.editActions}>

            <button
              type="button"
              style={styles.cancelButton}
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="button"
              style={styles.saveButton}
              onClick={saveProfile}
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>

          </div>

        )}

      </main>

      {/* ======================================================
          BOTTOM NAVIGATION
      ====================================================== */}

      <nav style={styles.bottomNav}>

        <button
          type="button"
          style={styles.navItem}
          onClick={() => navigate('/')}
        >
          <span style={styles.navIcon}>
            ⌂
          </span>

          Home
        </button>

        <button
          type="button"
          style={styles.navItem}
          onClick={() =>
            navigate('/transactions')
          }
        >
          <span style={styles.navIcon}>
            ↕
          </span>

          Transactions
        </button>

        <button
          type="button"
          style={styles.navItem}
          onClick={() =>
            navigate('/wallet')
          }
        >
          <span style={styles.navIcon}>
            ▱
          </span>

          Wallet
        </button>

        <button
          type="button"
          style={{
            ...styles.navItem,
            ...styles.navActive,
          }}
          onClick={() =>
            navigate('/profile')
          }
        >
          <span style={styles.navIcon}>
            ♙
          </span>

          Profile

          <span style={styles.navIndicator} />

        </button>

      </nav>

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
    paddingBottom: 95,
  },

  header: {
    height: 64,
    background: '#ffffff',
    borderBottom:
      '1px solid #e5ebe8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 5%',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  backButton: {
    border: 'none',
    background: '#eef8f3',
    color: '#087c43',
    width: 38,
    height: 38,
    borderRadius: 11,
    fontSize: 21,
    cursor: 'pointer',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: 800,
  },

  headerHome: {
    border: 'none',
    background: 'transparent',
    color: '#087c43',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: 13,
  },

  main: {
    width: 'min(920px, 92%)',
    margin: '0 auto',
    paddingTop: 25,
  },

  profileCard: {
    background: '#ffffff',
    border: '1px solid #e5ebe8',
    borderRadius: 20,
    padding: 22,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    boxShadow:
      '0 6px 20px rgba(26,61,47,0.05)',
    marginBottom: 18,
  },

  avatar: {
    width: 76,
    height: 76,
    borderRadius: '50%',
    background: '#dff5e9',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 800,
    flexShrink: 0,
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },

  profileMain: {
    flex: 1,
    minWidth: 0,
  },

  profileName: {
    margin: 0,
    fontSize: 23,
    fontWeight: 800,
  },

  profileEmail: {
    margin: '5px 0 10px',
    color: '#75827d',
    fontSize: 13,
  },

  statusRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },

  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 9px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
  },

  verifiedBadge: {
    background: '#e9f9f0',
    color: '#087c43',
  },

  pendingBadge: {
    background: '#fff7e8',
    color: '#a15c00',
  },

  accountBadge: {
    background: '#f2f5f3',
    color: '#65736d',
    padding: '6px 9px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
  },

  editButton: {
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 11,
    padding: '10px 14px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  successMessage: {
    background: '#eafaf2',
    border: '1px solid #bce8d1',
    color: '#087c43',
    borderRadius: 12,
    padding: '11px 14px',
    marginBottom: 16,
    fontSize: 13,
    fontWeight: 600,
  },

  errorMessage: {
    background: '#fff2f0',
    border: '1px solid #f5c2bd',
    color: '#a53227',
    borderRadius: 12,
    padding: '11px 14px',
    marginBottom: 16,
    fontSize: 13,
  },

  section: {
    background: '#ffffff',
    border: '1px solid #e5ebe8',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
  },

  sectionHeader: {
    marginBottom: 18,
  },

  sectionTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
  },

  sectionDescription: {
    margin: '5px 0 0',
    color: '#7a8781',
    fontSize: 12,
  },

  fieldsGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
  },

  field: {
    minWidth: 0,
  },

  label: {
    display: 'block',
    marginBottom: 7,
    fontSize: 12,
    fontWeight: 700,
    color: '#4e5c55',
  },

  input: {
    width: '100%',
    height: 44,
    boxSizing: 'border-box',
    borderRadius: 10,
    padding: '0 12px',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  },

  inputEditable: {
    border:
      '1px solid #9bd5b9',
    background: '#ffffff',
    color: '#10251d',
  },

  inputDisabled: {
    border:
      '1px solid #e3e9e5',
    background: '#f7f9f8',
    color: '#66736d',
  },

  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 10,
    padding: '11px 12px',
    fontSize: 13,
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },

  lockedField: {
    minHeight: 44,
    boxSizing: 'border-box',
    border:
      '1px solid #e3e9e5',
    background: '#f7f9f8',
    borderRadius: 10,
    padding: '0 12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#66736d',
    fontSize: 13,
  },

  lockedVerified: {
    background: '#f2f7f4',
    border:
      '1px solid #d5e7dc',
    color: '#253b31',
    fontWeight: 700,
  },

  lockIcon: {
    fontSize: 14,
  },

  helperText: {
    marginTop: 6,
    color: '#7a8781',
    fontSize: 10,
    lineHeight: 1.4,
  },

  accountGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 10,
  },

  accountItem: {
    background: '#f7faf8',
    border: '1px solid #e6eee9',
    borderRadius: 12,
    padding: 14,
  },

  accountLabel: {
    display: 'block',
    color: '#7a8781',
    fontSize: 11,
    marginBottom: 5,
  },

  accountValue: {
    display: 'block',
    color: '#17352a',
    fontSize: 13,
  },

  kycCard: {
    borderRadius: 18,
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 13,
    marginBottom: 18,
  },

  kycVerifiedCard: {
    background: '#effbf5',
    border:
      '1px solid #d4eee0',
  },

  kycPendingCard: {
    background: '#fffaf0',
    border:
      '1px solid #f0dfb9',
  },

  kycIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 21,
    fontWeight: 800,
    flexShrink: 0,
  },

  kycVerifiedIcon: {
    background: '#d9f5e7',
    color: '#087c43',
  },

  kycPendingIcon: {
    background: '#ffedc8',
    color: '#a15c00',
  },

  kycContent: {
    flex: 1,
  },

  kycTitle: {
    margin: 0,
    fontSize: 15,
    fontWeight: 800,
  },

  kycDescription: {
    margin: '5px 0 0',
    color: '#68776f',
    fontSize: 12,
    lineHeight: 1.5,
  },

  kycButton: {
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 10,
    padding: '10px 13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    whiteSpace: 'nowrap',
  },

  securityNotice: {
    background: '#ffffff',
    border:
      '1px solid #e5ebe8',
    borderRadius: 18,
    padding: 18,
    display: 'flex',
    gap: 13,
    marginBottom: 18,
  },

  securityIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    background: '#eef8f3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  securityTitle: {
    display: 'block',
    fontSize: 13,
  },

  securityText: {
    margin: '5px 0 7px',
    color: '#748079',
    fontSize: 11,
    lineHeight: 1.5,
  },

  settingsLink: {
    border: 'none',
    background: 'transparent',
    color: '#087c43',
    padding: 0,
    fontWeight: 700,
    fontSize: 11,
    cursor: 'pointer',
  },

  editActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 25,
  },

  cancelButton: {
    border:
      '1px solid #d3ddd8',
    background: '#ffffff',
    color: '#4d5b54',
    borderRadius: 11,
    padding: '11px 18px',
    fontWeight: 700,
    cursor: 'pointer',
  },

  saveButton: {
    border: 'none',
    background: '#079447',
    color: '#ffffff',
    borderRadius: 11,
    padding: '11px 20px',
    fontWeight: 700,
    cursor: 'pointer',
  },

  bottomNav: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
    background: 'rgba(255,255,255,0.98)',
    borderTop:
      '1px solid #e2e9e5',
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, 1fr)',
    zIndex: 30,
    boxShadow:
      '0 -5px 18px rgba(25,55,43,0.05)',
  },

  navItem: {
    border: 'none',
    background: 'transparent',
    color: '#7a8781',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
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

  navIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 34,
    height: 3,
    borderRadius: 5,
    background: '#079447',
  },

};

export default Profile;
