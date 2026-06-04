import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../services/auth.service';
import { fetchPartDetails, LibraryPartDetail } from '../../services/library-api.service';
import { DetailLayout } from '../../components/ui/DetailLayout';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorsType } from '../../theme/colors';

export default function PartDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  const [part, setPart] = useState<LibraryPartDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    fetchPartDetails(token, id)
      .then(res => setPart(res))
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

  if (!part) {
    return (
      <DetailLayout title="Not Found">
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>Part not found or failed to load.</Text>
        </View>
      </DetailLayout>
    );
  }

  const inStock = part.inventoryStatus === 'IN_STOCK';

  return (
    <DetailLayout title={part.name} subtitle={part.brand || 'Part Details'}>
      <Card style={styles.infoCard}>
        <View style={styles.headerWrap}>
          <Ionicons name="hardware-chip-outline" size={24} color={colors.blue} />
          <Text style={styles.partSku}>{part.sku}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Brand</Text>
          <Text style={styles.infoValue}>{part.brand || 'Generic'}</Text>
        </View>

        {part.unitPrice !== undefined && part.unitPrice !== null && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estimated Price</Text>
            <Text style={styles.infoValue}>{part.unitPrice} KM</Text>
          </View>
        )}

        {part.aliases && part.aliases.length > 0 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Also known as</Text>
            <Text style={styles.infoValue}>{part.aliases.join(', ')}</Text>
          </View>
        )}

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: inStock ? '#dcfce7' : '#fef3c7' }]}>
            <Text style={[styles.statusText, { color: inStock ? '#16a34a' : '#d97706' }]}>
              {part.inventoryStatus || 'UNKNOWN'}
            </Text>
          </View>
        </View>
      </Card>

      {part.modelParts && part.modelParts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Compatible Models ({part.modelParts.length})</Text>
          </View>
          
          {part.modelParts.map((mp, idx) => {
            const model = mp.model;
            if (!model) return null;
            return (
              <Pressable
                key={model.id || idx}
                style={({ pressed }) => [styles.listItem, pressed && { opacity: 0.7 }]}
                onPress={() => router.push(`/model/${model.id}`)}
              >
                <View style={styles.listItemLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: colors.surface3 }]}>
                    <Ionicons name="document-text-outline" size={16} color={colors.textPrimary} />
                  </View>
                  <View style={styles.listItemTextWrap}>
                    <Text style={styles.listItemTitle}>{model.modelName}</Text>
                    <Text style={styles.listItemSubtitle}>{model.manufacturerId}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.border} />
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ height: 40 }} />
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
    marginTop: 8,
  },
  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface2,
  },
  partSku: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
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
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
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
