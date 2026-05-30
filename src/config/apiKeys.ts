/// <reference types="vite/client" />

export const API_KEYS = {
  googleBackup: import.meta.env.VITE_COM_GOOGLE_ANDROID_BACKUP_API_KEY,
  googleGeo: import.meta.env.VITE_COM_GOOGLE_ANDROID_GEO_API_KEY,
  firebase: import.meta.env.VITE_COM_GOOGLE_FIREBASE_API_KEY,
  fillr: {
    key: import.meta.env.VITE_COM_SQUAREUP_FILLR_API_KEY,
    secret: import.meta.env.VITE_COM_SQUAREUP_FILLR_SECRET_KEY,
    password: import.meta.env.VITE_COM_SQUAREUP_FILLR_WIDGET_PASSWORD,
  },
  datadog: {
    appId: import.meta.env.VITE_COM_DATADOG_ANDROID_APPLICATION_ID,
    clientToken: import.meta.env.VITE_COM_DATADOG_ANDROID_CLIENT_TOKEN,
  },
  netcetera: import.meta.env.VITE_COM_SQUAREUP_NETCETERA_API_KEY,
  bugsnag: import.meta.env.VITE_COM_BUGSNAG_ANDROID_API_KEY,
};
