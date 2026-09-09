import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from 'react-router-dom';

import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Profile from './pages/Profile.tsx';
import KYC from './pages/KYC.tsx';
import VerifyPhone from './pages/VerifyPhone.tsx';

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
        background: '#f5f7fb',
        color: '#172033',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* HEADER */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #eaecf0',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            padding: '14px 20px',
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
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background:
                  'linear-gradient(135deg, #008f62, #006b4a)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '21px',
                fontWeight: 800,
              }}
            >
              Z
            </div>

            <div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#063b2d',
                }}
              >
                Zenimonies
              </div>

              <div
                style={{
                  fontSize: '10px',
                  letterSpacing: '1px',
                  color: '#98a2b3',
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
              color: '#008f62',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            Home
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '40px 20px 100px',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            textDecoration: 'none',
            color: '#667085',
            fontSize: '14px',
            fontWeight: 600,
            marginBottom: '25px',
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #eaecf0',
            borderRadius: '22px',
            padding: '35px',
            boxShadow:
              '0 10px 30px rgba(16, 24, 40, 0.05)',
          }}
        >
          <div
            style={{
              width: '70px',
              height: '70px',
              borderRadius: '20px',
              background: '#e7f8f1',
              color: '#008f62',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              marginBottom: '22px',
            }}
          >
            {icon}
          </div>

          <h1
            style={{
              margin: '0 0 10px',
              fontSize: '30px',
              color: '#063b2d',
            }}
          >
            {title}
          </h1>

          <p
            style={{
              margin: '0 0 25px',
              color: '#667085',
              fontSize: '16px',
              lineHeight: 1.6,
            }}
          >
            {description}
          </p>

          <div
            style={{
              padding: '18px',
              borderRadius: '14px',
              background: '#f0faf6',
              border: '1px solid #ccefe1',
              color: '#05603a',
              fontSize: '14px',
              lineHeight: 1.5,
            }}
          >
            This service is ready for the next setup stage.
          </div>

          <div
            style={{
              marginTop: '25px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/"
              style={{
                textDecoration: 'none',
                background: '#008f62',
                color: '#ffffff',
                padding: '12px 20px',
                borderRadius: '11px',
                fontWeight: 700,
              }}
            >
              Back Home
            </Link>

            <button
              type="button"
              onClick={() => window.history.back()}
              style={{
                background: '#ffffff',
                border: '1px solid #d0d5dd',
                color: '#344054',
                padding: '12px 20px',
                borderRadius: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Go Back
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: '15px',
            color: '#98a2b3',
            fontSize: '12px',
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
              icon="↗"
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
              description="Add funds to your Zenimonies account."
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
