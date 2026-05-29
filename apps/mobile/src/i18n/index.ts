import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import bs from './locales/bs.json';
import en from './locales/en.json';

// Basic i18n initialization for the mobile app.
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    bs: { translation: bs },
    en: { translation: en },
  },
  lng: 'bs',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
