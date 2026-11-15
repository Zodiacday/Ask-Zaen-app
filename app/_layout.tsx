import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { DynaPuff_600SemiBold, DynaPuff_700Bold } from '@expo-google-fonts/dynapuff';
import { Comfortaa_700Bold } from '@expo-google-fonts/comfortaa';
import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';
import { Quicksand_600SemiBold, Quicksand_700Bold } from '@expo-google-fonts/quicksand';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SavedProvider } from '@/constants/SavedContext';
import { LanguageProvider } from '@/constants/LanguageContext';
import { OnboardingProvider, useOnboarding } from '@/constants/OnboardingContext';
import { SubscriptionsProvider } from '@/constants/SubscriptionsContext';
import { OnboardingModal } from '@/components/OnboardingModal';
import { CalmColors } from '@/constants/Colors';
import { SanctuaryLoader } from '@/components/SanctuaryLoader';
import { useAppBoot } from '@/constants/useAppBoot';
import { AuthProvider } from '@/constants/AuthContext';
import ZaenSyncBridge from '@/components/ZaenSyncBridge';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootOnboardingOverlay() {
  const { showOnboarding, completeOnboarding } = useOnboarding();
  return (
    <OnboardingModal
      visible={showOnboarding}
      onComplete={completeOnboarding}
    />
  );
}

export default function RootLayout() {
  const [loaderVisible, setLoaderVisible] = useState(true);
  const handleLoaderFinish = useCallback(() => {
    setLoaderVisible(false);
  }, []);
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Fredoka_600SemiBold,
    Fredoka_700Bold,
    DynaPuff_600SemiBold,
    DynaPuff_700Bold,
    Comfortaa_700Bold,
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Quicksand_600SemiBold,
    Quicksand_700Bold,
    ...Ionicons.font,
  });

  const boot = useAppBoot(loaded, error ?? null);

  useEffect(() => {
    if (error) {
      console.warn('Font load warning (falling back gracefully):', error);
    }
  }, [error]);

  useEffect(() => {
    // Hand off from static native splash straight to our animated SanctuaryLoader
    SplashScreen.hideAsync().catch(() => {});

    // Web focus outline suppression (kills default orange/blue browser focus rectangles)
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const styleId = 'askzaen-suppress-focus-ring';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          input, textarea, select, button {
            outline: none !important;
            outline-style: none !important;
            outline-width: 0 !important;
            box-shadow: none !important;
            -webkit-tap-highlight-color: transparent !important;
          }
          input:focus, textarea:focus, select:focus, button:focus,
          input:focus-visible, textarea:focus-visible, select:focus-visible {
            outline: none !important;
            outline-style: none !important;
            outline-width: 0 !important;
            box-shadow: none !important;
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <AuthProvider>
      <View style={{ flex: 1, backgroundColor: CalmColors.canvasPrimary }}>
      <StatusBar style="dark" />

      {boot.canMountScene && boot.hydratedState && (
        <View style={{ flex: 1 }} onLayout={boot.markSceneLaidOut}>
          <LanguageProvider initialLanguage={boot.hydratedState.language}>
            <SavedProvider initialSavedMovies={boot.hydratedState.savedMovies}>
              <OnboardingProvider initialShowOnboarding={boot.hydratedState.showOnboarding}>
                <SubscriptionsProvider>
                  <ZaenSyncBridge />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: CalmColors.canvasPrimary },
                    }}
                  >
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="category/[id]"
                      options={{
                        headerShown: false,
                        animation: 'slide_from_right',
                      }}
                    />
                  </Stack>

                  {/* Root-level Onboarding Overlay (zIndex 10000 — underneath SanctuaryLoader, above Tabs) */}
                  <RootOnboardingOverlay />
                </SubscriptionsProvider>
              </OnboardingProvider>
            </SavedProvider>
          </LanguageProvider>
        </View>
      )}

      {/* Real Startup-Driven Loader (zIndex 99999 — mounts on Frame 1, auto-fades once 100% settles) */}
      {loaderVisible && (
        <SanctuaryLoader
          fontsLoaded={boot.fontsReady}
          realProgress={boot.realProgress}
          bootReady={boot.bootReady}
          onFinish={handleLoaderFinish}
        />
      )}
      </View>
    </AuthProvider>
  );
}
