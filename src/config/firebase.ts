import { initializeApp } from 'firebase/app';
import {
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import {
  getFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
  initializeFirestore,
} from 'firebase/firestore';
import {
  getFunctions,
  connectFunctionsEmulator,
} from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence,
});

const functions = getFunctions(app);

// Connect emulators BEFORE initializing Firestore with persistent cache
// so the SDK knows where to sync cached writes
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFunctionsEmulator(functions, 'localhost', 5001);
}

let db: ReturnType<typeof initializeFirestore>;
if (import.meta.env.DEV) {
  // In dev mode, use basic Firestore (no persistent cache)
  // to avoid IndexedDB masking emulator connection issues
  db = initializeFirestore(app, {});
  connectFirestoreEmulator(db, 'localhost', 8080);
} else {
  // In production, use persistent cache for offline-first
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    db = getFirestore(app);
  }
}

export { app, auth, db, functions };
