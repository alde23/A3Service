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
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Card } from '../components/ui/Card';

const STORAGE_KEYS = {
  language: 'user-language',
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isDark, colors, toggleTheme } = useTheme();
  const [lang, setLang] = useState(i18n.language || 'bs');

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(STORAGE_KEYS.language);
        if (savedLang) setLang(savedLang);
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

  const handleLogout = async () => {
    await logout();
  };

  const bgColor = colors.bg;
  const textColor = colors.textPrimary;
  const cardBg = colors.surface1;
  const borderColor = colors.border;

  return (
    <Screen
      header={
        <ScreenHeader title={t('settings.title') || 'Settings'}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {user?.username || 'User'}
          </Text>
        </ScreenHeader>
      }
    >
        {/* Language Section */}
        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.labelLeft}>
              <Ionicons
                name="language"
                size={24}
                color={colors.textSecondary}
              />
              <Text style={[styles.label, { color: textColor }]}>
                {t('settings.language') || 'Language'}
              </Text>
            </View>
            <View style={styles.value}>
              <Text style={[styles.valueText, { color: colors.textSecondary }]}>
                {lang === 'bs' ? 'Bosanski' : 'English'}
              </Text>
              <Pressable onPress={toggleLanguage} style={[styles.badge, { backgroundColor: colors.surface2 }]}>
                <Text style={[styles.badgeText, { color: colors.blue }]}>
                  {lang === 'bs' ? 'BS' : 'EN'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Card>

        {/* Dark Mode Section */}
        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.labelLeft}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={24}
                color={colors.textSecondary}
              />
              <Text style={[styles.label, { color: textColor }]}>
                {t('settings.dark_mode') || 'Dark Mode'}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e1', true: colors.surface2 }}
              thumbColor={isDark ? colors.blue : '#ffffff'}
            />
          </View>
        </Card>

        {/* Profile Section */}
        <Card>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t('settings.user_id') || 'User ID'}
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {user?.id || 'N/A'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: borderColor }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              {t('settings.username') || 'Username'}
            </Text>
            <Text style={[styles.infoValue, { color: textColor }]}>
              {user?.username || 'N/A'}
            </Text>
          </View>
        </Card>

        {/* Placeholder Section */}
        <Card>
          <View style={styles.placeholderContent}>
            <Ionicons
              name="cube-outline"
              size={48}
              color={colors.textTertiary}
              style={styles.placeholderIcon}
            />
            <Text style={[styles.placeholderTitle, { color: textColor }]}>
              {t('settings.more_coming') || 'More Features Coming'}
            </Text>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              {t('settings.more_coming_desc') ||
                'Additional settings and features will be added soon'}
            </Text>
          </View>
        </Card>

        {/* Logout Button */}
        <Pressable
          onPress={handleLogout}
          style={[styles.logoutButton, { backgroundColor: colors.redSoft }]}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color={colors.red}
          />
          <Text style={[styles.logoutText, { color: colors.red }]}>
            {t('settings.logout') || 'Logout'}
          </Text>
        </Pressable>
      </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
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
