import React from 'react';
import {
  Box,
  Button,
  Card,
  Chip,
  Container,
  Divider,
  IconButton,
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
  ReceiptLongRounded,
  ScheduleRounded,
  ShareRounded,
  TagRounded,
} from '@mui/icons-material';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';


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


/*
 * ============================================================
 * TRANSACTION RECEIPT
 * ============================================================
 */

const TransactionReceipt: React.FC = () => {
  const navigate = useNavigate();

  const location = useLocation();

  const transaction =
    location.state?.transaction as
      | Transaction
      | undefined;


  /*
   * ============================================================
   * RECEIPT UNAVAILABLE
   * ============================================================
   */

  if (!transaction) {
    return (
      <Box
        sx={{
          minHeight: '100vh',

          background:
            'linear-gradient(180deg, #EFFAF5 0%, #F7F9F8 100%)',

          display: 'flex',

          alignItems: 'center',

          justifyContent: 'center',

          px: 2,
        }}
      >
        <Card
          sx={{
            width: '100%',

            maxWidth: 460,

            borderRadius: 5,

            p: 4,

            textAlign: 'center',

            border:
              '1px solid #DDEBE5',

            boxShadow:
              '0 18px 45px rgba(20,60,45,0.10)',
          }}
        >
          <Box
            sx={{
              width: 76,

              height: 76,

              borderRadius: '50%',

              background: '#EAF7F3',

              color: '#008C68',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              mx: 'auto',
            }}
          >
            <ReceiptLongRounded
              sx={{
                fontSize: 38,
              }}
            />
          </Box>

          <Typography
            sx={{
              mt: 2.5,

              fontSize: 22,

              fontWeight: 900,

              color: '#16251F',
            }}
          >
            Receipt unavailable
          </Typography>

          <Typography
            sx={{
              mt: 1,

              color: '#78857F',

              fontSize: 14,

              lineHeight: 1.6,
            }}
          >
            We could not find the transaction
            details for this receipt.
          </Typography>

          <Button
            fullWidth

            variant="contained"

            onClick={() =>
              navigate('/transactions')
            }

            sx={{
              mt: 3,

              height: 50,

              borderRadius: 3,

              background: '#008C68',

              textTransform: 'none',

              fontWeight: 800,

              boxShadow: 'none',

              '&:hover': {
                background: '#007858',

                boxShadow: 'none',
              },
            }}
          >
            Back to Transactions
          </Button>
        </Card>
      </Box>
    );
  }


  /*
   * ============================================================
   * AMOUNT
   * ============================================================
   */

  const formatAmount = (
    amount: number,
    currency?: string
  ) => {
    const selectedCurrency =
      currency || 'NGN';

    try {
      return new Intl.NumberFormat(
        selectedCurrency === 'ZAR'
          ? 'en-ZA'
          : 'en-NG',
        {
          style: 'currency',

          currency:
            selectedCurrency,

          minimumFractionDigits: 2,
        }
      ).format(
        Number(amount || 0)
      );
    } catch {
      return `${selectedCurrency} ${Number(
        amount || 0
      ).toFixed(2)}`;
    }
  };


  /*
   * ============================================================
   * DATE
   * ============================================================
   */

  const formatDate = (
    date?: string
  ) => {
    if (!date) {
      return 'Date unavailable';
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return 'Date unavailable';
    }

    return parsedDate.toLocaleString(
      'en-NG',
      {
        weekday: 'long',

        day: 'numeric',

        month: 'long',

        year: 'numeric',

        hour: 'numeric',

        minute: '2-digit',
      }
    );
  };


  /*
   * ============================================================
   * STATUS
   * ============================================================
   */

  const rawStatus =
    String(
      transaction.status || ''
    ).toLowerCase();


  const isCompleted =
    rawStatus === 'completed' ||
    rawStatus === 'success' ||
    rawStatus === 'successful';


  const isFailed =
    rawStatus === 'failed' ||
    rawStatus === 'cancelled' ||
    rawStatus === 'canceled';


  const statusLabel =
    isCompleted
      ? 'Successful'
      : isFailed
      ? 'Failed'
      : 'Pending';


  const statusColor =
    isCompleted
      ? '#087A4B'
      : isFailed
      ? '#C62828'
      : '#A66B00';


  const statusBackground =
    isCompleted
      ? '#E6F7EF'
      : isFailed
      ? '#FDECEC'
      : '#FFF5DF';


  /*
   * ============================================================
   * TRANSACTION TYPE
   * ============================================================
   */

  const transactionType =
    String(
      transaction.type ||
        'Transaction'
    )
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );


  /*
   * ============================================================
   * CREDIT / DEBIT
   * ============================================================
   */

  const type =
    String(
      transaction.type || ''
    ).toLowerCase();


  const description =
    String(
      transaction.description || ''
    ).toLowerCase();


  const isCredit =
    type.includes('deposit') ||
    type.includes('credit') ||
    type.includes('funding') ||
    type.includes('refund') ||
    type.includes('received') ||
    description.includes('deposit') ||
    description.includes('credit') ||
    description.includes('funding') ||
    description.includes('refund') ||
    description.includes('received');


  /*
   * ============================================================
   * PRINT / DOWNLOAD
   * ============================================================
   */

  const handlePrint = () => {
    window.print();
  };


  /*
   * ============================================================
   * SHARE
   * ============================================================
   */

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

      isCredit
        ? 'Money received'
        : 'Money sent',

      transaction.recipient_name
        ? `Recipient: ${transaction.recipient_name}`
        : '',

      transaction.recipient_bank
        ? `Bank: ${transaction.recipient_bank}`
        : '',

      transaction.recipient_account
        ? `Account: ${transaction.recipient_account}`
        : '',

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
        typeof navigator.share ===
          'function'
      ) {
        await navigator.share({
          title:
            'Zenimonies Transaction Receipt',

          text: shareText,
        });

        return;
      }


      if (
        navigator.clipboard &&
        typeof navigator.clipboard
          .writeText === 'function'
      ) {
        await navigator.clipboard.writeText(
          shareText
        );

        window.alert(
          'Receipt details copied. You can paste them into WhatsApp, Messages, Email or another app.'
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


  /*
   * ============================================================
   * COPY REFERENCE
   * ============================================================
   */

  const copyReference = async () => {
    if (!transaction.reference) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        transaction.reference
      );

      window.alert(
        'Transaction reference copied.'
      );

    } catch {
      window.alert(
        'Unable to copy transaction reference.'
      );
    }
  };


  const hasRecipient =
    Boolean(
      transaction.recipient_name ||
      transaction.recipient_account ||
      transaction.recipient_bank
    );


  const hasBalance =
    transaction.balance_before !==
      undefined ||
    transaction.balance_after !==
      undefined;


  /*
   * ============================================================
   * PAGE
   * ============================================================
   */

  return (
    <Box
      className="receipt-page"

      sx={{
        minHeight: '100vh',

        background:
          'linear-gradient(180deg, #EFFAF5 0px, #F7F9F8 500px)',

        pb: 6,
      }}
    >

      <Container
        maxWidth="sm"

        sx={{
          px: {
            xs: 2,
            sm: 3,
          },

          pt: 2,
        }}
      >

        {/* ====================================================
            TOP NAVIGATION
        ===================================================== */}

        <Stack
          className="receipt-navigation"

          direction="row"

          alignItems="center"

          justifyContent="space-between"

          sx={{
            mb: 2,
          }}
        >

          <IconButton
            onClick={() =>
              navigate('/transactions')
            }

            sx={{
              width: 46,

              height: 46,

              background: '#FFFFFF',

              color: '#16251F',

              border:
                '1px solid #E1ECE7',

              boxShadow:
                '0 6px 18px rgba(20,60,45,0.06)',

              '&:hover': {
                background: '#FFFFFF',
              },
            }}
          >
            <ArrowBackRounded />
          </IconButton>


          <Box
            sx={{
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: 18,

                fontWeight: 900,

                color: '#16251F',
              }}
            >
              Transaction Receipt
            </Typography>

            <Typography
              sx={{
                fontSize: 11,

                color: '#7C8983',

                mt: 0.2,
              }}
            >
              Zenimonies
            </Typography>
          </Box>


          <IconButton
            onClick={handleShare}

            sx={{
              width: 46,

              height: 46,

              background: '#FFFFFF',

              color: '#008C68',

              border:
                '1px solid #E1ECE7',

              boxShadow:
                '0 6px 18px rgba(20,60,45,0.06)',

              '&:hover': {
                background: '#FFFFFF',
              },
            }}
          >
            <ShareRounded />
          </IconButton>

        </Stack>


        {/* ====================================================
            MAIN RECEIPT
        ===================================================== */}

        <Card
          className="receipt-card"

          sx={{
            borderRadius: 5,

            overflow: 'hidden',

            background: '#FFFFFF',

            border:
              '1px solid #DDE9E4',

            boxShadow:
              '0 20px 50px rgba(20,60,45,0.11)',
          }}
        >

          {/* ==================================================
              GREEN BRAND HEADER
          =================================================== */}

          <Box
            sx={{
              position: 'relative',

              overflow: 'hidden',

              background:
                'linear-gradient(135deg, #063F31 0%, #087A4B 52%, #00A875 100%)',

              color: '#FFFFFF',

              px: 3,

              py: 3.2,

              textAlign: 'center',
            }}
          >

            {/* Decorative circles */}

            <Box
              sx={{
                position: 'absolute',

                width: 210,

                height: 210,

                borderRadius: '50%',

                background:
                  'rgba(255,255,255,0.055)',

                right: -100,

                top: -120,
              }}
            />


            <Box
              sx={{
                position: 'absolute',

                width: 130,

                height: 130,

                borderRadius: '50%',

                background:
                  'rgba(255,255,255,0.045)',

                left: -70,

                bottom: -80,
              }}
            />


            <Box
              sx={{
                position:
                  'relative',

                zIndex: 1,
              }}
            >

              <Box
                sx={{
                  width: 62,

                  height: 62,

                  borderRadius: 3.5,

                  background:
                    'rgba(255,255,255,0.15)',

                  border:
                    '1px solid rgba(255,255,255,0.2)',

                  display: 'flex',

                  alignItems: 'center',

                  justifyContent: 'center',

                  mx: 'auto',

                  mb: 1.3,
                }}
              >
                <Typography
                  sx={{
                    fontSize: 31,

                    fontWeight: 950,
                  }}
                >
                  Z
                </Typography>
              </Box>


              <Typography
                sx={{
                  fontSize: 24,

                  fontWeight: 950,

                  letterSpacing:
                    '-0.5px',
                }}
              >
                Zenimonies
              </Typography>


              <Typography
                sx={{
                  mt: 0.5,

                  fontSize: 9,

                  letterSpacing: 3,

                  opacity: 0.78,

                  fontWeight: 700,
                }}
              >
                DIGITAL BANKING
              </Typography>

            </Box>

          </Box>


          {/* ==================================================
              SUCCESS SECTION
          =================================================== */}

          <Box
            sx={{
              px: 2.5,

              pt: 3.2,

              pb: 3,

              textAlign: 'center',
            }}
          >

            <Box
              sx={{
                width: 76,

                height: 76,

                borderRadius: '50%',

                background:
                  statusBackground,

                color:
                  statusColor,

                display: 'flex',

                alignItems: 'center',

                justifyContent: 'center',

                mx: 'auto',

                mb: 1.5,
              }}
            >

              {isCompleted ? (
                <CheckCircleRounded
                  sx={{
                    fontSize: 46,
                  }}
                />
              ) : isFailed ? (
                <ErrorRounded
                  sx={{
                    fontSize: 46,
                  }}
                />
              ) : (
                <ScheduleRounded
                  sx={{
                    fontSize: 46,
                  }}
                />
              )}

            </Box>


            <Typography
              sx={{
                fontSize: {
                  xs: 23,
                  sm: 26,
                },

                fontWeight: 950,

                color: '#14221D',

                letterSpacing:
                  '-0.5px',
              }}
            >
              {isCompleted
                ? 'Transaction Successful'
                : isFailed
                ? 'Transaction Failed'
                : 'Transaction Pending'}
            </Typography>


            <Chip
              label={statusLabel}

              size="small"

              sx={{
                mt: 1.2,

                height: 28,

                borderRadius: 2,

                background:
                  statusBackground,

                color:
                  statusColor,

                fontSize: 11,

                fontWeight: 850,
              }}
            />


            {/* MONEY SENT / RECEIVED */}

            <Typography
              sx={{
                mt: 2.8,

                fontSize: 12,

                color: '#89958F',

                fontWeight: 600,
              }}
            >
              {isCredit
                ? 'Money received'
                : 'Money sent'}
            </Typography>


            <Stack
              direction="row"

              justifyContent="center"

              alignItems="center"

              spacing={0.3}

              sx={{
                mt: 0.2,
              }}
            >

              {isCredit ? (
                <ArrowDownwardRounded
                  sx={{
                    fontSize: 25,

                    color: '#008C68',
                  }}
                />
              ) : (
                <ArrowUpwardRounded
                  sx={{
                    fontSize: 25,

                    color: '#008C68',
                  }}
                />
              )}


              <Typography
                sx={{
                  fontSize: {
                    xs: 34,
                    sm: 42,
                  },

                  fontWeight: 950,

                  color: '#063F31',

                  letterSpacing:
                    '-1.2px',
                }}
              >
                {isCredit
                  ? '+'
                  : '−'}

                {formatAmount(
                  transaction.amount,
                  transaction.currency
                )}
              </Typography>

            </Stack>

          </Box>


          {/* ==================================================
              GREEN SEPARATOR
          =================================================== */}

          <Box
            sx={{
              height: 5,

              background:
                'linear-gradient(90deg, #063F31, #008C68, #00A875)',
            }}
          />


          {/* ==================================================
              TRANSACTION INFORMATION
          =================================================== */}

          <ReceiptSection
            title="Transaction information"
          >

            <DetailRow
              icon={
                <TagRounded />
              }

              label="Transaction type"

              value={
                transactionType
              }
            />


            {transaction.description && (
              <DetailRow
                icon={
                  <ReceiptLongRounded />
                }

                label="Description"

                value={
                  transaction.description
                }
              />
            )}


            {transaction.reference && (
              <DetailRow
                icon={
                  <TagRounded />
                }

                label="Transaction reference"

                value={
                  transaction.reference
                }

                action={
                  <IconButton
                    size="small"

                    onClick={
                      copyReference
                    }

                    sx={{
                      width: 31,

                      height: 31,

                      flexShrink: 0,

                      color: '#008C68',

                      background:
                        '#EAF7F3',

                      '&:hover': {
                        background:
                          '#DDF2EA',
                      },
                    }}
                  >
                    <ContentCopyRounded
                      sx={{
                        fontSize: 15,
                      }}
                    />
                  </IconButton>
                }
              />
            )}


            <DetailRow
              icon={
                <CalendarMonthRounded />
              }

              label="Date & time"

              value={
                formatDate(
                  transaction.created_at
                )
              }
            />

          </ReceiptSection>


          {/* ==================================================
              RECIPIENT
          =================================================== */}

          {hasRecipient && (
            <ReceiptSection
              title="Recipient details"
            >

              {transaction.recipient_name && (
                <DetailRow
                  icon={
                    <PersonRounded />
                  }

                  label="Recipient"

                  value={
                    transaction.recipient_name
                  }
                />
              )}


              {transaction.recipient_bank && (
                <DetailRow
                  icon={
                    <AccountBalanceRounded />
                  }

                  label="Bank"

                  value={
                    transaction.recipient_bank
                  }
                />
              )}


              {transaction.recipient_account && (
                <DetailRow
                  icon={
                    <AccountBalanceRounded />
                  }

                  label="Account number"

                  value={
                    transaction.recipient_account
                  }
                />
              )}

            </ReceiptSection>
          )}


          {/* ==================================================
              BALANCE
          =================================================== */}

          {hasBalance && (
            <ReceiptSection
              title="Account balance"
            >

              {transaction.balance_before !==
                undefined && (
                <BalanceRow
                  label="Balance before"

                  value={
                    formatAmount(
                      transaction.balance_before,
                      transaction.currency
                    )
                  }
                />
              )}


              {transaction.balance_after !==
                undefined && (
                <BalanceRow
                  label="Balance after"

                  value={
                    formatAmount(
                      transaction.balance_after,
                      transaction.currency
                    )
                  }

                  highlight
                />
              )}

            </ReceiptSection>
          )}


          {/* ==================================================
              VERIFIED FOOTER
          =================================================== */}

          <Box
            sx={{
              mx: {
                xs: 2.5,
                sm: 3,
              },

              mb: 3,

              p: 2.2,

              borderRadius: 3.5,

              background:
                '#F0FAF5',

              border:
                '1px solid #D8ECE3',

              textAlign: 'center',
            }}
          >

            <Box
              sx={{
                width: 38,

                height: 38,

                borderRadius: '50%',

                background:
                  '#DDF4E9',

                color:
                  '#008C68',

                display: 'flex',

                alignItems: 'center',

                justifyContent: 'center',

                mx: 'auto',

                mb: 1,
              }}
            >
              <CheckCircleRounded
                sx={{
                  fontSize: 22,
                }}
              />
            </Box>


            <Typography
              sx={{
                fontSize: 13,

                fontWeight: 900,

                color: '#1E352B',
              }}
            >
              Zenimonies Transaction Receipt
            </Typography>


            <Typography
              sx={{
                mt: 0.6,

                fontSize: 11,

                lineHeight: 1.65,

                color: '#6F8078',
              }}
            >
              Keep this receipt for your
              records. Your transaction
              reference can be used when
              contacting Zenimonies support.
            </Typography>

          </Box>


          {/* ==================================================
              RECEIPT FOOTER
          =================================================== */}

          <Box
            sx={{
              background:
                '#063F31',

              color: '#FFFFFF',

              textAlign: 'center',

              py: 1.5,

              px: 2,
            }}
          >

            <Typography
              sx={{
                fontSize: 10,

                fontWeight: 700,

                opacity: 0.8,

                letterSpacing:
                  0.5,
              }}
            >
              Thank you for banking with
              Zenimonies
            </Typography>

          </Box>

        </Card>


        {/* ====================================================
            ACTION BUTTONS
        ===================================================== */}

        <Stack
          className="receipt-actions"

          spacing={1.3}

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

            onClick={
              handlePrint
            }

            sx={{
              height: 53,

              borderRadius: 3,

              background:
                '#008C68',

              textTransform:
                'none',

              fontWeight: 850,

              fontSize: 14,

              boxShadow:
                '0 9px 22px rgba(0,140,104,0.18)',

              '&:hover': {
                background:
                  '#007858',

                boxShadow:
                  '0 9px 22px rgba(0,140,104,0.18)',
              },
            }}
          >
            Download / Save Receipt
          </Button>


          <Button
            fullWidth

            variant="outlined"

            startIcon={
              <ShareRounded />
            }

            onClick={
              handleShare
            }

            sx={{
              height: 53,

              borderRadius: 3,

              borderColor:
                '#CBE2D8',

              color:
                '#087A4B',

              background:
                '#FFFFFF',

              textTransform:
                'none',

              fontWeight: 850,

              fontSize: 14,

              '&:hover': {
                borderColor:
                  '#087A4B',

                background:
                  '#F0FAF5',
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
              height: 46,

              color:
                '#718079',

              textTransform:
                'none',

              fontWeight: 750,
            }}
          >
            Back to Transaction History
          </Button>

        </Stack>

      </Container>


      {/* ======================================================
          PRINT STYLES
      ======================================================= */}

      <style>
        {`
          @media print {

            html,
            body {
              background: #ffffff !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .receipt-page {
              background: #ffffff !important;
              min-height: auto !important;
              padding: 0 !important;
            }

            .receipt-navigation {
              display: none !important;
            }

            .receipt-actions {
              display: none !important;
            }

            .receipt-card {
              margin: 0 !important;
              box-shadow: none !important;
              border: 1px solid #D8E2DE !important;
            }

            @page {
              size: A4;
              margin: 8mm;
            }
          }
        `}
      </style>

    </Box>
  );
};


/*
 * ============================================================
 * RECEIPT SECTION
 * ============================================================
 */

interface ReceiptSectionProps {
  title: string;

  children: React.ReactNode;
}


const ReceiptSection: React.FC<
  ReceiptSectionProps
> = ({
  title,
  children,
}) => {
  return (
    <Box>

      <Divider
        sx={{
          mx: {
            xs: 2.5,
            sm: 3,
          },
        }}
      />


      <Box
        sx={{
          px: {
            xs: 2.5,
            sm: 3,
          },

          py: 2.5,
        }}
      >

        <Typography
          sx={{
            fontSize: 15,

            fontWeight: 900,

            color: '#1E2C26',

            mb: 1.2,
          }}
        >
          {title}
        </Typography>


        {children}

      </Box>

    </Box>
  );
};


/*
 * ============================================================
 * DETAIL ROW
 * ============================================================
 */

interface DetailRowProps {
  icon: React.ReactNode;

  label: string;

  value: string;

  action?: React.ReactNode;
}


const DetailRow: React.FC<
  DetailRowProps
> = ({
  icon,
  label,
  value,
  action,
}) => {
  return (
    <Box
      sx={{
        py: 1.15,

        borderBottom:
          '1px solid #F0F4F2',
      }}
    >

      <Stack
        direction="row"

        spacing={1.2}

        alignItems="center"
      >

        <Box
          sx={{
            width: 34,

            height: 34,

            minWidth: 34,

            borderRadius: 2,

            background:
              '#EAF7F3',

            color:
              '#008C68',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',
          }}
        >
          {React.cloneElement(
            icon as React.ReactElement,
            {
              sx: {
                fontSize: 17,
              },
            }
          )}
        </Box>


        <Box
          sx={{
            flex: 1,

            minWidth: 0,
          }}
        >

          <Typography
            sx={{
              fontSize: 11,

              color: '#89958F',

              mb: 0.25,
            }}
          >
            {label}
          </Typography>


          <Typography
            sx={{
              fontSize: 13,

              fontWeight: 750,

              color: '#26332E',

              wordBreak:
                'break-word',

              lineHeight: 1.45,
            }}
          >
            {value}
          </Typography>

        </Box>


        {action}

      </Stack>

    </Box>
  );
};


/*
 * ============================================================
 * BALANCE ROW
 * ============================================================
 */

interface BalanceRowProps {
  label: string;

  value: string;

  highlight?: boolean;
}


const BalanceRow: React.FC<
  BalanceRowProps
> = ({
  label,
  value,
  highlight,
}) => {
  return (
    <Stack
      direction="row"

      justifyContent="space-between"

      alignItems="center"

      spacing={2}

      sx={{
        py: 1.05,
      }}
    >

      <Typography
        sx={{
          fontSize: 13,

          color: '#7B8882',
        }}
      >
        {label}
      </Typography>


      <Typography
        sx={{
          fontSize: 14,

          fontWeight: 850,

          color: highlight
            ? '#008C68'
            : '#26332E',

          textAlign: 'right',
        }}
      >
        {value}
      </Typography>

    </Stack>
  );
};


export default TransactionReceipt;
