import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cashapp.mobile',
  appName: 'CashApp',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      sdkVersion: '21.0.0',
      androidClientId: '111833991023-k638l382l2l3tfgfgsg2i3sd00fbfd2f.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
      scopes: ['profile', 'email']
    }
  }
};

export default config;
