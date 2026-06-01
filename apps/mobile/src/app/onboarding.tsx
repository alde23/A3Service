import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useLocation } from '../services/location.service';
import { useTheme } from '../theme/ThemeProvider';
import { ColorsType } from '../theme/colors';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { saveHomeLocation } = useLocation();
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!address.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Use Nominatim API for geocoding instead of native expo-location to prevent emulator grpc errors
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, {
        headers: {
          'User-Agent': 'A3Service/1.0'
        }
      });
      const geocoded = await response.json();
      
      if (geocoded && geocoded.length > 0) {
        const latitude = parseFloat(geocoded[0].lat);
        const longitude = parseFloat(geocoded[0].lon);
        await saveHomeLocation(address, { latitude, longitude });
        // The GuardedRoot in _layout.tsx will automatically redirect to /home 
        // once saveHomeLocation updates the context.
      } else {
        setError(t('onboarding.error_not_found', 'Address not found. Please try another one.'));
      }
    } catch (err) {
      setError(t('onboarding.error_network', 'Network error. Please ensure you are connected and try again.'));
    } finally {
      setLoading(false);
    }
  };

  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('onboarding.title', 'Welcome to A3Service')}</Text>
        <Text style={styles.subtitle}>
          {t('onboarding.subtitle', 'Please enter your home address or base location to get started.')}
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder={t('onboarding.address_placeholder', 'e.g. Zmaja od Bosne, Sarajevo')}
          placeholderTextColor={colors.placeholder}
          value={address}
          onChangeText={setAddress}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, !address.trim() && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={!address.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <Text style={styles.buttonText}>{t('onboarding.submit', 'Continue')}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    borderRadius: 14,
    paddingHorizontal: 16,
    color: colors.textPrimary,
    fontSize: 16,
  },
  button: {
    height: 56,
    backgroundColor: colors.blue,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: colors.red,
    fontSize: 14,
  },
});
