import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  THEME_PRESETS,
  ThemeId,
  ThemePreset,
  DEFAULT_THEME_ID,
} from '../constants/theme';

export const THEME_STORAGE_KEY = '@anote_theme_id';

export interface ThemeContextValue {
  theme: ThemePreset;
  themeId: ThemeId;
  isDark: boolean;
  setThemeId: (id: ThemeId) => Promise<void>;
  themes: ThemePreset[];
}

const defaultContextValue: ThemeContextValue = {
  theme: THEME_PRESETS[DEFAULT_THEME_ID],
  themeId: DEFAULT_THEME_ID,
  isDark: false,
  setThemeId: async () => {},
  themes: Object.values(THEME_PRESETS),
};

const ThemeContext = createContext<ThemeContextValue>(defaultContextValue);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);

  // Load persisted theme on startup
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedId) => {
        if (mounted && savedId && savedId in THEME_PRESETS) {
          setThemeIdState(savedId as ThemeId);
        }
      })
      .catch((err) => {
        console.warn('[A Note] Failed to load saved theme:', err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setThemeId = useCallback(async (newId: ThemeId) => {
    if (!newId || !(newId in THEME_PRESETS)) return;
    setThemeIdState(newId);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newId);
    } catch (err) {
      console.warn('[A Note] Failed to persist theme:', err);
    }
  }, []);

  const currentTheme = THEME_PRESETS[themeId] || THEME_PRESETS[DEFAULT_THEME_ID];

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        themeId,
        isDark: currentTheme.isDark,
        setThemeId,
        themes: Object.values(THEME_PRESETS),
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  return context || defaultContextValue;
};

