import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, ColorsType } from './colors';

type ThemeContextType = {
  isDark: boolean;
  colors: ColorsType;
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  colors: darkColors,
  toggleTheme: () => Promise.resolve(),
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedDarkMode = await AsyncStorage.getItem('user-dark-mode');
        if (savedDarkMode !== null) {
          setIsDark(JSON.parse(savedDarkMode));
        }
      } catch {
        // Ignore
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    try {
      const newMode = !isDark;
      setIsDark(newMode);
      await AsyncStorage.setItem('user-dark-mode', JSON.stringify(newMode));
    } catch {
      // Ignore
    }
  };

  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ isDark, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
