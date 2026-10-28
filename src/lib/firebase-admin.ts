import * as admin from 'firebase-admin';
import { db as clientDb } from './firebase';
import { ref, get, set, update, push, remove } from 'firebase/database';

// 🔐 ENV Variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ?.replace(/\\n/g, '\n')
  ?.replace(/^"/, '')
  ?.replace(/"$/, '');

// 🚀 Init Firebase Admin
let adminDb: any = null;
let adminAuth: any = null;

if (!admin.apps.length) {
  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey,
      } as admin.ServiceAccount),
      databaseURL: "https://tb-ims-default-rtdb.firebaseio.com"
    });
    adminDb = admin.database();
    adminAuth = admin.auth();
  } else {
    // console.warn("⚠️ Firebase Admin SDK: Missing credentials. Falling back to mocked admin DB using Client SDK.");
  }
} else {
  adminDb = admin.database();
  adminAuth = admin.auth();
}

// 🛠️ Mock Admin DB using Client SDK if Admin is not initialized
const createMockDb = () => {
  return {
    ref: (path?: string) => {
      const dbRef = path ? ref(clientDb, path) : ref(clientDb);
      return {
        get: async () => {
          const snapshot = await get(dbRef);
          return {
            exists: () => snapshot.exists(),
            val: () => snapshot.val(),
            forEach: (cb: any) => {
              snapshot.forEach((childSnap) => {
                cb({
                  key: childSnap.key,
                  val: () => childSnap.val()
                });
              });
            },
            key: snapshot.key
          };
        },
        set: (data: any) => set(dbRef, data),
        update: (data: any) => update(dbRef, data),
        push: (data: any) => push(dbRef, data),
        remove: () => remove(dbRef)
      };
    }
  };
};

// 📦 Exports
export const db = adminDb || createMockDb();
export const auth = adminAuth; 
export { admin };