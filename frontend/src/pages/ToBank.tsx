import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import BeneficiaryTabs from '../components/BeneficiaryTabs.tsx';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

interface Bank {
  name: string;
  code: string;
  slug?: string;
  active?: boolean;
  country?: string;
  currency?: string;
  type?: string;
}

interface BanksResponse {
  success?: boolean;
  banks?: Bank[];
  message?: string;
}

interface ResolveResponse {
  success?: boolean;
  verified?: boolean;
  message?: string;
  account?: {
    account_number?: string;
    account_name?: string;
  };
}

const API_URL =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com';

const ToBank: React.FC = () => {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('zenimonies_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountVerified, setAccountVerified] = useState(false);

  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);

  const [error, setError] = useState('');
  const [bankSearch, setBankSearch] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(
        'zenimonies_theme',
        darkMode ? 'dark' : 'light'
      );
    } catch {
      // Ignore storage errors.
    }
  }, [darkMode]);

  const theme = useMemo(
    () =>
      darkMode
        ? {
            page: '#071411',
            header: '#0b1c17',
            card: '#0d211b',
            input: '#102820',
            border: '#1c3930',
            text: '#f1f8f5',
            muted: '#91aaa1',
            label: '#c8d9d3',
            green: '#16a66f',
            greenBright: '#19b979',
            greenSoft: '#103d2d',
            greenBorder: '#1e5c46',
            selectedText: '#8de0ba',
            dangerBg: '#351713',
            dangerBorder: '#67302a',
            dangerText: '#ffb4aa',
            shadow: '0 14px 40px rgba(0, 0, 0, 0.24)',
          }
        : {
            page: '#f5f9f7',
            header: '#ffffff',
            card: '#ffffff',
            input: '#f9fbfa',
            border: '#dce7e2',
            text: '#102a25',
            muted: '#71807b',
            label: '#344c46',
            green: '#087f5b',
            greenBright: '#0b9b6d',
            greenSoft: '#ecfaf3',
            greenBorder: '#c7ead8',
            selectedText: '#087c43',
            dangerBg: '#fff3f1',
            dangerBorder: '#f5ccc6',
            dangerText: '#b42318',
            shadow: '0 10px 30px rgba(16, 42, 37, 0.06)',
          },
    [darkMode]
  );

  const handleBeneficiarySelect = (beneficiary: any) => {
    if (beneficiary.recipient_type !== 'bank') return;
    if (!beneficiary.account_number) return;

    if (beneficiary.bank_code) {
      setSelectedBank(beneficiary.bank_code);
    }

    setAccountNumber(beneficiary.account_number);
    setAccountName(beneficiary.name || '');
    setAccountVerified(true);
    setError('');
    setBankSearch('');
  };

  useEffect(() => {
    const loadBanks = async () => {
      try {
        setBanksLoading(true);
        setError('');

        const response = await fetch(`${API_URL}/api/banks`);
        const data: BanksResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || 'Unable to load banks.'
          );
        }

        const availableBanks = Array.isArray(data.banks)
          ? data.banks
          : [];

        setBanks(
          availableBanks
            .filter(
              (bank) =>
                bank &&
                bank.name &&
                bank.code
            )
            .sort((a, b) =>
              a.name.localeCompare(b.name)
            )
        );
      } catch (err: any) {
        console.error('Bank loading error:', err);

        setError(
          err?.message ||
            'Unable to load the bank list.'
        );
      } finally {
        setBanksLoading(false);
      }
    };

    loadBanks();
  }, []);

  const filteredBanks = useMemo(() => {
    const search = bankSearch
      .trim()
      .toLowerCase();

    if (!search) return banks;

    return banks.filter((bank) =>
      bank.name
        .toLowerCase()
        .includes(search)
    );
  }, [banks, bankSearch]);

  const handleBankChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedBank(event.target.value);
    setAccountVerified(false);
    setAccountName('');
    setError('');
  };

  const handleAccountNumberChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value
      .replace(/\D/g, '');

    setAccountNumber(
      value.slice(0, 10)
    );

    setAccountVerified(false);
    setAccountName('');
    setError('');
  };

  const handleVerifyAccount = async () => {
    setError('');

    if (!selectedBank) {
      setError('Please select a bank first.');
      return;
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      setError(
        'Please enter a valid 10-digit account number.'
      );
      return;
    }

    try {
      setVerifying(true);

      const response = await fetch(
        `${API_URL}/api/banks/resolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            account_number: accountNumber,
            bank_code: selectedBank,
          }),
        }
      );

      const data: ResolveResponse =
        await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.verified ||
        !data.account?.account_name
      ) {
        throw new Error(
          data.message ||
            'Unable to verify this bank account.'
        );
      }

      setAccountName(
        data.account.account_name
      );

      setAccountNumber(
        data.account.account_number ||
          accountNumber
      );

      setAccountVerified(true);
      setError('');
    } catch (err: any) {
      console.error(
        'Account verification error:',
        err
      );

      setAccountVerified(false);
      setAccountName('');

      setError(
        err?.message ||
          'Unable to verify this bank account. Please check the bank and account number.'
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value = event.target.value.replace(
      /[^0-9.]/g,
      ''
    );

    const firstDot = value.indexOf('.');

    if (firstDot !== -1) {
      value =
        value.slice(
          0,
          firstDot + 1
        ) +
        value
          .slice(firstDot + 1)
          .replace(/\./g, '');
    }

    setAmount(value);
    setError('');
  };

  const handleContinue = () => {
    setError('');

    if (!selectedBank) {
      setError('Please select a bank.');
      return;
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      setError(
        'Please enter a valid 10-digit account number.'
      );
      return;
    }

    if (!accountVerified) {
      setError(
        'Please verify the bank account before continuing.'
      );
      return;
    }

    const numericAmount = Number(
      amount.replace(/,/g, '')
    );

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError('Please enter a valid amount.');
      return;
    }

    const bank = banks.find(
      (item) =>
        item.code === selectedBank
    );

    if (!bank) {
      setError('Please select a valid bank.');
      return;
    }

    navigate('/transfer-confirmation', {
      state: {
        bank,
        accountNumber,
        accountName,
        amount: numericAmount,
        narration,
        accountVerified: true,
        saveAsBeneficiary,
      },
    });
  };

  const selectedBankObject = banks.find(
    (bank) =>
      bank.code === selectedBank
  );

  const beneficiarySection = (
    <div
      style={{
        ...styles.beneficiarySection,
        borderTopColor: theme.border,
      }}
    >
      <BeneficiaryTabs
        recipientType="bank"
        onSelect={handleBeneficiarySelect}
      />
    </div>
  );

  return (
    <div
      style={{
        ...styles.page,
        background: theme.page,
        color: theme.text,
      }}
    >
      <header
        style={{
          ...styles.header,
          background: theme.header,
          borderBottomColor: theme.border,
        }}
      >
        <div style={styles.headerInner}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              ...styles.backButton,
              background: theme.input,
              borderColor: theme.border,
              color: theme.greenBright,
            }}
            aria-label="Back"
          >
            ←
          </button>

          <div style={{ flex: 1 }}>
            <div
              style={{
                ...styles.headerTitle,
                color: theme.text,
              }}
            >
              Send to Bank
            </div>

            <div
              style={{
                ...styles.headerSubtitle,
                color: theme.muted,
              }}
            >
              Send money to another bank account
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setDarkMode((value) => !value)
            }
            style={{
              ...styles.themeButton,
              background: theme.input,
              borderColor: theme.border,
              color: theme.greenBright,
            }}
            aria-label={
              darkMode
                ? 'Switch to light mode'
                : 'Switch to dark mode'
            }
            title={
              darkMode
                ? 'Light mode'
                : 'Dark mode'
            }
          >
            {darkMode ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.intro}>
          <div
            style={{
              ...styles.eyebrow,
              color: theme.greenBright,
            }}
          >
            BANK TRANSFER
          </div>

          <h1
            style={{
              ...styles.title,
              color: theme.text,
            }}
          >
            Send money
          </h1>

          <p
            style={{
              ...styles.subtitle,
              color: theme.muted,
            }}
          >
            Enter the bank account details and
            verify the recipient before sending.
          </p>
        </div>

        <section
          style={{
            ...styles.card,
            background: theme.card,
            borderColor: theme.border,
            boxShadow: theme.shadow,
          }}
        >
          <label
            htmlFor="bank"
            style={{
              ...styles.label,
              color: theme.label,
            }}
          >
            Bank name
          </label>

          {banksLoading ? (
            <div
              style={{
                ...styles.loadingBox,
                background: theme.input,
                borderColor: theme.border,
                color: theme.muted,
              }}
            >
              <span
                style={{
                  ...styles.loadingDot,
                  background: theme.greenBright,
                }}
              />

              Loading Nigerian banks...
            </div>
          ) : (
            <>
              <input
                type="search"
                value={bankSearch}
                onChange={(event) =>
                  setBankSearch(
                    event.target.value
                  )
                }
                placeholder="Search bank..."
                style={{
                  ...styles.searchInput,
                  background: theme.input,
                  borderColor: theme.border,
                  color: theme.text,
                }}
                aria-label="Search bank"
              />

              <select
                id="bank"
                value={selectedBank}
                onChange={handleBankChange}
                style={{
                  ...styles.select,
                  background: theme.input,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              >
                <option value="">
                  Select bank
                </option>

                {filteredBanks.map((bank) => (
                  <option
                    key={`${bank.code}-${bank.name}`}
                    value={bank.code}
                  >
                    {bank.name}
                  </option>
                ))}
              </select>

              {!banks.length && (
                <div
                  style={{
                    ...styles.smallError,
                    color: theme.dangerText,
                  }}
                >
                  No banks are currently
                  available.
                </div>
              )}

              {selectedBankObject && (
                <div
                  style={{
                    ...styles.selectedBank,
                    background:
                      theme.greenSoft,
                    borderColor:
                      theme.greenBorder,
                  }}
                >
                  <span
                    style={{
                      ...styles.selectedBankIcon,
                      background:
                        theme.greenBright,
                    }}
                  >
                    ✓
                  </span>

                  <div>
                    <div
                      style={{
                        ...styles.selectedBankLabel,
                        color: theme.muted,
                      }}
                    >
                      Selected bank
                    </div>

                    <div
                      style={{
                        ...styles.selectedBankName,
                        color:
                          theme.selectedText,
                      }}
                    >
                      {selectedBankObject.name}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div style={styles.fieldSpacing}>
            <label
              htmlFor="account-number"
              style={{
                ...styles.label,
                color: theme.label,
              }}
            >
              Account number
            </label>

            <div style={styles.verifyRow}>
              <input
                id="account-number"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={accountNumber}
                onChange={
                  handleAccountNumberChange
                }
                placeholder="Enter 10-digit account number"
                style={{
                  ...styles.accountInput,
                  background: theme.input,
                  borderColor: theme.border,
                  color: theme.text,
                }}
              />

              <button
                type="button"
                onClick={
                  handleVerifyAccount
                }
                disabled={
                  verifying ||
                  banksLoading ||
                  !selectedBank ||
                  accountNumber.length !==
                    10
                }
                style={{
                  ...styles.verifyButton,
                  background:
                    darkMode
                      ? '#17372d'
                      : '#102a25',
                  opacity:
                    verifying ||
                    banksLoading ||
                    !selectedBank ||
                    accountNumber.length !==
                      10
                      ? 0.55
                      : 1,
                }}
              >
                {verifying
                  ? 'Verifying...'
                  : 'Verify'}
              </button>
            </div>

            <div
              style={{
                ...styles.helperText,
                color: theme.muted,
              }}
            >
              Enter the recipient's 10-digit
              bank account number.
            </div>
          </div>

          {!accountVerified &&
            beneficiarySection}

          {accountVerified && (
            <div
              style={{
                ...styles.verifiedCard,
                background:
                  theme.greenSoft,
                borderColor:
                  theme.greenBorder,
              }}
            >
              <div
                style={{
                  ...styles.verifiedIcon,
                  background:
                    theme.greenBright,
                }}
              >
                ✓
              </div>

              <div style={styles.verifiedInfo}>
                <div
                  style={{
                    ...styles.verifiedLabel,
                    color:
                      theme.selectedText,
                  }}
                >
                  Account Verified
                </div>

                <div
                  style={{
                    ...styles.accountName,
                    color: theme.text,
                  }}
                >
                  {accountName}
                </div>

                <div
                  style={{
                    ...styles.accountNumberText,
                    color: theme.muted,
                  }}
                >
                  {accountNumber}
                </div>
              </div>

              <div
                style={{
                  ...styles.verifiedPill,
                  background:
                    darkMode
                      ? '#174b38'
                      : '#d9f4e5',
                  color:
                    theme.selectedText,
                }}
              >
                Verified
              </div>
            </div>
          )}

          {accountVerified && (
            <>
              <div style={styles.fieldSpacing}>
                <label
                  htmlFor="amount"
                  style={{
                    ...styles.label,
                    color: theme.label,
                  }}
                >
                  Amount
                </label>

                <div
                  style={{
                    ...styles.amountWrap,
                    background: theme.input,
                    borderColor: theme.border,
                  }}
                >
                  <span
                    style={{
                      ...styles.currency,
                      color: theme.greenBright,
                    }}
                  >
                    ₦
                  </span>

                  <input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={
                      handleAmountChange
                    }
                    placeholder="0.00"
                    style={{
                      ...styles.amountInput,
                      color: theme.text,
                    }}
                  />
                </div>
              </div>

              <div style={styles.fieldSpacing}>
                <label
                  htmlFor="narration"
                  style={{
                    ...styles.label,
                    color: theme.label,
                  }}
                >
                  Narration
                  <span
                    style={{
                      ...styles.optional,
                      color: theme.muted,
                    }}
                  >
                    {' '}
                    (optional)
                  </span>
                </label>

                <input
                  id="narration"
                  type="text"
                  maxLength={100}
                  value={narration}
                  onChange={(event) =>
                    setNarration(
                      event.target.value
                    )
                  }
                  placeholder="What is this payment for?"
                  style={{
                    ...styles.fullInput,
                    background: theme.input,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                />
              </div>

              <label
                style={{
                  ...styles.beneficiaryCheckbox,
                  color: theme.label,
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    saveAsBeneficiary
                  }
                  onChange={(event) =>
                    setSaveAsBeneficiary(
                      event.target.checked
                    )
                  }
                />

                <span>
                  Save as beneficiary
                </span>
              </label>

              {error && (
                <div
                  style={{
                    ...styles.errorBox,
                    background:
                      theme.dangerBg,
                    borderColor:
                      theme.dangerBorder,
                    color:
                      theme.dangerText,
                  }}
                  role="alert"
                >
                  <span>!</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleContinue}
                disabled={
                  !accountVerified ||
                  !amount ||
                  banksLoading
                }
                style={{
                  ...styles.continueButton,
                  background:
                    `linear-gradient(135deg, ${theme.green}, ${theme.greenBright})`,
                  opacity:
                    !accountVerified ||
                    !amount ||
                    banksLoading
                      ? 0.55
                      : 1,
                }}
              >
                Continue
                <span>→</span>
              </button>

              <div
                style={{
                  ...styles.securityText,
                  color: theme.muted,
                }}
              >
                🔒 Your recipient will be
                verified before the transfer
                continues.
              </div>

              {beneficiarySection}
            </>
          )}

          {!accountVerified &&
            error && (
              <div
                style={{
                  ...styles.errorBox,
                  background:
                    theme.dangerBg,
                  borderColor:
                    theme.dangerBorder,
                  color:
                    theme.dangerText,
                }}
                role="alert"
              >
                <span>!</span>
                <span>{error}</span>
              </div>
            )}
        </section>

        <div style={styles.bottomBack}>
          <Link
            to="/"
            style={{
              ...styles.bottomBackLink,
              color: theme.greenBright,
            }}
          >
            ← Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
};

const styles: Record<
  string,
  React.CSSProperties
> = {
  page: {
    minHeight: '100vh',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 40,
    transition:
      'background 0.2s ease, color 0.2s ease',
  },

  header: {
    borderBottom: '1px solid',
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backdropFilter: 'blur(14px)',
  },

  headerInner: {
    width: 'min(700px, 92%)',
    margin: '0 auto',
    minHeight: 72,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 13,
    border: '1px solid',
    fontSize: 25,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },

  themeButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    border: '1px solid',
    fontSize: 19,
    cursor: 'pointer',
    flexShrink: 0,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: 850,
  },

  headerSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  main: {
    width: 'min(700px, 92%)',
    margin: '0 auto',
    paddingTop: 25,
  },

  intro: {
    marginBottom: 20,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.2,
    marginBottom: 5,
  },

  title: {
    margin: 0,
    fontSize: 29,
    lineHeight: 1.15,
    fontWeight: 850,
  },

  subtitle: {
    margin: '8px 0 0',
    fontSize: 14,
    lineHeight: 1.5,
  },

  card: {
    borderRadius: 22,
    padding: 21,
    border: '1px solid',
    transition:
      'background 0.2s ease, border-color 0.2s ease',
  },

  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 800,
    marginBottom: 8,
  },

  searchInput: {
    width: '100%',
    height: 50,
    boxSizing: 'border-box',
    border: '1px solid',
    borderRadius: 13,
    padding: '0 14px',
    fontSize: 14,
    outline: 'none',
    marginBottom: 9,
  },

  select: {
    width: '100%',
    height: 55,
    boxSizing: 'border-box',
    border: '1px solid',
    borderRadius: 13,
    padding: '0 14px',
    fontSize: 15,
    outline: 'none',
    cursor: 'pointer',
  },

  loadingBox: {
    width: '100%',
    minHeight: 55,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid',
    borderRadius: 13,
    padding: '0 14px',
    fontSize: 14,
  },

  loadingDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    flexShrink: 0,
    animation:
      'zenimoniesPulse 1.2s ease-in-out infinite',
  },

  selectedBank: {
    marginTop: 10,
    padding: 12,
    borderRadius: 13,
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  selectedBankIcon: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    flexShrink: 0,
  },

  selectedBankLabel: {
    fontSize: 10,
    fontWeight: 700,
  },

  selectedBankName: {
    fontSize: 13,
    fontWeight: 800,
    marginTop: 2,
  },

  fieldSpacing: {
    marginTop: 21,
  },

  verifyRow: {
    display: 'flex',
    gap: 9,
  },

  accountInput: {
    flex: 1,
    minWidth: 0,
    height: 55,
    boxSizing: 'border-box',
    border: '1px solid',
    borderRadius: 13,
    padding: '0 14px',
    fontSize: 16,
    letterSpacing: 0.5,
    outline: 'none',
  },

  verifyButton: {
    height: 55,
    border: 'none',
    borderRadius: 13,
    padding: '0 17px',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  helperText: {
    fontSize: 11,
    marginTop: 7,
  },

  beneficiarySection: {
    marginTop: 22,
    paddingTop: 4,
    borderTop: '1px solid transparent',
  },

  verifiedCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: 11,
  },

  verifiedIcon: {
    width: 43,
    height: 43,
    borderRadius: '50%',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 900,
    flexShrink: 0,
  },

  verifiedInfo: {
    flex: 1,
    minWidth: 0,
  },

  verifiedLabel: {
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  accountName: {
    fontSize: 15,
    fontWeight: 850,
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  accountNumberText: {
    fontSize: 11,
    marginTop: 2,
  },

  verifiedPill: {
    borderRadius: 999,
    padding: '6px 9px',
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },

  amountWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    height: 55,
    border: '1px solid',
    borderRadius: 13,
    overflow: 'hidden',
  },

  currency: {
    paddingLeft: 15,
    fontSize: 19,
    fontWeight: 850,
  },

  amountInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    border: 'none',
    outline: 'none',
    padding: '0 14px 0 9px',
    fontSize: 18,
    fontWeight: 800,
    background: 'transparent',
  },

  optional: {
    fontWeight: 500,
  },

  fullInput: {
    width: '100%',
    height: 55,
    boxSizing: 'border-box',
    border: '1px solid',
    borderRadius: 13,
    padding: '0 14px',
    fontSize: 14,
    outline: 'none',
  },

  beneficiaryCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 18,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  errorBox: {
    marginTop: 18,
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    lineHeight: 1.4,
  },

  smallError: {
    marginTop: 8,
    fontSize: 12,
  },

  continueButton: {
    width: '100%',
    height: 55,
    marginTop: 21,
    border: 'none',
    borderRadius: 14,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 850,
    cursor: 'pointer',
    boxShadow:
      '0 8px 20px rgba(8, 127, 91, 0.18)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  securityText: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 11,
  },

  bottomBack: {
    textAlign: 'center',
    marginTop: 21,
  },

  bottomBackLink: {
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 800,
  },
};

export default ToBank;
