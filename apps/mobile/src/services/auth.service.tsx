import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { API_URL } from './api.config';

const ACCESS_TOKEN_KEY = 'A3S_AUTH_ACCESS_TOKEN';
const REFRESH_TOKEN_KEY = 'A3S_AUTH_REFRESH_TOKEN';
const USER_KEY = 'A3S_AUTH_USER';

type User = { id?: string; username?: string } | null;

type AuthContextShape = {
  user: User;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

type RuntimeA3SConfig = {
  bypassLoginEnabled?: boolean;
  bypassUsername?: string;
  bypassUserId?: string;
  bypassToken?: string;
};

const runtimeA3SConfig = (Constants.expoConfig?.extra?.a3s ??
  {}) as RuntimeA3SConfig;
const devBypassEnabled = __DEV__ && runtimeA3SConfig.bypassLoginEnabled === true;
const devBypassToken = runtimeA3SConfig.bypassToken || 'dev-bypass-token';

function buildDevBypassUser(usernameOverride?: string) {
  return {
    id: runtimeA3SConfig.bypassUserId || 'tech-demo',
    username: usernameOverride || runtimeA3SConfig.bypassUsername || 'demo-tech',
  };
}

function parseStoredUser(raw: string | null): User {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const setSession = (nextToken: string, nextUser: NonNullable<User>) => {
    setToken(nextToken);
    setUser(nextUser);
  };

  const persistSession = async (
    nextToken: string,
    nextUser: NonNullable<User>,
    nextRefreshToken?: string | null
  ) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, nextToken);
    if (nextRefreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, nextRefreshToken);
    }
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  };

  const clearSession = async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
    ]);
    setToken(null);
    setUser(null);
  };

  const getStoredRefreshToken = async () => {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  };

  const refreshSessionToken = async (refreshToken?: string | null) => {
    const tokenToUse = refreshToken ?? (await getStoredRefreshToken());
    if (!tokenToUse) {
      return null;
    }

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokenToUse }),
      });
      if (!res.ok) {
        await clearSession();
        return null;
      }

      const body = await res.json();
      const nextToken = body.token ?? body.accessToken ?? body.access_token ?? null;
      const nextRefreshToken =
        body.refreshToken ?? body.refresh_token ?? tokenToUse;
      if (!nextToken) {
        await clearSession();
        return null;
      }

      const storedUserRaw = await AsyncStorage.getItem(USER_KEY);
      const storedUser = parseStoredUser(storedUserRaw);
      const persistedUser = storedUser ?? { username: 'unknown' };

      await persistSession(nextToken, persistedUser, nextRefreshToken);
      setToken(nextToken);
      return nextToken;
    } catch {
      return null;
    }
  };

  const refreshToken = async () => {
    const refreshed = await refreshSessionToken();
    return refreshed !== null;
  };

  useEffect(() => {
    if (devBypassEnabled) {
      setSession(devBypassToken, buildDevBypassUser());
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        const storedUserRaw = await AsyncStorage.getItem(USER_KEY);
        const storedUser = parseStoredUser(storedUserRaw);

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            setUser(storedUser);
          }

          // Optionally validate token with backend and refresh if expired
          try {
            const res = await fetch(`${API_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.status === 401 || res.status === 403) {
              const refreshedToken = await refreshSessionToken();
              if (!refreshedToken) {
                await clearSession();
              }
            } else if (res.ok) {
              const me = await res.json();
              setUser(me);
            }
          } catch {
            // network error - keep locally stored state and allow user to continue offline
          }
        }
      } catch {
        // ignore read errors
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    if (devBypassEnabled) {
      setSession(devBypassToken, buildDevBypassUser(email));
      return true;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const body = await res.json();
      const accessToken = body.token ?? body.accessToken ?? body.access_token ?? null;
      const refreshToken =
        body.refreshToken ?? body.refresh_token ?? null;
      const u = body.user ?? { username: email };
      if (!accessToken) return false;
      await persistSession(accessToken, u, refreshToken ?? undefined);
      setSession(accessToken, u);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (devBypassEnabled) {
      return;
    }

    setLoading(true);
    try {
      await clearSession();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, logout, refreshToken }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthProvider;
