import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';

interface Transaction {
  id: string | number;
  type: string;
  amount: number;
  currency?: string;
  reference?: string;
  description?: string;
  status: string;
  created_at?: string;

  recipient_name?: string;
  recipient_account?: string;
  recipient_bank?: string;

  sender_name?: string;
  sender_account?: string;

  balance_before?: number;
  balance_after?: number;
}

const TransactionReceipt: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const transaction =
    location.state?.transaction as
      | Transaction
      | undefined;

  if (!transaction) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f5f7f6',
          py: 5,
        }}
      >
        <Container maxWidth="sm">
          <Card
            sx={{
              borderRadius: 3,
              textAlign: 'center',
              boxShadow:
                '0 8px 30px rgba(0,0,0,0.08)',
            }}
          >
            <CardContent sx={{ py: 6 }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 800,
                  color: '#063b2d',
                  mb: 1,
                }}
              >
                Receipt unavailable
              </Typography>

              <Typography
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                We could not find the transaction
                details for this receipt.
              </Typography>

              <Button
                variant="contained"
                onClick={() =>
                  navigate('/transactions')
                }
                sx={{
                  backgroundColor: '#087a4b',
                  borderRadius: 2,
                  fontWeight: 700,
                  '&:hover': {
                    backgroundColor: '#06663e',
                  },
                }}
              >
                Back to Transactions
              </Button>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  const formatAmount = (
    amount: number,
    currency?: string
  ) => {
    const value = Number(amount || 0);

    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) {
      return 'Date unavailable';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleString('en-NG', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  };

  const status =
    String(transaction.status || '')
      .toLowerCase();

  const isCompleted =
    status === 'completed' ||
    status === 'success' ||
    status === 'successful';

  const isFailed =
    status === 'failed' ||
    status === 'cancelled' ||
    status === 'canceled';

  const statusLabel = isCompleted
    ? 'Completed'
    : isFailed
    ? 'Failed'
    : 'Processing';

  const statusBackground = isCompleted
    ? '#e7f7ef'
    : isFailed
    ? '#fdeaea'
    : '#fff6df';

  const statusText = isCompleted
    ? '#087a4b'
    : isFailed
    ? '#c62828'
    : '#9a6700';

  const transactionType =
    String(transaction.type || 'Transaction')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareText = [
      'ZENIMONIES TRANSACTION RECEIPT',
      '',
      `Transaction: ${transactionType}`,
      `Amount: ${formatAmount(
        transaction.amount,
        transaction.currency
      )}`,
      `Status: ${statusLabel}`,
      transaction.reference
        ? `Reference: ${transaction.reference}`
        : '',
      transaction.description
        ? `Description: ${transaction.description}`
        : '',
      `Date: ${formatDate(
        transaction.created_at
      )}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      if (
        navigator.share &&
        typeof navigator.share === 'function'
      ) {
        await navigator.share({
          title: 'Zenimonies Transaction Receipt',
          text: shareText,
        });
        return;
      }

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          'function'
      ) {
        await navigator.clipboard.writeText(
          shareText
        );

        window.alert(
          'Receipt details copied. You can now paste them into WhatsApp, Messages, Email or another app.'
        );

        return;
      }

      window.alert(
        'Sharing is not supported on this device.'
      );
    } catch (error) {
      console.log(
        'Receipt sharing cancelled or failed:',
        error
      );
    }
  };

  const showBankDetails =
    Boolean(
      transaction.recipient_name ||
        transaction.recipient_account ||
        transaction.recipient_bank
    );

  const showBalanceDetails =
    transaction.balance_before !== undefined ||
    transaction.balance_after !== undefined;

  return (
    <Box
      className="receipt-page"
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f7f6',
        py: 3,
        pb: 6,
      }}
    >
      <Container maxWidth="sm">
        {/* TOP ACTIONS */}

        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{
            mb: 2,
          }}
        >
          <Button
            onClick={() =>
              navigate('/transactions')
            }
            sx={{
              color: '#087a4b',
              fontWeight: 700,
              px: 0,
            }}
          >
            ← Transactions
          </Button>

          <Typography
            sx={{
              fontSize: 13,
              color: '#66756e',
              fontWeight: 600,
            }}
          >
            Receipt
          </Typography>
        </Stack>

        {/* RECEIPT */}

        <Card
          className="receipt-card"
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow:
              '0 10px 35px rgba(0,0,0,0.09)',
          }}
        >
          {/* BRAND */}

          <Box
            sx={{
              backgroundColor: '#087a4b',
              color: '#ffffff',
              px: 3,
              py: 3,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 58,
                height: 58,
                borderRadius: '50%',
                backgroundColor:
                  'rgba(255,255,255,0.16)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                fontSize: 27,
                fontWeight: 900,
              }}
            >
              Z
            </Box>

            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                letterSpacing: 0.3,
              }}
            >
              Zenimonies
            </Typography>

            <Typography
              sx={{
                mt: 0.5,
                fontSize: 11,
                letterSpacing: 2,
                opacity: 0.9,
              }}
            >
              DIGITAL BANKING
            </Typography>
          </Box>

          <CardContent sx={{ p: 3 }}>
            {/* SUCCESS ICON */}

            <Box
              sx={{
                textAlign: 'center',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 66,
                  height: 66,
                  borderRadius: '50%',
                  backgroundColor:
                    statusBackground,
                  color: statusText,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontSize: 32,
                  fontWeight: 900,
                }}
              >
                {isCompleted
                  ? '✓'
                  : isFailed
                  ? '!'
                  : '…'}
              </Box>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                }}
              >
                {statusLabel}
              </Typography>

              <Chip
                label={statusLabel}
                size="small"
                sx={{
                  mt: 1,
                  backgroundColor:
                    statusBackground,
                  color: statusText,
                  fontWeight: 700,
                }}
              />
            </Box>

            {/* AMOUNT */}

            <Box
              sx={{
                textAlign: 'center',
                mb: 3,
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
              >
                Transaction Amount
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 32,
                  fontWeight: 900,
                  color: '#063b2d',
                }}
              >
                {formatAmount(
                  transaction.amount,
                  transaction.currency
                )}
              </Typography>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* TRANSACTION DETAILS */}

            <Stack spacing={2}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Transaction Type
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 700,
                    mt: 0.3,
                  }}
                >
                  {transactionType}
                </Typography>
              </Box>

              {transaction.description && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Description
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 600,
                      mt: 0.3,
                    }}
                  >
                    {transaction.description}
                  </Typography>
                </Box>
              )}

              {transaction.reference && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    Transaction Reference
                  </Typography>

                  <Typography
                    sx={{
                      fontWeight: 700,
                      mt: 0.3,
                      wordBreak: 'break-all',
                      fontSize: 13,
                    }}
                  >
                    {transaction.reference}
                  </Typography>
                </Box>
              )}

              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Date & Time
                </Typography>

                <Typography
                  sx={{
                    fontWeight: 600,
                    mt: 0.3,
                  }}
                >
                  {formatDate(
                    transaction.created_at
                  )}
                </Typography>
              </Box>
            </Stack>

            {/* BANK / RECIPIENT */}

            {showBankDetails && (
              <>
                <Divider sx={{ my: 2.5 }} />

                <Typography
                  sx={{
                    fontWeight: 800,
                    color: '#063b2d',
                    mb: 1.5,
                  }}
                >
                  Recipient Details
                </Typography>

                <Stack spacing={1.7}>
                  {transaction.recipient_name && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Recipient
                      </Typography>

                      <Typography
                        sx={{
                          fontWeight: 700,
                          mt: 0.3,
                        }}
                      >
                        {
                          transaction.recipient_name
                        }
                      </Typography>
                    </Box>
                  )}

                  {transaction.recipient_bank && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Bank
                      </Typography>

                      <Typography
                        sx={{
                          fontWeight: 600,
                          mt: 0.3,
                        }}
                      >
                        {
                          transaction.recipient_bank
                        }
                      </Typography>
                    </Box>
                  )}

                  {transaction.recipient_account && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Account Number
                      </Typography>

                      <Typography
                        sx={{
                          fontWeight: 600,
                          mt: 0.3,
                        }}
                      >
                        {
                          transaction.recipient_account
                        }
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </>
            )}

            {/* BALANCE */}

            {showBalanceDetails && (
              <>
                <Divider sx={{ my: 2.5 }} />

                <Typography
                  sx={{
                    fontWeight: 800,
                    color: '#063b2d',
                    mb: 1.5,
                  }}
                >
                  Account Balance
                </Typography>

                <Stack spacing={1.7}>
                  {transaction.balance_before !==
                    undefined && (
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography
                        color="text.secondary"
                      >
                        Balance Before
                      </Typography>

                      <Typography
                        sx={{ fontWeight: 700 }}
                      >
                        {formatAmount(
                          transaction.balance_before,
                          transaction.currency
                        )}
                      </Typography>
                    </Stack>
                  )}

                  {transaction.balance_after !==
                    undefined && (
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                    >
                      <Typography
                        color="text.secondary"
                      >
                        Balance After
                      </Typography>

                      <Typography
                        sx={{
                          fontWeight: 800,
                          color: '#087a4b',
                        }}
                      >
                        {formatAmount(
                          transaction.balance_after,
                          transaction.currency
                        )}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              </>
            )}

            <Divider sx={{ my: 2.5 }} />

            {/* SECURITY */}

            <Box
              sx={{
                backgroundColor: '#f5f7f6',
                borderRadius: 2,
                p: 2,
                textAlign: 'center',
              }}
            >
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#344054',
                }}
              >
                Zenimonies Transaction Receipt
              </Typography>

              <Typography
                sx={{
                  fontSize: 11,
                  color: '#66756e',
                  mt: 0.5,
                  lineHeight: 1.5,
                }}
              >
                Keep this receipt for your
                records. The transaction reference
                can be used when contacting
                Zenimonies support.
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* ACTION BUTTONS */}

        <Stack
          spacing={1.5}
          sx={{
            mt: 2,
          }}
          className="receipt-actions"
        >
          <Button
            fullWidth
            variant="contained"
            onClick={handlePrint}
            sx={{
              backgroundColor: '#087a4b',
              borderRadius: 2,
              py: 1.4,
              fontWeight: 800,
              '&:hover': {
                backgroundColor: '#06663e',
              },
            }}
          >
            Download / Save Receipt
          </Button>

          <Button
            fullWidth
            variant="outlined"
            onClick={handleShare}
            sx={{
              borderColor: '#087a4b',
              color: '#087a4b',
              borderRadius: 2,
              py: 1.4,
              fontWeight: 800,
              '&:hover': {
                borderColor: '#06663e',
                backgroundColor: '#eaf7f0',
              },
            }}
          >
            Share Receipt
          </Button>

          <Button
            fullWidth
            variant="text"
            onClick={() =>
              navigate('/transactions')
            }
            sx={{
              color: '#66756e',
              fontWeight: 700,
            }}
          >
            Back to Transaction History
          </Button>
        </Stack>
      </Container>

      {/* PRINT STYLES */}

      <style>
        {`
          @media print {
            body {
              background: #ffffff !important;
              margin: 0 !important;
            }

            .receipt-page {
              background: #ffffff !important;
              padding: 0 !important;
              min-height: auto !important;
            }

            .receipt-card {
              box-shadow: none !important;
              border: 1px solid #dddddd !important;
            }

            .receipt-actions {
              display: none !important;
            }

            @page {
              size: A4;
              margin: 12mm;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default TransactionReceipt;
