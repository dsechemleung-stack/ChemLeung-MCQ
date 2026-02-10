// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// TODO: Replace with your own Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBKk_TsWIVQCXfIwPQXnFOXvSNQNDgyvFg",
  authDomain: "chemleung-hkdse-mcq-platform.firebaseapp.com",
  projectId: "chemleung-hkdse-mcq-platform",
  storageBucket: "chemleung-hkdse-mcq-platform.firebasestorage.app",
  messagingSenderId: "811594644247",
  appId: "1:811594644247:web:5282c3c73f1d3566955552",
  measurementId: "G-85R118KESK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;