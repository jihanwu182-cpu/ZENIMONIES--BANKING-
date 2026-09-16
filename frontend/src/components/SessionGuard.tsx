import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useLocation } from 'react-router-dom';

import AccountLocked from '../pages/AccountLocked.tsx';

/* ============================================================
   SESSION SECURITY SETTINGS
============================================================ */

const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

const ACTIVITY_THROTTLE = 1000;

const LOCK_STORAGE_KEY =
  'zenimonies_account_locked';

const LAST_ACTIVITY_STORAGE_KEY =
  'zenimonies_last_activity';

/* ============================================================
   PUBLIC ROUTES
============================================================ */

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

/* ============================================================
   PROPS
============================================================ */

interface SessionGuardProps {
  children: React.ReactNode;
}

/* ============================================================
   SESSION GUARD
============================================================ */

const SessionGuard: React.FC<SessionGuardProps> = ({
  children,
}) => {
  const location = useLocation();

  const [locked, setLocked] =
    useState(false);

  const timerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  const activityThrottleRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  /* ==========================================================
     GET AUTHENTICATION TOKEN
  ========================================================== */

  const getToken = useCallback(() => {
    return (
      localStorage.getItem(
        'zenimonies_token'
      ) ||
      localStorage.getItem(
        'token'
      )
    );
  }, []);

  /* ==========================================================
     CHECK PUBLIC ROUTE
  ========================================================== */

  const isPublicPath =
    PUBLIC_PATHS.includes(
      location.pathname
    );

  /* ==========================================================
     CLEAR INACTIVITY TIMER
  ========================================================== */

  const clearTimer = useCallback(() => {
    if (
      timerRef.current
    ) {
      clearTimeout(
        timerRef.current
      );

      timerRef.current =
        null;
    }
  }, []);

  /* ==========================================================
     SAVE LAST ACTIVITY
  ========================================================== */

  const saveLastActivity =
    useCallback(() => {
      try {
        sessionStorage.setItem(
          LAST_ACTIVITY_STORAGE_KEY,
          String(Date.now())
        );
      } catch {
        /*
         * Session storage is only used
         * as a convenience for inactivity
         * tracking.
         */
      }
    }, []);

  /* ==========================================================
     LOCK SESSION
  ========================================================== */

  const lockSession =
    useCallback(() => {
      clearTimer();

      try {
        sessionStorage.setItem(
          LOCK_STORAGE_KEY,
          'true'
        );
      } catch {
        // Continue even if sessionStorage is unavailable.
      }

      setLocked(true);
    }, [
      clearTimer,
    ]);

  /* ==========================================================
     START / RESET INACTIVITY TIMER
  ========================================================== */

  const resetTimer =
    useCallback(() => {
      const token =
        getToken();

      /*
       * Never run the protected-session
       * inactivity timer on public pages.
       */
      if (
        !token ||
        isPublicPath ||
        locked
      ) {
        return;
      }

      clearTimer();

      saveLastActivity();

      timerRef.current =
        setTimeout(() => {
          lockSession();
        }, INACTIVITY_TIMEOUT);
    }, [
      getToken,
      isPublicPath,
      locked,
      clearTimer,
      saveLastActivity,
      lockSession,
    ]);

  /* ==========================================================
     INITIALIZE SESSION STATE
  ========================================================== */

  useEffect(() => {
    const token =
      getToken();

    /*
     * No authenticated session.
     */
    if (!token) {
      clearTimer();

      setLocked(false);

      try {
        sessionStorage.removeItem(
          LOCK_STORAGE_KEY
        );

        sessionStorage.removeItem(
          LAST_ACTIVITY_STORAGE_KEY
        );
      } catch {
        // Ignore storage errors.
      }

      return;
    }

    /*
     * Public authentication pages
     * should never display AccountLocked.
     */
    if (isPublicPath) {
      clearTimer();

      setLocked(false);

      return;
    }

    /*
     * Check whether this session was
     * already locked.
     */
    let storedLock = null;

    try {
      storedLock =
        sessionStorage.getItem(
          LOCK_STORAGE_KEY
        );
    } catch {
      storedLock = null;
    }

    if (
      storedLock === 'true'
    ) {
      setLocked(true);

      clearTimer();

      return;
    }

    /*
     * Check real elapsed inactivity.
     *
     * This protects against mobile browsers
     * pausing JavaScript while the application
     * is in the background.
     */
    let lastActivity = 0;

    try {
      const storedActivity =
        sessionStorage.getItem(
          LAST_ACTIVITY_STORAGE_KEY
        );

      if (storedActivity) {
        lastActivity =
          Number(
            storedActivity
          );
      }
    } catch {
      lastActivity = 0;
    }

    /*
     * If we have a valid previous activity
     * timestamp and the inactivity period
     * has already passed, lock immediately.
     */
    if (
      lastActivity > 0 &&
      Date.now() -
        lastActivity >=
        INACTIVITY_TIMEOUT
    ) {
      lockSession();

      return;
    }

    /*
     * Fresh authenticated session.
     */
    setLocked(false);

    /*
     * If there is no activity timestamp,
     * establish one now.
     */
    if (
      lastActivity === 0
    ) {
      saveLastActivity();
    }

    /*
     * Start the remaining timer.
     */
    clearTimer();

    const elapsed =
      lastActivity > 0
        ? Date.now() -
          lastActivity
        : 0;

    const remainingTime =
      Math.max(
        INACTIVITY_TIMEOUT -
          elapsed,
        0
      );

    timerRef.current =
      setTimeout(() => {
        lockSession();
      }, remainingTime);

    return () => {
      clearTimer();
    };
  }, [
    location.pathname,
    isPublicPath,
    getToken,
    clearTimer,
    lockSession,
    saveLastActivity,
  ]);

  /* ==========================================================
     REAL USER ACTIVITY
  ========================================================== */

  useEffect(() => {
    const token =
      getToken();

    /*
     * Do not monitor activity on public
     * authentication pages or while locked.
     */
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
      'pointerdown',
    ];

    const handleActivity =
      () => {
        /*
         * Prevent excessive timer resets
         * from mouse/touch events.
         */
        if (
          activityThrottleRef.current
        ) {
          return;
        }

        activityThrottleRef.current =
          setTimeout(() => {
            activityThrottleRef.current =
              null;

            /*
             * Only reset the session while
             * the user is actually unlocked.
             */
            if (!locked) {
              resetTimer();
            }
          }, ACTIVITY_THROTTLE);
      };

    activityEvents.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          handleActivity
        );
      }
    );

    return () => {
      activityEvents.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            handleActivity
          );
        }
      );

      if (
        activityThrottleRef.current
      ) {
        clearTimeout(
          activityThrottleRef.current
        );

        activityThrottleRef.current =
          null;
      }
    };
  }, [
    getToken,
    isPublicPath,
    locked,
    resetTimer,
  ]);

  /* ==========================================================
     MOBILE / BROWSER VISIBILITY SECURITY
  ========================================================== */

  useEffect(() => {
    const handleVisibilityChange =
      () => {
        const token =
          getToken();

        if (
          !token ||
          isPublicPath ||
          locked
        ) {
          return;
        }

        /*
         * When the user returns to the app,
         * calculate actual elapsed inactivity
         * rather than trusting a paused timer.
         */
        if (
          document.visibilityState ===
          'visible'
        ) {
          let lastActivity = 0;

          try {
            const storedActivity =
              sessionStorage.getItem(
                LAST_ACTIVITY_STORAGE_KEY
              );

            if (storedActivity) {
              lastActivity =
                Number(
                  storedActivity
                );
            }
          } catch {
            lastActivity = 0;
          }

          if (
            lastActivity > 0 &&
            Date.now() -
              lastActivity >=
              INACTIVITY_TIMEOUT
          ) {
            lockSession();

            return;
          }

          resetTimer();
        }
      };

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    return () => {
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      );
    };
  }, [
    getToken,
    isPublicPath,
    locked,
    resetTimer,
    lockSession,
  ]);

  /* ==========================================================
     WINDOW FOCUS SECURITY
  ========================================================== */

  useEffect(() => {
    const handleFocus =
      () => {
        const token =
          getToken();

        if (
          !token ||
          isPublicPath ||
          locked
        ) {
          return;
        }

        let lastActivity = 0;

        try {
          const storedActivity =
            sessionStorage.getItem(
              LAST_ACTIVITY_STORAGE_KEY
            );

          if (storedActivity) {
            lastActivity =
              Number(
                storedActivity
              );
          }
        } catch {
          lastActivity = 0;
        }

        if (
          lastActivity > 0 &&
          Date.now() -
            lastActivity >=
            INACTIVITY_TIMEOUT
        ) {
          lockSession();

          return;
        }

        resetTimer();
      };

    window.addEventListener(
      'focus',
      handleFocus
    );

    return () => {
      window.removeEventListener(
        'focus',
        handleFocus
      );
    };
  }, [
    getToken,
    isPublicPath,
    locked,
    resetTimer,
    lockSession,
  ]);

  /* ==========================================================
     SUCCESSFUL ACCOUNT UNLOCK
  ========================================================== */

  useEffect(() => {
    const handleUnlock =
      () => {
        /*
         * Remove the lock.
         */
        try {
          sessionStorage.removeItem(
            LOCK_STORAGE_KEY
          );
        } catch {
          // Ignore storage errors.
        }

        /*
         * Start a completely new
         * inactivity period.
         */
        saveLastActivity();

        setLocked(false);

        clearTimer();

        timerRef.current =
          setTimeout(() => {
            lockSession();
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
    lockSession,
    saveLastActivity,
  ]);

  /* ==========================================================
     LOCKED SESSION
  ========================================================== */

  if (
    locked &&
    !isPublicPath
  ) {
    return (
      <AccountLocked />
    );
  }

  /* ==========================================================
     NORMAL APPLICATION
  ========================================================== */

  return (
    <>
      {children}
    </>
  );
};

export default SessionGuard;
