import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../services/auth.service';
import { DatabaseProvider } from '../storage/DatabaseProvider';
import '../i18n';
import { ThemeProvider } from '../theme/ThemeProvider';
import { LocationProvider, useLocation } from '../services/location.service';
import { Stack, useRouter, useSegments } from 'expo-router';
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
      const isDetailScreen = ['model', 'fault', 'part'].includes(segments[0] as string);
      if (!isDetailScreen) {
        router.replace('/(tabs)/home');
      }
    }
  }, [token, homeLocation, authLoading, locLoading, inTabsGroup, isLoginScreen, isOnboardingScreen, router]);

  if (authLoading || locLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // We must always render the router so the navigation tree exists.

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DatabaseProvider>
          <ThemeProvider>
            <LocationProvider>
              <GuardedRoot />
            </LocationProvider>
          </ThemeProvider>
        </DatabaseProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
