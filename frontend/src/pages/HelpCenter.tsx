import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type CategoryId =
  | 'getting-started'
  | 'transfers'
  | 'bills'
  | 'wallet'
  | 'cards'
  | 'business'
  | 'security'
  | 'kyc';

type FAQ = {
  question: string;
  answer: string;
};

type Category = {
  id: CategoryId;
  title: string;
  description: string;
  icon: string;
  faqs: FAQ[];
};

const categories: Category[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of using your ZENIMONIES account.',
    icon: '🚀',
    faqs: [
      {
        question: 'How do I create a ZENIMONIES account?',
        answer:
          'Create your account using the registration page and provide the required personal information. After registration, complete the verification steps requested by ZENIMONIES.',
      },
      {
        question: 'Where can I find my account number?',
        answer:
          'Your ZENIMONIES account number is displayed in your account and dashboard information after your account has been created.',
      },
      {
        question: 'How do I add money to my account?',
        answer:
          'Open Deposit from your dashboard and choose one of the available funding methods. Always confirm the payment details shown inside the ZENIMONIES app before making a transfer.',
      },
      {
        question: 'Why do I need to verify my account?',
        answer:
          'Verification helps ZENIMONIES confirm your identity and protect your account and financial activities.',
      },
    ],
  },
  {
    id: 'transfers',
    title: 'Transfers & Transactions',
    description: 'Get help with sending, receiving and tracking money.',
    icon: '💸',
    faqs: [
      {
        question: 'How do I send money?',
        answer:
          'Open Transfer, enter the recipient information and amount, review the transaction carefully, then authorize the transfer with your transaction security method.',
      },
      {
        question: 'How do I know if my transfer was successful?',
        answer:
          'Check your transaction history or transaction receipt. A completed transaction will show its current status and transaction details.',
      },
      {
        question: 'Why is my transfer pending?',
        answer:
          'A transfer can remain pending while the payment provider or banking network is processing it. Check the transaction status before attempting the same payment again.',
      },
      {
        question: 'What should I do if a transfer fails?',
        answer:
          'Check the transaction status and failure message. If money was deducted and the transaction did not complete, do not send the payment again until the original transaction has been resolved.',
      },
      {
        question: 'Where can I find my transaction receipt?',
        answer:
          'Open your transaction history and select the relevant transaction to view its available transaction details and receipt.',
      },
    ],
  },
  {
    id: 'bills',
    title: 'Bills & Payments',
    description: 'Help with airtime, data, bills and other services.',
    icon: '🧾',
    faqs: [
      {
        question: 'Can I buy airtime?',
        answer:
          'Yes. Use the Airtime service available in the ZENIMONIES app and carefully confirm the phone number, network and amount before completing the payment.',
      },
      {
        question: 'Can I buy mobile data?',
        answer:
          'Yes. Select Data, choose the network and available data plan, confirm the recipient number and authorize the payment.',
      },
      {
        question: 'Can I pay electricity bills?',
        answer:
          'Electricity payments can be made through the available electricity service. Always confirm the meter details and payment information before authorizing a transaction.',
      },
      {
        question: 'Which education services are available?',
        answer:
          'Available education services are displayed inside the Education section. Availability may change depending on the connected service provider.',
      },
      {
        question: 'What happens when a bill payment is unsuccessful?',
        answer:
          'Check the payment status in your transaction history. If the payment is unsuccessful but your account was debited, wait for the transaction to be resolved before attempting another payment.',
      },
    ],
  },
  {
    id: 'wallet',
    title: 'Wallet & Savings',
    description: 'Learn how your main wallet and Save Wallet work.',
    icon: '💰',
    faqs: [
      {
        question: 'What is Save Wallet?',
        answer:
          'Save Wallet is a separate savings balance within ZENIMONIES that allows you to move money from your main account into savings.',
      },
      {
        question: 'How do I manually save money?',
        answer:
          'Open Save Wallet and choose the option to save money. Enter the amount and confirm the transaction.',
      },
      {
        question: 'Can I withdraw money from Save Wallet?',
        answer:
          'Yes. Available savings can be moved from Save Wallet back to your main account using the withdrawal option.',
      },
      {
        question: 'What is Spend + Save?',
        answer:
          'Spend + Save allows an eligible successful transfer to automatically move your configured savings amount into Save Wallet.',
      },
      {
        question: 'Will a failed transfer trigger Spend + Save?',
        answer:
          'No. Spend + Save is designed to apply only when the eligible transfer is successfully completed.',
      },
    ],
  },
  {
    id: 'cards',
    title: 'Cards',
    description: 'Information about ZENIMONIES card services.',
    icon: '💳',
    faqs: [
      {
        question: 'Where can I find my card information?',
        answer:
          'When card services are available for your account, the relevant card information will be displayed in the Cards section of the app.',
      },
      {
        question: 'What should I do if I suspect unauthorized card activity?',
        answer:
          'Secure your account immediately and contact ZENIMONIES Support through the Help Center. Do not share your PIN, password, OTP or other security credentials.',
      },
      {
        question: 'Can I use my ZENIMONIES card for online payments?',
        answer:
          'Card functionality depends on the card product and services available to your account. Check the Cards section for the services currently enabled.',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business Banking',
    description: 'Help for ZENIMONIES business customers and POS services.',
    icon: '🏢',
    faqs: [
      {
        question: 'How do I open a business account?',
        answer:
          'Use the Business Banking section of ZENIMONIES and complete the business registration and verification process applicable to your account.',
      },
      {
        question: 'Do I need CAC documents immediately?',
        answer:
          'CAC documentation is required when upgrading a business account to the applicable Level 4 verification stage. It is not required for initial business registration or Levels 1–3 under the current ZENIMONIES business verification flow.',
      },
      {
        question: 'Can I access my business dashboard before POS approval?',
        answer:
          'Yes. Business account access and POS approval are separate processes. A business customer can access the business dashboard without waiting for POS approval.',
      },
      {
        question: 'What is the business POS?',
        answer:
          'The ZENIMONIES business POS service is intended to provide businesses with payment acceptance functionality. POS application and approval are handled separately from the business account.',
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Protect your account and financial information.',
    icon: '🔐',
    faqs: [
      {
        question: 'What should I do if my account is locked?',
        answer:
          'Use the account recovery options available in the app or contact ZENIMONIES Support if you cannot regain access.',
      },
      {
        question: 'What should I do if I lose my phone?',
        answer:
          'Contact ZENIMONIES Support as soon as possible and secure access to your account. Never share your password, transaction PIN, OTP or passkey with anyone.',
      },
      {
        question: 'What should I do if I see a transaction I did not make?',
        answer:
          'Report the transaction immediately through the Help Center and contact ZENIMONIES Support. Do not attempt to make another transaction while investigating the issue.',
      },
      {
        question: 'Will ZENIMONIES ask for my password or transaction PIN?',
        answer:
          'Do not disclose your password, transaction PIN, OTP or passkey to another person. If someone asks for these credentials claiming to represent ZENIMONIES, treat the request as suspicious and contact official support.',
      },
    ],
  },
  {
    id: 'kyc',
    title: 'KYC & Verification',
    description: 'Understand identity verification and account levels.',
    icon: '🪪',
    faqs: [
      {
        question: 'What is KYC?',
        answer:
          'KYC means Know Your Customer. It is the identity verification process used to confirm customer information and support secure financial services.',
      },
      {
        question: 'Why is my KYC still pending?',
        answer:
          'Verification may remain pending while the submitted information is being reviewed or processed by the verification service.',
      },
      {
        question: 'Why was my KYC rejected?',
        answer:
          'A verification submission may be rejected if the submitted information or documents cannot be successfully verified. Check the reason displayed in your account and follow the instructions provided.',
      },
      {
        question: 'Do I need facial verification?',
        answer:
          'ZENIMONIES may require facial or liveness verification as part of the applicable identity verification process.',
      },
    ],
  },
];

const categoryLabels: Record<CategoryId, string> = {
  'getting-started': 'Getting Started',
  transfers: 'Transfers & Transactions',
  bills: 'Bills & Payments',
  wallet: 'Wallet & Savings',
  cards: 'Cards',
  business: 'Business Banking',
  security: 'Security',
  kyc: 'KYC & Verification',
};

const HelpCenter: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryId | 'all'>('all');
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categories
      .filter(
        (category) =>
          selectedCategory === 'all' || category.id === selectedCategory
      )
      .map((category) => {
        if (!normalizedSearch) {
          return category;
        }

        const matchingFaqs = category.faqs.filter((faq) => {
          return (
            faq.question.toLowerCase().includes(normalizedSearch) ||
            faq.answer.toLowerCase().includes(normalizedSearch)
          );
        });

        const categoryMatches =
          category.title.toLowerCase().includes(normalizedSearch) ||
          category.description.toLowerCase().includes(normalizedSearch);

        return {
          ...category,
          faqs: categoryMatches ? category.faqs : matchingFaqs,
        };
      })
      .filter((category) => category.faqs.length > 0);
  }, [search, selectedCategory]);

  const totalResults = filteredCategories.reduce(
    (total, category) => total + category.faqs.length,
    0
  );

  const openSupport = (type: string) => {
    navigate('/support', {
      state: {
        supportType: type,
      },
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={styles.backButton}
            aria-label="Go back"
          >
            ←
          </button>

          <div>
            <div style={styles.eyebrow}>ZENIMONIES</div>
            <h1 style={styles.title}>Help Center</h1>
            <p style={styles.subtitle}>
              Find answers and get help with your ZENIMONIES account.
            </p>
          </div>
        </div>

        {/* Search */}
        <div style={styles.searchCard}>
          <div style={styles.searchIcon}>⌕</div>

          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setOpenQuestion(null);
            }}
            placeholder="Search for help..."
            style={styles.searchInput}
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={styles.clearButton}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Category filter */}
        <div style={styles.filterWrapper}>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setOpenQuestion(null);
            }}
            style={{
              ...styles.filterButton,
              ...(selectedCategory === 'all'
                ? styles.filterButtonActive
                : {}),
            }}
          >
            All
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setSelectedCategory(category.id);
                setOpenQuestion(null);
              }}
              style={{
                ...styles.filterButton,
                ...(selectedCategory === category.id
                  ? styles.filterButtonActive
                  : {}),
              }}
            >
              {category.title}
            </button>
          ))}
        </div>

        {/* Search result count */}
        {search.trim() && (
          <div style={styles.resultText}>
            {totalResults === 0
              ? 'No help articles found.'
              : `${totalResults} help ${
                  totalResults === 1 ? 'article' : 'articles'
                } found`}
          </div>
        )}

        {/* FAQ Categories */}
        <div style={styles.categories}>
          {filteredCategories.map((category) => (
            <section key={category.id} style={styles.categoryCard}>
              <div style={styles.categoryHeader}>
                <div style={styles.categoryIcon}>{category.icon}</div>

                <div style={styles.categoryHeading}>
                  <h2 style={styles.categoryTitle}>{category.title}</h2>
                  <p style={styles.categoryDescription}>
                    {category.description}
                  </p>
                </div>
              </div>

              <div style={styles.questions}>
                {category.faqs.map((faq, index) => {
                  const questionId = `${category.id}-${index}`;
                  const isOpen = openQuestion === questionId;

                  return (
                    <div
                      key={questionId}
                      style={{
                        ...styles.question,
                        ...(isOpen ? styles.questionOpen : {}),
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenQuestion(isOpen ? null : questionId)
                        }
                        style={styles.questionButton}
                      >
                        <span>{faq.question}</span>

                        <span
                          style={{
                            ...styles.chevron,
                            transform: isOpen
                              ? 'rotate(180deg)'
                              : 'rotate(0deg)',
                          }}
                        >
                         ⌄
                        </span>
                      </button>

                      {isOpen && (
                        <div style={styles.answer}>
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}

          {filteredCategories.length === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>?</div>
              <h2 style={styles.emptyTitle}>We couldn't find that</h2>
              <p style={styles.emptyText}>
                Try another search term or browse one of the help categories.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('all');
                }}
                style={styles.primaryButton}
              >
                Browse Help Center
              </button>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <section style={styles.supportSection}>
          <div style={styles.supportHeader}>
            <div style={styles.supportIcon}>💬</div>

            <div>
              <h2 style={styles.supportTitle}>Still need help?</h2>
              <p style={styles.supportText}>
                Our support options can help with account, transaction and
                security issues.
              </p>
            </div>
          </div>

          <div style={styles.supportGrid}>
            <button
              type="button"
              onClick={() => openSupport('general')}
              style={styles.supportCard}
            >
              <span style={styles.supportCardIcon}>💬</span>
              <span style={styles.supportCardTitle}>Contact Support</span>
              <span style={styles.supportCardText}>
                Get help with your account or services.
              </span>
            </button>

            <button
              type="button"
              onClick={() => openSupport('transaction')}
              style={styles.supportCard}
            >
              <span style={styles.supportCardIcon}>🧾</span>
              <span style={styles.supportCardTitle}>
                Report a Transaction
              </span>
              <span style={styles.supportCardText}>
                Report a problem with a payment or transfer.
              </span>
            </button>

            <button
              type="button"
              onClick={() => openSupport('security')}
              style={styles.supportCard}
            >
              <span style={styles.supportCardIcon}>🔐</span>
              <span style={styles.supportCardTitle}>
                Suspicious Activity
              </span>
              <span style={styles.supportCardText}>
                Report activity you do not recognize.
              </span>
            </button>

            <button
              type="button"
              onClick={() => openSupport('account-access')}
              style={styles.supportCard}
            >
              <span style={styles.supportCardIcon}>🔑</span>
              <span style={styles.supportCardTitle}>
                Account Access
              </span>
              <span style={styles.supportCardText}>
                Get help if you cannot access your account.
              </span>
            </button>
          </div>
        </section>

        <div style={styles.footer}>
          <div style={styles.footerLogo}>ZENIMONIES</div>
          <div style={styles.footerText}>
            Secure banking made simple.
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f6faf8',
    color: '#14251d',
    padding: '20px 16px 50px',
    boxSizing: 'border-box',
  },

  container: {
    width: '100%',
    maxWidth: 980,
    margin: '0 auto',
  },

  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    border: '1px solid #dcebe3',
    background: '#ffffff',
    color: '#176b45',
    fontSize: 25,
    lineHeight: 1,
    cursor: 'pointer',
    flexShrink: 0,
  },

  eyebrow: {
    color: '#15935c',
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.3,
    marginBottom: 4,
  },

  title: {
    margin: 0,
    fontSize: 'clamp(27px, 5vw, 38px)',
    lineHeight: 1.12,
    fontWeight: 800,
    letterSpacing: -0.8,
  },

  subtitle: {
    margin: '8px 0 0',
    color: '#66756e',
    fontSize: 15,
    lineHeight: 1.5,
  },

  searchCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#ffffff',
    border: '1px solid #dfece5',
    borderRadius: 16,
    padding: '5px 8px 5px 15px',
    boxShadow: '0 5px 20px rgba(26, 93, 61, 0.05)',
    marginBottom: 14,
  },

  searchIcon: {
    color: '#15935c',
    fontSize: 29,
    lineHeight: 1,
    transform: 'rotate(-20deg)',
  },

  searchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontSize: 16,
    color: '#14251d',
    padding: '12px 0',
  },

  clearButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: 'none',
    background: '#edf7f1',
    color: '#176b45',
    fontSize: 22,
    cursor: 'pointer',
    flexShrink: 0,
  },

  filterWrapper: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    paddingBottom: 8,
    marginBottom: 8,
    scrollbarWidth: 'none',
  },

  filterButton: {
    border: '1px solid #d9e9e1',
    background: '#ffffff',
    color: '#53645c',
    borderRadius: 999,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },

  filterButtonActive: {
    background: '#15935c',
    borderColor: '#15935c',
    color: '#ffffff',
  },

  resultText: {
    color: '#6b7a73',
    fontSize: 13,
    margin: '7px 2px 14px',
  },

  categories: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },

  categoryCard: {
    background: '#ffffff',
    border: '1px solid #e0ece6',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 4px 18px rgba(24, 91, 61, 0.045)',
  },

  categoryHeader: {
    display: 'flex',
    gap: 13,
    alignItems: 'center',
    padding: 17,
    borderBottom: '1px solid #edf3ef',
  },

  categoryIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    background: '#edf8f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 23,
    flexShrink: 0,
  },

  categoryHeading: {
    minWidth: 0,
  },

  categoryTitle: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: '#172c22',
  },

  categoryDescription: {
    margin: '3px 0 0',
    color: '#718079',
    fontSize: 13,
    lineHeight: 1.4,
  },

  questions: {
    display: 'flex',
    flexDirection: 'column',
  },

  question: {
    borderBottom: '1px solid #edf3ef',
  },

  questionOpen: {
    background: '#fbfefc',
  },

  questionButton: {
    width: '100%',
    border: 'none',
    background: 'transparent',
    padding: '16px 17px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    textAlign: 'left',
    color: '#1c3027',
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 1.45,
    cursor: 'pointer',
  },

  chevron: {
    color: '#15935c',
    fontSize: 20,
    transition: 'transform 0.2s ease',
    flexShrink: 0,
  },

  answer: {
    padding: '0 17px 17px',
    color: '#697870',
    fontSize: 14,
    lineHeight: 1.65,
  },

  emptyState: {
    background: '#ffffff',
    border: '1px solid #e0ece6',
    borderRadius: 18,
    padding: '42px 22px',
    textAlign: 'center',
  },

  emptyIcon: {
    width: 52,
    height: 52,
    margin: '0 auto 14px',
    borderRadius: 16,
    background: '#edf8f2',
    color: '#15935c',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 25,
    fontWeight: 800,
  },

  emptyTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
  },

  emptyText: {
    margin: '8px auto 18px',
    maxWidth: 420,
    color: '#718079',
    fontSize: 14,
    lineHeight: 1.5,
  },

  primaryButton: {
    border: 'none',
    borderRadius: 12,
    background: '#15935c',
    color: '#ffffff',
    padding: '11px 18px',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },

  supportSection: {
    marginTop: 18,
    background: '#0f7f4e',
    borderRadius: 20,
    padding: 18,
    color: '#ffffff',
  },

  supportHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 13,
    marginBottom: 16,
  },

  supportIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    background: 'rgba(255,255,255,0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 21,
    flexShrink: 0,
  },

  supportTitle: {
    margin: 0,
    fontSize: 19,
    fontWeight: 800,
  },

  supportText: {
    margin: '4px 0 0',
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 1.5,
  },

  supportGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: 9,
  },

  supportCard: {
    border: '1px solid rgba(255,255,255,0.16)',
    background: 'rgba(255,255,255,0.09)',
    borderRadius: 14,
    padding: 14,
    textAlign: 'left',
    cursor: 'pointer',
    color: '#ffffff',
  },

  supportCardIcon: {
    display: 'block',
    fontSize: 20,
    marginBottom: 8,
  },

  supportCardTitle: {
    display: 'block',
    fontSize: 14,
    fontWeight: 800,
    marginBottom: 4,
  },

  supportCardText: {
    display: 'block',
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    lineHeight: 1.45,
  },

  footer: {
    textAlign: 'center',
    padding: '26px 0 0',
  },

  footerLogo: {
    color: '#15935c',
    fontWeight: 900,
    letterSpacing: 1,
    fontSize: 13,
  },

  footerText: {
    color: '#89968f',
    fontSize: 12,
    marginTop: 4,
  },
};

export default HelpCenter;
