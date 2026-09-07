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
import Transfer from './pages/Transfer.tsx';
import Deposit from './pages/Deposit.tsx';
import Withdraw from './pages/Withdraw.tsx';
import Transactions from './pages/Transactions.tsx';
import Airtime from './pages/Airtime.tsx';
import Data from './pages/Data.tsx';
import Bills from './pages/Bills.tsx';
import Profile from './pages/Profile.tsx';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Dashboard />} />

        <Route path="/transfer" element={<Transfer />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/withdraw" element={<Withdraw />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/airtime" element={<Airtime />} />
        <Route path="/data" element={<Data />} />
        <Route path="/bills" element={<Bills />} />
        <Route path="/profile" element={<Profile />} />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
