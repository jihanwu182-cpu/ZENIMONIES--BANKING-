import React, {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  ArrowBack,
  ArrowForwardIos,
  CheckCircleOutline,
  Close,
  ConfirmationNumberOutlined,
  Refresh,
  Send,
  SmartToyOutlined,
  SupportAgent,
} from '@mui/icons-material';

import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme/Theme.tsx';

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE — LIVE CHAT
// ============================================================

const API_BASE =
  process.env.REACT_APP_API_URL ||
  'https://zenimonies-banking.onrender.com/api';

// ============================================================
// TYPES
// ============================================================

type SupportCategory = {
  id: string;
  name: string;
  description?: string;
};

type SupportMessage = {
  id: string;
  sender_user_id?: string | null;
  sender_type?: string;
  sender_name?: string;
  message: string;
  created_at: string;
};

type SupportTicket = {
  id: string;
  ticket_number?: string;
  subject: string;
  description?: string;
  status: string;
  priority?: string;
  category_id?: string;
  category_name?: string;
  connected_to_customer_care?: boolean;
  assigned_to?: string | null;
  assigned_agent_name?: string | null;
  created_at: string;
  updated_at?: string;
  messages?: SupportMessage[];
};

// ============================================================
// COLORS
// ============================================================

const LIGHT = {
  background: '#f6f9f7',
  surface: '#ffffff',
  surfaceAlt: '#edf6f1',
  text: '#12372a',
  textSecondary: '#6b7b73',
  primary: '#087443',
  primaryDark: '#055a34',
  border: '#dce8e1',
  bubbleAssistant: '#edf8f2',
};

const DARK = {
  background: '#08120e',
  surface: '#101d17',
  surfaceAlt: '#172a21',
  text: '#f1f7f3',
  textSecondary: '#aabbb1',
  primary: '#36b878',
  primaryDark: '#29965f',
  border: '#263b31',
  bubbleAssistant: '#13251c',
};

// ============================================================
// COMMON ISSUES
// ============================================================

const FALLBACK_CATEGORIES = [
  {
    key: 'transfer',
    title: 'Bank Transfer',
    description: 'Transfers and recipient issues',
    icon: '↔',
  },
  {
    key: 'account',
    title: 'Account',
    description: 'Account and profile',
    icon: '▣',
  },
  {
    key: 'airtime_data',
    title: 'Airtime & Data',
    description: 'Airtime and data purchases',
    icon: '▤',
  },
  {
    key: 'bills',
    title: 'Bills Payment',
    description: 'Electricity, TV and bills',
    icon: '▥',
  },
  {
    key: 'gift_cards',
    title: 'Gift Cards',
    description: 'Buy and sell gift cards',
    icon: '◇',
  },
  {
    key: 'kyc',
    title: 'KYC & Verification',
    description: 'Identity verification',
    icon: '✓',
  },
  {
    key: 'card_pos',
    title: 'Card / POS',
    description: 'Card and POS support',
    icon: '▭',
  },
  {
    key: 'other',
    title: 'Other',
    description: 'Something else',
    icon: '⋯',
  },
];

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

function formatTime(date?: string) {
  if (!date) return '';

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return '';
  }

  return value.toLocaleTimeString('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function isAssistant(message: SupportMessage) {
  return (
    message.sender_type === 'assistant' ||
    message.sender_type === 'bot'
  );
}

function isAgent(message: SupportMessage) {
  return (
    message.sender_type === 'agent' ||
    message.sender_type === 'admin'
  );
}

function isCustomer(message: SupportMessage) {
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
        'Unable to complete this request.'
    );
  }

  return data;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function Support() {
  const navigate = useNavigate();

  const { darkMode: isDarkMode } = useTheme();

  const colors = isDarkMode ? DARK : LIGHT;

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);

  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [categories, setCategories] =
    useState<SupportCategory[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<SupportCategory | null>(null);

  const [selectedIssue, setSelectedIssue] =
    useState('');

  const [message, setMessage] =
    useState('');

  const [ticket, setTicket] =
    useState<SupportTicket | null>(null);

  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [sending, setSending] =
    useState(false);

  const [connecting, setConnecting] =
    useState(false);

  const [error, setError] =
    useState('');

  const [showCases, setShowCases] =
    useState(false);

  const [tickets, setTickets] =
    useState<SupportTicket[]>([]);

  const [loadingCases, setLoadingCases] =
    useState(false);

  // ==========================================================
  // LOAD CATEGORIES
  // ==========================================================

  async function loadCategories() {
    setLoadingCategories(true);

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
    } finally {
      setLoadingCategories(false);
    }
  }

  // ==========================================================
  // LOAD CASES
  // ==========================================================

  async function loadCases() {
    setLoadingCases(true);
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
          'Unable to retrieve your Customer Care cases.'
      );
    } finally {
      setLoadingCases(false);
    }
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (!getToken()) {
      navigate('/login');
      return;
    }

    loadCategories();
  }, []);

  // ==========================================================
  // SCROLL CHAT
  // ==========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [
    ticket?.messages?.length,
    ticket?.id,
  ]);

  // ==========================================================
  // CATEGORY LIST
  // ==========================================================

  const displayCategories = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((category) => ({
        ...category,
      }));
    }

    return [];
  }, [categories]);

  // ==========================================================
  // COMMON ISSUE SUGGESTIONS
  // ==========================================================

  const issueSuggestions = useMemo(() => {
    const name =
      selectedCategory?.name
        ?.toLowerCase()
        .trim();

    if (
      name?.includes('transfer') ||
      name?.includes('bank')
    ) {
      return [
        'Transfer successful but recipient has not received it',
        'My bank transfer is still processing',
        'My transfer failed',
        'I transferred to the wrong account',
      ];
    }

    if (
      name?.includes('airtime') ||
      name?.includes('data')
    ) {
      return [
        'Airtime was not received',
        'Data was not received',
        'I was charged but the purchase failed',
        'I need help with an airtime or data purchase',
      ];
    }

    if (
      name?.includes('bill')
    ) {
      return [
        'My bill payment failed',
        'I was charged but the bill was not paid',
        'My payment is still processing',
        'I need help with a bill payment',
      ];
    }

    if (
      name?.includes('gift')
    ) {
      return [
        'I need help buying a gift card',
        'I need help selling a gift card',
        'My gift card transaction is pending',
        'My gift card transaction failed',
      ];
    }

    if (
      name?.includes('kyc') ||
      name?.includes('verification')
    ) {
      return [
        'My verification is still pending',
        'My verification was rejected',
        'I need help completing verification',
        'I have a problem with my identity document',
      ];
    }

    if (
      name?.includes('card') ||
      name?.includes('pos')
    ) {
      return [
        'My card is not working',
        'I have a POS problem',
        'I was charged but the transaction failed',
        'I need help with my card or POS',
      ];
    }

    if (
      name?.includes('account')
    ) {
      return [
        'I have a problem with my account',
        'I need help updating my profile',
        'I cannot access my account',
        'I have an account question',
      ];
    }

    return [
      'I need help with a transaction',
      'I have an account problem',
      'I need help with a payment',
      'Something else is wrong',
    ];
  }, [selectedCategory]);

  // ==========================================================
  // CREATE CASE
  // ==========================================================

  async function createCase(
    complaint: string
  ) {
    if (!selectedCategory) {
      setError(
        'Please select an issue category first.'
      );
      return;
    }

    if (!complaint.trim()) {
      return;
    }

    setCreating(true);
    setError('');

    try {
      const subject =
        selectedIssue ||
        selectedCategory.name;

      const data = await apiRequest(
        '/support/tickets',
        {
          method: 'POST',
          body: JSON.stringify({
            category_id:
              selectedCategory.id,
            subject: subject.trim(),
            description:
              complaint.trim(),
          }),
        }
      );

      const created =
        data?.data ||
        data?.ticket ||
        null;

      if (!created?.id) {
        throw new Error(
          'Your support case could not be created.'
        );
      }

      setTicket({
        ...created,
        messages:
          created.messages || [],
      });

      setMessage('');
      setSelectedIssue('');
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to create your Customer Care case.'
      );
    } finally {
      setCreating(false);
    }
  }

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================

  async function handleSendMessage(
    event?: FormEvent
  ) {
    event?.preventDefault();

    const text = message.trim();

    if (!text) return;

    // --------------------------------------------------------
    // First message creates the support case.
    // --------------------------------------------------------

    if (!ticket) {
      await createCase(text);
      return;
    }

    if (ticket.status === 'closed') {
      return;
    }

    setSending(true);
    setError('');

    try {
      await apiRequest(
        `/support/tickets/${ticket.id}/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            message: text,
          }),
        }
      );

      setMessage('');

      await refreshTicket(
        ticket.id
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to send your message.'
      );
    } finally {
      setSending(false);
    }
  }

  // ==========================================================
  // REFRESH CURRENT CASE
  // ==========================================================

  async function refreshTicket(
    ticketId: string
  ) {
    try {
      const data = await apiRequest(
        `/support/tickets/${ticketId}`
      );

      const updated =
        data?.data ||
        data?.ticket ||
        null;

      if (updated) {
        setTicket(updated);
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to refresh this conversation.'
      );
    }
  }

  // ==========================================================
  // CONNECT CUSTOMER CARE
  // ==========================================================

  async function connectToCustomerCare() {
    if (!ticket) return;

    setConnecting(true);
    setError('');

    try {
      await apiRequest(
        `/support/tickets/${ticket.id}/connect`,
        {
          method: 'POST',
        }
      );

      await refreshTicket(
        ticket.id
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
  // OPEN EXISTING CASE
  // ==========================================================

  async function openExistingCase(
    ticketId: string
  ) {
    setError('');

    try {
      const data = await apiRequest(
        `/support/tickets/${ticketId}`
      );

      const existing =
        data?.data ||
        data?.ticket ||
        null;

      if (!existing) {
        throw new Error(
          'Unable to open this case.'
        );
      }

      setTicket(existing);
      setShowCases(false);
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to open this case.'
      );
    }
  }

  // ==========================================================
  // RESET CHAT
  // ==========================================================

  function startNewConversation() {
    setTicket(null);
    setSelectedCategory(null);
    setSelectedIssue('');
    setMessage('');
    setError('');
    setShowCases(false);
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor:
          colors.background,
        color: colors.text,
        overflow: 'hidden',
      }}
    >
      {/* =====================================================
          HEADER
      ===================================================== */}

      <Box
        sx={{
          height: ticket?.ticket_number
            ? 88
            : 72,
          flexShrink: 0,
          backgroundColor:
            isDarkMode
              ? '#101714'
              : '#ffffff',
          borderBottom:
            `1px solid ${colors.border}`,
          display: 'flex',
          alignItems: 'center',
          px: 1.5,
          zIndex: 5,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            color: colors.text,
            mr: 1,
          }}
        >
          <ArrowBack />
        </IconButton>

        <Avatar
          sx={{
            width: 38,
            height: 38,
            mr: 1.2,
            backgroundColor:
              isDarkMode
                ? '#173d2b'
                : '#e5f4eb',
            color: colors.primary,
          }}
        >
          <SupportAgent
            sx={{ fontSize: 22 }}
          />
        </Avatar>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <Typography
            fontWeight={800}
            fontSize={17}
            sx={{
              color: colors.text,
              lineHeight: 1.2,
            }}
          >
            Live Chat
          </Typography>

          <Typography
            variant="caption"
            sx={{
              color:
                colors.textSecondary,
              display: 'block',
              mt: 0.2,
            }}
          >
            ZENIMONIES Customer Care
          </Typography>

          {/* =================================================
              TICKET ID
          ================================================= */}

          {ticket?.ticket_number && (
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{
                mt: 0.25,
              }}
            >
              <ConfirmationNumberOutlined
                sx={{
                  fontSize: 13,
                  color:
                    colors.primary,
                }}
              />

              <Typography
                variant="caption"
                sx={{
                  color:
                    colors.primary,
                  fontWeight: 800,
                  letterSpacing:
                    '0.15px',
                }}
              >
                Ticket ID: {ticket.ticket_number}
              </Typography>
            </Stack>
          )}
        </Box>

        <IconButton
          onClick={() => {
            if (ticket?.id) {
              refreshTicket(ticket.id);
            } else {
              loadCategories();
            }
          }}
          sx={{
            color: colors.primary,
          }}
        >
          <Refresh />
        </IconButton>
      </Box>

      {/* =====================================================
          CHAT AREA
      ===================================================== */}

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: {
            xs: 1.5,
            sm: 3,
          },
          py: 2,
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 760,
            mx: 'auto',
          }}
        >
          {/* ERROR */}

          {error && (
            <Alert
              severity="error"
              onClose={() =>
                setError('')
              }
              sx={{
                mb: 2,
                borderRadius: 2,
              }}
            >
              {error}
            </Alert>
          )}

          {/* =================================================
              EXISTING CONVERSATION
          ================================================= */}

          {ticket ? (
            <>
              {/* CASE STATUS */}

              <Box
                sx={{
                  textAlign: 'center',
                  mb: 2,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color:
                      colors.textSecondary,
                  }}
                >
                  Secure Customer Care
                  conversation
                </Typography>

                {/* TICKET ID ALSO VISIBLE IN CHAT */}

                {ticket.ticket_number && (
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 0.4,
                      color:
                        colors.primary,
                      fontWeight: 800,
                    }}
                  >
                    Ticket ID:{' '}
                    {ticket.ticket_number}
                  </Typography>
                )}
              </Box>

              {/* MESSAGES */}

              <Stack spacing={2}>
                {(ticket.messages || []).map(
                  (item) => {
                    const assistant =
                      isAssistant(item);

                    const agent =
                      isAgent(item);

                    const customer =
                      isCustomer(item);

                    return (
                      <Box
                        key={item.id}
                        sx={{
                          display: 'flex',
                          justifyContent:
                            customer
                              ? 'flex-end'
                              : 'flex-start',
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: {
                              xs: '90%',
                              sm: '75%',
                            },
                          }}
                        >
                          {/* SENDER */}

                          {!customer && (
                            <Stack
                              direction="row"
                              spacing={0.7}
                              alignItems="center"
                              sx={{
                                mb: 0.5,
                                ml: 0.5,
                              }}
                            >
                              {assistant ? (
                                <SmartToyOutlined
                                  sx={{
                                    fontSize: 16,
                                    color:
                                      colors.primary,
                                  }}
                                />
                              ) : (
                                <SupportAgent
                                  sx={{
                                    fontSize: 16,
                                    color:
                                      colors.primary,
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
                                  : item.sender_name ||
                                    'Customer Care Agent'}
                              </Typography>
                            </Stack>
                          )}

                          {/* BUBBLE */}

                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.7,
                              borderRadius:
                                customer
                                  ? '18px 18px 5px 18px'
                                  : '18px 18px 18px 5px',
                              backgroundColor:
                                customer
                                  ? colors.primary
                                  : assistant
                                  ? colors.bubbleAssistant
                                  : colors.surface,
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
                                lineHeight: 1.65,
                              }}
                            >
                              {item.message}
                            </Typography>
                          </Paper>

                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
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
                            {formatTime(
                              item.created_at
                            )}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  }
                )}
              </Stack>

              {/* CONNECT BUTTON */}

              {!ticket.connected_to_customer_care &&
                ticket.status !== 'closed' &&
                ticket.status !== 'resolved' && (
                  <Paper
                    elevation={0}
                    sx={{
                      mt: 2.5,
                      p: 2,
                      borderRadius: 3,
                      backgroundColor:
                        colors.surface,
                      border:
                        `1px solid ${colors.border}`,
                    }}
                  >
                    <Stack
                      spacing={1.5}
                    >
                      <Stack
                        direction="row"
                        spacing={1.2}
                        alignItems="center"
                      >
                        <SmartToyOutlined
                          sx={{
                            color:
                              colors.primary,
                          }}
                        />

                        <Typography
                          fontWeight={800}
                          sx={{
                            color:
                              colors.text,
                          }}
                        >
                          Would you like
                          Customer Care
                          to assist you?
                        </Typography>
                      </Stack>

                      <Stack
                        direction={{
                          xs: 'column',
                          sm: 'row',
                        }}
                        spacing={1}
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
                                size={16}
                                color="inherit"
                              />
                            ) : (
                              <SupportAgent />
                            )
                          }
                          sx={{
                            flex: 1,
                            height: 45,
                            borderRadius: 2.5,
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
                          {connecting
                            ? 'Connecting...'
                            : 'Connect me to Customer Care'}
                        </Button>

                        <Button
                          variant="outlined"
                          onClick={
                            startNewConversation
                          }
                          disabled={
                            connecting
                          }
                          sx={{
                            height: 45,
                            borderRadius: 2.5,
                            color:
                              colors.text,
                            borderColor:
                              colors.border,
                            fontWeight: 700,
                            textTransform:
                              'none',
                          }}
                        >
                          Not now
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                )}

              {/* WAITING */}

              {ticket.status ===
                'pending' &&
                ticket.connected_to_customer_care && (
                  <Box
                    sx={{
                      mt: 2,
                      textAlign: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          colors.textSecondary,
                      }}
                    >
                      Your case is waiting
                      for Customer Care.
                    </Typography>
                  </Box>
                )}

              {/* RESOLVED */}

              {ticket.status ===
                'resolved' && (
                <Paper
                  elevation={0}
                  sx={{
                    mt: 2,
                    p: 1.7,
                    borderRadius: 2.5,
                    backgroundColor:
                      colors.surface,
                    border:
                      `1px solid ${colors.border}`,
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >
                    <CheckCircleOutline
                      sx={{
                        color:
                          colors.primary,
                      }}
                    />

                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{
                        color:
                          colors.text,
                      }}
                    >
                      Your case has been
                      resolved.
                    </Typography>
                  </Stack>
                </Paper>
              )}

              {/* CLOSED */}

              {ticket.status ===
                'closed' && (
                <Paper
                  elevation={0}
                  sx={{
                    mt: 2,
                    p: 1.7,
                    borderRadius: 2.5,
                    backgroundColor:
                      colors.surface,
                    border:
                      `1px solid ${colors.border}`,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color:
                        colors.text,
                      lineHeight: 1.6,
                    }}
                  >
                    This conversation has
                    been closed. If you still
                    need assistance, please
                    start a new Customer Care
                    conversation.
                  </Typography>
                </Paper>
              )}

              <div
                ref={messagesEndRef}
              />
            </>
          ) : (
            /* =================================================
               NEW CHAT
            ================================================= */

            <>
              {/* WELCOME */}

              <Box
                sx={{
                  textAlign: 'center',
                  pt: {
                    xs: 2,
                    sm: 4,
                  },
                  pb: 2,
                }}
              >
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    mx: 'auto',
                    mb: 1.5,
                    backgroundColor:
                      isDarkMode
                        ? '#173d2b'
                        : '#e3f4eb',
                    color:
                      colors.primary,
                  }}
                >
                  <SmartToyOutlined
                    sx={{
                      fontSize: 34,
                    }}
                  />
                </Avatar>

                <Typography
                  variant="h5"
                  fontWeight={800}
                  sx={{
                    color: colors.text,
                  }}
                >
                  Welcome to ZENIMONIES
                  Customer Care
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    mt: 0.7,
                    color:
                      colors.textSecondary,
                    maxWidth: 470,
                    mx: 'auto',
                    lineHeight: 1.6,
                  }}
                >
                  Tell us what you need help
                  with. I'll help you get your
                  complaint to the right
                  Customer Care team.
                </Typography>
              </Box>

              {/* CATEGORY SELECTOR */}

              {!selectedCategory ? (
                <>
                  <Typography
                    fontWeight={800}
                    sx={{
                      mb: 1.3,
                      color: colors.text,
                    }}
                  >
                    What can we help you with?
                  </Typography>

                  {loadingCategories ? (
                    <Box
                      sx={{
                        py: 5,
                        textAlign: 'center',
                      }}
                    >
                      <CircularProgress
                        size={28}
                        sx={{
                          color:
                            colors.primary,
                        }}
                      />
                    </Box>
                  ) : displayCategories.length ===
                    0 ? (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        borderRadius: 3,
                        textAlign: 'center',
                        backgroundColor:
                          colors.surface,
                        border:
                          `1px solid ${colors.border}`,
                      }}
                    >
                      <Typography
                        fontWeight={700}
                        sx={{
                          color:
                            colors.text,
                        }}
                      >
                        Support categories
                        are unavailable
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,
                          color:
                            colors.textSecondary,
                        }}
                      >
                        Please refresh and
                        try again.
                      </Typography>
                    </Paper>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: 'repeat(2, 1fr)',
                          sm: 'repeat(4, 1fr)',
                        },
                        gap: 1.2,
                      }}
                    >
                      {displayCategories.map(
                        (category) => {
                          const normalized =
                            category.name
                              .toLowerCase()
                              .replace(
                                /[^a-z0-9]+/g,
                                '_'
                              );

                          const fallback =
                            FALLBACK_CATEGORIES.find(
                              (item) =>
                                normalized.includes(
                                  item.key
                                ) ||
                                item.key.includes(
                                  normalized
                                )
                            );

                          return (
                            <Paper
                              key={category.id}
                              elevation={0}
                              onClick={() =>
                                setSelectedCategory(
                                  category
                                )
                              }
                              sx={{
                                p: {
                                  xs: 1.7,
                                  sm: 2,
                                },
                                minHeight: 125,
                                cursor:
                                  'pointer',
                                borderRadius: 3,
                                backgroundColor:
                                  colors.surface,
                                border:
                                  `1px solid ${colors.border}`,
                                display: 'flex',
                                flexDirection:
                                  'column',
                                alignItems:
                                  'center',
                                justifyContent:
                                  'center',
                                textAlign:
                                  'center',
                                transition:
                                  '0.18s ease',
                                '&:hover':
                                  {
                                    borderColor:
                                      colors.primary,
                                    transform:
                                      'translateY(-1px)',
                                  },
                              }}
                            >
                              <Box
                                sx={{
                                  width: 48,
                                  height: 48,
                                  borderRadius:
                                    '50%',
                                  display:
                                    'flex',
                                  alignItems:
                                    'center',
                                  justifyContent:
                                    'center',
                                  mb: 1,
                                  backgroundColor:
                                    isDarkMode
                                      ? '#173d2b'
                                      : '#e3f4eb',
                                  color:
                                    colors.primary,
                                  fontSize: 22,
                                  fontWeight: 800,
                                }}
                              >
                                {fallback?.icon ||
                                  '•'}
                              </Box>

                              <Typography
                                variant="body2"
                                fontWeight={800}
                                sx={{
                                  color:
                                    colors.text,
                                }}
                              >
                                {
                                  category.name
                                }
                              </Typography>

                              <Typography
                                variant="caption"
                                sx={{
                                  mt: 0.4,
                                  color:
                                    colors.textSecondary,
                                  display: {
                                    xs: 'none',
                                    sm: 'block',
                                  },
                                }}
                              >
                                {
                                  category.description ||
                                  fallback?.description
                                }
                              </Typography>
                            </Paper>
                          );
                        }
                      )}
                    </Box>
                  )}
                </>
              ) : (
                /* =================================================
                   SELECTED CATEGORY
                ================================================= */

                <>
                  <Button
                    startIcon={
                      <ArrowBack />
                    }
                    onClick={() => {
                      setSelectedCategory(
                        null
                      );
                      setSelectedIssue('');
                    }}
                    sx={{
                      mb: 1.5,
                      color:
                        colors.primary,
                      textTransform:
                        'none',
                      fontWeight: 700,
                    }}
                  >
                    Change category
                  </Button>

                  <Paper
                    elevation={0}
                    sx={{
                      p: 1.7,
                      mb: 2,
                      borderRadius: 2.5,
                      backgroundColor:
                        colors.surface,
                      border:
                        `1px solid ${colors.border}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          colors.textSecondary,
                      }}
                    >
                      Selected issue
                    </Typography>

                    <Typography
                      fontWeight={800}
                      sx={{
                        mt: 0.2,
                        color:
                          colors.text,
                      }}
                    >
                      {
                        selectedCategory.name
                      }
                    </Typography>
                  </Paper>

                  <Typography
                    fontWeight={800}
                    sx={{
                      mb: 1.2,
                      color:
                        colors.text,
                    }}
                  >
                    What happened?
                  </Typography>

                  <Stack spacing={1}>
                    {issueSuggestions.map(
                      (issue) => (
                        <Paper
                          key={issue}
                          elevation={0}
                          onClick={() =>
                            setSelectedIssue(
                              issue
                            )
                          }
                          sx={{
                            p: 1.6,
                            cursor:
                              'pointer',
                            borderRadius:
                              2.5,
                            backgroundColor:
                              selectedIssue ===
                              issue
                                ? isDarkMode
                                  ? '#173d2b'
                                  : '#e8f6ee'
                                : colors.surface,
                            border:
                              `1px solid ${
                                selectedIssue ===
                                issue
                                  ? colors.primary
                                  : colors.border
                              }`,
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={1}
                          >
                            <Typography
                              sx={{
                                flex: 1,
                                color:
                                  colors.text,
                                fontWeight:
                                  selectedIssue ===
                                  issue
                                    ? 800
                                    : 600,
                              }}
                            >
                              {issue}
                            </Typography>

                            <ArrowForwardIos
                              sx={{
                                fontSize: 14,
                                color:
                                  colors.textSecondary,
                              }}
                            />
                          </Stack>
                        </Paper>
                      )
                    )}
                  </Stack>

                  <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{
                      mt: 2.5,
                      mb: 1,
                      color:
                        colors.text,
                    }}
                  >
                    Or describe the problem
                    below
                  </Typography>

                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    placeholder="Tell us what happened..."
                    value={message}
                    onChange={(event) =>
                      setMessage(
                        event.target.value
                      )
                    }
                    sx={inputStyles(
                      colors
                    )}
                  />

                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() =>
                      handleSendMessage()
                    }
                    disabled={
                      creating ||
                      !message.trim()
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
                      mt: 1.2,
                      height: 48,
                      borderRadius: 2.5,
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
                    {creating
                      ? 'Starting conversation...'
                      : 'Send to Customer Care'}
                  </Button>
                </>
              )}
            </>
          )}

          <div
            ref={messagesEndRef}
          />
        </Box>
      </Box>

      {/* =====================================================
          BOTTOM CHAT BAR
      ===================================================== */}

      {ticket &&
        ticket.status !== 'closed' &&
        ticket.status !== 'resolved' && (
          <Box
            sx={{
              flexShrink: 0,
              backgroundColor:
                isDarkMode
                  ? '#101714'
                  : '#ffffff',
              borderTop:
                `1px solid ${colors.border}`,
              px: {
                xs: 1.2,
                sm: 2,
              },
              py: 1.1,
            }}
          >
            <Box
              component="form"
              onSubmit={handleSendMessage}
              sx={{
                width: '100%',
                maxWidth: 760,
                mx: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder={
                  ticket.connected_to_customer_care
                    ? 'Message Customer Care...'
                    : 'Describe your problem...'
                }
                value={message}
                onChange={(event) =>
                  setMessage(
                    event.target.value
                  )
                }
                sx={{
                  ...inputStyles(colors),
                  '& .MuiOutlinedInput-root':
                    {
                      borderRadius:
                        '24px',
                    },
                }}
              />

              <IconButton
                type="submit"
                disabled={
                  sending ||
                  !message.trim()
                }
                sx={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  backgroundColor:
                    colors.primary,
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor:
                      colors.primaryDark,
                  },
                  '&.Mui-disabled': {
                    backgroundColor:
                      isDarkMode
                        ? '#1d3027'
                        : '#dce9e2',
                    color:
                      colors.textSecondary,
                  },
                }}
              >
                {sending ? (
                  <CircularProgress
                    size={20}
                    sx={{
                      color:
                        'currentColor',
                    }}
                  />
                ) : (
                  <Send
                    sx={{
                      fontSize: 20,
                    }}
                  />
                )}
              </IconButton>
            </Box>

            <Typography
              variant="caption"
              sx={{
                display: 'block',
                textAlign: 'center',
                mt: 0.7,
                color:
                  colors.textSecondary,
              }}
            >
              Never send your password,
              PIN, OTP, CVV or passkey.
            </Typography>
          </Box>
        )}

      {/* =====================================================
          MY CASES BUTTON
      ===================================================== */}

      {!ticket && (
        <Box
          sx={{
            position: 'absolute',
            top: 82,
            right: 12,
          }}
        >
          <Button
            size="small"
            onClick={async () => {
              setShowCases(true);
              await loadCases();
            }}
            sx={{
              color:
                colors.primary,
              textTransform:
                'none',
              fontWeight: 800,
            }}
          >
            My Cases
          </Button>
        </Box>
      )}

      {/* =====================================================
          CASES PANEL
      ===================================================== */}

      {showCases && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 20,
            backgroundColor:
              colors.background,
            overflowY: 'auto',
          }}
        >
          <Box
            sx={{
              height: 70,
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
              borderBottom:
                `1px solid ${colors.border}`,
              backgroundColor:
                colors.surface,
            }}
          >
            <IconButton
              onClick={() =>
                setShowCases(false)
              }
              sx={{
                color:
                  colors.text,
              }}
            >
              <ArrowBack />
            </IconButton>

            <Typography
              fontWeight={800}
              sx={{
                ml: 1,
                color:
                  colors.text,
              }}
            >
              My Cases
            </Typography>

            <IconButton
              onClick={loadCases}
              sx={{
                ml: 'auto',
                color:
                  colors.primary,
              }}
            >
              <Refresh />
            </IconButton>
          </Box>

          <Box
            sx={{
              maxWidth: 760,
              mx: 'auto',
              p: 2,
            }}
          >
            {loadingCases ? (
              <Box
                sx={{
                  py: 8,
                  textAlign:
                    'center',
                }}
              >
                <CircularProgress
                  sx={{
                    color:
                      colors.primary,
                  }}
                />
              </Box>
            ) : tickets.length ===
              0 ? (
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  mt: 3,
                  textAlign:
                    'center',
                  borderRadius: 3,
                  backgroundColor:
                    colors.surface,
                  border:
                    `1px solid ${colors.border}`,
                }}
              >
                <SupportAgent
                  sx={{
                    fontSize: 42,
                    color:
                      colors.primary,
                  }}
                />

                <Typography
                  fontWeight={800}
                  sx={{
                    mt: 1,
                    color:
                      colors.text,
                  }}
                >
                  No cases yet
                </Typography>
              </Paper>
            ) : (
              <Stack
                spacing={1.2}
                sx={{
                  mt: 2,
                }}
              >
                {tickets.map(
                  (item) => (
                    <Paper
                      key={item.id}
                      elevation={0}
                      onClick={() =>
                        openExistingCase(
                          item.id
                        )
                      }
                      sx={{
                        p: 1.7,
                        cursor:
                          'pointer',
                        borderRadius:
                          2.5,
                        backgroundColor:
                          colors.surface,
                        border:
                          `1px solid ${colors.border}`,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <Box
                          sx={{
                            flex: 1,
                          }}
                        >
                          <Typography
                            fontWeight={
                              800
                            }
                            sx={{
                              color:
                                colors.text,
                            }}
                          >
                            {
                              item.subject
                            }
                          </Typography>

                          {/* TICKET ID */}

                          {item.ticket_number && (
                            <Stack
                              direction="row"
                              spacing={0.4}
                              alignItems="center"
                              sx={{
                                mt: 0.25,
                              }}
                            >
                              <ConfirmationNumberOutlined
                                sx={{
                                  fontSize: 13,
                                  color:
                                    colors.primary,
                                }}
                              />

                              <Typography
                                variant="caption"
                                sx={{
                                  color:
                                    colors.primary,
                                  fontWeight:
                                    800,
                                }}
                              >
                                {
                                  item.ticket_number
                                }
                              </Typography>
                            </Stack>
                          )}

                          <Typography
                            variant="caption"
                            sx={{
                              display:
                                'block',
                              mt: 0.25,
                              color:
                                colors.textSecondary,
                            }}
                          >
                            {item.category_name ||
                              'Customer Care'}
                          </Typography>
                        </Box>

                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              colors.primary,
                            fontWeight:
                              800,
                          }}
                        >
                          {item.status ===
                          'pending'
                            ? 'Pending'
                            : item.status ===
                              'in_progress'
                            ? 'In Progress'
                            : item.status ===
                              'resolved'
                            ? 'Resolved'
                            : item.status ===
                              'closed'
                            ? 'Closed'
                            : 'Open'}
                        </Typography>
                      </Stack>
                    </Paper>
                  )
                )}
              </Stack>
            )}
          </Box>

          <IconButton
            onClick={() =>
              setShowCases(false)
            }
            sx={{
              position: 'fixed',
              top: 13,
              right: 10,
              color:
                colors.textSecondary,
            }}
          >
            <Close />
          </IconButton>
        </Box>
      )}
    </Box>
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
      color:
        colors.textSecondary,
    },

    '& .MuiInputLabel-root.Mui-focused':
      {
        color:
          colors.primary,
      },

    '& .MuiOutlinedInput-root': {
      color: colors.text,
      backgroundColor:
        colors.surface,

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
        color:
          colors.textSecondary,
        opacity: 0.8,
      },
  };
}
