import React from 'react';

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// APPLICATION ROUTES
// PERSONAL + BUSINESS BANKING
// ============================================================

// ==================== AUTHENTICATION ====================

import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import ForgotPassword from './pages/ForgotPassword.tsx';
import ResetPassword from './pages/ResetPassword.tsx';

// ==================== DASHBOARDS ====================

import Dashboard from './pages/Dashboard.tsx';
import BusinessDashboard from './pages/BusinessDashboard.tsx';
import Business from './pages/Business.tsx';

// ==================== ACCOUNT ====================

import Profile from './pages/Profile.tsx';
import Settings from './pages/Settings.tsx';
import KYC from './pages/KYC.tsx';
import VerifyPhone from './pages/VerifyPhone.tsx';
import VerifyOTP from './pages/VerifyOTP.tsx';

// ==================== SECURITY ====================

import PasskeySecurity from './pages/PasskeySecurity.tsx';
import AccountLocked from './pages/AccountLocked.tsx';

// ==================== MONEY ====================

import Transfer from './pages/Transfer.tsx';
import ToBank from './pages/ToBank.tsx';
import Deposit from './pages/Deposit.tsx';
import Withdraw from './pages/Withdraw.tsx';
import Transactions from './pages/Transactions.tsx';
import TransferConfirmation from './pages/TransferConfirmation.tsx';
import TransactionReceipt from './pages/TransactionReceipt.tsx';
import Statement from './pages/Statement.tsx';
import BusinessTransactions from './pages/BusinessTransactions.tsx';

// ==================== PAYMENTS ====================

import Airtime from './pages/Airtime.tsx';
import Data from './pages/Data.tsx';
import TVSubscription from './pages/TVSubscription.tsx';
import Bills from './pages/Bills.tsx';
import Electricity from './pages/Electricity.tsx';
import ElectricityVerification from './pages/ElectricityVerification.tsx';
import ElectricityPaymentConfirmation from './pages/ElectricityPaymentConfirmation.tsx';
import Betting from './pages/Betting.tsx';

// ==================== OTHER SERVICES ====================

import VirtualCard from './pages/VirtualCard.tsx';
import Savings from './pages/Savings.tsx';
import Notifications from './pages/Notifications.tsx';
import BusinessServicePage from './pages/BusinessServicePage.tsx';

// ==================== ADMIN ====================

import Admin from './pages/AdminDashboard.tsx';
import AirtimeReconciliation from './pages/AirtimeReconciliation.tsx';

// ==================== SESSION ====================

import SessionGuard from './components/SessionGuard.tsx';

// ==================== MATERIAL UI ====================

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';

// ============================================================
// GENERAL SERVICE PAGE
// USED BY PERSONAL BANKING
// ============================================================

interface ServicePageProps {
  title: string;
  description: string;
  icon: string;
}

const ServicePage: React.FC<ServicePageProps> = ({
  title,
  description,
  icon,
}) => {
  const location = useLocation();

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f6faf8',
        color: '#172b22',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        paddingBottom: '40px',
      }}
    >
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5ebe8',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            width: 'min(920px, 92%)',
            margin: '0 auto',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '11px',
                background:
                  'linear-gradient(135deg, #079447, #007a3f)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                fontWeight: 800,
              }}
            >
              Z
            </div>

            <div>
              <div
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#063b2d',
                }}
              >
                Zenimonies
              </div>

              <div
                style={{
                  fontSize: '9px',
                  letterSpacing: '1.5px',
                  color: '#98a2a0',
                }}
              >
                DIGITAL BANKING
              </div>
            </div>
          </Link>

          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#087c43',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            Home
          </Link>
        </div>
      </header>

      <main
        style={{
          width: 'min(700px, 92%)',
          margin: '0 auto',
          paddingTop: '28px',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            color: '#66756e',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '18px',
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5ebe8',
            borderRadius: '20px',
            padding: '26px',
            boxShadow:
              '0 8px 25px rgba(26, 61, 47, 0.05)',
          }}
        >
          <div
            style={{
              width: '58px',
              height: '58px',
              borderRadius: '17px',
              background: '#e8f8f0',
              color: '#087c43',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '27px',
              marginBottom: '17px',
            }}
          >
            {icon}
          </div>

          <h1
            style={{
              margin: '0 0 8px',
              fontSize: '26px',
              fontWeight: 800,
              color: '#063b2d',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              margin: '0 0 20px',
              color: '#66756e',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>

          <div
            style={{
              padding: '15px',
              borderRadius: '13px',
              background: '#effbf5',
              border: '1px solid #d2eee0',
              color: '#05603a',
              fontSize: '13px',
              lineHeight: 1.5,
            }}
          >
            This service is ready for the next setup
            stage.
          </div>

          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/"
              style={{
                textDecoration: 'none',
                background: '#079447',
                color: '#ffffff',
                padding: '11px 17px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              Back Home
            </Link>

            <button
              type="button"
              onClick={() => window.history.back()}
              style={{
                background: '#ffffff',
                border: '1px solid #d0d9d5',
                color: '#344054',
                padding: '11px 17px',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Go Back
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: '13px',
            color: '#98a2b3',
            fontSize: '11px',
            textAlign: 'center',
          }}
        >
          {location.pathname}
        </div>
      </main>
    </div>
  );
};

// ============================================================
// BUSINESS SERVICE PAGE
// BUSINESS-SPECIFIC NAVIGATION
// ============================================================

const BusinessServicePage: React.FC = () => {
  const navigate = useNavigate();

  const { id, section } = useParams<{
    id: string;
    section: string;
  }>();

  const businessId = id || '';

  const titles: Record<string, string> = {
    transfer: 'Business Transfer',
    transactions: 'Business Transactions',
    statements: 'Business Statements',
    airtime: 'Business Airtime',
    data: 'Business Data',
    electricity: 'Business Electricity',
    tv: 'Business TV Payments',
    savings: 'Business Savings',
    cards: 'Business Cards',
    staff: 'Business Staff & Access',
    settings: 'Business Settings',
    security: 'Business Security',
    notifications: 'Business Notifications',
    kyc: 'Business Verification',
    pos: 'POS Terminal',
    upgrade: 'Business Level Upgrade',
  };

  const descriptions: Record<string, string> = {
    transfer:
      'Manage payments from your business account. Business transfers require dedicated business payment functionality and server-side authorization.',
    transactions:
      'View activity belonging to your selected business account.',
    statements:
      'Business account statements and statement downloads.',
    airtime:
      'Purchase airtime using your business account when the business payment service is connected.',
    data:
      'Purchase data bundles using your business account when the business payment service is connected.',
    electricity:
      'Pay electricity bills from your business account when business bill payments are connected.',
    tv:
      'Manage TV subscription payments for your business.',
    savings:
      'Manage business savings services.',
    cards:
      'Manage business card services.',
    staff:
      'Manage business staff and access permissions.',
    settings:
      'Manage your business information and account preferences.',
    security:
      'Manage security settings and business access controls.',
    notifications:
      'Business banking notifications.',
    kyc:
      'View and manage applicable business verification requirements.',
    pos:
      'Manage business POS terminal applications and approved terminals.',
    upgrade:
      'Review the requirements for upgrading your business verification level.',
  };

  const normalizedSection = (
    section || ''
  ).toLowerCase();

  const title =
    titles[normalizedSection] ||
    'Business Service';

  const description =
    descriptions[normalizedSection] ||
    'This section belongs to your business account.';

  const dashboardPath =
    `/business/dashboard/${encodeURIComponent(businessId)}`;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F6FAF7',
        pb: 5,
      }}
    >
      {/* BUSINESS HEADER */}

      <Box
        sx={{
          bgcolor: '#087A43',
          color: '#fff',
          px: { xs: 2, md: 5 },
          py: 3,
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography
            variant="h5"
            fontWeight={800}
          >
            Zenimonies
          </Typography>

          <Typography
            sx={{
              mt: 1,
              color: '#D9F3E4',
            }}
          >
            Business Banking
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          maxWidth: 900,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          mt: 4,
        }}
      >
        <Button
          onClick={() => navigate(dashboardPath)}
          sx={{
            mb: 3,
            color: '#087A43',
            fontWeight: 700,
          }}
        >
          ← Back to Business Dashboard
        </Button>

        <Card
          sx={{
            borderRadius: 4,
            border: '1px solid #E1EEE5',
            boxShadow:
              '0 5px 25px rgba(0,0,0,0.05)',
          }}
        >
          <CardContent
            sx={{
              p: { xs: 3, md: 4 },
            }}
          >
            <Typography
              variant="h5"
              fontWeight={800}
              sx={{
                color: '#065F36',
                mb: 2,
              }}
            >
              {title}
            </Typography>

            <Alert
              severity="info"
              sx={{ mb: 3 }}
            >
              You are viewing the Business Banking
              section for business account ID:{' '}
              {businessId || 'Not provided'}.
            </Alert>

            <Typography
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              {description}
            </Typography>

            <Alert severity="warning">
              This service page is not yet connected
              to its dedicated business backend
              functionality. No transfer, bill payment,
              staff change, or other financial
              transaction can be completed from this
              placeholder page.
            </Alert>

            <Stack
              spacing={2}
              sx={{ mt: 3 }}
            >
              <Button
                fullWidth
                variant="contained"
                onClick={() => navigate(dashboardPath)}
                sx={{
                  py: 1.5,
                  bgcolor: '#087A43',
                  fontWeight: 700,
                  '&:hover': {
                    bgcolor: '#065F36',
                  },
                }}
              >
                Return to Business Dashboard
              </Button>

              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/')}
                sx={{
                  py: 1.5,
                  borderColor: '#087A43',
                  color: '#087A43',
                  fontWeight: 700,
                }}
              >
                Personal Banking
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

// ============================================================
// MAIN APPLICATION
// ============================================================

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <SessionGuard>
        <Routes>

          {/* ================= AUTHENTICATION ================= */}

          <Route
            path="/login"
            element={<Login />}
          />

          <Route
            path="/register"
            element={<Register />}
          />

          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />

          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* ================= SECURITY ================= */}

          <Route
            path="/passkey-security"
            element={<PasskeySecurity />}
          />

          <Route
            path="/account-locked"
            element={<AccountLocked />}
          />

          {/* ================= PERSONAL DASHBOARD ================= */}

          <Route
            path="/"
            element={<Dashboard />}
          />

          <Route
            path="/dashboard"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

          {/* ================= BUSINESS BANKING ================= */}

          <Route
            path="/business/dashboard/:id"
            element={<BusinessDashboard />}
          />
          <Route
             path="/business/:id/transactions"
             element={<BusinessTransactions />}
          />

          {/* Business services must remain under the selected
              business ID. Do not replace these with personal
              banking components. */}

          <Route
            path="/business/:id/:section"
            element={<BusinessServicePage />}
          />

          <Route
            path="/business/:id"
            element={
              <Navigate
                to="/business"
                replace
              />
            }
          />

          <Route
            path="/business"
            element={<Business />}
          />

          {/* ================= NOTIFICATIONS ================= */}

          <Route
            path="/notifications"
            element={<Notifications />}
          />

          {/* ================= ADMIN ================= */}

          <Route
            path="/admin"
            element={<Admin />}
          />

          <Route
            path="/airtime-reconciliation"
            element={<AirtimeReconciliation />}
          />

          {/* ================= ACCOUNT ================= */}

          <Route
            path="/profile"
            element={<Profile />}
          />

          <Route
            path="/settings"
            element={<Settings />}
          />

          <Route
            path="/kyc"
            element={<KYC />}
          />

          <Route
            path="/verify-phone"
            element={<VerifyPhone />}
          />

          <Route
            path="/verify-otp"
            element={<VerifyOTP />}
          />

          {/* ================= MONEY ================= */}

          <Route
            path="/transfer"
            element={<Transfer />}
          />

          <Route
            path="/to-bank"
            element={<ToBank />}
          />

          <Route
            path="/transfer-confirmation"
            element={<TransferConfirmation />}
          />

          <Route
            path="/deposit"
            element={<Deposit />}
          />

          <Route
            path="/withdraw"
            element={<Withdraw />}
          />

          <Route
            path="/transactions"
            element={<Transactions />}
          />

          <Route
            path="/transaction-receipt"
            element={<TransactionReceipt />}
          />

          <Route
            path="/statement"
            element={<Statement />}
          />

          {/* ================= WALLET ================= */}

          <Route
            path="/wallet"
            element={
              <ServicePage
                title="Wallet"
                icon="◈"
                description="Manage your Zenimonies wallet and available funds."
              />
            }
          />

          {/* ================= VIRTUAL CARD ================= */}

          <Route
            path="/virtual-card"
            element={<VirtualCard />}
          />

          {/* ================= AIRTIME ================= */}

          <Route
            path="/airtime"
            element={<Airtime />}
          />

          {/* ================= DATA ================= */}

          <Route
            path="/data"
            element={<Data />}
          />

          {/* ================= TV ================= */}

          <Route
            path="/tv-subscription"
            element={<TVSubscription />}
          />

          <Route
            path="/tv"
            element={<TVSubscription />}
          />

          {/* ================= BILLS ================= */}

          <Route
            path="/bills"
            element={<Bills />}
          />

          <Route
            path="/electricity"
            element={<Electricity />}
          />

          <Route
            path="/electricity/verification"
            element={<ElectricityVerification />}
          />

          <Route
            path="/electricity/payment-confirmation"
            element={<ElectricityPaymentConfirmation />}
          />

          {/* ================= BETTING ================= */}

          <Route
            path="/betting"
            element={<Betting />}
          />

          {/* ================= SAVINGS ================= */}

          <Route
            path="/safebox"
            element={
              <ServicePage
                title="SafeBox"
                icon="◉"
                description="Manage funds you want to keep separately from your available balance."
              />
            }
          />

          <Route
            path="/savings"
            element={<Savings />}
          />

          {/* ================= MORE ================= */}

          <Route
            path="/more"
            element={
              <ServicePage
                title="More Services"
                icon="••"
                description="Explore additional Zenimonies services and account features."
              />
            }
          />

          {/* ================= FALLBACK ================= */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </SessionGuard>
    </BrowserRouter>
  );
};

export default App;
