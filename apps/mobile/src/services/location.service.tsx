import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type LocationContextShape = {
  homeLocation: Coordinate | null;
  homeAddress: string | null;
  loading: boolean;
  saveHomeLocation: (address: string, coord: Coordinate) => Promise<void>;
  clearHomeLocation: () => Promise<void>;
};

const LocationContext = createContext<LocationContextShape | undefined>(undefined);

const LOCATION_KEY = 'A3S_HOME_LOCATION';
const ADDRESS_KEY = 'A3S_HOME_ADDRESS';

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [homeLocation, setHomeLocation] = useState<Coordinate | null>(null);
  const [homeAddress, setHomeAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedLoc = await AsyncStorage.getItem(LOCATION_KEY);
        const storedAddr = await AsyncStorage.getItem(ADDRESS_KEY);
        
        if (storedLoc) {
          setHomeLocation(JSON.parse(storedLoc));
        }
        if (storedAddr) {
          setHomeAddress(storedAddr);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveHomeLocation = async (address: string, coord: Coordinate) => {
    try {
      await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(coord));
      await AsyncStorage.setItem(ADDRESS_KEY, address);
      setHomeLocation(coord);
      setHomeAddress(address);
    } catch {
      // ignore
    }
  };

  const clearHomeLocation = async () => {
    try {
      await AsyncStorage.removeItem(LOCATION_KEY);
      await AsyncStorage.removeItem(ADDRESS_KEY);
      setHomeLocation(null);
      setHomeAddress(null);
    } catch {
      // ignore
    }
  };

  return (
    <LocationContext.Provider value={{ homeLocation, homeAddress, loading, saveHomeLocation, clearHomeLocation }}>
      {children}
    </LocationContext.Provider>
  );
};

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
