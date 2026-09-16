import React, { useCallback, useEffect, useState } from 'react';
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';

// ============================================================
// TYPES
// ============================================================

interface Passkey {
  id: string;
  credential_id: string;
  device_type: string | null;
  backed_up: boolean;
  transports: string | null;
  created_at: string;
  last_used_at: string | null;
}

interface ApiError {
  message?: string;
  code?: string;
  failedAttempts?: number;
  lockedUntil?: string | null;
}

// ============================================================
// API HELPERS
// ============================================================

const api = {
  async getPasskeys(): Promise<Passkey[]> {
    const res = await fetch('/api/passkeys', {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to load passkeys');
    }
    const data = await res.json();
    return data.passkeys ?? data;
  },

  async getRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    const res = await fetch('/api/passkeys/register/options', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to get registration options');
    }
    return res.json();
  },

  async verifyRegistration(
    response: RegistrationResponseJSON
  ): Promise<{ verified: boolean; passkey?: Passkey }> {
    const res = await fetch('/api/passkeys/register/verify', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Registration verification failed');
    }
    return res.json();
  },

  async deletePasskey(passkeyId: string): Promise<void> {
    const res = await fetch(`/api/passkeys/${passkeyId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to delete passkey');
    }
  },
};

// ============================================================
// UTILS
// ============================================================

function formatDate(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function shortCredentialId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function deviceLabel(deviceType: string | null, backedUp: boolean): string {
  if (!deviceType) return backedUp ? 'Synced passkey' : 'Device-bound passkey';
  const type = deviceType.replace(/_/g, ' ');
  return backedUp ? `${type} (synced)` : type;
}

// ============================================================
// COMPONENT
// ============================================================

export default function PasskeySecurity() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean | null>(null);

  // ----------------------------------------------------------
  // Check WebAuthn support
  // ----------------------------------------------------------
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      !!window.PublicKeyCredential &&
      typeof window.PublicKeyCredential === 'function';
    setIsSupported(supported);
  }, []);

  // ----------------------------------------------------------
  // Load passkeys
  // ----------------------------------------------------------
  const loadPasskeys = useCallback(async () => {
    setError(null);
    try {
      const list = await api.getPasskeys();
      setPasskeys(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.message || 'Could not load passkeys');
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPasskeys();
  }, [loadPasskeys]);

  // ----------------------------------------------------------
  // Register new passkey
  // ----------------------------------------------------------
  const handleRegister = async () => {
    if (!isSupported) {
      setError('Passkeys are not supported in this browser.');
      return;
    }

    setRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Get options from server
      const options = await api.getRegistrationOptions();

      // 2. Create credential via browser
      const attestationResponse = await startRegistration({
        optionsJSON: options,
      });

      // 3. Verify on server
      const result = await api.verifyRegistration(attestationResponse);

      if (result.verified) {
        setSuccess('Passkey registered successfully.');
        await loadPasskeys();
      } else {
        setError('Registration could not be verified.');
      }
    } catch (err: any) {
      // User cancelled or browser error
      if (err.name === 'NotAllowedError') {
        setError('Registration was cancelled or timed out.');
      } else if (err.name === 'InvalidStateError') {
        setError('This passkey is already registered on this device.');
      } else {
        setError(err.message || 'Failed to register passkey.');
      }
    } finally {
      setRegistering(false);
    }
  };

  // ----------------------------------------------------------
  // Delete passkey
  // ----------------------------------------------------------
  const handleDelete = async (passkey: Passkey) => {
    if (
      !window.confirm(
        `Remove this passkey?\n\n${shortCredentialId(passkey.credential_id)}\n\nYou will no longer be able to sign in with it.`
      )
    ) {
      return;
    }

    setDeletingId(passkey.id);
    setError(null);
    setSuccess(null);

    try {
      await api.deletePasskey(passkey.id);
      setSuccess('Passkey removed.');
      setPasskeys((prev) => prev.filter((p) => p.id !== passkey.id));
    } catch (err: any) {
      setError(err.message || 'Failed to remove passkey.');
    } finally {
      setDeletingId(null);
    }
  };

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
  if (isSupported === null) {
    return (
      <div className="passkey-security">
        <div className="passkey-security__loading">Checking passkey support…</div>
      </div>
    );
  }

  return (
    <div className="passkey-security">
      <header className="passkey-security__header">
        <h2 className="passkey-security__title">Passkeys</h2>
        <p className="passkey-security__subtitle">
          Passkeys let you sign in securely without a password using your device’s
          built-in authenticator (Face ID, Touch ID, Windows Hello, security key, etc.).
        </p>
      </header>

      {!isSupported && (
        <div className="passkey-security__alert passkey-security__alert--warning">
          Your browser does not support passkeys. Please use a modern browser
          (Chrome, Edge, Safari, Firefox) on a device with a secure authenticator.
        </div>
      )}

      {error && (
        <div className="passkey-security__alert passkey-security__alert--error" role="alert">
          {error}
          <button
            type="button"
            className="passkey-security__alert-dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div className="passkey-security__alert passkey-security__alert--success" role="status">
          {success}
          <button
            type="button"
            className="passkey-security__alert-dismiss"
            onClick={() => setSuccess(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <section className="passkey-security__actions">
        <button
          type="button"
          className="passkey-security__btn passkey-security__btn--primary"
          onClick={handleRegister}
          disabled={!isSupported || registering || loading}
        >
          {registering ? (
            <>
              <span className="passkey-security__spinner" aria-hidden />
              Waiting for authenticator…
            </>
          ) : (
            'Add a new passkey'
          )}
        </button>
      </section>

      <section className="passkey-security__list-section">
        <h3 className="passkey-security__list-title">
          Registered passkeys
          {!loading && (
            <span className="passkey-security__count">
              {passkeys.length}
            </span>
          )}
        </h3>

        {loading ? (
          <div className="passkey-security__loading">Loading your passkeys…</div>
        ) : passkeys.length === 0 ? (
          <div className="passkey-security__empty">
            <p>No passkeys registered yet.</p>
            <p className="passkey-security__empty-hint">
              Add a passkey to enable passwordless sign-in on this account.
            </p>
          </div>
        ) : (
          <ul className="passkey-security__list">
            {passkeys.map((pk) => (
              <li key={pk.id} className="passkey-security__item">
                <div className="passkey-security__item-main">
                  <div className="passkey-security__item-icon" aria-hidden>
                    🔐
                  </div>
                  <div className="passkey-security__item-info">
                    <div className="passkey-security__item-label">
                      {deviceLabel(pk.device_type, pk.backed_up)}
                    </div>
                    <div className="passkey-security__item-meta">
                      <span title={pk.credential_id}>
                        ID: {shortCredentialId(pk.credential_id)}
                      </span>
                      <span>Created: {formatDate(pk.created_at)}</span>
                      <span>Last used: {formatDate(pk.last_used_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="passkey-security__item-actions">
                  <button
                    type="button"
                    className="passkey-security__btn passkey-security__btn--danger"
                    onClick={() => handleDelete(pk)}
                    disabled={deletingId === pk.id}
                    aria-label={`Remove passkey ${shortCredentialId(pk.credential_id)}`}
                  >
                    {deletingId === pk.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="passkey-security__footer">
        <p>
          Passkeys are bound to this site and your authenticator. Losing all
          registered passkeys will require password recovery to regain access.
        </p>
      </footer>

      {/* ----------------------------------------------------------
          Styles (scoped)
          ---------------------------------------------------------- */}
      <style>{`
        .passkey-security {
          max-width: 640px;
          margin: 0 auto;
          padding: 1.5rem;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1a1a1a;
        }

        .passkey-security__header {
          margin-bottom: 1.5rem;
        }

        .passkey-security__title {
          margin: 0 0 0.5rem;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .passkey-security__subtitle {
          margin: 0;
          font-size: 0.95rem;
          color: #555;
          line-height: 1.5;
        }

        .passkey-security__alert {
          position: relative;
          padding: 0.85rem 2.2rem 0.85rem 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .passkey-security__alert--error {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

        .passkey-security__alert--success {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .passkey-security__alert--warning {
          background: #fffbeb;
          color: #92400e;
          border: 1px solid #fde68a;
        }

        .passkey-security__alert-dismiss {
          position: absolute;
          top: 0.5rem;
          right: 0.6rem;
          background: transparent;
          border: none;
          font-size: 1.25rem;
          line-height: 1;
          cursor: pointer;
          color: inherit;
          opacity: 0.7;
        }

        .passkey-security__alert-dismiss:hover {
          opacity: 1;
        }

        .passkey-security__actions {
          margin-bottom: 1.75rem;
        }

        .passkey-security__btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.15rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          border: 1px solid transparent;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, opacity 0.15s;
        }

        .passkey-security__btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .passkey-security__btn--primary {
          background: #2563eb;
          color: white;
        }

        .passkey-security__btn--primary:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .passkey-security__btn--danger {
          background: #fff;
          color: #b91c1c;
          border-color: #fecaca;
        }

        .passkey-security__btn--danger:hover:not(:disabled) {
          background: #fef2f2;
        }

        .passkey-security__spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255,255,255,0.35);
          border-top-color: white;
          border-radius: 50%;
          animation: passkey-spin 0.7s linear infinite;
        }

        @keyframes passkey-spin {
          to { transform: rotate(360deg); }
        }

        .passkey-security__list-section {
          margin-bottom: 1.5rem;
        }

        .passkey-security__list-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0 0 0.85rem;
          font-size: 1.05rem;
          font-weight: 600;
        }

        .passkey-security__count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 1.4rem;
          height: 1.4rem;
          padding: 0 0.35rem;
          border-radius: 999px;
          background: #e5e7eb;
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
        }

        .passkey-security__loading,
        .passkey-security__empty {
          padding: 1.5rem 1rem;
          text-align: center;
          color: #6b7280;
          background: #f9fafb;
          border-radius: 10px;
          border: 1px dashed #e5e7eb;
        }

        .passkey-security__empty p {
          margin: 0 0 0.35rem;
        }

        .passkey-security__empty-hint {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        .passkey-security__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .passkey-security__item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.9rem 1rem;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
        }

        .passkey-security__item-main {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          min-width: 0;
        }

        .passkey-security__item-icon {
          font-size: 1.35rem;
          line-height: 1;
          margin-top: 0.1rem;
        }

        .passkey-security__item-info {
          min-width: 0;
        }

        .passkey-security__item-label {
          font-weight: 500;
          margin-bottom: 0.25rem;
        }

        .passkey-security__item-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem 1rem;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .passkey-security__item-actions {
          flex-shrink: 0;
        }

        .passkey-security__footer {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          font-size: 0.8rem;
          color: #6b7280;
          line-height: 1.45;
        }

        .passkey-security__footer p {
          margin: 0;
        }

        @media (max-width: 520px) {
          .passkey-security__item {
            flex-direction: column;
            align-items: stretch;
          }

          .passkey-security__item-actions {
            display: flex;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
