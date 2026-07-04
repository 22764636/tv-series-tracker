import { initializeApp } from 'firebase/app'
import { getFirestore, doc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId,
)

const app = firebaseConfigured ? initializeApp(firebaseConfig) : null
export const db = firebaseConfigured ? getFirestore(app) : null

// Single shared document: no login, everyone who opens the app sees and
// edits the same library. See CLAUDE.md for the reasoning/tradeoffs.
export const vaultRef = firebaseConfigured ? doc(db, 'library', 'shared') : null
