import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/Theme.tsx';

// ============================================================
// ZENIMONIES BANKING
// GIFT CARDS
// BUY + SELL
// DARK MODE ENABLED
// ============================================================

type GiftCardMode = 'buy' | 'sell';
type CardType = 'Digital code' | 'Physical card';
type Tab = 'trade' | 'history';

type Brand = {
  id: string;
  name: string;
  logo: string;
  color: string;
  regions: string[];
  currencies: string[];
};

type GiftCardTransaction = {
  id: string;
  mode: GiftCardMode;
  brand: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
};

// ============================================================
// ZENIMONIES COLORS
// ============================================================

const GREEN = '#176b43';
const DARK_GREEN = '#104d32';

const LIGHT = {
  page: '#f5f8f6',
  surface: '#ffffff',
  surfaceSoft: '#f7faf8',
  surfaceAlt: '#eff7f1',
  border: '#e1ebe4',
  borderSoft: '#dce9e1',
  text: '#173d2b',
  heading: '#145c39',
  secondaryText: '#748078',
  muted: '#89958d',
  tabBackground: '#e6efe9',
  tabText: '#587264',
  input: '#ffffff',
  inputBorder: '#dce9e1',
  selected: '#eff8f2',
  selectedBorder: '#176b43',
  bannerText: '#ffffff',
  bannerSecondary: '#d9eee2',
};

const DARK = {
  page: '#07140f',
  surface: '#0d2118',
  surfaceSoft: '#10271d',
  surfaceAlt: '#123022',
  border: '#1d3d2d',
  borderSoft: '#28503c',
  text: '#edf7f1',
  heading: '#8ee0b3',
  secondaryText: '#a8bdb2',
  muted: '#71877b',
  tabBackground: '#102a1f',
  tabText: '#9ab3a6',
  input: '#0b1b14',
  inputBorder: '#294b3a',
  selected: '#123524',
  selectedBorder: '#42a873',
  bannerText: '#ffffff',
  bannerSecondary: '#ccebd9',
};

// ============================================================
// GIFT CARD BRANDS
// Provider catalogue will replace this after Prestmit API
// connection is approved.
// ============================================================

const BRANDS: Brand[] = [
  {
    id: 'amazon',
    name: 'Amazon',
    logo: 'amazon',
    color: '#ff9900',
    regions: [
      'United States',
      'United Kingdom',
      'Canada',
      'Australia',
    ],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'apple',
    name: 'Apple Gift Card',
    logo: 'apple',
    color: '#111111',
    regions: [
      'United States',
      'United Kingdom',
      'Canada',
      'Australia',
    ],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'googleplay',
    name: 'Google Play',
    logo: 'googleplay',
    color: '#01875f',
    regions: [
      'United States',
      'United Kingdom',
      'Canada',
      'Australia',
    ],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'steam',
    name: 'Steam',
    logo: 'steam',
    color: '#171a21',
    regions: [
      'United States',
      'United Kingdom',
      'Canada',
      'Australia',
    ],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'playstation',
    name: 'PlayStation',
    logo: 'playstation',
    color: '#003791',
    regions: [
      'United States',
      'United Kingdom',
      'Canada',
      'Australia',
    ],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'xbox',
    name: 'Xbox',
    logo: 'xbox',
    color: '#107c10',
    regions: [
      'United States',
      'United Kingdom',
      'Canada',
      'Australia',
    ],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
  {
    id: 'razer',
    name: 'Razer Gold',
    logo: 'razer',
    color: '#44d62c',
    regions: [
      'United States',
      'United Kingdom',
      'Canada',
      'Australia',
    ],
    currencies: ['USD', 'GBP', 'CAD', 'AUD'],
  },
];

// ============================================================
// REGIONS
// ============================================================

const REGIONS = [
  {
    name: 'United States',
    currency: 'USD',
    symbol: '$',
  },
  {
    name: 'United Kingdom',
    currency: 'GBP',
    symbol: '£',
  },
  {
    name: 'Canada',
    currency: 'CAD',
    symbol: 'CA$',
  },
  {
    name: 'Australia',
    currency: 'AUD',
    symbol: 'A$',
  },
];

// ============================================================
// COMPONENT
// ============================================================

const GiftCards: React.FC = () => {
  const navigate = useNavigate();

  // ==========================================================
  // ZENIMONIES GLOBAL THEME
  // ==========================================================

  const { darkMode: isDarkMode } = useTheme();

  const colors = isDarkMode ? DARK : LIGHT;

  // ==========================================================
  // STATE
  // ==========================================================

  const [mode, setMode] =
    useState<GiftCardMode>('buy');

  const [tab, setTab] =
    useState<Tab>('trade');

  const [search, setSearch] =
    useState('');

  const [selectedBrand, setSelectedBrand] =
    useState<Brand | null>(null);

  const [region, setRegion] =
    useState('');

  const [cardType, setCardType] =
    useState<CardType>('Digital code');

  const [currency, setCurrency] =
    useState('USD');

  const [amount, setAmount] =
    useState('');

  const [quantity, setQuantity] =
    useState('1');

  const [recipientEmail, setRecipientEmail] =
    useState('');

  const [cardCode, setCardCode] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [notice, setNotice] =
    useState('');

  const [noticeType, setNoticeType] =
    useState<'success' | 'error' | 'info'>(
      'info'
    );

  const [showReview, setShowReview] =
    useState(false);

  // ==========================================================
  // TRANSACTIONS
  // Provider/backend will populate this later.
  // ==========================================================

  const [transactions] =
    useState<GiftCardTransaction[]>([]);

  // ==========================================================
  // FILTER BRANDS
  // ==========================================================

  const filteredBrands = useMemo(() => {
    return BRANDS.filter((brand) =>
      brand.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [search]);

  // ==========================================================
  // SELECTED REGION
  // ==========================================================

  const selectedRegion = REGIONS.find(
    (item) => item.name === region
  );

  // ==========================================================
  // AMOUNT VALIDATION
  // ==========================================================

  const parsedAmount = Number(amount);
  const parsedQuantity = Number(quantity);

  const validAmount =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= 100000;

  const validQuantity =
    Number.isInteger(parsedQuantity) &&
    parsedQuantity >= 1 &&
    parsedQuantity <= 10;

  const canReview =
    !!selectedBrand &&
    !!region &&
    !!currency &&
    validAmount &&
    validQuantity;

  // ==========================================================
  // RESET FORM
  // ==========================================================

  const resetForm = (
    nextMode: GiftCardMode
  ) => {
    setMode(nextMode);
    setTab('trade');
    setSearch('');
    setSelectedBrand(null);
    setRegion('');
    setCurrency('USD');
    setAmount('');
    setQuantity('1');
    setRecipientEmail('');
    setCardCode('');
    setNotes('');
    setNotice('');
    setShowReview(false);
  };

  // ==========================================================
  // SELECT BRAND
  // ==========================================================

  const chooseBrand = (brand: Brand) => {
    setSelectedBrand(brand);
    setRegion('');
    setCurrency('USD');
    setNotice('');
    setShowReview(false);
  };

  // ==========================================================
  // SELECT REGION
  // ==========================================================

  const chooseRegion = (value: string) => {
    setRegion(value);

    const found = REGIONS.find(
      (item) => item.name === value
    );

    if (found) {
      setCurrency(found.currency);
    }

    setNotice('');
    setShowReview(false);
  };

  // ==========================================================
  // REVIEW
  // ==========================================================

  const handleReview = () => {
    setNotice('');
    setNoticeType('error');

    if (!selectedBrand) {
      setNotice(
        'Please select a gift card brand.'
      );
      return;
    }

    if (!region || !currency) {
      setNotice(
        'Please select the card country and currency.'
      );
      return;
    }

    if (!validAmount) {
      setNotice(
        'Enter a valid card amount greater than zero.'
      );
      return;
    }

    if (!validQuantity) {
      setNotice(
        'Choose a quantity between 1 and 10.'
      );
      return;
    }

    if (
      mode === 'buy' &&
      recipientEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        recipientEmail
      )
    ) {
      setNotice(
        'Please enter a valid recipient email.'
      );
      return;
    }

    if (
      mode === 'sell' &&
      !cardCode.trim()
    ) {
      setNotice(
        'Gift card details cannot be submitted until secure provider verification is enabled.'
      );
      return;
    }

    setShowReview(true);
    setNoticeType('info');

    setNotice(
      'This is a review preview only. Provider checkout is not connected.'
    );
  };

  // ==========================================================
  // PROVIDER ACTION
  // ==========================================================

  const handleProviderAction = () => {
    setNoticeType('info');

    setNotice(
      'Provider integration is pending. No transaction was created, no gift card was purchased or redeemed, and no wallet funds were deducted.'
    );

    setShowReview(false);
  };

  // ==========================================================
  // INPUT STYLE
  // ==========================================================

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 50,
    boxSizing: 'border-box',
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: 12,
    padding: '0 14px',
    fontSize: 15,
    color: colors.text,
    background: colors.input,
    outline: 'none',
  };

  // ==========================================================
  // LABEL STYLE
  // ==========================================================

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 800,
    color: colors.heading,
    marginBottom: 8,
  };

  // ==========================================================
  // SECTION STYLE
  // ==========================================================

  const sectionStyle: React.CSSProperties = {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 20,
    padding: 20,
    boxShadow: isDarkMode
      ? '0 5px 20px rgba(0,0,0,0.18)'
      : '0 5px 20px rgba(20,92,57,0.04)',
    marginBottom: 18,
  };

  // ==========================================================
  // SECTION TITLE
  // ==========================================================

  const sectionTitleStyle: React.CSSProperties = {
    margin: '0 0 7px',
    fontSize: 20,
    fontWeight: 800,
    color: colors.heading,
  };

  // ==========================================================
  // SMALL TEXT
  // ==========================================================

  const smallTextStyle: React.CSSProperties = {
    margin: '0 0 20px',
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 1.7,
  };

  // ==========================================================
  // NOTICE COLORS
  // ==========================================================

  const noticeBackground =
    noticeType === 'error'
      ? isDarkMode
        ? '#321513'
        : '#fff0ef'
      : noticeType === 'success'
        ? isDarkMode
          ? '#10291d'
          : '#eaf7ef'
        : isDarkMode
          ? '#302811'
          : '#fff8e8';

  const noticeColor =
    noticeType === 'error'
      ? isDarkMode
        ? '#ffaaa4'
        : '#a52b25'
      : noticeType === 'success'
        ? isDarkMode
          ? '#8ee0b3'
          : '#145c39'
        : isDarkMode
          ? '#e7c878'
          : '#806b42';

  const noticeBorder =
    noticeType === 'error'
      ? isDarkMode
        ? '#61302c'
        : '#f2c7c4'
      : noticeType === 'success'
        ? isDarkMode
          ? '#28553b'
          : '#cfe9d8'
        : isDarkMode
          ? '#5b4a22'
          : '#f2e1b8';

  // ==========================================================
  // BRAND LOGO
  // ==========================================================

  const renderBrandLogo = (
    brand: Brand
  ) => {
    return (
      <div
        style={{
          width: 64,
          height: 64,
          minWidth: 64,
          borderRadius: 17,
          background: colors.surfaceSoft,
          border: `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={`https://cdn.simpleicons.org/${brand.logo}`}
          alt={`${brand.name} logo`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display =
              'none';

            const parent =
              event.currentTarget.parentElement;

            if (parent) {
              parent.style.background =
                brand.color;

              parent.style.color =
                '#ffffff';

              parent.style.fontWeight =
                '900';

              parent.style.fontSize =
                '23px';

              parent.textContent =
                brand.name
                  .split(' ')
                  .map(
                    (word) => word[0]
                  )
                  .join('')
                  .slice(0, 3);
            }
          }}
          style={{
            width: 42,
            height: 42,
            objectFit: 'contain',
          }}
        />
      </div>
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.page,
        color: colors.text,
        padding: '20px 16px 40px',
        boxSizing: 'border-box',
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        transition:
          'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      <div
        style={{
          maxWidth: 650,
          margin: '0 auto',
        }}
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              border: `1px solid ${colors.border}`,
              background: colors.surface,
              color: colors.heading,
              fontSize: 25,
              cursor: 'pointer',
            }}
          >
            ‹
          </button>

          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 23,
                fontWeight: 900,
                color: colors.heading,
              }}
            >
              Gift Cards
            </h1>

            <p
              style={{
                margin: '5px 0 0',
                fontSize: 13,
                color: colors.secondaryText,
              }}
            >
              Buy and sell gift cards with
              ZENIMONIES
            </p>
          </div>
        </header>

        {/* ====================================================
            BANNER
        ==================================================== */}

        <div
          style={{
            background:
              'linear-gradient(135deg, #176b43, #104d32)',
            borderRadius: 20,
            padding: 22,
            color: colors.bannerText,
            marginBottom: 22,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 15,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                minWidth: 60,
                borderRadius: 17,
                background:
                  'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 31,
              }}
            >
              🎁
            </div>

            <div>
              <div
                style={{
                  fontSize: 19,
                  fontWeight: 900,
                  marginBottom: 5,
                }}
              >
                ZENIMONIES Gift Cards
              </div>

              <div
                style={{
                  fontSize: 13,
                  color:
                    colors.bannerSecondary,
                  lineHeight: 1.7,
                }}
              >
                Choose your favourite
                brands, review your order,
                and manage gift card
                transactions.
              </div>
            </div>
          </div>
        </div>

        {/* ====================================================
            MAIN TABS
        ==================================================== */}

        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: 5,
            background:
              colors.tabBackground,
            borderRadius: 15,
            marginBottom: 22,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab('trade');
              setNotice('');
            }}
            style={{
              flex: 1,
              height: 46,
              border: 'none',
              borderRadius: 11,
              background:
                tab === 'trade'
                  ? GREEN
                  : 'transparent',
              color:
                tab === 'trade'
                  ? '#ffffff'
                  : colors.tabText,
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Buy / Sell
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('history');
              setNotice('');
              setShowReview(false);
            }}
            style={{
              flex: 1,
              height: 46,
              border: 'none',
              borderRadius: 11,
              background:
                tab === 'history'
                  ? GREEN
                  : 'transparent',
              color:
                tab === 'history'
                  ? '#ffffff'
                  : colors.tabText,
              fontSize: 14,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Transaction History
          </button>
        </div>

        {/* ====================================================
            TRADE
        ==================================================== */}

        {tab === 'trade' && (
          <>
            {/* BUY / SELL SWITCH */}

            <div
              style={{
                display: 'flex',
                gap: 8,
                padding: 5,
                background:
                  colors.tabBackground,
                borderRadius: 15,
                marginBottom: 22,
              }}
            >
              {(
                ['buy', 'sell'] as GiftCardMode[]
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    resetForm(item)
                  }
                  style={{
                    flex: 1,
                    height: 48,
                    border: 'none',
                    borderRadius: 11,
                    background:
                      mode === item
                        ? GREEN
                        : 'transparent',
                    color:
                      mode === item
                        ? '#ffffff'
                        : colors.tabText,
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  {item === 'buy'
                    ? 'Buy Gift Cards'
                    : 'Sell Gift Cards'}
                </button>
              ))}
            </div>

            {/* ==================================================
                BRAND SELECTION
            ================================================== */}

            <div style={sectionStyle}>
              <h2
                style={sectionTitleStyle}
              >
                {mode === 'buy'
                  ? 'Choose a Gift Card'
                  : 'Select Card to Sell'}
              </h2>

              <p
                style={smallTextStyle}
              >
                Select a brand below. Brand
                availability and supported
                regions will be confirmed
                when a provider is connected.
              </p>

              <div
                style={{
                  marginBottom: 16,
                }}
              >
                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search gift card brands..."
                  aria-label="Search gift card brands"
                  style={inputStyle}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(135px, 1fr))',
                  gap: 12,
                }}
              >
                {filteredBrands.map(
                  (brand) => {
                    const selected =
                      selectedBrand?.id ===
                      brand.id;

                    return (
                      <button
                        type="button"
                        key={brand.id}
                        onClick={() =>
                          chooseBrand(
                            brand
                          )
                        }
                        aria-pressed={
                          selected
                        }
                        style={{
                          minHeight: 145,
                          border: selected
                            ? `2px solid ${GREEN}`
                            : `1px solid ${colors.border}`,
                          borderRadius: 17,
                          background:
                            selected
                              ? colors.selected
                              : colors.surface,
                          padding: 14,
                          display: 'flex',
                          flexDirection:
                            'column',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          gap: 10,
                          cursor:
                            'pointer',
                          boxShadow:
                            selected
                              ? '0 4px 12px rgba(23,107,67,0.12)'
                              : 'none',
                        }}
                      >
                        {renderBrandLogo(
                          brand
                        )}

                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color:
                              colors.text,
                            textAlign:
                              'center',
                          }}
                        >
                          {brand.name}
                        </span>

                        {selected && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color:
                                isDarkMode
                                  ? '#8ee0b3'
                                  : GREEN,
                            }}
                          >
                            Selected ✓
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {filteredBrands.length ===
                0 && (
                <p
                  style={{
                    textAlign: 'center',
                    color:
                      colors.secondaryText,
                    fontSize: 13,
                    padding: 20,
                  }}
                >
                  No matching gift card
                  brand found.
                </p>
              )}
            </div>

            {/* ==================================================
                CARD DETAILS
            ================================================== */}

            <div style={sectionStyle}>
              <h2
                style={sectionTitleStyle}
              >
                {mode === 'buy'
                  ? 'Card Details'
                  : 'Sell Details'}
              </h2>

              <p
                style={smallTextStyle}
              >
                {mode === 'buy'
                  ? 'Choose the region, card type, and amount.'
                  : 'Enter the card information for a future redemption quote.'}
              </p>

              {/* REGION */}

              <div
                style={{
                  marginBottom: 18,
                }}
              >
                <label
                  style={labelStyle}
                >
                  Card Country / Region
                </label>

                <select
                  value={region}
                  onChange={(e) =>
                    chooseRegion(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    colorScheme:
                      isDarkMode
                        ? 'dark'
                        : 'light',
                  }}
                >
                  <option value="">
                    Select card region
                  </option>

                  {REGIONS.map(
                    (item) => (
                      <option
                        key={item.name}
                        value={item.name}
                      >
                        {item.name} (
                        {
                          item.currency
                        }
                        )
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* CARD TYPE */}

              <div
                style={{
                  marginBottom: 18,
                }}
              >
                <label
                  style={labelStyle}
                >
                  Card Type
                </label>

                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                  }}
                >
                  {(
                    [
                      'Digital code',
                      'Physical card',
                    ] as CardType[]
                  ).map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() =>
                        setCardType(
                          item
                        )
                      }
                      style={{
                        flex: 1,
                        minHeight: 48,
                        border:
                          cardType ===
                          item
                            ? `2px solid ${GREEN}`
                            : `1px solid ${colors.borderSoft}`,
                        borderRadius: 12,
                        background:
                          cardType ===
                          item
                            ? colors.selected
                            : colors.surface,
                        color:
                          cardType ===
                          item
                            ? isDarkMode
                              ? '#8ee0b3'
                              : GREEN
                            : colors.tabText,
                        fontSize: 13,
                        fontWeight: 800,
                        cursor:
                          'pointer',
                      }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              {/* CURRENCY */}

              <div
                style={{
                  marginBottom: 18,
                }}
              >
                <label
                  style={labelStyle}
                >
                  Gift Card Currency
                </label>

                <select
                  value={currency}
                  onChange={(e) =>
                    setCurrency(
                      e.target.value
                    )
                  }
                  style={{
                    ...inputStyle,
                    colorScheme:
                      isDarkMode
                        ? 'dark'
                        : 'light',
                  }}
                >
                  {REGIONS.map(
                    (item) => (
                      <option
                        key={
                          item.currency
                        }
                        value={
                          item.currency
                        }
                      >
                        {
                          item.currency
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* AMOUNT */}

              <div
                style={{
                  marginBottom: 18,
                }}
              >
                <label
                  style={labelStyle}
                >
                  {mode === 'buy'
                    ? 'Gift Card Amount'
                    : 'Gift Card Face Value'}
                </label>

                <div
                  style={{
                    display: 'flex',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: 12,
                    overflow: 'hidden',
                    background:
                      colors.input,
                  }}
                >
                  <span
                    style={{
                      minWidth: 65,
                      display: 'flex',
                      alignItems:
                        'center',
                      justifyContent:
                        'center',
                      background:
                        colors.surfaceAlt,
                      color:
                        isDarkMode
                          ? '#8ee0b3'
                          : GREEN,
                      fontWeight: 900,
                    }}
                  >
                    {selectedRegion?.symbol ||
                      '$'}
                  </span>

                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="0.01"
                    value={amount}
                    onChange={(e) => {
                      setAmount(
                        e.target.value
                      );
                      setNotice('');
                      setShowReview(
                        false
                      );
                    }}
                    placeholder="Enter amount"
                    style={{
                      ...inputStyle,
                      border: 'none',
                      borderRadius: 0,
                    }}
                  />
                </div>
              </div>

              {/* BUY ONLY */}

              {mode === 'buy' && (
                <>
                  <div
                    style={{
                      marginBottom: 18,
                    }}
                  >
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Quantity
                    </label>

                    <select
                      value={
                        quantity
                      }
                      onChange={(e) =>
                        setQuantity(
                          e.target
                            .value
                        )
                      }
                      style={{
                        ...inputStyle,
                        colorScheme:
                          isDarkMode
                            ? 'dark'
                            : 'light',
                      }}
                    >
                      {[
                        1, 2, 3, 4, 5,
                        6, 7, 8, 9, 10,
                      ].map(
                        (number) => (
                          <option
                            key={
                              number
                            }
                            value={
                              number
                            }
                          >
                            {number}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div
                    style={{
                      marginBottom: 18,
                    }}
                  >
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Recipient Email
                      (Optional)
                    </label>

                    <input
                      type="email"
                      value={
                        recipientEmail
                      }
                      onChange={(e) =>
                        setRecipientEmail(
                          e.target
                            .value
                        )
                      }
                      placeholder="recipient@example.com"
                      style={
                        inputStyle
                      }
                    />
                  </div>
                </>
              )}

              {/* SELL ONLY */}

              {mode === 'sell' && (
                <>
                  <div
                    style={{
                      marginBottom: 18,
                    }}
                  >
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Gift Card Details
                    </label>

                    <textarea
                      value={cardCode}
                      onChange={(e) =>
                        setCardCode(
                          e.target
                            .value
                        )
                      }
                      placeholder="Provider submission will become available after secure gift-card verification is activated."
                      rows={4}
                      style={{
                        ...inputStyle,
                        height: 'auto',
                        padding: 14,
                        resize:
                          'vertical',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginBottom: 18,
                    }}
                  >
                    <label
                      style={
                        labelStyle
                      }
                    >
                      Additional Notes
                      (Optional)
                    </label>

                    <textarea
                      value={notes}
                      onChange={(e) =>
                        setNotes(
                          e.target
                            .value
                        )
                      }
                      placeholder="Additional card details"
                      rows={3}
                      style={{
                        ...inputStyle,
                        height: 'auto',
                        padding: 14,
                        resize:
                          'vertical',
                      }}
                    />
                  </div>
                </>
              )}

              {/* =================================================
                  PROVIDER STATUS
              ================================================= */}

              <div
                style={{
                  background:
                    isDarkMode
                      ? '#302811'
                      : '#fff8e8',
                  border: `1px solid ${
                    isDarkMode
                      ? '#5b4a22'
                      : '#f2e1b8'
                  }`,
                  borderRadius: 13,
                  padding: 14,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    color:
                      isDarkMode
                        ? '#e7c878'
                        : '#855d12',
                    marginBottom: 6,
                  }}
                >
                  Provider connection
                  pending
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color:
                      isDarkMode
                        ? '#cdbd8a'
                        : '#806b42',
                    lineHeight: 1.7,
                  }}
                >
                  Live rates, purchases,
                  redemption, card-code
                  verification, and Naira
                  payouts are not active.
                  No wallet funds will be
                  deducted.
                </div>
              </div>

              {/* REVIEW BUTTON */}

              <button
                type="button"
                disabled={!canReview}
                onClick={
                  handleReview
                }
                style={{
                  width: '100%',
                  minHeight: 52,
                  border: 'none',
                  borderRadius: 13,
                  background:
                    canReview
                      ? GREEN
                      : isDarkMode
                        ? '#30453a'
                        : '#a7b8ad',
                  color:
                    '#ffffff',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor:
                    canReview
                      ? 'pointer'
                      : 'not-allowed',
                }}
              >
                Review{' '}
                {mode === 'buy'
                  ? 'Purchase'
                  : 'Sale'}
              </button>

              {/* NOTICE */}

              {notice && (
                <div
                  role="status"
                  style={{
                    marginTop: 16,
                    padding: 14,
                    background:
                      noticeBackground,
                    border: `1px solid ${noticeBorder}`,
                    borderRadius: 12,
                    color: noticeColor,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  {notice}
                </div>
              )}
            </div>

            {/* ==================================================
                REVIEW
            ================================================== */}

            {showReview &&
              selectedBrand && (
                <div
                  style={
                    sectionStyle
                  }
                >
                  <h2
                    style={
                      sectionTitleStyle
                    }
                  >
                    Review Your Order
                  </h2>

                  <p
                    style={
                      smallTextStyle
                    }
                  >
                    Please check your
                    details before
                    continuing. This is
                    a preview only.
                  </p>

                  <div
                    style={{
                      display:
                        'flex',
                      alignItems:
                        'center',
                      gap: 12,
                      marginBottom: 20,
                    }}
                  >
                    {renderBrandLogo(
                      selectedBrand
                    )}

                    <div>
                      <div
                        style={{
                          fontWeight:
                            900,
                          color:
                            colors.heading,
                        }}
                      >
                        {
                          selectedBrand.name
                        }
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color:
                            colors.secondaryText,
                          marginTop: 4,
                        }}
                      >
                        {region} ·{' '}
                        {currency}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background:
                        colors.surfaceSoft,
                      borderRadius: 13,
                      padding: 15,
                      marginBottom: 16,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {[
                      [
                        'Card amount',
                        `${currency} ${parsedAmount.toFixed(2)}`,
                      ],
                      [
                        'Quantity',
                        quantity,
                      ],
                      [
                        'Card type',
                        cardType,
                      ],
                      [
                        'Order total',
                        `${currency} ${(parsedAmount * parsedQuantity).toFixed(2)}`,
                      ],
                      [
                        'Naira price / payout',
                        'Unavailable',
                      ],
                    ].map(
                      ([label, value]) => (
                        <div
                          key={
                            label
                          }
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            gap: 12,
                            padding:
                              '8px 0',
                            fontSize: 13,
                          }}
                        >
                          <span
                            style={{
                              color:
                                colors.secondaryText,
                            }}
                          >
                            {label}
                          </span>

                          <strong
                            style={{
                              color:
                                colors.text,
                              textAlign:
                                'right',
                            }}
                          >
                            {value}
                          </strong>
                        </div>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleProviderAction
                    }
                    style={{
                      width: '100%',
                      minHeight: 52,
                      border: 'none',
                      borderRadius: 13,
                      background:
                        GREEN,
                      color:
                        '#ffffff',
                      fontSize: 15,
                      fontWeight: 900,
                      cursor:
                        'pointer',
                    }}
                  >
                    {mode === 'buy'
                      ? 'Check Provider Availability'
                      : 'Check Redemption Availability'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowReview(
                        false
                      );
                      setNotice('');
                    }}
                    style={{
                      width: '100%',
                      minHeight: 46,
                      border: 'none',
                      background:
                        'transparent',
                      color:
                        isDarkMode
                          ? '#8ee0b3'
                          : GREEN,
                      fontWeight: 800,
                      cursor:
                        'pointer',
                      marginTop: 8,
                    }}
                  >
                    Edit Details
                  </button>
                </div>
              )}
          </>
        )}

        {/* ====================================================
            TRANSACTION HISTORY
        ==================================================== */}

        {tab === 'history' && (
          <div
            style={
              sectionStyle
            }
          >
            <h2
              style={
                sectionTitleStyle
              }
            >
              Gift Card Transactions
            </h2>

            <p
              style={
                smallTextStyle
              }
            >
              View your gift card
              purchase and sale records.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 18,
              }}
            >
              {[
                'All',
                'Buy',
                'Sell',
              ].map((filter) => (
                <span
                  key={filter}
                  style={{
                    borderRadius: 20,
                    background:
                      colors.surfaceAlt,
                    color:
                      isDarkMode
                        ? '#8ee0b3'
                        : GREEN,
                    padding:
                      '8px 14px',
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {filter}
                </span>
              ))}
            </div>

            {transactions.length ===
            0 ? (
              <div
                style={{
                  textAlign:
                    'center',
                  padding:
                    '32px 12px',
                  background:
                    colors.surfaceSoft,
                  borderRadius: 16,
                  border: `1px dashed ${colors.borderSoft}`,
                }}
              >
                <div
                  style={{
                    fontSize: 36,
                    marginBottom: 12,
                  }}
                >
                  <span
                    role="img"
                    aria-label="Gift"
                  >
                    🎁
                  </span>
                </div>

                <div
                  style={{
                    color:
                      colors.heading,
                    fontWeight: 900,
                    marginBottom: 8,
                  }}
                >
                  No Gift Card
                  Transactions
                </div>

                <div
                  style={{
                    color:
                      colors.secondaryText,
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Your completed gift
                  card transactions
                  will appear here
                  after the provider
                  and transaction
                  history backend
                  are connected.
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setTab('trade')
                  }
                  style={{
                    marginTop: 18,
                    minHeight: 44,
                    padding:
                      '0 22px',
                    border: 'none',
                    borderRadius: 12,
                    background:
                      GREEN,
                    color:
                      '#ffffff',
                    fontWeight: 800,
                    cursor:
                      'pointer',
                  }}
                >
                  Go to Gift Cards
                </button>
              </div>
            ) : (
              transactions.map(
                (transaction) => (
                  <div
                    key={
                      transaction.id
                    }
                    style={{
                      padding: 14,
                      border: `1px solid ${colors.border}`,
                      borderRadius: 13,
                      marginBottom: 12,
                      background:
                        colors.surface,
                    }}
                  >
                    <strong
                      style={{
                        color:
                          colors.heading,
                      }}
                    >
                      {
                        transaction.brand
                      }
                    </strong>

                    <div
                      style={{
                        color:
                          colors.text,
                        marginTop: 5,
                      }}
                    >
                      {
                        transaction.mode
                      }{' '}
                      ·{' '}
                      {
                        transaction.currency
                      }{' '}
                      {
                        transaction.amount
                      }
                    </div>

                    <small
                      style={{
                        color:
                          colors.secondaryText,
                      }}
                    >
                      {
                        transaction.status
                      }
                    </small>
                  </div>
                )
              )
            )}
          </div>
        )}

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginTop: 25,
            color: colors.muted,
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              color:
                isDarkMode
                  ? '#8ee0b3'
                  : GREEN,
              fontWeight: 900,
              letterSpacing: 1,
              marginBottom: 5,
            }}
          >
            ZENIMONIES
          </div>

          Secure banking for your
          everyday needs.
        </div>
      </div>
    </div>
  );
};

export default GiftCards;
