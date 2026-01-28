import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export interface NotificationData {
  packageName: string;
  title: string;
  text: string;
  timestamp: number;
}

export interface QueuedNotificationsResult {
  notifications: NotificationData[];
  count: number;
  error?: string;
}

export interface NotificationListenerPlugin {
  isPermissionGranted(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ opened: boolean }>;
  startListening(): Promise<{ started: boolean; error?: string }>;
  stopListening(): Promise<{ stopped: boolean }>;
  getQueuedNotifications(): Promise<QueuedNotificationsResult>;
  getQueueSize(): Promise<{ size: number }>;
  addListener(
    eventName: 'notificationReceived',
    listenerFunc: (data: NotificationData) => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

const NotificationListener = registerPlugin<NotificationListenerPlugin>(
  'NotificationListener',
  {
    web: () => {
      // Mock implementation for web/development
      return {
        isPermissionGranted: async () => ({ granted: false }),
        requestPermission: async () => {
          console.log('[NotificationListener] Web: requestPermission called - not supported');
          return { opened: false };
        },
        startListening: async () => {
          console.log('[NotificationListener] Web: startListening called - not supported');
          return { started: false, error: 'Not supported on web' };
        },
        stopListening: async () => ({ stopped: true }),
        getQueuedNotifications: async () => ({ notifications: [], count: 0 }),
        getQueueSize: async () => ({ size: 0 }),
        addListener: async () => ({ remove: async () => {} }),
        removeAllListeners: async () => {},
      };
    },
  }
);

export default NotificationListener;
