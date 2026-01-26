// State machine for event status transitions

import { Status, PotentialEvent, MatchResult } from './types';

export function deriveStatus(
  now: Date,
  potential: PotentialEvent,
  matchResult: MatchResult,
  windowHours: number
): Status {
  // Check if expired (start time has passed or is same as now)
  if (potential.detected_start.getTime() <= now.getTime()) {
    return 'expired';
  }
  
  // Check if covered
  if (matchResult.matched) {
    return 'covered';
  }
  
  // Check if leak (within window and not low confidence)
  const hoursUntil = (potential.detected_start.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntil <= windowHours && potential.confidence !== 'low') {
    return 'leak';
  }
  
  // Otherwise pending
  return 'pending';
}

export function canTransition(from: Status, to: Status): boolean {
  const validTransitions: Record<Status, Status[]> = {
    pending: ['leak', 'covered', 'expired', 'discarded'],
    leak: ['covered', 'expired', 'discarded'],
    covered: ['expired', 'discarded'],
    expired: ['discarded'],
    discarded: []
  };
  
  return validTransitions[from]?.includes(to) ?? false;
}