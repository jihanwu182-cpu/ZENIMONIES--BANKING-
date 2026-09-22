import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

interface StorageStatus {
  localZenimonies: boolean;
  localToken: boolean;
  localAccessToken: boolean;
  sessionZenimonies: boolean;
  sessionToken: boolean;
  sessionAccessToken: boolean;
}

const getStorageStatus = (): StorageStatus => {
  return {
    localZenimonies: Boolean(
      localStorage.getItem('zenimonies_token')
    ),

    localToken: Boolean(
      localStorage.getItem('token')
    ),

    localAccessToken: Boolean(
      localStorage.getItem('access_token')
    ),

    sessionZenimonies: Boolean(
      sessionStorage.getItem('zenimonies_token')
    ),

    sessionToken: Boolean(
      sessionStorage.getItem('token')
    ),

    sessionAccessToken: Boolean(
      sessionStorage.getItem('access_token')
    ),
  };
};

const getToken = (): string | null => {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('zenimonies_token') ||
    sessionStorage.getItem('token') ||
    sessionStorage.getItem('access_token')
  );
};

const ElectricityReconciliation: React.FC = () => {
  const [storage, setStorage] =
    useState<StorageStatus | null>(null);

  const [checking, setChecking] =
    useState(false);

  const [result, setResult] =
    useState('');

  const runDiagnostic = async () => {
    setChecking(true);
    setResult('');

    const currentStorage =
      getStorageStatus();

    setStorage(currentStorage);

    const token = getToken();

    console.log(
      '========== ZENIMONIES AUTH DIAGNOSTIC =========='
    );

    console.log(
      'localStorage zenimonies_token:',
      currentStorage.localZenimonies
    );

    console.log(
      'localStorage token:',
      currentStorage.localToken
    );

    console.log(
      'localStorage access_token:',
      currentStorage.localAccessToken
    );

    console.log(
      'sessionStorage zenimonies_token:',
      currentStorage.sessionZenimonies
    );

    console.log(
      'sessionStorage token:',
      currentStorage.sessionToken
    );

    console.log(
      'sessionStorage access_token:',
      currentStorage.sessionAccessToken
    );

    console.log(
      'Token found:',
      Boolean(token)
    );

    /*
     * NEVER print the actual token.
     */

    if (!token) {
      setResult(
        'NO TOKEN FOUND IN BROWSER STORAGE'
      );

      setChecking(false);
      return;
    }

    try {
      const response =
        await axios.get(
          `${API_URL}/api/bills/electricity/reconciliation`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            timeout: 30000,
          }
        );

      console.log(
        'Reconciliation API status:',
        response.status
      );

      console.log(
        'Reconciliation API success:',
        response.data?.success
      );

      setResult(
        `TOKEN FOUND — API RESPONSE HTTP ${response.status}`
      );
    } catch (error: any) {
      console.error(
        'Reconciliation diagnostic API error:',
        error
      );

      const status =
        error?.response?.status;

      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unknown error';

      if (status) {
        setResult(
          `TOKEN FOUND — API RETURNED HTTP ${status}: ${message}`
        );
      } else {
        setResult(
          `TOKEN FOUND — API REQUEST FAILED: ${message}`
        );
      }
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const statusLabel = (
    value: boolean
  ) => value ? 'YES' : 'NO';

  const statusStyle = (
    value: boolean
  ): React.CSSProperties => ({
    fontWeight: 800,
    color:
      value
        ? '#087443'
        : '#b42318',
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7f6',
        padding: '24px 16px 40px',
        boxSizing: 'border-box',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 620,
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            marginTop: 0,
            color: '#172033',
          }}
        >
          Authentication Diagnostic
        </h1>

        <p
          style={{
            color: '#667085',
            lineHeight: 1.6,
          }}
        >
          This is a temporary read-only diagnostic.
          It does not make an electricity payment,
          debit your account, issue a refund, or
          change any transaction status.
        </p>

        {/* RESULT */}

        {result && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 12,
              background: '#ffffff',
              border:
                '1px solid #d0d5dd',
              fontWeight: 700,
              color: '#172033',
              wordBreak: 'break-word',
            }}
          >
            {result}
          </div>
        )}

        {/* LOCAL STORAGE */}

        <div
          style={{
            marginTop: 20,
            background: '#ffffff',
            borderRadius: 14,
            padding: 20,
            boxShadow:
              '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: '#172033',
            }}
          >
            localStorage
          </h2>

          <p>
            zenimonies_token:{' '}
            <span
              style={statusStyle(
                storage?.localZenimonies ||
                  false
              )}
            >
              {storage
                ? statusLabel(
                    storage.localZenimonies
                  )
                : 'CHECKING...'}
            </span>
          </p>

          <p>
            token:{' '}
            <span
              style={statusStyle(
                storage?.localToken ||
                  false
              )}
            >
              {storage
                ? statusLabel(
                    storage.localToken
                  )
                : 'CHECKING...'}
            </span>
          </p>

          <p>
            access_token:{' '}
            <span
              style={statusStyle(
                storage?.localAccessToken ||
                  false
              )}
            >
              {storage
                ? statusLabel(
                    storage.localAccessToken
                  )
                : 'CHECKING...'}
            </span>
          </p>
        </div>

        {/* SESSION STORAGE */}

        <div
          style={{
            marginTop: 20,
            background: '#ffffff',
            borderRadius: 14,
            padding: 20,
            boxShadow:
              '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <h2
            style={{
              marginTop: 0,
              color: '#172033',
            }}
          >
            sessionStorage
          </h2>

          <p>
            zenimonies_token:{' '}
            <span
              style={statusStyle(
                storage?.sessionZenimonies ||
                  false
              )}
            >
              {storage
                ? statusLabel(
                    storage.sessionZenimonies
                  )
                : 'CHECKING...'}
            </span>
          </p>

          <p>
            token:{' '}
            <span
              style={statusStyle(
                storage?.sessionToken ||
                  false
              )}
            >
              {storage
                ? statusLabel(
                    storage.sessionToken
                  )
                : 'CHECKING...'}
            </span>
          </p>

          <p>
            access_token:{' '}
            <span
              style={statusStyle(
                storage?.sessionAccessToken ||
                  false
              )}
            >
              {storage
                ? statusLabel(
                    storage.sessionAccessToken
                  )
                : 'CHECKING...'}
            </span>
          </p>
        </div>

        {/* REFRESH */}

        <button
          type="button"
          onClick={runDiagnostic}
          disabled={checking}
          style={{
            width: '100%',
            marginTop: 24,
            height: 54,
            border: 'none',
            borderRadius: 12,
            background:
              checking
                ? '#98a2b3'
                : '#159447',
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 800,
            cursor:
              checking
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {checking
            ? 'Checking...'
            : 'Run Diagnostic Again'}
        </button>

        <div
          style={{
            marginTop: 20,
            padding: 14,
            borderRadius: 10,
            background: '#fff7ed',
            border:
              '1px solid #fed7aa',
            color: '#9a3412',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Security note: this page intentionally
          shows only whether a token exists.
          The actual authentication token is never
          displayed.
        </div>
      </div>
    </div>
  );
};

export default ElectricityReconciliation;
