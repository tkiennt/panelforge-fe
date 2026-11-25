import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBkGqAD_U1zbqAEuKOPGmoN7nnVmR172FA',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'panel-forge-f84db.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'panel-forge-f84db',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'panel-forge-f84db.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '499981361521',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:499981361521:web:176e85f6ca619134c596d0',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signOut, onAuthStateChanged };
