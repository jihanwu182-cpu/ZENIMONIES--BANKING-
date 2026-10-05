import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ============================================================
// ZENIMONIES BANKING
// GLOBAL THEME SYSTEM
// ============================================================

export type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  darkMode: boolean;
  themeMode: ThemeMode;
  setDarkMode: (enabled: boolean) => void;
  toggleDarkMode: () => void;
}

const ThemeContext =
  createContext<ThemeContextValue | undefined>(
    undefined
  );

const STORAGE_KEY =
  'zenimonies_dark_mode';

// ============================================================
// SYSTEM THEME
// ============================================================

const getSystemDarkMode = (): boolean => {
  try {
    return window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
  } catch {
    return false;
  }
};

// ============================================================
// THEME PROVIDER
// ============================================================

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [darkMode, setDarkModeState] =
    useState<boolean>(() => {
      try {
        const saved =
          localStorage.getItem(
            STORAGE_KEY
          );

        // ----------------------------------------------------
        // If the user has already chosen a ZENIMONIES theme,
        // respect that choice.
        // ----------------------------------------------------

        if (saved === 'true') {
          return true;
        }

        if (saved === 'false') {
          return false;
        }

        // ----------------------------------------------------
        // No saved ZENIMONIES preference:
        // follow the phone/browser system theme.
        // ----------------------------------------------------

        return getSystemDarkMode();
      } catch {
        return getSystemDarkMode();
      }
    });

  // ----------------------------------------------------------
  // APPLY THEME
  // ----------------------------------------------------------

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        String(darkMode)
      );
    } catch {
      // Ignore storage errors.
    }

    document.documentElement.dataset.theme =
      darkMode
        ? 'dark'
        : 'light';

    document.documentElement.classList.toggle(
      'zenimonies-dark',
      darkMode
    );

    document.body.classList.toggle(
      'zenimonies-dark',
      darkMode
    );
  }, [darkMode]);

  // ----------------------------------------------------------
  // FOLLOW SYSTEM THEME
  //
  // Only used when the user has NOT manually selected a
  // ZENIMONIES preference.
  // ----------------------------------------------------------

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      );

    const handleSystemThemeChange = (
      event: MediaQueryListEvent
    ) => {
      try {
        const saved =
          localStorage.getItem(
            STORAGE_KEY
          );

        // If the user has an explicit ZENIMONIES
        // preference, do not override it.
        if (
          saved === 'true' ||
          saved === 'false'
        ) {
          return;
        }

        setDarkModeState(
          event.matches
        );
      } catch {
        setDarkModeState(
          event.matches
        );
      }
    };

    mediaQuery.addEventListener(
      'change',
      handleSystemThemeChange
    );

    return () => {
      mediaQuery.removeEventListener(
        'change',
        handleSystemThemeChange
      );
    };
  }, []);

  // ----------------------------------------------------------
  // STORAGE SYNCHRONIZATION
  // ----------------------------------------------------------

  useEffect(() => {
    const handleStorage = (
      event: StorageEvent
    ) => {
      if (
        event.key !== STORAGE_KEY
      ) {
        return;
      }

      if (
        event.newValue === 'true'
      ) {
        setDarkModeState(true);
      } else if (
        event.newValue === 'false'
      ) {
        setDarkModeState(false);
      } else {
        setDarkModeState(
          getSystemDarkMode()
        );
      }
    };

    window.addEventListener(
      'storage',
      handleStorage
    );

    return () => {
      window.removeEventListener(
        'storage',
        handleStorage
      );
    };
  }, []);

  // ----------------------------------------------------------
  // PUBLIC CONTROLS
  // ----------------------------------------------------------

  const setDarkMode = (
    enabled: boolean
  ) => {
    setDarkModeState(
      Boolean(enabled)
    );

    try {
      localStorage.setItem(
        STORAGE_KEY,
        String(Boolean(enabled))
      );
    } catch {
      // Ignore storage errors.
    }
  };

  const toggleDarkMode = () => {
    setDarkModeState(
      (current) => {
        const next = !current;

        try {
          localStorage.setItem(
            STORAGE_KEY,
            String(next)
          );
        } catch {
          // Ignore storage errors.
        }

        return next;
      }
    );
  };

  // ----------------------------------------------------------
  // CONTEXT
  // ----------------------------------------------------------

  const value = useMemo(
    () => ({
      darkMode,
      themeMode: darkMode
        ? ('dark' as ThemeMode)
        : ('light' as ThemeMode),
      setDarkMode,
      toggleDarkMode,
    }),
    [darkMode]
  );

  return (
    <ThemeContext.Provider
      value={value}
    >
      <ZenimoniesGlobalTheme
        darkMode={darkMode}
      />

      {children}
    </ThemeContext.Provider>
  );
};

// ============================================================
// USE THEME
// ============================================================

export const useTheme =
  (): ThemeContextValue => {
    const context =
      useContext(
        ThemeContext
      );

    if (!context) {
      throw new Error(
        'useTheme must be used inside ThemeProvider.'
      );
    }

    return context;
  };

// ============================================================
// GLOBAL ZENIMONIES THEME
// ============================================================

const ZenimoniesGlobalTheme: React.FC<{
  darkMode: boolean;
}> = ({ darkMode }) => {
  return (
    <style
      data-zenimonies-theme="global"
    >{`

      /* ======================================================
         GLOBAL ROOT
      ====================================================== */

      html,
      body,
      #root {
        min-height: 100%;
      }

      html {
        background:
          ${
            darkMode
              ? '#0d1712'
              : '#f6faf8'
          };

        color-scheme:
          ${
            darkMode
              ? 'dark'
              : 'light'
          };
      }

      body {
        margin: 0;

        background:
          ${
            darkMode
              ? '#0d1712'
              : '#f6faf8'
          };

        color:
          ${
            darkMode
              ? '#f3f8f5'
              : '#14251e'
          };

        transition:
          background-color 0.18s ease,
          color 0.18s ease;
      }

      /* ======================================================
         ZENIMONIES THEME TOKENS
      ====================================================== */

      :root {
        --zenimonies-green: #079447;
        --zenimonies-green-dark: #006d3b;
        --zenimonies-green-light: #e9f8f1;

        --zenimonies-page:
          ${
            darkMode
              ? '#0d1712'
              : '#f6faf8'
          };

        --zenimonies-surface:
          ${
            darkMode
              ? '#101c16'
              : '#ffffff'
          };

        --zenimonies-surface-soft:
          ${
            darkMode
              ? '#15231c'
              : '#f7faf8'
          };

        --zenimonies-border:
          ${
            darkMode
              ? '#294238'
              : '#e7eee9'
          };

        --zenimonies-text:
          ${
            darkMode
              ? '#f3f8f5'
              : '#14251e'
          };

        --zenimonies-text-secondary:
          ${
            darkMode
              ? '#a9b8b0'
              : '#7b8982'
          };

        --zenimonies-text-muted:
          ${
            darkMode
              ? '#82958b'
              : '#98a49f'
          };

        --zenimonies-input:
          ${
            darkMode
              ? '#15231c'
              : '#ffffff'
          };
      }

      /* ======================================================
         DARK FORM ELEMENTS
      ====================================================== */

      body.zenimonies-dark
      input,
      body.zenimonies-dark
      textarea,
      body.zenimonies-dark
      select {
        color-scheme: dark;
      }

      body.zenimonies-dark
      input::placeholder,
      body.zenimonies-dark
      textarea::placeholder {
        color: #7f9388;
      }

      /* ======================================================
         COMMON PAGE CLASSES
      ====================================================== */

      .zenimonies-dark
      .zenimonies-page {
        background:
          var(--zenimonies-page)
          !important;

        color:
          var(--zenimonies-text)
          !important;
      }

      .zenimonies-dark
      .zenimonies-surface {
        background:
          var(--zenimonies-surface)
          !important;

        color:
          var(--zenimonies-text)
          !important;

        border-color:
          var(--zenimonies-border)
          !important;
      }

      .zenimonies-dark
      .zenimonies-input {
        background:
          var(--zenimonies-input)
          !important;

        color:
          var(--zenimonies-text)
          !important;

        border-color:
          var(--zenimonies-border)
          !important;
      }

    `}</style>
  );
};

export default ThemeProvider;
