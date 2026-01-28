import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.calendarpulse.app',
  appName: 'Calendar Pulse',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
    backgroundColor: '#0b0c10'
  },
  plugins: {
    // Notification Listener plugin config
    NotificationListener: {
      // Solo escuchar notificaciones de WhatsApp
      packageFilter: ['com.whatsapp', 'com.whatsapp.w4b']
    }
  }
};

export default config;
