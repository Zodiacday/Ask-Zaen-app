import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { normalizeLanguage } from '@/constants/languages';
import { markPreferencesUpdated } from '@/constants/preferencesStorage';

const LANGUAGE_STORAGE_KEY = '@zaen_selected_language';

interface LanguageContextType {
  /** Canonical language code, or null when the whole library is shown. */
  language: string | null;
  /** False until the persisted choice has been read. */
  ready: boolean;
  setLanguage: (code: string | null) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: null,
  ready: false,
  setLanguage: async () => {},
});

interface LanguageProviderProps {
  children: React.ReactNode;
  initialLanguage?: string | null;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({
  children,
  initialLanguage,
}) => {
  const hasInitial = initialLanguage !== undefined;
  const [language, setLanguageState] = useState<string | null>(
    hasInitial ? initialLanguage : null
  );
  const [ready, setReady] = useState(hasInitial);

  useEffect(() => {
    if (hasInitial) {
      return;
    }

    let mounted = true;

    const loadLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (mounted && stored) {
          setLanguageState(normalizeLanguage(stored) ?? stored);
        }
      } catch (e) {
        console.warn('Failed to load selected language', e);
      } finally {
        if (mounted) setReady(true);
      }
    };

    loadLanguage();

    return () => {
      mounted = false;
    };
  }, [hasInitial]);

  const setLanguage = useCallback(async (code: string | null) => {
    const normalized = code ? normalizeLanguage(code) ?? code : null;
    setLanguageState(normalized);
    void markPreferencesUpdated();

    try {
      if (normalized) {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
      } else {
        await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('Failed to persist selected language', e);
    }
  }, []);

  const value = useMemo(
    () => ({ language, ready, setLanguage }),
    [language, ready, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);
