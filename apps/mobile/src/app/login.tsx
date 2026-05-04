import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useAuth } from '../services/auth.service';

export default function LoginScreen() {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const ok = await login(username.trim(), password);
    if (!ok) setError('Invalid credentials or network error');
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoWrap}>
        <Text style={styles.logo}>A3S</Text>
        <Text style={styles.hint}>Sign in to continue</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Username"
          autoCapitalize="none"
          value={username}
          onChangeText={setUsername}
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
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

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  logoWrap: { alignItems: 'center', marginBottom: 24 },
  logo: { fontSize: 48, fontWeight: '700', color: '#0f172a' },
  hint: { color: '#64748b', marginTop: 6 },
  form: { gap: 12 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', padding: 12, borderRadius: 8, marginBottom: 8 },
  button: { backgroundColor: '#0f172a', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b91c1c', marginBottom: 8 },
});
