import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

const Dashboard = () => (
  <div>
    <h1>Zenimonies</h1>
    <p>Welcome to your banking dashboard.</p>
  </div>
);

const Login = () => (
  <div>
    <h1>Login</h1>
    <p>Zenimonies Login</p>
  </div>
);

const Register = () => (
  <div>
    <h1>Create your Zenimonies account</h1>
    <p>Registration</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
