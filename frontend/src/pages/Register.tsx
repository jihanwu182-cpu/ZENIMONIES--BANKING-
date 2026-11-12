
import React, { FormEvent, useEffect, useState } from 'react';
import axios, { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING — PERSONAL REGISTRATION
// Five-step phone and email verification
// ============================================================

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const AUTH_URL = `${API_URL}/api/auth`;

type Step =
  | 'phone'
  | 'phoneOtp'
  | 'email'
  | 'emailOtp'
  | 'profile';

type RegisterResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  access_token?: string;
  session_expires_at?: string;
  user?: any;
  account?: any;
  development_otp?: string;
  retry_after_seconds?: number;
};

const cleanText = (value: string) =>
  value.trim().replace(/\s+/g, ' ');

const cleanEmail = (value: string) =>
  value.trim().toLowerCase();

const cleanPhone = (value: string) =>
  value.trim().replace(/[\s()-]/g, '');

const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<RegisterResponse>;
    const response = axiosError.response;

    if (response?.data?.message) {
      return response.data.message;
    }

    if (axiosError.code === 'ECONNABORTED') {
      return 'The server took too long to respond. Please try again.';
    }

    if (!response) {
      return 'Unable to reach the ZENIMONIES server. Check your internet connection.';
    }

    return `Registration failed. Server returned HTTP ${response.status}.`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unable to complete registration. Please try again.';
};

const Register: React.FC = () => {
  const navigate = useNavigate();

  // ==========================================================
  // REGISTRATION STATE
  // ==========================================================

  const [step, setStep] = useState<Step>('phone');

  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [surname, setSurname] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // ==========================================================
  // RESEND COUNTDOWN
  // ==========================================================

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  // ==========================================================
  // API REQUEST
  // ==========================================================

  const sendRequest = async (
    endpoint: string,
    payload: Record<string, string>
  ): Promise<RegisterResponse> => {
    const response = await axios.post<RegisterResponse>(
      `${AUTH_URL}${endpoint}`,
      payload,
      {
        timeout: 60000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    if (response.data?.success !== true) {
      throw new Error(
        response.data?.message || 'The server rejected this request.'
      );
    }

    return response.data;
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const showRequestError = (err: unknown) => {
    if (
      axios.isAxiosError(err) &&
      err.response?.data?.retry_after_seconds
    ) {
      setCountdown(
        Number(err.response.data.retry_after_seconds)
      );
    }

    setError(getErrorMessage(err));
  };

  // ==========================================================
  // STEP 1 — SEND PHONE OTP
  // ==========================================================

  const startPhoneVerification = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    resetMessages();

    const cleanPhoneNumber = cleanPhone(phone);

    if (!/^(\+234\d{10}|234\d{10}|0\d{10})$/.test(cleanPhoneNumber)) {
      setError(
        'Enter a valid Nigerian phone number, for example 08012345678.'
      );
      return;
    }

    setLoading(true);

    try {
      const data = await sendRequest(
        '/registration/phone',
        {
          phone: cleanPhoneNumber,
        }
      );

      setPhone(cleanPhoneNumber);
      setOtp('');
      setCountdown(60);
      setStep('phoneOtp');

      setSuccess(
        'A verification code has been sent to your phone.'
      );

      if (data.development_otp) {
        setSuccess(
          `Development test code: ${data.development_otp}`
        );
      }
    } catch (err) {
      showRequestError(err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // STEP 2 — VERIFY PHONE OTP
  // ==========================================================

  const verifyPhone = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    resetMessages();

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the six-digit phone verification code.');
      return;
    }

    setLoading(true);

    try {
      await sendRequest(
        '/registration/phone/verify',
        {
          phone,
          otp: otp.trim(),
        }
      );

      setPhoneVerified(true);
      setOtp('');
      setCountdown(0);
      setStep('email');

      setSuccess('Your phone number has been verified successfully.');
    } catch (err) {
      showRequestError(err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // STEP 3 — SEND EMAIL OTP
  // ==========================================================

  const startEmailVerification = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    resetMessages();

    const cleanEmailAddress = cleanEmail(email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmailAddress)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!phoneVerified) {
      setError('Verify your phone number before continuing.');
      return;
    }

    setLoading(true);

    try {
      const data = await sendRequest(
        '/registration/email',
        {
          phone,
          email: cleanEmailAddress,
        }
      );

      setEmail(cleanEmailAddress);
      setOtp('');
      setCountdown(60);
      setStep('emailOtp');

      setSuccess(
        'A verification code has been sent to your email.'
      );

      if (data.development_otp) {
        setSuccess(
          `Development test code: ${data.development_otp}`
        );
      }
    } catch (err) {
      showRequestError(err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // STEP 4 — VERIFY EMAIL OTP
  // ==========================================================

  const verifyEmail = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    resetMessages();

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Enter the six-digit email verification code.');
      return;
    }

    setLoading(true);

    try {
      await sendRequest(
        '/registration/email/verify',
        {
          phone,
          email,
          otp: otp.trim(),
        }
      );

      setEmailVerified(true);
      setOtp('');
      setCountdown(0);
      setStep('profile');

      setSuccess(
        'Your email has been verified. Complete your profile to create your account.'
      );
    } catch (err) {
      showRequestError(err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // RESEND OTP
  // ==========================================================

  const resendCode = async () => {
    if (loading || countdown > 0) return;

    resetMessages();
    setLoading(true);

    try {
      const isPhoneStep = step === 'phoneOtp';

      const endpoint = isPhoneStep
        ? '/registration/phone'
        : '/registration/email';

      const payload = isPhoneStep
        ? { phone }
        : { phone, email };

      const data = await sendRequest(endpoint, payload);

      setOtp('');
      setCountdown(60);

      setSuccess(
        isPhoneStep
          ? 'A new phone verification code has been sent.'
          : 'A new email verification code has been sent.'
      );

      if (data.development_otp) {
        setSuccess(
          `Development test code: ${data.development_otp}`
        );
      }
    } catch (err) {
      showRequestError(err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // SAVE AUTHENTICATED SESSION
  // ==========================================================

  const saveAuthenticatedSession = (
    data: RegisterResponse
  ) => {
    const token = data.token || data.access_token;

    if (!token) {
      throw new Error(
        'Your account was created, but the server did not return a login token. Please sign in.'
      );
    }

    // Keep the same authentication keys used by Login.tsx.
    localStorage.setItem('zenimonies_token', token);
    localStorage.setItem('token', token);

    sessionStorage.setItem('zenimonies_token', token);
    sessionStorage.setItem('token', token);

    if (data.user) {
      localStorage.setItem(
        'zenimonies_user',
        JSON.stringify(data.user)
      );
    }

    localStorage.setItem(
      'zenimonies_accounts',
      JSON.stringify(data.account ? [data.account] : [])
    );
  };

  // ==========================================================
  // STEP 5 — COMPLETE PERSONAL REGISTRATION
  // ==========================================================

  const completeRegistration = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    resetMessages();

    if (!phoneVerified || !emailVerified) {
      setError(
        'Both your phone number and email address must be verified.'
      );
      return;
    }

    const cleanFirstName = cleanText(firstName);
    const cleanMiddleName = cleanText(middleName);
    const cleanSurname = cleanText(surname);

    if (cleanFirstName.length < 2 || cleanFirstName.length > 100) {
      setError('First name must contain between 2 and 100 characters.');
      return;
    }

    if (cleanSurname.length < 2 || cleanSurname.length > 100) {
      setError('Surname must contain between 2 and 100 characters.');
      return;
    }

    if (
      cleanMiddleName &&
      (cleanMiddleName.length < 2 || cleanMiddleName.length > 100)
    ) {
      setError('Middle name must contain between 2 and 100 characters.');
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError('Password must contain between 8 and 128 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const data = await sendRequest(
        '/registration/complete',
        {
          phone,
          first_name: cleanFirstName,
          middle_name: cleanMiddleName,
          surname: cleanSurname,
          password,
        }
      );

      // The account is now created only after both OTPs
      // have been verified by the backend.

      setPassword('');
      setConfirmPassword('');

      if (data.token || data.access_token) {
        saveAuthenticatedSession(data);

        setSuccess(
          data.message ||
            'Your ZENIMONIES Personal Banking account has been created.'
        );

        window.setTimeout(() => {
          navigate('/', { replace: true });
        }, 900);
      } else {
        setSuccess(
          'Your account has been created. Please sign in to continue.'
        );

        window.setTimeout(() => {
          navigate('/login', { replace: true });
        }, 1200);
      }
    } catch (err) {
      showRequestError(err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // PROGRESS
  // ==========================================================

  const stepNumber: Record<Step, number> = {
    phone: 1,
    phoneOtp: 2,
    email: 3,
    emailOtp: 4,
    profile: 5,
  };

  const stepTitles: Record<Step, string> = {
    phone: 'Verify your phone',
    phoneOtp: 'Confirm your phone',
    email: 'Verify your email',
    emailOtp: 'Confirm your email',
    profile: 'Create your profile',
  };

  const stepDescriptions: Record<Step, string> = {
    phone: 'Start with your Nigerian mobile number.',
    phoneOtp: 'Enter the six-digit code sent to your phone.',
    email: 'Add an email address you can access.',
    emailOtp: 'Enter the six-digit code sent to your inbox.',
    profile: 'Complete your details to create your personal account.',
  };

  const stepLabels = [
    'Phone',
    'Phone OTP',
    'Email',
    'Email OTP',
    'Profile',
  ];

  // ==========================================================
  // FIELD COMPONENT
  // ==========================================================

  const renderInput = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    options: {
      type?: string;
      autoComplete?: string;
      maxLength?: number;
      inputMode?: 'text' | 'email' | 'tel' | 'numeric';
    } = {}
  ) => (
    <div style={fieldStyle}>
      <label style={labelStyle}>{label}</label>

      <input
        type={options.type || 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={options.autoComplete}
        maxLength={options.maxLength}
        inputMode={options.inputMode}
        disabled={loading}
        style={inputStyle}
      />
    </div>
  );

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* BRAND */}

        <div style={brandStyle}>
          <div style={brandNameStyle}>ZENIMONIES</div>
          <div style={brandSubtitleStyle}>PERSONAL BANKING</div>
        </div>

        {/* HEADING */}

        <div style={{ marginBottom: 24 }}>
          <div style={eyebrowStyle}>
            CREATE YOUR ACCOUNT
          </div>

          <h1 style={headingStyle}>
            {stepTitles[step]}
          </h1>

          <p style={descriptionStyle}>
            {stepDescriptions[step]}
          </p>
        </div>

        {/* PROGRESS */}

        <div style={{ marginBottom: 25 }}>
          <div style={progressHeaderStyle}>
            <span>STEP {stepNumber[step]} OF 5</span>
            <span>{stepNumber[step] * 20}%</span>
          </div>

          <div style={progressTrackStyle}>
            <div
              style={{
                ...progressFillStyle,
                width: `${stepNumber[step] * 20}%`,
              }}
            />
          </div>

          <div style={stepLabelsStyle}>
            {stepLabels.map((label, index) => {
              const active = index < stepNumber[step];

              return (
                <div key={label} style={stepLabelItemStyle}>
                  <div
                    style={{
                      ...stepDotStyle,
                      background: active ? '#138a4b' : '#dce8e0',
                    }}
                  />

                  <span
                    style={{
                      ...stepLabelTextStyle,
                      color: active ? '#087443' : '#98a69d',
                    }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ALERTS */}

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}

        {success && (
          <div style={successStyle}>
            {success}
          </div>
        )}

        {/* STEP 1 */}

        {step === 'phone' && (
          <form onSubmit={startPhoneVerification}>
            {renderInput(
              'Nigerian phone number',
              phone,
              setPhone,
              '08012345678',
              {
                type: 'tel',
                autoComplete: 'tel',
                inputMode: 'tel',
                maxLength: 15,
              }
            )}

            <p style={noteStyle}>
              We will send a one-time verification code to this number.
            </p>

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle(loading)}
            >
              {loading ? 'Sending code...' : 'Send verification code'}
            </button>
          </form>
        )}

        {/* STEP 2 */}

        {step === 'phoneOtp' && (
          <form onSubmit={verifyPhone}>
            <div style={verifiedBoxStyle}>
              Verifying phone: {phone}
            </div>

            {renderInput(
              'Six-digit verification code',
              otp,
              setOtp,
              '000000',
              {
                inputMode: 'numeric',
                maxLength: 6,
              }
            )}

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle(loading)}
            >
              {loading ? 'Verifying...' : 'Verify phone number'}
            </button>

            <div style={resendTextStyle}>
              {countdown > 0
                ? `You can request another code in ${countdown} seconds.`
                : "Didn't receive a code?"}
            </div>

            <button
              type="button"
              onClick={resendCode}
              disabled={loading || countdown > 0}
              style={linkButtonStyle(loading || countdown > 0)}
            >
              Resend phone code
            </button>
          </form>
        )}

        {/* STEP 3 */}

        {step === 'email' && (
          <form onSubmit={startEmailVerification}>
            <div style={verifiedBoxStyle}>
              ✓ Phone number verified
            </div>

            {renderInput(
              'Email address',
              email,
              setEmail,
              'you@example.com',
              {
                type: 'email',
                autoComplete: 'email',
                inputMode: 'email',
              }
            )}

            <p style={noteStyle}>
              Your email address will be used for important account notifications and security verification.
            </p>

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle(loading)}
            >
              {loading ? 'Sending code...' : 'Send email verification code'}
            </button>
          </form>
        )}

        {/* STEP 4 */}

        {step === 'emailOtp' && (
          <form onSubmit={verifyEmail}>
            <div style={verifiedBoxStyle}>
              ✓ Phone verified
              <br />
              Email: {email}
            </div>

            {renderInput(
              'Six-digit email verification code',
              otp,
              setOtp,
              '000000',
              {
                inputMode: 'numeric',
                maxLength: 6,
              }
            )}

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle(loading)}
            >
              {loading ? 'Verifying...' : 'Verify email address'}
            </button>

            <div style={resendTextStyle}>
              {countdown > 0
                ? `You can request another code in ${countdown} seconds.`
                : "Didn't receive a code?"}
            </div>

            <button
              type="button"
              onClick={resendCode}
              disabled={loading || countdown > 0}
              style={linkButtonStyle(loading || countdown > 0)}
            >
              Resend email code
            </button>
          </form>
        )}

        {/* STEP 5 */}

        {step === 'profile' && (
          <form onSubmit={completeRegistration}>
            <div style={verifiedBoxStyle}>
              ✓ Phone verified
              <br />
              ✓ Email verified
            </div>

            {renderInput(
              'First name',
              firstName,
              setFirstName,
              'Enter your first name',
              { autoComplete: 'given-name' }
            )}

            {renderInput(
              'Middle name (optional)',
              middleName,
              setMiddleName,
              'Enter your middle name',
              { autoComplete: 'additional-name' }
            )}

            {renderInput(
              'Surname',
              surname,
              setSurname,
              'Enter your surname',
              { autoComplete: 'family-name' }
            )}

            <div style={fieldStyle}>
              <label style={labelStyle}>Password</label>

              <div style={passwordWrapperStyle}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a secure password"
                  autoComplete="new-password"
                  disabled={loading}
                  style={passwordInputStyle}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  style={showButtonStyle}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>

              <span style={smallNoteStyle}>
                Minimum 8 characters.
              </span>
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Confirm password</label>

              <div style={passwordWrapperStyle}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  disabled={loading}
                  style={passwordInputStyle}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmPassword((value) => !value)
                  }
                  style={showButtonStyle}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <p style={noteStyle}>
              Your personal account will be created in Nigerian Naira (NGN).
              You can complete identity verification from your profile.
            </p>

            <button
              type="submit"
              disabled={loading}
              style={buttonStyle(loading)}
            >
              {loading ? 'Creating your account...' : 'Create my account'}
            </button>
          </form>
        )}

        {/* FOOTER */}

        <div style={footerStyle}>
          Already have a ZENIMONIES account?{' '}
          <Link to="/login" style={loginLinkStyle}>
            Sign in
          </Link>
        </div>

        <div style={securityStyle}>
          SECURE REGISTRATION • ZENIMONIES BANKING
        </div>
      </div>
    </div>
  );
};

// ============================================================
// STYLES
// ============================================================

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 14px',
  boxSizing: 'border-box',
  background: 'linear-gradient(135deg, #f4fbf7 0%, #ffffff 55%, #eef8f2 100%)',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 520,
  padding: '30px',
  borderRadius: 22,
  background: '#ffffff',
  border: '1px solid #e2eee6',
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.07)',
  boxSizing: 'border-box',
};

const brandStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 28,
};

const brandNameStyle: React.CSSProperties = {
  color: '#138a4b',
  fontSize: 30,
  fontWeight: 900,
  letterSpacing: '-0.8px',
};

const brandSubtitleStyle: React.CSSProperties = {
  marginTop: 5,
  color: '#718078',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: 3,
};

const eyebrowStyle: React.CSSProperties = {
  color: '#138a4b',
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 2,
  marginBottom: 10,
};

const headingStyle: React.CSSProperties = {
  margin: 0,
  color: '#14251c',
  fontSize: 28,
  lineHeight: 1.25,
  fontWeight: 900,
};

const descriptionStyle: React.CSSProperties = {
  margin: '9px 0 0',
  color: '#718078',
  fontSize: 14,
  lineHeight: 1.6,
};

const progressHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 8,
  color: '#087443',
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: 1,
};

const progressTrackStyle: React.CSSProperties = {
  height: 6,
  borderRadius: 10,
  overflow: 'hidden',
  background: '#edf3ef',
};

const progressFillStyle: React.CSSProperties = {
  height: 6,
  borderRadius: 10,
  background: '#138a4b',
  transition: 'width 0.25s ease',
};

const stepLabelsStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 3,
  marginTop: 13,
};

const stepLabelItemStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
};

const stepDotStyle: React.CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: '50%',
};

const stepLabelTextStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  textAlign: 'center',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: 17,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 7,
  color: '#1f2937',
  fontSize: 13,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px 13px',
  borderRadius: 11,
  border: '1px solid #dce8e0',
  background: '#f7faf8',
  color: '#14251c',
  fontSize: 15,
  outline: 'none',
};

const passwordWrapperStyle: React.CSSProperties = {
  position: 'relative',
};

const passwordInputStyle: React.CSSProperties = {
  ...inputStyle,
  paddingRight: 75,
};

const showButtonStyle: React.CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  border: 0,
  background: 'transparent',
  color: '#138a4b',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
};

const smallNoteStyle: React.CSSProperties = {
  display: 'block',
  marginTop: 6,
  color: '#718078',
  fontSize: 11,
};

const noteStyle: React.CSSProperties = {
  margin: '0 0 17px',
  color: '#718078',
  fontSize: 12,
  lineHeight: 1.6,
};

const verifiedBoxStyle: React.CSSProperties = {
  padding: 13,
  marginBottom: 18,
  borderRadius: 11,
  background: '#effbf4',
  border: '1px solid #c8efd7',
  color: '#087443',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.8,
};

const buttonStyle = (loading: boolean): React.CSSProperties => ({
  width: '100%',
  minHeight: 52,
  padding: '13px 16px',
  border: 0,
  borderRadius: 11,
  background: loading ? '#7bbd9b' : '#138a4b',
  color: '#ffffff',
  fontSize: 15,
  fontWeight: 800,
  cursor: loading ? 'not-allowed' : 'pointer',
  boxShadow: '0 6px 16px rgba(19, 138, 75, 0.16)',
});

const errorStyle: React.CSSProperties = {
  marginBottom: 17,
  padding: 13,
  borderRadius: 10,
  background: '#fff1f1',
  border: '1px solid #ffd2d2',
  color: '#b42318',
  fontSize: 13,
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
};

const successStyle: React.CSSProperties = {
  marginBottom: 17,
  padding: 13,
  borderRadius: 10,
  background: '#effbf4',
  border: '1px solid #c8efd7',
  color: '#087443',
  fontSize: 13,
  lineHeight: 1.5,
  overflowWrap: 'anywhere',
};

const resendTextStyle: React.CSSProperties = {
  marginTop: 14,
  color: '#718078',
  fontSize: 12,
  textAlign: 'center',
};

const linkButtonStyle = (disabled: boolean): React.CSSProperties => ({
  display: 'block',
  margin: '7px auto 0',
  padding: 7,
  border: 0,
  background: 'transparent',
  color: disabled ? '#98a69d' : '#138a4b',
  fontSize: 13,
  fontWeight: 800,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

const footerStyle: React.CSSProperties = {
  marginTop: 24,
  textAlign: 'center',
  color: '#718078',
  fontSize: 13,
  lineHeight: 1.6,
};

const loginLinkStyle: React.CSSProperties = {
  color: '#138a4b',
  fontWeight: 800,
  textDecoration: 'none',
};

const securityStyle: React.CSSProperties = {
  marginTop: 20,
  paddingTop: 15,
  borderTop: '1px solid #edf0f2',
  textAlign: 'center',
  color: '#98a69d',
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: 1.2,
};

export default Register;
