const path = require('path');
const { config: loadDotenv } = require('dotenv');

loadDotenv({ path: path.resolve(__dirname, '../../.env') });

function parseBoolean(value) {
  if (!value) {
    return false;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function requireGoogleMapsApiKey() {
  const value = process.env.GOOGLE_MAPS_API_KEY?.trim();

  if (!value) {
    throw new Error(
      'Missing GOOGLE_MAPS_API_KEY in root .env. This key is required for react-native-maps on native builds.'
    );
  }

  if (!/^AIza[A-Za-z0-9_-]{20,}$/.test(value)) {
    throw new Error(
      'GOOGLE_MAPS_API_KEY format looks invalid. Expected a Google API key starting with "AIza".'
    );
  }

  return value;
}

module.exports = ({ config }) => {
  const googleMapsApiKey = requireGoogleMapsApiKey();
  const bypassLoginEnabled = parseBoolean(process.env.A3S_BYPASS_LOGIN);
  const bypassUsername = process.env.A3S_BYPASS_USERNAME?.trim() || 'demo-tech';
  const bypassUserId = process.env.A3S_BYPASS_USER_ID?.trim() || 'tech-demo';
  const bypassToken = process.env.A3S_BYPASS_TOKEN?.trim() || 'dev-bypass-token';

  return {
    ...config,
    extra: {
      ...config.extra,
      a3s: {
        ...config.extra?.a3s,
        bypassLoginEnabled,
        bypassUsername,
        bypassUserId,
        bypassToken,
      },
    },
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          ...config.android?.config?.googleMaps,
          apiKey: googleMapsApiKey,
        },
      },
    },
    ios: {
      ...config.ios,
      config: {
        ...config.ios?.config,
        googleMapsApiKey,
      },
    },
  };
};
