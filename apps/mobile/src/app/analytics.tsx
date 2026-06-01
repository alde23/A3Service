import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../services/auth.service';
import {
  fetchAnalyticsSummary,
  fetchAnalyticsEarnings,
  AnalyticsSummary,
  MonthlyMetric,
} from '../services/analytics-api.service';
import { observeExpenses, addExpense } from '../storage/repositories/expenses.repository';

type MetricCard = {
  label: string;
  value: string;
  delta: string;
  tone: 'blue' | 'emerald' | 'amber' | 'slate';
};

type MonthlyPoint = {
  month: string;
  jobs: number;
  revenue: number;
};


const MONTHLY_DATA: MonthlyPoint[] = [
  { month: 'Jan', jobs: 74, revenue: 18 },
  { month: 'Feb', jobs: 82, revenue: 20 },
  { month: 'Mar', jobs: 96, revenue: 24 },
  { month: 'Apr', jobs: 110, revenue: 27 },
  { month: 'May', jobs: 101, revenue: 25 },
  { month: 'Jun', jobs: 118, revenue: 31 },
  { month: 'Jul', jobs: 126, revenue: 33 },
  { month: 'Aug', jobs: 121, revenue: 32 },
  { month: 'Sep', jobs: 114, revenue: 29 },
  { month: 'Oct', jobs: 132, revenue: 35 },
  { month: 'Nov', jobs: 139, revenue: 38 },
  { month: 'Dec', jobs: 135, revenue: 36 },
];

const TOP_AREAS = [
  { label: 'Boiler repairs', value: 412 },
  { label: 'Annual servicing', value: 265 },
  { label: 'Fault code visits', value: 198 },
  { label: 'Installations', value: 149 },
];

const BRAND_BREAKDOWN = [
  { label: 'Vaillant', value: 38 },
  { label: 'Worcester', value: 26 },
  { label: 'Baxi', value: 18 },
  { label: 'Ideal', value: 12 },
];

const TRENDS = ['2024', '2025', '2026', 'YTD'];

function toneStyles(tone: MetricCard['tone']) {
  if (tone === 'blue') {
    return { bg: '#1e3a5f', text: '#60a5fa', ring: '#1d4ed8' };
  }

  if (tone === 'emerald') {
    return { bg: '#064e3b', text: '#34d399', ring: '#065f46' };
  }

  if (tone === 'amber') {
    return { bg: '#451a03', text: '#fbbf24', ring: '#92400e' };
  }

  return { bg: '#1e293b', text: '#94a3b8', ring: '#334155' };
}

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary>({});
  const [monthlyData, setMonthlyData] = useState<MonthlyMetric[]>(MONTHLY_DATA);

  const [expensesSum, setExpensesSum] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        // Fetch analytics data from backend
        const summaryData = await fetchAnalyticsSummary(token);
        setSummary(summaryData);

        const earningsData = await fetchAnalyticsEarnings(token);
        if (earningsData && earningsData.length > 0) {
          setMonthlyData(earningsData);
        }
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        // Keep mock data on error
      }
    })();
  }, [token]);

  useEffect(() => {
    const sub = observeExpenses().subscribe((records) => {
      const sum = records.reduce((acc, rec) => acc + rec.amount, 0);
      setExpensesSum(sum);
    });
    return () => sub.unsubscribe();
  }, []);

  const handleAddExpense = async () => {
    const amt = parseFloat(expenseAmount);
    if (!isNaN(amt) && expenseDescription) {
      await addExpense(amt, expenseDescription);
      setIsModalVisible(false);
      setExpenseAmount('');
      setExpenseDescription('');
    }
  };

  const jobsTotal = useMemo(
    () => monthlyData.reduce((sum, point) => sum + point.jobs, 0) || summary.jobsTotal || 0,
    [monthlyData, summary]
  );
  const revenueTotal = useMemo(
    () => monthlyData.reduce((sum, point) => sum + point.revenue, 0) || summary.revenueTotal || 0,
    [monthlyData, summary]
  );

  const maxJobs = Math.max(...monthlyData.map((point) => point.jobs), 1);

  // Create metrics from API data
  const metrics = useMemo(() => [
    {
      label: 'Jobs this year',
      value: summary.jobsTotal ? summary.jobsTotal.toLocaleString() : '0',
      delta: '+18%',
      tone: 'blue' as const,
    },
    {
      label: 'Completed on first visit',
      value: summary.completionRate ? `${Math.round(summary.completionRate)}%` : '72%',
      delta: '+6%',
      tone: 'emerald' as const,
    },
    {
      label: 'Fault repeat rate',
      value: summary.faultRepeatRate ? `${summary.faultRepeatRate.toFixed(1)}%` : '8.4%',
      delta: '-2%',
      tone: 'amber' as const,
    },
    {
      label: 'Avg. response time',
      value: summary.avgResponseTime ? `${summary.avgResponseTime}m` : '34m',
      delta: '-8m',
      tone: 'slate' as const,
    },
  ], [summary]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="bar-chart-outline" size={18} color="#0f172a" />
          </View>
          <Text style={styles.headerTitle}>{t('analytics.title')}</Text>
        </View>

        <Text style={styles.headerCopy}>{t('analytics.header_copy')}</Text>

        <View style={styles.topActions}>
          <View style={styles.filterPillRow}>
            {TRENDS.map((item, index) => (
              <View
                key={item}
                style={[styles.filterPill, index === 2 && styles.filterPillActive]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    index === 2 && styles.filterPillTextActive,
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.exportButton}>
            <Ionicons name="download-outline" size={16} color="#0f172a" />
            <Text style={styles.exportButtonText}>{t('analytics.export')}</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View>
              <Text style={styles.summaryLabel}>{t('analytics.year_to_date')}</Text>
              <Text style={styles.summaryValue}>{t('analytics.jobs_count', { count: jobsTotal })}</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>+18% vs last year</Text>
            </View>
          </View>

          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatLabel}>Net Revenue</Text>
              <Text style={styles.summaryStatValue}>{revenueTotal - expensesSum} KM</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatLabel}>Total Expenses</Text>
              <Text style={styles.summaryStatValue}>{expensesSum} KM</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStatItem}>
              <Pressable style={styles.addExpenseBtn} onPress={() => setIsModalVisible(true)}>
                <Text style={styles.addExpenseBtnText}>+ Add Expense</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.grid}>
          {metrics.map((metric) => {
            const colors = toneStyles(metric.tone);

            return (
              <View
                key={metric.label}
                style={[styles.metricCard, { borderColor: colors.ring }]}
              >
                <View style={[styles.metricChip, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.metricDelta, { color: colors.text }]}>
                    {metric.delta}
                  </Text>
                </View>
                <Text style={styles.metricValue}>{metric.value}</Text>
                <Text style={styles.metricLabel}>{metric.label}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.chartCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Monthly jobs</Text>
            <View style={styles.counterPill}>
              <Text style={styles.counterText}>2026</Text>
            </View>
          </View>

          <View style={styles.barChart}>
            {monthlyData.map((point) => {
              const heightPercent = (point.jobs / maxJobs) * 100;

              return (
                <View key={point.month} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height: `${heightPercent}%` as const },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{point.month}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.twoColumnCard}>
          <View style={styles.listCard}>
            <Text style={styles.sectionTitle}>Top job groups</Text>
            <View style={styles.groupList}>
              {TOP_AREAS.map((area, index) => (
                <View key={area.label} style={styles.groupRow}>
                  <View style={styles.groupMeta}>
                    <Text style={styles.groupIndex}>{index + 1}</Text>
                    <Text style={styles.groupLabel}>{area.label}</Text>
                  </View>
                  <Text style={styles.groupValue}>{area.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.listCard}>
            <Text style={styles.sectionTitle}>Brand mix</Text>
            <View style={styles.groupList}>
              {BRAND_BREAKDOWN.map((brand) => (
                <View key={brand.label} style={styles.brandRow}>
                  <View style={styles.brandRowTop}>
                    <Text style={styles.groupLabel}>{brand.label}</Text>
                    <Text style={styles.groupValue}>{brand.value}%</Text>
                  </View>
                  <View style={styles.brandTrack}>
                    <View style={[styles.brandFill, { width: `${brand.value}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Business Expense</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              keyboardType="numeric"
              value={expenseAmount}
              onChangeText={setExpenseAmount}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={expenseDescription}
              onChangeText={setExpenseDescription}
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalBtnCancel} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalBtnSave} onPress={handleAddExpense}>
                <Text style={styles.modalBtnSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  addExpenseBtn: { backgroundColor: '#dbeafe', padding: 8, borderRadius: 8, alignItems: 'center' },
  addExpenseBtnText: { color: '#1d4ed8', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtnCancel: { padding: 10 },
  modalBtnCancelText: { color: '#64748b', fontWeight: 'bold' },
  modalBtnSave: { backgroundColor: '#2563eb', padding: 10, borderRadius: 8 },
  modalBtnSaveText: { color: 'white', fontWeight: 'bold' },
  safeArea: {
    flex: 1,
    backgroundColor: '#0d1117',
  },
  header: {
    backgroundColor: '#1a2744',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e40af',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#60a5fa',
  },
  headerTitle: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '700',
  },
  headerCopy: {
    marginTop: 8,
    color: '#dbeafe',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 21,
  },
  topActions: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  filterPillRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterPillActive: {
    backgroundColor: '#ffffff',
  },
  filterPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#0f172a',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  exportButtonText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#161b27',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a3441',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  summaryLabel: {
    color: '#8892a4',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    marginTop: 4,
    color: '#f1f5f9',
    fontSize: 26,
    fontWeight: '800',
  },
  summaryBadge: {
    borderRadius: 999,
    backgroundColor: '#064e3b',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  summaryBadgeText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryStatsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStatItem: {
    flex: 1,
  },
  summaryStatLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryStatValue: {
    marginTop: 4,
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 10,
    backgroundColor: '#2a3441',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#161b27',
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  metricChip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  metricDelta: {
    fontSize: 12,
    fontWeight: '800',
  },
  metricValue: {
    color: '#f1f5f9',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
  },
  metricLabel: {
    marginTop: 6,
    color: '#8892a4',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#161b27',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3441',
    padding: 14,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
  },
  counterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#1e2737',
  },
  counterText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '700',
  },
  barChart: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    backgroundColor: '#1e2737',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  barLabel: {
    marginTop: 8,
    color: '#8892a4',
    fontSize: 11,
    fontWeight: '700',
  },
  twoColumnCard: {
    gap: 10,
  },
  listCard: {
    backgroundColor: '#161b27',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a3441',
    padding: 14,
  },
  groupList: {
    marginTop: 10,
    gap: 10,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  groupIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#1e3a5f',
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '800',
  },
  groupLabel: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
  },
  groupValue: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '800',
  },
  brandRow: {
    gap: 6,
  },
  brandRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#1e2737',
    overflow: 'hidden',
  },
  brandFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#0f8b78',
  },
});
