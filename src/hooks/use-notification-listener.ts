import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import NotificationListener, { NotificationData } from '@/plugins/notification-listener';

interface UseNotificationListenerOptions {
  onNotification?: (data: NotificationData) => void;
  autoStart?: boolean;
  processQueueOnStart?: boolean;
}

export function useNotificationListener(options: UseNotificationListenerOptions = {}) {
  const { onNotification, autoStart = false, processQueueOnStart = true } = options;

  const [isNative, setIsNative] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastNotification, setLastNotification] = useState<NotificationData | null>(null);
  const [queueProcessed, setQueueProcessed] = useState(false);
  const queueProcessingRef = useRef(false);

  // Check if running on native platform
  useEffect(() => {
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    if (native) {
      checkPermission();
    }
  }, []);

  // Check permission status
  const checkPermission = useCallback(async () => {
    try {
      const result = await NotificationListener.isPermissionGranted();
      setIsPermissionGranted(result.granted);
      return result.granted;
    } catch (error) {
      console.error('[NotificationListener] Error checking permission:', error);
      return false;
    }
  }, []);

  // Request permission (opens Android settings)
  const requestPermission = useCallback(async () => {
    try {
      await NotificationListener.requestPermission();
      // Permission is granted manually by user in settings
      // We'll check again when they return
      return true;
    } catch (error) {
      console.error('[NotificationListener] Error requesting permission:', error);
      return false;
    }
  }, []);

  // Process queued notifications (from when app was closed)
  const processQueuedNotifications = useCallback(async () => {
    if (!isNative || queueProcessingRef.current) {
      return { processed: 0 };
    }

    queueProcessingRef.current = true;

    try {
      console.log('[NotificationListener] Checking for queued notifications...');
      const result = await NotificationListener.getQueuedNotifications();

      if (result.count > 0) {
        console.log(`[NotificationListener] Processing ${result.count} queued notifications`);

        for (const notification of result.notifications) {
          console.log('[NotificationListener] Processing queued:', notification.title);
          setLastNotification(notification);
          onNotification?.(notification);

          // Small delay between processing to avoid overwhelming
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        console.log('[NotificationListener] No queued notifications');
      }

      setQueueProcessed(true);
      return { processed: result.count };
    } catch (error) {
      console.error('[NotificationListener] Error processing queue:', error);
      return { processed: 0, error };
    } finally {
      queueProcessingRef.current = false;
    }
  }, [isNative, onNotification]);

  // Get queue size without processing
  const getQueueSize = useCallback(async () => {
    if (!isNative) return 0;
    try {
      const result = await NotificationListener.getQueueSize();
      return result.size;
    } catch (error) {
      console.error('[NotificationListener] Error getting queue size:', error);
      return 0;
    }
  }, [isNative]);

  // Start listening for notifications
  const startListening = useCallback(async () => {
    if (!isNative) {
      console.log('[NotificationListener] Not running on native platform');
      return false;
    }

    try {
      const result = await NotificationListener.startListening();
      if (result.started) {
        setIsListening(true);
        return true;
      } else {
        console.warn('[NotificationListener] Failed to start:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[NotificationListener] Error starting listener:', error);
      return false;
    }
  }, [isNative]);

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      await NotificationListener.stopListening();
      setIsListening(false);
      return true;
    } catch (error) {
      console.error('[NotificationListener] Error stopping listener:', error);
      return false;
    }
  }, []);

  // Set up notification listener
  useEffect(() => {
    if (!isNative) return;

    let listenerHandle: { remove: () => Promise<void> } | null = null;

    const setupListener = async () => {
      listenerHandle = await NotificationListener.addListener(
        'notificationReceived',
        (data: NotificationData) => {
          console.log('[NotificationListener] Received:', data);
          setLastNotification(data);
          onNotification?.(data);
        }
      );
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [isNative, onNotification]);

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && isNative && isPermissionGranted && !isListening) {
      startListening();
    }
  }, [autoStart, isNative, isPermissionGranted, isListening, startListening]);

  // Process queue on start if requested
  useEffect(() => {
    if (processQueueOnStart && isNative && isPermissionGranted && !queueProcessed && onNotification) {
      processQueuedNotifications();
    }
  }, [processQueueOnStart, isNative, isPermissionGranted, queueProcessed, onNotification, processQueuedNotifications]);

  return {
    // State
    isNative,
    isPermissionGranted,
    isListening,
    lastNotification,
    queueProcessed,

    // Actions
    checkPermission,
    requestPermission,
    startListening,
    stopListening,
    processQueuedNotifications,
    getQueueSize,
  };
}
