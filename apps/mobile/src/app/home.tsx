import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../services/auth.service';
import { API_URL, authJsonHeaders } from '../services/api.config';
import { useTheme } from '../theme/ThemeProvider';

type JobOnMap = {
  id: string;
  name: string;
  distanceKm: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'upcoming';
};

const CURRENT_LOCATION = {
  latitude: 43.8563,
  longitude: 18.4131,
};

const JOBS_ON_MAP: JobOnMap[] = [
  {
    id: 'JOB-1567',
    name: 'Bosch BGH96 Maintenance',
    distanceKm: 2.1,
    coordinate: { latitude: 43.8589, longitude: 18.4152 },
    status: 'active',
  },
  {
    id: 'JOB-1570',
    name: 'ecoTEC plus 415 Repair',
    distanceKm: 4.5,
    coordinate: { latitude: 43.8653, longitude: 18.3980 },
    status: 'upcoming',
  },
  {
    id: 'JOB-1571',
    name: 'Logano G115 Installation',
    distanceKm: 6.2,
    coordinate: { latitude: 43.8413, longitude: 18.3845 },
    status: 'upcoming',
  },
];

export default function HomeScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const [jobsOnMap, setJobsOnMap] = useState<JobOnMap[]>(JOBS_ON_MAP);

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        // Fetch jobs from backend
        const res = await fetch(`${API_URL}/jobs`, {
          method: 'GET',
          headers: authJsonHeaders(token),
        });

        if (res.ok) {
          const jobs = await res.json();
          
          // Transform backend jobs to map format
          const mappedJobs = jobs
            .filter((job: any) => job.siteId)
            .map((job: any, index: number) => {
              // For now, generate coordinates near current location
              // In production, this would come from site data
              const offsetLat = (Math.random() - 0.5) * 0.05;
              const offsetLng = (Math.random() - 0.5) * 0.05;
              
              return {
                id: String(job.id),
                name: job.rawAddress || `Job #${job.id}`,
                distanceKm: Math.round(Math.random() * 5 * 10) / 10,
                coordinate: {
                  latitude: CURRENT_LOCATION.latitude + offsetLat,
                  longitude: CURRENT_LOCATION.longitude + offsetLng,
                },
                status: (job.status === 'IN_PROGRESS' ? 'active' : 'upcoming') as 'active' | 'upcoming',
              };
            });

          if (mappedJobs.length > 0) {
            setJobsOnMap(mappedJobs);
          }
        }
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
        // Keep mock data on error
      }
    })();
  }, [token]);

  const nextJob = useMemo(
    () => [...jobsOnMap].sort((a, b) => a.distanceKm - b.distanceKm)[0],
    [jobsOnMap]
  );

  const routeCoordinates = useMemo(
    () => [CURRENT_LOCATION, nextJob.coordinate],
    [nextJob.coordinate]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: CURRENT_LOCATION.latitude,
          longitude: CURRENT_LOCATION.longitude,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
      >
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#2563eb"
          strokeWidth={6}
        />

            <Marker
          coordinate={CURRENT_LOCATION}
          title={t('map.you')}
          description={t('map.current_location')}
          pinColor="#2563eb"
        />

        {jobsOnMap.map((job) => (
            <Marker
            key={job.id}
            coordinate={job.coordinate}
            title={job.name}
            description={`${job.id} · ${t(`status.${job.status}`)}`}
            pinColor={job.status === 'active' ? '#dc2626' : '#f59e0b'}
          />
        ))}
      </MapView>

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topHeader}>
          <View style={styles.homeTitleRow}>
            <View style={[styles.homeIconWrap, { borderColor: colors.border, backgroundColor: colors.surface2 }]}>
              <Ionicons name="home-outline" size={16} color={colors.textPrimary} />
            </View>
            <Text style={[styles.homeTitle, { color: colors.textPrimary }]}>{t('home.title')}</Text>
          </View>

          <View style={styles.destinationCard}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="navigate" size={22} color="#d1fae5" />
            </View>

            <View style={styles.cardMainTextWrap}>
              <Text style={styles.distanceText}>{nextJob.distanceKm.toFixed(1)} km</Text>
              <Text style={styles.placeNameText}>{nextJob.name}</Text>
            </View>

            <Pressable style={styles.voiceButton}>
              <Ionicons name="mic" size={18} color="#2563eb" />
            </Pressable>
          </View>
        </View>

        <View style={styles.rightControls}>
          <Pressable style={[styles.floatingControl, { backgroundColor: isDark ? 'rgba(17,24,39,0.90)' : 'rgba(255,255,255,0.90)', borderColor: colors.border }]}>
            <Ionicons name="compass" size={22} color={colors.textSecondary} />
          </Pressable>
          <Pressable style={[styles.floatingControl, { backgroundColor: isDark ? 'rgba(17,24,39,0.90)' : 'rgba(255,255,255,0.90)', borderColor: colors.border }]}>
            <Ionicons name="search" size={22} color={colors.textSecondary} />
          </Pressable>
          <Pressable style={[styles.floatingControl, { backgroundColor: isDark ? 'rgba(17,24,39,0.90)' : 'rgba(255,255,255,0.90)', borderColor: colors.border }]}>
            <Ionicons name="volume-high-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={[styles.bottomStatsCard, { backgroundColor: isDark ? 'rgba(11,15,23,0.92)' : 'rgba(255,255,255,0.92)', borderTopColor: colors.border }]}>
          <Text style={[styles.bottomStatsText, { color: colors.textPrimary }]}>{t('home.jobs_visible', { count: jobsOnMap.length })}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  homeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  homeIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  homeTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  destinationCard: {
    borderRadius: 16,
    backgroundColor: '#0f8b78',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconWrap: {
    marginRight: 12,
  },
  cardMainTextWrap: {
    flex: 1,
  },
  distanceText: {
    color: '#d1fae5',
    fontSize: 14,
    fontWeight: '500',
  },
  placeNameText: {
    color: '#ecfeff',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  voiceButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightControls: {
    position: 'absolute',
    right: 10,
    top: 278,
    gap: 10,
  },
  floatingControl: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bottomStatsCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 78,
    borderRadius: 16,
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  bottomStatsText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
