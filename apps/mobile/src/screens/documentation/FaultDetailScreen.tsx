import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../services/auth.service';
import { fetchFaultDetailsById, LibraryFault } from '../../services/library-api.service';
import { DetailLayout } from '../../components/ui/DetailLayout';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../theme/ThemeProvider';
import { ColorsType } from '../../theme/colors';

export default function FaultDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const router = useRouter();

  const [fault, setFault] = useState<LibraryFault | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    fetchFaultDetailsById(token, id)
      .then(res => setFault(res))
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

  if (!fault) {
    return (
      <DetailLayout title="Not Found">
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>Fault Code not found or failed to load.</Text>
        </View>
      </DetailLayout>
    );
  }

  return (
    <DetailLayout title={fault.code} subtitle="Fault Code Diagnostic">
      
      {fault.model && (
        <Pressable 
          style={styles.modelBanner} 
          onPress={() => router.push(`/model/${fault.model?.id}`)}
        >
          <Ionicons name="link-outline" size={20} color={colors.blue} />
          <Text style={styles.modelBannerText}>
            Associated with Model: <Text style={{fontWeight: '700'}}>{fault.model.modelName}</Text>
          </Text>
        </Pressable>
      )}

      <Card style={styles.infoCard}>
        <View style={styles.headerWrap}>
          <Text style={styles.faultDescription}>{fault.description}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Severity</Text>
          <Text style={[styles.infoValue, { color: fault.severity === 'HIGH' ? '#dc2626' : colors.textPrimary }]}>
            {fault.severity || 'Unknown'}
          </Text>
        </View>
      </Card>

      {fault.possibleCauses && fault.possibleCauses.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="search-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Possible Causes</Text>
          </View>
          {fault.possibleCauses.map((cause, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <View style={styles.bulletPoint} />
              <Text style={styles.bulletText}>{cause}</Text>
            </View>
          ))}
        </Card>
      )}

      {fault.symptoms && fault.symptoms.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Symptoms</Text>
          </View>
          {fault.symptoms.map((sym, idx) => (
            <View key={idx} style={styles.bulletRow}>
              <View style={styles.bulletPoint} />
              <Text style={styles.bulletText}>{sym}</Text>
            </View>
          ))}
        </Card>
      )}

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
  modelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blueSoft,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 8,
  },
  modelBannerText: {
    color: colors.blue,
    fontSize: 14,
  },
  infoCard: {
    padding: 0,
    overflow: 'hidden',
  },
  headerWrap: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: '#fef2f2', 
  },
  faultDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    padding: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingRight: 8,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textTertiary,
    marginTop: 8,
    marginRight: 10,
  },
  bulletText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    flex: 1,
  },
});
