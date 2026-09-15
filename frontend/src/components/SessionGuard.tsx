import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';

import AccountLocked from '../pages/AccountLocked';

const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

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

  const getToken = useCallback(() => {
    return (
      localStorage.getItem('zenimonies_token') ||
      localStorage.getItem('token')
    );
  }, []);

  const isPublicPath = PUBLIC_PATHS.includes(
    location.pathname
  );

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

    clearTimer();

    timerRef.current = setTimeout(() => {
      lockAccount();
    }, INACTIVITY_TIMEOUT);
  }, [
    getToken,
    isPublicPath,
    locked,
    clearTimer,
    lockAccount,
  ]);

  /*
   * Initialize or restore the lock state.
   */
  useEffect(() => {
    const token = getToken();

    if (!token || isPublicPath) {
      clearTimer();
      setLocked(false);
      return;
    }

    const storedLock =
      sessionStorage.getItem(
        'zenimonies_account_locked'
      );

    if (storedLock === 'true') {
      setLocked(true);
      clearTimer();
      return;
    }

    setLocked(false);

    resetTimer();

    return () => {
      clearTimer();
    };
  }, [
    location.pathname,
    isPublicPath,
    getToken,
    resetTimer,
    clearTimer,
  ]);

  /*
   * Detect real user activity.
   */
  useEffect(() => {
    const token = getToken();

    if (
      !token ||
      isPublicPath ||
      locked
    ) {
      return;
    }

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'touchmove',
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

      if (activityThrottleRef.current) {
        clearTimeout(
          activityThrottleRef.current
        );

        activityThrottleRef.current = null;
      }
    };
  }, [
    getToken,
    isPublicPath,
    locked,
    resetTimer,
  ]);

  /*
   * Listen for a successful unlock.
   */
  useEffect(() => {
    const handleUnlock = () => {
      sessionStorage.removeItem(
        'zenimonies_account_locked'
      );

      setLocked(false);

      clearTimer();

      timerRef.current = setTimeout(() => {
        lockAccount();
      }, INACTIVITY_TIMEOUT);
    };

    window.addEventListener(
      'zenimonies:unlock',
      handleUnlock
    );

    return () => {
      window.removeEventListener(
        'zenimonies:unlock',
        handleUnlock
      );
    };
  }, [
    clearTimer,
    lockAccount,
  ]);

  /*
   * While locked, show the lock screen.
   *
   * AccountLocked will handle the actual
   * Passkey/password unlock flow.
   */
  if (
    locked &&
    !isPublicPath
  ) {
    return <AccountLocked />;
  }

  return <>{children}</>;
};

export default SessionGuard;
