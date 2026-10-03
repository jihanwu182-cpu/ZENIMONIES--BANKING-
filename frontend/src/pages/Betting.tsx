import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

type BettingProvider = {
  slug: string;
  name: string;
  description: string;
  logoUrl?: string;
  domain?: string;
};

type Step =
  | 'providers'
  | 'details'
  | 'review'
  | 'processing'
  | 'success';

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

/* ============================================================
   COMPLETE SOGO BETTING PROVIDER FALLBACK
   ============================================================ */

const FALLBACK_PROVIDERS: BettingProvider[] = [
  {
    slug: 'bet9ja',
    name: 'Bet9ja',
    description: 'Fund your Bet9ja account',
    domain: 'bet9ja.com',
  },
  {
    slug: 'betway',
    name: 'Betway',
    description: 'Fund your Betway account',
    domain: 'betway.com.ng',
  },
  {
    slug: 'sportybet',
    name: 'SportyBet',
    description: 'Fund your SportyBet account',
    domain: 'sportybet.com',
  },
  {
    slug: '1xbet',
    name: '1xBet',
    description: 'Fund your 1xBet account',
    domain: '1xbet.ng',
  },
  {
    slug: 'bangbet',
    name: 'BangBet',
    description: 'Fund your BangBet account',
    domain: 'bangbet.com',
  },
  {
    slug: 'betking',
    name: 'BetKing',
    description: 'Fund your BetKing account',
    domain: 'betking.com',
  },
  {
    slug: 'betland',
    name: 'Betland',
    description: 'Fund your Betland account',
    domain: 'betland.com',
  },
  {
    slug: 'betlion',
    name: 'BetLion',
    description: 'Fund your BetLion account',
    domain: 'betlion.com',
  },
  {
    slug: 'cloudbet',
    name: 'Cloudbet',
    description: 'Fund your Cloudbet account',
    domain: 'cloudbet.com',
  },
  {
    slug: 'livescorebet',
    name: 'LiveScore Bet',
    description: 'Fund your LiveScore Bet account',
    domain: 'livescorebet.com',
  },
  {
    slug: 'merrybet',
    name: 'Merrybet',
    description: 'Fund your Merrybet account',
    domain: 'merrybet.com',
  },
  {
    slug: 'naijabet',
    name: 'NaijaBet',
    description: 'Fund your NaijaBet account',
    domain: 'naijabet.com',
  },
  {
    slug: 'nairabet',
    name: 'NairaBet',
    description: 'Fund your NairaBet account',
    domain: 'nairabet.com',
  },
  {
    slug: 'supabet',
    name: 'Supabet',
    description: 'Fund your Supabet account',
    domain: 'supabet.com',
  },
];

/* ============================================================
   HELPERS
   ============================================================ */

const formatAmount = (
  value: string | number
) => {
  const numeric = Number(value) || 0;

  return numeric.toLocaleString(
    'en-NG',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
};

const getAuthToken = () => {
  return (
    localStorage.getItem(
      'zenimonies_token'
    ) ||
    localStorage.getItem(
      'token'
    ) ||
    ''
  );
};

const getErrorMessage = (
  data: any,
  fallback: string
) => {
  return (
    data?.message ||
    data?.error ||
    data?.details ||
    data?.data?.message ||
    fallback
  );
};

const createFaviconUrl = (
  domain?: string
) => {
  if (!domain) {
    return '';
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain
  )}&sz=128`;
};

const getProviderDomain = (
  slug: string
) => {
  const provider =
    FALLBACK_PROVIDERS.find(
      (item) =>
        item.slug.toLowerCase() ===
        slug.toLowerCase()
    );

  return provider?.domain || '';
};

/* ============================================================
   PROVIDER LOGO
   ============================================================ */

const ProviderLogo: React.FC<{
  provider: BettingProvider;
  large?: boolean;
}> = ({
  provider,
  large = false,
}) => {
  const [failed, setFailed] =
    useState(false);

  const domain =
    provider.domain ||
    getProviderDomain(
      provider.slug
    );

  const logo =
    provider.logoUrl ||
    createFaviconUrl(domain);

  const initials =
    provider.name
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) =>
        word.charAt(0).toUpperCase()
      )
      .join('');

  return (
    <div
      style={{
        ...styles.providerLogo,
        ...(large
          ? styles.providerLogoLarge
          : {}),
      }}
    >
      {!failed && logo ? (
        <img
          src={logo}
          alt={`${provider.name} logo`}
          onError={() =>
            setFailed(true)
          }
          style={styles.logoImage}
        />
      ) : (
        <span
          style={
            styles.logoInitials
          }
        >
          {initials || 'B'}
        </span>
      )}
    </div>
  );
};

/* ============================================================
   NORMALIZE PROVIDERS FROM SOGO
   ============================================================ */

const normalizeProviders = (
  payload: any
): BettingProvider[] => {
  const providers =
    payload?.data?.betting
      ?.providers ||
    payload?.betting?.providers ||
    payload?.data?.providers ||
    payload?.providers ||
    (Array.isArray(
      payload?.data?.betting
    )
      ? payload.data.betting
      : null) ||
    [];

  if (!Array.isArray(providers)) {
    return [];
  }

  const normalized =
    providers
      .map(
        (
          provider: any
        ) => {
          const slug =
            String(
              provider?.slug ||
                provider?.provider ||
                provider?.id ||
                provider?.code ||
                ''
            ).trim();

          const name =
            String(
              provider?.name ||
                provider?.display_name ||
                provider?.displayName ||
                provider?.label ||
                slug ||
                ''
            ).trim();

          if (!slug) {
            return null;
          }

          const fallback =
            FALLBACK_PROVIDERS.find(
              (item) =>
                item.slug.toLowerCase() ===
                slug.toLowerCase()
            );

          const logoUrl =
            provider?.logo_url ||
            provider?.logoUrl ||
            provider?.logo ||
            provider?.icon_url ||
            provider?.iconUrl ||
            provider?.image_url ||
            provider?.imageUrl ||
            fallback?.logoUrl;

          const domain =
            provider?.domain ||
            provider?.website ||
            fallback?.domain ||
            getProviderDomain(
              slug
            );

          return {
            slug,
            name:
              name ||
              fallback?.name ||
              slug,
            description:
              `Fund your ${
                name ||
                fallback?.name ||
                slug
              } account`,
            logoUrl,
            domain,
          };
        }
      )
      .filter(
        (
          provider: BettingProvider | null
        ): provider is BettingProvider =>
          Boolean(provider)
      );

  /* Remove duplicate providers */
  const seen =
    new Set<string>();

  return normalized.filter(
    (provider) => {
      const key =
        provider.slug.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    }
  );
};

/* ============================================================
   VERIFICATION NAME
   ============================================================ */

const extractVerificationName = (
  payload: any
) => {
  return (
    payload?.username ||
    payload?.customerName ||
    payload?.customer_name ||
    payload?.name ||
    payload?.data?.username ||
    payload?.data?.customerName ||
    payload?.data?.customer_name ||
    payload?.data?.name ||
    payload?.data?.customer?.name ||
    payload?.verification?.username ||
    payload?.verification?.customerName ||
    payload?.verification?.customer_name ||
    payload?.verification?.name ||
    ''
  );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

const Betting: React.FC = () => {
  const [
    providers,
    setProviders,
  ] = useState<
    BettingProvider[]
  >([]);

  const [
    loadingProviders,
    setLoadingProviders,
  ] = useState(true);

  const [
    providerSearch,
    setProviderSearch,
  ] = useState('');

  const [
    selectedProvider,
    setSelectedProvider,
  ] =
    useState<BettingProvider | null>(
      null
    );

  const [
    accountIdentifier,
    setAccountIdentifier,
  ] = useState('');

  const [amount, setAmount] =
    useState('');

  const [error, setError] =
    useState('');

  const [
    verificationError,
    setVerificationError,
  ] = useState('');

  const [
    verifiedCustomerName,
    setVerifiedCustomerName,
  ] = useState('');

  const [
    verifyingAccount,
    setVerifyingAccount,
  ] = useState(false);

  const [
    step,
    setStep,
  ] = useState<Step>(
    'providers'
  );

  const [
    transactionPin,
    setTransactionPin,
  ] = useState('');

  const [
    showPinModal,
    setShowPinModal,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    successReference,
    setSuccessReference,
  ] = useState('');

  const [
    processingReference,
    setProcessingReference,
  ] = useState('');

  const quickAmounts = [
    '1000',
    '2000',
    '5000',
    '10000',
  ];

  /* ==========================================================
     LOAD PROVIDERS
     ========================================================== */

  useEffect(() => {
    let mounted = true;

    const loadProviders =
      async () => {
        setLoadingProviders(
          true
        );

        try {
          const token =
            getAuthToken();

          const response =
            await fetch(
              `${API_BASE}/betting/providers`,
              {
                method: 'GET',
                headers: {
                  Accept:
                    'application/json',
                  ...(token
                    ? {
                        Authorization:
                          `Bearer ${token}`,
                      }
                    : {}),
                },
              }
            );

          const data =
            await response
              .json()
              .catch(
                () => ({})
              );

          if (!response.ok) {
            throw new Error(
              getErrorMessage(
                data,
                'Unable to load betting providers.'
              )
            );
          }

          const liveProviders =
            normalizeProviders(
              data
            );

          if (
            mounted &&
            liveProviders.length > 0
          ) {
            setProviders(
              liveProviders
            );
          } else if (
            mounted
          ) {
            setProviders(
              FALLBACK_PROVIDERS
            );
          }
        } catch (loadError) {
          console.error(
            'Betting providers error:',
            loadError
          );

          if (mounted) {
            setProviders(
              FALLBACK_PROVIDERS
            );
          }
        } finally {
          if (mounted) {
            setLoadingProviders(
              false
            );
          }
        }
      };

    loadProviders();

    return () => {
      mounted = false;
    };
  }, []);

  /* ==========================================================
     FILTER PROVIDERS
     ========================================================== */

  const filteredProviders =
    useMemo(() => {
      const search =
        providerSearch
          .trim()
          .toLowerCase();

      if (!search) {
        return providers;
      }

      return providers.filter(
        (provider) =>
          provider.name
            .toLowerCase()
            .includes(search) ||
          provider.slug
            .toLowerCase()
            .includes(search)
      );
    }, [
      providers,
      providerSearch,
    ]);

  /* ==========================================================
     SELECT PROVIDER
     ========================================================== */

  const selectProvider = (
    provider: BettingProvider
  ) => {
    setSelectedProvider(
      provider
    );

    setAccountIdentifier('');
    setAmount('');
    setError('');
    setVerificationError('');
    setVerifiedCustomerName('');
    setTransactionPin('');
    setProviderSearch('');
    setStep('details');
  };

  /* ==========================================================
     VERIFY BETTING ACCOUNT
     ========================================================== */

  const verifyBettingAccount =
    async () => {
      setVerificationError('');

      const identifier =
        accountIdentifier.trim();

      if (!identifier) {
        setVerificationError(
          'Please enter your betting account ID, username or phone number.'
        );
        return false;
      }

      if (!selectedProvider) {
        setVerificationError(
          'Please select a betting provider.'
        );
        return false;
      }

      setVerifyingAccount(
        true
      );

      try {
        const token =
          getAuthToken();

        if (!token) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        /*
         * IMPORTANT:
         * We send both accountId and account_id.
         *
         * account_id is the provider/API naming.
         * accountId is retained for compatibility
         * with our current backend controller.
         */
        const response =
          await fetch(
            `${API_BASE}/betting/verify`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                Accept:
                  'application/json',
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                provider:
                  selectedProvider.slug,

                accountId:
                  identifier,

                account_id:
                  identifier,
              }),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              'We could not verify this betting account.'
            )
          );
        }

        const customerName =
          extractVerificationName(
            data
          );

        setVerifiedCustomerName(
          customerName ||
            'Verified betting account'
        );

        return true;
      } catch (verifyError: any) {
        console.error(
          'Betting account verification error:',
          verifyError
        );

        setVerifiedCustomerName(
          ''
        );

        setVerificationError(
          verifyError?.message ||
            'Unable to verify the betting account.'
        );

        return false;
      } finally {
        setVerifyingAccount(
          false
        );
      }
    };

  /* ==========================================================
     CONTINUE
     ========================================================== */

  const handleContinue =
    async (
      event: React.FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError('');
      setVerificationError('');

      const identifier =
        accountIdentifier.trim();

      if (!identifier) {
        setError(
          'Please enter your betting account ID, username or phone number.'
        );
        return;
      }

      const numericAmount =
        Number(amount);

      if (
        !amount ||
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount < 100
      ) {
        setError(
          'The minimum betting funding amount is ₦100.'
        );
        return;
      }

      if (
        numericAmount > 500000
      ) {
        setError(
          'The maximum betting funding amount is ₦500,000.'
        );
        return;
      }

      const verified =
        await verifyBettingAccount();

      if (!verified) {
        return;
      }

      setStep('review');
    };

  /* ==========================================================
     PIN MODAL
     ========================================================== */

  const openPinModal = () => {
    setError('');
    setTransactionPin('');
    setShowPinModal(true);
  };

  const closePinModal = () => {
    if (submitting) {
      return;
    }

    setShowPinModal(false);
    setTransactionPin('');
  };

  /* ==========================================================
     FUND BETTING ACCOUNT
     ========================================================== */

  const confirmFunding =
    async () => {
      setError('');

      if (!selectedProvider) {
        setError(
          'Please select a betting provider.'
        );
        return;
      }

      if (
        transactionPin.length !==
        4
      ) {
        setError(
          'Please enter your 4-digit Transaction PIN.'
        );
        return;
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(
          numericAmount
        ) ||
        numericAmount < 100
      ) {
        setError(
          'Please enter a valid funding amount.'
        );
        return;
      }

      setSubmitting(true);

      try {
        const token =
          getAuthToken();

        if (!token) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        const identifier =
          accountIdentifier.trim();

        const response =
          await fetch(
            `${API_BASE}/betting/fund`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
                Accept:
                  'application/json',
                Authorization:
                  `Bearer ${token}`,
              },
              body: JSON.stringify({
                provider:
                  selectedProvider.slug,

                accountId:
                  identifier,

                account_id:
                  identifier,

                amount:
                  numericAmount,

                transaction_pin:
                 transactionPin,
              }),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (
          response.status ===
          401
        ) {
          throw new Error(
            'Your session has expired or your Transaction PIN was not accepted.'
          );
        }

        if (
          response.status ===
          403
        ) {
          throw new Error(
            getErrorMessage(
              data,
              'Transaction PIN verification failed.'
            )
          );
        }

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              'Betting funding could not be started.'
            )
          );
        }

        const reference =
          data?.reference ||
          data?.data?.reference ||
          data?.transactionReference ||
          data?.data
            ?.transactionReference ||
          '';

        setSuccessReference(
          reference
        );

        setProcessingReference(
          reference
        );

        setShowPinModal(false);
        setTransactionPin('');

        if (
          response.status ===
            202 ||
          data?.status ===
            'processing' ||
          data?.status ===
            'pending'
        ) {
          setStep(
            'processing'
          );
          return;
        }

        setStep('success');
      } catch (fundingError: any) {
        console.error(
          'Betting funding error:',
          fundingError
        );

        setError(
          fundingError?.message ||
            'Betting funding could not be completed.'
        );

        setShowPinModal(
          true
        );
      } finally {
        setSubmitting(false);
      }
    };

  /* ==========================================================
     BACK
     ========================================================== */

  const goBack = () => {
    if (submitting) {
      return;
    }

    setError('');
    setVerificationError('');

    if (
      step === 'review'
    ) {
      setStep('details');
      return;
    }

    if (
      step === 'details'
    ) {
      setStep('providers');
      setSelectedProvider(
        null
      );
      setVerifiedCustomerName(
        ''
      );
      return;
    }

    if (
      step === 'processing' ||
      step === 'success'
    ) {
      resetFlow();
    }
  };

  /* ==========================================================
     RESET
     ========================================================== */

  const resetFlow = () => {
    setSelectedProvider(
      null
    );
    setAccountIdentifier('');
    setAmount('');
    setError('');
    setVerificationError('');
    setVerifiedCustomerName('');
    setTransactionPin('');
    setShowPinModal(false);
    setSubmitting(false);
    setSuccessReference('');
    setProcessingReference('');
    setProviderSearch('');
    setStep('providers');
  };

  const selectedAmount =
    useMemo(
      () =>
        Number(amount) || 0,
      [amount]
    );

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <Link
          to="/"
          style={styles.brandLink}
        >
          <div style={styles.logo}>
            Z
          </div>

          <div>
            <div
              style={
                styles.brandName
              }
            >
              Zenimonies
            </div>

            <div
              style={
                styles.brandSubtitle
              }
            >
              DIGITAL BANKING
            </div>
          </div>
        </Link>

        <Link
          to="/"
          style={styles.homeLink}
        >
          Home
        </Link>
      </header>

      <main style={styles.main}>
        <Link
          to="/"
          style={styles.backLink}
        >
          ← Back to Dashboard
        </Link>

        {/* INTRO */}
        <section style={styles.intro}>
          <div
            style={
              styles.mainIcon
            }
          >
            ⚽
          </div>

          <div>
            <div
              style={
                styles.eyebrow
              }
            >
              BETTING SERVICES
            </div>

            <h1
              style={styles.title}
            >
              Fund Betting Account
            </h1>

            <p
              style={
                styles.description
              }
            >
              Fund your supported betting
              account securely from your
              Zenimonies balance.
            </p>
          </div>
        </section>

        {/* ====================================================
            PROVIDERS
        ==================================================== */}

        {step ===
          'providers' && (
          <section
            style={styles.card}
          >
            <h2
              style={
                styles.cardTitle
              }
            >
              Choose Betting App
            </h2>

            <p
              style={
                styles.cardDescription
              }
            >
              Select the betting platform
              you want to fund.
            </p>

            {!loadingProviders && (
              <div
                style={
                  styles.searchBox
                }
              >
                <span
                  style={
                    styles.searchIcon
                  }
                >
                  ⌕
                </span>

                <input
                  type="text"
                  value={
                    providerSearch
                  }
                  onChange={(
                    event
                  ) =>
                    setProviderSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="Search betting app"
                  style={
                    styles.searchInput
                  }
                />
              </div>
            )}

            {loadingProviders ? (
              <div
                style={
                  styles.loadingBox
                }
              >
                <div
                  style={
                    styles.spinner
                  }
                />

                <span>
                  Loading betting
                  providers...
                </span>
              </div>
            ) : filteredProviders.length ===
              0 ? (
              <div
                style={
                  styles.emptyBox
                }
              >
                <strong>
                  No betting app found
                </strong>

                <span>
                  Try another search.
                </span>
              </div>
            ) : (
              <div
                style={
                  styles.providerGrid
                }
              >
                {filteredProviders.map(
                  (
                    provider
                  ) => (
                    <button
                      key={
                        provider.slug
                      }
                      type="button"
                      onClick={() =>
                        selectProvider(
                          provider
                        )
                      }
                      style={
                        styles.providerButton
                      }
                    >
                      <ProviderLogo
                        provider={
                          provider
                        }
                      />

                      <div
                        style={
                          styles.providerText
                        }
                      >
                        <strong
                          style={
                            styles.providerName
                          }
                        >
                          {
                            provider.name
                          }
                        </strong>

                        <span
                          style={
                            styles.providerDescription
                          }
                        >
                          {
                            provider.description
                          }
                        </span>
                      </div>

                      <span
                        style={
                          styles.arrow
                        }
                      >
                        ›
                      </span>
                    </button>
                  )
                )}
              </div>
            )}

            <div
              style={styles.providerCount}
            >
              <span>
                {providers.length}{' '}
                supported betting
                platforms
              </span>

              <span>
                Secure account
                verification
              </span>
            </div>

            <div
              style={styles.notice}
            >
              <span
                style={
                  styles.noticeIcon
                }
              >
                ✓
              </span>

              <div>
                <strong>
                  Secure funding
                </strong>

                <p
                  style={
                    styles.noticeText
                  }
                >
                  Your betting account
                  details are verified
                  before funding is
                  submitted.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ====================================================
            DETAILS
        ==================================================== */}

        {step ===
          'details' &&
          selectedProvider && (
            <section
              style={styles.card}
            >
              <button
                type="button"
                onClick={goBack}
                style={
                  styles.stepBack
                }
              >
                ← Choose another
                betting app
              </button>

              <div
                style={
                  styles.selectedProvider
                }
              >
                <ProviderLogo
                  provider={
                    selectedProvider
                  }
                  large
                />

                <div>
                  <div
                    style={
                      styles.selectedLabel
                    }
                  >
                    Selected betting
                    app
                  </div>

                  <strong
                    style={
                      styles.selectedName
                    }
                  >
                    {
                      selectedProvider.name
                    }
                  </strong>
                </div>
              </div>

              <h2
                style={
                  styles.cardTitle
                }
              >
                Account Details
              </h2>

              <p
                style={
                  styles.cardDescription
                }
              >
                Enter the account
                information used by your{' '}
                {
                  selectedProvider.name
                }{' '}
                account.
              </p>

              <form
                onSubmit={
                  handleContinue
                }
              >
                <label
                  htmlFor="accountIdentifier"
                  style={
                    styles.label
                  }
                >
                  Betting Account ID /
                  Username / Phone
                </label>

                <input
                  id="accountIdentifier"
                  type="text"
                  value={
                    accountIdentifier
                  }
                  onChange={(
                    event
                  ) => {
                    setAccountIdentifier(
                      event.target.value
                    );
                    setError('');
                    setVerificationError(
                      ''
                    );
                  }}
                  placeholder="Enter your betting account details"
                  style={
                    styles.input
                  }
                  autoComplete="off"
                />

                <label
                  htmlFor="amount"
                  style={
                    styles.label
                  }
                >
                  Amount
                </label>

                <div
                  style={
                    styles.amountBox
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
                    type="number"
                    min="100"
                    max="500000"
                    value={amount}
                    onChange={(
                      event
                    ) =>
                      setAmount(
                        event.target
                          .value
                      )
                    }
                    placeholder="0.00"
                    style={
                      styles.amountInput
                    }
                  />
                </div>

                <div
                  style={
                    styles.quickAmounts
                  }
                >
                  {quickAmounts.map(
                    (
                      quickAmount
                    ) => (
                      <button
                        key={
                          quickAmount
                        }
                        type="button"
                        onClick={() =>
                          setAmount(
                            quickAmount
                          )
                        }
                        style={
                          styles.quickAmountButton
                        }
                      >
                        ₦
                        {Number(
                          quickAmount
                        ).toLocaleString(
                          'en-NG'
                        )}
                      </button>
                    )
                  )}
                </div>

                {error && (
                  <div
                    role="alert"
                    style={
                      styles.error
                    }
                  >
                    {error}
                  </div>
                )}

                {verificationError && (
                  <div
                    role="alert"
                    style={
                      styles.error
                    }
                  >
                    {
                      verificationError
                    }
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    verifyingAccount
                  }
                  style={{
                    ...styles.primaryButton,
                    opacity:
                      verifyingAccount
                        ? 0.65
                        : 1,
                  }}
                >
                  {verifyingAccount
                    ? 'Verifying Account...'
                    : 'Verify & Continue'}
                </button>
              </form>
            </section>
          )}

        {/* ====================================================
            REVIEW
        ==================================================== */}

        {step ===
          'review' &&
          selectedProvider && (
            <section
              style={styles.card}
            >
              <button
                type="button"
                onClick={goBack}
                style={
                  styles.stepBack
                }
              >
                ← Edit details
              </button>

              <div
                style={
                  styles.reviewIcon
                }
              >
                ✓
              </div>

              <h2
                style={
                  styles.reviewTitle
                }
              >
                Review Funding
              </h2>

              <p
                style={
                  styles.reviewDescription
                }
              >
                Confirm the verified
                account and funding
                amount.
              </p>

              <div
                style={
                  styles.verifiedBox
                }
              >
                <div
                  style={
                    styles.verifiedBadge
                  }
                >
                  ✓
                </div>

                <div>
                  <strong
                    style={
                      styles.verifiedTitle
                    }
                  >
                    Account Verified
                  </strong>

                  <div
                    style={
                      styles.verifiedName
                    }
                  >
                    {
                      verifiedCustomerName ||
                      'Verified betting account'
                    }
                  </div>
                </div>
              </div>

              <div
                style={
                  styles.reviewBox
                }
              >
                <div
                  style={
                    styles.reviewRow
                  }
                >
                  <span>
                    Betting App
                  </span>

                  <strong>
                    {
                      selectedProvider.name
                    }
                  </strong>
                </div>

                <div
                  style={
                    styles.reviewRow
                  }
                >
                  <span>
                    Account
                  </span>

                  <strong
                    style={
                      styles.accountValue
                    }
                  >
                    {
                      accountIdentifier
                    }
                  </strong>
                </div>

                <div
                  style={
                    styles.reviewRow
                  }
                >
                  <span>
                    Amount
                  </span>

                  <strong
                    style={
                      styles.amountValue
                    }
                  >
                    ₦
                    {formatAmount(
                      selectedAmount
                    )}
                  </strong>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  style={
                    styles.error
                  }
                >
                  {error}
                </div>
              )}

              <div
                style={
                  styles.pendingNotice
                }
              >
                <strong>
                  Transaction PIN
                  required
                </strong>

                <p>
                  Your Transaction PIN
                  is required to authorize
                  this funding request.
                </p>
              </div>

              <button
                type="button"
                style={
                  styles.primaryButton
                }
                onClick={
                  openPinModal
                }
              >
                Confirm Funding
              </button>

              <button
                type="button"
                style={
                  styles.secondaryButton
                }
                onClick={
                  resetFlow
                }
              >
                Cancel
              </button>
            </section>
          )}

        {/* ====================================================
            PROCESSING
        ==================================================== */}

        {step ===
          'processing' && (
          <section
            style={styles.card}
          >
            <div
              style={
                styles.processingIcon
              }
            >
              <div
                style={
                  styles.processingSpinner
                }
              />
            </div>

            <h2
              style={
                styles.reviewTitle
              }
            >
              Funding Processing
            </h2>

            <p
              style={
                styles.reviewDescription
              }
            >
              Your betting funding request
              has been submitted and is
              being processed.
            </p>

            <div
              style={
                styles.processingBox
              }
            >
              <div
                style={
                  styles.processingRow
                }
              >
                <span>
                  Betting App
                </span>

                <strong>
                  {
                    selectedProvider?.name
                  }
                </strong>
              </div>

              <div
                style={
                  styles.processingRow
                }
              >
                <span>
                  Amount
                </span>

                <strong
                  style={
                    styles.amountValue
                  }
                >
                  ₦
                  {formatAmount(
                    selectedAmount
                  )}
                </strong>
              </div>

              {processingReference && (
                <div
                  style={
                    styles.processingRow
                  }
                >
                  <span>
                    Reference
                  </span>

                  <strong
                    style={
                      styles.referenceValue
                    }
                  >
                    {
                      processingReference
                    }
                  </strong>
                </div>
              )}
            </div>

            <div
              style={
                styles.pendingNotice
              }
            >
              <strong>
                Please wait for provider
                confirmation
              </strong>

              <p>
                Do not submit the same
                funding request again while
                this transaction is
                processing.
              </p>
            </div>

            <button
              type="button"
              style={
                styles.secondaryButton
              }
              onClick={
                resetFlow
              }
            >
              Done
            </button>
          </section>
        )}

        {/* ====================================================
            SUCCESS
        ==================================================== */}

        {step ===
          'success' && (
          <section
            style={styles.card}
          >
            <div
              style={
                styles.successIcon
              }
            >
              ✓
            </div>

            <h2
              style={
                styles.reviewTitle
              }
            >
              Funding Successful
            </h2>

            <p
              style={
                styles.reviewDescription
              }
            >
              Your betting account funding
              has been completed.
            </p>

            <div
              style={
                styles.successBox
              }
            >
              <div
                style={
                  styles.processingRow
                }
              >
                <span>
                  Betting App
                </span>

                <strong>
                  {
                    selectedProvider?.name
                  }
                </strong>
              </div>

              <div
                style={
                  styles.processingRow
                }
              >
                <span>
                  Amount
                </span>

                <strong
                  style={
                    styles.amountValue
                  }
                >
                  ₦
                  {formatAmount(
                    selectedAmount
                  )}
                </strong>
              </div>

              {successReference && (
                <div
                  style={
                    styles.processingRow
                  }
                >
                  <span>
                    Reference
                  </span>

                  <strong
                    style={
                      styles.referenceValue
                    }
                  >
                    {
                      successReference
                    }
                  </strong>
                </div>
              )}
            </div>

            <button
              type="button"
              style={
                styles.primaryButton
              }
              onClick={
                resetFlow
              }
            >
              Fund Another Account
            </button>
          </section>
        )}

        {/* INFORMATION */}

        <section
          style={styles.infoCard}
        >
          <div
            style={styles.infoIcon}
          >
            i
          </div>

          <div>
            <strong
              style={
                styles.infoTitle
              }
            >
              Important
            </strong>

            <p
              style={
                styles.infoText
              }
            >
              Make sure the betting account
              details belong to you and are
              correct before confirming a
              funding request. Your Transaction
              PIN authorizes the debit from your
              Zenimonies account.
            </p>
          </div>
        </section>
      </main>

      {/* ======================================================
          PIN MODAL
      ====================================================== */}

      {showPinModal && (
        <div
          style={
            styles.modalOverlay
          }
          onClick={
            closePinModal
          }
        >
          <div
            style={
              styles.pinModal
            }
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              style={
                styles.modalClose
              }
              onClick={
                closePinModal
              }
              disabled={
                submitting
              }
              aria-label="Close"
            >
              ×
            </button>

            <div
              style={
                styles.pinIcon
              }
            >
              🔐
            </div>

            <h2
              style={
                styles.pinTitle
              }
            >
              Enter Transaction PIN
            </h2>

            <p
              style={
                styles.pinDescription
              }
            >
              Enter your 4-digit Transaction
              PIN to authorize this betting
              funding.
            </p>

            <div
              style={
                styles.pinSummary
              }
            >
              <span>
                Amount
              </span>

              <strong>
                ₦
                {formatAmount(
                  selectedAmount
                )}
              </strong>
            </div>

            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={
                transactionPin
              }
              onChange={(
                event
              ) => {
                const value =
                  event.target.value.replace(
                    /\D/g,
                    ''
                  );

                setTransactionPin(
                  value
                );

                setError('');
              }}
              placeholder="••••"
              style={
                styles.pinInput
              }
              autoFocus
              autoComplete="off"
            />

            {error && (
              <div
                role="alert"
                style={
                  styles.modalError
                }
              >
                {error}
              </div>
            )}

            <button
              type="button"
              style={{
                ...styles.primaryButton,
                marginTop: 14,
                opacity:
                  submitting
                    ? 0.65
                    : 1,
              }}
              onClick={
                confirmFunding
              }
              disabled={
                submitting ||
                transactionPin.length !==
                  4
              }
            >
              {submitting
                ? 'Processing...'
                : 'Authorize Funding'}
            </button>

            <p
              style={
                styles.securityText
              }
            >
              Never share your Transaction PIN
              with anyone.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================
          BOTTOM NAV
      ====================================================== */}

      <nav
        style={styles.bottomNav}
      >
        <Link
          to="/"
          style={styles.navItem}
        >
          <span
            style={styles.navIcon}
          >
            ⌂
          </span>
          Home
        </Link>

        <Link
          to="/transactions"
          style={styles.navItem}
        >
          <span
            style={styles.navIcon}
          >
            ↕
          </span>
          Transactions
        </Link>

        <Link
          to="/wallet"
          style={styles.navItem}
        >
          <span
            style={styles.navIcon}
          >
            ▱
          </span>
          Wallet
        </Link>

        <Link
          to="/profile"
          style={styles.navItem}
        >
          <span
            style={styles.navIcon}
          >
            ♙
          </span>
          Profile
        </Link>
      </nav>
    </div>
  );
};

/* ============================================================
   STYLES
   ============================================================ */

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
    paddingBottom: 90,
  },

  header: {
    height: 68,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4%',
    borderBottom:
      '1px solid #edf2ef',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },

  brandLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    textDecoration: 'none',
  },

  logo: {
    width: 43,
    height: 43,
    borderRadius: 12,
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 800,
  },

  brandName: {
    fontSize: 19,
    fontWeight: 800,
    color: '#10251d',
  },

  brandSubtitle: {
    fontSize: 8,
    letterSpacing: 1.7,
    color: '#9aa7a1',
    marginTop: 3,
  },

  homeLink: {
    color: '#087c43',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 700,
  },

  main: {
    width: 'min(700px, 92%)',
    margin: '0 auto',
    paddingTop: 25,
  },

  backLink: {
    display: 'inline-block',
    marginBottom: 20,
    color: '#66756e',
    textDecoration: 'none',
    fontSize: 13,
    fontWeight: 600,
  },

  intro: {
    display: 'flex',
    alignItems: 'center',
    gap: 15,
    marginBottom: 17,
  },

  mainIcon: {
    width: 62,
    height: 62,
    flexShrink: 0,
    borderRadius: 18,
    background: '#e8f8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 29,
  },

  eyebrow: {
    color: '#087c43',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1.4,
    marginBottom: 4,
  },

  title: {
    margin: 0,
    color: '#063b2d',
    fontSize: 27,
    fontWeight: 800,
  },

  description: {
    margin: '6px 0 0',
    color: '#66756e',
    fontSize: 13,
    lineHeight: 1.5,
  },

  card: {
    background: '#ffffff',
    border:
      '1px solid #e5ebe8',
    borderRadius: 20,
    padding: 21,
    boxShadow:
      '0 7px 23px rgba(26,61,47,0.05)',
  },

  cardTitle: {
    margin: 0,
    color: '#172b22',
    fontSize: 19,
    fontWeight: 800,
  },

  cardDescription: {
    margin: '5px 0 17px',
    color: '#75827d',
    fontSize: 12.5,
    lineHeight: 1.5,
  },

  searchBox: {
    height: 46,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 13px',
    marginBottom: 13,
    border:
      '1px solid #d8e5df',
    borderRadius: 12,
    background: '#ffffff',
    boxSizing: 'border-box',
  },

  searchIcon: {
    color: '#087c43',
    fontSize: 20,
    fontWeight: 700,
  },

  searchInput: {
    width: '100%',
    height: '100%',
    border: 'none',
    outline: 'none',
    fontSize: 13,
    color: '#172b22',
    background: 'transparent',
  },

  loadingBox: {
    minHeight: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    color: '#66756e',
    fontSize: 13,
  },

  spinner: {
    width: 20,
    height: 20,
    border:
      '3px solid #d9eee3',
    borderTopColor:
      '#079447',
    borderRadius: '50%',
  },

  providerGrid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(2, minmax(0, 1fr))',
    gap: 10,
  },

  providerButton: {
    width: '100%',
    minHeight: 82,
    border:
      '1px solid #dcebe4',
    background: '#f8fcfa',
    borderRadius: 15,
    padding: 11,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textAlign: 'left',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },

  providerLogo: {
    width: 46,
    height: 46,
    flexShrink: 0,
    borderRadius: 13,
    background: '#ffffff',
    border:
      '1px solid #e0ebe6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  providerLogoLarge: {
    width: 52,
    height: 52,
    borderRadius: 15,
  },

  logoImage: {
    width: '72%',
    height: '72%',
    objectFit: 'contain',
  },

  logoInitials: {
    color: '#087c43',
    fontSize: 13,
    fontWeight: 800,
  },

  providerText: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1,
  },

  providerName: {
    color: '#172b22',
    fontSize: 13,
    lineHeight: 1.2,
  },

  providerDescription: {
    marginTop: 4,
    color: '#75827d',
    fontSize: 10.5,
    lineHeight: 1.25,
  },

  arrow: {
    color: '#078b4a',
    fontSize: 23,
    lineHeight: 1,
  },

  providerCount: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 13,
    color: '#7b8882',
    fontSize: 10.5,
  },

  emptyBox: {
    padding: 25,
    textAlign: 'center',
    borderRadius: 13,
    background: '#f7faf8',
    color: '#66756e',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    fontSize: 12,
  },

  notice: {
    marginTop: 16,
    padding: 13,
    borderRadius: 13,
    background: '#effbf5',
    border:
      '1px solid #d2eee0',
    display: 'flex',
    gap: 10,
  },

  noticeIcon: {
    width: 27,
    height: 27,
    flexShrink: 0,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    fontSize: 12,
  },

  noticeText: {
    margin: '3px 0 0',
    color: '#66756e',
    fontSize: 11.5,
    lineHeight: 1.45,
  },

  stepBack: {
    border: 'none',
    background: 'transparent',
    color: '#087c43',
    padding: 0,
    marginBottom: 17,
    cursor: 'pointer',
    fontSize: 12.5,
    fontWeight: 700,
  },

  selectedProvider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    marginBottom: 20,
    borderRadius: 14,
    background: '#f5fbf8',
    border:
      '1px solid #dcebe4',
  },

  selectedLabel: {
    color: '#75827d',
    fontSize: 10.5,
    marginBottom: 3,
  },

  selectedName: {
    color: '#063b2d',
    fontSize: 15,
  },

  label: {
    display: 'block',
    marginBottom: 7,
    marginTop: 14,
    color: '#344054',
    fontSize: 13,
    fontWeight: 700,
  },

  input: {
    width: '100%',
    height: 49,
    boxSizing: 'border-box',
    border:
      '1px solid #d8e5df',
    borderRadius: 12,
    padding: '0 13px',
    fontSize: 14,
    outline: 'none',
  },

  amountBox: {
    height: 49,
    border:
      '1px solid #d8e5df',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    padding: '0 13px',
    boxSizing: 'border-box',
  },

  currency: {
    color: '#087c43',
    fontWeight: 800,
    fontSize: 17,
    marginRight: 7,
  },

  amountInput: {
    width: '100%',
    height: '100%',
    border: 'none',
    outline: 'none',
    fontSize: 15,
  },

  quickAmounts: {
    display: 'flex',
    gap: 7,
    flexWrap: 'wrap',
    marginTop: 9,
  },

  quickAmountButton: {
    border:
      '1px solid #cfe6db',
    background: '#f5fbf8',
    color: '#087c43',
    borderRadius: 10,
    padding: '8px 11px',
    cursor: 'pointer',
    fontSize: 11.5,
    fontWeight: 700,
  },

  error: {
    marginTop: 13,
    padding: 11,
    borderRadius: 10,
    background: '#fee4e2',
    color: '#b42318',
    fontSize: 12,
  },

  primaryButton: {
    width: '100%',
    height: 48,
    marginTop: 16,
    border: 'none',
    borderRadius: 12,
    background: '#079447',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },

  secondaryButton: {
    width: '100%',
    height: 46,
    marginTop: 9,
    border:
      '1px solid #d0d9d5',
    borderRadius: 12,
    background: '#ffffff',
    color: '#344054',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },

  verifiedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    marginBottom: 14,
    borderRadius: 13,
    background: '#effbf5',
    border:
      '1px solid #cfeadb',
  },

  verifiedBadge: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: '#079447',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  verifiedTitle: {
    display: 'block',
    color: '#087c43',
    fontSize: 12.5,
  },

  verifiedName: {
    marginTop: 3,
    color: '#172b22',
    fontSize: 12,
  },

  reviewIcon: {
    width: 58,
    height: 58,
    margin: '0 auto 12px',
    borderRadius: 17,
    background: '#e5f7ee',
    color: '#078b4a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 800,
  },

  reviewTitle: {
    margin: 0,
    textAlign: 'center',
    fontSize: 21,
  },

  reviewDescription: {
    margin: '7px 0 18px',
    textAlign: 'center',
    color: '#75827d',
    fontSize: 12.5,
  },

  reviewBox: {
    border:
      '1px solid #dcebe4',
    borderRadius: 14,
    overflow: 'hidden',
  },

  reviewRow: {
    display: 'flex',
    justifyContent:
      'space-between',
    gap: 12,
    padding: '13px',
    borderBottom:
      '1px solid #edf2ef',
    fontSize: 12.5,
  },

  accountValue: {
    maxWidth: '55%',
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
  },

  amountValue: {
    color: '#087c43',
    fontSize: 15,
  },

  pendingNotice: {
    marginTop: 14,
    padding: 13,
    borderRadius: 12,
    background: '#fff8e8',
    border:
      '1px solid #f2dfad',
    color: '#7a5a00',
    fontSize: 12,
    lineHeight: 1.45,
  },

  processingIcon: {
    width: 64,
    height: 64,
    margin: '0 auto 15px',
    borderRadius: 18,
    background: '#fff8e8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  processingSpinner: {
    width: 26,
    height: 26,
    border:
      '3px solid #f0dfae',
    borderTopColor:
      '#c28a00',
    borderRadius: '50%',
  },

  processingBox: {
    border:
      '1px solid #dcebe4',
    borderRadius: 14,
    overflow: 'hidden',
  },

  processingRow: {
    display: 'flex',
    justifyContent:
      'space-between',
    gap: 12,
    padding: '13px',
    borderBottom:
      '1px solid #edf2ef',
    fontSize: 12.5,
  },

  referenceValue: {
    maxWidth: '58%',
    overflow: 'hidden',
    textOverflow:
      'ellipsis',
    whiteSpace:
      'nowrap',
    fontSize: 11,
  },

  successIcon: {
    width: 64,
    height: 64,
    margin: '0 auto 15px',
    borderRadius: 18,
    background: '#e5f7ee',
    color: '#079447',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 30,
    fontWeight: 800,
  },

  successBox: {
    border:
      '1px solid #cfeadb',
    borderRadius: 14,
    overflow: 'hidden',
    background: '#f8fcfa',
  },

  infoCard: {
    marginTop: 15,
    padding: 14,
    borderRadius: 16,
    background: '#ffffff',
    border:
      '1px solid #e5ebe8',
    display: 'flex',
    gap: 10,
  },

  infoIcon: {
    width: 34,
    height: 34,
    flexShrink: 0,
    borderRadius: 10,
    background: '#e8f8f0',
    color: '#087c43',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
  },

  infoTitle: {
    fontSize: 12.5,
  },

  infoText: {
    margin: '4px 0 0',
    color: '#75827d',
    fontSize: 11.5,
    lineHeight: 1.45,
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background:
      'rgba(6,30,21,0.48)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    zIndex: 100,
  },

  pinModal: {
    width: 'min(410px, 100%)',
    background: '#ffffff',
    borderRadius: 22,
    padding: 24,
    position: 'relative',
    boxShadow:
      '0 20px 60px rgba(0,0,0,0.18)',
  },

  modalClose: {
    position: 'absolute',
    top: 12,
    right: 15,
    width: 32,
    height: 32,
    border: 'none',
    background: '#f2f6f4',
    borderRadius: '50%',
    color: '#52615a',
    fontSize: 22,
    lineHeight: 1,
    cursor: 'pointer',
  },

  pinIcon: {
    width: 56,
    height: 56,
    margin: '0 auto 12px',
    borderRadius: 17,
    background: '#e8f8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
  },

  pinTitle: {
    margin: 0,
    textAlign: 'center',
    color: '#10251d',
    fontSize: 20,
  },

  pinDescription: {
    margin:
      '7px auto 17px',
    maxWidth: 330,
    textAlign: 'center',
    color: '#75827d',
    fontSize: 12.5,
    lineHeight: 1.5,
  },

  pinSummary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent:
      'space-between',
    padding: '12px 13px',
    borderRadius: 12,
    background: '#f5fbf8',
    border:
      '1px solid #dcebe4',
    color: '#66756e',
    fontSize: 12.5,
  },

  pinInput: {
    width: '100%',
    height: 58,
    boxSizing: 'border-box',
    marginTop: 13,
    border:
      '1px solid #cfe0d8',
    borderRadius: 13,
    outline: 'none',
    textAlign: 'center',
    fontSize: 25,
    letterSpacing: 10,
    color: '#063b2d',
    fontWeight: 800,
  },

  modalError: {
    marginTop: 11,
    padding: 10,
    borderRadius: 9,
    background: '#fee4e2',
    color: '#b42318',
    fontSize: 12,
    textAlign: 'center',
  },

  securityText: {
    margin:
      '13px 0 0',
    textAlign: 'center',
    color: '#98a39e',
    fontSize: 10.5,
  },

  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 68,
    background:
      'rgba(255,255,255,0.98)',
    borderTop:
      '1px solid #e5ebe8',
    display: 'grid',
    gridTemplateColumns:
      'repeat(4, 1fr)',
    zIndex: 30,
    boxShadow:
      '0 -5px 18px rgba(25,55,43,0.05)',
  },

  navItem: {
    textDecoration: 'none',
    color: '#78847f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 3,
    fontSize: 10,
    fontWeight: 600,
  },

  navIcon: {
    fontSize: 21,
    lineHeight: 1,
  },
};

export default Betting;
