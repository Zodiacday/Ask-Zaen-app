import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ClerkProvider, useAuth, useUser } from '@clerk/expo';
import { tokenCache } from '@clerk/expo/token-cache';
import ParentAuthModal from '@/components/ParentAuthModal';

export type AuthFlowMode = 'signIn' | 'signUp' | 'signInOrUp';

type AuthContextValue = {
  authConfigured: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  displayName: string | null;
  email: string | null;
  openAuth: (mode?: AuthFlowMode) => void;
  closeAuth: () => void;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const authConfigured = Boolean(process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY);

const guestValue: AuthContextValue = {
  authConfigured,
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  displayName: null,
  email: null,
  openAuth: () => {},
  closeAuth: () => {},
  getToken: async () => null,
  signOut: async () => {},
};

const AuthContext = createContext<AuthContextValue>(guestValue);

function ClerkAuthBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken, signOut } = useAuth({ treatPendingAsSignedOut: false });
  const { user } = useUser();
  const [visible, setVisible] = useState(false);
  const [authMode, setAuthMode] = useState<AuthFlowMode>('signInOrUp');

  useEffect(() => {
    // Focused sign-in/sign-up flows close once Clerk establishes the session.
    // The combined Profile flow stays open for account management.
    if (visible && isSignedIn && authMode !== 'signInOrUp') {
      const closeTimer = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(closeTimer);
    }
  }, [authMode, isSignedIn, visible]);

  const value = useMemo<AuthContextValue>(() => ({
    authConfigured: true,
    isLoaded,
    isSignedIn: Boolean(isSignedIn),
    userId: user?.id ?? null,
    displayName: user ? ([user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Parent') : null,
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    openAuth: (mode = 'signInOrUp') => {
      setAuthMode(mode);
      setVisible(true);
    },
    closeAuth: () => setVisible(false),
    getToken,
    signOut: async () => { await signOut(); setVisible(false); },
  }), [getToken, isLoaded, isSignedIn, signOut, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      <ParentAuthModal
        visible={visible}
        signedIn={Boolean(isSignedIn)}
        mode={authMode}
        onClose={() => setVisible(false)}
      />
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return <AuthContext.Provider value={guestValue}>{children}</AuthContext.Provider>;
  }
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
      // The app uses a custom auth screen. Load Clerk UI only when the
      // signed-in account-management view is actually opened.
      prefetchUI={false}
    >
      <ClerkAuthBridge>{children}</ClerkAuthBridge>
    </ClerkProvider>
  );
}

export function useZaenAuth(): AuthContextValue {
  return useContext(AuthContext);
}

