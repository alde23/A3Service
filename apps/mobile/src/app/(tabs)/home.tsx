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
import { useAuth } from '../../services/auth.service';
import { API_URL, authJsonHeaders } from '../../services/api.config';
import { useTheme } from '../../theme/ThemeProvider';
import { useLocation } from '../../services/location.service';

type JobOnMap = {
  id: string;
  title: string;
  name: string;
  distanceKm: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'upcoming';
};

const DEFAULT_SARAJEVO = { latitude: 43.8563, longitude: 18.4131 };

function generateFallbackJobs(baseLocation: { latitude: number; longitude: number }, t: any): JobOnMap[] {
  return [
    {
      id: 'JOB-1567',
      title: `Bosch BGH96 - ${t('job_types.maintenance', 'Održavanje')}`,
      name: 'Džemala Bijedića 114, Sarajevo',
      distanceKm: 2.1,
      coordinate: { latitude: baseLocation.latitude + 0.0026, longitude: baseLocation.longitude + 0.0021 },
      status: 'active',
    },
    {
      id: 'JOB-1570',
      title: `ecoTEC plus 415 - ${t('job_types.repair', 'Popravka')}`,
      name: 'Zmaja od Bosne 3, Sarajevo',
      distanceKm: 4.5,
      coordinate: { latitude: baseLocation.latitude + 0.0090, longitude: baseLocation.longitude - 0.0151 },
      status: 'upcoming',
    },
    {
      id: 'JOB-1571',
      title: `Logano G115 - ${t('job_types.installation', 'Ugradnja')}`,
      name: 'Mustafe Pintola 2, Sarajevo',
      distanceKm: 6.2,
      coordinate: { latitude: baseLocation.latitude - 0.0150, longitude: baseLocation.longitude - 0.0286 },
      status: 'upcoming',
    },
  ];
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const { token } = useAuth();
  const { colors, isDark } = useTheme();
  const { homeLocation } = useLocation();
  const baseLoc = homeLocation || DEFAULT_SARAJEVO;
  
  const [jobsOnMap, setJobsOnMap] = useState<JobOnMap[]>(() => generateFallbackJobs(baseLoc, t));
  const [showToast, setShowToast] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowToast(false), 3500);
    return () => clearTimeout(timer);
  }, []);

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
          
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in km
}

          // Transform backend jobs to map format
          const mappedJobs = jobs
            .filter((job: any) => job.siteId && job.site?.latitude && job.site?.longitude)
            .map((job: any) => {
              const siteLat = job.site.latitude;
              const siteLng = job.site.longitude;
              const distanceKm = calculateDistance(baseLoc.latitude, baseLoc.longitude, siteLat, siteLng);
              const shortId = job.id.split('-')[0].toUpperCase();
              
              return {
                id: String(job.id),
                title: `${t(`priority.${job.priority}`, job.priority)} - Job #${shortId}`,
                name: job.rawAddress || job.site?.rawAddress || 'Unknown Address',
                distanceKm: Math.round(distanceKm * 10) / 10,
                coordinate: {
                  latitude: siteLat,
                  longitude: siteLng,
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
    () => [baseLoc, nextJob.coordinate],
    [baseLoc, nextJob.coordinate]
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={{
          latitude: baseLoc.latitude,
          longitude: baseLoc.longitude,
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
          coordinate={baseLoc}
          title={t('map.you', 'Vaša lokacija')}
          description={t('map.current_location', 'Početna lokacija')}
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
            <View style={styles.cardMainTextWrap}>
              <Text style={styles.destinationTitleText}>{t('home.nearest_job', 'Najbliži zadatak')}</Text>
              <View style={styles.jobTitleRow}>
                <Ionicons name="navigate" size={16} color="#d1fae5" style={{ marginRight: 6 }} />
                <Text style={styles.jobTitleText} numberOfLines={1}>{nextJob.title}</Text>
              </View>
              <Text style={styles.placeNameText} numberOfLines={1}>{nextJob.name}</Text>
            </View>

            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>
                {nextJob.distanceKm.toFixed(1)} {t('home.units.km', 'km')}
              </Text>
            </View>
          </View>
        </View>

        {showToast && (
          <View style={[styles.bottomStatsCard, { backgroundColor: isDark ? 'rgba(11,15,23,0.92)' : 'rgba(255,255,255,0.92)', borderTopColor: colors.border }]}>
            <Text style={[styles.bottomStatsText, { color: colors.textPrimary }]}>{t('home.jobs_visible', { count: jobsOnMap.length, defaultValue: `${jobsOnMap.length} posla vidljivo na mapi` })}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardMainTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  destinationTitleText: {
    color: '#a7f3d0',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  jobTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  jobTitleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  placeNameText: {
    color: '#d1fae5',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    opacity: 0.9,
  },
  distanceBadge: {
    backgroundColor: 'rgba(209, 250, 229, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  distanceText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
