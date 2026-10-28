'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

// SDKs
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    database: getDatabase(firebaseApp),
    storage: getStorage(firebaseApp),
  };
}

// ✅ CLEAN INITIALIZATION (NO AUTO INIT)
export function initializeFirebase() {
  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    firebaseApp = initializeApp(firebaseConfig); // ✅ ONLY THIS
  } else {
    firebaseApp = getApp();
  }

  return getSdks(firebaseApp);
}
