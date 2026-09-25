
import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  EmailOutlined,
  PictureAsPdf,
  TableChart,
  ReceiptLong,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

const Statement: React.FC = () => {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState('pdf');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestStatement = async () => {
    setError('');
    setSuccess('');

    if (!startDate || !endDate) {
      setError('Please select both the start date and end date.');
      return;
    }

    if (startDate > endDate) {
      setError('The start date cannot be after the end date.');
      return;
    }

    const token = localStorage.getItem('zenimonies_token');

    if (!token) {
      setError('Your session has expired. Please sign in again.');
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            'Unable to send your statement. Please try again.'
        );
      }

      setSuccess(
        data.message ||
          'Your account statement has been requested successfully. Please check your registered email.'
      );
    } catch (err: any) {
      setError(
        err.message ||
          'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#f4f7fb',
        py: 3,
        px: { xs: 2, sm: 3 },
      }}
    >
      <Box sx={{ maxWidth: 850, mx: 'auto' }}>
        {/* Back Button */}

        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{
            mb: 3,
            color: '#123b70',
            fontWeight: 600,
          }}
        >
          Back
        </Button>

        {/* Page Heading */}

        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{ mb: 3 }}
        >
          <Box
            sx={{
              width: 55,
              height: 55,
              borderRadius: 3,
              background: '#e2efff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ReceiptLong
              sx={{ fontSize: 32, color: '#1265c5' }}
            />
          </Box>

          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: '#123b70',
              }}
            >
              Account Statement
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
            >
              Request your transaction statement securely.
            </Typography>
          </Box>
        </Stack>

        {/* Statement Request Card */}

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            border: '1px solid #e1e8f0',
            mb: 3,
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: '#123b70',
                mb: 1,
              }}
            >
              Request Statement
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Select the period you want to view. Your
              statement will be sent to your registered
              email address.
            </Typography>

            {/* Date Selection */}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ mb: 3 }}
            >
              <TextField
                label="From Date"
                type="date"
                fullWidth
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  max: endDate || undefined,
                }}
              />

              <TextField
                label="To Date"
                type="date"
                fullWidth
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: startDate || undefined,
                  max: new Date().toISOString().slice(0, 10),
                }}
              />
            </Stack>

            {/* Format Selection */}

            <Typography
              sx={{
                fontWeight: 700,
                color: '#123b70',
                mb: 1.5,
              }}
            >
              Choose Statement Format
            </Typography>

            <RadioGroup
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
              >
                <Card
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderRadius: 3,
                    borderColor:
                      format === 'pdf' ? '#1265c5' : '#dce3eb',
                    borderWidth: format === 'pdf' ? 2 : 1,
                    background:
                      format === 'pdf' ? '#f0f7ff' : '#fff',
                  }}
                >
                  <FormControlLabel
                    value="pdf"
                    control={
                      <Radio color="primary" />
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
                        <PictureAsPdf
                          sx={{
                            fontSize: 32,
                            color: '#d32f2f',
                          }}
                        />
                        <Box>
                          <Typography fontWeight={700}>
                            PDF
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                          >
                            Printable statement
                          </Typography>
                        </Box>
                      </Stack>
                    }
                  />
                </Card>

                <Card
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderRadius: 3,
                    borderColor:
                      format === 'csv' ? '#1265c5' : '#dce3eb',
                    borderWidth: format === 'csv' ? 2 : 1,
                    background:
                      format === 'csv' ? '#f0f7ff' : '#fff',
                  }}
                >
                  <FormControlLabel
                    value="csv"
                    control={
                      <Radio color="primary" />
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
                        <TableChart
                          sx={{
                            fontSize: 32,
                            color: '#16834a',
                          }}
                        />
                        <Box>
                          <Typography fontWeight={700}>
                            CSV
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
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

            {/* Email Information */}

            <Alert
              severity="info"
              icon={<EmailOutlined />}
              sx={{
                mt: 3,
                mb: 3,
                borderRadius: 2,
              }}
            >
              Your statement will be sent to the email
              address registered to your ZENIMONIES account.
              You do not need to enter your email address.
            </Alert>

            {/* Error and Success */}

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 2, borderRadius: 2 }}
              >
                {error}
              </Alert>
            )}

            {success && (
              <Alert
                severity="success"
                sx={{ mb: 2, borderRadius: 2 }}
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
                  <EmailOutlined />
                )
              }
              sx={{
                py: 1.7,
                borderRadius: 3,
                fontWeight: 700,
                textTransform: 'none',
                fontSize: 16,
                background:
                  'linear-gradient(135deg, #1265c5, #123b70)',
                '&:hover': {
                  background: '#123b70',
                },
              }}
            >
              {loading
                ? 'Requesting Statement...'
                : 'Send Statement to My Email'}
            </Button>
          </CardContent>
        </Card>

        {/* Statement Information */}

        <Card
          elevation={0}
          sx={{
            borderRadius: 4,
            background: '#eaf3ff',
            border: '1px solid #d5e6fb',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography
              fontWeight={700}
              color="#123b70"
              sx={{ mb: 1 }}
            >
              What your statement includes
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.9 }}
            >
              • Your account name and account number.
              <br />
              • Opening and closing balances.
              <br />
              • All eligible transactions within your
              selected period.
              <br />
              • Sender or recipient name and account
              details, where available.
              <br />
              • Transaction references, dates, amounts,
              and running balances.
              <br />
              • No Total Fees summary.
            </Typography>
          </CardContent>
        </Card>

        <Typography
          variant="caption"
          display="block"
          textAlign="center"
          color="text.secondary"
          sx={{ mt: 3 }}
        >
          ZENIMONIES BANKING • Simple • Secure • For a
          Better Tomorrow
        </Typography>
      </Box>
    </Box>
  );
};

export default Statement;
