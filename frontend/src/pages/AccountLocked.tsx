import React from 'react';
import { useNavigate } from 'react-router-dom';

const AccountLocked: React.FC = () => {
  const navigate = useNavigate();

  const handlePasskeyUnlock = () => {
    // Passkey unlock will be connected in the next step.
    navigate('/passkey-security');
  };

  const handlePasswordUnlock = () => {
    // Password fallback will be connected in the next step.
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6faf8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        color: '#172b22',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#ffffff',
          border: '1px solid #e5ebe8',
          borderRadius: '24px',
          padding: '34px 26px',
          boxShadow: '0 12px 35px rgba(26, 61, 47, 0.08)',
          textAlign: 'center',
        }}
      >
        {/* Zenimonies Logo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '22px',
          }}
        >
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '17px',
              background: 'linear-gradient(135deg, #079447, #007a3f)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: 800,
              boxShadow: '0 8px 20px rgba(7, 148, 71, 0.18)',
            }}
          >
            Z
          </div>
        </div>

        {/* Lock Icon */}
        <div
          style={{
            width: '76px',
            height: '76px',
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: '#fff4e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '34px',
          }}
        >
          🔒
        </div>

        {/* Title */}
        <h1
          style={{
            margin: '0 0 10px',
            color: '#063b2d',
            fontSize: '25px',
            fontWeight: 800,
          }}
        >
          Account Locked
        </h1>

        {/* Description */}
        <p
          style={{
            margin: '0 auto',
            maxWidth: '340px',
            color: '#66756e',
            fontSize: '14px',
            lineHeight: 1.65,
          }}
        >
          Your Zenimonies account has been temporarily locked because
          there has been no activity for 5 minutes.
        </p>

        {/* Security notice */}
        <div
          style={{
            marginTop: '22px',
            padding: '15px',
            borderRadius: '14px',
            background: '#effbf5',
            border: '1px solid #d2eee0',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              color: '#05603a',
              fontSize: '13px',
              fontWeight: 800,
              marginBottom: '5px',
            }}
          >
            Your account is secure
          </div>

          <div
            style={{
              color: '#66756e',
              fontSize: '12px',
              lineHeight: 1.55,
            }}
          >
            Your session remains protected. Unlock your account to
            continue using Zenimonies.
          </div>
        </div>

        {/* Passkey Button */}
        <button
          type="button"
          onClick={handlePasskeyUnlock}
          style={{
            width: '100%',
            marginTop: '22px',
            border: 'none',
            borderRadius: '12px',
            background: '#079447',
            color: '#ffffff',
            padding: '14px 18px',
            fontSize: '14px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 7px 18px rgba(7, 148, 71, 0.18)',
          }}
        >
          🔐 Unlock with Passkey
        </button>

        {/* Divider */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '22px 0',
            color: '#98a2a0',
            fontSize: '11px',
            fontWeight: 700,
          }}
        >
          <div
            style={{
              flex: 1,
              height: '1px',
              background: '#e5ebe8',
            }}
          />

          OR

          <div
            style={{
              flex: 1,
              height: '1px',
              background: '#e5ebe8',
            }}
          />
        </div>

        {/* Password fallback */}
        <button
          type="button"
          onClick={handlePasswordUnlock}
          style={{
            width: '100%',
            border: '1px solid #d0d9d5',
            borderRadius: '12px',
            background: '#ffffff',
            color: '#344054',
            padding: '13px 18px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Use Password Instead
        </button>

        {/* Footer */}
        <div
          style={{
            marginTop: '22px',
            color: '#98a2b3',
            fontSize: '11px',
            lineHeight: 1.5,
          }}
        >
          For your security, Zenimonies automatically locks inactive
          sessions.
        </div>
      </div>
    </div>
  );
};

export default AccountLocked;
