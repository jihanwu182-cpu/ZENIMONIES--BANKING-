import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  const [selectedBank, setSelectedBank] =
    useState('');

  const [accountNumber, setAccountNumber] =
    useState('');

  const [accountName, setAccountName] =
    useState('');

  const [accountVerified, setAccountVerified] =
    useState(false);

  const [verifying, setVerifying] =
    useState(false);

  const [amount, setAmount] =
    useState('');

  const [narration, setNarration] =
    useState('');

  const [error, setError] =
    useState('');

  const [bankSearch, setBankSearch] =
    useState('');

  /*
   * ==========================================================
   * LOAD FULL BANK LIST
   * ==========================================================
   */

  useEffect(() => {
    const loadBanks = async () => {
      try {
        setBanksLoading(true);
        setError('');

        const response = await fetch(
          `${API_URL}/api/banks`
        );

        const data: BanksResponse =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              'Unable to load banks.'
          );
        }

        const availableBanks =
          Array.isArray(data.banks)
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
              a.name.localeCompare(
                b.name
              )
            )
        );
      } catch (err: any) {
        console.error(
          'Bank loading error:',
          err
        );

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

  /*
   * ==========================================================
   * FILTER BANKS
   * ==========================================================
   */

  const filteredBanks = useMemo(() => {
    const search =
      bankSearch
        .trim()
        .toLowerCase();

    if (!search) {
      return banks;
    }

    return banks.filter((bank) =>
      bank.name
        .toLowerCase()
        .includes(search)
    );
  }, [banks, bankSearch]);

  /*
   * ==========================================================
   * SELECT BANK
   * ==========================================================
   */

  const handleBankChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setSelectedBank(
      event.target.value
    );

    setAccountVerified(false);
    setAccountName('');
    setError('');
  };

  /*
   * ==========================================================
   * ACCOUNT NUMBER
   * ==========================================================
   */

  const handleAccountNumberChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      event.target.value.replace(
        /\D/g,
        ''
      );

    setAccountNumber(
      value.slice(0, 10)
    );

    /*
     * Changing the account number
     * invalidates the previous verification.
     */
    setAccountVerified(false);
    setAccountName('');
    setError('');
  };

  /*
   * ==========================================================
   * VERIFY BANK ACCOUNT
   * ==========================================================
   */

  const handleVerifyAccount = async () => {
    setError('');

    if (!selectedBank) {
      setError(
        'Please select a bank first.'
      );
      return;
    }

    if (
      !/^\d{10}$/.test(
        accountNumber
      )
    ) {
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
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            account_number:
              accountNumber,

            bank_code:
              selectedBank,
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

  /*
   * ==========================================================
   * AMOUNT
   * ==========================================================
   */

  const handleAmountChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    let value =
      event.target.value.replace(
        /[^0-9.]/g,
        ''
      );

    /*
     * Allow only one decimal point.
     */
    const firstDot =
      value.indexOf('.');

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

  /*
   * ==========================================================
   * CONTINUE
   * ==========================================================
   */

  const handleContinue = () => {
    setError('');

    if (!selectedBank) {
      setError(
        'Please select a bank.'
      );
      return;
    }

    if (
      !/^\d{10}$/.test(
        accountNumber
      )
    ) {
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

    const numericAmount =
      Number(
        amount.replace(/,/g, '')
      );

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      setError(
        'Please enter a valid amount.'
      );
      return;
    }

    const bank =
      banks.find(
        (item) =>
          item.code ===
          selectedBank
      );

    if (!bank) {
      setError(
        'Please select a valid bank.'
      );
      return;
    }

    navigate(
      '/transfer-confirmation',
      {
        state: {
          bank,
          accountNumber,
          accountName,
          amount:
            numericAmount,
          narration,
          accountVerified:
            true,
        },
      }
    );
  };

  /*
   * ==========================================================
   * SELECTED BANK
   * ==========================================================
   */

  const selectedBankObject =
    banks.find(
      (bank) =>
        bank.code ===
        selectedBank
    );

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div style={styles.page}>

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header
        style={styles.header}
      >
        <div
          style={
            styles.headerInner
          }
        >

          <button
            type="button"
            onClick={() =>
              navigate('/')
            }
            style={
              styles.backButton
            }
            aria-label="Back"
          >
            ←
          </button>

          <div>
            <div
              style={
                styles.headerTitle
              }
            >
              Send to Bank
            </div>

            <div
              style={
                styles.headerSubtitle
              }
            >
              Send money to another
              bank account
            </div>
          </div>

        </div>
      </header>

      {/* ====================================================
          MAIN
      ==================================================== */}

      <main
        style={styles.main}
      >

        <div
          style={
            styles.intro
          }
        >
          <div
            style={
              styles.eyebrow
            }
          >
            BANK TRANSFER
          </div>

          <h1
            style={styles.title}
          >
            Send money
          </h1>

          <p
            style={
              styles.subtitle
            }
          >
            Enter the bank account
            details and verify the
            recipient before sending.
          </p>
        </div>

        {/* ==================================================
            CARD
        ================================================== */}

        <section
          style={styles.card}
        >

          {/* BANK */}

          <label
            htmlFor="bank"
            style={styles.label}
          >
            Bank name
          </label>

          {banksLoading ? (
            <div
              style={
                styles.loadingBox
              }
            >
              Loading Nigerian
              banks...
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
                style={
                  styles.searchInput
                }
                aria-label="Search bank"
              />

              <select
                id="bank"
                value={selectedBank}
                onChange={
                  handleBankChange
                }
                style={
                  styles.select
                }
              >
                <option value="">
                  Select bank
                </option>

                {filteredBanks.map(
                  (bank) => (
                    <option
                      key={`${bank.code}-${bank.name}`}
                      value={bank.code}
                    >
                      {bank.name}
                    </option>
                  )
                )}
              </select>

              {!banks.length && (
                <div
                  style={
                    styles.smallError
                  }
                >
                  No banks are currently
                  available.
                </div>
              )}

              {selectedBankObject && (
                <div
                  style={
                    styles.selectedBank
                  }
                >
                  <span
                    style={
                      styles.selectedBankIcon
                    }
                  >
                    ✓
                  </span>

                  <div>
                    <div
                      style={
                        styles.selectedBankLabel
                      }
                    >
                      Selected bank
                    </div>

                    <div
                      style={
                        styles.selectedBankName
                      }
                    >
                      {
                        selectedBankObject.name
                      }
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ACCOUNT NUMBER */}

          <div
            style={
              styles.fieldSpacing
            }
          >

            <label
              htmlFor="account-number"
              style={styles.label}
            >
              Account number
            </label>

            <div
              style={
                styles.verifyRow
              }
            >

              <input
                id="account-number"
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={
                  accountNumber
                }
                onChange={
                  handleAccountNumberChange
                }
                placeholder="Enter 10-digit account number"
                style={
                  styles.accountInput
                }
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
              style={
                styles.helperText
              }
            >
              Enter the recipient's
              10-digit bank account
              number.
            </div>

          </div>

          {/* VERIFIED ACCOUNT */}

          {accountVerified && (
            <div
              style={
                styles.verifiedCard
              }
            >

              <div
                style={
                  styles.verifiedIcon
                }
              >
                ✓
              </div>

              <div
                style={
                  styles.verifiedInfo
                }
              >
                <div
                  style={
                    styles.verifiedLabel
                  }
                >
                  Account Verified
                </div>

                <div
                  style={
                    styles.accountName
                  }
                >
                  {accountName}
                </div>

                <div
                  style={
                    styles.accountNumberText
                  }
                >
                  {accountNumber}
                </div>
              </div>

              <div
                style={
                  styles.verifiedPill
                }
              >
                Verified
              </div>

            </div>
          )}

          {/* AMOUNT */}

          <div
            style={
              styles.fieldSpacing
            }
          >

            <label
              htmlFor="amount"
              style={styles.label}
            >
              Amount
            </label>

            <div
              style={
                styles.amountWrap
              }
            >

              <span
                style={
                  styles.currency
                }
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
                style={
                  styles.amountInput
                }
              />

            </div>

          </div>

          {/* NARRATION */}

          <div
            style={
              styles.fieldSpacing
            }
          >

            <label
              htmlFor="narration"
              style={styles.label}
            >
              Narration
              <span
                style={
                  styles.optional
                }
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
              style={
                styles.fullInput
              }
            />

          </div>

          {/* ERROR */}

          {error && (
            <div
              style={
                styles.errorBox
              }
              role="alert"
            >
              <span>
                !
              </span>

              <span>
                {error}
              </span>
            </div>
          )}

          {/* CONTINUE */}

          <button
            type="button"
            onClick={
              handleContinue
            }
            disabled={
              !accountVerified ||
              !amount ||
              banksLoading
            }
            style={{
              ...styles.continueButton,
              opacity:
                !accountVerified ||
                !amount ||
                banksLoading
                  ? 0.55
                  : 1,
            }}
          >
            Continue
            <span>
              →
            </span>
          </button>

          <div
            style={
              styles.securityText
            }
          >
            🔒 Your recipient will
            be verified before the
            transfer continues.
          </div>

        </section>

        {/* BACK */}

        <div
          style={
            styles.bottomBack
          }
        >
          <Link
            to="/"
            style={
              styles.bottomBackLink
            }
          >
            ← Back to dashboard
          </Link>
        </div>

      </main>
    </div>
  );
};

/*
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles: Record<
  string,
  React.CSSProperties
> = {

  page: {
    minHeight: '100vh',
    background: '#f5f9f7',
    color: '#102a25',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    paddingBottom: 40,
  },

  header: {
    background: '#ffffff',
    borderBottom:
      '1px solid #e5ebe8',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  headerInner: {
    width:
      'min(700px, 92%)',
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
    border:
      '1px solid #dfe8e4',
    background: '#ffffff',
    color: '#087f5b',
    fontSize: 25,
    fontWeight: 700,
    cursor: 'pointer',
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: 850,
    color: '#102a25',
  },

  headerSubtitle: {
    color: '#7a8a85',
    fontSize: 12,
    marginTop: 3,
  },

  main: {
    width:
      'min(700px, 92%)',
    margin: '0 auto',
    paddingTop: 25,
  },

  intro: {
    marginBottom: 20,
  },

  eyebrow: {
    color: '#087f5b',
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
    color: '#71807b',
    fontSize: 14,
    lineHeight: 1.5,
  },

  card: {
    background: '#ffffff',
    borderRadius: 22,
    padding: 21,
    border:
      '1px solid #e1e9e5',
    boxShadow:
      '0 10px 30px rgba(16, 42, 37, 0.06)',
  },

  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 800,
    color: '#344c46',
    marginBottom: 8,
  },

  searchInput: {
    width: '100%',
    height: 50,
    boxSizing: 'border-box',
    border:
      '1px solid #d9e3df',
    borderRadius: 13,
    padding: '0 14px',
    fontSize: 14,
    color: '#102a25',
    outline: 'none',
    marginBottom: 9,
    background: '#f9fbfa',
  },

  select: {
    width: '100%',
    height: 55,
    boxSizing: 'border-box',
    border:
      '1px solid #d9e3df',
    borderRadius: 13,
    padding: '0 14px',
    fontSize: 15,
    color: '#102a25',
    background: '#ffffff',
    outline: 'none',
    cursor: 'pointer',
  },

  loadingBox: {
    width: '100%',
    minHeight: 55,
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    border:
      '1px solid #d9e3df',
    borderRadius: 13,
    padding: '0 14px',
    color: '#7a8a85',
    fontSize: 14,
    background: '#f9fbfa',
  },

  selectedBank: {
    marginTop: 10,
    padding: 12,
    borderRadius: 13,
    background: '#ecfaf3',
    border:
      '1px solid #c7ead8',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },

  selectedBankIcon: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  selectedBankLabel: {
    color: '#6c8279',
    fontSize: 10,
    fontWeight: 700,
  },

  selectedBankName: {
    color: '#087c43',
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
    border:
      '1px solid #d9e3df',
    borderRadius: 13,
    padding: '0 14px',
    fontSize: 16,
    letterSpacing: 0.5,
    color: '#102a25',
    outline: 'none',
  },

  verifyButton: {
    height: 55,
    border: 'none',
    borderRadius: 13,
    padding: '0 17px',
    background: '#102a25',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  helperText: {
    color: '#8a9994',
    fontSize: 11,
    marginTop: 7,
  },

  verifiedCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 16,
    background: '#ecfaf3',
    border:
      '1px solid #bfe7d1',
    display: 'flex',
    alignItems: 'center',
    gap: 11,
  },

  verifiedIcon: {
    width: 43,
    height: 43,
    borderRadius: '50%',
    background: '#079447',
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
    color: '#087c43',
    fontSize: 10,
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  accountName: {
    color: '#17362a',
    fontSize: 15,
    fontWeight: 850,
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  accountNumberText: {
    color: '#71807b',
    fontSize: 11,
    marginTop: 2,
  },

  verifiedPill: {
    background: '#d9f4e5',
    color: '#087c43',
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
    border:
      '1px solid #d9e3df',
    borderRadius: 13,
    overflow: 'hidden',
    background: '#ffffff',
  },

  currency: {
    paddingLeft: 15,
    color: '#087f5b',
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
    color: '#102a25',
    background: 'transparent',
  },

  optional: {
    color: '#98a2b3',
    fontWeight: 500,
  },

  fullInput: {
    width: '100%',
    height: 55,
    boxSizing: 'border-box',
    border:
      '1px solid #d9e3df',
    borderRadius: 13,
    padding: '0 14px',
    fontSize: 14,
    color: '#102a25',
    outline: 'none',
  },

  errorBox: {
    marginTop: 18,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#fff3f1',
    border:
      '1px solid #f5ccc6',
    color: '#b42318',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    lineHeight: 1.4,
  },

  smallError: {
    marginTop: 8,
    color: '#b42318',
    fontSize: 12,
  },

  continueButton: {
    width: '100%',
    height: 55,
    marginTop: 21,
    border: 'none',
    borderRadius: 14,
    background:
      'linear-gradient(135deg, #087f5b, #0b9b6d)',
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 850,
    cursor: 'pointer',
    boxShadow:
      '0 8px 20px rgba(8, 127, 91, 0.18)',
  },

  securityText: {
    textAlign: 'center',
    marginTop: 12,
    color: '#8a9994',
    fontSize: 11,
  },

  bottomBack: {
    textAlign: 'center',
    marginTop: 21,
  },

  bottomBackLink: {
    color: '#087f5b',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 800,
  },
};

export default ToBank;
