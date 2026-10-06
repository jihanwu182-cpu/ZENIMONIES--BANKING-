import React, {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  ArrowBack,
  ChatBubbleOutline,
  CheckCircleOutline,
  Close,
  HelpOutline,
  Refresh,
  Send,
  SupportAgent,
  ConfirmationNumberOutlined,
  SmartToyOutlined,
  PersonOutline,
  AccessTimeOutlined,
  DoneAllOutlined,
  HourglassEmptyOutlined,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/Theme.tsx';

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE / COMPLAINTS & SUPPORT
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

// ============================================================
// TYPES
// ============================================================

type TicketStatus =
  | 'open'
  | 'pending'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | string;

type TicketPriority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent'
  | string;

type SupportCategory = {
  id: string;
  name: string;
  description?: string;
};

type SupportMessage = {
  id: string;
  sender_type?: string;
  sender_name?: string;
  message: string;
  created_at: string;
};

type SupportTicket = {
  id: string;
  ticket_number: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority?: TicketPriority;
  category_id?: string;
  category_name?: string;
  transaction_id?: string | null;
  connected_to_customer_care?: boolean;
  assigned_to?: string | null;
  created_at: string;
  updated_at?: string;
  last_message_at?: string;
  waiting_since?: string | null;
  customer_response_due_at?: string | null;
  auto_closed_at?: string | null;
  auto_close_reason?: string | null;
  messages?: SupportMessage[];
};

// ============================================================
// COLORS
// ============================================================

const LIGHT = {
  background: '#f5f8f6',
  surface: '#ffffff',
  surfaceAlt: '#f0f5f2',
  text: '#12372a',
  textSecondary: '#66756d',
  primary: '#087443',
  primaryDark: '#055a34',
  border: '#dce7e1',
  input: '#ffffff',
};

const DARK = {
  background: '#08120e',
  surface: '#101d17',
  surfaceAlt: '#16261e',
  text: '#f1f7f3',
  textSecondary: '#aabbb1',
  primary: '#36b878',
  primaryDark: '#29965f',
  border: '#263b31',
  input: '#101d17',
};

// ============================================================
// HELPERS
// ============================================================

function getToken(): string | null {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    null
  );
}

function formatDate(date?: string) {
  if (!date) return '';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusLabel(status: TicketStatus) {
  switch (status) {
    case 'open':
      return 'Open';

    case 'pending':
      return 'Waiting for Customer Care';

    case 'in_progress':
      return 'In Progress';

    case 'resolved':
      return 'Resolved';

    case 'closed':
      return 'Closed';

    default:
      return String(status)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) =>
          char.toUpperCase()
        );
  }
}

function statusColor(status: TicketStatus) {
  switch (status) {
    case 'open':
      return 'primary';

    case 'pending':
      return 'warning';

    case 'in_progress':
      return 'info';

    case 'resolved':
      return 'success';

    case 'closed':
      return 'default';

    default:
      return 'default';
  }
}

function isAssistantMessage(
  message: SupportMessage
) {
  return (
    message.sender_type === 'assistant' ||
    message.sender_type === 'bot'
  );
}

function isAgentMessage(
  message: SupportMessage
) {
  return (
    message.sender_type === 'agent' ||
    message.sender_type === 'admin'
  );
}

function isCustomerMessage(
  message: SupportMessage
) {
  return (
    message.sender_type === 'customer' ||
    message.sender_type === 'user'
  );
}

// ============================================================
// API
// ============================================================

async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getToken();

  const response = await fetch(
    `${API_BASE}${endpoint}`,
    {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
        ...(options.headers || {}),
      },
    }
  );

  const text = await response.text();

  let data: any = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {
      message: text,
    };
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        'Something went wrong. Please try again.'
    );
  }

  return data;
}

// ============================================================
// COMPONENT
// ============================================================

export default function Support() {
  const navigate = useNavigate();

  const { darkMode: isDarkMode } = useTheme();

  const colors = isDarkMode ? DARK : LIGHT;

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [categories, setCategories] = useState<
    SupportCategory[]
  >([]);

  const [tickets, setTickets] = useState<
    SupportTicket[]
  >([]);

  const [selectedTicket, setSelectedTicket] =
    useState<SupportTicket | null>(null);

  const [loading, setLoading] = useState(true);

  const [ticketLoading, setTicketLoading] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [connecting, setConnecting] =
    useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] = useState('');

  const [showCreateDialog, setShowCreateDialog] =
    useState(false);

  const [showTicketDialog, setShowTicketDialog] =
    useState(false);

  // ----------------------------------------------------------
  // FORM
  // ----------------------------------------------------------

  const [categoryId, setCategoryId] =
    useState('');

  const [subject, setSubject] =
    useState('');

  const [description, setDescription] =
    useState('');

  const [reply, setReply] =
    useState('');

  // ==========================================================
  // LOAD CATEGORIES
  // ==========================================================

  async function loadCategories() {
    try {
      const data = await apiRequest(
        '/support/categories'
      );

      const list =
        data?.data ||
        data?.categories ||
        [];

      if (Array.isArray(list)) {
        setCategories(list);
      }
    } catch (err) {
      console.error(
        'Unable to load support categories:',
        err
      );
    }
  }

  // ==========================================================
  // LOAD TICKETS
  // ==========================================================

  async function loadTickets() {
    setLoading(true);
    setError('');

    try {
      const data = await apiRequest(
        '/support/tickets'
      );

      const list =
        data?.data ||
        data?.tickets ||
        [];

      setTickets(
        Array.isArray(list)
          ? list
          : []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load your support tickets.'
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    const token = getToken();

    if (!token) {
      navigate('/login');
      return;
    }

    loadCategories();
    loadTickets();
  }, []);

  // ==========================================================
  // REAL CATEGORIES ONLY
  // ==========================================================

  const availableCategories = useMemo(() => {
    return categories.filter(
      (category) =>
        category?.id &&
        category?.name
    );
  }, [categories]);

  // ==========================================================
  // CREATE TICKET
  // ==========================================================

  async function handleCreateTicket(
    event: FormEvent
  ) {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!categoryId) {
      setError(
        'Please select a support category.'
      );
      return;
    }

    if (!subject.trim()) {
      setError(
        'Please enter a subject.'
      );
      return;
    }

    if (!description.trim()) {
      setError(
        'Please describe what happened.'
      );
      return;
    }

    setCreating(true);

    try {
      const data = await apiRequest(
        '/support/tickets',
        {
          method: 'POST',
          body: JSON.stringify({
            category_id: categoryId,
            subject: subject.trim(),
            description:
              description.trim(),
          }),
        }
      );

      const createdTicket =
        data?.data ||
        data?.ticket ||
        null;

      setShowCreateDialog(false);

      setCategoryId('');
      setSubject('');
      setDescription('');

      await loadTickets();

      if (createdTicket?.id) {
        await openTicket(
          createdTicket.id,
          true
        );
      }

      setSuccess(
        createdTicket?.ticket_number
          ? `Your complaint has been received. Ticket ${createdTicket.ticket_number} has been created.`
          : 'Your complaint has been received and your support case has been created.'
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to create your support case.'
      );
    } finally {
      setCreating(false);
    }
  }

  // ==========================================================
  // OPEN TICKET
  // ==========================================================

  async function openTicket(
    ticketId: string,
    showDialog = true
  ) {
    setTicketLoading(true);
    setError('');

    try {
      const data = await apiRequest(
        `/support/tickets/${ticketId}`
      );

      const ticket =
        data?.data ||
        data?.ticket ||
        null;

      if (!ticket) {
        throw new Error(
          'Support case could not be loaded.'
        );
      }

      setSelectedTicket(ticket);

      if (showDialog) {
        setShowTicketDialog(true);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to load this support case.'
      );
    } finally {
      setTicketLoading(false);
    }
  }

  // ==========================================================
  // CONNECT TO CUSTOMER CARE
  // ==========================================================

  async function connectToCustomerCare() {
    if (!selectedTicket) {
      return;
    }

    setConnecting(true);
    setError('');
    setSuccess('');

    try {
      await apiRequest(
        `/support/tickets/${selectedTicket.id}/connect`,
        {
          method: 'POST',
        }
      );

      await openTicket(
        selectedTicket.id,
        false
      );

      await loadTickets();

      setSuccess(
        'Your case has been connected to Customer Care.'
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to connect you to Customer Care.'
      );
    } finally {
      setConnecting(false);
    }
  }

  // ==========================================================
  // REPLY TO TICKET
  // ==========================================================

  async function handleReply(
    event: FormEvent
  ) {
    event.preventDefault();

    if (!selectedTicket) {
      return;
    }

    if (!reply.trim()) {
      return;
    }

    if (
      selectedTicket.status ===
      'closed'
    ) {
      return;
    }

    setSending(true);
    setError('');

    try {
      await apiRequest(
        `/support/tickets/${selectedTicket.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: reply.trim(),
          }),
        }
      );

      setReply('');

      await openTicket(
        selectedTicket.id,
        false
      );

      await loadTickets();
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to send your reply.'
      );
    } finally {
      setSending(false);
    }
  }

  // ==========================================================
  // CLOSE TICKET DIALOG
  // ==========================================================

  function closeTicketDialog() {
    setShowTicketDialog(false);
    setSelectedTicket(null);
    setReply('');
  }

  // ==========================================================
  // COUNTERS
  // ==========================================================

  const openCount = tickets.filter(
    (ticket) =>
      ticket.status === 'open' ||
      ticket.status === 'in_progress'
  ).length;

  const pendingCount = tickets.filter(
    (ticket) =>
      ticket.status === 'pending'
  ).length;

  const resolvedCount = tickets.filter(
    (ticket) =>
      ticket.status === 'resolved' ||
      ticket.status === 'closed'
  ).length;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor:
          colors.background,
        color: colors.text,
        pb: 8,
      }}
    >
      <Container
        maxWidth="md"
        sx={{
          pt: {
            xs: 2,
            sm: 4,
          },
        }}
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={2}
          sx={{
            mb: 3,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
          >
            <IconButton
              onClick={() => navigate(-1)}
              sx={{
                color: colors.text,
                backgroundColor:
                  colors.surface,
                border: `1px solid ${colors.border}`,
                '&:hover': {
                  backgroundColor:
                    colors.surfaceAlt,
                },
              }}
            >
              <ArrowBack />
            </IconButton>

            <Box>
              <Typography
                variant="h5"
                fontWeight={800}
                sx={{
                  color: colors.text,
                }}
              >
                Customer Care
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color:
                    colors.textSecondary,
                  mt: 0.3,
                }}
              >
                Complaints & Support
              </Typography>
            </Box>
          </Stack>

          <IconButton
            onClick={loadTickets}
            disabled={loading}
            sx={{
              color: colors.primary,
              backgroundColor:
                colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Refresh />
          </IconButton>
        </Stack>

        {/* ====================================================
            ALERTS
        ==================================================== */}

        {error && (
          <Alert
            severity="error"
            onClose={() => setError('')}
            sx={{
              mb: 2,
              borderRadius: 2,
            }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert
            severity="success"
            onClose={() => setSuccess('')}
            sx={{
              mb: 2,
              borderRadius: 2,
            }}
          >
            {success}
          </Alert>
        )}

        {/* ====================================================
            CUSTOMER CARE HERO
        ==================================================== */}

        <Card
          elevation={0}
          sx={{
            mb: 2.5,
            borderRadius: 3,
            background:
              isDarkMode
                ? 'linear-gradient(135deg, #0f2a1d 0%, #102019 100%)'
                : 'linear-gradient(135deg, #087443 0%, #075c36 100%)',
            color: '#ffffff',
            overflow: 'hidden',
          }}
        >
          <CardContent
            sx={{
              p: {
                xs: 2.5,
                sm: 3,
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
                  width: 54,
                  height: 54,
                  borderRadius: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    'rgba(255,255,255,0.14)',
                  flexShrink: 0,
                }}
              >
                <SupportAgent
                  sx={{
                    fontSize: 31,
                  }}
                />
              </Box>

              <Box>
                <Typography
                  fontWeight={800}
                  fontSize={18}
                >
                  How can we help?
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.88,
                    mt: 0.4,
                  }}
                >
                  Tell us what happened and
                  our Customer Care team will
                  assist you.
                </Typography>
              </Box>
            </Stack>

            <Button
              fullWidth
              variant="contained"
              startIcon={
                <ConfirmationNumberOutlined />
              }
              onClick={() =>
                setShowCreateDialog(true)
              }
              sx={{
                mt: 2.5,
                height: 48,
                borderRadius: 2,
                backgroundColor:
                  '#ffffff',
                color: '#087443',
                fontWeight: 800,
                '&:hover': {
                  backgroundColor:
                    '#f1f7f3',
                },
              }}
            >
              Report a Problem
            </Button>
          </CardContent>
        </Card>

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, 1fr)',
            },
            gap: 1.5,
            mb: 3,
          }}
        >
          <SummaryCard
            icon={
              <ChatBubbleOutline />
            }
            label="Open"
            value={openCount}
            colors={colors}
          />

          <SummaryCard
            icon={
              <HourglassEmptyOutlined />
            }
            label="Pending"
            value={pendingCount}
            colors={colors}
          />

          <SummaryCard
            icon={
              <CheckCircleOutline />
            }
            label="Resolved"
            value={resolvedCount}
            colors={colors}
          />
        </Box>

        {/* ====================================================
            TICKETS
        ==================================================== */}

        <Typography
          variant="h6"
          fontWeight={800}
          sx={{
            mb: 1.5,
            color: colors.text,
          }}
        >
          My Support Cases
        </Typography>

        {loading ? (
          <Box
            sx={{
              py: 8,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <CircularProgress
              sx={{
                color: colors.primary,
              }}
            />
          </Box>
        ) : tickets.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: 'center',
              borderRadius: 3,
              backgroundColor:
                colors.surface,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                mx: 'auto',
                mb: 2,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  isDarkMode
                    ? '#173025'
                    : '#eaf5ef',
              }}
            >
              <SupportAgent
                sx={{
                  fontSize: 32,
                  color: colors.primary,
                }}
              />
            </Box>

            <Typography
              fontWeight={800}
              sx={{
                color: colors.text,
                mb: 0.7,
              }}
            >
              No support cases yet
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color:
                  colors.textSecondary,
                maxWidth: 420,
                mx: 'auto',
              }}
            >
              If you need help with your
              account or a transaction,
              report the problem and our
              Customer Care team will assist
              you.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                colors={colors}
                onClick={() =>
                  openTicket(ticket.id)
                }
              />
            ))}
          </Stack>
        )}

        {/* ====================================================
            SECURITY NOTICE
        ==================================================== */}

        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 2.5,
            borderRadius: 3,
            backgroundColor:
              colors.surface,
            border: `1px solid ${colors.border}`,
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="flex-start"
          >
            <HelpOutline
              sx={{
                color: colors.primary,
                mt: 0.2,
              }}
            />

            <Box>
              <Typography
                fontWeight={800}
                sx={{
                  color: colors.text,
                }}
              >
                Stay safe
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color:
                    colors.textSecondary,
                  mt: 0.4,
                  lineHeight: 1.6,
                }}
              >
                ZENIMONIES Customer Care will
                never ask you for your password,
                PIN, OTP, CVV, passkey or other
                secret security information.
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>

      {/* ======================================================
          CREATE COMPLAINT DIALOG
      ====================================================== */}

      <Dialog
        open={showCreateDialog}
        onClose={() => {
          if (!creating) {
            setShowCreateDialog(false);
          }
        }}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor:
              colors.surface,
            color: colors.text,
          },
        }}
      >
        <DialogTitle
          sx={{
            fontWeight: 800,
            color: colors.text,
            pb: 1,
          }}
        >
          Report a Problem
        </DialogTitle>

        <DialogContent>
          <Typography
            variant="body2"
            sx={{
              color:
                colors.textSecondary,
              mb: 2.5,
              lineHeight: 1.6,
            }}
          >
            Tell us what happened. Your
            complaint will receive a unique
            ticket ID so you can follow the
            conversation with Customer Care.
          </Typography>

          <Stack spacing={2}>
            {/* CATEGORY */}

            <Box>
              <Typography
                variant="body2"
                fontWeight={700}
                sx={{
                  mb: 0.7,
                  color: colors.text,
                }}
              >
                What is the issue about?
              </Typography>

              <Select
                fullWidth
                value={categoryId}
                displayEmpty
                onChange={(event) =>
                  setCategoryId(
                    event.target.value
                  )
                }
                disabled={
                  availableCategories.length ===
                  0
                }
                sx={{
                  color: colors.text,
                  backgroundColor:
                    colors.input,
                  borderRadius: 2,
                }}
              >
                <MenuItem value="">
                  Select a category
                </MenuItem>

                {availableCategories.map(
                  (category) => (
                    <MenuItem
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </MenuItem>
                  )
                )}
              </Select>

              {availableCategories.length ===
                0 && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.7,
                    color:
                      colors.textSecondary,
                  }}
                >
                  Support categories are
                  currently unavailable.
                  Please try again shortly.
                </Typography>
              )}
            </Box>

            {/* SUBJECT */}

            <TextField
              fullWidth
              label="Subject"
              placeholder="Briefly describe the problem"
              value={subject}
              onChange={(event) =>
                setSubject(
                  event.target.value
                )
              }
              sx={inputStyles(colors)}
            />

            {/* DESCRIPTION */}

            <TextField
              fullWidth
              multiline
              minRows={5}
              label="What happened?"
              placeholder="Please explain what happened and how we can help..."
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              sx={inputStyles(colors)}
            />

            {/* SECURITY */}

            <Paper
              elevation={0}
              sx={{
                p: 1.7,
                borderRadius: 2,
                backgroundColor:
                  isDarkMode
                    ? '#13251c'
                    : '#f0f8f3',
                border: `1px solid ${colors.border}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color:
                    colors.textSecondary,
                  lineHeight: 1.6,
                }}
              >
                For your security, do not
                include passwords, PINs, OTPs,
                CVVs, passkeys or other secret
                authentication information.
              </Typography>
            </Paper>
          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            pt: 0.5,
          }}
        >
          <Button
            onClick={() =>
              setShowCreateDialog(false)
            }
            disabled={creating}
            sx={{
              color:
                colors.textSecondary,
              fontWeight: 700,
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleCreateTicket}
            disabled={
              creating ||
              availableCategories.length ===
                0
            }
            startIcon={
              creating ? (
                <CircularProgress
                  size={18}
                  color="inherit"
                />
              ) : (
                <Send />
              )
            }
            sx={{
              minWidth: 150,
              backgroundColor:
                colors.primary,
              '&:hover': {
                backgroundColor:
                  colors.primaryDark,
              },
              fontWeight: 800,
            }}
          >
            {creating
              ? 'Submitting...'
              : 'Submit Complaint'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ======================================================
          SUPPORT CASE / CHAT DIALOG
      ====================================================== */}

      <Dialog
        open={showTicketDialog}
        onClose={closeTicketDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            backgroundColor:
              colors.surface,
            color: colors.text,
            maxHeight: '92vh',
          },
        }}
      >
        {ticketLoading &&
        !selectedTicket ? (
          <Box
            sx={{
              p: 6,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <CircularProgress
              sx={{
                color: colors.primary,
              }}
            />
          </Box>
        ) : selectedTicket ? (
          <>
            {/* =================================================
                CHAT HEADER
            ================================================= */}

            <DialogTitle
              sx={{
                pb: 1.5,
              }}
            >
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={2}
              >
                <Box
                  sx={{
                    minWidth: 0,
                  }}
                >
                  <Typography
                    fontWeight={800}
                    sx={{
                      color: colors.text,
                    }}
                  >
                    {selectedTicket.subject}
                  </Typography>

                  <Stack
                    direction="row"
                    spacing={0.7}
                    alignItems="center"
                    sx={{
                      mt: 0.5,
                    }}
                  >
                    <ConfirmationNumberOutlined
                      sx={{
                        fontSize: 15,
                        color:
                          colors.primary,
                      }}
                    />

                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          colors.textSecondary,
                      }}
                    >
                      {
                        selectedTicket.ticket_number
                      }
                    </Typography>
                  </Stack>
                </Box>

                <IconButton
                  onClick={
                    closeTicketDialog
                  }
                  sx={{
                    color:
                      colors.textSecondary,
                  }}
                >
                  <Close />
                </IconButton>
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                sx={{
                  mt: 1.5,
                  flexWrap: 'wrap',
                  gap: 0.5,
                }}
              >
                <Chip
                  label={statusLabel(
                    selectedTicket.status
                  )}
                  color={
                    statusColor(
                      selectedTicket.status
                    ) as any
                  }
                  size="small"
                />

                {selectedTicket.priority && (
                  <Chip
                    label={
                      selectedTicket.priority
                    }
                    size="small"
                    variant="outlined"
                    sx={{
                      color:
                        colors.text,
                      borderColor:
                        colors.border,
                    }}
                  />
                )}
              </Stack>
            </DialogTitle>

            <Divider
              sx={{
                borderColor:
                  colors.border,
              }}
            />

            <DialogContent
              sx={{
                pt: 2,
              }}
            >
              {/* =================================================
                  TICKET INTRO
              ================================================= */}

              <Paper
                elevation={0}
                sx={{
                  p: 1.7,
                  mb: 2,
                  borderRadius: 2,
                  backgroundColor:
                    colors.surfaceAlt,
                  border: `1px solid ${colors.border}`,
                }}
              >
                <Stack
                  direction="row"
                  spacing={1.2}
                  alignItems="flex-start"
                >
                  <ConfirmationNumberOutlined
                    sx={{
                      color:
                        colors.primary,
                      fontSize: 20,
                      mt: 0.1,
                    }}
                  />

                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      sx={{
                        color:
                          colors.text,
                      }}
                    >
                      Support Case
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          colors.textSecondary,
                        display:
                          'block',
                        mt: 0.3,
                      }}
                    >
                      Keep your ticket ID
                      for reference when
                      contacting ZENIMONIES
                      Customer Care.
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              {/* =================================================
                  ORIGINAL COMPLAINT
              ================================================= */}

              {selectedTicket.description && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2,
                    borderRadius: 2,
                    backgroundColor:
                      colors.surfaceAlt,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={800}
                    sx={{
                      color:
                        colors.primary,
                      display:
                        'block',
                      mb: 0.7,
                    }}
                  >
                    Your complaint
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        colors.text,
                      whiteSpace:
                        'pre-wrap',
                      lineHeight: 1.6,
                    }}
                  >
                    {
                      selectedTicket.description
                    }
                  </Typography>
                </Paper>
              )}

              {/* =================================================
                  CONNECT TO CUSTOMER CARE
              ================================================= */}

              {!selectedTicket.connected_to_customer_care &&
                selectedTicket.status !==
                  'closed' &&
                selectedTicket.status !==
                  'resolved' && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      mb: 2,
                      borderRadius: 2.5,
                      backgroundColor:
                        isDarkMode
                          ? '#13251c'
                          : '#eff9f3',
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.4}
                      alignItems="flex-start"
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          borderRadius:
                            '50%',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          backgroundColor:
                            isDarkMode
                              ? '#1e5138'
                              : '#d9f1e3',
                          flexShrink: 0,
                        }}
                      >
                        <SmartToyOutlined
                          sx={{
                            color:
                              colors.primary,
                          }}
                        />
                      </Box>

                      <Box
                        sx={{
                          flex: 1,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            color:
                              colors.text,
                          }}
                        >
                          ZENIMONIES
                          Support
                          Assistant
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.6,
                            color:
                              colors.text,
                            lineHeight: 1.6,
                          }}
                        >
                          Thank you for
                          contacting
                          ZENIMONIES
                          Customer Care.
                          I've received
                          your complaint
                          and created
                          your support
                          case.
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.8,
                            color:
                              colors.text,
                            lineHeight: 1.6,
                          }}
                        >
                          I'm unable to
                          resolve this
                          issue
                          automatically.
                          Would you
                          like me to
                          connect you
                          with a
                          Customer Care
                          agent?
                        </Typography>

                        <Stack
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
                            variant="contained"
                            onClick={
                              connectToCustomerCare
                            }
                            disabled={
                              connecting
                            }
                            startIcon={
                              connecting ? (
                                <CircularProgress
                                  size={
                                    16
                                  }
                                  color="inherit"
                                />
                              ) : (
                                <SupportAgent />
                              )
                            }
                            sx={{
                              backgroundColor:
                                colors.primary,
                              fontWeight: 800,
                              textTransform:
                                'none',
                              '&:hover':
                                {
                                  backgroundColor:
                                    colors.primaryDark,
                                },
                            }}
                          >
                            {connecting
                              ? 'Connecting...'
                              : 'Connect me to Customer Care'}
                          </Button>

                          <Button
                            variant="outlined"
                            onClick={
                              closeTicketDialog
                            }
                            disabled={
                              connecting
                            }
                            sx={{
                              borderColor:
                                colors.border,
                              color:
                                colors.text,
                              fontWeight: 700,
                              textTransform:
                                'none',
                            }}
                          >
                            Not now
                          </Button>
                        </Stack>
                      </Box>
                    </Stack>
                  </Paper>
                )}

              {/* =================================================
                  CONVERSATION
              ================================================= */}

              <Typography
                variant="body2"
                fontWeight={800}
                sx={{
                  color: colors.text,
                  mb: 1.2,
                }}
              >
                Conversation
              </Typography>

              <Stack spacing={1.6}>
                {(
                  selectedTicket.messages ||
                  []
                ).map((message) => {
                  const assistant =
                    isAssistantMessage(
                      message
                    );

                  const agent =
                    isAgentMessage(
                      message
                    );

                  const customer =
                    isCustomerMessage(
                      message
                    );

                  const isHumanSupport =
                    agent;

                  return (
                    <Box
                      key={message.id}
                      sx={{
                        display:
                          'flex',
                        justifyContent:
                          customer
                            ? 'flex-end'
                            : 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth:
                            '88%',
                        }}
                      >
                        {/* SENDER */}

                        <Stack
                          direction="row"
                          spacing={0.7}
                          alignItems="center"
                          sx={{
                            mb: 0.5,
                            px: 0.5,
                          }}
                        >
                          {assistant ? (
                            <SmartToyOutlined
                              sx={{
                                fontSize: 15,
                                color:
                                  colors.primary,
                              }}
                            />
                          ) : isHumanSupport ? (
                            <PersonOutline
                              sx={{
                                fontSize: 15,
                                color:
                                  colors.primary,
                              }}
                            />
                          ) : (
                            <PersonOutline
                              sx={{
                                fontSize: 15,
                                color:
                                  colors.textSecondary,
                              }}
                            />
                          )}

                          <Typography
                            variant="caption"
                            fontWeight={800}
                            sx={{
                              color:
                                colors.text,
                            }}
                          >
                            {assistant
                              ? 'ZENIMONIES Support Assistant'
                              : isHumanSupport
                              ? message.sender_name ||
                                'Customer Care Agent'
                              : 'You'}
                          </Typography>
                        </Stack>

                        {/* MESSAGE */}

                        <Paper
                          elevation={0}
                          sx={{
                            p: 1.7,
                            borderRadius: 2.5,
                            backgroundColor:
                              customer
                                ? colors.primary
                                : assistant
                                ? isDarkMode
                                  ? '#13251c'
                                  : '#eef8f2'
                                : colors.surfaceAlt,
                            color:
                              customer
                                ? '#ffffff'
                                : colors.text,
                            border:
                              customer
                                ? 'none'
                                : `1px solid ${colors.border}`,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace:
                                'pre-wrap',
                              lineHeight: 1.6,
                            }}
                          >
                            {
                              message.message
                            }
                          </Typography>
                        </Paper>

                        {/* DATE */}

                        <Typography
                          variant="caption"
                          sx={{
                            display:
                              'block',
                            mt: 0.4,
                            px: 0.5,
                            color:
                              colors.textSecondary,
                            textAlign:
                              customer
                                ? 'right'
                                : 'left',
                          }}
                        >
                          {formatDate(
                            message.created_at
                          )}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>

              {/* =================================================
                  WAITING FOR CUSTOMER
              ================================================= */}

              {selectedTicket.status ===
                'pending' &&
                selectedTicket.connected_to_customer_care && (
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 2,
                      p: 1.7,
                      borderRadius: 2,
                      backgroundColor:
                        isDarkMode
                          ? '#302815'
                          : '#fff8e8',
                      border:
                        '1px solid rgba(180,140,40,0.25)',
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.2}
                      alignItems="flex-start"
                    >
                      <AccessTimeOutlined
                        sx={{
                          color:
                            '#b1841e',
                        }}
                      />

                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={800}
                          sx={{
                            color:
                              colors.text,
                          }}
                        >
                          Customer Care is
                          waiting for a
                          response
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{
                            display:
                              'block',
                            mt: 0.4,
                            color:
                              colors.textSecondary,
                            lineHeight: 1.5,
                          }}
                        >
                          Please reply to
                          this conversation
                          if Customer Care
                          has requested
                          additional
                          information.
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                )}

              {/* =================================================
                  RESOLVED
              ================================================= */}

              {selectedTicket.status ===
                'resolved' && (
                <Paper
                  elevation={0}
                  sx={{
                    mt: 2,
                    p: 1.7,
                    borderRadius: 2,
                    backgroundColor:
                      isDarkMode
                        ? '#13251c'
                        : '#eef8f2',
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.2}
                    alignItems="center"
                  >
                    <DoneAllOutlined
                      sx={{
                        color:
                          colors.primary,
                      }}
                    />

                    <Box>
                      <Typography
                        variant="body2"
                        fontWeight={800}
                        sx={{
                          color:
                            colors.text,
                        }}
                      >
                        Case resolved
                      </Typography>

                      <Typography
                        variant="caption"
                        sx={{
                          color:
                            colors.textSecondary,
                        }}
                      >
                        Your Customer Care
                        case has been marked
                        as resolved.
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              )}

              {/* =================================================
                  CLOSED
              ================================================= */}

              {selectedTicket.status ===
                'closed' && (
                <Alert
                  severity="info"
                  sx={{
                    mt: 2,
                    borderRadius: 2,
                  }}
                >
                  This conversation has been
                  closed. If you still need
                  assistance, please create a
                  new Customer Care complaint.
                </Alert>
              )}

              {/* =================================================
                  CUSTOMER REPLY
              ================================================= */}

              {selectedTicket.status !==
                'closed' &&
                selectedTicket.status !==
                  'resolved' && (
                  <Box
                    component="form"
                    onSubmit={handleReply}
                    sx={{
                      mt: 2.5,
                    }}
                  >
                    <TextField
                      fullWidth
                      multiline
                      minRows={3}
                      placeholder="Write a message to Customer Care..."
                      value={reply}
                      onChange={(event) =>
                        setReply(
                          event.target.value
                        )
                      }
                      sx={inputStyles(
                        colors
                      )}
                    />

                    <Typography
                      variant="caption"
                      sx={{
                        display:
                          'block',
                        mt: 0.7,
                        color:
                          colors.textSecondary,
                      }}
                    >
                      Never send passwords,
                      PINs, OTPs, CVVs or
                      other secret security
                      information.
                    </Typography>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={
                        sending ||
                        !reply.trim()
                      }
                      startIcon={
                        sending ? (
                          <CircularProgress
                            size={18}
                            color="inherit"
                          />
                        ) : (
                          <Send />
                        )
                      }
                      sx={{
                        mt: 1.2,
                        height: 46,
                        backgroundColor:
                          colors.primary,
                        fontWeight: 800,
                        textTransform:
                          'none',
                        '&:hover': {
                          backgroundColor:
                            colors.primaryDark,
                        },
                      }}
                    >
                      {sending
                        ? 'Sending...'
                        : 'Send Message'}
                    </Button>
                  </Box>
                )}
            </DialogContent>
          </>
        ) : null}
      </Dialog>
    </Box>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  colors: typeof LIGHT;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2.5,
        backgroundColor:
          colors.surface,
        border: `1px solid ${colors.border}`,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.3}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor:
              colors.surfaceAlt,
            color: colors.primary,
          }}
        >
          {icon}
        </Box>

        <Box>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{
              color: colors.text,
              lineHeight: 1,
            }}
          >
            {value}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color:
                colors.textSecondary,
            }}
          >
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

// ============================================================
// TICKET CARD
// ============================================================

function TicketCard({
  ticket,
  colors,
  onClick,
}: {
  ticket: SupportTicket;
  colors: typeof LIGHT;
  onClick: () => void;
}) {
  return (
    <Card
      elevation={0}
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        borderRadius: 2.5,
        backgroundColor:
          colors.surface,
        border: `1px solid ${colors.border}`,
        transition: '0.2s ease',
        '&:hover': {
          transform:
            'translateY(-1px)',
          borderColor:
            colors.primary,
        },
      }}
    >
      <CardContent
        sx={{
          p: 2,
          '&:last-child': {
            pb: 2,
          },
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
        >
          <Box
            sx={{
              minWidth: 0,
            }}
          >
            <Typography
              fontWeight={800}
              sx={{
                color: colors.text,
                mb: 0.5,
              }}
            >
              {ticket.subject}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color:
                  colors.textSecondary,
              }}
            >
              {ticket.ticket_number}
            </Typography>
          </Box>

          <Chip
            label={statusLabel(
              ticket.status
            )}
            color={
              statusColor(
                ticket.status
              ) as any
            }
            size="small"
          />
        </Stack>

        <Divider
          sx={{
            my: 1.5,
            borderColor:
              colors.border,
          }}
        />

        <Stack
          direction="row"
          justifyContent="space-between"
          spacing={2}
        >
          <Typography
            variant="caption"
            sx={{
              color:
                colors.textSecondary,
            }}
          >
            {ticket.category_name ||
              'Customer Support'}
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color:
                colors.textSecondary,
            }}
          >
            {formatDate(
              ticket.updated_at ||
                ticket.created_at
            )}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ============================================================
// INPUT STYLES
// ============================================================

function inputStyles(
  colors: typeof LIGHT
) {
  return {
    '& .MuiInputLabel-root': {
      color: colors.textSecondary,
    },

    '& .MuiInputLabel-root.Mui-focused': {
      color: colors.primary,
    },

    '& .MuiOutlinedInput-root': {
      color: colors.text,
      backgroundColor:
        colors.input,

      '& fieldset': {
        borderColor:
          colors.border,
      },

      '&:hover fieldset': {
        borderColor:
          colors.primary,
      },

      '&.Mui-focused fieldset': {
        borderColor:
          colors.primary,
      },
    },

    '& .MuiInputBase-input::placeholder':
      {
        color: colors.textSecondary,
        opacity: 0.8,
      },
  };
}
