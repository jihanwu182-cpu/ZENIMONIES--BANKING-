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
  ArrowBackRounded,
  CheckCircleRounded,
  ErrorRounded,
  ScheduleRounded,
  ShareRounded,
  DownloadRounded,
  ReceiptLongRounded,
  ContentCopyRounded,
  AccountBalanceRounded,
  PersonRounded,
  CalendarMonthRounded,
  TagRounded,
  ArrowUpwardRounded,
  ArrowDownwardRounded,
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


const TransactionReceipt: React.FC = () => {
  const navigate = useNavigate();

  const location = useLocation();

  const transaction =
    location.state?.transaction as
      | Transaction
      | undefined;


  /*
   * ============================================================
   * NO TRANSACTION
   * ============================================================
   */

  if (!transaction) {
    return (
      <Box
        sx={{
          minHeight: '100vh',

          background:
            'linear-gradient(180deg, #F1FAF6 0%, #F7F9F8 100%)',

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
              '1px solid #E4ECE8',

            boxShadow:
              '0 15px 40px rgba(20,50,40,0.08)',
          }}
        >

          <Box
            sx={{
              width: 70,
              height: 70,

              borderRadius: '50%',

              background:
                '#EAF7F3',

              color:
                '#008C68',

              display: 'flex',

              alignItems: 'center',

              justifyContent: 'center',

              mx: 'auto',
            }}
          >
            <ReceiptLongRounded
              sx={{
                fontSize: 34,
              }}
            />
          </Box>


          <Typography
            sx={{
              mt: 2.5,

              fontSize: 22,

              fontWeight: 900,

              color:
                '#16251F',
            }}
          >
            Receipt unavailable
          </Typography>


          <Typography
            sx={{
              mt: 1,

              color:
                '#78857F',

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

              background:
                '#008C68',

              textTransform:
                'none',

              fontWeight: 800,

              boxShadow: 'none',

              '&:hover': {
                background:
                  '#007858',

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
   * FORMAT AMOUNT
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
   * FORMAT DATE
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
      ? '#D93636'
      : '#A66B00';


  const statusBackground =
    isCompleted
      ? '#E8F8F1'
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
   * PRINT
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

      transaction.recipient_name
        ? `Recipient: ${transaction.recipient_name}`
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


  /*
   * ============================================================
   * RECIPIENT
   * ============================================================
   */

  const hasRecipient =
    Boolean(
      transaction.recipient_name ||
      transaction.recipient_account ||
      transaction.recipient_bank
    );


  /*
   * ============================================================
   * BALANCE
   * ============================================================
   */

  const hasBalance =
    transaction.balance_before !==
      undefined ||
    transaction.balance_after !==
      undefined;


  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (

    <Box
      className="receipt-page"

      sx={{
        minHeight: '100vh',

        background:
          'linear-gradient(180deg, #EFFAF5 0px, #F7F9F8 420px)',

        pb: 6,
      }}
    >

      {/* ======================================================
          TOP BAR
      ======================================================= */}

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

        <Stack
          direction="row"

          alignItems="center"

          justifyContent="space-between"

          className="receipt-top-bar"
        >

          <IconButton
            onClick={() =>
              navigate('/transactions')
            }

            sx={{
              width: 46,

              height: 46,

              background:
                '#FFFFFF',

              color:
                '#17241F',

              border:
                '1px solid #E7EEEB',

              boxShadow:
                '0 6px 18px rgba(20,50,40,0.06)',

              '&:hover': {
                background:
                  '#FFFFFF',
              },
            }}
          >

            <ArrowBackRounded />

          </IconButton>


          <Box
            sx={{
              textAlign:
                'center',
            }}
          >

            <Typography
              sx={{
                fontSize: 18,

                fontWeight: 900,

                color:
                  '#16251F',
              }}
            >
              Receipt
            </Typography>

            <Typography
              sx={{
                fontSize: 11,

                color:
                  '#84908B',

                mt: 0.2,
              }}
            >
              Zenimonies
            </Typography>

          </Box>


          <IconButton
            onClick={
              handleShare
            }

            sx={{
              width: 46,

              height: 46,

              background:
                '#FFFFFF',

              color:
                '#008C68',

              border:
                '1px solid #E7EEEB',

              boxShadow:
                '0 6px 18px rgba(20,50,40,0.06)',

              '&:hover': {
                background:
                  '#FFFFFF',
              },
            }}
          >

            <ShareRounded />

          </IconButton>

        </Stack>


        {/* ====================================================
            RECEIPT CARD
        ===================================================== */}

        <Card
          className="receipt-card"

          sx={{
            mt: 2,

            borderRadius: 5,

            overflow:
              'hidden',

            background:
              '#FFFFFF',

            border:
              '1px solid #E5ECE9',

            boxShadow:
              '0 18px 45px rgba(20,50,40,0.10)',
          }}
        >

          {/* ==================================================
              BRAND HEADER
          =================================================== */}

          <Box
            sx={{
              background:
                'linear-gradient(135deg, #063F31 0%, #087A4B 55%, #00A875 100%)',

              color:
                '#FFFFFF',

              px: 3,

              pt: 3,

              pb: 4,

              position:
                'relative',

              overflow:
                'hidden',
            }}
          >

            {/* Decorative circles */}

            <Box
              sx={{
                position:
                  'absolute',

                width: 180,

                height: 180,

                borderRadius:
                  '50%',

                background:
                  'rgba(255,255,255,0.06)',

                right: -80,

                top: -80,
              }}
            />

            <Box
              sx={{
                position:
                  'absolute',

                width: 100,

                height: 100,

                borderRadius:
                  '50%',

                background:
                  'rgba(255,255,255,0.05)',

                left: -45,

                bottom: -45,
              }}
            />


            <Box
              sx={{
                position:
                  'relative',

                zIndex: 1,

                textAlign:
                  'center',
              }}
            >

              <Box
                sx={{
                  width: 60,

                  height: 60,

                  borderRadius:
                    3.5,

                  background:
                    'rgba(255,255,255,0.14)',

                  border:
                    '1px solid rgba(255,255,255,0.18)',

                  display:
                    'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  mx: 'auto',

                  mb: 1.2,
                }}
              >

                <Typography
                  sx={{
                    fontSize: 29,

                    fontWeight: 950,
                  }}
                >
                  Z
                </Typography>

              </Box>


              <Typography
                sx={{
                  fontSize: 23,

                  fontWeight: 950,

                  letterSpacing:
                    '-0.4px',
                }}
              >
                Zenimonies
              </Typography>


              <Typography
                sx={{
                  fontSize: 9,

                  letterSpacing:
                    3,

                  opacity:
                    0.75,

                  mt: 0.4,
                }}
              >
                DIGITAL BANKING
              </Typography>

            </Box>

          </Box>


          {/* ==================================================
              STATUS / AMOUNT
          =================================================== */}

          <Box
            sx={{
              textAlign:
                'center',

              px: 2.5,

              pt: 3,

              pb: 2.5,
            }}
          >

            <Box
              sx={{
                width: 72,

                height: 72,

                borderRadius:
                  '50%',

                background:
                  statusBackground,

                color:
                  statusColor,

                display:
                  'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                mx: 'auto',

                mb: 1.5,
              }}
            >

              {isCompleted ? (

                <CheckCircleRounded
                  sx={{
                    fontSize: 42,
                  }}
                />

              ) : isFailed ? (

                <ErrorRounded
                  sx={{
                    fontSize: 42,
                  }}
                />

              ) : (

                <ScheduleRounded
                  sx={{
                    fontSize: 42,
                  }}
                />

              )}

            </Box>


            <Typography
              sx={{
                fontSize: 23,

                fontWeight: 900,

                color:
                  '#18251F',
              }}
            >
              {isCompleted
                ? 'Transaction Successful'
                : isFailed
                ? 'Transaction Failed'
                : 'Transaction Pending'}
            </Typography>


            <Chip
              label={
                statusLabel
              }

              size="small"

              sx={{
                mt: 1,

                height: 28,

                borderRadius:
                  2,

                background:
                  statusBackground,

                color:
                  statusColor,

                fontWeight:
                  800,

                fontSize: 11,
              }}
            />


            <Typography
              sx={{
                mt: 2.5,

                fontSize: 12,

                color:
                  '#8A9590',
              }}
            >
              {isCredit
                ? 'Money received'
                : 'Money sent'}
            </Typography>


            <Stack
              direction="row"

              alignItems="center"

              justifyContent="center"

              spacing={0.5}

              sx={{
                mt: 0.3,
              }}
            >

              {isCredit ? (

                <ArrowDownwardRounded
                  sx={{
                    color:
                      '#008C68',

                    fontSize: 25,
                  }}
                />

              ) : (

                <ArrowUpwardRounded
                  sx={{
                    color:
                      '#008C68',

                    fontSize: 25,
                  }}
                />

              )}


              <Typography
                sx={{
                  fontSize: {
                    xs: 34,
                    sm: 40,
                  },

                  fontWeight:
                    950,

                  color:
                    '#063F31',

                  letterSpacing:
                    '-1.2px',
                }}
              >
                {formatAmount(
                  transaction.amount,
                  transaction.currency
                )}
              </Typography>

            </Stack>

          </Box>


          <Divider
            sx={{
              mx: 3,
            }}
          />


          {/* ==================================================
              TRANSACTION INFORMATION
          =================================================== */}

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

                color:
                  '#1E2C26',

                mb: 1.5,
              }}
            >
              Transaction information
            </Typography>


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
                  <ContentCopyRounded />
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
                      width: 30,

                      height: 30,

                      color:
                        '#008C68',

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

          </Box>


          {/* ==================================================
              RECIPIENT DETAILS
          =================================================== */}

          {hasRecipient && (

            <>

              <Divider
                sx={{
                  mx: 3,
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

                    color:
                      '#1E2C26',

                    mb: 1.5,
                  }}
                >
                  Recipient details
                </Typography>


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

              </Box>

            </>

          )}


          {/* ==================================================
              BALANCE DETAILS
          =================================================== */}

          {hasBalance && (

            <>

              <Divider
                sx={{
                  mx: 3,
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

                    color:
                      '#1E2C26',

                    mb: 1.5,
                  }}
                >
                  Account balance
                </Typography>


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

              </Box>

            </>

          )}


          {/* ==================================================
              TRUST / SECURITY
          =================================================== */}

          <Box
            sx={{
              mx: {
                xs: 2.5,
                sm: 3,
              },

              mb: 3,

              p: 2,

              borderRadius: 3,

              background:
                '#F3F8F5',

              border:
                '1px solid #E1ECE7',

              textAlign:
                'center',
            }}
          >

            <CheckCircleRounded
              sx={{
                color:
                  '#008C68',

                fontSize: 22,
              }}
            />


            <Typography
              sx={{
                mt: 0.5,

                fontSize: 13,

                fontWeight: 800,

                color:
                  '#26352E',
              }}
            >
              Zenimonies Transaction Receipt
            </Typography>


            <Typography
              sx={{
                mt: 0.5,

                fontSize: 11,

                lineHeight: 1.6,

                color:
                  '#718079',
              }}
            >
              Keep this receipt for your
              records. Your transaction
              reference can be used when
              contacting Zenimonies support.
            </Typography>

          </Box>

        </Card>


        {/* ====================================================
            ACTIONS
        ===================================================== */}

        <Stack
          spacing={1.3}

          className="receipt-actions"

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
              height: 52,

              borderRadius: 3,

              background:
                '#008C68',

              textTransform:
                'none',

              fontWeight:
                850,

              fontSize: 14,

              boxShadow:
                '0 8px 20px rgba(0,140,104,0.18)',

              '&:hover': {
                background:
                  '#007858',

                boxShadow:
                  '0 8px 20px rgba(0,140,104,0.18)',
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
              height: 52,

              borderRadius: 3,

              borderColor:
                '#CFE1D9',

              color:
                '#087A4B',

              background:
                '#FFFFFF',

              textTransform:
                'none',

              fontWeight:
                800,

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

              fontWeight:
                700,
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

            body {
              background: #ffffff !important;
              margin: 0 !important;
            }

            .receipt-page {
              background: #ffffff !important;
              padding: 0 !important;
              min-height: auto !important;
            }

            .receipt-top-bar {
              display: none !important;
            }

            .receipt-actions {
              display: none !important;
            }

            .receipt-card {
              box-shadow: none !important;
              border: 1px solid #DDDDDD !important;
              margin-top: 0 !important;
            }

            @page {
              size: A4;
              margin: 10mm;
            }
          }
        `}
      </style>

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


const DetailRow: React.FC<DetailRowProps> = ({
  icon,
  label,
  value,
  action,
}) => {

  return (

    <Box
      sx={{
        py: 1.25,

        borderBottom:
          '1px solid #F0F4F2',
      }}
    >

      <Stack
        direction="row"

        spacing={1.3}

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

            display:
              'flex',

            alignItems:
              'center',

            justifyContent:
              'center',
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
            minWidth: 0,

            flex: 1,
          }}
        >

          <Typography
            sx={{
              fontSize: 11,

              color:
                '#89958F',

              mb: 0.25,
            }}
          >
            {label}
          </Typography>


          <Typography
            sx={{
              fontSize: 13,

              fontWeight: 750,

              color:
                '#26332E',

              wordBreak:
                'break-word',
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


const BalanceRow: React.FC<BalanceRowProps> = ({
  label,
  value,
  highlight,
}) => {

  return (

    <Stack
      direction="row"

      justifyContent="space-between"

      alignItems="center"

      sx={{
        py: 1,
      }}
    >

      <Typography
        sx={{
          fontSize: 13,

          color:
            '#7B8882',
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
        }}
      >
        {value}
      </Typography>

    </Stack>

  );
};


export default TransactionReceipt;
