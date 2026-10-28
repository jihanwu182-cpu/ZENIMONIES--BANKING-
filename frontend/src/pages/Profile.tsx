import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface User {
  id?: string | number;
  full_name?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  dob?: string;
  gender?: string;
  address?: string;
  residential_address?: string;
  city?: string;
  state?: string;
  lga?: string;
  country?: string;
  role?: string;
  status?: string;
  kyc_status?: string;
  kyc_tier?: number;
  tier?: number;
  bvn_verified?: boolean;
  id_verified?: boolean;
  tier_3_verified?: boolean;
  phone_verified?: boolean;
  phone_change_used?: boolean;
  is_verified?: boolean;
  legal_name_locked?: boolean;
  profile_photo?: string;
  avatar?: string;
  created_at?: string;
  updated_at?: string;
}

interface Account {
  id?: string | number;
  account_number?: string;
  account_name?: string;
  account_type?: string;
  currency?: string;
  balance?: number | string;
  status?: string;
}

type ProfileForm = {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  lga: string;
  country: string;
};

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa',
  'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti',
  'Enugu', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun',
  'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara', 'Federal Capital Territory',
];

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const emptyForm: ProfileForm = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  address: '',
  city: '',
  state: '',
  lga: '',
  country: 'Nigeria',
};

const getToken = () =>
  localStorage.getItem('zenimonies_token') ||
  localStorage.getItem('token');

const formatDateInput = (value?: string) =>
  value ? String(value).slice(0, 10) : '';

const getErrorMessage = (err: unknown, fallback: string) => {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
};

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [approvedKycTier, setApprovedKycTier] = useState(0);
  const [contactChoice, setContactChoice] = useState<'email' | 'phone' | null>(null);
  const [contactFlow, setContactFlow] = useState<'email' | 'phone' | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [contactOtp, setContactOtp] = useState('');
  const [contactBusy, setContactBusy] = useState(false);
  const [contactMessage, setContactMessage] = useState('');
  const [contactError, setContactError] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setError('');
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/api/profile`, {
        timeout: 60000,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;

      if (!data?.success || !data?.user) {
        throw new Error(data?.message || 'Unable to load your profile.');
      }

      const serverUser: User = data.user;
      setUser(serverUser);
      setForm({
        fullName: serverUser.full_name || '',
        email: serverUser.email || '',
        phone: serverUser.phone || '',
        dateOfBirth: formatDateInput(serverUser.date_of_birth || serverUser.dob),
        gender: serverUser.gender || '',
        address: serverUser.address || serverUser.residential_address || '',
        city: serverUser.city || '',
        state: serverUser.state || '',
        lga: serverUser.lga || '',
        country: serverUser.country || 'Nigeria',
      });
      setAccount(data.account || null);

      localStorage.setItem('zenimonies_user', JSON.stringify(serverUser));
      if (data.account) {
        localStorage.setItem('zenimonies_accounts', JSON.stringify([data.account]));
      } else {
        localStorage.removeItem('zenimonies_accounts');
      }

      // The KYC endpoint is supplementary. Profile loading should still work
      // if this endpoint is temporarily unavailable.
      try {
        const kycResponse = await axios.get(`${API_URL}/api/kyc/status`, {
          timeout: 30000,
          headers: { Authorization: `Bearer ${token}` },
        });
        const kyc = kycResponse.data?.kyc || kycResponse.data;
        const rawTier = Number(
          kyc?.approved_tier ??
          kyc?.verified_tier ??
          kyc?.tier ??
          serverUser.kyc_tier ??
          serverUser.tier ??
          0
        );
        setApprovedKycTier(
          Number.isFinite(rawTier) ? Math.max(0, Math.min(3, rawTier)) : 0
        );
      } catch (kycError) {
        console.warn('Could not load KYC status; using profile flags.', kycError);
        const fallbackTier = Number(serverUser.kyc_tier ?? serverUser.tier ?? 0);
        setApprovedKycTier(
          Number.isFinite(fallbackTier) ? Math.max(0, Math.min(3, fallbackTier)) : 0
        );
      }
    } catch (err: unknown) {
      console.error('Profile loading error:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        localStorage.removeItem('zenimonies_token');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setError(getErrorMessage(err, 'Unable to load your profile.'));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const displayName = useMemo(
    () =>
      user?.full_name ||
      user?.name ||
      `${user?.first_name || ''} ${user?.last_name || ''}`.trim() ||
      'ZENIMONIES Customer',
    [user]
  );

  const initials = useMemo(
    () =>
      displayName
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase() || 'Z',
    [displayName]
  );

  const tier1Verified = approvedKycTier >= 1 || user?.bvn_verified === true;
  const tier2Verified = approvedKycTier >= 2 || user?.id_verified === true;
  const tier3Verified = approvedKycTier >= 3 || user?.tier_3_verified === true;

  // Keep the identity lock consistent with the deployed backend's approved-KYC
  // policy. The server remains the authority and enforces this rule on writes.
  const accountVerified =
    approvedKycTier >= 1 ||
    user?.is_verified === true ||
    user?.bvn_verified === true ||
    user?.id_verified === true ||
    user?.tier_3_verified === true;

  const legalNameLocked = user?.legal_name_locked === true || accountVerified;
  const profileLocked = accountVerified;
  const highestTier = tier3Verified ? 3 : tier2Verified ? 2 : tier1Verified ? 1 : 0;
  const nextTier = highestTier === 0 ? 1 : highestTier === 1 ? 2 : 3;

  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const startContactChange = async (kind: 'email' | 'phone') => {
    const value = kind === 'email' ? newEmail.trim() : newPhone.trim();
    if (kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setContactError('Enter a valid email address.');
      setContactMessage('');
      return;
    }
    if (kind === 'phone' && value.replace(/[\s()-]/g, '').length < 7) {
      setContactError('Enter a valid phone number. Include the country code if needed.');
      setContactMessage('');
      return;
    }
    if (kind === 'phone' && user?.phone_change_used) {
      setContactError('Your one-time phone number change has already been used. Please contact support for help.');
      setContactMessage('');
      return;
    }
    if (kind === 'phone' && !window.confirm('Phone number changes are allowed only once. Continue?')) return;
    const token = getToken();
    if (!token) { navigate('/login'); return; }
    setContactBusy(true); setContactError(''); setContactMessage('');
    try {
      const response = await axios.post(`${API_URL}/api/profile/contact/${kind}/start`,
        kind === 'email' ? { email: value } : { phone: value },
        { timeout: 60000, headers: { Authorization: `Bearer ${token}` } });
      if (!response.data?.success) throw new Error(response.data?.message || 'Could not send your verification code.');
      setContactFlow(kind); setContactOtp('');
      setContactMessage(response.data?.message || `A verification code has been sent to your ${kind === 'email' ? 'new email address' : 'new phone number'}.`);
    } catch (err: unknown) {
      setContactError(getErrorMessage(err, 'Could not send your verification code.'));
    } finally { setContactBusy(false); }
  };

  const verifyContactChange = async () => {
    if (!contactFlow) return;
    if (!/^\d{6}$/.test(contactOtp.trim())) {
      setContactError('Enter the six-digit verification code.'); setContactMessage(''); return;
    }
    const token = getToken();
    if (!token) { navigate('/login'); return; }
    setContactBusy(true); setContactError(''); setContactMessage('');
    try {
      const response = await axios.post(`${API_URL}/api/profile/contact/${contactFlow}/verify`,
        { otp: contactOtp.trim() },
        { timeout: 60000, headers: { Authorization: `Bearer ${token}` } });
      if (!response.data?.success) throw new Error(response.data?.message || 'Verification failed.');
      setContactMessage(response.data?.message || `${contactFlow === 'email' ? 'Email address' : 'Phone number'} updated successfully.`);
      setContactFlow(null); setContactOtp(''); setNewEmail(''); setNewPhone('');
      await loadProfile();
    } catch (err: unknown) {
      setContactError(getErrorMessage(err, 'Verification failed. Please check the code and try again.'));
    } finally { setContactBusy(false); }
  };

  const cancelContactChange = () => {
    setContactFlow(null); setContactChoice(null); setContactOtp(''); setNewEmail(''); setNewPhone(''); setContactMessage(''); setContactError('');
  };

  const handleSave = async () => {
    if (profileLocked) {
      setError('Your verified account details are protected and can no longer be edited here.');
      return;
    }

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.put(
        `${API_URL}/api/profile`,
        {
          full_name: form.fullName.trim(),
          date_of_birth: form.dateOfBirth || null,
          gender: form.gender || null,
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state,
          lga: form.lga.trim(),
          country: form.country,
        },
        {
          timeout: 60000,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to save your profile.');
      }

      await loadProfile();
      setEditing(false);
      setMessage('Your profile has been updated successfully.');
    } catch (err: unknown) {
      console.error('Profile save error:', err);
      if (
        axios.isAxiosError(err) &&
        err.response?.status === 403 &&
        ['PROFILE_LOCKED', 'LEGAL_NAME_LOCKED'].includes(err.response?.data?.code)
      ) {
        setEditing(false);
        setError(
          err.response?.data?.message ||
          'Your verified profile information can no longer be changed.'
        );
        await loadProfile();
      } else {
        setError(getErrorMessage(err, 'Unable to save your profile.'));
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Your profile photo must be 2 MB or smaller.');
      return;
    }

    const token = getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    setPhotoUploading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('profile_photo', file);

      const response = await axios.post(`${API_URL}/api/profile/photo`, formData, {
        timeout: 60000,
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Unable to update your profile photo.');
      }

      const updatedUser: User = {
        ...(user || {}),
        profile_photo: response.data.profile_photo,
      };
      setUser(updatedUser);
      localStorage.setItem('zenimonies_user', JSON.stringify(updatedUser));
      setMessage('Profile photo updated successfully.');
    } catch (err: unknown) {
      console.error('Profile photo upload error:', err);
      setError(getErrorMessage(err, 'Unable to update your profile photo.'));
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleCancel = async () => {
    setEditing(false);
    setMessage('');
    setError('');
    await loadProfile();
  };

  const beginEdit = () => {
    setMessage('');
    setError('');
    setEditing(true);
  };

  const startVerification = () => {
    navigate(`/kyc${nextTier > 1 ? `?level=${nextTier}` : ''}`);
  };

  const tierRows = [
    {
      tier: 1,
      title: 'Tier 1',
      description: 'Basic identity verification',
      completed: tier1Verified,
    },
    {
      tier: 2,
      title: 'Tier 2',
      description: 'Identity document and liveness checks',
      completed: tier2Verified,
    },
    {
      tier: 3,
      title: 'Tier 3',
      description: 'Enhanced verification for higher account limits',
      completed: tier3Verified,
    },
  ];

  if (loading) {
    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <button type="button" onClick={() => navigate('/')} style={styles.headerBack} aria-label="Go back">←</button>
          <div>
            <div style={styles.headerEyebrow}>ZENIMONIES BANKING</div>
            <div style={styles.headerTitle}>My Profile</div>
          </div>
        </header>
        <main style={styles.main}>
          <section style={styles.loadingCard}>
            <div style={styles.spinner} />
            <strong>Loading your profile</strong>
            <span style={styles.mutedText}>Securely retrieving your account information…</span>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button type="button" onClick={() => navigate('/')} style={styles.headerBack} aria-label="Go back">←</button>
        <div style={styles.headerBrand}>
          <div style={styles.headerEyebrow}>ZENIMONIES BANKING</div>
          <div style={styles.headerTitle}>My Profile</div>
        </div>
        <button type="button" onClick={() => navigate('/')} style={styles.headerHome}>Dashboard</button>
      </header>

      <main style={styles.main}>
        <div style={styles.pageIntro}>
          <div>
            <div style={styles.eyebrow}>ACCOUNT SETTINGS</div>
            <h1 style={styles.pageTitle}>Your profile</h1>
            <p style={styles.pageSubtitle}>Manage your personal details, verification and account information.</p>
          </div>
          <span style={styles.securePill}><span aria-hidden="true">●</span> Secure account</span>
        </div>

        {message && (
          <div role="status" style={styles.successMessage}>
            <span style={styles.messageIcon}>✓</span><span>{message}</span>
            <button type="button" onClick={() => setMessage('')} style={styles.dismissButton} aria-label="Dismiss message">×</button>
          </div>
        )}
        {error && (
          <div role="alert" style={styles.errorMessage}>
            <span style={styles.messageIcon}>!</span><span>{error}</span>
            <button type="button" onClick={() => setError('')} style={styles.dismissButton} aria-label="Dismiss error">×</button>
          </div>
        )}

        <section style={styles.profileHero}>
          <div style={styles.avatarColumn}>
            <div style={styles.avatar}>
              {user?.profile_photo || user?.avatar ? (
                <img src={user.profile_photo || user.avatar} alt={`${displayName} profile`} style={styles.avatarImage} />
              ) : initials}
              <span style={styles.avatarCheck} aria-hidden="true">✓</span>
            </div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={photoUploading}
              style={{ ...styles.secondaryButton, ...(photoUploading ? styles.buttonDisabled : {}) }}
            >
              {photoUploading ? 'Uploading…' : 'Change photo'}
            </button>
            <span style={styles.photoHint}>JPG, PNG or WEBP · Max 2 MB</span>
          </div>

          <div style={styles.heroDetails}>
            <span style={styles.memberLabel}>ZENIMONIES CUSTOMER</span>
            <h2 style={styles.profileName}>{displayName}</h2>
            <p style={styles.profileEmail}>{user?.email || 'Email not available'}</p>
            <div style={styles.heroBadges}>
              <span style={{ ...styles.statusPill, ...(accountVerified ? styles.statusVerified : styles.statusPending) }}>
                <span aria-hidden="true">{accountVerified ? '✓' : '○'}</span>
                {accountVerified ? 'Identity verified' : 'Verification pending'}
              </span>
              <span style={styles.statusPillNeutral}>Tier {highestTier} of 3</span>
              {user?.phone_verified && <span style={styles.statusPillNeutral}>Phone verified</span>}
            </div>
            {profileLocked && (
              <div style={styles.lockNotice}>
                <span aria-hidden="true">🔒</span>
                <span><strong>Protected profile</strong><br />Your approved verification details are locked. You can still update your profile photo.</span>
              </div>
            )}
          </div>

          {!profileLocked && !editing && (
            <button type="button" onClick={beginEdit} style={styles.primaryButton}>
              <span aria-hidden="true">✎</span> Edit profile
            </button>
          )}
        </section>

        <section style={styles.verificationCard}>
          <div style={styles.cardHeadingRow}>
            <div>
              <div style={styles.eyebrow}>IDENTITY & SECURITY</div>
              <h2 style={styles.sectionTitle}>Verification status</h2>
              <p style={styles.sectionDescription}>Track your verification progress and see the next available step.</p>
            </div>
            <span style={{ ...styles.statusPill, ...(accountVerified ? styles.statusVerified : styles.statusPending) }}>
              {accountVerified ? '✓ Verified' : 'Action needed'}
            </span>
          </div>

          <div style={styles.progressHeader}>
            <span style={styles.progressLabel}>Verification progress</span>
            <strong style={styles.progressCount}>{highestTier} <span>/ 3 tiers</span></strong>
          </div>
          <div
            style={styles.progressTrack}
            role="progressbar"
            aria-label="Verification progress"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={highestTier}
          >
            <div style={{ ...styles.progressFill, width: `${(highestTier / 3) * 100}%` }} />
          </div>

          <div style={styles.tierList}>
            {tierRows.map((item) => {
              const current = item.tier === nextTier && !item.completed;
              return (
                <div key={item.tier} style={{
                  ...styles.tierRow,
                  ...(current ? styles.tierRowCurrent : {}),
                  ...(item.completed ? styles.tierRowComplete : {}),
                }}>
                  <div style={{
                    ...styles.tierIcon,
                    ...(item.completed ? styles.tierIconComplete : {}),
                    ...(current ? styles.tierIconCurrent : {}),
                  }}>
                    {item.completed ? '✓' : item.tier}
                  </div>
                  <div style={styles.tierCopy}>
                    <div style={styles.tierTitleLine}>
                      <strong style={styles.tierName}>{item.title}</strong>
                      {current && <span style={styles.currentTag}>NEXT STEP</span>}
                    </div>
                    <span style={styles.tierDescription}>{item.description}</span>
                  </div>
                  <span style={{ ...styles.tierStatus, ...(item.completed ? styles.tierStatusComplete : {}) }}>
                    {item.completed ? 'Completed' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>

          {!tier3Verified ? (
            <div style={styles.upgradeFooter}>
              <div>
                <strong style={styles.upgradeTitle}>
                  {highestTier === 0 ? 'Start identity verification' : `Continue to Tier ${nextTier}`}
                </strong>
                <p style={styles.upgradeDescription}>
                  {highestTier === 0
                    ? 'Complete the first step to begin unlocking verified account features.'
                    : 'Continue your verification journey to access the next available tier.'}
                </p>
              </div>
              <button type="button" onClick={startVerification} style={styles.primaryButton}>
                {highestTier === 0 ? 'Verify account' : `Upgrade to Tier ${nextTier}`} <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : (
            <div style={styles.completeBanner}>
              <span style={styles.completeIcon}>✓</span>
              <span><strong>Verification journey complete</strong><br />All three displayed verification tiers are marked complete.</span>
            </div>
          )}
          <p style={styles.securityFootnote}>
            Verification status is based on information returned by your account and KYC services. If a status looks incorrect, refresh your profile or contact support.
          </p>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeadingBlock}>
            <div style={styles.eyebrow}>YOUR DETAILS</div>
            <h2 style={styles.sectionTitle}>Personal information</h2>
            <p style={styles.sectionDescription}>Keep your information accurate so your account records stay up to date.</p>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label htmlFor="profile-full-name" style={styles.label}>Full legal name</label>
              <input
                id="profile-full-name"
                type="text"
                autoComplete="name"
                value={form.fullName}
                onChange={(event) => updateField('fullName', event.target.value)}
                disabled={!editing || legalNameLocked}
                style={{ ...styles.input, ...(editing && !legalNameLocked ? styles.inputEditable : styles.inputDisabled) }}
              />
              {legalNameLocked && <small style={styles.helper}>🔒 Your verified legal name is protected.</small>}
            </div>

            <div style={styles.field}>
              <label htmlFor="profile-dob" style={styles.label}>Date of birth</label>
              <input
                id="profile-dob"
                type="date"
                autoComplete="bday"
                value={form.dateOfBirth}
                onChange={(event) => updateField('dateOfBirth', event.target.value)}
                disabled={!editing || profileLocked}
                style={{ ...styles.input, ...(editing && !profileLocked ? styles.inputEditable : styles.inputDisabled) }}
              />
              {profileLocked && <small style={styles.helper}>🔒 Your verified date of birth is protected.</small>}
            </div>

            <div style={styles.field}>
              <label htmlFor="profile-gender" style={styles.label}>Gender</label>
              <select
                id="profile-gender"
                value={form.gender}
                onChange={(event) => updateField('gender', event.target.value)}
                disabled={!editing || profileLocked}
                style={{ ...styles.input, ...(editing && !profileLocked ? styles.inputEditable : styles.inputDisabled) }}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
              </select>
            </div>

            <div style={styles.field}>
              <label htmlFor="profile-email" style={styles.label}>Email address</label>
              <button
                id="profile-email"
                type="button"
                onClick={() => { setContactChoice('email'); setContactFlow(null); setContactMessage(''); setContactError(''); }}
                style={{ ...styles.input, ...styles.contactPicker, ...(contactChoice === 'email' ? styles.contactPickerActive : {}) }}
                aria-label="Tap to change email address"
              >
                <span>{form.email || 'Email not available'}</span><span style={styles.contactPickerAction}>Change email →</span>
              </button>
              <small style={styles.helper}>Tap this field to change your email address securely.</small>
            </div>

            <div style={styles.field}>
              <label htmlFor="profile-phone" style={styles.label}>Phone number</label>
              <button
                id="profile-phone"
                type="button"
                onClick={() => { setContactChoice('phone'); setContactFlow(null); setContactMessage(''); setContactError(''); }}
                style={{ ...styles.input, ...styles.contactPicker, ...(contactChoice === 'phone' ? styles.contactPickerActive : {}) }}
                aria-label="Tap to change phone number"
              >
                <span>{form.phone || 'Phone number not available'}</span><span style={styles.contactPickerAction}>Change phone →</span>
              </button>
              <small style={styles.helper}>
                {user?.phone_verified ? '✓ Phone number verified' : 'Phone number not verified'}
                {user?.phone_change_used ? ' · One-time phone change already used' : ' · Tap to change your number (one-time only)'}
              </small>
            </div>
          </div>
        </section>

        {contactChoice && (
        <section style={styles.card}>
          <div style={styles.sectionHeadingBlock}>
            <div style={styles.eyebrow}>CONTACT SECURITY</div>
            <h2 style={styles.sectionTitle}>{contactChoice === 'email' ? 'Change email address' : 'Change phone number'}</h2>
            <p style={styles.sectionDescription}>Your current {contactChoice === 'email' ? 'email address' : 'phone number'} remains active until the new contact detail is verified.</p>
          </div>
          <div style={styles.formGrid}>
            {contactChoice === 'email' ? (
            <div style={styles.field}>
              <label htmlFor="new-contact-email" style={styles.label}>New email address</label>
              <input id="new-contact-email" type="email" autoComplete="email" value={newEmail} onChange={(event) => setNewEmail(event.target.value)} disabled={contactBusy || contactFlow !== null} placeholder="Enter new email address" style={{ ...styles.input, ...(contactBusy || contactFlow !== null ? styles.inputDisabled : styles.inputEditable) }} />
              <button type="button" onClick={() => void startContactChange('email')} disabled={contactBusy || contactFlow !== null} style={{ ...styles.primaryButton, ...(contactBusy || contactFlow !== null ? styles.buttonDisabled : {}) }}>{contactBusy ? 'Please wait…' : 'Send email verification code'}</button>
            </div>
            ) : (
            <div style={styles.field}>
              <label htmlFor="new-contact-phone" style={styles.label}>New phone number</label>
              <input id="new-contact-phone" type="tel" autoComplete="tel" value={newPhone} onChange={(event) => setNewPhone(event.target.value)} disabled={contactBusy || contactFlow !== null || user?.phone_change_used === true} placeholder="e.g. +2348012345678" style={{ ...styles.input, ...(contactBusy || contactFlow !== null || user?.phone_change_used ? styles.inputDisabled : styles.inputEditable) }} />
              <small style={styles.helper}>Phone number changes can be completed only once. Your current number stays active until verification succeeds.</small>
              <button type="button" onClick={() => void startContactChange('phone')} disabled={contactBusy || contactFlow !== null || user?.phone_change_used === true} style={{ ...styles.primaryButton, ...(contactBusy || contactFlow !== null || user?.phone_change_used ? styles.buttonDisabled : {}) }}>{user?.phone_change_used ? 'Phone change already used' : contactBusy ? 'Please wait…' : 'Send phone verification code'}</button>
            </div>
            )}
          </div>
          {contactFlow && (
            <div style={{ ...styles.field, marginTop: 20, maxWidth: 420 }}>
              <label htmlFor="contact-otp" style={styles.label}>Six-digit verification code</label>
              <input id="contact-otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={contactOtp} onChange={(event) => setContactOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} disabled={contactBusy} placeholder="Enter 6-digit code" style={{ ...styles.input, ...styles.inputEditable }} />
              <small style={styles.helper}>Check the {contactFlow === 'email' ? 'new email inbox' : 'new phone'} for your code. It expires after 10 minutes.</small>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => void verifyContactChange()} disabled={contactBusy || contactOtp.length !== 6} style={{ ...styles.primaryButton, ...(contactBusy || contactOtp.length !== 6 ? styles.buttonDisabled : {}) }}>{contactBusy ? 'Verifying…' : 'Verify and update'}</button>
                <button type="button" onClick={cancelContactChange} disabled={contactBusy} style={styles.cancelButton}>Cancel verification</button>
              </div>
            </div>
          )}
          {contactMessage && <div role="status" style={{ ...styles.successMessage, marginTop: 16, marginBottom: 0 }}>{contactMessage}</div>}
          {contactError && <div role="alert" style={{ ...styles.errorMessage, marginTop: 16, marginBottom: 0 }}>{contactError}</div>}
          <button type="button" onClick={cancelContactChange} disabled={contactBusy} style={{ ...styles.cancelButton, marginTop: 16 }}>Close</button>
        </section>
        )}

        <section style={styles.card}>
          <div style={styles.sectionHeadingBlock}>
            <div style={styles.eyebrow}>LOCATION DETAILS</div>
            <h2 style={styles.sectionTitle}>Residential address</h2>
            <p style={styles.sectionDescription}>Your address information helps keep your account records accurate.</p>
          </div>

          <div style={styles.formGrid}>
            <div style={styles.field}>
              <label htmlFor="profile-country" style={styles.label}>Country</label>
              <select
                id="profile-country"
                value={form.country}
                disabled={!editing || profileLocked}
                onChange={(event) => {
                  setForm((previous) => ({
                    ...previous,
                    country: event.target.value,
                    state: '',
                    lga: '',
                  }));
                }}
                style={{ ...styles.input, ...(editing && !profileLocked ? styles.inputEditable : styles.inputDisabled) }}
              >
                <option value="Nigeria">Nigeria</option>
              </select>
            </div>

            <div style={styles.field}>
              <label htmlFor="profile-state" style={styles.label}>State / FCT</label>
              <select
                id="profile-state"
                value={form.state}
                disabled={!editing || profileLocked}
                onChange={(event) => setForm((previous) => ({ ...previous, state: event.target.value, lga: '' }))}
                style={{ ...styles.input, ...(editing && !profileLocked ? styles.inputEditable : styles.inputDisabled) }}
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
            </div>

            <div style={styles.field}>
              <label htmlFor="profile-lga" style={styles.label}>Local Government Area</label>
              <input
                id="profile-lga"
                type="text"
                value={form.lga}
                onChange={(event) => updateField('lga', event.target.value)}
                disabled={!editing || profileLocked}
                placeholder="Enter your LGA"
                style={{ ...styles.input, ...(editing && !profileLocked ? styles.inputEditable : styles.inputDisabled) }}
              />
            </div>

            <div style={styles.field}>
              <label htmlFor="profile-city" style={styles.label}>City / town</label>
              <input
                id="profile-city"
                type="text"
                autoComplete="address-level2"
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
                disabled={!editing || profileLocked}
                placeholder="Enter your city or town"
                style={{ ...styles.input, ...(editing && !profileLocked ? styles.inputEditable : styles.inputDisabled) }}
              />
            </div>

            <div style={{ ...styles.field, gridColumn: '1 / -1' }}>
              <label htmlFor="profile-address" style={styles.label}>Residential address</label>
              <textarea
                id="profile-address"
                autoComplete="street-address"
                value={form.address}
                onChange={(event) => updateField('address', event.target.value)}
                disabled={!editing || profileLocked}
                rows={3}
                placeholder="Enter your full residential address"
                style={{ ...styles.input, ...styles.textarea, ...(editing && !profileLocked ? styles.inputEditable : styles.inputDisabled) }}
              />
            </div>
          </div>
        </section>

        <section style={styles.card}>
          <div style={styles.sectionHeadingBlock}>
            <div style={styles.eyebrow}>BANKING DETAILS</div>
            <h2 style={styles.sectionTitle}>Account information</h2>
            <p style={styles.sectionDescription}>A quick overview of the account linked to your profile.</p>
          </div>
          <div style={styles.accountGrid}>
            <div style={styles.accountTile}>
              <span style={styles.accountLabel}>Account type</span>
              <strong style={styles.accountValue}>{account?.account_type || 'Not available'}</strong>
            </div>
            <div style={styles.accountTile}>
              <span style={styles.accountLabel}>Currency</span>
              <strong style={styles.accountValue}>{account?.currency || 'NGN'}</strong>
            </div>
            <div style={styles.accountTile}>
              <span style={styles.accountLabel}>Account status</span>
              <strong style={styles.accountValue}>{account?.status || 'Not available'}</strong>
            </div>
          </div>
          {account?.account_number && (
            <div style={styles.accountNumberRow}>
              <span style={styles.accountLabel}>Account number</span>
              <strong style={styles.accountNumberValue}>
                •••• •••• {String(account.account_number).slice(-4)}
              </strong>
              <span style={styles.accountNumberHint}>For your security, only the last four digits are shown here.</span>
            </div>
          )}
        </section>

        {editing && !profileLocked && (
          <div style={styles.formActions}>
            <button type="button" onClick={handleCancel} disabled={saving} style={styles.cancelButton}>Cancel</button>
            <button type="button" onClick={handleSave} disabled={saving} style={{ ...styles.primaryButton, ...(saving ? styles.buttonDisabled : {}) }}>
              {saving ? 'Saving changes…' : 'Save changes'}
            </button>
          </div>
        )}

        <footer style={styles.footer}>
          <span>ZENIMONIES BANKING</span>
          <span>Keep your sign-in details private and secure.</span>
        </footer>
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f4f7f5',
    color: '#18251e',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 42,
  },
  header: {
    minHeight: 74,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px max(18px, calc((100vw - 1080px) / 2))',
    background: '#086b43',
    color: '#fff',
    boxSizing: 'border-box',
    boxShadow: '0 3px 14px rgba(16, 64, 42, 0.12)',
  },
  headerBack: {
    width: 40,
    height: 40,
    border: '1px solid rgba(255,255,255,.28)',
    borderRadius: 12,
    color: '#fff',
    background: 'rgba(255,255,255,.08)',
    fontSize: 25,
    cursor: 'pointer',
  },
  headerBrand: { flex: 1 },
  headerEyebrow: { fontSize: 10, letterSpacing: 1.8, fontWeight: 800, opacity: 0.78 },
  headerTitle: { marginTop: 3, fontSize: 19, fontWeight: 750, letterSpacing: -0.3 },
  headerHome: {
    border: '1px solid rgba(255,255,255,.38)',
    borderRadius: 10,
    padding: '9px 13px',
    color: '#fff',
    background: 'transparent',
    fontWeight: 700,
    cursor: 'pointer',
  },
  main: { width: '100%', maxWidth: 1080, padding: '28px 18px', margin: '0 auto', boxSizing: 'border-box' },
  pageIntro: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 22 },
  eyebrow: { color: '#08764b', fontSize: 10, fontWeight: 850, letterSpacing: 1.5 },
  pageTitle: { margin: '6px 0 5px', fontSize: 29, letterSpacing: -0.8, fontWeight: 800 },
  pageSubtitle: { margin: 0, color: '#69786f', fontSize: 13, lineHeight: 1.6 },
  securePill: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 11px', borderRadius: 99, background: '#e7f5ec', color: '#08764b', fontSize: 11, fontWeight: 750 },
  successMessage: { display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderRadius: 12, background: '#e7f7ed', color: '#14663f', border: '1px solid #c7ead4', fontSize: 13, marginBottom: 14 },
  errorMessage: { display: 'flex', alignItems: 'center', gap: 10, padding: '13px 15px', borderRadius: 12, background: '#fff0ef', color: '#a52b25', border: '1px solid #f5d0cd', fontSize: 13, marginBottom: 14 },
  messageIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, minWidth: 22, borderRadius: '50%', background: 'rgba(0,0,0,.06)', fontWeight: 800 },
  dismissButton: { marginLeft: 'auto', border: 0, background: 'transparent', color: 'inherit', fontSize: 22, cursor: 'pointer' },
  profileHero: { display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap', padding: 24, background: '#fff', border: '1px solid #e6ede8', borderRadius: 18, boxShadow: '0 8px 26px rgba(22, 57, 38, .045)', marginBottom: 18 },
  avatarColumn: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  avatar: { position: 'relative', width: 88, height: 88, minWidth: 88, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, #08764b, #0b9a63)', color: '#fff', fontSize: 27, fontWeight: 850, overflow: 'hidden', boxShadow: '0 5px 16px rgba(8,118,75,.2)' },
  avatarImage: { width: '100%', height: '100%', objectFit: 'cover' },
  avatarCheck: { position: 'absolute', right: 1, bottom: 1, width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', color: '#08764b', border: '2px solid #fff', fontSize: 12, fontWeight: 900, boxShadow: '0 0 0 1px #08764b' },
  secondaryButton: { padding: '8px 12px', border: '1px solid #cbded2', borderRadius: 9, color: '#08764b', background: '#fff', fontSize: 11, fontWeight: 750, cursor: 'pointer' },
  photoHint: { color: '#87948c', fontSize: 9, textAlign: 'center' },
  heroDetails: { flex: 1, minWidth: 210 },
  memberLabel: { color: '#87948c', fontSize: 9, fontWeight: 850, letterSpacing: 1.5 },
  profileName: { margin: '6px 0 4px', fontSize: 23, fontWeight: 850, letterSpacing: -0.5, overflowWrap: 'anywhere' },
  profileEmail: { margin: '0 0 12px', color: '#718077', fontSize: 13, overflowWrap: 'anywhere' },
  heroBadges: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7 },
  statusPill: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 9px', borderRadius: 99, fontSize: 10, fontWeight: 800, whiteSpace: 'nowrap' },
  statusVerified: { color: '#08764b', background: '#e5f6eb' },
  statusPending: { color: '#8b620b', background: '#fff3d9' },
  statusPillNeutral: { color: '#52645a', background: '#f0f4f1', padding: '6px 9px', borderRadius: 99, fontSize: 10, fontWeight: 750 },
  lockNotice: { display: 'flex', gap: 9, marginTop: 13, padding: '10px 12px', borderRadius: 10, background: '#f3f7f4', color: '#56665c', fontSize: 11, lineHeight: 1.55, maxWidth: 470 },
  primaryButton: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid #08764b', borderRadius: 10, padding: '11px 15px', color: '#fff', background: '#08764b', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 3px 8px rgba(8,118,75,.12)' },
  buttonDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  verificationCard: { padding: 24, background: '#fff', border: '1px solid #dcebe1', borderRadius: 18, boxShadow: '0 8px 26px rgba(22,57,38,.045)', marginBottom: 18 },
  cardHeadingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 15, flexWrap: 'wrap', marginBottom: 22 },
  sectionHeadingBlock: { marginBottom: 22 },
  sectionTitle: { margin: '6px 0 5px', color: '#1b2a21', fontSize: 18, fontWeight: 850, letterSpacing: -0.3 },
  sectionDescription: { margin: 0, color: '#738077', fontSize: 12, lineHeight: 1.65 },
  progressHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8 },
  progressLabel: { color: '#52645a', fontSize: 11, fontWeight: 750 },
  progressCount: { color: '#08764b', fontSize: 13, fontWeight: 850 },
  progressTrack: { width: '100%', height: 7, borderRadius: 99, overflow: 'hidden', background: '#eaf0ec', marginBottom: 18 },
  progressFill: { height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #08764b, #21a56d)', transition: 'width .25s ease' },
  tierList: { display: 'flex', flexDirection: 'column', gap: 9 },
  tierRow: { display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', border: '1px solid #e9efeb', borderRadius: 12, background: '#fbfcfb' },
  tierRowCurrent: { borderColor: '#b8dec8', background: '#f3fbf6' },
  tierRowComplete: { background: '#f8fcf9' },
  tierIcon: { width: 35, height: 35, minWidth: 35, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 11, background: '#edf1ee', color: '#6d7a71', fontSize: 13, fontWeight: 850 },
  tierIconComplete: { color: '#fff', background: '#08764b' },
  tierIconCurrent: { color: '#08764b', background: '#dff3e7' },
  tierCopy: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 },
  tierTitleLine: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tierName: { color: '#26362c', fontSize: 12 },
  currentTag: { padding: '3px 6px', borderRadius: 5, color: '#08764b', background: '#dff3e7', fontSize: 8, fontWeight: 900, letterSpacing: .7 },
  tierDescription: { color: '#78867d', fontSize: 10, lineHeight: 1.5 },
  tierStatus: { color: '#7a877f', fontSize: 10, fontWeight: 750, whiteSpace: 'nowrap' },
  tierStatusComplete: { color: '#08764b' },
  upgradeFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginTop: 18, padding: 16, borderRadius: 12, background: '#f5faf6', border: '1px solid #e0eee5' },
  upgradeTitle: { color: '#26372c', fontSize: 13 },
  upgradeDescription: { margin: '5px 0 0', maxWidth: 450, color: '#718077', fontSize: 11, lineHeight: 1.55 },
  completeBanner: { display: 'flex', alignItems: 'center', gap: 11, marginTop: 18, padding: 13, borderRadius: 11, background: '#e8f7ee', color: '#176b43', fontSize: 11, lineHeight: 1.6 },
  completeIcon: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, minWidth: 28, borderRadius: '50%', background: '#08764b', color: '#fff', fontWeight: 900 },
  securityFootnote: { margin: '15px 0 0', color: '#89958d', fontSize: 10, lineHeight: 1.6 },
  card: { padding: 24, background: '#fff', border: '1px solid #e6ede8', borderRadius: 18, boxShadow: '0 8px 26px rgba(22,57,38,.035)', marginBottom: 18 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 245px), 1fr))', gap: 17 },
  field: { display: 'flex', flexDirection: 'column', gap: 7, minWidth: 0 },
  label: { color: '#34463a', fontSize: 11, fontWeight: 800 },
  input: { width: '100%', boxSizing: 'border-box', minHeight: 43, border: '1px solid #dce5df', borderRadius: 9, padding: '11px 12px', color: '#24362b', background: '#fff', fontSize: 13, outline: 'none' },
  inputEditable: { borderColor: '#72b895', boxShadow: '0 0 0 2px rgba(8,118,75,.045)' },
  inputDisabled: { background: '#f4f6f4', color: '#6c7b71', cursor: 'not-allowed' },
  contactPicker: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, textAlign: 'left', cursor: 'pointer', background: '#fff', color: '#24362b', minHeight: 46 },
  contactPickerActive: { borderColor: '#08764b', boxShadow: '0 0 0 2px rgba(8,118,75,.10)' },
  contactPickerAction: { color: '#08764b', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' },
  textarea: { resize: 'vertical', minHeight: 90, fontFamily: 'inherit', lineHeight: 1.5 },
  helper: { color: '#839087', fontSize: 10, lineHeight: 1.5 },
  accountGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 },
  accountTile: { display: 'flex', flexDirection: 'column', gap: 7, padding: 14, borderRadius: 11, border: '1px solid #e8efea', background: '#fafcfb' },
  accountLabel: { color: '#7c8981', fontSize: 10, fontWeight: 700 },
  accountValue: { color: '#27382d', fontSize: 13, fontWeight: 800, overflowWrap: 'anywhere' },
  accountNumberRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 9, marginTop: 15, padding: '13px 14px', borderRadius: 10, background: '#f5f8f6' },
  accountNumberValue: { color: '#27382d', fontSize: 13, letterSpacing: 1.3 },
  accountNumberHint: { width: '100%', color: '#89958d', fontSize: 10 },
  formActions: { display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 10, margin: '4px 0 20px' },
  cancelButton: { border: '1px solid #d4ded7', borderRadius: 10, padding: '11px 15px', color: '#45564b', background: '#fff', fontSize: 12, fontWeight: 750, cursor: 'pointer' },
  footer: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginTop: 28, padding: '18px 3px', borderTop: '1px solid #e1e9e4', color: '#89958d', fontSize: 10 },
  loadingCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 20px', background: '#fff', border: '1px solid #e6ede8', borderRadius: 18, color: '#26372c' },
  spinner: { width: 28, height: 28, border: '3px solid #dcebe2', borderTopColor: '#08764b', borderRadius: '50%' },
  mutedText: { color: '#7b8980', fontSize: 12, textAlign: 'center' },
};

export default Profile;
