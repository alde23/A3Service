import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseProvider as WatermelonProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { Database } from '@nozbe/watermelondb';
import { View, ActivityIndicator } from 'react-native';
import { getDatabase } from './index';

const DatabaseContext = createContext<Database | null>(null);

export function useDatabase() {
  const db = useContext(DatabaseContext);
  if (!db) throw new Error('useDatabase must be used within DatabaseProvider');
  return db;
}

type Props = { children: React.ReactNode };

export function DatabaseProvider({ children }: Props) {
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setDb(getDatabase());
      } catch (e) {
        console.error('[DatabaseProvider] Failed to initialize:', e);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  if (!db) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <WatermelonProvider database={db}>
      <DatabaseContext.Provider value={db}>
        {children}
      </DatabaseContext.Provider>
    </WatermelonProvider>
  );
}