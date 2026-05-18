import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'A3S_AUTH_TOKEN';
const USER_KEY = 'A3S_AUTH_USER';
const BYPASS_MODE = true; // Set to false to disable login bypass

type User = { id?: string; username?: string } | null;

type AuthContextShape = {
  user: User;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

const API_URL = process.env.A3S_API_URL || 'https://api.example.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            if (!res.ok) {
              await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
              setToken(null);
              setUser(null);
            } else {
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

  const login = async (username: string, password: string) => {
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
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) return false;
      const body = await res.json();
      const t = body.token ?? body.accessToken ?? null;
      const u = body.user ?? body;
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
