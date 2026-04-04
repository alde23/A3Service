import { StyleSheet, Text, View } from 'react-native';

export default function DocumentationScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Documentation</Text>
      <Text style={styles.subtitle}>Documentation screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#475569',
  },
});