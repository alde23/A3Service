import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../services/auth.service';
import { fetchLibraryModelDetails, LibraryModel } from '../../services/library-api.service';
import { DetailLayout } from '../../components/ui/DetailLayout';
import { Card } from '../../components/ui/Card';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorsType } from '../../theme/colors';

export default function ModelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  const [model, setModel] = useState<LibraryModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    fetchLibraryModelDetails(token, id)
      .then(res => setModel(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id, token]);

  if (loading) {
    return (
      <DetailLayout title="Loading...">
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color={colors.blue} />
        </View>
      </DetailLayout>
    );
  }

  if (!model) {
    return (
      <DetailLayout title="Not Found">
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>Model not found or failed to load.</Text>
        </View>
      </DetailLayout>
    );
  }

  return (
    <DetailLayout title={model.name} subtitle={model.brand}>
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Category</Text>
          <Text style={styles.infoValue}>{model.category}</Text>
        </View>
        {model.description && (
          <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.infoValue}>{model.description}</Text>
          </View>
        )}
      </Card>

      {model.faultCodes && model.faultCodes.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Fault Codes" count={model.faultCodes.length} />
          {model.faultCodes.map((fault, idx) => (
            <Pressable
              key={fault.id || idx}
              style={({ pressed }) => [styles.listItem, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(`/fault/${fault.id}`)}
            >
              <View style={styles.listItemLeft}>
                <View style={[styles.iconWrap, { backgroundColor: '#fee2e2' }]}>
                  <Text style={[styles.iconText, { color: '#dc2626' }]}>{fault.code}</Text>
                </View>
                <View style={styles.listItemTextWrap}>
                  <Text style={styles.listItemTitle}>{fault.description}</Text>
                  {fault.severity && <Text style={styles.listItemSubtitle}>Severity: {fault.severity}</Text>}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.border} />
            </Pressable>
          ))}
        </View>
      )}

      {model.modelParts && model.modelParts.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="Parts & Components" count={model.modelParts.length} />
          {model.modelParts.map((mp, idx) => {
            const part = mp.part;
            if (!part) return null;
            return (
              <Pressable
                key={part.id || idx}
                style={({ pressed }) => [styles.listItem, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(`/part/${part.id}`)}
              >
                <View style={styles.listItemLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="hardware-chip-outline" size={16} color="#16a34a" />
                  </View>
                  <View style={styles.listItemTextWrap}>
                    <Text style={styles.listItemTitle}>{part.name}</Text>
                    <Text style={styles.listItemSubtitle}>SKU: {part.sku}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.border} />
              </Pressable>
            );
          })}
        </View>
      )}
      
      {/* Space at the bottom */}
      <View style={{ height: 20 }} />
    </DetailLayout>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({
  centerWrap: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  infoCard: {
    padding: 0,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  section: {
    marginTop: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listItemTextWrap: {
    flex: 1,
  },
  listItemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  listItemSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
