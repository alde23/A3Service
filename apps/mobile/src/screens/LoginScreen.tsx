import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, ActivityIndicator, Pressable, Alert } from 'react-native';
import { useAuth } from '../services/auth.service';
import { ColorsType } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    try {
      const ok = await login(email.trim(), password);
      if (!ok) {
        setError('Invalid credentials or network error');
        Alert.alert('Login Failed', 'Invalid credentials or network error. Please check your connection to the local API.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      Alert.alert('Error', msg);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>A3S</Text>
        <Text style={styles.hint}>Sign in to continue</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Email"
          placeholderTextColor={colors.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={colors.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {loading ? (
          <ActivityIndicator />
        ) : (
          <Pressable onPress={onSubmit} style={styles.button}>
            <Text style={styles.buttonText}>Sign In</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 36, fontWeight: '800', letterSpacing: -1, color: colors.textPrimary },
  hint: { color: colors.textSecondary, marginTop: 6, fontSize: 14 },
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, color: colors.textPrimary, paddingHorizontal: 16, paddingVertical: 15, borderRadius: 14, marginBottom: 8, height: 54, fontSize: 15 },
  button: { backgroundColor: colors.blue, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', height: 52, justifyContent: 'center' },
  buttonText: { color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
  error: { color: colors.red, marginBottom: 8 },
});
