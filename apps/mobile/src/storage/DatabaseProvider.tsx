import React, { createContext, useContext } from 'react';
import { DatabaseProvider as WatermelonProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { database } from './index';

const DatabaseContext = createContext(database);

export function useDatabase() {
  return useContext(DatabaseContext);
}

type Props = { children: React.ReactNode };

export function DatabaseProvider({ children }: Props) {
  return (
    <WatermelonProvider database={database}>
      {children}
    </WatermelonProvider>
  );
}