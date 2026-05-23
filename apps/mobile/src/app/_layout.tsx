import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from '../services/auth.service';
import { DatabaseProvider } from '../storage/DatabaseProvider';
import LoginScreen from './login';

function TabIcon({
  name,
  color,
  size,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  color: string;
  size: number;
}) {
  return <Ionicons name={name} color={color} size={size} />;
}

function AppTabs() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#0f172a',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e2e8f0',
          height: Platform.select({ ios: 88, default: 64 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: 24, default: 10 }),
        },
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: 'Jobs',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="briefcase-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="documentation"
        options={{
          title: 'Documentation',
          tabBarIcon: ({ color, size }) => (
            <TabIcon
              name="document-text-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="bar-chart-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function GuardedRoot() {
  const { user, loading } = useAuth();
  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator />
    </View>
  );
  if (!user) return <LoginScreen />;
  return <AppTabs />;
}

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <AuthProvider>
        <GuardedRoot />
      </AuthProvider>
    </DatabaseProvider>
  );
}
