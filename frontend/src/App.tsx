import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Dashboard from './pages/Dashboard';
import Airtime from './pages/Airtime';
import Bills from './pages/Bills';
import Data from './pages/Data';
import Deposit from './pages/Deposit';
import KYC from './pages/KYC';
import Profile from './pages/Profile';
import Transactions from './pages/Transactions';
import Transfer from './pages/Transfer';
import VerifyPhone from './pages/VerifyPhone';
import Withdraw from './pages/Withdraw';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Dashboard />} />
        <Route
          path="/dashboard"
          element={<Navigate to="/" replace />}
        />

        <Route path="/airtime" element={<Airtime />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/data" element={<Data />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/kyc" element={<KYC />} />
        <Route path="/profile" element={<Profile />} />
        <Route
          path="/transactions"
          element={<Transactions />}
        />
        <Route path="/transfer" element={<Transfer />} />
        <Route
          path="/verify-phone"
          element={<VerifyPhone />}
        />
        <Route path="/withdraw" element={<Withdraw />} />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
};

export default App;
