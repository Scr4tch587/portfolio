import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Read Firebase config from Vite env variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Helpful runtime check for missing build-time env vars.
const missing = Object.entries(firebaseConfig)
  .filter(([, value]) => value === undefined || value === '' || value === null)
  .map(([key]) => key);
if (missing.length) {
  // eslint-disable-next-line no-console
  console.error(
    `Firebase build config missing (${missing.join(', ')}). ` +
      'Ensure VITE_FIREBASE_* variables are set for the build (repo secrets / .env). ' +
      'Deployed Firestore requests may use projects/undefined if projectId is missing.',
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functionsRegion = import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export const storage = getStorage(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, functionsRegion);
