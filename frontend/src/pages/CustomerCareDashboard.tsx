import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';

import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

// ============================================================
// ZENIMONIES BANKING
// CUSTOMER CARE AGENT WORKSPACE
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
  | 'closed';

type Priority =
  | 'low'
  | 'normal'
  | 'high'
  | 'urgent';

type MessageSender =
  | 'assistant'
  | 'customer'
  | 'agent'
  | 'admin';

type FlowStatus =
  | 'completed'
  | 'processing'
  | 'pending'
  | 'failed'
  | 'unknown';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description?: string;
  status: TicketStatus;
  priority: Priority;

  category_name?: string;

  category?: {
    name?: string;
  };

  customer_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;

  assigned_to?: string | null;
  assigned_agent_name?: string | null;

  connected_to_customer_care?: boolean;

  // ----------------------------------------------------------
  // ADMINISTRATION ESCALATION
  // ----------------------------------------------------------

  escalated_to_admin?: boolean;
  escalated_at?: string | null;
  escalated_by?: string | null;
  escalated_by_name?: string | null;
  escalation_reason?: string | null;

  assigned_admin_id?: string | null;
  assigned_admin_name?: string | null;
  admin_taken_at?: string | null;

  created_at?: string;
  updated_at?: string;
  last_message_at?: string;

  waiting_since?: string | null;
  customer_response_due_at?: string | null;
}

interface Message {
  id: string;

  sender_user_id?: string | null;

  sender_type: MessageSender;

  sender_name?: string | null;

  message: string;

  is_internal?: boolean;

  created_at: string;
}

interface Event {
  id: string;

  event_type: string;

  old_value?: string | null;

  new_value?: string | null;

  note?: string | null;

  actor_user_id?: string | null;

  actor_name?: string | null;

  created_at: string;
}

interface Customer {
  id?: string;

  full_name?: string;

  email?: string;

  phone?: string;

  kyc_status?: string;

  kyc_tier?: number;

  account_number?: string;
}

interface Recipient {
  name?: string;

  account_number?: string;

  bank_name?: string;

  bank_code?: string;
}

interface LedgerTransaction {
  id: string;

  type?: string;

  amount?: number;

  currency?: string;

  reference?: string;

  description?: string;

  status?: string;

  balance_before?: number;

  balance_after?: number;

  created_at?: string;
}

interface TransactionFlow {
  step: string;

  label: string;

  status: FlowStatus;

  timestamp?: string | null;
}

interface InvestigationTransaction {
  id: string;

  reference: string;

  provider_reference?: string | null;

  type?: string;

  amount: number;

  currency?: string;

  status: string;

  status_label?: string;

  narration?: string | null;

  initiated_at?: string | null;

  completed_at?: string | null;

  failure_reason?: string | null;

  customer?: Customer;

  recipient?: Recipient;

  ledger?: LedgerTransaction | null;

  flow?: TransactionFlow[];
}

interface TicketDetails {
  ticket: Ticket;

  customer?: Customer;

  messages: Message[];

  events: Event[];

  transaction?: any;
}

// ============================================================
// TOKEN
// ============================================================

const getToken = (): string => {
  return (
    localStorage.getItem('zenimonies_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('accessToken') ||
    ''
  );
};

// ============================================================
// API
// ============================================================

const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
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

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        'Unable to complete the request.'
    );
  }

  return data;
};

// ============================================================
// FORMATTERS
// ============================================================

const formatDateTime = (
  value?: string | null
) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(
    'en-NG',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
};

const formatShortDate = (
  value?: string | null
) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(
    'en-NG',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }
  );
};

const formatMoney = (
  amount?: number,
  currency = 'NGN'
) => {
  const numeric = Number(
    amount || 0
  );

  return new Intl.NumberFormat(
    'en-NG',
    {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  ).format(numeric);
};

const titleCase = (
  value?: string | null
) => {
  if (!value) {
    return '';
  }

  return String(value)
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
};

const maskValue = (
  value?: string | null
) => {
  if (!value) {
    return '—';
  }

  const clean = String(value);

  if (clean.length <= 4) {
    return clean;
  }

  return `****${clean.slice(-4)}`;
};

// ============================================================
// STATUS
// ============================================================

const statusLabel = (
  status?: TicketStatus | string
) => {
  switch (status) {
    case 'open':
      return 'Open';

    case 'pending':
      return 'Waiting for Customer';

    case 'in_progress':
      return 'In Progress';

    case 'resolved':
      return 'Resolved';

    case 'closed':
      return 'Closed';

    default:
      return titleCase(status);
  }
};

const statusColor = (
  status?: TicketStatus | string
) => {
  switch (status) {
    case 'open':
      return {
        background: '#eaf6ef',
        color: '#087443',
      };

    case 'pending':
      return {
        background: '#fff6df',
        color: '#9a6700',
      };

    case 'in_progress':
      return {
        background: '#eaf2ff',
        color: '#175cd3',
      };

    case 'resolved':
      return {
        background: '#e8f8f0',
        color: '#067647',
      };

    case 'closed':
      return {
        background: '#eef1f3',
        color: '#475467',
      };

    default:
      return {
        background: '#eef1f3',
        color: '#475467',
      };
  }
};

const priorityColor = (
  priority?: Priority | string
) => {
  switch (priority) {
    case 'urgent':
      return {
        background: '#fff0f0',
        color: '#c62828',
      };

    case 'high':
      return {
        background: '#fff4e5',
        color: '#b54708',
      };

    case 'normal':
      return {
        background: '#eef4ff',
        color: '#175cd3',
      };

    case 'low':
      return {
        background: '#f2f4f7',
        color: '#475467',
      };

    default:
      return {
        background: '#f2f4f7',
        color: '#475467',
      };
  }
};

// ============================================================
// ADMIN ESCALATION HELPERS
// ============================================================

const isEscalatedToAdministration = (
  ticket?: Ticket | null
) => {
  return Boolean(
    ticket?.escalated_to_admin
  );
};

const formatEventType = (
  eventType?: string
) => {
  switch (eventType) {
    case 'case_taken':
      return 'Customer Care took responsibility for the case.';

    case 'case_escalated_to_admin':
      return 'Customer Care forwarded the case to Administration.';

    case 'admin_took_case':
      return 'Administration took responsibility for the case.';

    case 'customer_message':
      return 'Customer sent a message.';

    case 'agent_message':
      return 'Customer Care sent a message.';

    case 'case_resolved':
      return 'Case was resolved.';

    case 'case_closed':
      return 'Case was closed.';

    case 'status_changed':
      return 'Case status changed.';

    default:
      return titleCase(eventType);
  }
};

// ============================================================
// MESSAGE NAME
// ============================================================

const getMessageSenderName = (
  message: Message
) => {
  if (
    message.sender_type ===
    'assistant'
  ) {
    return 'ZENIMONIES Support Assistant';
  }

  if (
    message.sender_type ===
    'customer'
  ) {
    return 'Customer';
  }

  if (
    message.sender_type ===
    'admin'
  ) {
    return (
      message.sender_name ||
      'ZENIMONIES Administration'
    );
  }

  return (
    message.sender_name ||
    'Customer Care Agent'
  );
};

// ============================================================
// COMPONENT
// ============================================================

const CustomerCareDashboard: React.FC =
  () => {
    // ========================================================
    // STATE
    // ========================================================

    const [
      availableCases,
      setAvailableCases,
    ] = useState<Ticket[]>([]);

    const [
      myCases,
      setMyCases,
    ] = useState<Ticket[]>([]);

    const [
      selectedTicketId,
      setSelectedTicketId,
    ] = useState<string | null>(
      null
    );

    const [
      selectedCase,
      setSelectedCase,
    ] = useState<TicketDetails | null>(
      null
    );

    const [
      investigation,
      setInvestigation,
    ] =
      useState<InvestigationTransaction | null>(
        null
      );

    const [
      transactionReference,
      setTransactionReference,
    ] = useState('');

    const [
      search,
      setSearch,
    ] = useState('');

    const [
  activeView,
  setActiveView,
] = useState<
  'available' |
  'mine' |
  'waiting' |
  'resolved' |
  'escalated'
>('available');

    const [
      reply,
      setReply,
    ] = useState('');

    const [
      loading,
      setLoading,
    ] = useState(true);

    const [
      caseLoading,
      setCaseLoading,
    ] = useState(false);

    const [
      actionLoading,
      setActionLoading,
    ] = useState(false);

    const [
      investigationLoading,
      setInvestigationLoading,
    ] = useState(false);

    const [
      error,
      setError,
    ] = useState('');

    const [
      notice,
      setNotice,
    ] = useState('');

    const [
      mobileCaseOpen,
      setMobileCaseOpen,
    ] = useState(false);

    // --------------------------------------------------------
    // ADMIN ESCALATION STATE
    // --------------------------------------------------------

    const [
      escalationReason,
      setEscalationReason,
    ] = useState('');

    const [
      escalationDialogOpen,
      setEscalationDialogOpen,
    ] = useState(false);

    const [
      escalationLoading,
      setEscalationLoading,
    ] = useState(false);

    // ========================================================
    // CURRENT AGENT
    // ========================================================

    const currentUser = useMemo(
      () => {
        try {
          const stored =
            localStorage.getItem(
              'zenimonies_user'
            );

          return stored
            ? JSON.parse(stored)
            : null;
        } catch {
          return null;
        }
      },
      []
    );

    const agentName =
      currentUser?.full_name ||
      currentUser?.name ||
      'Customer Care Agent';

    // ========================================================
    // LOAD CASES
    // ========================================================

    const loadCases = useCallback(
      async (
        showLoader = true
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          setError('');

          const [
            availableResponse,
            mineResponse,
          ] =
            await Promise.all([
              apiRequest(
                '/customer-care/tickets'
              ),

              apiRequest(
                '/customer-care/tickets/mine'
              ),
            ]);

          setAvailableCases(
            availableResponse?.tickets ||
              availableResponse?.data ||
              []
          );

          setMyCases(
            mineResponse?.tickets ||
              mineResponse?.data ||
              []
          );
        } catch (
          requestError: any
        ) {
          setError(
            requestError?.message ||
              'Unable to load Customer Care cases.'
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      []
    );

    useEffect(() => {
      loadCases();
    }, [loadCases]);

    // ========================================================
    // LOAD CASE DETAILS
    // ========================================================

    const loadCase = useCallback(
      async (
        ticketId: string
      ) => {
        try {
          setCaseLoading(true);
          setError('');

          const response =
            await apiRequest(
              `/customer-care/tickets/${encodeURIComponent(
                ticketId
              )}`
            );

          const details:
            TicketDetails =
            response?.ticket
              ? response
              : response?.data ||
                response;

          setSelectedCase({
            ticket:
              details.ticket ||
              response.ticket,

            customer:
              details.customer ||
              response.customer,

            messages:
              details.messages || [],

            events:
              details.events || [],

            transaction:
              details.transaction ||
              null,
          });

          setSelectedTicketId(
            ticketId
          );

          setInvestigation(null);
          setTransactionReference('');
          setMobileCaseOpen(true);
        } catch (
          requestError: any
        ) {
          setError(
            requestError?.message ||
              'Unable to load this case.'
          );
        } finally {
          setCaseLoading(false);
        }
      },
      []
    );

    // ========================================================
    // TAKE CASE
    // ========================================================

    const takeCase =
      async () => {
        if (
          !selectedCase?.ticket?.id
        ) {
          return;
        }

        try {
          setActionLoading(true);
          setError('');

          await apiRequest(
            `/customer-care/tickets/${encodeURIComponent(
              selectedCase.ticket.id
            )}/take`,
            {
              method: 'POST',
            }
          );

          setNotice(
            'Case assigned to you successfully.'
          );

          await loadCase(
            selectedCase.ticket.id
          );

          await loadCases(false);
        } catch (
          requestError: any
        ) {
          setError(
            requestError?.message ||
              'Unable to take this case.'
          );
        } finally {
          setActionLoading(false);
        }
      };

    // ========================================================
    // REPLY
    // ========================================================

    const sendReply =
      async () => {
        const message =
          reply.trim();

        if (!message) {
          return;
        }

        if (
          !selectedCase?.ticket?.id
        ) {
          return;
        }

        // ----------------------------------------------------
        // Frontend protection:
        // Escalated cases belong to Administration.
        // ----------------------------------------------------

        if (
          isEscalatedToAdministration(
            selectedCase.ticket
          )
        ) {
          setError(
            'This case has been forwarded to Administration. Customer Care can no longer reply to it.'
          );

          return;
        }

        try {
          setActionLoading(true);
          setError('');

          await apiRequest(
            `/customer-care/tickets/${encodeURIComponent(
              selectedCase.ticket.id
            )}/reply`,
            {
              method: 'POST',
              body: JSON.stringify({
                message,
              }),
            }
          );

          setReply('');

          setNotice(
            'Message sent to the customer.'
          );

          await loadCase(
            selectedCase.ticket.id
          );

          await loadCases(false);
        } catch (
          requestError: any
        ) {
          setError(
            requestError?.message ||
              'Unable to send the message.'
          );
        } finally {
          setActionLoading(false);
        }
      };

    // ========================================================
    // WAITING FOR CUSTOMER
    // ========================================================

    const waitForCustomer =
      async () => {
        if (
          !selectedCase?.ticket?.id
        ) {
          return;
        }

        if (
          isEscalatedToAdministration(
            selectedCase.ticket
          )
        ) {
          setError(
            'This case has been forwarded to Administration.'
          );

          return;
        }

        try {
          setActionLoading(true);
          setError('');

          await apiRequest(
            `/customer-care/tickets/${encodeURIComponent(
              selectedCase.ticket.id
            )}/waiting`,
            {
              method: 'PATCH',
            }
          );

          setNotice(
            'Case is now waiting for the customer.'
          );

          await loadCase(
            selectedCase.ticket.id
          );

          await loadCases(false);
        } catch (
          requestError: any
        ) {
          setError(
            requestError?.message ||
              'Unable to place the case on hold.'
          );
        } finally {
          setActionLoading(false);
        }
      };

    // ========================================================
    // RESOLVE
    // ========================================================

    const resolveCase =
      async () => {
        if (
          !selectedCase?.ticket?.id
        ) {
          return;
        }

        if (
          isEscalatedToAdministration(
            selectedCase.ticket
          )
        ) {
          setError(
            'This case has been forwarded to Administration and can no longer be resolved by Customer Care.'
          );

          return;
        }

        try {
          setActionLoading(true);
          setError('');

          await apiRequest(
            `/customer-care/tickets/${encodeURIComponent(
              selectedCase.ticket.id
            )}/resolve`,
            {
              method: 'PATCH',
            }
          );

          setNotice(
            'Case marked as resolved.'
          );

          await loadCase(
            selectedCase.ticket.id
          );

          await loadCases(false);
        } catch (
          requestError: any
        ) {
          setError(
            requestError?.message ||
              'Unable to resolve this case.'
          );
        } finally {
          setActionLoading(false);
        }
      };

    // ========================================================
    // CLOSE
    // ========================================================

    const closeCase =
      async () => {
        if (
          !selectedCase?.ticket?.id
        ) {
          return;
        }

        if (
          isEscalatedToAdministration(
            selectedCase.ticket
          )
        ) {
          setError(
            'This case has been forwarded to Administration and can no longer be closed by Customer Care.'
          );

          return;
        }

        try {
          setActionLoading(true);
          setError('');

          await apiRequest(
            `/customer-care/tickets/${encodeURIComponent(
              selectedCase.ticket.id
            )}/close`,
            {
              method: 'PATCH',
            }
          );

          setNotice(
            'Case closed successfully.'
          );

          await loadCase(
            selectedCase.ticket.id
          );

          await loadCases(false);
        } catch (
          requestError: any
        ) {
          setError(
            requestError?.message ||
              'Unable to close this case.'
          );
        } finally {
          setActionLoading(false);
        }
      };

    // ========================================================
    // FORWARD TO ADMINISTRATION
    // ========================================================

    const escalateToAdministration =
      async () => {
        if (
          !selectedCase?.ticket?.id
        ) {
          return;
        }

        if (
          selectedCase.ticket
            .escalated_to_admin
        ) {
          setError(
            'This case has already been forwarded to Administration.'
          );

          return;
        }

        const reason =
          escalationReason.trim();

        if (
          reason.length < 5
        ) {
          setError(
            'Please provide a clear reason for forwarding this case to Administration.'
          );

          return;
        }

        try {
          setEscalationLoading(
            true
          );

          setError('');

          await apiRequest(
            `/customer-care/tickets/${encodeURIComponent(
              selectedCase.ticket.id
            )}/escalate`,
            {
              method: 'POST',

              body: JSON.stringify({
                reason,
              }),
            }
          );

          setEscalationDialogOpen(
            false
          );

          setEscalationReason('');

          setNotice(
            'Case forwarded to Administration successfully.'
          );

          await loadCase(
            selectedCase.ticket.id
          );

          await loadCases(false);
        } catch (
          requestError: any
        ) {
          setError(
            requestError?.message ||
              'Unable to forward this case to Administration.'
          );
        } finally {
          setEscalationLoading(
            false
          );
        }
      };

    // ========================================================
    // INVESTIGATE TRANSACTION
    // ========================================================

    const investigateTransaction =
      async () => {
        const reference =
          transactionReference.trim();

        if (!reference) {
          setError(
            'Enter the transaction reference first.'
          );

          return;
        }

        try {
          setInvestigationLoading(
            true
          );

          setError('');

          const response =
            await apiRequest(
              `/customer-care/transactions/investigate?reference=${encodeURIComponent(
                reference
              )}`
            );

          setInvestigation(
            response?.transaction ||
              response?.data
                ?.transaction ||
              response?.data ||
              null
          );
        } catch (
          requestError: any
        ) {
          setInvestigation(null);

          setError(
            requestError?.message ||
              'Transaction could not be found.'
          );
        } finally {
          setInvestigationLoading(
            false
          );
        }
      };

    // ========================================================
    // FILTER CASES
    // ========================================================

    const displayedCases =
      useMemo(() => {
        let source: Ticket[] =
          [];
     if (
  activeView ===
  'available'
) {
  source =
    availableCases;
} else if (
  activeView === 'mine'
) {
  source =
    myCases;
} else if (
  activeView ===
  'waiting'
) {
  source =
    myCases.filter(
      (ticket) =>
        ticket.status ===
        'pending'
    );
} else if (
  activeView ===
  'escalated'
) {
  source =
    myCases.filter(
      (ticket) =>
        ticket.escalated_to_admin ===
        true
    );
} else {
  source =
    myCases.filter(
      (ticket) =>
        ticket.status ===
          'resolved' ||
        ticket.status ===
          'closed'
    );
}
        

        const query =
          search
            .trim()
            .toLowerCase();

        if (!query) {
          return source;
        }

        return source.filter(
          (ticket) => {
            const haystack =
              [
                ticket.ticket_number,
                ticket.subject,
                ticket.customer_name,
                ticket.full_name,
                ticket.email,
                ticket.category_name,
                ticket.category?.name,
                ticket.assigned_admin_name,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(
              query
            );
          }
        );
      }, [
        activeView,
        availableCases,
        myCases,
        search,
      ]);

    // ========================================================
    // STATISTICS
    // ========================================================

    const statistics =
      useMemo(() => {
        const waiting =
          myCases.filter(
            (ticket) =>
              ticket.status ===
              'pending'
          ).length;

        const resolved =
          myCases.filter(
            (ticket) =>
              ticket.status ===
                'resolved' ||
              ticket.status ===
                'closed'
          ).length;

        const escalated =
          myCases.filter(
            (ticket) =>
              ticket.escalated_to_admin
          ).length;

        return {
          available:
            availableCases.length,

          mine: myCases.filter(
            (ticket) =>
              ticket.status !==
              'closed'
          ).length,

          waiting,

          resolved,

          escalated,
        };
      }, [
        availableCases,
        myCases,
      ]);

    // ========================================================
    // CLOSE CASE VIEW
    // ========================================================

    const closeCaseView =
      () => {
        setSelectedTicketId(
          null
        );

        setSelectedCase(
          null
        );

        setInvestigation(
          null
        );

        setTransactionReference(
          ''
        );

        setReply('');

        setEscalationReason(
          ''
        );

        setEscalationDialogOpen(
          false
        );

        setMobileCaseOpen(
          false
        );
      };

    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {
      return (
        <Box
          sx={{
            minHeight:
              '100vh',

            background:
              '#f5f8f6',

            display: 'flex',

            alignItems:
              'center',

            justifyContent:
              'center',
          }}
        >
          <Stack
            spacing={2}
            alignItems="center"
          >
            <CircularProgress
              size={34}
              sx={{
                color:
                  '#087c43',
              }}
            />

            <Box
              sx={{
                color:
                  '#66756e',

                fontSize: 14,

                fontWeight: 600,
              }}
            >
              Loading Customer Care...
            </Box>
          </Stack>
        </Box>
      );
    }

    // ========================================================
    // RENDER
    // ========================================================

    return (
     <>
       <Box
        sx={{
          minHeight:
            '100vh',

          background:
            '#f5f8f6',

          color:
            '#172b22',

          fontFamily:
            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {/* ====================================================
            TOP HEADER
        ==================================================== */}

        <Box
          sx={{
            height: {
              xs: 'auto',
              md: 76,
            },

            minHeight: 76,

            background:
              '#ffffff',

            borderBottom:
              '1px solid #e2e9e5',

            display: 'flex',

            alignItems:
              'center',

            px: {
              xs: 2,
              md: 4,
            },

            py: {
              xs: 1.5,
              md: 0,
            },

            justifyContent:
              'space-between',

            gap: 2,
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
          >
            <Box
              sx={{
                width: 44,
                height: 44,

                borderRadius:
                  '13px',

                background:
                  'linear-gradient(135deg, #079447, #006b39)',

                display: 'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',

                color:
                  '#ffffff',

                fontWeight: 900,

                fontSize: 22,

                boxShadow:
                  '0 5px 14px rgba(8,124,67,0.18)',
              }}
            >
              Z
            </Box>

            <Box>
              <Box
                sx={{
                  fontWeight:
                    850,

                  color:
                    '#063b2d',

                  fontSize: 17,

                  lineHeight:
                    1.2,
                }}
              >
                ZENIMONIES
              </Box>

              <Box
                sx={{
                  color:
                    '#8a9690',

                  fontSize: 9,

                  letterSpacing:
                    1.5,

                  fontWeight: 700,
                }}
              >
                CUSTOMER CARE
              </Box>
            </Box>
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
          >
            <Box
              sx={{
                display: {
                  xs: 'none',
                  sm: 'block',
                },

                textAlign:
                  'right',
              }}
            >
              <Box
                sx={{
                  color:
                    '#344054',

                  fontSize: 13,

                  fontWeight: 750,
                }}
              >
                {agentName}
              </Box>

              <Box
                sx={{
                  color:
                    '#8a9690',

                  fontSize: 11,
                }}
              >
                Customer Care Agent
              </Box>
            </Box>

            <Box
              sx={{
                width: 40,
                height: 40,

                borderRadius:
                  '50%',

                background:
                  '#e7f6ee',

                color:
                  '#087c43',

                display: 'flex',

                alignItems:
                  'center',

                justifyContent:
                  'center',
              }}
            >
              <SupportAgentRoundedIcon
                fontSize="small"
              />
            </Box>
          </Stack>
        </Box>

        {/* ====================================================
            PAGE
        ==================================================== */}

        <Box
          sx={{
            maxWidth: 1500,

            mx: 'auto',

            px: {
              xs: 1.5,
              sm: 2.5,
              lg: 4,
            },

            py: {
              xs: 2,
              md: 3,
            },
          }}
        >
          {/* HEADER */}

          <Stack
            direction={{
              xs: 'column',
              md: 'row',
            }}
            spacing={2}
            justifyContent="space-between"
            alignItems={{
              xs: 'stretch',
              md: 'center',
            }}
            sx={{
              mb: 2.5,
            }}
          >
            <Box>
              <Box
                sx={{
                  fontSize: {
                    xs: 23,
                    md: 28,
                  },

                  fontWeight:
                    850,

                  color:
                    '#063b2d',
                }}
              >
                Customer Care Workspace
              </Box>

              <Box
                sx={{
                  mt: 0.5,

                  color:
                    '#66756e',

                  fontSize: 13,
                }}
              >
                Manage customer complaints,
                conversations and support cases.
              </Box>
            </Box>

            <Button
              variant="outlined"
              startIcon={
                <RefreshRoundedIcon />
              }
              onClick={() =>
                loadCases()
              }
              sx={{
                alignSelf: {
                  xs: 'flex-start',
                  md: 'auto',
                },

                borderColor:
                  '#cfd9d4',

                color:
                  '#344054',

                textTransform:
                  'none',

                fontWeight:
                  750,

                borderRadius:
                  '10px',

                '&:hover': {
                  borderColor:
                    '#087c43',

                  background:
                    '#f1faf5',
                },
              }}
            >
              Refresh
            </Button>
          </Stack>

          {/* ==================================================
              STATISTICS
          ================================================== */}

          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns:
                {
                  xs: 'repeat(2, 1fr)',
                  md: 'repeat(5, 1fr)',
                },

              gap: 1.5,

              mb: 2,
            }}
          >
            {[
              {
                label:
                  'Available Cases',

                value:
                  statistics.available,

                icon:
                  <SupportAgentRoundedIcon />,

                view:
                  'available' as const,
              },

              {
                label:
                  'My Cases',

                value:
                  statistics.mine,

                icon:
                  <PersonRoundedIcon />,

                view:
                  'mine' as const,
              },

              {
                label:
                  'Waiting for Customer',

                value:
                  statistics.waiting,

                icon:
                  <AccessTimeRoundedIcon />,

                view:
                  'waiting' as const,
              },

              {
                label:
                  'Resolved',

                value:
                  statistics.resolved,

                icon:
                  <CheckCircleRoundedIcon />,

                view:
                  'resolved' as const,
              },

              {
                label:
                  'Administration',

                value:
                  statistics.escalated,

                icon:
                  <AccountBalanceRoundedIcon />,

                view:
                   'escalated' as const,
              },
            ].map(
              (item) => (
                <Paper
                  key={
                    item.label
                  }

                  elevation={0}

                  onClick={() =>
                    setActiveView(
                      item.view
                    )
                  }

                  sx={{
                    p: 2,

                    border:
                      '1px solid #e1e8e4',

                    borderRadius:
                      '15px',

                    cursor:
                      'pointer',

                    background:
                      '#ffffff',

                    transition:
                      'all 0.18s ease',

                    '&:hover': {
                      borderColor:
                        '#9ccdb0',

                      transform:
                        'translateY(-1px)',
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                  >
                    <Box
                      sx={{
                        width: 42,
                        height: 42,

                        borderRadius:
                          '12px',

                        background:
                          item.label ===
                          'Administration'
                            ? '#fff4e5'
                            : '#e8f8f0',

                        color:
                          item.label ===
                          'Administration'
                            ? '#b54708'
                            : '#087c43',

                        display:
                          'flex',

                        alignItems:
                          'center',

                        justifyContent:
                          'center',
                      }}
                    >
                      {item.icon}
                    </Box>

                    <Box>
                      <Box
                        sx={{
                          color:
                            '#66756e',

                          fontSize: 11,

                          fontWeight:
                            650,
                        }}
                      >
                        {item.label}
                      </Box>

                      <Box
                        sx={{
                          mt: 0.2,

                          color:
                            '#063b2d',

                          fontSize: 22,

                          fontWeight:
                            850,
                        }}
                      >
                        {item.value}
                      </Box>
                    </Box>
                  </Stack>
                </Paper>
              )
            )}
          </Box>

          {/* ====================================================
              ESCALATION NOTICE
          ==================================================== */}

          {selectedCase?.ticket
            .escalated_to_admin && (
            <Alert
              severity="warning"
              icon={
                <AccountBalanceRoundedIcon />
              }
              sx={{
                mb: 2,

                borderRadius:
                  '12px',

                border:
                  '1px solid #f3d7a6',

                background:
                  '#fffaf1',

                color:
                  '#7a4b00',

                '& .MuiAlert-icon':
                  {
                    color:
                      '#b54708',
                  },
              }}
            >
              This case has been forwarded
              to Administration. Customer Care
              can view the conversation and
              history but cannot perform further
              case actions.
            </Alert>
          )}

          {/* ====================================================
              MAIN WORKSPACE
          ==================================================== */}

          <Box
            sx={{
              display:
                'grid',

              gridTemplateColumns:
                {
                  xs: '1fr',

                  lg: selectedCase
                    ? '390px minmax(0, 1fr)'
                    : '1fr',
                },

              gap: 2,

              alignItems:
                'start',
            }}
          >
            {/* ==================================================
                CASE LIST
            ================================================== */}

            <Paper
              elevation={0}
              sx={{
                border:
                  '1px solid #e1e8e4',

                borderRadius:
                  '17px',

                background:
                  '#ffffff',

                overflow:
                  'hidden',

                display:
                  selectedCase &&
                  !mobileCaseOpen
                    ? {
                        xs: 'none',
                        lg: 'block',
                      }
                    : 'block',
              }}
            >
              <Box
                sx={{
                  p: 2,

                  borderBottom:
                    '1px solid #edf1ef',
                }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    mb: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      fontSize: 16,

                      fontWeight:
                        800,

                      color:
                        '#063b2d',

                      flex: 1,
                    }}
                  >
                    {activeView ===
                     'available'
                     ? 'Available Cases'
                     : activeView ===
                       'mine'
                      ? 'My Cases'
                      : activeView ===
                      'waiting'
                     ? 'Waiting for Customer'
                     : activeView ===
                     'escalated'
                    ? 'Administration Cases'
                    : 'Resolved Cases'}
                  </Box>

                  <Chip
                    label={
                      displayedCases.length
                    }
                    size="small"
                    sx={{
                      background:
                        '#eaf7f0',

                      color:
                        '#087c43',

                      fontWeight:
                        800,
                    }}
                  />
                </Stack>

                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search cases..."
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  InputProps={{
                    startAdornment:
                      (
                        <SearchRoundedIcon
                          sx={{
                            mr: 1,

                            color:
                              '#98a2b3',
                          }}
                        />
                      ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root':
                      {
                        borderRadius:
                          '10px',

                        background:
                          '#f8faf9',
                      },
                  }}
                />
              </Box>

              <Box
                sx={{
                  maxHeight: {
                    xs: 600,
                    lg: 'calc(100vh - 290px)',
                  },

                  overflowY:
                    'auto',
                }}
              >
                {displayedCases.length ===
                0 ? (
                  <Box
                    sx={{
                      p: 4,

                      textAlign:
                        'center',
                    }}
                  >
                    <SupportAgentRoundedIcon
                      sx={{
                        fontSize: 42,

                        color:
                          '#b5c2bb',
                      }}
                    />

                    <Box
                      sx={{
                        mt: 1,

                        color:
                          '#66756e',

                        fontSize: 13,

                        fontWeight:
                          650,
                      }}
                    >
                      No cases found.
                    </Box>
                  </Box>
                ) : (
                  displayedCases.map(
                    (ticket) => {
                      const selected =
                        selectedTicketId ===
                        ticket.id;

                      const ticketCustomer =
                        ticket.customer_name ||
                        ticket.full_name ||
                        'Customer';

                      return (
                        <Box
                          key={
                            ticket.id
                          }

                          onClick={() =>
                            loadCase(
                              ticket.id
                            )
                          }

                          sx={{
                            p: 2,

                            borderBottom:
                              '1px solid #edf1ef',

                            cursor:
                              'pointer',

                            background:
                              selected
                                ? '#f0fbf5'
                                : '#ffffff',

                            borderLeft:
                              selected
                                ? '3px solid #087c43'
                                : '3px solid transparent',

                            '&:hover':
                              {
                                background:
                                  '#f6fbf8',
                              },
                          }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            alignItems="flex-start"
                          >
                            <Box
                              sx={{
                                flex: 1,

                                minWidth:
                                  0,
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={0.8}
                                alignItems="center"
                                sx={{
                                  mb: 0.5,
                                }}
                              >
                                <Box
                                  sx={{
                                    fontSize:
                                      11,

                                    color:
                                      '#087c43',

                                    fontWeight:
                                      800,
                                  }}
                                >
                                  {
                                    ticket.ticket_number
                                  }
                                </Box>

                                <Box
                                  sx={{
                                    flex: 1,
                                  }}
                                />

                                <Chip
                                  label={statusLabel(
                                    ticket.status
                                  )}
                                  size="small"
                                  sx={{
                                    height:
                                      21,

                                    fontSize:
                                      9,

                                    fontWeight:
                                      800,

                                    ...statusColor(
                                      ticket.status
                                    ),
                                  }}
                                />

                                {ticket.escalated_to_admin && (
                                  <Chip
                                    label={
                                      ticket.assigned_admin_name
                                        ? 'Administration'
                                        : 'Escalated'
                                    }
                                    size="small"
                                    sx={{
                                      height:
                                        21,

                                      fontSize:
                                        9,

                                      fontWeight:
                                        800,

                                      background:
                                        '#fff4e5',

                                      color:
                                        '#b54708',
                                    }}
                                  />
                                )}
                              </Stack>

                              <Box
                                sx={{
                                  color:
                                    '#1d2939',

                                  fontSize:
                                    13,

                                  fontWeight:
                                    750,

                                  overflow:
                                    'hidden',

                                  textOverflow:
                                    'ellipsis',

                                  whiteSpace:
                                    'nowrap',
                                }}
                              >
                                {
                                  ticket.subject
                                }
                              </Box>

                              <Box
                                sx={{
                                  mt: 0.5,

                                  color:
                                    '#66756e',

                                  fontSize:
                                    11,
                                }}
                              >
                                {
                                  ticketCustomer
                                }
                              </Box>

                              <Stack
                                direction="row"
                                spacing={0.8}
                                sx={{
                                  mt: 1,
                                }}
                              >
                                <Chip
                                  label={
                                    ticket.category_name ||
                                    ticket.category?.name ||
                                    'Support'
                                  }
                                  size="small"
                                  sx={{
                                    height:
                                      20,

                                    fontSize:
                                      9,

                                    background:
                                      '#f2f5f3',

                                    color:
                                      '#475467',
                                  }}
                                />

                                <Chip
                                  label={titleCase(
                                    ticket.priority
                                  )}
                                  size="small"
                                  sx={{
                                    height:
                                      20,

                                    fontSize:
                                      9,

                                    fontWeight:
                                      700,

                                    ...priorityColor(
                                      ticket.priority
                                    ),
                                  }}
                                />
                              </Stack>

                              <Box
                                sx={{
                                  mt: 1,

                                  color:
                                    '#98a2b3',

                                  fontSize:
                                    10,
                                }}
                              >
                                Updated{' '}
                                {formatShortDate(
                                  ticket.updated_at ||
                                    ticket.last_message_at
                                )}
                              </Box>
                            </Box>
                          </Stack>
                        </Box>
                      );
                    }
                  )
                )}
              </Box>
            </Paper>

            {/* ==================================================
                CASE DETAILS
            ================================================== */}

            {selectedCase ? (
              <Paper
                elevation={0}
                sx={{
                  border:
                    '1px solid #e1e8e4',

                  borderRadius:
                    '17px',

                  background:
                    '#ffffff',

                  overflow:
                    'hidden',

                  minWidth: 0,
                }}
              >
                {/* CASE HEADER */}

                <Box
                  sx={{
                    p: {
                      xs: 1.5,
                      md: 2,
                    },

                    borderBottom:
                      '1px solid #edf1ef',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                  >
                    <IconButton
                      onClick={
                        closeCaseView
                      }
                      sx={{
                        display: {
                          xs: 'inline-flex',
                          lg: 'none',
                        },

                        color:
                          '#344054',
                      }}
                    >
                      <ArrowBackRoundedIcon />
                    </IconButton>

                    <Box
                      sx={{
                        flex: 1,

                        minWidth:
                          0,
                      }}
                    >
                      <Stack
                        direction={{
                          xs: 'column',
                          sm: 'row',
                        }}
                        spacing={1}
                        alignItems={{
                          xs: 'flex-start',
                          sm: 'center',
                        }}
                      >
                        <Box
                          sx={{
                            fontSize:
                              17,

                            fontWeight:
                              850,

                            color:
                              '#063b2d',
                          }}
                        >
                          {
                            selectedCase
                              .ticket
                              .ticket_number
                          }
                        </Box>

                        <Chip
                          label={statusLabel(
                            selectedCase
                              .ticket
                              .status
                          )}
                          size="small"
                          sx={{
                            fontWeight:
                              800,

                            ...statusColor(
                              selectedCase
                                .ticket
                                .status
                            ),
                          }}
                        />

                        <Chip
                          label={titleCase(
                            selectedCase
                              .ticket
                              .priority
                          )}
                          size="small"
                          sx={{
                            fontWeight:
                              750,

                            ...priorityColor(
                              selectedCase
                                .ticket
                                .priority
                            ),
                          }}
                        />

                        {selectedCase
                          .ticket
                          .escalated_to_admin && (
                          <Chip
                            icon={
                              <AccountBalanceRoundedIcon />
                            }
                            label="Administration"
                            size="small"
                            sx={{
                              fontWeight:
                                800,

                              background:
                                '#fff4e5',

                              color:
                                '#b54708',
                            }}
                          />
                        )}
                      </Stack>

                      <Box
                        sx={{
                          mt: 0.5,

                          fontSize: 14,

                          fontWeight:
                            750,

                          color:
                            '#344054',

                          overflow:
                            'hidden',

                          textOverflow:
                            'ellipsis',

                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {
                          selectedCase
                            .ticket
                            .subject
                        }
                      </Box>
                    </Box>

                    <Tooltip title="Close case view">
                      <IconButton
                        onClick={
                          closeCaseView
                        }
                        sx={{
                          display: {
                            xs: 'none',
                            lg: 'inline-flex',
                          },
                        }}
                      >
                        <CloseRoundedIcon />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Box>

                {/* =================================================
                    CUSTOMER INFORMATION
                ================================================= */}

                <Box
                  sx={{
                    p: {
                      xs: 1.5,
                      md: 2,
                    },

                    background:
                      '#fbfcfb',

                    borderBottom:
                      '1px solid #edf1ef',
                  }}
                >
                  <Stack
                    direction={{
                      xs: 'column',
                      md: 'row',
                    }}
                    spacing={2}
                  >
                    <Box
                      sx={{
                        flex: 1,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <Box
                          sx={{
                            width: 38,
                            height: 38,

                            borderRadius:
                              '11px',

                            background:
                              '#e8f8f0',

                            color:
                              '#087c43',

                            display:
                              'flex',

                            alignItems:
                              'center',

                            justifyContent:
                              'center',
                          }}
                        >
                          <PersonRoundedIcon />
                        </Box>

                        <Box>
                          <Box
                            sx={{
                              fontSize:
                                14,

                              fontWeight:
                                800,

                              color:
                                '#1d2939',
                            }}
                          >
                            {selectedCase
                              .customer
                              ?.full_name ||
                              selectedCase
                                .ticket
                                .customer_name ||
                              selectedCase
                                .ticket
                                .full_name ||
                              'Customer'}
                          </Box>

                          <Box
                            sx={{
                              color:
                                '#66756e',

                              fontSize:
                                11,
                            }}
                          >
                            Customer
                          </Box>
                        </Box>
                      </Stack>
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                      }}
                    >
                      <Box
                        sx={{
                          color:
                            '#98a2b3',

                          fontSize: 10,

                          fontWeight:
                            700,

                          textTransform:
                            'uppercase',

                          letterSpacing:
                            0.5,
                        }}
                      >
                        Account
                      </Box>

                      <Box
                        sx={{
                          mt: 0.3,

                          color:
                            '#344054',

                          fontSize: 12,

                          fontWeight:
                            750,
                        }}
                      >
                        {maskValue(
                          selectedCase
                            .customer
                            ?.account_number
                        )}
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                      }}
                    >
                      <Box
                        sx={{
                          color:
                            '#98a2b3',

                          fontSize: 10,

                          fontWeight:
                            700,

                          textTransform:
                            'uppercase',

                          letterSpacing:
                            0.5,
                        }}
                      >
                        KYC
                      </Box>

                      <Box
                        sx={{
                          mt: 0.3,

                          color:
                            '#344054',

                          fontSize: 12,

                          fontWeight:
                            750,
                        }}
                      >
                        {titleCase(
                          selectedCase
                            .customer
                            ?.kyc_status ||
                            'Not available'
                        )}
                      </Box>
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                      }}
                    >
                      <Box
                        sx={{
                          color:
                            '#98a2b3',

                          fontSize: 10,

                          fontWeight:
                            700,

                          textTransform:
                            'uppercase',

                          letterSpacing:
                            0.5,
                        }}
                      >
                        Contact
                      </Box>

                      <Box
                        sx={{
                          mt: 0.3,

                          color:
                            '#344054',

                          fontSize: 11,

                          fontWeight:
                            650,
                        }}
                      >
                        {selectedCase
                          .customer
                          ?.phone ||
                          selectedCase
                            .customer
                            ?.email ||
                          'Not available'}
                      </Box>
                    </Box>
                  </Stack>
                </Box>

                {/* =================================================
                    CASE DESCRIPTION
                ================================================= */}

                <Box
                  sx={{
                    p: {
                      xs: 1.5,
                      md: 2,
                    },

                    borderBottom:
                      '1px solid #edf1ef',
                  }}
                >
                  <Box
                    sx={{
                      color:
                        '#98a2b3',

                      fontSize: 10,

                      fontWeight:
                        800,

                      textTransform:
                        'uppercase',

                      letterSpacing:
                        0.6,

                      mb: 0.7,
                    }}
                  >
                    Complaint
                  </Box>

                  <Box
                    sx={{
                      color:
                        '#344054',

                      fontSize: 13,

                      lineHeight:
                        1.65,

                      whiteSpace:
                        'pre-wrap',
                    }}
                  >
                    {selectedCase
                      .ticket
                      .description ||
                      'No additional description provided.'}
                  </Box>
                </Box>

                {/* =================================================
                    CASE OWNERSHIP
                ================================================= */}

                {selectedCase.ticket
                  .escalated_to_admin ? (
                  <Box
                    sx={{
                      mx: {
                        xs: 1.5,
                        md: 2,
                      },

                      my: 1,

                      p: 1.5,

                      borderRadius:
                        '12px',

                      background:
                        '#fff8ed',

                      border:
                        '1px solid #f3d7a6',
                    }}
                  >
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                      >
                        <AccountBalanceRoundedIcon
                          sx={{
                            color:
                              '#b54708',

                            fontSize:
                              20,
                          }}
                        />

                        <Box
                          sx={{
                            fontSize:
                              12,

                            fontWeight:
                              850,

                            color:
                              '#7a4b00',
                          }}
                        >
                          Forwarded to Administration
                        </Box>
                      </Stack>

                      <Box
                        sx={{
                          fontSize:
                            10.5,

                          color:
                            '#7a4b00',

                          lineHeight:
                            1.55,
                        }}
                      >
                        Customer Care no longer
                        controls this case.
                        Administration has
                        responsibility for further
                        investigation and resolution.
                      </Box>

                      <Box
                        sx={{
                          display:
                            'grid',

                          gridTemplateColumns:
                            {
                              xs: '1fr',
                              sm: '1fr 1fr',
                            },

                          gap: 1,
                        }}
                      >
                        <Box>
                          <Box
                            sx={{
                              fontSize:
                                9,

                              color:
                                '#98702c',

                              fontWeight:
                                800,

                              textTransform:
                                'uppercase',
                            }}
                          >
                            Forwarded By
                          </Box>

                          <Box
                            sx={{
                              mt: 0.3,

                              fontSize:
                                11,

                              fontWeight:
                                700,

                              color:
                                '#5f450c',
                            }}
                          >
                            {selectedCase
                              .ticket
                              .escalated_by_name ||
                              agentName}
                          </Box>
                        </Box>

                        <Box>
                          <Box
                            sx={{
                              fontSize:
                                9,

                              color:
                                '#98702c',

                              fontWeight:
                                800,

                              textTransform:
                                'uppercase',
                            }}
                          >
                            Administration
                          </Box>

                          <Box
                            sx={{
                              mt: 0.3,

                              fontSize:
                                11,

                              fontWeight:
                                700,

                              color:
                                '#5f450c',
                            }}
                          >
                            {selectedCase
                              .ticket
                              .assigned_admin_name ||
                              'Awaiting Administration'}
                          </Box>
                        </Box>
                      </Box>

                      {selectedCase.ticket
                        .escalation_reason && (
                        <Box
                          sx={{
                            mt: 0.5,

                            p: 1,

                            borderRadius:
                              '9px',

                            background:
                              '#ffffff',

                            border:
                              '1px solid #f1dfbd',
                          }}
                        >
                          <Box
                            sx={{
                              fontSize:
                                9,

                              fontWeight:
                                800,

                              color:
                                '#98702c',

                              textTransform:
                                'uppercase',
                            }}
                          >
                            Escalation Reason
                          </Box>

                          <Box
                            sx={{
                              mt: 0.35,

                              fontSize:
                                11,

                              color:
                                '#5f450c',

                              lineHeight:
                                1.5,
                            }}
                          >
                            {
                              selectedCase
                                .ticket
                                .escalation_reason
                            }
                          </Box>
                        </Box>
                      )}
                    </Stack>
                  </Box>
                ) : (
                  !selectedCase.ticket
                    .assigned_to &&
                  selectedCase.ticket
                    .status !==
                    'closed' && (
                    <Box
                      sx={{
                        mx: {
                          xs: 1.5,
                          md: 2,
                        },

                        mb: 1,

                        p: 1.5,

                        borderRadius:
                          '12px',

                        background:
                          '#f0fbf5',

                        border:
                          '1px solid #ccebd9',
                      }}
                    >
                      <Stack
                        direction={{
                          xs: 'column',
                          sm: 'row',
                        }}
                        spacing={1.5}
                        alignItems={{
                          xs: 'stretch',
                          sm: 'center',
                        }}
                        justifyContent="space-between"
                      >
                        <Box>
                          <Box
                            sx={{
                              fontSize:
                                12,

                              fontWeight:
                                800,

                              color:
                                '#063b2d',
                            }}
                          >
                            This case is available
                          </Box>

                          <Box
                            sx={{
                              mt: 0.3,

                              fontSize:
                                10.5,

                              color:
                                '#66756e',
                            }}
                          >
                            Take this case to become
                            responsible for the customer
                            conversation.
                          </Box>
                        </Box>

                        <Button
                          variant="contained"
                          onClick={
                            takeCase
                          }
                          disabled={
                            actionLoading
                          }
                          startIcon={
                            actionLoading ? (
                              <CircularProgress
                                size={16}
                                sx={{
                                  color:
                                    '#ffffff',
                                }}
                              />
                            ) : (
                              <SupportAgentRoundedIcon />
                            )
                          }
                          sx={{
                            background:
                              '#087c43',

                            color:
                              '#ffffff',

                            textTransform:
                              'none',

                            fontWeight:
                              800,

                            borderRadius:
                              '10px',

                            boxShadow:
                              'none',

                            whiteSpace:
                              'nowrap',

                            '&:hover':
                              {
                                background:
                                  '#066a38',

                                boxShadow:
                                  'none',
                              },
                          }}
                        >
                          Take Case
                        </Button>
                      </Stack>
                    </Box>
                  )
                )}

                {/* =================================================
                    CONVERSATION
                ================================================= */}

                <Box
                  sx={{
                    p: {
                      xs: 1.5,
                      md: 2,
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      mb: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        fontSize:
                          15,

                        fontWeight:
                          800,

                        color:
                          '#063b2d',
                      }}
                    >
                      Conversation
                    </Box>

                    {selectedCase
                      .ticket
                      .escalated_to_admin ? (
                      <Chip
                        icon={
                          <AccountBalanceRoundedIcon />
                        }
                        label={
                          selectedCase
                            .ticket
                            .assigned_admin_name
                            ? `Administration: ${selectedCase.ticket.assigned_admin_name}`
                            : 'Awaiting Administration'
                        }
                        size="small"
                        sx={{
                          background:
                            '#fff4e5',

                          color:
                            '#9a6700',

                          fontWeight:
                            700,
                        }}
                      />
                    ) : (
                      selectedCase
                        .ticket
                        .assigned_agent_name && (
                        <Chip
                          icon={
                            <SupportAgentRoundedIcon />
                          }
                          label={`Assigned to ${selectedCase.ticket.assigned_agent_name}`}
                          size="small"
                          sx={{
                            background:
                              '#edf8f2',

                            color:
                              '#087c43',

                            fontWeight:
                              700,
                          }}
                        />
                      )
                    )}
                  </Stack>

                  <Box
                    sx={{
                      maxHeight: 430,

                      overflowY:
                        'auto',

                      pr: 0.5,
                    }}
                  >
                    {selectedCase
                      .messages
                      .length === 0 ? (
                      <Box
                        sx={{
                          p: 3,

                          textAlign:
                            'center',

                          color:
                            '#98a2b3',

                          fontSize: 12,
                        }}
                      >
                        No messages yet.
                      </Box>
                    ) : (
                      <Stack
                        spacing={1.3}
                      >
                        {selectedCase.messages.map(
                          (
                            message
                          ) => {
                            const isCustomer =
                              message.sender_type ===
                              'customer';

                            const isAssistant =
                              message.sender_type ===
                              'assistant';

                            const isAdmin =
                              message.sender_type ===
                              'admin';

                            return (
                              <Box
                                key={
                                  message.id
                                }
                                sx={{
                                  display:
                                    'flex',

                                  justifyContent:
                                    isCustomer
                                      ? 'flex-start'
                                      : 'flex-end',
                                }}
                              >
                                <Box
                                  sx={{
                                    maxWidth:
                                      {
                                        xs: '92%',
                                        md: '78%',
                                      },

                                    borderRadius:
                                      '14px',

                                    px: 1.5,

                                    py: 1.2,

                                    background:
                                      isCustomer
                                        ? '#f3f5f4'
                                        : isAssistant
                                        ? '#eef8f3'
                                        : isAdmin
                                        ? '#fff5e8'
                                        : '#087c43',

                                    color:
                                      isCustomer
                                        ? '#344054'
                                        : isAssistant
                                        ? '#175c3d'
                                        : isAdmin
                                        ? '#7a4b00'
                                        : '#ffffff',

                                    border:
                                      isCustomer
                                        ? '1px solid #e3e8e5'
                                        : isAdmin
                                        ? '1px solid #f3d7a6'
                                        : 'none',
                                  }}
                                >
                                  <Stack
                                    direction="row"
                                    spacing={
                                      0.7
                                    }
                                    alignItems="center"
                                    sx={{
                                      mb: 0.5,
                                    }}
                                  >
                                    {!isCustomer && (
                                      isAdmin ? (
                                        <AccountBalanceRoundedIcon
                                          sx={{
                                            fontSize:
                                              15,
                                          }}
                                        />
                                      ) : (
                                        <SupportAgentRoundedIcon
                                          sx={{
                                            fontSize:
                                              15,
                                          }}
                                        />
                                      )
                                    )}

                                    <Box
                                      sx={{
                                        fontSize:
                                          10,

                                        fontWeight:
                                          800,
                                      }}
                                    >
                                      {getMessageSenderName(
                                        message
                                      )}
                                    </Box>
                                  </Stack>

                                  <Box
                                    sx={{
                                      fontSize:
                                        12.5,

                                      lineHeight:
                                        1.55,

                                      whiteSpace:
                                        'pre-wrap',
                                    }}
                                  >
                                    {
                                      message.message
                                    }
                                  </Box>

                                  <Box
                                    sx={{
                                      mt: 0.6,

                                      fontSize:
                                        9,

                                      opacity:
                                        0.65,

                                      textAlign:
                                        'right',
                                    }}
                                  >
                                    {formatDateTime(
                                      message.created_at
                                    )}
                                  </Box>
                                </Box>
                              </Box>
                            );
                          }
                        )}
                      </Stack>
                    )}
                  </Box>

                  {/* =================================================
                      REPLY / ACTIONS
                  ================================================= */}

                  {!selectedCase.ticket
                    .escalated_to_admin &&
                    selectedCase.ticket
                      .status !==
                      'closed' && (
                      <Box
                        sx={{
                          mt: 2,
                        }}
                      >
                        <TextField
                          fullWidth
                          multiline
                          minRows={3}
                          maxRows={7}
                          placeholder="Reply to the customer..."
                          value={reply}
                          onChange={(
                            event
                          ) =>
                            setReply(
                              event.target
                                .value
                            )
                          }
                          disabled={
                            actionLoading
                          }
                          sx={{
                            '& .MuiOutlinedInput-root':
                              {
                                borderRadius:
                                  '12px',

                                background:
                                  '#fbfcfb',
                              },
                          }}
                        />

                        <Stack
                          direction={{
                            xs: 'column',
                            sm: 'row',
                          }}
                          spacing={1}
                          sx={{
                            mt: 1,
                          }}
                        >
                          <Button
                            variant="contained"
                            startIcon={
                              actionLoading ? (
                                <CircularProgress
                                  size={16}
                                  sx={{
                                    color:
                                      '#ffffff',
                                  }}
                                />
                              ) : (
                                <SendRoundedIcon />
                              )
                            }
                            onClick={
                              sendReply
                            }
                            disabled={
                              actionLoading ||
                              !reply.trim()
                            }
                            sx={{
                              background:
                                '#087c43',

                              textTransform:
                                'none',

                              fontWeight:
                                800,

                              borderRadius:
                                '10px',

                              boxShadow:
                                'none',

                              '&:hover':
                                {
                                  background:
                                    '#066a38',

                                  boxShadow:
                                    'none',
                                },
                            }}
                          >
                            Send Reply
                          </Button>

                          <Button
                            variant="outlined"
                            startIcon={
                              <AccessTimeRoundedIcon />
                            }
                            onClick={
                              waitForCustomer
                            }
                            disabled={
                              actionLoading
                            }
                            sx={{
                              borderColor:
                                '#d0d9d5',

                              color:
                                '#344054',

                              textTransform:
                                'none',

                              fontWeight:
                                750,

                              borderRadius:
                                '10px',
                            }}
                          >
                            Waiting for Customer
                          </Button>

                          <Button
                            variant="outlined"
                            startIcon={
                              <CheckCircleRoundedIcon />
                            }
                            onClick={
                              resolveCase
                            }
                            disabled={
                              actionLoading
                            }
                            sx={{
                              borderColor:
                                '#9ccfb1',

                              color:
                                '#087c43',

                              textTransform:
                                'none',

                              fontWeight:
                                750,

                              borderRadius:
                                '10px',
                            }}
                          >
                            Resolve
                          </Button>

                          {selectedCase
                            .ticket
                            .status ===
                            'resolved' && (
                            <Button
                              variant="outlined"
                              startIcon={
                                <LockRoundedIcon />
                              }
                              onClick={
                                closeCase
                              }
                              disabled={
                                actionLoading
                              }
                              sx={{
                                borderColor:
                                  '#d0d9d5',

                                color:
                                  '#344054',

                                textTransform:
                                  'none',

                                fontWeight:
                                  750,

                                borderRadius:
                                  '10px',
                              }}
                            >
                              Close Case
                            </Button>
                          )}

                          {selectedCase
                            .ticket
                            .assigned_to && (
                            <Button
                              variant="outlined"
                              startIcon={
                                <AccountBalanceRoundedIcon />
                              }
                              onClick={() =>
                                setEscalationDialogOpen(
                                  true
                                )
                              }
                              disabled={
                                actionLoading
                              }
                              sx={{
                                borderColor:
                                  '#e5b75c',

                                color:
                                  '#9a6700',

                                textTransform:
                                  'none',

                                fontWeight:
                                  800,

                                borderRadius:
                                  '10px',

                                '&:hover':
                                  {
                                    borderColor:
                                      '#b54708',

                                    background:
                                      '#fff8ed',
                                  },
                              }}
                            >
                              Forward to Administration
                            </Button>
                          )}
                        </Stack>
                      </Box>
                    )}

                  {/* ADMINISTRATION LOCK MESSAGE */}

                  {selectedCase.ticket
                    .escalated_to_admin && (
                    <Alert
                      severity="warning"
                      icon={
                        <LockRoundedIcon />
                      }
                      sx={{
                        mt: 2,

                        borderRadius:
                          '11px',

                        fontSize: 11,

                        background:
                          '#fffaf1',

                        border:
                          '1px solid #f3d7a6',

                        color:
                          '#7a4b00',
                      }}
                    >
                      This case is now under
                      Administration. Customer Care
                      cannot send replies or change
                      the case status.
                    </Alert>
                  )}
                </Box>

                {/* =================================================
                    TRANSACTION INVESTIGATION
                ================================================= */}

                <Box
                  sx={{
                    borderTop:
                      '1px solid #edf1ef',

                    p: {
                      xs: 1.5,
                      md: 2,
                    },

                    background:
                      '#fbfcfb',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{
                      mb: 0.5,
                    }}
                  >
                    <AccountBalanceRoundedIcon
                      sx={{
                        color:
                          '#087c43',

                        fontSize:
                          20,
                      }}
                    />

                    <Box
                      sx={{
                        fontSize:
                          15,

                        fontWeight:
                          800,

                        color:
                          '#063b2d',
                      }}
                    >
                      Transaction Investigation
                    </Box>
                  </Stack>

                  <Box
                    sx={{
                      color:
                        '#66756e',

                      fontSize: 11,

                      mb: 1.5,
                    }}
                  >
                    Read-only investigation.
                    Customer Care cannot modify
                    balances or transactions.
                  </Box>

                  <Stack
                    direction={{
                      xs: 'column',
                      sm: 'row',
                    }}
                    spacing={1}
                  >
                    <TextField
                      fullWidth
                      size="small"
                      label="Transaction Reference"
                      placeholder="ZEN-TRF-..."
                      value={
                        transactionReference
                      }
                      onChange={(
                        event
                      ) =>
                        setTransactionReference(
                          event.target
                            .value
                        )
                      }
                      onKeyDown={(
                        event
                      ) => {
                        if (
                          event.key ===
                          'Enter'
                        ) {
                          investigateTransaction();
                        }
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root':
                          {
                            borderRadius:
                              '10px',

                            background:
                              '#ffffff',
                          },
                      }}
                    />

                    <Button
                      variant="contained"
                      onClick={
                        investigateTransaction
                      }
                      disabled={
                        investigationLoading
                      }
                      startIcon={
                        investigationLoading ? (
                          <CircularProgress
                            size={16}
                            sx={{
                              color:
                                '#ffffff',
                            }}
                          />
                        ) : (
                          <SearchRoundedIcon />
                        )
                      }
                      sx={{
                        minWidth: 150,

                        background:
                          '#087c43',

                        textTransform:
                          'none',

                        fontWeight:
                          800,

                        borderRadius:
                          '10px',

                        boxShadow:
                          'none',

                        '&:hover':
                          {
                            background:
                              '#066a38',

                            boxShadow:
                              'none',
                          },
                      }}
                    >
                      Investigate
                    </Button>
                  </Stack>

                  {/* =================================================
                      INVESTIGATION RESULT
                  ================================================= */}

                  {investigation && (
                    <Box
                      sx={{
                        mt: 2,
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          border:
                            '1px solid #dce8e1',

                          borderRadius:
                            '14px',

                          background:
                            '#ffffff',

                          overflow:
                            'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            p: 1.7,

                            borderBottom:
                              '1px solid #edf1ef',
                          }}
                        >
                          <Stack
                            direction={{
                              xs: 'column',
                              sm: 'row',
                            }}
                            spacing={1}
                            justifyContent="space-between"
                            alignItems={{
                              xs: 'flex-start',
                              sm: 'center',
                            }}
                          >
                            <Box>
                              <Box
                                sx={{
                                  fontSize:
                                    15,

                                  fontWeight:
                                    850,

                                  color:
                                    '#063b2d',
                                }}
                              >
                                {
                                  investigation.reference
                                }
                              </Box>

                              <Box
                                sx={{
                                  mt: 0.3,

                                  color:
                                    '#66756e',

                                  fontSize:
                                    11,
                                }}
                              >
                                {
                                  investigation.type
                                }
                              </Box>
                            </Box>

                            <Chip
                              label={
                                investigation.status_label ||
                                titleCase(
                                  investigation.status
                                )
                              }
                              sx={{
                                fontWeight:
                                  800,

                                ...statusColor(
                                  investigation.status
                                ),
                              }}
                            />
                          </Stack>
                        </Box>

                        {/* TRANSACTION SUMMARY */}

                        <Box
                          sx={{
                            p: 1.7,

                            display:
                              'grid',

                            gridTemplateColumns:
                              {
                                xs: '1fr 1fr',
                                md: 'repeat(4, 1fr)',
                              },

                            gap: 1.5,
                          }}
                        >
                          <Box>
                            <Box
                              sx={{
                                fontSize:
                                  9,

                                color:
                                  '#98a2b3',

                                fontWeight:
                                  800,

                                textTransform:
                                  'uppercase',
                              }}
                            >
                              Amount
                            </Box>

                            <Box
                              sx={{
                                mt: 0.4,

                                fontSize:
                                  15,

                                fontWeight:
                                  850,

                                color:
                                  '#063b2d',
                              }}
                            >
                              {formatMoney(
                                investigation.amount,
                                investigation.currency ||
                                  'NGN'
                              )}
                            </Box>
                          </Box>

                          <Box>
                            <Box
                              sx={{
                                fontSize:
                                  9,

                                color:
                                  '#98a2b3',

                                fontWeight:
                                  800,

                                textTransform:
                                  'uppercase',
                              }}
                            >
                              Initiated
                            </Box>

                            <Box
                              sx={{
                                mt: 0.4,

                                fontSize:
                                  11,

                                fontWeight:
                                  700,

                                color:
                                  '#344054',
                              }}
                            >
                              {formatDateTime(
                                investigation.initiated_at
                              )}
                            </Box>
                          </Box>

                          <Box>
                            <Box
                              sx={{
                                fontSize:
                                  9,

                                color:
                                  '#98a2b3',

                                fontWeight:
                                  800,

                                textTransform:
                                  'uppercase',
                              }}
                            >
                              Provider Reference
                            </Box>

                            <Box
                              sx={{
                                mt: 0.4,

                                fontSize:
                                  10,

                                fontWeight:
                                  700,

                                color:
                                  '#344054',

                                wordBreak:
                                  'break-all',
                              }}
                            >
                              {investigation
                                .provider_reference ||
                                '—'}
                            </Box>
                          </Box>

                          <Box>
                            <Box
                              sx={{
                                fontSize:
                                  9,

                                color:
                                  '#98a2b3',

                                fontWeight:
                                  800,

                                textTransform:
                                  'uppercase',
                              }}
                            >
                              Completed
                            </Box>

                            <Box
                              sx={{
                                mt: 0.4,

                                fontSize:
                                  11,

                                fontWeight:
                                  700,

                                color:
                                  '#344054',
                              }}
                            >
                              {formatDateTime(
                                investigation.completed_at
                              )}
                            </Box>
                          </Box>
                        </Box>

                        <Divider />

                        {/* CUSTOMER / RECIPIENT */}

                        <Box
                          sx={{
                            p: 1.7,

                            display:
                              'grid',

                            gridTemplateColumns:
                              {
                                xs: '1fr',
                                md: '1fr 1fr',
                              },

                            gap: 2,
                          }}
                        >
                          <Box>
                            <Box
                              sx={{
                                fontSize:
                                  11,

                                fontWeight:
                                  850,

                                color:
                                  '#063b2d',

                                mb: 1,
                              }}
                            >
                              From Customer
                            </Box>

                            <Stack
                              spacing={0.6}
                            >
                              <InfoRow
                                label="Name"
                                value={
                                  investigation
                                    .customer
                                    ?.full_name ||
                                  '—'
                                }
                              />

                              <InfoRow
                                label="Account"
                                value={maskValue(
                                  investigation
                                    .customer
                                    ?.account_number
                                )}
                              />

                              <InfoRow
                                label="KYC"
                                value={
                                  investigation
                                    .customer
                                    ?.kyc_status
                                    ? titleCase(
                                        investigation.customer.kyc_status
                                      )
                                    : '—'
                                }
                              />
                            </Stack>
                          </Box>

                          <Box>
                            <Box
                              sx={{
                                fontSize:
                                  11,

                                fontWeight:
                                  850,

                                color:
                                  '#063b2d',

                                mb: 1,
                              }}
                            >
                              Destination
                            </Box>

                            <Stack
                              spacing={0.6}
                            >
                              <InfoRow
                                label="Recipient"
                                value={
                                  investigation
                                    .recipient
                                    ?.name ||
                                  '—'
                                }
                              />

                              <InfoRow
                                label="Account"
                                value={maskValue(
                                  investigation
                                    .recipient
                                    ?.account_number
                                )}
                              />

                              <InfoRow
                                label="Bank"
                                value={
                                  investigation
                                    .recipient
                                    ?.bank_name ||
                                  '—'
                                }
                              />
                            </Stack>
                          </Box>
                        </Box>

                        {/* FAILURE REASON */}

                        {investigation
                          .failure_reason && (
                          <Box
                            sx={{
                              mx: 1.7,

                              mb: 1.7,

                              p: 1.3,

                              borderRadius:
                                '10px',

                              background:
                                '#fff6f5',

                              border:
                                '1px solid #f4cccc',
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={1}
                              alignItems="flex-start"
                            >
                              <WarningAmberRoundedIcon
                                sx={{
                                  color:
                                    '#c62828',

                                  fontSize:
                                    19,
                                }}
                              />

                              <Box>
                                <Box
                                  sx={{
                                    fontSize:
                                      11,

                                    fontWeight:
                                      800,

                                    color:
                                      '#b42318',
                                  }}
                                >
                                  Transfer Failure Reason
                                </Box>

                                <Box
                                  sx={{
                                    mt: 0.3,

                                    fontSize:
                                      11,

                                    color:
                                      '#7a271a',
                                  }}
                                >
                                  {
                                    investigation.failure_reason
                                  }
                                </Box>
                              </Box>
                            </Stack>
                          </Box>
                        )}

                        {/* TRANSACTION FLOW */}

                        <Box
                          sx={{
                            p: 1.7,

                            borderTop:
                              '1px solid #edf1ef',
                          }}
                        >
                          <Box
                            sx={{
                              fontSize:
                                11,

                              fontWeight:
                                850,

                              color:
                                '#063b2d',

                              mb: 1.5,
                            }}
                          >
                            Transaction Flow
                          </Box>

                          <Stack
                            spacing={0}
                          >
                            {(
                              investigation.flow ||
                              []
                            ).map(
                              (
                                step,
                                index,
                                array
                              ) => (
                                <Box
                                  key={`${step.step}-${index}`}
                                  sx={{
                                    display:
                                      'flex',

                                    gap: 1.2,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display:
                                        'flex',

                                      flexDirection:
                                        'column',

                                      alignItems:
                                        'center',
                                    }}
                                  >
                                    <FlowIcon
                                      status={
                                        step.status
                                      }
                                    />

                                    {index <
                                      array.length -
                                        1 && (
                                      <Box
                                        sx={{
                                          width: 2,

                                          flex: 1,

                                          minHeight: 22,

                                          background:
                                            '#dce8e1',
                                        }}
                                      />
                                    )}
                                  </Box>

                                  <Box
                                    sx={{
                                      pb:
                                        index <
                                        array.length -
                                          1
                                          ? 1.2
                                          : 0,

                                      flex: 1,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        fontSize:
                                          11.5,

                                        fontWeight:
                                          750,

                                        color:
                                          '#344054',
                                      }}
                                    >
                                      {
                                        step.label
                                      }
                                    </Box>

                                    <Box
                                      sx={{
                                        mt: 0.2,

                                        fontSize:
                                          9.5,

                                        color:
                                          '#98a2b3',
                                      }}
                                    >
                                      {step.timestamp
                                        ? formatDateTime(
                                            step.timestamp
                                          )
                                        : titleCase(
                                            step.status
                                          )}
                                    </Box>
                                  </Box>
                                </Box>
                              )
                            )}
                          </Stack>
                        </Box>
                      </Paper>
                    </Box>
                  )}
                </Box>

                {/* =================================================
                    CASE EVENTS
                ================================================= */}

                {selectedCase
                  .events
                  .length > 0 && (
                  <Box
                    sx={{
                      borderTop:
                        '1px solid #edf1ef',

                      p: {
                        xs: 1.5,
                        md: 2,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        fontSize:
                          13,

                        fontWeight:
                          800,

                        color:
                          '#063b2d',

                        mb: 1,
                      }}
                    >
                      Case Activity
                    </Box>

                    <Stack
                      spacing={0.8}
                    >
                      {selectedCase.events
                        .slice(0, 20)
                        .map(
                          (
                            event
                          ) => (
                            <Box
                              key={
                                event.id
                              }
                              sx={{
                                display:
                                  'flex',

                                justifyContent:
                                  'space-between',

                                gap: 2,

                                py: 0.7,
                              }}
                            >
                              <Box>
                                <Box
                                  sx={{
                                    fontSize:
                                      11,

                                    fontWeight:
                                      700,

                                    color:
                                      '#475467',
                                  }}
                                >
                                  {formatEventType(
                                    event.event_type
                                  )}
                                </Box>

                                {event.actor_name && (
                                  <Box
                                    sx={{
                                      mt: 0.15,

                                      fontSize:
                                        9.5,

                                      color:
                                        '#66756e',
                                    }}
                                  >
                                    By{' '}
                                    {
                                      event.actor_name
                                    }
                                  </Box>
                                )}

                                {event.note && (
                                  <Box
                                    sx={{
                                      mt: 0.2,

                                      fontSize:
                                        10,

                                      color:
                                        '#98a2b3',
                                    }}
                                  >
                                    {
                                      event.note
                                    }
                                  </Box>
                                )}
                              </Box>

                              <Box
                                sx={{
                                  flexShrink:
                                    0,

                                  fontSize:
                                    9,

                                  color:
                                    '#98a2b3',
                                }}
                              >
                                {formatDateTime(
                                  event.created_at
                                )}
                              </Box>
                            </Box>
                          )
                        )}
                    </Stack>
                  </Box>
                )}
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  minHeight:
                    620,

                  border:
                    '1px solid #e1e8e4',

                  borderRadius:
                    '17px',

                  background:
                    '#ffffff',

                  display: 'flex',

                  alignItems:
                    'center',

                  justifyContent:
                    'center',

                  p: 4,
                }}
              >
                <Stack
                  spacing={1.2}
                  alignItems="center"
                  sx={{
                    maxWidth: 400,

                    textAlign:
                      'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,

                      borderRadius:
                        '18px',

                      background:
                        '#e8f8f0',

                      color:
                        '#087c43',

                      display:
                        'flex',

                      alignItems:
                        'center',

                      justifyContent:
                        'center',
                    }}
                  >
                    <SupportAgentRoundedIcon
                      sx={{
                        fontSize:
                          32,
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      fontSize:
                        19,

                      fontWeight:
                        850,

                      color:
                        '#063b2d',
                    }}
                  >
                    Select a support case
                  </Box>

                  <Box
                    sx={{
                      color:
                        '#66756e',

                      fontSize:
                        12,

                      lineHeight:
                        1.6,
                    }}
                  >
                    Select a case from the
                    list to review the
                    customer conversation,
                    investigate transactions
                    and manage the case.
                  </Box>
                </Stack>
              </Paper>
            )}
          </Box>
        </Box>
      </Box>

      {/* ========================================================
          FORWARD TO ADMINISTRATION DIALOG
      ======================================================== */}

      {escalationDialogOpen && (
        <Box
          sx={{
            position:
              'fixed',

            inset: 0,

            zIndex: 1500,

            background:
              'rgba(16, 24, 40, 0.45)',

            display: 'flex',

            alignItems:
              'center',

            justifyContent:
              'center',

            p: 2,
          }}

          onClick={() => {
            if (
              !escalationLoading
            ) {
              setEscalationDialogOpen(
                false
              );
            }
          }}
        >
          <Paper
            elevation={0}
            onClick={(event) =>
              event.stopPropagation()
            }
            sx={{
              width: '100%',

              maxWidth: 520,

              borderRadius:
                '18px',

              background:
                '#ffffff',

              border:
                '1px solid #e1e8e4',

              overflow:
                'hidden',
            }}
          >
            <Box
              sx={{
                p: 2,

                borderBottom:
                  '1px solid #edf1ef',
              }}
            >
              <Stack
                direction="row"
                spacing={1.2}
                alignItems="center"
              >
                <Box
                  sx={{
                    width: 42,
                    height: 42,

                    borderRadius:
                      '12px',

                    background:
                      '#fff4e5',

                    color:
                      '#b54708',

                    display:
                      'flex',

                    alignItems:
                      'center',

                    justifyContent:
                      'center',
                  }}
                >
                  <AccountBalanceRoundedIcon />
                </Box>

                <Box
                  sx={{
                    flex: 1,
                  }}
                >
                  <Box
                    sx={{
                      fontSize:
                        16,

                      fontWeight:
                        850,

                      color:
                        '#063b2d',
                    }}
                  >
                    Forward to Administration
                  </Box>

                  <Box
                    sx={{
                      mt: 0.25,

                      fontSize:
                        11,

                      color:
                        '#66756e',
                    }}
                  >
                    {
                      selectedCase
                        ?.ticket
                        .ticket_number
                    }
                  </Box>
                </Box>

                <IconButton
                  onClick={() =>
                    setEscalationDialogOpen(
                      false
                    )
                  }
                  disabled={
                    escalationLoading
                  }
                >
                  <CloseRoundedIcon />
                </IconButton>
              </Stack>
            </Box>

            <Box
              sx={{
                p: 2,
              }}
            >
              <Alert
                severity="warning"
                icon={
                  <WarningAmberRoundedIcon />
                }
                sx={{
                  mb: 2,

                  borderRadius:
                    '11px',

                  fontSize:
                    12,
                }}
              >
                Forwarding this case transfers
                responsibility to Administration.
                Customer Care will no longer be
                able to modify or resolve the case.
              </Alert>

              <Box
                sx={{
                  mb: 1,

                  fontSize:
                    12,

                  fontWeight:
                    800,

                  color:
                    '#344054',
                }}
              >
                Escalation reason
              </Box>

              <TextField
                fullWidth
                multiline
                minRows={4}
                maxRows={7}
                placeholder="Explain why Administration needs to take over this case..."
                value={
                  escalationReason
                }
                onChange={(
                  event
                ) =>
                  setEscalationReason(
                    event.target
                      .value
                  )
                }
                disabled={
                  escalationLoading
                }
                helperText="Provide enough detail for Administration to understand why the case requires administrative action."
                sx={{
                  '& .MuiOutlinedInput-root':
                    {
                      borderRadius:
                        '11px',

                      background:
                        '#fbfcfb',
                    },
                }}
              />
            </Box>

            <Divider />

            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              sx={{
                p: 2,
              }}
            >
              <Button
                variant="outlined"
                onClick={() =>
                  setEscalationDialogOpen(
                    false
                  )
                }
                disabled={
                  escalationLoading
                }
                sx={{
                  borderColor:
                    '#d0d9d5',

                  color:
                    '#344054',

                  textTransform:
                    'none',

                  fontWeight:
                    750,

                  borderRadius:
                    '10px',
                }}
              >
                Cancel
              </Button>

              <Button
                variant="contained"
                onClick={
                  escalateToAdministration
                }
                disabled={
                  escalationLoading ||
                  escalationReason
                    .trim()
                    .length < 5
                }
                startIcon={
                  escalationLoading ? (
                    <CircularProgress
                      size={16}
                      sx={{
                        color:
                          '#ffffff',
                      }}
                    />
                  ) : (
                    <AccountBalanceRoundedIcon />
                  )
                }
                sx={{
                  background:
                    '#087c43',

                  textTransform:
                    'none',

                  fontWeight:
                    800,

                  borderRadius:
                    '10px',

                  boxShadow:
                    'none',

                  '&:hover':
                    {
                      background:
                        '#066a38',

                      boxShadow:
                        'none',
                    },
                }}
              >
                Forward to Administration
              </Button>
            </Stack>
          </Paper>
        </Box>
      )}

      {/* ========================================================
          NOTIFICATIONS
      ======================================================== */}

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={3500}
        onClose={() =>
          setNotice('')
        }
        message={notice}
      />

      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() =>
          setError('')
        }
      >
        <Alert
          severity="error"
          onClose={() =>
            setError('')
          }
          sx={{
            borderRadius:
              '10px',
          }}
        >
          {error}
        </Alert>
      </Snackbar>
        </Box>
      </>
   );
 };

// ============================================================
// INFO ROW
// ============================================================

const InfoRow: React.FC<{
  label: string;
  value: string;
}> = ({
  label,
  value,
}) => {
  return (
    <Stack
      direction="row"
      spacing={1}
      justifyContent="space-between"
      sx={{
        gap: 2,
      }}
    >
      <Box
        sx={{
          color:
            '#98a2b3',

          fontSize: 10,
        }}
      >
        {label}
      </Box>

      <Box
        sx={{
          color:
            '#344054',

          fontSize: 10.5,

          fontWeight:
            700,

          textAlign:
            'right',

          wordBreak:
            'break-word',
        }}
      >
        {value}
      </Box>
    </Stack>
  );
};

// ============================================================
// FLOW ICON
// ============================================================

const FlowIcon: React.FC<{
  status: FlowStatus;
}> = ({
  status,
}) => {
  if (
    status ===
    'failed'
  ) {
    return (
      <Box
        sx={{
          width: 23,
          height: 23,

          borderRadius:
            '50%',

          background:
            '#fff0f0',

          color:
            '#c62828',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',

          fontSize: 12,

          fontWeight:
            900,
        }}
      >
        !
      </Box>
    );
  }

  if (
    status ===
    'processing'
  ) {
    return (
      <Box
        sx={{
          width: 23,
          height: 23,

          borderRadius:
            '50%',

          background:
            '#fff6df',

          color:
            '#9a6700',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <AccessTimeRoundedIcon
          sx={{
            fontSize: 14,
          }}
        />
      </Box>
    );
  }

  if (
    status ===
      'pending' ||
    status ===
      'unknown'
  ) {
    return (
      <Box
        sx={{
          width: 23,
          height: 23,

          borderRadius:
            '50%',

          background:
            '#f2f4f7',

          color:
            '#667085',

          display:
            'flex',

          alignItems:
            'center',

          justifyContent:
            'center',
        }}
      >
        <AccessTimeRoundedIcon
          sx={{
            fontSize: 14,
          }}
        />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 23,
        height: 23,

        borderRadius:
          '50%',

        background:
          '#e8f8f0',

        color:
          '#087c43',

        display:
          'flex',

        alignItems:
          'center',

        justifyContent:
          'center',
      }}
    >
      <CheckCircleRoundedIcon
        sx={{
          fontSize: 15,
        }}
      />
    </Box>
  );
};

export default CustomerCareDashboard;
