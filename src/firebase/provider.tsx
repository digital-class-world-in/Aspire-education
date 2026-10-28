
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Database, ref, onValue, off } from 'firebase/database';
import { FirebaseStorage } from 'firebase/storage';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { translations } from '@/lib/translations';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  database: Database;
  storage: FirebaseStorage;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  database: Database | null;
  storage: FirebaseStorage | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null; // Error from auth listener
  // Language state
  language: string;
  resolvedAdminId: string | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  database: Database;
  storage: FirebaseStorage;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  language: string;
  resolvedAdminId: string | null;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { 
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
  database,
  storage,
}) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
  });

  const [language, setLanguage] = useState<string>("en");
  const [resolvedAdminId, setResolvedAdminId] = useState<string | null>(null);

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isUserLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => { // Auth state determined
        setUserAuthState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth]);

  // Effect to resolve the admin ID for non-admin accounts
  useEffect(() => {
    if (!database || !userAuthState.user) return;

    // 1. Check Manual Sessions First (Faster resolution)
    const staffSession = typeof window !== 'undefined' ? localStorage.getItem('staff_session') : null;
    const branchSession = typeof window !== 'undefined' ? localStorage.getItem('branch_session') : null;
    const studentSession = typeof window !== 'undefined' ? localStorage.getItem('student_session') : null;
    
    if (staffSession) {
      setResolvedAdminId(JSON.parse(staffSession).adminUid);
      return;
    } else if (branchSession) {
      setResolvedAdminId(JSON.parse(branchSession).adminUid);
      return;
    } else if (studentSession) {
      setResolvedAdminId(JSON.parse(studentSession).adminUid);
      return;
    }

    // 2. Check if user is an Admin via UID lookup
    const profileRef = ref(database, `Institutes/${userAuthState.user.uid}/profile`);
    onValue(profileRef, (snapshot) => {
      if (snapshot.exists()) {
        setResolvedAdminId(userAuthState.user!.uid);
      } else {
        // 3. Last Resort: Global Lookup (only if permissions allow or for specific initializations)
        onValue(ref(database, `Institutes`), (snap) => {
          const institutes = snap.val() || {};
          let found = false;
          Object.keys(institutes).forEach(id => {
            const adms = institutes[id].admissions || {};
            Object.values(adms).forEach((a: any) => {
              if (a.email?.toLowerCase() === userAuthState.user?.email?.toLowerCase()) {
                setResolvedAdminId(id);
                found = true;
              }
            });
          });
        }, { onlyOnce: true });
      }
    }, { onlyOnce: true });
  }, [database, userAuthState.user]);

  // Effect to fetch and sync language from database based on resolvedAdminId
  useEffect(() => {
    if (!database || !resolvedAdminId) return;

    const langRef = ref(database, `Institutes/${resolvedAdminId}/profile/language`);
    const unsub = onValue(langRef, (snap) => {
      if (snap.exists()) {
        setLanguage(snap.val());
      } else {
        setLanguage("en");
      }
    });

    return () => off(langRef);
  }, [database, resolvedAdminId]);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth && database && storage);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      database: servicesAvailable ? database : null,
      storage: servicesAvailable ? storage : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: userAuthState.isUserLoading,
      userError: userAuthState.userError,
      language: language,
      resolvedAdminId: resolvedAdminId
    };
  }, [firebaseApp, firestore, auth, database, storage, userAuthState, language, resolvedAdminId]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth || !context.database || !context.storage) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    database: context.database,
    storage: context.storage,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    language: context.language,
    resolvedAdminId: context.resolvedAdminId
  };
};

/**
 * Global Translation Hook
 */
export const useTranslation = () => {
  const context = useContext(FirebaseContext);
  const language = context?.language || "en";
  
  const t = (key: string) => {
    return translations[language]?.[key] || translations["en"]?.[key] || key;
  };

  return { t, language };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Realtime Database instance. */
export const useDatabase = (): Database => {
  const { database } = useFirebase();
  return database;
};

/** Hook to access Storage instance. */
export const useStorage = (): FirebaseStorage => {
  const { storage } = useFirebase();
  return storage;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

/**
 * Hook specifically for accessing the authenticated user's state.
 */
export const useUser = (): UserHookResult => { 
  const { user, isUserLoading, userError } = useFirebase(); 
  return { user, isUserLoading, userError };
};
