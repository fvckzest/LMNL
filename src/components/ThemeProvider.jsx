/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'lmnl-theme';
const ThemeContext = createContext(null);

export function getThemeNeutralColor(theme) {
  return theme === 'dark' ? '#ffffff' : '#000000';
}

function resolveTheme() {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function initializeTheme() {
  if (typeof document === 'undefined') {
    return;
  }

  document.documentElement.dataset.theme = resolveTheme();
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(resolveTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light')),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }

  return context;
}

export function useThemeNeutralColor() {
  const { theme } = useTheme();
  return getThemeNeutralColor(theme);
}
