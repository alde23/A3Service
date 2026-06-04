import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../services/auth.service';
import { fetchLibraryModelDetails, LibraryModel } from '../../services/library-api.service';
import { DetailLayout } from '../../components/ui/DetailLayout';
import { Card } from '../../components/ui/Card';
import { Accordion } from '../../components/ui/Accordion';
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

  const modelTitle = model.modelName || model.name;
  const brandName = model.brand || model.manufacturerId;

  return (
    <DetailLayout title={modelTitle} subtitle={brandName}>
      <Card style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Category</Text>
          <Text style={styles.infoValue}>{model.category}</Text>
        </View>
        {model.fuelType && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fuel Type</Text>
            <Text style={styles.infoValue}>{model.fuelType}</Text>
          </View>
        )}
        {(model.productionStartYear || model.productionEndYear) && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Production Years</Text>
            <Text style={styles.infoValue}>
              {model.productionStartYear || '?'} - {model.productionEndYear || 'Present'}
            </Text>
          </View>
        )}
        {model.description && (
          <View style={[styles.infoRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={styles.infoLabel}>Description</Text>
            <Text style={styles.infoValue}>{model.description}</Text>
          </View>
        )}
      </Card>

      <View style={styles.section}>
        {model.safetyWarnings && model.safetyWarnings.length > 0 && (
          <Accordion 
            title="Safety Warnings" 
            count={model.safetyWarnings.length} 
            icon="warning" 
            defaultExpanded={true}
          >
            {model.safetyWarnings.map((warning, idx) => (
              <View key={warning.id || idx} style={styles.warningBox}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                <Text style={styles.warningText}>{warning.description}</Text>
              </View>
            ))}
          </Accordion>
        )}

        {model.faultCodes && model.faultCodes.length > 0 && (
          <Accordion 
            title="Fault Codes" 
            count={model.faultCodes.length} 
            icon="construct"
            defaultExpanded={true}
          >
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
          </Accordion>
        )}

        {model.technicalSpecs && model.technicalSpecs.length > 0 && (
          <Accordion title="Technical Specs" count={model.technicalSpecs.length} icon="list">
            <View style={styles.table}>
              {model.technicalSpecs.map((spec, idx) => (
                <View key={spec.id || idx} style={[styles.tableRow, idx === model.technicalSpecs!.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.tableParam}>{spec.parameter}</Text>
                  <Text style={styles.tableValue}>
                    {spec.value} {spec.unit && spec.unit.trim() !== '' ? <Text style={styles.tableUnit}>{spec.unit}</Text> : ''}
                  </Text>
                </View>
              ))}
            </View>
          </Accordion>
        )}

        {model.maintenanceTasks && model.maintenanceTasks.length > 0 && (
          <Accordion title="Maintenance Tasks" count={model.maintenanceTasks.length} icon="hammer">
            {model.maintenanceTasks.map((task, idx) => (
              <View key={task.id || idx} style={styles.taskItem}>
                <View style={styles.taskHeader}>
                  <Text style={styles.taskTitle}>{task.task}</Text>
                  {task.interval && <Text style={styles.taskInterval}>{task.interval}</Text>}
                </View>
              </View>
            ))}
          </Accordion>
        )}

        {model.modelParts && model.modelParts.length > 0 && (
          <Accordion title="Parts & Components" count={model.modelParts.length} icon="hardware-chip">
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
          </Accordion>
        )}
      </View>
      
      {/* Space at the bottom */}
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
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  warningText: {
    color: '#991b1b',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  table: {
    backgroundColor: colors.surface2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableParam: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  tableValue: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  tableUnit: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  taskItem: {
    backgroundColor: colors.surface2,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  taskInterval: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.teal,
    backgroundColor: colors.tealSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface2,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
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
