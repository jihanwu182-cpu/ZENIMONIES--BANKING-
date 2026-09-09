import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import KYC from './pages/KYC';
import VerifyPhone from './pages/VerifyPhone';
import VerifyOTP from './pages/VerifyOTP';
import Transfer from './pages/Transfer';
import ToBank from './pages/ToBank';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Transactions from './pages/Transactions';
import Airtime from './pages/Airtime';
import Data from './pages/Data';
import Bills from './pages/Bills';

/* ============================================================
   SIMPLE SERVICE PAGE
   ============================================================ */

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
      {/* ================= HEADER ================= */}

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

      {/* ================= CONTENT ================= */}

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
          {/* ICON */}

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

          {/* TITLE */}

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

          {/* DESCRIPTION */}

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

          {/* STATUS */}

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

          {/* ACTIONS */}

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

/* ============================================================
   APP
   ============================================================ */

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* ====================================================
            AUTHENTICATION
        ==================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        {/* ====================================================
            DASHBOARD
        ==================================================== */}

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

        {/* ====================================================
            ACCOUNT
        ==================================================== */}

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

        {/* ====================================================
            MONEY
        ==================================================== */}

        <Route
          path="/transfer"
          element={
            <ServicePage
              title="Send Money"
              icon="➤"
              description="Send money securely to another Zenimonies customer or to a bank account."
            />
          }
        />

        <Route
          path="/deposit"
          element={
            <ServicePage
              title="Add Money"
              icon="+"
              description="Add funds securely to your Zenimonies account."
            />
          }
        />

        <Route
          path="/withdraw"
          element={
            <ServicePage
              title="Withdraw"
              icon="↙"
              description="Withdraw funds from your Zenimonies account."
            />
          }
        />

        <Route
          path="/transactions"
          element={
            <ServicePage
              title="Transactions"
              icon="↕"
              description="View your account activity and transaction history."
            />
          }
        />

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

        {/* ====================================================
            AIRTIME & DATA
        ==================================================== */}

        <Route
          path="/airtime"
          element={
            <ServicePage
              title="Airtime"
              icon="▥"
              description="Purchase airtime for your mobile line."
            />
          }
        />

        <Route
          path="/data"
          element={
            <ServicePage
              title="Data"
              icon="⇅"
              description="Purchase mobile data bundles."
            />
          }
        />

        {/* ====================================================
            TV
        ==================================================== */}

        <Route
          path="/tv"
          element={
            <ServicePage
              title="TV"
              icon="▶"
              description="Manage and pay your supported television subscription."
            />
          }
        />

        {/* ====================================================
            BILL PAYMENT
        ==================================================== */}

        <Route
          path="/bills"
          element={
            <ServicePage
              title="Bill Payment"
              icon="▣"
              description="Pay supported utility and service bills from your Zenimonies account."
            />
          }
        />

        {/* ====================================================
            BETTING
        ==================================================== */}

        <Route
          path="/betting"
          element={
            <ServicePage
              title="Betting"
              icon="⚽"
              description="Access the betting service area."
            />
          }
        />

        {/* ====================================================
            SAFEBOX
        ==================================================== */}

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

        {/* ====================================================
            MORE
        ==================================================== */}

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

        {/* ====================================================
            FALLBACK
        ==================================================== */}

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
    </BrowserRouter>
  );
};

export default App;
