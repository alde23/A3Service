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
import { C } from '../theme/colors';

const STORAGE_KEYS = {
  language: 'user-language',
  darkMode: 'user-dark-mode',
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [lang, setLang] = useState(i18n.language || 'bs');
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(STORAGE_KEYS.language);
        if (savedLang) setLang(savedLang);

        const savedDarkMode = await AsyncStorage.getItem(STORAGE_KEYS.darkMode);
        if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
      } catch {
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
    } catch {
      // ignore
    }
  };

  const toggleDarkMode = async () => {
    try {
      const newMode = !darkMode;
      setDarkMode(newMode);
      await AsyncStorage.setItem(STORAGE_KEYS.darkMode, JSON.stringify(newMode));
    } catch {
      // ignore this
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const isDark = darkMode;
  const bgColor = isDark ? C.bg : '#ffffff';
  const textColor = isDark ? C.textPrimary : '#0f172a';
  const cardBg = isDark ? C.surface1 : '#f8fafc';
  const borderColor = isDark ? C.border : '#e2e8f0';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: textColor }]}>
            {t('settings.title') || 'Settings'}
          </Text>
          <Text style={[styles.subtitle, { color: isDark ? C.textSecondary : '#64748b' }]}>
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
                color={isDark ? C.textSecondary : '#64748b'}
              />
              <Text style={[styles.label, { color: textColor }]}>
                {t('settings.language') || 'Language'}
              </Text>
            </View>
            <View style={styles.value}>
              <Text style={[styles.valueText, { color: isDark ? C.textSecondary : '#64748b' }]}>
                {lang === 'bs' ? 'Bosanski' : 'English'}
              </Text>
              <Pressable onPress={toggleLanguage} style={[styles.badge, { backgroundColor: isDark ? C.surface2 : '#eef2ff' }]}>
                <Text style={[styles.badgeText, { color: isDark ? C.blue : '#0f172a' }]}>
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
                color={isDark ? C.textSecondary : '#64748b'}
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
            <Text style={[styles.infoLabel, { color: isDark ? C.textSecondary : '#64748b' }]}>
              {t('settings.user_id') || 'User ID'}
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {user?.id || 'N/A'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: isDark ? C.textSecondary : '#64748b' }]}>
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
              color={isDark ? C.textTertiary : '#cbd5e1'}
              style={styles.placeholderIcon}
            />
            <Text style={[styles.placeholderTitle, { color: textColor }]}>
              {t('settings.more_coming') || 'More Features Coming'}
            </Text>
            <Text style={[styles.placeholderText, { color: isDark ? C.textSecondary : '#94a3b8' }]}>
              {t('settings.more_coming_desc') ||
                'Additional settings and features will be added soon'}
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          style={[styles.logoutButton, { backgroundColor: isDark ? C.redSoft : '#fee2e2' }]}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={isDark ? C.red : '#dc2626'}
          />
          <Text style={[styles.logoutText, { color: isDark ? C.red : '#dc2626' }]}>
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
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
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
    fontSize: 15,
    fontWeight: '500',
  },
  value: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '400',
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
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '400',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    marginVertical: 0,
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
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  logoutText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
