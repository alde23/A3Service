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
  });

  it('loads offline token from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('offline-token');
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify({ username: 'offline-user' }));

    const { getByTestId, queryByText } = render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(queryByText('Loading...')).toBeTruthy();

    await waitFor(() => {
      expect(getByTestId('user').props.children).toBe('offline-user');
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
});
