import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
// For production (Vercel), use environment variables
// For development, fallback to provided config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA5t8FgYmng4lF3Fudcw0wSFn_PWOVWlXI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "piffdeals-staff-firebase.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "piffdeals-staff-firebase",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "piffdeals-staff-firebase.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "588942510405",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:588942510405:web:faccad1f583289d9a0d62c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-BRYZ6X57BL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;

