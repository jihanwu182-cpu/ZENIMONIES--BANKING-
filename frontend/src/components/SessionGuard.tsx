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

const INACTIVITY_TIMEOUT =
  5 * 60 * 1000;

const ACTIVITY_THROTTLE =
  1000;

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

const SessionGuard: React.FC<
  SessionGuardProps
> = ({
  children,
}) => {
  const location =
    useLocation();

  const [
    locked,
    setLocked,
  ] = useState(false);

  const timerRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  const activityThrottleRef =
    useRef<
      ReturnType<
        typeof setTimeout
      > | null
    >(null);

  /*
   * This ref is important.
   *
   * It prevents an old timer callback from
   * locking the account after a successful
   * unlock.
   */
  const sessionGenerationRef =
    useRef(0);


  /* ==========================================================
     GET TOKEN
  ========================================================== */

  const getToken =
    useCallback(() => {
      return (
        localStorage.getItem(
          'zenimonies_token'
        ) ||
        localStorage.getItem(
          'token'
        ) ||
        localStorage.getItem(
          'access_token'
        ) ||
        sessionStorage.getItem(
          'zenimonies_token'
        ) ||
        sessionStorage.getItem(
          'token'
        ) ||
        sessionStorage.getItem(
          'access_token'
        )
      );
    }, []);


  /* ==========================================================
     PUBLIC ROUTE
  ========================================================== */

  const isPublicPath =
    PUBLIC_PATHS.includes(
      location.pathname
    );


  /* ==========================================================
     CLEAR TIMER
  ========================================================== */

  const clearTimer =
    useCallback(() => {
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
     CLEAR ACTIVITY THROTTLE
  ========================================================== */

  const clearActivityThrottle =
    useCallback(() => {
      if (
        activityThrottleRef.current
      ) {
        clearTimeout(
          activityThrottleRef.current
        );

        activityThrottleRef.current =
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
          String(
            Date.now()
          )
        );
      } catch {
        // Ignore storage errors.
      }
    }, []);


  /* ==========================================================
     LOCK SESSION
  ========================================================== */

  const lockSession =
    useCallback(() => {
      /*
       * Invalidate all previously scheduled
       * timer callbacks.
       */
      sessionGenerationRef.current += 1;

      clearTimer();

      clearActivityThrottle();

      try {
        sessionStorage.setItem(
          LOCK_STORAGE_KEY,
          'true'
        );
      } catch {
        // Ignore storage errors.
      }

      setLocked(true);
    }, [
      clearTimer,
      clearActivityThrottle,
    ]);


  /* ==========================================================
     START INACTIVITY TIMER
  ========================================================== */

  const startTimer =
    useCallback(
      (
        duration = INACTIVITY_TIMEOUT
      ) => {
        const token =
          getToken();

        if (
          !token ||
          isPublicPath ||
          locked
        ) {
          return;
        }

        clearTimer();

        /*
         * Capture the current generation.
         *
         * If the account is unlocked later,
         * the generation changes and this old
         * callback becomes harmless.
         */
        const generation =
          sessionGenerationRef.current;

        timerRef.current =
          setTimeout(() => {
            /*
             * Ignore stale timer callbacks.
             */
            if (
              generation !==
              sessionGenerationRef.current
            ) {
              return;
            }

            /*
             * Check again before locking.
             */
            const currentToken =
              getToken();

            if (
              !currentToken ||
              isPublicPath
            ) {
              return;
            }

            lockSession();
          }, duration);
      },
      [
        getToken,
        isPublicPath,
        locked,
        clearTimer,
        lockSession,
      ]
    );


  /* ==========================================================
     RESET ACTIVITY TIMER
  ========================================================== */

  const resetTimer =
    useCallback(() => {
      const token =
        getToken();

      if (
        !token ||
        isPublicPath ||
        locked
      ) {
        return;
      }

      saveLastActivity();

      startTimer(
        INACTIVITY_TIMEOUT
      );
    }, [
      getToken,
      isPublicPath,
      locked,
      saveLastActivity,
      startTimer,
    ]);


  /* ==========================================================
     INITIALIZE SESSION
  ========================================================== */

  useEffect(() => {
    const token =
      getToken();

    /*
     * No authentication token.
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
     * Public pages don't use the
     * protected-session timer.
     */
    if (isPublicPath) {
      clearTimer();

      return;
    }

    /*
     * Read the current lock state.
     */
    let storedLock:
      | string
      | null = null;

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
     * Read previous activity.
     */
    let lastActivity = 0;

    try {
      const storedActivity =
        sessionStorage.getItem(
          LAST_ACTIVITY_STORAGE_KEY
        );

      if (
        storedActivity
      ) {
        lastActivity =
          Number(
            storedActivity
          );
      }
    } catch {
      lastActivity = 0;
    }

    /*
     * Fresh session with no activity
     * timestamp.
     */
    if (
      lastActivity === 0
    ) {
      saveLastActivity();

      setLocked(false);

      startTimer(
        INACTIVITY_TIMEOUT
      );

      return () => {
        clearTimer();
      };
    }

    /*
     * Calculate elapsed inactivity.
     */
    const elapsed =
      Date.now() -
      lastActivity;

    /*
     * Already inactive for 5 minutes.
     */
    if (
      elapsed >=
      INACTIVITY_TIMEOUT
    ) {
      lockSession();

      return;
    }

    /*
     * Session is still active.
     */
    setLocked(false);

    const remaining =
      Math.max(
        INACTIVITY_TIMEOUT -
          elapsed,
        1000
      );

    startTimer(
      remaining
    );

    return () => {
      clearTimer();
    };
  }, [
    location.pathname,
    getToken,
    isPublicPath,
    clearTimer,
    saveLastActivity,
    startTimer,
    lockSession,
  ]);


  /* ==========================================================
     USER ACTIVITY
  ========================================================== */

  useEffect(() => {
    const token =
      getToken();

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
        if (
          activityThrottleRef.current
        ) {
          return;
        }

        activityThrottleRef.current =
          setTimeout(() => {
            activityThrottleRef.current =
              null;

            if (!locked) {
              resetTimer();
            }
          }, ACTIVITY_THROTTLE);
      };

    activityEvents.forEach(
      (
        eventName
      ) => {
        window.addEventListener(
          eventName,
          handleActivity
        );
      }
    );

    return () => {
      activityEvents.forEach(
        (
          eventName
        ) => {
          window.removeEventListener(
            eventName,
            handleActivity
          );
        }
      );

      clearActivityThrottle();
    };
  }, [
    getToken,
    isPublicPath,
    locked,
    resetTimer,
    clearActivityThrottle,
  ]);


  /* ==========================================================
     VISIBILITY CHANGE
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

        if (
          document.visibilityState !==
          'visible'
        ) {
          return;
        }

        let lastActivity = 0;

        try {
          const storedActivity =
            sessionStorage.getItem(
              LAST_ACTIVITY_STORAGE_KEY
            );

          if (
            storedActivity
          ) {
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
     WINDOW FOCUS
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

          if (
            storedActivity
          ) {
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
         * IMPORTANT:
         *
         * Invalidate every timer that existed
         * before the account was unlocked.
         */
        sessionGenerationRef.current += 1;

        clearTimer();

        clearActivityThrottle();

        /*
         * Remove the previous lock.
         */
        try {
          sessionStorage.removeItem(
            LOCK_STORAGE_KEY
          );
        } catch {
          // Ignore storage errors.
        }

        /*
         * Create a completely new activity
         * timestamp.
         */
        saveLastActivity();

        /*
         * Unlock React state.
         */
        setLocked(false);

        /*
         * Start a fresh five-minute period.
         *
         * Use a small delay so the new authentication
         * token has already been written to storage.
         */
        setTimeout(() => {
          sessionGenerationRef.current += 1;

          setLocked(false);

          saveLastActivity();

          startTimer(
            INACTIVITY_TIMEOUT
          );
        }, 100);
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
    clearActivityThrottle,
    saveLastActivity,
    startTimer,
  ]);


  /* ==========================================================
     LOCKED SCREEN
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
     APPLICATION
  ========================================================== */

  return (
    <>
      {children}
    </>
  );
};

export default SessionGuard;
