import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const API_URL = 'https://zenimonies-banking.onrender.com';

type TierStatus =
  | 'not_started'
  | 'pending'
  | 'verified'
  | 'rejected';

interface KYCData {
  tier1_status?: TierStatus;
  tier2_status?: TierStatus;
  tier3_status?: TierStatus;

  bvn?: string;

  document_type?: string;
  document_number?: string;

  tier3_method?: string;

  rejection_reason?: string;
}

const KYC: React.FC = () => {
  const [kyc, setKyc] = useState<KYCData>({
    tier1_status: 'not_started',
    tier2_status: 'not_started',
    tier3_status: 'not_started',
  });

  const [bvn, setBvn] = useState('');

  const [documentType, setDocumentType] =
    useState('');

  const [documentNumber, setDocumentNumber] =
    useState('');

  const [documentFront, setDocumentFront] =
    useState<File | null>(null);

  const [documentBack, setDocumentBack] =
    useState<File | null>(null);

  const [selfie, setSelfie] =
    useState<File | null>(null);

  const [tier3Method, setTier3Method] =
    useState('');

  const [tier3Document, setTier3Document] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  const token = localStorage.getItem(
    'zenimonies_token'
  );

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  /*
   * ============================================================
   * LOAD KYC
   * ============================================================
   */

  const loadKYC = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(
        `${API_URL}/api/kyc`,
        {
          headers: authHeaders,
        }
      );

      if (response.data?.success) {
        const data =
          response.data.kyc || {};

        setKyc({
          tier1_status:
            data.tier1_status ||
            'not_started',

          tier2_status:
            data.tier2_status ||
            'not_started',

          tier3_status:
            data.tier3_status ||
            'not_started',

          bvn: data.bvn || '',

          document_type:
            data.document_type || '',

          document_number:
            data.document_number || '',

          tier3_method:
            data.tier3_method || '',

          rejection_reason:
            data.rejection_reason || '',
        });

        setDocumentType(
          data.document_type || ''
        );

        setDocumentNumber(
          data.document_number || ''
        );

        setTier3Method(
          data.tier3_method || ''
        );
      }
    } catch (err: any) {
      /*
       * A 404 can simply mean the user has not
       * submitted KYC yet.
       */

      if (
        err?.response?.status !== 404
      ) {
        setError(
          err?.response?.data?.message ||
            'Unable to load your KYC status.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKYC();
  }, []);

  /*
   * ============================================================
   * RESET MESSAGES
   * ============================================================
   */

  const clearMessages = () => {
    setMessage('');
    setError('');
  };

  /*
   * ============================================================
   * TIER 1 — BVN
   * ============================================================
   */

  const submitTier1 = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    clearMessages();

    const cleanBvn = bvn.replace(/\D/g, '');

    if (cleanBvn.length !== 11) {
      setError(
        'BVN must contain exactly 11 digits.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await axios.post(
        `${API_URL}/api/kyc/tier1`,
        {
          bvn: cleanBvn,
        },
        {
          headers: authHeaders,
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data?.message ||
            'BVN verification submitted successfully.'
        );

        setKyc((previous) => ({
          ...previous,
          tier1_status:
            response.data?.kyc
              ?.tier1_status ||
            'pending',
        }));
      } else {
        setError(
          response.data?.message ||
            'Unable to submit BVN verification.'
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to submit BVN verification.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ============================================================
   * TIER 2 — ID VERIFICATION
   * ============================================================
   */

  const submitTier2 = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    clearMessages();

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

    if (!documentFront) {
      setError(
        'Please upload the front of your ID document.'
      );
      return;
    }

    if (!selfie) {
      setError(
        'Please upload a selfie.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append(
        'document_type',
        documentType
      );

      formData.append(
        'document_number',
        documentNumber.trim()
      );

      formData.append(
        'document_front',
        documentFront
      );

      if (documentBack) {
        formData.append(
          'document_back',
          documentBack
        );
      }

      formData.append(
        'selfie',
        selfie
      );

      const response = await axios.post(
        `${API_URL}/api/kyc/tier2`,
        formData,
        {
          headers: {
            ...authHeaders,
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data?.message ||
            'Identity verification submitted successfully.'
        );

        setKyc((previous) => ({
          ...previous,
          tier2_status:
            response.data?.kyc
              ?.tier2_status ||
            'pending',
        }));
      } else {
        setError(
          response.data?.message ||
            'Unable to submit identity verification.'
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to submit identity verification.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ============================================================
   * TIER 3 — ADDRESS VERIFICATION
   * ============================================================
   */

  const submitTier3 = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    clearMessages();

    if (!tier3Method) {
      setError(
        'Please choose a Tier 3 verification method.'
      );
      return;
    }

    if (!tier3Document) {
      setError(
        'Please upload the document for your selected verification method.'
      );
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();

      formData.append(
        'method',
        tier3Method
      );

      formData.append(
        'document',
        tier3Document
      );

      const response = await axios.post(
        `${API_URL}/api/kyc/tier3`,
        formData,
        {
          headers: {
            ...authHeaders,
            'Content-Type':
              'multipart/form-data',
          },
        }
      );

      if (response.data?.success) {
        setMessage(
          response.data?.message ||
            'Tier 3 verification submitted successfully.'
        );

        setKyc((previous) => ({
          ...previous,
          tier3_status:
            response.data?.kyc
              ?.tier3_status ||
            'pending',
          tier3_method:
            response.data?.kyc
              ?.tier3_method ||
            tier3Method,
        }));
      } else {
        setError(
          response.data?.message ||
            'Unable to submit Tier 3 verification.'
        );
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          'Unable to submit Tier 3 verification.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * ============================================================
   * STATUS HELPERS
   * ============================================================
   */

  const statusLabel = (
    status?: TierStatus
  ) => {
    switch (status) {
      case 'verified':
        return 'Verified';

      case 'pending':
        return 'Pending Review';

      case 'rejected':
        return 'Rejected';

      default:
        return 'Not Started';
    }
  };

  const statusBackground = (
    status?: TierStatus
  ) => {
    switch (status) {
      case 'verified':
        return '#dcfae6';

      case 'pending':
        return '#fff4cc';

      case 'rejected':
        return '#fee4e2';

      default:
        return '#eef2f6';
    }
  };

  const statusColor = (
    status?: TierStatus
  ) => {
    switch (status) {
      case 'verified':
        return '#067647';

      case 'pending':
        return '#7a5b00';

      case 'rejected':
        return '#b42318';

      default:
        return '#475467';
    }
  };

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f7fb',
          color: '#172033',
          fontSize: '18px',
        }}
      >
        Loading KYC...
      </div>
    );
  }

  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: '760px',
          margin: '0 auto',
        }}
      >
        {/* Header */}

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            gap: '15px',
            flexWrap: 'wrap',
            marginBottom: '25px',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                color: '#172033',
              }}
            >
              KYC Verification
            </h1>

            <p
              style={{
                margin:
                  '6px 0 0',
                color: '#667085',
              }}
            >
              Complete your verification
              in three tiers.
            </p>
          </div>

          <Link
            to="/profile"
            style={{
              textDecoration: 'none',
              color: '#0b5cff',
              fontWeight: 600,
            }}
          >
            ← Back to Profile
          </Link>
        </div>

        {/* Messages */}

        {message && (
          <div
            style={{
              background: '#dcfae6',
              color: '#067647',
              padding: '14px',
              borderRadius: '10px',
              marginBottom: '18px',
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div
            style={{
              background: '#fee4e2',
              color: '#b42318',
              padding: '14px',
              borderRadius: '10px',
              marginBottom: '18px',
            }}
          >
            {error}
          </div>
        )}

        {/* ====================================================
            TIER 1
        ==================================================== */}

        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '20px',
          }}
        >
          <TierHeader
            number="1"
            title="BVN Verification"
            description="Verify your identity using your Bank Verification Number."
            status={kyc.tier1_status}
            statusLabel={statusLabel(
              kyc.tier1_status
            )}
            statusBackground={statusBackground(
              kyc.tier1_status
            )}
            statusColor={statusColor(
              kyc.tier1_status
            )}
          />

          {kyc.tier1_status !==
            'verified' && (
            <form
              onSubmit={submitTier1}
              style={{
                marginTop: '22px',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '7px',
                }}
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
                Your BVN will be securely
                verified through an approved
                verification provider.
              </p>

              <button
                type="submit"
                disabled={submitting}
                style={buttonStyle(
                  submitting
                )}
              >
                {submitting
                  ? 'Submitting...'
                  : 'Verify BVN'}
              </button>
            </form>
          )}
        </section>

        {/* ====================================================
            TIER 2
        ==================================================== */}

        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '20px',
            opacity:
              kyc.tier1_status ===
              'verified'
                ? 1
                : 0.6,
          }}
        >
          <TierHeader
            number="2"
            title="Identity Verification"
            description="Verify your identity using a government-issued identification document."
            status={kyc.tier2_status}
            statusLabel={statusLabel(
              kyc.tier2_status
            )}
            statusBackground={statusBackground(
              kyc.tier2_status
            )}
            statusColor={statusColor(
              kyc.tier2_status
            )}
          />

          {kyc.tier1_status !==
            'verified' ? (
            <LockedMessage>
              Tier 1 BVN verification must be
              completed before Tier 2 becomes
              available.
            </LockedMessage>
          ) : (
            kyc.tier2_status !==
              'verified' && (
              <form
                onSubmit={submitTier2}
                style={{
                  marginTop: '22px',
                }}
              >
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
                  <option value="">
                    Select document type
                  </option>

                  <option value="national_id">
                    National ID
                  </option>

                  <option value="nin">
                    NIN
                  </option>

                  <option value="passport">
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
                  value={
                    documentNumber
                  }
                  onChange={(event) =>
                    setDocumentNumber(
                      event.target.value
                    )
                  }
                  placeholder="Enter your ID number"
                  style={inputStyle}
                />

                <label
                  style={labelStyle}
                >
                  ID Document Front
                </label>

                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) =>
                    setDocumentFront(
                      event.target.files?.[0] ||
                        null
                    )
                  }
                  style={fileStyle}
                />

                <label
                  style={labelStyle}
                >
                  ID Document Back
                </label>

                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) =>
                    setDocumentBack(
                      event.target.files?.[0] ||
                        null
                    )
                  }
                  style={fileStyle}
                />

                <label
                  style={labelStyle}
                >
                  Selfie
                </label>

                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(event) =>
                    setSelfie(
                      event.target.files?.[0] ||
                        null
                    )
                  }
                  style={fileStyle}
                />

                <button
                  type="submit"
                  disabled={submitting}
                  style={buttonStyle(
                    submitting
                  )}
                >
                  {submitting
                    ? 'Submitting...'
                    : 'Submit Identity Verification'}
                </button>
              </form>
            )
          )}
        </section>

        {/* ====================================================
            TIER 3
        ==================================================== */}

        <section
          style={{
            background: '#ffffff',
            border:
              '1px solid #eaecf0',
            borderRadius: '16px',
            padding: '25px',
            marginBottom: '20px',
            opacity:
              kyc.tier2_status ===
              'verified'
                ? 1
                : 0.6,
          }}
        >
          <TierHeader
            number="3"
            title="Address Verification"
            description="Choose one method to verify your residential address."
            status={kyc.tier3_status}
            statusLabel={statusLabel(
              kyc.tier3_status
            )}
            statusBackground={statusBackground(
              kyc.tier3_status
            )}
            statusColor={statusColor(
              kyc.tier3_status
            )}
          />

          {kyc.tier2_status !==
            'verified' ? (
            <LockedMessage>
              Tier 2 identity verification must
              be completed before Tier 3 becomes
              available.
            </LockedMessage>
          ) : (
            kyc.tier3_status !==
              'verified' && (
              <form
                onSubmit={submitTier3}
                style={{
                  marginTop: '22px',
                }}
              >
                <p
                  style={{
                    color: '#475467',
                    marginBottom:
                      '15px',
                  }}
                >
                  Choose <strong>one</strong> of
                  the following verification
                  methods:
                </p>

                <div
                  style={{
                    display: 'grid',
                    gap: '12px',
                  }}
                >
                  <VerificationOption
                    value="bank_statement"
                    title="Bank Statement"
                    description="Upload a recent bank statement showing your name and address."
                    selected={
                      tier3Method ===
                      'bank_statement'
                    }
                    onSelect={() =>
                      setTier3Method(
                        'bank_statement'
                      )
                    }
                  />

                  <VerificationOption
                    value="utility_bill"
                    title="Utility Bill"
                    description="Upload an eligible recent utility bill showing your address."
                    selected={
                      tier3Method ===
                      'utility_bill'
                    }
                    onSelect={() =>
                      setTier3Method(
                        'utility_bill'
                      )
                    }
                  />

                  <VerificationOption
                    value="proof_of_address"
                    title="Proof of Address"
                    description="Upload an accepted proof-of-address document."
                    selected={
                      tier3Method ===
                      'proof_of_address'
                    }
                    onSelect={() =>
                      setTier3Method(
                        'proof_of_address'
                      )
                    }
                  />
                </div>

                {tier3Method && (
                  <div
                    style={{
                      marginTop:
                        '20px',
                    }}
                  >
                    <label
                      style={labelStyle}
                    >
                      Upload{' '}
                      {tier3Method ===
                      'bank_statement'
                        ? 'Bank Statement'
                        : tier3Method ===
                          'utility_bill'
                        ? 'Utility Bill'
                        : 'Proof of Address'}
                    </label>

                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(
                        event
                      ) =>
                        setTier3Document(
                          event.target
                            .files?.[0] ||
                            null
                        )
                      }
                      style={fileStyle}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !tier3Method
                  }
                  style={buttonStyle(
                    submitting ||
                      !tier3Method
                  )}
                >
                  {submitting
                    ? 'Submitting...'
                    : 'Submit Tier 3 Verification'}
                </button>
              </form>
            )
          )}
        </section>

        {/* Security Notice */}

        <div
          style={{
            background: '#eef4ff',
            borderRadius: '12px',
            padding: '16px',
            color: '#344054',
            fontSize: '14px',
            lineHeight: 1.6,
          }}
        >
          <strong>
            🔒 Your information is protected
          </strong>

          <br />

          KYC information should only be
          processed through approved verification
          and document-storage providers. Never
          expose identity documents or sensitive
          verification data publicly.
        </div>
      </div>
    </div>
  );
};

/*
 * ============================================================
 * TIER HEADER
 * ============================================================
 */

interface TierHeaderProps {
  number: string;
  title: string;
  description: string;
  status?: TierStatus;
  statusLabel: string;
  statusBackground: string;
  statusColor: string;
}

const TierHeader: React.FC<
  TierHeaderProps
> = ({
  number,
  title,
  description,
  statusLabel,
  statusBackground,
  statusColor,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '15px',
      }}
    >
      <div
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: '#0b5cff',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {number}
      </div>

      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          <h2
            style={{
              margin: 0,
              color: '#172033',
              fontSize: '21px',
            }}
          >
            {title}
          </h2>

          <span
            style={{
              padding:
                '6px 11px',
              borderRadius: '20px',
              background:
                statusBackground,
              color: statusColor,
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            {statusLabel}
          </span>
        </div>

        <p
          style={{
            margin:
              '7px 0 0',
            color: '#667085',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

/*
 * ============================================================
 * LOCKED MESSAGE
 * ============================================================
 */

const LockedMessage: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <div
      style={{
        marginTop: '20px',
        padding: '14px',
        borderRadius: '10px',
        background: '#f2f4f7',
        color: '#667085',
        fontSize: '14px',
      }}
    >
      🔒 {children}
    </div>
  );
};

/*
 * ============================================================
 * TIER 3 OPTION
 * ============================================================
 */

interface VerificationOptionProps {
  value: string;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}

const VerificationOption: React.FC<
  VerificationOptionProps
> = ({
  title,
  description,
  selected,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        textAlign: 'left',
        width: '100%',
        padding: '16px',
        border: selected
          ? '2px solid #0b5cff'
          : '1px solid #d0d5dd',
        borderRadius: '12px',
        background: selected
          ? '#f5f8ff'
          : '#ffffff',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            border: selected
              ? '6px solid #0b5cff'
              : '2px solid #98a2b3',
            boxSizing:
              'border-box',
            marginTop: '2px',
            flexShrink: 0,
          }}
        />

        <div>
          <strong
            style={{
              display: 'block',
              color: '#172033',
              marginBottom: '4px',
            }}
          >
            {title}
          </strong>

          <span
            style={{
              color: '#667085',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            {description}
          </span>
        </div>
      </div>
    </button>
  );
};

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  marginBottom: '18px',
  border: '1px solid #d0d5dd',
  borderRadius: '8px',
  fontSize: '15px',
  boxSizing: 'border-box',
  background: '#ffffff',
};

const fileStyle: React.CSSProperties = {
  width: '100%',
  marginBottom: '20px',
  fontSize: '14px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '7px',
  fontWeight: 600,
  color: '#172033',
};

const buttonStyle = (
  disabled: boolean
): React.CSSProperties => ({
  width: '100%',
  padding: '14px',
  border: 'none',
  borderRadius: '9px',
  background: '#0b5cff',
  color: '#ffffff',
  fontWeight: 700,
  fontSize: '15px',
  cursor: disabled
    ? 'not-allowed'
    : 'pointer',
  opacity: disabled ? 0.7 : 1,
  marginTop: '5px',
});

export default KYC;
