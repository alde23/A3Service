import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Screen } from './Screen';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorsType } from '../../theme/colors';

export function DetailLayout({
  title,
  subtitle,
  children,
  headerRight,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  const header = (
    <View style={styles.header}>
      <TouchableOpacity 
        onPress={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/documentation'); // Fallback to documentation
          }
        }} 
        style={styles.backButton}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
      </TouchableOpacity>
      
      <View style={styles.headerCenter}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      
      <View style={styles.headerRight}>
        {headerRight}
      </View>
    </View>
  );

  return (
    <Screen header={header} contentContainerStyle={styles.content}>
      {children}
    </Screen>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface3,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginLeft: -8,
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: -8,
  },
  content: {
    gap: 16,
  },
});
