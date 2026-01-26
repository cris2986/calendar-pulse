import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import { PotentialEvent } from '@/core/types';

export function useInbox(debugMode = false) {
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

  // Debug mode: show all events regardless of status
  const allEvents = useMemo(() => 
    events ?? [],
    [events]
  );

  return {
    events: debugMode ? allEvents : events ?? [],
    leaks,
    pending,
    allEvents, // Always available for debugging
    isLoading: events === undefined
  };
}