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
import { ColorsType } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { Screen } from '../components/ui/Screen';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Card } from '../components/ui/Card';

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
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
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
  }, [token, t]);

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

  const header = (
    <ScreenHeader title={t('jobs.title')} iconName="briefcase-outline">
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
    </ScreenHeader>
  );

  return (
    <Screen header={header}>
      <SectionHeader title={t('jobs.today_title')} count={t('jobs.count', { count: todayJobsCount })} />


        {jobs.map((job) => {
          const normalizedStatus = normalizeStatus(job.status);
          const isInProgress = normalizedStatus === 'in-progress';
          const isCompleted = normalizedStatus === 'completed';
          const isCancelled = normalizedStatus === 'cancelled';
          const isUpdating = Boolean(updatingIds[job.id]);

          return (
            <Card key={job.id}>
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
            </Card>
          );
        })}
    </Screen>
  );
}

const getStyles = (colors: ColorsType) => StyleSheet.create({

  createButton: {
    marginTop: 14,
    alignSelf: 'center',
    width: '74%',
    borderWidth: 1,
    borderColor: colors.border2,
    borderRadius: 14,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  createButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  syncStateText: {
    marginTop: 8,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  syncButton: {
    marginTop: 8,
    alignSelf: 'center',
    width: '74%',
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    color: colors.blue,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
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
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingLeft: 6,
    height: 24,
  },
  statusActivePill: {
    backgroundColor: colors.greenSoft,
  },
  statusUpcomingPill: {
    backgroundColor: colors.surface2,
  },
  statusCompletedPill: {
    backgroundColor: colors.blueSoft,
  },
  statusCancelledPill: {
    backgroundColor: colors.redSoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusActiveDot: {
    backgroundColor: colors.green,
  },
  statusUpcomingDot: {
    backgroundColor: colors.textSecondary,
  },
  statusCompletedDot: {
    backgroundColor: colors.blue,
  },
  statusCancelledDot: {
    backgroundColor: colors.red,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusActiveText: {
    color: colors.green,
  },
  statusUpcomingText: {
    color: colors.textSecondary,
  },
  statusCompletedText: {
    color: colors.blue,
  },
  statusCancelledText: {
    color: colors.red,
  },
  companyName: {
    marginTop: 8,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  jobDescription: {
    marginTop: 2,
    color: colors.textSecondary,
    fontSize: 13,
  },
  bottomMetaRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  jobActionButton: {
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    height: 44,
  },
  continueButtonBackground: {
    backgroundColor: colors.blue,
  },
  startButtonBackground: {
    backgroundColor: colors.surface2,
  },
  completedButtonBackground: {
    backgroundColor: colors.surface2,
  },
  cancelledButtonBackground: {
    backgroundColor: colors.surface2,
  },
  jobActionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  continueButtonText: {
    color: colors.textPrimary,
  },
  startButtonText: {
    color: colors.textSecondary,
  },
  completedButtonText: {
    color: colors.textSecondary,
  },
  cancelledButtonText: {
    color: colors.textSecondary,
  },
});
