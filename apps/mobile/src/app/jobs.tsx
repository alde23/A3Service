import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  createJob,
  ensureJobsSeeded,
  observeJobs,
  type JobStatus,
  updateJobStatus,
} from '../storage/repositories/jobs.repository';
import Job from '../storage/models/Job';
import { observePendingSyncCount } from '../storage/repositories/sync-queue.repository';
import { useAuth } from '../services/auth.service';
import { syncJobsWithServer } from '../services/jobs-sync.service';

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function normalizeStatus(status: string): JobStatus {
  if (status === 'in-progress' || status === 'completed' || status === 'cancelled') {
    return status;
  }
  return 'not-started';
}

function nextStatus(status: JobStatus): JobStatus {
  if (status === 'not-started') {
    return 'in-progress';
  }
  if (status === 'in-progress') {
    return 'completed';
  }
  return 'completed';
}

function displayJobId(id: string) {
  return `JOB-${id.slice(0, 6).toUpperCase()}`;
}

export default function JobsScreen() {
  const { token } = useAuth();
  const { t } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    const jobsSub = observeJobs().subscribe((records) => {
      if (active) {
        setJobs(records);
      }
    });

    const syncSub = observePendingSyncCount().subscribe((count) => {
      if (active) {
        setPendingSyncCount(count);
      }
    });

    return () => {
      active = false;
      jobsSub.unsubscribe();
      syncSub.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (token) {
      void (async () => {
        setIsSyncing(true);
        try {
          const summary = await syncJobsWithServer(token);
          setSyncMessage(
            t('jobs.syncComplete', {
              pulled: summary.pulled,
              pushed: summary.pushed,
              failed: summary.failed,
            })
          );
        } catch {
          setSyncMessage(t('jobs.syncFailedLocal'));
        } finally {
          setIsSyncing(false);
        }
      })();
    } else {
      void ensureJobsSeeded();
    }
  }, [token]);

  const todayJobsCount = useMemo(
    () =>
      jobs.filter(
        (job) =>
          job.scheduledAt.toDateString() === new Date().toDateString()
      ).length,
    [jobs]
  );

  const onCreateJob = async () => {
    setIsCreating(true);
    try {
      const minutesOffset = (jobs.length + 1) * 90;
      await createJob({
        title: `New Client ${jobs.length + 1}`,
        scheduledAt: new Date(Date.now() + minutesOffset * 60 * 1000),
        durationMinutes: 60,
        status: 'not-started',
        notes: 'Created from mobile jobs screen',
        latitude: null,
        longitude: null,
        technicianId: 'tech-001',
        clientId: `client-${jobs.length + 100}`,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const onAdvanceStatus = async (job: Job) => {
    const currentStatus = normalizeStatus(job.status);
    if (
      currentStatus === 'completed' ||
      currentStatus === 'cancelled' ||
      updatingIds[job.id]
    ) {
      return;
    }

    const next = nextStatus(currentStatus);
    setUpdatingIds((prev) => ({ ...prev, [job.id]: true }));
    try {
      await updateJobStatus(job.id, next);
    } finally {
      setUpdatingIds((prev) => ({ ...prev, [job.id]: false }));
    }
  };

  const onSyncNow = async () => {
    if (!token) {
      setSyncMessage(t('jobs.syncSignIn'));
      return;
    }

    setIsSyncing(true);
    try {
      const summary = await syncJobsWithServer(token);
      setSyncMessage(
        t('jobs.syncComplete', {
          pulled: summary.pulled,
          pushed: summary.pushed,
          failed: summary.failed,
        })
      );
    } catch {
      setSyncMessage(t('jobs.syncFailedAuth'));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="briefcase-outline" size={18} color="#0f172a" />
          </View>
          <Text style={styles.headerTitle}>{t('jobs.title')}</Text>
        </View>

        <Pressable
          style={[styles.createButton, isCreating && styles.disabledButton]}
          onPress={onCreateJob}
          disabled={isCreating}
        >
          <Text style={styles.createButtonText}>
            {isCreating ? t('jobs.creating') : t('jobs.create')}
          </Text>
        </Pressable>

        <Text style={styles.syncStateText}>
          {t('jobs.pendingSync', { count: pendingSyncCount })}
        </Text>

        <Pressable
          style={[styles.syncButton, isSyncing && styles.disabledButton]}
          onPress={onSyncNow}
          disabled={isSyncing}
        >
          <Text style={styles.syncButtonText}>
            {isSyncing ? t('jobs.syncing') : t('jobs.syncNow')}
          </Text>
        </Pressable>
        {!!syncMessage && <Text style={styles.syncStateText}>{syncMessage}</Text>}
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

        {jobs.map((job) => {
          const normalizedStatus = normalizeStatus(job.status);
          const isInProgress = normalizedStatus === 'in-progress';
          const isCompleted = normalizedStatus === 'completed';
          const isCancelled = normalizedStatus === 'cancelled';
          const isUpdating = Boolean(updatingIds[job.id]);

          return (
            <View key={job.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <View style={styles.leftMetaGroup}>
                  <Text style={styles.jobId}>{displayJobId(job.id)}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      isInProgress
                        ? styles.statusActivePill
                        : isCompleted
                          ? styles.statusCompletedPill
                          : isCancelled
                            ? styles.statusCancelledPill
                          : styles.statusUpcomingPill,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        isInProgress
                          ? styles.statusActiveDot
                          : isCompleted
                            ? styles.statusCompletedDot
                            : isCancelled
                              ? styles.statusCancelledDot
                            : styles.statusUpcomingDot,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        isInProgress
                          ? styles.statusActiveText
                          : isCompleted
                            ? styles.statusCompletedText
                            : isCancelled
                              ? styles.statusCancelledText
                            : styles.statusUpcomingText,
                      ]}
                    >
                      {isInProgress
                        ? t('status.active')
                        : isCompleted
                          ? t('status.completed')
                          : isCancelled
                            ? t('status.cancelled')
                            : t('status.upcoming')}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.companyName}>{job.title}</Text>
              {!!job.notes && <Text style={styles.jobDescription}>{job.notes}</Text>}

              <View style={styles.bottomMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color="#64748b" />
                  <Text style={styles.metaText}>{formatTime(job.scheduledAt)}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="hourglass-outline" size={12} color="#64748b" />
                  <Text style={styles.metaText}>{job.durationMinutes} {t('unit.min')}</Text>
                </View>
              </View>

              <Pressable
                style={[
                  styles.jobActionButton,
                  isInProgress
                    ? styles.continueButtonBackground
                    : isCompleted
                      ? styles.completedButtonBackground
                      : isCancelled
                        ? styles.cancelledButtonBackground
                      : styles.startButtonBackground,
                  (isCompleted || isCancelled || isUpdating) && styles.disabledButton,
                ]}
                disabled={isCompleted || isCancelled || isUpdating}
                onPress={() => onAdvanceStatus(job)}
              >
                <Text
                  style={[
                    styles.jobActionButtonText,
                    isInProgress
                      ? styles.continueButtonText
                      : isCompleted
                        ? styles.completedButtonText
                        : isCancelled
                          ? styles.cancelledButtonText
                        : styles.startButtonText,
                  ]}
                >
                  {isUpdating
                    ? t('jobs.updating')
                    : isInProgress
                      ? t('jobs.continue')
                      : isCompleted
                        ? t('status.completed')
                        : isCancelled
                          ? t('status.cancelled')
                          : t('jobs.start')}
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
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  syncStateText: {
    marginTop: 8,
    color: '#dbeafe',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  syncButton: {
    marginTop: 8,
    alignSelf: 'center',
    width: '74%',
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderRadius: 12,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
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
  statusCompletedPill: {
    backgroundColor: '#dbeafe',
  },
  statusCancelledPill: {
    backgroundColor: '#fee2e2',
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
  statusCompletedDot: {
    backgroundColor: '#2563eb',
  },
  statusCancelledDot: {
    backgroundColor: '#b91c1c',
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
  statusCompletedText: {
    color: '#1d4ed8',
  },
  statusCancelledText: {
    color: '#b91c1c',
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
  completedButtonBackground: {
    backgroundColor: '#dbeafe',
  },
  cancelledButtonBackground: {
    backgroundColor: '#fee2e2',
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
  completedButtonText: {
    color: '#1d4ed8',
  },
  cancelledButtonText: {
    color: '#b91c1c',
  },
});
