import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

type JobStatus = 'not-started' | 'in-progress';
type JobPriority = 'high' | 'medium' | 'low';

type JobItem = {
  id: string;
  company: string;
  description?: string;
  scheduledAt: string;
  distanceKm?: number;
  status: JobStatus;
  priority: JobPriority;
};

const MOCK_JOBS: JobItem[] = [
  {
    id: 'JOB-1567',
    company: 'Acme Corporation',
    description: 'AC not cooling properly',
    scheduledAt: '2026-04-19T10:00:00.000Z',
    distanceKm: 2.3,
    status: 'in-progress',
    priority: 'high',
  },
  {
    id: 'JOB-1570',
    company: 'Tech Solutions Ltd',
    description: 'Refrigerator making noise',
    scheduledAt: '2026-04-19T14:00:00.000Z',
    distanceKm: 4.5,
    status: 'not-started',
    priority: 'medium',
  },
  {
    id: 'JOB-1571',
    company: 'Global Industries',
    description: 'Preventive maintenance check',
    scheduledAt: '2026-04-19T16:30:00.000Z',
    distanceKm: 8.1,
    status: 'not-started',
    priority: 'low',
  },
  {
    id: 'JOB-1574',
    company: 'Northline Office',
    scheduledAt: '2026-04-20T08:00:00.000Z',
    status: 'not-started',
    priority: 'medium',
  },
];

function formatTime(isoDate: string) {
  const date = new Date(isoDate);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getPriorityColors(priority: JobPriority) {
  if (priority === 'high') {
    return { bg: '#fee2e2', text: '#b91c1c' };
  }

  if (priority === 'medium') {
    return { bg: '#fef3c7', text: '#92400e' };
  }

  return { bg: '#e2e8f0', text: '#475569' };
}

export default function JobsScreen() {
  const { t } = useTranslation();
  const sortedJobs = useMemo(
    () =>
      [...MOCK_JOBS].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      ),
    []
  );

  const todayJobsCount = sortedJobs.filter(
    (job) =>
      new Date(job.scheduledAt).toDateString() === new Date().toDateString()
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="briefcase-outline" size={18} color="#0f172a" />
          </View>
          <Text style={styles.headerTitle}>{t('jobs.title')}</Text>
        </View>

        <Pressable style={styles.createButton}>
          <Text style={styles.createButtonText}>{t('jobs.create')}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('jobs.today_title')}</Text>
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{t('jobs.count', { count: todayJobsCount })}</Text>
          </View>
        </View>

        {sortedJobs.map((job) => {
          const priorityColors = getPriorityColors(job.priority);
          const isInProgress = job.status === 'in-progress';

          return (
            <View key={job.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.leftMetaGroup}>
                  <Text style={styles.jobId}>{job.id}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      isInProgress ? styles.statusActivePill : styles.statusUpcomingPill,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        isInProgress ? styles.statusActiveDot : styles.statusUpcomingDot,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        isInProgress ? styles.statusActiveText : styles.statusUpcomingText,
                      ]}
                    >
                      {isInProgress ? t('status.active') : t('status.upcoming')}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.priorityPill,
                    { backgroundColor: priorityColors.bg },
                  ]}
                >
                  <Text style={[styles.priorityText, { color: priorityColors.text }]}>
                    {t(`priority.${job.priority}`)}
                  </Text>
                </View>
              </View>

              <Text style={styles.companyName}>{job.company}</Text>
              {!!job.description && (
                <Text style={styles.jobDescription}>{job.description}</Text>
              )}

              <View style={styles.bottomMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color="#64748b" />
                  <Text style={styles.metaText}>{formatTime(job.scheduledAt)}</Text>
                </View>

                {typeof job.distanceKm === 'number' && (
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={12} color="#64748b" />
                    <Text style={styles.metaText}>{job.distanceKm.toFixed(1)} {t('unit.km')}</Text>
                  </View>
                )}
              </View>

              <Pressable
                style={[
                  styles.jobActionButton,
                  isInProgress
                    ? styles.continueButtonBackground
                    : styles.startButtonBackground,
                ]}
              >
                <Text
                  style={[
                    styles.jobActionButtonText,
                    isInProgress
                      ? styles.continueButtonText
                      : styles.startButtonText,
                  ]}
                >
                  {isInProgress ? t('jobs.continue') : t('jobs.start')}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f5fa',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e40af',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconWrap: {
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
  createButton: {
    marginTop: 14,
    alignSelf: 'center',
    width: '74%',
    borderWidth: 1.5,
    borderColor: '#0f172a',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#334155',
    fontSize: 22,
    fontWeight: '600',
  },
  counterPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
  },
  counterText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftMetaGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobId: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusActivePill: {
    backgroundColor: '#dcfce7',
  },
  statusUpcomingPill: {
    backgroundColor: '#f1f5f9',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusActiveDot: {
    backgroundColor: '#16a34a',
  },
  statusUpcomingDot: {
    backgroundColor: '#94a3b8',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusActiveText: {
    color: '#15803d',
  },
  statusUpcomingText: {
    color: '#64748b',
  },
  priorityPill: {
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'lowercase',
  },
  companyName: {
    marginTop: 8,
    color: '#1e293b',
    fontSize: 24,
    fontWeight: '700',
  },
  jobDescription: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  bottomMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  jobActionButton: {
    marginTop: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  continueButtonBackground: {
    backgroundColor: '#2563eb',
  },
  startButtonBackground: {
    backgroundColor: '#e5e7eb',
  },
  jobActionButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  continueButtonText: {
    color: '#ffffff',
  },
  startButtonText: {
    color: '#475569',
  },
});
