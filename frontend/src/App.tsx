import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Profile from './pages/Profile.tsx';
import KYC from './pages/KYC.tsx';
import VerifyPhone from './pages/VerifyPhone.tsx';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* =====================================================
            AUTHENTICATION
        ===================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* =====================================================
            MAIN DASHBOARD
        ===================================================== */}

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


        {/* =====================================================
            ACCOUNT
        ===================================================== */}

        <Route
          path="/profile"
          element={<Profile />}
        />


        {/* =====================================================
            VERIFICATION
        ===================================================== */}

        <Route
          path="/kyc"
          element={<KYC />}
        />

        <Route
          path="/verify-phone"
          element={<VerifyPhone />}
        />


        {/* =====================================================
            FALLBACK
        ===================================================== */}

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
