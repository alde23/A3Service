import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../services/auth.service';
import { useTranslation } from 'react-i18next';

const STORAGE_KEYS = {
  language: 'user-language',
  darkMode: 'user-dark-mode',
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(i18n.language || 'bs');
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(STORAGE_KEYS.language);
        if (savedLang) setLang(savedLang);

        const savedDarkMode = await AsyncStorage.getItem(STORAGE_KEYS.darkMode);
        if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
      } catch (e) {
        // ignore
      }
    };
    loadSettings();
  }, []);

  const toggleLanguage = async () => {
    const next = lang === 'bs' ? 'en' : 'bs';
    try {
      await i18n.changeLanguage(next);
      await AsyncStorage.setItem(STORAGE_KEYS.language, next);
      setLang(next);
    } catch (e) {
      // ignore
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newMode = !darkMode;
      setDarkMode(newMode);
      await AsyncStorage.setItem(STORAGE_KEYS.darkMode, JSON.stringify(newMode));
    } catch (e) {
      // ignore
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const isDark = darkMode;
  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#0f172a';
  const cardBg = isDark ? '#1e293b' : '#f8fafc';
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>
            {t('settings.title') || 'Settings'}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? '#cbd5e1' : '#64748b' }]}>
            {user?.username || 'User'}
          </Text>
        </View>

        {/* Language Section */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.labelLeft}>
              <Ionicons
                name="language"
                size={24}
                color={isDark ? '#cbd5e1' : '#64748b'}
              />
              <Text style={[styles.label, { color: textColor }]}>
                {t('settings.language') || 'Language'}
              </Text>
            </View>
            <View style={styles.value}>
              <Text style={[styles.valueText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {lang === 'bs' ? 'Bosanski' : 'English'}
              </Text>
              <Pressable onPress={toggleLanguage} style={[styles.badge, { backgroundColor: isDark ? '#334155' : '#eef2ff' }]}>
                <Text style={[styles.badgeText, { color: isDark ? '#e0e7ff' : '#0f172a' }]}>
                  {lang === 'bs' ? 'BS' : 'EN'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Dark Mode Section */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.labelLeft}>
              <Ionicons
                name={darkMode ? 'moon' : 'sunny'}
                size={24}
                color={isDark ? '#cbd5e1' : '#64748b'}
              />
              <Text style={[styles.label, { color: textColor }]}>
                {t('settings.dark_mode') || 'Dark Mode'}
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#cbd5e1', true: '#0f172a' }}
              thumbColor={darkMode ? '#e0e7ff' : '#ffffff'}
            />
          </View>
        </View>

        {/* Profile Section */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {t('settings.user_id') || 'User ID'}
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {user?.id || 'N/A'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              {t('settings.username') || 'Username'}
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {user?.username || 'N/A'}
            </Text>
          </View>
        </View>

        {/* Placeholder Section */}
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.placeholderContent}>
            <Ionicons
              name="cube-outline"
              size={48}
              color={isDark ? '#475569' : '#cbd5e1'}
              style={styles.placeholderIcon}
            />
            <Text style={[styles.placeholderTitle, { color: textColor }]}>
              {t('settings.more_coming') || 'More Features Coming'}
            </Text>
            <Text style={[styles.placeholderText, { color: isDark ? '#94a3b8' : '#94a3b8' }]}>
              {t('settings.more_coming_desc') ||
                'Additional settings and features will be added soon'}
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          style={[styles.logoutButton, { backgroundColor: isDark ? '#7f1d1d' : '#fee2e2' }]}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={isDark ? '#fca5a5' : '#dc2626'}
          />
          <Text style={[styles.logoutText, { color: isDark ? '#fca5a5' : '#dc2626' }]}>
            {t('settings.logout') || 'Logout'}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontWeight: '600',
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  placeholderIcon: {
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  logoutText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
