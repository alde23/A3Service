import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, FlatList, Keyboard } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocation } from '../services/location.service';
import { useTheme } from '../theme/ThemeProvider';
import { ColorsType } from '../theme/colors';

type Suggestion = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { saveHomeLocation } = useLocation();
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (address.length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=ba&q=${encodeURIComponent(address)}`, {
          headers: { 'User-Agent': 'A3Service/1.0' }
        });
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data || []);
        }
      } catch {
        // fail silently for auto-suggestions
      } finally {
        setLoadingSuggestions(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [address]);

  const cleanAddress = (displayName: string) => {
    // Nominatim returns very verbose names. Take only the first 2 parts (e.g. Street, City)
    const parts = displayName.split(',').map(p => p.trim());
    return parts.slice(0, 2).join(', ');
  };

  const onSelectSuggestion = (item: Suggestion) => {
    Keyboard.dismiss();
    setAddress(cleanAddress(item.display_name));
    setSuggestions([]);
  };

  const onSubmit = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setSuggestions([]); // clear suggestions so they don't block UI
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ba&q=${encodeURIComponent(address)}`, {
        headers: { 'User-Agent': 'A3Service/1.0' }
      });
      if (!response.ok) {
         setError(t('onboarding.error_network', 'Service temporarily unavailable (rate limited). Please try again in a moment.'));
         return;
      }
      const geocoded = await response.json();
      
      if (geocoded && geocoded.length > 0) {
        const latitude = parseFloat(geocoded[0].lat);
        const longitude = parseFloat(geocoded[0].lon);
        await saveHomeLocation(address, { latitude, longitude });
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

        {loadingSuggestions && (
          <ActivityIndicator size="small" color={colors.textPrimary} style={{ alignSelf: 'flex-start' }} />
        )}

        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.suggestionItem, pressed && styles.suggestionItemPressed]}
                  onPress={() => onSelectSuggestion(item)}
                >
                  <Text style={styles.suggestionText}>{cleanAddress(item.display_name)}</Text>
                </Pressable>
              )}
            />
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.button, (!address.trim()) && styles.buttonDisabled]}
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
  suggestionsContainer: {
    maxHeight: 180,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionItemPressed: {
    backgroundColor: colors.surface1,
  },
  suggestionText: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  button: {
    height: 56,
    backgroundColor: colors.blue,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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

