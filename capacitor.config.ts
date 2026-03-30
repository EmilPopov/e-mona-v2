import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.emona.app',
  appName: 'e-mona',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
