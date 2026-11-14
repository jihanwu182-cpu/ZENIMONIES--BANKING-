
export type ThemeMode = 'light' | 'dark';

export const lightColors = {
  primary: '#087A45',
  primaryDark: '#075C36',
  primaryLight: '#E8F5ED',

  background: '#FFFFFF',
  backgroundSoft: '#F7FAF8',

  surface: '#FFFFFF',
  surfaceSecondary: '#F1F6F3',

  text: '#14251C',
  textSecondary: '#718078',
  textMuted: '#98A69D',

  border: '#DCE8E0',

  success: '#16864B',
  warning: '#E9A23B',
  error: '#D64545',

  white: '#FFFFFF',
  black: '#000000',

  statusBar: 'dark-content' as const,
};

export const darkColors = {
  primary: '#20C875',
  primaryDark: '#159B58',
  primaryLight: '#173D2B',

  background: '#0C1711',
  backgroundSoft: '#111F17',

  surface: '#17271D',
  surfaceSecondary: '#203329',

  text: '#F3F8F4',
  textSecondary: '#B3C2B8',
  textMuted: '#82958A',

  border: '#30483A',

  success: '#20C875',
  warning: '#F3BD55',
  error: '#FF7777',

  white: '#FFFFFF',
  black: '#000000',

  statusBar: 'light-content' as const,
};

export const getColors = (mode: ThemeMode) =>
  mode === 'dark' ? darkColors : lightColors;

// Default export maintains compatibility with existing screens.
const colors = lightColors;

export default colors;
