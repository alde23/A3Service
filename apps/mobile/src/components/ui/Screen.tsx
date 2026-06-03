import { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorsType } from '../../theme/colors';

type ScreenProps = {
  header?: ReactNode;
  children: ReactNode;
  noScroll?: boolean;
  contentContainerStyle?: ViewStyle;
};

export function Screen({ header, children, noScroll = false, contentContainerStyle }: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {header}
      {noScroll ? (
        <View style={[{ flex: 1 }, contentContainerStyle]}>{children}</View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
});
