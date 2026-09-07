import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface User {
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface Account {
  account_number?: string;
  account_name?: string;
  balance?: number;
  currency?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  let user: User | null = null;
  let accounts: Account[] = [];

  try {
    user = JSON.parse(
      localStorage.getItem('zenimonies_user') || 'null'
    );

    accounts = JSON.parse(
      localStorage.getItem('zenimonies_accounts') || '[]'
    );
  } catch {
    user = null;
    accounts = [];
  }

  const account = accounts[0];

  const formatCurrency = (
    amount: number,
    currency = 'NGN'
  ) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  const logout = () => {
    localStorage.removeItem('zenimonies_token');
    localStorage.removeItem('token');
    localStorage.removeItem('zenimonies_user');
    localStorage.removeItem('zenimonies_accounts');

    navigate('/login');
  };

  const displayName =
    user?.full_name ||
    `${user?.first_name || ''} ${
      user?.last_name || ''
    }`.trim() ||
    'Zenimonies User';

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
      }}
    >
      {/* Header */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #eaecf0',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '15px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: '#0b5cff',
              fontSize: '24px',
            }}
          >
            Zenimonies
          </h1>

          <span
            style={{
              color: '#667085',
              fontSize: '13px',
            }}
          >
            Digital Banking
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Link
            to="/profile"
            style={{
              textDecoration: 'none',
              color: '#172033',
              fontWeight: 600,
            }}
          >
            Profile
          </Link>

          <button
            type="button"
            onClick={logout}
            style={{
              border: '1px solid #d0d5dd',
              background: '#ffffff',
              borderRadius: '8px',
              padding: '9px 15px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '30px 24px',
        }}
      >
        {/* Welcome */}
        <section style={{ marginBottom: '25px' }}>
          <p
            style={{
              margin: 0,
              color: '#667085',
            }}
          >
            Welcome back,
          </p>

          <h2
            style={{
              margin: '5px 0 0',
              fontSize: '28px',
              color: '#172033',
            }}
          >
            {displayName}
          </h2>
        </section>

        {/* Balance */}
        <section
          style={{
            background:
              'linear-gradient(135deg, #0b5cff, #1747c7)',
            color: '#ffffff',
            borderRadius: '18px',
            padding: '28px',
            marginBottom: '25px',
            boxShadow:
              '0 10px 30px rgba(11, 92, 255, 0.20)',
          }}
        >
          <p
            style={{
              margin: 0,
              opacity: 0.85,
            }}
          >
            Available Balance
          </p>

          <h2
            style={{
              fontSize: '34px',
              margin: '8px 0 20px',
            }}
          >
            {formatCurrency(
              account?.balance || 0,
              account?.currency || 'NGN'
            )}
          </h2>

          <p
            style={{
              margin: 0,
              opacity: 0.9,
            }}
          >
            Account Number:{' '}
            <strong>
              {account?.account_number ||
                'Not available'}
            </strong>
          </p>
        </section>

        {/* Main Actions */}
        <section style={{ marginBottom: '30px' }}>
          <h3
            style={{
              marginBottom: '15px',
              color: '#172033',
            }}
          >
            Banking Services
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '15px',
            }}
          >
            <ServiceLink
              to="/transfer"
              title="Transfer"
              description="Send money to another bank"
            />

            <ServiceLink
              to="/deposit"
              title="Deposit"
              description="Fund your Zenimonies account"
            />

            <ServiceLink
              to="/withdraw"
              title="Withdraw"
              description="Withdraw money to your bank"
            />

            <ServiceLink
              to="/transactions"
              title="Transactions"
              description="View your account activity"
            />
          </div>
        </section>

        {/* Bills & Mobile Services */}
        <section style={{ marginBottom: '30px' }}>
          <h3
            style={{
              marginBottom: '15px',
              color: '#172033',
            }}
          >
            Bills & Mobile
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '15px',
            }}
          >
            <ServiceLink
              to="/airtime"
              title="Airtime"
              description="Buy airtime for any supported network"
            />

            <ServiceLink
              to="/data"
              title="Data"
              description="Buy mobile data bundles"
            />

            <ServiceLink
              to="/bills"
              title="Bills"
              description="Pay electricity, TV and other bills"
            />
          </div>
        </section>

        {/* Account */}
        <section>
          <h3
            style={{
              marginBottom: '15px',
              color: '#172033',
            }}
          >
            Account
          </h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '15px',
            }}
          >
            <ServiceLink
              to="/profile"
              title="Profile"
              description="View and manage your account"
            />
          </div>
        </section>
      </main>
    </div>
  );
};

interface ServiceLinkProps {
  to: string;
  title: string;
  description: string;
}

const ServiceLink: React.FC<ServiceLinkProps> = ({
  to,
  title,
  description,
}) => {
  return (
    <Link
      to={to}
      style={{
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #eaecf0',
          borderRadius: '14px',
          padding: '20px',
          minHeight: '110px',
          boxSizing: 'border-box',
          transition: 'box-shadow 0.2s ease',
        }}
      >
        <h4
          style={{
            margin: '0 0 8px',
            color: '#172033',
            fontSize: '17px',
          }}
        >
          {title}
        </h4>

        <p
          style={{
            margin: 0,
            color: '#667085',
            fontSize: '14px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      </div>
    </Link>
  );
};

export default Dashboard;
