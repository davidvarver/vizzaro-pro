import * as Sentry from '@sentry/react-native';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

export function initSentry() {
  if (!SENTRY_DSN || SENTRY_DSN === 'your_sentry_dsn_here') {
    console.log('[Sentry] No DSN configured, error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
    enabled: !__DEV__,
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    beforeSend(event, hint) {
      if (__DEV__) {
        console.log('[Sentry] Event captured:', event);
        return null;
      }
      return event;
    },
    integrations: [],
  });

  console.log('[Sentry] Initialized successfully');
}

export { Sentry };
