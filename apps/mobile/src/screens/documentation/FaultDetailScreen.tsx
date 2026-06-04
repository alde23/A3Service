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
      
      {fault.reviewRequired && (
        <View style={styles.reviewBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#ca8a04" />
          <Text style={styles.reviewText}>
            This diagnostic information was automatically ingested and may require manual review.
          </Text>
        </View>
      )}

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
          <Text style={[styles.infoValue, { color: fault.severity === 'HIGH' || fault.severity === 'critical' ? '#dc2626' : colors.textPrimary }]}>
            {fault.severity || 'Unknown'}
          </Text>
        </View>
        {fault.safetyLevel && (
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Safety Level</Text>
            <Text style={styles.infoValue}>{fault.safetyLevel}</Text>
          </View>
        )}
      </Card>

      {fault.cautionsOrNotes && fault.cautionsOrNotes.length > 0 && (
        <View style={styles.cautionsContainer}>
          {fault.cautionsOrNotes.map((note, idx) => (
            <View key={idx} style={styles.cautionBox}>
              <Ionicons name="warning" size={20} color="#d97706" />
              <Text style={styles.cautionText}>{note}</Text>
            </View>
          ))}
        </View>
      )}

      {fault.manufacturerSteps && Array.isArray(fault.manufacturerSteps) && fault.manufacturerSteps.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list" size={20} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Diagnostic Steps</Text>
          </View>
          {fault.manufacturerSteps.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{idx + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </Card>
      )}

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

      {fault.relatedComponents && fault.relatedComponents.length > 0 && (
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="hardware-chip" size={20} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Related Components</Text>
          </View>
          <View style={styles.tagContainer}>
            {fault.relatedComponents.map((comp, idx) => (
              <View key={idx} style={styles.tag}>
                <Text style={styles.tagText}>{comp}</Text>
              </View>
            ))}
          </View>
        </Card>
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
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  reviewText: {
    color: '#a16207',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
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
    marginBottom: 16,
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
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cautionsContainer: {
    marginBottom: 16,
    gap: 8,
  },
  cautionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cautionText: {
    color: '#b45309',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 16,
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
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  stepBadge: {
    backgroundColor: colors.surface3,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 22,
    paddingTop: 1,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: colors.surface2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
