import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { PotentialEvent } from '@/core/types';

export function useInbox() {
  const events = useLiveQuery(
    () => db.potentialEvents
      .orderBy('updated_at')
      .reverse()
      .toArray(),
    []
  );

  const leaks = useMemo(() => 
    events?.filter((e: PotentialEvent) => e.status === 'leak') ?? [],
    [events]
  );

  const pending = useMemo(() => 
    events?.filter((e: PotentialEvent) => e.status === 'pending') ?? [],
    [events]
  );

  return {
    events: events ?? [],
    leaks,
    pending,
    isLoading: events === undefined
  };
}