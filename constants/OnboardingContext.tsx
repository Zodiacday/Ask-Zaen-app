import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ONBOARDING_COMPLETED_KEY } from '@/components/OnboardingModal';
import { AgeTier } from '@/constants/kidsDb';
import { triggerHaptic } from '@/constants/haptics';

interface OnboardingContextValue {
  showOnboarding: boolean;
  completeOnboarding: (tier?: AgeTier) => void;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  showOnboarding: false,
  completeOnboarding: () => {},
  resetOnboarding: async () => {},
});

interface OnboardingProviderProps {
  children: React.ReactNode;
  initialShowOnboarding?: boolean;
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({
  children,
  initialShowOnboarding,
}) => {
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    initialShowOnboarding ?? false
  );

  useEffect(() => {
    if (initialShowOnboarding !== undefined) {
      return;
    }

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('reset=1') || search.includes('onboarding=1')) {
        AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY).then(() => {
          setShowOnboarding(true);
        });
        return;
      }
    }

    AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY).then((value) => {
      if (value !== 'true') {
        setShowOnboarding(true);
      }
    });
  }, [initialShowOnboarding]);

  const completeOnboarding = useCallback((_tier?: AgeTier) => {
    setShowOnboarding(false);
  }, []);

  const resetOnboarding = useCallback(async () => {
    triggerHaptic('heavy');
    await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    setShowOnboarding(true);
  }, []);

  return (
    <OnboardingContext.Provider value={{ showOnboarding, completeOnboarding, resetOnboarding }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);
