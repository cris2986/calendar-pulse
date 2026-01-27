// Web notifications handler

import { PotentialEvent } from '@/core/types';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
}

export function checkForLeaksAndNotify(events: PotentialEvent[]): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  
  const now = new Date();
  const leaks = events.filter(event => 
    event.status === 'leak' && 
    event.confidence !== 'low' &&
    event.detected_start > now
  );
  
  if (leaks.length > 0) {
    const leak = leaks[0]; // Notify about the first leak
    const hoursUntil = Math.round((leak.detected_start.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    new Notification('Compromiso no agendado', {
      body: `${leak.summary} - en ${hoursUntil}h`,
      icon: '/logo.png',
      tag: `leak-${leak.id}`
    });
  }
}
