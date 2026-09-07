import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'https://zenimonies-banking.onrender.com';

interface Transaction {
  id: string | number;
  type: string;
  amount: number;
  status: string;
  description?: string;
  created_at?: string;
  reference?: string;
}

const Transactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        setError('');

        const token = localStorage.getItem('zenimonies_token');

        const response = await axios.get(
          `${API_URL}/api/transactions`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.data?.success) {
          setTransactions(response.data.transactions || []);
        } else {
          setError(
            response.data?.message ||
              'Unable to load transactions.'
          );
        }
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            'Transaction history is not connected yet.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(Number(amount || 0));
  };

  const formatDate = (date?: string) => {
    if (!date) {
      return 'Date unavailable';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleString('en-NG');
  };

  const getStatusStyle = (status: string) => {
    const normalized = status.toLowerCase();

    if (
      normalized === 'successful' ||
      normalized === 'completed' ||
      normalized === 'success'
    ) {
      return {
        background: '#ecfdf3',
        color: '#027a48',
      };
    }

    if (
      normalized === 'pending' ||
      normalized === 'processing'
    ) {
      return {
        background: '#fffaeb',
        color: '#b54708',
      };
    }

    return {
      background: '#fee4e2',
      color: '#b42318',
    };
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f5f7fb',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '1000px',
          margin: '0 auto',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-block',
            marginBottom: '20px',
            color: '#0b5cff',
            fontWeight: 600,
          }}
        >
          ← Back to Dashboard
        </Link>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            padding: '30px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
          }}
        >
          <h1
            style={{
              marginTop: 0,
              marginBottom: '8px',
            }}
          >
            Transactions
          </h1>

          <p
            style={{
              color: '#667085',
              marginBottom: '28px',
            }}
          >
            View your account activity and transaction history.
          </p>

          {error && (
            <div
              style={{
                padding: '14px',
                marginBottom: '20px',
                borderRadius: '8px',
                background: '#fee4e2',
                color: '#b42318',
              }}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div
              style={{
                padding: '30px',
                textAlign: 'center',
                color: '#667085',
              }}
            >
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                border: '1px dashed #d0d5dd',
                borderRadius: '12px',
                color: '#667085',
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  color: '#172033',
                }}
              >
                No transactions yet
              </h3>

              <p style={{ marginBottom: 0 }}>
                Your deposits, withdrawals, transfers and
                payments will appear here.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {transactions.map((transaction) => {
                const statusStyle = getStatusStyle(
                  transaction.status
                );

                return (
                  <div
                    key={transaction.id}
                    style={{
                      border: '1px solid #eaecf0',
                      borderRadius: '12px',
                      padding: '18px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '16px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <strong
                          style={{
                            display: 'block',
                            marginBottom: '6px',
                          }}
                        >
                          {transaction.description ||
                            transaction.type ||
                            'Transaction'}
                        </strong>

                        <span
                          style={{
                            color: '#667085',
                            fontSize: '13px',
                          }}
                        >
                          {formatDate(transaction.created_at)}
                        </span>

                        {transaction.reference && (
                          <span
                            style={{
                              display: 'block',
                              marginTop: '5px',
                              color: '#667085',
                              fontSize: '12px',
                            }}
                          >
                            Ref: {transaction.reference}
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          textAlign: 'right',
                        }}
                      >
                        <strong
                          style={{
                            display: 'block',
                            marginBottom: '8px',
                          }}
                        >
                          {formatAmount(transaction.amount)}
                        </strong>

                        <span
                          style={{
                            ...statusStyle,
                            display: 'inline-block',
                            padding: '5px 9px',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {transaction.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
