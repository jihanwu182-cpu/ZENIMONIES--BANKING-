import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const user = JSON.parse(
    localStorage.getItem('zenimonies_user') || 'null'
  );

  const accounts = JSON.parse(
    localStorage.getItem('zenimonies_accounts') || '[]'
  );

  const account = accounts[0];

  const formatCurrency = (amount: number, currency = 'NGN') => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  const logout = () => {
    localStorage.removeItem('zenimonies_token');
    localStorage.removeItem('zenimonies_user');
    localStorage.removeItem('zenimonies_accounts');

    window.location.href = '/login';
  };

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

        <button
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
            }}
          >
            {user?.full_name || 'Zenimonies User'}
          </h2>
        </section>

        {/* Balance */}
        <section
          style={{
            background: '#0b5cff',
            color: '#ffffff',
            borderRadius: '18px',
            padding: '28px',
            marginBottom: '25px',
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
              {account?.account_number || 'Not available'}
            </strong>
          </p>
        </section>

        {/* Quick Actions */}
        <section>
          <h3>Quick Services</h3>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '15px',
            }}
          >
            <Link to="/transfer">
              <ServiceCard
                title="Transfer"
                description="Send money to a bank account"
              />
            </Link>

            <Link to="/deposit">
              <ServiceCard
                title="Deposit"
                description="Fund your Zenimonies account"
              />
            </Link>

            <Link to="/withdraw">
              <ServiceCard
                title="Withdraw"
                description="Withdraw money from your account"
              />
            </Link>

            <Link to="/airtime">
              <ServiceCard
                title="Airtime"
                description="Buy mobile airtime"
              />
            </Link>

            <Link to="/data">
              <ServiceCard
                title="Data"
                description="Buy mobile data bundles"
              />
            </Link>

            <Link to="/bills">
              <ServiceCard
                title="Bills"
                description="Pay electricity, TV and other bills"
              />
            </Link>

            <Link to="/transactions">
              <ServiceCard
                title="Transactions"
                description="View your transaction history"
              />
            </Link>

            <Link to="/profile">
              <ServiceCard
                title="Profile"
                description="Manage your account"
              />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

interface ServiceCardProps {
  title: string;
  description: string;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  description,
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #eaecf0',
        borderRadius: '14px',
        padding: '20px',
        minHeight: '120px',
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
  );
};

export default Dashboard;
