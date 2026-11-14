
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import {
  getColors,
  ThemeMode,
} from './colors';

export type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextType = {
  preference: ThemePreference;
  mode: ThemeMode;
  colors: ReturnType<typeof getColors>;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

const THEME_STORAGE_KEY = 'zenimonies_theme_preference';

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemColorScheme = useColorScheme();

  const [preference, setPreferenceState] =
    useState<ThemePreference>('system');

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    const loadPreference = async () => {
      try {
        const saved = await SecureStore.getItemAsync(
          THEME_STORAGE_KEY
        );

        if (
          active &&
          (saved === 'system' ||
            saved === 'light' ||
            saved === 'dark')
        ) {
          setPreferenceState(saved);
        }
      } catch (error) {
        console.warn('Unable to load theme preference:', error);
      } finally {
        if (active) {
          setLoaded(true);
        }
      }
    };

    loadPreference();

    return () => {
      active = false;
    };
  }, []);

  const setPreference = async (
    nextPreference: ThemePreference
  ) => {
    setPreferenceState(nextPreference);

    try {
      await SecureStore.setItemAsync(
        THEME_STORAGE_KEY,
        nextPreference
      );
    } catch (error) {
      console.warn('Unable to save theme preference:', error);
    }
  };

  const mode: ThemeMode =
    preference === 'system'
      ? systemColorScheme === 'dark'
        ? 'dark'
        : 'light'
      : preference;

  const value = useMemo(
    () => ({
      preference,
      mode,
      colors: getColors(mode),
      setPreference,
    }),
    [preference, mode]
  );

  if (!loaded) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      'useTheme must be used inside ThemeProvider'
    );
  }

  return context;
}
