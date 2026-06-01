import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './auth.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { View, Text } from 'react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      a3s: {
        bypassLoginEnabled: false,
      },
    },
  },
  default: {
    expoConfig: {
      extra: {
        a3s: {
          bypassLoginEnabled: false,
        },
      },
    },
  }
}));

const TestComponent = () => {
  const auth = useAuth();
  
  if (auth.loading) return <Text>Loading...</Text>;
  return (
    <View>
      <Text testID="user">{auth.user ? auth.user.username : 'Guest'}</Text>
      <Text testID="token">{auth.token ?? 'NoToken'}</Text>
    </View>
  );
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('loads offline token from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('offline-token');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ username: 'offline-user' }));
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ username: 'online-user' })
    });

    const { getByTestId, queryByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(queryByText('Loading...')).toBeTruthy();

    await waitFor(() => {
      // It should initially be offline-user, but fetch will update to online-user
      expect(getByTestId('user').props.children).toBe('online-user');
      expect(getByTestId('token').props.children).toBe('offline-token');
    });
  });

  it('handles empty session correctly', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('Guest');
      expect(getByTestId('token').props.children).toBe('NoToken');
    });
  });

  it('handles unauthorized /auth/me and refreshes', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('expired-token');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ username: 'offline-user' }));

    (global.fetch as jest.Mock).mockImplementation(async (url) => {
      if (url.includes('/auth/me')) {
        return { ok: false, status: 401 };
      }
      if (url.includes('/auth/refresh')) {
        return {
          ok: true,
          json: async () => ({ token: 'new-token', refreshToken: 'new-refresh' })
        };
      }
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('token').props.children).toBe('new-token');
    });
  });

  it('logs out successfully', async () => {
    const TestLogoutComponent = () => {
      const auth = useAuth();
      return (
        <View>
          <Text testID="token">{auth.token ?? 'NoToken'}</Text>
          <Text testID="logout" onPress={auth.logout}>Logout</Text>
        </View>
      );
    };

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('offline-token');

    const { getByTestId } = render(
      <AuthProvider>
        <TestLogoutComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(getByTestId('token').props.children).toBe('offline-token');
    });

    getByTestId('logout').props.onPress();

    await waitFor(() => {
      expect(getByTestId('token').props.children).toBe('NoToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('A3S_AUTH_ACCESS_TOKEN');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('A3S_AUTH_USER');
    });
  });

  it('logs in successfully', async () => {
    const TestLoginComponent = () => {
      const auth = useAuth();
      return (
        <View>
          <Text testID="token">{auth.token ?? 'NoToken'}</Text>
          <Text testID="login" onPress={() => auth.login('test@a3.local', 'pass')}>Login</Text>
        </View>
      );
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'login-token', user: { username: 'test-user' } })
    });

    const { getByTestId } = render(
      <AuthProvider>
        <TestLoginComponent />
      </AuthProvider>
    );

    getByTestId('login').props.onPress();

    await waitFor(() => {
      expect(getByTestId('token').props.children).toBe('login-token');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('A3S_AUTH_ACCESS_TOKEN', 'login-token');
    });
  });
});
