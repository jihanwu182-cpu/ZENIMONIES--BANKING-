import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import {
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
  PhoneRounded,
  ReceiptLongRounded,
  ScheduleRounded,
  ShareRounded,
  TagRounded,
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
  phone?: string;

  recipient_bank?: string;
  bank_name?: string;

  sender_name?: string;
  sender_account?: string;

  account_number?: string;
  recipient_account?: string;

  network?: string;
  provider?: string;

  data_plan?: string;
  plan_name?: string;
  variation_name?: string;

  customer_number?: string;
  meter_number?: string;
  smartcard_number?: string;
  decoder_number?: string;

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
    location.state?.transaction as Transaction | undefined;

  /* ============================================================
     NO TRANSACTION
  ============================================================ */

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
            maxWidth: 430,
            p: 3,
            borderRadius: 3,
            textAlign: 'center',
            border: '1px solid #dcebe4',
            boxShadow: '0 12px 35px rgba(7, 94, 66, 0.08)',
          }}
        >
          <ReceiptLongRounded
            sx={{
              fontSize: 50,
              color: '#087f5b',
              mb: 1.5,
            }}
          />

          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 850,
              color: '#063b2b',
              mb: 0.8,
            }}
          >
            Receipt unavailable
          </Typography>

          <Typography
            color="text.secondary"
            sx={{
              fontSize: 14,
              mb: 2.5,
            }}
          >
            We could not find the transaction details for this receipt.
          </Typography>

          <Button
            fullWidth
            variant="contained"
            startIcon={<ArrowBackRounded />}
            onClick={() => navigate('/transactions')}
            sx={{
              bgcolor: '#087f5b',
              borderRadius: 2,
              py: 1.15,
              fontWeight: 800,
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
     BASIC HELPERS
  ============================================================ */

  const numericAmount = Number(transaction.amount ?? 0);

  const numericFee = Number(
    transaction.transaction_fee ??
      transaction.fee ??
      0
  );

  const currency = (
    transaction.currency || 'NGN'
  ).toUpperCase();

  const formatMoney = (value: number) => {
    try {
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `₦${value.toFixed(2)}`;
    }
  };

  const reference =
    transaction.reference ||
    transaction.transaction_reference ||
    transaction.id ||
    '';

  const transactionDate =
    transaction.created_at ||
    transaction.date ||
    transaction.timestamp;

  const formatDate = (value?: string) => {
    if (!value) {
      return 'Date not available';
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

  /* ============================================================
     TRANSACTION TYPE
  ============================================================ */

  const rawType = (
    transaction.transaction_type ||
    transaction.type ||
    transaction.category ||
    ''
  ).toLowerCase();

  const rawDescription = (
    transaction.description || ''
  ).toLowerCase();

  const isAirtime =
    rawType.includes('airtime') ||
    rawDescription.includes('airtime');

  const isData =
    rawType.includes('data') ||
    rawDescription.includes('data');

  const isTransfer =
    rawType.includes('transfer') ||
    rawDescription.includes('transfer');

  const isDeposit =
    rawType.includes('deposit') ||
    rawType.includes('fund') ||
    rawType.includes('credit') ||
    rawDescription.includes('deposit') ||
    rawDescription.includes('funding');

  const isBill =
    rawType.includes('bill') ||
    rawDescription.includes('electricity') ||
    rawDescription.includes('tv') ||
    rawDescription.includes('betting');

  /* ============================================================
     FRIENDLY RECEIPT TITLE
  ============================================================ */

  let receiptTitle = 'Transaction Receipt';

  if (isAirtime) {
    receiptTitle = 'Airtime Purchase Receipt';
  } else if (isData) {
    receiptTitle = 'Data Purchase Receipt';
  } else if (isTransfer) {
    receiptTitle = 'Transfer Receipt';
  } else if (isDeposit) {
    receiptTitle = 'Funding Receipt';
  } else if (isBill) {
    receiptTitle = 'Bill Payment Receipt';
  }

  /* ============================================================
     REAL STATUS
     ============================================================ */

  const rawStatus = String(
    transaction.status || ''
  )
    .trim()
    .toLowerCase();

  /*
   * IMPORTANT:
   * There is intentionally NO fallback to "successful".
   *
   * A financial receipt must never claim success when the backend
   * did not provide a successful status.
   */

  const isSuccessful =
    rawStatus === 'successful' ||
    rawStatus === 'completed' ||
    rawStatus === 'success' ||
    rawStatus === 'delivered';

  const isFailed =
    rawStatus === 'failed' ||
    rawStatus === 'failure' ||
    rawStatus === 'reversed' ||
    rawStatus === 'cancelled' ||
    rawStatus === 'canceled';

  const isPending =
    rawStatus === 'pending' ||
    rawStatus === 'processing' ||
    rawStatus === 'initiated' ||
    rawStatus === 'queued';

  const isUnknownStatus =
    !isSuccessful &&
    !isFailed &&
    !isPending;

  let statusText = 'Status unavailable';

  if (isSuccessful) {
    statusText = 'Successful';
  } else if (isFailed) {
    statusText = 'Failed';
  } else if (isPending) {
    statusText = 'Pending';
  }

  let statusMessage =
    'The current transaction status is shown below.';

  if (isSuccessful) {
    if (isAirtime) {
      statusMessage =
        'Your airtime purchase has been completed successfully.';
    } else if (isData) {
      statusMessage =
        'Your data purchase has been completed successfully.';
    } else if (isTransfer) {
      statusMessage =
        'Your transfer has been completed successfully.';
    } else {
      statusMessage =
        'Your transaction has been completed successfully.';
    }
  } else if (isPending) {
    statusMessage =
      'Your transaction is still being processed. Please check the status again later.';
  } else if (isFailed) {
    statusMessage =
      'Your transaction could not be completed.';
  } else if (isUnknownStatus) {
    statusMessage =
      'The current transaction status could not be confirmed.';
  }

  /* ============================================================
     STATUS COLORS
  ============================================================ */

  const statusColor = isSuccessful
    ? '#087f5b'
    : isFailed
      ? '#c62828'
      : '#a76500';

  const statusBackground = isSuccessful
    ? '#dff7ec'
    : isFailed
      ? '#fde8e8'
      : '#fff3d6';

  const statusIcon = isSuccessful ? (
    <CheckCircleRounded
      sx={{
        fontSize: 34,
        color: '#087f5b',
      }}
    />
  ) : isFailed ? (
    <ErrorRounded
      sx={{
        fontSize: 34,
        color: '#c62828',
      }}
    />
  ) : (
    <ScheduleRounded
      sx={{
        fontSize: 34,
        color: '#a76500',
      }}
    />
  );

  /* ============================================================
     DIRECTION
  ============================================================ */

  const isIncoming =
    transaction.category === 'credit' ||
    transaction.category === 'incoming' ||
    rawType.includes('received') ||
    rawDescription.includes('received');

  const displayAmount = isIncoming
    ? `+${formatMoney(numericAmount)}`
    : `−${formatMoney(numericAmount)}`;

  /* ============================================================
     REAL TRANSACTION DETAILS
  ============================================================ */

  const recipientName =
    transaction.recipient_name || '';

  const recipientPhone =
    transaction.recipient_phone ||
    transaction.phone ||
    '';

  const network =
    transaction.network ||
    transaction.provider ||
    '';

  const recipientBank =
    transaction.recipient_bank ||
    transaction.bank_name ||
    '';

  const recipientAccount =
    transaction.recipient_account ||
    transaction.account_number ||
    '';

  const dataPlan =
    transaction.data_plan ||
    transaction.plan_name ||
    transaction.variation_name ||
    '';

  const customerNumber =
    transaction.customer_number ||
    transaction.meter_number ||
    transaction.smartcard_number ||
    transaction.decoder_number ||
    '';

  /* ============================================================
     WHETHER TO SHOW FEE
  ============================================================ */

  /*
   * Airtime and Data do not show a transaction fee here.
   *
   * For other transaction types, a fee is displayed only when
   * the backend actually supplied a positive fee.
   */

  const shouldShowFee =
    !isAirtime &&
    !isData &&
    Number.isFinite(numericFee) &&
    numericFee > 0;

  /* ============================================================
     COPY REFERENCE
  ============================================================ */

  const copyReference = async () => {
    if (!reference) {
      alert('Transaction reference is not available.');
      return;
    }

    try {
      await navigator.clipboard.writeText(reference);
      alert('Transaction reference copied.');
    } catch {
      alert('Unable to copy transaction reference.');
    }
  };

  /* ============================================================
     SHARE
  ============================================================ */

  const handleShare = async () => {
    const shareLines = [
      'ZENIMONIES',
      receiptTitle,
      '',
      `Status: ${statusText}`,
      `Amount: ${formatMoney(numericAmount)}`,
    ];

    if (isAirtime) {
      if (network) {
        shareLines.push(`Network: ${network}`);
      }

      if (recipientPhone) {
        shareLines.push(`Phone Number: ${recipientPhone}`);
      }
    } else if (isData) {
      if (network) {
        shareLines.push(`Network: ${network}`);
      }

      if (recipientPhone) {
        shareLines.push(`Phone Number: ${recipientPhone}`);
      }

      if (dataPlan) {
        shareLines.push(`Data Plan: ${dataPlan}`);
      }
    } else {
      if (recipientName) {
        shareLines.push(`Recipient: ${recipientName}`);
      }

      if (recipientBank) {
        shareLines.push(`Bank: ${recipientBank}`);
      }

      if (recipientAccount) {
        shareLines.push(
          `Account Number: ${recipientAccount}`
        );
      }
    }

    if (shouldShowFee) {
      shareLines.push(
        `Transaction Fee: ${formatMoney(numericFee)}`
      );
    }

    if (reference) {
      shareLines.push(`Reference: ${reference}`);
    }

    shareLines.push(
      `Date: ${formatDate(transactionDate)}`,
      `Status: ${statusText}`
    );

    const shareText = shareLines.join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Zenimonies ${receiptTitle}`,
          text: shareText,
        });

        return;
      } catch {
        // User cancelled the share dialog.
      }
    }

    try {
      await navigator.clipboard.writeText(shareText);
      alert('Receipt details copied.');
    } catch {
      alert('Unable to share receipt details.');
    }
  };

  /* ============================================================
     PRINT / SAVE
  ============================================================ */

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
          xs: 'minmax(105px, 38%) 1fr',
          sm: '175px 1fr',
        },
        alignItems: 'center',
        minHeight: 40,
        py: 0.45,
        borderBottom: '1px solid #e7eeeb',
        '&:last-child': {
          borderBottom: 'none',
        },
      }}
    >
      <Stack
        direction="row"
        spacing={0.7}
        alignItems="center"
        sx={{
          minWidth: 0,
        }}
      >
        {icon && (
          <Box
            sx={{
              display: 'flex',
              color: '#71817b',
              flexShrink: 0,
              '& svg': {
                fontSize: 17,
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
              xs: 12,
              sm: 13,
            },
            fontWeight: 550,
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
              xs: 12.5,
              sm: 13.5,
            },
            fontWeight: 650,
            wordBreak: 'break-word',
            textAlign: 'right',
          }}
        >
          {value}
        </Typography>
      )}
    </Box>
  );

  /* ============================================================
     CONDITIONAL DETAIL SECTIONS
  ============================================================ */

  const renderTransactionDetails = () => {
    /*
     * AIRTIME
     */

    if (isAirtime) {
      return (
        <>
          {network && (
            <DetailRow
              icon={<TagRounded />}
              label="Network"
              value={network}
            />
          )}

          {recipientPhone && (
            <DetailRow
              icon={<PhoneRounded />}
              label="Phone Number"
              value={recipientPhone}
            />
          )}

          <DetailRow
            icon={<ArrowUpwardRounded />}
            label="Amount"
            value={formatMoney(numericAmount)}
          />

          {reference && (
            <DetailRow
              icon={<TagRounded />}
              label="Reference"
              valueNode={
                <ReferenceValue
                  reference={reference}
                  onCopy={copyReference}
                />
              }
            />
          )}

          <DetailRow
            icon={<CalendarMonthRounded />}
            label="Date & Time"
            value={formatDate(transactionDate)}
          />

          <DetailRow
            icon={<CheckCircleRounded />}
            label="Status"
            valueNode={
              <StatusChip
                label={statusText}
                background={statusBackground}
                color={statusColor}
              />
            }
          />
        </>
      );
    }

    /*
     * DATA
     */

    if (isData) {
      return (
        <>
          {network && (
            <DetailRow
              icon={<TagRounded />}
              label="Network"
              value={network}
            />
          )}

          {recipientPhone && (
            <DetailRow
              icon={<PhoneRounded />}
              label="Phone Number"
              value={recipientPhone}
            />
          )}

          {dataPlan && (
            <DetailRow
              icon={<TagRounded />}
              label="Data Plan"
              value={dataPlan}
            />
          )}

          <DetailRow
            icon={<ArrowUpwardRounded />}
            label="Amount"
            value={formatMoney(numericAmount)}
          />

          {reference && (
            <DetailRow
              icon={<TagRounded />}
              label="Reference"
              valueNode={
                <ReferenceValue
                  reference={reference}
                  onCopy={copyReference}
                />
              }
            />
          )}

          <DetailRow
            icon={<CalendarMonthRounded />}
            label="Date & Time"
            value={formatDate(transactionDate)}
          />

          <DetailRow
            icon={<CheckCircleRounded />}
            label="Status"
            valueNode={
              <StatusChip
                label={statusText}
                background={statusBackground}
                color={statusColor}
              />
            }
          />
        </>
      );
    }

    /*
     * OTHER TRANSACTIONS
     */

    return (
      <>
        {recipientName && (
          <DetailRow
            icon={<AccountBalanceRounded />}
            label="Recipient"
            value={recipientName}
          />
        )}

        {recipientBank && (
          <DetailRow
            icon={<AccountBalanceRounded />}
            label="Bank"
            value={recipientBank}
          />
        )}

        {recipientAccount && (
          <DetailRow
            icon={<TagRounded />}
            label="Account Number"
            value={recipientAccount}
          />
        )}

        {customerNumber && isBill && (
          <DetailRow
            icon={<TagRounded />}
            label="Customer Number"
            value={customerNumber}
          />
        )}

        <DetailRow
          icon={
            isIncoming ? (
              <ArrowDownwardRounded />
            ) : (
              <ArrowUpwardRounded />
            )
          }
          label="Amount"
          value={formatMoney(numericAmount)}
        />

        {shouldShowFee && (
          <DetailRow
            icon={<ReceiptLongRounded />}
            label="Transaction Fee"
            value={formatMoney(numericFee)}
          />
        )}

        {reference && (
          <DetailRow
            icon={<TagRounded />}
            label="Reference"
            valueNode={
              <ReferenceValue
                reference={reference}
                onCopy={copyReference}
              />
            }
          />
        )}

        <DetailRow
          icon={<CalendarMonthRounded />}
          label="Date & Time"
          value={formatDate(transactionDate)}
        />

        <DetailRow
          icon={<CheckCircleRounded />}
          label="Status"
          valueNode={
            <StatusChip
              label={statusText}
              background={statusBackground}
              color={statusColor}
            />
          }
        />
      </>
    );
  };

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
            xs: 1.25,
            sm: 3,
          },
          px: {
            xs: 0.75,
            sm: 2,
          },
        }}
      >
        <Box
          className="receipt-container"
          sx={{
            width: '100%',
            maxWidth: 650,
            mx: 'auto',
          }}
        >
          <Card
            className="receipt-card"
            elevation={0}
            sx={{
              overflow: 'hidden',
              borderRadius: {
                xs: 2.5,
                sm: 3,
              },
              border: '1px solid #dcebe4',
              boxShadow:
                '0 12px 38px rgba(7, 94, 66, 0.08)',
              bgcolor: '#ffffff',
            }}
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <Box
              className="receipt-header"
              sx={{
                bgcolor: '#087f5b',
                color: '#ffffff',
                px: {
                  xs: 2,
                  sm: 3,
                },
                py: {
                  xs: 1.8,
                  sm: 2.3,
                },
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1.5}
              >
                <Box>
                  <Typography
                    sx={{
                      fontSize: {
                        xs: 20,
                        sm: 24,
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
                      mt: 0.45,
                      fontSize: 8,
                      letterSpacing: 2.5,
                      fontWeight: 600,
                      opacity: 0.85,
                    }}
                  >
                    DIGITAL BANKING
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: {
                      xs: 13,
                      sm: 15,
                    },
                    fontWeight: 750,
                    textAlign: 'right',
                    maxWidth: 190,
                  }}
                >
                  {receiptTitle}
                </Typography>
              </Stack>
            </Box>

            {/* ==================================================
                STATUS / AMOUNT
            ================================================== */}

            <Box
              sx={{
                px: {
                  xs: 2,
                  sm: 3,
                },
                pt: {
                  xs: 2,
                  sm: 2.5,
                },
                pb: 1.8,
                textAlign: 'center',
              }}
            >
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  mx: 'auto',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: statusBackground,
                }}
              >
                {statusIcon}
              </Box>

              <Typography
                sx={{
                  mt: 1,
                  color: '#063b2b',
                  fontSize: {
                    xs: 21,
                    sm: 25,
                  },
                  fontWeight: 850,
                }}
              >
                {isSuccessful
                  ? 'Transaction Successful'
                  : isFailed
                    ? 'Transaction Failed'
                    : isPending
                      ? 'Transaction Pending'
                      : 'Transaction Status Unconfirmed'}
              </Typography>

              <Typography
                sx={{
                  mt: 0.4,
                  color: '#718079',
                  fontSize: {
                    xs: 12,
                    sm: 13,
                  },
                  lineHeight: 1.45,
                }}
              >
                {statusMessage}
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  color: isIncoming
                    ? '#087f5b'
                    : '#063b2b',
                  fontSize: {
                    xs: 28,
                    sm: 36,
                  },
                  fontWeight: 900,
                  letterSpacing: -1,
                  lineHeight: 1.05,
                }}
              >
                {displayAmount}
              </Typography>
            </Box>

            <Divider
              sx={{
                mx: {
                  xs: 2,
                  sm: 3,
                },
                borderColor: '#dce6e1',
              }}
            />

            {/* ==================================================
                DETAILS
            ================================================== */}

            <Box
              sx={{
                px: {
                  xs: 2,
                  sm: 3,
                },
                py: {
                  xs: 1.5,
                  sm: 2,
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  bgcolor: '#eaf8f2',
                  borderRadius: 1.8,
                  px: 1.4,
                  py: 0.9,
                  mb: 0.5,
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: 1.2,
                    bgcolor: '#087f5b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ReceiptLongRounded
                    sx={{
                      fontSize: 18,
                    }}
                  />
                </Box>

                <Typography
                  sx={{
                    color: '#075c43',
                    fontSize: {
                      xs: 16,
                      sm: 18,
                    },
                    fontWeight: 800,
                  }}
                >
                  Payment Details
                </Typography>
              </Box>

              <DetailRow
                icon={<TagRounded />}
                label="Transaction Type"
                value={receiptTitle.replace(
                  ' Receipt',
                  ''
                )}
              />

              {renderTransactionDetails()}
            </Box>

            {/* ==================================================
                RECORDS NOTICE
            ================================================== */}

            <Box
              sx={{
                mx: {
                  xs: 2,
                  sm: 3,
                },
                mb: 1.8,
                p: 1.4,
                borderRadius: 1.8,
                bgcolor: '#f4f8f6',
                border: '1px solid #e1ebe6',
              }}
            >
              <Typography
                sx={{
                  color: '#52635c',
                  fontSize: 11.5,
                  lineHeight: 1.45,
                  textAlign: 'center',
                }}
              >
                Keep this receipt and the transaction
                reference for your records. For support,
                provide the reference shown above.
              </Typography>
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
                py: 1.5,
              }}
            >
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 750,
                }}
              >
                Thank you for banking with Zenimonies.
              </Typography>

              <Typography
                sx={{
                  mt: 0.25,
                  fontSize: 7.5,
                  letterSpacing: 2.5,
                  opacity: 0.8,
                  fontWeight: 600,
                }}
              >
                BIGGER POSSIBILITIES TOGETHER.
              </Typography>
            </Box>
          </Card>

          {/* ==================================================
              ACTIONS
          ================================================== */}

          <Stack
            className="no-print"
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            spacing={1}
            sx={{
              mt: 1.5,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              startIcon={<DownloadRounded />}
              onClick={handlePrint}
              sx={{
                bgcolor: '#087f5b',
                borderRadius: 2,
                py: 1.05,
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
              startIcon={<ShareRounded />}
              onClick={handleShare}
              sx={{
                borderColor: '#087f5b',
                color: '#087f5b',
                borderRadius: 2,
                py: 1.05,
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
              startIcon={<ArrowBackRounded />}
              onClick={() => navigate('/transactions')}
              sx={{
                borderColor: '#d2ded9',
                color: '#42534c',
                borderRadius: 2,
                py: 1.05,
                fontWeight: 700,
              }}
            >
              Back
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* ========================================================
          PRINT STYLES
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
              border-radius: 3mm !important;
              overflow: hidden !important;
            }

            .receipt-header,
            .receipt-footer {
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

/* ==============================================================
   REFERENCE VALUE
============================================================== */

const ReferenceValue = ({
  reference,
  onCopy,
}: {
  reference: string;
  onCopy: () => void;
}) => (
  <Stack
    direction="row"
    spacing={0.5}
    alignItems="center"
    justifyContent="flex-end"
    sx={{
      minWidth: 0,
    }}
  >
    <Typography
      sx={{
        color: '#10221c',
        fontSize: {
          xs: 11,
          sm: 12,
        },
        fontWeight: 650,
        wordBreak: 'break-all',
        textAlign: 'right',
      }}
    >
      {reference}
    </Typography>

    <Button
      className="no-print"
      onClick={onCopy}
      aria-label="Copy transaction reference"
      sx={{
        minWidth: 28,
        width: 28,
        height: 28,
        p: 0,
        borderRadius: 1,
        color: '#087f5b',
        flexShrink: 0,
      }}
    >
      <ContentCopyRounded
        sx={{
          fontSize: 16,
        }}
      />
    </Button>
  </Stack>
);

/* ==============================================================
   STATUS CHIP
============================================================== */

const StatusChip = ({
  label,
  background,
  color,
}: {
  label: string;
  background: string;
  color: string;
}) => (
  <Chip
    label={label}
    size="small"
    sx={{
      justifySelf: 'end',
      bgcolor: background,
      color,
      fontWeight: 800,
      borderRadius: 1.5,
      height: 25,
      fontSize: 11,
    }}
  />
);

export default TransactionReceipt;
