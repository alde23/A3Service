import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_URL } from './api.config';

const TOKEN_KEY = 'A3S_AUTH_TOKEN';
const USER_KEY = 'A3S_AUTH_USER';

type User = { id?: string; username?: string } | null;

type AuthContextShape = {
  user: User;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
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

  const persistSession = async (nextToken: string, nextUser: NonNullable<User>) => {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, nextToken],
      [USER_KEY, JSON.stringify(nextUser)],
    ]);
  };

  useEffect(() => {
    if (devBypassEnabled) {
      setSession(devBypassToken, buildDevBypassUser());
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUserRaw = await AsyncStorage.getItem(USER_KEY);
        const storedUser = parseStoredUser(storedUserRaw);

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            setUser(storedUser);
          }

          // Optionally validate token with backend
          try {
            const res = await fetch(`${API_URL}/auth/me`, {
              headers: { Authorization: `Bearer ${storedToken}` },
            });
            if (res.status === 401 || res.status === 403) {
              await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
              setToken(null);
              setUser(null);
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
      const t = body.token ?? body.accessToken ?? body.access_token ?? null;
      const u = body.user ?? { username: email };
      if (!t) return false;
      await persistSession(t, u);
      setSession(t, u);
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
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
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
