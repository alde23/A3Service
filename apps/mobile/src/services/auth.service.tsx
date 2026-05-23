import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { API_URL } from './api.config';

const TOKEN_KEY = 'A3S_AUTH_TOKEN';
const USER_KEY = 'A3S_AUTH_USER';
const BYPASS_MODE = true; // Set to false to disable login bypass

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
const devBypassUser = {
  id: runtimeA3SConfig.bypassUserId || 'tech-demo',
  username: runtimeA3SConfig.bypassUsername || 'demo-tech',
};
const devBypassToken = runtimeA3SConfig.bypassToken || 'dev-bypass-token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (devBypassEnabled) {
      setToken(devBypassToken);
      setUser(devBypassUser);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // Bypass mode for development - automatically set a test user
        if (BYPASS_MODE) {
          const testUser = { id: 'test-user', username: 'dev-user' };
          const testToken = 'dev-token-bypass';
          setToken(testToken);
          setUser(testUser);
          setLoading(false);
          return;
        }

        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedToken) {
          setToken(storedToken);
          if (storedUser) setUser(JSON.parse(storedUser));
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
          } catch (e) {
            // network error - keep locally stored state and allow user to continue offline
          }
        }
      } catch (e) {
        // ignore read errors
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    if (devBypassEnabled) {
      setToken(devBypassToken);
      setUser({
        ...devBypassUser,
        username: email || devBypassUser.username,
      });
      return true;
    }

    setLoading(true);
    try {
      // Bypass mode - accept any credentials
      if (BYPASS_MODE) {
        const testUser = { id: 'test-user', username: username || 'dev-user' };
        const testToken = 'dev-token-bypass';
        await AsyncStorage.setItem(TOKEN_KEY, testToken);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(testUser));
        setToken(testToken);
        setUser(testUser);
        return true;
      }

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) return false;
      const body = await res.json();
      const t = body.token ?? body.accessToken ?? body.access_token ?? null;
      const u = body.user ?? { email };
      if (!t) return false;
      await AsyncStorage.setItem(TOKEN_KEY, t);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
      setToken(t);
      setUser(u);
      return true;
    } catch (e) {
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
