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

const STORAGE_KEY = 'zenimonies_dark_mode';

// ============================================================
// THEME PROVIDER
// ============================================================

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [darkMode, setDarkModeState] =
    useState<boolean>(() => {
      try {
        return (
          localStorage.getItem(
            STORAGE_KEY
          ) === 'true'
        );
      } catch {
        return false;
      }
    });

  // ----------------------------------------------------------
  // SAVE THEME PREFERENCE
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

    // Make the browser/application root aware of the theme.
    document.documentElement.dataset.theme =
      darkMode ? 'dark' : 'light';

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
  // SYNCHRONIZE IF ANOTHER PART OF THE APP CHANGES STORAGE
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

      setDarkModeState(
        event.newValue === 'true'
      );
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
  // PUBLIC THEME CONTROLS
  // ----------------------------------------------------------

  const setDarkMode = (
    enabled: boolean
  ) => {
    setDarkModeState(Boolean(enabled));
  };

  const toggleDarkMode = () => {
    setDarkModeState(
      (current) => !current
    );
  };

  // ----------------------------------------------------------
  // CONTEXT VALUE
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

export const useTheme = (): ThemeContextValue => {
  const context =
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider.'
    );
  }

  return context;
};

// ============================================================
// GLOBAL ZENIMONIES THEME
//
// This is deliberately conservative.
//
// It does NOT redesign existing pages.
// It provides the application-wide dark foundation,
// while individual pages can progressively use the
// theme tokens/classes where needed.
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
        background: ${
          darkMode
            ? '#0d1712'
            : '#f6faf8'
        };
      }

      body {
        margin: 0;
        background: ${
          darkMode
            ? '#0d1712'
            : '#f6faf8'
        };
        color: ${
          darkMode
            ? '#f3f8f5'
            : '#14251e'
        };
        transition:
          background-color 0.18s ease,
          color 0.18s ease;
      }

      /*
       * These variables are the central ZENIMONIES
       * theme tokens. New pages should use these
       * instead of hard-coded colors.
       */

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
         GLOBAL FORM ELEMENTS
      ====================================================== */

      body.zenimonies-dark input,
      body.zenimonies-dark textarea,
      body.zenimonies-dark select {
        color-scheme: dark;
      }

      body.zenimonies-dark
      input::placeholder,
      body.zenimonies-dark
      textarea::placeholder {
        color: #7f9388;
      }

      /* ======================================================
         COMMON PAGE SURFACES
      ====================================================== */

      .zenimonies-dark
      .zenimonies-page {
        background: var(
          --zenimonies-page
        ) !important;

        color: var(
          --zenimonies-text
        ) !important;
      }

      .zenimonies-dark
      .zenimonies-surface {
        background: var(
          --zenimonies-surface
        ) !important;

        color: var(
          --zenimonies-text
        ) !important;

        border-color: var(
          --zenimonies-border
        ) !important;
      }

      .zenimonies-dark
      .zenimonies-input {
        background: var(
          --zenimonies-input
        ) !important;

        color: var(
          --zenimonies-text
        ) !important;

        border-color: var(
          --zenimonies-border
        ) !important;
      }

      /* ======================================================
         ACCESSIBILITY / REDUCED FLASH
      ====================================================== */

      html.zenimonies-dark {
        color-scheme: dark;
      }

      html:not(.zenimonies-dark) {
        color-scheme: light;
      }

    `}</style>
  );
};

export default ThemeProvider;
