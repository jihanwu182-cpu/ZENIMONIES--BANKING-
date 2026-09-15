import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL =
  'https://zenimonies-banking.onrender.com';

const INACTIVITY_TIMEOUT =
  5 * 60 * 1000;

interface SessionGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

const SessionGuard: React.FC<SessionGuardProps> = ({
  children,
}) => {
  const location = useLocation();

  const [locked, setLocked] = useState(false);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const activityThrottleRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const lastActivityRef =
    useRef<number>(Date.now());

  const isPublicPath =
    PUBLIC_PATHS.includes(location.pathname);

  const getToken = () => {
    return (
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token')
    );
  };

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const lockAccount = useCallback(() => {
    clearTimer();

    setLocked(true);

    sessionStorage.setItem(
      'zenimonies_account_locked',
      'true'
    );
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    const token = getToken();

    if (
      !token ||
      isPublicPath ||
      locked
    ) {
      return;
    }

    lastActivityRef.current = Date.now();

    clearTimer();

    timerRef.current = setTimeout(() => {
      lockAccount();
    }, INACTIVITY_TIMEOUT);
  }, [
    isPublicPath,
    locked,
    clearTimer,
    lockAccount,
  ]);

  /*
   * Check whether this browser already has
   * a locked Zenimonies session.
   */
  useEffect(() => {
    const token = getToken();

    if (
      isPublicPath ||
      !token
    ) {
      clearTimer();
      setLocked(false);
      return;
    }

    const alreadyLocked =
      sessionStorage.getItem(
        'zenimonies_account_locked'
      ) === 'true';

    if (alreadyLocked) {
      setLocked(true);
      clearTimer();
      return;
    }

    setLocked(false);

    lastActivityRef.current =
      Date.now();

    resetTimer();

    return () => {
      clearTimer();
    };
  }, [
    location.pathname,
    isPublicPath,
    resetTimer,
    clearTimer,
  ]);

  /*
   * Detect genuine user activity.
   */
  useEffect(() => {
    const token = getToken();

    if (
      isPublicPath ||
      !token ||
      locked
    ) {
      return;
    }

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    const handleActivity = () => {
      if (activityThrottleRef.current) {
        return;
      }

      activityThrottleRef.current =
        setTimeout(() => {
          activityThrottleRef.current = null;

          resetTimer();
        }, 1000);
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(
        eventName,
        handleActivity
      );
    });

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handleActivity
        );
      });

      if (
        activityThrottleRef.current
      ) {
        clearTimeout(
          activityThrottleRef.current
        );

        activityThrottleRef.current = null;
      }
    };
  }, [
    isPublicPath,
    locked,
    resetTimer,
  ]);

  /*
   * Ask the backend periodically whether
   * the authentication session is still valid.
   *
   * The backend remains the security authority.
   */
  useEffect(() => {
    const token = getToken();

    if (
      isPublicPath ||
      !token ||
      locked
    ) {
      return;
    }

    const checkSession = async () => {
      const currentToken = getToken();

      if (!currentToken) {
        return;
      }

      try {
        await axios.get(
          `${API_BASE_URL}/api/auth/me`,
          {
            headers: {
              Authorization:
                `Bearer ${currentToken}`,
            },
          }
        );
      } catch (error: any) {
        const status =
          error?.response?.status;

        const code =
          error?.response?.data?.code;

        if (
          status === 401 &&
          code === 'SESSION_EXPIRED'
        ) {
          lockAccount();
        }
      }
    };

    const interval = setInterval(
      checkSession,
      30 * 1000
    );

    return () => {
      clearInterval(interval);
    };
  }, [
    isPublicPath,
    locked,
    lockAccount,
  ]);

  /*
   * The lock screen will use this event
   * to unlock the account after successful
   * authentication.
   */
  useEffect(() => {
    const handleUnlockEvent = () => {
      sessionStorage.removeItem(
        'zenimonies_account_locked'
      );

      setLocked(false);

      lastActivityRef.current =
        Date.now();

      resetTimer();
    };

    window.addEventListener(
      'zenimonies:unlock',
      handleUnlockEvent
    );

    return () => {
      window.removeEventListener(
        'zenimonies:unlock',
        handleUnlockEvent
      );
    };
  }, [resetTimer]);

  /*
   * While locked, display the AccountLocked
   * route/component through the application.
   */
  if (
    locked &&
    !isPublicPath
  ) {
    return (
      <>
        {children}
      </>
    );
  }

  return <>{children}</>;
};

export default SessionGuard;
