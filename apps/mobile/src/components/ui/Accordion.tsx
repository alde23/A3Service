import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, LayoutAnimation, UIManager, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorsType } from '../../theme/colors';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

interface AccordionProps {
  title: string;
  count?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function Accordion({ title, count, icon, children, defaultExpanded = false }: AccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={toggleExpand}>
        <View style={styles.headerLeft}>
          {icon && <Ionicons name={icon} size={20} color={colors.textPrimary} style={styles.icon} />}
          <Text style={styles.title}>{title}</Text>
          {count !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{count}</Text>
            </View>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface1,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badge: {
    backgroundColor: colors.blueSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.blue,
  },
  content: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface1,
  },
});
