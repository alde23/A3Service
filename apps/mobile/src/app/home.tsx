import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

type JobOnMap = {
  id: string;
  name: string;
  distanceMi: number;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  status: 'active' | 'upcoming';
};

const CURRENT_LOCATION = {
  latitude: 40.6954,
  longitude: -73.9497,
};

const JOBS_ON_MAP: JobOnMap[] = [
  {
    id: 'JOB-1567',
    name: 'Brooklyn Public Library',
    distanceMi: 0.1,
    coordinate: { latitude: 40.6959, longitude: -73.9485 },
    status: 'active',
  },
  {
    id: 'JOB-1570',
    name: 'Tech Solutions Ltd',
    distanceMi: 1.2,
    coordinate: { latitude: 40.6993, longitude: -73.9527 },
    status: 'upcoming',
  },
  {
    id: 'JOB-1571',
    name: 'Global Industries',
    distanceMi: 2.4,
    coordinate: { latitude: 40.6913, longitude: -73.9435 },
    status: 'upcoming',
  },
];

export default function HomeScreen() {
  const nextJob = useMemo(
    () => [...JOBS_ON_MAP].sort((a, b) => a.distanceMi - b.distanceMi)[0],
    []
  );

  const routeCoordinates = useMemo(
    () => [CURRENT_LOCATION, nextJob.coordinate],
    [nextJob.coordinate]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
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
          title="You"
          description="Current location"
          pinColor="#2563eb"
        />

        {JOBS_ON_MAP.map((job) => (
          <Marker
            key={job.id}
            coordinate={job.coordinate}
            title={job.name}
            description={`${job.id} · ${job.status}`}
            pinColor={job.status === 'active' ? '#dc2626' : '#f59e0b'}
          />
        ))}
      </MapView>

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topHeader}>
          <View style={styles.homeTitleRow}>
            <View style={styles.homeIconWrap}>
              <Ionicons name="home-outline" size={16} color="#111827" />
            </View>
            <Text style={styles.homeTitle}>Home</Text>
          </View>

          <View style={styles.destinationCard}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="navigate" size={22} color="#d1fae5" />
            </View>

            <View style={styles.cardMainTextWrap}>
              <Text style={styles.distanceText}>{nextJob.distanceMi.toFixed(1)} mi</Text>
              <Text style={styles.placeNameText}>{nextJob.name}</Text>
            </View>

            <Pressable style={styles.voiceButton}>
              <Ionicons name="mic" size={18} color="#2563eb" />
            </Pressable>
          </View>
        </View>

        <View style={styles.rightControls}>
          <Pressable style={styles.floatingControl}>
            <Ionicons name="compass" size={22} color="#334155" />
          </Pressable>
          <Pressable style={styles.floatingControl}>
            <Ionicons name="search" size={22} color="#334155" />
          </Pressable>
          <Pressable style={styles.floatingControl}>
            <Ionicons name="volume-high-outline" size={22} color="#334155" />
          </Pressable>
        </View>

        <View style={styles.bottomStatsCard}>
          <Text style={styles.bottomStatsText}>{JOBS_ON_MAP.length} jobs visible on map</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e2e8f0',
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
    borderColor: '#111827',
    backgroundColor: '#f8fafc',
    marginRight: 8,
  },
  homeTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '700',
  },
  placeNameText: {
    color: '#ecfeff',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
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
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  bottomStatsCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 78,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  bottomStatsText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
});
