
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getAuthToken,
  setAuthToken,
  deleteAuthToken,
} from './services/authTokenStorage';

import colors from './theme/colors';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import Dashboard from './screens/Dashboard';
import NotificationsScreen from './screens/NotificationsScreen';
import TransactionHistoryScreen from './screens/TransactionHistoryScreen';
import TransactionDetailsScreen from './screens/TransactionDetailsScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import AirtimeScreen from './screens/AirtimeScreen';
import DataScreen from './screens/DataScreen';
import ElectricityScreen from './screens/ElectricityScreen';
import TVScreen from './screens/TVScreen';
import BillsScreen from './screens/BillsScreen';

import {
  registerPushNotifications,
  unregisterPushNotifications,
} from './services/pushNotificationService';

// ======================================================
// ZENIMONIES BANKING — MOBILE APPLICATION
// File: mobile/App.tsx
// ======================================================

const API_BASE =
  'https://zenimonies-banking.onrender.com/api';

const AUTH_URL = `${API_BASE}/auth`;
const PROFILE_URL = `${API_BASE}/profile`;
const ACCOUNT_URL = `${API_BASE}/account`;
const TRANSACTIONS_URL =
  `${API_BASE}/account/transactions`;

const AUTH_TOKEN_KEY =
  'zenimonies_auth_token';

type Screen =
  | 'welcome'
  | 'login'
  | 'register'
  | 'home'
  | 'profile'
  | 'settings'
  | 'history'
  | 'notifications'
  | 'transaction-details'
  | 'airtime'
  | 'data'
  | 'bills'
  | 'electricity'
  | 'tv';

type Account = {
  id?: string;
  account_number?: string | null;
  account_type?: string;
  currency?: string;
  balance?: number | string;
  status?: string;
  kyc_status?: string;
  kyc_tier?: number | string;
};

type AuthUser = {
  id?: string;
  full_name?: string;
  first_name?: string;
  surname?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  bvn_verified?: boolean;
  verification_level?: number | string;
  verification_status?: string;
  kyc_level?: number | string;
  kyc_tier?: number | string;
  kyc_status?: string;
  profile_photo?: string | null;
};

type AuthSession = {
  success: boolean;
  token: string;
  user?: AuthUser;
  account?: Account;
  accounts?: Account[];
};

type Transaction = {
  id: string;
  title: string;
  description?: string;
  amount: string;
  type: 'credit' | 'debit';
  date: string;
  status?: string;
  reference?: string;
  currency?: string;
  transactionType?: string;
  fee?: string;
  totalDebit?: string;
  recipientName?: string;
  recipientAccount?: string;
  recipientBank?: string;
  senderName?: string;
  senderAccount?: string;
  provider?: string;
  phone?: string;
  customerNumber?: string;
  electricityToken?: string;
};

type AccountResponse = {
  success: boolean;
  account?: Account;
  message?: string;
};

type TransactionsResponse = {
  success: boolean;
  transactions?: any[];
  message?: string;
};

type ProfileResponse = {
  success: boolean;
  user?: AuthUser;
};

type ElectricityCustomer = {
  customerName: string;
  meterNumber: string;
  address?: string;
};

type ElectricityResult = {
  success?: boolean;
  status?: string;
  message?: string;
  reference?: string;
  provider_reference?: string;
  electricity_token?: string;
  token?: string;
  units?: string | number;
  customer_name?: string;
  customer_address?: string;
  meter_number?: string;
  meter_type?: string;
  provider?: string;
  [key: string]: any;
};

type TVPackage = {
  id: string;
  name: string;
  amount: number;
  description?: string;
};

type TVCustomer = {
  customerName: string;
  customerNumber: string;
};

type TVPlanRecord = {
  provider: string;
  variation_code: string;
  name: string;
  amount: number;
  description?: string;
};

// ======================================================
// CURRENCY FORMATTER
// ======================================================

const formatNaira = (
  value: number | string | undefined
): string | undefined => {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return undefined;
  }

  return amount.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// ======================================================
// TRANSACTION TITLE
// ======================================================

const getTransactionTitle = (
  transaction: any
): string => {
  const type = String(
    transaction.type || ''
  ).toLowerCase();

  if (
    type.includes('internal_transfer_received')
  ) {
    return 'Money received';
  }

  if (type.includes('transfer')) {
    return 'Bank transfer';
  }

  if (type.includes('airtime')) {
    return 'Airtime purchase';
  }

  if (type.includes('data')) {
    return 'Data purchase';
  }

  if (type.includes('electricity')) {
    return 'Electricity payment';
  }

  if (
    type.includes('tv') ||
    type.includes('cable')
  ) {
    return 'TV subscription';
  }

  if (type.includes('bill')) {
    return 'Bill payment';
  }

  if (type.includes('deposit')) {
    return 'Money deposited';
  }

  if (type.includes('withdraw')) {
    return 'Withdrawal';
  }

  return (
    transaction.description ||
    'Account transaction'
  );
};

// ======================================================
// TRANSACTION NORMALIZER
// ======================================================

const normalizeTransaction = (
  item: any
): Transaction => {
  const rawType = String(
    item.type || ''
  ).toLowerCase();

  const isCredit =
    rawType.includes('received') ||
    rawType.includes('credit') ||
    rawType.includes('incoming') ||
    rawType.includes('refund') ||
    rawType.includes('deposit');

  const numericAmount = Number(
    item.amount || 0
  );

  const amount = Number.isFinite(numericAmount)
    ? Math.abs(numericAmount)
    : 0;

  const dateValue = item.created_at
    ? new Date(item.created_at)
    : null;

  const date =
    dateValue &&
    !Number.isNaN(dateValue.getTime())
      ? dateValue.toLocaleString('en-NG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Date unavailable';

  return {
    id: String(
      item.id ||
        item.reference ||
        `${item.type}-${item.created_at}`
    ),

    title: getTransactionTitle(item),

    description:
      item.description ||
      item.recipient_name ||
      item.provider ||
      item.reference ||
      '',

    amount: `₦${amount.toLocaleString(
      'en-NG',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`,

    type: isCredit ? 'credit' : 'debit',

    date,

    status: String(
      item.status || 'Unknown'
    ),

    reference: item.reference
      ? String(item.reference)
      : undefined,

    currency: item.currency
      ? String(item.currency)
      : 'NGN',

    transactionType: rawType
      ? rawType.replace(/_/g, ' ')
      : undefined,

    fee:
      Number(
        item.transaction_fee ||
          item.fee ||
          0
      ) > 0
        ? `₦${Number(
            item.transaction_fee ||
              item.fee
          ).toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : undefined,

    totalDebit:
      Number(item.total_debit || 0) > 0
        ? `₦${Number(
            item.total_debit
          ).toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : undefined,

    recipientName: item.recipient_name
      ? String(item.recipient_name)
      : undefined,

    recipientAccount: item.recipient_account
      ? String(item.recipient_account)
      : undefined,

    recipientBank: item.recipient_bank
      ? String(item.recipient_bank)
      : undefined,

    senderName: item.sender_name
      ? String(item.sender_name)
      : undefined,

    senderAccount: item.sender_account
      ? String(item.sender_account)
      : undefined,

    provider: item.provider
      ? String(item.provider)
      : undefined,

    phone: item.phone
      ? String(item.phone)
      : undefined,

    customerNumber: item.customer_number
      ? String(item.customer_number)
      : undefined,

    electricityToken:
      item.electricity_token ||
      item.token
        ? String(
            item.electricity_token ||
              item.token
          )
        : undefined,
  };
};

// ======================================================
// JSON RESPONSE HANDLER
// ======================================================

async function readJson(
  response: Response
): Promise<any> {
  try {
    return await response.json();
  } catch {
    throw new Error(
      'The server returned an invalid response.'
    );
  }
}

// ======================================================
// API ERROR HANDLER
// ======================================================

const getApiErrorMessage = (
  data: any,
  fallback: string
): string => {
  return (
    data?.message ||
    data?.error ||
    data?.details ||
    fallback
  );
};

// ======================================================
// MAIN APPLICATION
// ======================================================

export default function App() {
  const [screen, setScreen] =
    useState<Screen>('welcome');
  
const [profileReturnScreen, setProfileReturnScreen] =
  useState<'home' | 'settings'>('home');

  const [session, setSession] =
    useState<AuthSession | null>(null);

  const [checkingSession, setCheckingSession] =
    useState(true);

  const [account, setAccount] =
    useState<Account | null>(null);

  const [transactions, setTransactions] =
    useState<Transaction[]>([]);

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [dashboardLoading, setDashboardLoading] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const refreshLock = useRef(false);

  // ====================================================
  // PROFILE PHOTO
  // ====================================================

  const [profilePhotoUri, setProfilePhotoUri] =
    useState<string | null>(null);

  const handleProfilePhotoChange =
    useCallback((uri: string) => {
      setProfilePhotoUri(uri);
    }, []);

  // ====================================================
  // TV PLANS
  // ====================================================

  const [tvPlans, setTVPlans] =
    useState<TVPackage[]>([]);

  const [tvPlanRecords, setTVPlanRecords] =
    useState<TVPlanRecord[]>([]);

  const [loadingTVPlans, setLoadingTVPlans] =
    useState(false);

  // ====================================================
  // PUSH NOTIFICATION OFFER
  // ====================================================

  const offerPushNotifications =
    useCallback((token: string) => {
      Alert.alert(
        'Stay updated',
        'Would you like ZENIMONIES to send important account and service announcements to this device?',
        [
          {
            text: 'Not now',
            style: 'cancel',
          },
          {
            text: 'Enable notifications',
            onPress: () => {
              registerPushNotifications(token)
                .then((result) => {
                  if (
                    !result.success &&
                    !result.permissionDenied
                  ) {
                    Alert.alert(
                      'Notifications',
                      'We could not enable notifications right now. Please try again later.'
                    );
                  }
                })
                .catch(() => {
                  Alert.alert(
                    'Notifications',
                    'We could not enable notifications right now. Please try again later.'
                  );
                });
            },
          },
        ]
      );
    }, []);

  // ====================================================
  // CLEAR SESSION
  // ====================================================

  const clearSession = useCallback(() => {
    setSession(null);
    setAccount(null);
    setTransactions([]);
    setSelectedTransaction(null);
    setProfilePhotoUri(null);
    setTVPlans([]);
    setTVPlanRecords([]);
    setRefreshing(false);
    setDashboardLoading(false);
    refreshLock.current = false;
    setScreen('welcome');

    void (async () => {
      try {
        await deleteAuthToken(
          AUTH_TOKEN_KEY
        );
      } catch (error) {
        console.error(
          'Auth token deletion failed:',
          error
        );

        try {
          await setAuthToken(
            AUTH_TOKEN_KEY,
            ''
          );
        } catch (fallbackError) {
          console.error(
            'Auth token invalidation failed:',
            fallbackError
          );
        }
      }
    })();
  }, []);

  // ====================================================
  // AUTHENTICATED GET REQUEST
  // ====================================================

  const authenticatedFetch =
    useCallback(
      async (
        url: string,
        token: string
      ): Promise<Response> => {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          const data = await readJson(
            response
          );

          if (
            data.code === 'TOKEN_EXPIRED' ||
            data.code === 'TOKEN_INVALID' ||
            data.code === 'AUTH_REQUIRED'
          ) {
            throw new Error(
              'SESSION_EXPIRED'
            );
          }

          throw new Error(
            data.message ||
              'Authentication failed.'
          );
        }

        return response;
      },
      []
    );

  // ====================================================
  // AUTHENTICATED POST REQUEST
  // ====================================================

  const authenticatedPost =
    useCallback(
      async (
        url: string,
        token: string,
        body: Record<string, any>
      ) => {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });

        const data = await readJson(
          response
        );

        if (!response.ok) {
          const error: any = new Error(
            getApiErrorMessage(
              data,
              'The request could not be completed.'
            )
          );

          error.status = response.status;
          error.code = data?.code;
          error.data = data;

          throw error;
        }

        return {
          data,
          status: response.status,
        };
      },
      []
    );

  // ====================================================
  // LOAD ACCOUNT AND TRANSACTIONS
  // ====================================================

  const loadDashboardData =
    useCallback(
      async (
        token: string,
        showLoader = true
      ): Promise<boolean> => {
        if (showLoader) {
          setDashboardLoading(true);
        }

        try {
          const [
            accountResponse,
            transactionResponse,
          ] = await Promise.all([
            authenticatedFetch(
              ACCOUNT_URL,
              token
            ),

            authenticatedFetch(
              TRANSACTIONS_URL,
              token
            ),
          ]);

          const accountData: AccountResponse =
            await readJson(
              accountResponse
            );

          const transactionData: TransactionsResponse =
            await readJson(
              transactionResponse
            );

          if (
            !accountResponse.ok ||
            accountData.success !== true
          ) {
            throw new Error(
              accountData.message ||
                'Unable to retrieve your account.'
            );
          }

          if (
            !transactionResponse.ok ||
            transactionData.success !== true
          ) {
            throw new Error(
              transactionData.message ||
                'Unable to retrieve your transactions.'
            );
          }

          if (!accountData.account) {
            throw new Error(
              'Your account details are unavailable.'
            );
          }

          setAccount(
            accountData.account
          );

          const rows = Array.isArray(
            transactionData.transactions
          )
            ? transactionData.transactions
            : [];

          setTransactions(
            rows.map(normalizeTransaction)
          );

          return true;
        } catch (error: any) {
          if (
            error.message ===
            'SESSION_EXPIRED'
          ) {
            Alert.alert(
              'Session expired',
              'Please sign in again to protect your account.',
              [
                {
                  text: 'Sign in',
                  onPress: clearSession,
                },
              ]
            );

            return false;
          }

          throw error;
        } finally {
          setDashboardLoading(false);
        }
      },
      [
        authenticatedFetch,
        clearSession,
      ]
    );

  // ====================================================
  // LOAD CUSTOMER PROFILE
  // ====================================================

  const loadProfile =
    useCallback(
      async (
        token: string
      ): Promise<AuthUser | undefined> => {
        try {
          const response =
            await authenticatedFetch(
              PROFILE_URL,
              token
            );

          const data: ProfileResponse =
            await readJson(response);

          if (
            response.ok &&
            data.success &&
            data.user
          ) {
            setProfilePhotoUri(
              data.user.profile_photo ||
                null
            );

            return data.user;
          }
        } catch (error) {
          console.warn(
            'Profile loading failed:',
            error
          );
        }

        return undefined;
      },
      [authenticatedFetch]
    );

  // ====================================================
  // LOAD TV PLANS
  // ====================================================

  const loadTVPlans =
    useCallback(
      async (
        token: string
      ) => {
        setLoadingTVPlans(true);

        try {
          const providers = [
            'DSTV',
            'GOTV',
            'STARTIMES',
          ];

          const providerResults =
            await Promise.all(
              providers.map(
                async (provider) => {
                  const response =
                    await authenticatedFetch(
                      `${API_BASE}/tv/plans?provider=${encodeURIComponent(
                        provider
                      )}`,
                      token
                    );

                  const data =
                    await readJson(
                      response
                    );

                  if (
                    !response.ok ||
                    data.success !== true
                  ) {
                    throw new Error(
                      data.message ||
                        `Unable to load ${provider} plans.`
                    );
                  }

                  return {
                    provider,
                    plans: Array.isArray(
                      data.plans
                    )
                      ? data.plans
                      : [],
                  };
                }
              )
            );

          const records: TVPlanRecord[] = [];

          providerResults.forEach(
            ({ provider, plans }) => {
              plans.forEach(
                (plan: any) => {
                  const variationCode =
                    plan.variation_code ||
                    plan.variationCode ||
                    plan.id;

                  const name =
                    plan.name ||
                    plan.description ||
                    variationCode;

                  const amount = Number(
                    plan.amount ||
                      plan.price ||
                      0
                  );

                  if (
                    variationCode &&
                    Number.isFinite(amount)
                  ) {
                    records.push({
                      provider,
                      variation_code:
                        String(variationCode),
                      name: String(name),
                      amount,
                      description:
                        plan.description
                          ? String(
                              plan.description
                            )
                          : undefined,
                    });
                  }
                }
              );
            }
          );

          setTVPlanRecords(records);

          setTVPlans(
            records.map((plan) => ({
              id: plan.variation_code,
              name: plan.name,
              amount: plan.amount,
              description:
                plan.description,
            }))
          );
        } catch (error: any) {
          console.error(
            'TV plans loading error:',
            error
          );

          setTVPlans([]);
          setTVPlanRecords([]);

          Alert.alert(
            'TV Plans',
            error?.message ||
              'Unable to load TV subscription plans. Please try again.'
          );
        } finally {
          setLoadingTVPlans(false);
        }
      },
      [authenticatedFetch]
    );
  // ====================================================
  // ELECTRICITY METER VERIFICATION
  // ====================================================

  const handleElectricityValidate =
    useCallback(
      async (
        provider: string,
        meterNumber: string,
        meterType:
          | 'prepaid'
          | 'postpaid'
      ): Promise<ElectricityCustomer> => {
        if (!session?.token) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        const result =
          await authenticatedPost(
            `${API_BASE}/bills/electricity/verify`,
            session.token,
            {
              provider,
              meter_number:
                meterNumber,
              meter_type:
                meterType,
            }
          );

        const data = result.data;

        const customerData =
          data.data ||
          data.customer ||
          {};

        return {
          customerName:
            customerData.customer_name ||
            customerData.customerName ||
            customerData.name ||
            data.customer_name ||
            'Verified Customer',

          meterNumber:
            customerData.meter_number ||
            customerData.meterNumber ||
            meterNumber,

          address:
            customerData.address ||
            customerData.customer_address ||
            undefined,
        };
      },
      [
        session?.token,
        authenticatedPost,
      ]
    );

  // ====================================================
  // ELECTRICITY PAYMENT
  // ====================================================

  const handleElectricityPay =
    useCallback(
      async (
        provider: string,
        meterNumber: string,
        meterType:
          | 'prepaid'
          | 'postpaid',
        amount: number,
        transactionPin: string
      ): Promise<ElectricityResult> => {
        if (!session?.token) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        const result =
          await authenticatedPost(
            `${API_BASE}/bills/electricity/pay`,
            session.token,
            {
              provider,
              meter_number:
                meterNumber,
              meter_type:
                meterType,
              amount,
              transaction_pin:
                transactionPin,
            }
          );

        const data = result.data;

        /*
         * HTTP 202 means the payment is still
         * processing. Do not treat it as completed.
         */
        if (result.status === 202) {
          return {
            ...data,
            status:
              data.status ||
              'processing',
            success: false,
          };
        }

        return {
          ...data,
          status:
            data.status ||
            'completed',
          success:
            data.success === true,
        };
      },
      [
        session?.token,
        authenticatedPost,
      ]
    );

  // ====================================================
  // TV CUSTOMER VERIFICATION
  // ====================================================

  const handleTVValidate =
    useCallback(
      async (
        provider: string,
        customerNumber: string
      ): Promise<TVCustomer> => {
        if (!session?.token) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        const normalizedProvider =
          provider.toUpperCase();

        const result =
          await authenticatedPost(
            `${API_BASE}/tv/verify`,
            session.token,
            {
              provider:
                normalizedProvider,
              billersCode:
                customerNumber,
            }
          );

        const data = result.data;

        const customerData =
          data.customer ||
          data.data ||
          {};

        return {
          customerName:
            customerData.name ||
            customerData.customer_name ||
            customerData.customerName ||
            data.customer_name ||
            'Verified Customer',

          customerNumber:
            data.billersCode ||
            customerData.billersCode ||
            customerNumber,
        };
      },
      [
        session?.token,
        authenticatedPost,
      ]
    );

  // ====================================================
  // TV SUBSCRIPTION
  // ====================================================

  const handleTVSubscribe =
    useCallback(
      async (
        provider: string,
        customerNumber: string,
        packageId: string,
        transactionPin: string
      ) => {
        if (!session?.token) {
          throw new Error(
            'Your session has expired. Please sign in again.'
          );
        }

        const normalizedProvider =
          provider.toUpperCase();

        const selectedPlan =
          tvPlanRecords.find(
            (plan) =>
              plan.variation_code ===
                packageId &&
              plan.provider ===
                normalizedProvider
          );

        if (!selectedPlan) {
          throw new Error(
            'The selected TV package is unavailable for this provider. Please select a valid package.'
          );
        }

        const phone =
          session.user?.phone;

        if (!phone) {
          throw new Error(
            'Your registered phone number is missing from your account. Please update your profile before purchasing a TV subscription.'
          );
        }

        const result =
          await authenticatedPost(
            `${API_BASE}/tv`,
            session.token,
            {
              provider:
                normalizedProvider,
              billersCode:
                customerNumber,
              variation_code:
                selectedPlan.variation_code,
              phone,
              subscription_type:
                'renew',
              transaction_pin:
                transactionPin,
            }
          );

        const data = result.data;

        if (result.status === 202) {
          return {
            ...data,
            status:
              data.status ||
              'pending',
            success: false,
          };
        }

        return {
          ...data,
          status:
            data.status ||
            'completed',
          success:
            data.success === true,
        };
      },
      [
        session?.token,
        session?.user?.phone,
        tvPlanRecords,
        authenticatedPost,
      ]
    );

  // ====================================================
  // RESTORE SAVED LOGIN SESSION
  // ====================================================

  useEffect(() => {
    let mounted = true;

    const restoreSession =
      async () => {
        try {
          const savedToken =
            await getAuthToken(
              AUTH_TOKEN_KEY
            );

          if (!savedToken) {
            return;
          }

          const response =
            await authenticatedFetch(
              `${AUTH_URL}/me`,
              savedToken
            );

          const data =
            await readJson(response);

          if (
            !response.ok ||
            data.success !== true ||
            !data.user
          ) {
            await deleteAuthToken(
              AUTH_TOKEN_KEY
            );
            return;
          }

          if (!mounted) return;

          setSession({
            success: true,
            token: savedToken,
            user: data.user,
            account: data.account,
            accounts: data.accounts,
          });

          setAccount(
            data.account ||
              data.accounts?.[0] ||
              null
          );

          setScreen('home');
          setCheckingSession(false);

          void loadProfile(
            savedToken
          ).then((profileUser) => {
            if (
              !mounted ||
              !profileUser
            ) {
              return;
            }

            setSession((previous) => {
              if (
                !previous ||
                previous.token !==
                  savedToken
              ) {
                return previous;
              }

              return {
                ...previous,
                user: {
                  ...(previous.user || {}),
                  ...profileUser,
                },
              };
            });
          });

          void loadDashboardData(
            savedToken
          ).catch((error: any) => {
            if (mounted) {
              Alert.alert(
                'Account information',
                error.message ||
                  'Your account information could not be loaded. Please refresh.'
              );
            }
          });
        } catch (error: any) {
          if (
            error.message ===
            'SESSION_EXPIRED'
          ) {
            await deleteAuthToken(
              AUTH_TOKEN_KEY
            );
            return;
          }

          if (mounted) {
            Alert.alert(
              'Connection unavailable',
              'We could not verify your saved session. Check your internet connection and try again.'
            );
          }
        } finally {
          if (mounted) {
            setCheckingSession(false);
          }
        }
      };

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, [
    authenticatedFetch,
    loadDashboardData,
    loadProfile,
  ]);

  // ====================================================
  // LOGIN SUCCESS
  // ====================================================

  const handleLoginSuccess =
    async (
      authData: AuthSession
    ) => {
      if (!authData?.token) {
        Alert.alert(
          'Sign in incomplete',
          'The server did not return a valid login token.'
        );
        return;
      }

      try {
        await setAuthToken(
          AUTH_TOKEN_KEY,
          authData.token
        );

        const initialAccount =
          authData.account ||
          authData.accounts?.[0] ||
          null;

        setSession(authData);
        setAccount(initialAccount);
        setTransactions([]);
        setScreen('home');

        offerPushNotifications(
          authData.token
        );

        void loadProfile(
          authData.token
        ).then((profileUser) => {
          if (!profileUser) return;

          setSession((previous) => {
            if (
              !previous ||
              previous.token !==
                authData.token
            ) {
              return previous;
            }

            return {
              ...previous,
              user: {
                ...(previous.user || {}),
                ...profileUser,
              },
            };
          });
        });

        void loadDashboardData(
          authData.token
        ).catch((error: any) => {
          Alert.alert(
            'Account information',
            error.message ||
              'Your account details could not be loaded. Please refresh the dashboard.'
          );
        });
      } catch {
        Alert.alert(
          'Secure storage unavailable',
          'Your login was accepted, but this device could not securely save your session.'
        );
      }
    };

  // ====================================================
  // REGISTRATION SUCCESS
  // ====================================================

  const handleRegistrationSuccess =
    async (
      registrationSession:
        | AuthSession
        | null
    ) => {
      if (
        !registrationSession?.token
      ) {
        setScreen('login');
        return;
      }

      await handleLoginSuccess(
        registrationSession
      );
    };

  // ====================================================
  // DASHBOARD REFRESH
  // ====================================================

  const handleRefresh =
    useCallback(async () => {
      if (
        !session?.token ||
        refreshLock.current
      ) {
        return;
      }

      refreshLock.current = true;
      setRefreshing(true);

      try {
        const dashboardSuccess =
          await loadDashboardData(
            session.token,
            false
          );

        if (!dashboardSuccess) {
          return;
        }

        const refreshedProfile =
          await loadProfile(
            session.token
          );

        if (refreshedProfile) {
          setSession((previous) => {
            if (
              !previous ||
              previous.token !==
                session.token
            ) {
              return previous;
            }

            return {
              ...previous,
              user: {
                ...(previous.user || {}),
                ...refreshedProfile,
              },
            };
          });
        }
      } catch (error: any) {
        Alert.alert(
          'Refresh failed',
          error?.message ||
            'Unable to refresh your account information. Please check your internet connection and try again.'
        );
      } finally {
        refreshLock.current = false;
        setRefreshing(false);
      }
    }, [
      session?.token,
      loadDashboardData,
      loadProfile,
    ]);

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout =
    useCallback(() => {
      const token = session?.token;

      clearSession();

      if (token) {
        void unregisterPushNotifications(
          token
        ).catch((error) => {
          console.warn(
            'Push notification unregistration failed:',
            error
          );
        });
      }
    }, [
      session?.token,
      clearSession,
    ]);

  // ====================================================
  // SELECT TRANSACTION
  // ====================================================

  const handleSelectTransaction = (
    transaction: Transaction
  ) => {
    setSelectedTransaction(
      transaction
    );
    setScreen(
      'transaction-details'
    );
  };

  // ====================================================
  // OPEN NOTIFICATION TRANSACTION
  // ====================================================

  const handleOpenNotificationTransaction =
    (
      transactionId: string
    ) => {
      const matchingTransaction =
        transactions.find(
          (transaction) =>
            transaction.id ===
              transactionId ||
            transaction.reference ===
              transactionId
        );

      if (!matchingTransaction) {
        Alert.alert(
          'Transaction unavailable',
          'We could not find the transaction linked to this notification. Please check your transaction history.'
        );

        return;
      }

      handleSelectTransaction(
        matchingTransaction
      );
    };

  // ====================================================
  // DASHBOARD ACTIONS
  // ====================================================

  const handleDashboardAction = (
    action: string
  ) => {
    if (action === 'airtime') {
      setScreen('airtime');
      return;
    }

    if (action === 'data') {
      setScreen('data');
      return;
    }
    if (action === 'bills') {
      setScreen('bills');
     return;
   }

    if (
      action === 'electricity' ||
      action === 'electricity-bills'
    ) {
      setScreen('electricity');
      return;
    }

    if (
      action === 'tv' ||
      action === 'television' ||
      action === 'tv-subscription'
    ) {
      setTVPlans([]);
      setTVPlanRecords([]);
      setScreen('tv');

      if (session?.token) {
        void loadTVPlans(
          session.token
        );
      }

      return;
    }

    const serviceNames: Record<
      string,
      string
    > = {
      transfer: 'Bank transfers',
      'add-money': 'Add money',
      withdraw: 'Withdrawals',
      cards: 'Cards',
      savings: 'ZENIMONIES Save',
    };

    Alert.alert(
      serviceNames[action] ||
        'ZENIMONIES',
      'This service screen will be connected in the next development stage. No transaction has been initiated.'
    );
  };

  // ====================================================
  // DASHBOARD NAVIGATION
  // ====================================================

  const handleDashboardNavigation = (
    tab: string
  ) => {
    if (tab === 'Home') {
      setScreen('home');
      return;
    }

    if (tab === 'Profile') {
       setProfileReturnScreen('home');
       setScreen('profile');
       return;
     }

    if (
      tab === 'History' ||
      tab === 'Transactions'
    ) {
      setScreen('history');
      return;
    }

    if (tab === 'Notifications') {
      setScreen('notifications');
      return;
    }

    if (tab === 'Settings') {
      setScreen('settings');
      return;
    }

    Alert.alert(
      tab,
      `${tab} screen will be connected in the next development stage.`
    );
  };

  // ====================================================
  // SESSION CHECK LOADING SCREEN
  // ====================================================

  if (checkingSession) {
    return (
      <SafeAreaView
        style={styles.loadingContainer}
      >
        <StatusBar barStyle="dark-content" />

        <View style={styles.loadingContent}>
          <View style={styles.premiumLogo}>
            <Text style={styles.premiumLogoText}>
              Z
            </Text>
          </View>

          <Text style={styles.loadingBrand}>
            ZENIMONIES
          </Text>

          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loadingIndicator}
          />

          <Text style={styles.loadingText}>
            Securing your session...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ====================================================
  // LOGIN SCREEN
  // ====================================================

  if (screen === 'login') {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            setScreen('welcome')
          }
        >
          <Text style={styles.backText}>
            ‹ Back
          </Text>
        </TouchableOpacity>

        <LoginScreen
          onLoginSuccess={
            handleLoginSuccess
          }
          onRegisterPress={() =>
            setScreen('register')
          }
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // REGISTRATION SCREEN
  // ====================================================

  if (screen === 'register') {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            setScreen('welcome')
          }
        >
          <Text style={styles.backText}>
            ‹ Back
          </Text>
        </TouchableOpacity>

        <RegisterScreen
          onRegistrationSuccess={
            handleRegistrationSuccess
          }
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // NOTIFICATIONS
  // ====================================================

  if (
    screen === 'notifications' &&
    session
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        <NotificationsScreen
          token={session.token}
          onBack={() =>
            setScreen('home')
          }
          onOpenTransaction={
            handleOpenNotificationTransaction
          }
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // CUSTOMER PROFILE
  // ====================================================

  if (
    screen === 'profile' &&
    session
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        <ProfileScreen
          user={session.user}
          account={account}
          onBack={() =>
           setScreen(profileReturnScreen)
         }
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // CUSTOMER SETTINGS
  // ====================================================

  if (
    screen === 'settings' &&
    session
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

       <SettingsScreen
         token={session.token}
         onBack={() => setScreen('home')}
         onLogout={handleLogout}
         onOpenProfile={() => {
         setProfileReturnScreen('settings');
         setScreen('profile');
        }}
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // TRANSACTION HISTORY
  // ====================================================

  if (
    screen === 'history' &&
    session
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        <TransactionHistoryScreen
          transactions={transactions}
          onBack={() =>
            setScreen('home')
          }
          onSelectTransaction={
            handleSelectTransaction
          }
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // TRANSACTION DETAILS
  // ====================================================

  if (
    screen ===
      'transaction-details' &&
    session &&
    selectedTransaction
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        <TransactionDetailsScreen
          transaction={
            selectedTransaction
          }
          onBack={() =>
            setScreen('history')
          }
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // AIRTIME PURCHASE
  // ====================================================

  if (
    screen === 'airtime' &&
    session
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        <AirtimeScreen
          token={session.token}
          onBack={() =>
            setScreen('home')
          }
          onComplete={() => {
            void loadDashboardData(
              session.token,
              false
            ).catch((error: any) => {
              console.warn(
                'Airtime dashboard refresh failed:',
                error
              );
            });
          }}
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // DATA PURCHASE
  // ====================================================

  if (
    screen === 'data' &&
    session
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        <DataScreen
          token={session.token}
          onBack={() =>
            setScreen('home')
          }
          onComplete={() => {
            void loadDashboardData(
              session.token,
              false
            ).catch((error: any) => {
              console.warn(
                'Data dashboard refresh failed:',
                error
              );
            });
          }}
        />
      </SafeAreaView>
    );
  }
  // ======================================================
// BILLS
// ======================================================

if (screen === 'bills' && session) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <BillsScreen
        onBack={() => setScreen('home')}
        onElectricityPress={() =>
          setScreen('electricity')
        }
      />
    </SafeAreaView>
  );
}
  // ====================================================
  // ELECTRICITY
  // ====================================================

  if (
    screen === 'electricity' &&
    session
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        <ElectricityScreen
          onValidate={
            handleElectricityValidate
          }
          onPay={
            handleElectricityPay
          }
        />
      </SafeAreaView>
    );
  }

  // ====================================================
  // TV SUBSCRIPTIONS
  // ====================================================

  if (
    screen === 'tv' &&
    session
  ) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        {loadingTVPlans &&
        tvPlans.length === 0 ? (
          <View
            style={styles.dashboardLoading}
          >
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.loadingText}>
              Loading TV packages...
            </Text>
          </View>
        ) : (
          <TVScreen
            packages={tvPlans}
            onValidate={
              handleTVValidate
            }
            onSubscribe={
              handleTVSubscribe
            }
          />
        )}
      </SafeAreaView>
    );
  }

  // ====================================================
  // PERSONAL DASHBOARD
  // ====================================================

  if (
    screen === 'home' &&
    session
  ) {
    const userName =
      session.user?.full_name ||
      session.user?.name ||
      session.user?.first_name ||
      'Customer';

    const verificationLevel =
      account?.kyc_tier ??
      session.user?.verification_level ??
      session.user?.kyc_level;

    const verificationStatus =
      account?.kyc_status ||
      session.user?.verification_status ||
      session.user?.kyc_status ||
      'Pending';

    const balance =
      formatNaira(account?.balance);

    return (
      <SafeAreaView
        style={styles.container}
      >
        <StatusBar barStyle="dark-content" />

        {dashboardLoading &&
        !account ? (
          <View
            style={styles.dashboardLoading}
          >
            <ActivityIndicator
              size="large"
              color={colors.primary}
            />

            <Text style={styles.loadingText}>
              Loading your account...
            </Text>
          </View>
        ) : (
          <Dashboard
            userName={userName}
            token={session.token}
            currency="NGN"
            balance={balance}
            profilePhotoUri={
              profilePhotoUri
            }
            onProfilePhotoChange={
              handleProfilePhotoChange
            }
            accountNumber={
              account?.account_number ||
              undefined
            }
            bankName="ZENIMONIES"
            verificationLevel={
              verificationLevel !==
              undefined
                ? String(
                    verificationLevel
                  )
                : undefined
            }
            verificationStatus={
              verificationStatus
            }
            transactions={transactions}
            onAction={
              handleDashboardAction
            }
            onNavigate={
              handleDashboardNavigation
            }
            refreshing={refreshing}
            onRefresh={
              handleRefresh
            }
          />
        )}
      </SafeAreaView>
    );
  }

  // ====================================================
  // PREMIUM WELCOME SCREEN
  // ====================================================

  return (
    <SafeAreaView
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />

      <View
        style={styles.premiumWelcome}
      >
        <View style={styles.premiumBrand}>
          <View style={styles.premiumLogo}>
            <Text style={styles.premiumLogoText}>
              Z
            </Text>
          </View>

          <Text style={styles.premiumBrandName}>
            ZENIMONIES
          </Text>

          <Text style={styles.premiumBrandSubtitle}>
            BANKING
          </Text>
        </View>

        <View style={styles.premiumHero}>
          <View style={styles.premiumBadge}>
            <View
              style={styles.premiumBadgeDot}
            />

            <Text style={styles.premiumBadgeText}>
              YOUR EVERYDAY BANKING PARTNER
            </Text>
          </View>

          <Text style={styles.premiumHeading}>
            Banking that moves{' \n'}
            <Text
              style={styles.premiumHeadingGreen}
            >
              with you.
            </Text>
          </Text>

          <Text
            style={styles.premiumDescription}
          >
            Manage your money, make payments and
            stay in control of your finances with
            ZENIMONIES.
          </Text>

          <View
            style={styles.premiumFeatureRow}
          >
            <View style={styles.premiumFeature}>
              <Text
                style={styles.premiumFeatureIcon}
              >
                ₦
              </Text>

              <Text
                style={styles.premiumFeatureText}
              >
                Payments
              </Text>
            </View>

            <View style={styles.premiumFeature}>
              <Text
                style={styles.premiumFeatureIcon}
              >
                ↗
              </Text>

              <Text
                style={styles.premiumFeatureText}
              >
                Transfers
              </Text>
            </View>

            <View style={styles.premiumFeature}>
              <Text
                style={styles.premiumFeatureIcon}
              >
                ✓
              </Text>

              <Text
                style={styles.premiumFeatureText}
              >
                Control
              </Text>
            </View>
          </View>
        </View>

        <View
          style={styles.premiumActions}
        >
          <TouchableOpacity
            style={styles.premiumPrimaryButton}
            onPress={() =>
              setScreen('register')
            }
            activeOpacity={0.85}
          >
            <Text
              style={styles.premiumPrimaryText}
            >
              Get Started
            </Text>

            <Text
              style={styles.premiumButtonArrow}
            >
              →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.premiumSecondaryButton}
            onPress={() =>
              setScreen('login')
            }
            activeOpacity={0.85}
          >
            <Text
              style={styles.premiumSecondaryText}
            >
              I already have an account
            </Text>
          </TouchableOpacity>
        </View>

        <Text
          style={styles.premiumFooter}
        >
          SECURE  •  SIMPLE  •  SMART
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  loadingBrand: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 3,
    color: colors.primaryDark,
  },

  loadingIndicator: {
    marginTop: 35,
  },

  loadingText: {
    marginTop: 15,
    fontSize: 14,
    color: colors.textSecondary,
  },

  dashboardLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },

  backText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },

  premiumWelcome: {
    flex: 1,
    paddingHorizontal: 27,
    paddingTop: 25,
    paddingBottom: 24,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },

  premiumBrand: {
    alignItems: 'center',
    marginTop: 8,
  },

  premiumLogo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#087A45',
    alignItems: 'center',
    justifyContent: 'center',
  },

  premiumLogoText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
  },

  premiumBrandName: {
    marginTop: 9,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 2.5,
    color: '#075C36',
  },

  premiumBrandSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 4,
    color: '#718078',
    marginTop: 2,
  },

  premiumHero: {
    alignItems: 'flex-start',
    paddingVertical: 20,
  },

  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5ED',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 23,
  },

  premiumBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#087A45',
    marginRight: 8,
  },

  premiumBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#087A45',
  },

  premiumHeading: {
    fontSize: 39,
    lineHeight: 47,
    fontWeight: '900',
    letterSpacing: -1.3,
    color: '#14251C',
  },

  premiumHeadingGreen: {
    color: '#087A45',
  },

  premiumDescription: {
    fontSize: 15,
    lineHeight: 25,
    color: '#718078',
    marginTop: 17,
    maxWidth: 315,
  },

  premiumFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 29,
    gap: 10,
  },

  premiumFeature: {
    flex: 1,
    minHeight: 68,
    backgroundColor: '#F1F6F3',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
  },

  premiumFeatureIcon: {
    color: '#087A45',
    fontSize: 19,
    fontWeight: '900',
  },

  premiumFeatureText: {
    color: '#43574B',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },

  premiumActions: {
    gap: 12,
  },

  premiumPrimaryButton: {
    minHeight: 59,
    borderRadius: 14,
    backgroundColor: '#087A45',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  premiumPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  premiumButtonArrow: {
    position: 'absolute',
    right: 20,
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '700',
  },

  premiumSecondaryButton: {
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: '#DCE8E0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  premiumSecondaryText: {
    color: '#075C36',
    fontSize: 14,
    fontWeight: '800',
  },

  premiumFooter: {
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2.5,
    color: '#98A69D',
    marginTop: 14,
  },
});
