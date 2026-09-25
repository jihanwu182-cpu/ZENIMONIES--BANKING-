
import React, { useState } from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  ArrowBackRounded,
  AccountBalanceWalletRounded,
  CheckCircleRounded,
  DescriptionRounded,
  EmailRounded,
  PictureAsPdfRounded,
  ReceiptLongRounded,
  SecurityRounded,
  TableChartRounded,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';

// ============================================================
// ZENIMONIES BANKING
// ACCOUNT STATEMENT
// Professional forest-green and white banking interface
// ============================================================

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

const GREEN = '#146C43';
const DARK_GREEN = '#104B32';
const LIGHT_GREEN = '#EAF5EE';
const BORDER = '#E1E9E4';
const TEXT = '#17372A';
const MUTED = '#718078';

const Statement: React.FC = () => {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('pdf');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const today = new Date();
  const todayString = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');

  // ==========================================================
  // REQUEST STATEMENT
  // ==========================================================

  const handleRequestStatement = async () => {
    setError('');
    setSuccess('');

    if (!startDate || !endDate) {
      setError(
        'Please select both the start date and end date.'
      );
      return;
    }

    if (startDate > endDate) {
      setError(
        'The start date cannot be after the end date.'
      );
      return;
    }

    if (endDate > todayString) {
      setError(
        'The statement end date cannot be in the future.'
      );
      return;
    }

    const start = new Date(
      `${startDate}T00:00:00`
    );

    const end = new Date(
      `${endDate}T00:00:00`
    );

    const days =
      Math.floor(
        (end.getTime() - start.getTime()) /
          86400000
      ) + 1;

    if (days > 365) {
      setError(
        'Please select a statement period of 365 days or less.'
      );
      return;
    }

    const token = localStorage.getItem(
      'zenimonies_token'
    );

    if (!token) {
      setError(
        'Your session has expired. Please sign in again.'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE}/statements/email`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            startDate,
            endDate,
            format,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to send your statement. Please try again.'
        );
      }

      setSuccess(
        data.message ||
          'Your statement has been sent to your registered email address.'
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#F5F8F6',
        pb: 5,
      }}
    >
      {/* ================================================== */}
      {/* TOP NAVIGATION */}
      {/* ================================================== */}

      <Box
        sx={{
          background: '#FFFFFF',
          borderBottom: `1px solid ${BORDER}`,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            maxWidth: 1100,
            mx: 'auto',
            px: { xs: 2, sm: 3 },
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={1.3}
            alignItems="center"
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                background: GREEN,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AccountBalanceWalletRounded
                sx={{
                  color: '#FFFFFF',
                  fontSize: 25,
                }}
              />
            </Box>

            <Box>
              <Typography
                sx={{
                  color: DARK_GREEN,
                  fontSize: { xs: 16, sm: 19 },
                  fontWeight: 900,
                  letterSpacing: 0.7,
                  lineHeight: 1.2,
                }}
              >
                ZENIMONIES
              </Typography>

              <Typography
                sx={{
                  color: MUTED,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 2,
                }}
              >
                BANKING
              </Typography>
            </Box>
          </Stack>

          <Button
            startIcon={<ArrowBackRounded />}
            onClick={() => navigate(-1)}
            sx={{
              color: GREEN,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 1.5,
              '&:hover': {
                background: LIGHT_GREEN,
              },
            }}
          >
            Back
          </Button>
        </Box>
      </Box>

      {/* ================================================== */}
      {/* MAIN CONTENT */}
      {/* ================================================== */}

      <Box
        sx={{
          maxWidth: 1000,
          mx: 'auto',
          px: { xs: 2, sm: 3 },
          pt: { xs: 3, sm: 5 },
        }}
      >
        {/* Page heading */}

        <Box sx={{ mb: 3.5 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 1.5 }}
          >
            <Box
              sx={{
                width: 5,
                height: 22,
                borderRadius: 5,
                background: GREEN,
              }}
            />

            <Typography
              sx={{
                color: GREEN,
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Banking Services
            </Typography>
          </Stack>

          <Typography
            sx={{
              color: TEXT,
              fontSize: {
                xs: 27,
                sm: 34,
              },
              fontWeight: 900,
              letterSpacing: -0.8,
              lineHeight: 1.2,
            }}
          >
            Account Statement
          </Typography>

          <Typography
            sx={{
              color: MUTED,
              fontSize: 15,
              mt: 1,
              lineHeight: 1.7,
              maxWidth: 580,
            }}
          >
            Access your account activity and receive
            your official transaction statement securely
            by email.
          </Typography>
        </Box>

        {/* ================================================= */}
        {/* SECURITY BANNER */}
        {/* ================================================= */}

        <Card
          elevation={0}
          sx={{
            mb: 3,
            borderRadius: 3,
            background: DARK_GREEN,
            color: '#FFFFFF',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <CardContent
            sx={{
              p: { xs: 2.5, sm: 3 },
              '&:last-child': {
                pb: { xs: 2.5, sm: 3 },
              },
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  background:
                    'rgba(255,255,255,0.13)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SecurityRounded
                  sx={{
                    fontSize: 27,
                    color: '#FFFFFF',
                  }}
                />
              </Box>

              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: 16,
                    mb: 0.5,
                  }}
                >
                  Your finances. Your privacy.
                </Typography>

                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: 13,
                    lineHeight: 1.7,
                  }}
                >
                  Statements are requested through
                  your authenticated account and sent
                  to your registered email address.
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* ================================================= */}
        {/* STATEMENT REQUEST FORM */}
        {/* ================================================= */}

        <Card
          elevation={0}
          sx={{
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            background: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          {/* Green card header */}

          <Box
            sx={{
              px: { xs: 2.5, sm: 4 },
              py: 2.5,
              borderBottom: `1px solid ${BORDER}`,
              background: '#FFFFFF',
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
            >
              <Box
                sx={{
                  width: 45,
                  height: 45,
                  borderRadius: 2.5,
                  background: LIGHT_GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ReceiptLongRounded
                  sx={{
                    color: GREEN,
                    fontSize: 26,
                  }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    color: TEXT,
                    fontSize: 18,
                  }}
                >
                  Request a statement
                </Typography>

                <Typography
                  sx={{
                    color: MUTED,
                    fontSize: 13,
                    mt: 0.3,
                  }}
                >
                  Choose your statement period and format.
                </Typography>
              </Box>
            </Stack>
          </Box>

          <CardContent
            sx={{
              p: { xs: 2.5, sm: 4 },
              '&:last-child': {
                pb: { xs: 3, sm: 4 },
              },
            }}
          >
            {/* Date range */}

            <Typography
              sx={{
                color: TEXT,
                fontSize: 14,
                fontWeight: 800,
                mb: 0.8,
              }}
            >
              Statement period
            </Typography>

            <Typography
              sx={{
                color: MUTED,
                fontSize: 13,
                mb: 2,
                lineHeight: 1.6,
              }}
            >
              Select the beginning and ending dates
              for your statement.
            </Typography>

            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              spacing={2}
              sx={{ mb: 3.5 }}
            >
              <TextField
                label="From date"
                type="date"
                fullWidth
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  max: endDate || todayString,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    background: '#FFFFFF',
                  },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
                    {
                      borderColor: GREEN,
                    },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: GREEN,
                  },
                }}
              />

              <TextField
                label="To date"
                type="date"
                fullWidth
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: startDate || undefined,
                  max: todayString,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5,
                    background: '#FFFFFF',
                  },
                  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline':
                    {
                      borderColor: GREEN,
                    },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: GREEN,
                  },
                }}
              />
            </Stack>

            <Divider
              sx={{
                mb: 3,
                borderColor: BORDER,
              }}
            />

            {/* Format selection */}

            <Typography
              sx={{
                color: TEXT,
                fontSize: 14,
                fontWeight: 800,
                mb: 0.8,
              }}
            >
              Statement format
            </Typography>

            <Typography
              sx={{
                color: MUTED,
                fontSize: 13,
                mb: 2,
                lineHeight: 1.6,
              }}
            >
              Select the file format you would like
              to receive.
            </Typography>

            <RadioGroup
              value={format}
              onChange={(e) => {
                setFormat(e.target.value);
                setError('');
                setSuccess('');
              }}
            >
              <Stack
                direction={{
                  xs: 'column',
                  sm: 'row',
                }}
                spacing={2}
              >
                {/* PDF OPTION */}

                <Card
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderRadius: 3,
                    borderWidth:
                      format === 'pdf' ? 2 : 1,
                    borderColor:
                      format === 'pdf'
                        ? GREEN
                        : BORDER,
                    background:
                      format === 'pdf'
                        ? '#F4FAF6'
                        : '#FFFFFF',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <FormControlLabel
                    value="pdf"
                    control={
                      <Radio
                        sx={{
                          color: '#A7B5AC',
                          '&.Mui-checked': {
                            color: GREEN,
                          },
                        }}
                      />
                    }
                    sx={{
                      m: 0,
                      p: 2,
                      width: '100%',
                      alignItems: 'center',
                    }}
                    label={
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                      >
                        <Box
                          sx={{
                            width: 46,
                            height: 46,
                            borderRadius: 2,
                            background: '#FCEDEE',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <PictureAsPdfRounded
                            sx={{
                              color: '#C43B45',
                              fontSize: 27,
                            }}
                          />
                        </Box>

                        <Box>
                          <Typography
                            sx={{
                              color: TEXT,
                              fontWeight: 800,
                              fontSize: 15,
                            }}
                          >
                            PDF
                          </Typography>

                          <Typography
                            sx={{
                              color: MUTED,
                              fontSize: 12,
                              mt: 0.3,
                            }}
                          >
                            Printable document
                          </Typography>
                        </Box>
                      </Stack>
                    }
                  />
                </Card>

                {/* CSV OPTION */}

                <Card
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderRadius: 3,
                    borderWidth:
                      format === 'csv' ? 2 : 1,
                    borderColor:
                      format === 'csv'
                        ? GREEN
                        : BORDER,
                    background:
                      format === 'csv'
                        ? '#F4FAF6'
                        : '#FFFFFF',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <FormControlLabel
                    value="csv"
                    control={
                      <Radio
                        sx={{
                          color: '#A7B5AC',
                          '&.Mui-checked': {
                            color: GREEN,
                          },
                        }}
                      />
                    }
                    sx={{
                      m: 0,
                      p: 2,
                      width: '100%',
                      alignItems: 'center',
                    }}
                    label={
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                      >
                        <Box
                          sx={{
                            width: 46,
                            height: 46,
                            borderRadius: 2,
                            background: LIGHT_GREEN,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <TableChartRounded
                            sx={{
                              color: GREEN,
                              fontSize: 27,
                            }}
                          />
                        </Box>

                        <Box>
                          <Typography
                            sx={{
                              color: TEXT,
                              fontWeight: 800,
                              fontSize: 15,
                            }}
                          >
                            CSV
                          </Typography>

                          <Typography
                            sx={{
                              color: MUTED,
                              fontSize: 12,
                              mt: 0.3,
                            }}
                          >
                            Spreadsheet format
                          </Typography>
                        </Box>
                      </Stack>
                    }
                  />
                </Card>
              </Stack>
            </RadioGroup>

            {/* Registered email */}

            <Box
              sx={{
                mt: 3,
                p: 2,
                borderRadius: 3,
                background: '#F5F8F6',
                border: `1px solid ${BORDER}`,
              }}
            >
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="flex-start"
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    background: '#FFFFFF',
                    border: `1px solid ${BORDER}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <EmailRounded
                    sx={{
                      color: GREEN,
                      fontSize: 22,
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    sx={{
                      color: TEXT,
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    Delivery to your registered email
                  </Typography>

                  <Typography
                    sx={{
                      color: MUTED,
                      fontSize: 13,
                      lineHeight: 1.7,
                      mt: 0.5,
                    }}
                  >
                    Your statement will be sent to
                    the email address registered to
                    your ZENIMONIES account. You do
                    not need to enter your email
                    address here.
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {/* Error */}

            {error && (
              <Alert
                severity="error"
                sx={{
                  mt: 3,
                  borderRadius: 2.5,
                }}
              >
                {error}
              </Alert>
            )}

            {/* Success */}

            {success && (
              <Alert
                severity="success"
                icon={<CheckCircleRounded />}
                sx={{
                  mt: 3,
                  borderRadius: 2.5,
                }}
              >
                {success}
              </Alert>
            )}

            {/* Submit */}

            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleRequestStatement}
              disabled={loading}
              startIcon={
                loading ? (
                  <CircularProgress
                    size={20}
                    color="inherit"
                  />
                ) : (
                  <EmailRounded />
                )
              }
              sx={{
                mt: 3,
                py: 1.8,
                borderRadius: 2.5,
                background: GREEN,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 15,
                textTransform: 'none',
                boxShadow:
                  '0 5px 14px rgba(20,108,67,0.16)',
                '&:hover': {
                  background: DARK_GREEN,
                  boxShadow:
                    '0 7px 18px rgba(20,108,67,0.22)',
                },
                '&.Mui-disabled': {
                  background: '#A4B7AC',
                  color: '#FFFFFF',
                },
              }}
            >
              {loading
                ? 'Sending your statement...'
                : 'Send Statement to My Email'}
            </Button>

            <Typography
              sx={{
                color: MUTED,
                fontSize: 12,
                textAlign: 'center',
                mt: 1.5,
                lineHeight: 1.6,
              }}
            >
              Please allow a few moments for your
              statement to be processed and delivered.
            </Typography>
          </CardContent>
        </Card>

        {/* ================================================= */}
        {/* STATEMENT CONTENT INFORMATION */}
        {/* ================================================= */}

        <Card
          elevation={0}
          sx={{
            mt: 3,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            background: '#FFFFFF',
          }}
        >
          <CardContent
            sx={{
              p: { xs: 2.5, sm: 3.5 },
              '&:last-child': {
                pb: { xs: 2.5, sm: 3.5 },
              },
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ mb: 2.5 }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  background: LIGHT_GREEN,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <DescriptionRounded
                  sx={{
                    color: GREEN,
                    fontSize: 25,
                  }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    color: TEXT,
                    fontSize: 17,
                    fontWeight: 800,
                  }}
                >
                  What's included
                </Typography>

                <Typography
                  sx={{
                    color: MUTED,
                    fontSize: 13,
                    mt: 0.3,
                  }}
                >
                  Your statement details
                </Typography>
              </Box>
            </Stack>

            <Stack spacing={1.8}>
              {[
                'Customer name, account number and registered address.',
                'Opening balance, total credits, total debits and closing balance.',
                'Transaction dates, references and descriptions.',
                'Beneficiary and institution details where available.',
                'Individual debit, credit, fee and balance columns.',
              ].map((item, index) => (
                <Stack
                  key={index}
                  direction="row"
                  spacing={1.5}
                  alignItems="flex-start"
                >
                  <CheckCircleRounded
                    sx={{
                      color: GREEN,
                      fontSize: 19,
                      mt: 0.2,
                      flexShrink: 0,
                    }}
                  />

                  <Typography
                    sx={{
                      color: '#52665A',
                      fontSize: 13.5,
                      lineHeight: 1.7,
                    }}
                  >
                    {item}
                  </Typography>
                </Stack>
              ))}
            </Stack>

            <Divider
              sx={{
                my: 2.5,
                borderColor: BORDER,
              }}
            />

            <Typography
              sx={{
                color: MUTED,
                fontSize: 12,
                lineHeight: 1.8,
              }}
            >
              Statement balances depend on recorded
              and reconciled ledger entries. Transaction
              fees are shown individually and are not
              included as a separate summary total.
            </Typography>
          </CardContent>
        </Card>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <Box
          sx={{
            textAlign: 'center',
            mt: 4,
            px: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{ mb: 1 }}
          >
            <AccountBalanceWalletRounded
              sx={{
                color: GREEN,
                fontSize: 19,
              }}
            />

            <Typography
              sx={{
                color: DARK_GREEN,
                fontWeight: 900,
                fontSize: 13,
                letterSpacing: 1,
              }}
            >
              ZENIMONIES BANKING
            </Typography>
          </Stack>

          <Typography
            sx={{
              color: MUTED,
              fontSize: 12,
              lineHeight: 1.8,
            }}
          >
            Simple. Secure. For a Better Tomorrow.
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Statement;
