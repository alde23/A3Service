import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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

        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>Status</Text>
          <View style={[styles.statusBadge, { backgroundColor: inStock ? '#dcfce7' : '#fef3c7' }]}>
            <Text style={[styles.statusText, { color: inStock ? '#16a34a' : '#d97706' }]}>
              {part.inventoryStatus || 'UNKNOWN'}
            </Text>
          </View>
        </View>
      </Card>
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
});
