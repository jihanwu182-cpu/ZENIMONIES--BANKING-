import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface KycStatus {
  status: string;
  tier: number;
  bvn_verified: boolean;
  id_verified: boolean;
  tier_3_verified: boolean;
  tier_3_method: string | null;
}

interface KycLimits {
  account_limit: number | null;
  daily_transfer_limit: number | null;
  daily_transfer_used: number;
  daily_transfer_remaining: number | null;
}

interface KycRecord {
  id?: string;
  bvn_verification_status?: string;
  bvn_verified_at?: string | null;

  document_type?: string;
  document_number?: string;
  document_front_url?: string;
  document_back_url?: string;
  selfie_url?: string;
  id_verification_status?: string;
  id_verified_at?: string | null;

  tier_3_method?: string | null;
  tier_3_document_url?: string;
  tier_3_verification_status?: string;
  tier_3_verified_at?: string | null;

  verification_status?: string;
  rejection_reason?: string | null;
}

interface KycResponse {
  success: boolean;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
  };
  kyc?: KycStatus;
  limits?: KycLimits;
  record?: KycRecord | null;
  message?: string;
}

type Tier3Method =
  | 'bank_statement'
  | 'utility_bill'
  | 'proof_of_address';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

const KYC: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [kyc, setKyc] = useState<KycStatus>({
    status: 'pending',
    tier: 1,
    bvn_verified: false,
    id_verified: false,
    tier_3_verified: false,
    tier_3_method: null,
  });

  const [limits, setLimits] = useState<KycLimits>({
    account_limit: 200000,
    daily_transfer_limit: 50000,
    daily_transfer_used: 0,
    daily_transfer_remaining: 50000,
  });

  const [record, setRecord] = useState<KycRecord | null>(
    null
  );

  const [bvn, setBvn] = useState('');

  const [documentType, setDocumentType] =
    useState('national_id');

  const [documentNumber, setDocumentNumber] =
    useState('');

  const [documentFrontUrl, setDocumentFrontUrl] =
    useState('');

  const [documentBackUrl, setDocumentBackUrl] =
    useState('');

  const [selfieUrl, setSelfieUrl] = useState('');

  const [tier3Method, setTier3Method] =
    useState<Tier3Method>('bank_statement');

  const [tier3DocumentUrl, setTier3DocumentUrl] =
    useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token =
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token');

  const formatMoney = (
    amount: number | null
  ): string => {
    if (amount === null) {
      return 'Unlimited';
    }

    return `₦${amount.toLocaleString('en-NG', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  };

  const getStatusColor = (
    status: string
  ): string => {
    const normalized =
      status.toLowerCase();

    if (
      normalized === 'approved' ||
      normalized === 'verified'
    ) {
      return '#027a48';
    }

    if (
      normalized === 'pending' ||
      normalized === 'under_review'
    ) {
      return '#b54708';
    }

    if (normalized === 'rejected') {
      return '#b42318';
    }

    return '#475467';
  };

  const getStatusBackground = (
    status: string
  ): string => {
    const normalized =
      status.toLowerCase();

    if (
      normalized === 'approved' ||
      normalized === 'verified'
    ) {
      return '#ecfdf3';
    }

    if (
      normalized === 'pending' ||
      normalized === 'under_review'
    ) {
      return '#fffaeb';
    }

    if (normalized === 'rejected') {
      return '#fef3f2';
    }

    return '#f2f4f7';
  };

  const loadKycStatus = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/kyc/status`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data: KycResponse =
        await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to load KYC status'
        );
      }

      if (data.kyc) {
        setKyc(data.kyc);
      }

      if (data.limits) {
        setLimits(data.limits);
      }

      setRecord(
        data.record || null
      );

      if (data.record?.tier_3_method) {
        setTier3Method(
          data.record
            .tier_3_method as Tier3Method
        );
      }
    } catch (err) {
      console.error(
        'KYC status error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load KYC status'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKycStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitBvn = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    const cleanBvn =
      bvn.replace(/\D/g, '');

    if (!/^\d{11}$/.test(cleanBvn)) {
      setError(
        'BVN must contain exactly 11 digits.'
      );
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/kyc/bvn`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bvn: cleanBvn,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to submit BVN'
        );
      }

      setMessage(
        data.message ||
          'BVN submitted successfully.'
      );

      await loadKycStatus();
    } catch (err) {
      console.error(
        'Submit BVN error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit BVN'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier2 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!documentType) {
      setError(
        'Please select your ID document type.'
      );
      return;
    }

    if (!documentNumber.trim()) {
      setError(
        'Please enter your ID document number.'
      );
      return;
    }

    if (!documentFrontUrl.trim()) {
      setError(
        'Please provide the front document URL.'
      );
      return;
    }

    if (!selfieUrl.trim()) {
      setError(
        'Please provide your selfie URL.'
      );
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/kyc/tier-2`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            document_type:
              documentType,
            document_number:
              documentNumber.trim(),
            document_front_url:
              documentFrontUrl.trim(),
            document_back_url:
              documentBackUrl.trim(),
            selfie_url:
              selfieUrl.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to submit Tier 2 verification'
        );
      }

      setMessage(
        data.message ||
          'Tier 2 verification submitted successfully.'
      );

      await loadKycStatus();
    } catch (err) {
      console.error(
        'Submit Tier 2 error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit Tier 2 verification'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitTier3 = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setMessage('');

    if (!tier3Method) {
      setError(
        'Please choose a Tier 3 verification method.'
      );
      return;
    }

    if (!tier3DocumentUrl.trim()) {
      setError(
        'Please provide the verification document URL.'
      );
      return;
    }

    if (!token) {
      navigate('/login');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/kyc/tier-3`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tier_3_method:
              tier3Method,
            tier_3_document_url:
              tier3DocumentUrl.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            'Unable to submit Tier 3 verification'
        );
      }

      setMessage(
        data.message ||
          'Tier 3 verification submitted successfully.'
      );

      await loadKycStatus();
    } catch (err) {
      console.error(
        'Submit Tier 3 error:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to submit Tier 3 verification'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(
      'zenimonies_token'
    );
    localStorage.removeItem('token');
    localStorage.removeItem(
      'zenimonies_user'
    );
    localStorage.removeItem(
      'zenimonies_accounts'
    );

    navigate('/login');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f7fb',
          color: '#475467',
          fontSize: '16px',
        }}
      >
        Loading KYC information...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: '#ffffff',
          borderBottom:
            '1px solid #eaecf0',
          padding: '18px 24px',
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          gap: '15px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#0b5cff',
              fontSize: '24px',
              fontWeight: 800,
            }}
          >
            Zenimonies
          </Link>

          <div
            style={{
              color: '#667085',
              fontSize: '13px',
              marginTop: '2px',
            }}
          >
            Digital Banking
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#172033',
              fontWeight: 600,
            }}
          >
            Dashboard
          </Link>

          <Link
            to="/profile"
            style={{
              textDecoration: 'none',
              color: '#172033',
              fontWeight: 600,
            }}
          >
            Profile
          </Link>

          <button
            type="button"
            onClick={logout}
            style={{
              border:
                '1px solid #d0d5dd',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '9px 15px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* MAIN */}
      <main
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding:
            '30px 20px 60px',
        }}
      >
        {/* TITLE */}
        <section
          style={{
            marginBottom: '25px',
          }}
        >
          <p
            style={{
              margin: 0,
              color: '#667085',
              fontSize: '14px',
            }}
          >
            Account Security
          </p>

          <h1
            style={{
              margin:
                '5px 0 8px',
              color: '#172033',
              fontSize: '30px',
            }}
          >
            KYC Verification
          </h1>

          <p
            style={{
              margin: 0,
              color: '#667085',
              lineHeight: 1.6,
            }}
          >
            Verify your identity to increase
            your Zenimonies account and
            transfer limits.
          </p>
        </section>

        {/* ALERTS */}
        {message && (
          <div
            style={{
              background: '#ecfdf3',
              border:
                '1px solid #abefc6',
              color: '#027a48',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '18px',
              fontWeight: 600,
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fef3f2',
              border:
                '1px solid #fecdca',
              color: '#b42318',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '18px',
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* CURRENT STATUS */}
        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              gap: '15px',
              flexWrap: 'wrap',
              marginBottom: '20px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  color: '#172033',
                  fontSize: '21px',
                }}
              >
                Current Verification
              </h2>

              <p
                style={{
                  margin:
                    '5px 0 0',
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                Your current KYC level and
                account limits.
              </p>
            </div>

            <span
              style={{
                padding:
                  '8px 14px',
                borderRadius: '20px',
                background:
                  getStatusBackground(
                    kyc.status
                  ),
                color:
                  getStatusColor(
                    kyc.status
                  ),
                fontWeight: 700,
                fontSize: '13px',
                textTransform:
                  'capitalize',
              }}
            >
              {kyc.status.replace(
                '_',
                ' '
              )}
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '14px',
            }}
          >
            <InfoBox
              label="Current Tier"
              value={`Tier ${kyc.tier}`}
            />

            <InfoBox
              label="Account Limit"
              value={formatMoney(
                limits.account_limit
              )}
            />

            <InfoBox
              label="Daily Transfer Limit"
              value={formatMoney(
                limits.daily_transfer_limit
              )}
            />

            <InfoBox
              label="Daily Transfer Used"
              value={formatMoney(
                limits.daily_transfer_used
              )}
            />

            <InfoBox
              label="Daily Transfer Remaining"
              value={formatMoney(
                limits.daily_transfer_remaining
              )}
            />
          </div>
        </section>

        {/* TIER CARDS */}
        <section
          style={{
            marginBottom: '20px',
          }}
        >
          <h2
            style={{
              margin:
                '0 0 14px',
              color: '#172033',
              fontSize: '21px',
            }}
          >
            Verification Levels
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '16px',
            }}
          >
            <TierCard
              tier="Tier 1"
              title="BVN Verification"
              description="Verify your account using your Bank Verification Number."
              accountLimit="₦200,000"
              transferLimit="₦50,000 daily"
              verified={
                kyc.tier >= 1 &&
                kyc.bvn_verified
              }
              currentTier={
                kyc.tier === 1
              }
            />

            <TierCard
              tier="Tier 2"
              title="ID + KYC"
              description="Submit an accepted identity document and required KYC information."
              accountLimit="₦500,000"
              transferLimit="₦200,000 daily"
              verified={
                kyc.tier >= 2 &&
                kyc.id_verified
              }
              currentTier={
                kyc.tier === 2
              }
            />

            <TierCard
              tier="Tier 3"
              title="Address Verification"
              description="Choose one verification method: bank statement, utility bill, or proof of address."
              accountLimit="Unlimited"
              transferLimit="₦5,000,000 daily"
              verified={
                kyc.tier >= 3 &&
                kyc.tier_3_verified
              }
              currentTier={
                kyc.tier === 3
              }
            />
          </div>
        </section>

        {/* TIER 1 */}
        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <SectionHeading
            number="1"
            title="Tier 1 — BVN Verification"
            description="Submit your 11-digit BVN. Verification must be confirmed by an approved verification provider before the account is marked verified."
          />

          {kyc.bvn_verified ? (
            <VerifiedMessage text="Your BVN has been verified." />
          ) : (
            <form onSubmit={submitBvn}>
              <label
                style={labelStyle}
              >
                BVN
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={11}
                value={bvn}
                onChange={(event) =>
                  setBvn(
                    event.target.value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                placeholder="Enter your 11-digit BVN"
                style={inputStyle}
              />

              <p
                style={{
                  color: '#667085',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                Your BVN is sensitive information.
                Submit it only through the secure
                Zenimonies verification process.
              </p>

              <button
                type="submit"
                disabled={submitting}
                style={
                  primaryButtonStyle
                }
              >
                {submitting
                  ? 'Submitting...'
                  : 'Submit BVN'}
              </button>
            </form>
          )}
        </section>

        {/* TIER 2 */}
        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <SectionHeading
            number="2"
            title="Tier 2 — ID Document + KYC"
            description="Submit your identity document and required verification information. Your submission will remain pending until reviewed and approved."
          />

          {kyc.id_verified ? (
            <VerifiedMessage text="Your identity document has been verified." />
          ) : (
            <form onSubmit={submitTier2}>
              <label
                style={labelStyle}
              >
                ID Document Type
              </label>

              <select
                value={documentType}
                onChange={(event) =>
                  setDocumentType(
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="national_id">
                  National ID
                </option>
                <option value="international_passport">
                  International Passport
                </option>
                <option value="drivers_license">
                  Driver's License
                </option>
                <option value="voters_card">
                  Voter's Card
                </option>
              </select>

              <label
                style={labelStyle}
              >
                ID Document Number
              </label>

              <input
                type="text"
                value={documentNumber}
                onChange={(event) =>
                  setDocumentNumber(
                    event.target.value
                  )
                }
                placeholder="Enter document number"
                style={inputStyle}
              />

              <label
                style={labelStyle}
              >
                Front Document URL
              </label>

              <input
                type="url"
                value={documentFrontUrl}
                onChange={(event) =>
                  setDocumentFrontUrl(
                    event.target.value
                  )
                }
                placeholder="https://..."
                style={inputStyle}
              />

              <label
                style={labelStyle}
              >
                Back Document URL
              </label>

              <input
                type="url"
                value={documentBackUrl}
                onChange={(event) =>
                  setDocumentBackUrl(
                    event.target.value
                  )
                }
                placeholder="https://... (if required)"
                style={inputStyle}
              />

              <label
                style={labelStyle}
              >
                Selfie URL
              </label>

              <input
                type="url"
                value={selfieUrl}
                onChange={(event) =>
                  setSelfieUrl(
                    event.target.value
                  )
                }
                placeholder="https://..."
                style={inputStyle}
              />

              <p
                style={{
                  color: '#667085',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                The document URLs above should point
                to files uploaded through your approved
                secure document-storage system.
              </p>

              <button
                type="submit"
                disabled={submitting}
                style={
                  primaryButtonStyle
                }
              >
                {submitting
                  ? 'Submitting...'
                  : 'Submit Tier 2 KYC'}
              </button>
            </form>
          )}
        </section>

        {/* TIER 3 */}
        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '18px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow:
              '0 8px 25px rgba(16, 24, 40, 0.05)',
          }}
        >
          <SectionHeading
            number="3"
            title="Tier 3 — Choose One Verification Method"
            description="To request Tier 3, choose ONE of the available verification methods and submit the corresponding document."
          />

          {kyc.tier_3_verified ? (
            <VerifiedMessage text="Your Tier 3 verification has been approved." />
          ) : (
            <form onSubmit={submitTier3}>
              <label
                style={labelStyle}
              >
                Choose Verification Method
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                <MethodCard
                  value="bank_statement"
                  selected={
                    tier3Method ===
                    'bank_statement'
                  }
                  title="Bank Statement"
                  description="Submit a recent bank statement."
                  onClick={() =>
                    setTier3Method(
                      'bank_statement'
                    )
                  }
                />

                <MethodCard
                  value="utility_bill"
                  selected={
                    tier3Method ===
                    'utility_bill'
                  }
                  title="Utility Bill"
                  description="Submit an eligible recent utility bill."
                  onClick={() =>
                    setTier3Method(
                      'utility_bill'
                    )
                  }
                />

                <MethodCard
                  value="proof_of_address"
                  selected={
                    tier3Method ===
                    'proof_of_address'
                  }
                  title="Proof of Address"
                  description="Submit an accepted proof of your residential address."
                  onClick={() =>
                    setTier3Method(
                      'proof_of_address'
                    )
                  }
                />
              </div>

              <label
                style={labelStyle}
              >
                Document URL
              </label>

              <input
                type="url"
                value={tier3DocumentUrl}
                onChange={(event) =>
                  setTier3DocumentUrl(
                    event.target.value
                  )
                }
                placeholder="https://..."
                style={inputStyle}
              />

              <p
                style={{
                  color: '#667085',
                  fontSize: '13px',
                  lineHeight: 1.5,
                }}
              >
                You only need to submit one Tier 3
                method. Your submission will be reviewed
                before Tier 3 is approved.
              </p>

              <button
                type="submit"
                disabled={submitting}
                style={
                  primaryButtonStyle
                }
              >
                {submitting
                  ? 'Submitting...'
                  : 'Submit Tier 3 Verification'}
              </button>
            </form>
          )}
        </section>

        {/* LAST RECORD */}
        {record && (
          <section
            style={{
              background: '#f8faff',
              border:
                '1px solid #dbe7ff',
              borderRadius: '14px',
              padding: '20px',
              marginBottom: '20px',
            }}
          >
            <h3
              style={{
                margin:
                  '0 0 10px',
                color: '#172033',
                fontSize: '17px',
              }}
            >
              Latest KYC Submission
            </h3>

            <p
              style={{
                margin:
                  '0 0 7px',
                color: '#667085',
                fontSize: '14px',
              }}
            >
              Status:{' '}
              <strong
                style={{
                  color:
                    getStatusColor(
                      record.verification_status ||
                        'pending'
                    ),
                }}
              >
                {(
                  record.verification_status ||
                  'pending'
                ).replace(
                  '_',
                  ' '
                )}
              </strong>
            </p>

            {record.rejection_reason && (
              <p
                style={{
                  margin: 0,
                  color: '#b42318',
                  fontSize: '14px',
                }}
              >
                Reason:{' '}
                {record.rejection_reason}
              </p>
            )}

            {record.tier_3_method && (
              <p
                style={{
                  margin:
                    '7px 0 0',
                  color: '#667085',
                  fontSize: '14px',
                }}
              >
                Tier 3 method:{' '}
                {record.tier_3_method.replace(
                  /_/g,
                  ' '
                )}
              </p>
            )}
          </section>
        )}

        <Link
          to="/"
          style={{
            display:
              'inline-block',
            textDecoration: 'none',
            color: '#0b5cff',
            fontWeight: 700,
          }}
        >
          ← Back to Dashboard
        </Link>
      </main>
    </div>
  );
};

/* ============================================================
   COMPONENTS
   ============================================================ */

interface InfoBoxProps {
  label: string;
  value: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({
  label,
  value,
}) => {
  return (
    <div
      style={{
        background: '#f9fafb',
        border:
          '1px solid #eaecf0',
        borderRadius: '10px',
        padding: '15px',
      }}
    >
      <div
        style={{
          color: '#667085',
          fontSize: '12px',
          marginBottom: '6px',
          fontWeight: 600,
          textTransform:
            'uppercase',
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: '#172033',
          fontSize: '16px',
          fontWeight: 700,
        }}
      >
        {value}
      </div>
    </div>
  );
};

interface TierCardProps {
  tier: string;
  title: string;
  description: string;
  accountLimit: string;
  transferLimit: string;
  verified: boolean;
  currentTier: boolean;
}

const TierCard: React.FC<
  TierCardProps
> = ({
  tier,
  title,
  description,
  accountLimit,
  transferLimit,
  verified,
  currentTier,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: currentTier
          ? '2px solid #0b5cff'
          : '1px solid #eaecf0',
        borderRadius: '14px',
        padding: '20px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <strong
          style={{
            color: '#0b5cff',
            fontSize: '13px',
          }}
        >
          {tier}
        </strong>

        {verified && (
          <span
            style={{
              background: '#ecfdf3',
              color: '#027a48',
              borderRadius: '20px',
              padding:
                '5px 9px',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            Verified
          </span>
        )}

        {!verified &&
          currentTier && (
            <span
              style={{
                background: '#fffaeb',
                color: '#b54708',
                borderRadius:
                  '20px',
                padding:
                  '5px 9px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Current
            </span>
          )}
      </div>

      <h3
        style={{
          margin:
            '0 0 8px',
          color: '#172033',
          fontSize: '18px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin:
            '0 0 15px',
          color: '#667085',
          fontSize: '13px',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      <div
        style={{
          color: '#172033',
          fontSize: '13px',
          marginBottom: '5px',
        }}
      >
        <strong>
          Account:
        </strong>{' '}
        {accountLimit}
      </div>

      <div
        style={{
          color: '#172033',
          fontSize: '13px',
        }}
      >
        <strong>
          Transfers:
        </strong>{' '}
        {transferLimit}
      </div>
    </div>
  );
};

interface SectionHeadingProps {
  number: string;
  title: string;
  description: string;
}

const SectionHeading: React.FC<
  SectionHeadingProps
> = ({
  number,
  title,
  description,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        gap: '14px',
        marginBottom: '22px',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: '#eaf2ff',
          color: '#0b5cff',
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'center',
          fontWeight: 800,
        }}
      >
        {number}
      </div>

      <div>
        <h2
          style={{
            margin: 0,
            color: '#172033',
            fontSize: '20px',
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin:
              '5px 0 0',
            color: '#667085',
            fontSize: '14px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

interface MethodCardProps {
  value: Tier3Method;
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}

const MethodCard: React.FC<
  MethodCardProps
> = ({
  selected,
  title,
  description,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        cursor: 'pointer',
        background: selected
          ? '#f0f6ff'
          : '#ffffff',
        border: selected
          ? '2px solid #0b5cff'
          : '1px solid #d0d5dd',
        borderRadius: '12px',
        padding: '15px',
      }}
    >
      <strong
        style={{
          display: 'block',
          color: '#172033',
          marginBottom: '5px',
        }}
      >
        {title}
      </strong>

      <span
        style={{
          color: '#667085',
          fontSize: '13px',
          lineHeight: 1.4,
        }}
      >
        {description}
      </span>
    </button>
  );
};

interface VerifiedMessageProps {
  text: string;
}

const VerifiedMessage: React.FC<
  VerifiedMessageProps
> = ({ text }) => {
  return (
    <div
      style={{
        background: '#ecfdf3',
        border:
          '1px solid #abefc6',
        borderRadius: '10px',
        padding: '15px',
        color: '#027a48',
        fontWeight: 600,
      }}
    >
      ✓ {text}
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */

const labelStyle: React.CSSProperties = {
  display: 'block',
  color: '#344054',
  fontSize: '14px',
  fontWeight: 600,
  marginBottom: '7px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #d0d5dd',
  borderRadius: '8px',
  padding: '12px 13px',
  fontSize: '15px',
  marginBottom: '17px',
  outline: 'none',
  background: '#ffffff',
};

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  background: '#0b5cff',
  color: '#ffffff',
  padding: '12px 18px',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
};

export default KYC;
