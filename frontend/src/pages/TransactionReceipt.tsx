import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';

import {
  AccountBalanceRounded,
  ArrowBackRounded,
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  CalendarMonthRounded,
  CheckCircleRounded,
  ContentCopyRounded,
  DownloadRounded,
  ErrorRounded,
  PersonRounded,
  PhoneRounded,
  ReceiptLongRounded,
  ScheduleRounded,
  ShareRounded,
  TagRounded,
  VerifiedRounded,
} from '@mui/icons-material';

interface Transaction {
  id?: string;
  type?: string;
  transaction_type?: string;
  category?: string;
  description?: string;

  amount?: number | string;
  currency?: string;

  recipient_name?: string;
  recipient_phone?: string;
  recipient_account?: string;
  recipient_bank?: string;

  sender_name?: string;
  sender_account?: string;

  reference?: string;
  transaction_reference?: string;

  status?: string;

  transaction_fee?: number | string;
  fee?: number | string;

  balance_before?: number | string;
  balance_after?: number | string;

  created_at?: string;
  date?: string;
  timestamp?: string;
}

const TransactionReceipt: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const transaction =
    location.state?.transaction as
      | Transaction
      | undefined;

  if (!transaction) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#f4faf7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: 480,
            p: 4,
            borderRadius: 4,
            textAlign: 'center',
          }}
        >
          <ReceiptLongRounded
            sx={{
              fontSize: 56,
              color: '#087f5b',
              mb: 2,
            }}
          />

          <Typography
            variant="h5"
            fontWeight={800}
            color="#063b2b"
            gutterBottom
          >
            Receipt unavailable
          </Typography>

          <Typography
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            We could not find the transaction details for this receipt.
          </Typography>

          <Button
            variant="contained"
            startIcon={<ArrowBackRounded />}
            onClick={() => navigate('/transactions')}
            sx={{
              bgcolor: '#087f5b',
              borderRadius: 2.5,
              px: 3,
              py: 1.2,
              fontWeight: 700,
              '&:hover': {
                bgcolor: '#066b4c',
              },
            }}
          >
            Back to Transactions
          </Button>
        </Card>
      </Box>
    );
  }

  /* ============================================================
     HELPERS
  ============================================================ */

  const numericAmount =
    Number(transaction.amount || 0);

  const numericFee =
    Number(
      transaction.transaction_fee ??
        transaction.fee ??
        0
    );

  const currency = (
    transaction.currency ||
    'NGN'
  ).toUpperCase();

  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const reference =
    transaction.reference ||
    transaction.transaction_reference ||
    transaction.id ||
    'N/A';

  const transactionDate =
    transaction.created_at ||
    transaction.date ||
    transaction.timestamp;

  const formatDate = (value?: string) => {
    if (!value) {
      return 'N/A';
    }

    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const status = (
    transaction.status ||
    'successful'
  ).toLowerCase();

  const isSuccessful =
    status === 'successful' ||
    status === 'completed' ||
    status === 'success';

  const isFailed =
    status === 'failed' ||
    status === 'failure';

  const isPending =
    status === 'pending' ||
    status === 'processing';

  const isIncoming =
    transaction.category === 'credit' ||
    transaction.category === 'incoming' ||
    transaction.type
      ?.toLowerCase()
      .includes('received') ||
    transaction.description
      ?.toLowerCase()
      .includes('received');

  const transactionType =
    transaction.transaction_type ||
    transaction.type ||
    'Internal Transfer';

  const directionText = isIncoming
    ? 'Money received'
    : 'Money sent';

  const displayAmount = isIncoming
    ? `+${formatMoney(numericAmount)}`
    : `−${formatMoney(numericAmount)}`;

  const statusText = isSuccessful
    ? 'Successful'
    : isFailed
      ? 'Failed'
      : isPending
        ? 'Pending'
        : transaction.status ||
          'Successful';

  const statusColor = isSuccessful
    ? '#087f5b'
    : isFailed
      ? '#c62828'
      : '#b26a00';

  const statusBackground = isSuccessful
    ? '#dff7ec'
    : isFailed
      ? '#fde8e8'
      : '#fff3d6';

  /*
   * ==========================================================
   * REAL RECIPIENT DATA
   * ==========================================================
   *
   * These values come directly from the transaction object.
   *
   * recipient_phone:
   *     Actual phone number used to identify the recipient.
   *
   * recipient_account:
   *     Actual Zenimonies account number.
   *
   * We NEVER substitute one for the other.
   */

  const recipientPhone =
    transaction.recipient_phone || '';

  const recipientAccount =
    transaction.recipient_account || '';

  const recipientName =
    transaction.recipient_name || '';

  const recipientBank =
    transaction.recipient_bank ||
    'Zenimonies';

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(
        reference
      );

      alert(
        'Transaction reference copied'
      );
    } catch {
      alert(
        'Unable to copy reference'
      );
    }
  };

  const handleShare = async () => {
    const shareText = [
      'ZENIMONIES',
      'Transaction Receipt',
      '',
      `Type: ${transactionType}`,
      `Recipient: ${
        recipientName || 'N/A'
      }`,
      `Phone Number: ${
        recipientPhone || 'N/A'
      }`,
      `Zenimonies Account Number: ${
        recipientAccount || 'N/A'
      }`,
      `Bank: ${recipientBank}`,
      `Amount: ${formatMoney(
        numericAmount
      )}`,
      `Transaction Fee: ${formatMoney(
        numericFee
      )}`,
      `Reference: ${reference}`,
      `Date: ${formatDate(
        transactionDate
      )}`,
      `Status: ${statusText}`,
    ].join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title:
            'Zenimonies Transaction Receipt',
          text: shareText,
        });

        return;
      } catch {
        // User cancelled share.
      }
    }

    try {
      await navigator.clipboard.writeText(
        shareText
      );

      alert(
        'Receipt details copied'
      );
    } catch {
      alert(
        'Unable to share receipt'
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  /* ============================================================
     DETAIL ROW
  ============================================================ */

  const DetailRow = ({
    icon,
    label,
    value,
    valueNode,
  }: {
    icon?: React.ReactNode;
    label: string;
    value?: React.ReactNode;
    valueNode?: React.ReactNode;
  }) => (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'minmax(125px, 40%) 1fr',
          sm: '180px 1fr',
        },
        alignItems: 'center',
        minHeight: 44,
        py: 0.5,
        borderBottom:
          '1px solid #e4ebe8',
        '&:last-child': {
          borderBottom: 'none',
        },
      }}
    >
      <Stack
        direction="row"
        spacing={0.8}
        alignItems="center"
      >
        {icon && (
          <Box
            sx={{
              display: 'flex',
              color: '#6b7d76',
              '& svg': {
                fontSize: 18,
              },
            }}
          >
            {icon}
          </Box>
        )}

        <Typography
          sx={{
            color: '#687871',
            fontSize: {
              xs: 13,
              sm: 14,
            },
            fontWeight: 500,
          }}
        >
          {label}
        </Typography>
      </Stack>

      {valueNode || (
        <Typography
          sx={{
            color: '#10221c',
            fontSize: {
              xs: 13,
              sm: 14,
            },
            fontWeight: 650,
            wordBreak: 'break-word',
            textAlign: 'right',
          }}
        >
          {value || 'N/A'}
        </Typography>
      )}
    </Box>
  );

  /* ============================================================
     RECEIPT
  ============================================================ */

  return (
    <>
      <Box
        className="receipt-page"
        sx={{
          minHeight: '100vh',
          bgcolor: '#f3faf7',
          py: {
            xs: 2,
            sm: 4,
          },
          px: {
            xs: 1,
            sm: 2,
          },
        }}
      >
        <Box
          className="receipt-container"
          sx={{
            width: '100%',
            maxWidth: 760,
            mx: 'auto',
          }}
        >
          <Card
            className="receipt-card"
            elevation={0}
            sx={{
              overflow: 'hidden',
              borderRadius: {
                xs: 3,
                sm: 4,
              },
              border:
                '1px solid #dcebe4',
              boxShadow:
                '0 18px 55px rgba(7, 94, 66, 0.10)',
              bgcolor: '#ffffff',
            }}
          >
            {/* ==================================================
                GREEN BRAND HEADER
            ================================================== */}

            <Box
              className="receipt-header"
              sx={{
                position: 'relative',
                overflow: 'hidden',
                bgcolor: '#087f5b',
                background:
                  'linear-gradient(135deg, #087f5b 0%, #075b42 100%)',
                color: '#ffffff',
                px: {
                  xs: 2.5,
                  sm: 4,
                },
                py: {
                  xs: 2.5,
                  sm: 3,
                },
              }}
            >
              <Box
                className="print-decoration"
                sx={{
                  position: 'absolute',
                  width: 260,
                  height: 120,
                  right: -70,
                  bottom: -65,
                  borderRadius: '50%',
                  bgcolor:
                    'rgba(255,255,255,0.08)',
                }}
              />

              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={2}
                sx={{
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                >
                  <Box
                    className="brand-card"
                    sx={{
                      width: 58,
                      height: 38,
                      borderRadius: 1.8,
                      border:
                        '1px solid rgba(255,255,255,0.35)',
                      bgcolor:
                        'rgba(255,255,255,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: 'rotate(-8deg)',
                      boxShadow:
                        '0 5px 14px rgba(0,0,0,0.12)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 900,
                        fontSize: 24,
                        color: '#ffffff',
                        lineHeight: 1,
                      }}
                    >
                      Z
                    </Typography>

                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 6,
                        left: 7,
                        width: 13,
                        height: 8,
                        borderRadius: 0.5,
                        bgcolor:
                          'rgba(255,255,255,0.55)',
                      }}
                    />

                    <Box
                      sx={{
                        position: 'absolute',
                        right: 7,
                        bottom: 5,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        bgcolor:
                          'rgba(255,255,255,0.85)',
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontSize: {
                          xs: 22,
                          sm: 27,
                        },
                        fontWeight: 900,
                        letterSpacing: 1,
                        lineHeight: 1,
                      }}
                    >
                      ZENIMONIES
                    </Typography>

                    <Typography
                      sx={{
                        mt: 0.5,
                        fontSize: {
                          xs: 9,
                          sm: 10,
                        },
                        letterSpacing: 3,
                        fontWeight: 600,
                        opacity: 0.85,
                      }}
                    >
                      DIGITAL BANKING
                    </Typography>
                  </Box>
                </Stack>

                <Box
                  sx={{
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: {
                        xs: 15,
                        sm: 18,
                      },
                      fontWeight: 700,
                      lineHeight: 1.15,
                    }}
                  >
                    Transaction
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: {
                        xs: 15,
                        sm: 18,
                      },
                      fontWeight: 700,
                      lineHeight: 1.15,
                    }}
                  >
                    Receipt
                  </Typography>
                </Box>
              </Stack>

              <Typography
                sx={{
                  position: 'relative',
                  zIndex: 1,
                  textAlign: 'right',
                  mt: 1.2,
                  fontSize: 11,
                  opacity: 0.8,
                  fontWeight: 500,
                }}
              >
                Simple. Safe. For You.
              </Typography>
            </Box>

            {/* ==================================================
                STATUS AREA
            ================================================== */}

            <Box
              sx={{
                px: {
                  xs: 2.5,
                  sm: 4,
                },
                pt: {
                  xs: 2.5,
                  sm: 3,
                },
                pb: 2,
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 58,
                  height: 58,
                  mx: 'auto',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor:
                    isSuccessful
                      ? '#d9f6e9'
                      : isFailed
                        ? '#fde4e4'
                        : '#fff1d3',
                }}
              >
                {isSuccessful ? (
                  <CheckCircleRounded
                    sx={{
                      fontSize: 38,
                      color: '#087f5b',
                    }}
                  />
                ) : isFailed ? (
                  <ErrorRounded
                    sx={{
                      fontSize: 38,
                      color: '#c62828',
                    }}
                  />
                ) : (
                  <ScheduleRounded
                    sx={{
                      fontSize: 38,
                      color: '#b26a00',
                    }}
                  />
                )}
              </Box>

              <Typography
                sx={{
                  mt: 1.2,
                  color: '#063b2b',
                  fontSize: {
                    xs: 23,
                    sm: 27,
                  },
                  fontWeight: 850,
                  letterSpacing: -0.5,
                }}
              >
                Transaction{' '}
                {isSuccessful
                  ? 'Successful'
                  : isFailed
                    ? 'Failed'
                    : 'Pending'}
              </Typography>

              <Typography
                sx={{
                  color: '#73817c',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                {directionText}
              </Typography>

              <Typography
                sx={{
                  mt: 0.7,
                  color: isIncoming
                    ? '#087f5b'
                    : '#063b2b',
                  fontSize: {
                    xs: 34,
                    sm: 42,
                  },
                  fontWeight: 900,
                  letterSpacing: -1.5,
                  lineHeight: 1.1,
                }}
              >
                {displayAmount}
              </Typography>

              <Typography
                sx={{
                  mt: 0.8,
                  color: '#7a8782',
                  fontSize: 13,
                }}
              >
                Your transaction has been completed
                successfully.
              </Typography>
            </Box>

            <Divider
              sx={{
                mx: {
                  xs: 2.5,
                  sm: 4,
                },
                borderColor: '#dce6e1',
              }}
            />

            {/* ==================================================
                PAYMENT DETAILS
            ================================================== */}

            <Box
              sx={{
                px: {
                  xs: 2.5,
                  sm: 4,
                },
                py: 2.5,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.2,
                  bgcolor: '#eaf8f2',
                  borderRadius: 2.2,
                  px: 1.8,
                  py: 1.1,
                  mb: 1,
                }}
              >
                <Box
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: 1.5,
                    bgcolor: '#087f5b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ReceiptLongRounded
                    sx={{ fontSize: 21 }}
                  />
                </Box>

                <Typography
                  sx={{
                    color: '#075c43',
                    fontSize: {
                      xs: 18,
                      sm: 20,
                    },
                    fontWeight: 800,
                  }}
                >
                  Payment Details
                </Typography>
              </Box>

              <DetailRow
                icon={<TagRounded />}
                label="Type"
                value={transactionType}
              />

              <DetailRow
                icon={<PersonRounded />}
                label="Recipient"
                value={
                  recipientName || 'N/A'
                }
              />

              {/* ==================================================
                  ACTUAL PHONE NUMBER
              ================================================== */}

              <DetailRow
                icon={<PhoneRounded />}
                label="Phone Number"
                value={
                  recipientPhone || 'N/A'
                }
              />

              <DetailRow
                icon={<AccountBalanceRounded />}
                label="Bank"
                value={recipientBank}
              />

              {/* ==================================================
                  ACTUAL ZENIMONIES ACCOUNT NUMBER
              ================================================== */}

              <DetailRow
                icon={<AccountBalanceRounded />}
                label="Zenimonies Account Number"
                value={
                  recipientAccount || 'N/A'
                }
              />

              <DetailRow
                icon={
                  isIncoming ? (
                    <ArrowDownwardRounded />
                  ) : (
                    <ArrowUpwardRounded />
                  )
                }
                label="Amount"
                value={formatMoney(
                  numericAmount
                )}
              />

              <DetailRow
                icon={<ReceiptLongRounded />}
                label="Transaction Fee"
                value={formatMoney(
                  numericFee
                )}
              />

              <DetailRow
                icon={<TagRounded />}
                label="Reference"
                valueNode={
                  <Stack
                    direction="row"
                    spacing={0.8}
                    alignItems="center"
                    justifyContent="flex-end"
                  >
                    <Typography
                      sx={{
                        color: '#10221c',
                        fontSize: {
                          xs: 12,
                          sm: 13,
                        },
                        fontWeight: 650,
                        wordBreak:
                          'break-all',
                        textAlign:
                          'right',
                      }}
                    >
                      {reference}
                    </Typography>

                    <Button
                      className="no-print"
                      onClick={
                        copyReference
                      }
                      aria-label="Copy reference"
                      sx={{
                        minWidth: 30,
                        width: 30,
                        height: 30,
                        p: 0,
                        borderRadius: 1.5,
                        color: '#087f5b',
                      }}
                    >
                      <ContentCopyRounded
                        sx={{
                          fontSize: 17,
                        }}
                      />
                    </Button>
                  </Stack>
                }
              />

              <DetailRow
                icon={
                  <CalendarMonthRounded />
                }
                label="Date"
                value={formatDate(
                  transactionDate
                )}
              />

              <DetailRow
                icon={
                  <CheckCircleRounded />
                }
                label="Status"
                valueNode={
                  <Chip
                    label={statusText}
                    size="small"
                    sx={{
                      justifySelf:
                        'end',
                      bgcolor:
                        statusBackground,
                      color:
                        statusColor,
                      fontWeight: 800,
                      borderRadius: 2,
                      height: 28,
                    }}
                  />
                }
              />
            </Box>

            {/* ==================================================
                VERIFIED BOX
            ================================================== */}

            <Box
              sx={{
                mx: {
                  xs: 2.5,
                  sm: 4,
                },
                mb: 2.5,
                p: {
                  xs: 1.7,
                  sm: 2,
                },
                borderRadius: 2.5,
                bgcolor: '#eaf8f2',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  width: 43,
                  height: 43,
                  borderRadius: '50%',
                  bgcolor: '#087f5b',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <VerifiedRounded
                  sx={{ fontSize: 27 }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: '#075c43',
                    fontSize: 15,
                    fontWeight: 800,
                  }}
                >
                  Transaction Verified
                </Typography>

                <Typography
                  sx={{
                    mt: 0.25,
                    color: '#66766f',
                    fontSize: 12,
                    lineHeight: 1.4,
                  }}
                >
                  Keep this receipt for your records.
                  The transaction reference can be used
                  when contacting Zenimonies support.
                </Typography>
              </Box>
            </Box>

            {/* ==================================================
                FOOTER
            ================================================== */}

            <Box
              className="receipt-footer"
              sx={{
                bgcolor: '#075b42',
                color: '#ffffff',
                textAlign: 'center',
                px: 2,
                py: 2.2,
              }}
            >
              <Typography
                sx={{
                  fontSize: {
                    xs: 14,
                    sm: 16,
                  },
                  fontWeight: 800,
                }}
              >
                Thank you for banking with Zenimonies.
              </Typography>

              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 9,
                  letterSpacing: 3,
                  opacity: 0.8,
                  fontWeight: 600,
                }}
              >
                BIGGER POSSIBILITIES TOGETHER.
              </Typography>
            </Box>
          </Card>

          {/* ==================================================
              ACTION BUTTONS
          ================================================== */}

          <Stack
            className="no-print"
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={1.2}
            sx={{
              mt: 2,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              startIcon={
                <DownloadRounded />
              }
              onClick={handlePrint}
              sx={{
                bgcolor: '#087f5b',
                borderRadius: 2.5,
                py: 1.25,
                fontWeight: 800,
                '&:hover': {
                  bgcolor: '#066b4c',
                },
              }}
            >
              Save / Download
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={
                <ShareRounded />
              }
              onClick={handleShare}
              sx={{
                borderColor: '#087f5b',
                color: '#087f5b',
                borderRadius: 2.5,
                py: 1.25,
                fontWeight: 800,
                '&:hover': {
                  borderColor: '#066b4c',
                  bgcolor: '#eaf8f2',
                },
              }}
            >
              Share
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={
                <ArrowBackRounded />
              }
              onClick={() =>
                navigate(
                  '/transactions'
                )
              }
              sx={{
                borderColor:
                  '#d2ded9',
                color: '#42534c',
                borderRadius: 2.5,
                py: 1.25,
                fontWeight: 700,
              }}
            >
              Back
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* ========================================================
          PRINT / PDF STYLES
      ======================================================== */}

      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }

            html,
            body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .receipt-page {
              min-height: auto !important;
              padding: 0 !important;
              background: #ffffff !important;
            }

            .receipt-container {
              max-width: none !important;
              width: 100% !important;
            }

            .receipt-card {
              border: 1px solid #dcebe4 !important;
              box-shadow: none !important;
              border-radius: 4mm !important;
              overflow: hidden !important;
            }

            .receipt-header,
            .receipt-footer,
            .brand-card,
            .print-decoration {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .receipt-header {
              background: #087f5b !important;
            }

            .receipt-footer {
              background: #075b42 !important;
            }

            .no-print {
              display: none !important;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}
      </style>
    </>
  );
};

export default TransactionReceipt;
