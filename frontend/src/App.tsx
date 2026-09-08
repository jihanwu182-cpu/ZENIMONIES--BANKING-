import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Portfolio from './pages/Portfolio';
import Trading from './pages/Trading';
import Market from './pages/Market';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import KYC from './pages/KYC';
import VerifyPhone from './pages/VerifyPhone';
import VerifyOTP from './pages/VerifyOTP';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Authentication */}

        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/verify-otp"
          element={<VerifyOTP />}
        />

        {/* Main application */}

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

        <Route
          path="/wallet"
          element={<Wallet />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        {/* Verification */}

        <Route
          path="/kyc"
          element={<KYC />}
        />

        <Route
          path="/verify-phone"
          element={<VerifyPhone />}
        />

        {/* Other pages */}

        <Route
          path="/portfolio"
          element={<Portfolio />}
        />

        <Route
          path="/trading"
          element={<Trading />}
        />

        <Route
          path="/market"
          element={<Market />}
        />

        {/* Fallback */}

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
