import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../services/auth.service';
import { DatabaseProvider } from '../storage/DatabaseProvider';
import '../i18n';
import { ThemeProvider } from '../theme/ThemeProvider';
import { LocationProvider, useLocation } from '../services/location.service';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

function GuardedRoot() {
  const { token, loading: authLoading } = useAuth();
  const { homeLocation, loading: locLoading } = useLocation();
  const segments = useSegments();
  const router = useRouter();

  const inTabsGroup = segments[0] === '(tabs)';
  const isLoginScreen = segments[0] === 'login';
  const isOnboardingScreen = segments[0] === 'onboarding';

  useEffect(() => {
    if (authLoading || locLoading) return;

    if (!token && !isLoginScreen) {
      router.replace('/login');
    } else if (token && !homeLocation && !isOnboardingScreen) {
      router.replace('/onboarding');
    } else if (token && homeLocation && !inTabsGroup) {
      router.replace('/(tabs)/home');
    }
  }, [token, homeLocation, authLoading, locLoading, inTabsGroup, isLoginScreen, isOnboardingScreen, router]);

  if (authLoading || locLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Returning null here breaks the <Slot /> and prevents router.replace from working!
  // We must always render <Slot /> so the navigation tree exists.

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <DatabaseProvider>
        <AuthProvider>
          <LocationProvider>
            <GuardedRoot />
          </LocationProvider>
        </AuthProvider>
      </DatabaseProvider>
    </ThemeProvider>
  );
}
