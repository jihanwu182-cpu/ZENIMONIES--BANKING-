import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';

const Dashboard: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f7fb',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          padding: '40px',
          borderRadius: '16px',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
        }}
      >
        <h1>Welcome to Zenimonies</h1>
        <p>Your digital banking dashboard is coming next.</p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Dashboard />} />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
