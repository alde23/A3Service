import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeProvider';

type ScreenHeaderProps = {
  title: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  children?: ReactNode;
};

export function ScreenHeader({ title, iconName, children }: ScreenHeaderProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { backgroundColor: colors.surface3 }]}>
      <View style={styles.headerTitleRow}>
        {iconName && (
          <View style={[styles.headerIconWrap, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
            <Ionicons name={iconName} size={18} color={colors.textPrimary} />
          </View>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
