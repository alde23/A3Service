import { Platform } from 'react-native';

function normalizeApiBaseUrl(url: string) {
  const trimmed = url.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

const localApiHost = '192.168.0.14';
const defaultUrl = __DEV__ ? `http://${localApiHost}:3000/api` : 'https://api.example.com';

export const API_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_URL || defaultUrl
);

export function authJsonHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}
