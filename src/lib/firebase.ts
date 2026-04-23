import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

let firebaseConfig = {};
try {
  // Use a dynamic import or require if possible, but for now we'll stick to the existing import
  // and just guard the initialization.
  // Actually, Vite handles JSON imports well.
  // If the import fails, the build fails.
} catch (e) {
  console.error("Firebase config load failed");
}

import config from '../../firebase-applet-config.json';
firebaseConfig = config;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);
