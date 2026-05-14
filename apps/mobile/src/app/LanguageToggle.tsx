import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'user-language';

export default function LanguageToggle() {
  const [lang, setLang] = useState(i18n.language || 'bs');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v) {
        i18n.changeLanguage(v);
        setLang(v);
      }
    }).catch(() => {});
  }, []);

  const toggle = async () => {
    const next = lang === 'bs' ? 'en' : 'bs';
    try {
      await i18n.changeLanguage(next);
      await AsyncStorage.setItem(STORAGE_KEY, next);
      setLang(next);
    } catch (e) {
      // ignore
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={toggle} style={styles.button}>
        <Text style={styles.text}>{lang === 'bs' ? 'BS' : 'EN'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-end', padding: 8 },
  button: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  text: { color: '#0f172a', fontWeight: '600' },
});
