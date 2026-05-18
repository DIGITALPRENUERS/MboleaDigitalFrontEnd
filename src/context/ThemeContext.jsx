import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'mbolea-theme';

const ThemeContext = createContext({
  dark: false,
  setDark: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }) {
  const [dark, setDarkState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  const setDark = useCallback((v) => setDarkState(!!v), []);
  const toggle = useCallback(() => setDarkState((d) => !d), []);

  const value = useMemo(() => ({ dark, setDark, toggle }), [dark, setDark, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
